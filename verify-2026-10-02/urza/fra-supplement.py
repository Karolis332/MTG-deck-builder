"""Reality Fracture (fra/frc) cards legal in mono-blue Commander that are NOT registered -> fra-supplement.md.

The operator owns most FRA commons/uncommons unregistered (2026-09-28 audit rule):
ASSUMED = common/uncommon, IF-OWNED = rare/mythic.
    py verify-2026-10-02/urza/fra-supplement.py
"""
import json, os, re, sqlite3, pathlib
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
owned = {re.sub(r'^\d+\s+', '', l.strip()) for l in (ROOT / 'decks/paper/collection.txt').read_text(encoding='utf-8').splitlines() if l.strip()}
rows = db.execute("select name, mana_cost, type_line, oracle_text, rarity, color_identity, legalities from cards "
                  "where set_code in ('fra','frc') and layout not in ('token','art_series') group by name order by rarity desc, name").fetchall()
out = []
for name, cost, tl, text, rarity, ci, leg in rows:
    if name in owned or name.split(' // ')[0] in owned or 'Basic Land' in (tl or ''):
        continue
    if not set(json.loads(ci or '[]')) <= {'U'} or json.loads(leg or '{}').get('commander') != 'legal':
        continue
    tier = 'ASSUMED' if rarity in ('common', 'uncommon') else 'IF-OWNED'
    out.append(f"### {name} [{tier}, {rarity}] | {cost or ''} | {tl}\n{text or ''}\n")
(HERE / 'fra-supplement.md').write_text(
    f"# Reality Fracture mono-blue/colourless cards not registered ({len(out)}): ASSUMED = common/uncommon, IF-OWNED = rare/mythic\n\n"
    + '\n'.join(out), encoding='utf-8')
print(len(out), 'cards;', sum('ASSUMED' in o for o in out), 'ASSUMED')
