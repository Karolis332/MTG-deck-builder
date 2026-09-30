"""One-off: inputs for the Arena Tam build (2026-09-30).

Writes next to this file:
  deck.md          the operator's current Arena Tam list (current.txt) with oracle text, commander first
  pool-NN.md       EVERY owned Arena card legal in Brawl, not in current.txt, basics excluded, sorted by EDHREC rank
                   (unranked last), split into chunks of CHUNK cards. No relevance filter: Tam is 5-colour.
Run: PYTHONIOENCODING=utf-8 py verify-2026-09-30/arena-tam/build-arena-pool.py
"""
import glob, os, re, sqlite3

OUT = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
BASICS = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes', 'Snow-Covered Plains', 'Snow-Covered Island',
          'Snow-Covered Swamp', 'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Wastes'}
CHUNK = 450
COLS = ("name, mana_cost, cmc, type_line, oracle_text, edhrec_rank, game_changer, "
        "json_extract(legalities,'$.brawl')")
NOT_TOKEN = "layout not in ('art_series','token','double_faced_token','emblem')"

c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)


def row(r, qty=1):
    name, cost, cmc, tl, text, rank, gc, _ = r
    text = (text or '').replace('\n', ' | ')
    return (f'- {qty}x **{name}** {cost or ""} (MV {cmc:g}) — {tl} — EDHREC #{rank or "unranked"}'
            f'{" GAME-CHANGER" if gc else ""}\n  {text}')


def card(name):
    r = c.execute(f"select {COLS} from cards where (name = ? or name like ? || ' // %') and {NOT_TOKEN} "
                  "order by (edhrec_rank is null), edhrec_rank limit 1", (name, name)).fetchone()
    if not r:
        raise SystemExit(f'unresolved card: {name}')
    return r


deck = []
for line in open(os.path.join(OUT, 'current.txt'), encoding='utf-8'):
    m = re.match(r'^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\S+)?$', line.strip())
    if m:
        deck.append((int(m.group(1)), m.group(2)))
with open(os.path.join(OUT, 'deck.md'), 'w', encoding='utf-8') as f:
    f.write(f'# Tam, the Possibility — current Arena list ({sum(q for q, _ in deck)} cards, commander first)\n\n')
    f.write('\n'.join(row(card(n), q) for q, n in deck) + '\n')

in_deck = {card(n)[0] for _, n in deck}
owned = {}
for r in c.execute(f"select {COLS} from collection col join cards on cards.id = col.card_id "
                   f"where col.user_id = 1 and col.source = 'arena' and col.quantity > 0 and {NOT_TOKEN}"):
    if r[7] == 'legal' and r[0] not in BASICS and r[0] not in in_deck:
        prev = owned.get(r[0])
        if prev is None or (r[5] or 10**9) < (prev[5] or 10**9):
            owned[r[0]] = r
pool = sorted(owned.values(), key=lambda r: (r[5] is None, r[5] or 0, r[0]))
for old in glob.glob(os.path.join(OUT, 'pool-*.md')):
    os.remove(old)
for i in range(0, len(pool), CHUNK):
    part = pool[i:i + CHUNK]
    with open(os.path.join(OUT, f'pool-{i // CHUNK + 1:02d}.md'), 'w', encoding='utf-8') as f:
        f.write(f'# Owned Arena cards legal in Brawl, not in the current list — chunk {i // CHUNK + 1} '
                f'(cards {i + 1}–{i + len(part)} of {len(pool)}, by EDHREC rank)\n\n')
        f.write('\n'.join(row(r) for r in part) + '\n')
print('deck lines', len(deck), '| pool', len(pool), '| chunks', -(-len(pool) // CHUNK))
