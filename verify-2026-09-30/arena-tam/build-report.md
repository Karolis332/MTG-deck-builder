# Arena Tam — fixed-point build report (2026-09-30)

Inputs: deck.md (current 100), screen-01…11 (930 candidates, every chunk read to its last card), pool-01…11 for oracle checks.
Output: `final.txt` (100 cards, Arena import format). Swaps: **56** (27 nonland in / 26 out, 29 lands in / 30 out). Stop proof:
COMPLETE (section 4). Land count 35, chosen from the simulation in section 7.

## 1. Plan

Superfriends drain. Tam ("Planeswalker spells you cast cost {1} less") plus Geist turn every walker into a 1–3 mana body.
Way of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life. You may play an additional land this turn") ×
Way of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control") ⇒ every activation grows
every walker. Oath doubles activations, Doubling Season doubles every counter, Tam/Tekuthal/Flux Channeler/Evolution Sage/Karn's
Bastion proliferate. Kill: Dina / Blight-Priest ("Whenever you gain life, each opponent loses 1 life") make each activation
1 damage; either with Bloodthirsty Conqueror ("Whenever an opponent loses life, you gain that much life") loops to 0; AWBO and
ultimates (Chandra −7, Ral −10, Dellian −6, Ajani R −10) close otherwise. Interaction protects the board at 25 life.

## 2. Health table (current → final)

| Metric | Current | Final |
|---|---|---|
| Lands | 36 (+Shatterskull MDFC): 20 basics, 11 Annex/Commons, Hall of Echoes, 4 utility | 35 (+MDFC): Command Tower, 9 shocks, 3 fetches, 4 Verges, 2 checklands, 5 slow lands (Rockfall Vale, Shattered Sanctum, Sundown Pass, Deserted Beach, Overgrown Farmland, Deathcap Glade = 6), Urborg, Passage, Yavimaya Coast, Theorix Annex, Sanctum, Otawara, Takenuma, Beacon, Great Hall, Karn's Bastion — 0 basics |
| Ramp (nonland, mana-producing only) | 10: Mox Amber, Arcane Signet, 7 two-colour Signets, Esika | 7: Mox Amber (needs a legendary), Arcane Signet, Chromatic Lantern, Bloom Tender, Esika, Timeless Lotus (turn 6+), Jegantha (turn 6+, coloured only) |
| Mana sources | 46 lands+rocks; Karsten-equivalent (lands + ½ rocks) 41 | 42 lands+rocks; Karsten-equivalent 38.5 (+MDFC, +Vraska treasures, Garruk CB untaps, Chandra RR) |
| Draw (non-walker) | 2: Protege's Awakening, Vigorbloom Charm mode | 4: Phyrexian Arena, Sylvan Library, Sheoldred, Kiora/Garruk CB power-4 triggers |
| Spot removal | 4: Erode, Shatterskull, Boros Charm (walker/face), Plan for All Outcomes | 4: Swords, Path, Lightning Helix, Shatterskull |
| Wipes sparing walkers | 1: Overwrite | 2: Overwrite, Sunfall (+ Eternal Wanderer −4) |
| Counters | 1: Countersculpt | 2: Counterspell, Countersculpt |
| Protection | 3: Tomik, Boros Charm, Vigorbloom Charm | 6: Teferi's Protection, Heroic Intervention, The Wanderer, Teyo, Dovin, Authority of the Consuls |
| Walkers (types) | 20 (14 types) | 19 (14 types: Jace, Chandra, Dellian, Minsc, Ajani, Narset, Ral, Kaito, Tezzeret, Garruk, Saheeli, Kiora, Teyo, Dovin) |
| Win lines | AWBO, ultimates, Ajani U Cadets, Tam proliferate | + Dina/Blight-Priest × Paradox drain, Dina/Blight-Priest × Conqueror loop, Doubling Season instant ultimates, Sunfall incubator |
| Avg MV (nonland) | 3.32 | 3.28 (3.19 at 31 lands; the four cuts for lands were 1–2 MV) |

## 3. Swaps, ranked (IN | OUT | role | why IN | why OUT is weaker)

