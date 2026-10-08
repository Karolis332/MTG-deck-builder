# The Cabbage Merchant — review 2026-10-09

**Verdict:** ✅ upgrade. Add Lembas as the 100th card and make 5 swaps. Together they add 4 removal spells, swap 1 protection spell for a better one, and cut 3 surplus ramp cards. Every add is owned and free. No other sleeved deck changes. The Food engine is untouched.

## Scores (score.ts / swap-lab, 300 games; climb 100 games)
| List | Objective | Deck Score | Roles (land/ramp/draw/rem/wipe/prot) | Penalty |
|---|---|---|---|---|
| Sleeved, 99 cards as played | **11.1** | 19 (structure 0: not 100 cards) | 35/16/10/6/1/4 | 10 |
| Sleeved + 28th Forest (lab base) | 67.04 | 75.0 | 36/16/10/6/1/4 | 10 |
| Model climb (free pool, 2 passes, not converged) | 88.75 | 79 | 37/12/11/10/2/6 | 1 |
| Raids-allowed climb 2026-10-08 (for reference) | 89.2 | — | — | — |
| **Proposed (final.txt)** | **80.26** (+13.22 vs lab base) | 76.3 | 35/13/13/10/1/5 | 4 |

Files: `climb/results-0.jsonl`, `swap-lab.txt` (final run), `swap-lab-run1.txt` (first run, with Primeval Bounty), `final.txt` (100 cards; singleton checked; identity G).

## Model climb (free pool)
| Out → In | Δ | Take it? |
|---|---|---|
| Wild Growth → Warg Tactics | +5.4 | ✅ the cut; Warg Tactics is used here for Broodscale's slot |
| Basking Broodscale → Vivien Reid | +4.0 | ✅ both cards used, in different slots |
| Cultivate → Acidic Slime | +4.0 | ✅ the cut; Zuko's Exile instead (it also hits creatures, at instant speed) |
| Springbloom Druid → Cleanup Crew | +4.0 | ❌ Springbloom is a creature for Chord/Propagator, gives 2 landfalls for Provisioner, and loops with Ramunap |
| Spore Frog → The Echoverse Fulcrum | +2.0 | ❌ Fulcrum: "Destroy all creatures" kills our own token board; Spore Frog protects the Foods |
| Displaced Dinosaurs → Helix Pinnacle | +1.2 | ❌ filler; Dinosaurs is win line 2 |
| Toski → Silkguard | +1.0 | ❌ filler; Toski is the indestructible draw engine |
| Titanbones → Desert of the Indomitable | +0.3 | ❌ filler land |
The model's big deltas (+4) come from the role windows: ramp was 16 against a 10–12 window and removal 6 against 10–12. Each ramp → removal swap scores +4 from that alone. The deck really is short of removal, so these swaps are real; only the size of the delta is inflated.

## Swaps (one swap-lab run, all together = +13.22)
| # | Out → In | Why (oracle) | Source | Δ alone |
|---|---|---|---|---|
| 0 | (100th card) → **Lembas** | "When this artifact enters, scry 1, then draw a card." It is a Food (artifact) that works with the commander's "Tap two untapped Foods", Trail of Crumbs, Unlucky Cabbage Merchant, Wicked Wolf, Troll King, Took's draw, Wurmlet, Sarinth and Dinosaurs (7/7). | free | −0.17 vs a 28th Forest (noise) |
| 1 | Wild Growth → **Rocky Rebuke** | "Target creature you control deals damage equal to its power to target creature an opponent controls." Instant, 2 mana. Uses the 4/4 Beasts/Bears and 7/7s; no fight-back damage. | free | +4.03 (window) |
| 2 | Basking Broodscale → **Warg Tactics** | "Destroy target creature with flying." or "+1/+1 counter … trample and hexproof". Answers fliers, which the guide names as the deck's weak spot, or protects Took. | free | +5.36 |
| 3 | Cultivate → **Zuko's Exile** | "Exile target artifact, creature, or enchantment." Instant. This is the only unconditional exile in a mono-G 99 (the Clue is the cost). | free | +3.96 (window) |
| 4 | Autumn's Veil → **Tyvar's Stand** | "hexproof and indestructible until end of turn". Autumn's Veil only stops "blue or black spells"; Tyvar's Stand also stops red/white removal and wipes for the key piece. | free | 0.00 (model blind) |
| 5 | Emil, Vastlands Roamer → **Vivien Reid** | "−3: Destroy target artifact, enchantment, or creature with flying." "+1: … creature or land card" is card flow. Emil's X counts "differently named lands", which is ~3 here with 27 Forests. | free | +2.04 (window 1 + flat DS) |
Rejected after the lab: Emil → Primeval Bounty scored −7.08 (the win component dropped from 69 to 60; the 6-drop slows the close by a turn).

## Plan + win lines — verdict
✅ One primary plan: Took + Manufactor token multiplication into the Trudge Garden loop, with a wide trample alpha as the backup. Both are verified against oracle text:
- Took: "those tokens plus an additional Food token are created instead". Manufactor: "instead create one of each". With Took applied first, each Trudge Beast brings Food + Clue + Treasure.
- Jaheira: "Tokens you control have '{T}: Add {G}.'" The three non-creature tokens make {G}{G}{G} for each {2} paid, so each pass nets +{G}.
- Wurmlet gives 3 life events per pass; Propagator gives 1. The loop is unbounded either way. Took's "Sacrifice three Foods: Draw a card" digs to Walking Ballista.
⚠️ The model is blind to this loop: the synergy component is pinned at 100 and the win component reads "closes T9". Judgment says the deck kills earlier when the loop assembles.

## Risks
- Lands go from 36 to 35 with ramp at 13; the mana component reads 93 (it was 98). If the deck stumbles, use a 28th Forest as the 100th card instead of Lembas.
- The deck has still only 1 wipe-like effect. No free mono-G wipe fits a token deck (Fulcrum kills our own board).
- Tyvar's Stand and Lembas are judgment picks; the model is flat on both.
- The climb was 100 games and did not converge; its 88.75 includes filler swaps that judgment rejected.

## Guide errors (`.claude/skills/deck-building/reference/decks/the-cabbage-merchant.md`)
1. The ramp list includes **Kodama's Reach**, which left for Beledros on 2026-10-08. Springbloom Druid ("search … two basic land cards") is missing.
2. §2 row 6, **Idol of Oblivion** + Kraken: Idol left for Beledros. §7 "Artifact hate" still lists Idol.
3. **Pest Infestation** appears in a §4 mulligan hand and in the §5 threat cues; it left for Beledros. The §2 row 1 "Pest" token reference is stale too.
4. **Ramunap Excavator** ("You may play lands from your graveyard") is not mentioned. It loops Escape Tunnel and Springbloom's sacrificed land for Provisioner landfall.
5. Win line 2 says "Every Food, Clue and Treasure becomes a 7/7". Dinosaurs reads "As a historic permanent you control enters", so only tokens that enter after it are affected.
6. §2 row 9, Transmutation Font: the guide omits the cost "{3}, {T}, Sacrifice three artifact tokens with different names … Activate only as a sorcery". You need Manufactor's mixed tokens (or Blood) first.
7. The "99-card list" note is still open; the 100th card is proposed above (Lembas, replacing Elvish Archdruid from the 09-28 review).
