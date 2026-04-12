# Project Research Summary

**Project:** The Black Grimoire — Deck Quality Scoring and Upgrade Suggestions Milestone
**Domain:** MTG Commander deck analysis tool — data pipeline, scoring overhaul, collection coverage
**Researched:** 2026-04-12
**Confidence:** HIGH

## Executive Summary

This milestone adds three tightly coupled capabilities to an existing, working desktop application: (1) syncing CF API commander statistics from the VPS PostgreSQL into local SQLite, (2) a commander-aware deck scoring engine that uses real inclusion rates instead of heuristics, and (3) collection coverage scoring with ranked add/cut upgrade pairs. All three capabilities are additive — the stack, schema, and pipeline orchestration are already in place. The primary work is filling two new TypeScript modules (`commander-analysis.ts`, `collection-coverage.ts`), one new Python ingest script (`sync_commander_stats.py`), one new CF API endpoint, and one new migration (`card_deck_index`).

The recommended approach is to keep strict architectural separation: Python owns all ingest (writes to SQLite), TypeScript owns all read logic (never calls CF API at request time). The nightly pipeline handles sync; the Next.js API route reads only local data. This is how the existing pipeline already works for EDHREC and Scryfall — there is no novel pattern to invent. The dependency chain is linear: CF API endpoint → ingest script → commander_card_stats populated → analysis engine → scoring integration. Nothing in phases 2–5 can produce useful output until the table has real data.

The critical risks are concentrated in the data sync layer. Three failure modes require defensive coding before the first sync runs: non-atomic delete+rebuild in `aggregate_commander_stats.py` (can wipe 340K rows on crash), PostgreSQL array types serializing as Python repr strings instead of JSON (silent data corruption), and popularity bias in the dual-path scoring formula crowding out commander-specific cards with global staples. All three are preventable with patterns explicitly called out in the research, and all three are cheaper to prevent upfront than to diagnose after the fact.

---

## Key Findings

### Recommended Stack

The stack is additive. No new Node/TypeScript dependencies are needed. Two new Python packages replace and extend existing functionality: `httpx` 0.28.1 replaces `requests` across all new pipeline scripts (HTTP/2, connection pooling, typed, async upgrade path), and `tenacity` 9.1.4 replaces the hand-rolled `MAX_RETRIES` / `RETRY_BACKOFF` list with declarative exponential backoff and jitter in three lines. Both are stable, maintained, and used by OpenAI and Anthropic SDKs.

The two anti-patterns to actively avoid: using `pyedhrec` (stale Feb 2024, wraps same endpoints already implemented, outputs wrong format) and direct `psycopg` connection to VPS PostgreSQL (PG is not publicly exposed, would require SSH tunnel, violates offline-first constraint). A `psycopg[binary]` 3.3.3 install is acceptable only as a fallback for one-shot cold-load bulk dump if the API endpoint proves too slow for 506K deck initial import.

**Core technologies (new additions only):**
- `httpx` 0.28.1: HTTP client for CF API sync and EDHREC scraping — unifies sync/async, typed, replaces requests in all new scripts
- `tenacity` 9.1.4: Declarative retry with exponential backoff and jitter — replaces 30-line hand-rolled retry blocks, Python 3.13 compatible
- `pandas>=2.2.3,<3.0` (pin existing): Pandas 3.0 is a breaking release; existing `iterrows()` usage in `aggregate_community_meta.py` is deprecated in 3.0 and must be audited before upgrade
- `psycopg[binary]` 3.3.3 (optional): Direct PostgreSQL connection for cold-load only — use only if API-based sync is too slow for initial 506K import

### Expected Features

The critical-path ordering from FEATURES.md determines what is MVP vs. deferred. All differentiator features depend on `commander_card_stats` being populated with real CF API data. Without it, every downstream feature degrades to oracle-text heuristics (current state).

**Must have (table stakes — already partially implemented, need wiring):**
- Overall deck score 0–100 with commander-specific weighting — `overallScore` exists; `CommanderSynergyProfile.synergyMinimums` must be plumbed into `computeOverallScore()`
- Score breakdown by category — `ratioHealth[]` already computed; needs UI surfacing
- Mana curve visualization — `manaCurve` already computed; needs chart rendering
- Color-coded role ratio gauges — `ratioHealth[].status` (low/ok/high) exists; needs display
- Average CMC indicator — `avgCMC` already computed

