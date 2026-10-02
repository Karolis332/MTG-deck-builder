"""Count and Karsten check for an Urza list: py stats.py <list.txt>
Fails loudly on a name outside pool.md (Island excepted) or a duplicate."""
import os, re, sqlite3, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
POOL = re.findall(r'^### (.+?)(?: \[| \|)', (HERE / 'pool.md').read_text(encoding='utf-8'), re.M)
# MV <= 2 nonland cards that draw or ramp (Karsten regression "cheap"); X spells excluded.
CHEAP = {'Sol Ring', 'Arcane Signet', 'Sky Diamond', 'Sapphire Medallion', "Mishra's Bauble", "Wayfarer's Bauble",
         'Prophetic Prism', 'Mazemind Tome', 'Experimental Augury', 'Sword of the Animist', 'Fountainport Bell',
         'Soul-Guide Lantern', 'Lembas', 'The Echoverse Fulcrum', 'Tablet of Compleation', 'Gleaming Barrier'}
MDFC = {'Sink into Stupor'}

lines = [l.strip() for l in open(sys.argv[1], encoding='utf-8') if l.strip()]
cards = []
for i, l in enumerate(lines):
    m = re.match(r'^(\d+)\s+(.+)$', l)
    n, name = (int(m.group(1)), m.group(2)) if m else (1, l)
    if name != 'Island' and name not in POOL:
        sys.exit(f'NOT IN POOL: {name}')
    cards += [name] * n
dups = {c for c in cards if c != 'Island' and cards.count(c) > 1}
assert not dups, dups
rows = {}
for name in set(cards):
    rows[name] = db.execute("select cmc, type_line from cards where name=? or name like ? limit 1", (name, name + ' // %')).fetchone()
nonland = [c for c in cards[1:] if 'Land' not in rows[c][1].split('//')[0]]
lands = [c for c in cards[1:] if c not in nonland]
art = [c for c in cards[1:] if 'Artifact' in rows[c][1]]
avg = sum(rows[c][0] for c in nonland) / len(nonland)
cheap = sum(c in CHEAP for c in nonland)
eff_lands = len(lands) + 0.38 * sum(c in MDFC for c in nonland)
print(f'total {len(cards)} | lands {len(lands)} (+{eff_lands - len(lands):.2f} MDFC) | nonland {len(nonland)} | artifacts {len(art)}')
print(f'avgMV {avg:.2f} | cheap {cheap} | Karsten regression 31.42+3.13*{avg:.2f}-0.28*{cheap} = {31.42 + 3.13 * avg - 0.28 * cheap:.1f}')
