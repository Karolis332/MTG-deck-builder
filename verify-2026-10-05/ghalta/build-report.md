# Arena Standard R/G "Ways + walkers + Ghalta": optimisation report (2026-10-05)

Input: `input.txt` (60 cards, 20 lands). Output: `final.txt` (60 cards, 23 lands). Quick list: `quick-v1.txt`.
Pool: all 1,284 cards in `pool.md` were read. Card text is quoted from the DB; rulings come from Scryfall (fetched 2026-10-05).

## §1 Plan (kept: the operator's plan holds up)
- **Engine.** Every Way empowers the single Jace token. Scryfall: "If you control a Jace planeswalker token, you can't choose to create a new one." Way of the Pyromancer gives that token, and every other walker, "[+1]: Add {R}."
- Ajani Unrelenting: "Whenever you activate a loyalty ability, create a 2/2 colorless Wizard Soldier creature token named Cadet." Each activation of Jace, Chandra or Garruk therefore makes a 2/2.
- Way of the Paradox gains 1 life per activation and grants an extra land drop.
- **T1–3:** Llanowar Elves, then Spider Manifestation or Way of the Pyromancer. The Jace token makes R and turns Konstrari Annex untapped. On T3 (a dork plus 3 lands), cast Chandra, Leatherhead or Aerid; Overlord's impending side also fits here.
- **T4–6:** Garruk, Terror of the Peaks, Way of the Wildspeaker, Ajani. Activations feed Cadets, Terror pings and Garruk draws.
- **Close:**
  - Ghalta, Primal Hunger ("costs {X} less … total power") and Ghalta the Unstoppable ("greatest power", gives trample).
  - Terror triggers: a Ghalta entering = 8 or 12 damage to any target.
  - Ajani +1 "haste".
  - Late engine: Improvisation Capstone.
- Pilot note: Ajani −3 "deals 4 damage to each creature except for tokens you control". It also kills our own Terror, Leatherhead, Aerid and dorks, so fire it only when the trade favours us.

## §2 The app model's claims (`model.json`), judged against card text

| Claim | Verdict | Why |
|---|---|---|
| 20 lands vs Karsten 23 | ✅ accept | Formula on the final list gives 23.2 (§5); 22 in the quick list, 23 in final |
| Ramp 18 vs max 8 | ❌ reject | A commander quota. It counts Ways, Aerid and Puppetbeast as ramp. Real ≤2-MV accel = 11, priced into Karsten's −0.28/card term |
| Card draw 2 (min 4) | ❌ reject | Jace token "[−3]: Draw a card" (4 Ways), Garruk "creature … power 4 or greater enters, draw a card", Ajani −2, Chandra +1. Deck Score: 7.7 draw units by T4 |
| Protection 0 (min 2) | ❌ reject | Walkers are defended by bodies (Spider reach, Cadets, Beasts). Leatherhead "enters with a hexproof counter" |
| Avg MV 3.90 vs 2.7 | ⚠️ partial | 2.7 is an aggro target, and the Ghaltas' printed 12/9 inflate it. Cut the uncheapened 8-drop and 2 Capstones → 3.54 |
| Puppetbeast → Surrak | ⚠️ cut yes, add no | Puppetbeast is out for Leatherhead (cheaper, hexproof). Surrak links to nothing but power (§4) |
| Aerid → Leatherhead | ⚠️ add yes, cut no | Aerid stays: 5/4 flyer for 4 that makes a Heartwood "enters or dies". Leatherhead replaces Puppetbeast |
| Tethermage → Meltstrider's Resolve | ⚠️ cut yes, add no | Resolve needs our creature to fight; Sear/Burst are unconditional |
| Way of the Paradox → Keen-Eyed Curator | ❌ reject | Paradox only 3→2 (legend rule makes the 3rd copy weak). Curator needs "four or more card types" exiled; no plan link |
| Way of the Pyromancer → Burst Lightning | ⚠️ add yes, cut no | Burst ×4 added. Pyromancer is the Jace mana engine and stays at 3 |
| Spider Manifestation → Self-Destruct | ❌ reject | Spider goes 3→4. Self-Destruct damages our own creature for X |
| Llanowar Elves → Clockwork Percussionist | ❌ reject | Llanowar goes 2→4 (best T1 play) |
| Adds Ba Sing Se / Starting Town | ✅ / ❌ | Ba Sing Se ×1 (G, "tapped unless you control a basic land": 12 basics). Starting Town "enters tapped unless it's your first, second, or third turn" and pays life for colour |
| Byway Barterer, Hawkeye, Stalactite Dagger, Cantankerous Keepers | ❌ reject | Aggro or tribal cards with 0 links to walkers/Ghalta |

