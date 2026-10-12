# Bumi, Unleashed: standalone fix plus upgrades (Opus, 2026-10-07)

**Verdict.**
- `final.txt` keeps the operator's deck. It has 3 recommended land fixes and 8 optional swaps, all from uncontested `[FREE]` cards. No `[GIL]` card is used.
- Against the sleeved list (40k games each): keep 7: .593 → .623; Bumi by T5: .787 → .834; screwed: .056 → .016; goldfish P(kill ≤ T6): .556 → .655, mean 6.61 → 6.37; one chump per combat, P(≤ T7): .553 → .688, mean 7.62 → 7.23
- Gate: all PASS, except two known exceptions: `plan` FAIL, the known earthbend false negative.; `lands` WARN: 34 lands, where Karsten wants 38 ±2. The land count is the operator's call.
- `identity.py`: 100 cards, nothing outside R/G.
- `primer-check`: PASS.

## Plan
- Lands are the threats: earthbend makes 0/0 land creatures with haste plus N counters (CR 701.66a).
- [[Bumi]] does three things when he connects: he will "untap all lands you control";; he adds a land-only combat ("Only land creatures can attack", which applies only to that combat; Scryfall ruling 2025-10-02);; each Bumi damage step adds one combat (CR 500.8), so Temur Battle Rage = two extra combats.
- Toph GE gives land creatures double strike, so ×2 per combat, ×4 per turn (CR 510.4).
- T1–3: land ramp plus a first land creature.
- T4–6: Bumi with haste (Boots / Smellerbee / Halana), Toph, Nissa, counters.
- Close: TBR, Overrun, Vitu-Ghazi; Lair of the Hydra as the post-untap sink.
- Backup: a land army that returns tapped after wipes.

## Sim (`sim.py` = `gruul/refute/hh.py` + `patch_sim.py`; seed 7)
- **Base model (hh.py):**; Pod: draw on T1, first mulligan free, then London 6/5.; Keep 7: 3–5 lands, or 2 lands + MV ≤ 2 ramp.; Kill = 40 combat damage to one opponent.; Attackers: creatures held since the turn began (CR 302.6), or with haste.; A land creature tapped for mana does not attack.; Chump (`--chump`): each combat, a 1/1 blocks the biggest attacker without flying or menace; trample pushes power − 1 through.
- **Patches in `patch_sim.py`** (hh.py left these sleeved cards unmodelled): earthbended lands that are sacrificed return tapped (Lotus Field, Roiling Regrowth, Tectonic Split);; Tectonic Split is cast (it was a dead card);; Lair of the Hydra and Crawling Barrens are lethal-only sinks in Bumi's combat;; the G.F. Ifrit saga.
- **Accept bar:** +.015 on goldfish P(≤ T6) or chump P(≤ T7), with no metric worse by more than .010. At 20k games one standard error of a difference is ≈ .005; at 40k it is ≈ .0035.

| List (40k) | Keep 7 | 4th land T4 | Bumi T5 | Screwed | Flooded | Spells T1–8 | Goldfish median (P ≤ T6, mean) | Chump median (P ≤ T7, mean) |
|---|---|---|---|---|---|---|---|---|
| sleeved (landscapes simmed as fetches) | .593 | .732 | .787 | .056 | .005 | 11.68 | T6 (.556, 6.61) | T7 (.553, 7.62) |
| B = 3 fixes only | .592 | .732 | .789 | .056 | .005 | 11.70 | T6 (.557, 6.60) | T7 (.556, 7.62) |
| **final (F2)** | **.623** | **.765** | **.834** | **.016** | .004 | **12.56** | **T6 (.655, 6.37)** | **T7 (.688, 7.23)** |

