# Refute: Bumi vs Gilanra + Alena, one Gruul deck (Opus refuter, fresh context, 2026-10-07, rev 2)

**Rev 2 (operator correction): Moraug, Fury of Akoum is sleeved in Tazri, so neither list can have it.** Tazri is top priority and gives no cards. Both lists replace Moraug with the best available card for its role, tested in the sim (§4a). Bumi: **+Pyrewood Gearhulk**. Gilanra: **+Quilled Greatwurm**. Corrected lists: `refute/bumi-corrected.txt` and `refute/gilanra-corrected.txt`. The 36-land versions are `refute/*-corrected-36.txt`. The head-to-head (§2) is re-run on the corrected lists.

## Verdict
| List | Verdict | Why |
|---|---|---|
| `bumi/final.txt` | ✅ **PASS after correction** | Moraug is unavailable, so it is swapped for Pyrewood. Otherwise the list is clean: 100 cards, singleton, R/G, legal and owned, with no clash with another deck or the Urza draft. The gate matches the builder's claim, the quotes are true, and only LOW wording slips remain |
| `gilanra/final.txt` | ⚠️ **FAIL (ownership, 2 cards)** | Moraug (fixed by Quilled). **Planetarium of Wan Shi Tong**: 1 copy owned, also in the Urza draft `verify-2026-10-06/urza-found/final-3.txt`. Also a MED maths error (T1 green sources, §1 #1) |

**Recommended deck: `winner.txt` = `bumi/final.txt` − Moraug + Pyrewood Gearhulk (Bumi, Unleashed, 38 lands).** Three decisive reasons:
1. **Faster in one neutral sim** (§2, 20k games, same keep rule, Gilanra's burn counted): median kill **T6 vs T7**; P(≤T6) **.699 vs .137**; P(≤T7) **.922 vs .658**.
2. **Still faster against blockers.** With one chump-blocker on the biggest attacker every combat, P(≤T7) is **.756 vs .503**. Bumi's trample still connects through a chump, so his untap and extra combat still happen.
3. **Interacts and protects the win turn.** Bumi: 8 removal spells (Beast Within, Decimate, Bumi Bash, Rocky Rebuke, Clear Shot, Longstalk Brawl, Cankerbloom, The Last Agni Kai), 5 protection spells (Veil of Summer, Snakeskin Veil, Tyvar's Stand, Silkguard, Guardian Augmenter) and the Boots' ward. Gilanra: 2 cheap answers (Beast Within, Bushwhack) and no protection spell, so it fails win-conditions §5 #7.

**Gilanra's real edge (the operator's trade-off):** Card flow: 16.9 vs 13.5 spells T1–8. 4th land on T4: .900 vs .806. Screw: .008 vs .015. Burn as a second axis that works through a board stall. Bumi's only backup after a wipe is recovery: the earthbended lands "return it to the battlefield tapped".

## §1 Errors (DB = `q.py` oracle text; rulings = Scryfall API 2025-10-02)
| # | List | Claim | Finding | Source | Sev |
|---|---|---|---|---|---|
| 0 | both | Moraug, Fury of Akoum in the list | Sleeved in Tazri (operator, stale registry) → unavailable; replaced (§4a) | operator | HIGH (fixed) |
| 1 | Gilanra §5 | "G {G} on T1 (Elvish Mystic, untapped sources) need 17.61, have 22.00" | `colours2.py` counts tapped Turf/Thicket/Mansion, the 3 fetches and Ba Sing Se at MV 1. Untapped T1 G = 14 Forest + Tower = **15**, so it is **2.6 short** | `colours2.py` `src()` | MED |
| 2 | Gilanra §2 | sim5 numbers for the Bumi lists | Earthbended lands never tap for mana, and earthbend stacks on one creature. Overrun, Hardened Scales, Kami, Innkeeper, Nissa, Boots, Drix, Augmenter, Boulder and Earth King's fetch are unmodelled. Bumi + TBR gives 1 extra combat (should be 2). Yavimaya, Lair and Rumble Arena are missing from `LANDS`, so it crashes on `bumi/final.txt`: the finals were never compared | `sim5.py` | MED |
| 3 | Bumi §2 | Gilanra sleeved: Gil T3 .907, Alena T5 .776, spells 10.47, P(≤T7) .414 | Understated by sim bugs §3 B1–B6. Neutral sim: .952 / .924 / 13.60 / .535 | §2 | MED |
| 4 | Gilanra | Planetarium of Wan Shi Tong | 1 owned, also in the Urza draft. Moot if Bumi is kept | `refute/own.py` | MED |
| 5 | Bumi §6 | Blossoming Bogbeast "can't attack in land-only combats" | Wrong reason: "+X/+X … trample until end of turn" covers Bumi's land combat. Verdict stands (near-tie, §4) | DB | LOW |
| 6 | Gilanra §4 | "Apex / Ghalta / Big Bear: 10–12 power tramplers or hexproof haste" | Apex is a 10/10 with only "Cascade" ×4 | DB | LOW |
| 7 | Gilanra §4 | Myojin "7 damage to each of up to three targets" | Needs the counter it gets only "if you cast it from your hand": Vortex, Bind, cascade and Planetarium give none. sim5 burns 7 regardless | DB, `sim5.py` | LOW |
| 8 | Bumi §3 #11 | Caryatid: "every earthbended land is 4+" | Earthbend 2 or 1 (Badgermole, Toph BB, Ba Sing Se, Bumi E) gives 2/2 and 1/1 lands | DB | LOW |
| 9 | both | "return to the battlefield tapped"; Nissa "+1: three +1/+1 counters …"; TBR "also … trample if you control …" | Words dropped without an ellipsis: "return **it**", "**Put** three … noncreature land", "trample **until end of turn** if". Meaning intact | DB, rulings | LOW |
| 10 | Bumi §2 | flood sinks include Germination, Innkeeper, Bulk Up, Faithless Looting | One-shots or free copies, not sinks. With a neutral set, flood is still .014 | `sim.py` | LOW |
| 11 | `pool.md` | Earth Rumble `[NOT COMMANDER-LEGAL]` | Wrong: it read the `front_card` row. The `normal` row ({3}{G} Sorcery) is commander-legal | DB legalities | LOW |

**Quotes.** `refute/quotes.py` machine-checked 64 (Bumi) + 63 (Gilanra) quoted fragments against the DB text of the cards named on each line. Of the 11 misses, 6 are true (another card, a ruling, gate output) and 5 are the elisions in #9.

**Rulings** (`refute/rulings.txt`): "Earthbend N" makes a "0/0 land creature with haste", so CR 302.6 never stops these lands. Bumi's land-only limit "applies only to the combat phase created by Bumi".

**Closers.** Bumi §4 is all true: Toph's double strike, TBR = two triggers, Vitu-Ghazi is an Instant, the Paradigm copy. Gilanra §4 is true except #6 and #7. Pyrewood: "other creatures you control get +2/+2 and gain vigilance and menace until end of turn. Damage can't be prevented this turn."

**Gates and maths.** Gates were re-run on the finals and the corrected lists (`refute/gate-*.txt`); they match the builders' claims. Bumi: `plan` FAIL (known false negative) and `arenaNames` WARN. Gilanra: `identity` FAIL (known partner false negative), `lands`/`plan` WARN. `identity.py`: none outside R/G on all 8 lists. Karsten recomputed: Bumi 38.6 ✅, Gilanra 43.1 ✅.

## §2 Head-to-head (`refute/hh.py`, 20,000 games, seed 7; same keep rule, same clock)
- **Keep 7:** 3–5 lands (Florahedron counts) or 2 lands + an MV ≤ 2 ramp piece. The first mulligan is free.
- **Clock:** the first turn on which one opponent has taken 40, unblocked, combat + direct damage.
- **Chump:** one 1/1 ground blocker every combat on the biggest non-flying, non-menace attacker. A trampler pushes power − 1 through (everything on a double-strike second hit); a non-trampler deals 0.

| List | L | Keep 7 | 4th land T4 | Cmdr on curve | Screw | Flood | Spells T1–8 | Median | P ≤T6 | P ≤T7 | Chump: median · ≤T6 · ≤T7 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Bumi corrected (+Pyrewood)** | 38 | .712 | .806 | Bumi T5 .842 | .015 | .014 | 13.45 | **T6** | **.699** | **.922** | T7 · .365 · **.756** |
| Gilanra corrected (+Quilled) | 38 | **.737** | **.900** | Gil T3 .921 · Alena T5 .958 | **.008** | .071 | **16.91** | T7 | .137 | .658 | T7 · .085 · .503 |
| Bumi sleeved (3 Landscapes as fetches) | 33 | .594 | .730 | Bumi T5 .777 | .060 | .005 | 11.70 | T6 | .548 | .850 | T7 · .165 · .550 |
| Gilanra sleeved | 36 | .611 | .844 | Gil T3 .952 · Alena T5 .924 | .036 | .120 | 13.60 | T7 | .098 | .535 | T8 · .064 · .404 |
| Bumi corrected-36 | 36 | .675 | .778 | .828 | .020 | .011 | 13.25 | T6 | .687 | .908 | — |
| Gilanra corrected-36 | 36 | .700 | .877 | .911 · .951 | .011 | .046 | 16.62 | T7 | .115 | .603 | — |

- **With Moraug (rev 1, same seed):** Bumi .704 / .925 and Gilanra .149 / .667. Losing Moraug costs Gilanra more.
- **Combat damage only:** Gilanra corrected .101 / .574; Bumi lists unchanged.
- **`hh.py`** = `bumi/sim.py` (its Bumi engine was reviewed and kept) + asserted patches in `refute/make_hh.py`: Gilanra is tapped first for 6+ MV spells (3.07 draws by T8); Florahedron is modelled as an MDFC; landcycling is modelled; Spider untap, Selvala, Apex cascade ×4; Damage from Terror, Warstorm, BSA, Drakuseth, Myojin (hand only), Roxanne and Combustible; Bind to Life, Planetarium, Cream, Big Bear haste, Surrak; TBR on any attacker; Moraug's +1/+0 counted before damage; Edgar, Wilderland Scrounger, Primeval Bounty and Bogbeast added for the tests; One commander policy for every list; a neutral sink set.

## §3 Sim bugs
**`bumi/sim.py`:** B1–B6 cost Gilanra, B7 costs both. B1: Gilanra is tapped only after every land, so "When you spend this mana … draw" rarely fires · B2: Florahedron is a vanilla 1/1 · B3: the 4 landcyclers are not modelled · B4: burn is ignored, and Apex does not cascade · B5: TBR is only cast on Bumi. Spider, Selvala, Bind, Planetarium and Cream are unmodelled, and Big Bear has no haste · B6: commander priority is Bumi 950, Gilanra 850, Alena 590 · B7: Moraug's +1/+0 is applied one attack late · No bug favours Bumi: haste, untap, the land-only combat, double-strike triggers, Nissa's vigilance and Tale were all checked against the DB text.

**`gilanra/sim5.py`:** G1–G4 cost Bumi, G5 favours Gilanra. G1: earthbended lands make no mana, and animating an untapped land deletes a mana · G2: earthbend stacks on one creature · G3: the Bumi-side cards in §1 #2 are unmodelled · G4: it crashes on `bumi/final.txt` · G5: Myojin burns 7 when cast free; Combustible always draws · Measured effect on the sleeved Bumi list is small (P(≤T7) .835 vs .850).

**`hh.py` limits:** No opposing interaction, and all burn goes to one opponent; Avatar Kyoshi's power is missing from the DB (5 assumed); Bogbeast X = 2; Pyrewood's vigilance is not modelled.

## §4 Missed swaps and the Moraug replacement (10k games, seed 11; open / chump P(≤T6) / P(≤T7); `refute/mor/*.out`, `refute/var-*.out`)
**§4a. Bumi, −Moraug** (with Moraug: .709/.923 · .359/.756). Every candidate is within about ±.01, so the loss is negligible.

| +Card | Open | Chump | |
|---|---|---|---|
| **Pyrewood Gearhulk** | .700 / .924 | **.374** / .765 | ✅ chosen |
| Forest (39th land) | **.713 / .931** | .361 / **.766** | ⚠️ near-tie |
| Blossoming Bogbeast | .704 / .927 | .363 / .763 | ⚠️ near-tie |
| Samut, Rampaging Baloths, Scrounger, Edgar, Earth Rumble, Primeval Bounty | .697–.707 / .918–.928 | .345–.360 / .744–.757 | ❌ |

- **Why Pyrewood:** It is the best of the closer-role candidates against blockers. On the kill turn it gives every land creature menace and vigilance, plus "Damage can't be prevented" (blanks fogs). A 39th Forest is the operator's option: it is numerically equal, keep rises to .737, but it is not the same role.

**§4a. Gilanra, −Moraug** (with Moraug: .152/.665 · .102/.524).

| +Card | Open | Chump | |
|---|---|---|---|
| Avatar of Slaughter | .142 / .664 | .093 / .510 | ❌ symmetric ("All creatures have double strike and attack each combat"), already cut by the 10-07 refuter |
| **Quilled Greatwurm** | .135 / .648 | .085 / **.503** | ✅ best non-symmetric (7/7 trample, MV 6 draws off Gilanra) |
| Forest (39th land) | .135 / .652 | .085 / .491 | ⚠️ near-tie |
| Rorix, Earth King, Scrounger, Paleoloth, Etali, Tyrant, Primeval Bounty, Halana, Bitter Work | .115–.130 / .601–.650 | .068–.084 / .453–.494 | ❌ |

**§4b. Other missed swaps in the Bumi list** (rev 1: Pyrewood −Mightform, Bogbeast −Mightform, Samut −Boots): all are ties or losses. The pool sweep for mass evasion, haste or trample grants found only cards the Bumi report §6 had already given ❌. **No further missed swap**; the stop proof stands.

## §5 Final list
`verify-2026-10-07/gruul/winner.txt` = `bumi/final.txt` with one edit: **−Moraug, Fury of Akoum +Pyrewood Gearhulk** (38 lands).
- **36-land option:** `refute/bumi-corrected-36.txt` = `bumi/final-36.txt` with the same edit.
- **Physical pulls:** 8 cards come out of the Gilanra box: Sol Ring, Arcane Signet, Llanowar Elves, Ruby, Thunderfoot Baloth, Shamanic Revelation, Command Tower, and Pyrewood Gearhulk. The Gilanra deck is dismantled.
- Planetarium of Wan Shi Tong becomes free for the Urza draft.
