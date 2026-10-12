# WG — Mirri, Weatherlight Duelist (paper Commander)

Model list `lists/WG-mirri-weatherlight-duelist.txt` 71.3 (DS 71.4, pen 6) → `final.txt` **78.5** (DS 71.0, pen 2), 300 games.
Verdict: weak identity. The pool has no owned GW duals, few cheap token makers, and 39 of the 99 lines are raids from sleeved decks.
The plan is playable, but this deck only exists if other decks give up cards.

## Plan — go-wide tokens; Mirri makes blocks irrelevant
Mirri: "Whenever Mirri attacks, each opponent can't block with more than one creature this combat."
- **T1–3:** Sol Ring / Signet / Talisman / land ramp (Nature's Lore, Farseek, Rampant Growth) → Mirri T3–4. Hardened Scales, Basilisk Collar.
- **T4–6:** token engines: Squad Commander, Eusocial Engineering (2/2 per land), Rampaging Baloths, Mycoloth, Forum Filibuster, Primeval Bounty, Elspeth +1.
  Swing with Mirri every turn: each opponent blocks one attacker. Toski, Ohran Frostfang and Firemane Commando draw off the attack.
  While Mirri is tapped, only one creature can attack you.
- **Close (T7–9):** wide swing plus a pump: Overrun (+3/+3 trample), Return of the Wildspeaker (+3/+3 non-Humans), Jazal Goldmane (+X/+X per attacker).
  Avenger of Zendikar plus a land drop is the backup.
- **Closer:** Overrun / Return of the Wildspeaker on a wide board after a Mirri attack trigger.

## Swaps (12, one swap-lab run on the model list, 300 games each)
| Out | In | Why | Source | Δ |
|---|---|---|---|---|
| Thought Vessel | Sol Ring | Colourless {C} rock → "{T}: Add {C}{C}" for 1. Ramp-neutral. Operator keep rule. | raid Imotekh (frees Imotekh's Thought Vessel) | +0.01 |
| Decanter of Endless Water | Arcane Signet | Same any-colour rock, 2 MV instead of 3. Operator keep rule. | free | +0.01 |
| Fellwar Stone | Firemane Commando | "Whenever you attack with two or more creatures, draw a card": draws every Mirri swing. Ramp 16→15. | free | +2.18 |
| Wayfarer's Bauble | Eusocial Engineering | "Landfall — … create a 2/2 … Robot": tokens from 36 lands + fetches + land ramp. | free | +1.85 |
| Ornithopter of Paradise | Forum Filibuster | "create a 2/1 … flying" every upkeep, and it rebuys Collar/Warhammer/Mantle. | free | +1.90 |
| Snakeskin Veil | Overrun | Closer: "+3/+3 and gain trample". Protection 8→7. | free | +1.55 |
| Panharmonicon | Mycoloth | Devour tokens → a Saproling per counter every upkeep. Synergy 70→84. | free | +0.31 |
| Sapphire Medallion | Selesnya Charm | Medallion is blank (blue spells). Charm: "Exile target creature with power 5 or greater" / 2/2 Knight / +2/+2 trample. | free | +0.30 |
| Foundry Inspector | Primeval Bounty | Artifact discount is off-plan. Bounty: "Whenever you cast a creature spell, create a 3/3 … Beast". | free | 0.00 (11-swap base) |
| Bloodstained Mire | Command Tower | Mire fetches "a Swamp or Mountain": dead in GW. Operator keep rule. | raid Gilanra | +0.07 |
| Talon Gates of Madara | Fabled Passage | Gate filler → basic fetch. | free | −0.08 |
| Reliquary Tower | Plains | Colourless filler → W source (8 free Plains). | free | +0.05 |

Lab run 2 (with Hexhaven Battalion in slot 9): ALL 74.46. The 11 kept swaps: 78.18. With Primeval Bounty: 78.5 (score.ts).
Rejected in the lab: Hexhaven Battalion −8.36 (win step + draw window), Mirror Entity −0.03 (an extra Tazri raid for a closer Overrun already covers).
Also rejected, lab run 1: Eusocial / Selesnya Charm in the Academy Manufactor / Alms Collector slots −6.4 (the win component's close-turn step).
The same cards in the slots above read flat or positive.
Window effect: ramp 16→13 and protection 8→7 move the penalty 6→2 (+8 objective). Deck Score is flat (71.4 → 71.0).
The model is blind to the go-wide/anthem plan, so judgment picks the cards.

## Raids (39 lines; Beledros never raided)
Swaps reduced raids from 45 to 39: −Thought Vessel, Fellwar Stone, Ornithopter, Snakeskin Veil, Panharmonicon, Foundry Inspector, Bloodstained Mire; +Sol Ring, Command Tower.
| Donor | Cards |
|---|---|
| the-cabbage-merchant (11 lines, 14 cards) | Academy Manufactor, Escape Tunnel, Garruk's Uprising, Kenrith's Transformation, Mosswort Bridge, Return of the Wildspeaker, Seedborn Muse, Toski, Ohran Frostfang, Tireless Provisioner, Forest ×4 (65 owned, 64 sleeved) |
| tazri-beacon-of-unity (9) | Farseek, Nature's Lore, Grand Abolisher, Heroic Intervention, Selfless Spirit, Squad Commander, Swords to Plowshares, Windswept Heath, Wooded Foothills |
| inspirit-flagship-vessel (7) | All That Glitters, Ancient Den, Final Showdown, Generous Gift, Inventors' Fair, Karn's Bastion, Spire of Industry |
| tam-the-possibility (6) | Ajani Resolute, Elspeth Sun's Champion, Mana Confluence, Overgrown Farmland, Path to Exile, Vigorbloom Charm |
| bumi-unleashed (3) | Hunter's Insight, Rogue's Passage, Strip Mine |
| gilanra-alena-partners (2) | Shamanic Revelation, Command Tower |
| imotekh-the-stormlord (1) | Sol Ring |
Free alternatives for raided removal are thin. Swords, Path and Generous Gift are the deck's best answers.

## Gate (`gate.log`)
size, singleton, legality, identity, ownership, curve, wincons, locks: PASS.
lands: WARN (36 vs Karsten 39±2). plan: FAIL, the known false negative ("0/63 interact").

## Risks
- 39 raids from 7 sleeved decks: Cabbage −12, Tazri −9, Inspirit −7. Not buildable without dismantling or backfilling those decks.
- The land base is still colourless-heavy (Tron ×3, Den, Bastion, Fair, Spire, Strip Mine, Rogue's Passage, Temple, Buried Ruin, Blighted Woodland). No owned GW duals beyond Farmland/fetches. 36 lands vs Karsten 39.
- Off-plan cards left in for the 12-swap cap: Academy Manufactor, Alms Collector, Sram + Spirit Mantle, Sword of the Animist, Devourer of Destiny, Cityscape Leveler, Meteor Golem.
  The last three are kept as removal (removal sits at 11).
- Top-heavy: 17 cards at 5+ MV. Mirri itself is a 2/2 first striker that dies to everything; protection is 7.
- Torens (66.0) is the only alternative identity pick; the pool cannot support a strong WG deck without raids.
