"""Synergy degrees + counts for final-2.txt, and each found card's links against it.
    py synergy.py
Rules = verify-2026-10-02/urza/verdicts.py (a link = one card's text cares about a property the
other card has; each pair once), extended for the 109 found cards in found-all.md. DB opened read-only."""
import os, re, sqlite3, statistics, pathlib

HERE = pathlib.Path(__file__).resolve().parent.parent
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db').replace('\\', '/')
db = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
FINAL = {re.sub(r'^\d+\s+', '', l.strip()) for l in open(HERE / 'refute' / 'final-r.txt', encoding='utf-8') if l.strip()} - {'Island'}
FOUND = re.findall(r'^### (.+?) \|', (HERE / 'found-all.md').read_text(encoding='utf-8'), re.M)
FOUND = [f if f != 'Jadzi, Steward of Fate' else "Jadzi, Steward of Fate // Oracle's Gift" for f in FOUND]
CUT = ['Witching Well', 'Stock Up', 'Pull from Tomorrow', 'Countersculpt', 'Hangarback Walker', "Wayfarer's Bauble",
       "You Find the Villains' Lair", 'Perplexing Test', 'Mazemind Tome', 'Donatello, Way with Machines',
       'Dawnsire, Sunstar Dreadnought', 'Golem Foundry', 'Steel Hellkite', 'Cityscape Leveler', 'Tractor Beam',
       'Reverse Engineer', "Commander's Insight", "Mishra's Bauble", 'Torrential Gearhulk', 'Hedron Archive', 'Pol Jamaar, Illusionist', 'Reconnaissance Mission']

info = {}
for n in FINAL | set(FOUND) | set(CUT):
    cmc, mc, tl, tx = db.execute("select cmc, coalesce(mana_cost,''), type_line, coalesce(oracle_text,'') from cards "
                                 "where name=? or name like ? order by mana_cost is null, length(name) limit 1", (n, n + ' // %')).fetchone()
    front = tl.split('//')[0]
    info[n] = dict(cmc=cmc, text=tx, art='Artifact' in front, land='Land' in front, crea='Creature' in front,
                   legend='Legendary' in front or 'Saga' in front, instant='Instant' in front,
                   insorc='Instant' in front or 'Sorcery' in front,
                   colorless=not re.search(r'\{[WUBRG]', mc.split('//')[0]) and 'Land' not in front,
                   blue='{U}' in mc.split('//')[0])
URZA = 'Urza, Lord High Artificer'
# makes artifact tokens / makes creature tokens / ETB or LTB worth re-triggering / scries or surveils
ART_TOK = {URZA, 'Sai, Master Thopterist', 'Efficient Construction', 'Chrome Host Seedshark', 'Whirler Rogue',
           'Hangarback Walker', 'Golem Foundry', 'Worldwalker Helm', 'Experimental Aviator', 'Deduce', "Noble's Purse",
           'Secluded Starforge', 'Nimble Thopterist', 'Esoteric Duplicator', 'Desculpting Blast'}
CREA_TOK = (ART_TOK - {'Chrome Host Seedshark', 'Deduce', "Noble's Purse", 'Esoteric Duplicator'}) | {
    'Glaring Fleshraker', 'Rite of Replication'}
ETB = {URZA, 'Meteor Golem', 'Solemn Simulacrum', 'Thought Monitor', 'Whirler Rogue', 'Seat of the Synod',
       'Volatile Stormdrake', 'Wan Shi Tong, Librarian', 'Emeritus of Ideation', 'Cryogen Relic', 'Experimental Aviator',
       "Jadzi, Steward of Fate // Oracle's Gift", 'Torrential Gearhulk', 'Pol Jamaar, Illusionist', 'Nimble Thopterist',
       'Subterfuge', 'Interdisciplinary Mascot', 'Mindseeker Oculus', 'Seasoned Cryomancer', 'Yuriko, Hope from the Shadows'}
SCRY = {'Mazemind Tome', 'The Legend of Kuruk', "Bane's Contingency", 'Unauthorized Exit', 'Candlestick',
        'Cerebral Download', "Giant's Boulder", 'Yuriko, Hope from the Shadows'}
