# Inspirit, Flagship Vessel: pilot guide (paper)

List: `verify-2026-10-06/urza-found/inspirit-hotswap.txt` (100 cards, 38 lands). It is the sleeved list with Emry, Lurker of the Loch in for Urza, who moved to the Urza deck. Card text is quoted from the DB and rules from CR 2026-09-25, checked 2026-10-07.

## Plan in one line
Station Inspirit to 8 counters by T4–5 so every other artifact has hexproof and indestructible. Spend its two charge counters a turn on draw and mana, then turn the artifact pile into hasty tramplers.

=> T1–3 rocks, then [[Inspirit, Flagship Vessel]] → T4–5: station to 8+ → two charge counters a turn feed draw and mana → [[Depthshaker Titan]] animates every spare artifact → **hasty, trampling alpha at all three opponents**

## How Inspirit works
- **Station:** "Tap another creature you control: Put charge counters equal to its power on this Spacecraft. Station only as a sorcery." Inspirit enters with 0 counters.
- Summoning-sick creatures may station. CR 302.6 stops only a creature's own {T} abilities and its attacks. Station is Inspirit's ability, with the cost "Tap another untapped creature you control" (CR 702.184a).
- **1+:** "At the beginning of combat on your turn, put your choice of a +1/+1 counter or two charge counters on up to one other target artifact." It never targets Inspirit itself.
- **8+:** "Flying" and "Other artifacts you control have hexproof and indestructible", plus the 5/5 box. Per CR 721.2b, everything in that striation switches on at 8.
- **Inspirit itself gets neither keyword.**
- It can attack on the turn it reaches 8 if it has been on the battlefield since the turn began (CR 302.6).
- **Below 8 it is a noncreature artifact.** [[Cyberdrive Awakener]] makes it a 4/4 that turn. Depthshaker could target it, and it would then be sacrificed.

=> T3 [[Inspirit, Flagship Vessel]] → T4: warp [[Bygone Colossus]] for {3}, a 9/9 → tap it to station: 9 charge counters → **8+: 5/5 flier, other artifacts hexproof and indestructible**

=> T4 [[Traxos, Scourge of Kroog]] "enters tapped" → [[Emry, Lurker of the Loch]] for {U} (affinity; 5 mana in all): a historic spell, so Traxos untaps → station: Traxos 7 + Emry 1 → **Inspirit at 8 the same turn**

- **Slow path:** when [[Kilo, Apogee Mind]] stations, it adds 3. "Whenever Kilo becomes tapped, proliferate" resolves first, so once Inspirit has a counter Kilo adds 1 more (2 with Tekuthal).
- [[Deepglow Skate]] doubles 4 to 8.
- Bygone or Traxos is seen by T4 on the play in only 19 % of games, but 74 % see one of the 12 bodies with power 3+.

## Win conditions
| # | Kill | Pieces | Damage on the reference board |
|---|---|---|---|
| A | **The Craterhoof** | [[Depthshaker Titan]], amplified by [[Blade Historian]] | 68 trample split three ways; 136 with Historian |
| B | **Animate, then pump** | [[Cyberdrive Awakener]], then [[Repurposing Bay]] fetches [[Craterclaw Colossus]] | 146 trample |
| C | **Commander damage** | Inspirit + [[Improvised Arsenal]] + [[Boros Charm]], or [[All That Glitters]] | 21+ to one opponent per hit (CR 903.10a) |
| D | **Drain (grind)** | [[Lux Artillery]] at 30 counters, plus [[Lasting Tarfire]] | 10 to each opponent at each of your end steps (+2 at every end step from Tarfire) |

**Reference board** (everything held since the turn began; 3 opponents at 40 = 120 life):
- 7 lands, including Seat of the Synod and Great Furnace.
- Inspirit at 8+ (5/5).
- Etherium Sculptor 1/2, Kilo 3/3, and Traxos 7/7 (tapped).
- Sol Ring, Arcane Signet, Fellwar Stone, Insight Engine.
- That is **10 artifacts**. Inspirit's 1+ trigger puts a +1/+1 counter on Traxos each turn.

