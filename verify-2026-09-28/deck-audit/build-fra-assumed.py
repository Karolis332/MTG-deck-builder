"""One-off: Reality Fracture (fra/frc) cards the operator probably owns but never registered (2026-09-28).

Operator: "most of the commons and uncommons, some rares and mythics, the Traxos echo pair, most of the other
echo pairs, not the Chandras, not the Garruks, the Karns yes". An echo pair = two legendary fra cards of the same
character (same first name word). Tiers:
  ASSUMED  every unregistered common/uncommon + both halves of every echo pair (Karn, Traxos stated outright)
  IF-OWNED every other unregistered rare/mythic (operator owns "some")
Writes <slug>-fra-assumed.md per audited deck: colour-legal, commander-legal cards in the same row format as
<slug>-pool.md, tier tag on each row. Registered cards (collection.txt) are excluded: the main audit had them.
Run: PYTHONIOENCODING=utf-8 py verify-2026-09-28/deck-audit/build-fra-assumed.py
"""
import collections, glob, json, os, re, sqlite3

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAPER = os.path.join(ROOT, 'decks', 'paper')
OUT = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
NOT_OWNED = {'Chandra, Chill of Compliance', 'Chandra, Torch of Defiance', 'Garruk, Curse Breaker', 'Garruk, Veiled Butcher'}
RANK = {'common': 0, 'uncommon': 1, 'rare': 2, 'mythic': 3}

c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)


def names(path):
    return {re.sub(r'^\d+\s+', '', l.strip()) for l in open(path, encoding='utf-8') if l.strip() and not l.startswith('#')}


registered = names(os.path.join(PAPER, 'collection.txt'))
rows = {}
for r in c.execute("select name, mana_cost, cmc, type_line, oracle_text, color_identity, edhrec_rank, price_usd, game_changer, "
                   "json_extract(legalities,'$.commander'), rarity from cards where set_code in ('fra','frc') "
                   "and layout not in ('art_series','token','double_faced_token','emblem') order by collector_number"):
    rows.setdefault(r[0], r)

legends = collections.defaultdict(list)
for n, r in rows.items():
    if 'Legendary' in r[3]:
        legends[re.split(r'[, ]', n)[0]].append(n)
echo = {n for k, v in legends.items() if len(v) == 2 and k != 'The' for n in v}

tier = {}
for n, r in rows.items():
    if n in registered or n in NOT_OWNED or r[9] != 'legal':
        continue
    tier[n] = 'ASSUMED' if RANK[r[10]] <= 1 or n in echo else 'IF-OWNED'

for path in sorted(glob.glob(os.path.join(PAPER, 'decks', '*.txt'))):
    slug = os.path.basename(path)[:-4]
    if not os.path.exists(os.path.join(OUT, f'{slug}-pool.md')):
        continue
    cmd = next(re.sub(r'^\d+\s+', '', l.strip()) for l in open(path, encoding='utf-8') if l.strip() and not l.startswith('#'))
    ci = set(json.loads(c.execute("select color_identity from cards where (name = ? or name like ? || ' // %') and layout != 'art_series' limit 1",
                                  (cmd, cmd)).fetchone()[0]))
    fits = sorted((n for n in tier if set(json.loads(rows[n][5] or '[]')) <= ci),
                  key=lambda n: (tier[n] != 'ASSUMED', -RANK[rows[n][10]], rows[n][2], n))
    with open(os.path.join(OUT, f'{slug}-fra-assumed.md'), 'w', encoding='utf-8') as f:
        f.write(f'# Unregistered Reality Fracture cards legal in {cmd} ({"".join(sorted(ci)) or "C"}): {len(fits)} cards\n'
                '# ASSUMED = operator owns most of these; IF-OWNED = operator owns "some" rares/mythics. Confirm before sleeving.\n\n')
        for n in fits:
            name, cost, cmc, tl, text, _, rank, price, gc, _, rar = rows[n]
            text = (text or '').replace('\n', ' | ')
            f.write(f'- [{tier[n]}] **{name}** {cost or ""} (MV {cmc:g}) — {tl} — {rar}{" — echo pair" if n in echo else ""}'
                    f'{" GAME-CHANGER" if gc else ""}\n  {text}\n')
    print(slug, len(fits), 'cards,', sum(tier[n] == 'ASSUMED' for n in fits), 'assumed')

print('echo pairs:', sorted(echo))
print('total unregistered legal:', len(tier), collections.Counter(tier.values()))
