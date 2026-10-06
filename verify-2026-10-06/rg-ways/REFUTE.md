# Refute: Arena Standard R/G Ways + walkers, 2026-10-06 (Opus refuter, fresh context)

**Verdict: CONVERGED (on text).** Every number in build-report.md re-checks true, and the model and gate reproduce exactly. 12 claim errors: all LOW/MEDIUM, and none changes a card. The stop proof had gaps (Outcaster Trailblazer, Tezzeret vs Overlord, Growing Rites, Lizard); they are closed in §4 and all are near-ties. Optional #1: Overlord → Outcaster Trailblazer (DS 83.44 → 86.24). It is the operator’s call, not a proven win.
Scratch: `refute/` (variant lists r1–r19 + `.model.json`; `cr.txt` = CR 2026-09-25). Apostrophes in this file are typographic (’).

## §1 Errors
| # | Claim (report §) | Finding (source) | Sev | List? |
|---|---|---|---|---|
| 1 | §3c "Burst Lightning (4,247) and Sear (3,170) are the two most-played spells" | DB `community_deck_cards`, standard, all boards: Spell Pierce 4,952, Burst 4,247, Stock Up 3,872, Opt 3,268, Sleight of Hand 3,239, Sear 3,170. Burst is #2 and Sear #6; the claim holds only for targeted burn. The Leatherhead argument stands | LOW | no |
| 2 | §4 "Paradox #2 … ‘empower Jace 5’ still resolves before the legend rule" | Order reversed. The legend rule (704.5j) is an SBA and runs before the trigger is put on the stack (117.5, 704.3). The empower still resolves (113.7a). Effect right, wording wrong | LOW | no |
| 3 | §2/§3 cut reason "Paradox #3 dies to the legend rule" | P(≥2 of 3 Paradox by T6, 12 of 60) = **.099**, so the duplicate case is rare. The real reason is Warlord’s different text (the "[−4]" removal on every walker) | LOW | no |
| 4 | §4 walkers: Tezzeret is "one more mana", tested only vs Ajani #3 (h4) | Repeats LEARNINGS 2026-10-05. The 0 ability is a loyalty activation every turn, so it makes a Cadet (Ajani) and gives life plus a land drop (Paradox). Tezzeret is also a walker for Annex, and with Pyromancer its +1 adds R. Never compared with Overlord (§4) | MED | no (near-tie) |
| 5 | §4 "Stop: no swap in this table improves the list" | The table omits Outcaster Trailblazer (x1), Growing Rites of Itlimoc (x4) and Lizard, Connors’s Curse (x1). One of them scores above the final (§4) | MED | no (near-tie) |
| 6 | §1 "Ajani −3 … kills our … Tyvar" | Tyvar: "Tap another untapped creature you control: Tyvar gains indestructible until end of turn." He survives if another creature is untapped | LOW | no |
| 7 | §3d "With Ajani already on the battlefield, spend the 8 differently: Ajani +1" | Ajani +1 costs no mana. Both fit in one turn: Emrakul resolves, then Hoof (8 mana), then Ajani +1. The +1 must come after Emrakul enters (611.2c). Ruling 2026-08-21: the Cadet "will always enter the battlefield before the loyalty ability … resolves" and gets +1/+0 and haste | LOW | no |
| 8 | §3d T7 line "7 lands" / T6 line "6 lands" | P(≥7 lands in 13 cards, 23/60) = **.164**; P(≥6 by T6) = **.272**. These are ceiling lines, not typical ones. Paradox, Everywhere and Garruk +2 raise them somewhat | LOW | no |
| 9 | §4 lands: Fabled Passage "onto the battlefield tapped" | Truncated. The DB continues: "Then if you control four or more lands, untap that land." | LOW | no |
| 10 | §2 Grab the Prize "Card-neutral filtering" | Omits "If the discarded card wasn’t a land card, Grab the Prize deals 2 damage to each opponent." The cut still stands | LOW | no |
| 11 | §4 Archdruid "{G} for each Elf (4 Llanowar only)" | Tyvar is an "Elf Warrior" and Archdruid is an Elf itself | LOW | no |
| 12 | §5 colour needs "principles.md §3.2 scaled ×23/41" | That is the 99-card column scaled down; principles.md has no 60-card column. **UNVERIFIED** for 60 cards. Margins are +1 to +5, so the verdict is unlikely to change | LOW | no |

All other DB quotes in §1–§4 match word for word: Ajani, Hoof, Tyvar, Terror, Emrakul, Llanowar, Spider, the three Ways, Chandra, Garruk, Demon, Overlord, Leatherhead, Burst, Sear, Annex, Starting Town, Rockfall, Stomping Ground, Craterclaw, Puppetbeast, Tethermage, Aerid, Capstone, Bushwhack, Passage, Overrun, Prismabasher, Bloom Tender, Pollinator, Cavern, Hexhaven, Tezzeret, Wildspeaker. Scryfall rulings fetched today: Emrakul ("You may use the mana ability Emrakul grants to the land while casting Emrakul from exile.") and Hoof ("The value of X is calculated only once…"). The model reason "G has 18/16 timely sources" is in `model-final.json`.