## Win lines
### A. Depthshaker Titan
"When this creature enters, any number of target noncreature artifacts you control become 3/3 artifact creatures. Sacrifice them at the beginning of the next end step." / "Each artifact creature you control has melee, trample, and haste."
- **Mana.** {5}{R}{R} −1 (Sculptor) = 6, paid with five lands + Great Furnace. Casting it (historic) untaps Traxos.
- Animate Sol Ring, Signet, Fellwar, Insight Engine and the untapped Seat: five 3/3s.
- **Damage.** Split the attack across all three opponents: melee gives +3/+3 each (CR 702.121a).
- Inspirit 8, Traxos 10, Kilo 6, Sculptor 4, Depthshaker 8, and the spares 5 × 6 = 30, for 66.
- Inspirit's counter adds 1, and Kilo's attack proliferate adds 1: **68 trample** (≈ 22 each).
- With [[Blade Historian]] already out ("Attacking creatures you control have double strike"): **136**, 16 more than a 40-life table; each chump block absorbs only its toughness once (double strike + trample), so it kills unless one opponent blocks with 6+ toughness.

=> Pay with lands, keep rocks untapped → [[Depthshaker Titan]]: five spares become 3/3s → all artifact creatures: melee, trample, haste → attack all three: +3/+3 each → **68 trample; 136 with Blade Historian**

### B. Cyberdrive → Repurposing Bay → Craterclaw
- **Setup.** Bay must have been in play since the turn began. Cyberdrive makes it a creature, and a creature that arrived this turn can't use {T} (CR 302.6).
- **Cyberdrive** ({5}{U} −1 = 5): "each noncreature artifact you control becomes a 4/4 artifact creature until end of turn".
- **Bay** ({2}): it sacrifices Cyberdrive (MV 6) and puts Craterclaw (MV 7) onto the battlefield.
- The 4/4 effect has already resolved, so it lasts until end of turn (CR 611.2a). The flying leaves with Cyberdrive.
- **Craterclaw:** "creatures you control gain trample and get +X/+0 until end of turn, where X is the number of artifacts you control". X = 12 (the board, Bay and Craterclaw).
- **Damage.** All 7 lands pay, so Bay and the artifact lands are tapped.
- Inspirit 17, Traxos 19, Kilo 15, Sculptor 13, four rocks × 16 = 64, and Craterclaw 17 ("Haste"): 145.
- With Inspirit's +1: **146 trample** (147 with Kilo's attack proliferate).
- **Other fetch:** the same Bay step can take Depthshaker (MV 7), which gives the 4/4s melee and haste.

=> [[Repurposing Bay]] in play since last turn → [[Cyberdrive Awakener]]: every noncreature artifact becomes a 4/4 → Bay sacrifices Cyberdrive; the 4/4s stay → fetch [[Craterclaw Colossus]]: +12/+0 and trample → **146 trample across the table**

- **Hard cast.** {4}{R}{R}{R} −1 = 6 gives X = 11 on real creatures only: **77**. [[Panharmonicon]] makes it 21 + 5 × 24 + 1 = **142**.
- **With 4 mana spare:** [[Three Steps Ahead]] copies Craterclaw after blockers. The copy's trigger adds +X again to every attacker (CR 611.2c).

### C. Commander damage (backup, one opponent per hit)
- [[Improvised Arsenal]]: "Equipped creature gets +1/+0 for each artifact you control." "Equip {R}".
- [[All That Glitters]]: "+1/+1 for each artifact and/or enchantment you control".
- **Thresholds** (N = artifacts you control, Arsenal included):
- Arsenal + Charm double strike: 2 × (5 + N) ≥ 21 from N = 6.
- Arsenal + Glitters: 5 + N + (N + 1) ≥ 21 from N = 8.
- Reference board (N = 11): **32**, or 28 with Glitters.
- **Mana.** Arsenal {R} after Sculptor, equip {R}, Charm {R}{W}: 4 in all.
- **Inspirit has no trample.** Two charge counters on [[Lost Jitte]] give two "Target creature can't block this turn". Gavel needs 6 counters for a one-hit kill (11 × 2).

=> Inspirit at 8+, flying → [[Improvised Arsenal]], equip {R}: power 5 + N → [[Boros Charm]]: double strike → **21+ commander damage from 6 artifacts**

### D. Drain
- [[Lux Artillery]]: "if there are thirty or more counters among artifacts and creatures you control, this artifact deals 10 damage to each opponent".
- Example: Inspirit 16 (Bygone 9 + Traxos 7), Gavel 4, Insight Engine 3, Chalice 2 and Autogenerator 3 make 28. Skate doubles that to 56.
- A [[Phyrexian Metamorph]] copy of the Artillery makes it 20 a turn: two turns from 40.
- [[Lasting Tarfire]]: 2 to each opponent at every end step "if you put a counter on a creature this turn". Steel Overseer, Iron Spider and Karn's Bastion also work on opponents' turns: up to 8 per round.

