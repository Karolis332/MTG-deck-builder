"""EDHREC pass 2026-10-08: fix the lab numbers in the analysis, add the maybeboard rows + buy list to the Beledros guide,
append LEARNINGS and the Session Log line."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
BD = pathlib.Path(__file__).resolve().parent


def rep(path: pathlib.Path, old: str, new: str) -> None:
    s = path.read_text(encoding="utf-8")
    assert s.count(old) == 1, (path.name, old[:60])
    path.write_text(s.replace(old, new), encoding="utf-8")


A = BD / "beledros-edhrec-analysis.md"
rep(A, "window overflow only. | −2.00 |", "window overflow only. | −0.02 (for Liliana, Dreadhorde General) |")
rep(A, "Ramp window is full → penalty. | −1.84 |", "For a ramp slot (Priest of Forgotten Gods) the model is flat. | +0.11 |")
rep(A, "Same window problem. | −1.83 |", "Same slot. | +0.13 (the best number of the pass, below 0.25) |")
rep(A, "| ramp | Window full. | −1.8 to −2.0 |", "| ramp | Ramp-for-ramp swaps are flat; into any other role −2 (window). | −0.02 to +0.10 |")
rep(A, "No owned, free EDHREC card clears +0.25 in any slot.",
    "No owned, free EDHREC card clears +0.25 in any of the 62 nonland slots (best: Skyshroud Claim +0.13, Harrow +0.11, Rampant Growth +0.10, all for Priest of Forgotten Gods; Vilis −0.02 for Liliana).")

G = ROOT / ".claude/skills/deck-building/reference/decks/beledros-witherbloom.md"
rep(G, "## 8. Maybeboard (22 cards, kept in the box) and between-game swaps", "## 8. Maybeboard (26 cards, kept in the box) and between-game swaps")
rep(G, "Alpha tables. |\n",
    "Alpha tables. |\n"
    "| [[Harrow]] (registered 2026-10-08; lab +0.11 for Priest, below 0.25) | [[Priest of Forgotten Gods]] | \"Sacrifice a land. Search your library for up to two basic land cards, put them onto the battlefield\" — both untapped, instant speed: the deck's best tempo ramp. Fast tables. |\n"
    "| [[Dina, Essence Brewer]] (registered; lab +0.00) | [[Plumb the Forbidden]] | \"Whenever you sacrifice a creature, draw a card. This ability triggers only once each turn\" + \"{2}, {T}, Sacrifice another creature: You gain X life and put X +1/+1 counters\" — a sac outlet that draws once a turn and gains. |\n"
    "| [[Font of Agonies]] (loose; lab +0.00, model-blind; EDHREC 47x lift) | [[Pest Infestation]] | \"Whenever you pay life, put that many blood counters on this enchantment. {1}{B}, Remove four blood counters: Destroy target creature\" — one Beledros activation = two removals for {B}. Removal-light tables. |\n"
    "| [[Arnyn, Deathbloom Botanist]] (loose; lab +0.04) | [[Viscera Seer]] | \"Whenever a creature you control with power or toughness 1 or less dies, target opponent loses 2 life and you gain 2 life\" — a double Blood Artist for Pests. Drain-race tables. |\n")
G.write_text(G.read_text(encoding="utf-8").rstrip("\n") + """

## 9. Buy list from the EDHREC pass (2026-10-08)

Full oracle analysis: `verify-2026-10-08/best-deck/beledros-edhrec-analysis.md`. Prices Cardmarket, EDHREC lifegain page (33 decks).

| Card | € | Why |
|---|---|---|
| [[Skullclamp]] | 4,30 | "Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards. Equip {1}" — a 1/1 Pest dies on equip: draw 2, gain 1, every death trigger, for {1}. |
| [[Exquisite Blood]] | 27,75 | "Whenever an opponent loses life, you gain that much life" — infinite with [[Sanguine Bond]] or [[Vito, Thorn of the Dusk Rose]] (both in the 99). [[Bloodthirsty Conqueror]] (25,01) is the same loop on a body. |
| [[Ayara, First of Locthwain]] | 3,62 | "Whenever Ayara or another black creature you control enters, each opponent loses 1 life and you gain 1 life. {T}, Sacrifice another black creature: Draw a card" — Pests are black. |
| [[Marauding Blight-Priest]] | 0,11 | "Whenever you gain life, each opponent loses 1 life" — a second Dina, Soul Steeper. |
| [[Bastion of Remembrance]] | — | "Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life" — Zulaport as an enchantment. |
| [[Prosperous Innkeeper]] | 0,23 | "Whenever another creature you control enters, you gain 1 life" + a Treasure — every Pest entering drains. |
| [[Savra, Queen of the Golgari]] | 1,53 | Pests are black and green: each sacrifice is an edict ("pay 2 life… each other player sacrifices a creature") and "gain 2 life". |
""", encoding="utf-8")

L = ROOT / ".claude/skills/deck-building/LEARNINGS.md"
L.write_text(L.read_text(encoding="utf-8").rstrip("\n") + "\n- 2026-10-08 — Beledros — EDHREC pass: the community's high-lift cards (Vilis, Font of Agonies, Stinging Study, Healing Technique) are exactly the model's blind spots (life payment, life-loss draw, recursion); the lab's all-slot test tops out at +0.13 (below 0.25) so the list stays, and the analysis goes to the guide's maybeboard + buy list → when EDHREC and the score disagree, say which mechanic the model lacks and keep the score's list. Also: `paper-sync` re-sorts and de-duplicates `collection.txt` — append cards, run the sync, then check the lines by name; never `sed '$ d'` after a sync (it deleted Zulaport's line; the next sync restored it).\n", encoding="utf-8")

C = ROOT / "CLAUDE.md"
C.write_text(C.read_text(encoding="utf-8").rstrip("\n") + "\n- **Then (Beledros EDHREC pass):** operator pointed at EDHREC (optimized 188 decks + lifegain theme 33 decks; `verify-2026-10-08/best-deck/beledros-edhrec-{optimized,lifegain}.txt`, scraped via Playwright) → `edhrec-diff.py` (201 of 253 cards not in the 99, 63 owned) → `edhrec-lab.py --all-slots` (45 owned free candidates × 62 nonland slots, 146 s: best Skyshroud Claim +0.13, Harrow +0.11, Vilis −0.02; nothing clears 0.25 → list unchanged per the score-decides rule) → `beledros-edhrec-analysis.md` (oracle analysis: buy tier ranked — Skullclamp, Exquisite Blood (infinite with Sanguine Bond or Vito, both in the 99), Ayara, Blight-Priest, Bastion, Innkeeper, Savra; owned tier with lab numbers; cards sleeved elsewhere) → guide §8 +4 rows (Harrow, Dina Essence Brewer, Font of Agonies, Arnyn) + §9 buy list. Registered Harrow (`collection.txt`, 2,038 owned; DB backup `…bak-2026-10-08-harrow-dina`); Dina, Essence Brewer was already registered. Open: Beledros registry switch still waits for the sleeve confirmation; buys are the operator's call.\n", encoding="utf-8")
print("analysis, guide, LEARNINGS, CLAUDE.md updated")
