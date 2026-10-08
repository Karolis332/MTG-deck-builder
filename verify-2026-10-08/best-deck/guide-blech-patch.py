"""Beledros guide, operator swaps 2026-10-08 (all lab ties at 300 games):
Blech, Loafing Pest <- Veinwitch Coven (-0.00), Simulacrum Shaper <- Three Visits (-0.03),
Forest <- Blighted Woodland (-0.00), Swamp <- Jungle Hollow (-0.01)."""
import pathlib
import re

G = pathlib.Path(".claude/skills/deck-building/reference/decks/beledros-witherbloom.md")
s = G.read_text(encoding="utf-8")


def rep(old: str, new: str, count: int = 1) -> None:
    global s
    assert s.count(old) == count, f"{s.count(old)}x {old[:70]}"
    s = s.replace(old, new)


def rep_row(prefix: str, new_row: str) -> None:
    """Replace the whole table row that starts with prefix."""
    global s
    m = re.search("^" + re.escape(prefix) + r"[^\n]*\n", s, re.M)
    assert m, prefix[:70]
    s = s[: m.start()] + new_row + "\n" + s[m.end():]


# --- Blech <- Veinwitch Coven
rep('| 6 | [[Veinwitch Coven]] | "Whenever you gain life, you may pay {B}. If you do, return target creature card from your graveyard to your hand." | Every life-gain event is a {B} rebuy. Hold {B} open for Merchant or Blood Artist. |',
    '| 6 | [[Blech, Loafing Pest]] | "Whenever you gain life, put a +1/+1 counter on each Pest, Bat, Insect, Snake, and Spider you control." | Blech is a Pest himself: every life-gain event (a Pest death, Merchant, Vito, Dina, Beledros\'s own Pest) grows the whole swarm, so the chump blockers of T4 attack on T6. ⚠️ A Pest with a +1/+1 counter loses Mikaeus undying (CR 702.93a): sacrifice the countered ones first. Operator\'s pick 2026-10-08 over Veinwitch Coven (model −0.00). |')
rep("[[Dina, Soul Steeper]], [[Veinwitch Coven]], [[Witherbloom Campus]],", "[[Dina, Soul Steeper]], [[Witherbloom Campus]],")
rep("| the rest, incl. Beledros himself", "| the rest, incl. Blech, Loafing Pest, Simulacrum Shaper, Beledros himself")
rep("| Rebuy | 5 | [[Eternal Witness]], [[Veinwitch Coven]], [[Witch of the Moors]], [[Cauldron of Essence]], [[Mikaeus, the Unhallowed]] |",
    "| Rebuy | 4 | [[Eternal Witness]], [[Witch of the Moors]], [[Cauldron of Essence]], [[Mikaeus, the Unhallowed]] |")
s = s.replace("5 rebuy", "4 rebuy")
rep("| [[Meren of Clan Nel Toth]] (loose once her deck is dismantled; model-neutral, rejected) | [[Veinwitch Coven]] |",
    "| [[Meren of Clan Nel Toth]] (loose once her deck is dismantled; model-neutral, rejected) | [[Blech, Loafing Pest]] |")
rep_row("| [[Blech, Loafing Pest]] (loose, registered 2026-10-08; model-neutral, rejected) | [[Pest Rescuer]] |",
        '| [[Veinwitch Coven]] (Witherbloom precon, scanned; model +0.00 back) | [[Blech, Loafing Pest]] | Grindy tables: "Whenever you gain life, you may pay {B}. If you do, return target creature card from your graveyard to your hand" — every drain rebuys Merchant for {B}. Out on 2026-10-08 for Blech (operator). |\n'
        '| [[Three Visits]] (Quandrix precon; model +0.03 back) | [[Simulacrum Shaper]] | Fast tables: an untapped dual on T2 ("search your library for a Forest card, put it onto the battlefield"). Out on 2026-10-08 for Simulacrum Shaper (operator): a body for the Altar that draws when it dies. |\n'
        '| [[Blighted Woodland]] (❓ unconfirmed; model +0.00 back) | Forest | Long games: "{3}{G}, {T}, Sacrifice: search for up to two basic land cards, put them onto the battlefield tapped". Out on 2026-10-08 for a Forest (operator). |\n'
        '| [[Jungle Hollow]] (Witherbloom precon, scanned; model +0.01 back) | Swamp | Never: a tapped dual for 1 life vs an untapped basic. Out on 2026-10-08 for a Swamp (operator). |')