| # | IN | OUT | Role | Why IN (oracle) | Why OUT is weaker |
|---|---|---|---|---|---|
| 1 | Doubling Season | Karn, the Great Creator | engine | "If an effect would put one or more counters on a permanent you control, it puts twice that many" — walkers enter at double loyalty, every Mentor/proliferate/empower counter and every token doubled | Karn's "−2: reveal an artifact card you own from outside the game" finds nothing in Arena Brawl (no sideboard, no face-up exiled artifacts); the +1 only animates our own rocks |
| 2 | Bloodthirsty Conqueror | Nissa, Leyline Tamer | drain combo | "Whenever an opponent loses life, you gain that much life" — with Dina, Blight-Priest or Dellian's emblem one life-gain event loops until the opponent is at 0 | 7 MV, WUBR, needs land drops to do anything |
| 3 | Marauding Blight-Priest | Return to the Light Realms | drain | "Whenever you gain life, each opponent loses 1 life" — Paradox makes every loyalty activation 1 damage, Oath doubles it | 9 MV sorcery |
| 4 | Dina, Soul Steeper | Tam's Resistance | drain | same clause at {B}{G} on a 1/3 blocker; second copy of the combo half | one-shot "Empower Jace 4" |
| 5 | Sheoldred, the Apocalypse | Rewrite Regrets | draw/lifegain | "Whenever you draw a card, you gain 2 life" — every draw (Arena, Library, Theorist) is a Mentor trigger; "Whenever an opponent draws a card, they lose 2 life" | needs a walker already in the graveyard |
| 6 | Kiora, Behemoth Beckoner | Zariel, Archduke of Avernus | walker | "−1: Untap target permanent" — second Tam proliferate or Lotus each turn; 7 loyalty for 2 mana under Tam | 4 MV; devils only chump |
| 7 | Teyo, the Shieldmage | Ral Zarek, Guest Lecturer | walker/protection | "You have hexproof." + "−2: Create a 0/3 white Wall creature token with defender" at 2 mana | duplicate Ral type; "−2: Return target creature card with mana value 3 or less" is the only real mode |
| 8 | Dovin, Hand of Control | Quintorius Kand | walker/protection | "−1: Until your next turn, prevent all damage that would be dealt to and dealt by target permanent an opponent controls" — neutralises their best attacker every turn at 2 mana | 5 MV for the same engine value per activation |
| 9 | The Wanderer | Garruk, Veiled Butcher | walker/protection | "Prevent all noncombat damage that would be dealt to you and other permanents you control" — burn cannot kill a walker; "−2: Exile target creature with power 4 or greater" | 5 MV BB, duplicate Garruk type, edict is symmetrical |
| 10 | Teferi's Protection | Boros Charm | protection | "All permanents you control phase out" — survives exile, bounce, −X/−X and wipes; "your life total can't change" | indestructible only; dies to exile/bounce |
| 11 | Heroic Intervention | Vigorbloom Charm | protection | "Permanents you control gain hexproof and indestructible" — whole board for 2 | Vigorbloom's mode covers one permanent |
| 12 | Authority of the Consuls | Eye of Jace | lifegain/protection | "Creatures your opponents control enter tapped. Whenever a creature an opponent controls enters, you gain 1 life." — no haste hits on walkers, Mentor trigger on their turn | surveil 1 per upkeep |
| 13 | Chromatic Lantern | Azorius Signet | ramp | "Lands you control have '{T}: Add one mana of any color.'" | two colours, {1} to activate |
| 14 | Bloom Tender | Simic Signet | ramp | "For each color among permanents you control, add one mana of that color" — 2 MV, taps for 2–5 | nets one mana |
| 15 | Timeless Lotus | Izzet Signet | ramp | "{T}: Add {W}{U}{B}{R}{G}" — Tam's activation from one card | two colours |
| 16 | Jegantha, the Wellspring | Gruul Signet | ramp | "{T}: Add {W}{U}{B}{R}{G}" — Tam's activation is all coloured; 5/5 body | two colours |
| 17 | Evolution Sage | Rakdos Signet | engine | "Landfall — Whenever a land you control enters, proliferate" — Paradox grants extra land drops, fetches trigger twice | two colours |
| 18 | Flux Channeler | Golgari Signet | engine | "Whenever you cast a noncreature spell, proliferate" — 53 of 68 nonlands are noncreature; Wizard for Retort | two colours |
| 19 | Captain Sisay | Boros Signet | tutor | "{T}: Search your library for a legendary card" — 19 walkers, 10 Ways, Oath, Lotus, Sheoldred, Esika, every turn | two colours |
| 20 | Swords to Plowshares | Arcane Amphisbaena | removal | "Exile target creature" for {W} | 1/1 with "empower Jace 2" |
| 21 | Path to Exile | Identity Echo | removal | "Exile target creature" for {W} | {3}{R} per activation, sorcery speed |
| 22 | Lightning Helix | Plan for All Outcomes | removal | "deals 3 damage to any target and you gain 3 life" — Mentor trigger, hits walkers | 4 MV, target goes to library top (returns) |
| 23 | Sunfall | Protege's Awakening | wipe | "Exile all creatures. Incubate X" — spares every walker, leaves us an X/X | 4 MV empower 6 + one card |
| 24 | Counterspell | Mountain | counter | "Counter target spell." | 36 lands + 10 rocks was 46 sources |
| 25 | Deathcap Glade | Mountain | land | "enters tapped unless you control two or more other lands. {T}: Add {B} or {G}" | one colour (Wizard's Retort held this slot at 31 lands; cut when the count rose, §7) |
| 26 | Phyrexian Arena | Swamp | draw | "At the beginning of your upkeep, you draw a card and lose 1 life" — with Sheoldred a net gain and a Mentor trigger | as above |
| 27 | Sylvan Library | Forest | draw | "you may draw two additional cards… pay 4 life or put the card on top" — free selection every turn | as above |
| 28 | Enlightened Tutor | Island | tutor | "Search your library for an artifact or enchantment card… put that card on top" — Doubling Season, AWBO, Oath, any Way, Lotus | as above |
| 29 | Command Tower | Hall of Echoes | land | "Add one mana of any color in your commander's color identity" | colourless; "{5}: becomes a copy of target creature" |
| 30 | Hallowed Fountain | Fatehold Annex | land | untapped always ("you may pay 2 life"), Plains Island types for fetches/Verges/checklands | "enters tapped unless you control a planeswalker" — tapped turns 1–2 and after any walker wipe |
| 31 | Godless Shrine | Meticulous Commons | land | same | same |
| 32 | Steam Vents | Innovative Commons | land | same | same |
| 33 | Blood Crypt | Stingerquill Annex | land | same | same |
| 34 | Overgrown Tomb | Formidable Commons | land | same | same |
| 35 | Stomping Ground | Konstrari Annex | land | same | same |
| 36 | Sacred Foundry | Dedicated Commons | land | same | same |
| 37 | Temple Garden | Vigorbloom Annex | land | same | same |
| 38 | Breeding Pool | Transformative Commons | land | same | same |
| 39 | Flooded Strand | Plains | land | "Search your library for a Plains or Island card, put it onto the battlefield" — any of 6 shocks; two landfall triggers for Evolution Sage | one colour |
| 40 | Misty Rainforest | Plains | land | "Forest or Island card" | one colour |
| 41 | Scalding Tarn | Plains | land | "Island or Mountain card" | one colour |
| 42 | Great Hall of the Citadel | Plains | land | "{1}, {T}: Add two mana in any combination of colors. Spend this mana only to cast legendary spells" — every walker, Way, Oath | one colour |
| 43 | Urborg, Tomb of Yawgmoth | Island | land | "Each land is a Swamp" — Beacon, Great Hall, Bastion, Yavimaya tap for B; Bleachbone Verge and Woodland Cemetery always on | one colour |
| 44 | Multiversal Passage | Island | land | "choose a basic land type. Then you may pay 2 life. If you don't, it enters tapped" — the colour you are missing | one colour |
| 45 | Karn's Bastion | Island | land | "{4}, {T}: Proliferate" — uncounterable instant-speed proliferate on a land; Tekuthal doubles it | one colour |
| 46 | Riverpyre Verge | Mountain | land | "{T}: Add {R}. {T}: Add {U}. Activate only if you control an Island or a Mountain" — never tapped | one colour |
| 47 | Sunbillow Verge | Mountain | land | "{T}: Add {W}. {T}: Add {R}…Mountain or a Plains" | one colour |
| 48 | Willowrush Verge | Mountain | land | "{T}: Add {U}. {T}: Add {G}…Forest or an Island" | one colour |
| 49 | Bleachbone Verge | Swamp | land | "{T}: Add {B}. {T}: Add {W}…Plains or a Swamp" — Urborg turns it on | one colour |
| 50 | Woodland Cemetery | Swamp | land | "enters tapped unless you control a Swamp or a Forest. {T}: Add {B} or {G}" — Urborg turns it on | one colour |
| 51 | Hinterland Harbor | Forest | land | "unless you control a Forest or an Island. {T}: Add {G} or {U}" — 8 typed lands turn it on | one colour |
| 52 | Yavimaya Coast | Forest | land | "{T}: Add {C}. {T}: Add {G} or {U}. This land deals 1 damage to you" — untapped always | one colour |
| 53 | Shattered Sanctum | Plains | land | "enters tapped unless you control two or more other lands. {T}: Add {W} or {B}" — tapped only as land 1–2 | one colour |
| 54 | Sundown Pass | Tomik, Orzhov Lawmage | land (count 31→35, §7) | "{T}: Add {R} or {W}", slow land | weakest kept card overall: "No more than one creature can attack this planeswalker each combat" only matters when the opponent has two attackers and stacks them on one walker; 1/2 body |
| 55 | Deserted Beach | Loyal Tutor | land (§7) | "{T}: Add {W} or {U}", slow land | "put that card on top" — card-neutral, arrives a turn later; Sisay/Pia/Enlightened Tutor remain |
| 56 | Overgrown Farmland | Erode | land (§7) | "{T}: Add {G} or {W}", slow land | "Its controller may search their library for a basic land" — ramps the opponent; Swords/Path/Helix cover the role |

### 3b. Mana base rebuild (first role rebuilt, no cap — every basic and every FRA Annex/Commons faced the best remaining owned land)

- **Basics remaining: none.** Every basic lost to an untapped or near-untapped two-colour land. The only payoffs that read basic
  land TYPES (Flooded Strand / Misty Rainforest / Scalding Tarn, the 4 Verges, Hinterland Harbor, Woodland Cemetery) are fed by
  the 9 typed shocks, Theorist's Sanctum (Island) and Urborg ("Each land is a Swamp"); Fabled Passage / Escape Tunnel / Evolving
  Wilds / Terramorphic Expanse were therefore rejected ("Search your library for a basic land card" finds nothing) rather than
  kept alongside a basic — a shock + fetch pair beats a basic + Fabled Passage pair on every turn.
- **FRA Annex/Commons: 9 of 10 out**, each to the shock of the same pair ("enters tapped unless you control a planeswalker" vs
  "you may pay 2 life"). Theorix Annex (UB) kept: every other owned UB land enters tapped unconditionally (Treno, Serpent's Pass,
  Sinister Hideout, Oscorp Industries, Waterlogged Teachings), Murky Sewer needs a player at ≤13, Hidden Lair needs a basic;
  Watery Grave is not owned.
- **Ranking used** (untapped turns first, then colours): shocks (9, all owned; Watery Grave missing) > fetches (3 owned) >
  Verges (4 owned, one colour always untapped) > checklands (only Hinterland Harbor and Woodland Cemetery owned; both always on
  with the shocks + Urborg) > Yavimaya Coast (only painland owned) > slow lands (Rockfall Vale kept; Shattered Sanctum,
  Sundown Pass, Deserted Beach, Overgrown Farmland, Deathcap Glade added; Dreamroot Cascade and Stormcarved Coast lose only
  because 35 slots are full and every colour already has 11–15 sources) > fast lands (Spirebluff Canal, Concealed Courtyard: tapped from
  land 4 on, ≈60 % of positions vs ≈25 % for a slow land) > Annex/Commons > Triomes (Jetmir's Garden, Savai Triome), tri-lands,
  Temples, surveil lands, gain lands, Thriving lands, Guildgates, FF/Avatar/Marvel towns (all enter tapped unconditionally).
- **Utility lands kept/added and why:** Command Tower (any colour), Interplanar Beacon and Great Hall of the Citadel (two
  coloured mana for walker / legendary spells — 30 of 68 nonlands), Karn's Bastion (repeatable proliferate), Urborg (turns on
  Bleachbone Verge and Woodland Cemetery, gives B to the three colourless lands), Multiversal Passage (any one type, untapped
  for 2 life), Otawara / Takenuma (untapped mono, channel utility), Theorist's Sanctum (Island type, empower sink).
  Rejected: Hall of Echoes (colourless, "{5}: becomes a copy"), Cavern of Souls / Secluded Courtyard / Unclaimed Territory
  (coloured mana only for one creature type), Thespian's Stage, Gateway Plaza / Command Bridge (tapped + tax), Mount Doom
  (BR pain, but B and R already at 10 sources and the slot went to Shattered Sanctum's WB).
- Not owned (checked in the pool): Watery Grave, Plaza of Heroes, Mana Confluence, City of Brass, Reflecting Pool, Exotic
  Orchard, the Pathways, the other Triomes, the other checklands and painlands.

## 4. Stop proof (best remaining candidate vs weakest kept card, per role)

Scale: every walker on the battlefield is worth the same to the engine per activation (Paradox 1 life → Mentor +1 on every
walker → Dina/Blight-Priest 1 damage → AWBO), so among walkers mana cost decides and abilities break ties; among non-walkers a
repeatable permanent beats a one-shot at equal cost; cost is counted after Tam's {1} discount.

- **Walkers.** Best remaining: Huatli, the Sun's Heart ({2}{G/W}, "−3: You gain life equal to the greatest toughness"), Ashiok
  ({1}{U/B}{U/B}, "−1: Target player mills four cards"), Quintorius Kand, Garruk Veiled Butcher, Ob Nixilis ({3}{B}{B}, "−2: Destroy
  target creature. Its controller draws two cards"). Weakest kept: Saheeli ("Whenever you cast a noncreature spell, create a 1/1
  colorless Servo") — a blocker every spell (53 noncreature nonlands), each Servo an artifact entering for Tezzeret, doubled by
  Doubling Season, at the same 2 mana as Huatli/Ashiok; Kand/Garruk VB/Ob Nixilis cost 4 for the same engine value. Huatli's −3
  is one extra life-gain event every third turn; type count only matters for walkers on the board.
- **Ways / empower glue.** All 10 Ways kept (operator rule; no oracle reason found). Best remaining: Mindseeker Oculus ("When this
  creature enters, empower Jace 4"), Contentious Plan ("Proliferate. Draw a card") — lose to Flux Channeler, the weakest kept
  engine piece, which proliferates on every noncreature spell for the rest of the game.
- **Proliferate / multipliers.** Best remaining: Cayth ("{2}, {T}: Proliferate", 4 MV + 2 per use) loses to Evolution Sage (free on
  every land drop). Doc Samson ("put that many plus one") — pool gives no P/T, so its mana half cannot be scored; the counter
  clause alone loses to Timeless Lotus, which turns Tam's WUBRG proliferate on every turn. Panharmonicon rejected: "If an artifact
  or creature entering causes a triggered ability" — Ways are enchantments. Loading Zone rejected: "creature, Spacecraft, or
  Planet" only.
- **Life-gain / drain.** Best remaining: South Wind Avatar ({3}{B}, third "Whenever you gain life, each opponent loses 1 life"),
  Pristine Talisman ("{T}: Add {C}. You gain 1 life"), Kambal. Avatar loses to Dina (same clause at 2 MV) and to the weakest kept
  overall, Tomik (2 MV, "No more than one creature can attack this planeswalker each combat", taps for any colour under Esika).
  Pristine Talisman loses to Arcane Signet: colourless at 3 vs any colour at 2 on the turn that casts Tekuthal/Theorist.
- **Protection.** Best remaining: Tomik (cut for land 35, §7), Flare of Fortitude ({2}{W}{W}, "hexproof and indestructible"),
  Privileged Position ({2}{G/W}{G/W}{G/W}, "Other permanents you control have hexproof"), Aetherize/Settle the Wreckage. Weakest
  kept: Authority of the Consuls ({W}, "Creatures your opponents control enter tapped" + a Mentor trigger per creature) — a
  1-mana permanent; Flare loses to Heroic Intervention (same text at {1}{G}), Privileged Position to The Wanderer/Teyo (walker
  bodies that protect and also activate), Tomik to a fifth colour source (§7).
- **Removal.** Best remaining: Erode (cut, §7), Hero's Downfall ({1}{B}{B}), Bitter Triumph ({1}{B} + "discard a card or pay 3
  life"), Beast Within ({2}{G}, any permanent, gives a 3/3), Fracture ({W}{B}, no creatures), Withering Curse ({1}{B}{B}, "destroy
  all creatures" with Infusion — would kill the deck's 14 engine creatures). Weakest kept: Lightning Helix ({R}{W}, "3 damage to any
  target and you gain 3 life") — hits walkers and face, and the life gain is a Mentor/Dina trigger; Erode ramps the opponent.
- **Counters.** Best remaining: Wizard's Retort (cut, §7 — "costs {1} less if you control a Wizard. Counter target spell."), Dovin's
  Veto, An Offer You Can't Refuse, Swan Song, Negate ("noncreature" only). Weakest kept: Countersculpt ("Counter target spell.
  Empower Jace 1", behold a Jace instead of {1}) — a hard counter that grows the Jace token; Retort is the same effect with no
  upside and lost its slot to the fourth added land.
- **Draw.** Best remaining: Tezzeret's Gambit ({3}{U/P}, "Draw two cards, then proliferate"), Bloombrute ({2}{G}{W}, "Whenever you
  gain life, draw a card. This ability triggers only once each turn"), Matoya, Up the Beanstalk. Gambit is a one-shot; Bloombrute
  is a 4-MV creature giving one card a turn — both lose to Sylvan Library (2 MV, sees three cards every draw step, Sheoldred
  refunds the life) and to Tomik as the weakest kept overall (repeatable permanent at 2).
- **Tutors.** Best remaining: Loyal Tutor (cut, §7 — "put that card on top"), Emeritus of Woe // Demonic Tutor (4-MV creature
  "enters prepared"; the {1}{B} copy fires once, re-prepares only "if two or more creatures died this turn"), Mystical Tutor (only
  10 instants/sorceries to find). Weakest kept: Pia ({2}{G}, "search your library for an enchantment card… put it into your hand"
  on a body) — the card arrives in hand at once and finds a Way, Doubling Season, AWBO or Oath.
- **Ramp / fixing.** Best remaining: Paradise Druid ({1}{G}, "{T}: Add one mana of any color", hexproof untapped) loses to Arcane
  Signet — same cost and output, but the Signet survives Sunfall/Overwrite; Great Divide Guide fixes without adding mana;
  Haunted Screen (3 MV) loses to Chromatic Lantern (3 MV, also fixes every land). Codie rejected: "You can't cast permanent spells."
- **Lands.** Best remaining: the two other slow lands (Dreamroot Cascade GU, Stormcarved Coast UR — "enters tapped unless you
  control two or more other lands"), then Spirebluff Canal / Concealed Courtyard (fast, tapped from land 4), Mount Doom (BR, 1 life
  per tap), the other 9 Annex/Commons, Triomes/tri-lands/Temples/gain-lands (always tapped). Weakest kept: Deathcap Glade (BG
  slow) — a same-class land; replacing it with another slow land changes only the colour pair, and all ten pairs are covered with
  every colour at 11–15 sources plus Tower / Passage / Lantern / Bloom Tender, so no remaining land improves the base. A 36th land
  would cost the next nonland (Countersculpt, the second hard counter) for +1.7 points on the turn-3 metric (§7) — rejected.

Full pass after the 56th swap: no candidate in any role beats the weakest kept card of that role or the weakest kept card overall
(Countersculpt: a 2-mana one-shot that is still the deck's second hard counter; the best remaining nonland candidates — Huatli,
Tomik, Saheeli-class walkers, Tezzeret's Gambit, Paradise Druid — add a 20th walker, a blocker or a one-shot the 19 walkers and
6 protection pieces already supply). Fixed point reached.

## 5. Gate

```
MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-tam/final.txt --format brawl --owner 1 --source arena
  PASS  size        100 cards (brawl wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in brawl
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BGRUW
  PASS  ownership   all cards owned; arena collection imported 0 days ago
  WARN  arenaNames  2 card(s) must be exported front-face only: Shatterskull Smashing, Esika, God of the Tree (already front-face in final.txt)
  WARN  lands       35 lands (+1 MDFC land backs = 35.4 effective); Karsten wants 40 ±2  (the gate counts lands only; lands + ½ × 7 rocks = 38.5, inside the band — §7)
  FAIL  plan        5/64 nonland cards interact (8%) — commander wants: general value  (known: gate has no superfriends plan)
  PASS  curve       avg MV 3.28; commander sets no cost threshold
  PASS  wincons     10 win condition(s)/closer(s)
  PASS  locks       12 locked card(s) present and intact
```

## 6. Mulligan / play notes

- Keep: 3+ lands (or 2 + Mox/Signet/Bloom Tender) with a 2-mana walker or a Way. Mull 7-land hands and hands with no play before turn 3.
- Turn order: Way of the Paradox and Way of the Mentor first (Pia/Enlightened Tutor/Sisay find them); then the cheapest walkers.
- Activate Paradox loyalty before Withering-type sorceries and before Mortality-type costs — the life gain is the trigger for everything.
- Kiora −1 / Tezzeret 0 untap Tam after his WUBRG proliferate for a second one; Tekuthal doubles both.
- Dina or Blight-Priest + Conqueror: any life gain ends the game — Ajani Resolute's 0 is the cheapest starter.
- Hold Teferi's Protection / Heroic Intervention for the wipe; Sunfall and Overwrite exile our own creatures, so cast them only to save the walkers.
- Against burn-heavy decks resolve The Wanderer early; against go-wide, Authority, Teyo walls, Dovin −1, Tomik.
- Doubling Season: cast walkers after it (double starting loyalty → ultimates the same turn with Oath).

## 7. Land count

Monte Carlo, 200,000 games per row (`%TEMP%\tam-landsim.mjs`): 99-card library, 7-card hand, Arena Brawl free first mulligan
(re-draw 7 when the hand holds fewer than 2 or more than 5 lands/2-drop rocks), on the play (no draw turn 1) and on the draw.
Only mana producers count: lands, plus Arcane Signet / Bloom Tender (cast turn 2+, produce the next turn), Chromatic Lantern /
Esika (cast turn 3+ with the mana on board; Esika needs two G-capable lands) — so Lotus, Jegantha and Mox Amber never count in
these windows. Colours: real land colours; Verges' second colour only with the named type on the battlefield; Urborg gives every
land B; Tower / Passage / fetches (any shock reachable) / Signet / Esika count as any colour; Lantern makes every land any colour;
Beacon, Great Hall and Karn's Bastion count as colourless. Lands added above 31 in this order: Sundown Pass, Deserted Beach,
Overgrown Farmland, Deathcap Glade, Dreamroot Cascade, Stormcarved Coast.

| Lands | P(≥3 sources by T3) play / draw | P(≥5 lands by T5) play / draw | P(≥4 of 5 colours by T5) play / draw | lands + ½ rocks |
|---|---|---|---|---|
| 31 | 73.9 / 81.4 | 28.0 / 36.8 | 79.8 / 84.0 | 34.5 |
| 33 | 77.9 / 84.8 | 33.3 / 42.8 | 82.6 / 86.5 | 36.5 |
| **35** | **81.7 / 87.9** | **38.9 / 49.0** | **85.1 / 88.7** | **38.5** |
| 37 | 84.5 / 90.3 | 44.0 / 54.9 | 86.9 / 90.4 | 40.5 |

Lands only, no mulligan, no rocks (team-lead's hypergeometric over the 99-card library) — the floor the rocks and the free
mulligan lift from:

| Lands | P(≥3 lands T3) play / draw | P(≥4 lands T4) play | P(≥5 lands T5) play / draw |
|---|---|---|---|
| 31 | .58 / .66 | .38 | .23 / .30 |
| 33 | .63 / .71 | .44 | .28 / .36 |
| **35** | **.68 / .76** | **.50** | **.33 / .43** |
| 37 | .73 / .80 | .56 | .39 / .49 |

Choice: **35**. Rule: the smallest count that puts lands + ½ rocks inside the gate's Karsten band (39 ±2 at the 31-land curve,
40 ±2 at the 35-land curve, i.e. lower bound 37–38) and P(≥3 sources by turn 3) above 80 % on the play. 31 fails both; 33 fails both; 35 passes; 37
buys +2.8 / +5.1 / +1.8 points for two more nonland cuts (Countersculpt and Saheeli next in the ranking) — the second hard counter
and the 19th walker are worth more than those points. Every extra land costs about 1.7 points on the turn-3 metric and 2.7 on the
turn-5 metric, so the marginal land is worth roughly one cheap interaction spell; the cuts made (Tomik, Loyal Tutor, Erode,
Wizard's Retort) were the four weakest cards by the section-4 ranking. Tam's proliferate needs five coloured sources: at 35 lands
with 7 producers, P(≥4 colours by turn 5) is 85–89 %, and the fifth colour arrives with Tower / Passage / Lantern / Lotus / Jegantha.
