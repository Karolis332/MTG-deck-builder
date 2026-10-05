# Refute: Arena Standard R/G Ways + walkers (`final.txt`), 2026-10-05

## Verdict: NOT CONVERGED
- I found 2 missed swaps. With both applied, every gate check passes except the 3 expected ownership FAILs, and the model score does not move (Deck Score 77.92 → 77.92, optimizer 80 → 80).
- Every cut from the operator's list holds, and every number in build-report.md re-checks.
- The walkers stop proof rests on a wrong reading of Tezzeret: it judged only the −3 and ignored the 0 ability and the Way grants. The mana section names a T1 gap, then proposes crafting lands when an owned land already fills it.

## 1. Errors in build-report.md

| # | Claim | Finding (DB / Scryfall) | Severity | Changes the list? |
|---|---|---|---|---|
| 1 | §4: Tezzeret rejected because "−3 tutors 'mana value 1 or less' artifacts, none here" | Ignores "0: Untap target artifact or creature" (untapping Llanowar or Spider each turn = +1 mana at no loyalty cost). Every Way grant reads "Planeswalkers you control have …", so Tezzeret also gets Pyromancer's "[+1]: Add {R}" and Warlord's or Wildspeaker's "[−4]". Each activation fires Ajani ("Whenever you activate a loyalty ability") and Paradox. Tezzeret also makes Annex enter untapped | HIGH | yes, swap 1 |
| 2 | §5 calls T1 untapped G (9 sources) the "main gap" and §7 fixes it with crafts. §4 rejects Starting Town because it "enters tapped unless it's your first, second, or third turn" and costs life | Starting Town ×4 is owned. "This land enters tapped unless it's your first, second, or third turn of the game … {T}, Pay 1 life: Add one mana of any color." Its untapped window is exactly the gap §5 names | MEDIUM | yes, swap 2 |
| 3 | §2/§4: Paradox goes 3→2 because of the "legend rule", yet Pyromancer stays at 3 | Both are "Legendary Enchantment". A duplicate still empowers: its ETB fires before the legend rule removes a copy (CR 704.5j, LEARNINGS 2026-10-02). A duplicate Pyromancer = a 2-MV "empower Jace 2"; a duplicate Paradox = a 3-MV "empower Jace 5". The reasoning is uneven, but the 3 Pyromancers buy T2 odds of the Jace token's only "+" ability (the token has only "[−1]: Surveil 1" / "[−3]: Draw a card") | LOW | no |
| 4 | §3: Charm kills "only a 'creature with flying'" | Leaves out "Put two +1/+1 counters … trample" and the instant "Add {C}{C}{C}". The cut still holds (row C3) | LOW | no |
| 5 | §3: Spider untaps on "MV≥4 casts (16 such cards)" | The final list has **17**: Chandra 2, Aerid, Hexhaven, Leatherhead, Garruk 2, Terror 2, Wildspeaker, Overlord (MV 5 even when cast for impending), Ajani 3, Capstone, Ghalta U, Ghalta PH | LOW | no |
| 6 | §4: "The two Ghaltas cost 3–5 in practice" | Depends on the board. Ghalta U costs {8}{G} minus the greatest power: Hexhaven/Overlord 6 → 3, a 5-power creature → 4, a Beast 4 → 5. Ghalta PH needs total power 7–9 to cost 3–5, floor {G}{G} (Scryfall: "can't reduce … below {G}" for U). Plausible from T5, not on T4 | LOW | no |
| 7 | §3: "Capstone #2/#3 only re-buy the same paradigm engine" | Supported by the oracle wording "After you **first** resolve a spell with this name". Scryfall has no multi-copy ruling ❓ | — | no |
| 8 | §4: Hexhaven synergy 5 (among the 5 lowest) | Undercounted. Ajani −3 deals "4 damage to each creature except for tokens you control": Hexhaven (6/6) survives and "search[es] … up to that many land cards" (4 lands). Burst Lightning on our own Hexhaven fetches 2. This supports keeping it | LOW | no |

✅ Verified as written:
- **Rulings (Scryfall, 2026-08-21):**
  - "If you control a Jace planeswalker token, you can't choose to create a new one."
  - "Loyalty abilities can't be mana abilities": the granted +1 uses the stack at sorcery speed. The T2/T3 lines still work.
  - Ajani's Cadet "will always enter … before the loyalty ability … resolves", so it gets +1/+0 and haste.
