# Domain Pitfalls

**Domain:** MTG deck builder data pipeline and scoring — PostgreSQL-to-SQLite sync, EDHREC scraping, deck scoring algorithms, collection coverage scoring
**Project:** The Black Grimoire (Deck Quality Overhaul milestone)
**Researched:** 2026-04-12
**Overall confidence:** HIGH (most findings verified against existing code + primary sources)

---

## Critical Pitfalls

Mistakes that cause silent data corruption, scoring regressions, or full rewrites.

---

### Pitfall 1: PostgreSQL Array/JSONB Types Silently Truncated on Sync

**What goes wrong:** The VPS CF API PostgreSQL schema may store card arrays, color identities, or metadata as `TEXT[]` (array) or `JSONB` columns. SQLite has no native array or binary-JSON type. When `sync_pg_to_sqlite.py` reads these via psycopg2, arrays come back as Python lists, but if written to SQLite TEXT columns they serialize as the Python `repr()` string `"['W', 'U']"` instead of JSON `'["W","U"]'` — silently breaking downstream parsing.

**Why it happens:** psycopg2 returns PostgreSQL `TEXT[]` as a Python list object. SQLite's `sqlite3` module will call `str()` on it, producing Python-style formatting, not valid JSON. No error is raised — the data is stored but unparseable.

**Consequences:**
- Color identity filtering in `deck-builder-ai.ts` receives malformed strings, treating multi-color commanders as monocolored or colorless
- MDFC color-identity filtering (already fragile per CONCERNS.md) may silently re-introduce off-color cards
- Downstream `getCommanderCardStats()` returns cards that don't match the commander's colors

**Warning signs:**
- `color_identity` column in SQLite community data contains `"['W', 'U']"` (single-quoted, Python list syntax) instead of `'WU'` or `'["W","U"]'`
- After sync, color-specific deck builds include off-color cards at low frequency
- `aggregate_commander_stats.py` produces synergy_scores for cards outside the commander's color identity

**Prevention:**
- In `sync_pg_to_sqlite.py`, explicitly serialize any list/dict values before storing: `json.dumps(value) if isinstance(value, (list, dict)) else value`
- Add a post-sync validation step that checks `color_identity` values match the pattern `^[WUBRG]*$` — reject any row containing brackets
- Add this to the existing `ensure_table()` pattern: verify column shape after first batch insert

**Phase that should address it:** Phase 1 (data sync), before any aggregation runs. The `sync_pg_to_sqlite.py` file already exists and must be audited for this before it runs on 506K decks.

---

### Pitfall 2: aggregate_commander_stats.py Deletes All Data Before Rebuilding (No Atomicity)

**What goes wrong:** Line 105 of `aggregate_commander_stats.py` executes `DELETE FROM commander_card_stats` and then commits before the aggregation loop starts. If the script crashes halfway through (OOM, network error, keyboard interrupt), the table is left empty with no way to recover the previous good state.

**Why it happens:** The script chose "delete + reinsert" over "upsert only changed rows" to avoid dealing with stale entries for commanders that lost data. The `DELETE` + batch `INSERT` with `ON CONFLICT DO UPDATE` is reasonable, but the early commit makes it non-atomic.

**Consequences:**
- A pipeline crash mid-aggregation leaves the Electron app with an empty `commander_card_stats` table — the same broken state as before any data was loaded
- The pipeline's 3x retry logic will re-attempt, causing a second full delete of an already-empty table, losing no additional data but wasting time
- No audit trail: cannot tell if table is empty because pipeline hasn't run or because it crashed

**Warning signs:**
- `commander_card_stats` row count goes from 2M+ to 0 and doesn't recover between pipeline runs
- Benchmark route at `/api/ai-suggest/benchmark` reports `communityDeckCount: 0` after a partial run
- `data/pipeline_failures.json` shows `aggregate_commander_stats` failure count incrementing

**Prevention:**
- Move the `DELETE` to after the aggregation loop succeeds: accumulate all rows in memory (or a temp table), then swap in a single transaction
- Alternatively: rename `commander_card_stats` → `commander_card_stats_old`, build into fresh `commander_card_stats_new`, then `ALTER TABLE ... RENAME`, finally drop old. SQLite supports atomic renames.
- Add a count check at end of script: if `total_inserted < 1000`, rollback and log error rather than committing an obviously incomplete dataset

