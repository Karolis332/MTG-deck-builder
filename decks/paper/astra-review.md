Assumption: normal multiplayer Commander, improving the owner's existing value, Necron, and D&D-party plans. Every swap below is relative to the original paper list. Existing shared nonbasic copies and shared basics are retained; additional basic Swamps are unlimited.

Numbers are **inclusion % / natural-log lift** from the [supplied corpus](../../data/corpus-stats.json), for the IN card unless stated otherwise. Positive lift indicates commander affinity, not win rate; n/a means no supplied entry. Oracle text and mana values came from the local SQLite database opened read-only.

Comparison uses the original `*-model.txt` lists and HTML rationale read at the start. Those proposal files disappeared during this review and `*-power.txt` files appeared; the replacement proposals were left untouched.

Mana-value averages cover nonland front faces in the 99, with X = 0 and before discounts. MDFCs provide alternative land plays; their spell and land faces cannot both be used from the same card.

**Meren of Clan Nel Toth** gains cheaper sacrifice engines and recurring removal.

| OUT | IN | Argument (IN inclusion / lift) |
| --- | --- | --- |
| Baba Lysaga, Night Witch | Haywire Mite | Reusable exile for noncreature artifacts/enchantments replaces a sacrifice engine needing three card types (50.9% / +0.89). |
| Rankle, Master of Pranks | Carrion Feeder | A one-mana, free sacrifice outlet works immediately; Rankle needs combat damage (45.7% / +1.89). |
| Return of the Wildspeaker | Accursed Marauder | A two-mana, recurrable nontoken edict replaces conditional five-mana draw (52.3% / +2.15). |
| Infernal Grasp | Ravenous Chupacabra | Creature removal becomes a Meren target; retain the other instant interaction (36.9% / +2.52). |
| The Gitrog, Ravenous Ride | Grist, Voracious Larva | Cheap graveyard-fed milling/token production after transforming replaces saddle-and-connect setup (6.2% / +0.63). |
| Hornet Queen | Junji, the Midnight Sky | A death-triggered reanimation target gives immediate sacrifice value at five mana (25.3% / +2.44). |
| Mycoloth | Pawn of Ulamog | Nontoken deaths produce sacrificeable mana tokens without waiting through an upkeep after devour (10.4% / +0.64). |
| Moldervine Reclamation | Midnight Reaper | Bring the death-draw engine down to three mana and make it recurrable; it draws only for nontokens (24.6% / +2.48). |
| Jenova, Ancient Calamity | Woe Strider | Free sacrifice plus a Goat arrives immediately; Jenova needs a combat step and a subsequent death (18.4% / +0.88). |
| Creakwood Liege | Insidious Roots | Graveyard exits create Plants, and all creature tokens can make mana after summoning sickness (17.1% / +0.73). |
| Witherbloom Campus | Blooming Marsh | Adds an untapped BG source for the first three land drops (19.1% / +0.31). |
| Viridescent Bog | Swamp | An independent black source replaces a filter land that needs another mana source. |
| Grim Backwoods | Swamp | A basic supports early black spells; High Market and the creature outlets retain sacrifice access. |

Mana and curve: **32 lands + 3 land-backed MDFCs = 35 land options**, with eight Forests and nine Swamps. The Forests support early elves and Grist; two awkward lands become independent black sources, and Blooming Marsh improves early access to both colors. Several tapped lands remain. Average spell MV falls **3.06 → 2.78**; MV 5+ spells fall **13 → 9**.

Disagreements with the original model:

- Keep Vraan and Night's Whisper: cheap life-drain and unconditional draw help the engine start. Ravenous Chupacabra replaces Infernal Grasp, preserving Vraan; Mosswood Dreadknight remains inexpensive, resilient card access.
- Omit Mikaeus, Butcher of Malakir, and Jarad. The first two add expensive finishers, and Gorma/Mazirek's +1/+1 counters prevent undying on affected creatures; Jarad adds a demanding BBGG cost and paid sacrifices.
- Keep Cauldron of Souls for a persist reset. Woe Strider replaces Jenova instead. Reanimate and Lightning Greaves go exclusively to Imotekh; Meren already has commander recursion, Victimize, Grave Researcher, and now Junji.
- Replace weak mana-producing lands before the model's four Forest-to-Swamp swaps. This preserves early green without abandoning additional black access.

