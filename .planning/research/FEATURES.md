# Feature Landscape: MTG Deck Quality Scoring & Upgrade Suggestions

**Domain:** MTG Commander deck analysis tool — quality scoring, collection coverage, upgrade recommendations
**Researched:** 2026-04-12
**Milestone context:** Subsequent milestone adding deck quality scoring + upgrade suggestions to The Black Grimoire

---

## What Already Exists in This Codebase

The following is built and functional. These are NOT features to build — they are the foundation to build on top of.

| Existing System | File | Capability |
|----------------|------|-----------|
| Role-ratio scoring | `card-classifier.ts` + `deck-analysis/route.ts` | `overallScore` 0–100, `ratioHealth[]` per category, `computeRatioHealth()` |
| Card classification | `card-classifier.ts` | 9 categories: land/ramp/draw/removal/board_wipe/protection/synergy/win_condition/utility |
| Commander synergy profile | `commander-synergy.ts` | 15 `SynergyCategory` types, `scoreBonuses`, `synergyMinimums`, `cardPoolPatterns` |
| Rule-based suggestions | `ai-suggest.ts` + `generateSuggestions()` | Text strings describing what's wrong ("add more ramp") |
| ML predictions | `global-learner.ts` + `personalized_suggestions` table | Per-card `predicted_score` from gradient boosting |
| Commander arsenal | `commander-analysis.ts` | Ranked list of `ArsenalCard` with `priority`, `reason`, `inclusionRate`, `owned` |
| EDHREC synergy score | `edhrec.ts` + `db.ts` | Synergy = inclusion in commander's decks minus inclusion in all eligible decks |
| CF API recommendations | `cf-api-client.ts` | 506K+ scraped decks on VPS, `/recommend` endpoint per commander |
| Theme detection | `deck-builder-ai.ts::detectDeckThemes()` | Counts cards per synergy group, returns themes with 3+ matches |
| Collection tracking | `collection` table + `/api/collection` | `quantity` per card per user |

The `deck-analysis/route.ts` endpoint already assembles most of this into a `DeckAnalysis` response. The gap is: no collection coverage percentage, no ranked upgrade suggestions with "add X, cut Y" pairs, no commander-specific scoring weight, and `suggestions[]` is just flat strings not actionable card objects.

---

## Table Stakes

Features users expect. Missing these means the analysis page feels toy-grade.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Overall deck score (0–100 or letter grade) | Every competitor (ScryCheck, EDH Power Level, MTG Master, BrackCheck) shows a single score. Users anchor to it. | Low | Already partially implemented as `overallScore` — needs commander-specific weighting |
| Score breakdown by category | Users need to know *why* the score is what it is. "Ramp: 8/11 — underfilled" is actionable; "67/100" alone is not. | Low | `ratioHealth[]` already provides this; needs UI surfacing |
| Mana curve visualization | Any deck tool without a mana curve looks amateur. Expected since MtGO era. | Low | `manaCurve` already computed; needs chart rendering |
| Color-coded role ratio gauges | "Removal: OK", "Draw: LOW" per-slot visual. Table stakes since EDHREC's category view. | Low | `ratioHealth[].status` (low/ok/high) already exists |
| Commander-aware scoring | Generic scoring (e.g., "you need 10 ramp cards") is wrong for storm commanders, voltron commanders, or combo commanders. Score must weight based on commander's detected archetype. | Medium | `CommanderSynergyProfile.synergyMinimums` + `detectedArchetype` exist but are not plumbed into `computeOverallScore()` |
| Average CMC indicator | Power level correlates inversely with average CMC. Every serious tool shows this. | Low | `avgCMC` already computed |
| Legality check display | Users need to know if cards are illegal before spending money. | Low | `deck-validation.ts` exists; needs surface in analysis view |

---

## Differentiators

