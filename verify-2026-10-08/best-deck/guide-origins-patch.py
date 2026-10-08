"""Beledros guide: Witch's Clinic (phantom precon registration, removed) -> Vesuva; Radiant Fountain -> Thespian's Stage
(operator pick inside a lab tie); §3 sourcing table split by physical box; Clinic references removed."""
import pathlib

G = pathlib.Path(".claude/skills/deck-building/reference/decks/beledros-witherbloom.md")
s = G.read_text(encoding="utf-8")


def rep(old: str, new: str) -> None:
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)


rep("- ❌ [[Lightning Greaves]] shroud stops [[Witch's Clinic]] (\"{2}, {T}: Target commander you control gains lifelink\") from targeting Beledros. [[Guardian Augmenter]] hexproof does not.\n",
    "- ⚠️ [[Lightning Greaves]] gives Beledros shroud: your own [[Tyvar's Stand]], [[Feral Appetite]] and [[Vesuva]]/[[Thespian's Stage]] copies cannot target him either; [[Guardian Augmenter]] hexproof lets your spells through.\n")
rep("2. Equipping Greaves to Beledros and then trying to give him lifelink with Witch's Clinic.\n",
    "2. Activating [[Thespian's Stage]] on your own [[Golgari Rot Farm]] with the bounce trigger still on the stack (it returns a land) — copy a dual or an opponent's utility land instead.\n")
rep("| [[Bojuka Bog]], [[High Market]], [[Radiant Fountain]], [[Temple of the False God]], Swamp, [[Toxic Deluge]], [[Beast Within]] | 5 lands, two make no colour, only reactive spells |",
    "| [[Bojuka Bog]], [[High Market]], [[Thespian's Stage]], [[Temple of the False God]], Swamp, [[Toxic Deluge]], [[Beast Within]] | 5 lands, three make no colour, only reactive spells |")
rep("| Loose collection | 38, incl. Beledros, Dina, Vito, Sanguine Bond, Cultivate, Three Visits, Tyvar's Stand | — |",
    "| Omo precon box (Tricky Terrain, dismantled 2026-10-07) | [[Yavimaya, Cradle of Growth]], [[Beast Within]], [[Scute Swarm]], [[Vesuva]], [[Thespian's Stage]] | — (the box stays open) |\n"
    "| Witherbloom Witchcraft precon box (Beledros's own precon) | Beledros, [[Golgari Rot Farm]], [[Blighted Woodland]], [[Deadly Tempest]], [[Alhammarret's Archive]], [[Blight Mound]], [[Sanguine Bond]] | — |\n"
    "| Quandrix precon leftovers (Tam build) | [[Temple of the False God]], [[Terramorphic Expanse]], [[Three Visits]], [[Tyvar's Stand]], [[Guardian Augmenter]] | — |\n"
    "| Loose collection (set printed on the check page) | 24, incl. Dina, Vito, Cultivate, Mortality Spear, Witch of the Moors, Veinwitch Coven, Casualties of War | — |")
rep("Substitutes already made so the top decks stay whole:",
    "Lands 2026-10-08: [[Witch's Clinic]] was a precon-list registration the operator does not have (removed from the collection, like Well of Lost Dreams on 09-26); [[Vesuva]] takes its slot and [[Thespian's Stage]] replaces [[Radiant Fountain]] — the lab scored every owned land within 0.05 in both slots (a tie under the 0.25 bar), so the operator's pick stands. Both copy a dual for colour or an opponent's Coffers/Cradle/Urborg for value.\n\nSubstitutes already made so the top decks stay whole:")
G.write_text(s, encoding="utf-8")
print("guide: Clinic out, Vesuva/Stage in, §3 split by box")
