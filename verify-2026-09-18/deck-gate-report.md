# deck-gate v1 — build report (2026-09-18)

TDD: tests + fixtures written first, confirmed RED ("Failed to load .../deck-gate", 0 tests), then
implemented. Nothing committed. No existing file modified.

## Files created

```
src/lib/deck-gate.ts                                 182  gateDeck() orchestration + GateVerdict
src/lib/deck-gate-parse.ts                           244  types, constants, parseDecklist, DB resolution
src/lib/deck-gate-checks.ts                          305  the individual checks
src/lib/deck-gate-plan.ts                            204  commander condition -> per-card interaction
src/lib/__tests__/deck-gate.test.ts                  188  14 tests
src/lib/__tests__/fixtures/deck-gate/cards.json      100 real card rows exported from the live DB
src/lib/__tests__/fixtures/deck-gate/{emperor-v2,emperor-v5,standard-5copies,split-fire-ice}.txt
scripts/deck-gate.ts                                 119  CLI, exit 1 on fail, --json
scripts/export-gate-fixture.ts                        57  regenerates cards.json from the live DB
docs/DECK_GATE.md                                     80  checks, flags, Alchemy rule, how to add a lock
```

`deck-gate.ts` was 661 lines as one file; split into parse/checks/plan to stay under 500.

## Checks

| id | one line |
| --- | --- |
| `size` | format deck size incl. commander/companion (via `deck-validation.ts`) |
| `singleton` | 1 copy in commander formats, 4 elsewhere; basics and "any number" cards exempt |
| `legality` | per-format legality from the DB, with the Alchemy `A-` rule |
| `rules` | anything else `deck-validation.ts` reports (Competitive Brawl commander bans, sideboard size) |
| `identity` | every card inside the commander's colour identity (both faces) |
| `ownership` | every nonbasic card in the owner's `collection` rows; warns when the snapshot is > 14 days old, stating its age |
| `arenaNames` | `Front // Back` names Arena rejects; reports the corrected line |
| `lands` | effective land count (real + MDFC backs) vs the Karsten target from `land-math.ts`, ±2 |
| `plan` | share of nonland cards that can turn the commander on, and the share that merely name its trigger |
| `curve` | share of nonland cards below the commander's mana threshold |
| `wincons` | win conditions from `card-classifier.ts` + commander-derived closers (warn < 3, fail < 2) |
| `locks` | locked cards present, and not cut between `--before` and `--after` |
| `resolution` | names the card DB does not know |

Reused, not duplicated: `deck-validation.ts` (all format rules), `card-classifier.ts` (roles,
win conditions), `commander-synergy.ts` (`analyzeCommander` trigger categories), `land-math.ts`
(Karsten formula + MDFC credit). DB quirks follow `emperor-audit.cjs` / `check-deck.cjs`.

## Verified

| check | command | observed |
| --- | --- | --- |
| gate tests | `npx vitest run src/lib/__tests__/deck-gate.test.ts` | `Test Files 1 passed (1) / Tests 14 passed (14)` |
| full suite | `npm test` | `Test Files 52 passed (52) / Tests 764 passed (764)` (was 750) |
| types | `npx tsc --noEmit` | no output |
| lint | `npm run lint` | 0 errors; no finding mentions deck-gate (pre-existing `<img>` warnings only) |

## CLI verdicts (live DB, `MTG_DB_DIR=$APPDATA/the-black-grimoire/data`, `--format brawl --owner 1`)

`verify-2026-09-18/emperor-brawl-v2.txt` — exit 1

```
totals    : 100 cards | 34 lands (35.5 eff.) | 65 nonland | avg MV 3.12
VERDICT   : FAIL
  PASS  size        100 cards (brawl wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in brawl
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside RU
  FAIL  ownership   17 card(s) not in the arena collection; arena collection imported 77 days ago
  WARN  arenaNames  7 card(s) must be exported front-face only:
  WARN  lands       34 lands (+4 MDFC land backs = 35.5 effective); Karsten wants 39 ±2
  WARN  plan        43/65 nonland cards interact (66%) — commander wants: noncreature spell,
                    mana value 4+; only 25/65 (38%) can satisfy it
  WARN  curve       avg MV 3.12; 36/65 nonland cards below the commander's 4-mana threshold (55%)
  PASS  wincons     7 win condition(s)/closer(s)
  PASS  locks       2 locked card(s) present and intact
```

`verify-2026-09-18/emperor-brawl-v5.txt` — exit 1