Features that give The Black Grimoire an edge over EDHREC, Archidekt, and browser tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Collection coverage % | "You own 73 of 99 non-land cards. 26 upgrades needed." No browser tool ties your personal collection to the optimal deck list. DeckCheck and Archidekt partially do this but are manual. The Black Grimoire has both collection and CF-recommended optimal deck in the same SQLite DB. | Medium | `ArsenalCard.owned` field already provides per-card ownership flag. Need to aggregate: `owned_count / total_recommended_count`. Collection table has `quantity` per card. |
| Ranked upgrade suggestions (add/cut pairs) | Not just "add Rhystic Study" — but "cut Sokka's Haiku (synergy score: 2, role: unclassified), add Rhystic Study (synergy score: 91, role: draw, inclusion rate: 68%)". Competitors show adds OR cuts, not pairs. | Medium-High | Requires: 1) Score all current deck cards. 2) Score all recommended-but-missing cards. 3) Match worst current card to best missing card in same role bucket. |
| Commander-specific synergy score per card | EDHREC's synergy score (inclusion delta) is well understood and trusted. Replicating it locally using `commander_card_stats` (inclusion rate per-commander) minus global baseline is a differentiator because it's offline and fast. | Medium | `commander_card_stats` table exists. Formula: `commander_inclusion_rate - global_inclusion_rate`. Needs `getCommanderCardStats()` to populate from VPS CF API data. |
| Budget-filtered upgrade path | "Show me the top 5 upgrades under $5." DeckCheck advertises this but requires browser. The Black Grimoire has price data in `cards.prices` (Scryfall JSON). | Medium | `cards` table has `prices` column (JSON). Need to parse `prices.usd` and filter suggestions by budget threshold. |
| Impact score per upgrade | Not just "this card is good" but "adding this card improves your score by +8 points." Quantify the delta. No competitor exposes this number. | High | Requires: compute deck score without card X, compute deck score with card Y in same role slot, delta = score improvement. Expensive if done naively — needs approximation. |
| Owned-first upgrade suggestions | Filter upgrade suggestions to show only cards in the user's collection first. "You already own 3 upgrades — just swap them in." This is a direct integration advantage over any browser tool. | Low | `ArsenalCard.owned > 0` filter. Trivial once collection coverage is computed. |
| Weakness narrative (plain text) | "Your deck has a fast enough curve but will lose to artifact board states — you have 0 artifact removal." Not a number, a sentence. Users share these to validate build decisions. | Medium | Template-based generation from `ratioHealth` + `CommanderSynergyProfile.triggerCategories`. Claude API already integrated. |

---

## Anti-Features

Features to deliberately NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Power Level 1–10 number | The MTG community considers this broken — every deck becomes a 7. Competitors are building away from it toward Brackets. It generates arguments, not decisions. | Use Bracket-aligned language: "Focused", "Tuned", "High Power", "cEDH". Map existing `overallScore` to these buckets. |
| Salt / "jank" score | CommanderSalt exists and owns this space. Not core to deck quality. Adds moral judgment to card choices, which is out of scope for a deck *building* tool. | Skip entirely. |
| Real-time multiplayer pod matching | No socket infrastructure, Electron app is local-first. Wrong product for this milestone. | Out of scope. |
| Comprehensive combo detection | Commander Spellbook has 10,000+ combos indexed. Replicating this is a 3–6 month project. Partial combo detection causes more false positives than value. | Reference Commander Spellbook API instead of building from scratch. Surface as external link only. |
| Manabase probability simulation | Salubrious Snail and Frank Karsten's math own this niche. Sophisticated hypergeometric simulation requires substantial investment to do better than existing tools. | Stick to role-ratio gauges and CMC curve. Flag manabase problems with threshold rules, not simulation. |
| Price portfolio tracking over time | EchoMTG owns this space. Financial tracking requires daily price feeds and portfolio DB schemas that are out of scope for a deck quality feature. | Show current USD price per card. No history, no alerts. |
| Social sharing / public deck pages | Moxfield and Archidekt own this. Adding social requires auth overhaul, rate limiting, and GDPR exposure. | Keep decks local to user. Export to text/Arena for sharing manually. |

---

## Feature Dependencies

```
EDHREC synergy score (per commander)
  → requires: commander_card_stats populated from CF API VPS pull
  → requires: global inclusion baseline computed from community_decks

Collection coverage %
  → requires: optimal deck list defined (from commander_card_stats or ArsenalCard list)
  → requires: collection table has current card inventory

Ranked upgrade suggestions
  → requires: EDHREC synergy score (to rank adds)
  → requires: card role classification (to match cuts to adds in same bucket)
  → requires: collection coverage % (to flag owned upgrades)

Impact score per upgrade
  → requires: ranked upgrade suggestions (baseline)
  → requires: overallScore be commander-aware (to compute meaningful delta)

Budget-filtered upgrade path
  → requires: ranked upgrade suggestions (input list)
  → requires: cards.prices populated (from Scryfall seed — already done)

Commander-aware overallScore
  → requires: CommanderSynergyProfile (already built)
  → requires: synergyMinimums plumbed into computeOverallScore()

Owned-first upgrade suggestions
  → requires: collection coverage % (trivial filter after that)
```

