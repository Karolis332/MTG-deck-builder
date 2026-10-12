# Arena Jace, Multiverse Architect — planeswalker (superfriends) fixed-point build (2026-10-01)

Base: `quick-v2.txt` (lead's list = `start.txt` + Tomik + 7 walkers + all 8 owned Ways, Ways locked). Inputs: `walker-cards.md` (33 walkers + 134
support), `../arena-jace/screen-01..08.md`, `../arena-jace/pool-01..08.md`, `../arena-jace/deck.md`. Output: `final.txt` (100, commander first) =
**quick-v2 + 6 swaps**. Sims in `sim/` (`landsim.py` 40,000 games per row and side, `hits.py`). Nothing outside `arena-jace-pw/` was written.

## 1. Plan and win lines

Commander (deck.md): "At the beginning of combat on each opponent's turn, they may pay {2}. If they don't, creatures they control can't attack Jaces
you control this turn. | +1: Draw two cards, then put a card from your hand on the bottom of your library. | −3: Exile another target planeswalker or
creature you control. Reveal cards from the top of your library until you reveal a creature or planeswalker card. Put that card onto the battlefield
and the rest on the bottom of your library in a random order." Plan: a Way or a walker every turn from turn 2 (8 Ways = 8 Jace tokens, 34 loyalty,
each a Jace the static protects and a −3 target; 18 walkers, 12 at MV ≤ 4). Every walker carries the Ways' abilities: Pyromancer "+1: Add {R}" turns
the eight minus-only walkers (Narset, Teyo, Kasmina, Dovin, Wanderer, Ob, Saheeli, Eternal) into growing ones, Healer −2 Cadet, Deathbringer −2 Beast,
Warlord −4 burn, Cryomancer −3 copy; Necromancer pays +1 on every walker per creature death, Mentor per lifegain, Mind Sculptor draws on every −2/−3/−4.
Spent walkers and tokens go to the −3 / Identity Echo ({3}{R}, sorcery speed, no cap) for a fresh walker (72 %) or Zetalpa / Norn / Sheoldred (16 %).
Win lines: (a) Warlord −4 on N walkers = 2N to face a turn plus Cadet / Beast / Samurai attacks under Norn; (b) All Will Be One — every +1, every
empower (5 per Way), every proliferate and Mentor trigger is damage; (c) ultimates (Chandra ToD −7, Ral −10, Ajani OC −8, Kaito CI −9, Theorist −6);
(d) a Zetalpa reveal (8 a turn, blocks with vigilance); (e) Sheoldred + Ob Nixilis drain on their draws under Narset.

## 2. Health table (start = creature build; quick-v2 = base; final; nonland avg MV over the 99, land faces counted as lands)

| metric | start | quick-v2 | final |
|---|---|---|---|
| lands (front + MDFC backs) | 31 + 4 = 35 | 35 | 35 (Mystic Monastery → Interplanar Beacon) |
| ramp / rocks | 9 | 9 | 9 + Beacon (2 colours for walkers) + Pyromancer "+1: Add {R}" on every walker |
| cantrips | 3 | 3 | 0 (Jace +1, Theorist, Ring, Talent, Ral −3, Kaito/Kasmina loot, Kaito BoN surveil, Narset −2, Mind Sculptor draws) |
| draw engines | 3 + Jace +1 | 4 (+ Mind Sculptor) | 4 + Jace +1 |
| counters | 7 | 5 | 5 (Counterspell, Countersculpt, Veto, Offer, No More Lies) |
| spot removal | 12 + 3 MDFC | 8 + 3 MDFC | 7 + 3 MDFC + 10 repeatable abilities (Ob −2, Garruk +2/−2, Chandra ToD −3, Ajani OC −2, Wanderer −2, Eternal +1/−4, Dovin −1, Kaito BoN −2, Warlord −4 on all, Norn −2/−2) |
| wipes sparing walkers | 4 | 3 | 2 (Sunfall, DoJ) + Eternal −4, Ajani Unrelenting −3, Garruk −2 |
| protection | Teferi's + Teyo, Kasmina, 3 lands | + Tomik, Dovin | + The Wanderer (no noncombat damage), Appa (instant airbend), Garruk +2, static on 9 Jaces |
| loyalty engines | 3 (Oath, Chandra AoF 0, Ral) | 7 (+ Mentor, Necromancer, Pyromancer, Kaito BoN) | 10 (+ Flux Channeler, Appa reset, AWBO payoff) |
| walkers (count / MV 3-4-5-6) | 10 / 5-4-0-1 | 17 / 6-6-3-2 | 18 / 6-7-3-2 (+ The Wanderer) |
| creatures (count / avg −3 hit) | 9 / 8.78 | 4 / 6.75 | 7 / 6.57 (Zetalpa 10; Sheoldred, Norn 9; Wan Shi Tong 7; Appa 6; Channeler 3; Tomik 2) |
| Ways | 3 | 8 | 8 (locked) |
| −3 hits: n, P(walker), E[hit], E[cast], P(≥8) | 19, 53 %, 7.21, 4.84, 42 % | 21, 81 %, 6.10, 5.95, 14 % | 25, 72 %, 6.12, 5.80, 16 % |
| token / fodder makers (noncreature) | 19 | 8 Ways + Protege, VFM, Countersculpt, Sokenzan, Sanctum + 12 walkers | same + Appa Allies; Healer −2 on every walker |
| avg MV (nonland) | 2.95 | 2.79 | 2.97 |

