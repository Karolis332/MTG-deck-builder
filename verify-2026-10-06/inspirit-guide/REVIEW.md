# Inspirit guide review (2026-10-07, Opus, fresh context)

**Guide:** `.claude/skills/deck-building/reference/decks/inspirit-flagship-vessel.md` (147 lines, 66 chips, 12 flows). **List:** `verify-2026-10-06/urza-found/inspirit-hotswap.txt`.

**Checks:** `check.py`: every chip is a DB name; every flow has 3–6 steps of ≤ 12 words and ≤ 1 chip each; nothing is nested; no table cell contains a pipe. 38/38 quotes are verbatim, from the DB oracle text (`oracle.txt`) or CR 2026-09-25 (`cr.txt`). Maths: `calc.py`.

## Rulings checked
| Claim | Verdict | Source |
|---|---|---|
| Station may tap a summoning-sick creature | ✅ | CR 302.6 covers only a creature's own {T} abilities and attacking; station's cost is "Tap another untapped creature you control" (702.184a) |
| The 8+ box holds Flying, the hexproof/indestructible grant and the 5/5 | ✅ | CR 721.2b + the card image (Scryfall EOC 2). Inspirit itself is not covered |
| Inspirit attacks the turn it reaches 8 | ✅ | CR 302.6 (it has been on the battlefield since the turn began) |
| Cyberdrive unattaches Equipment | ✅ | CR 301.5c. Glitters, an Aura, stays |
| Cyberdrive → Bay → Craterclaw/Depthshaker | ✅ | CR 611.2a: the 4/4s outlive the sacrificed Cyberdrive. MV 6 → 7: Craterclaw, Depthshaker, Thunderhulk, Thought Monitor |
| **New:** Bay must have been controlled since the turn began | ⚠️ | Cyberdrive makes Bay a creature, so its {T} falls under CR 302.6. The same goes for rocks cast this turn |
| Proliferate refuels counters | ✅ | CR 701.34a |
| Depthshaker's sacrifice gets past indestructible | ✅ | CR 701.21a, 702.12b. Never target an Inspirit below 8 (2025-07-25 ruling: a station permanent becomes base 3/3) |
| **New:** Final Showdown's mode 1 plus the wipe kills our artifacts | ⚠️ | Mode 1 strips Inspirit's grant (layer 6, CR 613.1f). It is in the guide's traps |
| Kilo's proliferate resolves before the station counters | ✅ | CR 603.3: the trigger becomes the topmost object |
| Melee gives +3/+3 against three defenders; commander damage is 21 | ✅ | CR 702.121a, 903.10a |
| Recasting Bygone from exile costs {9}; Ripples lasts until your untap step | ✅ | CR 702.185a, 702.26a |
| Craterclaw's set is fixed at resolution, so a Three Steps copy re-pumps the attackers | ✅ | CR 611.2c |

**Maths** (reference board: 10 artifacts, 7 lands): Depthshaker: 68 trample, 136 with Historian. Cyberdrive → Bay → Craterclaw: 146. Hard-cast Craterclaw: 77, or 141 with Panharmonicon. Arsenal + Charm reaches 21 from 6 artifacts; Arsenal + Glitters from 8. Lux Artillery: 28 counters, 56 after Skate. Lux Cannon: 3 kills in 4 turns when fed every turn.

## Emry, Lurker of the Loch (in for Urza)
**What it does** (DB text): "Affinity for artifacts" cuts **only Emry's own cost**, to {U} with 2+ artifacts. The 2019-10-04 ruling: "reduces only the generic mana in Emry's cost". It is not a cost reducer for the deck. "When Emry enters, mill four cards." "{T}: Choose target artifact card in your graveyard. You may cast that card this turn." It is summoning-sick the turn it arrives, gets no haste from Alibou or Depthshaker (it is not an artifact), and can't play artifact lands.

**Roles:** A {U} historic spell that untaps Traxos, so Traxos 7 + Emry 1 stations Inspirit to 8 on T4. It recasts Depthshaker's sacrificed spares, Bay's Cyberdrive (a second animation turn), and artifacts discarded to Thirst, Fact or Fiction or Chandra.

**What Urza did that Emry can't:** "Tap an untapped artifact you control: Add {U}": every idle Equipment, Bay or Engine became mana. A Construct ("+1/+1 for each artifact you control") that is a one-tap station and a big Depthshaker attacker. The {5} free card.

**landsim**, sleeved list vs hot-swap, with Urza as a 2-{U} floor: T7 Depthshaker drops 59.1 → 55.1 % (−4 pts at every land count); average mana on T5 drops 5.31 → 5.20. T3/T4 Inspirit is unchanged. The sim treats Archway and Godcore as spells, so the absolute numbers are low, but the gap between the lists holds. The real loss grows late.

**Recommendation only:** Keep Emry while Urza is in the Urza box. If the mana dip shows, Astral Cornucopia (1 owned, in no deck, cut 10-02 for Lost Jitte) is the free ramp for this slot. Inspirit's two charge counters a turn grow it.

## Cards with no role
**None.** All 61 nonland cards are named (`check.py`) and placed in a win line, the engine map, interaction or mana.

Thinnest links (not proposals; One Last Job and Chandra are operator picks):
- **One Last Job:** it returns creature cards only, and artifacts rarely die under the 8+ grant. Its targets are Bay's Cyberdrive, countered finishers and non-artifacts, and Emry overlaps it.
- **Chandra, Spark Hunter:** a 3/2 Vehicle plus a loot.
- **Voyage Home, Universal Surveillance:** plain draw.
- **Lux Artillery:** the third route (REFUTE-2 §5); here it is the grind plan, with Skate and Metamorph.
