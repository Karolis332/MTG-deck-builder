"""Beledros guide: Starscape Cleric <- Midnight Reaper (operator owns it, registered 2026-10-08; lab +8.5 in every slot tested
at 300 games: Morbid Opportunist, Viscera Seer, Omnipresence, Argentum Masticore, Midnight Reaper — the slot is judgment)."""
import pathlib
import re

G = pathlib.Path(".claude/skills/deck-building/reference/decks/beledros-witherbloom.md")
s = G.read_text(encoding="utf-8")


def rep(old: str, new: str) -> None:
    global s
    assert s.count(old) == 1, f"{s.count(old)}x {old[:70]}"
    s = s.replace(old, new)


def row_text(prefix: str) -> str:
    m = re.search("^" + re.escape(prefix) + r"[^\n]*$", s, re.M)
    assert m, prefix[:70]
    return m.group(0)


rep('- ⚠️ [[Morbid Opportunist]] "triggers only once each turn"; [[Midnight Reaper]] is "nontoken". Token deaths draw through Moldervine, Liliana and Village Rites only.',
    '- ⚠️ [[Morbid Opportunist]] "triggers only once each turn". Token deaths draw through Moldervine, Liliana and Village Rites only (Midnight Reaper, "nontoken", went back to the box on 2026-10-08).')
rep("Veil of Summer, Midnight Reaper | — |", "Veil of Summer (Midnight Reaper back to the box 2026-10-08) | — |")
rep("and draw ([[Moldervine Reclamation]], [[Midnight Reaper]], [[Phyrexian Arena]]).", "and draw ([[Moldervine Reclamation]], [[Phyrexian Arena]], [[Morbid Opportunist]]).")
rep("| Draw on death | 8 | [[Moldervine Reclamation]], [[Midnight Reaper]], ", "| Draw on death | 7 | [[Moldervine Reclamation]], ")
s = s.replace("8 draw", "7 draw")
m = re.search(r"^\| (Drain[^|]*?) \| (\d+) \| ", s, re.M)
assert m, "drains row"
s = s[: m.start()] + f"| {m.group(1)} | {int(m.group(2)) + 1} | [[Starscape Cleric]], " + s[m.end():]
s = re.sub(r"\b(\d+) drains\b", lambda mm: f"{int(mm.group(1)) + 1} drains", s, count=1)
r13 = row_text("| 13 | [[Insidious Roots]] |")
s = s.replace(r13, r13 + "\n| 14 | [[Starscape Cleric]] | \"Offspring {2}{B} (You may pay an additional {2}{B} as you cast this spell. If you do, when this creature enters, create a 1/1 token copy of it.) / Flying / This creature can't block. / Whenever you gain life, each opponent loses 1 life.\" | A second Vito that hits the whole table: every life-gain event (each Pest death, Merchant, Dina, Blech's triggers) drains each opponent 1; with offspring two copies for five mana, and the token copy drains too. A Bat, so Blech grows it. It cannot block — never count it as a chump. Lab 2026-10-08: +8.5 in every slot tested (the win component sees the drain). |")
rv = row_text("| [[Veinwitch Coven]] (Witherbloom precon, scanned; model +0.00 back) |")
s = s.replace(rv, rv + '\n| [[Midnight Reaper]] (Meren; model −8.5 back: the win component) | [[Starscape Cleric]] | Nontoken-heavy builds only: "Whenever a nontoken creature you control dies, Midnight Reaper deals 1 damage to you and you draw a card" — misses every Pest. Out on 2026-10-08 for Starscape Cleric (lab: +8.5 in every slot; the slot was judgment, every tested slot tied within 0.05). |')
rep("wipe and removal windows, free casting and Pest mana are the model's blind spots)",
    "wipe and removal windows, free casting and Pest mana are the model's blind spots). Lab-approved the same day: [[Starscape Cleric]] for Midnight Reaper (+8.5 in every slot tested)")
rep("## 10. Maybeboard (33 cards, kept in the box) and between-game swaps", "## 10. Maybeboard (34 cards, kept in the box) and between-game swaps")
G.write_text(s, encoding="utf-8")
print("guide: Starscape Cleric in (engine row 14, drains +1), Midnight Reaper to the maybeboard")
