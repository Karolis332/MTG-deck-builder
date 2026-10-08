"""Beledros guide, operator swaps 2026-10-08, batch 3 (buy-lab --swap, 300 games):
Horizon of Progress <- Temple of the False God (+0.08), Flare of Cultivation <- Simulacrum Shaper (0.00),
Insidious Roots <- Feral Appetite (-1.90), Dark Ritual <- Tyvar's Stand (-3.20), Argentum Masticore <- Guardian Augmenter (-8.70);
-13.56 together: the protection window (5 -> 3) and the Masticore's upkeep discard in the goldfish."""
import pathlib
import re

G = pathlib.Path(".claude/skills/deck-building/reference/decks/beledros-witherbloom.md")
s = G.read_text(encoding="utf-8")


def rep(old: str, new: str) -> None:
    global s
    assert s.count(old) == 1, f"{s.count(old)}x {old[:70]}"
    s = s.replace(old, new)


def rep_row(prefix: str, new_row: str) -> None:
    global s
    m = re.search("^" + re.escape(prefix) + r"[^\n]*\n", s, re.M)
    assert m, prefix[:70]
    s = s[: m.start()] + new_row + "\n" + s[m.end():]


# traps / sourcing / lands
rep("- ⚠️ [[Lightning Greaves]] gives Beledros shroud: your own [[Tyvar's Stand]], [[Feral Appetite]] and [[Vesuva]]/[[Thespian's Stage]] copies cannot target him either; [[Guardian Augmenter]] hexproof lets your spells through.",
    "- ⚠️ [[Lightning Greaves]] gives Beledros shroud: your own [[Vesuva]]/[[Thespian's Stage]] copies cannot target him either. Since 2026-10-08 nothing else in the list protects him (Tyvar's Stand and Guardian Augmenter are in the box): Greaves on, or recast him through the tax with [[Dark Ritual]].")
rep("| Quandrix precon leftovers (Tam build) | [[Temple of the False God]], [[Terramorphic Expanse]], [[Tyvar's Stand]], [[Guardian Augmenter]] | — |",
    "| Quandrix precon leftovers (Tam build) | [[Terramorphic Expanse]] (Temple of the False God, Tyvar's Stand and Guardian Augmenter left the list on 2026-10-08) | — |")
rep("incl. Blech, Loafing Pest, Simulacrum Shaper, Beledros himself",
    "incl. Blech, Loafing Pest, Flare of Cultivation, Horizon of Progress, Insidious Roots, Argentum Masticore, Beledros himself")
rep("| Imotekh the Stormlord (B) | [[Ashnod's Altar]], [[Skorpekh Lord]], [[Phyrexian Arena]], [[Imp's Mischief]] | Woe Strider, Grim Haruspex (Imotekh already runs Solemn Simulacrum and Syr Konrad), Rune-Scarred Demon, Ravenous Chupacabra |",
    "| Imotekh the Stormlord (B) | [[Ashnod's Altar]], [[Skorpekh Lord]], [[Phyrexian Arena]], [[Imp's Mischief]], [[Dark Ritual]] (operator swap 2026-10-08) | Woe Strider, Grim Haruspex (Imotekh already runs Solemn Simulacrum and Syr Konrad), Rune-Scarred Demon, Ravenous Chupacabra, Charcoal Diamond for Dark Ritual (the only free black rock; Worn Powerstone is the other free rock) |")
rep("— 36 lands, 5 + 5 basics.",
    "— 36 lands, 5 + 5 basics. Then [[Temple of the False God]] → [[Horizon of Progress]] (operator; lab +0.08): \"{T}, Pay 1 life: Add one mana of any type that a land you control could produce\" fixes colour from turn 1 instead of a land that is dead until the fifth; \"{1}, {T}, Sacrifice this land: Draw a card\" when flooded.")
# timeline / mulligan / piloting
rep("| [[Cultivate]], [[Kodama's Reach]], [[Simulacrum Shaper]] |", "| [[Cultivate]], [[Kodama's Reach]], [[Flare of Cultivation]] |")
rep("Mull unless a fetch, Cultivate, Kodama's Reach or Simulacrum Shaper is in hand", "Mull unless a fetch, Cultivate, Kodama's Reach or Flare of Cultivation is in hand")
rep("[[Temple of the False God]], Swamp, [[Toxic Deluge]], [[Beast Within]] | 5 lands, three make no colour,",
    "[[Horizon of Progress]], Swamp, [[Toxic Deluge]], [[Beast Within]] | 5 lands, two make no colour,")