## 3. Swaps against quick-v2, ranked (IN | OUT | role | why IN (oracle) | why OUT is weaker)

| # | IN | OUT | role | why IN | why OUT is weaker |
|---|---|---|---|---|---|
| 1 | Appa, Steadfast Guardian | Ponder | protection / reset | "Flash ... When Appa enters, airbend any number of other target nonland permanents you control (Exile them. While each one is exiled, its owner may cast it for {2})" — every spent walker recast fresh for {2}, every Way recast for {2} = empower 5 again, the targeted walker saved at instant speed; "Whenever you cast a spell from exile, create a 1/1 white Ally" | 1-mana smoothing in a list with 35 faces, 9 rocks, Beacon and 10 draw/filter effects |
| 2 | The Wanderer | Preordain | walker / protection | "Prevent all noncombat damage that would be dealt to you and other permanents you control" — 18 walkers and 8 Jace tokens immune to Bolt, Chandra, Fiery Confluence; "−2: Exile target creature with power 4 or greater"; carries the Way abilities (5 loyalty, 4 mana) | same as Ponder |
| 3 | Flux Channeler | Terminate | loyalty engine | "Whenever you cast a noncreature spell, proliferate" — 43 noncreature spells; every Way, counter, removal and rock is +1 on every walker and the Jace token | the 8th kill spell; 7 instants/sorceries, 3 MDFC and 10 walker abilities remain; the cost is one hit of 3 in 25 |
| 4 | All Will Be One | Overwrite the Multiverse | win line | "Whenever you put one or more counters on a permanent or player, this enchantment deals that much damage to target opponent ..." — each Way cast = 5, each +1 = 1, each proliferate = walkers on the table, Mentor + Sheoldred + Jace +1 = 2 × walkers | 6-mana sorcery; Sunfall, DoJ, Norn, Eternal −4, Ajani −3, Garruk −2 cover the wipe; its empower X is what 8 Ways already do |
| 5 | Zetalpa, Primal Dawn | Brainstorm | −3 finisher | "Flying, double strike, vigilance, trample, indestructible" — 8 a turn and a blocker for the walkers; survives DoJ, Sunfall's rival wipes, damage | Brainstorm without a shuffle is card-neutral; the deck's selection is Jace +1 and 10 draw effects; one dead early draw a game (bottomed by +1) for a 4 % reveal that ends the game |
| 6 | Interplanar Beacon | Mystic Monastery | land | untapped; "{1}, {T}: Add two mana of different colors. Spend this mana only to cast planeswalker spells" (19 walker spells); "Whenever you cast a planeswalker spell, you gain 1 life" (Mentor +1 on every walker) | enters tapped; sim Jace-by-T5 61.2 / 71.2 → 61.7 / 71.6 with Beacon |

Rules corrections applied (from the creature-version review): Valgavoth has ward, not indestructible (not in this list); Nissa's landfall reveals creatures
only and bottoms walkers (not in this list); Sunfall's Incubator is fodder only after {2}; Theorist's Sanctum grows the existing Jace token and makes a
new one only when none is out; Identity Echo has no once-per-turn cap.

## 4. Stop proof

**Every walker in `walker-cards.md` (33), ranked; IN = kept.** Quotes from that file. With 8 Ways every walker also has +1 R / −2 Cadet / −2 Beast / −4
burn / −3 copy, so loyalty per mana and castability weigh more than a walker's own text.

