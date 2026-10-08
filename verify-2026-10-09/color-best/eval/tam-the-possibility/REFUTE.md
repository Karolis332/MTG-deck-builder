# Tam, the Possibility — refuter pass on REVIEW.md (2026-10-09)

**Verdict: PARTIAL — 6 of 7 swaps PASS, Settle the Wreckage → Tomik FAILS.**
Lab re-run: `refute-swap-lab.txt` (300 games, run on 4 of 8 cores): every per-swap Δ and ALL **−0.09** match the reviewer exactly. BASE 43.17 / DS 63.6.

## Lab check
| Swap | Reviewer Δ | Refuter Δ | DS | Reading |
|---|---|---|---|---|
| Fumigate → Windfall | +0.02 | +0.02 | 0.0 | noise |
| Thrummingbird → Loyal Tutor | −0.02 | −0.02 | 0.0 | noise |
| Ral Zarek → Diabolic Tutor | −0.03 | −0.03 | 0.0 | noise |
| Tezzeret MotB → Way of the Cryomancer | −2.01 | −2.01 | 0.0 | window (draw) |
| Nissa SoE → Jace, Multiverse Architect | −1.99 | −1.99 | 0.0 | window (draw) |
| Chandra AI → Expansion Algorithm | +1.98 | +1.98 | 0.0 | window |
| Settle → Tomik | +1.98 | +1.98 | 0.0 | window |
| ALL | −0.09 | −0.09 | 63.6 | flat; wipes 7 → 4, protection 6 → 5 |
Model blind on every add: no swap clears 0.25 on score. Judgment decides.

## Ownership / legality
All 7 ins are in `decks/paper/collection.txt` (1 copy each), in no `decks/paper/decks/*.txt`, not in the ban file. Singleton holds; all within WUBRG. No pilot-guide lock is cut (the guide names no card locks; Settle and Fumigate are named as tools in §5, not locks).
Loyal Tutor / Expansion Algorithm came from the 16ebd62 precon-list registration: unconfirmed until the operator has them in hand.

## Oracle / rules check (q.py)
| Claim | Result |
|---|---|
| Windfall same-turn kill after JRS 0 (draw ≥2 from a 1-card library, CR 704.5b) | ✅ |
| Loyal Tutor, Diabolic Tutor text; Great Hall can't pay Diabolic | ✅ |
| Cryomancer "empower Jace 5" + walker "[−3]: … copy that spell"; Pia fetches enchantments; 8 Ways = 39 empower (Healer 5) | ✅ |
| JMA loyalty 4, counts among Jaces, {2} attack tax, +1 draw two | ✅ |
| Expansion Algorithm "Proliferate X times" | ✅ |
| Tomik static text | ✅ (but a 2/1) |
| **Chandra AI −3 "kills our dorks and Tam"** | ❌ Tam is 2/4; 3 damage does not kill him (guide §5 line 80 states it correctly: "kills every dork") |
| **"Tezzeret is weak with about 7 artifacts"** | ❌ misframed: 7 is the deck's artifact count (Sol Ring, Signet, 3 Talismans, Lotus, Chimil); +2 X counts artifacts you control. If 7 were on board +2 = 7 to each opponent, the best drain in the deck |
| Wipes 7 → 5 | ⚠️ model counts 4 after the swaps |
| Guide errors 1–6 (Final Act hits player counters only + erases Vraska poison; Elspeth −3 kills our Beasts/Leviathans/Dragons; §1 ranking stale; Ajani+Liliana needs Paradox for 2 gains; Prismatic Bridge reveals, does not search) | ✅ all confirmed against oracle |

## Verdicts
| # | Out → In | Pass | Reason |
|---|---|---|---|
| 1 | Fumigate → Windfall | ✅ | Closes the lock the same turn instead of 2 draw steps later; Fumigate kills Tam/Tender/Guide. 10-03 converged list made the same cut |
| 2 | Thrummingbird → Loyal Tutor | ✅ | Instant-speed JRS/JMA access beats a 1/1 that needs combat damage. Matches 10-03 |
| 3 | Ral Zarek → Diabolic Tutor | ✅ | 2nd unrestricted tutor for the single JRS; Ral's coin-flip −7 is off-plan. BB is castable (Tower, Confluence, 4 tri-lands, B duals, Talisman of Dominance; not counted exactly). Matches 10-03 |
| 4 | Tezzeret → Way of the Cryomancer | ✅ (judgment) | +5 Jace empower serves the primary; costs the backup drain's best walker. Review's "weak" premise is wrong, conclusion survives. 10-03 kept Tezzeret: operator note |
| 5 | Nissa SoE → Jace, Multiverse Architect | ✅ | 3rd Jace counts toward 25 and taxes attacks on Jaces; Nissa is filler. Matches 10-03 |
| 6 | Chandra AI → Expansion Algorithm | ✅ | Proliferate X adds X to every Jace and poison. Fix the why: Chandra −3 does not kill Tam. Matches 10-03 |
| 7 | Settle → Tomik | ❌ | 10-03 converged list ran Tomik AND Settle. With Fumigate + Chandra AI out, cutting Settle too deepens the S1 failure mode (walkers attacked down) |

## Why #7 fails
The 10-03 refuter's S1 finding: lock odds by T9 fall .59 → .22 once walkers are attacked. This swap set already removes two anti-creature cards (Fumigate, Chandra AI's −3). Tomik is a 2/1 that dies to every removal spell and to our own Deluge, Final Act and Ajani U −3. It also lets each opponent send one creature at every walker. Settle exiles a whole alpha at instant speed. Tomik is right; Settle is the wrong out. Keep Settle and lab-test Tomik in another slot (Sarkhan the Masterless or Kaito are the review's own weakest walkers, but the model scores them −5.6 on its win step, so the operator decides).

## Guide fixes owed (not applied: refuter edits only this file)
Review errors 1–6 stand. Add: Chandra AI is cut, so line 80 and the rank-1 burn line lose Chandra AI; Tezzeret leaves the drain list.
