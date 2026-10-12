# Esika // The Prismatic Bridge superfriends: fixed-point build, round 2 (2026-10-02)
Round 2 = convergence after `REFUTE.md`, starting from the round-1 `final.txt`. 9 more swaps (#16–24), 24 in total vs `quick-v1.txt`. **CONVERGED** (stop proof §4, every screen pass and refuter-named card in §7). Bridge castable by T6 (refuter MC, 20,000 games, seed 1), play / draw: **52.1 / 60.5 → 53.2 / 61.9**. Rows marked ✎ carry a reason corrected after REFUTE.
## 1. Plan
- Walkers grow faster than they can be attacked. Way of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life") feeds Way of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control"). Liliana turns every creature or walker entry into life gain. Doubling Season, Doc Samson and Starfield Vocalist multiply it.
- The Bridge puts a free creature or walker into play each upkeep. The pool is 41 hits, 10 of them with power ≥ 4 or a game-swinging entry (Awakener, Craterhoof, Elesh Norn, Terror). Closers: Conqueror + Dina or Enduring Tenacity loop, Purphoros + Twinflame Tyrant, All Will Be One, Lurker "+2" pings, ultimates.
- Mana: 36 lands + 2 MDFC; Great Divide Guide, Signet, Farseek, Lantern, Vitality, Hauntwoods (impending); Esika as turn-3 fixing.
## 2. Health: quick-v1 → round 1 → final
| Metric | quick-v1 | round 1 | final |
|---|---|---|---|
| Lands (basics) | 35 + 1 MDFC (3) | 36 + 2 MDFC (4) | 36 + 2 MDFC (4: Plains, Island, Mountain, Forest) |
| Mana sources, Bridge-first / with Esika | 41 / 42 | 39 / 40 | **40 / 41** (+ Guide). Doc Samson's "{T}: Add X mana of any one color" is extra, at 5 MV |
| Bridge castable by T6, play / draw (MC) | 41.4 / 50.1 | 52.1 / 60.5 | **53.2 / 61.9** (T5: 41.7 / 50.8) |
| Ramp at ≤ 3 MV | 4 | 5 | **6** (Guide, Signet, Farseek, Lantern, Vitality, Hauntwoods impending) |
| Draw / tutor | 6 | 5 | 4: A-The One Ring, Sylvan Library, **Bre**, Sisay (+ Theorist's "you draw a card" each opposing draw step) |
| Removal spells / wipes / protection | 5 / 1 / 2 | 7 / 1 / 3 | 7 / 1 / 3, plus 10 walkers with removal (Ugin, Chandra ToD, Dellian, Ob, Garruk VB, Kaito, Ajani OC, The Wanderer, Ajani U, Theorist) |
| Walkers (count / distinct types) | 22 / 17 | 20 / 14 | 20 / 13 |
| Creatures / Bridge hits | 15 / 37 | 18 / 38 | **21 / 41** |
| Hits with power ≥ 4 / power ≤ 2 | 3 / 7 | 6 / 6 (Liliana, Channeler, Dina, Pia, Sisay, Tam; "0" in round 1 was wrong) | **10 / 5** (Liliana, Dina, Sisay, Tam, Guide) |
| Esika → Bridge conversion outlets (dedicated) | 8 | 10 | 10 (Otawara, Kaito BoN; Deathbringer, Minsc, Jace MA, Garruk VB, Eternal Wanderer, Oath, Dina, Beast Within) |
| Win lines (gate wincons) | 6 (12) | 10 (15) | **13 (18)** |
| Avg MV (cards at 5+ MV) | 3.38 (16) | 3.68 (18) | 3.83 (21) |
Win lines: (1) Conqueror + Dina or Tenacity loop; (2) Dellian −6 emblem + Conqueror; (3) All Will Be One + Mentor/Doc counters; (4) ultimates via Mentor, Doubling Season, Doc, Oath; (5) Lurker pings; (6) Sheoldred; (7) Craterhoof, its entry doubled by Vocalist; (8) Terror; (9) Elesh Norn; (10) A-Ring burden + All Will Be One; (11) Purphoros, 4 per creature with Tyrant; (12) Tenacity drain on every life gain; (13) Awakener's 4–5 free permanents. Sources: round 1's "40" included Esika, so Bridge-first games had 39 (REFUTE). Guide restores 40 Bridge-first; 41 with Esika is one over the brief's 37–40 band, accepted because the MC rises with it. Gate `lands` WARN (Karsten 42 ± 2) accepted, as before.
## 3. Swaps (applied order; each against the weakest card of its role at that point)
| # | IN | OUT | Role | Why IN (oracle) | Why OUT is weaker |
|---|---|---|---|---|---|
| 1 | Elesh Norn, Grand Cenobite | Teyo, the Shieldmage | hit / finisher | "Other creatures you control get +2/+2. Creatures your opponents control get -2/-2." | "You have hexproof." + "−2: Create a 0/3 white Wall": no board impact |
| 2 | Terror of the Peaks | Dovin, Hand of Control | hit / finisher | "Whenever another creature you control enters, this creature deals damage equal to that creature's power to any target." | a "cost {1} more" tax and a one-permanent "−1: prevent all damage" |
| 3 ✎ | Craterhoof Behemoth | Saheeli, Sublime Artificer | hit / finisher | "creatures you control gain trample and get +X/+X": an upkeep hit is lethal with Chandra AoF Elementals, Ajani OC Kithkin, Theorist Illusions, Beasts | She has no native plus, though Pyromancer "[+1]: Add {R}" and Lurker "[+2]" give her one; her own text is a 1/1 Servo per noncreature spell + "−2: … becomes a copy" |
| 4 | Enduring Vitality | Timeless Lotus | ramp | "Creatures you control have '{T}: Add one mana of any color.'" at 3 MV; returns as an enchantment | 5 MV and "enters tapped": first mana on turn 6 |
| 5 ✎ | Mortality Spear | Way of the Necromancer | removal | "costs {2} less to cast if you gained life this turn … Destroy target nonland permanent." | Its "Whenever a creature you control dies, put a loyalty counter on each planeswalker" does fire (Chandra AoF Elementals each end step; Deathbringer, Garruk VB, Minsc, Dina sacrifices) but repeats Mentor's job; Spear is one of 7 instant answers |
| 6 ✎ | Garruk, Veiled Butcher | Jegantha, the Wellspring | walker / removal | "−2: Each player sacrifices a creature … create a 4/4 green Beast" and "+2: … gets -4/-1" | Its WUBRG pays the Bridge and Tam's ability in full (no generic), but the MC credits it only +0.3 pp Bridge-by-T6 at 5 MV; no other text |
| 7 | Ob Nixilis, the Hate-Twisted | Tezzeret, Cruel Captain | walker / removal | "−2: Destroy target creature. Its controller draws two cards." + "Whenever an opponent draws a card, Ob Nixilis deals 1 damage" | "−3: Search … artifact card with mana value 1 or less": no targets once Mox Amber left |
| 8 | Beast Within | Counterspell | interaction | "Destroy target permanent." at instant speed (the opponent gets a 3/3); also an Esika outlet | {U}{U} held up in a tap-out walker deck, in the thinnest colour |
| 9 | Overlord of the Hauntwoods | Enlightened Tutor | ramp / hit | "Impending 4—{1}{G}{G}" + "create a tapped … land named Everywhere that is every basic land type", then a 6/5 hit | "put that card on top": no mana, no board |
| 10 | Fell the Profane | Mox Amber | removal / land | "Destroy target creature or planeswalker." // Fell Mire "{T}: Add {B}" | "mana of any color among legendary creatures and planeswalkers you control": dead on turns 1–2 |
| 11 ✎ | Archon of Sun's Grace (cut at #19) | Tekuthal, Inquiry Dominus | hit / engine | "Flying, lifelink … Whenever an enchantment you control enters, create a 2/2 … Pegasus" | "proliferate twice" doubles repeatable sources (Sage per landfall, Channeler per noncreature spell), but only those two; Doc Samson (#20) now adds one to every counter instead |
| 12 | Forest | Theorist's Sanctum | land | untapped {G}, Misty Rainforest finds it, a basic for opposing Path/Erode | "enters tapped" unless you "behold a Jace"; mono-blue |
| 13 | Savai Triome | Bloom Tender | land / ramp | "{T}: Add {R}, {W}, or {B}": three Bridge colours | a 1/1 hit; "for each color among permanents you control" makes it {G} only on turn 2 |
| 14 ✎ | Farseek | Way of the Mind Sculptor | ramp | "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped": 13 targets | 5 MV; its own "if you removed two or more loyalty counters … draw a card" is the draw A-The One Ring now supplies |
| 15 ✎ | A-The One Ring | Way of the Wildspeaker | draw / protection | "you gain protection from everything until your next turn" + Arena "{1}, {T}: Put a burden counter … then draw a card for each burden counter" | 5 MV "[−4]: Create a 4/4 green Beast" duplicates the Garruk and Deathbringer Beasts |
| 16 | Great Divide Guide | Vraska, Soul of Stone | ramp | "Each land and Ally you control has '{T}: Add one mana of any color.'" | REFUTE MC: Bridge by T6 52.1 / 60.5 → 52.8 / 62.5 with Guide (53.2 / 61.9 in the final list) |
| 17 | Enduring Tenacity | Pia, Aether Ascetic | drain / combo | "Whenever you gain life, target opponent loses that much life." With Conqueror ("Whenever an opponent loses life, you gain that much life") it loops to a win; on death it returns as an enchantment | one "search … for an enchantment card" that costs a discard; a 2/2 hit |
| 18 | Purphoros, God of the Forge | Way of the Warlord | finisher | "Indestructible … Whenever another creature you control enters, Purphoros deals 2 damage to each opponent": Chandra AoF's two Elementals = 4 a turn, every hit 2 | "[−4]: … 2 damage to up to one target creature or planeswalker and 2 damage to target player": 4 loyalty per use |
| 19 | Aurora Awakener | Archon of Sun's Grace | hit / finisher | "reveal … until you reveal X permanent cards, where X is the number of colors among permanents you control. Put any number of those permanent cards onto the battlefield": ~88 of 99 cards are permanents | a 3/4 lifelink flier whose Pegasi need enchantment entries (12 left) |
| 20 | Doc Samson, Super Psychiatrist | Flux Channeler | engine / ramp | "If you would put one or more counters on a permanent you control, put that many plus one": every Mentor trigger, plus ability and proliferate gains one; "{T}: Add X mana of any one color" | Channeler's proliferate needs a cast noncreature spell (mana), and Vocalist does not copy cast triggers |
| 21 | Ajani, Outland Chaperone | Narset, Parter of Veils | walker | "+1: Create a 1/1 … Kithkin" (Liliana life, Purphoros 2) and "−2: Ajani deals 4 damage to target tapped creature" | "−2: Look at the top four … noncreature, nonland card": a dig, no board |
| 22 | Starfield Vocalist | Marauding Blight-Priest | engine | "If a permanent entering the battlefield causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time": Liliana, Terror, Craterhoof, Hauntwoods, Sage, Ways' empower, Kiora/Garruk CB draws | its drain duplicates Dina (2 MV, sacrifice outlet) and Tenacity; with Vocalist + Liliana every entry already drains 2 through Dina |
| 23 | Twinflame Tyrant | Way of the Healer | finisher | "If a source you control would deal damage to an opponent or a permanent an opponent controls, it deals double that damage instead." | "[−2]: Create a 2/2 … Cadet. Surveil 1.": the weakest Way; Deathbringer's −2 gives a 4/4 and converts Esika |
| 24 | Bre of Clan Stoutarm | Phyrexian Arena | draw | "if you gained life this turn, exile cards … until you exile a nonland card. You may cast that card without paying its mana cost if the spell's mana value is less than or equal to the amount of life you gained" | "you draw a card and lose 1 life": the same rate, costs life, never free, not a hit |
## 4. Stop proof (full pass: best remaining candidate vs weakest kept, per role)
- **Walkers**, weakest kept Ajani Resolute (2 MV; "0: You gain 1 life", "Whenever you gain life, put a loyalty counter on Ajani"). Best remaining: Saheeli (each Servo needs a cast spell, no native plus) and Quintorius Kand (5 MV) lose; cut Narset loses (her −2 only digs). Kasmina, Zariel, Kaya and the rest lose in §7.
- **Big hits / finishers**, weakest kept Twinflame Tyrant. Best remaining: Rune-Scarred Demon, Curious Colossus, Myr Battlesphere (a 4th card at 7+ MV beside Elesh, Awakener, Craterhoof, with 21 cards at 5+). Exalted Sunborn's token doubling repeats Doubling Season. Cut Archon loses: its Pegasi need enchantment entries, Tyrant doubles the damage plan. Boilerbilges deals 4 once.
- **Engine creatures**, weakest kept Evolution Sage ("Landfall — Whenever a land you control enters, proliferate": two a turn under Paradox, doubled by Vocalist, +1 by Doc). Best remaining: cut Flux Channeler (a cast trigger Vocalist cannot copy). Way of the Necromancer gives loyalty per death, steady only with Chandra AoF, and is not a hit. Longshot's reach repeats Purphoros. Speedbrood Stalker and The Spot: removal is saturated (7 spells + Sunfall + 10 walkers).
- **Drain / combo**, weakest kept Dina ("Whenever you gain life, each opponent loses 1 life" + "{1}, Sacrifice another creature"). Cut Blight-Priest is the same drain at 3 MV without the outlet; Gray Merchant and Starseer Mentor drain once per event.
- **Draw / tutor**, weakest kept Bre. Cut Phyrexian Arena (same rate, costs life, never free), Bloombrute (same condition, draw only), Shinestriker (one-shot at 6 MV), cut Pia (one-shot) lose.
- **Ramp**, weakest kept Great Divide Guide (MC). Jegantha: +0.3 pp at 5 MV. Paradise Druid, Ilysian Caryatid and Ornithopter of Paradise each add one summoning-sick source, taking sources over the band, and are 2/1, 1/1, 0/2 hits. Smaug and Golos land after the Bridge window. Cut Vraska loses on the MC.
- **Interaction / protection / lands**, weakest kept Path to Exile, Heroic Intervention, Interplanar Beacon (untapped; "Whenever you cast a planeswalker spell, you gain 1 life" is a Mentor trigger). Archive Arbiter, The Legend of Yangchen and The Walls of Ba Sing Se cost 5–8 MV at sorcery speed. Witch Enchanter's {W} land face costs 3 life untapped, and its hit is blank without an opposing artifact/enchantment. **Conversion**: 10 dedicated outlets, unchanged (Dina kept; Blight-Priest was not an outlet). Disruptor of Currents would be an 11th, at 5 MV.
## 5. Gate (`scripts/deck-gate.ts … --format brawl --owner 1 --source arena`): VERDICT FAIL, all accepted
- PASS: size, singleton, legality, rules, identity, curve (avg MV 3.83), wincons (18), locks (12).
- FAIL ownership, 5 cards: the 4 accepted per the brief + **A-The One Ring**. The gate does not map an Arena `A-` name to the owned "The One Ring" row; the list keeps `A-` as instructed. FAIL `plan`: known, no Esika/superfriends model.
- WARN arenaNames: Esika, Shatterskull, Fell are already front-face. WARN lands: Karsten 42 ± 2; the brief band and the MC were followed.
## 6. Play notes: Esika or the Bridge first, and conversion lines
1. A turn-5 Bridge is the minority line: castable by T5 in 41.7 % (play) / 50.8 % (draw) of games, by T6 in 53.2 / 61.9 %. Cast it the turn WUBRG is up; otherwise play Esika on turn 3.
2. Play Esika first when the hand is walker-heavy or short on colours. She makes Liliana, Dina, Sisay, Tam, Sheoldred, Doc Samson, Bre and Elesh any-colour sources.
3. To hand (Bridge then costs WUBRG, no tax): Otawara channel costs {3}{U} minus {1} per legendary creature, so {2}{U} with Esika alone and {U} only with Esika + 2 more. Kaito ninjutsu {1}{U}{B} works after Esika attacks unblocked; Kaito + Bridge in one turn = 8 mana.
4. To the command zone (WUBRG + {2} per earlier command-zone cast): Jace MA −3, Garruk VB −2, Deathbringer −2, Minsc −2, Dina sacrifice, Eternal Wanderer +1, Oath ETB, Beast Within.
5. Convert only when WUBRG is available that turn or the next; Esika's own mana leaves with her. Answer removal on Esika with Otawara, which sends her to hand.
6. Hold Teferi's Protection or Heroic Intervention for wipes. A-The One Ring's cast protection covers your life, not your permanents. Every Ring draw costs {1}, and its burden counters cost life each upkeep; Paradox life pays for it.
7. Check for the combo every turn: Conqueror + Dina or Enduring Tenacity, then any life gain wins. Sisay can tutor Dina.
8. Vocalist + Liliana: every creature/walker entry gives 2 Mentor triggers. Warp Vocalist ({1}{U}, one turn) before a big walker turn.
## 7. Coverage: every hit-screen pass (s01–s04) and refuter-named card
- s01 Gray Merchant of Asphodel — loses to Dina, Soul Steeper: one drain of X = devotion to black (about 2–6 here) at 5 MV; Dina's "each opponent loses 1 life" fires on every life gain and loops with Conqueror
- s01 Witch Enchanter // Witch-Blessed Meadow — loses to Evolution Sage: its ETB is blank without an opposing artifact/enchantment, so the hit is a 2/2 that dilutes later triggers; the land face is {W} only and costs 3 life untapped
- s01 Goldspan Dragon — loses to Twinflame Tyrant: Treasures only "whenever this creature attacks or becomes the target of a spell"; Tyrant doubles Purphoros/Terror/AWBO/Lurker damage every turn
- s01 Tatyova, Benthic Druid — loses to Evolution Sage: same landfall trigger at 5 MV; its life is loyalty only with Mentor out, Sage's proliferate needs no Mentor and Vocalist/Doc amplify it
- s01 Massacre Wurm — loses to Twinflame Tyrant: its "-2/-2" duplicates Elesh Norn's static; {B}{B}{B} in a five-colour base
- s01 Mulldrifter — loses to Evolution Sage: a 2/2 hit that draws two once
- s01 Purphoros, God of the Forge — IN (swap #18)
- s01 Twinflame Tyrant — IN (swap #23)
- s01 Enduring Tenacity — IN (swap #17)
- s01 Meteor Golem — loses to Evolution Sage: 7 MV for one "destroy target nonland permanent"; 7 removal spells + 10 removal walkers already
- s01 Myr Battlesphere — loses to Twinflame Tyrant: a 4th card at 7+ MV (Elesh, Awakener, Craterhoof) in a deck with 21 cards at 5+
- s01 Nyxbloom Ancient — loses to Great Divide Guide: 7-MV ramp arrives after the Bridge window; Guide at 2 MV makes every land any colour
- s01 Tekuthal, Inquiry Dominus — loses to Evolution Sage: "proliferate twice" needs Sage or Tam to fire; Doc Samson already adds one to every counter placement
- s01 Valgavoth, Terror Eater — loses to Twinflame Tyrant: 9 MV {B}{B}{B}
- s01 Rune-Scarred Demon — loses to Twinflame Tyrant: a 4th card at 7+ MV; one tutor vs Tyrant doubling Purphoros' 2 per creature to 4 for the rest of the game
- s01 Exalted Sunborn — loses to Twinflame Tyrant: its token doubling duplicates Doubling Season; Tyrant is the only damage doubler
- s01 Adrix and Nev, Twincasters — loses to Evolution Sage: token doubling duplicates Doubling Season, on a 2/2 hit
- s01 Acidic Slime — loses to Evolution Sage: 2/2 hit; artifact/enchantment answers already in Beast Within, Mortality Spear, Ugin −3
- s01 Zetalpa, Primal Dawn — loses to Twinflame Tyrant: 8-MV keyword body with no ETB
- s01 Savage Ventmaw — loses to Twinflame Tyrant: mana only "whenever this creature attacks"; 6 MV
- s01 Lyra Dawnbringer — loses to Twinflame Tyrant: a lifelink body; the Angel clause is blank here
- s01 Starfield Vocalist — IN (swap #22)
- s01 The Walls of Ba Sing Se — loses to Heroic Intervention: an 8-MV 0/30 hit; Heroic gives indestructible at instant speed for 2
- s01 Koma, World-Eater — loses to Twinflame Tyrant: 7 MV {G}{G}{U}{U}; Serpents only on combat damage
- s01 Niv-Mizzet, Visionary — loses to Bre of Clan Stoutarm: 6 MV; draws only on noncombat damage, Bre draws every life-gain turn at 4 MV
- s01 Overlord of the Balemurk — loses to Evolution Sage: "return a non-Avatar creature card or a planeswalker card" needs hits already in the graveyard, rare early
- s01 Summon: Primal Odin — loses to Evolution Sage: 6-MV saga removal; removal saturated
- s01 Saheeli, Sublime Artificer — loses to Ajani Resolute: each Servo needs a cast noncreature spell and she has no native plus; Ajani's "0: You gain 1 life" is a Mentor trigger every turn at 2 MV
- s01 Prime Speaker Zegana — loses to Bre of Clan Stoutarm: one-shot draw at 6 MV {G}{G}{U}{U}
- s01 Longshot, Rebel Bowman — loses to Evolution Sage: 2 damage per noncreature spell duplicates Purphoros/Lurker reach; Sage's landfall proliferate is doubled by Vocalist and +1 by Doc on every walker
- s01 Overlord of the Floodpits — loses to Bre of Clan Stoutarm: a loot-2 on enter/attack; Bre draws every life-gain turn
- s01 Regal Caracal — loses to Twinflame Tyrant: three small lifelink bodies at 5 MV; the Cat clause is blank
- s01 Black Waltz No. 3 — loses to Evolution Sage: a 2/2; 2 damage per noncreature spell duplicates Purphoros/Lurker reach
- s01 Arcanis the Omnipotent — loses to Bre of Clan Stoutarm: 6 MV {U}{U}{U}; the tap-to-draw is summoning-sick
- s01 The Legend of Kyoshi // Avatar Kyoshi — loses to Bre of Clan Stoutarm: a 6-MV saga front, not a Bridge hit
- s01 Kenrith, the Returned King — loses to Twinflame Tyrant: every ability costs mana on top of 5 MV
- s01 Marang River Regent // Coil and Catch — loses to Evolution Sage: a 6-MV tempo bounce; removal saturated
- s01 Bane of Bala Ged — loses to Twinflame Tyrant: 7 MV; the exile needs an attack
- s01 Invasion of Zendikar // Awakened Skyclave — loses to Great Divide Guide: a 4-MV battle for two basics (4 in the deck); Guide at 2 fixes every land
- s01 Cloudblazer — loses to Bre of Clan Stoutarm: draw two + 2 life once, at 5 MV
- s01 Riptide Gearhulk — loses to Evolution Sage: {W}{W}{U}{U}; the tuck is temporary; removal saturated
- s01 Clone — loses to Evolution Sage: copies only what is already on the battlefield
- s01 Jegantha, the Wellspring — loses to Great Divide Guide: its WUBRG pays the Bridge in full, but at 5 MV the REFUTE MC gives it +0.3 pp Bridge-by-T6 vs Guide +0.7 / +2.0
- s01 Breaker of Creation — loses to Twinflame Tyrant: {C}{C} needs colourless mana (Beacon only); 8 MV
- s01 Smaug the Magnificent — loses to Great Divide Guide: one Treasure per upkeep from a 4-MV body; sources already 41 with Esika
- s01 Beza, the Bounding Spring — loses to Evolution Sage: every ETB clause needs the opponent ahead
- s01 The Legend of Roku // Avatar Roku — loses to Bre of Clan Stoutarm: a saga front, not a Bridge hit; one impulse of three
- s01 Kaito, Cunning Infiltrator — loses to Ajani Resolute: L3, loot or a 2/1; Ajani costs 2 and gains loyalty on every life gain
- s01 Vizier of the Menagerie — loses to Bre of Clan Stoutarm: casts only the 21 creatures off the top, paid; Bre's card comes every life-gain turn, often free
- s01 The Legend of Yangchen // Avatar Yangchen — loses to Path to Exile: a sorcery-speed 5-MV saga front, not a Bridge hit
- s01 Cayth, Famed Mechanist — loses to Evolution Sage: its proliferate costs "{2}, {T}" each turn; {U}{R}{W}
- s01 Zuko, Exiled Prince — loses to Bre of Clan Stoutarm: each impulse costs {3}
- s01 Zodiark, Umbral God — loses to Twinflame Tyrant: {B}{B}{B}{B}{B}; the sacrifice is symmetric
- s01 Overlord of the Boilerbilges — loses to Twinflame Tyrant: 4 damage on enter (impending {2}{R}{R}) and a 5/5 four turns later; Tyrant doubles all damage for the rest of the game
- s01 Absolute Virtue — loses to Twinflame Tyrant: 8 MV; its protection covers you, not the walkers
- s01 Brightglass Gearhulk — loses to Evolution Sage: its tutor finds MV ≤ 1 artifacts/creatures/enchantments, i.e. only Liliana; {G}{G}{W}{W}
- s01 Avatar Roku, Firebender — loses to Twinflame Tyrant: mana only "whenever a player attacks"; {R}{R}{R}
- s01 Elenda, Saint of Dusk — loses to Twinflame Tyrant: a lifelink body; the +5/+5 needs 35 life
- s01 Aang, at the Crossroads // Aang, Destined Savior — loses to Evolution Sage: its ETB finds a creature MV ≤ 4 in the top five about half the time (12 such cards); {G}{W}{U}
- s01 Omni-Changeling — loses to Evolution Sage: copies only what is already on the battlefield
- s01 Quintorius Kand — loses to Ajani Resolute: 5 MV vs 2; one 3/2 per +1, while Chandra AoF already makes two bodies a turn
- s01 Omnath, Locus of All — loses to Bre of Clan Stoutarm: about a card a turn at 5 MV {W}{U}{B/P}{R}{G}
- s01 Gaius van Baelsar — loses to Evolution Sage: every mode is "Each player sacrifices"
- s01 Emeritus of Ideation // Ancestral Recall — loses to Bre of Clan Stoutarm: Ancestral Recall needs it prepared again (exile eight graveyard cards)
- s01 Eirdu, Carrier of Dawn // Isilu, Carrier of Twilight — loses to Twinflame Tyrant: a lifelink flier plus convoke
- s01 The Legend of Kuruk // Avatar Kuruk — loses to Bre of Clan Stoutarm: a saga front, not a Bridge hit; two scry-draws
- s01 Zariel, Archduke of Avernus — loses to Ajani Resolute: 4 MV for +1/+0 or a 1/1 Devil; Ajani costs 2 and gains loyalty on every life gain
- s01 Raph & Mikey, Troublemakers — loses to Twinflame Tyrant: 7 MV; the extra hit needs an attack
- s01 Huatli, the Sun's Heart — loses to Ajani Resolute: Huatli's only activation is "−3: You gain life"; Ajani's 0 gains life every turn
- s01 Vile Mutilator — loses to Twinflame Tyrant: 7 MV plus a creature or enchantment sacrificed to cast it
- s01 Maelstrom Archangel — loses to Twinflame Tyrant: the free spell needs combat damage to a player
- s01 Combustion Man — loses to Twinflame Tyrant: removal only on attack, and the opponent may take 4 instead
- s01 Kasmina, Enigmatic Mentor — loses to Ajani Resolute: 4 MV, only "−2: Create a 2/2 … Wizard … Draw a card, then discard a card"; Ajani's 0 gains life (Mentor) and he grows on every life gain
- s01 The Rise of Sozin // Fire Lord Sozin — loses to Sunfall: chapter I "Destroy all creatures" at 6 MV vs Sunfall's exile wipe at 5
- s01 Summon: Anima — loses to Bre of Clan Stoutarm: three cards over three turns at 6 MV
- s01 Progenitus — loses to Twinflame Tyrant: {W}{W}{U}{U}{B}{B}{R}{R}{G}{G} to cast; a vanilla 10/10 hit
- s01 Black Cat, Cunning Thief — loses to Bre of Clan Stoutarm: two cards from the opponent's top nine
- s01 Medomai the Ageless — loses to Twinflame Tyrant: the extra turn needs combat damage and it "can't attack during extra turns"
- s01 Fear of Burning Alive — loses to Twinflame Tyrant: 4 damage once at 6 MV; delirium needs four card types in the graveyard
- s01 Elegy Acolyte — loses to Bre of Clan Stoutarm: draws only on combat damage
- s02 Cosmic Spider-Man — loses to Twinflame Tyrant: a WUBRG 5/5 with no ETB; the Spider clause is blank
- s02 Armaggon, Future Shark — loses to Twinflame Tyrant: 8 MV; removal saturated
- s02 Curious Colossus — loses to Twinflame Tyrant: a 4th card at 7+ MV; its creature lock duplicates Elesh Norn
- s02 Ultimecia, Temporal Threat — loses to Twinflame Tyrant: taps the opponent's creatures once
- s02 Sephiroth, Planet's Heir — loses to Twinflame Tyrant: its "-2/-2" duplicates Elesh Norn; 6 MV
- s02 Koh, the Face Stealer — loses to Evolution Sage: a 6-MV single exile; removal saturated
- s02 Azula, Cunning Usurper — loses to Evolution Sage: the opponent chooses which creature to exile
- s02 Shinestriker — loses to Bre of Clan Stoutarm: one draw of about five at 6 MV; Bre draws every life-gain turn
- s02 Aurora Awakener — IN (swap #19)
- s02 Gigantic Big Bear — loses to Twinflame Tyrant: a vanilla 10/7
- s02 Jaya, Venerated Firemage — loses to Ajani Resolute: 5 MV; "+1" only for red sources, and Tyrant (kept) doubles all of them
- s02 Oko, Lorwyn Liege // Oko, Shadowmoor Scion — loses to Ajani Resolute: creature-type changes have no payoff here
- s02 Angrath, Captain of Chaos — loses to Ajani Resolute: menace and one Amass 2, minus only
- s02 Ral Zarek, Guest Lecturer — loses to Ajani Resolute: L3 surveil/discard; reanimates only MV ≤ 3 creatures
- s02 Ajani, Outland Chaperone — IN (swap #21)
- s02 Arlinn, Voice of the Pack — loses to Ajani Resolute: 6 MV, minus-only 2/2 Wolves; the Wolf clause is blank
- s02 Doctor Octopus, Master Planner — loses to Bre of Clan Stoutarm: a 4th card at 7+ MV, {U}{B}
- s02 Sharae of Numbing Depths — loses to Evolution Sage: one stun; the draw needs opposing creatures tapped
- s02 Bre of Clan Stoutarm — IN (swap #24)
- s02 Bard, King of Dale — loses to Twinflame Tyrant: draw doubling skips the first draw each draw step; token doubling duplicates Doubling Season
- s02 Quintorius, Loremaster — loses to Evolution Sage: needs noncreature cards in the graveyard; 5 MV
- s02 Fiendish Panda — loses to Evolution Sage: counters on itself; recursion capped by its power
- s02 Doc Samson, Super Psychiatrist — IN (swap #20)
- s02 Starseer Mentor — loses to Dina, Soul Steeper: one end-step drain the opponent can dodge by sacrificing or discarding
- s02 Twinblade Paladin — loses to Evolution Sage: grows only itself
- s02 Shroudstomper — loses to Twinflame Tyrant: 7 MV {W}{W}{B}{B}; a 4th card at 7+ MV
- s02 Doctor Doom — loses to Twinflame Tyrant: 6 MV for two 3/3s
- s02 Loot, the Pathfinder — loses to Evolution Sage: each exhaust ability works once
- s02 Balin, Loremaster — loses to Evolution Sage: Dwarf triggers only
- s02 Krang & Shredder — loses to Twinflame Tyrant: 6 MV; exiles from the opponent's library
- s02 Bosco, Just a Bear — loses to Evolution Sage: Food per legendary creature, spent on its own counters
- s02 Champion of the Weird — loses to Evolution Sage: needs a Goblin to behold; the deck has none
- s02 Panicked Altisaur — loses to Twinflame Tyrant: "{T}: 2 damage to each opponent", summoning-sick; Tyrant doubles every source
- s02 Disruptor of Currents — loses to Evolution Sage: a 5-MV bounce; as an Esika self-bounce it would be an 11th conversion outlet
- s02 Tam, Observant Sequencer // Deep Sight — loses to Evolution Sage: Deep Sight is one draw + 1 life per prepare
- s02 Tom, Bert, and William — loses to Evolution Sage: each draw needs a creature sacrificed; 5 MV
- s02 Glóin the Mighty // Easy Pickings — loses to Great Divide Guide: {R}{R} a turn from a 4-MV body; Guide fixes every land at 2
- s02 Groundchuck & Dirtbag — loses to Great Divide Guide: a 6-MV {G} doubler after the Bridge window
- s03 Don & Leo, Problem Solvers — loses to Evolution Sage: the end-step flicker needs a strong ETB creature already out (Awakener/Craterhoof cost 7–8)
- s03 Wan Shi Tong, All-Knowing — loses to Evolution Sage: a 5-MV tuck; removal saturated
- s03 Savanti Romero, Time's Exile — loses to Bre of Clan Stoutarm: 5 MV; draws X and loses X life with X growing every turn
- s03 Twinmaw Stormbrood // Charring Bite — loses to Twinflame Tyrant: gains 5 once; the Omen hits only creatures without flying
- s03 Deceit — loses to Evolution Sage: one bounce or one discard per cast
- s03 Ellywick Tumblestrum — loses to Ajani Resolute: venture, or a dig for creatures only
- s03 Alabaster Host Intercessor — loses to Evolution Sage: a 6-MV O-ring; removal saturated
- s03 Mechanozoa — loses to Evolution Sage: one stun
- s03 Ice Flan — loses to Evolution Sage: one stun
- s03 Sonic Shrieker — loses to Evolution Sage: 2 damage + 2 life once
- s03 Ka-Zar of the Savage Land — loses to Bre of Clan Stoutarm: land plays off the top; Paradox already gives the extra land drop
- s03 Wolverine, Fierce Fighter — loses to Evolution Sage: one fight
- s03 Undercity Eliminator — loses to Evolution Sage: needs a sacrifice; removal saturated
- s03 Bruse Tarl, Roving Rancher — loses to Evolution Sage: Ox payoffs only
- s03 Tazri, Beacon of Unity — loses to Evolution Sage: the party dig finds few Clerics/Rogues/Warriors/Wizards/Allies here
- s03 Samut, Tyrant Smasher — loses to Ajani Resolute: haste and a −1 pump; no plus
- s03 Blighted Blackthorn — loses to Bre of Clan Stoutarm: one draw on enter/attack, blighting itself
- s03 Mighty Mutanimals — loses to Evolution Sage: +1/+1 counters only
- s03 Infernal Captor — loses to Evolution Sage: one exploit-threaten
- s03 Hama, the Bloodbender — loses to Bre of Clan Stoutarm: one stolen noncreature card
- s03 Nissa, Leyline Tamer — loses to Twinflame Tyrant: 7 MV {W}{U}{B}{R}; a 4th card at 7+ MV
- s03 Cloud of Darkness — loses to Evolution Sage: -X/-X counts permanent cards in my graveyard, few here
- s03 Kitsune, Dragon's Daughter — loses to Twinflame Tyrant: 6 MV for one control exchange
- s03 Wiccan, Rising Magician — loses to Evolution Sage: 5 MV; the flicker per noncreature spell has few ETB targets
- s03 Territorial Bruntar — loses to Twinflame Tyrant: 6 MV {R}{R}; the exiled cards must be paid
- s03 Flickering Hound — loses to Evolution Sage: flickers only on creature casts (21 creatures)
- s03 Kang the Conqueror — loses to Twinflame Tyrant: the extra turn costs {5}{U}{U}{U} on top; blue is the thinnest colour
- s03 Nahiri, Storm of Stone — loses to Ajani Resolute: −X only, on tapped creatures
- s03 Sanar, Innovative First-Year — loses to Bre of Clan Stoutarm: the exiled cards must be paid this turn
- s03 Super-Skrull — loses to Evolution Sage: {1}{B}{B}{B}; every ability costs mana
- s03 Colossus of the Blood Age — loses to Twinflame Tyrant: 3 damage + 3 life once at 6 MV
- s03 Orysa, Tide Choreographer — loses to Bre of Clan Stoutarm: draw two once
- s03 Ray Fillet, Man Ray — loses to Evolution Sage: each draw removes a +1/+1 counter and costs {2}
- s03 Kaya, Bane of the Dead — loses to Ajani Resolute: 6 MV for two "−3: Exile target creature"
- s03 Prismabasher — loses to Twinflame Tyrant: a one-turn pump; Craterhoof already holds that line
- s03 The Spot, Living Portal — loses to Evolution Sage: a 5-MV single exile; removal saturated
- s03 Grim Reaper, Lethal Legionnaire — loses to Evolution Sage: each reanimation costs {3}{B} on attack
- s03 Miasma Demon — loses to Twinflame Tyrant: its -2/-2 costs discarded cards
- s03 Spider-Woman, Secret Agent — loses to Evolution Sage: locks one creature
- s03 Tragic Banshee — loses to Evolution Sage: -1/-1 unless a creature died this turn
- s03 Primordial Gnawer — loses to Evolution Sage: value only when it dies
- s03 Riddlemaster Sphinx — loses to Evolution Sage: a 6-MV bounce
- s04 Affectionate Indrik — loses to Evolution Sage: one fight
- s04 Gandalf, Spark Starter — loses to Evolution Sage: 3 damage divided, once
- s04 Constrictor Sage — loses to Evolution Sage: one stun
- s04 Stone-Giant of High Pass — loses to Twinflame Tyrant: 7 MV; a 4th card at 7+ MV
- s04 Killmonger, Scourge of Wakanda — loses to Evolution Sage: the removal needs another creature sacrificed; removal saturated
- s04 Old Hob, Alleycat Blues — loses to Evolution Sage: one temporary 2/2 per combat at 5 MV; Chandra AoF makes two at 3
- s04 Archive Arbiter — loses to Path to Exile: 6 MV for one noncreature-permanent kill or 4 life
- s04 Bloombrute — loses to Bre of Clan Stoutarm: the same life-gain condition, but Bre's card can be cast free
- s04 Rusko, Clockmaker — loses to Evolution Sage: Midnight Clock needs noncreature casts to charge
- s04 Massacre Girl, Most Wanted — loses to Dina, Soul Steeper: triggers only when my own creatures or walkers die
- s04 Spiritual Guardian — loses to Evolution Sage: one 4-life gain
- s04 Golos, Tireless Pilgrim — loses to Great Divide Guide: a tapped land at 5 MV, after the Bridge window
- s04 Gut, Fanatical Priestess — loses to Evolution Sage: one fight
- s04 Speedbrood Stalker — loses to Evolution Sage: a 5-MV double edict, but removal is saturated (7 spells + Sunfall + 10 walker answers); Sage is a 3-MV engine that Vocalist and Doc amplify
- s04 Mind Meanderer — loses to Evolution Sage: one fight at 6 MV
- refuter Gandalf the White — loses to Evolution Sage: a second trigger doubler at 5 MV {W}{W}, legendary/artifact entries only; Starfield Vocalist (IN) covers every permanent
- refuter Paradise Druid — loses to Great Divide Guide: one summoning-sick any-colour source; Guide makes all 36 lands any colour, and sources already sit at 41 with Esika
- refuter Ilysian Caryatid — loses to Great Divide Guide: one summoning-sick source and a 1/1 hit
- refuter Ornithopter of Paradise — loses to Great Divide Guide: one summoning-sick source and a 0/2 hit
- refuter-2 addendum (REFUTE-2.md): The Great Henge, Way of the Mind Sculptor — lose to Bre; Displacer Kitten — loses to Evolution Sage; Moonshaker Cavalry — loses to Twinflame Tyrant. Tatyova and Overlord of the Balemurk reasons corrected there; both still lose to Bre.