## Swaps (DB text; leave-one-out = F2 minus that swap, 40k; Δ is open P(≤ T6) / chump P(≤ T7))
| # | Out → In | Verdict | Evidence |
|---|---|---|---|
| 1 | Sheltering Landscape → Riveteers Overlook | recommended | "Cycling {R}{G}{W}" is GRW (CR 903.4). Overlook fetches a Mountain or Forest. Fix sets L1–L7 are all within noise (.547–.569). |
| 2 | Tranquil Landscape → Yavimaya, Cradle of Growth | recommended | GUW. "Each land is a Forest": 5 colourless lands tap G, Rockalanche X = all lands, Nissa doubles every land. |
| 3 | Twisted Landscape → Terramorphic Expanse | recommended | BGR. Same fetch; 4 owned, 0 used. |
| 4 | Lotus Field → Lair of the Hydra | optional | "sacrifice two lands". Single swap +.029 / +.031; leave-one-out −.021 / −.029. |
| 5 | Tectonic Split → Exotic Orchard (land 34) | optional | "sacrifice half the lands". Single swap +.033 / +.026; leave-one-out −.019 / −.027. |
| 6 | Haste Magic → Lavaspur Boots | optional, small | Single swap +.015 open, spells +.20; leave-one-out −.009 / −.011. About 3 SE twice. |
| 7 | Circuitous Route → Cultivate | optional, small | Single swap +.017 open, 4th land T4 +.012; leave-one-out −.008 / −.012. About 3 SE twice. |
| 8 | Earth Kingdom General → Nissa, Who Shakes the World | optional | Single swap chump +.020; leave-one-out chump −.023, spells −.42; links 21 → 33. |
| 9 | Owlbear Cub → Overrun | optional | Owlbear's trigger needs the defender to have 8 lands. Single swap chump +.017; leave-one-out chump −.019; links 8 → 30. |
| 10 | Faithless Looting → Rampant Growth | optional | Single swap (with Ifrit modelled) +.013 / +.021, keep 7 +.018; leave-one-out −.014 / −.023. |
| 11 | Veil of Summer → Silkguard | optional | Same {G} at X = 0. Every earthbended land is "modified" (CR 700.9), so the whole army gets hexproof. Links 0 → 22. The goldfish does not model removal. |

