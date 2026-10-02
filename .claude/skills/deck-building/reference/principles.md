# Commander / Brawl deck-construction principles (researched 2026-10-02)

Scope: paper Commander (4-pod, 40 life) and Arena Brawl (1v1, 25 life, 100 cards).
**[calc]** = my own number; reproduce with `py verify-2026-10-02/deck-research/calcs.py`. **[Sx]** ids resolve in `sources.md`.

---

## 1. Rules context that changes the maths

| Fact | Pod Commander | Arena Brawl | Source |
|---|---|---|---|
| Starting life | 40 | 25 (two-player Brawl; 30 multiplayer Brawl) | CR 103.4d, eff. 2026-09-25 [S1] |
| Free first mulligan | yes (multiplayer) | yes ("any Brawl game") | CR 103.5c [S1]; Wizards Brawl page [S2] |
| Starting player draws turn 1 | yes (CR 103.8c) | **no** (CR 103.8a, two-player) | [S1] |
| Commander damage (21) | yes, CR 903.10a | **no** | [S1]; MTGAZone 2023 [S3] |
| Sideboard / matchmaking | n/a / your pod | none, Bo1; Arena pairs decks by hidden "weight" | [S2]; Draftsim 2026-08 [S4] |

Apply: model pod games as "7 + T cards seen by turn T"; Brawl on the play as "7 + T − 1".

---

## 2. Role ratios

### 2.1 What the sources say

| Source (date) | Lands | Ramp | Card adv. | Targeted | Mass | Plan |
|---|---|---|---|---|---|---|
| Command Zone ep. 658 "new era" template (2025-02-18) [S5][S6] | 38 | 10 (min; many push 12–14) | 12 | 12 | 6 | ~30 |
| Command Zone ep. 379 (old; third-party summary) [S7] | 35–38 | 10 | 10 draw | 5 spot | 5 wipes | 25 standalone + 10–12 enhancers + 7–8 enablers |
| Karsten simulation (2022-07-15) [S8] | 42 + Sol Ring; −1 per 2–3 rocks; −1 per 3–4 cantrips/dorks; floor 37 | 0 Signets for MV 2–3 commanders, 7–9 for MV 4–6 | not modelled | — | — | — |
| Karsten regression (2022, upd. 2025-02-13) [S9] | 31.42 + 3.13·avgMV − 0.28·(cheap draw/ramp) | — | — | — | — | — |

Reading the TCZ 2025 numbers [S5][S6]:
- Categories overlap (they sum to ~108 across 99 slots).
- "Card advantage" excludes selection such as Ponder.
- "Mass disruption" includes graveyard hate, Propaganda effects and Rift.
- The hosts' own decks average ~37 lands.

### 2.2 Recommended starting ratios by bracket (judgement, anchored on 2.1)

| Role | B1–2 | B3 | B4 | B5 (cEDH) | Brawl 1v1 |
|---|---|---|---|---|---|
| Lands | Karsten formula; floor 37 [S8] | formula; floor 37 | formula, counting every cheap cantrip and rock (often 34–36) | formula; fast mana and free spells push it lower (no sourced figure) | formula; floor 37 unless low-curve aggro |
| Ramp (≤ 3 MV) | 10 [S6] | 10–12 | 12+ incl. fast mana | maximum | 6–10; fewer rocks in aggro [S3] |
| Card advantage | 10–12 | 12 [S6] | 12+, cheap | engines + wheels | 8–12 |
| Targeted interaction | 8–10 | 12 [S6] | 12–15, cheap or free | 15+ incl. stack | 12–16, mostly 1–2 MV [S3][S4] |
| Mass disruption (TCZ sense) | 4–6 | 6 [S6] | 4–6 | situational | 0–3; wipes only in control [S3] |
| Win closers (win-conditions.md) | 3–5 | 2–4 + tutors | 1–2 lines + backup | compact combo + tutors | 2–3 |

Calculator-site heuristic (secondary): removal + counters + wipes make up 8–15 % of nonland cards in B1–2, 12–22 % in B3 and 15–28 % in B4–5 [S11].

When to deviate:

| Situation | Change | Source |
|---|---|---|
| Aggro / graveyard / combo / tokens | aggro: fewer lands, more cheap threats; graveyard: count self-mill as card advantage; combo: more tutors, less interaction; tokens: fewer wipes | TCZ ep. 659 summary [S7] |
| Commander MV ≥ 4 vs 2–3 | MV ≥ 4: more 2-MV rocks or land ramp. MV 2–3: no Signets, curve out | Karsten [S8] |
| Superfriends | 12–20 walkers, 5–8 proliferate, 6–10 pillowfort/protection, 5–7 wipes, 8–12 creatures (secondary) [S12] | why: "four loyalty in a four-player game = one loyalty", so build the fort first [S13] |

### 2.3 Game Changers and bracket rules

| Bracket | Game Changers | Expected min. game length | Source |
|---|---|---|---|
| B1 | 0 (thematic exceptions agreed pre-game) | 9 turns | [S10][S14] |
| B2 | 0 | 8 turns | [S10][S14] |
| B3 | 0–3 | 6 turns | [S10][S14] |
| B4 / B5 | any / any | 4 turns / "any turn" | [S10][S14] |

Facts as of 2026-10-02:
- **Tutor limits** were removed for every bracket in Oct 2025 [S10][S15].
- **List changes:** Oct 2025 removed 10 cards (incl. Food Chain, Deflecting Swat, Kinnan, Urza, Yuriko) [S10][S15]; Feb 2026 added Farewell and Biorhythm [S16].
- **List size:** third-party trackers say 53 cards (Sep 2026) [S17]; Wizards states no total.
- **Use the flag, not a count:** read the local DB `game_changer` column or Scryfall `is:gamechanger`.

**Sources disagree on B3 two-card combos.** mtg.wiki says "NO two-card combos" [S14]; secondary summaries bar only early ones [S18].
→ Recommendation: in B3, no two-card combo that can win before turn 6; disclose any late combo pre-game.

Apply: tag every card with roles (multi-role allowed). After overlap, flag any role below the target-bracket column: ramp, card advantage, targeted interaction or closers.

---

## 3. Mana base

### 3.1 Land count

| Method | Rule | Example **[calc]** |
|---|---|---|
| Karsten regression, 99 cards [S9] | `31.42 + 3.13·avgMV − 0.28·cheap` | avgMV 3.0 + 8 cheap → 38.6; avgMV 2.6 + 12 cheap → 36.2 |
| Karsten simulation [S8] | 42 + Sol Ring; −1 per 2–3 extra rocks; −1 per 3–4 cheap cantrips or dorks; ≥ 37 in medium-power midrange | — |
| TCZ 2025 [S5] | start at 38; resist cutting | — |

Regression terms [S9]:
- **cheap** = nonland cards of MV ≤ 2 that draw or ramp (add mana, fetch a land, or cheat a permanent in).
- **avgMV** = average MV of the nonland cards.
- **MDFCs** count as 0.38 of a land (0.74 if mythic).

**Disagreement.** Karsten's two methods give 38–42 lands; TCZ's practice is ~37; community advice is 36–38 [S19].
→ Recommendation: use the regression. Go below 37 only with ≥ 10 cheap ramp/draw pieces *and* a commander of MV ≤ 3.

Why 37 **[calc]**: P(≥ 3 lands in the opening 7) is 0.525 at 37 lands, or 0.774 with the free second look. At 38 lands it is 0.548, matching TCZ's quoted 54.8 % [S5].

### 3.2 Coloured sources (Karsten 2022, 99-card column) [S20]

Model: 41 lands, probabilities conditional on drawing enough lands, free mulligan and turn-1 draw included, target (89 + MV) % on the play.

| Cost | Sources | Cost | Sources | Cost | Sources |
|---|---|---|---|---|---|
| C / 1C | 19 | CC | 30 | CCC | 36 |
| 2C | 18 | 1CC | 28 | 1CCC | 33 |
| 3C | 16 | 2CC | 26 | 2CCC | 30 |
| 4C | 15 | 3CC | 23 | 3CCC | 28 |
| 5C | 14 | 4CC / 5CC | 22 / 20 | CCCC / 1CCCC | 39 / 36 |

Adjustments [S20]:

| Case | Count as | Case | Count as |
|---|---|---|---|
| Gold card | +1 to each colour and to "either colour" | Hybrid | combined sources of either colour |
| Turn 1 | untapped sources only | Turn 2 onward | tapped sources count too |
| Fetchland | full source for every colour it finds | Fabled Passage / Pathway, 3+ colours | ≈ 2/3 |
| Rock | 3/4, for MV ≥ 3 | Fragile dork | 1/2, for MV ≥ 2 |
| 2-MV land ramp | 3/4, for MV ≥ 3 | Cultivate-type | 1/2, for MV ≥ 5 |
| Treasure | 1/4 each | Exotic Orchard / Fellwar Stone (unknown colours) | 3/4 / 1/2 |

