Resending in full.

## Findings — commit 6c11111

Verified by reading the files and running the code against the local card DB. `tsc --noEmit` clean, ESLint clean on the changed files, all 19 new unit tests pass.

**1. CRITICAL — unbounded card quantity blocks the event loop and exhausts memory**
`services/build-api/optimize.ts:213` (copy-expansion loop), `optimize.ts:311` (curve), `services/build-api/resolve.ts:53` (`Math.max(1, Math.floor(Number(...)) || 1)`, no upper bound).
Input `{"format":"standard","cards":[{"name":"Sol Ring","quantity":20000000}, ...4 more]}` measured at 5.2 s of synchronous work and 1.3 GB RSS. `quantity: 1e9` or `"Infinity"` allocates until `RangeError: Invalid array length`. One ~200-byte request stalls every other route on this single-threaded pm2 process, including in-flight `/build` runs.
Fix: clamp in `resolveDeckLines` the way `seedTempCollection` already does, `Math.min(99, ...)`.

**2. HIGH — the /analyze refactor changes its numbers, not just its shape**
`services/build-api/analysis-core.ts:107` passes the new `tribalType` into `computeSynergyGraph`, which the pre-image never did; `:160` adds a `tribalType` field.
Verified on the Krenko test list: deck ISS moves from 7 to 45, and the top synergy pair changes from Skullclamp/Goblin Bombardment to Goblin Trashmaster/Battle Cry Goblin. Any consumer that stored or displayed ISS now sees a different scale for tribal decks.
Fix: keep `tribalType` off the `/analyze` path, or land it as a documented scoring change with a pinned regression test.

**3. HIGH — sideboard inference silently deletes cards from commander lists**
`src/lib/decklist-normalize.ts:117` runs `inferSideboard` for every list without an explicit header; `:59` only rejects a trailing block larger than 15 cards.
Verified: 90 card lines, a blank line, then 9 more yields `hasSideboardHeader: true` and moves those 9 into a sideboard. Commander decks have no sideboard, so a blank-line-grouped 99 loses its last group from main, corrupting land count, Karsten target, ISS and health.
Fix: skip the inference when the format is a commander format or a commander line was found.

**4. HIGH — partner commanders are dropped and their colour identity is treated as illegal**
`services/build-api/optimize.ts:181` takes only `resolved.find(r => r.board === 'commander')`; extra commander lines match neither the main nor the sideboard filter at `:190`.
Verified with a Thrasios/Tymna list: the response reports `commander: "Thrasios, Triton Hero"`, colours `["G","U"]`, flags Swords to Plowshares and Plains as `off_color`, and returns `score: 0`. Partner decks get hard cuts on correct cards.
Fix: collect all commander-board lines, union their colour identities, and feed the pair into `classifyBracket` and the identity check.

**5. HIGH — duplicate lines evade the singleton check and double-count penalties**
`optimize.ts:190` never merges lines with the same name; `src/lib/deck-optimizer.ts:128` compares only per-line `quantity` against `maxCopies`.
Verified: a commander list with each name listed twice as `1 X` produces zero `too_many_copies` issues and two identical `off_color` entries for Opt, so `scoreDeck` charges 20 points for one card.
Fix: merge resolved lines by lower-cased name before `splitBoards`.

**6. MEDIUM — /optimize has no concurrency guard**
`services/build-api/server.ts:338`. `/build` is capped by `MAX_CONCURRENT`, `/optimize` is not, and its handler is fully synchronous. A normal 99-card request measures 130 ms, a 600-line 99-copies request 287 ms. Concurrent callers serialise on the loop and delay builds.
Fix: reuse the `activeBuilds` counter or add a small separate cap returning 429.