**Phase that should address it:** Phase 1 (data sync) — this is the most destructive failure mode in the entire pipeline.

---

### Pitfall 3: EDHREC JSON Structure Changes Break Parsing Silently

**What goes wrong:** EDHREC has already changed their internal JSON structure at least twice (the code in `fetch_avg_decklists.py` already handles 4 different formats: `"average"` key, `"cardlists"` key, `"container.json_dict.cardlists"`, and `"deck"` array). A future change causes the parser to find no cards and call `store_decklist()` which clears the old data via `DELETE FROM edhrec_avg_decks WHERE commander_name = ?` before finding zero cards to insert — leaving the commander with no EDHREC data at all.

**Why it happens:** The `store_decklist()` function deletes then inserts, and the caller proceeds regardless of whether `inserted == 0`. The fallback chain in `fetch_average_decklist()` returns `None` only on HTTP errors or parse failures, but returns `{"cardlists": []}` if the JSON is structurally valid but empty.

**Consequences:**
- Commander decks built without EDHREC data degrade to archetype-template-only recommendations (the current empty-state behavior)
- The degradation is invisible: no error is logged, the pipeline step "succeeds" with 0 cards stored
- Mass breakage: if EDHREC changes structure once, all ~2271 commanders lose their data in a single pipeline run

**Warning signs:**
- `edhrec_avg_decks` row count drops sharply after a run (compare before/after)
- `store_decklist()` returns 0 cards inserted for more than 10% of commanders
- Deck builder produces generic archetype decks for well-known commanders like Atraxa or Muldrotha that should have rich EDHREC data

**Prevention:**
- Add a minimum-cards guard: if `len(cards) < 30`, log a warning and skip the `DELETE` step rather than destroying existing data
- Add a canary commander check at start of each pipeline run: fetch Atraxa (extremely well-documented) and validate you get 80+ cards before proceeding to batch
- Store the raw response JSON in a `debug_edhrec_raw` column or temp file so structure changes can be diagnosed without re-fetching
- Never delete before confirming the replacement data is non-empty

**Phase that should address it:** Phase 2 (EDHREC integration). The canary check pattern can be added to the existing pipeline step registration.

---

### Pitfall 4: Popularity Bias Makes Scoring Converge to Generic Staples

**What goes wrong:** The `aggregate_commander_stats.py` `synergy_score` is defined as `inclusion_rate - global_rate`. This correctly identifies commander-specific cards. However, the deck builder in `deck-builder-ai.ts` also applies a separate `+70` bonus for cards with 60%+ inclusion rate, which is dominated by format-wide staples (Sol Ring 97% inclusion, Arcane Signet 90%, Command Tower 99%). These cards win the scoring competition in every commander's candidate pool, producing decks that are technically "optimal" but lack commander-specific identity.

**Why it happens:** The dual-path scoring (commander stats bonus + global staple bonus) adds rather than balances. A card like Sol Ring scores: global staple tier (+80) + high commander inclusion (+70) = enormous advantage over a commander-synergy card that scores: synergy_score (+25 max) + moderate inclusion (+35). The staple always wins.

**Consequences:**
- Every commander deck regardless of theme includes the same 20-30 cards in the first scoring pass
- Commander-synergistic cards that EDHREC shows at 30-40% inclusion (meaningful for a niche strategy) get pushed out by global staples scoring at 80-100%
- User plays an Aeve storm deck (observed in PROJECT.md) that feels weak because it's a generic blue deck with storm cards bolted on, not a deck built around Aeve's specific triggers

**Warning signs:**
- The top 20 cards recommended across different commanders are identical or near-identical
- Deck "themes" from commander analysis are correctly detected but few theme-specific cards appear in the final 99
- User reports "the deck doesn't feel like [commander] — it just plays generic good stuff"