**Synergy calls the corpus does not favor:** retain Mirkwood Bats (**1.9% / -2.29**) and Chief Warg's Company (**0.1% / -2.90**). Bats rewards both creating and sacrificing tokens; Company makes fodder even when it cannot attack. Pawn and Roots strengthen that plan. Cauldron (**0.9% / +0.41**) and Vraan (**1.1% / +0.87**) have low inclusion but positive lift; their retention is a synergy judgment, not strong popularity evidence.

**Imotekh the Stormlord** gains reliable land drops before other upgrades.

| OUT | IN | Argument (IN inclusion / lift) |
| --- | --- | --- |
| Planetarium of Wan Shi Tong | Swamp | First fix land drops; six-mana setup is a luxury despite the Zealot/surveil interaction. |
| Raise Dead | Swamp | Convert narrow recursion into the second extra land; retain Emergency Weld and Corpse Churn. |
| Zombify | Swamp | Third extra land; Reanimate supplies a much cheaper battlefield return. |
| Gray Merchant of Asphodel | Swamp | Fourth extra land; a five-mana nonartifact devotion payoff is expendable. |
| Diabolic Tutor | Swamp | Fifth extra land; four mana spent tutoring competes with deploying the commander. |
| Temple of the False God | Swamp | Remove a land that produces nothing before the fifth land is in play. |
| Muraganda Raceway | Swamp | Reliable black supports rituals and BB/BBB spells before speed reaches four. |
| Traxos, Scourge of Kroog | Plasmancer | Replace a standalone attacker with a Necron that finds the next basic Swamp for hand (34.8% / +3.12). |
| Altar of Bhaal | Reanimate | Use a one-mana battlefield return; save board creatures instead of exiling them to Altar (52.8% / +0.26). |
| Power Word Kill | Feed the Swarm | Gain a maindeck enchantment answer at the same mana value (32.8% / -0.45). |
| Black Sun's Twilight | Bitter Triumph | Cheap instant removal can discard an artifact to set up recursion; avoid the large X needed for Twilight's return (6.1% / -0.53). |
| Shard of the Nightbringer | Lychguard | Trade an eight-mana life-halving threat for a Necron that can recover legendary creatures (30.6% / +3.22). |
| Commander's Sphere | Thought Vessel | Trim a three-mana rock while preserving the two-mana artifact creature ramp (49.2% / +0.80). |
| Palladium Myr | Lightning Greaves | Protect Imotekh and give tap-ability Necrons haste; five extra lands allow trimming colorless Myr ramp (16.0% / -0.69). |

Mana and curve: **31 → 36 lands**, comprising **34 Swamps, Realm of Koh, and Conduit Pylons**. Five spell slots add lands; two existing lands become reliable black sources. Average spell MV falls **3.57 → 3.43**, with **10 MV 6+ spells** still warranting the extra land over the model's 35. Plasmancer finds a Swamp for hand, helping subsequent land drops. Necron/changeling creatures increase **18 → 20**, including the commander.

Disagreements with the original model:

- Culling the Weak stays by instruction. Keep Umbral Collar Zealot as a free sacrifice/surveil outlet and Barkform Harvester as a changeling Necron whose two-mana activation can move an artifact out of the graveyard to trigger Imotekh.
- Keep Syr Konrad: creature deaths, milling, and creature cards leaving the graveyard all feed him. Preserve Corpse Churn's self-mill/return and Zealot's engine role instead of making their slots generic removal or Phyrexian Arena.
- Thought Vessel replaces Commander's Sphere; Ornithopter of Paradise remains cheap artifact-creature ramp. Skip Sautekh Immortal's mainly combat role and Triarch Stalker's menace redundancy with Skorpekh Lord, despite their positive tribal lift.
- The model assigns Reanimate to both decks. Even with two copies in the pool, the brief permits a pool addition in only one list. Imotekh gets the allocation because reanimating an artifact creature also makes Necrons.

