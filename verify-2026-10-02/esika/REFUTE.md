# REFUTE: Esika // The Prismatic Bridge fixed-point build (2026-10-02)

Reviewer: refuter (Opus). Inputs: quick-v1.txt, final.txt, build-report.md, BUILD-BRIEF.md, 09-30 screens/pools, current.txt, tam-superfriends-v1.txt, live card DB (read-only).
Scratch: C:/Users/QuLeR/.claude/harness/runs/esika-refute-2026-10-02/mc.py (Monte Carlo, 20,000 games per row, seed 1, no mulligans, greedy colour-first land choice, Esika never cast).

## Verdicts

| Check | Verdict | One line |
|---|---|---|
| C1 swaps | PASS (15/15 KEEP) | 6 swap reasons are factually wrong; the swaps still hold |
| C2 convergence | FAIL | stop proof skips owned candidates; 1 improving swap proven |
| C3 mana | PASS with caveats | counts verified; Bridge by T6 is a coin flip (52 / 61 %); "40 sources" counts Esika |
| C4 play notes | PASS (07:21 revision) | conversion rules now right; LOW: Otawara often-{U} overstated, T5 Bridge only 40-49 % |
| C5 gate | PASS | re-run matches: only ownership (4 named) and plan FAIL |

## C5 gate (re-run by refuter)

Command: MTG_DB_DIR="C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-10-02/esika/final.txt --format brawl --owner 1 --source arena

    totals    : 100 cards | 36 lands (36.8 eff.) | 63 nonland | avg MV 3.68
    PASS size / singleton / legality / rules / identity / curve / wincons (15) / locks (12)
    FAIL  ownership   4 card(s): Liliana the Faultless, Sarkhan the Masterless, Ugin, the Ineffable, Sanctum Lurker  (accepted)
    WARN  arenaNames  Esika, Shatterskull Smashing, Fell the Profane (already front-face)
    WARN  lands       36 lands (+2 MDFC = 36.8 effective); Karsten wants 42 +-2
    FAIL  plan        0/63 nonland cards interact (accepted)

Swap set confirmed by comm on CR-stripped lists: exactly the 15 IN / 15 OUT in report section 4.

## C1 per swap

| # | Swap | Verdict | Evidence / defect in the report's reason |
|---|---|---|---|
| 1 | +Elesh Norn -Teyo | KEEP | Teyo: "You have hexproof." / "-2: Create a 0/3 white Wall". Elesh: "Creatures your opponents control get -2/-2." |
| 2 | +Terror of the Peaks -Dovin | KEEP | Dovin "-1: ... prevent all damage ... dealt to and dealt by target permanent" is a one-permanent fog |
| 3 | +Craterhoof -Saheeli | KEEP, reason WRONG | Report: Saheeli has "No plus ability". In this deck every walker has "[+1]: Add {R}." (Way of the Pyromancer) and "[+2]: ... 1 damage to each opponent and you gain 1 life" (Sanctum Lurker). Saheeli's Servo per noncreature spell also feeds Liliana ("Whenever another creature ... enters, you gain 1 life"). Hoof still wins as a Bridge hit ("creatures you control gain trample and get +X/+X") |
| 4 | +Enduring Vitality -Timeless Lotus | KEEP | MC Bridge-by-T5/T6 on the play: final 40.5/52.1 % vs Lotus-for-Vitality 38.9/50.9 % (draw 49.2/60.5 vs 48.4/60.7). "WUBRG in one card" is a 5-drop: it pays the Bridge on T6 at the earliest, when lands mostly already do |
| 5 | +Mortality Spear -Way of the Necromancer | KEEP (contested), reason WRONG | Report: "the deck rarely sacrifices". Chandra, Acolyte of Flame "0: Create two 1/1 red Elemental creature tokens ... Sacrifice them at the beginning of the next end step" = 2 Necromancer triggers per activation; Deathbringer's granted "-2: You may sacrifice a creature", Garruk VB "-2: Each player sacrifices", Minsc "-2: Sacrifice a creature" also fire it. Kept only because removal vs engine is a role call, not a proven loss |
| 6 | +Garruk, Veiled Butcher -Jegantha | KEEP, reason WRONG | Report: Jegantha's mana "can't be spent to pay generic mana costs". The Bridge is {W}{U}{B}{R}{G} and Tam's ability is {W}{U}{B}{R}{G}: zero generic, so Jegantha's "{T}: Add {W}{U}{B}{R}{G}" pays either in full. Still KEEP: MC adds only +0.3 pts Bridge-by-T6 (50.1 to 50.4 % play) because Jegantha is a 5-drop |
| 7 | +Ob Nixilis -Tezzeret | KEEP | Tezzeret "-3: ... artifact card with mana value 1 or less" has no target after Mox Amber left. Minor omission: Tezzeret "0: Untap target artifact or creature" re-uses The One Ring/Signet/Esika |
| 8 | +Beast Within -Counterspell | KEEP (contested) | {U}{U} on 15 blue land sources in a tap-out deck. Unstated cost of Beast Within: "Its controller creates a 3/3 green Beast" that attacks walkers |
| 9 | +Overlord of the Hauntwoods -Enlightened Tutor | KEEP | Everywhere is "a tapped colorless land token ... every basic land type": ramp from the next turn, not WUBRG on the cast turn |
| 10 | +Fell the Profane -Mox Amber | KEEP (contested) | Mox needs a legend; 30 legends in the 99 (20 walkers + 10 legendary creatures) make it live from T3. Fell's land side ("As this land enters, you may pay 3 life") addresses missed drops |
| 11 | +Archon of Sun's Grace -Tekuthal | KEEP (contested), reason WRONG | Report: "only 3 proliferate sources". They are repeatable: Evolution Sage "Landfall ... proliferate" (every land, fetch = 2), Flux Channeler "Whenever you cast a noncreature spell, proliferate" (about 45 noncreature spells). Archon keeps the slot on standalone value |
| 12 | +Forest -Theorist's Sanctum | KEEP | Note: Farseek cannot fetch Forest ("a Plains, Island, Swamp, or Mountain card"); Misty Rainforest can |
| 13 | +Savai Triome -Bloom Tender | KEEP | But Great Divide Guide (owned) dominates Bloom Tender and was never evaluated: see C2 |
| 14 | +Farseek -Way of the Mind Sculptor | KEEP, quote WRONG | Report quotes Farseek as "put it onto the battlefield"; oracle is "put it onto the battlefield tapped". The quote "if you removed two or more loyalty counters ... draw a card" is Mind Sculptor's own text, not The One Ring's. MC: Farseek over Mind Sculptor = +2.6 / +2.1 pts Bridge-by-T5 (play/draw) |
| 15 | +The One Ring -Way of the Wildspeaker | KEEP, quote WRONG for Arena | DB row A-The One Ring (arena_id 90247): "{1}, {T}: Put a burden counter on The One Ring, then draw a card for each burden counter". Arena Historic Brawl plays rebalanced A- versions (UNVERIFIED in client). Still beats Wildspeaker's 5-MV "-4: Create a 4/4 green Beast" |