rep("put [[Lightning Greaves]] or [[Guardian Augmenter]] on him the same turn", "put [[Lightning Greaves]] on him the same turn")
rep("| Draw on death | 9 | [[Simulacrum Shaper]], ", "| Draw on death | 8 | ")
s = s.replace("9 draw", "8 draw")
s, n = re.subn(r"^\| Mana \| 9 \+ 36 lands \| ", "| Mana | 11 + 36 lands | [[Dark Ritual]], [[Insidious Roots]], ", s, count=1, flags=re.M)
assert n == 1, "Mana row"
s, n = re.subn(r"^(\| Mana \| [^\n]*?)\[\[Simulacrum Shaper\]\]", r"\1[[Flare of Cultivation]]", s, count=1, flags=re.M)
assert n == 1, "Mana row Shaper"
s = s.replace("9 mana", "11 mana")
rep("| Protection | 5 | [[Veil of Summer]], [[Tyvar's Stand]], [[Imp's Mischief]], [[Lightning Greaves]], [[Guardian Augmenter]] |",
    "| Protection | 3 | [[Veil of Summer]], [[Imp's Mischief]], [[Lightning Greaves]] |")
s = s.replace("5 protection", "3 protection")
rep("; [[Tyvar's Stand]] for a single piece; [[Saw in Half]]", "; [[Saw in Half]]")
rep("The deck makes fodder without him; Guardian Augmenter gives hexproof, Greaves gives shroud and haste |",
    "The deck makes fodder without him; Greaves gives shroud and haste; [[Dark Ritual]] pays one tax; Pests tap for his mana through [[Insidious Roots]] |")
rep("| Fliers over a Pest wall | Pests are 1/1 ground tokens | Feral Appetite deathtouch, Mikaeus +1/+1, Beledros blocks 4/4 in the air |",
    "| Fliers over a Pest wall | Pests are 1/1 ground tokens | Mikaeus +1/+1, Blech counters, Argentum Masticore first strike, Beledros blocks 4/4 in the air |")
# engine row 13
rep_row("| 12 | [[Ashnod's Altar]] + [[Priest of Forgotten Gods]]", "__ROW12__")
row12 = re.search(r"^\| 12 \| \[\[Ashnod's Altar\]\] \+ \[\[Priest of Forgotten Gods\]\][^\n]*$", G.read_text(encoding="utf-8"), re.M).group(0)
s = s.replace("__ROW12__", row12 + "\n| 13 | [[Insidious Roots]] | \"Creature tokens you control have '{T}: Add one mana of any color.' / Whenever one or more creature cards leave your graveyard, create a 0/1 green Plant creature token, then put a +1/+1 counter on each Plant you control.\" | Every Pest is a mana dork from the turn after it enters: four Pests pay for Beledros's untap turn, and the untap untaps lands only, so tap the Pests first. Each rebuy ([[Eternal Witness]], [[Victimize]], [[Witch of the Moors]]) adds a growing Plant. Operator's pick 2026-10-08 over Feral Appetite (model −1.90: the removal window). |")
# maybeboard
rep("| [[Golgari Charm]] | [[Tyvar's Stand]] |", "| [[Golgari Charm]] | [[Dark Ritual]] |")
rep_row("| [[Argentum Masticore]] (model +2.01 back, its removal window) |",
        '| [[Guardian Augmenter]] (Quandrix precon; model +8.70 back: the protection window plus the Masticore\'s upkeep discard in the goldfish) | [[Argentum Masticore]] | Removal-heavy tables: "Flash / Commander creatures you control get +2/+2. / Commanders you control have hexproof" — a 6/6 Beledros nobody can target. Out on 2026-10-08 for Argentum Masticore (operator): "At the beginning of your upkeep, sacrifice this creature unless you discard a card. When you discard a card this way, destroy target nonland permanent an opponent controls with mana value less than or equal to the mana value of the discarded card." Feed it the spare land; first strike and protection from multicolored make it the blocker the Pests are not. |')
rep("| [[Reanimate]] (2 owned, one in Meren; model-neutral, rejected by the climb) | [[Feral Appetite]] |",
    "| [[Reanimate]] (2 owned, one in Meren; model-neutral, rejected by the climb) | [[Insidious Roots]] |")