| walker (MV) | verdict |
|---|---|
| Jace, Multiverse Architect (5) | commander |
| Narset, Parter of Veils (3) | IN — "Each opponent can't draw more than one card each turn"; −2 finds a Way / counter; 5 loyalty at 3 |
| Chandra, Torch of Defiance (4) | IN — "+1: Exile the top card ... or 2 damage", "−3: 4 damage", RR ramp, −7 emblem |
| Ral, Crackling Wit (4) | IN — "Whenever you cast a noncreature spell, put a loyalty counter on Ral" (43 spells); −3 draw 3 |
| The Theorist, Jace Beleren (4) | IN — "At the beginning of each opponent's draw step, you draw a card"; a Jace under the static |
| Garruk, Veiled Butcher (5) | IN — "+2: ... -4/-1 until your next turn" (neutralise + grow), "−2: Each player sacrifices ... 4/4 Beast", exile static |
| Ob Nixilis, the Hate-Twisted (5) | IN — "−2: Destroy target creature" ×2; "Whenever an opponent draws a card, ... 1 damage" (+ Sheoldred 2) |
| Quintorius Kand (5) | IN — "+1: Create a 3/2 ... Spirit"; "−3: Discover 4"; cast from exile = 2 damage + 2 life (Mentor) |
| The Eternal Wanderer (6) | IN — "No more than one creature can attack"; 0: 2/2 double strike; −4 one-sided sweep |
| Ajani Unrelenting (6) | IN — "Whenever you activate a loyalty ability, create a 2/2 ... Cadet" (4–8 a turn with Oath); "−3: 4 damage to each creature except for tokens you control" |
| The Wanderer (4) | IN — swap 2 |
| Kasmina, Enigmatic Mentor (4) | IN — "Spells your opponents cast that target a creature or planeswalker you control cost {2} more"; −2 body + loot |
| Kaito, Cunning Infiltrator (3) | IN — loyalty on combat damage by Cadets / Servos / Spirits; −2 Ninja; −9 emblem |
| Chandra, Acolyte of Flame (3) | IN — "0: Put a loyalty counter on each red planeswalker" (Jace, both Chandras, Ral, Quintorius, Saheeli); two haste Elementals = same-turn fodder that die at end step (Necromancer +1 on every walker); −2 recasts Bolt / VFM |
| Ajani, Outland Chaperone (3) | IN — "+1: Create a 1/1 ... Kithkin"; −2 kills a tapped attacker |
| Saheeli, Sublime Artificer (3) | IN — "Whenever you cast a noncreature spell, create a 1/1 ... Servo"; hybrid cost |
| Teyo, the Shieldmage (3) | IN — "You have hexproof" (discard, burn to face); 0/3 Walls |
| Dovin, Hand of Control (3) | IN — 5 loyalty at 3 mana carrying the Way abilities; "−1: ... prevent all damage that would be dealt to and dealt by target permanent" blanks their commander each turn; tax {1} |
| Kaito, Bane of Nightmares (4) | IN, weakest kept — "0: Surveil 2. Then draw a card for each opponent who lost life" (Sheoldred, Ob, Warlord, Mount Doom make it draw); "−2: ... two stun counters"; 3/4 hexproof body on our turn |
| Karn, the Great Creator (4) | OUT, best remaining — "Activated abilities of artifacts your opponents control can't be activated" is real vs Treasure decks, but "−2: ... from outside the game" has no wishboard in Arena Brawl and "+1: ... noncreature artifact becomes an artifact creature" spends a rock for a body; Kaito BoN's 0 draws and −2 stuns without eating a rock |
| Zariel, Archduke of Avernus (4) | OUT — "0: Create a 1/1 red Devil" once a turn; Healer already gives every walker a Cadet; {2}{R}{R} |
| Ajani Resolute (2) | OUT — "0: You gain 1 life" (Mentor +1 on every walker) is a real engine only with Mentor out; alone the weakest activation in the pool; loses to Tomik as the 2-drop |
| Ashiok, Dream Render (3) | OUT — "−1: Target player mills four cards" is hate, not board |
| Davriel, Rogue Shadowmage (3) | OUT — "−1: Target player discards a card"; the 2 damage needs an empty hand |
| Ral Zarek, Guest Lecturer (3) | OUT — "−2: Return target creature card with mana value 3 or less" reaches only Channeler and Tomik |
| Angrath, Captain of Chaos (4) | OUT — "Creatures you control have menace"; "−2: Amass Zombies 2" |
| Nahiri, Storm of Stone (4) | OUT — "−X: ... damage to target tapped creature" only |
| Jaya, Venerated Firemage (5) | OUT — "+1 damage" for red sources; "−2: 2 damage" |
| Chandra, Novice Pyromancer (4) | OUT — "−1: Add {R}{R}" (Pyromancer gives that to everyone); "−2: 2 damage" |
| Kaya, Bane of the Dead (6) | OUT — "−3: Exile target creature" twice; loses to Eternal Wanderer at the same cost |
| Tezzeret, Cruel Captain (3) | OUT — "−3: Search ... mana value 1 or less" finds Mox Amber; 0 untaps a rock |
| Quintorius, History Chaser (4) | OUT — "Whenever one or more cards leave your graveyard" never fires here |
| Ral, Monsoon Mage (2) | OUT — a 2-MV creature front: the worst possible reveal |

