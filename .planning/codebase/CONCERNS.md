# Codebase Concerns

**Analysis Date:** 2026-04-12

## Data Integrity & Architecture

### Empty Community Data Tables (Critical)

**Problem:** `community_decks`, `community_deck_cards`, `commander_card_stats` tables are empty on local SQLite. Data lives exclusively on VPS PostgreSQL (Railway). AI deck builder degrades gracefully but produces suboptimal "filler" suggestions when community data is absent.

**Files:**
- `src/db/schema.ts` — Tables 17-18 define community_decks, community_deck_cards, commander_card_stats
- `src/lib/db.ts:1121-1400` — getMetaCardStatsMap, getCommanderCardStats, getCommunityRecommendations all return empty results on local DB
- `src/lib/deck-builder-ai.ts:1` — Imports and depends on these functions
- `src/app/api/ai-suggest/benchmark/route.ts:21-94` — Benchmark route checks `communityDeckCount > 0` status

**Impact:**
- Deck suggestions based on EDHREC rank only, missing tournament meta data
- Per-commander synergy not applied (no high-inclusion card injection)
- Color-adjusted staple scoring unavailable
- Users may get 10+ "filler" creatures at same CMC instead of role-diverse picks
- Benchmark reports show `status: 'empty'` for community data source

**Mitigation in place:**
- AI deck builder has fallback logic: EDHREC → archetype template → role-based quotas
- deck-builder-ai.ts:1112-1250 includes arsenal pre-fill from `analyzeCommanderForBuild()`
- getCommunityRecommendations() returns `[]` gracefully, not exception

**Fix approach:**
1. Sync VPS PostgreSQL data to local SQLite nightly (pipeline step)
2. OR: Remote API call to VPS /api/meta-stats before building (adds latency)
3. OR: Ship pre-populated SQLite dump in Electron app (400MB+)
4. Recommended: Add migration-on-startup that queries VPS and populates local tables

---

### Empty Commander_Card_Stats After Recent Feature Add

**Problem:** Migration 34 added `commander_card_stats` table (2K+ commander profiles, 2.18M card stats from 506K+ decks). Table created but never populated. Pipeline step `aggregate_commander_stats.py` never ran.

**Files:**
- `src/db/schema.ts:~950` — Migration 34 (commander_card_stats table)
- `src/lib/db.ts:1284-1323` — getCommanderCardStats() queries but table is empty
- `src/lib/deck-builder-ai.ts:320-360` — Uses getCommanderCardStats() for per-commander synergy
- `src/lib/commander-analysis.ts:~150` — analyzeCommanderForBuild() also tries to use it

**Impact:**
- Commander-specific card scoring unavailable
- High-inclusion cards not injected (should be in top 25% of candidate pool)
- Color-adjusted staples have no override for per-commander thresholds
- Synergy bonus from commander stats lost (was +70 for 60%+ inclusion)

**Test coverage:**
- No unit tests for per-commander stats pipeline
- No integration test verifying commander stats populated after build
- Storm/ooze synergy (recently added) untested with real data

**Fix approach:**
1. Run `py scripts/pipeline.py --reset-step aggregate_commander_stats` manually once
2. Add to nightly schedule (pipeline.py already has scheduler hook)
3. Add test: `tests/commander-stats.test.ts` verifying population and scoring impact

---

## Code Quality & Testing Gaps

### Untested AI Deck Builder Core (High Risk)

**Problem:** `autoBuildDeck()` and `buildScoredCandidatePool()` are 1,868 lines of critical logic with zero unit tests. These are the main code paths for all AI-generated decks.

**Files:**
- `src/lib/deck-builder-ai.ts:1112-1567` — autoBuildDeck() main entry point
- `src/lib/deck-builder-ai.ts:800-1110` — buildScoredCandidatePool() candidate pool construction
- No corresponding test file (no .test.ts or .spec.ts)

**Impact:**
- Filler card regressions not caught (e.g., 5b8c6bc "collection filter bypass" bug discovered in production)
- Role-based quotas drift (ramp/draw/removal/wipes) without validation
- Commander constraint system doesn't validate hard constraints
- Synergy detection changes (storm/ooze) untested against real decks
- Color-adjusted staple scoring invisible — no test coverage

**Test gaps:**
- No test for "build deck with 0 community data" (current state)
- No test for "build deck, verify role quotas met"
- No test for "build with collection enforcement, verify no unowned cards"
- No test for "build commander, verify commander not duplicated"
- No test for per-commander synergy injection

