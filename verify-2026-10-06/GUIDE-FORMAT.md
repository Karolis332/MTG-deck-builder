# Pilot-guide format (rendered by `verify-2026-10-02/tam-precons/check-page.ts`)

The check page turns a guide into HTML with a tiny markdown subset. Anything else shows as raw text.

| Syntax | Renders as |
|---|---|
| `#`, `##`, `###` at line start | headings |
| `- ` at line start | bullet (no nesting, no numbered lists) |
| `| a | b |` rows, second row `|---|---|` | table |
| `**bold**`, `` `code` `` | bold, code |
| `[[Exact Card Name]]` | card-image chip (34 px thumbnail + name, hover zooms). The name must equal DB `cards.name`; for double-faced cards the front-face name works |
| a line starting `=> ` with steps split by ` → ` | flow diagram: boxes joined by gold arrows. A step holding a `[[Card]]` shows the full card image (110 px wide) |

Rules for a good visual guide:
- Every win line, the engine and each important copy chain gets a `=> ` flow. Keep it to 3–6 steps, ≤ 12 words per step, at most one `[[Card]]` per step, and finish with the outcome (e.g. `**20 damage to each opponent**`).
- Put a `[[Card]]` chip on the first mention of a card in each section and in the table cells that name cards. Don't chip every repeat.
- Keep a blank line between blocks. No HTML, no links, no images in other syntax.
- Quote oracle text in "double quotes" exactly as the DB has it.
- Check every chip name with `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name from cards where name = '…' or name like '… // %'"`. A wrong name renders without an image.