```
totals    : 100 cards | 34 lands (35.5 eff.) | 65 nonland | avg MV 3.15
VERDICT   : FAIL
  PASS  size / singleton / legality / rules / identity
  FAIL  ownership   5 card(s) not in the arena collection; arena collection imported 77 days ago
                    Aggravated Assault, Full Throttle, Kozilek's Command,
                    Chandra Acolyte of Flame, Conduit Pylons
  WARN  arenaNames  8 card(s) must be exported front-face only
  WARN  lands       34 lands (+4 MDFC land backs = 35.5 effective); Karsten wants 39 ±2
  WARN  plan        43/65 interact (66%); only 25/65 (38%) can satisfy it
  WARN  curve       avg MV 3.15; 36/65 below the 4-mana threshold (55%)
  PASS  wincons     9 win condition(s)/closer(s)
  PASS  locks       4 locked card(s) present and intact
```

Lock regression, same CLI: `--before emperor-brawl-v5.txt --after emperor-brawl-v2.txt` gives
`FAIL locks 2 locked card(s) cut by the edit: Flooded Strand, Misty Rainforest` — incident #4.

## Deviations from the brief, and why

1. **v5 does not come out warn-only.** It fails `ownership`: five cards in the hand-fixed list are
   genuinely absent from the Arena collection. Verified directly against the DB — Conduit Pylons and
   Kozilek's Predator exist only as `source='paper'` rows; Aggravated Assault, Full Throttle and
   Chandra, Acolyte of Flame are in no collection row at all. The snapshot is from 2026-07-02, so
   these may be cards acquired since; the gate warns about exactly that. Another agent is re-importing
   the collection right now, so this count can change. Not a gate bug.
2. **Plan comes out 66 % / 38 %, not ≈32 %, and warns rather than fails.** v2 and v5 are the same
   88-line deck with 12 swaps, and they score identically on every plan metric I tried, so "v2 fails
   plan" and "v5 warn-only" cannot both hold. Resolved by reporting two numbers: `interact` (the
   brief's rule: satisfies the condition OR names a trigger noun) drives the fail floor, and
   `enablers` (can actually meet the ≥4-mana noncreature condition) forces a warn below 40 %. The
   38 % figure is the one matching the operator's "45 of 66 never interacted" complaint, and the
   22-card cut list is printed cheapest first.
3. **arenaNames warns instead of failing on v2.txt.** That file already uses front-face names, so
   Arena would accept it verbatim; the seven `Front // Back` names live in `emperor-brawl-v2-db.txt`
   (the DB-name rendering). The check fails only when an input line literally carries ` // `, and
   warns with the corrected export lines otherwise. Test fixture (a) is the `-db` rendering so the
   fail path is covered.
4. **MDFC land backs count as 0.38, not 0.5.** That is `MDFC_LAND_CREDIT` in `land-math.ts`, which
   the optimizer already uses. Two disagreeing land counts is the class of bug this gate exists to
   catch, so reuse won over the brief's number.
5. **`A-Thran Portal` is `brawl: legal` in the live DB**, not `not_legal` as the brief states — the
   plain `Thran Portal` row is the illegal one. The Alchemy rule is implemented as specified
   (both rows are candidates, a format-legal printing wins) and is covered by a test.
6. **Card fixture is 100 rows, not ~40** — it is the union of what the two 100-card Emperor lists
   plus the Standard and split fixtures reference. Regenerate with `scripts/export-gate-fixture.ts`.

## Undone

- No commit (per brief).
- The gate is a library + CLI only; nothing calls it from the app, the optimizer or build-api.
- `wincons` passes both Emperor lists at 7 and 9 closers, which looks generous; the count comes
  straight from `card-classifier.ts` (`cmc >= 5` creatures count). Not tuned — out of scope.

## Stage 2 — gate wired into build-api (2026-09-18)

Nothing committed. Files touched: `src/lib/deck-gate.ts`, `deck-gate-parse.ts`, `deck-gate-checks.ts`,
`scripts/deck-gate.ts`, `docs/DECK_GATE.md`, `services/build-api/{optimize,server}.ts`,
`src/lib/__tests__/deck-gate.test.ts`; new: `services/build-api/gate-wiring.ts`,
`tests/build-api-gate-wiring.test.ts`.

### What changed

- **Plan thresholds** (`src/lib/deck-gate.ts`, where the constants already lived, not checks/plan):
  `PLAN_FAIL_RATIO 0.40` / `PLAN_WARN_RATIO 0.55` for interaction, new `ENABLER_FAIL_RATIO 0.35` /
  `ENABLER_WARN_RATIO 0.50` for cards that can actually satisfy the commander's condition.
- **`skip` status** added to `GateStatus`; it never blocks a verdict. Ownership returns it when the
  caller gives neither `ownerId` nor `ownedCards`.
- **`ownedCards: string[]`** in `GateOptions`, taking priority over `ownerId`. The service passes the
  request array; the `collection` table is never queried on that path (asserted by a test).
- **`commanderClosers()`** exported from `deck-gate-checks.ts` and used by both `wincons` and the
  optimizer's cut filter, so an extra-combat effect under an attacking commander is a closer in one
  place only.
