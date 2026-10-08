"""Beledros guide: §5 becomes the mulligan decision guide (bad hands, London bottoming, keep/mull examples) and a new
§6 'Piloting for consistency' (priority ladder, Pest decision flow, life as a resource, removal priority, closing math,
redundancy counts). Later sections renumbered. Header marks the list FINAL."""
import pathlib, re

G = pathlib.Path(".claude/skills/deck-building/reference/decks/beledros-witherbloom.md")
s = G.read_text(encoding="utf-8")

NEW5 = r'''## 5. Mulligan: what to do with a bad hand

Beledros is a 7-drop that makes fodder from the command zone, so the hand only has to do two things: hit land drops to seven and put one drain or outlet on the table by T3. Everything else arrives with the Pests. [[Revitalizing Repast]] counts as a land; [[Sol Ring]], [[Arcane Signet]], [[Talisman of Resilience]], [[Elvish Mystic]], [[Paradise Druid]] count as half a land each.

=> Count lands (3–4 is the window; 2 + a rock on the draw is the floor) → Both colours by T2? (a Swamp and a Forest, a dual, or a fetch/[[Cultivate]]) → One action by T3? (drain, outlet, fodder maker, ramp spell) → **KEEP** → otherwise **MULL** and bottom from the top of the curve

| Hand | Verdict | What to bottom at 6 | Why |
|---|---|---|---|
| 1 land, any spells | Mull | — | Even with a dork you need two more lands in three draws; the deck has 36 lands + Repast, the odds are against it |
| 2 lands + rock/dork + a 1–2 drop drain or outlet | Keep on the draw, mull on the play | the most expensive card | On the draw two looks at 34 lands in 92 cards find the third land about 60 % of the time; on the play it is 37 % |
| 3–4 lands, both colours, one of Dina / Zulaport / Blood Artist / Seer / Priest / Ophiomancer / Pest Rescuer / a ramp spell | **Keep** | — | This is the deck's hand: the engine starts before Beledros and he adds the fodder |
| 3–4 lands, one colour only, black spells | Mull unless a fetch, Cultivate, Kodama's Reach or Three Visits is in hand | a Forest or a Swamp you cannot use | Dina, Vito, Zulaport and Merchant are black-heavy; a Forest-only hand casts nothing |
| 5–6 lands + 1–2 spells | Keep only if the spells are a drain plus an outlet/engine; otherwise mull | the 6th land | Beledros will supply the fodder; two engine pieces and seven lands is a real game, two random spells is not |
| 3 lands, nothing under 5 mana (Merchant, Wurm, Mikaeus, Casualties, Tempest) | Mull | — | Nothing happens until T5; the table will be ahead |
| Reactive only (Deluge, Beast Within, Veil, Trophy + lands) | Mull at 7; keep at 6 only with 3–4 lands | a second answer | No plan: Beledros alone makes Pests but nothing drains |
| Vito + Sanguine Bond + Archive, no fodder, no outlet | Mull | — | Payoffs without an engine; they do nothing until a Pest dies |
| Any 5-card hand with 2–3 lands and one drain or outlet | Keep | — | At 5 the bar is lands + one action; stop mulling |

**London bottoming order at 6:** (1) the most expensive card that is not an engine piece (Casualties, Tempest, Massacre Wurm before Merchant); (2) the fifth or sixth land; (3) a second protection spell; never a 1–2 mana drain, never the only outlet, never the only green source.

| Keep | Why |
|---|---|
| Swamp, Forest, [[Woodland Cemetery]], [[Elvish Mystic]], [[Zulaport Cutthroat]], [[Viscera Seer]], [[Deadly Dispute]] | Drain + outlet by T2, Dispute refuels |
| Swamp, [[Llanowar Wastes]], [[Sol Ring]], [[Dina, Soul Steeper]], [[Ophiomancer]], [[Mortality Spear]], [[Cultivate]] | Fodder each upkeep, cheap removal, ramp to Beledros T5 |
| Forest, Swamp, [[Command Tower]], [[Arcane Signet]], [[Blood Artist]], [[Pest Rescuer]], [[Kodama's Reach]] | Rescuer makes the Pest Beledros would, two turns early |
| Swamp, Swamp, [[Golgari Rot Farm]], [[Talisman of Resilience]], [[Priest of Forgotten Gods]], [[Tendershoot Dryad]], [[Infernal Grasp]] | Rot Farm is the 4th land; Priest + Dryad is the T4 engine with an answer up |

| Mulligan | Why |
|---|---|
| Swamp, Forest, [[Gray Merchant of Asphodel]], [[Massacre Wurm]], [[Mikaeus, the Unhallowed]], [[Casualties of War]], [[Deadly Tempest]] | 2 lands, nothing under 5 mana |
| [[Bojuka Bog]], [[High Market]], [[Radiant Fountain]], [[Temple of the False God]], Swamp, [[Toxic Deluge]], [[Beast Within]] | 5 lands, two make no colour, only reactive spells |
| [[Elvish Mystic]], [[Paradise Druid]], Forest, [[Sanguine Bond]], [[Alhammarret's Archive]], [[Vito, Thorn of the Dusk Rose]], [[Plumb the Forbidden]] | 1 land; Bond and Archive do nothing without a board |
| Forest, Forest, [[Yavimaya, Cradle of Growth]], [[Dina, Soul Steeper]], [[Vito, Thorn of the Dusk Rose]], [[Zulaport Cutthroat]], [[Moldervine Reclamation]] | Three green sources, four black cards; keep only if the 6 has a Swamp or a fetch |

## 6. Piloting for consistency

The deck is consistent because every role has 8+ copies and the commander supplies the fodder. The job of the pilot is to put the pieces down in the right order and to spend life only when it comes back the same turn.

**Priority ladder (what to cast first when the hand offers two things)**
1. Land drop, then mana (dork, rock, ramp spell) until you have four sources — Beledros on T5–6 is worth more than any single drain on T3.
2. A table drain before an outlet: [[Zulaport Cutthroat]], [[Cauldron of Essence]], [[Mirkwood Bats]], then [[Dina, Soul Steeper]]. The first Pest that dies should already count.
3. An outlet before a fodder maker: [[Viscera Seer]], [[Priest of Forgotten Gods]], [[Ashnod's Altar]]. A Pest you cannot kill at instant speed is a 1/1 that dies to a wipe for nothing.
4. Then fodder ([[Ophiomancer]], [[Tendershoot Dryad]], [[Pest Rescuer]], [[Creakwood Liege]]) and draw ([[Moldervine Reclamation]], [[Midnight Reaper]], [[Phyrexian Arena]]).
5. Beledros when seven mana and a drain are on the table; put [[Lightning Greaves]] or [[Guardian Augmenter]] on him the same turn if the table has shown spot removal.
6. [[Mikaeus, the Unhallowed]] and [[Gray Merchant of Asphodel]] last: they are the multipliers, they do nothing on an empty board.

=> Upkeep: a Pest arrives ([[Mirkwood Bats]] drains on creation) → Is [[Priest of Forgotten Gods]] untapped with a second body? → yes: hold both for Priest on your turn (BB, a card, a table edict) → no: is a wipe or an edict threatened? → yes: sacrifice now to [[Viscera Seer]] / [[Ashnod's Altar]] / [[High Market]] → no: keep it as a blocker and feed [[Braids, Arisen Nightmare]] at your end step

**Life is a resource, not a score**
- Pay 10 to Beledros only when (a) the untapped lands are spent this turn and (b) a drain refunds at least half of it this turn. [[Gray Merchant of Asphodel]] and a Priest activation do; a lone Pest sacrifice does not.
- Stay above 20 against an open board with fliers or a combat deck; above 12 against everything else. [[Toxic Deluge]] and [[Deadly Tempest]] cost life too.
- Never tap out below the cost of [[Veil of Summer]] or [[Imp's Mischief]] on the turn you cast Merchant or Mikaeus.

| Removal target | Priority | Answer |
|---|---|---|
| Lifegain hate: Erebos, Tainted Remedy, Rampaging Ferocidon, Knight of Dusk's Shadow | 1 — on sight | [[Assassin's Trophy]], [[Mortality Spear]], [[Beast Within]], [[Casualties of War]] |
| Token hate: Authority of the Consuls, Blind Obedience, Elesh Norn, Torpor Orb-style effects | 2 | Trophy, Spear, [[Binding the Old Gods]] |
| A commander that combos or a planeswalker that ticks up | 3 | [[Infernal Grasp]], Priest edict, [[Liliana, Dreadhorde General]] −4 |
| Big attackers | 4 — only if they point at you | Pests chump; [[Massacre Wurm]] or [[Deadly Tempest]] when the drains are out |

**Closing checklist (count before you commit)**
- Attrition: Pests you can kill this turn × drains per death (Zulaport 1 + Dina 1 + Bats 1 + Cauldron 1 + Dina again for each gain) ≥ the lowest life total → go.
- Merchant: devotion to black X; each opponent loses X, you gain 3X; [[Vito, Thorn of the Dusk Rose]] or [[Sanguine Bond]] sends 3X (6X with [[Alhammarret's Archive]]) at one target. X = 7 is lethal from 40 through one of them.
- Alpha: Pests × ([[Thunderfoot Baloth]] +2, [[Mikaeus, the Unhallowed]] +1) with trample; add the Zulaport triggers from blocks.
- Never present lethal into open mana without [[Veil of Summer]] or [[Imp's Mischief]] if a single counter or fog undoes it.

| Role | Count | Cards |
|---|---|---|
| Fodder makers (besides the commander) | 9 | [[Ophiomancer]], [[Tendershoot Dryad]], [[Creakwood Liege]], [[Pest Rescuer]], [[Scute Swarm]], [[Eccentric Pestfinder]], [[Pest Infestation]], [[Blight Mound]], [[Liliana, Dreadhorde General]] |
| Sacrifice outlets | 8 | [[Viscera Seer]], [[Priest of Forgotten Gods]], [[Ashnod's Altar]], [[High Market]], [[Braids, Arisen Nightmare]], [[Deadly Dispute]], [[Plumb the Forbidden]], [[Grim Backwoods]] |
| Drains and lifegain payoffs | 9 | [[Zulaport Cutthroat]], [[Blood Artist]], [[Cauldron of Essence]], [[Mirkwood Bats]], [[Dina, Soul Steeper]], [[Vito, Thorn of the Dusk Rose]], [[Sanguine Bond]], [[Gray Merchant of Asphodel]], [[Massacre Wurm]] |
| Draw on death | 8 | [[Moldervine Reclamation]], [[Midnight Reaper]], [[Morbid Opportunist]], [[Liliana, Dreadhorde General]], [[Priest of Forgotten Gods]], [[Braids, Arisen Nightmare]], [[Plumb the Forbidden]], [[Deadly Dispute]] |
| Mana | 9 + 36 lands | [[Elvish Mystic]], [[Paradise Druid]], [[Sakura-Tribe Elder]], [[Sol Ring]], [[Arcane Signet]], [[Talisman of Resilience]], [[Cultivate]], [[Kodama's Reach]], [[Three Visits]] |
| Rebuy | 5 | [[Eternal Witness]], [[Veinwitch Coven]], [[Witch of the Moors]], [[Cauldron of Essence]], [[Mikaeus, the Unhallowed]] |
| Protection | 5 | [[Veil of Summer]], [[Tyvar's Stand]], [[Imp's Mischief]], [[Lightning Greaves]], [[Guardian Augmenter]] |

'''

