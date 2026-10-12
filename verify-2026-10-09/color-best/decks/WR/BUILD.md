# WR (Boros) — Duke Ulder Ravengard: build report (2026-10-09)

Base: `../../lists/WR-duke-ulder-ravengard.txt` (model climb, objective 82.2 at 300 games; brief said 82.8).
Final: `final.txt` — objective **82.2**, Deck Score **70.1**, role penalty 0
(ramp 12 / draw 11 / removal 12 / wipes 4 / protection 6), 36 lands, avg MV 3.48.
Lab: `lab-1.txt`, `lab-alt.txt`, `lab-final.txt` (ALL = −0.01). Gate: `gate.txt`.

## Commander (oracle)
Duke Ulder Ravengard {4}{R}{W}: "At the beginning of combat on your turn, another target creature you
control gains haste and myriad until end of turn." Myriad tokens enter tapped and attacking, so in a
4-player pod every Duke turn = the target + 2 token copies, each with its ETB and attack triggers.
The trigger fires each combat, so extra combats (Karlach, Moraug) re-fire it.

## Plan
- **T1–3:** lands, Sol Ring / Arcane Signet / Talisman / Wayfarer's Bauble / Pearl Medallion; cheap
  interaction (Swords, Path, Sheltered by Ghosts, Dispatch); White Plume / Nadaar / Dawnbringer bodies.
- **T4–6:** Duke on 6 (sim: avg cast T6.2). Before him land a payoff: Panharmonicon, Terror of the
  Peaks, Warstorm Surge, Firemane Commando (draw on 2+ attackers).
- **Close:** Duke targets a fat trigger creature each turn — Trumpeting Carnosaur (discover 5 ×3),
  Combustible Gearhulk (draw 3 or burn ×3), Meteor Golem (destroy ×3), Bane of Bala Ged (each opponent
  exiles 2), Eldrazi Ravager (annihilator to each opponent), Etali (free spells ×3), Steel Hellkite.
- **Closer:** Terror of the Peaks or Warstorm Surge + myriad copies of a 6–7-power body: each copy
  entering deals its power to any target (2 copies × 6–7 per payoff per combat); Karlach adds a second
  combat and a second Duke trigger. Backup: Blade Historian double-strike alpha.

## Swaps (11) — Out → In → why → source → Δ (alone, 300 games)
| Out | In | Why | Source | Δ |
|---|---|---|---|---|
| Decanter of Endless Water | Sol Ring | "{T}: Add {C}{C}" for 1 vs a 3-mana rock | raid Bumi | +0.05 |
| Bender's Waterskin | Arcane Signet | 2-mana "{T}: Add one mana of any color in your commander's color identity" | free | 0.00 |
| Reliquary Tower | Command Tower | hand-size land → both colours | raid Bumi | +0.03 |
| Nesting Grounds | Exotic Orchard | colourless counter-mover, no counters in deck → coloured land | free | +0.02 |
| Adaptive Automaton | Bane of Bala Ged | "Whenever this creature attacks, defending player exiles two permanents" — myriad = every opponent | free | −0.06 |
| Academy Manufactor | Firemane Commando | no Clue/Food/Treasure makers; "Whenever you attack with two or more creatures, draw a card" | free (frees a Cabbage raid) | +0.01 |
| Magda, the Hoardmaster | Sheltered by Ghosts | crime-Treasure off-plan; "exile target nonland permanent" + ward {2} on the myriad target | free | 0.00 |
| Ajani Resolute | Eldrazi Ravager | lifegain walker off-plan; "Annihilator 1" per myriad copy, 6 power for Terror/Surge | free (frees a Tam raid) | −0.03 |
| Emerald Medallion | Steel Hellkite | Medallion reduces green spells only (zero in deck); each myriad copy has its own "{X}: Destroy…" | free (frees a Cabbage raid) | −0.02 |
| Sapphire Medallion | Another Round | reduces blue spells only; "Exile any number of creatures you control, then return them" = re-buy ETBs | free | +0.02 |
| Sram, Senior Edificer | Sami, Wildcat Captain | 4 Aura/Equipment in deck; "Double strike, vigilance" myriad target, affinity for the 20+ artifacts | free | −2.02* |

\* Sram counts as draw: alone draw drops to 9 (window penalty −2, not quality); with Firemane in, draw
11 and the penalty is gone. ALL = 82.20 → 82.20 (−0.01). Every swap is DS-flat: the model is blind to
myriad/ETB value; judgment decides. Rejected: Cityscape Leveler (removal 13 → window penalty, 8 mana),
Journey to Nowhere (same), Village Pillagers (counted as a wipe, −2.01), Boros Locket (+0.08, kept
Signet/Sol Ring instead), Chains of Custody for Kindred Judgment (+0.03, below the 0.25 bar).

## Raids (52 cards, all from the model's base except Sol Ring + Command Tower)
| Donor | # | Cards |
|---|---|---|
| inspirit-flagship-vessel | 16 | Abrade, All That Glitters, Ancient Den, Battlefield Forge, Boros Charm, Chaos Warp, Dispatch, Final Showdown, Great Furnace, Inventors' Fair, Karn's Bastion, Panharmonicon, Radiant Summit, Rugged Prairie, Rustvale Bridge, Spire of Industry |
| tazri-beacon-of-unity | 16 | Blade Historian, Blasphemous Act, Bloodstained Mire, Generous Gift, Grand Abolisher, Inspiring Vantage, Karlach Fury of Avernus, Mangara the Diplomat, Sacred Foundry, Seasoned Dungeoneer, Selfless Spirit, Squad Commander, Swords to Plowshares, White Plume Adventurer, Windswept Heath, Wooded Foothills |
| gilanra-alena-partners | 6 | Combustible Gearhulk, Etali Primal Storm, Spinerock Knoll, Terror of the Peaks, Trumpeting Carnosaur, Warstorm Surge |
| bumi-unleashed | 6 | Command Tower, Faithless Looting, Rogue's Passage, Sol Ring, Strip Mine, Thrill of Possibility |
| tam-the-possibility | 4 | Clifftop Retreat, Mana Confluence, Path to Exile, Talisman of Conviction |
| imotekh-the-stormlord | 3 | Foundry Inspector, Gilded Lotus, Thought Vessel |
| the-cabbage-merchant | 1 | Walking Ballista |
Multi-copy cards (Blade Historian, Clifftop, Generous Gift, Vantage, Foundry, Swords) can come from
either listed holder; Beledros untouched. Raids went 53 → 52.

## Gate (`gate.txt`)
PASS size 100, singleton, legality, identity RW, ownership, curve, wincons, locks. WARN lands 36 vs
Karsten 40±2. FAIL plan = known false negative ("creates tokens": myriad is not read as tokens).

## Risks
- 52 raids: Inspirit and Tazri each lose 16 cards — building this guts both; backfills not planned.
- 36 lands + 12 ramp for a 6-drop commander and a 6–7-MV payoff suite (landsT4 .69, Duke T6.2).
- Myriad is worthless 1v1 / when two opponents are dead; the deck shrinks as the table does.
- Model is blind to myriad, ETB copies and Panharmonicon: every swap is judgment, not score.
- Sheltered by Ghosts / Darksteel Mutation on Duke's target are 2-for-1 risks to removal.