**Prevention:**
- Separate the scoring passes: first fill mandatory slots from commander-synergy high-inclusion cards, then fill remaining slots from global staples
- Apply a "staple saturation cap": once 25 global staples are in the deck, further global-staple bonus is penalized or zeroed
- Weight `synergy_score` (commander-specific deviation from baseline) more heavily than raw `inclusion_rate` for theme slots
- Cross-check: if the recommended deck shares more than 50% cards with a different commander of similar colors, the scoring is too generic

**Phase that should address it:** Phase 3 (scoring algorithm). This is a fundamental algorithmic choice, not a bug — it requires intentional design decisions before implementation.

---

## Moderate Pitfalls

---

### Pitfall 5: sync_pg_to_sqlite.py Conflates New vs. Updated Decks

**What goes wrong:** The sync script uses `(source, source_id)` pairs to detect existing decks and skip them. This means decks that were updated on Moxfield after being scraped by the CF API (card list changes, commander changes) are never re-synced. The local SQLite data becomes permanently stale for any deck that changes after initial import.

**Why it happens:** The deduplication logic reads: "if `(source, source_id)` exists in SQLite, skip." There is no `updated_at` comparison. This is fine for append-only scrapers but wrong for data sources that update existing records.

**Consequences:**
- Commander card stats are computed from stale deck snapshots if Moxfield decks evolve
- This is low-urgency for the 506K deck initial sync (most scraped decks are historical snapshots) but becomes problematic for incremental updates
- More immediately: if `sync_pg_to_sqlite.py` is run twice, the second run skips all 506K decks even if the PG source was updated

**Warning signs:**
- Running sync a second time reports `decks_inserted: 0, decks_skipped: 506K` — expected and correct for the first milestone, but a problem for ongoing sync
- Card stats don't improve after running the pipeline a second time on newer data

**Prevention:**
- For the initial milestone, this is acceptable — focus on getting the 506K decks loaded once
- For incremental updates (Phase 4+), add a `scraped_at` comparison: re-sync PG decks whose `scraped_at` is newer than the SQLite `scraped_at`
- Add a `--force-resync` flag for manual override

**Phase that should address it:** Phase 1 for initial sync (acceptable as-is), Phase 4 (incremental updates) for ongoing correctness.

---

### Pitfall 6: Collection Coverage Percentage is Misleading Without Key-Card Weighting

**What goes wrong:** A naive collection coverage metric (cards owned / total deck cards) can show 85% coverage when the 15% missing cards are the engine pieces — the commander's key synergy cards, the win conditions, or the specific payoffs that make the deck function. The user sees "85% covered" and feels good, but the deck is unplayable without the missing cards.

**Why it happens:** Percentage coverage treats all cards as equivalent weight. In Commander, a 99-card deck may have 20 "engine" cards and 79 role-players/lands. Owning all the lands and generic ramp but missing the engine cards produces a high coverage percentage with a non-functional deck.

**Consequences:**
- Upgrade suggestion ranking by "biggest improvement per card added" (per PROJECT.md requirements) becomes wrong: a $0.50 land shows as a lower-priority upgrade than a $20 engine card, even though the $0.50 card is replaceable and the $20 card is not
- Users are misled into thinking their collection is "almost complete" when the critical missing cards are expensive/hard to find
- Budget recommendation surface area is incorrect: showing budget alternatives for non-critical cards instead of critical cards

**Warning signs:**
- Upgrade suggestions list cheap replaceable cards (extra ramp, basic lands) above expensive engine cards
- A deck at 80% coverage plays much worse than expected
- User feedback: "it said I'm close but the deck does nothing"

**Prevention:**
- Weight cards by their `inclusion_rate` from `commander_card_stats`: a card at 60%+ inclusion in community decks is "key" and should anchor the coverage percentage
- Calculate two metrics: "staple coverage" (% of high-inclusion cards owned) and "overall coverage" (% of all deck cards owned) — display both
- In the upgrade suggestion ranker, multiply impact by `inclusion_rate`: a card at 70% inclusion that you don't own has higher upgrade priority than a card at 10% inclusion you do own

**Phase that should address it:** Phase 3 (scoring/coverage). Define the weighting model before implementing the coverage UI.

---

### Pitfall 7: EDHREC Rate Limiting and 429 Response Handling

