"""Free R/G/colourless paper pool for the Gilanra + Alena deck, 2026-10-07 -> pool.md, plus deck-oracle.md (the current list with DB text).
Free = owned in collection.txt minus copies in decks/paper/decks/*.txt and the unsleeved Urza draft (final-3)."""
import json, os, re, sqlite3, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))


def parse(p):
    out = collections.Counter()
    for line in p.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', line.strip())
        if m:
            out[m.group(2).strip()] += int(m.group(1))
    return out


def text(name):
    return db.execute(
        "select name, mana_cost, cmc, type_line, oracle_text, color_identity, legalities, power, toughness from cards where name = ? or name like ? "
        "order by (layout not in ('art_series','token')) desc limit 1", (name, name + ' // %')).fetchone()


def block(r, tag=''):
    pt = f' {r[7]}/{r[8]}' if r[7] is not None else ''
    return f"### {r[0]}{tag} | {r[1] or ''} (MV {int(r[2] or 0)}) | {r[3]}{pt}\n{r[4] or ''}\n"


owned = parse(ROOT / 'decks/paper/collection.txt')
used = collections.Counter()
for f in list((ROOT / 'decks/paper/decks').glob('*.txt')) + [ROOT / 'verify-2026-10-06/urza-found/final-3.txt']:
    used.update(parse(f))
deck = parse(ROOT / 'decks/paper/decks/gilanra-alena-partners.txt')

rows = []
for name, n in sorted(owned.items()):
    if n - used[name] <= 0:
        continue
    r = text(name)
    if not r or 'Basic Land' in (r[3] or ''):
        continue
    if not set(json.loads(r[5] or '[]')) <= {'R', 'G'} or json.loads(r[6] or '{}').get('commander') != 'legal':
        continue
    rows.append((r[3].split('—')[0], -(r[2] or 0), name, block(r)))
rows.sort()
(HERE / 'pool.md').write_text(f"# Free R/G/colourless paper pool for Gilanra + Alena ({len(rows)} cards, grouped by type, high MV first)\n\n" + '\n'.join(r[3] for r in rows), encoding='utf-8')
cur = [block(text(n), f' x{q}' if q > 1 else '') for n, q in deck.items()]
(HERE / 'deck-oracle.md').write_text(f"# Current Gilanra + Alena list with DB text ({sum(deck.values())} cards)\n\n" + '\n'.join(cur), encoding='utf-8')
print(f'{len(rows)} free cards -> pool.md; {len(cur)} deck lines -> deck-oracle.md')
