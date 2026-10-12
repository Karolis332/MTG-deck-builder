"""bumi-standalone/sim.py = refute/hh.py + patch_sim.py (earthbend returns, Tectonic Split, Lair/Barrens sinks). REFUTER head-to-head build of bumi/sim.py (see refute/make_hh.py for every change). Gruul goldfish for the Bumi / Gilanra merge (2026-10-07). One engine for all three lists.
Pod model as alena-gilanra/sim4.py: draw on T1, first mulligan free, then London 6 / 5.
Keep 7: 3-5 lands, or 2 lands + an MV<=2 ramp piece. Keep 6: 2-5 lands. Keep 5.
Mana: colour units R / G / A (either) / C per source; Gilanra = G that draws when spent on a 6+ MV spell; Alena = R equal to the
greatest power among creatures that entered this turn (from her 2nd turn). Dorks are summoning-sick unless hasty.
Combat: one opponent at 40, no blockers, combat damage only. Earthbend = land becomes a 0/0 land creature with haste + N counters
(Scryfall ruling 2025-10-02). Bumi, Unleashed dealing combat damage -> untap all lands + one extra combat in which only land creatures
attack (two with double strike). Toph: land creatures have double strike. Moraug: each landfall in a main phase -> extra combat that
untaps all creatures. Tapped creatures (incl. land creatures tapped for mana) don't attack; Nissa's lands have vigilance.
Run: py sim.py <list> [...] [--games N] [--seed S]
"""
import os, random, re, sqlite3, sys, statistics
from collections import Counter, deque

DB = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
CMDRS = {'Bumi, Unleashed', 'Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper'}
EXTRA_CMDR = None  # --cmdr <name>: test another legend in the command zone
# land: units, enters tapped, kind
LANDS = {
    'Forest': ('G', 0, 'F'), 'Mountain': ('R', 0, 'M'), 'Command Tower': ('A', 0, ''), 'Rumble Arena': ('C', 0, ''),
    'Ba Sing Se': ('G', 0, 'basing'), 'Crawling Barrens': ('C', 0, ''), "Rogue's Passage": ('C', 0, ''),
    'Lair of the Hydra': ('G', 0, 'lair'), 'Sheltered Thicket': ('A', 1, 'thicket'), 'Savage Mansion': ('A', 1, ''),
    'Omashu City': ('A', 1, ''), 'Fabled Passage': ('', 0, 'passage'), 'Evolving Wilds': ('', 0, 'wilds'),
    'Terramorphic Expanse': ('', 0, 'wilds'), 'Riveteers Overlook': ('', 0, 'wilds'), 'Yavimaya, Cradle of Growth': ('G', 0, ''),
    'Cryptic Caves': ('C', 0, ''), 'Strip Mine': ('C', 0, ''), 'Lotus Field': ('AAA', 1, 'lotus'), 'Diamond City': ('C', 0, ''),
    'Spinerock Knoll': ('R', 1, ''), 'Sheltering Landscape': ('', 0, 'wilds'), 'Tranquil Landscape': ('', 0, 'wilds'),
    'Twisted Landscape': ('', 0, 'wilds'), 'Tangled Vale': ('G', 1, ''), 'Gruul Turf': ('RG', 1, 'turf'),
    'Bristling Backwoods': ('A', 1, ''), 'Konstrari Annex': ('A', 1, ''), 'Exotic Orchard': ('A', 0, ''),
}
T = {}  # tag table: name -> tag
for names, tag in [
    (['Sol Ring'], 'rock:CC'), (['Arcane Signet', 'Talisman of Impulse', "Commander's Sphere", 'Gruul Locket'], 'rock:A'),
    (['Tablet of Discovery'], 'rock:R'), (['Elvish Mystic', 'Llanowar Elves'], 'dork:G'), (['Elvish Aberration'], 'dork:GGG'),
    (['Frog Butler', 'Spider Manifestation', 'Paradise Druid', 'Nightshade Dryad'], 'dork:A'), (['Ruby, Daring Tracker'], 'dork:A:haste'),
    (['Ilysian Caryatid'], 'caryatid'), (['Kami of Whispered Hopes'], 'kami'), (["Nature's Lore", 'Three Visits'], 'lore'),
    (['Farseek'], 'farseek'), (['Rampant Growth', 'Shared Roots', 'Simulacrum Shaper'], 'growth'), (['Skyshroud Claim'], 'claim'),
    (['Cultivate'], 'cultivate'), (['Circuitous Route'], 'route'), (['Roiling Regrowth', 'Cycle of Renewal'], 'regrowth'),
    (['Explore'], 'explore'), (['Bushwhack'], 'bushwhack'), (['Earthbender Ascension'], 'ascension'), (['The Earth King'], 'earthking'),
    (['Dryad of the Ilysian Grove'], 'dryad'), (['Tireless Provisioner'], 'provisioner'), (['Lumbering Worldwagon'], 'worldwagon'),
    (['Heartbeat of Spring'], 'heartbeat'), (['Tectonic Split'], 'dead'),
    (['Toph, Greatest Earthbender'], 'tophge'), (['Toph, the Blind Bandit'], 'eb:2'), (['Badgermole', 'Earth Kingdom General', 'Earth Rumble'], 'eb:2'),
    (['Solid Ground'], 'solid'), (['Cracked Earth Technique'], 'cracked'), (['Rockalanche'], 'rockalanche'),
    (['Awakening of Vitu-Ghazi'], 'vitu'), (['Bumi, Eclectic Earthbender'], 'bumie'), (['The Boulder, Ready to Rumble'], 'boulder'),
    (['Nissa, Who Shakes the World'], 'nissa'), (['Bitter Work'], 'bitter'), (['The Legend of Kyoshi // Avatar Kyoshi'], 'kyoshi'),
    (['Halana and Alena, Partners'], 'halana'), (['Hardened Scales'], 'scales'), (["Innkeeper's Talent"], 'innkeeper'),
    (['Tale of Katara and Toph'], 'tale'), (['Germination Practicum'], 'germ'), (['Flopsie, Bumi\'s Buddy'], 'flopsie'),
    (['Overrun'], 'overrun'), (['Temur Battle Rage'], 'tbr'), (['Moraug, Fury of Akoum'], 'moraug'), (['Thunderfoot Baloth'], 'thunderfoot'),
    (['Quilled Greatwurm'], 'quilled'), (['Smellerbee, Rebel Fighter'], 'smellerbee'), (['Samut, Tyrant Smasher'], 'samut'),
    (['Lavaspur Boots'], 'boots'), (['Drix Fatemaker'], 'drix'), (['Mightform Harmonizer'], 'mightform'), (['Domri, Anarch of Bolas'], 'domri'),
    (['Ohran Frostfang'], 'ohran'), (["Master's Guidance"], 'mg'), (['Shamanic Revelation'], 'shamanic'), (["Hunter's Insight"], 'insight'),
    (['Guardian Augmenter'], 'augmenter'), (['Spry and Mighty'], 'spry'), (['Bulk Up'], 'bulkup'), (['Haste Magic'], 'hastemagic'),
    (['Fists of Flame'], 'fists'), (['Crystalline Armor'], 'armor'), (['Seismic Tutelage'], 'seismic'), (['Braulios of Pheres Band'], 'braulios'),
    (['Seize the Spoils', 'Thrill of Possibility'], 'loot2'), (['Faithless Looting'], 'loot22'), (['Harmonize'], 'draw3'),
    (['Beast Within', 'Decimate', 'Bumi Bash', 'Rocky Rebuke', 'Savage Smash', 'Longstalk Brawl', 'Cankerbloom', 'The Last Agni Kai',
      'Snakeskin Veil', 'Veil of Summer', "Tyvar's Stand", 'Silkguard', 'Fling', 'Clear Shot', 'Knockout Maneuver', 'Primal Might'], 'hold'),
    # Gilanra side (sim4 tags)
    (['Planar Engineering'], 'planar'), (['Traverse the Outlands'], 'traverse'), (['Ulvenwald Hydra'], 'hydra'), (['Garruk, Caller of Beasts'], 'garruk'),
    (["Garruk's Packleader"], 'packleader'), (['Soul of the Harvest'], 'soul'), (['Primordial Sage'], 'sage'), (['Outcaster Trailblazer'], 'trailblazer'),
    (['Monstrous Vortex'], 'vortex'), (['Boarding Party', 'Aurora Phoenix', 'Sweet-Gum Recluse'], 'cascade'), (['Trumpeting Carnosaur'], 'discover5'),
    (['Combustible Gearhulk'], 'combustible'), (['Regal Behemoth'], 'regal'), (['Dawnglade Regent'], 'monarch'), (['Ghalta, Primal Hunger'], 'ghalta'),
    (['Slinza, the Spiked Stampede'], 'slinza'), (['Oblivion Sower'], 'sower'), (['Avatar of Slaughter'], 'slaughter'), (['Cyclops of Eternal Fury'], 'cyclops'),
    (['Surrak, the Hunt Caller'], 'surrak'), (['Pyrewood Gearhulk'], 'pyrewood'), (['Rampaging Baloths'], 'baloths'), (['Conclave Sledge-Captain'], 'sledge'),
]:
    for n in names: T[n] = tag
