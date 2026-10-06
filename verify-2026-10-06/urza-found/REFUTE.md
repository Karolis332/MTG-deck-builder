# Refute: Urza `final-2.txt` (Opus refuter, fresh context, 2026-10-06)

**Verdict: ❌ NOT CONVERGED.** 19 of the 20 swaps are KEEP. One is REJECT: Reconnaissance Mission → **Padeem, Consul of Innovation**. The land verdict adds **Island #32 for Distant Melody**. Everything else holds:
- the Fulcrum line, the synergy numbers, the gate, and the constraints (Fulcrum in, the 5 unavailable cards absent, every card in the free pool).
- All DB quotes are verbatim. A script check (`refute/quotes.py`) flagged 5 strings, all format-only: capitalisation, `[−3]`, a line break, and 2 non-card labels.

Sources: DB via `refute/dump.py` and `refute/q2.py` (oracle text for the full list: `refute/final-2-oracle.md`), Scryfall rulings API, CR `MagicCompRules 20260925.txt`, and `synergy.py` re-run.

## §1 Errors
| # | Claim (report §) | Finding (source) | Sev | List? |
|---|---|---|---|---|
| 1 | §1 Padeem "❌ ⚠️ loses to Karn"; §2 #18 Mission IN | Wrong comparison. Padeem: "Artifacts you control have hexproof" (Construct, Kroog, Filigree, Helm, Planetarium, Super State's artifact host) + "At the beginning of your upkeep, if you control the artifact with the greatest mana value or tied …, draw a card". Mission repeats Bident's trigger, and 10-02 `verdicts.md` called it OUT: "Same trigger as Bident, but not an artifact". synergy.py: Padeem 39, Mission 27 | HIGH | ✅ swap |
| 2 | §4 "38 + Sink = 38.4" accepted; cheap = 8 | `principles.md` §3.1 counts only cards that "draw or ramp". Sapphire Medallion and Geist are cost reducers, the same error as 10-02 REFUTE #13. With cheap = 6: regression **40.8** printed / **40.1** effective. The simulation's 37.5 starts from "42 + Sol Ring", but Sol Ring is gone | MED | ✅ +1 land |
| 3 | §1 Ember Island Production "Copies are 'not legendary': no Urza ETB value" | False. The token copy *enters*, so "When Urza enters" triggers (CR 603.6a). Because it is "not legendary", 704.5j never removes it: you get a Construct plus a 4/4 Urza that stays. It still loses on cost: {3}{U}{U} sorcery vs Flesh Duplicate {U}{U} | MED | no |
| 4 | §1/§3 River's Rebuke "one-sided", role "Wipe" | "all nonland permanents **target player** controls" hits 1 opponent of 3. It is a single-player reset; the Fulcrum is the only mass removal | MED | no |
| 5 | §2 #3 Pull → Finale "+1 card at the same {X}{U}{U}" | Leaves out that Pull is an **Instant** and Finale a **Sorcery**. Unstoppable Plan untaps the artifacts at our end step, and Pull spends that mana at an opponent's end step. Near-tie | LOW-MED | no |
| 6 | §2 "61 nonland, 25 artifacts" | 24 nonland artifacts + Seat. Gate on both lists: 10-02 had 29 artifacts and avg MV **3.16**; final-2 has 25 and **3.52** (0–1-MV cards 7 → 2). The curve rose about 0.36 and no land followed | LOW | via #2 |
| 7 | §2 #2 Melody "+2–4" | 3 Thopter makers (Sai, Efficient, Whirler); the best type without them is Human (6 in the list) or Construct, at 2–3 permanents. Realistic: 2–4 drawn (net +1–3) | LOW | no |
| 8 | §4 "Lord ~4" | Reduces "only the generic mana" (Scryfall 2026-06-29). Turn 5–6 flying power is 2–4, so it costs 5–7. ~4 needs Filigree, a Super State host or 5+ Thopters | LOW | no |
| 9 | §1 Occult Epiphany "card-neutral" | Leaves out "Create a 1/1 white Spirit creature token with flying for each card type among cards discarded" | LOW | no |
| 10 | §1 Giant's Boulder; §1 Zuko's | Boulder also has "{1}, {T}: Add one mana of any color". Zuko's quote drops "Its controller creates a Clue token" (the opponent gets a card) | LOW | no |
| 11 | §1 Soulless Jailer "blocks our Urza {5}" | Only "noncreature spells … from … exile"; creature hits stay castable | LOW | no |
| 12 | §4b Fulcrum pilot line | Misses Karn −2: "choose a face-up artifact card you own in exile" returns the exiled Fulcrum, or Soul after its graveyard ability, for a repeat | LOW | no |
| 13 | §4b kill list | Incomplete. Fleshraker, Geist, Stormdrake, Sun Quan, Solemn, Palladium Myr, Soul, Thought Monitor, Meteor Golem and Flesh Duplicate die too | LOW | no |
| 14 | Ownership | `collection.txt` lists 11 Island (the decks use 8). The list needs 31, or 32 after my change. The gate PASSes (basics are probably exempt; UNVERIFIED). Register the Islands before paper-sync (10-02 REFUTE §9.7 still open) | LOW | no |

