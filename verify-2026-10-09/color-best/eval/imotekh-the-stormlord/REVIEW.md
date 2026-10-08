# Imotekh the Stormlord: sleeved review (2026-10-09)

**Verdict:** keep the deck and make 5 swaps. The Deck Score stays at 60.6 for every swap, so the model cannot see these cards. The +3.95 objective comes only from the role-window penalty (5 → 3). The picks are judgment calls, each backed by the oracle text quoted below. All 5 adds are owned, free, mono-B and singleton; the list stays at 100 (`proposed.txt`).

## Scores (score.ts / swap-lab.ts, 300 games)
| List | Objective | Deck Score | Penalty | ramp/draw/removal/wipe/prot | interaction |
|---|---|---|---|---|---|
| Sleeved | 62.81 | 60.6 | 5 | 11/11/9/2/0 | 44 |
| Model climb (2 passes, 100 g) | 73.18 | 60.6 (abs 60.56) | 0 | 12/11/10/3/3 | 62 |
| Proposed (5 swaps) | **66.76** | 60.6 | 3 | 10/10/11/2/1 | 57 |

Components (sleeved): mana 88, curve 91, interaction 44, advantage 75, win 51 ("Token/Food conversion: closes T11"), synergy 100.

## Model climb (`climb/results-0.jsonl`, not converged)
Every step was +2.0 with the Deck Score flat. That is the window penalty, not card quality.
| Out | In (model) | My call |
|---|---|---|
| Metalwork Colossus | Giant's Boulder | ❌ Colossus is the combo piece. Szeras: "Sacrifice another creature: Add {B} equal to the sacrificed creature's mana value" means 11 {B}. Boulder is filler |
| Mirkwood Bats | Deadly Tempest | ❌ Bats: "Whenever you create or sacrifice a token, each opponent loses 1 life", and each Imotekh trigger makes 2 tokens. Tempest kills our own board |
| Marionette Apprentice | Soul of New Phyrexia | ❌ cut (it is a drain engine) / ✅ the add is taken, in another slot |
| Chronomancer | Overzealous Muscle | ❌ Chronomancer is a sac outlet, card draw and an unearth trigger. Muscle needs crimes |
| The Darkness Crystal | Kozilek, the Great Distortion | ✅ cut (anti-synergy, see below) / ❌ the 10-mana add |

## Swaps (lab deltas, each alone on the sleeved base)
| Out | In | Why (oracle) | Source | Δ |
|---|---|---|---|---|
| The Darkness Crystal | Solemn Doomguide | Doomguide: "Each creature card in your graveyard that's a Cleric, Rogue, Warrior, and/or Wizard has unearth {1}{B}". That covers 5 Necron Wizards plus Zealot (Cleric). Each unearth is an Imotekh trigger. The Crystal ("instead exile it") turns off Konrad, Reanimate and Portal | free | +0.01 |
| Wishclaw Talisman | Supernatural Stamina | "When this creature dies, return it to the battlefield tapped": protection for Imotekh against destroy effects. On a Necron, the return is an artifact card leaving the yard (Imotekh +2 Warriors), and Praetorian "enters from a graveyard" (draw 2). Wishclaw hands a tutor to an opponent | free | 0.00 |
| Grim Haruspex | Noxious Gearhulk | Haruspex sees only "nontoken" deaths, so it misses every Warrior. Gearhulk: "destroy another target creature", and it is a 6-MV artifact creature (Szeras gives 6 {B}; Ghost Ark/Technomancer can recur it) | free | +2.00 |
| Canoptek Wraith | Soul of New Phyrexia | "{5}: Permanents you control gain indestructible until end of turn" protects against wipes. The yard mode "{5}, Exile this card from your graveyard" also triggers Imotekh. Wraith is a 3-mana land fetch that needs combat damage | free | +1.95 |
| Liliana the Repentant | Sheoldred's Edict | Liliana's "Whenever another creature … enters, mill two cards" is mandatory: 4 cards per Imotekh trigger, 20 on Legion X=10, which risks decking you during loops. Edict is 2-mana instant removal, and the nontoken mode is the one that matters | free | +2.00 |
| (tested, rejected) Foundry Inspector | Thran Dynamo | +0.07 is noise. Under Biotransference, Inspector discounts every creature spell and is itself fodder | free | +0.07 |

