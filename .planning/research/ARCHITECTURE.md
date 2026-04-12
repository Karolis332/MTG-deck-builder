# Architecture Patterns

**Domain:** PostgreSQL→SQLite sync pipeline + commander deck analysis engine
**Project:** The Black Grimoire — data pipeline and scoring overhaul
**Researched:** 2026-04-12

---

## Recommended Architecture

The pipeline has four distinct component layers that compose linearly: ingest → store → analyze → score.
Each layer has a single owner, communicates in one direction, and can be tested independently.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL SOURCES                                                             │
│                                                                               │
│  VPS PostgreSQL (CF API)          EDHREC JSON API                            │
│  grimoire-cf-api Docker           json.edhrec.com/pages/commanders/{slug}    │
│  commander_card_stats table       average-decks/{slug}.json                  │
└──────────────────────┬────────────────────────┬──────────────────────────────┘
                       │ HTTP (X-API-Key)        │ HTTP (rate-limited 2s)
                       ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: INGEST (Python scripts, runs in nightly pipeline)                  │
│                                                                               │
│  sync_commander_stats.py          fetch_avg_decklists.py (existing)          │
│  - Calls CF API /commander-stats  - Calls EDHREC JSON API                    │
│  - Receives: [{commander_name,    - Parses __NEXT_DATA__ fallback             │
│    card_name, inclusion_rate,     - Emits: edhrec_avg_decks rows             │
│    deck_count, synergy_score}]                                                │
│  - Emits: commander_card_stats rows                                           │
└──────────────────────┬────────────────────────┬──────────────────────────────┘
                       │ INSERT OR REPLACE       │ INSERT OR REPLACE
                       ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: LOCAL SQLITE STORE (better-sqlite3, WAL mode)                      │
│                                                                               │
│  commander_card_stats             edhrec_avg_decks                           │
│  (migration 34, schema exists)    (migration 15, schema exists)              │
│                                                                               │
│  card_deck_index (NEW, migration 35)                                         │
│  - Inverted index: card_name → [commander_names]                             │
│  - Answers "which commanders run Smothering Tithe" in <1ms                   │
│  - Populated as a side effect of sync_commander_stats.py                     │
└──────────────────────┬────────────────────────────────────────────────────────┘
                       │ SELECT (synchronous, getDb())
                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: ANALYSIS ENGINE (TypeScript, src/lib/)                             │
│                                                                               │
│  commander-analysis.ts (NEW)                                                 │
│  - analyzeCommanderDecks(commanderName, options)                             │
│  - Reads commander_card_stats + edhrec_avg_decks + cards (oracle text)       │
│  - Merges two data sources with priority: CF API > EDHREC                    │
│  - Outputs: CommanderProfile { topCards[], synergyWeights, roleMap }         │
│  - Must complete in <500ms (reads local SQLite only, no network)             │
│                                                                               │
│  collection-coverage.ts (NEW)                                                │
│  - scoreCollectionCoverage(deckCards, userId)                                │
│  - Joins deck_cards against collection WHERE user_id = ?                     │
│  - Outputs: CoverageResult { pct, missing[], owned[], upgrades[] }           │
│  - upgrades sorted by: inclusion_rate DESC, price_usd ASC                   │
└──────────────────────┬────────────────────────────────────────────────────────┘
                       │ function call (pure, no network)
                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: SCORING INTEGRATION (existing deck-builder-ai.ts)                  │
