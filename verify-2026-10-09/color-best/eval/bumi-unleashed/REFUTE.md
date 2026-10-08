# REFUTE: Bumi, Unleashed review (2026-10-09)

**Verdict: PASS.** All 8 swaps hold, but one reported delta is wrong: Augmenter is **+0.01** alone, not +7.86. ALL reproduces exactly at -14.69 -> **37.37 (+52.07)**, DS 19 -> 57.2.

## 1. Swap lab re-run (sleeved base, reviewer swaps.txt, 300 games): `refute/swap-lab.out`
| # | Out -> In | Reviewer | Refuter | Match |
|---|---|---|---|---|
| 1 | Sheltering Landscape -> Riveteers Overlook | +1.98 | +1.98 | yes |
| 2 | Tranquil Landscape -> Lair of the Hydra | +1.89 | +1.89 | yes |
| 3 | Twisted Landscape -> Gruul Turf | +1.89 | +1.89 | yes |
| 4 | Tectonic Split -> Nissa, Who Shakes the World | -0.01 | -0.01 | yes (blind) |
| 5 | Owlbear Cub -> Overrun | 0.00 | -0.00 | yes (blind) |
| 6 | Summon: G.F. Ifrit -> Lavaspur Boots | +3.99 | +3.99 | yes (window: ramp 21 -> 20, pen 23 -> 21) |
| 7 | Circuitous Route -> Silkguard | +3.96 | +3.96 | yes (window: ramp out, protection 2 -> 3) |
| 8 | Part in Friendship -> Guardian Augmenter | +7.86 | **+0.01** | **NO, a 7.85 gap** |
| ALL | | +52.06 (37.37) | +52.07 (37.37) | yes |

- **Finding (swap 8).** The +7.86 is the gap between two ALL rows: final.txt (37.37) minus the Kami-variant ALL (29.51). It is not the single swap. Alone against the sleeved base, Augmenter scores +0.01 (win 38 -> 45, synergy 72 -> 67). REVIEW.md's swap table puts +7.86 in the swap's own row. That number should be +0.01 (blind), with the +7.86 kept only as the in-context win-step note.
- Swaps 1-3 are ~+1.9 each alone because the base is still short 2 cards (structure 0). About +44 of the ALL gain comes from restoring 100 legal cards, as the reviewer says.

## 2. Oracle / rules checks (q.py)
- **Landscapes off-identity: TRUE.** Cycling {R}{G}{W} / {G}{W}{U} / {B}{R}{G} put W, U and B in their identity, so the sleeved deck is illegal.
- **Riveteers Overlook: TRUE.** "When this land enters, sacrifice it. When you do, search ... basic Swamp, Mountain, or Forest ... tapped". That is 2 landfall triggers.
- **Lair of the Hydra: TRUE.** It is "still a land". Lair is usually controlled since the start of turn, so it can attack in Bumi's land-only combat without haste.
- **Gruul Turf: TRUE.** "{T}: Add {R}{G}". Nuance: replaying the bounced land needs an unused land drop.
- **Nissa: TRUE.** The +1 targets "noncreature land" only, so the reviewer's pilot caveat is correct. The final list has 12 Forests for her static.
- **Overrun: TRUE.** "+3/+3 and gain trample until end of turn". Rule 611.2c: only creatures that are creatures when it resolves get the bonus, so earthbend before casting it.
- **Lavaspur Boots: TRUE.** "+1/+0 ... haste and ward {1}. Equip {1}".
- **Silkguard: TRUE.** "Auras, Equipment, and modified creatures you control gain hexproof until end of turn". Counters on Bumi or Boots on Bumi make him modified.
- **Guardian Augmenter: TRUE.** "Flash / Commander creatures you control get +2/+2. / Commanders you control have hexproof."
- **Tectonic Split: quote TRUE, "anti-plan" OVERSTATED.** Sacrificed earthbended lands "return to the battlefield tapped", so they come back as landfall. Still a 6-MV, low-impact card. The cut stands.
- **Part in Friendship: "no setup" claim FALSE.** Earthbended lands are nontoken creatures, so their deaths trigger it, once per turn. It is still a 5-MV value card, so the cut stands.
- **Ifrit, Owlbear and Circuitous Route quotes: TRUE.** Route understated: it puts 2 basics onto the battlefield, which is 2 landfall triggers (Ascension, Harmonizer, Provisioner).
- **Win line 1 math: TRUE.** Bumi 5/4, Toph GE 3/3 with "Land creatures you control have double strike". (5 + 3 + 2x4x2) + (2x4x2) = 40.

## 3. Ownership / freeness / legality
- **All 8 adds owned and free.** Each is in collection.txt (Overlook x2, the rest x1). None is in any decks/paper/decks/*.txt (exact-name match, matcher sanity-checked on Badgermole). None is in the ban list.
- **final.txt is legal.** It has 100 cards, singleton apart from basics, and every card is inside R/G (DB colour_identity check).
- **No locks.** There is no .md pilot guide, and the primer names no locks. The primer itself proposed cutting Tectonic Split, Owlbear and Circuitous Route.

## 4. Merits
| Swap | Pass | Reason |
|---|---|---|
| 1 Overlook | yes | Mandatory identity fix. A fetch-land with a double landfall. |
| 2 Lair | yes | Mandatory fix. A mana sink that attacks in the land-only combat. |
| 3 Gruul Turf | yes | Mandatory fix. Bounce land pays 2 per Bumi untap. Collides with the unsleeved Gilanra draft (1 copy). |
| 4 Nissa | yes | Judgment (model blind). Mana doubling plus a haste land attacker every turn beats a 6-MV Split that sacrifices half the lands. |
| 5 Overrun | yes | Judgment (model blind). A real finisher for a go-wide land army. Owlbear is a 3/3 until opponents reach 8 lands. |
| 6 Boots | yes | Haste lets Bumi connect on the cast turn, plus ward. The +3.99 is window only. |
| 7 Silkguard | yes, marginal | Window-only gain. It cuts a double-landfall ramp spell, but protection was 2 (below window) and ramp stays 19. |
| 8 Augmenter | yes | Merits hold (Bumi hexproof + flash), but the reported +7.86 is wrong: single Δ +0.01, model blind. |

## Notes
- Swap 8's delta should be corrected in REVIEW.md (and in the review JSON).
- Next-in-line candidates if Silkguard is ever reconsidered: put Route back, or cut Faithless Looting instead (per REVIEW.md's draft table).
