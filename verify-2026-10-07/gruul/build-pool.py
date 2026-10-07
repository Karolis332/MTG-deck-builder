"""Merged Gruul pool, 2026-10-07 -> pool.md: every card in the paper Gilanra + Alena deck [GIL] and the paper Bumi deck [BUMI],
plus every free R/G/colourless owned card [FREE] (incl. the dismantled Omo precon). Free = owned minus copies in other decks
(Tam, Tazri, Meren, Imotekh, Cabbage, Inspirit, Ramos) and the unsleeved Urza draft. Commander-illegal identity is kept but tagged."""
import json, os, re, sqlite3, collections, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
def parse(p):
    out = collections.Counter()
    for line in p.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', line.strip())
        if m: out[m.group(2).strip()] += int(m.group(1))
    return out
D = ROOT / 'decks/paper/decks'
gil, bumi = parse(D / 'gilanra-alena-partners.txt'), parse(D / 'bumi-unleashed.txt')
owned = parse(ROOT / 'decks/paper/collection.txt')
other = collections.Counter()
for f in list(D.glob('*.txt')) + [ROOT / 'verify-2026-10-06/urza-found/final-3.txt']:
    if f.stem not in ('gilanra-alena-partners', 'bumi-unleashed'): other.update(parse(f))
names = set(gil) | set(bumi) | {n for n, q in owned.items() if q - other[n] - gil[n] - bumi[n] > 0}
rows = []
for name in sorted(names):
    r = db.execute("select name, mana_cost, cmc, type_line, oracle_text, color_identity, legalities, power, toughness from cards where name = ? or name like ? "
                   "order by (layout not in ('art_series','token')) desc limit 1", (name, name + ' // %')).fetchone()
    if not r or 'Basic Land' in (r[3] or ''): continue
    ci = set(json.loads(r[5] or '[]'))
    if not ci <= {'R', 'G'} and name not in bumi and name not in gil: continue
    tags = ('[GIL]' if name in gil else '') + ('[BUMI]' if name in bumi else '') + ('' if name in gil or name in bumi else '[FREE]')
    if not ci <= {'R', 'G'}: tags += '[ILLEGAL: identity ' + ''.join(sorted(ci)) + ']'
    if json.loads(r[6] or '{}').get('commander') != 'legal': tags += '[NOT COMMANDER-LEGAL]'
    pt = f' {r[7]}/{r[8]}' if r[7] is not None else ''
    rows.append((r[3].split('—')[0].strip(), -(r[2] or 0), name, f"### {r[0]} {tags} | {r[1] or ''} (MV {int(r[2] or 0)}) | {r[3]}{pt}\n{r[4] or ''}\n"))
rows.sort()
(HERE / 'pool.md').write_text(f"# Merged Gruul pool ({len(rows)} cards; [GIL] in the Gilanra + Alena deck, [BUMI] in the Bumi deck, [FREE] in no deck), grouped by type, high MV first\n\n" + '\n'.join(r[3] for r in rows), encoding='utf-8')
c = collections.Counter('GIL' if '[GIL]' in r[3] else 'BUMI' if '[BUMI]' in r[3] else 'FREE' for r in rows)
print(len(rows), 'cards', dict(c))