│                                                                               │
│  deck-builder-ai.ts (modified)                                               │
│  - getCommanderCardStats() path already wired (returns [] when table empty)  │
│  - Add: mergeCommanderProfile(commanderProfile, existingCandidates)          │
│  - commander_card_stats rows inject real inclusion_rate into scoring formula │
│                                                                               │
│  /api/ai-suggest/route.ts (modified)                                         │
│  - Add coverage result to response envelope                                  │
│  - Add upgrade suggestions to response                                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Reads From | Writes To | Language |
|-----------|---------------|------------|-----------|----------|
| `sync_commander_stats.py` | Pull CF API `commander_card_stats` → local SQLite | CF API HTTP `/commander-stats` | `commander_card_stats`, `card_deck_index` | Python |
| `fetch_avg_decklists.py` | Pull EDHREC average decks → local SQLite | EDHREC JSON API | `edhrec_avg_decks` | Python (existing) |
| `card_deck_index` (migration 35) | Inverted index for "card → commanders" lookups | N/A (populated by sync) | N/A (read by analysis engine) | SQL |
| `commander-analysis.ts` | Merge CF + EDHREC data, output a structured commander profile | `commander_card_stats`, `edhrec_avg_decks`, `cards` | No writes (pure read) | TypeScript |
| `collection-coverage.ts` | Score user collection vs. optimal decklist | `collection`, `commander_card_stats` | No writes (pure read) | TypeScript |
| `deck-builder-ai.ts` (modified) | Inject real inclusion rates into candidate scoring | `commander-analysis.ts` output | Existing scoring path unchanged | TypeScript |
| `/api/ai-suggest` (modified) | Expose coverage + upgrades in API response | `collection-coverage.ts` output | No new tables | TypeScript |

**Boundary rules:**
- Python scripts own all ingest. They write to SQLite directly; TypeScript never calls the CF API.
- TypeScript owns all read logic. It never spawns Python subprocesses at request time.
- Analysis engine is pure (no writes). Tests can inject fake DB data freely.
- `card_deck_index` is an optimization table: the analysis engine can work without it (slower query), but build order places it early.

---

## Data Flow: VPS → Local → Scoring

```
VPS PostgreSQL (Docker)
  └─ CF API /commander-stats?commander=X&limit=200
       │  Response: [{card_name, inclusion_rate, deck_count, synergy_score, color_identity}]
       ▼
sync_commander_stats.py
  ├─ Iterates commanders from local decks table (same list as existing pipeline steps)
  ├─ Batches: 50 commanders per run, 200 cards per commander
  ├─ Rate limit: 100ms between requests (CF API is local VPS, can be fast)
  └─ INSERT OR REPLACE INTO commander_card_stats (commander_name, card_name, ...)
       │  Side effect: also populates card_deck_index
       ▼
SQLite commander_card_stats
  ├─ ~2271 commanders × ~150 cards avg = ~340K rows
  ├─ Index: idx_ccs_incl (commander_name, inclusion_rate DESC) — primary query path
  └─ Index: idx_ccs_card (card_name) — lookup which commanders run a card
       ▼
commander-analysis.ts: analyzeCommanderDecks(commanderName)
  ├─ SELECT from commander_card_stats WHERE commander_name = ? ORDER BY inclusion_rate DESC LIMIT 200
  ├─ SELECT from edhrec_avg_decks WHERE commander_name = ? (EDHREC-curated list)
  ├─ For each top card: JOIN cards to get oracle_text, cmc, type_line
  ├─ Merge: CF inclusion_rate as primary weight, EDHREC synergy_score as secondary boost
  └─ Outputs: CommanderProfile { topCards: ScoredCard[], synergyWeights: Map<role, weight> }
       ▼
deck-builder-ai.ts: scoreCandidates(candidates, commanderProfile)
  └─ commanderProfile.topCards injected into scoring formula:
       score += inclusion_rate * 70  (replaces hardcoded commander_card_stats empty branch)
```

```
User collection (collection table, user_id-scoped)
  └─ collection-coverage.ts: scoreCollectionCoverage(topCards, userId)
       ├─ SELECT card_id, quantity FROM collection WHERE user_id = ? AND card_id IN (...)
       ├─ Match by card name via cards.name join
       ├─ Compute coverage pct: owned_slots / total_top_cards
       ├─ missing[]: top cards not in collection, sorted by inclusion_rate DESC
       └─ upgrades[]: missing[] with price_usd and impact_delta (score drop without card)
```

