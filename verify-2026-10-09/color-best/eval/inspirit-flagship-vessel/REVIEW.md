# Inspirit, Flagship Vessel: review of the sleeved list (2026-10-09)

Base: `../inspirit-flagship-vessel.sleeved.txt` (= `decks/paper/decks/inspirit-flagship-vessel.txt`, 38 lands, Urza in the 99, no Emry).
Proposed: `final.txt` (99 + commander, 35 lands + 1 MDFC). Lab: `swap-lab.txt`. Climb: `climb/results-0.jsonl`. Free pool: `free2.txt`.

## Verdict
The model can't see this deck's kills. Its win component reads the list as "Token/Food conversion (5 bodies): closes T14, access 3%". It never counts Depthshaker, Craterclaw or Cyberdrive as finishers. So the six swaps below are a judgment call:
- Cut the drain backup (Lux Artillery, Lasting Tarfire), Chandra and three tapped non-artifact lands.
- Add removal, a one-sided wipe, alpha protection, a station enabler and an untap engine.
- Model: Deck Score unchanged, objective **+1.99** (only the removal-window penalty, 5 → 4).

## Scores (300 games unless noted)
| List | Objective | Deck Score | Win | Penalty | Roles (land/ramp/draw/removal/wipe/prot) |
|---|---|---|---|---|---|
| Sleeved | **26.83** | **25.4** | 7 | 5 | 38/9/11/7/2/5 |
| Model climb (100 games, 2 passes, not converged) | 66.03 | 58.6 | 48 | 2 | 35/10/11/9/2/5 |
| Proposed (6 swaps) | **28.82** | 25.4 | 7 | 4 | 36/9/10/8/2/5 |

## Model climb: cuts and adds
| Out | In | Objective after | Verdict |
|---|---|---|---|
| Razortide Bridge | Nadaar, Selfless Paladin | 26.7 → 59.95 | Rejected. +33 is the win heuristic counting Nadaar's dungeon anthem as a token converter. A full dungeon takes 4 ventures (ETB + 3 attacks) from a non-artifact 3/3 outside Inspirit's shield. Razortide is an artifact land (affinity, Craterclaw X, Bay MV 0, Urza). |
| Temple of Epiphany | Balefire Liege | → 61.99 | Cut accepted (tapped, non-artifact). Add rejected: a 5-mana anthem for a deck whose attackers are colourless artifacts. |
| Mystic Monastery | Giant's Boulder | → 66.03 | Cut accepted. Add rejected: filler rock. |

## Swaps (Δ = this swap alone on the sleeved base, swap lab, 300 games)
| # | Out | In | Why (oracle) | Source | Δ |
|---|---|---|---|---|---|
| 1 | Temple of Epiphany | Sink into Stupor // Soporific Springs | Takes the land slot: "Return target spell or nonland permanent an opponent controls to its owner's hand", or an Island-like U land. Interaction at no land cost. | free (Urza list 10-02) | +0.09 |
| 2 | Mystic Monastery | Filigree Attendant | "power is equal to the number of artifacts you control": one tap stations Inspirit to 8+, Uthros Research Craft or Godcore to 12+. Flying, Bay MV 4. | free (Urza found 10-06) | −0.01 |
| 3 | Radiant Summit | Oblivion Stone | "Destroy each nonland permanent without a fate counter": at 8+, "Other artifacts you control have hexproof and indestructible", so it is one-sided. {4} fate counter on Inspirit. | free (Omo precon, confirmed) | −0.07 |
| 4 | Lux Artillery | Unstoppable Plan | "At the beginning of your end step, untap all nonland permanents you control". Traxos ("doesn't untap during your untap step") untaps every turn. Insight Engine, Autogenerator, Lux Cannon, Nyx Lotus and Urza work twice a round. | free (Urza box 10-02) | −0.02 |
| 5 | Lasting Tarfire | Resculpt | "Exile target artifact or creature". Instant, 2 mana, exile handles indestructible. Removal 7 → 8. | free (Urza box 10-02) | +22.65* |
| 6 | Chandra, Spark Hunter | Katara's Reversal | "Counter up to four target spells and/or abilities. Untap up to four target artifacts and/or creatures": protects the alpha, and untaps the rocks for the turn after. Chandra's combat ability only animates Vehicles (here only her own token). | free (Urza found 10-06) | −0.65 |
| | **All six** | | | | **+1.99** (DS 0.0) |

