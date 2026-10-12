# Linvala, Shield of Sea Gate — WU party (paper)

**Final:** `final.txt` (100, singleton, inside WU). Model list `../../lists/WU-linvala-shield-of-sea-gate.txt`.
**Score (score.ts, 300 games):** model 82.47 / DS 71 → final 82.98 / DS 71 (swap-lab ALL 82.75, +0.28). Roles unchanged: ramp 12, draw 12, removal 10, wipes 3, protection 6, penalty 0. Commander turn 3.71 → 3.37, keep-7 .94 → .97.
**Gate:** all PASS (size, singleton, legality, rules, identity, ownership, lands 36 + 2 MDFC) except known false negatives `arenaNames` (paper) and `plan`. Output: `gate.txt`.

## Plan — one primary, one backup
Linvala oracle: "At the beginning of combat on your turn, if you have a full party, choose target nonland permanent an opponent controls. Until your next turn, it can't attack or block, and its activated abilities can't be activated." / "Sacrifice Linvala: Choose hexproof or indestructible. Creatures you control gain that ability until end of turn."

- **T1–3:** rock (Sol Ring, Arcane Signet, Talisman, Fellwar) + cheap party bodies: Archpriest of Iona (Cleric), Nimble Trapfinder (Rogue), Unsettled Mariner / Stonework Packbeast / Mirror Entity / Barkform Harvester (changeling = any slot). Linvala on T3 (model avg T3.4).
- **T4–6:** complete the party (Harper Recruiter digs Cleric/Rogue/Warrior/Wizard cards, Squad Commander makes a token per party member, Whirler Rogue +2 Thopters). Linvala locks the best blocker or attacker every combat; Coastal Piracy / Reconnaissance Mission / Bident of Thassa / Nimble Trapfinder full-party trigger turn damage into cards. Counters + Grand Abolisher hold the board; Linvala sac = team hexproof/indestructible vs a wipe or spot removal.
- **Close (T7–9):** go wide, make it unblockable, pump. Sun Quan ("Creatures you control have horsemanship") or Whirler Rogue ("Tap two untapped artifacts you control: Target creature can't be blocked this turn") / Nimble Trapfinder, then Jazal Goldmane ("{3}{W}{W}: Attacking creatures you control get +X/+X ... where X is the number of attacking creatures") or Mirror Entity X. Squad Commander full party: "+1/+0 and gain indestructible".
- **Backup:** pillowfort grind — Propaganda, Ghostly Prison, Archangel of Tithes, Mangara + the Linvala lock on the biggest threat; win later through the combat-damage draw engines.

**Closer:** Sun Quan horsemanship (or Whirler Rogue) + Jazal Goldmane pump on a 6+ creature party board.

## Swaps (11) — swap-lab on the model list, each swap alone, 300 games
| Out | In | Why (oracle) | Source | Δ |
|---|---|---|---|---|
| Bloodstained Mire | Fabled Passage | Mire "search for a Swamp or Mountain card" fetches nothing in WU; Passage fetches a basic | free | 0.00 |
| Wooded Foothills | Exotic Orchard | Foothills "Mountain or Forest card" = dead land; Orchard taps for opponents' colours | free | +0.07 |
| Reliquary Tower | Plains | Tower only "{T}: Add {C}" — colourless filler; WWW (Archangel) wants W | free | +0.03 |
| Nesting Grounds | Plains | "{T}: Add {C}" + counter-moving with no counters in the deck | free | +0.07 |
| Temple of the False God | Plains | "{C}{C} ... only if you control five or more lands" — dead early | free | +0.06 |
| Bane of Bala Ged | Sun Quan, Lord of Wu | 7-drop colourless beater → "Creatures you control have horsemanship" = team evasion closer | free | +0.02 |
| Ajani Resolute | Barkform Harvester | lifegain walker off-plan → "Changeling (This card is every creature type.)" fills any party slot for {3} | free | +0.02 |
| Pearl Medallion | Whirler Rogue | cost reducer → Rogue (thinnest slot) + two flying Thopters + unblockable enabler | free | -0.00 |
| Sky Diamond | Sol Ring | "enters tapped. {T}: Add {U}" → "{T}: Add {C}{C}" for 1 | raid (Bumi) | -0.02 |
| Thought Vessel | Arcane Signet | {C} rock → any-colour rock; returns Vessel to Imotekh | free | +0.05 |
| Chromatic Lantern | Firdoch Core | 3-mana fixer is redundant in 2 colours; Core = any-colour rock + "Changeling ... {4}: becomes a 4/4" party member; returns Lantern to Tazri | free | 0.00 |

**Rejected in the lab:** Devourer of Destiny → Emeritus of Ideation (−3.98) and Cityscape Leveler → Seasoned Cryomancer (−4.00): both drop removal to 9 (window penalty). Nadaar → Whirler Rogue: alone 0.00, but together with Ajani → Barkform it crossed the win component's close-turn step (82.5 → 75.9, win 64 → 56; leave-one-out bisect) → Whirler took Pearl Medallion's slot instead, Nadaar stays (venture + "+1/+1 as long as you've completed a dungeon" with White Plume's initiative). Pearl Medallion → Sol Ring: −1.91, ramp 13 over the window → Sol Ring took Sky Diamond's slot. Pearl Medallion → Tetsuko: −0.01, superseded by Whirler.
**Model blindness:** evasion (Sun Quan, Whirler, Trapfinder, Rogue's Passage) is worth 0 in the goldfish (no blockers); the evasion adds are judgment, scored flat.

## Raids (every card not free in decks/paper/collection.txt)
| Donor | Cards |
|---|---|
| Tazri (18) | Linvala (commander), Base Camp, Glasspool Mimic, Grand Abolisher, Hallowed Fountain, Harper Recruiter, Land Tax, Mangara the Diplomat, Mirror Entity, Nimble Trapfinder, Selfless Spirit, Spoils of Adventure, Squad Commander, Stick Together, Stonework Packbeast, Unsettled Mariner, White Plume Adventurer, Windswept Heath |
| Inspirit (17) | Adarkar Wastes, Ancient Den, Cyclonic Rift, Fact or Fiction, Glacial Fortress, Inventors' Fair, Irrigated Farmland, Karn's Bastion, Lux Cannon, Ornithopter of Paradise, Skycloud Expanse, Spire of Industry, Swan Song, Temple of Enlightenment, Fellwar Stone, Generous Gift, Swords to Plowshares (2nd copies are in Tazri; take Inspirit's) |
| Tam (7) | Archangel of Tithes, Deserted Beach, Dovin's Veto, Mana Confluence, Path to Exile, Seachrome Coast, Talisman of Progress |
| Bumi (3) | Sol Ring, Rogue's Passage, Strip Mine |
Swaps returned 5 raids to their decks: Bloodstained Mire + Wooded Foothills + Chromatic Lantern (Tazri), Thought Vessel (Imotekh); Ajani Resolute (Tam). Beledros untouched.

## Risks
- The deck cannot exist without dismantling Tazri: Linvala herself plus 17 Tazri party/mana cards. Building it = retiring Tazri (top-priority deck) or buying a second Linvala + party core.
- 45 raids total across 4 decks; each donor needs backfills before sleeving.
- The model is blind to evasion and the Linvala lock; DS 71 is mid-pack — the score does not prove this deck beats the runner-up (Hama Pashar 75.5 objective).
- List sits on the win-step edge: small power-loss swaps in creature slots can cost ~7 points in one go.
- Practiced Tactics / Lux Cannon are weak removal kept only for the removal window.