Different land counts: scale by share of lands. Example **[calc]**: 2C needs 18/41 = 44 % of lands, so at 36 lands that is 0.44 × 36 ≈ 16 sources.

### 3.3 Tapped-land budget and conditional lands

- **Karsten's 60-card budget [S20]:** ≤ 3 taplands in aggro with one-drops, ≤ 9 in midrange without; a check land (Sunpetal Grove) weighs ≈ 1/4.
- **Scaled to 99 cards:** ≈ 5 / ≈ 15 tapland-equivalents **[calc: 3·99/60, 9·99/60; unvalidated upper bounds]**.

Land behaviour (oracle text from the local card DB):

| Land (example) | Enters untapped when | 4-pod | Brawl 1v1 | Tapland weight (judgement) |
|---|---|---|---|---|
| Check (Dragonskull Summit) | you control a matching basic type | fine after a typed land | same | 1/4 [S20] |
| Slow (Deathcap Glade) | you control ≥ 2 other lands | tapped T1–2 | same | ~1/3 |
| Fast (Blackcleave Cliffs) | you control ≤ 2 other lands | untapped T1–3 | same | ~1/3 |
| Battlebond (Spectator Seating) | you have ≥ 2 opponents | always untapped | **always tapped** | 0 / 1 |
| Turbulent (Turbulent Springs, typed dual) | opponents control ≥ 8 lands in total | untapped from your turn 3–4 | untapped only from turn 8–9 | ~1/4 / ~1 |
| Annex (Konstrari Annex) | you control a planeswalker | tapped until a walker lands | same, unless walker commander | ~1/2 with 15+ walkers, else 1 |
| Verge (Gloomlake Verge) | always; 2nd colour needs a basic type | needs typed lands | same | 0 |
| Shock (Watery Grave) | you pay 2 life | 2 of 40 is cheap | 2 of 25 matters vs aggro | 0 |
| Fabled Passage | fetched basic untaps only with ≥ 4 lands | tapped early | same | ~1 early |
| Surveil land, tri-land, Path of Ancestry | never | tapped | tapped | 1 |

Turbulent timing **[calc]**. Assumes all opponents hit every land drop: on your turn T, those seated before you have T lands, those after have T − 1.

| Seat | Opponents' lands on your turn T | First untapped turn |
|---|---|---|
| 1 | 3(T−1) | 4 (9 lands) |
| 2 | 3T − 2 | 4 (10) |
| 3 | 3T − 1 | 3 (8) |
| 4 | 3T | 3 (9) |
| Brawl | T−1 on the play, T on the draw | 9 / 8 |

Apply:
- Sum weighted sources per colour against the strictest card in the 99.
- Sum tapland weights; flag above ≈ 5 (aggro / Brawl) or ≈ 15 (midrange pod).
- In Brawl, Battlebond and Turbulent lands count as taplands.

---

## 4. Curve

- **Karsten [S8]:** with an N-MV commander, the model wants **zero** other N-drops. Real decks should run *fewer*, not zero.
- **TCZ notes [S6]:** curve 1:9, 2:18, 3:15, 4:10, 5:5, 6+:5; haymaker finishers sit at 7 MV.
- **EDHREC 2022 data [S21]:** the average deck runs 15.7 two-drops, 15.4 three-drops and ~1.5 cards at MV 8+. In practice x-MV commanders run *more* x-drops (except MV 3), contrary to the advice above.
- **Brawl, MTGAZone [S22]:** fill the curve around the turn you actually cast the commander, not its printed MV.

Karsten's optimal curves (Sol Ring in every deck); near-optimal variants score within 0.04 %, so read it as a shape [S8]:

| Commander MV | 1 | 2 | 3 | 4 | 5 | 6 | Signets | Lands |
|---|---|---|---|---|---|---|---|---|
| 2 | 9 | 0 | 20 | 14 | 9 | 4 | 0 | 42 |
| 3 | 8 | 19 | 0 | 16 | 10 | 3 | 0 | 42 |
| 4 | 6 | 12 | 13 | 0 | 13 | 8 | 7 | 39 |
| 5 | 6 | 12 | 10 | 13 | 0 | 10 | 8 | 39 |
| 6 | 6 | 12 | 10 | 14 | 9 | 0 | 9 | 38 |