**Ways (8, locked).** Each was checked for "strictly worse than a replacement": Healer (Cadet + surveil on every walker) and Deathbringer (4/4 from any
fodder) beat any spell; Mentor fires on Sheoldred draws, Beacon casts, Quintorius, Valgavoth-less lifelink from Ajani Unrelenting's Cadets under Norn —
no; Pyromancer gives eight minus-only walkers a plus ability, Necromancer pays every Deathbringer sacrifice, chump block and Chandra Elemental back as +1
on every walker — neither is strictly worse than the 2-mana spell that would replace it (Erode / Bitter Triumph); Warlord's −4 is the deck's reach;
Mind Sculptor draws on every −2/−3/−4; Cryomancer (copy a counter or removal for −3) is the weakest and would have been Virtue of Knowledge's slot,
but "copy that spell" on every walker is not strictly worse than one 2-mana adventure. None removed.
**Creature / −3 hit.** Weakest kept: Tomik (hit 2; "No more than one creature can attack this planeswalker each combat" on 18 walkers). Best remaining:
Krang ("Flying, trample, indestructible, haste" 9/9 — a second lottery ticket at a colourless 9 that is never cast; Zetalpa's vigilance also blocks),
Valgavoth (ward, not indestructible — dies to DoJ / Sunfall; 9 MV), Armaggon (8 MV; wipes cover it), Nissa (bottoms walkers), Terror of the Peaks
(5-mana body competing with Jace), Doctor Doom (hit 7 / cast 4, no loyalty synergy), Displacer Kitten ("exile up to one target nonland permanent you
control, then return" per spell — resets one walker where Channeler grows all; two dud hits, not three), Gold-Forged Thopteryx (ward {2} — Kasmina,
Teyo and Appa cover targeting; nothing else caps attackers), Bard, Medomai, Appa Loyal (6), Thrummingbird / Grateful Apparition (proliferate only on
combat damage), Teyo Lightshield (one-shot), Theorist's Proxy / Mindseeker Oculus (dud hits for one empower each).
**Engine / loyalty.** Weakest kept: Caretaker's Talent ("Whenever one or more tokens you control enter, draw a card" once a turn — every Way, Healer −2,
Saheeli, Ajani, Quintorius). Best remaining: Virtue of Knowledge ("{1}{U}: Copy target activated or triggered ability" — a second −3 or ultimate; the
5-mana front doubles every Way's empower — the first card in if a Way ever leaves), Experimental Augury ("Proliferate" + instant selection — loses to
Talent, which draws every turn for 3 once), Contentious Plan, Tezzeret's Gambit, Karn's Bastion (sim row 5: −0.7 Jace-by-T5 on the play, under the
baseline), Rewrite Regrets (the −3 already recycles spent walkers), Fatehold Charm (flat empower 2), Gideon's Memorial (walker-only mana — Azorius
Signet also casts Counterspell / DoJ), Loyal Tutor (card-neutral only with a draw), Plan for All Outcomes.
**Counter.** Weakest kept: No More Lies. Best remaining: Negate, Three Steps Ahead (3-mana counter mode), Swan Song (Bird attacks walkers), Spell Pierce,
Remand, Essence Scatter, Louisoix's Sacrifice (3 mana without a legendary creature to sacrifice), Icy Reception, Mana Sculpt / Wizard's Retort (3).
**Spot removal.** Weakest kept: Vraska's Final Mercy (kill or empower 6 for {B}{B}). Best remaining: Erode / Bitter Triumph / Terminate / Fire
Covenant (cut for Ways and engines; 7 spells + 3 MDFC + 10 walker abilities remain — the walkers are the removal), Breathe Your Last, Scorching
Dragonfire, Dreadbore (sorcery), Sheoldred's Edict, Planar Disruption (loses to Moon, which also strips statics), Maestros Charm, Silence the Echo.
**Wipe.** Weakest kept: Day of Judgment. Best remaining: Overwrite (swap 4), Fire Covenant (instant, one-sided — the first card back in if aggro proves
too fast; it lost its slot to Pyromancer under the lock), Settle the Wreckage, Sleep, Urza's Ruinous Blast (exiles 8 rocks, Echo, Talent, AWBO, Moon,
Channeler), Malicious Eclipse / Ruinous Waterbending, Slagstorm (kills Cadets, Servos, Sheoldred).
**Protection.** Weakest kept: Teferi's Protection. Best remaining: Authority of the Consuls (haste stop + Mentor trigger per creature; dead vs control),
Aetherize, Morningtide's Light / Eerie Interference (prevent damage to you, not walkers), Boros Charm (indestructible does not stop loyalty loss),
Dawn's Truce / Flare / Restoration Magic (hexproof — covered), Dáin ("can't attack you" — not walkers), Gideon's Sacrifice.
**Draw.** Weakest kept: Enlightened Tutor (finds any of 8 Ways, Oath, Ring, Echo, AWBO, Talent, Moon). Best remaining: Brainstorm / Ponder / Preordain
(swaps 1, 2, 5), Night's Whisper, Expressive Iteration, Stock Up, Treasure Cruise, Mentor's Guidance, Phyrexian Arena.
**Ramp.** Weakest kept: Azorius Signet. Best remaining: Gideon's Memorial (above), Izzet / Rakdos / Boros Signets (duplicate Talisman pairs), Mind Stone,
Mox Opal, 3-mana any-colour rocks (Lantern also fixes lands), Jeska's Will.
**Land.** Weakest kept: Oscorp Industries (tapped U/B/R). Best remaining: Karn's Bastion (above), the six Annex / Commons duals ("enters tapped unless you
control a planeswalker" — untapped from turn 2–3 here but two colours; Oscorp's third colour covers R; first land swap to test in play), Takenuma (B;
U is the heavier pip), Nomad Outpost (36th face, section 5), Fabled Passage, Temples.
**Roles not in the deck** (weakest overall kept: Caretaker's Talent): Exsanguinate, steal-then-exile (Twisted Fealty etc. need Jace at 4+ the same
turn), Duress / Solve for Disappointment, Dark Depths + Stage (two colourless lands), Painful Quandary, Sleep.

