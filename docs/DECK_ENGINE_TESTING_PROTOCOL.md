# Deck Engine Testing Protocol

How we verify the deck builder (`autoBuildDeck` / `buildScoredCandidatePool`) produces
decks that match **human winning builds**, and how uploaded match logs feed back into the
engine. Lives next to the harness it drives: `scripts/test-deck-builds.ts`.

## Why this exists

The builder repeatedly misread Ramos, Dragon Engine — it built a +1/+1-counters goodstuff
pile (~10 multicolored spells) when the winning human build is a charm-driven gold-spell
engine (~50 multicolored spells, zero counters-matters cards). Anecdote isn't a gate. This
protocol turns "the Ramos build is wrong" into a number that fails CI.

## Reference fixtures (ground truth)

Human winning builds live in `decks/test-builds/*--winning-reference.txt`. Each has a header
documenting the **winning plan** and **target metrics**. These are the source of truth — the
engine is measured against them, never the reverse.

- `ramos-dragon-engine--winning-reference.txt` — charm/gold-spell engine. Target: ~50 gold
  spells, 0 counters-matters. Plan validated in a real match (commander-as-clock via cheap
  gold casts + Boros Charm double strike; alt line = counter-dump → Door to Nothingness).

## Metrics (emitted by the harness)

Per build, `scripts/test-deck-builds.ts` prints and writes to `results.json`:

| Metric | Meaning |
|---|---|
| `goldSpellCount` | nonland spells with **2+ cast colors** (`card.colors`) — the multicolor-matters fuel |
| `counterMattersCount` | cards from the `COUNTERS_MATTERS` leak list (Hardened Scales, Evolution Sage, …) |
| `landCount`, `avgCmcNonLand`, `categoryCounts`, `curve` | structural sanity |
| `illegalCardsForFormat` | format-legality regressions |

`goldSpellCount` uses the spell's **actual cast colors**, not color identity — Ramos triggers
on the colors of the spell cast, and colorless artifact ramp (talismans/signets) must NOT count.

## Gates

Per-commander pass criteria. A build **fails** if any gate is violated.

### Ramos, Dragon Engine (multicolor-matters)
- `goldSpellCount >= 35` (reference ≈ 50; pre-fix bots ≈ 10)
- `counterMattersCount == 0`
- `landCount` within 33–40 (commander) / 22–26 (brawl)
- `illegalCardsForFormat == 0`
- Qualitative: ≥ 40% name overlap with the winning reference's nonland spells; charms and
  mana-sink payoffs (Door to Nothingness, Progenitus, Bring to Light) present.

### General (all commanders)
- 0 illegal cards for the format.
- Land count in template range; avg CMC sane for the strategy.
- No category at 0 that the archetype requires (ramp/draw/removal/wipes/wincons).

## Procedure

```bash
# 1. Build one commander (fast iteration)
npx tsx scripts/test-deck-builds.ts --only ramos-dragon-engine

# 2. Read the console line — check the gates:
#    OK 100 cards, 36 lands, avgCMC 2.9, gold 41, counters 0, 1840ms
#                                          ^^^^^^^^  ^^^^^^^^^^  <- gates

# 3. Inspect the written list + category breakdown
#    decks/test-builds/ramos-dragon-engine--commander.txt

# 4. Diff against the human winning build
#    decks/test-builds/ramos-dragon-engine--winning-reference.txt

# 5. Full roster regression (all commanders, both formats)
npx tsx scripts/test-deck-builds.ts
```

Iterate scorer (`deck-builder-ai.ts`) / archetype detection (`commander-synergy.ts`) until
gates pass. Re-run after every change — `goldSpellCount` must not regress on Ramos, and the
mono-color scenarios must not sprout a multicolor bonus (the `five_colors` reward is gated on
the trigger category, so mono commanders should be unaffected — verify their `goldSpellCount`
stays low).

## Match-log feedback loop

Matches are uploaded continuously. Each win/loss is calibration data, not just history:

1. **A new winning build** → save it as `<slug>--winning-reference.txt` with a plan header and
   derive its target metrics (gold count, counters count, key packages). It becomes a gate.
2. **A losing build** → note the failure mode (mana screw, no payoff, too slow) and add the
   missing axis to the gates (e.g. "≥ N mana sinks", "≤ X avg CMC").
3. **A card that overperformed** (e.g. Boros Charm double-strike finish) → if the scorer
   under-rates its role, add it to the relevant payoff/enabler set.
4. Re-run the harness; confirm no existing gate regressed before committing.

Keep references current — a stale "winning" list mis-calibrates the engine. Delete a reference
once a strictly better build for the same commander replaces it.

## Benchmark (observational, added 2026-09-03)

The fitness gate above measures overlap with EDHREC average lists. The benchmark measures each build against *best-regarded and competitive* lists, within its bracket, and reports composition deltas. It never changes the gate.

- References: `npx tsx scripts/fetch-benchmark-refs.ts` → `decks/test-builds/refs/<slug>/<set>.json` (`moxfield-top` = top-30 by likes via the internal CF-API `/commander-top-decks`; `cedhtop16` = edhtop16 GraphQL tournament entries, no quantities; `edhrec-avg` = the winning-reference fixtures; `topdeck` needs `TOPDECK_API_KEY`). `--format brawl` writes `<set>--brawl.json` from Moxfield historicBrawl lists. References are ground truth; never edit them to fit the engine.
- Brackets: `src/lib/bracket.ts` (`classifyBracket`) labels builds and references by the WotC rules (game changers, mass land denial, chained extra turns, 2-card combos; cEDH is a heuristic flag). `SCENARIOS` carry `targetBracket`.
- Run: `npx tsx scripts/test-deck-builds.ts` then `npx tsx scripts/deck-benchmark.ts` → `decks/test-builds/benchmark.json` + `docs/DECK_BENCHMARK_<date>.md`. Brawl builds use the `--brawl` reference variants; rows marked "(commander refs)" are format-mismatched and excluded from the most-missed table.
- Read it as: overlap = how much of the build the best lists also play; staplesMissing = cards in ≥60 % of the set the build lacks; deltas = build minus set median per role; qualityIndex = 50 % overlap + 30 % composition + 20 % bracket match (0–100, uncalibrated).
- Known limits: no results data exists for casual Commander anywhere, so casual brackets are judged against best-regarded lists; `cedhtop16` has no quantities; unresolved reference names mean the local card data is stale (`scripts/update-card-data.ts`).