---

## New Database Component: card_deck_index (Migration 35)

Purpose: answer "which commanders run card X?" in a single indexed lookup. This powers future features (collection overlap analysis, "find commanders for cards you own").

```sql
CREATE TABLE IF NOT EXISTS card_deck_index (
  card_name TEXT NOT NULL,
  commander_name TEXT NOT NULL,
  inclusion_rate REAL NOT NULL DEFAULT 0,
  deck_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (card_name, commander_name)
);
CREATE INDEX IF NOT EXISTS idx_cdi_card ON card_deck_index(card_name, inclusion_rate DESC);
CREATE INDEX IF NOT EXISTS idx_cdi_commander ON card_deck_index(commander_name);
```

This table is a denormalized view of `commander_card_stats` with inverted key order. It is written by `sync_commander_stats.py` in the same transaction as `commander_card_stats`. No separate migration trigger or view is needed.

Query pattern for "which decks run Sol Ring":
```sql
SELECT commander_name, inclusion_rate, deck_count
FROM card_deck_index
WHERE card_name = 'Sol Ring'
ORDER BY inclusion_rate DESC
LIMIT 50;
```

Expected response time: <1ms on indexed column. No FTS5 needed.

---

## CF API Endpoint Required: /commander-stats

The existing CF API (`grimoire-cf-api`) has `/recommend` (per-deck) but the schema shows `commander_card_stats` table exists in PostgreSQL (migration 003). A new endpoint must be added to the CF API to expose bulk commander stats.

**Proposed endpoint:**
```
GET /commander-stats?commander={name}&limit=200
Response: { cards: [{card_name, inclusion_rate, deck_count, synergy_score, color_identity}], total_commander_decks: N }
```

Alternative if endpoint is blocked: the sync script can query PostgreSQL directly via SSH tunnel (psql or sqlalchemy), bypassing the HTTP API. This is acceptable for a nightly batch job.

**Decision:** Add HTTP endpoint first (cleaner), fall back to SSH tunnel if CF API changes are deferred.

---

## Patterns to Follow

### Pattern 1: Sync as Pipeline Step

The CF API sync must integrate into the existing 16-step Python pipeline orchestrator (`scripts/pipeline.py`). Add it as step 17 (or between existing steps), following the existing step-state pattern in `pipeline_state.py`.

```python
# In pipeline.py steps list
{"name": "sync_commander_stats", "script": "scripts/sync_commander_stats.py", "optional": False}
```

This gets automatic retry-with-backoff, degraded-mode auto-skip, and Telegram notifications for free.

### Pattern 2: Commander-Keyed Batch Fetch

Do not fetch all 2271 commanders in one HTTP call. Batch by commander name, one request per commander. The pipeline already iterates over commanders when running `aggregate_commander_stats.py`. Reuse that commander list.

```python
# Reuse existing logic from aggregate_commander_stats.py
commanders = conn.execute("SELECT DISTINCT commander_name FROM community_decks LIMIT 500").fetchall()
for row in commanders:
    stats = fetch_commander_stats(row[0])
    upsert_to_sqlite(stats)
```

### Pattern 3: Offline-Safe Scoring Fallback

`commander-analysis.ts` must not fail when the sync has not yet run (empty table). The existing `getCommanderCardStats()` function already returns `[]` on empty table. The analysis engine checks count before merging, and falls back to oracle-text synergy scoring if fewer than 10 rows exist for the commander.

```typescript
// commander-analysis.ts
const cfRows = getCommanderCardStats(commanderName); // returns [] on empty
const hasRealData = cfRows.length >= 10;
if (!hasRealData) {
  // fall back to existing CommanderSynergy oracle text analysis
  return analyzeCommanderFromOracleText(commanderCard);
}
```

### Pattern 4: Merge CF + EDHREC with Explicit Priority

