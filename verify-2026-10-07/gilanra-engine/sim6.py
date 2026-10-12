"""sim6 (gilanra-engine): sim5 + Gilanra-draw / Alena-chain / 6+ cast metrics, main phase 2 after attack-trigger mana
(Shriekwood untap, Ventmaw, Sakiko), Studious First-Year, Lumra, Realm Seekers, more dorks. Literal flood = > 8 lands seen by T8.
Gruul goldfish for three lists (Gilanra + Alena current, Bumi current, the new list). Extends alena-gilanra/sim4.py.
Pod model: draw on T1, first mulligan free, then London. Keep 7 = 3-5 lands, or 2 lands + an MV<=2 ramp piece (rock, dork,
land-ramp spell); keep 6 = 2-5 lands; keep 5. Mana units R / G / A (R or G) / C / Gil (Gilanra's G: a 6+ MV spell paid with it draws).
Commanders are found by name. Alena taps for R = greatest power that entered this turn (from her 2nd turn), only when the
pool runs dry. Land creatures (earthbend) are held for combat and tapped for mana only when a spell needs them.
Combat (goldfish, no blockers, every point to ONE opponent, 40 life): every untapped non-dork creature that is not summoning
sick (or has haste) attacks. Modelled: haste (Cyclops/Smellerbee/Samut team, Surrak/Halana one creature, earthbend lands),
double strike (Toph on land creatures, Avatar of Slaughter, Temur Battle Rage), pumps (Thunderfoot lieutenant, Pyrewood ETB,
Domri, Bumi Eclectic, Germination Practicum, Bulk Up, Haste Magic, Fists, Tale of Katara, Mightform), extra combats (Moraug per
main-phase landfall; Bumi: when he connects, lands untap and land creatures attack again, then main 2 has land mana again),
direct damage (Terror, Warstorm, Burning Sun, Drakuseth 4, Myojin 7, Backwoods 1, Fling when lethal).
Not modelled: blockers, removal, opponents' cards (Etali's), Hideous Taskmaster theft, Owlbear Cub before T8.
Run: py sim5.py <list.txt> [...] [--games N] [--lands +-N]
"""
import os, random, re, sqlite3, statistics, sys
from collections import Counter

DB = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
CMDRS = {'Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper', 'Bumi, Unleashed'}
GIL, ALENA, BUMI = 'Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper', 'Bumi, Unleashed'

# land: (units, enters tapped, special)
LANDS = {
    'Forest': (['G'], False, 'F'), 'Mountain': (['R'], False, 'M'), 'Command Tower': (['A'], False, None),
    'Spinerock Knoll': (['R'], True, None), 'Gruul Turf': (['R', 'G'], True, 'turf'), 'Sheltered Thicket': (['A'], True, 'thicket'),
    'Fabled Passage': ([], False, 'passage'), 'Evolving Wilds': ([], False, 'wilds'), 'Terramorphic Expanse': ([], False, 'wilds'),
    'Riveteers Overlook': ([], False, 'wilds'), 'Diamond City': (['C'], False, None), 'Ash Barrens': (['C'], False, None),
    'Bristling Backwoods': (['A'], True, 'backwoods'), 'Tangled Vale': (['G'], True, None), 'Konstrari Annex': (['A'], True, None),
    'Ba Sing Se': (['G'], False, 'basingse'), 'Crawling Barrens': (['C'], False, None), 'Cryptic Caves': (['C'], False, None),
    'Lotus Field': (['A', 'A', 'A'], True, 'lotus'), 'Omashu City': (['A'], True, None), "Rogue's Passage": (['C'], False, None),
    'Rumble Arena': (['C'], False, None), 'Savage Mansion': (['A'], True, None), 'Strip Mine': (['C'], False, None),
    'Horizon of Progress': (['A'], False, None), 'Sapseep Forest': (['G'], True, None), 'Path of Ancestry': (['A'], True, None),
    'Exotic Orchard': (['A'], False, None), 'Oran-Rief, the Vastwood': (['G'], True, None), 'Hidden Nursery': (['G'], True, None),
    'Lair of the Hydra': (['G'], False, None), 'Opal Palace': (['C'], False, None), 'Mirage Mesa': (['A'], True, None),
    'Tarnation Vista': (['A'], True, None), 'Yavimaya, Cradle of Growth': (['G'], False, None),
    'Sheltering Landscape': ([], False, 'wilds'), 'Tranquil Landscape': ([], False, 'wildsF'), 'Twisted Landscape': ([], False, 'wilds'),
}
SINKS = {'Planetarium of Wan Shi Tong', 'Ba Sing Se', 'Crawling Barrens', 'Cryptic Caves', 'Omashu City', "Rogue's Passage",
         'Savage Mansion', 'Spearbreaker Behemoth', 'Hoard-Smelter Dragon', 'Rockalanche', 'Bulk Up', 'Bitter Work',
         'Lumbering Worldwagon', 'Sheltered Thicket', 'Garruk, Caller of Beasts', 'Hydra Broodmaster', 'Gruul Locket', 'Realm Seekers'}
