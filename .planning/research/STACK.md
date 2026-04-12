# Technology Stack

**Project:** Deck Builder Data Pipeline + Scoring Overhaul
**Researched:** 2026-04-12
**Scope:** Additive milestone on existing Next.js 14 + Electron 33 + SQLite + Python 3.13 stack

---

## Context: What Already Exists (Do Not Revisit)

The existing stack is settled and working:
- **Runtime:** Python 3.13 for all ML/pipeline scripts
- **DB client (TS):** `better-sqlite3` ^11.7.0 — WAL mode, singleton via `globalThis`
- **HTTP (Python scripts):** `requests` (used in existing scrapers)
- **Aggregation:** `pandas` + `numpy` in `aggregate_community_meta.py`
- **Retry:** Hand-rolled `MAX_RETRIES = 3` + `RETRY_BACKOFF` in `pipeline.py`

The milestone adds three capabilities: **VPS data sync**, **enhanced EDHREC scraping**, and **collection coverage scoring**. Each maps to a specific library decision below.

---

## Recommended Stack (New Dependencies Only)

### 1. VPS Data Sync — PostgreSQL to SQLite

**Decision: HTTP pull via CF API endpoint, not direct PostgreSQL connection**

Confidence: HIGH

The CF API already runs on the VPS at `/cf-api/` (Railway Docker container). The VPS PostgreSQL is not directly exposed on a public port (standard Railway/Docker config). Even if it were, direct `psycopg` connections from a desktop Electron app introduce credential management, firewall, and SSH tunnel complexity.

The correct architecture is: Python sync script calls the CF API `/recommend` and stats endpoints over HTTPS, transforms the response, and bulk-inserts into local SQLite via `sqlite3` (stdlib) or `better-sqlite3` (for the TS side). This matches how the existing pipeline already works for EDHREC and Scryfall.

**If a raw SQL dump path becomes necessary** (e.g., initial cold-load of 506K decks is too slow through the API), use `psycopg` 3.3.3 for a one-shot batch export script.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `httpx` | 0.28.1 | HTTP client for CF API sync + EDHREC scraping | Replaces `requests` for all new scripts. Same sync API as requests, adds HTTP/2 multiplexing, built-in retry hooks, and type annotations. Async upgrade path when batch fetch performance becomes a bottleneck. Used by Anthropic and OpenAI SDKs — no surprise breakage risk. |
| `psycopg` (optional) | 3.3.3 | Direct PostgreSQL connection for cold-load bulk dump only | psycopg3 is the current maintained version (psycopg2 receives no new features). Supports Python 3.13 binary packages. Only needed if API-based sync proves too slow for initial 506K deck import. |

**Do NOT use:** `powersync`, `ampli-sync`, `pgloader` — all solve offline real-time bidirectional sync, which is not the problem. The problem is a one-directional periodic batch pull from a known API.

**Do NOT use:** `psycopg2` for new code — it receives no new features and psycopg 3.3.3 is a drop-in for new projects.

### 2. EDHREC Scraping

**Decision: Extend existing `fetch_avg_decklists.py` with `httpx` + `tenacity`, not `pyedhrec`**

Confidence: HIGH

`pyedhrec` (v0.0.2, last released February 2024) is a thin wrapper around EDHREC's undocumented HTML scraping. It provides useful method names (`get_commander_cards`, `get_commanders_average_deck`, etc.) but wraps the same `__NEXT_DATA__` extraction that `fetch_avg_decklists.py` already implements. The library has no active maintenance signal and does not expose the `cardlists` → `commander_card_stats` mapping format the project needs.

The existing scraper already handles the two EDHREC response formats (JSON API + `__NEXT_DATA__` HTML fallback). The gaps to address are:

1. **Retry robustness** — currently handled with `time.sleep(RATE_LIMIT)` fixed delays. Replace with `tenacity` declarative backoff.
2. **HTTP client** — `requests.Session` works but `httpx.Client` with connection pooling is faster for batches of 100+ commanders and gives a sync-to-async upgrade path for free.
3. **Rate limit compliance** — EDHREC blocks rapid scrapers. The existing 2.0s fixed delay is correct; add jitter via `tenacity.wait_random(0, 1)` on top.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `httpx` | 0.28.1 | HTTP client for EDHREC + CF API | Single client replaces `requests` across all new pipeline scripts. Eliminates a dependency split. |
| `tenacity` | 9.1.4 | Declarative retry with exponential backoff + jitter | Replaces the hand-rolled `MAX_RETRIES` / `RETRY_BACKOFF` list in `pipeline.py`. `@retry(wait=wait_exponential_jitter(...), stop=stop_after_attempt(5), retry=retry_if_exception_type(httpx.HTTPError))` is three lines vs 30. Python 3.13 compatible, Apache 2.0 licensed. |

**Do NOT use:** `pyedhrec` — stale, wraps the same endpoints already implemented, no format mapping for `commander_card_stats`, not maintained.

**Do NOT use:** `scrapy` or `playwright` — EDHREC's `__NEXT_DATA__` is available in the raw HTML response without JavaScript execution. Adding a browser automation layer multiplies complexity and resource use for zero gain.

### 3. Indexed Deck Lookup Table (card → decks)

**Decision: SQLite-native indexed join table, no external index library**

Confidence: HIGH

The query pattern is: "give me all community decks that contain card X, sorted by inclusion rate." This is a standard indexed foreign key join, not a full-text search problem.

The existing `community_deck_cards` table has `card_name TEXT` and `community_deck_id INTEGER`. Adding `CREATE INDEX idx_cdc_card_name ON community_deck_cards(card_name)` makes the lookup O(log N) in the B-tree. With 506K decks averaging ~100 cards each (~50M rows), SQLite WAL-mode handles this read pattern well — the `aggregate_community_meta.py` script already demonstrates this with its TEMP TABLE approach.

For **commander-scoped card co-occurrence** (which decks running commander X also run card Y), a materialized summary table `commander_card_stats` (migration 34 already exists) is the correct pattern — not an inverted index library.

**FTS5 is already used** for `cards_fts` (oracle text + name search) and `edhrec_knowledge`. It is not appropriate for numeric card-to-deck lookup — FTS5 tokenizes text, not integer IDs.

No new library dependency needed. New migration adds the covering index.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `better-sqlite3` | ^11.7.0 (existing) | Indexed lookup, batch upsert, covering indexes | Already in production. WAL mode supports concurrent reads during sync. `executemany` batch upsert at ~100K rows/s is sufficient for the 506K deck load. |

### 4. Collection Coverage Scoring

**Decision: Pure Python set arithmetic — no ML library needed**

Confidence: HIGH

Coverage scoring is: given a user's `collection` (set of card names + quantities) and an optimal decklist (set of cards), compute what percentage of the optimal deck the user already owns, and rank the missing cards by their contribution score.

This is a weighted set intersection problem:

```
coverage_score = Σ(min(owned_qty, needed_qty) * card_weight) / Σ(needed_qty * card_weight)
```

Where `card_weight` comes from `commander_card_stats.inclusion_rate` or `meta_card_stats.placement_weighted_score`. This is a **five-line Python function** using `sqlite3` queries and standard arithmetic.

`sklearn.metrics.jaccard_score` is for binary classification evaluation, not recommendation scoring — wrong abstraction layer. `scikit-learn` is already in the pipeline for the ML model and adds no new dependency, but its Jaccard implementation requires numpy arrays and binary encoding of a 35K-card vocabulary, which is wasteful for a per-deck sparse comparison.

The upgrade recommendation ranking ("biggest improvement per card added") is:
```
upgrade_impact = card_weight * (needed_qty - min(owned_qty, needed_qty))
```
Sorted descending. Pure Python, O(N) where N = cards in optimal deck (~100).

No new dependency needed.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `sqlite3` stdlib | Python 3.13 built-in | Query collection + commander_card_stats in scoring function | Zero overhead, already the established pattern. |
| `scikit-learn` | existing in pipeline | Only if regression-based card impact scoring is added later | The existing ML model already scores cards. Coverage scoring is simpler — set intersection, not prediction. |

---

## Upgrade (Pandas Version Lock)

