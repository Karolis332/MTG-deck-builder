# B — Ob Nixilis of the Black Oath (paper Commander)

Base: `../../lists/B-ob-nixilis-of-the-black-oath.txt` (model climb). Final: `final.txt` (100, 38 lands, 9 Swamps, avg MV 3.92).

| | Objective | Deck Score | Penalty | Commander turn | Keep-7 |
|---|---|---|---|---|---|
| Model list (score.ts, 300 g) | 78.31 | 66.4 | 0 | 5.63 | .96 |
| final.txt (score.ts, 300 g) | **76.58** | **66.4** | 1 (protection 2 vs 3–6) | 5.52 | .98 |

The −1.73 is the role-window penalty (−2): Overzealous Muscle was one of the 3 "protection" cards (it only shields itself). Without it, the 12 swaps total +0.3. Deck Score is flat on every swap, so the model cannot see drain/lifegain or tutors. Logs: `swap-lab.log` (first pass), `swap-lab-2.log` (final), `score-model.txt`, `score-final.txt`, `gate.txt`.

## Plan: Demons and drain
Ob Nixilis oracle: "+2: Each opponent loses 1 life. You gain life equal to the life lost this way. / −2: Create a 5/5 black Demon creature token with flying. You lose 2 life."
- **T1–3:** land drops (9 Swamps + 6 Swamp fetchers), Sol Ring, Arcane Signet, Charcoal Diamond, Thought Vessel, Ornithopter. Spot removal. The fast line is Buried Alive or Reanimate on a Demon.
- **T4–6:** cast Ob Nixilis (sim avg T5.5). Use −2 for a 5/5 flier right away, then +2. Tivash ("if you gained life this turn … create an X/X black Demon") and Defiling Daemogoth ("each opponent loses X life, where X is the amount of life you gained this turn") turn every +2 into more pressure. Vilis ("Whenever you lose life, draw that many cards") turns the −2 into 2 cards. Big mana comes from Crypt Ghast ("Whenever you tap a Swamp for mana, add an additional {B}"), Nyx Lotus, Tron and Lotus Field.
- **Close (T8+):** the flying Demon army (tokens + Desecration, Reiver, Rune-Scarred, Butcher, Varragoth, Vilis). Archfiend of Despair doubles the damage each end step. Pestilence Demon turns the Crypt Ghast mana into a table drain. Shard of the Nightbringer takes half of one opponent's life.
- **Backup:** reanimate a Demon (Animate Dead, Reanimate, Victimize, Dread Return, Rise of the Dark Realms, Mortuary Mire).

**Closer:** Archfiend of Despair ("each opponent loses life equal to the life that player lost this turn") plus the 5/5 flying Demon swings.

## Swaps (12) — swap-lab Δ on the model list, 300 games
| Out | In | Why (oracle) | Source | Δ |
|---|---|---|---|---|
| Windswept Heath | Swamp | "search … for a Forest or Plains card": deck has none, so it is a dead land | basic | +0.10 |
| Wooded Foothills | Swamp | "for a Mountain or Forest card": dead land | basic | +0.13 |
| Brokers Hideout | Swamp | "sacrifice it … basic Forest, Plains, or Island": you lose a land | basic | +0.11 |
| Cabaretti Courtyard | Fabled Passage | Courtyard finds "Mountain, Forest, or Plains" (nothing). Passage finds a Swamp and triggers Dread Presence | FREE | 0.00 |
| Mana Confluence | Swamp | in mono-B it is a Swamp that costs life. Swamps feed Crypt Ghast, Tendrils, Dread Presence | basic | 0.00 |
| Dark Depths | Bojuka Bog | no Stage/Vesuva (both in Beledros), so Depths makes no mana. Bog taps for {B} and hoses graveyards | FREE | +0.10 |
| Great Hall of the Citadel | Swamp | {C} plus mana for legendary spells only. A Swamp fixes BB/BBB | basic | 0.00 |
| Chromatic Lantern | Sol Ring | in mono-B the Lantern is a plain 3-mana rock. Sol Ring "Add {C}{C}" for 1 (ramp count stays 12) | RAID Tam | −0.07 |
| Fellwar Stone | Arcane Signet | Fellwar depends on opponents' lands. Signet always gives {B} | FREE | 0.00 |
| Overzealous Muscle | Defiling Daemogoth | off-plan Ogre vs a Demon that drains "the amount of life you gained this turn" (Ob +2, Nighthawk, Tivash, Pontiff/Ghast extort, Darkness Crystal) | FREE | −2.02 (window) |
| Wishclaw Talisman | Emeritus of Woe // Demonic Tutor | Wishclaw hands "an opponent … control of this artifact" (a tutor for them). Emeritus "enters prepared" and gives a Demonic Tutor | FREE | −0.01 |
| Demon's Horn | Shard of the Nightbringer | Horn "may gain 1 life" is filler. Shard: "target opponent loses half their life … You gain life" (Daemogoth/Tivash fuel) | FREE | −0.04 |

Judgment override: Daemogoth's −2.02 is exactly the protection-window penalty (protection 3 → 2) with Deck Score flat. The model is blind to lifegain → drain. ALL: 78.31 → 76.60 (pen 1).
The swaps also return 9 raided cards (Tazri 6, Tam 2, Imotekh 1, Inspirit 1 via Fellwar) and add one raid (Sol Ring).

## Raids (28 incl. commander) — card → donor
| Donor | Cards |
|---|---|
| tam-the-possibility (5) | Ob Nixilis of the Black Oath (commander), Ob Nixilis the Hate-Twisted, Kaya's Ghostform, Chimil the Inner Sun, Sol Ring |
| imotekh-the-stormlord (12) | Bitter Triumph, Charcoal Diamond, Crypt Ghast, Crypt of Agadeem, Dismember, Dread Return, Feed the Swarm, Mortuary Mire, Ravenous Chupacabra, Rune-Scarred Demon, The Darkness Crystal, Thought Vessel |
| inspirit-flagship-vessel (5) | Inventors' Fair, Karn's Bastion, Nyx Lotus, Ornithopter of Paradise, Spire of Industry |
| bumi-unleashed (3) | Lotus Field, Rogue's Passage, Strip Mine |
| tazri-beacon-of-unity (2) | Bloodstained Mire, Twilight Prophet |
| the-cabbage-merchant (1) | Escape Tunnel |
Total 28 = 5 + 12 + 5 + 3 + 2 + 1. Beledros is not raided.

## Gate (`gate.txt`)
PASS size, singleton, legality, rules, identity (B), ownership. Known false negatives: FAIL arenaNames (paper; Emeritus/Murderous Rider DFC names) and FAIL plan. WARN lands 38 vs Karsten 41±2.

## Risks
- The model list's raid load stays heavy. 12 cards come from Imotekh (mono-B, sleeved), so building this deck in effect dismantles Imotekh, and Tam loses its Ob Nixilis pair.
- Protection is thin (Soul of New Phyrexia, Chimil, Kaya's Ghostform). Ob sits at 1 loyalty after the first −2, so he dies to any attack.
- 38 lands with 12 ramp. 13 of the lands are colourless utility (Tron, Lighthouse, Raceway, Pylons …), which strains BB/BBB costs (Vilis, Pestilence, Archfiend).
- Model blind spots: lifegain → drain, tutors, Archfiend doubling. The closer was judged by oracle, not by the score.
- Not tested here: reanimation targets vs Bojuka Bog anti-synergy (the Bog targets a player; aim it at an opponent).