**What goes wrong:** The EDHREC scraper uses a fixed 2-second delay between requests (`RATE_LIMIT = 2.0`). If EDHREC detects the pattern (same User-Agent, fixed interval, sequential commander requests) and returns HTTP 429 or silently serves degraded/empty responses, the pipeline continues — storing empty results for commanders and counting them as "success."

**Why it happens:** The scraper checks `status_code == 200` and proceeds. A 429 would be caught and return `None` from `fetch_average_decklist()`, which is handled. But Cloudflare and similar systems sometimes return 200 with an "I'm checking your browser" page instead of a 429, which then fails JSON parsing and gets logged as `[WARN] Failed to parse __NEXT_DATA__` — treated as a soft failure.

**Consequences:**
- Burst scraping (fetching all 2271 commanders in one pipeline run) is likely to trigger detection after a few hundred requests
- The pipeline step reports completion but EDHREC data is sparse
- Retrying the degraded step re-scrapes the same commanders that were rate-limited, not the ones that succeeded

**Warning signs:**
- Parse failures (`[WARN] No __NEXT_DATA__ found`) spike after ~200-300 commanders
- Fetched card counts drop from 80-100 cards per commander to 0-5 cards per commander midway through a run
- Cloudflare challenge pages contain the string `cf-browser-verification` or similar — can be detected in response text

**Prevention:**
- Add jitter to the delay: `time.sleep(RATE_LIMIT + random.uniform(0, 1.5))` to avoid fixed-interval detection
- After every 50 commanders, pause for 30-60 seconds to let rate-limit windows reset
- Detect Cloudflare/empty-response cases: if `resp.text` contains `cf-browser-verification` or is under 1000 bytes, treat as a rate-limit hit and back off exponentially
- Store a `last_fetched_at` timestamp in `edhrec_avg_decks` per commander — only re-fetch commanders whose data is more than 7 days old in incremental runs (reduces per-run volume from 2271 to ~300)

**Phase that should address it:** Phase 2 (EDHREC integration). Add the jitter and staleness-check before running the mass fetch.

---

### Pitfall 8: commander_card_stats Aggregation is O(n*m) Without Index Warmup

**What goes wrong:** `aggregate_commander_stats.py` runs a correlated subquery for each of the 2271 commanders: for each commander, find all deck IDs where it appears in the `commander` board, then aggregate all main-board cards across those decks. With 506K decks and 100+ cards each (48M+ card rows), the inner `IN` subquery must scan `community_deck_cards` for each commander.

**Why it happens:** The script was written to be correct first. The `idx_ccs_commander` index on `commander_card_stats` helps the final lookup but not the expensive aggregation query against `community_deck_cards`.

**Consequences:**
- First run against 506K decks may take hours on a laptop with spinning disk or slow SSD
- SQLite holds the WAL lock during heavy writes — the Next.js app cannot read the DB during this period, causing Electron to show stale data or error
- On failure (power loss, interrupt), the partial run leaves the table in the empty-then-partial state (see Pitfall 2)

**Warning signs:**
- Aggregation runs more than 5 minutes per 100 commanders
- `PRAGMA wal_checkpoint` shows high pending pages — Next.js reader threads backing up
- Machine fan spins up, SQLite DB file grows rapidly

**Prevention:**
- Ensure `idx_ccs_incl` and both existing indices on `community_deck_cards` exist before aggregation: `CREATE INDEX IF NOT EXISTS idx_cdc_board_card ON community_deck_cards(board, card_name)` and `idx_cdc_deck_board ON community_deck_cards(community_deck_id, board)`
- Run a `PRAGMA optimize` and `ANALYZE` before the aggregation loop — SQLite's query planner improves dramatically with fresh statistics
- Set `PRAGMA cache_size=-256000` (256MB) for the aggregation session — the script only sets 64MB currently
- Consider running the aggregation in a separate process so the main Electron DB is not locked

**Phase that should address it:** Phase 1 (data sync) — add index creation to the sync script, before bulk import.

---

### Pitfall 9: Synergy Score Defined as Simple Subtraction is Fragile for Rare Commanders