## 5. Mana: Monte Carlo, land count, hit distribution, counts

`sim/landsim.py`, 40,000 games per row and side, seed 20260930; same rules as the creature build (free Brawl mulligan, London to 6, rocks cast
greedily from turn 2, 8 rocks counted, Mox Amber never counted — conservative here, it is live from turn 2–3 with a Way token or walker down; Beacon
and Great Hall = any colour for Jace, colourless otherwise; tapped-ness ignored). "walker on T3" = 3 mana with two of the four colours. % play / draw.

| land faces | 2 lands by T2 | 3 mana by T3 | walker on T3 | 4 mana by T4 | Jace by T4 | Jace by T5 | WUBR by T5 | flood: 7+ lands by T6 | screw: ≤2 lands by T4 |
|---|---|---|---|---|---|---|---|---|---|
| 33 | 98.8 / 99.1 | 89.8 / 93.8 | 89.8 / 93.7 | 75.6 / 83.7 | 29.8 / 38.3 | 56.6 / 67.1 | 86.0 / 88.8 | 6.5 / 10.7 | 13.4 / 8.8 |
| 34 | 99.0 / 99.2 | 90.6 / 94.2 | 90.5 / 94.2 | 77.4 / 85.0 | 30.8 / 39.1 | 58.4 / 68.6 | 85.6 / 88.6 | 7.6 / 12.4 | 12.0 / 7.9 |
| **35** | **99.3 / 99.4** | **91.6 / 95.0** | **91.6 / 95.0** | **79.6 / 86.7** | **33.0 / 40.7** | **61.7 / 71.6** | **85.2 / 88.1** | **8.6 / 14.0** | **10.8 / 7.1** |
| 36 | 99.4 / 99.6 | 92.3 / 95.8 | 92.3 / 95.8 | 80.8 / 87.9 | 34.0 / 42.5 | 63.8 / 73.7 | 86.4 / 89.4 | 9.7 / 15.9 | 10.0 / 6.1 |
| 35, Island → Karn's Bastion | 99.2 / 99.5 | 91.5 / 95.1 | 91.4 / 95.0 | 79.3 / 86.7 | 32.2 / 40.0 | 61.0 / 71.2 | 84.9 / 87.5 | 8.6 / 14.3 | 10.9 / 6.9 |

