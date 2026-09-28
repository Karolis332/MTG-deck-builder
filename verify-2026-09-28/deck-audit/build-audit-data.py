"""One-off: per-deck audit inputs for the 2026-09-28 paper deck review.

Writes, per deck in decks/paper/decks/ (commander + >= 60 cards):
  <slug>-deck.md   the deck with oracle text, type, cost, MV, EDHREC rank, price, game-changer flag
  <slug>-pool.md   EVERY open card (owned, in no deck) whose colour identity fits the commander,
                   same fields, sorted by EDHREC rank (unranked last). No relevance filter.
Run: PYTHONIOENCODING=utf-8 py verify-2026-09-28/deck-audit/build-audit-data.py
"""
import glob, json, os, re, sqlite3

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAPER = os.path.join(ROOT, 'decks', 'paper')
OUT = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
BASICS = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'}

c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
Q = ("select name, mana_cost, cmc, type_line, oracle_text, color_identity, edhrec_rank, price_usd, game_changer, "
     "json_extract(legalities,'$.commander') from cards where (name = ? or name like ? || ' // %') "
     "and layout not in ('art_series','token','double_faced_token','emblem') "
     "order by (edhrec_rank is null), edhrec_rank limit 1")


def read(path):
    out = []
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        m = re.match(r'^(\d+)\s+(.+)$', line)
        out.append((int(m.group(1)), m.group(2)) if m else (1, line))
    return out


def card(name):
    r = c.execute(Q, (name, name)).fetchone()
    if not r:
        raise SystemExit(f'unresolved card: {name}')
    return r


def row(qty, r):
    name, cost, cmc, tl, text, ci, rank, price, gc, legal = r
    text = (text or '').replace('\n', ' | ')
    flags = ' GAME-CHANGER' if gc else ''
    flags += '' if legal == 'legal' else f' COMMANDER:{legal}'
    return (f'- {qty}x **{name}** {cost or ""} (MV {cmc:g}) — {tl} — EDHREC #{rank or "unranked"}'
            f' — ${price or "?"}{flags}\n  {text}')


open_cards = read(os.path.join(PAPER, 'open-cards.txt'))
open_rows = [(q, card(n)) for q, n in open_cards if n not in BASICS]

for path in sorted(glob.glob(os.path.join(PAPER, 'decks', '*.txt'))):
    deck = read(path)
    if sum(q for q, _ in deck) < 60:
        continue
    slug = os.path.basename(path)[:-4]
    cmd = card(deck[0][1])
    ci = set(json.loads(cmd[5] or '[]'))
    rows = [(q, card(n)) for q, n in deck]
    with open(os.path.join(OUT, f'{slug}-deck.md'), 'w', encoding='utf-8') as f:
        f.write(f'# {cmd[0]} — current deck ({sum(q for q, _ in deck)} cards, commander first)\n\n')
        f.write('\n'.join(row(q, r) for q, r in rows) + '\n')
    fits = [(q, r) for q, r in open_rows if set(json.loads(r[5] or '[]')) <= ci]
    fits.sort(key=lambda x: (x[1][6] is None, x[1][6] or 0))
    with open(os.path.join(OUT, f'{slug}-pool.md'), 'w', encoding='utf-8') as f:
        f.write(f'# Open cards legal in {cmd[0]} (colour identity {"".join(sorted(ci)) or "C"}): {len(fits)} cards, '
                'sorted by EDHREC rank (lower = more played), unranked last\n\n')
        f.write('\n'.join(row(q, r) for q, r in fits) + '\n')
    print(slug, len(rows), 'deck lines,', len(fits), 'pool cards')
