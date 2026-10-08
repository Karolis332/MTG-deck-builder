# REFUTE — Gilanra + Alena (gilanra-alena-partners), 2026-10-09

**Verdict: PARTIAL — 6 of 8 swaps pass. Swap 4 (Slinza) and swap 7 (Bane) fail.**

## 1. Swap lab (re-run on the sleeved base, 300 games)
The lab is blind: 46 cards read as `missing` (every red card and all 15 Mountains), so Deck Score is 19 at BASE and 0.0 for every single swap. Every delta is the role-window penalty, not card quality. The reviewer did not run the lab, so there is no number to compare and no sign flip to report.

| Swap | My Δ | Reading |
|---|---|---|
| Avatar → Hexhaven | −0.18 | noise |
| Fling → Frog | +1.79 | ramp window (pen 34→33) |
| Roxanne → Caryatid | +2.00 | ramp window |
| Slinza → Florahedron | +1.96 | ramp window |
| Planar Eng. → Selvala | +3.95 | window + advantage 47→60 |
| Recluse → Annex | −0.06 | noise |
| Bane → Thicket | −2.13 | wipe window 1→0, interaction 11→9 |
| Ruric → Echoes | 0.00 | blind (Echoes reads as missing) |
| **ALL** | **+8.70** | −37.02 → −28.32; 8 of the 8.7 is the penalty (34→30) |

The model can't judge this deck, so judgment decides every swap below.

## 2. Oracle and rules checks (q.py)
- ✅ Hexhaven: "Whenever this creature is dealt damage, you may search … land cards". The enablers check out: Warstorm Surge and Terror of the Peaks ("any target"), Burning Sun's Avatar ("up to one target creature"), Drakuseth, Myojin, Ravager ("fight another target creature", only if tribute isn't paid) and Ragebeast (fights an opponent's creature, so Hexhaven takes damage). Baloths landfall and Ulvenwald Hydra growth are correct.
- ✅ Avatar's double strike is symmetric ("All creatures"). Fling's sacrifice cost, Caryatid's power-4 clause, Planar Engineering's "Sacrifice two lands", Bane's "destroy all artifacts and enchantments" (the 9 own permanents are all in the list), Ruric's "a player casts", Violent Echoes being an instant, and Selvala's symmetric draw are all quoted correctly.
- ✅ Konstrari Annex reads "enters tapped unless you control a planeswalker". The review's "Domri or Garruk" matches the deck's walkers.
- ❌ **Slinza (swap 4) is misrepresented.** The review quotes only "Beast spells you cast cost {2} less". Slinza also says "Whenever Slinza or another creature with power 4 or greater enters, you may pay {1}{R/G}. When you do, Slinza fights target creature you don't control." With 33+ creatures of power ≥ 4, that is repeatable removal. The cut rationale leaves out the card's main function.
- ⚠️ Frog: "Gilanra comes down on T2" is false. Frog cast on T2 taps on T3, and Gilanra costs 3, so Gilanra lands on T3 as usual. Only Llanowar enables T2 Gilanra. The real gain is Alena on T4.
- ⚠️ Ruric: "we cast 11 noncreature spells". The sleeved list has 12 (Signet, Sol, Talisman, Vortex, Warstorm, Fling, Planetarium, Domri, Garruk, Planar, Shamanic, Traverse). Minor.
- ✅ Echoes as "the only instant-speed removal" is true after Fling leaves. Fling is the only other instant.
- ✅ Guide error 4: Moraug's landfall says "if it's your main phase". Confirmed.

## 3. Ownership / freeness / legality
- ✅ All 8 "in" cards are in `collection.txt` (1 copy each).
- ✅ None is in any `decks/paper/decks/*.txt`, none is in the ban file, and none is already in the sleeved list.
- ✅ Every card is inside R/G identity. Singleton holds. `proposed.txt` equals sleeved + these 8 swaps (100 cards).
- ✅ No locks are named in the pilot guide, so no locked card was cut.

## 4. Merits
1. ✅ **Avatar → Hexhaven.** Operator request. Avatar's symmetric double strike plus forced attacks is a liability. Hexhaven turns the deck's own damage triggers into lands and Baloths tokens. Risk: the GGGG cost.
2. ✅ **Fling → Frog.** Fling is card disadvantage. The 2-drop any-colour dork fixes the keep-7 weakness (.60). Fix the T2 claim.
3. ✅ **Roxanne → Caryatid.** A 5-MV tapped-rock maker becomes a 2-MV dork that makes 2 mana once any 4-power creature is out. It is 1 mana early, before that.
4. ❌ **Slinza → Florahedron.** It cuts a fight-on-every-fatty removal engine. The deck's removal is already thin, and it loses Fling and Bane in this same batch. Put Florahedron in for a deferred filler instead (Havoc Eater, Emergent Woodwurm or Conclave Sledge-Captain).
5. ✅ **Planar Eng. → Selvala.** Selvala's X mana with 5–8 power bodies far exceeds Planar Engineering's net +2 lands. Risks: she is fragile at 2/3 power and her draw is symmetric.
6. ✅ **Recluse → Annex.** Land 37 in a deck built on 6-drops. Recluse's cascade is a coin-flip.
7. ❌ **Bane → Thicket.** It leaves **zero enchantment answers** (Hoard-Smelter only hits artifacts). The review admits the hole and defers the fix. Cleanup Crew is owned and free, costs 6 MV (so it draws off Gilanra), and has "Destroy target enchantment"/artifact modes. Do **Bane → Cleanup Crew**, and put Thicket in for a deferred filler (or for the Slinza slot's alternative).
8. ✅ **Ruric → Echoes.** Ruric punishes our own 11 noncreature spells and must attack. Echoes is clean instant removal.

## 5. Notes
- Every number in REVIEW.md is the deck's own goldfish (seed 7). I did not re-run `sim6.py`. My only independent number is the blind lab.
- Guide errors 2, 3 and 5 (counts in the draft) were not re-counted here. Error 4 is confirmed.
