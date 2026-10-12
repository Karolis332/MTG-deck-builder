# Read-only metrics for the Inspirit build: roles, pips, sources, avg MV, synergy links.
# usage: py metrics.py <list.txt> [--links] [--cands]
import os, re, sqlite3, sys, statistics
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
con = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)

def load(p):
    out = []
    for l in open(p, encoding='utf-8'):
        m = re.match(r'(\d+) (.+)', l.strip())
        if m: out += [m.group(2)] * int(m.group(1))
    return out

ROLE = {
 'ramp': ['Sol Ring','Arcane Signet','Everflowing Chalice','Pentad Prism','Ornithopter of Paradise','Steelswarm Operator',"Bender's Waterskin",'All-Fates Scroll','Solar Array','Astral Cornucopia','Enthusiastic Mechanaut','Empowered Autogenerator','Crystalline Crawler','The Eternity Elevator','Cloud Key','Uthros Psionicist',"Commander's Sphere"],
 'draw': ['Thought Monitor','Universal Surveillance','Pull from Tomorrow','Thirst for Knowledge','Experimental Augury',"Tezzeret's Gambit",'Jhoira, Weatherlight Captain','Uthros Research Craft','Etched Oracle','Mindless Automaton'],
 'removal': ['Swords to Plowshares','Dispatch','Rapid Hybridization','Bovine Intervention','Sheltered by Ghosts','Lux Cannon','Angel of the Ruins','Tractor Beam','Journey to Nowhere','Flame of Anor'],
 'counterspell': ['Swan Song','Three Steps Ahead'],
 'wipe': ['Chain Reaction','Fumigate','Organic Extinction'],
 'protection': ['Ripples of Potential','Resourceful Defense','Boros Charm'],
 'engine': ['Steel Overseer','Iron Spider, Stark Upgrade','Kilo, Apogee Mind','Surge Conductor','Tekuthal, Inquiry Dominus','Patrolling Peacemaker','Deepglow Skate','Contagion Clasp','Expansion Algorithm','Moxite Refinery','Tezzeret, Cruel Captain','Coretapper','Thrummingbird'],
 'payoff': ['Darksteel Reactor','Lux Artillery','Titan Forge','Golem Foundry','Kappa Cannoneer','Hangarback Walker','Threefold Thunderhulk','Depthshaker Titan','Alibou, Ancient Witness','Gavel of the Righteous','Pinnacle Emissary','Phyrexian Metamorph','Walking Ballista','Bygone Colossus','Traxos, Scourge of Kroog'],
 'recursion/utility': ['Emry, Lurker of the Loch','Wake the Past','Soul-Guide Lantern'],
}
PROLIF = {'Kilo, Apogee Mind','Surge Conductor','Patrolling Peacemaker','Contagion Clasp','Expansion Algorithm','Experimental Augury',"Tezzeret's Gambit",'Ripples of Potential',"Karn's Bastion",'Thrummingbird','Deepglow Skate','Tekuthal, Inquiry Dominus'}
TAPPED = {'Secluded Steppe','Lonely Sandbar','Mystic Monastery','Glittering Massif','Irrigated Farmland','Temple of Enlightenment','Temple of Epiphany','Temple of Triumph','Silverbluff Bridge','Razortide Bridge','Rustvale Bridge','Evolving Wilds','Radiant Summit'}
SRC = {'Island':'U','Mountain':'R','Plains':'W','Great Furnace':'R','Seat of the Synod':'U','Ancient Den':'W','Secluded Steppe':'W','Lonely Sandbar':'U',
 'Battlefield Forge':'RW','Adarkar Wastes':'WU','Shivan Reef':'UR','Mystic Monastery':'URW','Glittering Massif':'RW','Irrigated Farmland':'WU','Glacial Fortress':'WU',
 'Sulfur Falls':'UR','Clifftop Retreat':'RW','Cascade Bluffs':'UR','Rugged Prairie':'RW','Skycloud Expanse':'WU','Temple of Enlightenment':'WU','Temple of Epiphany':'UR',
 'Temple of Triumph':'RW','Silverbluff Bridge':'UR','Razortide Bridge':'WU','Rustvale Bridge':'RW','Sacred Foundry':'RW','Radiant Summit':'RW','Command Tower':'URW',
 'Exotic Orchard':'URW','Spire of Industry':'URW','The Mycosynth Gardens':'URW','Evolving Wilds':'URW','Buried Ruin':'','Karn\'s Bastion':''}