CF API data has 506K decks but no editorial curation. EDHREC has curation (synergy scores) but smaller sample sizes. Merge strategy: CF inclusion_rate is ground truth for "how common", EDHREC synergy_score is a boost for "how synergistic".

```
merged_score = (cf_inclusion_rate * 0.7) + (edhrec_synergy_score * 0.3)
```

If a card appears only in EDHREC (not CF), include it at 30% weight. If only in CF, include at 70% weight. This matches the existing scoring weights in `deck-builder-ai.ts` where CF score already receives a `* 1.5` multiplier.

### Pattern 5: Collection Coverage as Pure Function

`scoreCollectionCoverage` must not be a side-effectful API call. It reads two SQLite tables synchronously and returns a plain object. This ensures it can run inline during the ai-suggest request without adding latency variance.

```typescript
// Pure, synchronous, no network
export function scoreCollectionCoverage(
  topCards: ScoredCard[],
  userId: number
): CoverageResult {
  const db = getDb();
  const cardNames = topCards.map(c => c.name);
  // Single parameterized query with IN clause
  const owned = db.prepare(`
    SELECT c.name, col.quantity
    FROM collection col
    JOIN cards c ON c.id = col.card_id
    WHERE col.user_id = ? AND c.name IN (${cardNames.map(() => '?').join(',')})
  `).all(userId, ...cardNames);
  // ... compute coverage, return plain object
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Calling CF API at Request Time

**What goes wrong:** `/api/ai-suggest` adds a live HTTP call to `http://187.77.110.100/cf-api` with a 5s timeout. If VPS is down or slow, the deck builder hangs. The `cf-api-client.ts` local cache partially mitigates this, but the sync pipeline approach eliminates the problem entirely.

**Why bad:** Electron app must work offline. Adding a synchronous network dependency to the deck build path violates the offline-first constraint.

**Instead:** Sync CF data nightly into local SQLite. The request path reads only local SQLite. The existing `cf_cache` table already demonstrates this pattern.

### Anti-Pattern 2: Spawning Python from TypeScript API Route

**What goes wrong:** An API route runs `child_process.exec('py scripts/sync_commander_stats.py')` to trigger on-demand sync.

**Why bad:** Python startup overhead (~1-2s), no error propagation back to the HTTP response, breaks the standalone Electron build (Python path may not exist in packaged app), and creates concurrent writes against SQLite from two processes.

**Instead:** Python runs only in the nightly pipeline (scheduled). TypeScript API routes read only.

### Anti-Pattern 3: One SQLite Query Per Card in Coverage Scorer

**What goes wrong:** `scoreCollectionCoverage` loops over 100 top cards and calls `getDb().prepare('SELECT ... WHERE name = ?').get(cardName)` 100 times.

**Why bad:** 100 round trips through better-sqlite3, even synchronously, costs 5-20ms each at scale. For a 100-card Commander deck, that is 500-2000ms — well over the 5s total budget.

**Instead:** Single `WHERE name IN (...)` query with all card names as bound parameters. SQLite's `IN` clause on an indexed column handles 200 values in <2ms.

### Anti-Pattern 4: Storing EDHREC HTML in commander_card_stats

**What goes wrong:** Scraping EDHREC HTML via `fetch_avg_decklists.py` and trying to infer `inclusion_rate` from the HTML is brittle (EDHREC changes structure) and the data is not numeric by default.

**Why bad:** EDHREC average deck lists contain cards without numeric inclusion rates — they reflect curatorial judgment, not statistical inclusion. Conflating them with CF API's empirical inclusion_rate poisons the scoring formula.

**Instead:** Use EDHREC data only from `edhrec_avg_decks` and `commander_synergies` (existing tables) for the synergy boost (30% weight). CF API inclusion_rate is the only source for the primary weight (70%).

---

## Suggested Build Order

Build order is determined by the dependency graph. Each phase unblocks the next.

**Phase 1: CF API Endpoint + Ingest Script (unblocks everything)**

