# Beledros Witherbloom — sleeved deck review (2026-10-09)

**Verdict: null result.** No swap clears the 0.25 bar without cutting the lock or an operator decision. **Arnyn stays OUT** (maybeboard). The guide has 12 oracle/rules errors. The biggest: the guide forbids Saw in Half on Beledros, but it is a strong line.

## Scores
| List | Objective | Deck Score | Penalty | Win | Roles (land/ramp/draw/rem/wipe/prot) | Source |
|---|---|---|---|---|---|---|
| Sleeved (300 g) | **90.50** | 86.1 | 4 | 83 | 37/15/10/11/2/5 | `score.ts` |
| Model climb (100 g, 2 passes, not converged) | 99.91 | 87.3 | 0 | 84 | 38/12/11/12/4/6 | `climb/results-0.jsonl` |
| Sleeved + Skorpekh Lord → Arnyn | 81.95 (−8.56) | 77.5 | 4 | 72 | same | `swap-lab.txt` |

The guide header's "100.8" is stale. It predates the 2026-10-08 operator batch (−13.6) and Starscape Cleric (+8.5).

## Model climb: cuts and adds (all rejected)
| Out | In | Δ | Why rejected |
|---|---|---|---|
| Dark Ritual | Deadly Tempest | +4.09 | Window effect (wipe 2→3, ramp 15→14). Dark Ritual is an operator decision. Deadly Tempest is an unconfirmed precon-list registration. |
| Culling Ritual | Overwhelming Forces | +1.97 | Window effect. Culling Ritual is an operator decision. Forces reads "Destroy all creatures target opponent controls": one opponent for 8 mana in a pod. |
| Ashnod's Altar | Warg Tactics | +3.21 | Altar is the guide lock. Window effect (ramp −1, protection +1). |
| Zulaport Cutthroat | Conduit Pylons | +0.26 | Cuts the core table drain for a filler land. The model cannot see drains. It barely clears the bar at 100 games. |

All four gains come from the role windows (±2/±4 steps), not from card quality. Deck Score moves 86.1 → 87.3 across all four.

## Swaps proposed
None. The one judgment swap I tested failed:

| Out | In | Why | Source | Δ (300 g) |
|---|---|---|---|---|
| Skorpekh Lord | Arnyn, Deathbloom Botanist | Skorpekh is weak here. Its unearth exiles it "if it would leave the battlefield", so it never dies when sacrificed after unearth. Its static buffs only artifact creatures (1 other in the list). Arnyn: "Whenever a creature you control with power or toughness 1 or less dies, target opponent loses 2 life". | free | **−8.56**. The win component's close-turn step (83→72): the goldfish loses a 3-power menace attacker. **Rejected** under the score-decides rule. |

## Arnyn: in or out → OUT
Model view (`arnyn-slots-lab.txt`, 300 g):

| Slot | Δ | Cause |
|---|---|---|
| Viscera Seer | +0.05 | — |
| Blood Artist | +0.02 | — |
| Morbid Opportunist | −2.00 | draw window |
| Idol of Oblivion | −10.56 | win step + draw window |
| Skorpekh Lord | −8.56 | win step |

Slot-independent, Arnyn scores ≈ 0. The model is blind to the card, so judgment decides:
- **The deck's own anthems switch off the P/T ≤ 1 clause.**
  - Creakwood Liege: "Other black creatures you control get +1/+1. / Other green creatures you control get +1/+1". Every Pest becomes 3/3.
  - Mikaeus makes non-Humans 2/2.
  - Thunderfoot Baloth gives +2/+2.
  - Blech puts counters on Pests.
  - The guide's "20+ of our creatures" only holds when no anthem is on the table.
- **It hits one opponent.** Arnyn drains "target opponent" for 2, so 2 total per death. Zulaport, Cauldron of Essence and Starscape Cleric each drain every opponent for 1, so 3 total.
- **It loses to the cards in the only slots where it is not penalised.**
  - Viscera Seer is the only free instant-speed creature outlet besides Altar and High Market.
  - Blood Artist ("Whenever this creature or another creature dies") also counts opponents' creatures. Anthems never switch it off.

## Plan and win lines: verdict
- ✅ **Primary, Pest attrition.** Checks out against oracle. Beledros: "At the beginning of each upkeep, create a 1/1 ... Pest". Outlets plus drains convert each Pest into life loss.
- ✅ **Backup, Gray Merchant burst.** Math correct. With Vito the target loses X + 3X = 4X, lethal at X = 10 from 40. With Vito and Bond it is 7X, lethal at X = 6.
- ⚠️ **Pumped alpha.** Works: Baloth's Lieutenant gives +2/+2 and trample. **The "and undying" for Pests in line 3 is wrong** (error 1).
- ✅ **Edict/wipe grind.** Correct.
- ✅ No infinite combo, as the guide states.