DISCARD = {'Careful Consideration', "You Find the Villains' Lair", "Agna Qel'a", "Jadzi, Steward of Fate // Oracle's Gift",
           'Occult Epiphany', 'The Echoverse Fulcrum'}
# our fliers (flying creature cards, flying-token makers, Super State) / Distant Melody types (Thopter, Construct, Golem)
FLY = {'Chrome Host Seedshark', 'Donatello, Way with Machines', 'Geist of Saint Thalia', 'Steel Hellkite', 'Thought Monitor',
       'Wan Shi Tong, Librarian', 'Emeritus of Ideation', 'Sai, Master Thopterist', 'Efficient Construction', 'Whirler Rogue',
       'Hangarback Walker', 'Experimental Aviator', 'Super State', 'Memory Guardian', 'Yue, the Moon Spirit',
       'The Lord of the Eagles', 'Filigree Attendant', 'Pol Jamaar, Illusionist', 'Nimble Thopterist', 'Duelist of the Mind'}
MELODY = {URZA, 'Sai, Master Thopterist', 'Efficient Construction', 'Whirler Rogue', 'Hangarback Walker', 'Thought Monitor',
          'Cityscape Leveler', 'Worldwalker Helm', 'Flesh Duplicate', 'Golem Foundry', 'Solemn Simulacrum', 'Meteor Golem',
          'Experimental Aviator', 'Darksteel Colossus', 'Torrential Gearhulk', 'Traxos, Scourge of Kroog',
          'Traxos, Scourge Eternal', 'Patchwork Automaton', 'Rite of Replication', 'Nimble Thopterist'}
art = lambda c: info[c]['art'] or c in ART_TOK
spell = lambda c: not info[c]['land']
crea = lambda c: info[c]['crea'] or c in CREA_TOK
art_spell = lambda c: info[c]['art'] and spell(c)
noncrea_spell = lambda c: spell(c) and not info[c]['crea']
etb_crea = lambda c: c in ETB and info[c]['crea']
CARES = {
    URZA: art, 'Sai, Master Thopterist': art_spell, 'Efficient Construction': art_spell, 'Golem Foundry': art_spell,
    'Cloud Key': art_spell, 'Chrome Host Seedshark': noncrea_spell, 'Geist of Saint Thalia': noncrea_spell,
    'Sapphire Medallion': lambda c: info[c]['blue'], 'Kappa Cannoneer': art, 'Thought Monitor': art, 'Reverse Engineer': art,
    'Donatello, Way with Machines': art, 'Whirler Rogue': lambda c: art(c) or crea(c), 'Worldwalker Helm': lambda c: c in ART_TOK,
    'Glaring Fleshraker': lambda c: (info[c]['colorless'] and spell(c)) or c in CREA_TOK,
    'Bident of Thassa': crea, "Rogue's Passage": crea, 'Super State': crea, 'Dawnsire, Sunstar Dreadnought': crea,
    'Flare of Denial': lambda c: info[c]['crea'] and info[c]['blue'], 'Ghostly Flicker': lambda c: c in ETB,
    'Flesh Duplicate': etb_crea, 'Unstoppable Plan': lambda c: art(c) or c == 'Tractor Beam',
    'Planetarium of Wan Shi Tong': lambda c: c in SCRY, 'Buried Ruin': art_spell, 'Scour for Scrap': art_spell,
    'The Mycosynth Gardens': art_spell, 'Karn, the Great Creator': lambda c: info[c]['art'] and not info[c]['crea'],
    'The Legend of Kuruk': lambda c: spell(c) or art(c), 'Perplexing Test': lambda c: c in CREA_TOK,
    'Shifting Grift': lambda c: c in CREA_TOK,
    # batches 1-2
    "Bane's Contingency": lambda c: c == URZA, 'Geode Golem': lambda c: c == URZA,
    'Library of Leng': lambda c: c in DISCARD, 'Rise from the Tides': lambda c: info[c]['insorc'],
    'Sapphire Charm': crea, 'Elixir of Immortality': lambda c: c in {'Buried Ruin', 'Scour for Scrap'},
    'Memory Guardian': art, 'Octavia, Living Thesis': lambda c: info[c]['insorc'], 'Candlestick': crea,
    'Yue, the Moon Spirit': lambda c: noncrea_spell(c) or art(c), 'Distant Melody': lambda c: c in MELODY,
    'The Lord of the Eagles': lambda c: c in FLY, 'Lotus Ring': crea,
    # batch 3
    'Filigree Attendant': art, 'Myr Enforcer': art, 'Emissary Escort': lambda c: info[c]['art'] and info[c]['cmc'] >= 3,
    'Cerebral Download': art, "Katara's Reversal": art, 'Secluded Starforge': art, 'Padeem, Consul of Innovation': art,
    'Patchwork Automaton': art_spell, 'Traxos, Scourge of Kroog': lambda c: art_spell(c) or info[c]['legend'],
    'Traxos, Scourge Eternal': lambda c: spell(c) and (info[c]['art'] or info[c]['crea']),
    'Torrential Gearhulk': lambda c: info[c]['instant'], 'Wishing Well': lambda c: info[c]['insorc'],
    'Rite of Replication': etb_crea, 'Visage Bandit': etb_crea, 'Body Double': etb_crea,
    'Pol Jamaar, Illusionist': lambda c: c in MELODY, 'Sun Quan, Lord of Wu': crea,
    'Tetsuko Umezawa, Fugitive': lambda c: c in CREA_TOK, 'Subterfuge': crea, "April O'Neil, Hacktivist": spell,
    'Esoteric Duplicator': lambda c: info[c]['art'] and 'Sacrifice' in info[c]['text'],
    'Soul of New Phyrexia': lambda c: not info[c]['insorc'], 'Proft, Consulting Detective': lambda c: c in SCRY,
    'Pensive Professor': spell, 'Reconnaissance Mission': crea,
}

