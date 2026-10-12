# Bumi, Unleashed: one Gruul deck from the merged pool (Opus builder, 2026-10-07)

**Verdict.** `final.txt` (38 lands) beats both sleeved decks on every metric: keep-7 .717 (Gilanra .603, Bumi .595), Bumi by T5 .841 (.775), screw .014, spells T1–8 13.32 (10.47 / 11.56), goldfish kill median **T6** with P(≤T6) .694 (Gilanra .065, Bumi .535). Gate: all PASS except the known `plan` FAIL (earthbend deck) and an `arenaNames` WARN (Kyoshi, paper-irrelevant). 36-land variant: `final-36.txt`.

## §1 Plan
1. Ramp on **lands** (they are the threats, and Bumi untaps only lands) into Bumi T4–5; Bumi's "earthbend 4" makes a hasty 4/4 land.
2. Bumi connects ("untap all lands … additional combat phase. Only land creatures can attack") → every land creature attacks twice and every land taps twice.
3. Grow the land creatures (counter amplifiers, Halana/Innkeeper each combat, Germination every turn) and double them (Toph's double strike, TBR on Bumi = two extra combats).
- **T1–3:** dork/2-MV land ramp, Ruby, Hardened Scales, Toph BB / Ascension / Rockalanche (first land creature).
- **T4–6:** Toph GE or Halana → Bumi (haste via Smellerbee / Boots / Halana) → Germination, Nissa, Bumi E, Boulder, Ohran.
- **Close:** Bumi hit + Toph DS + Overrun / Thunderfoot / TBR / Vitu-Ghazi / Moraug. Backup: earthbended lands "return to the battlefield tapped" after a wipe; Rockalanche flashback, Ba Sing Se, Bitter Work exhaust and Nissa rebuild from lands with an empty hand.

## §2 Metrics (`sim.py`, 20,000 games each, seed 7; same engine and keep rule for all three)
| List | Lands | Keep 7 | 4th land T4 | Cmdr on curve | Screwed T5 | Flooded T8 | Spells T1–8 | Clock median (P ≤T6 / ≤T7 / ≤T8) |
|---|---|---|---|---|---|---|---|---|
| Gilanra + Alena (sleeved) | 36 | .603 | .826 | Gil T3 .907 · Alena T5 .776 | .042 | .135 | 10.47 | T8 (.065 / .414 / .817) |
| Bumi (sleeved; 3 illegal landscapes simmed as fetches) | 33 | .595 | .733 | Bumi T5 .775 | .060 | .003 | 11.56 | T6 (.535 / .845 / .935) |
| **`final.txt`** | **38** | **.717** | **.807** | **Bumi T5 .841** | **.014** | .009 | **13.32** | **T6 (.694 / .921 / .971)** |
| `final-36.txt` (−2 Forest, +Shaper, +Earth Rumble) | 36 | .676 | .773 | Bumi T5 .828 | .019 | .007 | 13.23 | T6 (.678 / .904 / .962) |

Definitions and model:
- Pod: draw on T1, first mulligan free, then London 6 (2–5 lands) / 5. Keep 7 = 3–5 lands, or 2 lands + an MV ≤ 2 ramp piece.
- 4th land T4 = a land played from hand on each of T1–T4. Screwed = lands + rocks + dorks < 4 at end of T5 (commanders excluded).
- Flooded = > 8 land cards seen by T8 and no sink seen. Sinks: Ba Sing Se, Crawling Barrens, Lair of the Hydra, Rogue's Passage, Savage Mansion, Omashu City, Cryptic Caves, Spinerock Knoll, Rockalanche, Bitter Work, Innkeeper's Talent, Germination, Nissa, Bulk Up, Faithless Looting, Planetarium, Hoard-Smelter Dragon, Garruk.
- Clock = first turn with ≥ 40 combat damage to one opponent, no blockers, cap T14. Attack model: non-sick or hasty creatures attack; earthbended / Nissa lands have haste ("becomes a 0/0 creature with haste"); a land creature tapped for mana does not attack; Bumi dealing damage untaps all lands and queues one land-only combat per damage step (two with TBR); Toph GE = land creatures double strike; Moraug = one extra all-creature combat per main-phase landfall, "untap all creatures"; Halana and Innkeeper trigger at the beginning of every combat; Quilled adds counters after each damage step. Non-combat damage (Terror, Drakuseth, Warstorm, Burning Sun's) is ignored, so the Gilanra clock is understated by those cards.
- Land count (10k games, same pre-final spell base, only basics/Samut varied; `var/l3*.out`): 35 → keep .647, spells 13.05, P(≤T6) .652; 36 → .666 / 13.26 / .672; 37 → .677 / 13.15 / .662; **38 → .706 / 13.22 / .675**; 39 → .721 / 13.08 / .675. 38 is the knee: keep and screw keep improving to 39, spells and clock stop. Karsten regression: 31.42 + 3.13·3.18 − 0.28·10 cheap = **38.6**. Recommend **38**; the operator decides. Lands are threats here (earthbend targets, double mana under Bumi), so the flood cost is near zero (.009).

## §3 Swaps vs `decks/paper/decks/bumi-unleashed.txt` (31 nonland + 6 lands out; DB text)
| # | Out | In | Role | Why |
|---|---|---|---|---|
| 1–3 | Sheltering / Tranquil / Twisted Landscape | Sheltered Thicket, Fabled Passage, Evolving Wilds | land | illegal ("Cycling {R}{G}{W}" / GUW / BGR). Thicket: "Mountain Forest", fetchable by Lore/Three Visits/Farseek/Claim; fetches = 2 landfalls (Mightform, Moraug, Ascension) |
| 4 | Lotus Field | Lair of the Hydra | land | "sacrifice two lands" kills two earthbend targets → G source with "{X}{G}: … becomes an X/X … creature" sink |
| 5 | Strip Mine | Yavimaya, Cradle of Growth | land | colourless → "Each land is a Forest": every land taps G, Rockalanche X = all lands, Nissa doubles every land |
| 6 | Cryptic Caves | Forest | land | colourless one-shot → green source |
| 7 | Talisman of Impulse | Arcane Signet | rock | same mana without "deals 1 damage to you" (Talisman stays in the Gilanra box) |
| 8 | Commander's Sphere | Llanowar Elves | ramp | 3-MV rock → T1 "{T}: Add {G}" (Bumi T4) |
| 9 | Tablet of Discovery | Three Visits | ramp | 3-MV R rock → 2-MV untapped Forest; a land is an earthbend target and untaps under Bumi |
| 10 | Frog Butler | Ruby, Daring Tracker | ramp | Ruby has "Haste" (taps the turn it lands) |
| 11 | Spider Manifestation | Ilysian Caryatid | ramp | "If you control a creature with power 4 or greater, add two mana" — every earthbended land is 4+; sim +.017 Bumi T5 |
| 12 | Circuitous Route | Skyshroud Claim | ramp | same 4 MV, but "two Forest cards … onto the battlefield" untapped |
| 13 | Roiling Regrowth | Cultivate | ramp | "Sacrifice a land" (net +1) → net +2 lands (one to hand) |
| 14 | Tireless Provisioner | Kami of Whispered Hopes | ramp/amp | treasures don't untap → "that many plus one +1/+1 counters" on every permanent + "{T}: Add X mana" (X = its power) |
| 15 | Seismic Tutelage | Hardened Scales | amp | 4-MV aura on one creature → 1 MV, +1 on every counter event |
| 16 | Crystalline Armor | Innkeeper's Talent | amp | aura on one creature → "At the beginning of combat … +1/+1 counter" every combat (Bumi combats too); level 3 "twice that many" |
| 17 | Earth Kingdom General | Nissa, Who Shakes the World | engine | one earthbend 2 on a 2/2 → every turn "+1: three +1/+1 counters … untap it … vigilance and haste" + "Forest … add an additional {G}" |
| 18 | Earth Rumble | The Legend of Kyoshi | engine/draw | "Draw cards equal to the greatest power", "Earthbend X, where X is the number of cards in your hand", then lands get "trample and hexproof" |
| 19 | Amarant Coral | Thunderfoot Baloth | finisher | Coral can't attack in Bumi's land-only combat → "other creatures you control get +2/+2 and have trample" while Bumi is out |
| 20 | Owlbear Cub | Moraug, Fury of Akoum | finisher | needs a player with 8 lands → "Landfall … additional combat phase … untap all creatures" |
| 21 | Braulios of Pheres Band | Overrun | finisher | a non-land attacker → "+3/+3 and gain trample" on every land creature, both combats |
| 22 | Yedora, Grave Gardener | Master's Guidance | draw | "At the beginning of your end step, if you control a creature with power 4 or greater, draw a card" + counters when 2 legends attack |
| 23 | Part in Friendship | Shamanic Revelation | draw | "Draw a card for each creature you control" — land creatures count |
| 24 | Heartbeat of Spring | Domri, Anarch of Bolas | ramp/pump | symmetric mana → "+1: Add {R} or {G}", "Creatures you control get +1/+0" (×2 with double strike), "−2: … fights" |
| 25 | Haste Magic | Lavaspur Boots | haste | one-shot → "haste and ward {1}", "Equip {1}" for Bumi every recast |
| 26 | Bulk Up | Guardian Augmenter | protection | "Commanders you control have hexproof", +2/+2, flash |
| 27 | Fists of Flame | Silkguard | protection | "modified creatures you control gain hexproof" = every earthbended land |
| 28 | Spry and Mighty | Tyvar's Stand | protection | Bumi "hexproof and indestructible" at instant speed |
| 29 | Savage Smash | Clear Shot | removal | sorcery fight → instant, one-sided "deals damage equal to its power" |
| 30 | Bushwhack | Rocky Rebuke | removal | sorcery fight/tutor → 2-MV instant one-sided |
| 31 | Fling | Beast Within | removal | sac a creature → "Destroy target permanent" |
| 32 | Tectonic Split | Cankerbloom | removal | "sacrifice half the lands you control" (= half the army) → 2-MV artifact/enchantment answer |
| 33–37 | Summon: G.F. Ifrit, Faithless Looting, Thrill of Possibility, Seize the Spoils, Lumbering Worldwagon | 3 Forest, 2 Mountain | lands 33 → 38 | filtering/one-shot ramp → the 34th–38th land (§2 land table) |

Source of the 74 nonbasic cards in `final.txt` (pool tags): 41 [BUMI] kept from the box; 7 [GIL] (Sol Ring, Arcane Signet, Llanowar Elves, Ruby, Thunderfoot Baloth, Shamanic Revelation, Command Tower); 26 [FREE]. Taking the 7 [GIL] cards means the Gilanra deck is dismantled (the brief's one-deck goal).
**Pool flag error:** `pool.md` marks Earth Rumble `[NOT COMMANDER-LEGAL]` from a `front_card` DB row; the real card ({3}{G} Sorcery, "Earthbend 2. When you do, … fights …") is legal. It is a near-tie (§8), not an illegal card.

## §4 Closers (what each does on the win turn)
| Card | On the kill turn |
|---|---|
| Bumi, Unleashed | hits → "untap all lands" (second main-phase mana) + land-only combat: each land creature deals damage twice |
| Toph, Greatest Earthbender | "Land creatures you control have double strike" → ×2 in every combat, ×4 per turn with Bumi |
| Temur Battle Rage | Bumi with double strike deals damage in two steps → two triggers → two extra combats, two land untaps |
| Overrun / Thunderfoot Baloth / Domri | +3/+3 trample / +2/+2 trample / +1/+0 on every land creature in both combats (doubled by Toph) |
| Germination Practicum | +2 counters on each creature, again free "at the beginning of each of your first main phases" |
| Awakening of Vitu-Ghazi | instant, cast with the lands Bumi untapped: "nine +1/+1 counters … haste" joins the land-only combat |
| Moraug | main-phase landfall (fetch = 2) → extra combats that "untap all creatures", +1/+0 per attack; Bumi re-triggers in each |
| Quilled Greatwurm / Mightform | counters equal to damage after each strike / landfall doubles a land creature's power |
Access: 10 closers + the commander; P(kill ≤ T7) .921 in the goldfish. Protection on the win turn: Tyvar's Stand, Snakeskin Veil, Veil of Summer, Silkguard, Guardian Augmenter, Boots' ward. ⚠️ No non-combat axis; the backup is the wipe-proof land board (lands return, re-earthbend from Ba Sing Se / Rockalanche FB / Bitter Work / Nissa).

## §5 Colours and lands (Karsten 99-card table scaled to 38 lands; weights: rock ¾, dork ½, 2-MV land ramp ¾, Cultivate-type ½)
- Lands: 16 Forest, 10 Mountain, Command Tower, Sheltered Thicket, Savage Mansion, Omashu City, Fabled Passage, Evolving Wilds (R+G), Ba Sing Se, Lair of the Hydra, Yavimaya (G), Rumble Arena, Crawling Barrens, Rogue's Passage (C).
- Red: 16 lands + 6.25 nonland = **22.3** vs Moraug {4}{R}{R} need 20.4 ✅; Bumi / Toph GE / Smellerbee single R ✅ (need 13.0–13.9); TBR / Ruby at MV 2: 17 vs 16.7 ✅.
- Green: 25 lands + 8.25 = **33.3** vs Overrun {2}{G}{G}{G} need 27.8 ✅; all {G}{G} 5–6 drops need ≤ 21.3 ✅. Yavimaya makes every land tap G.
- Tapland weight ≈ 5.6 (Thicket, Mansion, Omashu, Wilds, Passage early, Lair after 2 lands) vs ≈ 15 budget ✅.

## §6 Stop proofs (weakest kept per role vs every owned candidate in `pool.md`)
- **Cheap ramp** (weakest kept: Shared Roots / Explore): Rampant Growth and Studious First-Year = same land (tie, incumbent stays); Talisman = Signet minus damage; Frog Butler, Spider Manifestation, Paradise Druid, Nightshade Dryad, Poison Dart Frog, Noxious Newt, Devoted Druid, Animal Attendant, Gene Pollinator = sick 2-MV dorks below Caryatid/Ruby and add no land; Wayfarer's Bauble, Fertile Ground, Abundant Growth, Gift of Paradise, Mana Bloom, Prophetic Prism, Giant's Boulder, Elvish Spirit Guide, Lotus Ring = slower or no land; Dance of the Tumbleweeds (3 MV for one land), Sylvan Scrying (to hand), Malevolent Rumble, Open the Way (X ≤ 4, 6 mana) ❌.
- **3–4 MV ramp** (Cultivate): Tireless Provisioner (sim −.016 Bumi T5), Simulacrum Shaper (var C: T6 .684 vs .696), Dryad of the Ilysian Grove (var: −Dryad +Cultivate improved T6 .662 → .683), Circuitous Route / Map the Frontier (tapped), Roiling Regrowth / Cycle of Renewal (net +1), Lumbering Worldwagon (crew 4), Sword of the Animist / Bitterthorn (need an attack), Selvala (X only with a 4+ creature, draws opponents cards), Jiang Yanggu, Rishkar, Loot Exuberant Explorer, District Guide, Elvish Rejuvenator, Burnished Hart, Spider-Man, Harvest Season, Hour of Promise, Nissa's Renewal, Through the Forest Gate, Elemental Teachings, Omenpath Journey, Kamahl's Druidic Vow, Hexhaven Invigorator, Mana Reflection, Heartbeat, Tectonic Split, Lotus Field, all 3–5 MV rocks (rocks don't untap under Bumi) ❌.
- **Earthbend engine** (Cracked Earth Technique): Earth Kingdom General (eb 2 on a 2/2), Earth Rumble (eb 2 + fight, §8), Avatar Kyoshi, Earthbender (8 MV), Sage of the Maze (0 Gates), Dance of the Tumbleweeds (token, not a land) ❌.
- **Counter amplifiers** (Tale of Katara and Toph): Ozolith (+1 per event; Tale adds a counter to every tapped creature each turn), Benevolent Hydra (others only, XGG), Seismic Tutelage, Fractal Harness, Ornery Tumblewagg, Case of the Trampled Garden (one creature each), Ferrafor (7 MV), Forgotten Ancient, Wildwood Scourge, Bloodspore Thrinax (enter-only), Moxite Refinery, Nesting Grounds ❌; Master Chef is a Background (Bumi can't choose one).
- **Finishers** (Mightform Harmonizer): Edgar (§8 near-tie), Wilderland Scrounger, Pyrewood Gearhulk (once), Avatar of Slaughter (symmetric, Toph already gives lands DS), Blossoming Bogbeast (can't attack in land-only combats), You Meet in a Tavern, Primeval Bounty, Hydra Broodmaster, Bulk Up, Crystalline Armor, Spry and Mighty, Rampaging Baloths, Avenger of Zendikar (plants aren't lands), Ulvenwald Hydra, Lumra, Molimo, Sandman (non-land attackers) ❌.
- **Haste** (Lavaspur Boots): Samut (var: −Samut +Forest raised keep .677 → .706; Smellerbee, Boots, Halana cover Bumi), Haste Magic, Wild Ride, Ferocification, Cyclops (6 MV), Surrak (formidable), Hellspur Posse Boss (outlaws only) ❌.
- **Trample** (Drix Fatemaker): Nev (§8), Oviya (1/2 for 4), Gruul Charm, Lion Umbra, Demonic Ruckus, Sandstorm Verge ❌.
- **Draw** (Hunter's Insight): Harmonize (3 for 4 vs damage-sized draw), Garruk's Packleader / Soul of the Harvest / Outcaster Trailblazer (earthbend doesn't make creatures enter), Primordial Sage, Garruk, Vivien Reid, Chandra Fire Artisan, Trash the Town, Seer's Sundial, Mazemind Tome, Hedron Archive, Tome of the Guildpact, Kozilek, Naktamun Lorespinner, Cathartic Reunion, Burning Curiosity, Embrace the Unknown, Seize/Thrill/Looting ❌.
- **Removal** (Longstalk Brawl): Earth Rumble (§8), Knockout Maneuver (sorcery, 3 MV), Primal Might, Cathartic Pyre, Explosive Derailment, Violent Echoes, Essence Burn, Skullcrack, No Admittance, Skewer, Acidic Slime, Cleanup Crew, Wickerbough Elder, Myconid Spore Tender, Kinetic Ooze, Steelbane Hydra, Terastodon, Tyrant of Discord, Steel Hellkite, Sarkhan, Chain Reaction / Echoverse Fulcrum / Oblivion Stone / Blast Zone (wipes our creatures), Warg Tactics, Konstrari Charm, Volatile Fault ❌.
- **Protection** (Veil of Summer): Warg Tactics (§8), Vivien Champion of the Wilds, Tangle, Fog, Dawnglade Regent, Emissary of Grudges ❌.
- **Lands** (Omashu City): Spinerock Knoll (mono-R tapped), Gruul Turf, Bristling Backwoods, Konstrari Annex, Mirage Mesa, Tarnation Vista (tapped), Terramorphic / Riveteers Overlook (= Wilds, near-tie with a basic), Exotic Orchard, Path of Ancestry, Opal Palace, Study Hall, Hidden Grotto, Conduit Pylons, Planar Nexus, Talon Gates, Horizon of Progress, Arcane Lighthouse, Volatile Fault, Nesting Grounds, Reliquary Tower, Diamond City, Vesuva, Temple of the False God, Urza lands, Locus lands, Deserts, Sapseep Forest, Oran-Rief, Hidden Nursery, Witch's Clinic, Skycoach Waypoint, Basilisk Gate, Muraganda Raceway, Radiant Fountain, Maestros Theater, Tangled Florahedron (colourless or tapped vs an untapped dual) ❌. Dark Depths + Thespian's Stage: §8.

## §7 Gate
- `deck-gate.ts … --format commander --owner 1 --source paper` on `final.txt`: size, singleton, legality, rules, identity, ownership, lands (38, "Karsten wants 38 ±2"), curve (avg MV 3.18), wincons (12), locks: **PASS**. `arenaNames` WARN (The Legend of Kyoshi, front face only; paper). `plan` FAIL = known false negative for earthbend decks. `final-36.txt`: same.
- `identity.py final.txt`: 100 cards; outside R/G: none.
- Synergy (`synergy.py`, rules in its docstring): `final.txt` min 0 / **median 26** (Bumi links 45) vs sleeved Bumi min 0 / median 18. The 0-link cards are Sol Ring, Arcane Signet, Beast Within, Decimate, Veil of Summer (mana / interaction, judged on efficiency); next lowest Yavimaya 2, Farseek 4.

## §8 Near-ties (incumbent kept unless the challenger clearly wins)
- Earth Rumble (eb 2 + fight, 4 MV, Bumi box) vs Longstalk Brawl (1-MV fight): Rumble adds a land creature; Brawl is 3 mana cheaper. In `final-36.txt`.
- Edgar, Moonlit Sovereign ("{4}{G}: Put a +1/+1 counter on each creature you control with a +1/+1 counter") vs Mightform: Edgar is the better sink under Bumi's double mana, Mightform the bigger single turn.
- Nev, the Practical Dean (same trample static, 3 MV) vs Drix Fatemaker (4 MV, ETB counter): Drix incumbent.
- Warg Tactics vs Veil of Summer; Simulacrum Shaper vs Cultivate (in `final-36.txt`); Rampant Growth / Studious First-Year vs Shared Roots; Talisman vs Signet.
- Dark Depths + Thespian's Stage (20/20 flying indestructible for {2}): a second plan, and Depths taps for nothing; not added.
- Samut, Tyrant Smasher: haste for every creature (Moraug, Boulder, Earth King swing at once) — first card back in if the operator cuts to 37 lands.

## §9 Other legends as commander
- **Toph, Greatest Earthbender** — the one real rival. As commander (Bumi in the 99, same 37-land base, 10k games, `var/toph-cmdr2.out` vs `var/final10k.out`): P(≤T6) .686 vs .662, mean 6.28 vs 6.34 ("double strike" needs no connect), but spells T1–8 fall 13.15 → 10.05, because Bumi's "untap all lands" is the deck's mana engine. Keep Bumi: +3 spells (protection, removal) for −.02 goldfish speed; Toph is the operator's alternative if blockers keep stopping Bumi.
- Moraug: the same extra-combat idea for all creatures, but 6 MV, {R}{R}, and only on main-phase landfall; better in the 99.
- Amarant Coral: "deals that much damage to each other opponent" triples table damage, but "attacks each combat if able" and no engine. No.
- Halana and Alena, The Earth King, Selvala, Surrak, Etali, Ruby, Roxanne: no reason. Ohran Frostfang is not legendary ("Snow Creature"), so it can't command.
