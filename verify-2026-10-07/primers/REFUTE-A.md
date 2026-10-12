# REFUTE-A: Urza + Inspirit primers (fresh-context Opus refuter, 2026-10-07)

| Primer | Verdict | primer-check after fixes |
|---|---|---|
| `urza-lord-high-artificer.json` | **FIXED, 39 errors** (6 HIGH, 13 MED, 20 LOW) | PASS (`--base verify-2026-10-07/primers/base/urza-lord-high-artificer.txt`), 50 swaps |
| `inspirit-flagship-vessel.json` | **FIXED, 10 errors** (0 HIGH, 6 MED, 4 LOW) | PASS (`--base decks/paper/decks/inspirit-flagship-vessel.txt`) |

Checked: all 52 Urza swaps (every quote, every reason) and the 1 Inspirit swap, all 8 win lines, every keeper, near-tie, metric, mulligan % and pilot rule. Oracle text from the DB (`q.py`); rulings from Scryfall (Urza 2022-12-08, Bane's Contingency 2022-06-10, Ember Island Production 2025-10-02).

## Errors

| Primer | Field | Claim | Finding | Source | Sev | Fixed |
|---|---|---|---|---|---|---|
| Urza | swap Ember Island quoteIn | "You may choose not to copy … it's 4/4 in addition to its other types" | Invented text. DB: "Create a token that's a copy of target creature you control, except it's not legendary and it's a 4/4 Hero …" | DB | HIGH | y |
| Urza | swap Super State quoteIn | "enchants an artifact or creature … deals combat damage to a player" | Invented text. DB: "Enchanted creature has base power and toughness 9/9 …" / "… combat damage to an opponent …" | DB | HIGH | y |
| Urza | swap Rite quoteIn | "copies … except they're not legendary" | Invented text. Rite has no non-legendary clause. The reason now says the legend rule removes the Urza copies but their ETBs still resolve | DB; CR 704.5j, 603.3 | HIGH | y |
| Urza | swap Bane's quoteIn + reason, near-tie | "If that spell's controller controls a legendary creature"; "when it targets Urza on the battlefield" | Invented text. DB: "If that spell targets a commander you control, instead counter that spell, scry 2, then draw a card." | DB; Scryfall ruling | HIGH | y |
| Urza | swap April quoteIn + reason | "Whenever you cast a spell, you may draw … once each turn"; casting "lands" | Invented text. DB: "At the beginning of your end step, draw a card for each card type among spells you've cast this turn." Lands are not spells | DB; CR 305.9 | HIGH | y |
| Urza | engine One-sided wipe | "Urza goes to the command zone" after Soul + Fulcrum | Soul gives every permanent we control indestructible, Urza included, so our whole board survives | DB; CR 702.12b, 611.2c | HIGH | y |
| Urza | swap Expedition Map (Padeem) | Padeem draws "while Urza is the highest-MV artifact" | Urza is a creature, not an artifact. Padeem checks the artifact with the greatest MV | DB | MED | y |
| Urza | keeper Soul | "A 5-MV artifact with no board presence" | It is MV 6, a 6/6 trample | DB | MED | y |
| Urza | near-tie Statue | "taxes opposing artifact/creature casts" | DB: "Spells your opponents cast cost {2} more" + 1 life drain each end step | DB | MED | y |
| Urza | metric Lands (box) | "31 (27 Island + 4 utility)" | 34 lands (27 Islands + Sandbar, Seat, Agna, Coliseum, Wilds, Gardens, Buried Ruin) + the Specimen MDFC | base list; 10-02 build-report l.153 | MED | y |
| Urza | metric Karsten | "vs 38.4 chosen" | 38.4 was the 10-06 rebuild. The final list is 35 + Sink | 10-06 build-report l.163; final-3.txt | MED | y |
| Urza | keeper + near-tie Starforge | "the deck's 38th land" | The final list has 35 lands. The text now says it was the 38th when picked | final-3.txt | MED | y |
| Urza | summary, swaps Talrand/Emeritus/Baral | "30-plus vs 18", "44 noncreature spells" | Those are 10-02 draft counts. The final list has 26 artifact spells, 20 instants/sorceries and 43 noncreature spells | DB count of final-3.txt | MED | y |
| Urza | engine N growers | "N +2 to +3 per spell" | With Sai + Efficient Construction: +3 per artifact spell, +5 with Helm (a Map per token event) | DB | MED | y |
| Urza | swap Golem Foundry | "becomes a 3/3 Golem at three"; "the refuter restored it" | Removing 3 counters creates a 3/3 Golem token. The operator's final pass restored it, not the refuter | DB; Session Log 10-06 | MED | y |
| Urza | swap River's Rebuke | "the box's symmetric Perplexing Test"; quote "owners' hands" | Perplexing Test was a 10-02 pool add, never in the box, and its picked mode spared our tokens. DB: "owner's hand" | 10-02 build-report row 43; DB | MED | y |
| Urza | swap table | Flesh Duplicate IN ×2; Island IN ×5 vs 3 actual | Re-paired: Archaeomancer → Padeem (Emeritus not located → Reconnaissance Mission → Padeem); Map → Deduce (no Rogue's Passage); Cam → cut. Dropped the duplicate Deduce and Island add rows. Ins and outs now equal the real base→final diff | 10-06 REFUTE.md l.3; Session Log 10-06 | MED | y |
| Urza | engine Copy + swap Ember reason | "(not legendary, so it stays)" | The Construct isn't legendary. The relevant fact is the 4/4 Hero base, (4 + N)/(4 + N), as Line A's 16 already assumes | DB; CR 707.9b | MED | y |
| Urza | metric avg MV | "3.52 in the 10-02 draft" | The 10-02 draft was 3.11; 3.52 was the 10-06 rebuild. 3.38 for the final list is correct | 10-02 l.175; 10-06 l.182 | LOW | y |
| Urza | swaps, 15 LOW | Sai quote missing "with flying"; Filigree/Katara quotes merged or cut ("artifacts" drops "and/or creatures"); Waterbending quote; Commandeer "counters" (it steals); Lair "replaces itself"; Winternight "wheel"; Powerstone "same {C}{C}" as Elevator's {C}{C}{C}; Coliseum's damage is on its mana ability; Rite "kicked for eight" (9, or 8 with Medallion); Kappa "gets ward 4 every time"; Academy Guardian "vanilla"; Fulcrum "draws" (it loots); Shimmer Myr "Plan covers flash"; Curse "only" mass answer (River's Rebuke too); Hammer "+{4} equip" (it attaches on entry) | as stated | DB | LOW | y |
| Urza | swap Academy Guardian evidence | cites the 10-06 REFUTE | Flesh Duplicate for Stonecoil came from the 10-02 REFUTE | 10-02 REFUTE.md l.4 | LOW | y |
| Urza | keeper Padeem | "1/3", "draws most turns" | 1/4; it draws only while we control the highest-MV artifact | DB | LOW | y |
| Urza | keeper Kuruk | "a second combat step" | Waterbend {20} gives an extra turn | DB | LOW | y |
| Urza | engine Mana note | "artifact and legendary spell" | Historic also covers Sagas (Kuruk) | DB reminder text | LOW | y |
| Insp | swap quoteIn | "Affinity for artifacts. {T}: … (You still pay its costs.)" | Two lines merged and the reminder text cut. Now the exact {T} line with full reminder text | DB | MED | y |
| Insp | swap reason | "24+ artifacts there vs 10 artifacts here" | Urza list 27, Inspirit list 41 artifacts | DB count | MED | y |
| Insp | summary + keeper Emry | "only artifact-recursion piece"; "Urza's affinity-cheap cost" | One Last Job returns creature/Equipment cards (Cyberdrive) to the battlefield. Emry is the only way to *cast* from the graveyard. Urza has no affinity | DB | MED | y |
| Insp | engine Charge sinks | Insight Engine "put a page counter" | DB: "Put a charge counter on this artifact, then draw a card for each charge counter" | DB | MED | y |
| Insp | win A flow | Depthshaker's 3/3s last "until end of turn" | DB: "Sacrifice them at the beginning of the next end step." The alpha costs those five artifacts | DB; guide line A | MED | y |
| Insp | swap reason | "the Repurposing Bay fetch … depend[s] on her" | Bay searches the library. Only the Cyberdrive recast depends on Emry | DB | LOW | y |
| Insp | keeper Jhoira | "A 2/2" | 3/3 | DB | LOW | y |
| Insp | keeper Swan Song | "fogs a wipe or draws a bird" | The caster of the countered spell gets a 2/2 flying Bird | DB | LOW | y |
| Insp | engine Protection, pilot rule | Ripples "counter target phases out instead"; Depthshaker "gets past indestructible" for Inspirit | Ripples: the permanents that got a counter phase out. Inspirit isn't indestructible itself; every Depthshaker target is sacrificed | DB; CR 702.12b | LOW | y |

## Verified correct (no change)
- **Urza Line A:** 12 + 12 + 16 = 40 at N = 12 (Ember copy 4 + N). **Line B:** 9 + 12 = 21; Super State's second hit is noncombat, so Bident draws only off the hit. **Line C:** blue Whirler copies (CR 707.2) skip Fleshraker; 10 Thopters = 10 burn; N = 23; 15 new artifacts pay 6 activations; 30 combat. **Kuruk:** an exhaust, waterbend extra turn. Copies of Urza: SBA before triggers (CR 704.5j, 117.5). The Urza ruling lets summoning-sick artifacts tap for mana. Mulligan % match the hypergeometric with 36/99 (44.3, 17.6, 20.1, 5.8, 12.1).
- **Inspirit:** Line A 68 / 136 and Line B 146 match the guide. Line C 2 × (5 + 6) = 22 ≥ 21. Lux Artillery text OK. Emry {U} + Traxos 7 + 1 = 8. Station may tap summoning-sick creatures (CR 302.6 covers only {T}/{Q} costs). Mulligan 53.6 / 53.7 / 28.1 % recomputed exactly.

## Card-choice disagreements (flagged, not applied)
- None. The Urza land count (35 + Sink vs Karsten's 37.5–40.2) is the operator's documented call. The primer now states it instead of "38.4 chosen".