**What goes wrong:** `synergy_score = inclusion_rate - global_rate` correctly identifies "this card appears more often with this commander than globally." But for a commander with only 10-15 decks (the `--min-decks 10` minimum), a single deck running a janky combo card causes a 6-10% inclusion rate for that card — which against a 0.1% global rate produces a `synergy_score` of ~0.09, outscoring legitimate synergy cards from commanders with hundreds of decks.

**Why it happens:** The statistical confidence of a 10-deck sample is low. A 1-in-10 occurrence is not a synergy signal — it's noise. The formula has no confidence penalty for small sample sizes.

**Consequences:**
- Niche commanders get bizarre card recommendations from outlier decks
- A jank combo card in 1/10 decks for a rare commander gets scored higher than Sol Ring's legitimate role in 800/2271 Atraxa decks
- The deck builder injects these low-confidence cards into the candidate pool, producing inconsistent suggestions for the same commander across builds

**Warning signs:**
- `deck_count` is 1 or 2 but `synergy_score` is high (> 0.05) in `commander_card_stats`
- For obscure commanders, recommended cards don't appear in the EDHREC average deck
- The same commander built twice produces significantly different card lists

**Prevention:**
- Apply a confidence penalty: `adjusted_synergy = synergy_score * min(1.0, deck_count / 30)` — a card in 30/30 decks has full confidence, 5/30 decks has ~17% confidence
- Alternatively: require `deck_count >= 5` (not just `>= 2`) for a card to appear in `commander_card_stats` — the current `HAVING COUNT(...) >= 2` threshold is too loose
- Consider Laplace smoothing: add a pseudo-count of 1 to both numerator and denominator before computing `inclusion_rate`

**Phase that should address it:** Phase 2 (aggregation/scoring). Update the `aggregate_commander_stats.py` formula before the scoring algorithm consumes the data.

---

## Minor Pitfalls

---

### Pitfall 10: Card Name Normalization Mismatches Between PG and SQLite

**What goes wrong:** PostgreSQL CF API stores card names as scraped from Moxfield/Archidekt (e.g., `"Atraxa, Praetors' Voice"` with typographic apostrophe `'`). SQLite `cards` table stores names from Scryfall (uses standard apostrophe `'`). The `COLLATE NOCASE` on `commander_name` in `getCommanderCardStats()` handles case but not Unicode normalization. Name-matching queries that join on card names silently fail to find matches.

**Prevention:** Add a normalization step in `sync_pg_to_sqlite.py` that replaces `'` (U+2019) with `'` (U+0027) and strips trailing whitespace from all card names before insertion. Already relevant to existing code: `commander_to_slug()` in `fetch_avg_decklists.py` only handles URL encoding, not DB name normalization.

**Phase:** Phase 1 (data sync). One-line fix in the transform step.

---

### Pitfall 11: EDHREC Scraping Legally Gray — No Official API

**What goes wrong:** EDHREC has no official API. The scraper accesses `json.edhrec.com` (an unofficial endpoint) and falls back to parsing `__NEXT_DATA__` from the HTML. EDHREC's ToS is not explicitly published online, but they have historically tolerated low-volume scraping. At high volume (2271 commanders, daily runs), the behavior is less certain.

**Prevention:** Keep scrape volume low: run the commander fetch once per week rather than nightly. Implement the staleness check (Pitfall 7 prevention) so only ~300 commanders re-fetch per run, not all 2271. Do not use concurrent requests — single-threaded with jitter only. Consider contacting EDHREC about data sharing (they have existing partnerships with AetherHub).

**Phase:** Phase 2 (EDHREC integration). The staleness logic should be in place before running mass fetches.

---

### Pitfall 12: Silent Error Swallowing Masks Sync Failures

**What goes wrong:** 14 try/catch blocks in `db.ts` return empty results silently (documented in CONCERNS.md). During data sync, if the `community_deck_cards` table becomes temporarily unavailable (mid-migration, locked by pipeline), `getCommunityRecommendations()` returns `[]` without logging. The deck builder then falls back to template-only mode — silently degraded.