## Guide errors (verified with q.py)
1. **§1 line 3, §2 row 4, §2 row 6 (Blech): token undying.**
   - The guide says Pests "die twice" and that "Mikaeus adds ... undying" to them. A token that dies ceases to exist in the graveyard (CR 111.7, 704.5d), so undying never returns Pests, Snakes, Saprolings, Worms, Insects or Plants.
   - Only nontoken non-Humans return: Merchant, Wurm, Vito, Dina, Seer, Blood Artist, Starscape Cleric, Sakura-Tribe Elder, Blech.
   - The Blech caveat ("sacrifice the countered ones first") is moot for tokens. It applies only to Blech himself.
2. **§10 Saw in Half row: "Never Saw on Beledros (command zone = did not die)".**
   - Wrong since the 2020 rules change. A destroyed commander goes to the graveyard and dies. Only then may it move to the command zone, as a state-based action (CR 903.9a).
   - Saw in Half: "If that creature dies this way, its controller creates two tokens that are copies". Cast on your own Beledros in response to removal, it gives two 2/2 flying copies.
   - Each copy makes an upkeep Pest and has its own "Pay 10 life: Untap all lands" (once per turn per object). It is the best answer to removal aimed at the commander.
3. **§2 caveat, Greaves.** The guide says "your own Vesuva/Thespian's Stage copies cannot target him". Both only target or copy lands, never Beledros. The real cost of shroud: it blocks your own Revitalizing Repast ("It gains indestructible") and Saw in Half on him.
4. **§2 caveat, "nothing else in the list protects him".** False. All of these protect him:
   - Imp's Mischief: "Change the target of target spell with a single target".
   - Veil of Summer: "permanents you control gain hexproof from blue and from black".
   - Revitalizing Repast: indestructible.
   - Saw in Half (error 2).
   - The §6 role table "Protection 3" also misses Repast.
5. **§2 caveat, Morbid Opportunist.** The guide says "Token deaths draw through Moldervine, Liliana and Village Rites only". Opportunist reads "Whenever one or more other creatures die", which includes tokens, once each turn. Pests die on opponents' turns too, so it can draw up to 4 a round. Priest, Braids and Deadly Dispute also draw off token deaths.
6. **§1 table row 2.** The rebuy list names Veinwitch Coven, which left the 99 for Blech on 2026-10-08.
7. **§7 Wipes: "sacrifice the board in response ... and Mikaeus returns".** Mikaeus grants undying only to "Other non-Human creatures". He never returns himself.
8. **§8 misplay 2.** Thespian's Stage copying Golgari Rot Farm is not a trap. Stage "becomes a copy" without entering the battlefield, so there is no ETB bounce, and it then taps for {B}{G}. The real trap is Vesuva copying Rot Farm: Vesuva enters, so the bounce triggers.
9. **§5 mulligan math.** After a 7-card hand the library holds 92 cards with 35 lands left (36 + Repast − 2), not 34.
   - Chance of the third land by T3: ~62 % on the play (2 draws), ~77 % on the draw (3 draws).
   - The guide's 37 % / 60 % are both one draw short, so "2 lands + rock/dork + engine" is a keep on the play too.
10. **§5 stale names.** The mulligan table and bottoming order still name Deadly Tempest and Alhammarret's Archive. Neither is in the 99.
11. **§2 rows 9 and 13 (minor).**
    - Turn Stones (row 9) is a sorcery copy cast for {B}{G} in your main phase. That is one cast per own turn, so 3 Pests a round, not "a turn".
    - Insidious Roots (row 13): the Pest made in your own upkeep is summoning-sick (CR 302.6). In a 4-pod 3 of the round's 4 Pests tap for mana on your turn, not 4.
    - Row 13 also names Victimize, which is not in the 99.
12. **§10 Arnyn row.** "Only Merchant, Wurm, Mikaeus and the walkers miss" ignores the anthems (see the Arnyn section).

## Risks
- **Bimodal lab numbers.** The list sits on the win step's T8/T9 edge. Losing a 3-power attacker (Skorpekh) or a draw piece (Idol) reads −8 to −10. Report slot-independent deltas only.
- **Model blind spots.** It cannot see drains, sac outlets, free casting (Omnipresence) or token mana (Roots). Most of the plan is judgment, not score.
- **Unconfirmed ownership.** Golgari Rot Farm is still an unconfirmed precon-list registration.
- **Climb not converged.** It ran 2 passes at 100 games. Its +0.26 for Zulaport → Conduit Pylons is within noise.

## Files
- `climb/results-0.jsonl`, `climb.log`
- `swaps.txt` + `swap-lab.txt`
- `arnyn-slots.txt` + `arnyn-slots-lab.txt`: informational slot test. Its ALL line is invalid (4× Arnyn in one list).