TAG = {
    'Sol Ring': 'rock:CC', 'Arcane Signet': 'rock:A', 'Talisman of Impulse': 'rock:A', "Commander's Sphere": 'rock:A',
    'Tablet of Discovery': 'rock:R', 'Llanowar Elves': 'dork:G', 'Elvish Mystic': 'dork:G', 'Elvish Aberration': 'dork:GGG',
    'Frog Butler': 'dork:A', 'Sage of the Maze': 'dork:AA', 'Paradise Druid': 'dork:A', 'Ilysian Caryatid': 'dork:car', 'Spider Manifestation': 'dork:spider',
    'Tangled Florahedron // Tangled Vale': 'dork:G', 'Ruby, Daring Tracker': 'dork:A', 'Selvala, Heart of the Wilds': 'selvala',
    "Nature's Lore": 'lore', 'Three Visits': 'lore', 'Farseek': 'farseek', 'Rampant Growth': 'growth', 'Shared Roots': 'growth',
    'Cultivate': 'cultivate', 'Skyshroud Claim': 'claim', 'Circuitous Route': 'route', 'Roiling Regrowth': 'regrowth',
    'Planar Engineering': 'planar', 'Traverse the Outlands': 'traverse', 'Earthbender Ascension': 'ascension',
    'Lumbering Worldwagon': 'worldwagon', 'Tireless Provisioner': 'provisioner', 'Explore': 'explore', 'Bushwhack': 'bushwhack',
    'Heartbeat of Spring': 'heartbeat', 'Outcaster Trailblazer': 'trailblazer', "Master's Guidance": 'mg',
    "Garruk's Packleader": 'packleader', 'Soul of the Harvest': 'soul', 'Primordial Sage': 'sage',
    'The Legend of Kyoshi': 'kyoshi', 'Garruk, Caller of Beasts': 'garruk', 'Combustible Gearhulk': 'draw3',
    'Regal Behemoth': 'regal', 'Dawnglade Regent': 'monarch', 'Monstrous Vortex': 'vortex', 'Boarding Party': 'cascade',
    'Sweet-Gum Recluse': 'cascade', 'Aurora Phoenix': 'cascade', 'Trumpeting Carnosaur': 'discover5',
    'Planetarium of Wan Shi Tong': 'planetarium', 'Vastlands Scavenger': 'bind', 'Ulvenwald Hydra': 'hydra',
    'Oblivion Sower': 'sower', 'Ghalta, Primal Hunger': 'ghalta', 'Slinza, the Spiked Stampede': 'slinza',
    'Rampaging Baloths': 'baloths', 'Cream of the Crop': 'cream', 'Harmonize': 'draw3', 'Shamanic Revelation': 'shamanic',
    'Slavering Branchsnapper': 'fcycle', 'Saber-Tooth Moose-Lion': 'fcycle', 'Spinewoods Armadillo': 'bcycle',
    'Topiary Panther': 'bcycle', 'Bitter Work': 'bitter', 'Ohran Frostfang': 'ohran', 'Smellerbee, Rebel Fighter': 'smellerbee',
    'Spry and Mighty': 'spry', "Hunter's Insight": 'insight', 'Braulios of Pheres Band': 'braulios', 'Seize the Spoils': 'loot2',
    'Thrill of Possibility': 'loot2', 'Faithless Looting': 'loot0', 'Summon: G.F. Ifrit': 'ifrit', 'Cryptic Caves': None,
    'Badgermole': 'eb:2', 'Earth Kingdom General': 'eb:2', 'Toph, the Blind Bandit': 'eb:2', 'Bumi, Eclectic Earthbender': 'eb:1',
    'Solid Ground': 'eb:3', 'Bumi, Unleashed': 'eb:4', 'Toph, Greatest Earthbender': 'eb:4', 'Cracked Earth Technique': 'eb2:3',
    'Rockalanche': 'rockalanche', 'Awakening of Vitu-Ghazi': 'eb:9', 'Avatar Kyoshi, Earthbender': 'avatark',
    'Germination Practicum': 'germination', 'Seismic Tutelage': 'tutelage', 'Crystalline Armor': 'armor',
    'Tale of Katara and Toph': 'tale', 'Bulk Up': 'pump:double', 'Temur Battle Rage': 'pump:ds', 'Haste Magic': 'pump:haste',
    'Fists of Flame': 'pump:fists', 'Mightform Harmonizer': 'mightform', 'Flopsie, Bumi\'s Buddy': 'flopsie',
    'Halana and Alena, Partners': 'halana', 'The Earth King': 'earthking', 'Cyclops of Eternal Fury': 'teamhaste',
    'Samut, Tyrant Smasher': 'teamhaste', 'Surrak, the Hunt Caller': 'surrak', 'Thunderfoot Baloth': 'thunderfoot',
    'Pyrewood Gearhulk': 'pyrewood', 'Domri, Anarch of Bolas': 'domri', 'Terror of the Peaks': 'terror',
    'Warstorm Surge': 'warstorm', "Burning Sun's Avatar": 'bsa', 'Drakuseth, Maw of Flames': 'drakuseth',
    'Myojin of Roaring Blades': 'myojin', 'Moraug, Fury of Akoum': 'moraug', 'Avatar of Slaughter': 'slaughter',
    'Quilled Greatwurm': 'quilled', 'Owlbear Cub': 'owlbear', 'Amarant Coral': 'plain', 'Etali, Primal Storm': 'etali',
    'Beast Within': 'hold', 'Fling': 'fling', 'Decimate': 'hold', 'Savage Smash': 'hold', 'Longstalk Brawl': 'hold',
    'The Last Agni Kai': 'hold', 'Bumi Bash': 'hold', 'Snakeskin Veil': 'hold', 'Veil of Summer': 'hold', 'Rocky Rebuke': 'hold',
    'Part in Friendship': 'plain', 'Poison Dart Frog': 'dork:A', 'Noxious Newt': 'dork:G', 'Nightshade Dryad': 'dork:A',
    'Devoted Druid': 'dork:G', 'Hardbristle Bandit': 'dork:A', 'Animal Attendant': 'dork:A', 'Orchard Strider': 'bcycle',
    'Lumra, Bellow of the Woods': 'lumra', 'Studious First-Year // Rampant Growth': 'firstyear', 'Shriekwood Devourer': 'shriek',
    'Savage Ventmaw': 'ventmaw', 'Nissa, Who Shakes the World': 'nissa', 'Channeler Initiate': 'dork:A',
    'Elvish Archdruid': 'dork:GG', 'Loot, the Nexus': 'dork:AA', 'Sakiko, Mother of Summer': 'sakiko', 'Realm Seekers': 'seekers', 'Earth Rumble': 'dead', 'Avenger of Zendikar': 'avenger', 'Apex Devastator': 'cascade4', 'Tectonic Split': 'plain', 'Yedora, Grave Gardener': 'plain',
}
POWER = {'Tangled Florahedron // Tangled Vale': 1, 'Sweet-Gum Recluse': 3, 'Conclave Sledge-Captain': 7, 'Emergent Woodwurm': 7,
         'Havoc Eater': 3, 'Bane of Progress': 2, 'Shriekwood Devourer': 7, 'Nessian Wilds Ravager': 6}
GLOBAL_HASTE = {'teamhaste', 'smellerbee'}
NOATTACK = ('dork', 'selvala')

def haste_kw(name):
    o = DB.execute("select oracle_text from cards where name = ? or name like ? limit 1", (name, name + ' // %')).fetchone()[0] or ''
    o = re.sub(r'\([^)]*\)', '', o.split('//')[0]).lower()
    return any(re.fullmatch(r'(?:[\w ]+, )*haste(?:, [\w {}]+)*', ln.strip()) for ln in o.splitlines())