- **`services/build-api/gate-wiring.ts`**: `readLocks` (≤ 50 strings), `readOwnedCardNames`,
  `deckText` (front-face names only — the service controls its own rendering), `cutReason`,
  `lockedNames`.
- **`/optimize`**: `finishCuts()` drops every cut a lock or a commander closer protects, reports them
  as `lockedFromCuts`, and gives each surviving cut a non-empty `reason` (the optimizer's own
  findings, plus "Never satisfies the commander's trigger condition" when `satisfiesCondition` says
  so, plus a role/MV fallback). Adds get the same non-empty guarantee. `swaps[].reason` now carries
  the filled cut reason. `gate` = `gateDeck()` on the after-swaps list, `before` = the input names.
- **`/build`**: `gate` = `gateDeck()` on the produced list, with the request's `ownedCards` and `locks`.

### Verified

| check | command | observed |
| --- | --- | --- |
| full suite | `npm test` | `Test Files 53 passed (53) / Tests 784 passed (784)` |
| types | `npx tsc --noEmit` | no output |
| lint | `npm run lint` | 0 errors, no finding in any gate/optimize/server file |
| live service | `PORT=3400 MTG_DB_DIR=$APPDATA/the-black-grimoire/data npx tsx services/build-api/server.ts` | `listening on 127.0.0.1:3400`; stopped with `taskkill //PID 18888 //F` |

`POST /optimize` with `emperor-brawl-v5.txt` as `text`, `format: 'brawl'`,
`locks: ['Flooded Strand','Misty Rainforest','Coastal Piracy']`:

```
verdict: warn
  PASS size        100 cards (brawl wants 100)
  PASS singleton   singleton respected (basics exempt)
  PASS legality    every card legal in brawl
  PASS rules       no other format rule broken
  PASS identity    all cards inside RU
  SKIP ownership   no ownerId and no ownedCards — nothing to check the list against
  WARN arenaNames  7 card(s) must be exported front-face only
  WARN lands       34 lands (+4 MDFC land backs = 35.5 effective); Karsten wants 39 ±2
  WARN plan        43/65 nonland cards interact (66%) — commander wants: noncreature spell,
                   mana value 4+; only 25/65 (38%) can satisfy it
  WARN curve       avg MV 3.17; 36/65 nonland cards below the commander's 4-mana threshold (55%)
  PASS wincons     8 win condition(s)/closer(s)
  PASS locks       5 locked card(s) present and intact
lockedFromCuts: ["Coastal Piracy"]          empty reasons: cuts 0, adds 0

first 5 cuts
 - Glimmerburst                   => Card Draw over quota (16/12) — weakest card draw slot; Curve has 11 too many 4-drops
 - Ill-Timed Explosion            => Card Draw over quota (16/12) — weakest card draw slot; Curve has 11 too many 4-drops
 - Illuminate History             => Card Draw over quota (16/12) — weakest card draw slot; Curve has 11 too many 4-drops
 - Sidequest: Card Collection ... => Card Draw over quota (16/12) — weakest card draw slot; Curve has 11 too many 4-drops
 - Waterbending Lesson            => Card Draw over quota (16/12) — weakest card draw slot; Curve has 11 too many 4-drops
```

Coastal Piracy was in the optimizer's cut list and was filtered out by the lock — the 2026-09-18
complaint, reproduced and stopped.

### Deviations

1. **The v2 fixture does not FAIL on plan at a 35 % enabler floor.** Its enabler ratio is 25/65 =
   **38.5 %**, which is above 35 %, so the check warns. The two instructions ("below 35 % = FAIL" and
   "v2 must now FAIL on plan (38 % enablers)") cannot both hold. I implemented the number you gave;
   set `ENABLER_FAIL_RATIO` in `src/lib/deck-gate.ts` to `0.40` and v2 fails. Tests assert the
   measured behaviour both ways: a synthetic all-"spells matter" list (100 % interaction, 0 %
   enablers) FAILS, and v2 at 38 % warns.
2. **Locked cuts are removed, not annotated.** "Filter those cuts out … and say so in each cut's
   reason" is self-cancelling for a removed row, so the removed names come back as a top-level
   `lockedFromCuts: string[]` and the surviving cuts carry their own reasons.
3. **Test lives at `tests/build-api-gate-wiring.test.ts`**, not `services/build-api/__tests__/` —
   `vitest.config.ts` only includes `src/**` and `tests/**`, and the service has no test folder or
   package.json of its own. Putting it under `tests/` needed no config change.
4. **`deckText` emits front-face names.** Rendering the after-list with DB names made `arenaNames`
   FAIL on every deck containing an MDFC, from a `//` the service itself introduced. The check still
   warns and still lists the 7 cards to fix on export.
5. **Ownership on `/optimize` judges the after-list**, so a proposed add the caller does not own
   shows as missing. That is correct, and the test asserts every missing name is an add.