# --- Simulacrum Shaper <- Three Visits
rep("[[Terramorphic Expanse]], [[Three Visits]], [[Tyvar's Stand]]", "[[Terramorphic Expanse]], [[Tyvar's Stand]]")
rep("| [[Cultivate]], [[Kodama's Reach]], [[Three Visits]] |", "| [[Cultivate]], [[Kodama's Reach]], [[Simulacrum Shaper]] |")
rep("Mull unless a fetch, Cultivate, Kodama's Reach or Three Visits is in hand", "Mull unless a fetch, Cultivate, Kodama's Reach or Simulacrum Shaper is in hand")
s, n = re.subn(r"^(\| Mana \| [^\n]*?)\[\[Three Visits\]\]", r"\1[[Simulacrum Shaper]]", s, count=1, flags=re.M)  # the Mana redundancy row only
assert n == 1, "Mana row"
m = re.search(r"^\| Draw on death \| (\d+) \| ", s, re.M)
assert m, "draw-on-death row"
s = s[: m.start()] + f"| Draw on death | {int(m.group(1)) + 1} | [[Simulacrum Shaper]], " + s[m.end():]
s = s.replace("8 draw", "9 draw")
# --- Forest <- Blighted Woodland, Swamp <- Jungle Hollow
rep("| [[Golgari Rot Farm]], [[Blighted Woodland]] (Alhammarret's Archive and Deadly Tempest left the list on 2026-10-08) | check the box before sleeving; the check page panel gives 3 scored backups each (either land → a basic, +0.04 / +0.00) |",
    "| [[Golgari Rot Farm]] (Blighted Woodland, Alhammarret's Archive and Deadly Tempest left the list on 2026-10-08) | check the box before sleeving; the check page panel gives 3 scored backups (a basic, +0.04) |")
rep("[[Mortality Spear]], [[Cultivate]], [[Jungle Hollow]], [[Temple of the False God]]", "[[Mortality Spear]], [[Cultivate]], [[Temple of the False God]]")
rep("Both copy a dual for colour or an opponent's Coffers/Cradle/Urborg for value.",
    "Both copy a dual for colour or an opponent's Coffers/Cradle/Urborg for value. Later the same day the operator replaced [[Blighted Woodland]] (unconfirmed) and [[Jungle Hollow]] with a fifth Forest and a fifth Swamp (lab −0.00 / −0.01: ties) — 36 lands, 5 + 5 basics.")
rep("[[Yahenni, Undying Partisan]], [[Omnipresence]] and [[Village Rites]] are in the list (model −5.08 together at 300 games for the first four, Village Rites −0.03:",
    "[[Yahenni, Undying Partisan]], [[Omnipresence]], [[Village Rites]], [[Blech, Loafing Pest]], [[Simulacrum Shaper]] and two basics (for Blighted Woodland and Jungle Hollow) are in the list (model −5.08 together at 300 games for the first four; Village Rites −0.03, Blech −0.00, Shaper −0.03, the basics −0.00 / −0.01:")
rep("## 10. Maybeboard (28 cards, kept in the box) and between-game swaps", "## 10. Maybeboard (31 cards, kept in the box) and between-game swaps")
G.write_text(s, encoding="utf-8")
print("guide: Blech, Shaper, Forest, Swamp applied; Veinwitch, Three Visits, Blighted Woodland, Jungle Hollow on the maybeboard")