def spec(name):
    base = name.split(' // ')[0]
    if name in LANDS or (base in LANDS and base != name):
        return dict(land=True, name=name)
    r = DB.execute("select mana_cost, cmc, type_line, power from cards where name = ? or name like ? limit 1", (name, name + ' // %')).fetchone()
    assert r, name
    cost, mv, tl, p = r
    front = tl.split(' // ')[0]
    if 'Land' in front and 'Creature' not in front:
        return dict(land=True, name=name)
    cost = (cost or '').split(' // ')[0]
    pips = re.findall(r'\{([^}]+)\}', cost)
    gen = sum(int(x) for x in pips if x.isdigit())
    pw = POWER.get(name, int(p) if p and str(p).isdigit() else 0)
    tag = TAG.get(name) or TAG.get(base) or ''
    return dict(land=False, name=name, gen=gen, R=pips.count('R'), G=pips.count('G'), H=sum('/' in x for x in pips),
                mv=int(mv), creature='Creature' in front, power=pw, tag=tag, beast='Beast' in front,
                haste='Creature' in front and haste_kw(name),
                threat=int(mv) >= 6 and 'Creature' in front)

def load(path, extra=0):
    names = []
    for l in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if m: names += [m.group(2).strip()] * int(m.group(1))
    cmd = [n for n in names if n in CMDRS]
    names = [n for n in names if n not in CMDRS]
    full = lambda n: n if n in LANDS else (DB.execute("select name from cards where name = ? or name like ? limit 1", (n, n + ' // %')).fetchone() or [n])[0]
    names = [full(n) for n in names]
    for i in range(abs(extra)):
        b = 'Forest' if i % 2 == 0 else 'Mountain'
        names.append(b) if extra > 0 else names.remove(b)
    return cmd, names

class Cr:  # creature on the battlefield
    __slots__ = ('n', 'base', 'cnt', 'turn', 'tapped', 'land', 'tag', 'ds', 'tmp', 'haste', 'natk')
    def __init__(s, n, base, turn, tag='', land=None, haste=False):
        s.n, s.base, s.cnt, s.turn, s.tapped, s.land, s.tag, s.ds, s.tmp, s.haste, s.natk = n, base, 0, turn, False, land, tag, False, 0, haste, 0