=> Station, two charge counters a turn, proliferate → [[Deepglow Skate]]: "double the number of each kind of counter" → [[Lux Artillery]] sees 30+ → **10 to each opponent at each of your end steps**

## Engine map
| Role | Cards | What they do here |
|---|---|---|
| Charge sinks (the 1+ trigger, one a turn) | [[Insight Engine]], [[Empowered Autogenerator]], [[Everflowing Chalice]], [[Pentad Prism]], [[Gavel of the Righteous]], [[Lost Jitte]], [[Lux Cannon]], [[Uthros Research Craft]] | Engine draws 3, then 6. Autogenerator makes 3, 6, then 9 mana. Chalice gives +2 mana for good; Prism, 2 more mana. Gavel reaches double strike sooner. Jitte untaps 2 lands. Cannon: "Destroy target permanent" three times in four turns. Uthros Craft at 3: "Whenever you cast an artifact spell, draw a card" |
| Proliferate | [[Kilo, Apogee Mind]], [[Surge Conductor]], [[Karn's Bastion]], [[Ripples of Potential]], [[Tekuthal, Inquiry Dominus]] | Kilo on every tap (station or attack). Surge on "another nontoken artifact". Tekuthal: "proliferate twice instead" |
| Counters on creatures | [[Steel Overseer]], [[Iron Spider, Stark Upgrade]], [[Deepglow Skate]] | +1/+1 on each artifact creature (turns Tarfire on). Spider draws ("Remove two +1/+1 counters"). Skate doubles every counter |
| Doublers and copies | [[Panharmonicon]], [[Phyrexian Metamorph]], [[Three Steps Ahead]] | Panharmonicon: Craterclaw +2X, Skate ×4, Monitor 4 cards, Surge, Thunderhulk 6 Gnomes. Depthshaker's second trigger does nothing, since its targets are creatures by then. Copies give Craterclaw, Depthshaker or Monitor a second ETB |
| Tutors | [[Repurposing Bay]], [[Inventors' Fair]], [[Tezzeret, Cruel Captain]] | Bay sacrifices MV n and puts MV n + 1 onto the battlefield, at sorcery speed: 0 Chalice → 1 Sol Ring/Jitte → 2 Signet/Arsenal → 3 Engine/Kilo → 4 Traxos/Panharmonicon/Lotus → 5 Alibou → 6 Cyberdrive → 7 Craterclaw/Depthshaker/Thunderhulk/Monitor. Feed it a Depthshaker spare in main phase 2. Fair finds any artifact once you have 3+ artifacts. Tezzeret −3 finds Sol Ring, Jitte or Chalice |
| Recursion | [[Emry, Lurker of the Loch]], [[One Last Job]] | Emry: "{T}: Choose target artifact card in your graveyard. You may cast that card this turn". Targets: sacrificed spares, Bay's Cyberdrive, the artifact discarded to Thirst. One Last Job "+ {2}": Cyberdrive or a countered finisher |
| Card flow | [[Jhoira, Weatherlight Captain]], [[Thought Monitor]], [[Thirst for Knowledge]], [[Fact or Fiction]], [[Universal Surveillance]], [[Voyage Home]], [[Chandra, Spark Hunter]] | Jhoira: "Whenever you cast a historic spell, draw a card". Monitor and Voyage have affinity. Surveillance improvises X. Chandra's +2 loots; her 0 makes "a 3/2 colorless Vehicle artifact token", a Depthshaker or Cyberdrive body |
| Mana | [[Sol Ring]], [[Arcane Signet]], [[Fellwar Stone]], [[Ornithopter of Paradise]], [[Steelswarm Operator]], [[Zookeeper Mechan]], [[Etherium Sculptor]], [[Enthusiastic Mechanaut]], [[Nyx Lotus]], [[Archway of Innovation]], [[Uthros, Titanic Godcore]] | Zookeeper adds R for Craterclaw's RRR. Sculptor and Mechanaut: "Artifact spells you cast cost {1} less to cast". Tezzeret's 0 ("Untap target artifact or creature") re-taps Nyx Lotus. Godcore at 12: "{U}, {T}: Add {U} for each artifact you control" |
| Haste, bodies | [[Alibou, Ancient Witness]], [[Threefold Thunderhulk]] | Alibou: "Other artifact creatures you control have haste", plus X damage on attack (X = tapped artifacts). Thunderhulk's Gnomes need Alibou or Depthshaker to attack at once |

=> 1+ trigger: two charge counters → [[Insight Engine]], {2}, {T}: +1 counter → draw 3 cards → **next turn 6 cards**

=> Two charge counters on [[Empowered Autogenerator]] each combat → {T}: +1 counter, add X → **3, then 6, then 9 mana of one colour**

=> [[Kilo, Apogee Mind]] taps to station → proliferate → [[Tekuthal, Inquiry Dominus]]: twice → **+2 on every charge, +1/+1 and loyalty pile**

=> Bay eats [[Cyberdrive Awakener]] for Craterclaw → next turn [[Emry, Lurker of the Loch]], {T}: cast it from the graveyard → **a second animation turn**

## Interaction and protection
- **Counters:** [[Counterspell]], [[Swan Song]] (fogs and wipes on the alpha turn), Three Steps Ahead.
- **Removal:** [[Swords to Plowshares]], [[Rapid Hybridization]], [[Dispatch]] (metalcraft is always on, so it exiles), [[Abrade]], [[Generous Gift]], [[Chaos Warp]] (handles indestructible), Lux Cannon (repeatable).
- **Sweepers:** [[Cyclonic Rift]], overloaded at the end step before your alpha, and Final Showdown (7 mana with both modes below).

=> [[Final Showdown]] {W} → + {1}: Inspirit gains indestructible → + {3}{W}{W}: destroy all creatures → **at 8+ our artifacts survive; non-artifacts die**

- **Inspirit is outside its own shield.**
- [[Boros Charm]]: "Permanents you control gain indestructible" stops destroy effects only.
- [[Ripples of Potential]]: whatever got a counter phases out, which dodges exile and bounce.
- **Unshielded non-artifacts:** Jhoira, Tekuthal, Skate, Historian, Emry, Chandra and Tezzeret.

## Turn shape
| Turns | Goal | Cards |
|---|---|---|
| T1–3 | Two mana pieces, Inspirit on T3 | [[Sol Ring]], [[Etherium Sculptor]], [[Arcane Signet]] |
| T4–6 | Station to 8, feed a charge sink, build draw | [[Bygone Colossus]], Traxos + Emry, [[Insight Engine]], [[Repurposing Bay]] |
| Close, T7+ | One protected finisher | [[Depthshaker Titan]], the Cyberdrive line, Arsenal + Charm; hold [[Swan Song]] |

## Pilot rules and traps
- **On the kill turn, pay with lands.** A tapped rock becomes a tapped creature, which can't attack.
- **Cyberdrive animates rocks cast this turn.** As creatures that arrived this turn they can't tap for mana or attack (CR 302.6), so tap them while paying for Cyberdrive.
- **Cyberdrive knocks Equipment off.** "An Equipment that's also a creature can't equip a creature" (CR 301.5c). Never cast it on the Arsenal turn; Glitters is an Aura and stays.
- **Depthshaker: never target Inspirit below 8.** "Sacrifice them" gets past indestructible (CR 701.21a). An animated Uthros Research Craft dies too.
- **Final Showdown: never add "All creatures lose all abilities" to the wipe.** Inspirit loses its grant (layer 6, CR 613.1f), so the wipe kills our artifact creatures (Traxos, Kilo, Sculptor…); rocks are not creatures and survive.
- **Traxos "enters tapped".** Follow it with a historic spell (Emry, Sol Ring, Jitte) before you station.
- **Bygone Colossus is exiled at the next end step.** Recasting it from exile costs {9} (CR 702.185a), so station with it the turn you warp it.
- **Station in main phase 1**, so the 1+ trigger and the attack follow.
- **Lasting Tarfire needs a counter on a creature.** Charge counters on Gavel or Insight Engine don't count; stationing an 8+ Inspirit does.
- **Ripples phases Inspirit out until your next untap.** Cast it on opponents' turns.

## Mulligan
- **Keep:** 3–5 lands (53.6 % of 7-card hands) with a ≤ 2-MV mana piece. 53.7 % of hands hold one of the 10: Sol Ring, Signet, Fellwar, Chalice, Pentad, Ornithopter, Steelswarm, Zookeeper, Sculptor, Mechanaut.
- **2 lands** (28.1 % of hands): keep only with Sol Ring or Signet plus a second 2-drop.
- **Mulligan:** 0–1 land; 6+ lands with no rock; or no way to make all of U, R and W by T3. Don't keep for Bygone: mana is what makes the T3 Inspirit.
- **Example keep:** Command Tower, Sacred Foundry, Island, Sol Ring, Etherium Sculptor, Insight Engine, Counterspell (T2 Sculptor + Engine, T3 Inspirit).
- **Example mulligan:** Island, Plains, Depthshaker Titan, Craterclaw Colossus, Fact or Fiction, Swords to Plowshares, Counterspell (2 lands, no rock, two 7-drops).