## §2 Numbers re-checked
| Item | Command / method | Observed |
|---|---|---|
| Model | `run-model.ts` on input / quick-v1 / final → `refute/*.model.json` | opt 60 / 65 / 80; DS 69.68 / 75.20 / **83.44**; rank 47.8 / 60.2 / 75.5; all 6 components identical to §7 ✅ |
| Karsten | `land-math.ts` l.24: 19.59 + 1.9·avgMV − 0.28·cheap | 19.59 + 1.9 × (127/37 = 3.432) − 0.28 × 11 = **23.03** ✅; with Emrakul at {3}: 22.67 ✅ |
| Curve | gate | 1:8 2:9 3:4 4:5 5:5 6:3 7+:3, avg 3.43 ✅ |
| Sources | count | G 18, R 16 ✅. T1 untapped G 11 → 1 − C(49,7)/C(60,7) = **.778** ✅ (9 → .700 ✅) |
| Engine odds | hypergeometric | Ajani ×3 by T6 .495, ×2 .363 ✅; Llanowar in opening 7 .399 ✅; a Way by T2 (6 copies) .593 ✅ |
| Craterclaw X | 11 units × 13/60 + 1 | **3.38** (T6 3.20) ✅; final list X = 1 ✅ |
| Hoof X | 14.5 × 13/60 + 1.5 + 0.2 + 1 | **5.84** (T6 5.6) ✅. Alpha 3.4 × 5.8 ≈ +20 power vs 5.8 × 5.8 ≈ +34 power and toughness ✅ |
| Demon discard | 1/(h+1) | T4 on the play h = 10 − 4 − 3 − 1 = 2 → 1/3; on the draw 1/4; empty hand → certain ✅ |
| Emrakul T7 | 6 lands + CC land 2 + Llanowar + Spider | 10 → trigger untaps 7 lands (CC ended) + Spider untap (MV 10) = **8 = Hoof** ✅ (arithmetic; see #8 for the odds) |
| Emrakul T6 | 5 + 2 + 2 dorks = 9, + walker R | 10 ✅. Legal per the CR below |
| Spider untaps / swap count | count | 16 MV ≥ 4 cards ✅; 22 out / 22 in, input 60 / 21 lands ✅ |

**Rule check (mana across a loyalty activation).** CR 106.4: "Each player’s mana pool empties at the end of each step and phase." Mana from Chandra "+1: Add {R}{R}" or Pyromancer’s "[+1]: Add {R}" therefore stays in the pool after the ability resolves, until that main phase ends. A loyalty ability is never a mana ability (605.1a: "it’s not a loyalty ability"; Pyromancer ruling 2026-08-21: "Loyalty abilities can’t be mana abilities"). So it needs an empty stack in your main phase (606.3) and must be activated **before** Emrakul is cast. That is the builder’s "first".
- **T6 line:** confirmed by this rule (9 + R = 10).
- **T7 line:** does not use walker mana.
- **Garruk +2:** re-tapping the CC land in the same phase also relies on 106.4.

**Ownership / legality.** Gate (`deck-gate.ts … final.txt --format standard --owner 1 --source arena`): every check PASSes except `FAIL ownership 2 card(s) … Curse-Marred Demon, Emrakul, the Exigent Doom` (expected) ✅.
- Arena counts (DB `collection`, source arena) vs final:
  - Craterhoof 4/2. Scryfall: standard legal, Arena print `tdm` ✅
  - Tyvar 2/1 (`dsk`) ✅
  - Terror 2/2 (`otj`) ✅
  - Leatherhead 4/1 (`tmt`) ✅
  - Warlord 1/1, Starting Town 4/2, Annex 4/3, Sear 4/2, Burst 8/4, Stomping Ground 2/2, Spider 4/4, Llanowar 24/4 ✅
- DB legality is `legal` for all 21 names.
- The DB shows Ajani 1, Pyromancer 1, Garruk 1, Paradox 2 against deck counts 3/3/2/2. Per BUILD-BRIEF the operator’s counts are ground truth. The gate checks presence only, so copy counts are **UNVERIFIED** by the DB.

## §3 Cut verdicts (operator’s cards; "upheld" = the builder’s cut stands)
| Card | Verdict | Reason |
|---|---|---|
| Craterclaw ×3 | **Upheld** | Concrete arithmetic. Craterclaw’s X counts artifacts: ≈ 3.4 even with the operator’s full artifact package, giving +X/+0. Hoof’s X counts creatures: ≈ 5.8, giving +X/+X. The operator’s own list has 17.5 creature cards vs 11 artifact units, so Hoof wins there too. It costs 1 more mana |
| Puppetbeast ×2 | Upheld | Terror is the same MV, a flier, and pings 2 / 4 / 5+X / 12 on Cadet / Beast / Hoof / Emrakul. Both trigger Garruk |
| Aerid | Upheld (near-tie) | Leatherhead’s hexproof vs Aerid’s flying plus an untapped Heartwood (T5 Ajani). Model 80.72 vs 83.44 |
| Tethermage ×3 | Upheld | Net +1 source, a turn late; its artifacts only matter for Craterclaw |
| Grab ×2, Bushwhack ×2 | Upheld | Grab is card-neutral; Bushwhack is a sorcery fight that needs a body. Burst is an instant to any target |
| Capstone ×2 | Upheld | 7 MV, random free spells, the paradigm counts only the first resolution |
| Passage ×4 | Upheld | Model mana equal (h9). Annex gives R or G untapped once a walker or Jace token is out (T2 Pyromancer → T3) |
| Emrakul #2 | Upheld (near-tie) | The second copy is a {3} ramp spell and a legend duplicate. Model −2.7 vs Paradox #2 (h5/k7) |
| Paradox #3 | Upheld | Warlord’s "[−4]" removal on every walker beats a duplicate Paradox. The stated reason is weak (#3) |

## §4 Missed swaps (pool swept by role); final = DS 83.44
| # | Out → In | DS (run) | Text verdict |
|---|---|---|---|
| 1 | Overlord → **Outcaster Trailblazer** (x1) | **86.24**, rank 91.1 (r10) | Near-tie, details below |
| 2 | Overlord → Tezzeret (x1) | 83.44 (r2); vs Paradox #2 80.72 (r1) ✗ | Near-tie, details below |
| 3 | Overlord → Growing Rites of Itlimoc (x4) | 83.44 (r8) | Near-tie, details below |
| 4 | Leatherhead → Lizard, Connors’s Curse (x1) | 80.72 (r11) ✗ | Below the final, details below |

1. **Outcaster Trailblazer for Overlord.**
   - For: "When this creature enters, add one mana of any color." and "Whenever another creature you control with power 4 or greater enters, draw a card." Eight such cards are in the list, plus the Garruk Beast. Its own 4 power triggers Garruk, gives Terror 4 damage and Tyvar X 4.
   - Against: it loses Overlord’s permanent +1 land from T4 and the 6/5 body.
   - The model gives the same +2.8 for −Terror and −Hoof (r16, r18). That is the generic midrange count the builder saw with Overrun, not proof.
2. **Tezzeret for Overlord.** "0: Untap target artifact or creature" untaps a dork: +1 mana from T3 (Overlord’s ramp starts T4) and a loyalty trigger every turn. Against: 4 loyalty and no body.
3. **Growing Rites for Overlord.** It looks at the top 4 for a creature (.77 hit with 18 creature cards). At 4 or more creatures it transforms into "{T}: Add {G} for each creature you control". The ramp is conditional.
4. **Lizard for Leatherhead.** A 5/5 trample that survives kicked Burst, Sear and Ajani −3, and its ETB neutralises a creature. It loses hexproof (Boomerang Basics, 5-damage removal).

Rejected, model ≤ final with weaker text:
- Compel Brutality −Sear (80.72, r4)
- Fire Nation Palace −Mountain (83.44, enters tapped T1, r5)
- Emrakul #2 −Hoof #2 (r6)
- Thornfist Striker −Paradox (needs life gain, r7)
- Outcaster −Paradox / −Sear / −Spider / −Leatherhead / −Pyromancer (all ≤ 83.44: r9, r13, r14, r15, r17)
- Overlord → Outcaster plus Paradox → Tezzeret together: 83.44 (r19)

Stop proof by role:
- **Removal:** about 100 owned R/G instants and sorceries. None beats Sear’s 2 MV, instant, 4 damage, hits walkers, except creature-dependent bites.
- **Walkers:** Tezzeret is the only owned one outside the list.
- **Ways:** only Wildspeaker (h3, h17).
- **Lands:** no other untapped R/G dual. The rest enter tapped, give one colour, or have spend restrictions.
- **Closers on the winning turn:** Hoof (haste, trample, X counts Cadets and Emrakul); Tyvar (repeatable, X = 12 with Emrakul, needs trample from Hoof or Garruk −4); Emrakul (needs Ajani +1 for haste); Terror (damage per entry). No pool card beats these on text.

## §5 List
`final.txt` unchanged (60, 23 lands). Gate: `VERDICT FAIL` only on `ownership 2 card(s) … Curse-Marred Demon, Emrakul` (expected); everything else PASS.
If the operator takes #1, use `refute/r10.txt` (−1 Overlord of the Hauntwoods +1 Outcaster Trailblazer). Its gate: the same 2 ownership FAILs, lands 23 PASS, avg MV 3.38, curve 1:8 2:9 3:5 4:5 5:4 6:3 7:3.
