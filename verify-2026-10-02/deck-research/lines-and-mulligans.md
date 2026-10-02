# Mulligans, play lines, threat assessment (researched 2026-10-02)

**[calc]** = my own (`calcs.py`). **[Sx]** ids resolve in `sources.md`.

---

## 1. Mulligan rules

| Rule | Text / effect | Source |
|---|---|---|
| London mulligan (CR 103.5) | Shuffle, draw 7, then bottom one card per mulligan taken | EDHREC guide (2026-01) [S38] |
| Free first mulligan (CR 103.5c) | "In a multiplayer game and in any Brawl game, the first mulligan … doesn't count" → **two looks at 7** in pod Commander *and* in 1v1 Arena Brawl | CR eff. 2026-09-25 [S1]; Wizards Brawl page [S2] |
| Turn-1 draw | Multiplayer: nobody skips it (103.8c). Two-player (Brawl): the starting player skips it (103.8a) | [S1] |
| Unlimited or Gis mulligans | Common house rules; the official rules are the baseline | [S38] |

Baseline keep policy from Karsten's simulations (Commander, 99 cards) [S20]:

| Hand | Mulligan when it has |
|---|---|
| Free 7 | 0, 1, 2, 6 or 7 lands |
| Regular 7 | 0, 1, 6 or 7 lands |
| 6 after bottoming | 0, 1, 5 or 6 lands |
| 5 after bottoming | 0, 1 or 5 lands |

- When bottoming, aim for about 3 lands; bottom off-colour lands first [S20].
- His curve model also keeps any hand with Sol Ring + 1–5 lands [S8].

Odds that back the free-mulligan policy (37 lands) **[calc]**:

| Event | One look | Two looks |
|---|---|---|
| 2–4 lands in 7 | 0.748 | 0.937 |
| ≥ 3 lands in 7 | 0.525 | 0.774 |

Shipping a 2-lander on the free look is cheap; shipping a 6-card 2-lander is not.

**The test question.** "Can this hand function if I draw two blanks?" [S39]. If the plan needs a third land, a second colour *and* an early play, that is three topdecks, not one [S40].

Apply:
- Free 7: keep 3–5 lands, or 2 lands + castable 2-MV ramp or cheap draw.
- After that: keep any hand with 2–4 mana sources in the right colours and a plan you can say in one sentence [S39].

---

## 2. Keep / mulligan by archetype

| Archetype | Keep (7) | Mulligan | Source |
|---|---|---|---|
| Ramp / big mana | 3 lands + ramp; or 2 lands + 2 castable ramp ("functionally ~5 sources by T3") | hands that start doing things on turn 5; ramp with nothing to ramp into | TurnZero [S41]; PrintMTG [S40] |
| Engine / midrange value | 2–3 lands + ramp + 1 engine + optional interaction | "all gas, no ignition": 7 spicy spells that don't cast on time | MTGEDH [S39] |
| Aggro / stompy / go-wide | 3 lands (or 2 + ramp) + early creature + a way to keep cards flowing | a hand that starts on turn 4 | [S39][S41] |
| Combo | mana that casts draw/tutors early + (compact pieces + protection, or strong draw + ramp); in fast pods ≥ 1 interaction | one-lander with no cantrips or cheap ramp | [S39] |
| Control | 3 lands (or 2 + rock) + early interaction + card flow | all interaction, no development | [S39] |
| Voltron | the equipment/aura package, or at least protection for one creature | unrelated creatures without payoff or protection | TurnZero [S41] |
| Superfriends | lands + ramp + a defensive piece (blocker maker, pillowfort, wipe) before walkers | walkers with no defence (rule below) | TurnZero superfriends [S13] |
| Artifacts / fast mana | lands + rocks + payoff, with ≥ 2 real lands | "the fragile fast-mana keep" that folds to one Nature's Claim | PrintMTG [S40] |
| Brawl aggro (1v1) | fast hand; vs control keep a taxing or indestructible creature, or protection | slow hands vs midrange and combo | MTGAZone Adeline guide [S60] |

The superfriends defence rule comes from the same source [S13]: "a planeswalker with four loyalty in a four-player game is a planeswalker with one loyalty."

**Pod speed shifts the bar** [S39]:
- Slow pods: keep hands that are half a turn slow if they snowball.
- High-power pods: need cheap ramp, cheap interaction and clean mana now.
- Brawl on the play has no turn-1 draw. A 5-MV commander is on curve 0.803 vs 0.877 in a pod at 37 lands / 10 rocks **[calc]**, so weight early mana higher.

Apply: classify the deck's archetype first, then apply its row. In Brawl, read the opponent's commander (shown at game start) before deciding [S60].

---

## 3. Hands to avoid (concrete examples)