## §3 Swaps (operator → final), net 21 out / 21 in

| Out → In | Why (DB text) |
|---|---|
| 4 Multiversal Passage → 4 Konstrari Annex | Passage: "you may pay 2 life. If you don't, it enters tapped" (one colour). Annex: "enters tapped unless you control a planeswalker" (R or G); the Jace token counts |
| — → +1 Stomping Ground, +1 Forest, +1 Ba Sing Se | 20 → 23 lands (Karsten, §5); 2nd shock dual (owned 2) |
| 4 Bushwhack → 4 Burst Lightning | Bushwhack's removal mode is "fights" (needs our creature). Burst: "deals 2 damage to any target … kicked, it deals 4" |
| 3 Konstrari Charm → 2 Sear + 1 Spider Manifestation | Charm kills only a "creature with flying". Sear: "4 damage to target creature or planeswalker", instant. Spider: "untap this creature" on MV≥4 casts (16 such cards) |
| 3 Tenured Tethermage → 2 Llanowar Elves + 1 Way of the Warlord | Tethermage is a 3-MV 1/1 that nets +1 source after "sacrifice a land". Llanowar: T1 "{T}: Add {G}". Warlord: Jace +5 and walkers get "[−4]: … 2 damage to up to one target creature or planeswalker and 2 damage to target player" |
| 3 Hungering Puppetbeast → 1 Leatherhead + 2 Terror of the Peaks | Terror: "Whenever another creature you control enters, this creature deals damage equal to that creature's power to any target" (Cadets 2, Beasts 4, Ghalta 8/12). Leatherhead 5/4 trample hexproof for 4 |
| 1 Way of the Paradox → 1 Way of the Wildspeaker | Legend rule on Paradox #3. Wildspeaker: "empower Jace 7" and walkers get "[−4]: Create a 4/4 green Beast creature token with trample" (feeds Garruk draw, Terror, Ghalta) |
| 2 Improvisation Capstone + 1 Ghalta, Stampede Tyrant → (−3 seven-plus drops, funds the 3 lands) | Tyrant costs a flat {5}{G}{G}{G} with no reduction. Capstone #2/#3 only re-buy the same paradigm engine; 1 copy stays as the late engine |

## §4 Stop proof per role (full pool swept; best left out vs weakest kept)