T['Tectonic Split'] = 'tectonic'
T['Summon: G.F. Ifrit'] = 'ifrit'
T.update({'Tangled Florahedron // Tangled Vale': 'dork:G', 'Selvala, Heart of the Wilds': 'selvala', 'Apex Devastator': 'cascade4',
          'Terror of the Peaks': 'terror', 'Warstorm Surge': 'warstorm', "Burning Sun's Avatar": 'bsa', 'Drakuseth, Maw of Flames': 'drakuseth',
          'Myojin of Roaring Blades': 'myojin', 'Roxanne, Starfall Savant': 'roxanne', 'Vastlands Scavenger // Bind to Life': 'bind',
          'Cream of the Crop': 'cream', 'Planetarium of Wan Shi Tong': 'planetarium'})
CYCLERS = {'Slavering Branchsnapper': ('forest', 2, 0), 'Saber-Tooth Moose-Lion': ('forest', 2, 0), 'Spinewoods Armadillo': ('basic', 1, 1),
           'Elvish Aberration': ('forest', 2, 0)}
MDFC = 'Tangled Florahedron // Tangled Vale'
CHUMP = False; COMBAT_ONLY = False
def kws(name):
    o = DB.execute("select oracle_text from cards where (name = ? or name like ?) and layout not in ('art_series','token','front_card') limit 1",
                   (name, name + ' // %')).fetchone()
    o = re.sub(r'\([^)]*\)', '', ((o and o[0]) or '').split('//')[0]).lower()
    ls = [l.strip() for l in o.splitlines()]
    has = lambda k: any(re.fullmatch(r'(?:[\w ]+, )*' + k + r'(?:, [\w {}]+)*', l) for l in ls)
    return dict(trample=has('trample'), flying=has('flying'), menace=has('menace'))
HASTE = {'Boarding Party', 'Emissary of Grudges', 'Rorix Bladewing', 'Hideous Taskmaster', 'Calamity, Galloping Inferno', 'Ruby, Daring Tracker', 'Gigantic Big Bear'}
POWER = {'Sweet-Gum Recluse': 3, 'Conclave Sledge-Captain': 7, 'Emergent Woodwurm': 7, 'Havoc Eater': 6, 'Bane of Progress': 4}
SINKS_OLD = {'Ba Sing Se', 'Crawling Barrens', 'Lair of the Hydra', "Rogue's Passage", 'Savage Mansion', 'Omashu City', 'Cryptic Caves',
         'Rockalanche', 'Bitter Work', "Innkeeper's Talent", 'Bulk Up', 'Faithless Looting', 'Planetarium of Wan Shi Tong',
         'Hoard-Smelter Dragon', 'Spinerock Knoll', 'Germination Practicum', 'Nissa, Who Shakes the World', 'Garruk, Caller of Beasts'}
SINKS = {'Ba Sing Se', 'Crawling Barrens', 'Lair of the Hydra', "Rogue's Passage", 'Savage Mansion', 'Omashu City', 'Cryptic Caves',
         'Spinerock Knoll', 'Rockalanche', 'Bitter Work', 'Nissa, Who Shakes the World', 'Planetarium of Wan Shi Tong', 'Spearbreaker Behemoth',
         'Hoard-Smelter Dragon', 'Garruk, Caller of Beasts', 'Faithless Looting', 'Lumbering Worldwagon'}
CHEAP_RAMP = ('rock', 'dork', 'lore', 'farseek', 'growth', 'explore', 'caryatid')

def spec(name):
    if name in LANDS: return dict(land=True, name=name)
    r = DB.execute("select mana_cost, cmc, type_line, power from cards where (name = ? or name like ?) and layout not in ('art_series','token','front_card') limit 1",
                   (name, name + ' // %')).fetchone()
    assert r, name
    cost, mv, tl, p = r
    pips = re.findall(r'\{([^}]+)\}', (cost or '').split(' // ')[0])
    front = tl.split(' // ')[0]
    pw = POWER.get(name, int(p) if p and str(p).isdigit() else 0)
    return dict(land=False, name=name, gen=sum(int(x) for x in pips if x.isdigit()), R=pips.count('R'), G=pips.count('G'),
                H=sum('/' in x for x in pips), mv=int(mv), creature='Creature' in front, power=pw, tag=T.get(name, ''),
                legend='Legendary' in front, instant='Instant' in front, beast='Beast' in front, star=p == '*', **kws(name))

def load(path):
    names = []
    for l in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if m: names += [m.group(2).strip()] * int(m.group(1))
    cm = [EXTRA_CMDR] if EXTRA_CMDR else [n for n in names if n in CMDRS][:2]
    for c in cm: names.remove(c)
    return [n if n in LANDS else (DB.execute("select name from cards where name = ? or name like ? limit 1", (n, n + ' // %')).fetchone() or [n])[0]
            for n in names], cm

class Perm:
    def __init__(s, name, kind, **kw):
        s.name, s.kind = name, kind
        s.units, s.tapped, s.cr, s.cnt, s.base, s.sick, s.vig, s.haste = '', False, False, 0, 0, False, False, False
        s.temp = 0; s.atk = 0; s.eb = False; s.played = 0; s.forest = False; s.tapped_once = False; s.ds = False; s.tag_ = T.get(name, '')
        s.__dict__.update(kw)