start = s.index("## 5. Mulligan")
end = s.index("## 6. Lines to visualise each turn")
s = s[:start] + NEW5 + s[end:]
for old, new in [
    ("## 6. Lines to visualise each turn", "## 7. Lines to visualise each turn"),
    ("## 7. Misplays to avoid", "## 8. Misplays to avoid"),
    ("## 8. Weak spots and how to play around them", "## 9. Weak spots and how to play around them"),
    ("## 8. Maybeboard (26 cards, kept in the box) and between-game swaps", "## 10. Maybeboard (26 cards, kept in the box) and between-game swaps"),
    ("## 9. Buy list from the EDHREC pass (2026-10-08)", "## 11. Buy list from the EDHREC pass (2026-10-08)"),
    ("List: `verify-2026-10-08/best-deck/beledros-recommended.txt` (100, draft until sleeved). 35 lands + Revitalizing Repast MDFC.",
     "List: `verify-2026-10-08/best-deck/beledros-recommended.txt` — **FINAL, score-decided 2026-10-08** (climb converged, EDHREC pass found nothing above +0.13; sleeve it as is). 36 lands + Revitalizing Repast MDFC. On the check page every card shows its source deck; click it for the donor backfill and 3 model-scored backups."),
]:
    assert s.count(old) == 1, old[:50]
    s = s.replace(old, new)
G.write_text(s, encoding="utf-8")
print("guide: §5 mulligan rewritten, §6 piloting added, sections renumbered, header FINAL")