## C2 convergence

Proven improving swap:

**+Great Divide Guide -Vraska, Soul of Stone** (ramp role; the report itself files Vraska under ramp and defends it against Tireless Provisioner).
- Guide {1}{G}, 2/3: "Each land and Ally you control has '{T}: Add one mana of any color.'" Guide is an Ally, so it taps for any colour itself.
- Vraska {U}{R}{W}: "Whenever you cast a noncreature spell, create a 1/1 colorless Sculpture Treasure artifact creature token with '{T}, Sacrifice this token: Add one mana of any color.'" One-shot mana, three colours to cast.
- On curve from lands alone (MC probe, play/draw): Guide castable T2 45.8 / 49.6 %, Vraska castable T3 25.1 / 29.5 %.
- Bridge WUBRG by T5 / T6, Vraska credited one Treasure every turn from her cast turn (generous): play 40.5 / 52.1 % to 41.2 / 52.8 %; draw 49.2 / 60.5 % to 51.2 / 62.5 %. Guide also turns the T3 land drop into 4 mana for every 4-drop walker; the brief names mana development as the weak point.
- Vraska's remaining argument (Sculpture tokens feed Liliana) is the same "token per noncreature spell" text the builder used to cut Saheeli as low-impact (swap 3), so by the report's own standard it does not save her.
- Ownership: collection user 1, source arena, 4 copies.
- Sources: the report counts Esika among its 40; in Bridge-first games Esika is not on the battlefield, so the real count is 39 and Guide brings it back to 40, inside the brief's 37-40 band.

Candidates the stop proof never evaluated (owned, arena) - the stop proof is incomplete; these are NOT proven improving:
- Starfield Vocalist {3}{U} 3/4: "If a permanent entering the battlefield causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time." Doubles Liliana (two Mentor triggers per Bridge hit or token), Terror of the Peaks, Archon Pegasi, Hauntwoods Everywhere, every Way empower, Kiora/Garruk CB draws. Contender vs Flux Channeler / Evolution Sage.
- Purphoros, God of the Forge {3}{R}: "Indestructible ... Whenever another creature you control enters, Purphoros deals 2 damage to each opponent." Enchantment (Pia target, Archon trigger) and Bridge hit. Contender vs Marauding Blight-Priest / Dina; not proven because both are halves of the Conqueror infinite.
- Gandalf the White {3}{W}{W}: "You may cast legendary spells ... as though they had flash" (all 20 walkers, all 6 Ways) and doubles triggers from legendary permanents entering.
- Rune-Scarred Demon {5}{B}{B}: "When this creature enters, search your library for a card" - a Bridge hit that finds Conqueror or Doubling Season.
- Twinflame Tyrant {3}{R}{R}: "it deals double that damage instead" (Lurker pings, Warlord -4, Terror, All Will Be One).
- Paradise Druid / Ilysian Caryatid / Ornithopter of Paradise: any-colour 2-MV dorks, all behind Guide.
- Ajani, Outland Chaperone ("+1: Create a 1/1 ... Kithkin") and Kasmina ("Spells your opponents cast that target a creature or planeswalker you control cost {2} more") vs Ajani Resolute / Narset.