| Hand (7) | Why it loses | Source |
|---|---|---|
| 3 taplands + four 4–6 MV spells | "Hope nobody does anything for three turns" | MTGEDH SHIP example [S39] |
| Island, Plains + Farseek, Cultivate, Rampant Growth, 2 five-drops (Bant deck) | Right count, wrong colours: no green for any ramp | [S39][S40] |
| Forest + Sol Ring + Cultivate + four 5-drops | One-land "house of cards" on one artifact; folds to one removal or a missed drop | [S40]; EDHREC Painbow example [S38] |
| 2 lands + 5 spells costing 5+ | Needs land, land, ramp in a row | [S40] |
| 5 lands + 2 expensive payoffs (aggro deck) | Good in ramp or control, a disaster in aggro (shape vs deck) | TurnZero [S41] |
| Tam/Atraxa superfriends: 3 lands + 4 walkers, no blockers or fort | Each walker is a free attack target | [S13] |
| Combo deck: 2 lands + both combo pieces, no draw, tutor or protection (B4) | Pieces get answered one at a time; nothing to rebuild with | [S39][S41] |
| 4 lands + Signet + 2 off-plan cards, mono-colour | Keepable but not good: no plan for turns 2–4 | [S41] |

Apply: before keeping, name the turn-2, turn-3 and turn-4 plays aloud. If any of them is "draw and hope", mulligan the free 7.

---

## 4. Sequencing principles

### 4.1 Land drops

General rule: "how can I maximize my mana for future turns without giving up what I will need this turn?" [S43]

| Land | Sequencing rule | Source / reasoning |
|---|---|---|
| Shock (dual with types) | No play this turn → play it tapped on T1 to save 2 life | Wizards "Real Estate 101" [S43] |
| Fast land (untapped with ≤ 2 other lands) | Play by T3, before the window closes; ahead of basics | [S43] |
| Slow land (untapped with ≥ 2 other lands) | T1 if no 1-drop; otherwise T3+ | oracle text; Karsten: whether a deck can freely play a tapland on T1 sets its tapland budget [S20] |
| Check land | After a land with the matching basic type (basic, shock, Turbulent) | oracle text |
| Turbulent (typed; untapped when opponents have ≥ 8 lands) | Pod: from about your turn 3–4 (seat table in principles.md §3.3). Brawl: plan it as a tapland on a turn with spare mana | **[calc]** |
| Annex (untapped with a planeswalker) | Hold it until a walker is down, unless no other land | oracle text |
| Verge | Play after a land with the type that turns on its second colour | oracle text |
| Fabled Passage | Crack early (enters tapped until you have 4 lands); then untapped from land 4 | oracle text [S20] |
| Fetchlands | Crack the least flexible fetch first; keep ≥ 1 dual in the library so later fetches stay live; vs Blood Moon-type effects, fetch basics | SCG [S45]; [S43] |
| Cycling / utility lands | Hold if you have spare land drops and may want to cycle later | [S43] |

**Tapping.**
- Tap basics before duals and leave the widest set of colours open [S44].
- Know your shortcuts and when to break them: tap so that land destruction can't strand the spell you are holding [S46].

### 4.2 Rocks vs threats; engine-first vs threat-first

| Situation | Line | Source |
|---|---|---|
| Commander MV ≥ 4 | T2 rock → T3 four-drop → T4 five-drop (ramp into the commander) | Karsten [S8] |
| Commander MV 2–3 | Curve out; extra rocks are worse than on-curve plays | Karsten [S8] |
| Engine vs threat (judgement) | Deploy the engine when the table is tapped low, or when someone else is the visible leader ("the leader gets picked on" [S55]) | [S55] |
| Engine vs threat (judgement) | Deploy the threat first only when you can protect it or it wins within one turn cycle | [S28] |
| Power plays | Sol Ring, Rhystic Study and Survival-type openers draw attacks; expect it | Bennie Smith [S54] |

### 4.3 Holding interaction

- **Don't do work for opponents.** If no immediate must-answer target exists, hold spot removal until a real threat appears or is sent your way [S52].
- **Make each spell count.** cEDH heuristic: each interaction spell should deny ≥ 3 opposing resources. Avoid policing the table [S34].
- **Act early when it pays.** Hit a tutor that is about to find a game-winner, or a snowballing draw engine, before it resolves [S34].
- **Answer the card, not the player.** Once the problem card is gone, stop punishing that player [S57].

### 4.4 Wipe timing

Decision tree, merged from Grimdeck (2026-05) [S49], Culture of Gaming (2026-01) [S50] and Nerd Leagues (2026-07) [S51]:

| # | Question | If yes |
|---|---|---|
| 1 | Do I die, or does someone win, before my next turn? | Wipe |
| 2 | Is a board becoming inevitability (snowball commander, sac engine + payoffs, token + anthem)? | Wipe |
| 3 | Can I break parity (walkers or enchantments survive, faster rebuild, recast commander, Teferi's Protection)? | Wipe |
| 4 | Would it hand the game to the player who doesn't care about the board (combo, control with a full grip)? | Hold; use spot answers |
| 5 | Is my follow-up "pass"? | Hold unless #1 |

Rules of thumb:
- **Wait for more value when you can.** If the opponent could have cast creatures last turn but didn't, waiting buys less; with a backup wipe in hand, wiping early is safer [S48].
- **Use the narrowest tool.** Austere Command, a low-X Toxic Deluge, or an end-step overloaded Rift [S49].
- **Wiping while ahead is usually a punt** unless another board beats yours on a different axis [S49].

### 4.5 Deploying walkers safely

| Rule | Source |
|---|---|
| Build the fort before the walkers: blockers, pillowfort, sweepers that spare walkers | TurnZero [S13]; Tap & Sac [S58] |
| Prefer walkers whose abilities protect themselves (tokens, removal) | [S58] |
| Pick walkers on their + and − abilities, not their ultimates | [S58] |
| Early game: set up and ramp. Mid game: walkers (4–6 MV) with protection. Late game: ultimates via proliferate, Doubling Season or Deepglow Skate | TCGplayer 2023 [S59] |

Before each walker (judgement):
1. Add up opponents' untapped power that can reach the walker before your next turn: evasion, haste.
2. Compare it with loyalty *after* this turn's activation.
3. If attack power ≥ loyalty and you have no blocker, use the ability that makes a blocker or removes the attacker, or hold the walker.

Apply: for each turn line, check that the land order keeps conditional lands untapped. Hold removal unless it answers a win or a snowball. Wipe only on the decision tree.

---

## 5. Threat assessment and politics (4-pod)

| Principle | Source |
|---|---|
| Attack the player most likely to beat you; defend against the one who sees you as their biggest threat; it shifts every turn | Tiernan, SCG 2016 [S52] |
| Read four axes separately: board, resources (draw engines), clock, combo proximity; the quiet engine deck is often the real threat | TurnZero [S55] |
| Pressure the player playing the longest game. Green ramp and blue control exploit Commander's slow pace; a control player at 30 life with a full grip on turn 7 means "you've lost" | Draftsim 2025 [S56] |
| Ally with a player who is behind against the leader; dealing with the leader feeds them the game | Draftsim [S56] |
| Deals are informal; expect them to break the moment your ally becomes the threat | TurnZero [S55] |
| Kingmaking norms are table-specific; ask the pod | [S55] |
| Revealed commanders allow early pressure on obviously strong ones; power openers (Sol Ring, Rhystic, Survival) earn attacks | Bennie Smith, SCG 2017 [S54] |
| "Future revenge": attack the player whose colours will kill your creature anyway | [S54] |
| Politics as misdirection fails against a table that assesses threats; rattlesnake cards (deterrents) work better than talk | Tiernan, SCG 2016 [S53] |
| cEDH social contract: every play is a good-faith attempt to win; alliances last "until the stack clears" | EDH Wiki [S31] |
| Seat 1 wins 29.2 % casual and 31.5 % cEDH vs a 25 % fair share: treat seat 1 as ahead by default | [S30][S32] |

Apply: each round, rank opponents on board, resources, clock and combo distance. Point attacks and removal at the top-ranked one unless that player is already being handled by someone else [S55].

---

## 6. Pre-turn visualisation checklist (use at the table)

Rationale: take 10–20 s at the start of each turn to plan the land, the attacks and the spells before acting [S47]. Then sequence so that information-*gaining* actions come first and information-*giving* actions come last [S47].

| Step | Question |
|---|---|
| 1. Threat scan | Who is closest to winning on board, resources, clock or combo? Can anyone win before my next turn? [S55] |
| 2. Their open mana | Which instant-speed answers could each opponent hold (colours, untapped lands, cards in hand)? |
| 3. My win check | Can I win this turn? If so, which protection goes first? (win-conditions.md §3) |
| 4. Land | Which land keeps next turn's conditional lands untapped and the most colours open? (§4.1) |
| 5. Draw / dig first | Cast cantrips, draw spells and fetches before choosing the land or the main play when they could change the line [S47] |
| 6. Combat | Attack before casting sorcery-speed creatures, unless they affect combat; who do I attack and why? [S47][S52] |
| 7. Main play | Engine or threat? Will it make me the leader, and can I protect it? (§4.2) |
| 8. Hold-up | What interaction do I keep open, and for which specific threat? (§4.3) |
| 9. Walkers | Activation order; loyalty after activation vs attackers that can reach it (§4.5) |
| 10. Crack-back | After my turn, who can attack me or my walkers, and do I survive a wipe? |
| 11. Brawl-only | One opponent: did I count their commander as always available? No commander damage either way; 25 life budget for shocks and fetches |

Apply: the orchestrator's pilot guide for any deck should list, per archetype, the answers to steps 4, 7 and 8 for turns 1–4, plus the deck's kill turn from win-conditions.md §4.
