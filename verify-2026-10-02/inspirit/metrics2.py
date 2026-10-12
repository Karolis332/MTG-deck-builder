# Read-only health metrics for Inspirit round 2. usage: py metrics2.py <list> [<list> ...]
import os, re, sqlite3, sys
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
con = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
def load(p):
    out = []
    for l in open(p, encoding='utf-8'):
        m = re.match(r'(\d+) (.+)', l.strip())
        if m: out += [m.group(2)] * int(m.group(1))
    return out
def card(n):
    r = con.execute('select type_line, cmc, mana_cost from cards where name=? limit 1', (n,)).fetchone()
    if not r: raise SystemExit(f'not in DB: {n}')
    return r
ROLE = {
 'ramp': "Nyx Lotus|Etherium Sculptor|Urza, Lord High Artificer|Sol Ring|Arcane Signet|Everflowing Chalice|Pentad Prism|Fellwar Stone|Ornithopter of Paradise|Steelswarm Operator|Enthusiastic Mechanaut|Astral Cornucopia|Solar Array|All-Fates Scroll|Bender's Waterskin|Empowered Autogenerator|Crystalline Crawler|The Eternity Elevator|Cloud Key|Uthros Psionicist|Zookeeper Mechan",
 'draw': "Reverse Engineer|Insight Engine|Fact or Fiction|Jhoira, Weatherlight Captain|Uthros Research Craft|Thirst for Knowledge|Tezzeret's Gambit|Thought Monitor|Pull from Tomorrow|Universal Surveillance|Experimental Augury|Etched Oracle|Mindless Automaton|Mishra's Bauble|Winternight Stories",
 'removal': "Swords to Plowshares|Rapid Hybridization|Dispatch|Bovine Intervention|Sheltered by Ghosts|Lux Cannon|Angel of the Ruins|Tractor Beam|Abrade|Chaos Warp|Generous Gift",
 'counter': "Counterspell|Swan Song|Three Steps Ahead|Negate",
 'wipe': "Cyclonic Rift|Final Showdown|The Echoverse Fulcrum|Organic Extinction|Fumigate|Chain Reaction",
 'protection': "Ripples of Potential|Resourceful Defense|Boros Charm",
 'engine': "Panharmonicon|Kilo, Apogee Mind|Surge Conductor|Tekuthal, Inquiry Dominus|Deepglow Skate|Moxite Refinery|Steel Overseer|Iron Spider, Stark Upgrade|Patrolling Peacemaker|Contagion Clasp|Expansion Algorithm|Lost Jitte|Coretapper|Thrummingbird",
 'payoff': "All That Glitters|Cyberdrive Awakener|Depthshaker Titan|Alibou, Ancient Witness|Darksteel Reactor|Lux Artillery|Titan Forge|Gavel of the Righteous|Kappa Cannoneer|Threefold Thunderhulk|Pinnacle Emissary|Phyrexian Metamorph|Tezzeret, Cruel Captain|Bygone Colossus|Traxos, Scourge of Kroog|Golem Foundry|Hangarback Walker|Craterclaw Colossus|Saheeli, Jewel of Avishkar|Improvised Arsenal|Lasting Tarfire|Chandra, Spark Hunter|Blade Historian",
 'recursion/utility': "Wake the Past|Emry, Lurker of the Loch|Soul-Guide Lantern",
}
ROLE = {k: set(v.split('|')) for k, v in ROLE.items()}
CHEAP = ROLE['ramp'] | ROLE['draw']
EFF = {'Bygone Colossus': 3, 'Thought Monitor': 3, 'Organic Extinction': 5, 'Kappa Cannoneer': 3, 'Emry, Lurker of the Loch': 1, 'Pinnacle Emissary': 3}
TAPPED = set("Secluded Steppe|Lonely Sandbar|Mystic Monastery|Glittering Massif|Irrigated Farmland|Temple of Enlightenment|Temple of Epiphany|Temple of Triumph|Silverbluff Bridge|Razortide Bridge|Rustvale Bridge|Evolving Wilds|Path of Ancestry".split('|'))
SRC = {'Island':'U','Mountain':'R','Plains':'W','Great Furnace':'R','Seat of the Synod':'U','Ancient Den':'W','Secluded Steppe':'W','Lonely Sandbar':'U',
 'Battlefield Forge':'RW','Adarkar Wastes':'WU','Shivan Reef':'UR','Mystic Monastery':'URW','Glittering Massif':'RW','Irrigated Farmland':'WU','Glacial Fortress':'WU',
 'Sulfur Falls':'UR','Clifftop Retreat':'RW','Cascade Bluffs':'UR','Rugged Prairie':'RW','Skycloud Expanse':'WU','Temple of Enlightenment':'WU','Temple of Epiphany':'UR',
 'Temple of Triumph':'RW','Silverbluff Bridge':'UR','Razortide Bridge':'WU','Rustvale Bridge':'RW','Sacred Foundry':'RW','Radiant Summit':'RW','Command Tower':'URW',
 'Exotic Orchard':'URW','Inspiring Vantage':'RW','Spire of Industry':'URW','The Mycosynth Gardens':'URW','Evolving Wilds':'URW','Fabled Passage':'URW','Path of Ancestry':'URW','Sink into Stupor // Soporific Springs':'U'}