Report claim "low-impact hits: 0" is false by its own yardstick (Bloom Tender 1/1 was "low-impact"): Liliana the Faultless 1/1, Flux Channeler 2/2, Pia 2/2, Captain Sisay 2/2, Dina 1/3 remain as Bridge hits.

## C3 mana

- Lands 36 + 2 MDFC (gate 36.8 eff.), basics 4 (Plains, Island, Mountain, Forest): verified.
- Pips in nonland cards: W 21, U 11.5, B 20, R 21, G 25.5 (cards needing the colour: 17 / 10 / 14 / 14 / 20).
- Land sources per colour (fetches counted by in-deck targets): W 17, U 15, B 14 (+Urborg makes every land a Swamp, +Fell Mire), R 15 (+Shatterskull), G 17; plus Signet, Lantern, Vitality any-colour. G is the most demanded (Esika and Vitality {1}{G}{G}, Hauntwoods impending {1}{G}{G}, Craterhoof {G}{G}{G}).
- For the Bridge, Interplanar Beacon is colourless ("Spend this mana only to cast planeswalker spells"); Great Hall works ("Spend this mana only to cast legendary spells" - the Bridge is legendary).
- "40 sources" includes Esika; Esika and the Bridge are the same card, so Bridge-first games have 39.
- Bridge-first WUBRG from untapped sources, by turn: T4 13.9 / 18.7 %, T5 40.5 / 49.2 %, T6 52.1 / 60.5 %, T7 61.8 / 69.0 % (play / draw). quick-v1 was lower (T6 41.4 / 50.1 %), so the swaps did improve it.
- Sim land drops on T3-T6 (play): 79.5 / 68.7 / 58.1 / 50.7 % vs tracked 92 / 83 / 73 / 71 % (12 games). The tracked games beat the hypergeometric baseline; do not read them as "land drops are fine".

## C4 play-notes (section 7)

build-report.md was rewritten at 07:21 (after the addendum). The old line "While Esika is on the battlefield the Bridge is locked out until she dies or is removed (commander tax +2 per recast)" is gone. The new section 7 is checked here.

Correct in the 07:21 text:
- Item 3: to hand = no tax; the Bridge from hand costs exactly {W}{U}{B}{R}{G}. Commander tax applies only to casts from the command zone.
- Item 4: to the command zone = WUBRG + {2} per earlier command-zone cast. Jace MA -3, Garruk VB -2, the Deathbringer -2, Minsc -2, Dina sac, Beast Within all route there.
- Eternal Wanderer +1 and Oath ETB are listed under the command zone, which is right. Both return the card to the battlefield front face up (Esika), so they convert only if she is moved to the command zone when exiled. Section 5 says the same for Displacer Kitten and Ephemerate.
- Item 6: Otawara in response to removal on Esika (to hand, no tax) is right.
- Item 7: The One Ring protection covers the player, not the permanents. Right.

Still wrong or overstated (LOW):
- Item 3: Otawara channel "often just {U}". Oracle: "{3}{U} ... costs {1} less to activate for each legendary creature you control". With Esika alone it is {2}{U}. Only {U} with Esika plus 2 more legendary creatures.
- Item 3: Kaito plus Bridge in one turn costs {1}{U}{B} + {W}{U}{B}{R}{G} = 8 mana. Esika can pay one of the ninjutsu mana before she leaves.
- Item 1: "when lands make WUBRG on turn 5". MC Bridge-first by T5 is 40.5 / 49.2 %, by T4 13.9 / 18.7 % (play / draw). Treat the T5 Bridge as the minority line. The earlier "by turn 4-5" wording is gone.
- Item 7 omits the Arena text of The One Ring: each draw costs {1} (A- text).

## Severity-ranked findings

- HIGH: stop proof incomplete - Great Divide Guide, Starfield Vocalist, Purphoros, Gandalf, Rune-Scarred Demon, Twinflame Tyrant never ranked; +Great Divide Guide -Vraska is a proven improvement. NOT CONVERGED.
- LOW: section 7 (07:21) correct on conversion rules; Otawara cost and T5 Bridge rate overstated.
- MEDIUM: 6 swap reasons quote wrong or misread text (#3, #5, #6, #11, #14, #15); verdicts unaffected.
- MEDIUM: "low-impact hits: 0" false; "40 sources" counts Esika.
- LOW: The One Ring quoted with paper text; Arena Historic Brawl uses A-The One Ring (UNVERIFIED in client).