- **Ownership.** Every add is owned and unused in the registry: Overlook 2/0 (Gilanra's proposal wants the other copy);; Orchard 5/4;; Cultivate 2/1;; the others 1/0 or more.
- **Not taken because the Gilanra proposal (`alena-gilanra/consistency.txt`) holds them:** Sheltered Thicket, Fabled Passage, Evolving Wilds, Three Visits, Ilysian Caryatid, Skyshroud Claim, Moraug, Legend of Kyoshi. None measured above the swaps chosen.
- **Basics.** Basics in the fix slots measured .569 open vs .551 for the chosen fix set (var/L4 vs L6). The registry has 65/65 Forests and 26/26 Mountains in decks, so basics are not used; this is a near-tie.

## Stop proofs (weakest kept per role vs every `[FREE]` candidate in `gruul/pool.md`; var/* deltas vs `base`)
- **Lands** (weakest kept: Strip Mine, Cryptic Caves): Strip Mine → land measured +.010 / −.001 (noise).; Bristling Backwoods, Konstrari Annex, Mirage Mesa, Tarnation Vista, Path of Ancestry, Oran-Rief, Sapseep Forest, Desert of the Indomitable, Hashep Oasis: tapped or cost life.; Ash Barrens, Blighted Woodland, Conduit Pylons, Hidden Grotto, Planar Nexus, Study Hall, Opal Palace, Talon Gates, Arcane Lighthouse, Volatile Fault, Nesting Grounds, Reliquary Tower, Radiant Fountain, Locus lands, Urza lands, Temple of the False God, Arid Archway, Lazotep Quarry, Sandstorm Verge, Skycoach Waypoint, Witch's Clinic, Muraganda Raceway, Basilisk Gate, Hidden Nursery, Vesuva, Maestros Theater: colourless, or utility with no Bumi/earthbend link.; Dark Depths + Thespian's Stage: a second plan, so ❌.
- **Cheap ramp** (Frog Butler, Spider Manifestation, Explore, Shared Roots): Ilysian Caryatid +.007 / +.005, and in Spider's slot −.004 / +.002.; Paradise Druid +.008 / −.006.; Three Visits +.008 / −.003.; Nightshade Dryad, Poison Dart Frog, Noxious Newt, Devoted Druid, Animal Attendant, Gene Pollinator, Hardbristle Bandit, Channeler Initiate are the same 2-MV dork.; Wayfarer's Bauble, Expedition Map, Fountainport Bell, Fertile Ground, Abundant Growth, Gift of Paradise, Mana Bloom, Prophetic Prism, Giant's Boulder, Elvish Spirit Guide, Carpet of Flowers, Astral Cornucopia, Lotus Ring, Dance of the Tumbleweeds, Sylvan Scrying, Open the Way, Malevolent Rumble, Animist's Awakening: slower or no land.; Studious First-Year // Rampant Growth: not tested (it casts its spell through "prepared") ❌.
- **3–4 MV ramp** (Tablet of Discovery, Commander's Sphere): Kami of Whispered Hopes +.009 / +.006 and +.007 / +.001.; Cultivate in Tablet's slot +.010 / +.012 (the one spare copy is used).; Skyshroud Claim +.000 / −.002; Domri in Heartbeat's slot +.009 / +.006.; Simulacrum Shaper, Dryad of the Ilysian Grove, Burnished Hart, Jiang Yanggu, Rishkar, both Loots, Selvala, District Guide, Elvish Rejuvenator, Freestrider Lookout, Spider-Man, Map the Frontier, Cycle of Renewal, Harvest Season, Flare of Cultivation, You Happen On a Glade, Hour of Promise, Nissa's Renewal, Through the Forest Gate, Elemental Teachings, Omenpath Journey, Kamahl's Druidic Vow, Hexhaven Invigorator, Mana Reflection, Sword of the Animist, Bitterthorn, Ordeal of Nylea, Druidic Satchel, Eternity Elevator: below these or no measured gain.; All 3–5 MV rocks (Chromatic Lantern, Gruul Locket, Firemind Vessel, Decanter, Murmuring Volume, Potioner's Trove, Solar Array, Bandit's Haul, All-Fates Scroll, Elementalist's Palette, Wickersmith's Tools, Paradise Plume, Tome of the Guildpact, Hedron Archive, Brass Infiniscope, Web Watch, Pristine Talisman): the same as Sphere.; ❌
- **Earthbend engine** (Earth Rumble, Badgermole): Nissa is in.; The Legend of Kyoshi is held by the Gilanra proposal.; Avatar Kyoshi costs 8; Sage of the Maze has 0 Gates; Dance of the Tumbleweeds makes a token, not a land.; Rumble stays as removal: Nissa in Rumble's slot measured +.012 / +.021 vs +.004 / +.020 in the General's slot, which is noise.; ❌
- **Counter growth** (Seismic Tutelage, Crystalline Armor): Hardened Scales −.010 / +.009; Innkeeper's Talent +.002 / −.017.; Ozolith, Benevolent Hydra, Case of the Trampled Garden, Ornery Tumblewagg, Bloodspore Thrinax, Fractal Harness, Forgotten Ancient, Wildwood Scourge, Ferrafor, Moxite Refinery, Edgar, Wilderland Scrounger, Verdurous Gearhulk, Verdant Confluence, Konstrari Charm, Trash the Town, Lion Umbra, Bioengineered Future, Undergrowth Champion, Kinetic Ooze, the X-hydras, Heroes' Bane, Mycoloth, Puca's Covenant: one creature, or no measured gain.; Master's Guidance is held by the Gilanra proposal.; ❌
- **Finishers** (Amarant Coral, Yedora, Braulios): Overrun into any of these slots measured the same, and only one is owned.; Moraug and Gigantic Big Bear are held by the Gilanra proposal.; You Meet in a Tavern (+2/+2, below Overrun), Eldrazi Conscription (8 MV, one creature), Primeval Bounty, Hydra Broodmaster, Avenger (Plants are not lands), Baloth Woodcrasher, Gigantosaurus, Terastodon, Darksteel Colossus, Cityscape Leveler, Rampant Frogantua, Ageless Entity: non-land bodies that miss Bumi's combat.; Sandman, Molimo, Lumra: non-land attackers.; Wrecking Ball Arm, Loxodon Warhammer, Hammer of Nazahn, Sting, Predatory Impetus, Ferocification, Party Dude, Descendants' Fury: one creature.; ❌
- **Haste** (Smellerbee): Samut, Tyrant Smasher does the same job without Smellerbee's draw. Wild Ride, Full Bore, Hellspur Posse Boss (outlaws), Multiclass Baldric ❌.
- **Draw** (Thrill, Seize; 0 links): Harmonize in Seize's slot +.008 / +.003.; Rampant Growth measured the same in the Thrill, Seize and Looting slots; it went to Looting's slot.; Vivien Reid, Chandra Fire Artisan, Seer's Sundial, Mazemind Tome, Lembas, Prophetic Prism, Kozilek, Burning Curiosity, Embrace the Unknown, Cathartic Reunion, Highway Robbery, Naktamun Lorespinner, Mishra's Bauble, Alhammarret's Archive, Realmwalker, Tablet of Compleation, Vexing Bauble: not measured.; ❌
- **Removal** (Savage Smash, Decimate): Rocky Rebuke, Clear Shot, Knockout Maneuver: same power-4 links, below the bar (near-tie).; Cankerbloom, You Find a Cursed Idol, Primal Might, Explosive Derailment, Cathartic Pyre, Violent Echoes, Essence Burn, Skullcrack, No Admittance, Skewer the Critics, Acidic Slime, Wickerbough Elder, Myconid Spore Tender, Kinetic Ooze, Steelbane Hydra, Terastodon, Steel Hellkite, Sarkhan, Jaya, Territory Forge, Argentum Masticore, Devourer of Destiny, Bane of Bala Ged, Breaker of Creation, Warg Tactics, Konstrari Charm, Gruul Charm, Volatile Fault, Take for a Ride, Return the Favor, Spyglass, Torpor Orb, Soulless Jailer: not clearly better.; Chain Reaction, Echoverse Fulcrum, Oblivion Stone, Blast Zone, Caught in the Crossfire: kill our own land creatures.; ❌
- **Protection** (Snakeskin Veil): Silkguard is in. Tyvar's Stand is a near-tie (indestructible; fewer links). Guardian Augmenter, Vivien Champion of the Wilds, Tangle, Fog ❌.

## Report corrections
- `gruul/bumi/build-report.md` §3 #4 and #32 are wrong on the cost.; #4 says Lotus Field "kills two earthbend targets"; #32 says Tectonic Split sacrifices "half the army".; A sacrificed earthbended land returns tapped (CR 701.66a). The real cost is its counters and creature status, or plain lands.; `patch_sim.py` models the return. Both cuts still win on the sim (§Swaps 4–5).
- The gruul `sim.py` and `hh.py` never cast Tectonic Split ("dead" tag) and left the G.F. Ifrit saga unmodelled. Both are now modelled.

## Gate (`gate-final.txt`) and checks
- deck-gate: size, singleton, legality, rules, identity, ownership, arenaNames, curve (avg MV 3.25), wincons (14), locks: all PASS.
- deck-gate exceptions: `lands` WARN (34); `plan` FAIL (the known earthbend false negative).
- `identity.py final.txt`: 100 cards, outside R/G: none.
- synergy (`synergy.py`, links when one card gives what the other wants; additions in-file): final: median 20, Bumi 41 links;; sleeved: median 18;; 0-link cards: Sol Ring, Talisman, Sphere, Tablet, Decimate, Thrill, Seize (mana / interaction / filtering, judged on efficiency).
- `primer-check decks/paper/primers/bumi-unleashed.json --base decks/paper/decks/bumi-unleashed.txt`: PASS (one warn: near-tie alternative Forest is also in the list).