**7. MEDIUM — quadratic bracket-tag scan on pasted text**
`src/lib/decklist-normalize.ts:23`, applied at `:95`. `/\s*\[([^\]]*)\]\s*$/` has no start anchor, so a 20 KB line of ` [` with no closing bracket costs 261 ms measured. Not exponential, but the 20 KB cap is the only bound, so a few requests per second saturate the loop.
Fix: skip lines with no `]`, or anchor the scan from the last `[`.

**8. MEDIUM — the bottom-decile synergy reason fires on every card when ISS values are uniform**
`src/lib/deck-optimizer.ts:146` returns index 0 for fewer than 10 candidates, and `:181` uses `iss <= issFloor`. A deck where all non-role cards score the same ISS gets "Bottom-decile synergy" on all of them, adding 2 to every cut score and filling the cut list with noise.
Fix: use a strict comparison and require at least 10 values.

**9. MEDIUM — `optimizeDeck` is about 115 lines**
`optimize.ts:279`. The project rule is under 50. It mixes validation, classification, mana math, land math, optimizer-context assembly and response construction, so a change to any one touches the same function.

**10. MEDIUM — input contract is looser than the code accepts**
`optimize.ts:106` reads only `c.name`, so `cards: ["Sol Ring", ...]` returns "only 0 cards recognized", while `readOwnedNames` at `:136` does accept bare strings. `board` is unvalidated, so `"Commander"` with a capital C is excluded from both main and sideboard and never appears in `unresolved`.
Fix: accept strings in `readLines`, and normalise `board` to a known set defaulting to main.

**11. LOW — silent truncation is invisible to the caller**
`optimize.ts:115` slices text at 20,000 chars mid-line and `:128` drops everything past 600 lines, with no field saying so. A 250-card paste is analysed as a partial deck that looks complete.

**12. LOW — `metaRanks` holds scores, not ranks**
`optimize.ts:342` copies `getMetaRankedCardNames` values, which `src/lib/db.ts:1422` sets to a composite score, into a field documented as "name → meta rank" in `deck-optimizer.ts:37`. Harmless today because only `.has()` and `.size` are read. The true rank does come from insertion order, and that assumption is valid.

**13. LOW — /analyze drops over-long names from `unresolved`**
`resolve.ts:45` skips names longer than 200 characters entirely; the pre-image looked them up and reported them as unresolved.

**14. LOW — type escapes**
`deck-optimizer.ts:232` uses `ctx.cardISS!` inside a guarded ternary, `optimize.ts:204` builds `{} as Record<CardCategory, ClassifiedCard[]>` for a partial record, `optimize.ts:108` casts `parsed.cards` to `DeckLineInput[]` unchecked. All currently safe, none checked.

**15. LOW — Karsten math now exists twice**
`src/lib/land-math.ts` reimplements the formula that `karstenLandCount` implements on `t4-engine-wip`, with different MDFC handling (flat 0.38 here, 0.74 for mythics there) and different clamps. Deleting `karsten-land-count.test.ts` was correct, the function is absent from this branch, but the two versions will conflict on merge.

**Test gaps.** The three new suites contain real, failing-if-broken assertions. Nothing covers `optimize.ts`, `resolve.ts` or `analysis-core.ts`: no test for `readLines`, `splitBoards`, `classifyMain`, `collectAdds`, `landSources` or `sourcesNeeded`, no quantity-bound test, no duplicate-name test, no partner test, and no golden-output test pinning `/analyze`, which is why finding 2 went unnoticed. `scripts/smoke-optimize.ts` prints but asserts nothing.

## Verdict

Block. The unbounded quantity path is a remote memory and event-loop denial of service against a process that also serves deck builds, reachable from a tiny JSON body.
Three further HIGH defects produce confidently wrong diagnoses on real input: commander lists lose their last card group, partner decks report every partner-colour card as illegal and score 0, and duplicated lines defeat the singleton check.
The `/analyze` refactor is not behaviour-preserving as claimed; ISS moved 7 to 45 on the Krenko fixture, so it needs reverting on that path or an explicit changelog plus a pinned test.