class Game:
    def __init__(g, cmd, names, S, rng):
        g.S, g.rng, g.cmd = S, rng, cmd
        g.lib = names[:]; rng.shuffle(g.lib)
        g.hand, g.lands, g.perm, g.crs = [], [], [], []  # lands: dict(n, units, tapped, cr)
        g.cast_t = {}; g.spells = g.extra = 0; g.flags = Counter(); g.life = 40; g.kill = None
        g.next_lands = []; g.treasure = 0; g.lands_seen = 0; g.drops = 0; g.armored = set()

    # ---------- basics
    def is_land(g, n): return g.S[n]['land'] or n == 'Tangled Florahedron // Tangled Vale'
    def cheap_ramp(g, n):
        s = g.S[n]
        return not s['land'] and s['mv'] <= 2 and s['tag'].split(':')[0] in ('rock', 'dork', 'lore', 'farseek', 'growth', 'explore', 'bushwhack', 'firstyear')
    def keepable(g, hand, size):
        L = sum(g.is_land(c) for c in hand)
        if size == 7: return 3 <= L <= 5 or (L == 2 and any(g.cheap_ramp(c) for c in hand if not g.is_land(c)))
        return size <= 5 or 2 <= L <= 5
    def mulligan(g):
        g.hand, g.lib = g.lib[:7], g.lib[7:]
        k7 = g.keepable(g.hand, 7)
        if k7: return True
        for size in (7, 6, 5):
            g.lib += g.hand; g.rng.shuffle(g.lib)
            g.hand, g.lib = g.lib[:7], g.lib[7:]
            for _ in range(7 - size):
                L = [c for c in g.hand if g.is_land(c)]
                c = L[0] if len(L) > 4 else max((c for c in g.hand if not g.is_land(c)), key=lambda c: g.S[c]['mv'], default=g.hand[0])
                g.hand.remove(c); g.lib.append(c)
            if g.keepable(g.hand, size): return False
        return False
    def draw(g, n=1, extra=True):
        for _ in range(n):
            if g.lib:
                c = g.lib.pop(0); g.hand.append(c); g.extra += extra
                if g.t <= 8 and g.is_land(c): g.lands_seen += 1
    def has(g, tag): return any(c.tag == tag for c in g.crs) or any(p[0] == tag for p in g.perm)
    def cmdr_on(g): return any(c.n in CMDRS for c in g.crs)
    def power(g, c):
        p = c.base + c.cnt + c.tmp
        if c.n == 'Toph, the Blind Bandit': p = sum(x.cnt for x in g.crs if x.land)
        if c.tag == 'hydra' or c.tag == 'braulios' or c.n == 'Lumra, Bellow of the Woods': p = len(g.lands) + c.cnt + c.tmp
        if g.has('thunderfoot') and g.cmdr_on(): p += 2
        if g.has('domri'): p += 1
        if c in g.armored: p += len(g.lands)
        return max(p, 0)
    def greatest(g): return max((g.power(c) for c in g.crs), default=0)
    def sources(g):
        return len(g.lands) + sum(1 for p in g.perm if p[0] == 'rock') + sum(1 for c in g.crs if c.tag.startswith(('dork', 'selvala')))
    def colour_need(g):
        u = [x for l in g.lands for x in l['units']]
        r = sum(1 for x in u if x in 'RA'); gg = sum(1 for x in u if x in 'GA')
        nr = max((g.S[c]['R'] for c in g.hand if not g.is_land(c)), default=0) + 1
        ng = max((g.S[c]['G'] for c in g.hand if not g.is_land(c)), default=0) + 1
        return 'R' if nr - r > ng - gg else 'G'

    # ---------- lands
    def fetch(g, kinds, tapped, to_hand=False):
        want = g.colour_need(); order = ['Mountain', 'Forest'] if want == 'R' else ['Forest', 'Mountain']
        pick = None
        if 'thicket' in kinds and 'Sheltered Thicket' in g.lib and want == 'R': pick = 'Sheltered Thicket'
        for b in order:
            if pick: break
            if (b == 'Forest' and kinds & {'forest', 'basic'}) or (b == 'Mountain' and kinds & {'mountain', 'basic'}):
                if b in g.lib: pick = b
        if not pick and 'Sheltered Thicket' in g.lib and 'thicket' in kinds: pick = 'Sheltered Thicket'
        if not pick: return False
        g.lib.remove(pick); g.rng.shuffle(g.lib)
        if to_hand: g.hand.append(pick)
        else: g.put_land(pick, tapped or LANDS[pick][1])
        return True
    def put_land(g, n, tapped):
        l = dict(n=n, units=LANDS[n][0][:], tapped=tapped, cr=None)
        g.lands.append(l)
        if tapped: g.next_lands.append(l)
        else: g.pool.update(l['units'] * (2 if g.flags['heartbeat'] else 1))
        g.landfall()
    def landfall(g):
        g.landfalls += 1
        if g.moraug_on: g.combats += 1
        for c in list(g.crs):
            if c.tag == 'baloths': g.enter('Beast token', 4, token=True)
            if c.tag == 'provisioner': g.treasure += 1
            if c.tag == 'mightform': g.mightform += 1
        if g.flags['ascension']: g.flags['quest'] += 1
        if g.has('avenger'):
            for c in g.crs:
                if c.tag == 'plant': c.cnt += 1
    def play_land(g):
        hand_l = [c for c in g.hand if g.S[c]['land']]
        mdfc = 'Tangled Florahedron // Tangled Vale' in g.hand
        if not hand_l and not mdfc: return
        if g.land_played >= 1 + g.extra_drop: return
        kind = lambda c: LANDS[c][2]
        lotus_ok = lambda c: kind(c) != 'lotus' or (len(g.lands) >= 4 and len(hand_l) == 1)
        hand_l = [c for c in hand_l if lotus_ok(c)]
        one_drop = any(g.S[c].get('mv', 9) == 1 and g.S[c]['tag'].startswith(('dork', 'rock')) for c in g.hand if not g.is_land(c))
        tapped = [c for c in hand_l if LANDS[c][1] or kind(c) in ('wilds', 'wildsF') or (kind(c) == 'passage' and len(g.lands) < 3)]
        tapped = [c for c in tapped if not (kind(c) == 'turf' and not g.lands)]
        untapped = [c for c in hand_l if c not in tapped and kind(c) != 'turf']
        want = 'M' if g.colour_need() == 'R' else 'F'
        if g.t == 1 and not one_drop and tapped: pick = tapped[0]
        elif untapped: pick = sorted(untapped, key=lambda c: (kind(c) == want, c == 'Command Tower'))[-1]
        elif tapped: pick = tapped[0]
        elif mdfc: pick = 'Tangled Florahedron // Tangled Vale'
        else: return
        g.hand.remove(pick); g.land_played += 1; g.drops += 1
        if pick.startswith('Tangled'): g.put_land('Tangled Vale', True); return
        k = kind(pick)
        if k in ('passage', 'wilds', 'wildsF'):
            g.landfall(); g.fetch({'forest'} if k == 'wildsF' else {'basic'}, True)
            if k == 'passage' and len(g.lands) >= 4 and g.lands[-1]['tapped']:
                l = g.lands[-1]; l['tapped'] = False; g.next_lands.remove(l); g.pool.update(l['units'])
            return
        if k == 'turf':
            b = next((l for l in g.lands if l['n'] in ('Forest', 'Mountain') and not l['cr']), None)
            if b: g.lands.remove(b); g.hand.append(b['n'])
        if k == 'lotus':
            for l in sorted([l for l in g.lands if not l['cr']], key=lambda l: len(l['units']))[:2]: g.lands.remove(l)
        if k == 'basingse': g.put_land(pick, not any(l['n'] in ('Forest', 'Mountain') for l in g.lands)); return
        if k == 'backwoods': g.damage(1)
        g.put_land(pick, LANDS[pick][1])

    # ---------- mana
    def pay(g, gen, R, G, H, big):
        p = g.pool.copy(); gil = False
        for _ in range(R):
            k = 'R' if p['R'] else 'A' if p['A'] else None
            if not k: return None
            p[k] -= 1
        for _ in range(G):
            k = next((k for k in (('Gil', 'G', 'A') if big else ('G', 'A', 'Gil')) if p[k]), None)
            if not k: return None
            p[k] -= 1; gil |= k == 'Gil'
        for _ in range(H):
            k = next((k for k in ('R', 'G', 'A', 'Gil') if p[k]), None)
            if not k: return None
            p[k] -= 1; gil |= k == 'Gil'
        for _ in range(gen):
            order = (['Gil'] if big and not gil else []) + ['C'] + (['R', 'G'] if p['R'] >= p['G'] else ['G', 'R']) + ['A', 'Gil']
            k = next((k for k in order if p[k]), None)
            if not k: return None
            p[k] -= 1; gil |= k == 'Gil'
        return p, gil
    def cost(g, s):
        gen = s['gen']
        if s['tag'] == 'ghalta': gen = max(0, gen - sum(g.power(c) for c in g.crs))
        if s['beast'] and g.has('slinza'): gen = max(0, gen - 2)
        return gen
    def can(g, s): return g.pay(g.cost(s), s['R'], s['G'], s['H'], s['mv'] >= 6)
    def spend(g, s):
        p, gil = g.can(s); g.pool = p
        if gil and s['mv'] >= 6:
            g.draw()
            if g.t <= 8: g.gil_draws += 1
        if s['mv'] >= 4:
            for c in g.crs:
                if c.tag == 'dork:spider' and c.tapped: g.pool['A'] += 1  # untap and tap again
    def extra_mana(g):  # one more mana source when stuck: treasure, then a land creature, then Alena / Selvala / Avatar Kyoshi
        if g.treasure: g.treasure -= 1; g.pool['A'] += 1; return True
        for c in g.crs:
            if c.tapped: continue
            if c.n == ALENA and g.cast_t.get(ALENA, 99) < g.t and g.entered:
                c.tapped = True; g.pool['R'] += g.entered; g.alena_live = True; return True
            if c.tag == 'selvala' and g.greatest() >= 3 and g.pay(0, 0, 1, 0, False):
                c.tapped = True; g.pool = g.pay(0, 0, 1, 0, False)[0]; g.pool['A'] += g.greatest(); return True
            if c.n == 'Avatar Kyoshi': c.tapped = True; g.pool['A'] += g.greatest(); return True
        return False

    # ---------- casting
    def cast(g, n, paid=True):
        s = g.S[n]
        if paid: g.spend(s)
        g.spells += 1
        if s['mv'] >= 6 and g.t <= 8: g.big += 1
        if paid and s['creature'] and g.alena_live:
            g.alena_live = False
            if g.t <= 10: g.chains.add(g.t)
        if s['creature']:
            if g.has('sage'): g.draw()
            if g.flags['vortex'] and s['power'] >= 5: g.discover(s['mv'])
        if s['tag'] == 'cascade': g.discover(s['mv'] - 1)
        if s['tag'] == 'cascade4':
            for _ in range(4): g.discover(s['mv'] - 1)
        if s['tag'] == 'sower':
            for _ in range(4):
                if g.rng.random() < 0.37: g.lands.append(dict(n='stolen', units=['C'], tapped=False, cr=None)); g.pool['C'] += 1; g.landfall()
        if s['threat'] and g.first6 is None: g.first6 = g.t
        g.resolve(n, s)
    def discover(g, x):
        seen = []
        while g.lib:
            c = g.lib.pop(0)
            if not g.is_land(c) and g.S[c]['mv'] <= x and g.S[c]['tag'] not in ('hold', 'fling'):
                g.lib += seen; g.cast(c, paid=False); return
            seen.append(c)
        g.lib += seen
    def earthbend(g, n):
        n += g.flags['solid']
        tgt = max((c for c in g.crs if c.land), key=lambda c: c.cnt, default=None)
        if tgt is None:
            free = [l for l in g.lands if not l['cr'] and l['n'] != 'Lotus Field']
            if not free: return
            l = free[0]; tgt = Cr(l['n'], 0, g.t, land=l, haste=True); l['cr'] = tgt; g.crs.append(tgt)
            if sum(g.pool.values()) > 0:  # an untapped land is animated: it leaves the pool and stays ready to attack
                for k in ('C', 'G', 'R', 'A'):
                    if g.pool[k]: g.pool[k] -= 1; break
            else: tgt.tapped = True
        tgt.cnt += n
    def enter(g, n, pw, token=False, tag='', haste=False):
        c = Cr(n, pw, g.t, tag=tag, haste=haste)
        g.crs.append(c); g.entered = max(g.entered, g.power(c))
        p = g.power(c)
        for o in g.crs[:-1]:
            t = o.tag
            if (t == 'packleader' and p >= 3) or (t == 'trailblazer' and p >= 4) or (t == 'soul' and not token): g.draw()
            if t == 'selvala' and p >= 5 and p > max((g.power(x) for x in g.crs[:-1] if x is not o), default=0): g.draw()
            if t == 'terror': g.damage(p)
        if g.has('warstorm'): g.damage(p)
        for _ in range(g.flags['cream']):
            top = g.lib[:p]
            if top:
                want = sum(g.is_land(x) for x in g.hand) == 0 and len(g.lands) < 7
                best = max(top, key=lambda x: (g.is_land(x) == want, g.S[x].get('mv', 0) if not g.is_land(x) else 0))
                g.lib.remove(best); g.lib.insert(0, best)
        return c
    def resolve(g, n, s):
        tag = s['tag']; kind = tag.split(':')[0]
        if n == 'Solid Ground': g.flags['solid'] = 1
        if n in SINKS: g.flags['sink'] = 1
        if s['creature']:
            c = g.enter(n, 12 + len(g.hand) if tag == 'seekers' else s['power'], tag=tag, haste=s['haste'])
            if tag == 'trailblazer': g.pool['A'] += 1
            if tag == 'thunderfoot' or tag == 'pyrewood': pass
            if tag == 'pyrewood':
                for o in g.crs:
                    if o is not c: o.tmp += 2
        if kind == 'rock': g.perm.append(['rock', list(tag.split(':')[1])]); g.pool.update(tag.split(':')[1])
        elif kind == 'dork' and n == 'Ruby, Daring Tracker': g.pool['A'] += 1; g.crs[-1].tapped = True
        elif tag == 'lore': g.fetch({'forest', 'thicket'}, False)
        elif tag == 'farseek': g.fetch({'mountain', 'thicket'}, True)
        elif tag == 'growth': g.fetch({'basic'}, True)
        elif tag == 'cultivate': g.fetch({'basic'}, True); g.fetch({'basic'}, False, to_hand=True)
        elif tag == 'claim': g.fetch({'forest', 'thicket'}, False); g.fetch({'forest', 'thicket'}, False)
        elif tag == 'route': g.fetch({'basic'}, True); g.fetch({'basic'}, True)
        elif tag == 'regrowth':
            l = next((l for l in g.lands if not l['cr'] and l['tapped'] is False), None)
            if l: g.lands.remove(l)
            g.fetch({'basic'}, True); g.fetch({'basic'}, True)
        elif tag == 'planar':
            for l in sorted([l for l in g.lands if not l['cr']], key=lambda l: len(l['units']))[:2]: g.lands.remove(l)
            for _ in range(4): g.fetch({'basic'}, True)
        elif tag == 'traverse':
            for _ in range(g.greatest()): g.fetch({'basic'}, True)
        elif tag == 'hydra': g.fetch({'thicket', 'basic'}, True)
        elif tag == 'ascension': g.flags['ascension'] = 1; g.earthbend(2); g.fetch({'basic'}, True)
        elif tag == 'worldwagon': g.fetch({'basic'}, True)
        elif tag == 'explore': g.draw(); g.extra_drop += 1; g.play_land()
        elif tag == 'bushwhack': g.fetch({'basic'}, False, to_hand=True); g.play_land()
        elif tag == 'heartbeat': g.flags['heartbeat'] = 1
        elif tag == 'lumra':
            top, g.lib = g.lib[:4], g.lib[4:]
            for x in top:
                if g.S[x]['land']: g.put_land(x, True)
                elif x.startswith('Tangled'): g.put_land('Tangled Vale', True)
        elif tag == 'firstyear': g.flags['growth_ready'] += 1
        elif tag == 'mg': g.flags['mg'] += 1
        elif tag == 'bitter': g.flags['bitter'] += 1; g.flags['exhaust'] += 1
        elif tag == 'kyoshi': g.draw(g.greatest()); g.kyoshi = g.t
        elif tag == 'garruk': g.flags['garruk'] = 1; g.garruk_plus()
        elif tag == 'draw3': g.draw(3)
        elif tag in ('regal', 'monarch'): g.flags['monarch'] = 1; g.flags['regal'] |= tag == 'regal'
        elif tag == 'vortex': g.flags['vortex'] = 1
        elif tag == 'discover5': g.discover(5)
        elif tag == 'planetarium': g.flags['planet'] = 1
        elif tag == 'bind': g.flags['bind'] += 1
        elif tag == 'cream': g.flags['cream'] += 1
        elif tag == 'shamanic': g.draw(len(g.crs))
        elif tag == 'loot2': g.draw(2); g.discard(1)
        elif tag == 'loot0': g.draw(2); g.discard(2)
        elif tag == 'ifrit': g.flags['ifrit'] = g.t
        elif tag == 'spry':
            ps = sorted(g.power(c) for c in g.crs)
            if len(ps) >= 2:
                x = ps[-1] - ps[0]; g.draw(x)
                for c in g.crs:
                    if g.power(c) in (ps[-1], ps[0]): c.tmp += x
        elif tag == 'insight': g.flags['insight'] = 1
        elif kind == 'eb': g.earthbend(int(tag.split(':')[1]))
        elif kind == 'eb2': g.earthbend(3); g.earthbend(3)
        elif tag == 'rockalanche': g.earthbend(sum(1 for l in g.lands if l['n'] == 'Forest'))
        elif tag == 'solid_placeholder': pass
        elif tag == 'germination': g.flags['germ'] = g.t; g.counters_all(2)
        elif tag == 'tutelage': g.flags['tutelage'] = 1
        elif tag == 'armor':
            t = max(g.crs, key=g.power, default=None)
            if t: g.armored.add(t)
        elif tag == 'tale': g.flags['tale'] = 1
        elif tag == 'halana': g.flags['halana'] += 1
        elif tag == 'earthking': g.enter('Bear token', 4, token=True)
        elif tag == 'avenger':
            for _ in range(len(g.lands)): g.enter('Plant token', 0, token=True, tag='plant')
        elif tag == 'flopsie': g.counters_all(1)
        elif tag == 'bsa': g.damage(3)
        elif tag == 'myojin': g.damage(7)
        elif tag == 'domri': g.perm.append(['rock', ['A']]); g.pool['A'] += 1; g.perm.append(['domri', []])
        elif tag == 'warstorm': g.perm.append(['warstorm', []])
        elif tag == 'nissa': g.perm.append(['nissa', []])
        elif tag == 'teamhaste' and not s['creature']: g.perm.append(['teamhaste', []])
        elif kind == 'pump': g.pumps.append(tag.split(':')[1])
        if n == 'Solid Ground': g.flags['solid'] = 1
        if n == 'Toph, Greatest Earthbender': g.flags['toph'] = 1
    def counters_all(g, k):
        for c in g.crs:
            c.cnt += k + (g.flags['solid'] if True else 0)
    def discard(g, k):
        for _ in range(k):
            if not g.hand: return
            L = [c for c in g.hand if g.is_land(c)]
            c = L[0] if L and (len(L) >= 2 or len(g.lands) >= 7) else max(g.hand, key=lambda c: g.S[c].get('mv', 0) if not g.is_land(c) else -1)
            g.hand.remove(c)
    def to_hand(g, k, ok):
        top, g.lib = g.lib[:k], g.lib[k:]
        hits = [c for c in top if ok(c)]
        for c in hits: g.hand.append(c); g.extra += 1
        g.lib += [c for c in top if c not in hits]
    def garruk_plus(g): g.to_hand(5, lambda c: not g.is_land(c) and g.S[c]['creature'])
    def damage(g, n):
        g.life -= n
        if g.life <= 0 and g.kill is None: g.kill = g.t

    # ---------- turn
    def priority(g, n):
        s = g.S[n]; t = g.t; tag = s['tag']; kind = tag.split(':')[0]; early = t <= 4
        if tag in ('hold', 'fling'): return 60
        if kind == 'pump': return 55
        if n == 'Sol Ring': return 1000
        if s['mv'] <= 2 and kind in ('rock', 'dork', 'lore', 'farseek', 'growth', 'explore', 'bushwhack', 'cream', 'loot0', 'loot2'):
            return 900 if early else 300
        if kind in ('rock', 'selvala', 'cultivate', 'claim', 'planar', 'dork', 'route', 'regrowth', 'ascension', 'worldwagon',
                    'provisioner', 'heartbeat', 'earthking', 'bitter', 'mg', 'trailblazer', 'smellerbee', 'halana') and s['mv'] <= 4:
            return 800 if early else 400
        if tag == 'traverse': return 560 if g.greatest() >= 5 else 90
        if s['mv'] >= 5 or s['creature'] and s['power'] >= 5:
            return 600 + s['mv'] + 20 * (tag in ('soul', 'sage', 'kyoshi', 'garruk', 'packleader', 'vortex'))
        return 100 + s['mv']
    def turn(g, t):
        g.t = t; g.entered = 0; g.extra_drop = 0; g.land_played = 0; g.landfalls = 0; g.combats = 1; g.mightform = 0
        g.pumps = []; g.alena_live = False; g.post = Counter()
        for l in g.next_lands: l['tapped'] = False
        g.next_lands = []
        for c in g.crs: c.tapped = False; c.tmp = 0; c.ds = False; c.natk = 0
        g.moraug_on = g.has('moraug')
        g.draw(extra=False)
        if g.kyoshi and t - g.kyoshi == 1: g.earthbend(len(g.hand))
        if g.kyoshi and t - g.kyoshi == 2: g.crs.append(Cr('Avatar Kyoshi', 0, t)); g.crs[-1].tag = 'kyoshiav'
        if g.flags['ifrit'] and t - g.flags['ifrit'] in (1,): g.draw(); g.discard(1)
        g.pool = Counter()
        mult = 2 if g.flags['heartbeat'] else 1
        for l in g.lands:
            if l['tapped'] or l['cr']: continue
            g.pool.update(l['units'] * mult + (['A'] * len(l['units']) if g.flags['regal'] else []))
        for p in g.perm: g.pool.update(p[1])
        if g.has('nissa'):
            fl = [l for l in g.lands if l['n'] in ('Forest', 'Sheltered Thicket', 'Sapseep Forest') and not l['cr']]
            g.pool['G'] += len(fl) + (2 if fl else 0)
        if g.flags['ifrit'] and t - g.flags['ifrit'] in (2, 3): g.pool['R'] += 1
        for c in g.crs:
            if c.tag.startswith('dork'):
                c.tapped = True
                g.pool.update('AA' if c.tag == 'dork:car' and g.greatest() >= 4 else 'A' if c.tag in ('dork:car', 'dork:spider') else c.tag.split(':')[1])
            if c.n == GIL: c.tapped = True; g.pool['Gil'] += 1
        if g.flags['germ'] and g.flags['germ'] < t: g.counters_all(2); g.spells += 1
        g.play_land()
        if g.flags['planet'] and sum(g.pool.values()) >= 1: g.planetarium()
        if g.flags['garruk']: g.garruk_plus()
        g.main()
        g.combat()
        if g.post:  # Shriekwood untapped lands / Ventmaw / Sakiko: main phase 2
            g.pool.update(g.post); g.main()
        if g.bumi_hit:  # Bumi untapped all lands: main phase 2 with land mana again (land creatures attacked again)
            g.pool = Counter()
            for l in g.lands:
                if not l['cr']: l['tapped'] = False; g.pool.update(l['units'] * mult)
            g.main()
        if g.flags['mg'] and g.greatest() >= 4: g.draw(g.flags['mg'])
        if g.flags['monarch']: g.draw()
        # Fling when lethal
        if 'Fling' in g.hand and g.crs and g.kill is None and g.pay(2, 1, 0, 0, False):
            if max(g.power(c) for c in g.crs) >= g.life: g.hand.remove('Fling'); g.damage(g.life)
    def main(g):
        while True:
            if g.land_played < 1 + g.extra_drop and not any(g.is_land(c) for c in g.hand) and g.t <= 7:
                for c in [c for c in g.hand if g.S[c]['tag'] in ('fcycle', 'bcycle') or c == 'Elvish Aberration']:
                    q = g.pay(2, 0, 0, 0, False) if g.S[c]['tag'] != 'bcycle' else g.pay(1, 0, 1, 0, False)
                    if q:
                        g.pool = q[0]; g.hand.remove(c)
                        g.fetch({'forest', 'thicket'} if g.S[c]['tag'] != 'bcycle' else {'basic'}, False, to_hand=True); g.play_land(); break
            cands = [c for c in set(g.hand) if not g.is_land(c) or c == 'Tangled Florahedron // Tangled Vale']
            cands = [c for c in cands if not (g.S[c]['tag'] in ('hold', 'fling') and g.t < 4) and g.S[c]['tag'] not in ('fling', 'dead')]
            cands = [c for c in cands if not (g.S[c]['tag'].startswith('pump') and not g.attackers())]
            opts = [(g.priority(c), c) for c in cands if g.can(g.S[c])]
            for cm in g.cmd:
                if cm not in g.cast_t and g.can(g.S[cm]):
                    if cm == ALENA and sum(g.pool.values()) < 5: continue
                    opts.append((950, cm))  # commanders first whenever castable (same policy for every list)
            if g.flags['growth_ready'] and g.pay(1, 0, 1, 0, False): opts.append((890 if g.t <= 4 else 300, 'GROWTH'))
            if g.flags['bind'] and g.pay(4, 0, 1, 0, False): opts.append((700 if g.t <= 4 else 595, 'BIND'))
            if g.flags['exhaust'] and g.pay(4, 0, 0, 0, False) and g.t >= 5: opts.append((58, 'EXHAUST'))
            if any(l['n'] == 'Ba Sing Se' and not l['tapped'] and not l['cr'] for l in g.lands) and g.pay(2, 0, 1, 0, False) and g.t >= 4:
                opts.append((57, 'BASINGSE'))
            if opts:
                _, c = max(opts)
                if c == 'BIND':
                    g.pool = g.pay(4, 0, 1, 0, False)[0]; g.flags['bind'] -= 1; g.spells += 1
                    top, g.lib = g.lib[:7], g.lib[7:]
                    cr = [x for x in top if not g.is_land(x) and g.S[x]['creature']]
                    if cr: b = max(cr, key=lambda x: g.S[x]['power']); g.resolve(b, g.S[b]); g.first6 = g.first6 or (g.t if g.S[b]['threat'] else None)
                    continue
                if c == 'GROWTH':
                    g.pool = g.pay(1, 0, 1, 0, False)[0]; g.flags['growth_ready'] -= 1; g.spells += 1; g.fetch({'basic'}, True); continue
                if c == 'EXHAUST': g.pool = g.pay(4, 0, 0, 0, False)[0]; g.flags['exhaust'] = 0; g.earthbend(4); continue
                if c == 'BASINGSE':
                    g.pool = g.pay(2, 0, 1, 0, False)[0]
                    l = next(l for l in g.lands if l['n'] == 'Ba Sing Se' and not l['cr']); l['tapped'] = True; g.next_lands.append(l)
                    g.earthbend(2); continue
                if c in g.cmd:
                    s = g.S[c]; g.spend(s); g.spells += 1; g.cast_t[c] = g.t
                    cr = g.enter(c, s['power'], tag=s['tag'], haste=False)
                    if c == BUMI: g.earthbend(4)
                    continue
                g.hand.remove(c); g.cast(c); continue
            if not g.extra_mana(): break
    def planetarium(g):
        p = g.pay(1, 0, 0, 0, False)
        if not p: return
        g.pool = p[0]
        top = g.lib[:2]
        want = sum(g.is_land(c) for c in g.hand) == 0 and len(g.lands) < 7
        keep = [c for c in top if not g.is_land(c) or want]
        g.lib = keep + g.lib[2:] + [c for c in top if c not in keep]
        if g.lib and not g.is_land(g.lib[0]) and g.S[g.lib[0]]['tag'] not in ('hold', 'fling'):
            c = g.lib.pop(0); g.cast(c, paid=False)
    def can_attack(g, c):
        if c.tapped or c.n == GIL or c.tag.startswith(NOATTACK): return False
        if c.n in ('Hornet Nest',): return False
        if c.land and c.cnt <= 0: return False
        if c.turn < g.t or c.haste or c.land: return True
        if any(o.tag in GLOBAL_HASTE and (o.tag == 'teamhaste' or o is not c) for o in g.crs) or any(p[0] == 'teamhaste' for p in g.perm): return True
        return False
    def attackers(g): return [c for c in g.crs if g.can_attack(c)]
    def combat(g):
        g.bumi_hit = False
        if g.kyoshi_av_combat(): pass
        # beginning of combat: Halana (+2 counters & haste on the biggest sick/new creature), Surrak (haste if power >= 8)
        sick = [c for c in g.crs if not g.can_attack(c) and not c.tapped and c.n != GIL and not c.tag.startswith(NOATTACK)]
        for _ in range(g.flags['halana']):
            tgt = max(sick or g.attackers(), key=g.power, default=None)
            if tgt: tgt.cnt += 2 + g.flags['solid']; tgt.haste = True
        if g.has('surrak') and sum(g.power(c) for c in g.crs) >= 8 and sick:
            max(sick, key=g.power).haste = True
        atk = g.attackers()
        if not atk: return
        if g.mightform:
            for _ in range(g.mightform): b = max(atk, key=g.power); b.tmp += g.power(b)
        for p in g.pumps:
            b = max(atk, key=g.power)
            if p == 'double': b.tmp += g.power(b)
            elif p == 'ds': b.ds = True
            elif p == 'haste': b.tmp += 3
            elif p == 'fists': g.draw(); b.tmp += 2
        if g.flags['insight']:
            g.draw(max(g.power(c) for c in atk)); g.flags['insight'] = 0
        slaughter = g.has('slaughter')
        n = 0
        while n < g.combats:
            n += 1
            atk = g.attackers()
            if not atk: break
            g.attack(atk, n, slaughter)
            if any(c.n == BUMI for c in atk):  # untap all lands; extra combat, land creatures only
                g.bumi_hit = True
                lc = [c for c in g.crs if c.land and c.cnt > 0]
                for c in lc: c.tapped = False
                if lc: g.attack(lc, n, slaughter, bumi=True)
            if n < g.combats:
                for c in g.crs: c.tapped = False  # Moraug: untap all creatures at the extra combat
    def bumi_trigger(g, atk): return any(c.n == BUMI for c in atk)
    def kyoshi_av_combat(g):
        if any(c.n == 'Avatar Kyoshi, Earthbender' for c in g.crs): g.earthbend(8)
        return False
    def attack(g, atk, k, slaughter, bumi=False):
        dmg = 0
        if g.flags['tale']:
            for c in atk:
                if c.natk == 0: c.cnt += 1 + g.flags['solid']
        for c in atk:
            if c.tag == 'eclectic' or c.n == 'Bumi, Eclectic Earthbender':
                for x in g.crs:
                    if x.land: x.cnt += 2 + g.flags['solid']
        if g.flags['tutelage']:
            b = max(atk, key=lambda c: c.cnt); b.cnt *= 2
        for c in atk:
            c.tapped = True; c.natk += 1
            p = g.power(c) + (c.natk if g.moraug_on else 0)
            ds = slaughter or c.ds or (c.land and g.flags['toph'])
            dmg += p * (2 if ds else 1)
            if c.tag == 'drakuseth': g.damage(4)
            if c.tag == 'braulios': g.draw(); g.extra_drop += 1; g.play_land()
            if c.tag == 'quilled_grow': pass
        if g.flags['bitter'] and any(g.power(c) >= 4 for c in atk): g.draw(g.flags['bitter'])
        if g.has('shriek'):
            x = max(g.power(c) for c in atk)
            for l in [l for l in g.lands if not l['cr']][:x]: g.post.update(l['units'])
        if any(c.tag == 'ventmaw' for c in atk): g.post.update('RRRGGG')
        if g.has('sakiko'): g.post['G'] += dmg
        if g.has('ohran'): g.draw(len(atk))
        g.damage(dmg)
        for c in atk:
            if g.has('quilled'): c.cnt += g.power(c)