def pairs_of(cards):
    ps = set()
    for a, f in CARES.items():
        if a in cards:
            ps |= {frozenset((a, b)) for b in cards if b != a and f(b)}
    return ps

links = lambda n: sum(n in p for p in pairs_of(FINAL | {n}))
pairs = pairs_of(FINAL)
deg = {n: sum(n in p for p in pairs) for n in FINAL}
vals = sorted(deg.values())
print(f'final-2: unique pairs {len(pairs)} | degree min {vals[0]} median {statistics.median(vals)} max {vals[-1]}')
print('15 lowest:', sorted(deg.items(), key=lambda x: (x[1], x[0]))[:15])
print(f'found cards: {len(FOUND)} (links with final-2; * = IN, scored in place; OUT scored as if added)')
print('  ' + ' | '.join(f"{n.split(',')[0].split(' //')[0]}{'*' if n in FINAL else ''} {links(n)}" for n in FOUND))
print('cut draft cards (as if added back): ' + ' | '.join(f'{n} {links(n)}' for n in CUT))

# counts (stats.py rules): artifacts, avg MV, Karsten regression
nonland = [n for n in FINAL - {URZA} if not info[n]['land']]
isl = 31
avg = sum(info[n]['cmc'] for n in nonland) / len(nonland)
CHEAP = {'Sol Ring', 'Arcane Signet', 'Sky Diamond', 'Sapphire Medallion', "Mishra's Bauble", "Wayfarer's Bauble",
         'Mazemind Tome', 'Soul-Guide Lantern', 'Geist of Saint Thalia', 'Waterbending Scroll', 'Cryogen Relic', "Noble's Purse"}
cheap = sum(n in CHEAP for n in nonland)
arts = sum(info[n]['art'] for n in FINAL - {URZA})
insorc = sum(info[n]['insorc'] for n in nonland)
print(f'nonland {len(nonland)} | artifacts {arts} | instants+sorceries {insorc} | avgMV {avg:.3f} | cheap {cheap} | '
      f'Karsten 31.42+3.13*avg-0.28*cheap = {31.42 + 3.13 * avg - 0.28 * cheap:.1f} | lands {len(FINAL) - 1 - len(nonland) + isl}')