**Choice: 35 faces (31 lands + 4 MDFC), 8 rocks + Mox Amber, Island kept.** Jace-by-T5 61.7 / 71.6 beats the creature build's 61.2 / 71.2 (Beacon
for Monastery). The 36th face (Nomad Outpost for Talent) buys +2.1 for +1.1 flood; with Pyromancer ramping every walker and Echo / Sanctum / Ways as
sinks, flood is cheaper here than in the creature build, so 36 is the operator's call if games show Jace late. Karn's Bastion costs 0.7 on the play
and falls under the baseline, so Island stays. Tapped or conditional in the 35: Savai, Oscorp (tapped); Sanctum (tapped without a Jace); Stormcarved /
Deserted Beach / Shattered Sanctum / Sundown Pass (tapped as land 1–2); Spirebluff / Courtyard (tapped as land 4+); Starting Town (tapped from turn
4); Verges (paired type — Urborg turns Bleachbone on); shocks and MDFC backs cost life untapped. The gate's Karsten band (38 ±2) sees neither the 9
rocks nor the free mulligan.

**−3 / Identity Echo hit distribution** (`sim/hits.py`; turn-0, uniform over the 25 creature + planeswalker cards; every walker cast from hand shifts
later reveals toward the rest):

| value | cards | P |
|---|---|---|
| 10 | Zetalpa (8) | 1/25 = 4 % |
| 9 | Sheoldred (4), Elesh Norn (7) | 8 % |
| 8 | The Eternal Wanderer (6) | 4 % |
| 7 | Chandra ToD (4), Wan Shi Tong (5), Ob Nixilis (5), Quintorius Kand (5), Garruk (5), Ajani Unrelenting (6) | 24 % |
| 6 | Narset (3), Theorist (4), Kasmina (4), Ral (4), The Wanderer (4), Appa (4) | 24 % |
| 5 | Kaito CI (3), Chandra AoF (3), Saheeli (3), Ajani OC (3), Dovin (3), Kaito BoN (4) | 24 % |
| 4 / 3 / 2 | Teyo (3) / Flux Channeler (3) / Tomik (2) | 4 % each |

P(walker) = 18/25 = **72 %**, P(creature) = 28 %, **E[hit] = 6.12** (quick-v2 6.10, start 7.21), E[cast value of a hit card] = 5.80 (5.95 / 4.84),
P(hit ≥ 8) = 16 %, P(dud ≤ 3) = 8 %, expected MV put onto the battlefield 4.2.

**Why 18 walkers / 7 creatures / 8 Ways.** A hit card is worth ≈ P(drawn) × cast + P(revealed) × hit. With 8 Way tokens feeding the −3 every turn from
turn 5 and Echo behind it, reveals ≈ 4–5 a game, so P(revealed) ≈ 0.2 per hit card; P(drawn by turn 8) ≈ 0.25 with Jace +1. A castable walker (cast
5–7, hit 5–7) scores 2.2–2.7; a 9-MV finisher (1 / 10) 2.25 — a tie on average, but a 10 ends the game on reveal while a dead 8-drop early is bottomed
by the first +1, so one finisher (Zetalpa, the only one that survives every wipe) stays and a second (Krang) loses to Dovin / Kaito BoN. Creatures =
Zetalpa + Norn (the reveal that protects walkers) + Sheoldred (cast 8) + Wan Shi Tong (ETB tuck + fodder) + 3 castable engines (Appa, Channeler, Tomik).
Two dud reveals (8 %) buy two permanent engines; a third dud (Thopteryx, Kitten, Proxy) was refused. Walkers = every walker whose score beats Kaito
BoN's (≈ 2.0) — 18. Ways = 8 (locked; none strictly worse than its replacement, section 4); Ways never appear in a reveal, so they do not touch E[hit].

## 6. Gate

```
MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-jace-pw/final.txt --format brawl --owner 1 --source arena
totals    : 100 cards | 31 lands (32.5 eff.) | 68 nonland | avg MV 3.19
VERDICT   : FAIL
  PASS  size        100 cards (brawl wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in brawl
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BRUW
  PASS  ownership   all cards owned; arena collection imported 0 days ago
  WARN  arenaNames  4 card(s) must be exported front-face only: Sink into Stupor, Fell the Profane, Shatterskull Smashing, Razorgrass Ambush
  WARN  lands       31 lands (+4 MDFC land backs = 32.5 effective); Karsten wants 38 ±2
  FAIL  plan        0/68 nonland cards interact (0%) — commander wants: draws cards
  PASS  curve       avg MV 3.19; commander sets no cost threshold
  PASS  wincons     8 win condition(s)/closer(s)
  PASS  locks       8 locked card(s) present and intact
```
Ownership PASS with plain names, no `A-` name needed. `plan` FAIL is the known gate limit (no superfriends / reveal noun; even Jace's own +1 draw
scores 0). arenaNames lists the four MDFCs, already written front-face only. The lands WARN is answered above.

## 7. Mulligan and play guide

