"""Tam pool for the win-condition / consistency rebuild, with DB oracle text.

    py verify-2026-10-03/tam-wincon/build-pool.py
deck.md   = the current Tam 99 (decks/paper/decks/tam-the-possibility.txt)
chunk-N.md = every FREE owned Commander-legal card (owned in collection.txt minus copies used in all deck files),
             plus unregistered Reality Fracture cards (ASSUMED = common/uncommon, IF-OWNED = rare/mythic)
other.md  = cards sleeved in the other paper decks, tagged with the donor deck (a move needs a donor backfill)
"""
import json, os, re, sqlite3, collections, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DECKS = ROOT / 'decks/paper/decks'
TAM = DECKS / 'tam-the-possibility.txt'
CHUNK = 160
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))


def parse(p):
    out = collections.Counter()
    for line in p.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', line.strip())
        if m:
            out[m.group(2).strip()] += int(m.group(1))
    return out


def card(name):
    return db.execute(
        "select name, mana_cost, type_line, oracle_text, legalities, rarity from cards where name = ? or name like ? "
        "order by (layout not in ('art_series','token')) desc limit 1", (name, name + ' // %')).fetchone()


def entry(r, tag=''):
    return f"### {r[0]}{tag} | {r[1] or ''} | {r[2]}\n{r[3] or ''}\n"


def legal(r):
    return r and 'Basic Land' not in (r[2] or '') and json.loads(r[4] or '{}').get('commander') == 'legal'


owned = parse(ROOT / 'decks/paper/collection.txt')
decks = {f.stem: parse(f) for f in DECKS.glob('*.txt')}
decks['urza-draft (not sleeved yet)'] = parse(ROOT / 'verify-2026-10-02/urza/final.txt')
used = sum(decks.values(), collections.Counter())

deck_rows = [entry(r) for n in decks['tam-the-possibility'] if (r := card(n)) and legal(r)]
free, other, missing = [], [], []
for name, n in sorted(owned.items()):
    r = card(name)
    if not r:
        missing.append(name)
        continue
    if not legal(r):
        continue
    if n - used[name] > 0:
        free.append(entry(r))
    holders = [d for d, c in decks.items() if c[name] and d != 'tam-the-possibility']
    if holders and n - used[name] <= 0:
        other.append(entry(r, f" [IN {', '.join(holders)}]"))

owned_names = set(owned) | {k.split(' // ')[0] for k in owned}
for name, cost, tl, text, leg, rarity in db.execute(
        "select name, mana_cost, type_line, oracle_text, legalities, rarity from cards where set_code in ('fra','frc') "
        "and layout not in ('token','art_series') group by name order by name"):
    if name in owned_names or name.split(' // ')[0] in owned_names:
        continue
    if not legal((name, cost, tl, text, leg)):
        continue
    tier = 'ASSUMED' if rarity in ('common', 'uncommon') else 'IF-OWNED'
    free.append(entry((name, cost, tl, text), f" [{tier} FRA, {rarity}]"))

(HERE / 'deck.md').write_text(f"# Current paper Tam 99 + commander ({len(deck_rows)} unique)\n\n" + '\n'.join(deck_rows), encoding='utf-8')
(HERE / 'other.md').write_text(f"# Cards sleeved in other paper decks ({len(other)})\n\n" + '\n'.join(other), encoding='utf-8')
for old in HERE.glob('chunk-*.md'):
    old.unlink()
chunks = [free[i:i + CHUNK] for i in range(0, len(free), CHUNK)]
for i, c in enumerate(chunks, 1):
    names = [e.split('\n', 1)[0][4:].split(' | ')[0] for e in c]
    (HERE / f'chunk-{i}.md').write_text(
        f"# Free pool chunk {i}/{len(chunks)} ({len(c)} cards; last card: {names[-1]})\n\n" + '\n'.join(c), encoding='utf-8')
print(f"deck {len(deck_rows)} | free {len(free)} in {len(chunks)} chunks | other decks {len(other)} | not in DB: {missing}")
