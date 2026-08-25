# Synergy Engine Design — ISS, Optimal CMC, Win Plans, Mulligan Criteria

*2026-08-24. Origin: operator spec — "internal synergy score: a card synergizing with the
commander gets a base score, then each card that synergizes with both the commander and that
card increases it — the core is to have a lot of synergies", plus optimal CMC, per-commander
win conditions, and mulligan keep-criteria. External references under research:
edhpowerlevel.com, ratemydecks.com (findings folded into §6 weights when they land).*

## 1. Internal Synergy Score (ISS) — the commander-anchored synergy graph

**Model.** The deck is a graph: nodes = cards, edges = detected pairwise synergies, with the
commander as the anchor node. The score counts commander-centered *triangles* (exactly the
operator's spec): a card earns a base for synergizing with the commander, plus increments for
every OTHER commander-synergizing card it also pairs with.

```
cardISS(c)  = B·[cmdEdge(c) > 0]  +  λ · Σ_{o≠c} pairEdge(c,o) · [cmdEdge(o) > 0]
deckISS     = normalize( Σ cardISS / nonlandCount )        // 0–100 scale
```
v1 constants: B = 10, λ = 2, pairEdge capped at 2 per pair. Calibrate in §6.

**Edge detection — producer/consumer resource tags** (deterministic, explainable, testable):
every nonland card gets `produces: Set<Resource>` and `consumes: Set<Resource>` from
own-ability-scoped oracle patterns (C2 lesson: strip quoted grants + reminder text).

Resource taxonomy v1 (16):
`tokens, treasures, plus1_counters, graveyard_fill, sacrifice_fodder, card_draw,
mana_ramp, lifegain, artifacts_matter, enchantments_matter, spells_cast, creatures_etb,
creature_death, exile_matters, lands_extra, discard`

`pairEdge(A,B) = |produces(A) ∩ consumes(B)| + |produces(B) ∩ consumes(A)|` (cap 2).
`cmdEdge(c)` maps the commander's existing `SynergyCategory` triggers + directNeeds to
resources (e.g. Krenko: produces `tokens` → any card consuming tokens has a commander edge;
Meren: consumes `creature_death`/`graveyard_fill` → producers edge in).

**Why rule-graph first, not SVD-first:** explainable in the UI ("Skullclamp ← consumes tokens
← Krenko produces tokens"), unit-testable against real oracle text, and zero API cost.
Statistical co-occurrence lift (SVD/corpus) becomes a *second* edge source in v2 — additive,
not foundational, so the score never says "trust me" without a reason.

## 2. Optimal CMC score

Target curve comes from the archetype template (`getScaledCurve`) with a commander-CMC
adjustment: commanders at CMC ≥5 shift the support curve down and raise the ramp band
(you must DO something before turn 5).

```
curveScore = 100 − Σ_buckets w_b·|actual_b − target_b| − w_avg·|avgCMC − targetAvg|
```
Reported per-bucket so the UI can show "too many 4-drops, missing 2-drops" — a checklist,
not a vibe. Fast-mana and ramp density feed the same section (weights from §6 research).

## 3. Win plan (per commander)

Rule-based mapping from `synergyProfile.triggerCategories` + tribal detection + wincon
classifier + named-card lists → ONE primary route + optional secondary:

| Route | Signals |
|---|---|
| combat_wide | token_generation / tribal + anthems |
| combat_tall | voltron equipment/auras, commander-damage stats |
| drain | aristocrats triggers (creature_death + lifegain/impact effects) |
| combo | known 2-card pairs present (curated list; Commander Spellbook API in v2) |
| spell_burn | spell_cast / storm / x_spells |
| mill | mill patterns |
| alt_win | named cards (Maze's End, Thassa's Oracle, Approach…) |
| value_grind | fallback: control/stax inevitability |

Output `WinPlan = { route, description, keyCards: {enablers, payoffs, protection, tutors},
missingPieces }` — every card in the deck tagged by its relationship to the plan. This is
also the backbone of the future **Deck Doctor** report (MONETIZATION_NOTES.md).

## 4. Mulligan keep-criteria

Extend `mulligan-advisor.ts` (deterministic, stays sub-10ms): derive from WinPlan + curve —
land band (curve-adjusted 2–4), early ramp requirement when commander CMC ≥5, and "≥1 plan
piece" (an enabler or engine from WinPlan.keyCards, not payoff-only hands). Advisor output
gains human-readable criteria: "Keep hands with: 2-4 lands, a token producer or Skullclamp,
ramp if no turn-≤3 play." Surfaces in the deck analysis panel AND the Arena overlay advisor.

## 5. Where it surfaces (v1)

- `deck-analysis` API + panel: ISS (with top synergy pairs listed), curve score (per-bucket),
  WinPlan, mulligan criteria.
- Build result (`buildReport` + web /builder result view later): route + ISS.
- Harness: new columns (`iss`, `curveScore`, `winRoute`) — **observational only, NOT gating**
  until calibrated (§6). deck-fitness.mjs untouched this round.
- **NOT in the builder's scorer yet.** Wiring ISS into card selection changes builds — that is
  a separate, harness-gated round after calibration proves the score orders decks sensibly.

## 6. Calibration — research findings (2026-08-24)

- **Neither commercial tool discloses weights.** edhpowerlevel: proprietary, price-as-power
  signal (with deliberate Reserved-List dampening), plus a "Playability" metric = castability
  on curve given the land base — we can compute that from mana-sources/land-intelligence (v2).
  ratemydecks: 13 named deterministic factors, no weights — its factor set ≈ our computable
  set already. Ignore the SEO content-farm "formulas" floating around (six clone sites,
  fabricated weights).
- **EDHREC synergy formula confirmed** (their FAQ): commander-inclusion% − color-identity
  baseline% — exactly what `commander_card_stats.synergy_score` already stores. Our corpus is
  the same computation at 3.79M decks. Even EDHREC admits theirs is hand-tuned, not principled.
- **Bracket estimator is concretely buildable** (official WotC gates): Game Changers count
  (0 / 0 / ≤3 / ∞ / ∞ across B1-5) — **`cards.game_changer` column live as of migration 37,
  synced from Scryfall's native field, 53 cards backfilled**; 2-card infinite combos (seed
  list now, Commander Spellbook API v2); mass land denial (small curated list, ~15-30 cards,
  no clean regex exists); chainable extra turns (regex + list). Tutor count is NO LONGER
  bracket-defining (Oct 2025 rules update).
- **Curated lists still needed** (small, stable): fast-mana tiers (premium vs common), mass
  land denial, stax pieces. Everything else computes from data we hold.
- Sanity anchors for ISS: top-liked catalogue decks high, precon-tier mid; harness roster
  ordering roughly monotone with the 2026-08-23 review's human grades (Krenko B+ > Tazri C-).

### Calibration OUTCOME (2026-08-25, commit a546f34)

- **Adopted constants: B=6, λ=2, ceiling=24** (best human-vs-random separation; weights
  triangles over flat credit). Pinned by a test — changing them requires a re-calibration run.
- **17th resource `tribal_synergy`** added (Krenko 6→40; Heliod bit-identical).
- **Anchors revised**: random << human < builder (9/24/33 medians). builder>human is
  EXPECTED — the engine optimizes community-synergy signals harder than casual curation;
  do not gate on human>builder. Same-mode Krenko(coll)7 < Tazri(coll)13 accepted as
  truth-telling (Tazri's own text is an anthem; thin-pool Krenko had 2 external lords).
- **NEXT calibration target — curveScore is broken as a quality signal**: random piles
  out-score real decks (median 65 vs 46) because hand-written template curves punish
  intentional deviation. Fix: derive empirical curve targets per commander/archetype from
  the 3.79M-deck corpus (percentile curves), replacing template guesses.
- Follow-ups: thread tribalType into deck-analysis + /analyze (needs detectTribalTheme
  export); wire ISS into builder selection (gated round — the point of all this).

## 7. Files

- NEW `src/lib/synergy-graph.ts` — taxonomy, tagging, edges, ISS (pure functions + tests)
- NEW `src/lib/win-conditions.ts` — WinPlan derivation (+ tests)
- NEW `src/lib/curve-score.ts` — optimal-CMC scoring (+ tests)
- EXTEND `src/lib/mulligan-advisor.ts` — optional WinPlan input, keep-criteria strings
- EXTEND `src/app/api/deck-analysis/route.ts`, `scripts/test-deck-builds.ts` — emit scores
