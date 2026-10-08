"""check-page.ts: (1) Arena decks copy in the About/Name/Commander/Deck import format; (2) readable guides:
bigger prose + chips, 'Turn' tables -> timeline diagram, 'Piece' tables -> engine card grid, bold-only paragraphs -> line headings,
bigger flow nodes and arrows. Idempotent: every anchor is asserted unique before replacing."""
import pathlib, sys

P = pathlib.Path("verify-2026-10-02/tam-precons/check-page.ts")
s = P.read_text(encoding="utf-8")
if "arena?: string" in s:
    sys.exit("already patched")


def rep(old: str, new: str) -> None:
    global s
    n = s.count(old)
    if n != 1:
        sys.exit(f"anchor found {n}x: {old[:70]!r}")
    s = s.replace(old, new)


# 1. DeckSpec.arena + the three Arena specs
rep("type DeckSpec = { slug: string; base?: () => string; now?: string; guide?: string; extra?: { label: string; names: string[] } };",
    "type DeckSpec = { slug: string; base?: () => string; now?: string; guide?: string; arena?: string; extra?: { label: string; names: string[] } }; // arena = Arena deck name -> copy block emits the About/Name/Commander/Deck import format")
for slug, arena in [("jet-freedom-fighter-arena", "Jet Boros v1"), ("neriv-heart-of-the-storm-arena", "Neriv Mardu v1"), ("krenko-mob-boss-arena", "Krenko Goblins v1")]:
    rep(f"    slug: '{slug}',", f"    slug: '{slug}', arena: '{arena}',")

# 2. copy block
rep("  const listText = now.map((c) => `${c.qty} ${c.name}`).join('\\n');",
    "  const front = (n: string) => n.split(' // ')[0]; // Arena import takes front faces only\n"
    "  const listText = d.arena\n"
    "    ? `About\\nName ${d.arena}\\n\\nCommander\\n${now[0].qty} ${front(now[0].name)}\\n\\nDeck\\n${now.slice(1).map((c) => `${c.qty} ${front(c.name)}`).join('\\n')}`\n"
    "    : now.map((c) => `${c.qty} ${c.name}`).join('\\n');\n"
    "  const copySummary = d.arena ? `Copy for Arena import (${total} cards · About / Name / Commander / Deck)` : `Copy decklist (${total} cards, commander first)`;")
rep('<summary>Copy decklist (${total} cards, commander first)</summary>', '<summary>${copySummary}</summary>')

# 3. tables buffered -> timeline / piece grid / plain table
rep("const md = (src: string) => {",
    "// 'Turn' tables become a timeline diagram, 'Piece' tables an engine card grid; anything else stays a table\n"
    "const renderTable = (rows: string[][]) => {\n"
    "  const [head, ...body] = rows;\n"
    "  if (head[0] === 'Turn')\n"
    "    return `<div class=\"timeline\">${body.map((r) => `<div class=\"tnode\"><div class=\"tnum\">T${esc(r[0])}</div><small>${esc(head[1] ?? '')}</small><div class=\"tdo\">${inline(r[1] ?? '')}</div>${r[2] ? `<small>${esc(head[2] ?? '')}</small><div class=\"twhy\">${inline(r[2])}</div>` : ''}</div>`).join('<div class=\"arr\">→</div>')}</div>`;\n"
    "  if (head[0] === 'Piece')\n"
    "    return `<div class=\"pieces\">${body.map((r) => `<div class=\"piece\"><div class=\"pname\">${inline(r[0])}</div><div class=\"pwhat\">${inline(r[1] ?? '')}</div>${r[2] ? `<div class=\"poracle\">${inline(r[2])}</div>` : ''}</div>`).join('')}</div>`;\n"
    "  return `<table><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table>`;\n"
    "};\n"
    "const md = (src: string) => {")
rep("  let list = false, table = false;\n  const close = () => { if (list) out.push('</ul>'); if (table) out.push('</table>'); list = table = false; };",
    "  let list = false;\n  let tbl: string[][] | null = null;\n  const close = () => { if (list) out.push('</ul>'); if (tbl) out.push(renderTable(tbl)); list = false; tbl = null; };")
rep("    if (cells) {\n      if (!table) { close(); table = true; out.push(`<table><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`); }\n      else out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);\n    }",
    "    if (cells) {\n      if (!tbl) { close(); tbl = []; }\n      tbl.push(cells);\n    }")
# bold-only paragraph ("**Line A — …**") = a line heading
rep("      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);",
    "      else if (/^\\*\\*[^*]+\\*\\*$/.test(line.trim())) out.push(`<h4 class=\"line\">${inline(line.trim().slice(2, -2))}</h4>`);\n"
    "      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);")

# 4. CSS (appended after the existing .guide rules so it wins ties)
css = (
    ".guide{font-size:17px;line-height:1.55}.guide p{margin:8px 0}.guide p .chip .ci,.guide li .chip .ci,.guide td .chip .ci,.guide .tnode .chip .ci,.guide .pwhat .chip .ci{height:58px}.guide .chip b{font-size:15px}"
    ".guide table{font-size:15px}.guide th,.guide td{padding:8px 10px}.guide h3{font-size:22px}.guide h4.line{font-size:20px;color:var(--sun);margin:20px 0 4px;text-shadow:0 0 8px rgba(255,200,80,.5)}\n"
    ".guide .flow{gap:12px;padding:14px}.guide .flow .step{max-width:320px;font-size:16px;padding:10px 12px;line-height:1.35}.guide .flow .chip .ci{width:150px}.guide .flow .chip b{font-size:15px}.guide .arr{font-size:42px}\n"
    ".timeline{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin:10px 0}.tnode{flex:1 1 230px;max-width:360px;background:var(--panel);border:1px solid var(--line2);border-radius:8px;padding:10px 12px;font-size:15px}"
    ".tnum{font-size:28px;font-weight:700;color:var(--cyan);text-shadow:0 0 10px var(--cyan)}.tnode small{display:block;color:var(--mag);letter-spacing:.1em;text-transform:uppercase;font-size:11px;margin-top:6px}.twhy{opacity:.85}.timeline .arr{align-self:center}\n"
    ".pieces{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:10px;margin:10px 0}.piece{background:var(--panel);border:1px solid var(--line2);border-radius:8px;padding:10px 12px;font-size:15px}"
    ".pname{margin-bottom:6px}.pname .chip .ci{height:84px}.pwhat{color:#fff}.poracle{margin-top:6px;font-size:13px;opacity:.75;font-style:italic}\n"
)
rep("#zoom{position:fixed;", css + "#zoom{position:fixed;")

P.write_text(s, encoding="utf-8")
print("check-page.ts patched: arena copy format, timeline, pieces, line headings, bigger guide type")
