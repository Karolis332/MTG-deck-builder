# REFUTE-2: Esika // The Prismatic Bridge, round 2 (swaps #16-24)

Reviewer: refuter (Opus). Baseline: REFUTE.md. Inputs: final.txt (08:13), build-report.md (08:16), hit-screen-01..04, hits-pool-01..04, live card DB read-only. Scratch MC: C:/Users/QuLeR/.claude/harness/runs/esika-refute-2026-10-02/mc.py.

**Verdict: CONVERGED on the evidence.** No owned card I can show beats the weakest kept card of its role. The proof text still needs fixes: two section 7 reasons are false, and four owned candidates were never ranked. I ranked them below; all four lose.

| Check | Verdict | Evidence |
|---|---|---|
| 1 swaps | 9/9 KEEP | Paradox x Mentor intact; drain loop has 2 halves; draw count 4 + Theorist |
| 2 close calls | builder upheld 4/4 | 2 reasons incomplete (Longshot, Rune-Scarred Demon) |
| 3 MC | CONFIRMED | Bridge by T6 53.2 / 61.9 (play / draw), T5 41.7 / 50.8 |
| 4 section 7 spot-check | 13/15 true | false: Tatyova, Overlord of the Balemurk; incomplete: Disruptor of Currents |
| 5 gate | CONFIRMED | FAIL only ownership (5 named) and plan |
| 6 new candidates | none improving | Great Henge, Way of the Mind Sculptor, Displacer Kitten, Moonshaker Cavalry unranked by the builder; all lose |

## 3. MC re-run (20,000 games, seed 1, play / draw)

    play {4: 15.9, 5: 41.7, 6: 53.2, 7: 62.7}
    draw {4: 21.3, 5: 50.8, 6: 61.9, 7: 70.4}

Matches the report (53.2 / 61.9 by T6). Doc Samson is not modelled (5 MV, summoning-sick), so the true figure is a little higher.

## 5. Gate re-run

Command: MTG_DB_DIR="C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-10-02/esika/final.txt --format brawl --owner 1 --source arena

    totals : 100 cards | 36 lands (36.8 eff.) | 63 nonland | avg MV 3.83
    curve  : 1:3 2:10 3:13 4:16 5:15 6:3 7:3
    PASS size, singleton, legality, rules, identity, curve, wincons, locks
    FAIL ownership 5: Liliana the Faultless, A-The One Ring, Sarkhan the Masterless, Ugin, the Ineffable, Sanctum Lurker
    WARN arenaNames (Esika, Shatterskull, Fell), WARN lands (Karsten 42 +-2)
    FAIL plan 0/63 (known)

Composition check: 21 creatures + 20 walkers = 41 hits; 4 Ways left (Mentor, Paradox, Deathbringer, Pyromancer); 88 permanent cards (36 lands + 52 nonland), as the Awakener row says.

## 1. Swaps #16-24 (oracle text from the live DB)

| # | Swap | Verdict | Evidence |
|---|---|---|---|
| 16 | +Great Divide Guide -Vraska | KEEP | REFUTE.md proof; MC above |
| 17 | +Enduring Tenacity -Pia | KEEP | "Whenever you gain life, target opponent loses that much life" + returns "It's an enchantment" on death. With Conqueror ("Whenever an opponent loses life, you gain that much life") it loops. Pia: one discard-to-tutor. Sisay still tutors legendary Ways/Oath |
| 18 | +Purphoros -Way of the Warlord | KEEP | "Whenever another creature you control enters, Purphoros deals 2 damage to each opponent": with Vocalist 2 triggers, with Tyrant doubled = 8 per creature. Warlord's granted "[-4]: 2 damage to up to one target creature or planeswalker and 2 damage to target player" is removal (saturated) at 4 loyalty |
| 19 | +Aurora Awakener -Archon of Sun's Grace | KEEP | "Vivid - When this creature enters" works off the Bridge: X = colours among permanents, "Put any number of those permanent cards onto the battlefield" (lands included = ramp). Vocalist doubles it |
| 20 | +Doc Samson -Flux Channeler | KEEP | "put that many plus one" on every Mentor trigger, plus ability, Sage proliferate, Way empower; "{T}: Add X mana of any one color, where X is Doc Samson's power" = 3. Proliferate sources after: Evolution Sage, Tam (Channeler and Tekuthal gone); Doc more than replaces it |
| 21 | +Ajani, Outland Chaperone -Narset | KEEP | "+1: Create a 1/1 ... Kithkin" = Liliana life (x2 Vocalist) and Purphoros trigger each turn; Narset "-2: Look at the top four" digs only |
| 22 | +Starfield Vocalist -Marauding Blight-Priest | KEEP | Drain line intact: Conqueror + Dina ("each opponent loses 1 life") or Conqueror + Tenacity ("loses that much life"), 2 halves as before (Priest + Dina). Vocalist doubles Liliana, Purphoros, Terror, Sage landfall, Ways' empower, Kiora/Garruk CB draws |
| 23 | +Twinflame Tyrant -Way of the Healer | KEEP (contested) | Paradox x Mentor intact. Lost: every walker's "[-2]: Create a 2/2 ... Cadet". Purphoros fuel left: Chandra AoF 2 a turn, Ajani OC +1, Ajani Unrelenting (a Cadet per loyalty activation), Theorist/Ral/Ugin/Eternal Wanderer tokens, Bridge hit. Tyrant doubles Purphoros, Terror, Lurker, AWBO, Chandra ToD. A role call, not a proven loss |
| 24 | +Bre of Clan Stoutarm -Phyrexian Arena | KEEP | Same 1 card a turn, cast free "if the spell's mana value is less than or equal to the amount of life you gained this turn"; Arena "draw a card and lose 1 life". Draw after: A-Ring, Sylvan Library, Bre, Sisay + Theorist static. Lost: Sheoldred +2 per Arena draw (Bre puts the card into hand, not a draw) |