**Fix approach:**
1. Add `src/lib/__tests__/deck-builder-ai.test.ts` — 400+ lines covering:
   - Build with empty community data (baseline)
   - Build from collection (verify ownership)
   - Build commander (verify 1x commander, 99 other)
   - Role quota validation (ramp ≥3, draw ≥4, etc.)
   - Color identity filtering (no off-color cards)
   - Synergy injection (storm/ooze markers present if commander requires)
2. Run against 5-10 real decks (Golbez, Atraxa, etc.) to catch filler regressions
3. Benchmark build time (<2s for 100-card deck)

---

### Silent Error Swallowing (Medium Risk)

**Problem:** 14 try/catch blocks in db.ts return empty results instead of logging/propagating errors. This masks data loading failures silently.

**Files:**
- `src/lib/db.ts:1159` — getMetaCardStatsMap() catches all, returns empty Map
- `src/lib/db.ts:1203` — getMetaRankedCardNames() catches all, returns empty Map
- `src/lib/db.ts:1270` — getFormatStaples() catches all, returns empty array
- `src/lib/db.ts:1321` — getCommanderCardStats() catches all, returns empty array
- `src/lib/db.ts:1397` — getCommunityRecommendations() catches all, returns empty array
- Plus 9 more in collection/deck query functions

**Impact:**
- Migration failures during startup swallowed (app may run with corrupted schema)
- Missing tables due to schema mismatch not reported
- Performance: FTS5 rebuild failures cause table scans, silently slow down searches
- Debugging: "why are suggestions empty?" — unclear if table missing or query failed

**Pattern observed:**
```typescript
try {
  const rows = db.prepare(query).all(...params);
  // ... process rows
} catch {
  // silence
  return [];
}
```

**Fix approach:**
1. Replace with conditional logging + fallback:
```typescript
try {
  const rows = db.prepare(query).all(...params);
  // ...
} catch (err) {
  console.warn('Failed to load meta_card_stats:', err instanceof Error ? err.message : String(err));
  return [];
}
```
2. Add debug flag: `DEBUG=mtg:db*` to enable detailed error logs
3. Test: intentionally delete a table, verify error is logged to console

---

### Missing Unit Tests for Core Synergy Features (High Risk)

**Problem:** Storm synergy detection and Ooze tribal awareness added in commit c7c704c but untested. SYNERGY_REQUIREMENTS_MAP (line 25-41 in deck-builder-ai.ts) maps 12 categories to oracle text patterns, but no test validates pattern matching.

**Files:**
- `src/lib/deck-builder-ai.ts:25-41` — SYNERGY_REQUIREMENTS_MAP definitions
- `src/lib/deck-builder-ai.ts:1260-1288` — Category matching logic in Step 4b
- No test file validating pattern correctness

**Risk:**
- "storm" patterns: ['draw a card', 'add {', ...] — too broad, may match non-storm
- "creature_dies" patterns: ['whenever', 'dies', 'sacrifice'] — "whenever a creature enters" matches (false positive)
- "creature_etb" patterns: ['enters the battlefield', 'enters'] — too vague
- Pattern matching case-sensitive? Documentation unclear

**Test needed:**
- Storm cards (Brain Freeze, Grapeshot, Tendrils) match "storm" category
- Non-storm card (Accumulated Knowledge) does NOT match
- "enters the battlefield" cards (Peregrine Drake, Panharmonicon) match "creature_etb"
- "dies" is used only in context of creature death, not "death processing"

**Fix approach:**
1. Add `src/lib/__tests__/synergy-detection.test.ts` — 150+ lines:
   - Test each SYNERGY_CATEGORY against 3-4 real cards (match + non-match)
   - Verify case-insensitive matching
   - Verify oracle text parsing (handling {W}, {1}{U}, mana symbols)
2. Add property tests: "if a card has 'whenever a creature dies', creature_dies category matches"
3. Run against full card database, report false-positive/negative rates

---

## Data-Driven Architecture Issues

### Deleted Cleanup Files & Documentation Debt

**Problem:** 26 files deleted but not committed. Gitignore tracking broken. Creates confusion about current project state.

**Deleted files in git status:**
- `.planning/HANDOFF.json` — Orchestrator context
- `.planning/phases/01-ai-provider-upgrades/.continue-here.md` — Phase state
- `ANALYSIS_SUMMARY.md`, `ARENA_DATA_*`, `IMPLEMENTATION_CODE_SNIPPETS.md` — Analysis docs
- `scripts/cf-api-patches/*`, `scripts/*vivi*`, `scripts/telegram-bot-upgrade.js` — Debug/experiment scripts
- `setup.{bat,sh,js}`, `windows-setup.*` — Setup scripts (replaced by `first-boot.ts`)

