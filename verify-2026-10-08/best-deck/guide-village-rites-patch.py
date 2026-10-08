"""Beledros guide: Village Rites <- Plumb the Forbidden (operator 2026-10-08; model -0.03 at 300 games, a tie)."""
import pathlib

G = pathlib.Path(".claude/skills/deck-building/reference/decks/beledros-witherbloom.md")
s = G.read_text(encoding="utf-8")


def rep(old: str, new: str) -> None:
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)


rep("Token deaths draw through Moldervine, Liliana and Plumb only.",
    "Token deaths draw through Moldervine, Liliana and Village Rites only.")
rep("[[Vito, Thorn of the Dusk Rose]], [[Plumb the Forbidden]] | 1 land; Bond and Omnipresence do nothing without a board |",
    "[[Vito, Thorn of the Dusk Rose]], [[Village Rites]] | 1 land; Bond and Omnipresence do nothing without a board |")
rep("[[Braids, Arisen Nightmare]], [[Deadly Dispute]], [[Plumb the Forbidden]], [[Grim Backwoods]] |",
    "[[Braids, Arisen Nightmare]], [[Deadly Dispute]], [[Village Rites]], [[Grim Backwoods]] |")
rep("[[Priest of Forgotten Gods]], [[Braids, Arisen Nightmare]], [[Plumb the Forbidden]], [[Deadly Disp",
    "[[Priest of Forgotten Gods]], [[Braids, Arisen Nightmare]], [[Village Rites]], [[Deadly Disp")
rep("| [[Village Rites]] | [[Feral Appetite]] | Counterspell / removal tables: sacrifice the targeted creature in response, draw two. |\n",
    "| [[Plumb the Forbidden]] (model +0.03 back) | [[Village Rites]] | Wide Pest boards with a drain out: sacrifice three Pests, draw three, drain three at instant speed; castable with no creature as a plain cantrip. Village Rites ({B}, one creature, two cards; the sacrifice is mandatory) is the operator's pick 2026-10-08. |\n")
rep("| [[Dina, Essence Brewer]] (registered; lab +0.00) | [[Plumb the Forbidden]] |",
    "| [[Dina, Essence Brewer]] (registered; lab +0.00) | [[Village Rites]] |")
rep("| Wrath-heavy control | Golgari Charm, Village Rites | Tyvar's Stand, Feral Appetite |",
    "| Wrath-heavy control | Golgari Charm | Tyvar's Stand or Feral Appetite |")
rep("[[Yahenni, Undying Partisan]] and [[Omnipresence]] are in the list (model −5.08 together at 300 games: wipe and removal windows plus free casting, all blind spots);",
    "[[Yahenni, Undying Partisan]], [[Omnipresence]] and [[Village Rites]] are in the list (model −5.08 together at 300 games for the first four, Village Rites −0.03: wipe and removal windows plus free casting, all blind spots);")
G.write_text(s, encoding="utf-8")
print("guide: Village Rites in, Plumb to the maybeboard (8 places)")