- Keep 7 with 2–4 land faces and a rock, a 2-mana Way or a 3-drop; keep any 3-lander with a Talisman. Free mulligan every 1- and 6-lander; on the draw a 2-lander with a rock is a keep.
- Turn 2 Talisman / Tomik / Necromancer / Pyromancer; turn 3 a 5-loyalty Way (Mentor, Deathbringer, Cryomancer, Warlord) or Narset / Kaito / Teyo / Ajani / Chandra AoF / Saheeli / Dovin / Channeler; turn 4 Healer / Theorist / Chandra ToD / Ral / Kasmina / Wanderer / Ring; turn 5 Jace with a Jace token or spent walker ready.
- Empower adds to the Jace token you already have; a second token only appears once the first is gone — so −3 the token when it is spent, then the next Way makes a fresh one.
- Jace: +1 while nothing is threatened (bottom Zetalpa, shuffle it back with a fetch); −3 the turn a walker or the token sits at 1–2 loyalty. Never −3 a fresh walker.
- Pyromancer's "+1: Add {R}" is the default activation for any walker with nothing better to do — it grows toward Warlord's −4 and pays for Echo.
- Chandra Acolyte the turn before Jace: two haste Elementals — one attacks, one is the −3 fodder; both die at end step for Necromancer's +1 on every walker.
- Oath: +1 then −3 the same turn (4 → 5 → 2); refill with Chandra Acolyte's first 0, Channeler proliferates, Mentor, Necromancer.
- Appa at instant speed: in response to removal on a walker, or at their end step to recast every spent walker and Way for {2} each (each cast makes an Ally).
- All Will Be One once three walkers are down: each Way cast is 5, each +1 is 1, each proliferate is the walker count; Sheoldred + Mentor + Jace +1 = 2 × walkers.
- Hold Counterspell / Countersculpt / Offer for wipes and opposing walkers; Bolt / VFM at end of turn; wipes before a reveal, not after; Sunfall's Incubator needs {2} before it can be fodder.
- Against aggro: DoJ turn 4, Teyo Walls, Tomik, Garruk +2 and Dovin −1 on their best creature, Eiganjo / Razorgrass on attackers; Jace only behind a stable board.
- Against control: Narset first, Veto / Offer for their wipe, Ways as walkers Negate cannot stop, Teferi's Protection on the board wipe; kill turns: Warlord −4 ×N and Cadets under Norn from turn 7, AWBO two turns after it lands, a Zetalpa reveal two turns after it.

## 8. Convergence review (Fable reviewer, 2026-10-01; two full passes, pass 2 found zero improving swaps)

**Applied (2).** Gate re-run: identical verdict (only `plan` FAIL, the known gate limit; avg MV 3.18; ownership / legality PASS for both INs).
| IN | OUT | why |
|---|---|---|
| Fire Covenant | Day of Judgment | pool: "As an additional cost ... pay X life. Fire Covenant deals X damage divided as you choose among any number of target creatures" — instant, one-sided, 3 mana. DoJ ("Destroy all creatures") kills the deck's own 7 creatures and every Cadet / Beast / Servo / Ally that blocks for the walkers; Covenant is cast in their declare-attackers step, spares all of it, costs {1}{B}{R} not {2}{W}{W}, is copied for free by Cryomancer −3 (a copy pays no life) and recast by Chandra AoF −2 (MV 3; DoJ MV 4 is not). 25 life + Sheoldred / Mentor / Beacon / Quintorius lifegain pays X. Loses only to a single 12+ power or hexproof creature, which Sunfall, Swords, Path, Moon and Garruk +2 cover. The builder itself named it "the first card back in if aggro proves too fast" — in 1v1 Historic Brawl that is the default opponent. |
| Karn's Bastion | Island | pool: "{T}: Add {C}. {4}, {T}: Proliferate." Repeatable, uncounterable, instant-speed +1 on all 18 walkers and the Jace token (and Incubator / stun / burden counters); every activation is N damage under All Will Be One. Island is the only land with no text. Sim re-run (20,000 games): Jace by T5 61.4 / 71.3 → 61.2 / 72.0, WUBR by T5 85.4 / 87.9 → 84.1 / 87.9, flood and screw unchanged — the builder's −0.7 was 40k-run noise-level (±0.35); the 35-face count is kept, Island → Bastion is the report's own sim row. |

