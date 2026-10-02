"""Sisay GW pool: every owned Arena card (DB arena collection + operator-list.txt) with colour identity in GW,
legal in Brawl, basics excluded, sorted by EDHREC rank (unranked last). Writes pool.md (one file) + pool-NN.md chunks."""
import glob, json, os, re, sqlite3
HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
BASICS = {'Plains', 'Forest', 'Wastes', 'Snow-Covered Plains', 'Snow-Covered Forest', 'Snow-Covered Wastes'}
COLS = "name, mana_cost, cmc, type_line, oracle_text, edhrec_rank, game_changer, json_extract(legalities,'$.brawl'), color_identity"
NOT_TOKEN = "layout not in ('art_series','token','double_faced_token','emblem')"
CHUNK = 300
listed = []
for line in open(os.path.join(HERE, 'operator-list.txt'), encoding='utf-8'):
    m = re.match(r'^\d+\s+(.+?)\s+\([A-Z0-9]+\)\s+\S+$', line.strip())
    if m: listed.append(m.group(1))
rows = {}
def keep(r, tag):
    if r[7] != 'legal' or r[0] in BASICS or set(json.loads(r[8] or '[]')) - {'G', 'W'}: return
    prev = rows.get(r[0])
    if prev is None or (r[5] or 10**9) < (prev[0][5] or 10**9): rows[r[0]] = (r, tag if prev is None else prev[1] | tag)
    else: rows[r[0]] = (prev[0], prev[1] | tag)
for r in c.execute(f"select {COLS} from collection col join cards on cards.id=col.card_id where col.user_id=1 "
                   f"and col.source='arena' and col.quantity>0 and {NOT_TOKEN}"):
    keep(r, {'coll'})
for n in listed:
    r = c.execute(f"select {COLS} from cards where (name=? or name like ? || ' // %') and {NOT_TOKEN} "
                  "order by (edhrec_rank is null), edhrec_rank limit 1", (n, n)).fetchone()
    if r: keep(r, {'list'})
pool = sorted((v for v in rows.values()), key=lambda v: (v[0][5] is None, v[0][5] or 0, v[0][0]))
def fmt(v):
    (name, cost, cmc, tl, text, rank, gc, _, _), tag = v
    t = (text or '').replace('\n', ' | ')
    src = 'LIST' if 'list' in tag else 'coll'
    return f'- **{name}** {cost or ""} (MV {cmc:g}) — {tl} — #{rank or "unranked"}{" GC" if gc else ""} [{src}]\n  {t}'
for old in glob.glob(os.path.join(HERE, 'pool-*.md')): os.remove(old)
for i in range(0, len(pool), CHUNK):
    part = pool[i:i + CHUNK]
    with open(os.path.join(HERE, f'pool-{i // CHUNK + 1:02d}.md'), 'w', encoding='utf-8') as f:
        f.write(f'# Captain Sisay GW pool — chunk {i // CHUNK + 1} (cards {i + 1}–{i + len(part)} of {len(pool)}, by EDHREC rank). '
                '[LIST] = in the operator\'s pasted list, [coll] = Arena collection only\n\n')
        f.write('\n'.join(fmt(v) for v in part) + '\n')
print('pool', len(pool), 'chunks', -(-len(pool) // CHUNK), 'list-tagged', sum('list' in v[1] for v in pool))