rep_row("| [[Three Visits]] (Quandrix precon; model +0.03 back) | [[Simulacrum Shaper]] |",
        '| [[Three Visits]] (Quandrix precon; model +0.03 back) | [[Flare of Cultivation]] | Fast tables: an untapped dual on T2 ("search your library for a Forest card, put it onto the battlefield"). Out on 2026-10-08 (operator). |\n'
        '| [[Simulacrum Shaper]] (loose; model 0.00 back) | [[Flare of Cultivation]] | Any table: "When this creature enters, you may search your library for a basic land card, put that card onto the battlefield tapped. / When this creature dies, draw a card" — a body for the Altar that draws. In the list for an hour on 2026-10-08, out for Flare of Cultivation (operator): "You may sacrifice a nontoken green creature rather than pay this spell\'s mana cost" — two lands for a dying [[Elvish Mystic]] or [[Sakura-Tribe Elder]]; it cannot eat a Pest (token). |\n'
        '| [[Temple of the False God]] (Quandrix precon; model −0.08 back) | [[Horizon of Progress]] | Never: colourless and dead until the fifth land. Out on 2026-10-08 for Horizon of Progress (operator). |')
rep_row("| [[Insidious Roots]] (loose, owned; operator proposal 2026-10-08; lab +0.07 for Priest at 300 games, below 0.25) |",
        '| [[Feral Appetite]] (loose; model +1.90 back, the removal window) | [[Insidious Roots]] | Graveyard tables and flier walls: "Attacking Pests you control get +1/+0 and have deathtouch. / {1}{G}: Exile target card from a graveyard. If a creature card is exiled this way, create a 1/1 black and green Pest creature token" — repeatable graveyard hate that makes Pests. Out on 2026-10-08 for Insidious Roots (operator; proposed earlier the same day at +0.07 for Priest, applied against Feral Appetite instead). |')
rep_row("| [[Dark Ritual]] (owned, but sleeved in Imotekh; operator proposal 2026-10-08; lab −0.01) |",
        '| [[Tyvar\'s Stand]] (Quandrix precon; model +3.20 back, the protection window) | [[Dark Ritual]] | Wrath and spot-removal tables: "Target creature you control gets +X/+X and gains hexproof and indestructible until end of turn" — the card that saved Beledros or Mikaeus from a destroy-wrath. Out on 2026-10-08 for Dark Ritual (operator): "Add {B}{B}{B}" — a T2 Priest plus a 1-drop, or Beledros a turn early; the copy comes out of Imotekh, which gets Charcoal Diamond back. |')
rep("| [[Snakeskin Veil]] (owned ×2, both sleeved: Bumi and Cabbage; operator proposal 2026-10-08; lab 0.00) | [[Tyvar's Stand]] |",
    "| [[Snakeskin Veil]] (owned ×2, both sleeved: Bumi and Cabbage; operator proposal 2026-10-08; lab 0.00) | [[Dark Ritual]] |")
rep("Tyvar's Stand adds indestructible, which is what saves Beledros from the wrath (§9); the score is flat, so Stand stays.",
    "The score was flat against Tyvar's Stand; with Stand and Guardian Augmenter in the box since 2026-10-08, Veil is the cheapest hexproof the collection offers when a table shows spot removal — but it needs a trade with Bumi or Cabbage.")
rep("| Wrath-heavy control | Golgari Charm | Tyvar's Stand or Feral Appetite |", "| Wrath-heavy control | Golgari Charm, Tyvar's Stand | Dark Ritual, Insidious Roots |")
rep("| Token / dork swarm | Golgari Charm | Tyvar's Stand |", "| Token / dork swarm | Golgari Charm | Dark Ritual |")
rep("[[Blech, Loafing Pest]], [[Simulacrum Shaper]] and two basics (for Blighted Woodland and Jungle Hollow) are in the list (model −5.08 together at 300 games for the first four; Village Rites −0.03, Blech −0.00, Shaper −0.03, the basics −0.00 / −0.01: wipe and removal windows plus free casting, all blind spots)",
    "[[Blech, Loafing Pest]], two basics (for Blighted Woodland and Jungle Hollow), [[Horizon of Progress]], [[Flare of Cultivation]], [[Insidious Roots]], [[Dark Ritual]] and [[Argentum Masticore]] are in the list (model at 300 games: −5.08 together for the first four; Village Rites −0.03, Blech −0.00, the basics −0.00 / −0.01, Horizon +0.08, Flare 0.00, Roots −1.90, Dark Ritual −3.20, Argentum −8.70 — the last three are the protection window (Tyvar's Stand and Guardian Augmenter out leaves 3 pieces against a window of 5) and the Masticore's upkeep discard in the goldfish; wipe and removal windows, free casting and Pest mana are the model's blind spots)")
rep("## 10. Maybeboard (31 cards, kept in the box) and between-game swaps", "## 10. Maybeboard (33 cards, kept in the box) and between-game swaps")
G.write_text(s, encoding="utf-8")
print("guide: batch 3 applied (Horizon, Flare, Roots, Dark Ritual, Argentum); 5 predecessors on the maybeboard; engine row 13 = Insidious Roots")