**Choices unsupported by positive commander lift:** Culling (**8.6% / -0.81**, mandatory), Zealot (**5.8% / -0.14**), Konrad (**16.5% / -0.16**), Greaves (**16.0% / -0.69**), Feed the Swarm (**32.8% / -0.45**), and Bitter Triumph (**6.1% / -0.53**). These are preference, engine, protection, or interaction decisions. Harvester's **0.7% / +1.40** supports affinity but provides little popularity evidence.

**Tazri, Beacon of Unity** gains an Acererak dungeon package while preserving all existing ramp.

| OUT | IN | Argument (IN inclusion / lift) |
| --- | --- | --- |
| Astarion, the Decadent | Acererak the Archlich | Establish the repeatable venture mana sink; six-mana life manipulation is secondary (20.5% / +4.37). |
| Butcher of Malakir | Sefris of the Hidden Ways | Turn creature deaths and dungeon completion into an engine at three mana (37.3% / +4.91). |
| Dire Fleet Ravager | White Plume Adventurer | An initiative-taking Cleric supports the party and untaps attackers or mana creatures (41.7% / +4.57). |
| Gonti, Lord of Luxury | Rilsa Rael, Kingpin | Keep a Rogue slot while gaining initiative and a dungeon-completion combat payoff (35.6% / +4.73). |
| Jazal Goldmane | The Destined Warrior | Party cost reduction makes Acererak cost 1B and supports the existing creature-heavy plan (31.9% / +4.65). |
| Mirri, Weatherlight Duelist | Midnight Pathlighter | Broad evasion enables venture on combat damage to each player (41.9% / +4.91). |
| Emeritus of Ideation | Imoen, Mystic Trickster | A three-mana Rogue/Wizard supplies initiative-based draw and flexible party membership (32.9% / +4.99). |
| Emeritus of Truce | Nadaar, Selfless Paladin | Add venture on entry and attack; accept that Knight supplies no party role (27.6% / +4.50). |
| Grand Abolisher | Hama Pashar, Ruin Seeker | Replace a demanding WW protection slot with a Wizard that doubles room abilities (38.8% / +4.91). |
| Garruk's Uprising | You Find a Cursed Idol | Add artifact/enchantment removal or Treasure plus venture; few creatures naturally satisfy Uprising (26.7% / +4.65). |
| Tam, Mindful First-Year | Coveted Prize | Tutor the missing engine piece, with a potential party discount and free spell (67.7% / +4.40). |
| Nullpriest of Oblivion | Undermountain Adventurer | Add an initiative Warrior and repeatable mana; existing ramp is preserved (36.7% / +4.66). |
| Syncopate | Bar the Gate | Replace a scaling counter with a hard creature/planeswalker counter that also ventures (22.5% / +4.83). |
| Reconnaissance Mission | Path to Exile | Add cheap creature exile; Imoen and dungeon rewards supply card flow (23.4% / -0.19). |
| Vault of the Archangel | Concealed Courtyard | Gain early white/black instead of another colorless utility activation (0.4% / -0.47). |
| Riveteers Overlook | Lonely Arroyo | Shift tapped fixing from BRG toward the dungeon package's white/blue (n/a). |
| Mountain | Spirebluff Canal | Add early blue while retaining a red source; basic-land searches lose their red target (n/a). |
| Stump Stomp | Glasspool Mimic | Keep the land option, add blue, and gain a Rogue copy of a venture/initiative creature (12.5% / +2.79). |