def play(cmd, names, S, rng, turns=14):
    g = Game(cmd, names, S, rng)
    g.first6 = None; g.kyoshi = None; g.t = 0; g.pool = Counter(); g.gil_draws = 0; g.big = 0; g.chains = set(); g.alena_live = False; g.post = Counter()
    k7 = g.mulligan()
    g.lands_seen = sum(g.is_land(c) for c in g.hand)
    out = dict(k7=k7)
    for t in range(1, turns + 1):
        g.turn(t)
        if t == 4: out['drop4'] = g.drops >= 4
        if t == 5: out['screw'] = g.sources() < 4
        if t == 8:
            out['spells'] = g.spells
            sink = any(l['n'] in SINKS for l in g.lands) or any(c.n in SINKS for c in g.crs) or any(p[0] in SINKS for p in g.perm) \
                or g.flags['planet'] or g.flags['garruk'] or g.flags['exhaust'] or g.flags['sink']
            out['flood'] = g.lands_seen > 8; out['gild'] = g.gil_draws; out['big'] = g.big
        if g.kill and t >= 10: break
    out['kill'] = g.kill or turns + 1; out['chain'] = len(g.chains)
    out['gil3'] = g.cast_t.get(GIL, 99) <= 3; out['alena5'] = g.cast_t.get(ALENA, 99) <= 5; out['bumi5'] = g.cast_t.get(BUMI, 99) <= 5
    return out