# honest weights: filters/{1}-lands need other mana; fetches find one basic (Karsten 2/3 for 3 colours); Orchard 3/4
W8 = {'The Mycosynth Gardens':0.5,'Skycloud Expanse':0.5,'Cascade Bluffs':0.75,'Rugged Prairie':0.75,'Evolving Wilds':0.67,'Fabled Passage':0.67,'Exotic Orchard':0.75,'Spire of Industry':0.75}
ROCK = {'Nyx Lotus':('URW',.5),'Arcane Signet':('URW',.75),'Fellwar Stone':('URW',.5),'Ornithopter of Paradise':('URW',.5),'Pentad Prism':('URW',.75),'Solar Array':('URW',.75),'All-Fates Scroll':('URW',.75),
 "Bender's Waterskin":('URW',.75),'Astral Cornucopia':('URW',.75),'Crystalline Crawler':('URW',.5),'Empowered Autogenerator':('URW',.75),'Steelswarm Operator':('U',.5),'Zookeeper Mechan':('R',.5)}
def report(p):
    d = load(p); cmdr = d[0]; rest = d[1:]
    info = {n: card(n) for n in set(d)}
    lands = [n for n in rest if 'Land' in info[n][0]]
    nl = [n for n in rest if 'Land' not in info[n][0]]
    mv = [info[n][1] for n in nl]; emv = [EFF.get(n, info[n][1]) for n in nl]
    avg, eavg = sum(mv)/len(mv), sum(emv)/len(emv)
    cheap = [n for n in nl if n in CHEAP and info[n][1] <= 2]
    src = {c: 0.0 for c in 'URW'}; rsrc = {c: 0.0 for c in 'URW'}
    for n in lands:
        for c in SRC.get(n, ''): src[c] += W8.get(n, 1)
    for n in nl:
        if n in ROCK:
            for c in ROCK[n][0]: rsrc[c] += ROCK[n][1]
    pips = {c: sum(info[n][2].count('{'+c+'}') + info[n][2].count('{'+c+'/P}') for n in nl) for c in 'URW'}
    art = [n for n in nl if 'Artifact' in info[n][0]]
    acre = [n for n in art if 'Creature' in info[n][0]]
    alands = [n for n in lands if 'Artifact' in info[n][0]]
    print(f'== {p}: {len(d)} cards, cmdr {cmdr}')
    print(f'lands {len(lands)} (tapped {sum(n in TAPPED for n in lands)}, basics {sum(n in ("Island","Mountain","Plains") for n in lands)}, colourless-only {sum(not SRC.get(n) for n in lands)})')
    print('land sources (honest) ' + ' '.join(f'{c} {src[c]:.1f}' for c in 'URW') + ' | rock/dork sources (Karsten weights) ' + ' '.join(f'{c} {rsrc[c]:.1f}' for c in 'URW'))
    print('nonland pips ' + ' '.join(f'{c} {pips[c]}' for c in 'URW'))
    print(f'nonland {len(nl)}: avg MV {avg:.2f} (effective {eavg:.2f}); cheap ramp/draw MV<=2: {len(cheap)} {cheap}')
    for a, lab in ((avg, 'nominal'), (eavg, 'effective')):
        print(f'Karsten regression ({lab}): 31.42 + 3.13*{a:.2f} - 0.28*{len(cheap)} = {31.42 + 3.13*a - 0.28*len(cheap):.1f}')
    print(f'artifacts: nonland {len(art)} (creatures {len(acre)}, noncreature {len(art)-len(acre)}), artifact lands {len(alands)}; historic-ish nonland {sum(("Artifact" in info[n][0]) or ("Legendary" in info[n][0]) for n in nl)}')
    for r, s in ROLE.items():
        print(f'  {r}: {sum(n in s for n in nl)}')
    print('  unroled: ', [n for n in nl if not any(n in s for s in ROLE.values())])
if __name__ == "__main__":
    for p in sys.argv[1:]: report(p)