Mana and curve: **35 lands + Glasspool Mimic = 36 land options**; basics are **3 Forest, 3 Swamp, 2 Plains, 1 Island**. Keep Karplusan Forest and every typed shock/triome, including Ziatora's Proving Ground: the existing fetches and green land-search spells depend on those targets. The edits increase white/blue access while preserving early green and black. Red remains on typed lands and mana support; basic searches cannot fetch it. Fastlands enter untapped only with two or fewer other lands; Lonely Arroyo and Glasspool Shore enter tapped. Average spell MV is **3.09 → 3.03**, before party discounts.

Disagreements with the original model:

- Preserve every existing ramp/mana-support piece, including Firdoch Core, Mutable Explorer, Treasure Nabber, Durnan, Bre's free-cast ability, Stonework Packbeast, Vizier, and Myriad Landscape. Undermountain Adventurer replaces Nullpriest. Explore the Underdark, Manor Gate, and Plaza of Harmony remain unused.
- Keep Thwart the Grave (**57.0% / +5.12**) and Solemn Doomguide (**26.8% / +5.33**) alongside Sefris for recovery. Unearth ultimately exiles its creature; use it for temporary value rather than assuming permanent recursion.
- Keep Krydle, Mindblade Render, and Karlach. Cheap party members and extra combats support Midnight Pathlighter, Nadaar, and Sword of the Animist. Skip Mardu Siegebreaker, Najeela, Outlaws' Merriment, and Zagras to make space for the dungeon engine.
- Keep Boros Charm's board protection and Negate's cheap interaction; Path replaces Reconnaissance Mission. The Destined Thief overlaps existing combat draw. Existing ramp makes adding Spelunking less urgent than the selected dungeon support.
- The model's land arithmetic overlooks timing and restrictions: Mirage Mesa fixes one chosen color permanently, fastlands are conditional, and Base Camp cannot fund general spells such as Bar the Gate. Preserve typed fetch targets instead of treating every listed color as equally accessible.

Acererak is a repeatable mana sink: leave Tomb of Annihilation uncompleted, pay **2B per cast**, and usually work through Lost Mine of Phandelver. The return-to-hand/venture ability continues while Tomb remains uncompleted. [Acererak release notes](https://magic.wizards.com/en/news/feature/adventures-forgotten-realms-release-notes-2021-07-09). The Destined Warrior reduces each cast to **1B**.

Initiative starts Undercity only when no dungeon is already underway; ordinary venture can advance an existing Undercity but cannot start it. [Dungeon/initiative rules](https://magic.wizards.com/en/news/feature/commander-legends-battle-for-baldurs-gate-mechanics). Hama doubles room abilities, not the number of rooms traversed.

Applying the [party rules](https://magic.wizards.com/en/news/feature/zendikar-rising-release-notes-2020-09-10), each creature fills at most one party role. Firdoch Core is searchable with Tazri but fills a battlefield party role only while animated. Nadaar is a Knight and Karlach a Barbarian; neither contributes a party role.

**Evidence limits:** the new dungeon creatures have positive lift, including Nadaar despite his missing party type. Keeping Karlach (**1.8% / +1.11**) and Bre (**0.5% / +1.32**) is a theme/mana-synergy call with low inclusion, not negative lift. Path (**23.4% / -0.19**) and Concealed Courtyard (**0.4% / -0.47**) are functional corrections; Lonely Arroyo and Spirebluff Canal have no supplied corpus entry. The latter choices are not corpus-backed commander-specific upgrades.

Verification: all three proposals contain exactly **100 lines of `1 Card Name`**, commander first, using front-face names. Every nonbasic addition is in `open-cards.txt`: **11 Meren, 7 Imotekh, 18 Tazri; 36 distinct additions, zero cross-deck allocation collisions**. Basics are unlimited; existing separate copies remain.

Color identities, nonbasic singleton quantities, retention of existing shared cards, reserved-card exclusion, Culling's retention, and all **20 existing Tazri ramp/mana-support slots** were checked. No selected card is on the current [Commander banned list](https://magic.wizards.com/en/banned-restricted-list). Only the three `*-astra.txt` lists and this review were written; no builds, tests, or commits were run.