`aggregate_community_meta.py` uses `pandas.read_sql_query` and `DataFrame.groupby`. The existing pipeline presumably has pandas ~2.x installed. Pandas 3.0.2 (released March 2026) **requires Python >= 3.11** and removes previously deprecated APIs.

**Action required:** Pin `pandas>=2.2.3,<3.0` in `requirements.txt` until `aggregate_community_meta.py` is audited for pandas 3 compatibility. The `iterrows()` usage in `compute_combo_score` is deprecated in pandas 3 and should be replaced with `itertuples()` or vectorized ops before upgrading.

| Technology | Current Constraint | Why |
|------------|-------------------|-----|
| `pandas` | `>=2.2.3,<3.0` (pin) | Pandas 3.0 is a breaking release. Existing `iterrows()` + implicit type casts need audit before upgrade. Pin prevents silent breakage on `pip install --upgrade`. |

---

## Full Dependency Delta

New additions to install:

```bash
# Python (add to requirements.txt or pip install)
pip install "httpx==0.28.1" "tenacity==9.1.4"

# Optional — only if direct PG bulk export is needed
pip install "psycopg[binary]==3.3.3"
```

No new npm/Node dependencies. The sync endpoint is a Python script callable from the existing pipeline orchestrator (`pipeline.py` runs subprocesses). The TypeScript API routes consume the results via the existing `better-sqlite3` singleton.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| VPS sync mechanism | CF API HTTP pull | Direct psycopg3 connection | PG not publicly exposed; adds SSH tunnel or firewall hole; credential management in Electron app; overfitting for a periodic batch job |
| EDHREC client | httpx + tenacity | pyedhrec | Stale (Feb 2024, v0.0.2); doesn't output commander_card_stats format; wraps same endpoints already implemented |
| EDHREC client | httpx + tenacity | scrapy / playwright | No JS execution needed for __NEXT_DATA__; massive complexity increase |
| HTTP client | httpx 0.28.1 | requests (existing) | requests is fine but httpx unifies sync/async, is already used in OpenAI SDK, has type annotations and HTTP/2 |
| Deck lookup index | SQLite B-tree index | SQLite FTS5 / Whoosh / Elasticsearch | Card-to-deck is a numeric join, not a text search; FTS5 tokenizes text; Elasticsearch is absurd for 50M integer pairs |
| Coverage scoring | Pure Python set arithmetic | sklearn.metrics.jaccard_score | Wrong abstraction — binary classification eval, not weighted set similarity; numpy array encoding of 35K card vocabulary is wasteful for a 100-card deck comparison |
| Retry logic | tenacity 9.1.4 | Hand-rolled MAX_RETRIES | tenacity adds jitter, async support, per-exception routing, and structured logging in 3 lines vs 30 |

---

## Sources

- psycopg 3.3.3 release: [https://pypi.org/project/psycopg/](https://pypi.org/project/psycopg/)
- psycopg2 vs psycopg3 recommendation: [https://www.psycopg.org/psycopg3/](https://www.psycopg.org/psycopg3/)
- pyedhrec v0.0.2 (Feb 2024): [https://pypi.org/project/pyedhrec/](https://pypi.org/project/pyedhrec/)
- httpx 0.28.1: [https://pypi.org/project/httpx/](https://pypi.org/project/httpx/)
- tenacity 9.1.4: [https://pypi.org/project/tenacity/](https://pypi.org/project/tenacity/)
- pandas 3.0.2 (Python >= 3.11 required, breaking release): [https://pandas.pydata.org/docs/whatsnew/index.html](https://pandas.pydata.org/docs/whatsnew/index.html)
- SQLite FTS5 inverted index structure: [https://www.sqlite.org/fts5.html](https://www.sqlite.org/fts5.html)
- httpx vs requests performance: [https://www.proxy-cheap.com/blog/httpx-vs-requests](https://www.proxy-cheap.com/blog/httpx-vs-requests)
- psycopg2 vs psycopg3 performance benchmark: [https://www.tigerdata.com/blog/psycopg2-vs-psycopg3-performance-benchmark](https://www.tigerdata.com/blog/psycopg2-vs-psycopg3-performance-benchmark)