**Should have (differentiators — deliver in this milestone):**
- Collection coverage % — "You own 73 of 99 non-land recommended cards" — unique advantage over browser tools; `ArsenalCard.owned` already provides per-card flag, need aggregation
- Ranked upgrade suggestions as add/cut pairs — not just "add Rhystic Study" but "cut [lowest-scoring card in same role bucket], add [highest-scoring missing card]" as structured objects
- Commander-specific synergy score per card — CF inclusion_rate minus global baseline, offline and fast, no competitor does this locally
- Owned-first filter — trivial once collection coverage is computed; "3 upgrades you already own"

**Defer (v2+):**
- Impact score via exact delta computation — approximation using synergy score delta is sufficient for v1; full rerun of scoring engine per swap is expensive
- Budget filtering — price column exists but population may be incomplete for older cards; validate before building UI
- Weakness narrative via Claude — Claude API integration exists; add as optional enrichment after structured data layer works
- Power Level 1–10 number — community actively moving away from this; use Bracket-aligned language instead (Focused/Tuned/High Power/cEDH)
- Combo detection, manabase simulation, social sharing — out of scope for this milestone

### Architecture Approach

The pipeline is four layers composing linearly with one-directional data flow: external sources → ingest (Python, nightly) → local SQLite store → analysis engine (TypeScript, pure read) → scoring integration (TypeScript, API routes). Python scripts own all writes; TypeScript owns all reads; no process crosses the boundary in either direction at request time. The new `commander-analysis.ts` and `collection-coverage.ts` modules are pure functions (no writes, no network) — they read two SQLite tables synchronously and return plain objects, making them trivially testable with injected mock data.

One new CF API endpoint is required (`GET /commander-stats?commander={name}&limit=200`) that does not currently exist, though the underlying PostgreSQL table (`commander_card_stats`, migration 003) does. If this endpoint cannot be added to the CF API, the sync script can fall back to a direct PostgreSQL connection via SSH tunnel — acceptable for a nightly batch job.

**Major components:**
1. `sync_commander_stats.py` (new Python) — pulls CF API `/commander-stats`, batch-inserts into `commander_card_stats` and `card_deck_index`; registered as pipeline step 17 for free retry/degraded/Telegram coverage
2. `card_deck_index` (migration 35, new SQL) — inverted index (card_name → commander_names) enabling sub-1ms "which commanders run Sol Ring" lookups; populated as side effect of sync
3. `commander-analysis.ts` (new TypeScript) — merges CF data (70% weight) and EDHREC data (30% boost) into a `CommanderProfile`; offline fallback to oracle-text analysis when table has fewer than 10 rows
4. `collection-coverage.ts` (new TypeScript) — pure function; single `WHERE name IN (...)` query against collection + commander_card_stats; returns `CoverageResult { pct, missing[], owned[], upgrades[] }`
5. `deck-builder-ai.ts` (modified) — replaces empty `commander_card_stats` branch with `analyzeCommanderDecks()` call; injects real inclusion rates into scoring formula
6. `/api/ai-suggest/route.ts` (modified) — adds `coverage` and `upgrades` fields to response envelope

### Critical Pitfalls

1. **Non-atomic delete+rebuild wipes commander_card_stats on crash** — `aggregate_commander_stats.py` runs `DELETE FROM commander_card_stats` before the aggregation loop and commits early. A crash leaves the table empty with no recovery. Fix: accumulate into a staging table, swap atomically; add a count guard (rollback if `total_inserted < 1000`).

2. **PostgreSQL arrays serialize as Python repr, not JSON** — `TEXT[]` columns from psycopg come back as Python lists; `sqlite3` calls `str()` and stores `"['W', 'U']"` instead of valid JSON, silently breaking color-identity filtering. Fix: `json.dumps(v) if isinstance(v, (list, dict)) else v` in the transform step; add post-sync regex validation for `color_identity`.

3. **Staple dominance crowds out commander-specific cards** — dual-path scoring adds both the global staple bonus (+80) and the high-inclusion bonus (+70) for Sol Ring, while a commander-synergy card at 35% niche inclusion scores +35 max. Every deck converges to the same 20-30 cards regardless of commander theme. Fix: two-pass scoring (fill commander-synergy slots first, fill remaining with staples); apply a staple saturation cap at 25 global staples.

4. **EDHREC structure changes silently empty data** — `store_decklist()` deletes before inserting; if the JSON structure changes and returns 0 cards, the old data is destroyed. Fix: minimum-cards guard (skip DELETE if `len(cards) < 30`); canary check on Atraxa before each batch run.

5. **Synergy score is statistically meaningless for rare commanders** — `inclusion_rate - global_rate` with only 10 decks produces noise scores that outrank legitimate data from well-documented commanders. Fix: confidence penalty `adjusted_synergy = synergy_score * min(1.0, deck_count / 30)`; raise minimum threshold from `>= 2` to `>= 5` decks.

