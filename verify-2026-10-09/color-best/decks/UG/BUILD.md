# UG — The Goose Mother (Food + counters) — BUILD

Model list `lists/UG-the-goose-mother.txt` objective **90.08** (DS 78.6) → `final.txt` objective **90.30** (DS 78.6, penalty 0; roles land 36 / ramp 12 / draw 10 / removal 10 / wipes 3 / protection 6). Model is flat (DS 0.0) on every swap: blind to X-doubling, counters and Food density → judgment decides, numbers recorded.
Gate (`gate.log`): PASS size, singleton, legality, identity (GU), ownership, lands (36 vs Karsten 38±2), curve (avg MV 2.98), wincons; FAIL `plan` = known false negative.

## Commander
The Goose Mother {X}{G}{U}: flying; enters with X +1/+1 counters; "create half X Food tokens, rounded up"; on attack "you may sacrifice a Food. If you do, draw a card."

## Plan
- **T1–3:** ramp (Llanowar, Gilded Goose, Rampant Growth, Farseek, Nature's Lore, Arcane Signet, Rishkar) + one counter doubler (Hardened Scales, Ozolith, Kami of Whispered Hopes) or Food engine (Trail of Crumbs, Peregrin Took, Academy Manufactor, Tireless Provisioner).
- **T4–6:** Goose Mother for X = 3–5. Unbound Flourishing doubles X ("double the value of X") → double counters, double Foods. Night of the Sweets' Revenge turns every Food into "{T}: Add {G}" → re-cast bigger, Hydroid Krasis / Lifeblood / Primordial Hydra / Universal Surveillance for big X. Swing in the air, sac a Food per attack to draw.
- **Close (T8–10):** go wide with Foods → Displaced Dinosaurs (artifact tokens are historic → each Food enters as a 7/7) or Cyberdrive Awakener (every Food a 4/4 flyer), or Night of the Sweets' Revenge sac (+X/+X, X = Foods). Backup: big trampling hydras + Tanazir Quandrix (double Goose counters; others' base P/T = Tanazir's).

**Closer:** Night of the Sweets' Revenge pump (+X/+X per Food) over a Food-wide board; Displaced Dinosaurs as the alternate.

## Swaps (10)
| Out | In | Why | Source | Δ |
|---|---|---|---|---|
| Meteor Golem | Beast Within | "Destroy target permanent" at instant speed for 3 vs a 7-mana sorcery-speed body; removal count held | free | −0.01 |
| Thought Vessel | Arcane Signet | colored mana for {X}{G}{U}/{G}{G}{G}{G}; Vessel's no-max-hand is redundant | free | +0.01 |
| Reliquary Tower | Fabled Passage | fetch = 2 landfall triggers (Tatyova draw, Provisioner Food/Treasure); untaps with 4 lands | free | 0.00 |
| Simic Guildgate | Exotic Orchard | untapped colored source vs a tapped Gate | free | +0.04 |
| Temple of the False God | Command Tower | operator staple; Temple is dead before 5 lands and colorless | raid Bumi | +0.09 |
| Uthros, Titanic Godcore | Lumbering Falls | both tapped; Falls gives G or U and a hexproof 3/3 manland; returns Uthros to Inspirit | free | +0.03 |
| Urza, Lord High Artificer | Rishkar, Peema Renegade | 2 counters (doubled by Scales/Ozolith/Kami); "Each creature you control with a counter on it has {T}: Add {G}" → hydras become ramp; returns Urza to Inspirit | free | +0.11 |
| Inspiring Statuary | Tanazir Quandrix | "double the number of +1/+1 counters on target creature" → Goose; flying trample; attack sets team base P/T | free | +0.03 |
| Devourer of Destiny | Primal Might | {X}{G} fight removal; Unbound Flourishing copies X instants/sorceries; 7-mana colorless Eldrazi off-plan | free | 0.00 |
| Cleanup Crew | Quandrix Command | instant bounce/counter-artifact-enchantment + two +1/+1 counters; 6-mana ETB-only answer out | free | 0.00 |

ALL ten together: 90.08 → 90.34 (lab), 90.30 (final score.ts). Rejected: Cleanup Crew → Verdurous Gearhulk (−1.96: removal 10 → 9 window penalty; the Crew's role had to stay interaction).

## Raids (41; model list had 43 — Urza + Uthros returned to Inspirit, Command Tower added)
| Donor | Cards |
|---|---|
| the-cabbage-merchant (22) | Academy Manufactor, Displaced Dinosaurs, Feasting Hobbit, Feasting Troll King, Garruk's Uprising, Giant Opportunity, Gilded Goose, Gingerbread Cabin, Mosswort Bridge, Night of the Sweets' Revenge, Peregrin Took, Return of the Wildspeaker, Second Harvest, Syr Ginger the Meal Ender, Teething Wurmlet, The Cabbage Merchant, The Earth King, Tireless Provisioner, Tough Cookie, Trail of Crumbs, Unlucky Cabbage Merchant, Wicked Wolf |
| inspirit-flagship-vessel (8) | Archway of Innovation, Cyberdrive Awakener, Cyclonic Rift, Inventors' Fair, Karn's Bastion, Rapid Hybridization, Swan Song, Universal Surveillance |
| bumi-unleashed (5) | Command Tower, Earth Rumble, Farseek, Nature's Lore, Rogue's Passage |
| tazri-beacon-of-unity (2) | Heroic Intervention, Sodden Verdure |
| tam-the-possibility (2) | Breeding Pool, Oko Thief of Crowns |
| gilanra-alena-partners (2) | Foe-Razer Regent, Planar Engineering |
Farseek / Nature's Lore also sit in Tazri; Earth King / Tireless Provisioner also in Bumi (one copy each owned twice — either donor works). Beledros untouched.

## Risks
- Building this dismantles The Cabbage Merchant (22 of its cards, incl. the commander) — it is the Food deck re-captained, not an additional deck.
- 41 raids across 6 sleeved decks: catalogue list, not simultaneously buildable with them.
- Model blind spot: DS flat on all 10 swaps; X-doubling (Unbound Flourishing) and counter doublers are not scored.
- 36 lands vs Karsten 38±2, offset by 12 ramp pieces and Food mana (Night of the Sweets' Revenge, Gilded Goose).
- 8 tapped lands (Growth Chamber, Path, Temple of Mystery, Thornwood, Tangled Islet, Oran-Rief, Lumbering Falls, conditional Lair/Cabin).