**Impact:**
- Git history polluted: 26 unstaged deletions in `git status`
- Unclear: are these intentionally removed or accidentally?
- New contributors may restore deleted files, reigniting old bugs
- CI/CD might warn about "uncommitted changes"

**Fix approach:**
1. Run: `git add -A && git commit -m "chore: clean up experiment and analysis files"`
2. Add to `.gitignore`:
```
scripts/cf-api-patches/
scripts/check_vivi*.js
scripts/fix_vivi*.js
scripts/sync_vivi*.js
scripts/telegram-bot-upgrade.js
scripts/run_benchmark.js
setup.bat
setup.sh
setup.js
windows-setup.*
.planning/HANDOFF.json
.planning/phases/*/
ANALYSIS_SUMMARY.md
ARENA_DATA_*.md
IMPLEMENTATION_CODE_SNIPPETS.md
SESSION_CONTEXT.md
```
3. Commit cleanup + gitignore rules

---

### Collection Filter Bypass (Recently Fixed, Monitor for Regression)

**Problem:** Collection enforcement bug fixed in commit 5b8c6bc but fragile. Three separate bypass paths were identified. Similar bugs likely in other filter logic.

**Files:**
- `src/lib/deck-builder-ai.ts:1145-1146` — getMaxQty() enforces owned qty or 0
- `src/app/api/ai-suggest/apply/route.ts` — Skips unowned cards with warning
- No regression test preventing similar bypasses

**Details:**
- Bug 1: Collection join wasn't applied in certain code paths
- Bug 2: useCollection flag not threaded through all functions
- Bug 3: Fallback logic didn't respect collection boundaries

**Fix approach:**
1. Add integration test: build deck with `collectionOnly=true`, verify all cards owned
2. Add invariant check at deck save time: `validateDeckAgainstCollection(deckId, userId)`
3. Unit test: getMaxQty(unowned_card) returns 0, (owned_card) returns min(owned, formatMax)

---

## Performance & Scalability

### Large File Risk: deck-builder-ai.ts (1,868 lines)

**Problem:** Single file exceeds recommended 800-line limit (2.3x over). Mixes concerns: candidate pool scoring, role-based picking, land intelligence, commander arsenal building.

**Files:**
- `src/lib/deck-builder-ai.ts` — 1,868 lines

**Modules within:**
1. Synergy detection (lines 25-150)
2. Candidate pool building (lines 800-1110)
3. Main autoBuildDeck (lines 1112-1567)
4. Synergy suggestions (lines 1569-1750+)
5. Helpers & utilities (scattered)