| Role (kept) | Weakest kept | Best left out | Why the kept card wins |
|---|---|---|---|
| Lands 23 | 7th Forest / Ba Sing Se | Starting Town, Fabled Passage, Commercial District, Temple of Abandon, Cavern of Souls, Multiversal Passage | Basics enable Ba Sing Se; the others enter tapped, cost life or give C only |
| ≤2-MV accel 11 (Llanowar 4, Spider 4, Pyromancer 3) | Spider #4 | Bloom Tender (G, +R only with a red permanent), Great Forest Druid 0/4, Ruby, Noxious Newt, Raucous Audience | Spider fixes R and G, blocks flyers ("Reach"), and untaps on every MV≥4 spell |
| 3-MV ramp 0 | — | Tenured Tethermage, Transdimensional Bovine, Earthbender Ascension, Wood Elves | Accel already 11 plus 23 lands; a 3-MV ramp slot loses to Warlord/Paradox (card + removal on the Jace) |
| Removal 6 (Burst 4, Sear 2) + walker abilities | Sear #2 | Konstrari Charm (flyers only), Essence Burn (black/green only), Lightning Strike (3 dmg), Fiery Annihilation (3 MV), Compel Brutality (needs walker/creature), Iroh's Demonstration (sorcery), No Admittance (sorcery 3) | Sear: 2-MV instant, 4 damage, hits walkers. Others are narrower, slower or smaller |
| Jace engine / CA 6 (Pyromancer 3, Paradox 2, Warlord 1) + Wildspeaker | Way of the Warlord | Paradox #3, Garruk's Uprising, Arcane Amphisbaena, Inspired Tethermage | Paradox #3 dies to the legend rule. Uprising duplicates Garruk's draw. Amphisbaena/Inspired give 2 loyalty and no removal |
| Walkers 7 (Chandra 2, Garruk 2, Ajani 3) | Ajani #3 | Tezzeret, Cruel Captain (artifact walker; −3 tutors "mana value 1 or less" artifacts, none here) | Ajani is the engine; Chandra, Garruk and Terror are at full owned count |
| Creature threats (Terror 2, Aerid, Hexhaven, Leatherhead, Overlord) | Overlord / Leatherhead | Hungering Puppetbeast, Surrak, Bumi Unleashed, Rhino, Ojer Axonil, Kiora | Overlord is ramp at 3 (impending) or a 6/5 at 5. Bumi/Rhino are strong but give no loyalty or Jace link, and the 5-slot is full |
| 7+ finishers 3 (Ghalta PH, Ghalta U, Capstone) | Capstone | Ghalta Stampede Tyrant, Capstone #2, Craterhoof, Doubling Season, Primeval Bounty | The two Ghaltas cost 3–5 in practice; the rest are 7–8 with no reduction |

Synergy density (distinct partners in the list; interaction and lands judged on efficiency):
- Highest: Garruk ~13, Spider ~12, Terror ~11, Wildspeaker ~11, Ajani ~10, Ghalta PH ~10. Ways 7 each; Annex 7.
- Lowest 5: Llanowar 4, Leatherhead 5, Hexhaven 5, Overlord 5, Aerid 6. Median ≈ 7.
- The cut cards scored lower: Tethermage 2–3, Charm 2, Bushwhack 1–2, Stampede Tyrant ~2.

## §5 Mana

- **Land count.** Karsten 60-card regression: 19.59 + 1.90 × 3.54 − 0.28 × 11 cheap accel = **23.2 → 23 lands**.
  - The gate says "Karsten wants 23 ±2". The Deck Score mana component went 79 → 98.
- **Lands (23):** 2 Stomping Ground, 4 Rockfall Vale, 4 Konstrari Annex, 1 Ba Sing Se, 7 Forest, 5 Mountain.
  - G sources: 18 lands, plus Llanowar 4 and Spider 4.
  - R sources: 15 lands, plus Spider 4 and the Jace token's "+1: Add {R}".
- **Requirements:** principles.md §3.2 99-card table, scaled by land share (×23/41).

| Card | Cost | Needs | Have | |
|---|---|---|---|---|
| Way of the Pyromancer | 1R | 11 R | 15 | ✅ |
| Chandra | 2RR | 15 R | 15 + Spider | ✅ |
| Terror | 3RR | 13 R | 15 | ✅ |
| Ajani | 4RR | 12 R | 15 | ✅ |
| Leatherhead | 2GG | 15 G | 18 | ✅ |
| Aerid / Overlord (impending) | 1RGG / 1GG | 16 G | 18 | ✅ |
| Garruk | 3GG | 13 G | 18 | ✅ |
| Hexhaven | GGGG | 22 G | 18 + dorks | ⚠️ late 1-of, accepted |