# synergy tags: pv = provides, nd = needs. link(a,b) iff pv[a]&nd[b] or pv[b]&nd[a]
HOLD = {'PROL','MOVE'}
T = {}
def t(name, pv, nd=()): T[name] = (set(pv.split()), set(nd))
for n in ['Sol Ring','Arcane Signet','All-Fates Scroll',"Bender's Waterskin","Commander's Sphere",'Soul-Guide Lantern',"Mishra's Bauble",'The Echoverse Fulcrum',
          'Great Furnace','Seat of the Synod','Ancient Den','Silverbluff Bridge','Razortide Bridge','Rustvale Bridge']: t(n, 'A')
for n in ['Everflowing Chalice','Astral Cornucopia','Empowered Autogenerator','Pentad Prism','Darksteel Reactor','Lux Cannon']: t(n, 'A CHG CTR', {'PUTC'} | HOLD)
t('Inspirit, Flagship Vessel', 'A CHG CTR PUTC PUT1', {'CR','A','PUTC'} | HOLD)
t('Titan Forge', 'A CHG CTR AC', {'PUTC'} | HOLD)
t('Gavel of the Righteous', 'A CHG CTR', {'PUTC','CR'} | HOLD)
t('The Eternity Elevator', 'A CHG CTR', {'PUTC','CR'} | HOLD)
t('Uthros Research Craft', 'A CHG CTR', {'PUTC','CR','A'} | HOLD)
t('Solar Array', 'A PUTC PUT1', {'A'})
t('Steel Overseer', 'A AC CR PUT1 P1 CTR', {'AC','PUT1'} | HOLD)
t('Iron Spider, Stark Upgrade', 'A AC CR PUT1 P1 CTR', {'AC','P1','PUT1'} | HOLD)
t('Kilo, Apogee Mind', 'A AC CR PROL', {'CTR','CR'})
t('Surge Conductor', 'A AC CR PROL', {'CTR','A'})
t('Tekuthal, Inquiry Dominus', 'CR PROL', {'CTR','PROL'})
t('Patrolling Peacemaker', 'A AC CR PROL P1 CTR', {'CTR','PUT1'} | HOLD)
t('Deepglow Skate', 'CR PROL', {'CTR'})
for n in ['Contagion Clasp']: t(n, 'A PROL', {'CTR'})
for n in ['Expansion Algorithm','Experimental Augury',"Tezzeret's Gambit",'Ripples of Potential',"Karn's Bastion"]: t(n, 'PROL', {'CTR'})
t('Moxite Refinery', 'A MOVE PUTC PUT1', {'CTR'})
t('Resourceful Defense', 'MOVE', {'CTR'})
t('Tezzeret, Cruel Captain', 'CTR PUT1', {'A','AC','PROL'})
t('Lux Artillery', 'A', {'CTR','AC'})
for n in ['Crystalline Crawler','Etched Oracle','Mindless Automaton','Hangarback Walker','Walking Ballista','Stonecoil Serpent']: t(n, 'A AC CR P1 CTR', {'PUT1'} | HOLD)
t('Kappa Cannoneer', 'A AC CR P1 CTR', {'A','PUT1'} | HOLD)
t('Threefold Thunderhulk', 'A AC CR P1 CTR', {'A','PUT1'} | HOLD)
t('Patchwork Automaton', 'A AC CR P1 CTR', {'A','PUT1'} | HOLD)
t('Depthshaker Titan', 'A AC CR', {'A','AC'})
t('Alibou, Ancient Witness', 'A AC CR', {'A','AC'})
t('Pinnacle Emissary', 'A AC CR', {'A'})
t('Phyrexian Metamorph', 'A AC', {'A'})
t('Thought Monitor', 'A AC CR', {'A'})
t('Angel of the Ruins', 'A AC CR')
t('Bygone Colossus', 'A AC CR')
t('Traxos, Scourge of Kroog', 'A AC CR', {'A'})
t('Palladium Myr', 'A AC CR')
t('Terror of the Peaks', 'CR')
t('Depthshaker Titan', 'A AC CR', {'A','AC'})
t('Ornithopter of Paradise', 'A AC')
t('Steelswarm Operator', 'A AC CR', {'A'})
t('Enthusiastic Mechanaut', 'A AC CR', {'A'})
t('Jhoira, Weatherlight Captain', 'CR', {'A'})
t('Emry, Lurker of the Loch', 'CR', {'A'})
for n in ['Universal Surveillance','Organic Extinction','Thirst for Knowledge','Dispatch','Buried Ruin','Spire of Industry','The Mycosynth Gardens','Wake the Past','Cloud Key']: t(n, 'A' if n=='Cloud Key' else '', {'A'})
t('Three Steps Ahead', '', {'A','AC'})
t('Coretapper', 'A AC CR PUTC', {'CHG'})
t('Thrummingbird', 'CR PROL', {'CTR'})
t('Flux Channeler', 'CR PROL', {'CTR'})
t('Golem Foundry', 'A CHG CTR AC', {'A','PUTC'} | HOLD)
t('Lost Jitte', 'A CHG CTR PUT1', {'PUTC','CR'} | HOLD)
t("Peter Parker's Camera", 'A CTR', HOLD)
t('Uthros Psionicist', 'CR')
t('Teyo, Lightshield Expert', 'CR PUT1')
for n in ['Boros Charm','Flame of Anor','Journey to Nowhere','Curse of the Swine','Tractor Beam']: t(n, '')