---

## Implications for Roadmap

### Phase 1: Data Infrastructure and Sync

**Rationale:** The entire feature set is blocked on `commander_card_stats` having real data. Nothing downstream is testable until this phase completes. This is also where the most dangerous failure modes live.
**Delivers:** CF API `/commander-stats` endpoint; `sync_commander_stats.py` as pipeline step 17; migration 35 (`card_deck_index`); `commander_card_stats` populated with ~340K rows; silent catch blocks in `db.ts` replaced with `console.warn`.
**Addresses:** Collection coverage foundation, commander-aware scoring foundation.
**Avoids:** Pitfall 1 (non-atomic delete — fix atomicity before first run), Pitfall 2 (array serialization — add `json.dumps` in transform), Pitfall 10 (apostrophe normalization — one-line fix in transform), Pitfall 12 (silent errors — add console.warn to 14 catch blocks).
**Stack:** `httpx` + `tenacity` (new Python deps), `psycopg[binary]` optional.

### Phase 2: EDHREC Integration Hardening

**Rationale:** EDHREC data provides the 30% secondary weight in the merge formula. It can be built in parallel with Phase 3 analysis engine work. The canary check and staleness guard must be in place before running 2271-commander batch fetches.
**Delivers:** `fetch_avg_decklists.py` upgraded with `httpx` + `tenacity`; jitter on rate-limit delay; canary check (Atraxa) before batch; minimum-cards guard in `store_decklist()`; `last_fetched_at` staleness logic (weekly re-fetch only).
**Addresses:** EDHREC synergy score as secondary weight.
**Avoids:** Pitfall 3 (JSON structure changes), Pitfall 7 (rate limiting/429), Pitfall 9 (synergy formula: add confidence penalty before this data feeds scoring), Pitfall 11 (ToS gray area — weekly schedule, single-threaded).

### Phase 3: Commander Analysis Engine and Scoring Integration

**Rationale:** Depends on Phase 1 data being available. Can begin implementation before Phase 1 completes (write unit tests with mock data), but cannot be validated against real commanders until Phase 1 syncs.
**Delivers:** `commander-analysis.ts` with CF/EDHREC merge (70/30 split) and offline fallback; `collection-coverage.ts` as pure function; `deck-builder-ai.ts` updated with real inclusion rates; commander-aware `overallScore` wired through `synergyMinimums`.
**Addresses:** Commander-aware scoring (table stakes), collection coverage %, ranked upgrade add/cut pairs, owned-first filter.
**Avoids:** Pitfall 4 (popularity bias — two-pass scoring, staple saturation cap), Pitfall 6 (misleading coverage % — dual metric: key-card coverage + overall coverage), Anti-Pattern 3 (N+1 queries — single `IN` clause).

### Phase 4: API Surface and UI Integration

**Rationale:** Dependent on Phases 1–3. Wires the analysis engine into the response envelope and adds the score breakdown and upgrade list to the deck analysis view.
**Delivers:** `/api/ai-suggest/route.ts` updated with `coverage` and `upgrades` fields; deck analysis UI updated with score breakdown gauges, mana curve chart, collection coverage bar, and upgrade list; bracket-aligned power labeling.
**Addresses:** All table-stakes display features; differentiator UI for collection coverage and ranked upgrades.
**Avoids:** Anti-Pattern 1 (no live CF API calls at request time — all reads from local SQLite).

### Phase 5: Incremental Sync and Refinement (v1.1)

**Rationale:** Deferred — Phase 1 handles initial bulk load. Incremental updates require `updated_at` comparison logic and are lower urgency than the core features.
**Delivers:** `updated_at` comparison in sync script for re-syncing updated decks; `--force-resync` flag; budget filtering (after price data validated); Claude weakness narrative (optional enrichment).
**Addresses:** Pitfall 5 (stale decks never re-synced), deferred features from FEATURES.md.

### Phase Ordering Rationale

- Phase 1 is non-negotiable as phase 1: everything else is functionally inert without real data in `commander_card_stats`. The existing `getCommanderCardStats()` already returns `[]` — the application degrades gracefully but provides no new value.
- Phase 2 (EDHREC hardening) and Phase 3 (analysis engine) can partially overlap — Phase 3 TypeScript modules can be written and unit-tested with mock data while Phase 2 EDHREC work proceeds.
- Phase 4 is pure integration — it should not begin until Phase 3 produces correct output from real commanders.
- The atomicity fix (Pitfall 1) and array serialization fix (Pitfall 2) must be in the same commit as the sync script — they are prerequisites for the first run, not post-launch polish.

### Research Flags

