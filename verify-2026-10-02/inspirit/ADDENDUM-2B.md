# Round 2b: the operator's in-hand cards (the round-2 report covers none of them)

All of these are **owned, registered in the DB, and free for Inspirit**. Each one is either open, a newly registered card, or a confirmed second copy, so no Tam/Tazri trade rules apply. The operator listed them as cards they physically hold for this deck.

**Task.** Start from the converged `inspirit-proposed-2.txt`. For every card below:
1. Quote its DB text.
2. Place it in its role.
3. Rank it against the weakest kept card of that role.
4. Swap wherever it wins.

Then re-converge: repeat until a full pass finds no improving swap.

**Write:**
- `inspirit-proposed-2.txt`: overwrite it.
- `build-report-2.md`:
  - Update §3 (swaps vs sleeved), the health table and the stop proof.
  - Add §8, "Operator in-hand verdicts": `Card | role | IN/OUT | one-line reason (quote)`, with one row for EVERY card below. No card may be skipped.
- Gate again.

Batch the DB queries, about 20 names per `name in (...)` call. Budget ≤ 50 tool calls.

## Cards
**Removal / interaction**
- Abrade
- Everything Comes to Dust: exiles ALL artifacts and enchantments too (MTGNexus accepted reading), so it exiles Inspirit
- Spell Pierce
- Requisition Raid
- Shatter the Sky
- No Admittance
- Kindred Judgment
- Consign to Memory
- Unsummon
- Chaos Warp
- Flesh Duplicate

**Finishers / payoffs**
- **Craterclaw Colossus**: haste; on ETB, your creatures get +X/+0 and trample, where X = the number of artifacts you control. A second artifact Craterhoof next to Depthshaker.
- **Super State**: Aura, base 9/9 with flying, first strike, trample, haste. Copies combat damage to each other opponent; only the combat damage counts as commander damage.
- Lasting Tarfire: 2 to each opponent at each end step if you put a counter on a creature that turn.
- Etali, Primal Storm
- Sephiroth, Fallen Hero
- Thorin, Mountain-king
- Winter, Team Player
- Spider-Man 2099
- Warrior's Blades
- Charge the Sanctum

**Artifacts / equipment** (Depthshaker bodies, counters)
- Zookeeper Mechan: ownership CONFIRMED
- Wrecking Ball Arm
- Treasure Keeper
- Sting, Bilbo's Sword
- Improvised Arsenal
- Interdimensional Web Watch
- Tablet of Discovery
- Basilisk Collar
- Resonating Lute
- Eye of Jace
- Murmuring Volume
- Traxos, Scourge Eternal
- Traxos, Academy Guardian (blue echo). Decide whether the three-Traxos package is synergy or redundancy.

**Creatures / value**
- Sphinx of False Conclusions
- Denzilore Fatehold
- Guiding Hydra
- Proctor of Potential
- Flickering Hound
- Variable Chaser // Arc of Fortune
- Geist of Saint Thalia (second copy)

**Draw / selection**
- Frantic Search
- Seize the Spoils
- Winternight Stories
- Ember Island Production

**Planeswalkers.** Score them on proliferate on loyalty, and on whether they help the Depthshaker/Craterclaw turn.
- Teyo, the Shieldmage
- Mu Yanling, Sky Dancer
- Kasmina, Enigmatic Mentor
- Chandra, Fire Artisan
- Chandra, Spark Hunter
- Dovin, Hand of Control
- Nahiri, Storm of Stone
- Daretti, Scrap Savant
- Saheeli, Jewel of Avishkar
- Jace, Reality Sculptor (second copy)

**Ways / Jace tokens.** Is the Jace-token sub-plan dense enough now? Count it.
- Way of the Cryomancer
- Way of the Pyromancer (second copy)
- Way of the Warlord (second copy)

**Lands**
- Inspiring Vantage (second copy)

**Open question from round 2:** the Fellwar Stone you picked. Check `decks/paper/collection.txt`: if only 1 copy is owned and Tazri sleeves it, it is NOT available. Treat it as unavailable unless the count is ≥ 2.

## Batch 2c (added after round 2b started — same rules, one §8 row each)
- **Newly registered:** Airbender Ascension, Unlicensed Hearse, Pyre Rhymer // Molten Tide, Yoshimaru, Beloved Companion, Pia, Determined Rebuilder, Twinned Vision, Generous Revival, Team Avatar, Balefire Liege, Flare of Fortitude, Hour of Reckoning, Lorehold Charm, Inspired Skypainter // Maestro's Gift, Rapturous Moment, Naktamun Lorespinner // Wheel of Fortune, Embrace the Unknown.
- **Second copies (now x2, one free for Inspirit):** Blade Historian, Way of the Mentor, Generous Gift.
- **Already registered, open:** Boros Charm (round 1 refuter: "IN for Resourceful Defense if found" — it is now found), Lavaspur Boots, Fatehold Charm, Guiding Hydra, Teyo, Lightshield Expert, Murmuring Volume.
- Lenses: Boros Charm / Flare of Fortitude / Teyo as protection for the Depthshaker/Craterclaw turn; Hour of Reckoning and Balefire Liege vs the plan; Unlicensed Hearse, Lavaspur Boots, Pia as cheap artifact/artifact-synergy pieces.

## Batch 2d — the operator's Urza list (all now registered; free for Inspirit; one §8 row each)
- **Win-turn / Depthshaker-family:** Cyberdrive Awakener, Karn, the Great Creator, Panharmonicon (doubles Depthshaker/Craterclaw ETB), Sai, Master Thopterist, Efficient Construction, Chrome Host Seedshark, Urza, Lord High Artificer, Dawnsire, Sunstar Dreadnought, Sami, Wildcat Captain.
- **Artifacts / ramp / tutors:** Sword of the Animist, Etherium Sculptor, Solemn Simulacrum (3rd copy), Sapphire Medallion, Sky Diamond, Insight Engine, Inspiring Statuary, Repurposing Bay, Bident of Thassa, Personal Tutor, Scour for Scrap.
- **Interaction:** Cyclonic Rift, Counterspell (2nd copy), Flare of Denial, Negate (already in your list), Sink into Stupor // Soporific Springs, Ghostly Flicker, Alms Collector, The Seriema.
- **Draw:** Stock Up, Fact or Fiction, Coastal Piracy.
- **Lands:** Inventors' Fair, Archway of Innovation, Uthros, Titanic Godcore (check its DB row: name, type, back face).
- Ornithopter of Paradise is already in your list.
