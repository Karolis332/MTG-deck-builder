# The Cabbage Merchant — refute 2026-10-09

**Verdict: PASS** — all 6 changes hold. Lab rerun reproduces every Δ exactly; oracle quotes verified; all adds owned, free, singleton, identity G. No pilot-guide lock exists, none cut.

## 1. Swap lab rerun (base100 = sleeved 99 + 28th Forest, 300 games)
Output: `refute/swap-lab.txt`. base100 differs from the sleeved list only by the Forest (checked).

| Out → In | Reviewer Δ | Refuter Δ | DS Δ | What the number is |
|---|---|---|---|---|
| Forest (100th) → Lembas | −0.17 | −0.17 | 0.0 | noise, model blind |
| Wild Growth → Rocky Rebuke | +4.03 | +4.03 | 0.0 | window only (pen 10→8) |
| Basking Broodscale → Warg Tactics | +5.36 | +5.36 | +1.4 | window +4, real +1.4 (win 69→70) |
| Cultivate → Zuko's Exile | +3.96 | +3.96 | 0.0 | window only |
| Autumn's Veil → Tyvar's Stand | 0.00 | 0.00 | 0.0 | model blind |
| Emil → Vivien Reid | +2.04 | +2.04 | 0.0 | window only (pen 10→9) |
| **ALL** | **+13.22** | **+13.22** (67.04 → 80.26) | +1.3 | pen 10→4 |

No sign flips, no difference > 1.0. Only Warg Tactics shows card quality on the Deck Score; the rest is the role-window penalty, so judgment decides them.

## 2. Oracle / rules checks (q.py)
- ✅ Lembas, Rocky Rebuke, Warg Tactics, Zuko's Exile, Tyvar's Stand, Vivien Reid, Autumn's Veil, Emil, Displaced Dinosaurs, Transmutation Font, Ramunap quotes match.
- ✅ Loop: Trudge Garden "Whenever you gain life, you may pay {2}" → Beast; Took + Manufactor → Food + Clue + Treasure; the 3 noncreature tokens tap for {G} via Jaheira at once (the Beast is summoning sick); Wurmlet "Whenever an artifact you control enters, you gain 1 life" = 3 triggers + Propagator 1. Unbounded, nets ≥ +{G}. Correct.
- ⚠️ REVIEW omits that Zuko's Exile costs **{5}** (colourless) and gives the target's controller a Clue. The claim "only unconditional instant exile" holds in the free pool (others: Primal Might ×2 sorcery fight, Cleanup Crew, Meteor Golem 7).
- ✅ Guide errors 1–7 confirmed: Kodama's Reach, Idol of Oblivion, Pest Infestation are not in the sleeved 99 (now in Beledros / Tazri); Ramunap and Springbloom absent from the guide; "becomes a 7/7" line present; Dinosaurs only affects historic permanents as they enter.

## 3. Ownership / freeness / structure
- ✅ All 6 adds: 1 copy in `collection.txt`, in no `decks/paper/decks/*.txt`, not in the ban file.
- ✅ `final.txt` = commander + 99, no duplicate non-basic, 27 Forests; diff vs base100 is exactly the 6 changes.
- ✅ Identity: all adds G or colourless.

## 4. Merits
| Out → In | Pass | Reason |
|---|---|---|
| — → Lembas | ✅ | 2-mana cantrip Food: Wurmlet life → Trudge, Trail dig, Took draw, commander mana. Judgment pick; a 28th Forest is the safe fallback. |
| Wild Growth → Rocky Rebuke | ✅ | 1-mana ramp at 16 ramp is surplus; one-sided instant bite with 4/4 tramplers. Removal 6 is the real hole. |
| Basking Broodscale → Warg Tactics | ✅ | Broodscale has no repeat counter source here; Warg answers fliers (guide §7 weak spot) or shields Took. Only add with a real DS gain. |
| Cultivate → Zuko's Exile | ✅ | Ramp 16→13 still fine; instant exile of artifact/creature/enchantment. Cost {5} unstated in review — slow, but ramp covers it. |
| Autumn's Veil → Tyvar's Stand | ✅ | Veil only stops "blue or black spells"; Stand gives hexproof + indestructible against every colour and wipes. Model blind; judgment. |
| Emil → Vivien Reid | ✅ | Emil's X ≈ 2–4 distinct lands; trample already on Beasts. Vivien answers fliers/artifacts, +1 card flow, −8 emblem. Loses a Chord/Propagator body. |

## 5. Residual risks (not blocking)
- Mana component 98 → 93 (lands 36 → 35 vs lab base, ramp 13). Watch for stumbles; Forest over Lembas is the fallback.
- Curve rises: Zuko {5} and Vivien {5} replace a 3-drop sorcery and a 3-drop creature.
- Still 1 wipe-like effect; no free mono-G fix.