## §2 Numbers re-checked
- **Synergy:** `py synergy.py` → "unique pairs 939 | degree min 1 median 25 max 63". The 5 lowest are Agna 1, War Room 1, Counterspell 6, Curse 6, Finale 6. ✅ matches.
- **Curve:** gate → "avg MV 3.52", "1:2 2:17 3:15 4:16 5:2 6:5 7:4", 18 instants/sorceries, 6 counters, 8 removal. ✅
- **Karsten regression:** with the builder's cheap = 8, 40.2 printed / 39.5 effective (Lord 4, Monitor 2, Kappa 3; recomputed). With cheap = 6 (§1 #2): 40.8 / 40.1.
- **Karsten simulation:** 42 (with Sol Ring) + ~1 for no Sol Ring (UNVERIFIED magnitude), −3 to −4.5 for 9 rocks (Signet, Diamond, Purse, Sphere, Palladium, Dynamo, Powerstone, Waterskin, Solemn), −1 for 4 cheap draws (Relic, Lantern, Scroll, Fulcrum) → **~38–38.5**.
- **Land verdict: yes, land 39.** The methods span 38–40.8, midpoint about 39, and the list sits at 38.4 after a +0.36 curve rise.
  - Island #32 goes in, not Command Tower: Scroll's "{1} less … for each Island" and Agna's "unless you control a basic land".
  - **Distant Melody goes out:** it is the most conditional draw (§1 #7), a 4-MV sorcery, and the draw suite keeps 13 pieces.
  - Not 40: Urza turns every artifact into {U} from turn 4.
- **Lord of the Eagles:** {7}{U}{U}, generic only. Realistic cost 5–7 on turns 5–6, about 4 late (§1 #8).
- **Finale:** X ≥ 10 means {10}{U}{U} = 12 mana, minus "untap up to five lands" = 7 net for 10 cards. Reachable around turn 8+ with Urza + ~8 artifacts + 7 lands.
- **Blue sources:** 33 lands + Sink (34 after the change). {C} sources: 8 (5 lands, Powerstone, Dynamo, Palladium). ✅
- **Fulcrum one-sided line: ✅ holds.**
  - Soul: "{5}: Permanents you control gain indestructible until end of turn." Fulcrum: "{5}, {T}, Exile The Echoverse Fulcrum: Destroy all creatures. Activate only as a sorcery."
  - The exile is a cost (602.2b), and the ability then resolves independently of its source (113.7a). Indestructible "can't be destroyed" (702.12b).
  - Order matters: Soul must resolve first. 611.2c fixes the affected set at resolution, so tokens made afterwards die.
  - Total is 10 mana, and the Fulcrum's own {T} means it cannot also tap for Urza.

## §3 Swap verdicts (20)
| # | Out → In | Verdict | Reason |
|---|---|---|---|
| 1 | Witching Well → Cryogen Relic | ✅ KEEP | "enters or leaves the battlefield, draw a card": +1 at once, +1 on a Sai sacrifice |
| 2 | Stock Up → Distant Melody | ✅ KEEP | Better than Stock Up, but it is the weakest draw left → cut for land 39 (§2) |
| 3 | Pull from Tomorrow → Finale | ✅ KEEP ⚠️ | +1 card and the X ≥ 10 refund vs Pull's instant speed (§1 #5); near-tie |
| 4 | Countersculpt → Bane's ⚠️ | ✅ KEEP | Both cost 3 here (no Jace to behold). Urza is the deck's main removal target, and "scry 2" also triggers Planetarium |
| 5 | Hangarback → Lord of the Eagles | ✅ KEEP ⚠️ | Flash 8/8 flier passes the win-turn test. Near-tie with Steel Hellkite (§4 #3) |
| 6 | Wayfarer's Bauble → Noble's Purse | ✅ KEEP | Same turn-3 Urza (T2 Purse, T3 Treasure). Purse stays an artifact, and Helm adds a Map per Treasure |
| 7 | Villains' Lair → Katara's Reversal | ✅ KEEP | "Untap up to four target artifacts" = 4 {U} back through Urza |
| 8 | Perplexing Test → River's Rebuke | ✅ KEEP | Forced. Hits one player (§1 #4) |
| 9 | Reverse Engineer → Cerebral Download | ✅ KEEP | Instant, plus "Surveil X" triggers Planetarium |
| 10 | Mazemind Tome → April O'Neil | ✅ KEEP | An artifact creature spell is 2 card types: about 2–3 cards at our end step |
| 11 | Commander's Insight → Pensive Professor ⚠️ | ✅ KEEP | About 1 card a turn while a spell costs more than its power; Finale, WST and Download stay as X/burst draw |
| 12 | Donatello → Filigree Attendant | ✅ KEEP | An artifact itself; full power on arrival |
| 13 | Dawnsire → Sun Quan | ✅ KEEP | Team horsemanship closes Rite's 5 Constructs. Dawnsire needs 2 sorcery-speed stations |
| 14 | Golem Foundry → Traxos, Kroog ⚠️ | ✅ KEEP | 7/7 trample. "untap Traxos" on each historic cast = {U} back through Urza, and Plan untaps it |
| 15 | Steel Hellkite → Soul of New Phyrexia ⚠️ | ✅ KEEP | Makes the locked Fulcrum one-sided and protects the board from destroy-wipes |
| 16 | Cityscape Leveler → Rite of Replication | ✅ KEEP | Kicked on Urza = 5 ETB Constructs (603.6a before 704.5j) |
| 17 | Sol Ring → Secluded Starforge | ✅ KEEP | No other 1–2-MV {C}{C} in the pool (checked). It also has "Tap X untapped artifacts …: +X/+0" |
| 18 | Emeritus → Reconnaissance Mission | ❌ **REJECT** | **Padeem** instead (§1 #1) |
| 19 | Entrancing Melody → Zuko's Exile | ✅ KEEP | Instant exile; the Clue to the opponent is the price |
| 20 | Mishra's Bauble → Echoverse Fulcrum | ✅ KEEP | Lock |

## §4 Missed swaps (ranked)
1. **Padeem, Consul of Innovation in, Reconnaissance Mission out.** Applied. Artifact hexproof + upkeep draw; 39 vs 27 links.
2. **Island #32 in, Distant Melody out.** Applied (§2 land verdict).
3. ⚠️ Steel Hellkite in, The Lord of the Eagles out. Not applied (near-tie).
   - For Hellkite: an artifact (Construct +1, {U}, Sai, Fleshraker, Scour/Ruin/Karn targets), "{2}: +1/+0" sinks Urza mana into flying damage, and "{X}: Destroy each nonland permanent with mana value X …".
   - For the Lord: flash, and it is cheaper once fliers are out.
4. ⚠️ Torrential Gearhulk (38 links, flash artifact Construct, recasts Katara's or Counterspell) is the alternative to #3. Hangarback is the low-curve alternative.

**Stop proof:** the other roles hold. Ramp: the pool has no other ≤ 2-MV rock. Counters: Acrobatics and Exclude cost 3. Removal: Masticore costs a card each upkeep. Lands: an Island beats the untapped utility lands (Scroll, Agna).

## §4b OUT spot-check (25 strongest found cards)
- **Wrong:** Padeem (§1 #1).
- **Reason wrong, OUT stands:** Ember Island Production (§1 #3), Occult Epiphany (§1 #9).
- ⚠️ **Near-tie, OUT stands:** Torrential Gearhulk (§4 #4), Traxos Eternal ("artifact or creature spell" untap, but a 5/4), Pol Jamaar, Candlestick, Giant's Boulder, Deduce (its Clue is an artifact token).
- ✅ **Verdict and reason hold:**

| Card | Why it stays out |
|---|---|
| Visage Bandit | Duplicate is cheaper; plot casts spend 0 |
| Experimental Aviator | Whirler gets 2 Thopters + unblockable for 4 |
| Mocking Doppelganger | "a creature an opponent controls" |
| Body Double | Graveyard copy only |
| Memory Guardian | Static 3/4 flier |
| Myr Enforcer | Ground 4/4 |
| Emissary Escort | Ground, and not colourless |
| Geode Golem | Tax still paid |
| Darksteel Colossus | {11}, no haste |
| Argentum Masticore | Costs a card each upkeep |
| God-Pharaoh's Statue | 6 MV tax piece |
| Esoteric Duplicator | {2} per copy |
| Nimble Thopterist | One Thopter for 4 |
| Subterfuge | Gives flying, not unblockable |
| Yue | Free cast gains MV − 5 |
| Soulless Jailer, Torpor Orb | Anti-synergy |

## §5 List after the swaps (`refute/final-r.txt`)
`final-2.txt` with 3 line changes: `1 Padeem, Consul of Innovation` replaces `1 Reconnaissance Mission`; `1 Distant Melody` is deleted; `31 Island` becomes `32 Island`. Result: 100 cards, 39 lands + Sink.

Gate (brief command, `--owner 1 --source paper --lock "The Echoverse Fulcrum"`):
```
totals 100 cards | 39 lands (39.4 eff.) | 60 nonland | avg MV 3.52 | curve 1:2 2:17 3:15 4:15 5:2 6:5 7:4
PASS size/singleton/legality/rules/identity/ownership | WARN arenaNames (Kuruk, Sink) | PASS lands, Karsten wants 40 ±2
FAIL plan 14/60 (known false negative) | PASS curve 3.52 | PASS wincons 12 | PASS locks 1 present and intact
```
Synergy re-run (`refute/synergy-r.py`): 933 pairs, min 1, median 25.5, max 62.

**Open (operator):**
- Near-tie §4 #3 (Hellkite or Gearhulk for the Lord).
- When Emeritus is found it takes Padeem's slot only if it beats Padeem; it no longer has the Mission slot.
- Register 31–32 Islands before paper-sync.
