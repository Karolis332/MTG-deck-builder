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

## 6. Calibration (research-dependent)

Pending rating-scout findings (edhpowerlevel/ratemydecks/bracket criteria): curated lists
(fast mana, game-changers, 2-card combos), dimension weights, and sanity anchors — top-liked
catalogue decks should score high-ISS, precon-tier low-mid; harness roster spread should be
monotone-ish with the review's human grades (Krenko B+ > Tazri C-).

## 7. Files

- NEW `src/lib/synergy-graph.ts` — taxonomy, tagging, edges, ISS (pure functions + tests)
- NEW `src/lib/win-conditions.ts` — WinPlan derivation (+ tests)
- NEW `src/lib/curve-score.ts` — optimal-CMC scoring (+ tests)
- EXTEND `src/lib/mulligan-advisor.ts` — optional WinPlan input, keep-criteria strings
- EXTEND `src/app/api/deck-analysis/route.ts`, `scripts/test-deck-builds.ts` — emit scores