- **Combat maths:** Ajani −3 kills Terror, Leatherhead and Aerid (all x/4) and dorks; Overlord 6/5 survives. Terror's "another creature you control enters" deals 8 for Ghalta U (8/8) and 12 for Ghalta PH (12/12).
- **Quotes match the DB:** Annex "unless you control a planeswalker" (the Jace token counts); Rockfall; Ba Sing Se; Passage; Bushwhack "fights"; Warlord and Wildspeaker grants; Paradox; Tethermage 1/1.
- **P/T matches the DB:** Leatherhead 5/4, Aerid 5/4, Overlord 6/5, Great Forest Druid 0/4.
- **Rejected-card quotes match the DB:** Curator, Self-Destruct, Surrak, Essence Burn, Lightning Strike 3 dmg, Fiery Annihilation at 3 MV, Iroh's Demonstration "Sorcery — Lesson", No Admittance sorcery, Commercial District and Temple of Abandon "enters tapped", Thornspire Verge.

## 2. Numbers re-checked

| Item | Report | Re-check |
|---|---|---|
| Karsten, 60 cards | 23.2 → 23 | ✅ 19.59 + 1.90×3.54 − 0.28×11 = 23.24. The formula is `src/lib/land-math.ts:5`, not principles.md. Gate: "23 ±2" |
| Avg MV / curve | 3.54 | ✅ 131/37. Curve 1:8 2:9 3:3 4:5 5:6 6:3 7+:3 |
| G / R land sources | 18 / 15 | ✅ G = 2 SG + 4 Rockfall + 4 Annex + Ba Sing Se + 7 Forest; R = 2 + 4 + 4 + 5 Mountain |
| Coloured-source needs | 11–22 | ✅ arithmetic follows the principles.md §3.2 rule "scale by share of lands" (e.g. 2CC 26×23/41 = 14.6 → 15) |
| T1 untapped G | 9 | ✅ 7 Forest + 2 Stomping Ground. P(≥1 in the opening 7) ≈ 70 % [calc] |
| Optimizer | 55 → 80 | ✅ `model.json` / `model-final.json` |
| Deck Score | 61 r28 → 78 r63 | ✅ 61.36 / 28.4 → 77.92 / 63.2. Components match §6 exactly (mana 79.4→98, curve 79→83, interaction 90→94, advantage 94.5→82.3, win 85, synergy 51.7→72.4) |
| Gate | ownership FAIL only | ✅ re-run identical to `final.gate.txt` |

## 3. Cuts from the operator's list