def links(a, deck):
    pa, na = T.get(a, (set(), set()))
    n = 0
    for b in deck:
        if b == a: continue
        pb, nb = T.get(b, (set(), set()))
        if pa & nb or pb & na: n += 1
    return n

def report(path):
    deck = load(path)
    rows = {}
    for nm in set(deck):
        r = con.execute('select mana_cost, cmc, type_line from cards where name=? limit 1', (nm,)).fetchone()
        if not r: print('MISSING', nm); continue
        rows[nm] = r
    lands = [n for n in deck if 'Land' in rows[n][2] and '//' not in rows[n][2]]
    nonland = [n for n in deck if n not in lands]
    pips = {c: 0.0 for c in 'URW'}
    for n in nonland:
        for sym in re.findall(r'\{([^}]+)\}', rows[n][0] or ''):
            parts = sym.split('/')
            cs = [p for p in parts if p in 'URW' and p]
            if 'P' in parts: cs = cs  # phyrexian: count the colour
            for c in cs: pips[c] += 1 / len(cs)
    src = {c: sum(1 for n in lands if c in SRC.get(n, '')) for c in 'URW'}
    mv = [rows[n][1] for n in nonland]
    print(f'== {path}: {len(deck)} cards, lands {len(lands)} (tapped {sum(1 for n in lands if n in TAPPED)}), avg MV nonland {statistics.mean(mv):.2f}')
    print('pips', {k: round(v, 1) for k, v in pips.items()}, 'land sources', src)
    for r, names in ROLE.items():
        hit = [n for n in nonland if n in names]
        print(f'{r}: {len(hit)}')
    print('proliferate sources:', sum(1 for n in deck if n in PROLIF))
    if '--links' in sys.argv:
        L = sorted(((links(n, deck), n) for n in nonland))
        vals = [x for x, _ in L]
        print('links nonland: min', vals[0], 'median', statistics.median(vals), 'max', vals[-1])
        print('lowest:', L[:12])
        print('all:', ';'.join(f'{n}={x}' for x, n in sorted(L, key=lambda z: -z[0])))
    if '--cands' in sys.argv:
        cands = ['Coretapper','Thrummingbird','Golem Foundry','Cloud Key','Uthros Psionicist','Soul-Guide Lantern','Wake the Past','Tractor Beam','Resourceful Defense',
                 'Boros Charm',"Peter Parker's Camera",'Patchwork Automaton','Stonecoil Serpent',"Commander's Sphere",'Flux Channeler','Lost Jitte',"Mishra's Bauble",
                 'Teyo, Lightshield Expert','The Echoverse Fulcrum','Pinnacle Emissary','Moxite Refinery','Hangarback Walker','Depthshaker Titan','Palladium Myr','Terror of the Peaks','Bygone Colossus','Traxos, Scourge of Kroog']
        base = [n for n in deck]
        print('cand links vs this 100:', ';'.join(f'{c}={links(c, base)}' for c in cands))
    missing_tags = [n for n in set(nonland) if n not in T]
    if missing_tags: print('untagged (0 links):', missing_tags)

for p in [a for a in sys.argv[1:] if not a.startswith('--')]: report(p)