Phases needing deeper research or validation during planning:
- **Phase 1 (CF API endpoint):** The `/commander-stats` endpoint does not exist yet on the CF API. Need to verify what schema `grimoire-cf-api/app/routers/` would need and whether adding an endpoint is in scope or requires SSH tunnel fallback path.
- **Phase 3 (scoring weights):** The 70/30 CF/EDHREC merge ratio is a recommendation, not a validated figure. Should be treated as a tunable parameter and verified against known-good commanders (Atraxa, Aeve, Golbez) after first sync.

Phases with standard patterns (skip additional research):
- **Phase 2 (EDHREC hardening):** Tenacity retry patterns and scraper hardening are well-documented; the existing `fetch_avg_decklists.py` already handles the parsing edge cases.
- **Phase 4 (UI integration):** Pure wiring of existing TypeScript types and components into existing UI patterns; no novel architecture.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All decisions verified against existing codebase source code and official package docs. Two new packages (httpx, tenacity) are stable and widely used. |
| Features | HIGH | Table-stakes confirmed across 8+ live competitor tools. EDHREC synergy formula confirmed from primary source. Anti-feature reasoning (1-10 scale) confirmed via community pivot to Brackets. |
| Architecture | HIGH | All structural claims verified against actual source files (`src/db/schema.ts`, `cf-api-client.ts`, `recommend.py`, `aggregate_commander_stats.py`). Not training-data inference. |
| Pitfalls | HIGH | Most pitfalls identified from direct code audit of existing scripts + CONCERNS.md. Popularity bias and synergy noise pitfalls confirmed by EDHREC editorial and Stanford ML paper. |

**Overall confidence:** HIGH

### Gaps to Address

- **CF API `/commander-stats` endpoint existence:** Research confirmed the PostgreSQL table exists (`commander_card_stats`, migration 003) but the HTTP endpoint does not. Before Phase 1 begins, confirm whether this endpoint will be added to `grimoire-cf-api` or whether the SSH tunnel fallback path is needed.
- **cards.prices population completeness:** FEATURES.md defers budget filtering to v1.1 pending price data validation. Before Phase 5 budget work, run `SELECT COUNT(*) FROM cards WHERE json_extract(prices, '$.usd') IS NULL` to quantify the gap.
- **506K deck initial sync duration:** Research estimates ~3 minutes at 100ms/request for 2271 commanders. Actual first-run duration is unknown until tested; if API-based sync is significantly slower, the psycopg cold-load bulk export path will need activation.
- **Scoring weight validation:** The 70/30 CF/EDHREC merge ratio and the staple saturation cap (25 global staples) are informed estimates. Both should be treated as tunable parameters and validated after first sync with real-world commander builds.

---

## Sources

### Primary (HIGH confidence — code-verified)
- `src/db/schema.ts` migrations 1–34 — all table structures confirmed present
- `src/lib/cf-api-client.ts` — CF API client and local `cf_cache` pattern
- `grimoire-cf-api/app/db/models.py` — PostgreSQL `commander_card_stats` table confirmed (migration 003)
- `grimoire-cf-api/app/routers/recommend.py` — HTTP API structure
- `scripts/aggregate_community_meta.py` — commander list iteration pattern
- `scripts/fetch_avg_decklists.py` — EDHREC ingest pattern and 2s rate limit
- `src/app/api/ai-suggest/route.ts` — existing CF API call path and offline fallback
- `.planning/codebase/CONCERNS.md` — 14 silent catch blocks documented

### Secondary (HIGH confidence — official documentation)
- EDHREC synergy score methodology (edhrec.com/articles) — inclusion rate delta formula
- httpx 0.28.1 (pypi.org/project/httpx) — HTTP/2, type annotations, async upgrade path
- tenacity 9.1.4 (pypi.org/project/tenacity) — declarative retry, Python 3.13 compatible
- pandas 3.0.2 changelog (pandas.pydata.org) — breaking release, Python >= 3.11 required
- SQLite JSON1 docs (sqlite.org/json1.html) — JSONB disambiguation
- ScryCheck, EDH Power Level, MTG Master, BrackCheck, DeckCheck — competitor feature analysis

### Secondary (MEDIUM confidence — community sources)
- EDHREC generic commander problem (edhrec.com/articles) — popularity bias analysis
- Card Kingdom ROAR metric (blog.cardkingdom.com) — 1-10 scale criticism
- EDHREC/AetherHub partnership context (aetherhub.com) — ToS and scraping posture
- MTG deck scoring (CS229 Stanford paper) — bias in scoring methodologies

---
*Research completed: 2026-04-12*
*Ready for roadmap: yes*
