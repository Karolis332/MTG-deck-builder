# REFUTE — Imotekh the Stormlord (2026-10-09)

**Overall: PASS** — all 5 swaps hold. The model is blind to every add (Deck Score flat 60.6); the gain is window penalty only (5 → 3), so each verdict below is judgment, backed by oracle.

## 1. Swap lab re-run (sleeved base, reviewer's swaps.txt, 300 games)
| Swap | Reviewer Δ | My Δ | Match |
|---|---|---|---|
| The Darkness Crystal → Solemn Doomguide | +0.01 | +0.01 | ✅ |
| Wishclaw Talisman → Supernatural Stamina | 0.00 | -0.00 | ✅ |
| Grim Haruspex → Noxious Gearhulk | +2.00 | +2.00 | ✅ (removal window 9 → 10) |
| Canoptek Wraith → Soul of New Phyrexia | +1.95 | +1.95 | ✅ (protection 0 → 1) |
| Liliana the Repentant → Sheoldred's Edict | +2.00 | +2.00 | ✅ (removal window) |
| Foundry Inspector → Thran Dynamo (rejected by reviewer) | +0.07 | +0.07 | ✅ noise, rejection correct |
| ALL 6 (lab) | +4.02 | +4.02 | ✅ |
| ALL 5 (`score.ts proposed.txt`) | +3.95 | **+3.95** (62.81 → 66.76, DS 60.6, pen 3, roles 35/10/10/11/2/1) | ✅ |

No difference > 1.0, no sign flip. None of the deltas clears the 0.25 bar on card quality: the +2 / +1.95 steps are the window penalty.

## 2. Oracle and rules check (q.py)
- ✅ Imotekh, Doomguide, Stamina, Gearhulk, Soul, Edict, Liliana, Wishclaw, Haruspex, Wraith, Praetorian, Bats, Psychomancer, Colossus, Ghost Ark, Technomancer, Biotransference quotes match the DB.
- ✅ Doomguide targets: 5 Necron Wizards (Chronomancer, Cryptek, Plasmancer, Psychomancer, Technomancer) + Umbral Collar Zealot (Cleric). Grim Haruspex is also a Wizard, but it is cut in this proposal.
- ✅ Stamina on a Necron: graveyard → battlefield = artifact card leaving the yard → Imotekh trigger; Praetorian "enters from a graveyard" → draw 2.
- ✅ Soul of New Phyrexia is an Artifact Creature, so "{5}, Exile this card from your graveyard" triggers Imotekh.
- ✅ Technomancer returns artifact creatures "with total mana value 6 or less": Gearhulk (MV 6) qualifies exactly.
- ✅ Liliana's mill is mandatory; Legion X=10 = 10 separate enters = 20 cards.
- ✅ Unearth exile replacement: only Psychomancer ("or is put into exile from the battlefield", nontoken artifact) drains.
- ⚠️ Minor misquote: Szeras reads "Add an amount of {B} equal to the sacrificed creature's mana value" (review drops "an amount of"); meaning unchanged.
- ⚠️ Omission: The Darkness Crystal also reads "Black spells you cast cost {1} less to cast" and "you gain 2 life" — the classifier counts it as ramp (11 → 10 after the cut, still in window). "Stops Konrad, Reanimate and Portal" is overstated: it only removes opposing deaths/targets; they still work on our own creatures.
- ✅ Noncreature-artifact MV after the swaps: Sol 1, Signet 2, Diamond 2, Vessel 2, Bauble 1, Soul Stone 2, Ark 4, Lotus 5, Portal 9 = 28 max; the Colossus ≥ 11 claim holds (e.g. Portal + any 2-MV rock, or Lotus + Ark + 2 rocks).

## 3. Ownership, freeness, legality
- ✅ All 5 adds are in `decks/paper/collection.txt` (1 copy each), in no file under `decks/paper/decks/`, and not in the ban list.
- ✅ Colour identity: Doomguide, Stamina, Gearhulk, Edict = B; Soul = colourless. Singleton holds; `proposed.txt` = sleeved − 5 + 5, 100 cards, commander unchanged.
- ✅ No guide lock is cut: the guide names no locks; it lists the Crystal, Liliana and Wishclaw as hazards/misplays (§2 "Does NOT work", §6 items 4–6).

## 4. Judgment per swap
1. **Crystal → Doomguide — PASS.** Doomguide gives unearth {1}{B} to 6 cards; each Necron unearth = 2 Warriors. Costs: −1 ramp (cost reducer), −4 Colossus MV.
2. **Wishclaw → Stamina — PASS.** Deck had 0 protection; Stamina is 1-mana instant protection that also re-triggers Imotekh. Loses a tutor that the table also gets.
3. **Haruspex → Gearhulk — PASS.** Removal is the weakest component (interaction 44); Gearhulk is artifact fuel and a 6-{B} Szeras sac. Draw 11 → 10, still in window.
4. **Wraith → Soul — PASS.** Only wipe protection in the pool; Wraith's ramp needs combat damage plus {3}. Curve goes up (3 → 6 MV).
5. **Liliana → Edict — PASS (closest call).** Liliana is a self-mill source and one exhaust trigger, but she blocks the Colossus loop and mills 4 per Imotekh trigger. Ripples, Technomancer, Buried Alive, Dirge still fill the yard.

## 5. Guide errors
The reviewer's 8 guide errors are confirmed against the sleeved list (Altar, Dark Ritual, Imp's Mischief, Phyrexian Arena, Skorpekh Lord absent; Charcoal Diamond present). Guide §5 MV count also still lists Wishclaw 2 and Crystal 4, which these swaps remove.