Critical path: **CF API data pull → commander_card_stats populated → EDHREC synergy score → ranked upgrade suggestions → collection coverage % → everything else.**

Without real data in `commander_card_stats`, every feature that depends on community inclusion rates falls back to EDHREC API calls (online-only) or rule-based heuristics (low signal).

---

## MVP Recommendation

Prioritize in this order:

1. **Commander-aware overallScore** — Wire `CommanderSynergyProfile.synergyMinimums` into `computeOverallScore()`. Changes the denominator per archetype. Existing infrastructure, minimal new code.

2. **Collection coverage %** — Aggregate `ArsenalCard.owned` counts against the commander's recommended card list. Display as "X of Y recommended cards owned." One DB query + arithmetic.

3. **Ranked upgrade suggestions as add/cut pairs** — Use existing `ratioHealth` to identify the weakest role slot. Find the lowest-scoring current card in that slot (cut candidate). Find the highest-scoring not-in-deck card from `commander_card_stats` that fills the same role (add candidate). Return as structured `{ cut, add, score_delta_estimate, reason }` objects, not flat strings.

4. **Owned-first filter on upgrades** — Trivial once step 3 is done. `filter(add => add.owned > 0)` produces a "free upgrades you already own" list with zero additional work.

Defer:
- **Impact score per upgrade** (exact delta): Approximation is fine for v1. Use synergy score delta as a proxy rather than rerunning the full scoring engine per swap.
- **Budget filtering**: Add only after price data is verified present in `cards.prices` — the column exists but population may be incomplete for older cards.
- **Weakness narrative via Claude**: The Claude API integration exists. Add as a premium/optional enrichment after the structured data layer works.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Table stakes features | HIGH | Confirmed across 8+ live competitor tools (ScryCheck, EDH Power Level, MTG Master, Archidekt, DeckCheck, EDHREC, BrackCheck, Salubrious Snail) |
| EDHREC synergy score methodology | HIGH | EDHREC directly documents the formula: inclusion rate in commander's decks minus inclusion in all eligible decks |
| Collection coverage UX pattern | HIGH | Archidekt, Moxfield, TappedOut, Shoebox MTG, Deckstats all implement this — green/blue stripe visual is de facto standard |
| Impact score via delta computation | MEDIUM | No competitor publicly documents this; delta approach is inferred from first principles |
| Anti-feature list (1-10 power level criticism) | HIGH | Multiple sources (Card Kingdom ROAR article, community forums, competitor tools pivoting to Brackets) confirm this is actively being moved away from |

---

## Sources

- [ScryCheck](https://scrycheck.com) — 5-vector scoring system (Speed, Consistency, Interaction, Mana Base, Threats), combo detection, import from Moxfield/Archidekt
- [EDH Power Level](https://edhpowerlevel.com) — card demand-based score, bracket alignment
- [MTG Master](https://mtgmaster.app/ai-commander-deck-analyzer) — bracket fit, confidence, risk profile, Color Pressure metric
- [BrackCheck](https://brackcheck.com) — official Wizards Brackets system, composition analysis
- [DeckCheck](https://deckcheck.co) — strategy-aware recommendations, collection + budget filtering, DeckTrim (cuts), PowerTune, playtester
- [Archidekt collection tracker](https://archidekt.com/collection) — green/blue ownership indicators, collection-deck integration
- [EDHREC Precon Upgrade Hub](https://www.prismnews.com/hobbies/magic-commander/edhrecs-precon-upgrade-hub-tracks-every-commander-deck) — aggregate upgrade recommendations across full precon catalog
- [EDHREC Synergy Score methodology](https://edhrec.com/articles/digital-deckbuilding-the-how-to-guide-to-building-a-commander-deck-using-edhrec-archidekt-and-commander-spellbook) — inclusion rate delta formula
- [GrimDeck comparison](https://grimdeck.com/blog/best-mtg-collection-tracker-deck-builder) — 2026 tool landscape overview
- [Archidekt collection forum thread](https://archidekt.com/forum/thread/2349823/1) — ownership indicator UX discussion
- [Draftsim power level guide](https://draftsim.com/edh-power-level/) — 5-tier breakdown, metrics that matter
- [Card Kingdom ROAR metric](https://blog.cardkingdom.com/roar-a-new-commander-rating-scale/) — Resolutions Or Attacks Required, critique of 1-10 scale
- [CardsRealm power calculator](https://mtg.cardsrealm.com/en-us/tools/commander-power-level-calculator) — 4-pillar model: Resource Acceleration, Consistency, Resilience, Speed
