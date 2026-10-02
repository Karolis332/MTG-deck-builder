"""verdicts.md (one row per pool card, pool order) + synergy degrees for final.txt.
    py verdicts.py
IN/OUT comes from final.txt, so the table cannot drift from the list."""
import os, re, sqlite3, statistics, pathlib

HERE = pathlib.Path(__file__).resolve().parent
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
POOL = re.findall(r'^### (.+?)(?: \[| \|)', (HERE / 'pool.md').read_text(encoding='utf-8'), re.M)
FINAL = {re.sub(r'^\d+\s+', '', l.strip()) for l in open(HERE / 'final.txt', encoding='utf-8') if l.strip()} - {'Island'}

V = {}
for line in (HERE / 'verdicts-src.txt').read_text(encoding='utf-8').splitlines():
    if line.strip():
        name, role, reason = (s.strip() for s in line.split('|', 2))
        V[name] = (role, reason)

missing = [n for n in POOL if n not in V]
extra = [n for n in V if n not in POOL]
assert not missing and not extra, (missing, extra)
assert FINAL <= set(POOL), FINAL - set(POOL)
rows = [f'| {n} | {V[n][0]} | {"IN" if n in FINAL else "OUT"} | {V[n][1]} |' for n in POOL]
(HERE / 'verdicts.md').write_text(
    '# Urza pool verdicts (pool order; IN/OUT read from final.txt)\n\n| Card | role | IN/OUT | reason (DB quote) |\n|---|---|---|---|\n'
    + '\n'.join(rows) + f'\n\nrows: {len(rows)}\n', encoding='utf-8')
print(f'rows: {len(rows)} | IN {sum(n in FINAL for n in POOL)} | OUT {sum(n not in FINAL for n in POOL)}')

# --- synergy degree: a link = one card's text cares about a property the other card has (each pair once) ---
info = {}
for n in FINAL:
    cmc, mc, tl = db.execute("select cmc, coalesce(mana_cost,''), type_line from cards where name=? or name like ? limit 1",
                             (n, n + ' // %')).fetchone()
    front = tl.split('//')[0]
    info[n] = dict(art='Artifact' in front, land='Land' in front, crea='Creature' in front,
                   colorless=not re.search(r'\{[WUBRG]', mc.split('//')[0]) and 'Land' not in front,
                   blue='{U}' in mc.split('//')[0])
ART_TOK = {'Urza, Lord High Artificer', 'Sai, Master Thopterist', 'Efficient Construction', 'Chrome Host Seedshark',
           'Whirler Rogue', 'Hangarback Walker', 'Golem Foundry', 'Worldwalker Helm'}
CREA_TOK = ART_TOK - {'Chrome Host Seedshark'} | {'Glaring Fleshraker'}
ETB = {'Urza, Lord High Artificer', 'Meteor Golem', 'Solemn Simulacrum', 'Thought Monitor', 'Whirler Rogue',
       'Witching Well', 'Seat of the Synod', 'Volatile Stormdrake', 'Wan Shi Tong, Librarian', 'Emeritus of Ideation'}
SCRY = {'Witching Well', 'Mazemind Tome', 'The Legend of Kuruk', 'Countersculpt'}
art = lambda c: info[c]['art'] or c in ART_TOK
spell = lambda c: not info[c]['land']
crea = lambda c: info[c]['crea'] or c in CREA_TOK
CARES = {
    'Urza, Lord High Artificer': art, 'Sai, Master Thopterist': lambda c: info[c]['art'] and spell(c),
    'Efficient Construction': lambda c: info[c]['art'] and spell(c), 'Patchwork Automaton': lambda c: info[c]['art'] and spell(c),
    'Golem Foundry': lambda c: info[c]['art'] and spell(c), 'Cloud Key': lambda c: info[c]['art'] and spell(c),
    'Chrome Host Seedshark': lambda c: spell(c) and not info[c]['crea'], 'Geist of Saint Thalia': lambda c: spell(c) and not info[c]['crea'],
    'Sapphire Medallion': lambda c: info[c]['blue'], 'Kappa Cannoneer': art, 'Thought Monitor': art, 'Reverse Engineer': art,
    'Whirler Rogue': lambda c: art(c) or crea(c), 'Worldwalker Helm': lambda c: c in ART_TOK,
    'Glaring Fleshraker': lambda c: (info[c]['colorless'] and spell(c)) or c in CREA_TOK,
    'Bident of Thassa': crea, 'Rogue\'s Passage': crea, 'Super State': crea, 'Dawnsire, Sunstar Dreadnought': crea,
    'Flare of Denial': lambda c: info[c]['crea'] and info[c]['blue'], 'Ghostly Flicker': lambda c: c in ETB,
    'Unstoppable Plan': lambda c: art(c) or c == 'Tractor Beam', 'Planetarium of Wan Shi Tong': lambda c: c in SCRY,
    'Buried Ruin': lambda c: info[c]['art'] and spell(c), 'Scour for Scrap': lambda c: info[c]['art'] and spell(c),
    'The Mycosynth Gardens': lambda c: info[c]['art'] and spell(c), 'Karn, the Great Creator': lambda c: info[c]['art'] and not info[c]['crea'],
    'The Legend of Kuruk': lambda c: spell(c) or art(c), 'Perplexing Test': lambda c: c in CREA_TOK,
    'Shifting Grift': lambda c: c in CREA_TOK, 'Sewer-veillance Cam': crea,
}
pairs = set()
for a, f in CARES.items():
    if a in FINAL:
        pairs |= {frozenset((a, b)) for b in FINAL if b != a and f(b)}
deg = {n: sum(n in p for p in pairs) for n in FINAL}
EXEMPT = {'counter', 'removal', 'wipe', 'ramp', 'draw', 'land', 'graveyard hate'}
judged = {n: d for n, d in deg.items() if not any(r in V[n][0] for r in EXEMPT) or n in CARES}
vals = sorted(deg.values())
print(f'unique pairs {len(pairs)} | degree min {vals[0]} median {statistics.median(vals)} max {vals[-1]}')
print('5 lowest (all):', sorted(deg.items(), key=lambda x: x[1])[:5])
print('5 lowest (non-exempt):', sorted(judged.items(), key=lambda x: x[1])[:5])
