# Anti-Venom, Horrifying Healer — converged build (Arena Competitive Brawl, mono-W, 1v1)

## 1. Verdict
✅ **`final.txt` converged: 13 swaps vs `quick-v1.txt`** (12 spells changed plus Ancient Den → Plains; still 35 lands, now with a 2nd MDFC). The operator's Chrome Mox and Flawless Maneuver are back: both are legal in Competitive Brawl.
- **Gate (`--format competitivebrawl`):** all PASS except three expected FAILs.
  - `legality` on Chrome Mox + Flawless Maneuver is a false positive. `getLegalityKey` in `src/lib/constants.ts` reuses Scryfall's Historic Brawl `brawl` key for Competitive Brawl, and the operator confirmed both cards are legal.
  - `ownership` flags The Echoverse Fulcrum, which was crafted after the CSV and is owned.
  - `plan` is the known false negative.
  - Two WARNs: `arenaNames` (export 4 MDFC/adventure cards by front face only) and `lands` (35 + 2 MDFC against Karsten's 40 ±2; see §5 Lands).
- **Plan:** fill the graveyard (looters, cyclers, Mesmeric Orb). Cast Anti-Venom on T4–5 and reanimate. Then re-cast him from exile for {2} with airbend (Monk Gyatso turns every targeting into one) to reanimate again.
- **Close:** the Gyatso + {0}-equip + Ashnod's Altar loop with Perilous Myr is infinite damage. The backup is Krang / Zetalpa / Moonshaker beats.
- **Goldfish** (20k games per side, `%TEMP%/av_tools.py`, not in the repo):

| Metric | quick-v1 (play / draw) | final (play / draw) |
|---|---|---|
| Anti-Venom cast ≤T4 | .23 / .39 | **.34 / .46** |
| Anti-Venom cast ≤T5 | .70 / .82 | **.75 / .85** |
| Anti-Venom cast with a fatty in the yard ≤T6 | .36 / .44 | **.44 / .51** |

## 2. Out → In → why (vs `quick-v1.txt`)
| # | Out | In | Why (oracle text from `pool.txt`) |
|---|---|---|---|
| 1 | Cloudbound Moogle | **Krang, Utrom Warlord** | Moogle is the weakest target (a 2/3 flyer). Krang: "Flying, trample, indestructible, haste / Other artifact creatures you control have flying, trample, indestructible, and haste." Reanimated, it swings for 9 the same turn. It is a legend (Seriema / Seek the Heart fetch it to discard) and an artifact (Tune Up, Enlightened Tutor). |
| 2 | Lavaspur Boots | **Perilous Myr** | "When this creature dies, it deals 2 damage to any target." This is the combo's kill (§4 A). Lavaspur only repeated Swiftfoot's "Equip {1}". |
| 3 | Aang, the Last Airbender | **Éowyn, Lady of Rohan** | Aang is a one-shot ("When Aang enters, airbend up to one other target nonland permanent."). Éowyn gives "At the beginning of combat on your turn, target creature gains…" (a free Gyatso trigger every turn) and "Equip abilities you activate cost {1} less to activate." That makes Swiftfoot's equip {0}, a second Greaves for the loop. |
| 4 | Mind Stone | **The One Ring** | Mind Stone's "{T}: Add {C}" can't pay {W}{W}{W}{W}{W}. The One Ring: "When The One Ring enters, if you cast it, you gain protection from everything until your next turn." plus "{T}: Put a burden counter on The One Ring, then draw a card for each burden counter". Mono-W has no other draw engine. |
| 5 | Sheltered by Ghosts | **Flawless Maneuver** | Sheltered "exile[s] target nonland permanent an opponent controls until this Aura leaves the battlefield". Every airbend of the enchanted creature hands their card back, which fights our engine. Flawless: "If you control a commander, you may cast this spell without paying its mana cost. / Creatures you control gain indestructible until end of turn." Gyatso already turns targeted removal into a {2} re-cast, so wipes are the real threat. This is free wipe insurance on every turn Anti-Venom is out, beside Teferi's Protection and Flare. It also beats Emergency Eject (the weakest removal, §5). |
| 6 | Day of Judgment | **Mesmeric Orb** | It was the 4th wipe effect (Avatar's Wrath, Divine Reckoning, Echoverse, Wanderer −4 stay). Orb: "Whenever a permanent becomes untapped, that permanent's controller mills a card." That fills 3–6 cards a turn (the operator's "fill the grave very fast"). |
| 7 | Urza's Ruinous Blast | **The Arkenstone** (Seek the Heart) | Blast: "Exile all nonland permanents that aren't legendary." It exiles our Greaves, Boots, Altar, rocks, Oltec, Myr and every nonlegendary fatty (Moonshaker, Colossus, Battlesphere, Meteor Golem, Alabaster, Ravager). Seek the Heart: "Search your library for a legendary creature card…" is a 2nd Gyatso tutor. The Arkenstone later gives "At the beginning of your end step, draw a card." |
| 8 | Helping Hand | **Tune Up** | Helping Hand only returns "mana value 3 or less" (no fatty, no Gyatso). Tune Up: "Return target artifact card from your graveyard to the battlefield." Krang, Battlesphere and Meteor Golem come back without the commander, and so do Greaves and Altar if milled. |
| 9 | Mox Opal | **Network Terminal** | Opal works only with "three or more artifacts". Terminal: "{T}: Add one mana of any color. / {1}, {T}, Tap another untapped artifact you control: Draw a card, then discard a card." That is a guaranteed T3 source plus a discard outlet. |
| 10 | Mox Amber | **Coldsteel Heart** | Amber needs "legendary creatures and planeswalkers you control". Heart: "This artifact enters tapped. / As this artifact enters, choose a color." Choose W: a T2 Heart puts Anti-Venom on T4. Goldfish for 9 + 10: Anti-Venom ≤T4 .22 → .28 (play) and .39 → .44 (draw). |
| 11 | Cloudshift | **Witch Enchanter** (MDFC) | Ephemerate (rebound) already does Cloudshift's job. The MDFC adds a land drop ("As this land enters, you may pay 3 life… {T}: Add {W}.") or "destroy target artifact or enchantment an opponent controls". Anti-Venom ≤T5 .71 → .74 (play). |
| 12 | Ancient Den | Plains | With no Opal left, the artifact type is only exposure to artifact wipes. A basic also keeps Abandoned Air Temple untapped. |
| 13 | Ticket Tortoise | **Chrome Mox** | "Imprint — When this artifact enters, you may exile a nonartifact, nonland card from your hand. / {T}: Add one mana of any of the exiled card's colors." Imprint a spare removal or protection spell, never a fatty. Goldfish: Anti-Venom ≤T4 .29 → .34 (play) and .46 → .46 (draw). It keeps Tortoise's catch-up value on the draw and adds T4 casts on the play. |

## 3. Plan shape
- **T1–3 (fill + mana):** make every land drop.
  - T2: Coldsteel Heart, Arcane Signet, Ornithopter of Paradise, Thrór's Map, Mesmeric Orb, A.I.M. Synthoids, or Echoverse.
  - T1: Chrome Mox (imprint a spare removal or protection spell).
  - On the draw, cast Sunstar Expansionist **before** the land drop, so the opponent controls more lands.
  - T3: Network Terminal, Murmuring Volume, Bender's Waterskin, Airlift Chaplain, Restoration of Eiganjo (Plains now, discard on II), The Seriema / Seek the Heart (Gyatso, or Krang to discard), Oltec, or Éowyn.
  - Spare {2}: cycle Alabaster Host Intercessor (plainscycling) or Eldrazi Ravager. Loot fatties away with Map, Volume, Terminal or Liliana.
- **T4–6 (engine):**
  - Anti-Venom with 4 lands + 1 W rock reanimates the best target: Krang (swings now) > Moonshaker / Zetalpa / Colossus / Elesh > Alabaster / Meteor Golem (removal) > Gyatso (if milled).
  - Next, Gyatso plus any targeter re-casts him for {2}. Targeters: Greaves {0}, Swiftfoot {1} ({0} with Éowyn), Éowyn's combat trigger, Teleportation Circle at end step, Liliana, Teyo, Ephemerate, Restoration Magic.
  - Gandalf makes every cast reanimate two.
- **Close:** the §4 A loop on the turn Gyatso + Greaves/Éowyn-Swiftfoot + Altar are out. Otherwise hasted or evasive fatties. Avatar's Wrath ("Choose up to one target creature, then airbend all other creatures") keeps Krang and clears the board. We re-cast ours for {2}; theirs are locked out by "your opponents can't cast spells from anywhere other than their hands".
- **Protection:** Gyatso also triggers on the **opponent's** targeting, so any removal aimed at a creature other than Gyatso becomes an airbend and a {2} re-cast. Flawless Maneuver (free while Anti-Venom is out; destroy and damage only), Teferi's Protection, Flare of Fortitude and Appa, Steadfast Guardian (flash, "airbend any number of other target nonland permanents you control") cover wipes.

## 4. Combo lines (exact sequence and mana)
**A — infinite damage.**
- **Needs:** Anti-Venom, Monk Gyatso, Lightning Greaves (not attached to Anti-Venom: shroud would stop the targeting), Ashnod's Altar, Perilous Myr in the graveyard, and {2} to start (or sacrifice a spare creature to Altar).

| Step | Action | Mana |
|---|---|---|
| 1 | Greaves "Equip {0}" targeting Anti-Venom. Gyatso: "you may airbend that creature" → exile. The equip fizzles. | 0 |
| 2 | Cast Anti-Venom from exile "for {2} rather than its mana cost". No commander tax from exile. | −2 |
| 3 | "When Anti-Venom enters, if he was cast, return target creature card from your graveyard to the battlefield" → Perilous Myr. | 0 |
| 4 | Altar: "Sacrifice a creature: Add {C}{C}". Myr: "deals 2 damage to any target" → opponent. | +2 |
| 5 | Back to 1 (equip is sorcery-speed, so let the Myr trigger resolve first). | net 0 |

- 2 damage per loop: 13 loops at 25 life.
- With Gandalf: "If … an artifact entering or leaving the battlefield causes a triggered ability … that ability triggers an additional time" → 4 damage per loop.
- **A′ (no Greaves):** Swiftfoot Boots + Éowyn ("Equip abilities you activate cost {1} less") = Equip {0}. Same loop.
- **A″ (equip {1}, no Éowyn):** add Oltec Matterweaver ("Whenever you cast a creature spell … Create a 1/1 colorless Gnome artifact creature token").
  - Per loop: pay equip 1 + cast 2 = 3; Altar gives Myr {C}{C} + Gnome {C}{C} = 4 → **+1 mana per loop**.
  - Without Myr, Oltec alone makes the loop mana-neutral (Gnome pays the {2}). Any creature card in the yard is then sacrificed for extra {C}{C}: infinite colourless mana.

**B — no Perilous Myr.** Loop any creature card X (Altar returns the {2}):
- **Moonshaker Cavalry** ("creatures you control gain flying and get +X/+X until end of turn"): stacks without limit on creatures held since the turn began (Gyatso). Attack for lethal in the air.
- **Meteor Golem** ("destroy target nonland permanent an opponent controls"): clears their board.
- **Liliana the Faultless** ("Whenever another creature … enters, you gain 1 life"): infinite life.
- **Aang, Airbending Master** ("leave the battlefield without dying, you get an experience counter"): one Ally per counter at upkeep.

**C — fair T4:**
- T2 Coldsteel Heart.
- T3 Seriema → Krang to hand; Map/Terminal loot Krang away.
- T4 Anti-Venom ({W}×5 = 4 lands + Heart) → Krang. Haste: 9 flying trample now; 18 by the next turn.

**D — no commander:** Krang in the yard + Tune Up ({3}{W}) on T4 → same 9-power hasty swing.

## 5. Stop proofs (weakest kept card per role vs every owned candidate)
Every owned candidate below lost to the weakest kept card of its role.

**Engine / airbend** (Gyatso, Gandalf, Appa SG, Aang AM, Appa LSB, Reversal, Lesson, Ascension, Avatar's Wrath, Éowyn). Weakest kept: **Airbender Ascension** ({1}{W}, "airbend up to one target creature" now; end-step blink at 4 counters; works without Gyatso).
- Aang, the Last Airbender: one-shot for 4.
- Glider Staff: 3 + "Equip {2}".
- The Legend of Yangchen: airbends only after chapter III.
- Flickering Hound: "exile up to one other target creature" fires while Anti-Venom is still the spell on the stack.
- The Wind Crystal: re-cast {1}, but no targeting.
- **Near-ties (alternatives to Éowyn):** Koth of the Homestead ("Whenever a Plains you control enters, put a +1/+1 counter on target creature"), Agent Bishop, Tezzeret, Cruel Captain ("0: Untap target artifact or creature"), Rescue Girl. Each is one free targeting per turn but lacks Éowyn's equip discount.

**Gyatso targeters** (Greaves, Swiftfoot, Ephemerate, Teyo, Liliana, Restoration Magic, Teleportation Circle; plus Éowyn, Mountain-king III, Wanderer +1). Weakest kept: **Teyo** (flash, "target permanent you control gains hexproof").
- Cloudshift: Ephemerate is better; the slot went to a land.
- Lavaspur Boots, Skateboard, Bone Saw, Adventuring Gear, Short Bow, Well-Worn Spatula, Goldvein Pick, Trusty Boomerang, The Dominion Bracelet, The Black Arrow, Glimmerlight, S.H.I.E.L.D. Spy Kit, Crystal Fragments, Ancestral Blade, Bark of Doran: all "Equip {1}" like Swiftfoot, none gives hexproof + haste. Cloud and Enlightened Tutor already find Greaves/Swiftfoot.
- Personify, Daydream, Getaway Glamer, Rhys, Patriot, Prehistoric Pet, Flock Impostor, Sunpearl Kirin, Exosuit Savior, Ennis, Icewind Stalwart, Silver Sable, Jeong Jeong's Deserters, Sigiled Sentinel, Lotusguard Disciple: one-shots without Teyo's flash protection.
- Pump/protect instants (Enter the Avatar State, Lightfoot Technique, Take Up the Shield, Reroute Systems, Valorous Stance, Stone by Sunlight, Spectacular Tactics): one-shots, no body.
- Kíli: "pay {0} rather than … the first equip" duplicates Greaves.

**Grave fillers** (Map, Volume, Terminal, Chaplain, Synthoids, Mountain-king, Restoration of Eiganjo, Echoverse, Orb, Liliana; Alabaster/Ravager cycling). Weakest kept: **A.I.M. Synthoids** ("surveil 2", a 2-MV artifact body for Altar and Krang). Goldfish, fatty-in-yard by T5/T6:
- Eye of Jace (instead of Cloudshift): +.00–.02, within noise.
- Watcher of the Wayside: +.01.
- Celebrate the Mountain-king (instead of Eject): +.01–.02.
- Cloudbound Moogle (instead of Orb): −.01/−.02.

Not tested in the goldfish:
- Excavated Wall: 1 card/turn.
- Racers' Scoreboard: 4 MV.
- Unsettling Twins, Conductive Machete: 4 MV, 1 card.
- Mechanical Mobster: connive.
- Lunatic Pandora, Owlin Historian, Shore Lurker, Wurmwall Sweeper: surveil 1–2 at higher cost.
- Rabaroo Troop, Jennika: plainscycling bodies that are poor targets.
- Surveillance Room, Conduit Pylons, Eden: colourless lands.
- Kozilek's Command: needs {C}{C}.
- Bag of Holding: "exile that card from your graveyard" works against us.

**Reanimation targets** (Krang, Zetalpa, Elesh Norn, Moonshaker, Curious Colossus, Battlesphere, Meteor Golem, Alabaster, Ravager). Weakest kept: **Eldrazi Ravager** (6/6, "Annihilator 1", "Cycling {2}" fills itself).
- Breaker of Creation (8/4, hexproof from each color, annihilator 2): **near-tie**, but it can't put itself in the yard.
- Bane of Bala Ged, Lyra, Angelic Guardian, Archive Arbiter (Meteor Golem also hits creatures), Goring Ceratops: no self-fill and less immediate impact.
- Bygone Colossus, Iron Giant: vanilla.
- Maelstrom Colossus: cascade only "When you cast".
- The Walls of Ba Sing Se: 0/30 defender.
- Anticausal Vestige, Guarded Heir, Ranger Squadron.
- Kithkeeper: X = 1 colour.
- Sundering, Transcendent and Rancorous Archaic: converge counts 0 colours when reanimated.
- Cloudbound Moogle: cut.

**Ramp incl. catch-up** (Chrome Mox, Signet, Coldsteel, Ornithopter, Waterskin, Volume, Terminal, Auracite; catch-up Expansionist, Beza; plus Map and Restoration of Eiganjo for lands). Weakest kept: **Coldsteel Heart** (enters tapped).
- Ticket Tortoise: cut for Chrome Mox (§2 row 13).
  - Goldfish of Chrome Mox in each ramp slot, Anti-Venom ≤T4 (play / draw): Tortoise .34 / .46, Coldsteel .30 / .47, Waterskin .30 / .47, Terminal .30 / .47, a Plains .33 / .50.
  - Tortoise is the slot that costs nothing on the draw. The operator's catch-up ask stays with Expansionist and Beza.
- Mox Amber, Mox Opal: cut (§2 rows 9–10).
- Mind Stone, Hedron Archive, Palladium Myr, Pristine Talisman: colourless.
- Hot Dog Cart, Oasis Gardener, Alloy Myr, Heraldic Banner, Replicating Ring, Chromatic Lantern, Phial, Potioner's Trove, Starting Column, Weather Maker, Firdoch Core, Dragonstorm Globe, Dependable Quinjet: the same T3 effect as Terminal/Waterskin, without the loot or the off-turn untap.
- Long-Bodied Grey Dog, Dauntless Scrapbot: a tapped Treasure, or a Lander that costs {2}.
- Troop of Ponies, Burnished Hart, Solemn, Wayfarer's Bauble, Navigation Orb: the land arrives after T4.
- Clay-Fired Bricks, Roads Go Ever, Ever On: lands to hand, not mana.
- Firemind Vessel: "two mana of different colors".
- The Wind Crystal: never reduces {W}{W}{W}{W}{W}.

**Removal** (Swords, Path, Iceberg, Eternal Wanderer, White Auracite; MDFCs Witch Enchanter, Razorgrass; Reversal; Eiganjo channel). Weakest kept: **Aang's Iceberg** ("Flash / When this enchantment enters, exile up to one other target nonland permanent until this enchantment leaves the battlefield.").
- Emergency Eject: cut for Flawless Maneuver (§2 row 5). Every candidate below lost to Eject, so it also loses to Iceberg.
- Erode, Unwanted Remake, Harsh Annotation, Ossification, Dimensional Exile, Stasis Snare, Glass Casket, Seam Rip: creature-only or limited, with Swords/Path already in.
- Banishing Light, Stormplain Detainment, Web Up, Trapped in the Screen, Lassoed by the Law, Liminal Hold, Perilous Snare: sorcery-speed "until … leaves".
- Celebrate the Mountain-king: 4 MV sorcery speed, behind Eject.
- Reduce to Memory, Touch the Spirit Realm, Make Your Move, Pyrrhic Strike: narrower.
- Fate of the Sun-Cryst, Ride's End, Grounded for Life, Seized from Slumber, Quicksand Whirlpool, Magnificent End, Ajani's Response: full price unless the target is tapped.
- Ugin, the Ineffable: 6 MV, the Wanderer slot.

**Wipes** (Avatar's Wrath, Divine Reckoning; plus Echoverse "{5}, {T}, Exile…: Destroy all creatures" and Wanderer −4). Weakest kept: **Divine Reckoning** (we keep Anti-Venom or Krang; our dead go to the yard; flashback).
- Day of Judgment: cut (§2 row 6).
- Urza's Ruinous Blast: cut (§2 row 7).
- Fumigate: Day of Judgment for 5.
- Sunfall, Beyond the Quiet: "Exile all creatures" takes our creatures out of the graveyard plan.
- Settle the Wreckage: attackers only.
- Winnowing, Destined Confrontation, Perilous Vault, Pinnacle Starcage: symmetric or self-damaging.

**Protection** (Flawless Maneuver, Teferi's Protection, Flare of Fortitude, Restoration Magic; plus Teyo, Swiftfoot, Ephemerate, Appa SG, Lesson, Reversal, Gyatso). Weakest kept: **Restoration Magic**.
- Its "Cure — {0} — Target permanent gains hexproof and indestructible" is also a 1-mana Gyatso targeting. It is the only one that saves Gyatso himself from targeted exile, so Flawless took Eject's slot rather than this one.
- Dawn's Truce, Surge of Salvation, Spectacular Spider-Man, Gideon's Sacrifice, Angel's Grace, Shardmage's Rescue, Bofur, Lightfoot Technique, Take Up the Shield, Mithril Coat, The Walls of Ba Sing Se, Hakoda, Duty Beyond Death: none are both protection and a {W} targeting.

**Recursion** (Phoenix Down, Tune Up, Restoration Seminar; plus Mountain-king II, Restoration of Eiganjo II, Anti-Venom). Weakest kept: **Phoenix Down** (its "mana value 4 or less" covers Gyatso, at instant speed).
- Helping Hand: cut.
- Recommission: MV ≤3, so no Gyatso.
- Rescue Skiff: 6 MV, one creature; **near-tie** with Seminar's repeating paradigm.
- Return to the Light Realms: 9 MV.
- Primary Research, Sun-Blessed Healer, Astelli Reclaimer, Fateshaper Aspirant (to hand), Buried Ruin (colourless land), Leonardo's Technique, Call a Surprise Witness, Dewdrop Cure, Scout for Survivors, Return to the Ranks, Valkyrie's Call, Wayspeaker Bodyguard, Daily Bugle Reporters, Lotus-Eye Mystics, Meanders Guide, Slumbering Walker, Savior of the Small: MV caps or to-hand only.

**Draw** (The One Ring, plus Lesson, Chaplain, the loot engines, The Arkenstone). Weakest kept: **The One Ring** (the only engine).
- Mirror of Galadriel, G'raha Tia ("only once each turn"), Hedron Archive, Racers' Scoreboard, Reckoner Bankbuster, Inspiring Overseer, Wall of Omens, Helpful Hunter, Kindly Customer, Danitha, Sword of Hope, Sram, Weapons Vendor, Errand-Rider, Market Gnome, Solemn: one card each or capped, behind "draw a card for each burden counter".

**Lands: 35 + 2 MDFC (35.8 effective; the gate's Karsten number is 40 ±2).** The 40 counts avg MV 3.50, which includes 9 creatures of MV 6–9 that are cycled, discarded or milled and reanimated, never cast. Above MV 5, only Appa LSB, the Wanderer and Restoration Seminar are cast.
- Goldfish of the land count (Anti-Venom ≤T5, play; measured before Chrome Mox, which adds +.01):

| Lands | 34+2 | 35+2 | 36+2 |
|---|---|---|---|
| Anti-Venom ≤T5 (play) | .71 | **.74** | .76 |

  Returns diminish, so stop at 35. Eight W/any-colour rocks, two catch-up cards, plus 3 land-to-hand effects, cover the rest.
- Colourless lands: only Cavern of Souls ("Spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered" → name Hero; W for Anti-Venom, uncounterable re-casts).
- Rejected:
  - Colourless: Surveillance Room, Conduit Pylons, Bonders' Enclave, Buried Ruin, Eden, Dark Depths + Thespian's Stage, Hall of Echoes.
  - Great Hall of the Citadel ("{1}, {T}: Add two mana…": no net mana).
  - Avengers Tower: Hero mana only.
  - Tapped W lands: Secluded Steppe, Gate to the Citadel, Hidden Courtyard, Adagia, Thriving Heath, Mistveil Plains.
  - Starting Town, Multiversal Passage, Command Tower: a Plains that costs life, or just a Plains.

## 6. Synergy density
- **Method:** each card's direct partners in the final 99 + commander, via role tags (provider → user), each pair counted once (`%TEMP%/av_links.py`).
- **Totals:** 376 pairs. All nonland: min 0, median 11. Excluding the efficiency-judged removal/mana/draw/protection: min 4, median 13. The commander has 49 partners.
- **5 lowest (non-exempt):**

| Links | Card | Why it stays |
|---|---|---|
| 4 | Airbender's Reversal | engine (airbend), instant |
| 4 | Airbending Lesson | engine (airbend), instant |
| 4 | Avatar's Wrath | engine (airbend) + wipe |
| 5 | Elesh Norn | power target |
| 5 | Zetalpa | power target |

- **Exempt at 0:** Swords, Path, Iceberg, the two MDFCs.
- **Hubs:** Gyatso 24, Tune Up 23, Altar 22, Airbender Ascension 19, Perilous Myr 16.

## 7. Open risks
- ⚠️ **Operator's call:** the original list had Mox Amber, Mox Opal, Day of Judgment, Urza's Ruinous Blast, Helping Hand, Lavaspur Boots, Cloudshift and Sheltered by Ghosts. All 8 are cut here. Chrome Mox and Flawless Maneuver (also on the original list) are back.
- ⚠️ **The goldfish is crude:** no opponent, and Volume/Terminal are counted for both mana and loot in one turn. Amber is assumed live only after a cheap legend. The Mox cuts rest on a +.06 T4 gain, so treat them as near-tie if the operator likes the Moxes.
- ⚠️ **Mesmeric Orb is symmetric:** it feeds opposing graveyard decks and can mill Gyatso, Greaves or Altar. Phoenix Down, Tune Up, Restoration of Eiganjo II and Anti-Venom recover them.
- ⚠️ **Arena prompts:**
  - Decline "move to command zone" when Anti-Venom is airbended.
  - Gyatso's "you may" fires on every targeting, including the opponent's.
  - Keep Greaves off Anti-Venom: shroud stops our own targeting.
- ❓ **Starting life:** 25 (Brawl 1v1) is assumed for the 13-loop count.
- ❓ **Not run:** the model lab (blind to airbend loops, per the brief). No refuter pass yet.
- ❓ **Near-ties to revisit after games:**
  - Koth / Agent Bishop / Tezzeret vs Éowyn
  - Breaker of Creation vs Ravager
  - Emergency Eject vs Aang's Iceberg
  - Ticket Tortoise vs Chrome Mox (if Arena rejects the Mox, Tortoise is the drop-in; Eject replaces Flawless)
  - Rescue Skiff vs Restoration Seminar
  - Eye of Jace vs the 35th land
