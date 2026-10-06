# Guides refute: Urza + Inspirit pilot guides (Opus, fresh context), 2026-10-07

## Verdict
- **Urza (`urza-lord-high-artificer.md`): PASS.** Every priority number recomputes exactly. Every card used is in `final-3.txt`, and every stated mana total is available. One LOW wording fix.
- **Inspirit (`inspirit-flagship-vessel.md`): PASS, after the text fixes below.** Every priority number recomputes, and both new traps are true. One MED rules misstatement: Lux Artillery fires only on your end step. Four LOW fixes.
- FAIL threshold used: a wrong rules call, or a wrong number that changes how a line is played. There are none.

## Errors
| # | Guide | Claim (current text) | What is true | Source | Sev | Exact replacement text |
|---|---|---|---|---|---|---|
| 1 | Inspirit L33 | `10 (+2) to each opponent per end step` | Artillery: "At the beginning of **your** end step". Only Tarfire's 2 happens at every end step | Lux Artillery oracle (DB) | MED | `10 to each opponent at each of your end steps (+2 at every end step from Tarfire)` |
| 2 | Inspirit L88 | `**10 to each opponent every end step**` | Same as #1 | Lux Artillery oracle | MED | `**10 to each opponent at each of your end steps**` |
| 3 | Inspirit L135 | `so the wipe kills our artifacts.` | Mode 1 removes the grant, so our artifact **creatures** die. Mode 2 still saves Inspirit (later timestamp in layer 6). Noncreature artifacts aren't hit by "Destroy all creatures" | Final Showdown oracle; CR 613.1f, 611.2c | LOW | `so the wipe kills our artifact creatures (Traxos, Kilo, Sculptor…); rocks are not creatures and survive.` |
| 4 | Inspirit L67 | `21 + 5 × 24 = **141**` | The 77 one sentence earlier includes Inspirit's +1/+1 counter (21 + 55 + 1). The same accounting gives 142 | Recomputed | LOW | `21 + 5 × 24 + 1 = **142**` |
| 5 | Inspirit L21 | `[[Emry, Lurker of the Loch]] for {U} (affinity)` | True, but the turn needs 5 mana: Traxos 4 + Emry 1. That is 4 lands + a T1–2 rock, or 4 mana with Sculptor (Traxos 3) | Traxos {4}, Emry {2}{U} with affinity 2 | LOW | `[[Emry, Lurker of the Loch]] for {U} (affinity; 5 mana in all: 4 lands + a rock, or 4 with Sculptor)` |
| 6 | Inspirit L50 | `**136**, which kills a full table through chump blocks.` | 136 vs 120 life is 16 spare, about 5 per opponent. With double strike + trample, each chump block absorbs only its toughness once (CR 702.19b/d), so a blocker of toughness 6+ on one opponent saves that opponent | CR 702.19b, 702.19d; arithmetic | LOW | `**136**, 16 more than a 40-life table; each chump block absorbs only its toughness once (double strike + trample), so it kills unless one opponent blocks with 6+ toughness.` |
| 7 | Inspirit L62 | `**146 trample**` | Understated by 1, not wrong. Line A counts Kilo's attack proliferate on Traxos's counter; Line B doesn't (147). Optional | Kilo oracle; recomputed | LOW | `**146 trample** (147 with Kilo's attack proliferate)` |
| 8 | Urza L95 | `[[River's Rebuke]] (one player's whole board)` | It returns nonland permanents only | River's Rebuke oracle | LOW | `[[River's Rebuke]] (all nonland permanents of one player)` |

## Maths recomputed (all from the board each line states)
| Line | Recomputation | Result |
|---|---|---|
| Urza A | N = 3 Constructs + Helm + 2 Maps + Signet/Dynamo/Medallion/Sphere = 10. Helm again → N = 12. A 12 + B 12 + C (4 + 12) 16. Mana: Sun Quan 6 − 1 = 5, Helm 2, all from 7 Islands. Open: rocks 5 + Urza taps of 3 Maps, Medallion and the new copy (5) = 10 | 40 ✅, 10 open ✅ |
| Urza B | Super State 9/9 base (613.4b) + N (613.4c) = 19, Helm → 21. Cost 7 + 2 = 9 = 7 Islands + Signet + Sphere. Trample past a 1-toughness blocker = 20. One-hit kill: 9 + N ≥ 40 → N ≥ 31 | 21 each ✅ |
| Urza C | N = 8. Mana 7 + 1 + 3 + 2 = 13. Rite 9 − 1 = 8. 5 ETBs → 10 colourless Thopters (10 Fleshraker pings each opponent) + 5 Maps → N = 23. 12 of 15 new artifacts = 6 activations. 23 + 1 + 1 + 2 + 2 + 1 = 30 | 10 + 30 ✅ |
| Urza mulligan | 36 land-slots (35 + Sink) of 99: 3–4 lands 44.3 %, 2 lands + 1 of 10 rocks 17.6 %, keep 61.9 %, 0–1 lands 20.1 %, 5+ lands 5.8 %, 2 lands no rock 12.1 %. 2+ of 8 six-drops 9.8 %, 3+ 1.1 %. Avg MV 220/65 = 3.38 | all ✅ |
| Insp A Depthshaker | Melee +3. 8 + 10 + 6 + 4 + 8 + 5 × 6 = 66, + Inspirit's counter + Kilo proliferate = 68; × 2 double strike = 136. Cost 7 − 1 = 6 = 5 lands + Furnace, so Seat stays untapped | 68 / 136 ✅ |
| Insp B Bay | X = 10 + Bay + Craterclaw − Cyberdrive = 12. 17 + 19 + 15 + 13 + 4 × 16 + 17 = 145, + 1 = 146. Mana 5 + 2 = 7 lands | 146 ✅ (see #7) |
| Insp hard cast | X = 11; 21 + 5 × 11 + 1 = 77. Panharmonicon X = 12: 21 + 120 = 141, + 1 = 142 | 77 ✅, 141 ❌ (#4) |
| Insp Arsenal | 2 × (5 + N) ≥ 21 → N ≥ 6 (N = 5 gives 20). Glitters: 2N + 6 ≥ 21 → N = 8. Reference N = 11: 32 / 28. Mana R + R + RW = 4 | ✅ |
| Insp Lux | 16 + 4 + 3 + 2 + 3 = 28; Skate ×2 = 56 | 28 ✅ |
| Insp station | Traxos 7 + Emry 1 = 8. Emry affinity 2 → {U}. Untapped by the historic cast | 8 ✅ (mana, #5) |
| Insp odds | 38 lands: 3–5 lands 53.6 %, 2 lands 28.1 %, 1 of 10 rocks 53.7 %. Bygone/Traxos by T4 on the play 19.3 %; 12 bodies with power 3+ 74.3 % | all ✅ |
| Insp sinks | Engine 3 → 6. Autogenerator 3 / 6 / 9. Cannon destroys on turns 2, 3, 4. Gavel 2 × (5 + 6) = 22 | ✅ |

## Traps and timing
- **Final Showdown mode 1 trap: TRUE.** Mode 1 is a layer 6 removal (613.1f), applied to the creatures present at resolution (611.2c). Inspirit loses the grant, so artifact creatures lose indestructible. Wording fix in #3.
- **Bay since the turn began: TRUE.** Once Cyberdrive animates Bay, CR 302.6 applies to its {T} cost. The 2019-05-03 ruling: "It doesn't matter how long the permanent has been a creature". Bay is sorcery speed, so it can't be activated in response to the ETB.
- **Summoning sickness and timing: all correct.** Station / Urza / Whirler / Starforge / waterbend tap other permanents (702.184a, 701.67a, rulings). The Cyberdrive 4/4 outlives the sacrificed Cyberdrive (611.2a). Craterclaw's copy hits the declared attackers (611.2c). Copies are the original's colour (707.2a). Legend rule (704.5j). Warp recast is {9} (702.185a). Equipment that becomes a creature falls off (301.5c). Sacrifice beats indestructible (701.21a). Melee counts opponents attacked (702.121a). Commander damage (903.10a). Horsemanship (702.31b). Exhaust (702.177a). Striation (721.2b).
- **Every card used in a line is in its list** (`final-3.txt` / `inspirit-hotswap.txt`); none missing. Urza has 35 lands, Inspirit 38.

## Quotes checked
**54 quotes** (27 per guide, including 3 CR quotes), word for word against the DB oracle text (`guides-refute/{urza,insp}-oracle.md`) and `cr.txt`. All 54 match; some are partial quotes. Scratch files: `verify-2026-10-06/guides-refute/calc.py` (odds, avg MV, land counts) and the two oracle dumps.
