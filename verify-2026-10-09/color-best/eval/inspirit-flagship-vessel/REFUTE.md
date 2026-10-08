# REFUTE: Inspirit, Flagship Vessel (2026-10-09)

**Verdict: PARTIAL.** 5 of 6 swaps pass. Swap 3 (Radiant Summit → Oblivion Stone) fails.
The model can't see any of the six (Deck Score flat for all), so every verdict below is a judgment call.

## 1. Swap lab re-run (sleeved base, 300 games): `refute/lab.txt`
| Swap | Reviewer Δ | Mine | Note |
|---|---|---|---|
| Temple of Epiphany → Sink into Stupor | +0.09 | +0.09 | noise |
| Mystic Monastery → Filigree Attendant | −0.01 | −0.01 | noise |
| Radiant Summit → Oblivion Stone | −0.07 | −0.07 | not counted as a wipe (board_wipe stays 2) |
| Lux Artillery → Unstoppable Plan | −0.02 | −0.02 | noise |
| Lasting Tarfire → Resculpt | +22.65 | +22.65 | win step T14 → T13, gone in ALL |
| Chandra, Spark Hunter → Katara's Reversal | −0.65 | −0.65 | win 7 → 6 step |
| ALL six | +1.99 | **+1.99** | removal penalty 5 → 4 |
| ALL without O-Stone (`refute/lab-pass.txt`) | — | **+2.05** | 37 lands incl. MDFC |

The numbers match exactly, with no sign flips. None of the swaps clears the 0.25 bar on Deck Score.

## 2. Oracle and rules checks (q.py)
- ✅ Correct quotes: Sink into Stupor, Filigree Attendant, Oblivion Stone, Unstoppable Plan, Katara's Reversal, Lux Artillery, Chandra (no other Vehicle in the 99, so she animates only her own token), Traxos, Inspirit 8+, Craterclaw (MV 7 = Cyberdrive MV 6 + 1 for Bay), Depthshaker, Arsenal + Boros Charm (2 × (5 + N) ≥ 21 at N = 6).
- ⚠️ **Resculpt quote is truncated.** The full text goes on: "Its controller creates a 4/4 blue and red Elemental creature token." The review never mentions that the opponent gets a 4/4.
- ⚠️ **"One-sided" O-Stone is overstated.** At 8+ it also destroys every non-artifact we control: Jhoira, Tekuthal, Deepglow Skate, Blade Historian, Urza, Tezzeret, All That Glitters, and the new Unstoppable Plan. Inspirit needs its own fate counter ({4}, {T}), and O-Stone can't fire on the same turn without an untap. That is 3 + 4 + 5 = 12 mana over two turns.
- ⚠️ "Urza works twice a round": Urza has no {T} ability. Plan untaps the artifacts he taps for {U}, so the claim holds only loosely.
- ✅ Guide errors 1–5 confirmed: the header claims Emry, but the sleeved file has Urza and no Emry. The four Emry references, the missing Urza and the Tezzeret wording are all as stated.
- ✅ "R sources stay 17+": R-producing lands go 21 → 18 with all six swaps (19 without O-Stone). Holds.

## 3. Ownership, freeness, singleton, identity
- ✅ All six adds are in `decks/paper/collection.txt` and in no `decks/paper/decks/*.txt`.
- ✅ All are U or colourless. Singleton holds.
- ⚠️ Five of the adds (all except O-Stone) are in the unsleeved Urza draft `verify-2026-10-06/urza-found/final-3.txt`, as the reviewer already flagged.
- ✅ No locks: the constraints file has bans only, and the guide names no lock. The swaps cut line D, which is a guide win line but not a lock.

## 4. Merits
| # | Out → In | Pass | Reason |
|---|---|---|---|
| 1 | Temple of Epiphany → Sink into Stupor | ✅ | Keeps the land slot (untapped for 3 life) and adds instant tempo interaction. Costs one R source. The model cuts Temple too. |
| 2 | Mystic Monastery → Filigree Attendant | ✅ | An artifact flier whose power is our artifact count: a one-tap station to 8, plus a shielded attacker. Costs a tapped tri-land; the model cuts it too. |
| 3 | Radiant Summit → Oblivion Stone | ❌ | 12 mana over two turns. Kills our non-artifact engines (Historian, Jhoira, Skate, Urza, Tezzeret, Plan) and costs a dual land. Final Showdown and Rift already cover wipes. |
| 4 | Lux Artillery → Unstoppable Plan | ✅ | End-step untap of all rocks and charge sinks gives instant-speed mana on opponents' turns and doubles Insight Engine and Lux Cannon. Drops line D and one artifact. |
| 5 | Lasting Tarfire → Resculpt | ✅ | Exile removal at 2 mana instant; removal 7 → 8 is the only real model gain. The opponent gets a 4/4, which the review omits. |
| 6 | Chandra, Spark Hunter → Katara's Reversal | ✅ | A four-target counter on the alpha turn beats a slow loot walker that only animates its own token and sits outside the shield. |

## 5. Notes for the orchestrator
- Without swap 3: 36 lands + 1 MDFC instead of 35 + 1, with O-Stone's 0.06 handed back (+2.05 vs +1.99).
- If swaps 4 and 5 land, the guide must drop line D and fix the Emry/Urza errors.
- My only process was the swap lab, run once per base with the 50 % CPU affinity cap applied.
