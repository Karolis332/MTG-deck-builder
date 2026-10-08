# Beledros Witherbloom — refuter pass (2026-10-09)

**Overall: PARTIAL.** The null result (no swaps) holds. The swap lab and the climb numbers reproduce exactly. Two claims in REVIEW.md are wrong. One of them, guide error 2, would put a new rules error into the guide if applied as written.

## 1. Swap lab (re-run, sleeved base, 300 games)
| Swap | Reviewer | Refuter | Match |
|---|---|---|---|
| BASE | 90.50 / DS 86.1 / pen 4 / win 83 | 90.50 / DS 86.1 / pen 4 / win 83 | ✅ |
| Skorpekh Lord => Arnyn, Deathbloom Botanist | −8.56 (win 83→72) | −8.56 (win 83→72) | ✅ |
| ALL | 81.95 (−8.56) | 81.95 (−8.56) | ✅ |

Climb `climb/results-0.jsonl`: the 4 swaps read +4.09 / +1.97 / +3.21 / +0.26. They match REVIEW.md. converged=false and passes=2 are confirmed. The swaps cut Dark Ritual and Culling Ritual (operator decisions) and Ashnod's Altar (guide lock). Rejecting all four is correct.

The proposed swap set is **empty**, so no proposed card change reaches a verdict. The reviewer tested Skorpekh → Arnyn and rejected it. That rejection is confirmed: −8.56 is the win-component step and Deck Score is flat elsewhere (model blind). Arnyn is owned and free (collection.txt, in no deck file). Identity B is legal.

## 2. Oracle and rules checks (q.py)
| REVIEW claim | Verdict |
|---|---|
| Err 1: tokens never return via undying (CR 111.7, 704.5d) | ✅ correct |
| **Err 2: Saw in Half on own Beledros → "two 2/2 flying copies, each with its own upkeep Pest and pay-10"** | ❌ **wrong.** Both tokens are legendary copies named Beledros Witherbloom. The legend rule (CR 704.5j) keeps one; the other goes to the graveyard. Result: **one** 2/2 flying copy + one token death trigger. The underlying point (the commander dies; CR 903.9a) is correct, and Saw does fizzle removal aimed at him. |
| Err 3: Vesuva/Stage never target Beledros; Greaves shroud blocks own Repast and Saw | ✅ |
| Err 4: Imp's Mischief, Veil, Repast, Saw protect him | ✅ (Veil covers blue/black only) |
| Err 5: Morbid Opportunist counts tokens, once each turn | ✅ |
| Err 6/10: Veinwitch Coven, Deadly Tempest, Alhammarret's Archive, Victimize not in the 99 | ✅ (grep of sleeved list) |
| Err 7: Mikaeus grants undying only to "Other non-Human creatures" | ✅ |
| Err 8: Stage "becomes a copy" (no ETB); Vesuva copying Rot Farm triggers the bounce | ✅ |
| Err 9: 36 lands + Repast = 37; 35 left in 92 → 62 % (2 draws) / 77 % (3 draws) | ✅ recomputed: 61.9 % / 76.7 % |
| Err 11: Turn Stones is a sorcery copy → one cast per own turn; own upkeep Pest is summoning-sick for Roots | ✅ (Pestfinder re-prepares at each end step, but the copy is sorcery-speed) |
| Err 12 / Arnyn section: Liege +1/+1 per colour → Pests 3/3; Mikaeus 2/2; Baloth +2/+2; Blech counters | ✅ |
| Gray Merchant math: Vito 4X (lethal X=10), Vito+Bond 7X (X=6) | ✅ |
| Skorpekh: unearth exile replacement → never "dies"; Command Protocols hits 1 other artifact creature (Argentum Masticore) | ✅ |
| **Arnyn section: "Viscera Seer is the only free instant-speed creature outlet besides Altar and High Market"** | ❌ **wrong.** Yahenni, Undying Partisan: "Sacrifice another creature: Yahenni gains indestructible until end of turn" is a free, instant-speed outlet in the 99. Minor: the Arnyn → OUT conclusion does not depend on it. |

## 3. Ownership, singleton, identity
No "in" card is proposed. Arnyn (tested only) is owned and free. The sleeved list has 95 lines: singleton holds except basics (5 Forest, 5 Swamp), and every card is B/G.

## 4. Judgment
- The null result is correct. Every climb gain is a role-window step that cuts a lock or an operator decision. Zulaport → Conduit Pylons (+0.26 at 100 games, within noise) cuts a core table drain for a filler land.
- Arnyn stays OUT. Δ ≈ 0 in the neutral slots (Seer +0.05, Artist +0.02), so the model is blind to it. The anthems switch off its P/T ≤ 1 clause, and it drains one opponent where Zulaport/Cauldron/Cleric drain all three. This is judgment, not score.

## 5. Required corrections before the guide is edited
1. Guide error 2 must read: Saw in Half on your own Beledros → two token copies, legend rule keeps **one** 2/2 flier (its own upkeep Pest and pay-10 untap). The second copy dies (drain/Opportunist triggers). Still the best answer to targeted removal on him unless he is wearing Greaves.
2. The Arnyn section must count Yahenni as a free instant-speed outlet.

The other 11 guide errors are verified and may be applied as written.