Apply: flag any of these:
- the commander's MV bucket is the tallest;
- fewer than 12 two-drops;
- more than 8 cards at 6+ MV without 12+ ramp.

---

## 5. Synergy vs raw power

| Concept | Definition | Source |
|---|---|---|
| EDHREC synergy (retired) | % of this commander's decks playing the card − % of colour-identity decks playing it | [S23] |
| EDHREC lift (current) | commander inclusion rate ÷ colour-identity inclusion rate; 1 = neutral; log-like (0.5 is as strong as 2.0) | [S23] |
| Synergy ≠ power | Path to Exile has −1 % synergy in Ur-Dragon yet is fine there | [S23] |
| Singleton reality | a given one-of: ≈ 7 % in the opener, ≈ 16 % by turn 10. Play redundant effects; tutors turn a 7 % card into a plan | bopmtg [S19] |
| Tutors as copies | count tutors as extra copies of their targets | [S24] |

Interaction-density score (my method, unsourced):
1. Per nonland card, count the other cards it directly enables or is enabled by (commander triggers, shared tribe or counters, fodder + outlet + payoff).
2. Report the median.
3. A 0-link card must be a staple role card (ramp, draw, removal); otherwise it is a cut candidate.

Redundancy **[calc]**. Access = copies of the effect + tutors that find it. P(≥ 1 seen by turn 4):

| Access | 1 | 3 | 5 | 8 | 10 | 12 |
|---|---|---|---|---|---|---|
| Pod | 0.11 | 0.30 | 0.45 | 0.62 | 0.71 | 0.78 |
| Brawl, on the play | 0.10 | 0.28 | 0.42 | 0.59 | 0.67 | 0.74 |

Apply: require access ≥ 8 for an engine the plan collapses without, ≥ 5 otherwise. Flag closers or engines with access ≤ 3.

---

## 6. Consistency metrics to compute

Monte Carlo, 200k games **[calc]**. Model:
- Rocks cost 2 and tap for 1.
- Keep 3–5 lands, or 2 lands + a rock; first mulligan free.
- Colour ignored.

| Commander MV | Lands / rocks | Pod: on curve | Pod: by +1 turn | Brawl (play): on curve | Brawl (play): by +1 |
|---|---|---|---|---|---|
| 3 | 37 / 6 | 0.981 | 0.988 | 0.972 | 0.981 |
| 4 | 37 / 8 | 0.942 | 0.966 | 0.902 | 0.942 |
| 4 | 35 / 10 | 0.939 | 0.964 | 0.897 | 0.939 |
| 5 | 37 / 10 | 0.877 | 0.926 | 0.803 | 0.877 |
| 5 | 34 / 10 | 0.827 | 0.887 | 0.741 | 0.827 |

Reading: cutting 3 lands costs a 5-MV commander ~5 points (pod) or ~6 (Brawl). Brawl on the play runs 4–7 points below a pod because there is no turn-1 draw.

Apply: run `calcs.py` with the list's lands, rocks and commander MV. Report:
- P(commander on curve); flag below 0.85 in a pod or 0.80 in Brawl.
- P(key-engine access by turn 4).
- P(≥ 1 closer access by turn 6).

---

## 7. Brawl (Arena, 1v1) differences

| Difference | Consequence | Source |
|---|---|---|
| 25 life, one opponent, no commander damage | Aggro and 1-for-1 removal gain value; voltron loses its 21-damage shortcut | Draftsim 2026 [S4]; MTGAZone 2023 [S3] |
| No multiplayer | Symmetric wipes are "a mistake in almost any" non-control Brawl deck; Thoughtseize and Fatal Push become staples | [S3] |
| Little fast mana (2023) | "Nobody is going to untap with five mana on turn two" | [S3] |
| Streamlined decks win | High density of the same effect; themes are all-or-nothing | MTGAZone 2021 [S22] |
| Bo1, no sideboard, hidden deck weight | Main-deck answers must be broad | [S3][S4] |
| Fetchlands legal (not in Historic) | Fetches fix and turn on check lands and Verges | [S4] |
| Starting player skips the draw | Curve and mulligan odds slightly worse on the play (§6) | CR 103.8a [S1] |

Apply: for Brawl lists, use the §2.2 Brawl column, count Battlebond and Turbulent lands as taplands, drop symmetric wipes unless the deck is control, and run 12+ cheap removal.