## 2. Close calls (rulings)

- Speedbrood Stalker vs Evolution Sage: **Sage**. Stalker {3}{B}{B} is removal ("sacrifices a creature or planeswalker", doubled by Vocalist) in a saturated role and would be a 16th 5-drop. Sage at 3 MV: "Landfall - Whenever a land you control enters, proliferate", +1 Doc, x2 Vocalist.
- Longshot vs Evolution Sage: **Sage**, but the report reason is incomplete. It omits "Noncreature spells you cast cost {1} less to cast" (42 noncreature spells; no help to the all-coloured Bridge, minus 1 from commander tax). Longshot is 4 MV and the deck is short of early mana, so Sage still wins.
- Rune-Scarred Demon vs Twinflame Tyrant: **Tyrant**, but the reason misses that Vocalist doubles the Demon ETB ("search your library for a card", twice). Still a 4th card at 7+ MV, beside Elesh, Awakener and Craterhoof.
- Curious Colossus vs Twinflame Tyrant: **Tyrant**. The Colossus ETB ("loses all abilities ... base power and toughness 1/1") overlaps Elesh Norn at 7 MV.

## 4. Section 7 spot-check (15 lines vs oracle)

True: Gray Merchant (one ETB drain), Goldspan ("whenever this creature attacks or becomes the target of a spell"), Mulldrifter, Kaito Cunning Infiltrator (L3, loot or 2/1), Smaug ("At the beginning of your upkeep, create a Treasure"), Bard (draw doubling skips the first draw-step draw), Starseer Mentor (dodge by sacrifice/discard), Massacre Girl (own deaths), Exalted Sunborn (token doubling), Witch Enchanter, Brightglass Gearhulk (MV 1 or less: only Liliana), Bloombrute, Huatli (only "-3").
False:
- Tatyova: "same landfall trigger" is wrong. Oracle: "Landfall - Whenever a land you control enters, you gain 1 life and draw a card". It is a draw engine, so compare it with Bre. Ruling: Bre keeps. Tatyova draws depend on land drops, the weak point (tracked 71 % on T6), and cost 5 MV vs 4; Bre can cast free.
- Overlord of the Balemurk: "needs hits already in the graveyard, rare early" is wrong. Oracle: "mill four cards, then you may return a non-Avatar creature card or a planeswalker card". Impending {1}{B} mills first. With 41 hits in 99, at least one hit is in the 4 milled cards about 88 % of the time. Ruling: Bre keeps, because Balemurk is one ETB until it can attack 5 turns later.
Incomplete: Disruptor of Currents is called "a 5-MV bounce" but has "Flash" and "Convoke"; verdict unchanged, since conversion outlets already number 10.

## 6. Owned candidates missing from section 7 and the stop proof (all brawl-legal, arena-owned)

- The Great Henge (owned x4): "This spell costs {X} less to cast, where X is the greatest power among creatures you control. / {T}: Add {G}{G}. You gain 2 life. / Whenever a nontoken creature you control enters, put a +1/+1 counter on it and draw a card." Draw role vs Bre. Once the Bridge is out it draws 2 a turn (Vocalist doubles), plus GG and a Mentor life event each turn. **Ruling: Bre keeps, closest call.** Henge costs 9 minus power: 7-8 MV with only Guide or Esika out, about 5 with Bre-sized bodies. Bre is a fixed 4 MV, a Bridge hit and an Esika mana source. Henge would be the 22nd card at 5+ in a deck whose weak point is mana. Operator choice if they value late-game volume.
- Way of the Mind Sculptor (owned x3, cut round 1, never re-ranked against Bre): "Whenever you activate a loyalty ability, if you removed two or more loyalty counters to activate it, draw a card". Every walker keeps the Deathbringer "[-2]: You may sacrifice a creature" (optional sacrifice), so each walker can draw a card per turn. **Ruling: Bre keeps.** Mind Sculptor needs Deathbringer or native minus abilities plus Mentor/Paradox to pay the loyalty back, is not a hit, and is 5 MV.
- Displacer Kitten (owned x1, screened out): "Whenever you cast a noncreature spell, exile up to one target nonland permanent you control, then return that card". Engine role vs Evolution Sage. **Ruling: Sage keeps.** Kitten flickers reset walker loyalty, and Way flickers re-empower only the Jace token. Sage gives +2 per walker per land with Doc, x2 with Vocalist, at 3 MV vs 4.
- Moonshaker Cavalry (owned x1, screened out): "creatures you control gain flying and get +X/+X". **Ruling: Tyrant keeps.** It is Craterhoof again at 8 MV {W}{W}{W}, a 4th card at 7+.

## Severity

- MEDIUM: section 7 states false oracle facts for Tatyova and Overlord of the Balemurk; verdicts unchanged after re-ranking.
- MEDIUM: stop proof never ranks The Great Henge or Way of the Mind Sculptor against the new weakest draw card (Bre), nor Displacer Kitten or Moonshaker Cavalry (screened out). All lose here, but the report must carry these lines for the proof to be complete.
- LOW: Longshot and Rune-Scarred Demon reasons omit text (cost reduction; Vocalist doubling of the ETB).
- LOW: Disruptor of Currents reason omits Flash and Convoke.
- INFO: gate ownership FAIL now 5 cards (A-The One Ring unmapped to the owned "The One Ring" row), as the report states.
