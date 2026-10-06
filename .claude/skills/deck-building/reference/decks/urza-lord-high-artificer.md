# Urza, Lord High Artificer: pilot guide (paper)

List: `verify-2026-10-06/urza-found/final-3.txt` (100 cards, 35 lands incl. 30 Islands + Sink into Stupor, avg MV 3.38). Card text quoted from the DB, 2026-10-06.

## Plan in one line
Every artifact is mana ("Tap an untapped artifact you control: Add {U}") and size (the Construct "gets +1/+1 for each artifact you control"). Multiply Constructs, then make them unblockable or put Super State on one, and swing. N below = artifacts you control.

## Win conditions
| # | Kill | Pieces | Damage |
|---|---|---|---|
| A | **Construct army, unblockable** | 2+ Constructs + **Sun Quan** ("Creatures you control have horsemanship": only horsemanship creatures can block) | Every Construct hits for N |
| B | **Super State Construct** | Any Construct + Super State (7) | Base 9/9 + N, "flying, first strike, trample, and haste", and "deals that much damage to each other opponent". N ≥ 11 → 20+ to **every** opponent per hit |
| C | **Thopter burn** | Glaring Fleshraker + kicked Rite of Replication on Whirler Rogue (9 mana) | 10 Thopters enter → 10 damage to each opponent |
| + | **Extra turn** | Avatar Kuruk: "Exhaust — Waterbend {20}: Take an extra turn" (artifacts and creatures each pay {1}) | A second combat for A or B |

## Win lines (the turn you win)
- **Line A.** Sun Quan cast the turn before (no haste). Board: Urza, Construct, Worldwalker Helm, 10 artifacts. Helm ({1}{U}) copies the Construct and adds a Map → 12. Ember Island Production ({3}{U}{U}) on a Construct → 13 artifacts: 13/13 + 13/13 + a 17/17 (the copy is "a 4/4", plus N). **43 unblockable** at one player.
- **Line B.** Super State on a Construct (haste covers a fresh one). At 11 artifacts it is a 20/20 flier that deals 20 to the defender and 20 to each other opponent. Two hits kill a 40-life table; Kuruk's extra turn gives the second hit in one turn cycle.
- **Line C.** Fleshraker out, then Rite kicked on Whirler Rogue: 5 Whirler copies, each "create two 1/1 colorless Thopter artifact creature tokens", so 10 pings to each opponent and +10 artifacts (+5 Maps with Helm: each Whirler trigger is its own creation event). The 5 Whirlers then "Tap two untapped artifacts you control: Target creature can't be blocked this turn".

## Copy targets (best first)
| Effect | Text | Best targets | Avoid |
|---|---|---|---|
| **Flesh Duplicate** {U}{U} | "enter as a copy of any creature on the battlefield" (vanishing 3) | Urza (Construct; keep the original Urza when the legend rule hits) · Meteor Golem, yours **or an opponent's** (destroy a nonland permanent) · Whirler Rogue (2 Thopters) · Thought Monitor (draw 2) · Solemn (land now, a card when vanishing kills it) | Kappa (counters don't copy) |
| **Rite of Replication** kicker {5} | "create five of those tokens" | Kicked: **Urza** (5 separate ETBs = 5 Constructs, +5 Maps with Helm; target Urza, not the Construct, which gives one Map) · Whirler Rogue (10 Thopters) · Thought Monitor (10 cards + 5 flying artifacts) · Meteor Golem (5 permanents). Unkicked: Urza, Meteor Golem, Whirler | — |
| **Ember Island Production** {3}{U}{U} | copy "except it's not legendary and it's a 4/4" | **Urza** (a Construct + a second Urza that stays: the engine survives removal) · the Construct ((4+N)/(4+N), also an artifact) · Sai (2 Thopters per artifact spell) · Padeem (2 upkeep draws). Mode 2: an opponent's best creature as a 2/2 | — |
| **Worldwalker Helm** {1}{U},{T} | "copy of target artifact token you control"; every artifact-token creation adds a Map | Construct (always) · Golem 3/3 · Treasure · Clue | Incubator (the copy has no counters) |
| **The Mycosynth Gardens** {X},{T} | "becomes a copy of target nontoken artifact … with mana value X" | **Worldwalker Helm** (X=3: two Helms = two Construct copies a turn, two Maps per token event) · Thran Dynamo (X=4) · Sapphire Medallion (X=2) | ETB cards (it "becomes", nothing enters) and legendary ones (Planetarium, Bident, Fulcrum) |
| **Ghostly Flicker** (instant) | "Exile two target artifacts, creatures, and/or lands you control, then return those cards" | Urza + Meteor Golem · Urza + Whirler · Cryogen Relic (leaves + enters = 2 cards) + Thought Monitor · Urza in response to removal (and a new Construct) | Tokens (they don't come back), Kappa (loses counters) |
| **Karn** +1 | a noncreature artifact becomes a creature "with power and toughness each equal to its mana value" | Planetarium 6/6, Thran Dynamo 4/4 as extra alpha attackers | — |

## Engine map
- **Sai / Efficient Construction:** a Thopter per artifact spell.
- **Traxos:** "Whenever you cast a historic spell, untap Traxos". Tap it for Urza's {U}; every artifact or legendary spell untaps it, so each refunds {U}. It is also a 7/7 trampler.
- **Unstoppable Plan:** "untap all nonland permanents you control" at your end step: Helm twice a cycle, counters held up, Traxos ready.
- **Katara's Reversal:** counter up to four, untap four artifacts = 4 {U} back.
- **Kappa Cannoneer:** +1/+1 and "can't be blocked this turn" whenever an artifact enters.
- **Fleshraker:** every colourless creature entering pings each opponent: Spawn, Thopters, Constructs, Golems, Robots, Kuruk Spirits, Hangarback, Traxos.
- **Protection:** Padeem ("Artifacts you control have hexproof"; the Construct is an artifact), Soul of New Phyrexia {5} indestructible (also from the graveyard), Kappa ward 4, 6 counters.
- **One-sided wipe:** Soul {5}, then The Echoverse Fulcrum {5}.
- **Card flow:** Bident (a card per creature that connects), April O'Neil, Padeem upkeep, Pensive Professor, Planetarium free casts off scry/surveil.

## Pilot rules
- **Don't tap your attackers for mana.** The Construct and Thopters are artifacts. On the kill turn, pay with lands, rocks and Spawn.
- Sun Quan has no haste: cast it the turn before. Super State has haste.
- Flesh Duplicate/Rite copies of Urza die to the legend rule after making their Construct; Ember Island's copy stays.
- Super State's extra damage is not combat damage: Bident draws once.
- Keep a counter or Flicker for Urza; Bane's Contingency also scries 2 and draws when the spell targets him.

## Mulligan
- Keep 2–4 lands plus at least one 2–3 MV rock or cost reducer, with at most 2 cards of 6+ MV (12 % of 7-card hands hold 2+).
- Mulligan a hand with no rock and no 2-drop.