**Considered and rejected.** Brainstorm / Ponder / Preordain back in for Zetalpa: the +1 "draw two, bottom one" bottoms a dead 8-drop for free, the 1/25 reveal is the deck's only wipe-proof clock, and a 1-mana cantrip beats no kept card (weakest overall: Caretaker's Talent, which draws every turn). The cantrip cut stands. Phyrexian Arena for Talent: unconditional but 1 life a turn and BB; Talent draws on every Healer −2 / Saheeli / Ajani / Appa token, W, and triggers on the opponent's turn (Appa) — a wash, no proof. Mystical Tutor (screened, absent from §4) for Enlightened Tutor: finds Sunfall / Covenant / Teferi's at instant speed but card −1 for a spell where Enlightened finds a Way, Oath, Ring or AWBO (permanents that pay back). Tekuthal, Inquiry Dominus (in `deck.md`, absent from §4): "If you would proliferate, proliferate twice instead" needs Channeler or Bastion out to do anything; 4-mana 3/3 flyer, hit 5 — loses to Kaito BoN. Sunpearl Kirin / Astelli Reclaimer / Appa, Loyal Sky Bison (screened): worse Appas. Cut Down / Bitter Triumph for Vraska's Final Mercy: VFM's "Empower Jace 6" mode is a 6-loyalty walker for {B}{B}; instants without a walker mode do not beat it. Lightning Helix for Bolt: Mentor +1 on every walker per cast, but 2 mana and sorcery-speed-relevant tempo; not proven. Annex / Commons duals or Takenuma for Oscorp Industries: two colours or one vs three; the sim cannot see tapped-ness — untested, not applied. Not owned (pool checked by name): Watery Grave, Plaza of Heroes, Mana Confluence, Xander's Lounge, the other fetches, pain lands, Spark Double, Smothering Tithe, Time Wipe, Farewell, Supreme Verdict, Anguished Unmaking, Kaya's Guile, Fatal Push, The Chain Veil, Oath of Gideon / Jace, Deepglow Skate, Teferi (any), Elspeth, The Wandering Emperor, Ugin — 33 walkers is the whole owned W/U/B/R set.

**Engine claims checked against oracle text.** All Will Be One ✓ (loyalty paid as a cost is "you put counters"; empower 5 = one trigger for 5; proliferate = one 1-damage trigger per permanent hit = N). Appa ✓ ("Exile them. While each one is exiled, its owner may cast it for {2} rather than its mana cost"; "Whenever you cast a spell from exile, create a 1/1 white Ally") — bonus not in the report: airbend the commander at 1 loyalty and recast Jace for {2}, no tax. Flux Channeler ✓. Interplanar Beacon ✓ (lifegain per walker cast → Mentor). Mentor + Sheoldred + Jace +1 = 2N (+1 for Jace's own counter) ✓.

**Wrong rules claims.** (1) §1 "8 Ways = 8 Jace tokens ... each a Jace" and §2 "static on 9 Jaces": empower only creates a token "if you don't control one" — one token at a time, 34 loyalty in sequence, at most three Jaces on the table (commander, Theorist, token). (2) §3 swap 3 and §1 "43 noncreature spells": planeswalker spells are noncreature — 61 of the 68 nonland cards trigger Channeler / Ral / Saheeli. (3) §5 "Mox Amber ... live from turn 2–3 with a Way token": the Jace token is not legendary; Mox Amber ("among legendary creatures and planeswalkers you control") needs Tomik, Appa or a real walker. (4) §5 "Zetalpa ... the only one that survives every wipe": indestructible does not survive Sunfall's exile or −X/−X. (5) §1 The Eternal Wanderer is not "minus-only" (+1 exile). None changes a swap.

**Stop statement per role (pass 2, zero swaps).** Walker: best remaining Karn, the Great Creator loses to Kaito, Bane of Nightmares — the −2 has no wishboard and the +1 spends a rock; Kaito's 0 draws off any life loss and the −2 stuns without a cost. Way: locked, none strictly worse than its replacement (§4). Creature / hit: Krang (9 colourless, never cast) loses to Tomik ("No more than one creature can attack this planeswalker each combat" on 18 walkers from turn 2). Engine: Virtue of Knowledge / Tezzeret's Gambit / Contentious Plan / Phyrexian Arena lose to Caretaker's Talent (a draw every turn for 3 once, W). Counter: Negate loses to No More Lies (counters creatures too). Removal: Bitter Triumph loses to Vraska's Final Mercy (empower 6 mode). Wipe: Fiery Confluence loses to Sunfall (exile, hits indestructible / hexproof) and to Fire Covenant (instant, one-sided). Protection: Authority of the Consuls loses to Teferi's Protection (dead vs control; Protection answers a wipe or lethal). Draw / tutor: Mystical Tutor loses to Enlightened Tutor (finds permanents that pay back). Ramp: Mind Stone loses to Azorius Signet (colour in a 4-colour deck). Land: Karn's Bastion applied; the Annex / Commons duals lose to Oscorp Industries on colours only, untested in play. **Converged: yes.**