**Prevention:** This is documented in CONCERNS.md and should be fixed as part of Phase 1 setup. Add `console.warn()` with error message to each catch block. The fix is mechanical — search for `} catch {` in `db.ts` (14 occurrences) and add one line each.

**Phase:** Phase 1 (infrastructure). A prerequisite for debugging sync issues.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| PG-to-SQLite sync (Phase 1) | Array/JSONB type serialization (Pitfall 1) | Explicit `json.dumps()` for any list/dict before SQLite insert |
| PG-to-SQLite sync (Phase 1) | Non-atomic delete+rebuild (Pitfall 2) | Temp-table swap or deferred DELETE |
| PG-to-SQLite sync (Phase 1) | Card name Unicode normalization (Pitfall 10) | Normalize apostrophes before insert |
| PG-to-SQLite sync (Phase 1) | Silent errors masking sync failures (Pitfall 12) | Add console.warn to all 14 silent catch blocks |
| Commander aggregation (Phase 1-2) | O(n*m) performance, DB lock during WAL write (Pitfall 8) | Add indices before sync, run in separate process |
| EDHREC fetch (Phase 2) | JSON structure change empties data (Pitfall 3) | Canary check + minimum-cards guard before DELETE |
| EDHREC fetch (Phase 2) | Rate limiting, 429 handling (Pitfall 7) | Jitter + backoff + staleness skip |
| EDHREC fetch (Phase 2) | Legal/ToS gray area (Pitfall 11) | Weekly schedule, low volume, single-threaded |
| Scoring algorithm (Phase 3) | Staple dominance crowds out commander identity (Pitfall 4) | Two-pass scoring: commander cards first, staples fill remaining |
| Scoring algorithm (Phase 3) | Small-sample synergy noise (Pitfall 9) | Confidence penalty `min(1.0, deck_count / 30)` |
| Coverage scoring (Phase 3) | Misleading coverage % ignores key cards (Pitfall 6) | Dual metric: key-card coverage + overall coverage |
| Incremental updates (Phase 4+) | Stale decks never re-synced (Pitfall 5) | `updated_at` comparison for incremental runs |

---

## Sources

- Codebase audit: `scripts/sync_pg_to_sqlite.py`, `scripts/aggregate_commander_stats.py`, `scripts/fetch_avg_decklists.py`, `src/lib/deck-builder-ai.ts`, `src/lib/db.ts`
- `.planning/codebase/CONCERNS.md` — project-specific known issues
- [PostgreSQL JSONB vs SQLite TEXT storage](https://www.postgresql.org/docs/current/datatype-json.html) — MEDIUM confidence (official docs)
- [SQLite JSON handling and JSONB disambiguation (3.45.0)](https://sqlite.org/json1.html) — HIGH confidence (official docs)
- [Offline-first SQLite sync pitfalls — RxDB](https://rxdb.info/downsides-of-offline-first.html) — MEDIUM confidence (technical blog, aligns with official patterns)
- [PowerSync PostgreSQL-SQLite sync](https://www.powersync.com/blog/introducing-powersync-v1-0-postgres-sqlite-sync-layer) — MEDIUM confidence
- [EDHREC popularity bias analysis — The Mana Base](https://themanabase.com/the-metaworker-edhrec-and-evaluating-staples-as-auto-includes/) — MEDIUM confidence (community expert analysis)
- [EDHREC unofficial Python wrapper — pyedhrec on PyPI](https://pypi.org/project/pyedhrec/) — HIGH confidence (published library, confirms no official API)
- [Is web scraping legal 2025 — browserless](https://www.browserless.io/blog/is-web-scraping-legal) — MEDIUM confidence
- [EDHREC generic commander problem — EDHREC editorial](https://edhrec.com/articles/the-problem-of-generic-commanders) — HIGH confidence (primary source)
- [AetherHub EDHREC partnership context](https://aetherhub.com/Article/Working-with-EDHREC-and-sharing-our-Commander-deck-data) — HIGH confidence (primary source)
- [MTG deck scoring bias discussion — CS229 Stanford paper](https://cs229.stanford.edu/proj2012/HauPlotkinTran-MagicTheGatheringDeckPerformancePrediction.pdf) — MEDIUM confidence (academic, older but analysis still valid)