All 5 together: 62.81 → 66.76 (**+3.95**). The 6-swap lab run including Dynamo gave +4.02.

## Plan and win lines (checked against oracle)
- **Primary:** Imotekh token engine plus drains. "Whenever one or more artifact cards leave your graveyard, create two 2/2 black Necron Warrior artifact creature tokens." The fuel is unearth (Doomguide adds unearth {1}{B} to 6 more cards), Ghost Ark, Cryptek, Technomancer and Myr Retriever. The payoffs are Bats, Apprentice, Konrad, Psychomancer, Marionette Master and Necron Overlord. ✅ The line holds.
- **Backup:** the Metalwork Colossus loop. **Ashnod's Altar has left the deck (to Beledros).** The loop now runs on Zealot or Woe Strider as the free outlet, which means Colossus must cost {0}: noncreature-artifact MV ≥ 11. Szeras turns one Colossus a turn into 11 {B}. ⚠️ The line still works but needs more setup. Cutting the Crystal removes 4 MV from the count: Lotus 5 + Portal 9, or Ark 4 + rocks.
- Legion swing: ⚠️ Skorpekh Lord is gone (no menace anthem). Imotekh's Grand Strategist gives "+2/+2 and gains menace" to one creature only.

## Guide errors (`.claude/skills/deck-building/reference/decks/imotekh-the-stormlord.md`)
On 2026-10-08, 5 cards left (Ashnod's Altar, Dark Ritual, Imp's Mischief, Phyrexian Arena, Skorpekh Lord). 5 came in (Charcoal Diamond, Grim Haruspex, Ravenous Chupacabra, Rune-Scarred Demon, Woe Strider). The guide was not updated:
1. Header ramp list: names Dark Ritual and Ashnod's Altar, and leaves out Charcoal Diamond.
2. §1 "Warriors feed Altar": Altar is gone.
3. §1 win line 5 and the §3 T6 realistic line: depend on the "Skorpekh Lord swing with menace". Lord is gone.
4. §2 row 6 Colossus loop: steps 2–3 are built on Ashnod's Altar ("Add {C}{C}"), including "mana-neutral at ≥ 9 (Altar itself counts 3)". Only the Zealot variant (≥ 11, free cast) remains. §5's MV count still lists "Altar 3".
5. §2 row 8 Trazyn: "Ashnod's Altar in the yard makes Trazyn a free outlet". That no longer applies.
6. §3 T3 "Phyrexian Arena", the §4 keep hand with Phyrexian Arena, and the mulligan hands with Dark Ritual and Imp's Mischief all name cards that are no longer in the deck.
7. §5 and §7 say "Imp's Mischief … the only protection" and "One protection spell". The sleeved list now has **zero** protection; the swaps add Soul of New Phyrexia and Supernatural Stamina.
8. §5 Life budget: still lists Arena.
The oracle quotes in the guide that are still in the list are verbatim and correct: Imotekh, Bats, Apprentice, Overlord, Master, Ghost Ark, Cryptek, Colossus, Trazyn, Anrakyr, Black Sun's Twilight, Mortuary Mire.

## Risks
- The model is blind to all 5 adds (Deck Score flat). The gain is judgment. Only removal and protection numbers back it.
- Removing the Crystal and Wishclaw takes 6 noncreature-artifact MV out of the Colossus count. Without Altar, the loop needs MV ≥ 11.
- Solemn Doomguide unearths exile ("if it would leave the battlefield, exile it"), so they give no death drains except Psychomancer's.
- Steel Hellkite, Thran Dynamo and Hangarback Walker are free now, but the unsleeved Urza draft eyes Hellkite and Hangarback. None of them are in the swaps.
- The protection window is still at 1 of 3. No other free mono-B card matches the classifier's protection patterns. Lightning Greaves is in Beledros.