Deliverables:
- `GET /commander-stats` endpoint on CF API
- `scripts/sync_commander_stats.py` Python ingest script
- Pipeline step registration in `pipeline.py`
- `commander_card_stats` populated with real data

Why first: Nothing in Phase 2 or 3 can work until the table has data. This is the critical-path item.

**Phase 2: Indexed Card Lookup Table (unblocks Phase 3 "which decks run card X")**

Deliverables:
- Migration 35: `card_deck_index` table
- `sync_commander_stats.py` populates `card_deck_index` as side effect
- `src/lib/card-deck-index.ts` query helper: `getCommandersForCard(cardName)`

Why second: `card_deck_index` is populated by the same sync script as Phase 1, so the schema and query helper can be built immediately after ingest is running. The analysis engine in Phase 3 can use both tables.

**Phase 3: Commander Analysis Engine (unblocks Phase 4)**

Deliverables:
- `src/lib/commander-analysis.ts` with `analyzeCommanderDecks(commanderName)`
- Merge logic: CF primary (70%) + EDHREC boost (30%)
- Offline fallback: oracle-text analysis when table empty
- Unit tests: known commanders return expected top-10 cards

Why third: Depends on Phase 1 data. Purely a TypeScript read layer — no pipeline changes needed. The output type (`CommanderProfile`) is what Phase 4 consumes.

**Phase 4: Collection Coverage Scorer (can run in parallel with Phase 3)**

Deliverables:
- `src/lib/collection-coverage.ts` with `scoreCollectionCoverage(topCards, userId)`
- `upgrade_score` computation: `inclusion_rate` + inverse price
- Tests: mock collection, verify coverage %, upgrade ranking

Why parallel with Phase 3: Does not depend on `commander-analysis.ts` output. Depends only on `commander_card_stats` (Phase 1) and `collection` (existing). The two outputs are composed in Phase 5.

**Phase 5: Deck Builder Integration (requires Phases 3 + 4)**

Deliverables:
- `deck-builder-ai.ts`: replace empty `commander_card_stats` branch with `analyzeCommanderDecks()` call
- `/api/ai-suggest/route.ts`: add `coverage` and `upgrades` fields to response
- Smoke test: build an Aeve (storm+counters) deck, verify no filler, check upgrade list

---

## Scalability Considerations

| Concern | Current (0 rows) | After Phase 1 (~340K rows) | At 2271 commanders |
|---------|-----------------|---------------------------|-------------------|
| Query latency for one commander | <1ms (empty) | <2ms (indexed) | <2ms (index scales) |
| Sync duration (nightly) | N/A | ~3 min (2271 × 100ms delay) | ~3 min (stable) |
| SQLite file size | N/A | ~15-20MB additional | ~25MB cap |
| Cold start (first run) | Instant | First sync ~3 min, then incremental | Incremental <30s |
| Coverage scorer latency | N/A | <5ms (single IN query) | <5ms |

The SQLite WAL mode and existing `busy_timeout = 5000` handle concurrent reads from the Next.js server and writes from the pipeline without blocking.

---

## Sources

- Verified against `src/db/schema.ts` migrations 1-34 (all tables confirmed present)
- Verified against `src/lib/cf-api-client.ts` (CF API client, local `cf_cache` pattern confirmed)
- Verified against `grimoire-cf-api/app/db/models.py` (PostgreSQL `commander_card_stats` table confirmed as migration 003)
- Verified against `grimoire-cf-api/app/routers/recommend.py` (HTTP API structure confirmed)
- Verified against `scripts/aggregate_community_meta.py` (commander list iteration pattern confirmed)
- Verified against `scripts/fetch_avg_decklists.py` (EDHREC ingest pattern confirmed, 2s rate limit)
- Verified against `src/app/api/ai-suggest/route.ts` (existing CF API call path, offline fallback confirmed)
- Confidence: HIGH for all structural claims (confirmed from source code, not training data)