| Cut | Verdict | DB quote / reason |
|---|---|---|
| C1 Tenured Tethermage ×3 | KEEP cut | 1/1 for {1}{R}{G}: "you may sacrifice a land. If you do, create two tapped Heartwood tokens" = +1 source from T4, 0 walker links. Llanowar ×4 does the job two turns earlier |
| C2 Hungering Puppetbeast ×3 | KEEP cut | 5/5 for {3}{G}{G}. "{1}, Sacrifice another artifact" has only Heartwoods to eat. Leatherhead (5/4 trample, "enters with a hexproof counter", 4 MV) and Terror (5/4 flyer) feed Garruk's draw and Ghalta just as well |
| C3 Konstrari Charm ×3 | KEEP cut | "6 damage to target creature with flying" is narrow. Sear ("4 damage to target creature or planeswalker", instant) also covers flyers up to 4 toughness, plus walkers. The {C}{C}{C} pays generic costs only. Right as a sideboard card |
| C4 Bushwhack ×4 | KEEP cut | "Target creature you control fights" needs a body; the land mode costs a card. Burst Lightning ("2 damage to any target … kicked, 4") is unconditional and can hit face |
| C5 Multiversal Passage ×4 | KEEP cut | "pay 2 life. If you don't, it enters tapped", one colour, and not basic (so it doesn't turn on Ba Sing Se). Worse than a basic here. Swap 2 fills the early-untapped role better |
| C6 Ghalta, Stampede Tyrant | KEEP cut | Flat {5}{G}{G}{G}. "put any number of creature cards from your hand": with 14 creatures, 0–2 are in hand when it lands. On the win turn, Ghalta PH does the same job at {G}{G}–5 |
| C7 Improvisation Capstone ×2 (3→1) | KEEP cut. Swap 1 cuts the last copy | 7 MV. A second copy adds no second engine ("first resolve"), and it is dead in hand early |
| C8 Way of the Paradox (3→2) | KEEP cut | A third copy after the legend rule = 3 MV "empower Jace 5" |

## 4. Missed swaps (ranked)

| # | In | Out | Why |
|---|---|---|---|
| 1 | 1 Tezzeret, Cruel Captain (owned 1) | 1 Improvisation Capstone | Colourless 3-MV walker, loyalty 4, filling the 3-drop hole (curve flags 3/10). About 9 links vs ~2 for Capstone; see the breakdown below |
| 2 | 2 Starting Town (owned 4) | 2 Konstrari Annex | Untapped on T1–T3 for any colour. Untapped T1 G goes 9 → 11 (P 70 % → 78 % [calc]); lands tapped on T1–T2 go 9 → 7. Keeps 2 Annex + 4 Rockfall Vale for T3+, which is their untapped window. Cost: "Pay 1 life" per coloured mana, and it enters tapped if drawn T4+ (Paradox lifegain offsets the life). Model-neutral (77.92). Replaces the §7 Thornspire Verge craft |

**Swap 1 in detail (Tezzeret's links, ~9):**
- "0: Untap target artifact or creature": untaps Llanowar or Spider for +1 mana a turn, or Terror after combat.
- Every activation fires an Ajani Cadet, Paradox's life and extra land drop, and a Terror ping through the Cadet.
- It carries Pyromancer's "[+1]: Add {R}" and Warlord's or Wildspeaker's "[−4]".
- From T3 it turns Annex on without needing a Jace token.
- Aerid's Heartwood gives it "a loyalty counter".

**Why Capstone is the right cut:**
- §4 names Capstone the weakest kept finisher.
- On the turn I win, the same 7 mana hard-casts Ghalta U plus a 4-drop. The close (Terror + 2 Ghaltas + Ajani haste) is untouched.

**Model run:** Deck Score 77.92 → 77.92, curve 83 → 84.9, avg MV 3.54 → 3.43.
- Cutting Paradox #2 instead scores 75.2. Sear #2 or Pyromancer #3 score 75. Use those only if the operator keeps Capstone.

Both swaps together (`/tmp/vCST.txt`):
- Gate: 60 cards / 23 lands / avg MV 3.43 / curve 1:8 2:9 3:4 4:5 5:6 6:3 7+:2. Everything PASSes except the 3 known ownership FAILs; Tezzeret and Starting Town are in the CSV.
- Optimizer 80, Deck Score 77.92 (rank 63.2).

Near-ties, not swaps:
- **Arcane Amphisbaena vs Pyromancer #3.** Amphisbaena (1/1 deathtouch, "empower Jace 2") beats a duplicate Pyromancer but is worse as the first copy, because it gives Jace no "+" ability.
- **Bloom Tender ×4 vs Spider #4.** Bloom Tender ("For each color among permanents you control"; Spider is red and green) often taps for 2. Spider keeps its slot for reach plus the untap on MV ≥ 4 spells.
- **Garruk's Uprising vs Way of the Warlord.** Warlord's "[−4]" removal on the Jace token wins.

## 5. Plan shape (one plan, holds)

- **T1–3:** Llanowar ×4, Spider ×4, Pyromancer ×3 (Jace token "[+1]: Add {R}"), Burst/Sear, Paradox/Warlord, Overlord impending {1}{G}{G}; with swap 1, Tezzeret.
- **T4–6:** Chandra, Leatherhead, Aerid, Hexhaven, Garruk, Terror, Wildspeaker, Ajani. Every activation makes a Cadet, which means a Terror ping and Garruk's draw on power ≥ 4 creatures.
- **Close:** Terror triggers on Ghalta U/PH entering (8/12 damage), Ajani +1 "haste", Garruk −4 "+2/+2 and gain trample".
- **Serving neither:** Improvisation Capstone (generic top-deck value, no link to walkers or Ghalta). Swap 1 removes it.

## 6. Gate

- `final.txt` re-run: identical to `final.gate.txt`. Every check PASSes except ownership (Aerid Konstrari, Hexhaven Invigorator, Ghalta the Unstoppable), as the brief expects.