- **T1 G for Llanowar:** untapped on T1 are 7 Forest + 2 Stomping Ground = 9 (Rockfall, Annex and Ba Sing Se enter tapped on T1). That is the main gap → crafts in §7.
- **Tapped-land weight:** Rockfall (tapped only as land 1–2) and Annex (tapped until a walker). About 3.3 tapland-equivalents, inside Karsten's 60-card midrange budget of ≤ 9.

## §6 Model and Deck Score: before → after; gate

| Metric | input.txt | final.txt |
|---|---|---|
| Optimizer score (build-api /optimize) | 55 | **80** |
| Deck Score 1.4.0-rc10 (provisional) | 61, rank 28 | **78, rank 63** |
| mana / curve / interaction | 79.4 / 79 / 90 | 98 / 83 / 94 |
| advantage / win / synergy | 94.5 / 85 / 51.7 | 82.3 / 85 / 72.4 |
| Lands / avg MV / 7+ drops | 20 / 3.90 / 6 | 23 / 3.54 / 3 |

- Remaining model notes on final: "cutting 6 ramp (14/8)" and "protection 0". Both rejected in §2.
- Advantage dipped because Bushwhack and Charm counted as "cheap velocity". Curve flags "3-drops 3/10". Every 3-MV candidate lost its role comparison in §4.
- Model output: `model-final.json`. Gate output: `final.gate.txt`.
- **Gate:** all checks PASS (size, singleton, legality, rules, Arena names, lands 23, curve, wincons 9, locks) except ownership. Ownership FAILs only on the expected FRA cards newer than the 4-day-old CSV: Aerid Konstrari, Hexhaven Invigorator, Ghalta the Unstoppable.
- **Copy counts above the CSV** (the gate checks presence, not copies): Ajani 3, Garruk 2 and Way of the Pyromancer 3 are in the operator's own list, so they are owned. Ways of the Warlord and Wildspeaker are 1 each, as the CSV shows.

## §7 Wildcard crafts (unowned, fill the §5 gap) and optional Bo3 sideboard

| Craft | Rarity | Replaces | Why |
|---|---|---|---|
| 4 Thornspire Verge (DSK) | rare | 2 Forest, 2 Mountain | "{T}: Add {R}. {T}: Add {G}. Activate only if you control a Mountain or a Forest". Untapped T1 (R), a dual from T2 |
| 2 Stomping Ground | rare | 1 Forest, 1 Mountain | Untapped R/G dual ("you may pay 2 life"), lifts T1 untapped G from 9 to 10 and R from 7 to 8 |
| 1 Chandra, Torch of Defiance | mythic | Sear #2 | 3rd copy of the best 4-drop. "+1: Add {R}{R}" ramps to Ajani on T4 |

Optional sideboard (15, all owned):
- 3 Konstrari Charm (flyers)
- 2 Essence Burn (Mono-G / Dimir: "5 damage to target black or green creature")
- 2 Fiery Annihilation (5 damage, exile)
- 2 Pyroclasm (go-wide Boros; it also kills our dorks)
- 2 Unforgiving Aim (flyer or enchantment)
- 2 Glorious Decay (artifact / flyer / graveyard)
- 1 Keen-Eyed Curator (graveyard)
- 1 Surrak, Elusive Hunter ("can't be countered", vs Izzet/Dimir)

## Alternative plan (one section, not recommended now)
- The DB's top Standard deck is Mono-Green Landfall: 260 lists from Aug–Sep, 68.7 % game win rate. Its core is Sazh's Chocobo, Mightform Harmonizer, Earthbender Ascension, Icetill Explorer, Sapling Nursery, Esper Origins, Escape Tunnel, Fabled Passage and Ba Sing Se.
- The operator owns most of it but only 1 Mightform Harmonizer (the lists run 3–4), 2 Esper Origins and 3 Icetill, and no Leyline Weaver.
- The data also ends 2026-09-10, before Reality Fracture. So it is not *clearly* stronger with owned copies. Revisit after ~3 Harmonizer crafts and a post-FRA meta scrape.
