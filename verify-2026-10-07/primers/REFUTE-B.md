# REFUTE-B: Tam, Tazri, Meren, Imotekh primers (fresh-context Opus refuter, 2026-10-07)

Evidence: DB oracle text (`q.py`), CR 2026-09-25 (MagicCompRules 20260925.txt), Scryfall rulings API, the cited reports. Every primer re-checked with `primer-check.ts --base` after the last edit: **all 4 PASS** (the checker now also enforces verbatim quotes).

| Primer | Verdict |
|---|---|
| tam-the-possibility | FIXED, 17 errors (2 HIGH, 4 MED, 11 LOW) |
| tazri-beacon-of-unity | FIXED, 16 errors (1 HIGH, 5 MED, 10 LOW) |
| meren-of-clan-nel-toth | FIXED, 14 errors (1 HIGH, 4 MED, 9 LOW) |
| imotekh-the-stormlord | FIXED, 14 errors (3 HIGH, 2 MED, 9 LOW) |

## Errors (all fixed in place)

| Primer | Field | Claim | Finding | Source | Sev |
|---|---|---|---|---|---|
| Tam | keepers / Evolution Sage | quotes "Landfall - put a loyalty counter on each planeswalker you control, then proliferate" | fabricated; oracle is "Landfall — Whenever a land you control enters, proliferate." | DB | HIGH |
| Tam | win Jace-25 lock, turn | "T7-9" | sleeved list lock-ready by T7/T9 in .06/.08 of games | verify-2026-10-03/tam-wincon/build-report.md §2 | HIGH |
| Tam | swap 5 Turbulent Wilderness | "tapped only if opponents control 8+ lands" | inverted: tapped *unless* they control 8+ | DB | MED |
| Tam | swap 7 Wanderer→Library | "blanks 4 painlands" as a defect; "no plus ability to earn Mentor counters"; Library "from turn 2" | prevention is the Wanderer's upside (cost of the swap), 3 painlands in list; Mentor counters hit every walker; cast T2 draws from T3 | DB, list, REFUTE.md row 5 | MED |
| Tam | keepers / Vigorbloom Charm | "protects a walker unconditionally" | combat damage still removes loyalty | CR 306.8, 704.5i | MED |
| Tam | pilotRules[0] | Liliana trigger "only fires on the cast" | Liliana the Faultless triggers on enter; Beacon on cast | DB | MED |
| Tam | LOW ×11 | swap 3 "Moor enables itself" (its clause is opponents' lands; also enables Dragonskull); swap 1 "Paradox refunds 3 life"; swap 2 0.06 credited to tam-report (it is REFUTE.md's sim); swap 6 Uro land "enters untapped (triggers Sage)" (not forced untapped; Farseek's land triggers Sage too); swap 8 quote merged both modes (with Tam out, both modes); swaps 3/5 quoteIn merged the type line; Quintorius keeper cited the Mangara-vs-Sage line (stop proof is Mangara < Quintorius via Chimil exile casts); Settle keeper cited REFUTE (it is tam-report) and "small tokens" (dorks); engine "colour on the battlefield" (among your permanents); burn grind turn unsimulated; "same turn it triggers" (activation) | DB, tam-report.md §stop proof, pilot guide | LOW |
| Tazri | win Najeela + Parade | pays WUBRG "from the tokens" right after they attack | attacking tokens are tapped, new ones lack haste; first WUBRG must come from lands or tokens that stayed home | CR 508.1f, 302.6; pilot guide row 5 | HIGH |
| Tazri | keepers / Stick Together | "one-sided sweeper" | symmetric: each player keeps a party; pilot guide says never while ahead | DB, pilot guide | MED |
| Tazri | keepers / Coveted Prize | "casts a {4}-or-less card free straight off the top" | tutors to hand, then free-casts from hand | DB, Scryfall ruling | MED |
| Tazri | swap 10 Safana | "list no longer runs an initiative package" | 6 initiative sources remain (Rilsa, Dungeoneer, White Plume, Ravenloft, Undermountain, Explore) | list; tazri-report.md "7 → 6" | MED |
| Tazri | swap 12 Feywild | "needs the initiative, which this pass cut most of the support for" | Caretaker takes the initiative itself; 6 sources remain | DB, tazri-report.md | MED |
| Tazri | pilotRules[7] | Mangara "loses a Cleric slot relative to Hama Pashar" | Hama is a Wizard, Mangara a Cleric | DB | MED |
| Tazri | LOW ×10 | mulligan "no W strands Blade Historian" ({R/W} hybrid); Historian double strike "for the rest of the game" (static); Spelunking ruling garbled; Destined Thief "draws a card" (loots); Ash Barrens "no colour upside" (fetches any basic); Burakos "drains" (loss only); dig omitted Ally; Linvala "plain anthem"; Zimone "beats every one of them incl. Realmwalker"; quotes: Springleaf quote marks, Cursed Idol dash, Prodigy reminder text cut mid-quote, Steppe/Verdure type line merged, Mangara/Triumphant periods inserted (checker FAIL) | DB, rulings, REFUTE.md §5 | LOW |
| Meren | keepers / Golgari Charm | regenerates "against -X/-X wipes (Toxic Deluge, Massacre Wurm)" | toughness 0 is not destruction; regeneration can't replace it | CR 704.5f | HIGH |
| Meren | engine threshold flow | target chosen after the trigger resolves | target chosen when the trigger goes on the stack; count read on resolution | CR 603.3d; Meren ruling | MED |
| Meren | metrics + swap | "12 other draw sources" after the cut | Library was 1 of 12, so 11 remain | REFUTE.md §6 | MED |
| Meren | pilotRules[3] | Liliana DG / Moldervine draws "deck you long before 40 drains" | 40 deaths = 40 draws (80 with both); Spawn is a "may", so stop the loop | DB | MED |
| Meren | keepers / Chthonian | "one of only two non-Meren reanimation lines (with Reanimate)" | 4: Reanimate, Victimize, Cauldron of Essence, Chthonian | list, DB | MED |
| Meren | LOW ×9 | Broodscale turn "as early as T5" (guide ideal T4; T3 off the Sol Ring keep); Long Feng land deaths "Sakura-Tribe Elder" (a creature); Gitrog "no beating card found" (09-28 preferred Avacyn; Gitrog is an operator lock); Culling Ritual "one-sided" (MV ≤ 2 rocks die); summary "every death" (another creature you control); Konrad "per card leaving the yard" (creature cards); mulligan "everything 5+" (Deluge is 3); Mikaeus "Braids" (Arisen Nightmare is non-Human); Blood Artist "re-triggers its ETB" | DB, pilot guide §3, 09-28 final-swaps.json | LOW |
| Imotekh | win Colossus loop, damage | "3-4 per pass with two payoffs, ~10 passes" | Konrad 4 + Apprentice 3 = 7 per pass, 6 passes | DB; pilot guide §2 row 6 | HIGH |
| Imotekh | win drain attrition, damage | "roughly 4 per opponent per pass with all three" | Konrad 4 + Apprentice 3 + Bats 4 = 11 | pilot guide §2 row 6; CR 603.2c | HIGH |
| Imotekh | win Necron Overlord, damage | "no mana cost beyond the tap" | cost is {X}, {T}, tap X artifacts; Overlord itself needs no summoning sickness | DB; CR 302.6 | HIGH |
| Imotekh | swap Razorlash→Liliana | every milled card "an artifact under Bio and so a Konrad ping"; Razorlash "gated behind" 4 nonbasics; "the weakest kept card" | only creature cards ping Konrad; it is a {4} discount, not a gate (and each return is an Imotekh trigger); 09-28 weakest #3 | DB; newcards-report.md row 2 | MED |
| Imotekh | keepers / Darkness Crystal | "one-sided wipe ... does not interfere with death triggers" | not a wipe (replacement effect); denies Konrad's pings on opposing deaths | DB; pilot guide §2 | MED |
| Imotekh | LOW ×9 | Bio engine "Konrad/Apprentice/Bats now trigger" (they never needed artifacts; Master and Psychomancer gain); Trazyn "free activations", Szeras "under Bio" (native artifact); Szarekh "one-shot mill: Decorum Dissertation" (it draws); metric 11 omitted War in Heaven III and Soul Stone (13); Liliana "deck inside a handful of passes" (6 cards/pass, 8 with Bio); "either Scriptures" (one); Imp's Mischief "in the identity"; Colossus turn "as early as T6" (guide: set up T6, loop T7); quotes used " / " separators (checker FAIL) | DB, list, pilot guide | LOW |

## Card-choice disagreements (flagged, not applied)
- **Imotekh, Liliana the Repentant −Razorlash Transmogrant:** marginal. Razorlash's self-return is a repeatable Imotekh trigger (09-28 `final-swaps.json` kept it for exactly that), while Liliana's mandatory mill eats 6–8 library cards per Colossus pass. Operator's call.
- **Meren, Golgari Charm:** its written reason (-X/-X protection) was void. It still covers destroy wipes and Culling Ritual. Kept, but weaker than the old primer said.

## Errors in source files (outside my scope, not edited)
- Meren pilot guide §5: "Golgari Charm regenerate against a -1/-1 sweep" (CR 704.5f). Mulligan row "everything costs 5+" includes Toxic Deluge (MV 3).
- Imotekh pilot guide §2 row 8: "Under Bio, Szeras ... count too" (Szeras is a native artifact). Pitfall: Liliana mills "4–6 cards" per pass, which omits Colossus entering (6–8).
- 10-02 REFUTE.md line 108: "the pass cut most of the initiative package" contradicts tazri-report.md ("Initiative sources 7 → 6"). Row 5 "4 painlands": the list has 3.