**Risk:**
- Hard to test (can't unit test one module without loading entire file)
- Difficult to reason about (e.g., "does this function modify pool in place?")
- High cognitive load on reviewer
- Merge conflicts (multiple PRs touching different sections)

**Fix approach:**
1. Extract into `src/lib/deck-builder/`:
   - `synergy-detection.ts` — detectDeckThemes(), buildSynergyQuery()
   - `candidate-pool.ts` — buildScoredCandidatePool() + all scoring logic
   - `main.ts` — autoBuildDeck() orchestrator
   - `synergy-suggestions.ts` — getSynergySuggestions()
2. Update imports in deck-builder-ai.ts to re-export (backward compatible)
3. Add unit tests per module

---

### API Route File Size (1,718 lines in ai-suggest/chat/route.ts)

**Problem:** Single API route file handles chat, streaming, knowledge retrieval, and AI provider fallback. Hard to test, debug, and maintain.

**Files:**
- `src/app/api/ai-suggest/chat/route.ts` — 1,718 lines

**Modules within:**
1. Chat message routing (lines 1-200)
2. Knowledge retrieval + formatting (lines 200-400)
3. AI provider cascade (Claude → Groq → xAI) (lines 400-800)
4. Streaming response assembly (lines 800-1200)
5. Error handling + retries (lines 1200-1718)

**Impact:**
- No isolated unit tests for "what if Groq fails?" logic
- Hard to verify "knowledge retrieval returns 5 best matches"
- Debugging: "which provider was used?" unclear from logs
- Single point of failure for all AI chat

**Fix approach:**
1. Extract `src/lib/ai-chat-engine.ts`:
   - orchestrateAIProviders(messages, options)
   - formatKnowledgeContext(results, limit)
   - buildStreamingResponse(provider, stream)
2. Keep route.ts as thin adapter: parse request → call engine → return response
3. Add unit tests for engine (no HTTP mocking needed)

---

## Security & Validation

### Dynamic SQL in updateDeck (Safe but Fragile)

**Problem:** While properly parameterized, the dynamic SQL construction in `updateDeck()` is fragile and could introduce bugs if refactored carelessly.

**Files:**
- `src/lib/db.ts:362-384` — updateDeck() constructs UPDATE clause dynamically

**Current pattern (safe):**
```typescript
const sets: string[] = [];
const vals: unknown[] = [];
if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
// ... more fields
db.prepare(`UPDATE decks SET ${sets.join(', ')} ${whereClause}`).run(...vals);
```

**Risk:**
- If someone adds a field that includes user input (e.g., custom metadata), they might forget to parameterize
- Refactoring to remove check might allow arbitrary field names: `sets.push(fieldName + ' = ?')`

**Mitigation:**
- All field names are hardcoded (safe)
- All values are parameterized via `?` placeholders
- Type-safe: TypeScript enforces which fields are passable

**Fix approach:**
1. Add comment above loop: `// SECURITY: Field names are hardcoded; only values are parameterized`
2. Test: pass `{ '__injected__': "x = 1; DROP TABLE users; --" }` — should reject (type error)
3. Document in CONVENTIONS.md: "SQL construction must whitelist field names and parameterize values"

---

### Overwolf Ad Component Using dangerouslySetInnerHTML

**Problem:** OverwolfAd component injects `<owadview/>` via dangerouslySetInnerHTML. Low risk (hardcoded, not user input) but violates React best practices.

**Files:**
- `src/components/overwolf-ad.tsx:36` — `dangerouslySetInnerHTML={{ __html: '<owadview></owadview>' }}`

**Risk Assessment:**
- No user input involved (string is literal)
- Overwolf custom element (not executing arbitrary code)
- Only rendered in Overwolf runtime (not in Electron or browser)
- Low security risk, but violates convention

**Fix approach:**
1. Replace with proper custom element:
```typescript
export function OverwolfAd({ size, className = '' }: OverwolfAdProps) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    checkIsOverwolf().then(setShow);
  }, []);
  if (!show) return null;
  const [width, height] = size.split('x').map(Number);
  return (
    <div className={`overflow-hidden ${className}`} style={{ width, height }}>
      {/* Overwolf custom element — no dangerouslySetInnerHTML needed */}
      <owadview style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
```
2. Note: TypeScript may warn about unknown element. Add declaration file if needed.

---

### Environment Variable Handling

**Problem:** Critical secrets (Claude API key, Stripe keys) stored in `app_state` table. If DB is leaked, secrets are exposed.

**Files:**
- `src/lib/auth.ts` — Assumes jwt_secret loaded at startup
- `src/app/api/ai-suggest/chat/route.ts` — Fetches claude_api_key from app_state
- `src/app/api/billing/webhook/route.ts` — Fetches stripe_webhook_secret from app_state

**Current mitigation:**
- Secrets are optional (graceful fallback to dummy key)
- User can set via Settings UI
- No hardcoded defaults in source

**Risk:**
- If user exports DB for backup/sharing, secrets leak
- No rotation mechanism
- No audit log of secret access

**Recommended (not urgent):**
1. For production: Use environment variables only (`process.env.CLAUDE_API_KEY`)
2. Add to CONVENTIONS.md: "Never read secrets from DB, always from env vars"
3. Add startup check: warn if critical secret is missing or uses dummy value

---

## Known Regressions & Edge Cases

### Storm & Ooze Synergy Untested with Real Data

**Problem:** Commit c7c704c added storm synergy detection and ooze tribal awareness, but no integration tests verify these work correctly.

**Features added:**
- `SYNERGY_REQUIREMENTS_MAP.storm` — targets cards that create mana, untap, draw (line 29)
- Ooze tribal detection in commander synergy (classifier)

**Test gaps:**
- No test: "Build Garth One-Eye deck, verify storm cards included"
- No test: "Build Ooze tribal deck, verify ooze lords prioritized"
- No test: "Build non-ooze deck, verify ooze cards not over-suggested"

**Current risk:**
- Storm pattern too broad ("draw a card", "add {") — may match non-storm
- Ooze tribal only tested manually

**Fix approach:**
1. Add integration test: build 3 real decks (Garth, Baral, Ooze-themed)
2. Verify: suggested cards include known storm/ooze synergy
3. Benchmark: compare to EDHREC recommendations (should have 70%+ overlap for major themes)

---

### Collection Import CSV Edge Cases

**Problem:** CSV import skips rows with parse errors but doesn't validate format strictly. Silently skips bad rows.

**Files:**
- `src/app/api/collection/import-csv/route.ts` — Import handler with skip counters

**Pattern:**
```typescript
let skipped = 0;
for (const row of parsed) {
  try {
    // parse card
  } catch {
    skipped++;
  }
}
// Returns: { imported, updated, skipped }
```

**Risk:**
- User may upload file with 100 rows, silently skip 50 (no detailed error)
- No feedback on which rows failed
- No validation of expected CSV schema

**Fix approach:**
1. Add row-level error tracking: `skipped: [{ row: 5, name: 'Invalid Mana Cost', error: '...' }]`
2. Add CSV schema validation (first row must be headers: name, quantity, foil)
3. Return detailed error report to client
4. Test: upload malformed CSV, verify all errors reported

---

## Database & Schema Concerns

### Migration Version Gap

**Problem:** Schema has 34 migrations defined, but only a few have real test data. No way to know if all migrations work correctly on fresh install.

**Files:**
- `src/db/schema.ts:1-1300+` — MIGRATIONS array with 34 entries

**Risk:**
- Migration 34 (commander_card_stats) was added but never ran in test environment
- If a migration has a typo (e.g., wrong column name), it won't be caught until user runs it
- No automated test: "create fresh DB from migrations, verify schema is correct"

**Fix approach:**
1. Add `src/lib/__tests__/migrations.test.ts`:
   - Create in-memory DB
   - Run all 34 migrations
   - Verify tables exist, columns correct, indices created
   - Verify no duplicate version numbers
2. Run in CI: verify schema migration on every push
3. Add script: `npm run db:validate` — check current schema against expected state

---

### FTS5 Trigger Maintenance

**Problem:** FTS5 full-text search on `cards_fts` table depends on triggers. If card data is updated manually (rare), triggers may fail to keep FTS in sync.

**Files:**
- `src/db/schema.ts:45-68` — cards_fts FTS5 table + triggers

**Current triggers:**
- `cards_ai` (INSERT)
- `cards_ad` (DELETE)
- `cards_au` (UPDATE)

**Risk:**
- If DB is exported/imported, triggers may not copy
- If card data is bulk-updated outside app, FTS becomes stale
- No way to rebuild FTS index from UI

**Fix approach:**
1. Add command: `npm run db:rebuild-fts`
2. Procedure: DELETE FROM cards_fts; REBUILD; VACUUM
3. Add to first-boot process (safety check)
4. Document in CONVENTIONS.md: "Never bulk-update cards table; always use app API"

---

## Deployment & Packaging

### Large Standalone Bundle (443MB unpacked)

**Problem:** Electron standalone build is large. Packaged installer is ~153MB, but unpacked is 443MB. This impacts:
- Download size on first install
- Disk space required
- Update speed

**Files:**
- `scripts/postbuild-standalone.js` — Assembles standalone
- `electron-builder.yml` — Packaging config

**Breakdown:**
- Next.js standalone: ~140MB
- node_modules (traced): ~150MB
- Cards database (Scryfall): ~50MB
- better-sqlite3 native module: ~5MB
- UI assets (Recharts, Tailwind): ~30MB
- Other: ~68MB

**Mitigation:**
- Standalone mode reduces from 719MB to 443MB (38% reduction)
- better-sqlite3 prebuilt binaries cached (no rebuild on each release)
- Cards seeded lazily (not bundled)

**Future optimization:**
1. Lazy-load Recharts (only in analytics page) — saves ~10MB
2. Extract cards to separate download (seed on first launch) — saves ~50MB to app bundle
3. Investigate unused dependencies (24 deps removed in recent cleanup)

---

## Summary: Priority Issues

**Critical (Fix before next release):**
1. ✅ MDFC color identity leak — fixed in cd3ba1c
2. Collection enforcement regression — add regression test

**High (Fix in 2-4 weeks):**
1. Untested deck builder core — add autoBuildDeck.test.ts (400+ lines)
2. Empty commander_card_stats — populate via nightly pipeline
3. Silent error swallowing — add logging + conditional fallback
4. Deleted files cleanup — commit removal + update .gitignore

**Medium (Fix in 1-2 months):**
1. Large file refactoring (deck-builder-ai.ts, chat route)
2. Synergy feature tests (storm, ooze)
3. Migration validation (test all 34 migrations)
4. Collection import error reporting

**Low (Nice to have):**
1. Overwolf ad component refactoring
2. FTS5 rebuild command
3. Bundle size optimization

---

*Concerns audit: 2026-04-12*