def run(path, games=20000, seed=7, extra=0):
    cmd, names = load(path, extra)
    S = {n: spec(n) for n in set(names) | set(cmd) | {'Tangled Vale', 'Forest', 'Mountain', 'Sheltered Thicket'}}
    for n in cmd: S[n]['tag'] = TAG.get(n, '')
    rng = random.Random(seed); agg = Counter(); kills = []
    for _ in range(games):
        o = play(cmd, names, S, rng)
        for k, v in o.items():
            if k != 'kill': agg[k] += v
        kills.append(o['kill'])
    f = lambda k: agg[k] / games
    L = sum(S[n]['land'] for n in names)
    cm = f"Gil T3 {f('gil3'):.3f} Alena T5 {f('alena5'):.3f}" if GIL in cmd else f"Bumi T5 {f('bumi5'):.3f}"
    kl = sorted(kills)
    print(f"{os.path.basename(path):26s} {L:2d}L | keep7 {f('k7'):.3f} | 4th land T4 {f('drop4'):.3f} | {cm} | screw {f('screw'):.3f}"
          f" | flood {f('flood'):.3f} | spells T1-8 {f('spells'):.2f} | 6+ cast T8 {f('big'):.2f} | Gil draws T8 {f('gild'):.2f} | Alena chains T10 {f('chain'):.2f} | clock median T{statistics.median(kills):.0f} mean {statistics.mean(kills):.2f}"
          f" (p25 T{kl[len(kl)//4]}, p75 T{kl[3*len(kl)//4]}, by T7 {sum(k <= 7 for k in kills)/games:.3f} T8 {sum(k <= 8 for k in kills)/games:.3f})", flush=True)

if __name__ == '__main__':
    args = sys.argv[1:]; games = 20000; extra = [0]
    if '--games' in args: i = args.index('--games'); games = int(args[i + 1]); del args[i:i + 2]
    if '--lands' in args: i = args.index('--lands'); extra = [int(x) for x in args[i + 1].split(',')]; del args[i:i + 2]
    for p in args:
        for e in extra: run(p, games, extra=e)