class Game:
    def __init__(s, names, cmdrs, S, rng):
        s.S, s.rng, s.cm = S, rng, cmdrs
        s.lib = names[:]; rng.shuffle(s.lib)
        s.hand, s.perms, s.gy = [], [], []
        s.spells = s.free = s.dmg = 0; s.kill = None; s.cast_turn = {}; s.seen_lands = 0; s.seen = set()
        s.flags = Counter(); s.pool = Counter(); s.treasure = 0; s.kyoshi = None; s.germ = False; s.quest = 0
        s.monarch = s.regal = s.vortex = False; s.innk = 0; s.bitter_used = False; s.alena_t = None; s.entered = 0; s.bind = 0; s.burned = 0; s._big = False

    # ---------------- helpers
    def is_land(s, n): return s.S[n]['land']
    def tag(s, n): return s.S[n].get('tag', '') if n in s.S else ''
    def lands(s): return [p for p in s.perms if p.kind == 'land']
    def crs(s): return [p for p in s.perms if p.cr]
    def has(s, tag): return any(p.tag_ == tag for p in s.perms)
    def cnt(s, tag): return sum(p.tag_ == tag for p in s.perms)
    def cmdr_out(s): return any(p.name in s.cm for p in s.perms)
    def power(s, p):
        if p.kind == 'land': b = p.cnt + p.temp
        else:
            b = p.base
            if p.name == 'Toph, the Blind Bandit': b = sum(l.cnt for l in s.lands())
            elif s.S.get(p.name, {}).get('star') and p.name != 'Toph, the Blind Bandit': b = len(s.lands())
            b += p.cnt + p.temp
            if p.name == s.armored: b += len(s.lands())
        if s.has('thunderfoot') and s.cmdr_out(): b += 2
        b += s.cnt('domri') + 3 * s.flags['overrun'] + (2 * s.flags['pyrewood'] if p.name != 'Pyrewood Gearhulk' else 0)
        if p.name in s.cm and s.has('augmenter'): b += 2
        if s.has('moraug'): b += p.atk
        return b
    def greatest(s): return max((s.power(p) for p in s.crs()), default=0)
    def draw(s, n=1):
        for _ in range(min(n, len(s.lib))):
            if s.lib:
                c = s.lib.pop(0); s.hand.append(c)
                if s.t <= 8 and s.is_land(c): s.seen_lands += 1
                if s.t <= 8: s.seen.add(c)
    def amp(s, p):
        a = s.cnt('solid') + s.cnt('kami') + (s.cnt('scales') if p.cr else 0)
        return a
    def add_counters(s, p, n):
        if n <= 0 or p is None: return
        n += s.amp(p)
        if s.innk >= 3: n *= 2
        p.cnt += n
    def best_attacker(s, lands_only=False):
        c = [p for p in s.crs() if (p.kind == 'land' or not lands_only)]
        return max(c, key=lambda p: (s.power(p) * (2 if s.ds(p) else 1), p.kind == 'land'), default=None)
    def ds(s, p): return p.ds or (p.kind == 'land' and s.has('tophge')) or s.has('slaughter')
    def earthbend(s, n, combat=False, attackers=()):
        L = s.lands()
        if combat:
            tgt = max((p for p in attackers if p.kind == 'land'), key=lambda p: p.cnt, default=None)
        else:
            tgt = next((p for p in L if not p.cr and not p.tapped), None)
            if tgt is None: tgt = max((p for p in L if p.cr), key=lambda p: p.cnt, default=None)
        if tgt is None: tgt = next((p for p in L if not p.cr), None)
        if tgt is None: return None
        tgt.cr = True; tgt.eb = True; s.add_counters(tgt, n); return tgt
    def colour_need(s):
        units = ''.join(p.units for p in s.lands())
        r = sum(u in 'RA' for u in units); g = sum(u in 'GA' for u in units)
        nr = max((s.S[c].get('R', 0) for c in s.hand if not s.is_land(c)), default=0) + 1
        ng = max((s.S[c].get('G', 0) for c in s.hand if not s.is_land(c)), default=0) + 1
        return 'R' if nr - r > ng - g else 'G'
    def fetch(s, kinds, tapped, to_hand=False):
        want = s.colour_need(); order = ['Mountain', 'Forest'] if want == 'R' else ['Forest', 'Mountain']
        pick = None
        if 'thicket' in kinds and 'Sheltered Thicket' in s.lib and (want == 'R' or 'forest' not in kinds): pick = 'Sheltered Thicket'
        for b in order:
            if pick: break
            if b in s.lib and (('forest' in kinds or 'basic' in kinds) if b == 'Forest' else ('mountain' in kinds or 'basic' in kinds)): pick = b
        if not pick and 'thicket' in kinds and 'Sheltered Thicket' in s.lib: pick = 'Sheltered Thicket'
        if not pick: return False
        s.lib.remove(pick); s.rng.shuffle(s.lib)
        if to_hand: s.hand.append(pick)
        else: s.put_land(pick, tapped or LANDS[pick][1])
        return True
    def put_land(s, n, tapped):
        u, _, kind = LANDS[n]
        p = Perm(n, 'land', units=u, tapped=bool(tapped), forest=n in ('Forest', 'Sheltered Thicket'), basic=n in ('Forest', 'Mountain'), played=s.t)
        s.perms.append(p); s.landfall()
        return p
    def landfall(s):
        if s.has('moraug') and s.phase in ('main1', 'main2'): s.moraug_q += 1
        for p in s.perms:
            tg = s.tag(p.name)
            if tg == 'provisioner': s.treasure += 1
            if tg == 'baloths': s.perms.append(Perm('Beast', 'cr', cr=True, base=4, sick=True))
            if tg == 'mightform':
                b = s.best_attacker()
                if b: b.temp += s.power(b)
        if s.has('ascension'):
            s.quest += 1
            if s.quest >= 4: s.add_counters(s.best_attacker(), 1)

    # ---------------- mana
    def land_units(s, p, fl):
        dry, yav, nis, hb = fl
        u = p.units
        if s.has('tectonic'): u = 'AAA'
        elif dry: u = 'A' * len(u) if u != 'C' else 'A'
        elif yav: u = u.replace('C', 'G').replace('R', 'A')
        extra = ''
        if nis and (p.forest or yav or dry): extra += 'G'
        if hb: extra += u[:1]
        if s.regal: extra += 'A'
        return u + extra
    def sources(s, allow_lcr):
        out = []; fl = (s.has('dryad'), any(q.name == 'Yavimaya, Cradle of Growth' for q in s.perms), s.has('nissa'), s.has('heartbeat'))
        g = None
        for p in s.perms:
            if p.tapped: continue
            if p.kind == 'land':
                if p.cr and not allow_lcr: continue
                out.append((2 if p.cr else 0, s.land_units(p, fl), p))
            elif p.kind == 'rock': out.append((0, p.units, p))
            elif p.cr and p.units and (not p.sick or p.haste): out.append((-1 if (s._big and p.units == 'g') else 1, p.units, p))
            elif p.cr and p.name == 'Selvala, Heart of the Wilds' and not p.sick:
                g = s.greatest() if g is None else g
                if g >= 2: out.append((1, 'A' * min(g - 1, 30), p))  # net of the {G} it needs
            elif p.cr and p.name == 'Kami of Whispered Hopes' and not p.sick: out.append((1, 'A' * min(30, max(1, s.power(p))), p))
            elif p.cr and p.name == 'Ilysian Caryatid' and not p.sick: g = s.greatest() if g is None else g; out.append((1, 'AA' if g >= 4 else 'A', p))
            elif p.cr and p.name == 'Avatar Kyoshi' and not p.sick: g = s.greatest() if g is None else g; out.append((1, 'A' * min(g, 30), p))
            elif p.cr and p.name == 'Alena, Kessig Trapper' and not p.sick and s.entered: out.append((1, 'R' * s.entered, p))
        out.sort(key=lambda x: x[0])
        return out
    @staticmethod
    def fits(pool, gen, R, G, H, big):
        p = pool.copy(); gil = False
        for _ in range(R):
            k = 'R' if p['R'] else 'A' if p['A'] else None
            if not k: return None
            p[k] -= 1
        for _ in range(G):
            k = next((k for k in (('g', 'G', 'A') if big else ('G', 'A', 'g')) if p[k]), None)
            if not k: return None
            p[k] -= 1; gil |= k == 'g'
        for _ in range(H):
            k = next((k for k in ('R', 'G', 'A', 'g') if p[k]), None)
            if not k: return None
            p[k] -= 1; gil |= k == 'g'
        for _ in range(gen):
            k = next((k for k in (['g'] if big and not gil else []) + ['C', 'R', 'G', 'A', 'g'] if p[k]), None)
            if not k: return None
            p[k] -= 1; gil |= k == 'g'
        return p, gil
    def plan(s, gen, R, G, H, big=False, allow_lcr=True):
        """returns (taps, treasure_used) or None"""
        s._big = big; pool = s.pool.copy(); taps = []; src = s.sources(allow_lcr); s._big = False; tre = 0
        while True:
            if s.fits(pool, gen, R, G, H, big): return taps, tre
            need = None
            if pool['R'] + pool['A'] < R: need = 'RA'
            elif pool['G'] + pool['A'] + pool['g'] < G: need = 'GA'
            used = {id(q) for q, _ in taps}
            cand = [x for x in src if id(x[2]) not in used and (need is None or any(u in need for u in x[1]))]
            if not cand:
                if s.treasure - tre > 0: pool['A'] += 1; tre += 1; continue
                return None
            _, u, p = cand[0]; taps.append((p, u)); pool.update(u)
    def pay(s, gen, R, G, H, big=False, allow_lcr=True):
        pl = s.plan(gen, R, G, H, big, allow_lcr)
        if pl is None: return False
        taps, tre = pl
        for p, u in taps:
            s.pool.update(u); p.tapped = True
            if s.has('tale') and p.cr and not p.tapped_once: s.add_counters(p, 1)
            p.tapped_once = True
        s.pool['A'] += tre; s.treasure -= tre
        res = s.fits(s.pool, gen, R, G, H, big); s.pool = res[0]
        if res[1] and big: s.draw()
        return True
    def cost(s, n):
        sp = s.S[n]; gen = sp['gen']
        if sp['tag'] == 'ghalta': gen = max(0, gen - sum(s.power(p) for p in s.crs()))
        if sp['beast'] and s.has('slinza'): gen = max(0, gen - 2)
        return gen
    def can(s, n, allow_lcr=True):
        sp = s.S[n]
        return s.plan(s.cost(n), sp['R'], sp['G'], sp['H'], sp['mv'] >= 6, allow_lcr) is not None

    # ---------------- casting
    def cast(s, n, paid=True, allow_lcr=True):
        sp = s.S[n]
        if paid: s.pay(s.cost(n), sp['R'], sp['G'], sp['H'], sp['mv'] >= 6, allow_lcr)
        if n in s.hand: s.hand.remove(n)
        s.spells += 1
        if sp['mv'] >= 4:
            for q in s.perms:
                if q.name == 'Spider Manifestation' and q.tapped and not q.sick: q.tapped = False
        if sp['tag'] == 'cascade4':
            for _ in range(4): s.discover(sp['mv'] - 1)
        if sp['tag'] == 'myojin' and paid: s.burn(7)
        if sp['creature']:
            if s.has('sage'): s.draw()
            if s.vortex and sp['power'] >= 5: s.discover(sp['mv'])
        if sp['tag'] == 'cascade': s.discover(sp['mv'] - 1)
        s.resolve(n, sp)
    def discover(s, x):
        seen = []
        while s.lib:
            c = s.lib.pop(0)
            if not s.is_land(c) and s.S[c]['mv'] <= x and s.tag(c) not in ('dead',):
                s.lib += seen; s.free += 1; s.cast(c, paid=False); return
            seen.append(c)
        s.lib += seen
    def enter_cr(s, n, pw, haste=False, **kw):
        p = Perm(n, 'cr', cr=True, base=pw, sick=True, haste=haste, **kw); s.perms.append(p)
        s.entered = max(s.entered, pw)
        pwn = s.power(p)
        for q in s.perms[:-1]:
            if q.name == 'Terror of the Peaks': s.burn(pwn)
            if q.name == 'Selvala, Heart of the Wilds' and pwn > max((s.power(x) for x in s.crs() if x is not p), default=-1): s.draw()
            if q.name == 'Cream of the Crop': s.cream(pwn)
        if s.has('warstorm'): s.burn(pwn)
        if n == "Burning Sun's Avatar": s.burn(3)
        if n == 'Roxanne, Starfall Savant': s.meteor()
        if n == 'Outcaster Trailblazer': s.pool['A'] += 1
        for q in s.perms[:-1]:
            tg = s.tag(q.name)
            if (tg == 'packleader' and pw >= 3) or (tg == 'trailblazer' and pw >= 4) or (tg == 'soul' and n != 'Beast'): s.draw()
        return p
    def resolve(s, n, sp):
        tg = sp['tag']; kind = tg.split(':')[0]
        if sp['creature']:
            pw = sp['power']
            if tg == 'hydra': pw = 0
            units = tg.split(':')[1] if kind == 'dork' else ''
            p = s.enter_cr(n, pw, haste=n in HASTE, units=units)
            if tg == 'hydra': s.fetch({'thicket', 'basic'}, True)
            if n == 'Bumi, Unleashed': s.earthbend(4)
        if kind == 'rock': s.perms.append(Perm(n, 'rock', units=tg.split(':')[1]))
        elif tg in ('kami', 'caryatid'): s.perms[-1].units = ''
        elif tg == 'lore': s.fetch({'forest', 'thicket'}, False)
        elif tg == 'farseek': s.fetch({'mountain', 'thicket'}, True)
        elif tg in ('growth', 'worldwagon'): s.fetch({'basic'}, True)
        elif tg == 'claim': s.fetch({'forest', 'thicket'}, False); s.fetch({'forest', 'thicket'}, False)
        elif tg == 'cultivate': s.fetch({'basic'}, True); s.fetch({'basic'}, False, to_hand=True)
        elif tg == 'route': s.fetch({'basic'}, True); s.fetch({'basic'}, True)
        elif tg == 'regrowth':
            s.sac_lands(1)
            s.fetch({'basic'}, True); s.fetch({'basic'}, True)
        elif tg == 'explore': s.draw(); s.drops += 1
        elif tg == 'bushwhack': s.fetch({'basic'}, False, to_hand=True)
        elif tg == 'ascension': s.earthbend(2); s.fetch({'basic'}, True)
        elif tg == 'earthking': s.enter_cr('Bear', 4)
        elif tg == 'dryad': s.drops += 1
        elif kind == 'eb': s.earthbend(int(tg.split(':')[1]))
        elif tg == 'tophge': s.earthbend(4)
        elif tg == 'solid': s.perms.append(Perm(n, 'ench')); s.earthbend(3); return
        elif tg == 'cracked': s.earthbend(3); s.earthbend(3)
        elif tg == 'rockalanche':
            fo = len(s.lands()) if (s.has('dryad') or any(q.name == 'Yavimaya, Cradle of Growth' for q in s.perms)) else sum(l.forest for l in s.lands())
            s.earthbend(fo); s.gy.append(n)
        elif tg == 'vitu': s.earthbend(9)
        elif tg == 'ifrit': s.draw(); s.discard(1)
        elif tg == 'tectonic': s.sac_lands(-(-len(s.lands()) // 2))
        elif tg == 'bumie': s.earthbend(1)
        elif tg == 'nissa': s.perms.append(Perm(n, 'pw')); s.nissa_plus(); return
        elif tg == 'kyoshi': s.draw(s.greatest()); s.kyoshi = s.t
        elif tg == 'germ': s.germ = True; s.germinate()
        elif tg == 'flopsie':
            for p in s.crs(): s.add_counters(p, 1)
        elif tg == 'overrun': s.flags['overrun'] += 1
        elif tg == 'innkeeper': s.innk = 1
        elif tg == 'drix': s.add_counters(s.best_attacker(), 1)
        elif tg == 'domri': s.perms.append(Perm(n, 'pw')); s.pool['A'] += 1; return
        elif tg == 'samut': s.perms.append(Perm(n, 'pw')); return
        elif tg == 'shamanic': s.draw(len(s.crs()))
        elif tg == 'insight': s.insight = s.best_attacker()
        elif tg == 'boots': s.perms.append(Perm(n, 'eq')); return
        elif tg == 'armor': s.armored = 'Bumi, Unleashed' if any(p.name == 'Bumi, Unleashed' for p in s.perms) else (s.best_attacker() or Perm('x', 'x')).name
        elif tg == 'seismic':
            b = s.best_attacker(lands_only=True) or s.best_attacker()
            if b: b.seismic = True; s.add_counters(b, 1)
        elif tg == 'spry':
            c = sorted(s.crs(), key=s.power)
            if len(c) >= 2:
                x = s.power(c[-1]) - s.power(c[0]); s.draw(x); c[-1].temp += x; c[0].temp += x
        elif tg == 'loot2': s.draw(2); s.discard(1)
        elif tg == 'loot22': s.draw(2); s.discard(2)
        elif tg == 'draw3': s.draw(3)
        elif tg == 'fists': s.draw(1)
        elif tg == 'hastemagic':
            b = next((p for p in s.perms if p.name == 'Bumi, Unleashed'), None) or s.best_attacker()
            if b: b.haste = True; b.temp += 3
            s.draw(1)
        elif tg == 'bulkup':
            b = s.best_attacker()
            if b: b.temp += s.power(b)
        # Gilanra side
        elif tg == 'planar':
            for l in sorted([l for l in s.lands() if not l.cr], key=lambda l: len(l.units))[:2]: s.perms.remove(l)
            for _ in range(4): s.fetch({'basic'}, True)
        elif tg == 'traverse':
            for _ in range(s.greatest()): s.fetch({'basic'}, True)
        elif tg == 'garruk': s.perms.append(Perm(n, 'pw')); s.garruk_plus(); return
        elif tg == 'vortex': s.vortex = True
        elif tg == 'discover5': s.discover(5)
        elif tg == 'combustible':
            if s.rng.random() < 0.5: s.draw(3)
            else: s.burn(sum(s.S[c].get('mv', 0) for c in s.lib[:3] if not s.is_land(c))); s.lib = s.lib[3:]
        elif tg == 'bind': s.bind += 1
        elif tg in ('regal', 'monarch'): s.monarch = True; s.regal |= tg == 'regal'
        elif tg == 'sower':
            for _ in range(4):
                if s.rng.random() < 0.37: s.perms.append(Perm('stolen', 'land', units='C')); s.landfall()
        elif tg == 'pyrewood': s.flags['pyrewood'] += 1
        if not sp['creature'] and kind not in ('rock',) and not sp['instant'] and 'Sorcery' not in s.S[n].get('type', '') and tg not in ('hold',):
            s.perms.append(Perm(n, 'ench'))
    def burn(s, n):
        if not COMBAT_ONLY: s.dmg += n; s.burned += n
    def meteor(s):
        s.perms.append(Perm('Meteorite', 'rock', units='AA', tapped=True)); s.burn(2)
    def cream(s, x):
        top = s.lib[:x]
        if not top: return
        want = not any(s.is_land(c) for c in s.hand) and len(s.lands()) < 7
        best = max(top, key=lambda c: (s.is_land(c) == want, 0 if s.is_land(c) else s.S[c]['mv']))
        s.lib.remove(best); s.lib.insert(0, best)
    def landcycle(s):
        if s.t > 7 or any(s.is_land(c) for c in s.hand) or MDFC in s.hand: return
        for c in [c for c in s.hand if c in CYCLERS]:
            kind, gen, g = CYCLERS[c]
            if s.pay(gen, 0, g, 0, allow_lcr=False):
                s.hand.remove(c); s.fetch({'forest', 'thicket'} if kind == 'forest' else {'basic'}, False, to_hand=True); return
    def trample(s, p):
        if s.S.get(p.name, {}).get('trample') or getattr(p, 'tr', False) or s.flags['overrun']: return True
        if s.has('thunderfoot') and s.cmdr_out(): return True
        if p.cnt > 0 and any(q.name in ('Badgermole', 'Drix Fatemaker') for q in s.perms): return True
        return p.kind == 'land' and any(q.name == 'Avatar Kyoshi' for q in s.perms)
    def evasive(s, p):
        sp = s.S.get(p.name, {})
        return sp.get('flying') or sp.get('menace') or (s.flags['pyrewood'] and p.name != 'Pyrewood Gearhulk')
    def sac_lands(s, k):
        L = s.lands()
        order = sorted([l for l in L if l.eb and l.cnt <= 3], key=lambda l: l.cnt) + \
            sorted([l for l in L if not l.cr], key=lambda l: (not l.tapped, len(l.units))) + \
            sorted([l for l in L if l.cr and not (l.eb and l.cnt <= 3)], key=lambda l: s.power(l))
        for l in order[:k]:
            s.perms.remove(l)
            if l.eb: s.put_land(l.name, True)  # earthbend: "return it to the battlefield tapped"
    def land_sink(s):
        lair = next((l for l in s.lands() if l.name == 'Lair of the Hydra' and not l.cr and not l.tapped and l.played < s.t), None)
        bar = next((l for l in s.lands() if l.name == 'Crawling Barrens' and not l.tapped and l.played < s.t), None)
        sink = lair or bar
        if not sink: return
        fl = (s.has('dryad'), any(q.name == 'Yavimaya, Cradle of Growth' for q in s.perms), s.has('nissa'), s.has('heartbeat'))
        free = [l for l in s.lands() if not l.cr and not l.tapped and l is not sink]
        m = sum(len(s.land_units(l, fl)) for l in free)
        pot = sum(s.power(p) * (2 if s.ds(p) else 1) for p in s.crs() if p.kind == 'land' and not p.tapped)
        x = m - 1 if sink is lair else 2 * (m // 4) + sink.cnt
        if x <= 0 or s.dmg + pot + x * (2 if s.has('tophge') else 1) < 40: return
        for l in free: l.tapped = True
        sink.cr = True
        if sink is lair: sink.temp += x
        else:
            for _ in range(m // 4): s.add_counters(sink, 2)
    def discard(s, k):
        for _ in range(k):
            if not s.hand: return
            L = [c for c in s.hand if s.is_land(c)]
            c = L[0] if len(L) >= 2 or len(s.lands()) >= 6 and L else max(s.hand, key=lambda c: s.S[c].get('mv', 0))
            s.hand.remove(c)
    def nissa_plus(s):
        tgt = next((l for l in s.lands() if not l.cr and l.tapped), None) or next((l for l in s.lands() if not l.cr), None)
        if tgt: tgt.cr = True; tgt.vig = True; tgt.tapped = False; s.add_counters(tgt, 3)
    def garruk_plus(s):
        top, s.lib = s.lib[:5], s.lib[5:]
        for c in top:
            if not s.is_land(c) and s.S[c]['creature']: s.hand.append(c)
            else: s.lib.append(c)
    def germinate(s):
        for p in s.crs(): s.add_counters(p, 2)

    # ---------------- turn
    def bumi(s): return next((p for p in s.perms if p.name == 'Bumi, Unleashed'), None)
    def haste_all(s): return s.has('samut') or s.has('cyclops')
    def can_attack(s, p):
        if not p.cr or p.tapped: return False
        if p.kind == 'land': return True
        return not p.sick or p.haste or s.haste_all() or (s.has('smellerbee') and p.name != 'Smellerbee, Rebel Fighter') \
            or (p.name == 'Bumi, Unleashed' and s.has('boots'))
    def bumi_ready(s):
        b = s.bumi(); return b is not None and s.can_attack(b)
    def priority(s, n):
        sp = s.S[n]; t = s.t; tg = sp['tag']; kind = tg.split(':')[0]; early = t <= 4
        if n in CMDRS:
            return 950
        if tg == 'insight': return 500 if s.phase == 'main1' and s.t >= 4 and s.best_attacker() and s.power(s.best_attacker()) >= 4 else -1
        if tg == 'hastemagic': return 840 if s.phase == 'main1' and s.bumi() and not s.bumi_ready() else -1
        if tg == 'tectonic': return 300 if len(s.lands()) >= 6 else -1
        if tg in ('hold', 'tbr', 'dead', 'bulkup'): return 60 if tg == 'hold' else -1
        if tg == 'vitu': return -1 if s.bumi_ready() else 700
        if n == 'Sol Ring': return 1000
        if sp['mv'] <= 2 and kind in CHEAP_RAMP: return 900 if early else 300
        if tg in ('kami', 'ascension', 'earthking', 'claim', 'cultivate', 'route', 'dryad', 'provisioner', 'regrowth', 'worldwagon', 'bushwhack') \
                or kind in ('rock', 'dork', 'caryatid'): return 800 if early else 290
        if tg in ('tophge', 'nissa', 'scales', 'solid'): return 870
        if tg in ('germ', 'halana', 'bumie', 'boulder'): return 820
        if tg in ('smellerbee', 'samut', 'boots'): return 830 if (s.bumi() and s.bumi().sick) or 'Bumi, Unleashed' in s.hand else 400
        if tg == 'overrun': return 860 if sum(s.can_attack(p) for p in s.crs()) + sum(p.kind == 'land' for p in s.crs()) >= 5 else -1
        if tg == 'selvala': return 800 if early else 400
        if tg in ('cream', 'vortex'): return 700
        if tg == 'shamanic': return 600 if len(s.crs()) >= 4 else 150
        if tg == 'flopsie': return 650 + 10 * len(s.crs())
        if tg in ('kyoshi', 'bitter', 'ohran', 'thunderfoot', 'quilled', 'moraug', 'innkeeper', 'tale', 'mg', 'domri'): return 760
        if kind == 'eb' or tg in ('cracked', 'rockalanche', 'mightform', 'drix', 'armor', 'seismic', 'braulios', 'spry'): return 700
        if tg in ('mg', 'trailblazer'): return 700 if early else 400
        if tg == 'traverse': return 560 if s.greatest() >= 5 else 90
        if sp['mv'] >= 5 or sp['creature'] and sp['power'] >= 5:
            return 600 + sp['mv'] + 20 * (tg in ('soul', 'sage', 'garruk', 'packleader', 'vortex'))
        return 100 + sp['mv']
    def main(s, phase):
        s.phase = phase
        lcr_ok = phase == 'main2' or s.bumi_ready() or s.t <= 4
        while True:
            opts = []
            for c in set(s.hand):
                if s.is_land(c): continue
                pr = s.priority(c)
                if pr < 0 or (s.S[c]['tag'] == 'hold' and s.t < 4): continue
                if s.can(c, allow_lcr=(lcr_ok and pr >= 100) or pr >= 800): opts.append((pr, c))
            for c in s.cm:
                if c not in s.cast_turn and s.can(c, allow_lcr=lcr_ok):
                    if c == 'Alena, Kessig Trapper' and len(s.sources(True)) + sum(s.pool.values()) < 5: continue
                    opts.append((s.priority(c), c))
            if not opts: break
            _, c = max(opts)
            if c in s.cm:
                sp = s.S[c]; s.pay(s.cost(c), sp['R'], sp['G'], sp['H'], False, lcr_ok); s.spells += 1; s.cast_turn[c] = s.t
                p = s.enter_cr(c, sp['power'], units='g' if c == 'Gilanra, Caller of Wirewood' else '')
                if c == 'Bumi, Unleashed' or s.tag(c) == 'tophge': s.earthbend(4)
                continue
            s.cast(c, allow_lcr=lcr_ok or s.priority(c) >= 800)
        s.sinks(phase)
    def sinks(s, phase):
        if s.bind and s.pay(4, 0, 1, 0, allow_lcr=phase == 'main2'):
            s.bind -= 1; s.spells += 1
            top, s.lib = s.lib[:7], s.lib[7:]
            cr = [x for x in top if not s.is_land(x) and s.S[x]['creature']]
            if cr: b = max(cr, key=lambda x: s.S[x]['power']); s.resolve(b, s.S[b])
        pl = next((q for q in s.perms if q.name == 'Planetarium of Wan Shi Tong' and not q.tapped), None)
        if pl and phase == 'main1' and s.pay(1, 0, 0, 0, allow_lcr=False):
            pl.tapped = True
            top = s.lib[:2]; want = not any(s.is_land(c) for c in s.hand) and len(s.lands()) < 7
            keep = [c for c in top if not s.is_land(c) or want]
            s.lib = keep + s.lib[2:] + [c for c in top if c not in keep]
            if s.lib and not s.is_land(s.lib[0]) and s.tag(s.lib[0]) != 'hold':
                c = s.lib.pop(0); s.free += 1; s.cast(c, paid=False)
        if s.innk and s.innk < 3:
            if s.innk == 1 and s.pay(0, 0, 1, 0): s.innk = 2
            if s.innk == 2 and s.pay(3, 0, 1, 0, allow_lcr=phase == 'main2'): s.innk = 3
        if s.has('bitter') and not s.bitter_used and s.pay(4, 0, 0, 0, allow_lcr=phase == 'main2'): s.bitter_used = True; s.earthbend(4)
        if 'Rockalanche' in s.gy and s.pay(5, 0, 1, 0, allow_lcr=phase == 'main2'):
            s.gy.remove('Rockalanche'); s.spells += 1
            fo = len(s.lands()) if (s.has('dryad') or any(q.name == 'Yavimaya, Cradle of Growth' for q in s.perms)) else sum(l.forest for l in s.lands())
            s.earthbend(fo)
        bs = next((l for l in s.lands() if l.name == 'Ba Sing Se' and not l.tapped), None)
        if bs and phase == 'main1':
            bs.tapped = True
            if s.pay(2, 0, 1, 0, allow_lcr=False): s.earthbend(2)
            else: bs.tapped = False
    def combat(s, kind):
        if kind == 'M':
            for p in s.crs(): p.tapped = False
        for _ in range(s.cnt('halana')):
            h = next(p for p in s.perms if s.tag(p.name) == 'halana')
            b = s.bumi()
            tgt = b if b and b.sick and not s.can_attack(b) else s.best_attacker(lands_only=True) or b
            if tgt and tgt is not h: s.add_counters(tgt, s.power(h)); tgt.haste = True
        if s.has('surrak') and sum(s.power(p) for p in s.crs()) >= 8:
            sk = [p for p in s.crs() if not s.can_attack(p) and not p.tapped and p.kind != 'land']
            if sk: max(sk, key=s.power).haste = True
        if s.innk: s.add_counters(s.best_attacker(lands_only=True) or s.best_attacker(), 1)
        if kind == 'B': s.land_sink()
        att = [p for p in s.crs() if s.can_attack(p) and (kind != 'B' or p.kind == 'land')]
        if not att: return
        # attack triggers
        if any(s.tag(p.name) == 'bumie' for p in att):
            for p in s.crs():
                if p.kind == 'land': s.add_counters(p, 2)
        for p in att:
            if p.name == 'Drakuseth, Maw of Flames': s.burn(4)
            if p.name == 'Roxanne, Starfall Savant': s.meteor()
            if s.tag(p.name) == 'boulder': s.earthbend(sum(s.power(q) >= 4 for q in s.crs()), combat=True, attackers=att)
        big = [p for p in att if s.power(p) >= 4]
        if big and s.has('earthking'):
            for _ in range(len(big)): s.fetch({'basic'}, True)
        if big and s.has('bitter'): s.draw()
        if sum(s.S.get(p.name, {}).get('legend', False) or p.name in CMDRS for p in att) >= 2 and s.has('mg'):
            for p in sorted(att, key=s.power)[-2:]: s.add_counters(p, 1)
        for p in att:
            if s.has('tale') and not p.tapped_once: s.add_counters(p, 1)
            p.tapped_once = True
            if getattr(p, 'seismic', False): s.add_counters(p, p.cnt)
            if p.name == 'Ruby, Daring Tracker' and big: p.temp += 2
            if not p.vig: p.tapped = True
        b = s.bumi() if s.bumi() in att else None
        if b and 'Temur Battle Rage' in s.hand and s.pay(1, 1, 0, 0):
            s.hand.remove('Temur Battle Rage'); s.spells += 1; b.ds = True
        if not b and 'Temur Battle Rage' in s.hand:
            x = max((p for p in att if not s.ds(p)), key=s.power, default=None)
            if x and s.power(x) >= 5 and s.pay(1, 1, 0, 0): s.hand.remove('Temur Battle Rage'); s.spells += 1; x.ds = True; x.tr = True
        blk = None
        if CHUMP:
            cand = [p for p in att if not s.evasive(p)]
            if cand: blk = max(cand, key=lambda p: s.power(p) * (2 if s.ds(p) else 1))
        if 'Bulk Up' in s.hand and s.pay(1, 1, 0, 0):
            s.hand.remove('Bulk Up'); s.spells += 1; x = max(att, key=s.power); x.temp += s.power(x)
        bumi_hits = 0
        for p in att:
            strikes = 2 if s.ds(p) else 1; p.atk += 1
            for _k in range(strikes):
                d = s.power(p)
                if p is blk: d = (d - 1 if _k == 0 else d) if s.trample(p) else 0
                if d <= 0: continue
                s.dmg += d
                if s.has('ohran'): s.draw()
                if getattr(s, 'insight', None) is p: s.draw(d)
                if s.has('quilled') or p.name == 'Conclave Sledge-Captain': s.add_counters(p, d)
                if p.name == 'Bumi, Unleashed': bumi_hits += 1
        for _ in range(bumi_hits):
            for l in s.lands(): l.tapped = False
            s.combats.appendleft('B')
        if bumi_hits and 'Awakening of Vitu-Ghazi' in s.hand and s.pay(3, 0, 2, 0):
            s.hand.remove('Awakening of Vitu-Ghazi'); s.spells += 1
            tgt = next((l for l in s.lands() if not l.cr and not l.tapped), None) or next((l for l in s.lands() if not l.tapped), None)
            if tgt: tgt.cr = True; s.add_counters(tgt, 9)
    def play_land(s):
        hand_l = [c for c in s.hand if s.is_land(c)]
        if not hand_l and MDFC in s.hand:
            s.hand.remove(MDFC); s.drops -= 1; s.drops_t.add(s.t); s.put_land('Tangled Vale', True); return True
        if not hand_l: return False
        nl = len(s.lands())
        def tapped(c):
            u, tp, k = LANDS[c]
            if k == 'basing': return not any(l.basic for l in s.lands())
            if k == 'lair': return nl >= 2
            if k == 'lotus': return True
            return bool(tp) or k == 'wilds' or (k == 'passage' and nl < 3)
        ok = [c for c in hand_l if not (LANDS[c][2] in ('lotus',) and nl < 3) and not (LANDS[c][2] == 'turf' and nl == 0)]
        if not ok: return False
        one = any(s.S[c].get('mv', 9) == 1 and s.tag(c).split(':')[0] in ('rock', 'dork') for c in s.hand)
        un = [c for c in ok if not tapped(c)]; tp = [c for c in ok if tapped(c)]
        want = 'F' if s.colour_need() == 'G' else 'M'
        if s.t == 1 and not one and tp: pick = tp[0]
        elif un: pick = sorted(un, key=lambda c: (LANDS[c][2] == want, c == 'Command Tower'))[-1]
        else: pick = tp[0]
        s.hand.remove(pick); s.drops -= 1; s.drops_t.add(s.t)
        k = LANDS[pick][2]
        if k in ('passage', 'wilds'):
            s.landfall(); s.fetch({'basic'}, True)
            if k == 'passage' and len(s.lands()) >= 4: s.lands()[-1].tapped = False
            return True
        if k == 'lotus': s.sac_lands(2)
        if k == 'turf':
            b = next((l for l in s.lands() if l.basic and not l.cr), None)
            if b: s.perms.remove(b); s.hand.append(b.name)
        s.put_land(pick, tapped(pick))
        return True
    def turn(s, t):
        s.t = t; s.entered = 0; s.flags = Counter(); s.pool = Counter(); s.insight = None; s.armored = getattr(s, 'armored', None)
        s.moraug_q = 0; s.phase = 'beg'
        for p in s.perms: p.tapped = False; p.sick = False; p.temp = 0; p.atk = 0; p.tapped_once = False; p.ds = False; p.tr = False
        s.draw()
        if s.kyoshi is not None:
            ch = t - s.kyoshi + 1
            if ch == 2: s.earthbend(len(s.hand))
            if ch == 3:
                s.perms = [p for p in s.perms if p.name != 'The Legend of Kyoshi // Avatar Kyoshi']
                s.enter_cr('Avatar Kyoshi', 5); s.kyoshi = None
        if s.germ: s.germinate()
        if s.has('nissa'): s.nissa_plus()
        if s.has('domri'): s.pool['A'] += 1
        for p in [q for q in s.perms if q.name == 'Summon: G.F. Ifrit']:
            p.lore = getattr(p, 'lore', 1) + 1
            if p.lore == 2: s.draw(); s.discard(1)
            elif p.lore in (3, 4): s.pool['R'] += 1
            if p.lore >= 4: s.perms.remove(p)
        if s.has('garruk'): s.garruk_plus()
        s.drops = 1 + s.cnt('dryad'); s.phase = 'main1'
        s.landcycle()
        # land drop(s), first casting cheap stuff, then more drops if Explore/Dryad gave them
        while s.drops > 0 and s.play_land(): pass
        s.main('main1')
        while s.drops > 0 and s.play_land(): pass
        s.main('main1')
        for b in [p for p in s.perms if p.name == 'Bumi, Unleashed' and s.has('boots')]: b.haste = True
        s.pool = Counter(); s.phase = 'combat'
        s.combats = deque(['M'] * s.moraug_q + ['R']); s.moraug_q = 0
        while s.combats:
            s.combat(s.combats.popleft())
            if s.kill is None and s.dmg >= 40: s.kill = t
        s.pool = Counter()
        s.main('main2')
        if s.moraug_q:
            s.phase = 'combat'; s.combats = deque(['M'] * s.moraug_q)
            while s.combats:
                s.combat(s.combats.popleft())
                if s.kill is None and s.dmg >= 40: s.kill = t
        if s.has('mg') and s.greatest() >= 4: s.draw()
        if s.monarch: s.draw()
        if s.kill is None and s.dmg >= 40: s.kill = t
    def keepable(s, hand, size):
        L = sum(s.is_land(c) or c == MDFC for c in hand)
        if size == 7:
            return 3 <= L <= 5 or (L == 2 and any(not s.is_land(c) and s.S[c]['mv'] <= 2 and s.tag(c).split(':')[0] in CHEAP_RAMP for c in hand))
        return size <= 5 or 2 <= L <= 5
    def mulligan(s):
        s.hand, s.lib = s.lib[:7], s.lib[7:]
        if s.keepable(s.hand, 7): return True
        for size in (7, 6, 5):
            s.lib += s.hand; s.rng.shuffle(s.lib); s.hand, s.lib = s.lib[:7], s.lib[7:]
            for _ in range(7 - size):
                L = [c for c in s.hand if s.is_land(c)]
                c = L[0] if len(L) > 4 else max((c for c in s.hand if not s.is_land(c)), key=lambda c: s.S[c]['mv'], default=s.hand[0])
                s.hand.remove(c); s.lib.append(c)
            if s.keepable(s.hand, size): return False
        return False
    def mana_sources(s):
        return len(s.lands()) + sum(p.kind == 'rock' for p in s.perms) + sum(1 for p in s.perms if p.cr and p.kind != 'land' and p.name not in CMDRS
                                                                           and (p.units or p.name in ('Kami of Whispered Hopes', 'Ilysian Caryatid', 'Avatar Kyoshi', 'Selvala, Heart of the Wilds')))

def play(names, cm, S, rng, turns=14):
    g = Game(names, cm, S, rng); g.t = 0; g.drops_t = set(); g.armored = None
    k7 = g.mulligan()
    g.seen_lands = sum(g.is_land(c) for c in g.hand); g.seen = set(g.hand)
    out = dict(k7=k7)
    for t in range(1, turns + 1):
        g.turn(t)
        if t == 4: out['l4'] = g.drops_t >= {1, 2, 3, 4}
        if t == 5: out['screw'] = g.mana_sources() < 4
        if t == 8:
            out['spells'] = g.spells
            out['flood'] = g.seen_lands > 8 and not (g.seen & SINKS)
        if g.kill and t >= 8: break
    out['kill'] = g.kill or turns + 1
    ct = g.cast_turn
    out['bumi5'] = ct.get('Bumi, Unleashed', 99) <= 5
    out['gil3'] = ct.get('Gilanra, Caller of Wirewood', 99) <= 3
    out['alena5'] = ct.get('Alena, Kessig Trapper', 99) <= 5
    out.setdefault('spells', g.spells); out.setdefault('flood', False); out.setdefault('screw', False); out.setdefault('l4', False)
    return out

def run(path, games=20000, seed=7):
    names, cm = load(path)
    S = {n: spec(n) for n in set(names) | set(cm) | {'Forest', 'Mountain', 'Sheltered Thicket', 'Tangled Vale'}}
    for n in S:
        if not S[n]['land']:
            S[n]['type'] = DB.execute("select type_line from cards where name = ? or name like ? limit 1", (n, n + ' // %')).fetchone()[0]
    rng = random.Random(seed); agg = Counter(); kills = []
    for _ in range(games):
        o = play(names, cm, S, rng)
        for k, v in o.items():
            if k != 'kill': agg[k] += v
        kills.append(o['kill'])
    f = lambda k: agg[k] / games
    L = sum(S[n]['land'] for n in names)
    kills.sort()
    print(f"{os.path.basename(path):16s} {L:2d}L | keep7 {f('k7'):.3f} | 4th land T4 {f('l4'):.3f} | Bumi T5 {f('bumi5'):.3f} | Gil T3 {f('gil3'):.3f}"
          f" Alena T5 {f('alena5'):.3f} | screw {f('screw'):.3f} | flood {f('flood'):.3f} | spells T1-8 {f('spells'):.2f}"
          f" | clock median T{statistics.median(kills):.0f} (P<=T6 {sum(k <= 6 for k in kills) / games:.3f}, <=T7 {sum(k <= 7 for k in kills) / games:.3f},"
          f" <=T8 {sum(k <= 8 for k in kills) / games:.3f}, mean {statistics.mean(kills):.2f})", flush=True)

if __name__ == '__main__':
    a = sys.argv[1:]; games = 20000; seed = 7
    if '--games' in a: i = a.index('--games'); games = int(a[i + 1]); del a[i:i + 2]
    if '--cmdr' in a: i = a.index('--cmdr'); EXTRA_CMDR = a[i + 1]; del a[i:i + 2]
    if '--chump' in a: a.remove('--chump'); CHUMP = True
    if '--combat-only' in a: a.remove('--combat-only'); COMBAT_ONLY = True
    if '--seed' in a: i = a.index('--seed'); seed = int(a[i + 1]); del a[i:i + 2]
    for p in a: run(p, games, seed)