\* The win component's horizon step ("closes T14 → T13", win 7 → 33) is noise. It disappears in the ALL run (win 7). The real all-swap gain is the removal window.

Checks:
- Every add is in `decks/paper/collection.txt` and in no `decks/paper/decks/*.txt`.
- Colour identity is U or colourless.
- Singleton holds; 99 + commander = 100.
- Land count drops 38 → 35 + 1 MDFC (the model's own climb goes to 35). R sources stay 17+ for Craterclaw's RRR.

## Plan and win lines (checked against oracle)
- **Primary:** station Inspirit to 8+, so "Other artifacts you control have hexproof and indestructible". Then animate and alpha:
  - A: Depthshaker gives "melee, trample, and haste" to every artifact creature.
  - B: Cyberdrive makes noncreature artifacts "a 4/4 artifact creature", then Bay sacrifices Cyberdrive (MV 6) for Craterclaw (MV 7), whose ETB gives "+X/+0 ... where X is the number of artifacts you control" and trample.
  - The guide's arithmetic holds: 66/68 for A, 145/146 for B, hard-cast Craterclaw 77, with Panharmonicon 142.
- **Backup (one):** commander damage C. Improvised Arsenal "+1/+0 for each artifact you control" plus Boros Charm "double strike" gives 2 × (5 + N) ≥ 21 from N = 6.
- **Dropped:** drain D. Lux Artillery needs "thirty or more counters", and Tarfire is a 2-a-turn clock. Both slots go to interaction.
- New support:
  - Filigree Attendant reaches 8 sooner. The guide says Bygone or Traxos shows up by T4 in only 19 % of games.
  - O-Stone and Katara's Reversal clear the way for the alpha and protect it.

## Guide errors (`.claude/skills/deck-building/reference/decks/inspirit-flagship-vessel.md`)
1. Header: "It is the sleeved list with Emry, Lurker of the Loch in for Urza". That is wrong today. The sleeved file still has Urza, Lord High Artificer and no Emry (the hot-swap was never applied).
2. These Emry parts describe a card not in the deck:
   - the T4 flow "Traxos ... → Emry for {U} ... Inspirit at 8 the same turn";
   - the Recursion row ("Emry ... {T}: Choose target artifact card in your graveyard");
   - the flow "Bay eats Cyberdrive → next turn Emry ... a second animation turn";
   - "historic spell (Emry, Sol Ring, Jitte)".
3. Urza is not mentioned anywhere. His oracle includes "Tap an untapped artifact you control: Add {U}" and a Construct token that gets "+1/+1 for each artifact you control". He is also missing from the unshielded non-artifact list, which names Emry instead.
4. "Tezzeret's 0 ... re-taps Nyx Lotus": the oracle says "Untap target artifact or creature". It untaps the Lotus so it can be tapped again (wording only).
5. Drain line D, Lux Artillery and Lasting Tarfire must go from the guide if swaps 4–5 land.

## Risks
- The model can't see any of these swaps (Deck Score flat). All six rest on judgment: oracle text and the guide's lines.
- Five of the six adds (Sink, Filigree, Unstoppable Plan, Resculpt, Katara's) are in the unsleeved Urza draft (`verify-2026-10-06/urza-found/final-3.txt`, Moxfield).
  - If Urza gets sleeved first, they are taken.
  - Substitutes not in that draft: Pongify or Journey to Nowhere for Resculpt, Shatter the Sky for a wipe, Pinnacle Emissary for a body.
- Inspirit is outside its own shield. O-Stone kills it unless it gets the {4} fate counter first. Katara's Reversal can't save it from "destroy all".
- 35 lands + 1 MDFC relies on the rocks. Keep the guide's mulligan rule (≤ 2-MV mana piece) strict.
- Urza ↔ Emry is still pending. Swaps 1–6 don't touch either card.
