"""Consistency goldfish for Gilanra + Alena (extends refute/sim3.py: same pod model, card-level instead of kinds).
4-pod: draw on turn 1, first mulligan free, then London. Keep 7 with 3-5 lands, or 2 lands + an MV<=2 ramp piece;
keep 6 with 2-5 lands; keep 5. Colour is modelled: units R / G / A (either) / C / Gil (Gilanra's G: a 6+ MV spell
paid with it draws). Alena taps for R = greatest power that entered this turn (not the turn she enters); Selvala
nets X-1 (X = greatest power); sim3 rules kept: Sol Ring first, Alena cast first once 5 mana is up, tapland on T1
when there is no 1-drop. Combat, removal and opponents are ignored.
Run: py verify-2026-10-07/alena-gilanra/sim4.py <list.txt> [...] [--games N] [--lands N] (--lands adds/removes basics)
"""
import os, random, re, sqlite3, sys
from collections import Counter

DB = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
CMDR = ('Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper')

# ---- lands: units, enters tapped, special
LANDS = {
    'Forest': (['G'], False, 'basicF'), 'Mountain': (['R'], False, 'basicM'), 'Command Tower': (['A'], False, None),
    'Spinerock Knoll': (['R'], True, None), 'Gruul Turf': (['R', 'G'], True, 'turf'), 'Sheltered Thicket': (['A'], True, 'thicket'),
    'Fabled Passage': ([], False, 'passage'), 'Evolving Wilds': ([], False, 'wilds'), 'Terramorphic Expanse': ([], False, 'wilds'),
    'Riveteers Overlook': ([], False, 'wilds'), 'Diamond City': (['C'], False, None), 'Ash Barrens': (['C'], False, 'ash'),
    'Konstrari Annex': (['A'], True, None), 'Bristling Backwoods': (['A'], True, None), 'Tangled Vale': (['G'], True, None),
    'Temple of the False God': (['C', 'C'], False, 'temple'),
    # 2026-10-07 Omo precon box (Yavimaya: every land is also a Forest; Horizon: any colour a land could make, 1 life)
    'Yavimaya, Cradle of Growth': (['G'], False, 'yavimaya'), 'Horizon of Progress': (['A'], False, None),
    'Lair of the Hydra': (['G'], False, 'lair'), 'Desert of the Indomitable': (['G'], True, 'desert'), 'Hidden Nursery': (['G'], True, None),
}
# ---- spell tags (everything else is a plain spell from DB cost/type/power)
TAG = {
    'Sol Ring': 'rock:CC', 'Arcane Signet': 'rock:A', 'Talisman of Impulse': 'rock:A', "Commander's Sphere": 'rock:A',
    'Gruul Locket': 'rock:A', 'Firemind Vessel': 'rock:AA', 'Llanowar Elves': 'dork:G', 'Ruby, Daring Tracker': 'dork:A:haste',
    'Elvish Aberration': 'dork:GGG', 'Paradise Druid': 'dork:A', 'Frog Butler': 'dork:A', 'Nightshade Dryad': 'dork:A',
    'Ilysian Caryatid': 'dork:car', 'Tangled Florahedron // Tangled Vale': 'dork:G:mdfc', 'Selvala, Heart of the Wilds': 'selvala',
    "Nature's Lore": 'lore', 'Three Visits': 'lore', 'Farseek': 'farseek', 'Rampant Growth': 'growth', 'Shared Roots': 'growth',
    'Studious First-Year // Rampant Growth': 'firstyear', 'Cultivate': 'cultivate', 'Skyshroud Claim': 'claim',
    'Planar Engineering': 'planar', 'Traverse the Outlands': 'traverse', 'Simulacrum Shaper': 'shaper', 'Fertile Ground': 'fertile',
    'Outcaster Trailblazer': 'trailblazer', "Master's Guidance": 'mg', "Garruk's Packleader": 'packleader',
    'Soul of the Harvest': 'soul', 'Primordial Sage': 'sage', 'The Legend of Kyoshi // Avatar Kyoshi': 'kyoshi',
    'Garruk, Caller of Beasts': 'garruk', 'Combustible Gearhulk': 'combustible', 'Regal Behemoth': 'regal',
    'Dawnglade Regent': 'monarch', 'Monstrous Vortex': 'vortex', 'Boarding Party': 'cascade', 'Sweet-Gum Recluse': 'cascade',
    'Aurora Phoenix': 'cascade', 'Trumpeting Carnosaur': 'discover5', 'Planetarium of Wan Shi Tong': 'planetarium',
    'Vastlands Scavenger // Bind to Life': 'bind', 'Ulvenwald Hydra': 'hydra', 'Oblivion Sower': 'sower',
    'Ghalta, Primal Hunger': 'ghalta', 'Slinza, the Spiked Stampede': 'slinza', 'Rampaging Baloths': 'baloths',
    'Cream of the Crop': 'cream', 'Loot, Exuberant Explorer': 'loot', 'Harmonize': 'draw3', 'Shamanic Revelation': 'shamanic',
    'You Meet in a Tavern': 'tavern', 'Domri, Anarch of Bolas': 'domri', 'Ulvenwald Observer': 'plain',
    'Slavering Branchsnapper': 'fcycle', 'Saber-Tooth Moose-Lion': 'fcycle', 'Topiary Panther': 'bcycle',
    'Orchard Strider': 'bcycle', 'Spinewoods Armadillo': 'bcycle', 'Lumra, Bellow of the Woods': 'lumra',
    'Wayfarer\'s Bauble': 'bauble', 'Explore': 'explore', 'Malevolent Rumble': 'rumble',
    'Dryad of the Ilysian Grove': 'dryad', 'Sage of the Maze': 'dork:AA', 'Poison Dart Frog': 'dork:A', 'Chromatic Lantern': 'lantern',
    'Elvish Rejuvenator': 'rejuv', 'Floriferous Vinewall': 'vinewall', 'Satyr Wayfinder': 'wayfinder', 'Sylvan Scrying': 'scrying',
    'Hour of Promise': 'hour', 'Vivien Reid': 'vivien', 'Mana Reflection': 'reflection', 'Apex Devastator': 'cascade4',
    'Hydra Broodmaster': 'brood', "Seer's Sundial": 'sundial', 'Ramunap Excavator': 'ramunap',
    'Beast Within': 'hold', 'Fling': 'hold', 'Rocky Rebuke': 'hold', 'Clear Shot': 'hold', 'Hunter\'s Insight': 'hold',
}
POWER = {'Tangled Florahedron // Tangled Vale': 1, 'Sweet-Gum Recluse': 3, 'Conclave Sledge-Captain': 7, 'Emergent Woodwurm': 7,
         'Havoc Eater': 6, 'Bane of Progress': 4, 'Shriekwood Devourer': 7}
THREAT_NC = {'Garruk, Caller of Beasts', 'Warstorm Surge', 'The Legend of Kyoshi // Avatar Kyoshi'}

def spec(name):
    if name in LANDS or name == 'Tangled Vale':
        return dict(land=True)
    r = DB.execute("select mana_cost, cmc, type_line, power from cards where name = ? or name like ? limit 1", (name, name + ' // %')).fetchone()
    assert r, name
    cost, mv, tl, p = r
    cost = (cost or '').split(' // ')[0]
    pips = re.findall(r'\{([^}]+)\}', cost)
    gen = sum(int(x) for x in pips if x.isdigit())
    front = tl.split(' // ')[0]
    pw = POWER.get(name, int(p) if p and str(p).isdigit() else 0)
    return dict(land=False, name=name, gen=gen, R=pips.count('R'), G=pips.count('G'), H=sum('/' in x for x in pips),
                mv=int(mv), creature='Creature' in front, power=pw, tag=TAG.get(name, ''),
                beast='Beast' in front, threat=int(mv) >= 6 and ('Creature' in front or name in THREAT_NC))

def load(path, extra_basics=0):
    names = []
    for l in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if m: names += [m.group(2).strip()] * int(m.group(1))
    names = [n for n in names if n not in CMDR]
    full = lambda n: n if n in LANDS else (DB.execute("select name from cards where name = ? or name like ? limit 1", (n, n + ' // %')).fetchone() or [n])[0]
    names = [full(n) for n in names]
    for i in range(abs(extra_basics)):  # +: add basics alternately (Forest first); -: cut alternately
        b = 'Forest' if i % 2 == 0 else 'Mountain'
        names.append(b) if extra_basics > 0 else names.remove(b)
    return names

class Game:
    def __init__(self, names, specs, rng):
        self.S, self.rng = specs, rng
        self.lib = names[:]; rng.shuffle(self.lib)
        self.hand, self.lands, self.perm, self.crs = [], [], [], []  # lands: [name, units, tapped]; crs: [name, power, sick]
        self.extra = self.free = self.spells = 0
        self.gil = self.alena = None; self.monarch = self.regal = False; self.kyoshi = None; self.avatar = False
        self.loot = False; self.mg = 0; self.garruk = False; self.planet = False; self.bind_ready = 0
        self.next_lands = []  # lands entering tapped (untap next turn)
        self.cream = 0; self.fertile = 0; self.growth_ready = 0; self.loot_used = 0
        self.dryad = self.lantern = self.refl = self.vivien = self.sundial = False; self.brood = 0; self.gy = []  # gy: lands in graveyard

    # ---------- helpers
    def is_land(self, n): return self.S[n]['land'] or n == 'Tangled Florahedron // Tangled Vale'
    def cheap_ramp(self, n):
        s = self.S[n]
        return not s['land'] and s['mv'] <= 2 and s['tag'].split(':')[0] in ('rock', 'dork', 'lore', 'farseek', 'growth', 'firstyear', 'fertile', 'bauble')
    def keepable(self, hand, size):
        L = sum(self.is_land(c) for c in hand)
        if size == 7: return 3 <= L <= 5 or (L == 2 and any(self.cheap_ramp(c) for c in hand if not self.is_land(c)))
        return size <= 5 or 2 <= L <= 5
    def mulligan(self):
        self.hand, self.lib = self.lib[:7], self.lib[7:]
        k7 = self.keepable(self.hand, 7)
        if k7: return True
        for size in (7, 6, 5):  # free mulligan = 7 again, then London: bottom 1, then 2
            self.lib += self.hand; self.rng.shuffle(self.lib)
            self.hand, self.lib = self.lib[:7], self.lib[7:]
            for _ in range(7 - size):
                L = [c for c in self.hand if self.is_land(c)]
                c = L[0] if len(L) > 4 else max((c for c in self.hand if not self.is_land(c)), key=lambda c: self.S[c]['mv'], default=self.hand[0])
                self.hand.remove(c); self.lib.append(c)
            if self.keepable(self.hand, size): return k7
        return k7
    def greatest(self): return max((p for _, p, _ in self.crs), default=0)
    def sources(self):  # lands + rocks + dorks, commanders excluded
        return len(self.lands) + sum(1 for x in self.perm if x[0] == 'rock') + sum(1 for c in self.crs if self.S.get(c[0], {}).get('tag', '').startswith(('dork', 'selvala')) or c[0] == 'Avatar Kyoshi')
    def draw(self, n=1, extra=True):
        for _ in range(n):
            if self.lib: self.hand.append(self.lib.pop(0)); self.extra += extra
    def colour_need(self):
        r = sum(1 for u in self.all_units() if u in 'RA'); g = sum(1 for u in self.all_units() if u in 'GA')
        nr = max((self.S[c]['R'] for c in self.hand if not self.is_land(c)), default=0) + 1
        ng = max((self.S[c]['G'] for c in self.hand if not self.is_land(c)), default=0) + 1
        return 'R' if nr - r > ng - g else 'G'
    def all_units(self): return [u for l in self.lands for u in l[1]] + [u for x in self.perm for u in x[1]]
    def fetch(self, kinds, tapped, to_hand=False):
        want = self.colour_need()
        order = {'R': ['Mountain', 'Forest'], 'G': ['Forest', 'Mountain']}[want]
        pick = None
        if 'thicket' in kinds and 'Sheltered Thicket' in self.lib and (want == 'R' or 'forest' not in kinds): pick = 'Sheltered Thicket'
        for b in order:
            if pick: break
            if (b == 'Forest' and ('forest' in kinds or 'basic' in kinds)) or (b == 'Mountain' and ('mountain' in kinds or 'basic' in kinds)):
                if b in self.lib: pick = b
        if not pick and 'Sheltered Thicket' in self.lib and 'thicket' in kinds: pick = 'Sheltered Thicket'
        if not pick: return False
        self.lib.remove(pick); self.rng.shuffle(self.lib)
        if to_hand: self.hand.append(pick)
        else: self.put_land(pick, tapped or LANDS[pick][1])
        return True
    def lunits(self, units):  # Dryad / Lantern: every land taps any colour; Yavimaya: every land is also a Forest
        if self.dryad or self.lantern: return ['A'] * len(units)
        if any(l[0] == 'Yavimaya, Cradle of Growth' for l in self.lands): return ['A' if u == 'R' else u for u in units]
        return units
    def add(self, units):  # mana from tapping a permanent; Mana Reflection doubles it
        self.pool.update(list(units) * (2 if self.refl else 1))
    def put_land(self, n, tapped):
        units = LANDS[n][0][:]
        if LANDS[n][2] == 'lair' and len(self.lands) >= 2: tapped = True
        self.lands.append([n, units, tapped])
        if tapped: self.next_lands.append(self.lands[-1])
        else: u = self.lunits(units); self.add(u if not self.regal else u + ['A'] * len(u))
        self.landfall()
    def landfall(self):
        if 'Rampaging Baloths' in (c[0] for c in self.crs): self.enter('Beast token', 4, token=True)
        if self.sundial and (self.t >= 6 or sum(self.pool.values()) >= 6):
            q = self.pay(2, 0, 0, 0, False)
            if q: self.pool = q[0]; self.draw()

    # ---------- casting
    def pay(self, gen, R, G, H, big):
        p = self.pool.copy(); gil = False
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
    def cost(self, s):
        gen = s['gen']
        if s['tag'] == 'ghalta': gen = max(0, gen - sum(p for _, p, _ in self.crs))
        if s['beast'] and any(c[0] == 'Slinza, the Spiked Stampede' for c in self.crs): gen = max(0, gen - 2)
        return gen
    def can(self, s):
        return self.pay(self.cost(s), s['R'], s['G'], s['H'], s['mv'] >= 6)
    def cast(self, n, paid=True):
        s = self.S[n]
        if paid:
            p, gil = self.can(s); self.pool = p
            if gil and s['mv'] >= 6: self.draw()
        self.spells += 1; self.n6 += s['threat']; self.cast_triggers(n, s)
        self.resolve(n, s)
    def cast_triggers(self, n, s):
        if s['creature']:
            if any(c[0] == 'Primordial Sage' for c in self.crs): self.draw()
            if self.vortex and s['power'] >= 5: self.discover(s['mv'])
        if s['tag'] == 'cascade': self.discover(s['mv'] - 1)
        if s['tag'] == 'cascade4':
            for _ in range(4): self.discover(s['mv'] - 1)
        if s['tag'] == 'sower':
            for _ in range(4):
                if self.rng.random() < 0.37: self.lands.append(['stolen', ['C'], False]); self.pool['C'] += 1; self.landfall()
        if s['threat'] and self.first6 is None: self.first6 = self.t
    def discover(self, x):
        seen = []
        while self.lib:
            c = self.lib.pop(0)
            if not self.is_land(c) and self.S[c]['mv'] <= x:
                self.lib += seen; self.free += 1; self.cast(c, paid=False); return
            seen.append(c)
        self.lib += seen
    def resolve(self, n, s):
        tag = s['tag']; kind = tag.split(':')[0]
        if s['creature']:
            pw = s['power']
            if tag == 'hydra': pw = len(self.lands) + 1
            if tag == 'lumra': pw = len(self.lands)
            self.enter(n, pw, sick=not tag.endswith('haste'))
        if kind == 'rock': self.perm.append(['rock', list(tag.split(':')[1])]); self.add(tag.split(':')[1])
        elif tag == 'lantern': self.perm.append(['rock', ['A']]); self.lantern = True; self.add('A')
        elif tag == 'dryad': self.dryad = True; self.play_land(self.t)
        elif tag == 'reflection': self.refl = True
        elif tag == 'sundial': self.sundial = True
        elif tag == 'brood': self.brood += 1
        elif tag == 'rejuv': self.dig_land(5, 'battlefield')
        elif tag == 'vinewall': self.dig_land(6, 'hand')
        elif tag == 'wayfinder': self.dig_land(4, 'hand', mill=True)
        elif tag == 'scrying': self.tutor_lands(1, to_hand=True)
        elif tag == 'hour': self.tutor_lands(2)
        elif tag == 'vivien': self.vivien = True; self.vivien_plus()
        elif tag == 'lore': self.fetch({'forest', 'thicket'}, False)
        elif tag == 'farseek': self.fetch({'mountain', 'thicket'}, True)
        elif tag in ('growth', 'shaper'): self.fetch({'basic'}, True)
        elif tag == 'cultivate': self.fetch({'basic'}, True); self.fetch({'basic'}, False, to_hand=True)
        elif tag == 'claim': self.fetch({'forest', 'thicket'}, False); self.fetch({'forest', 'thicket'}, False)
        elif tag == 'planar':
            for l in sorted(self.lands, key=lambda l: len(l[1]))[:2]: self.lands.remove(l)
            for _ in range(4): self.fetch({'basic'}, True)
        elif tag == 'traverse':
            for _ in range(self.greatest()): self.fetch({'basic'}, True)
        elif tag == 'hydra': self.fetch({'thicket', 'basic'}, True)
        elif tag == 'firstyear': self.growth_ready += 1
        elif kind == 'dork' and tag.endswith('haste'): self.add(tag.split(':')[1])
        elif tag == 'fertile': self.fertile += 1; self.pool['A'] += 1
        elif tag == 'mg': self.mg += 1
        elif tag == 'kyoshi': self.draw(self.greatest()); self.kyoshi = self.t
        elif tag == 'garruk': self.garruk = True; self.garruk_plus()
        elif tag == 'combustible' and self.rng.random() < 0.5: self.draw(3)
        elif tag in ('regal', 'monarch'): self.monarch = True; self.regal |= tag == 'regal'
        elif tag == 'vortex': self.vortex = True
        elif tag == 'discover5': self.discover(5)
        elif tag == 'planetarium': self.planet = True
        elif tag == 'bind': self.bind_ready += 1
        elif tag == 'cream': self.cream += 1
        elif tag == 'loot': self.loot = True; self.play_land(self.t)
        elif tag == 'draw3': self.draw(3)
        elif tag == 'shamanic': self.draw(len(self.crs))
        elif tag == 'tavern': self.to_hand(5, lambda c: not self.is_land(c) and self.S[c]['creature'])
        elif tag == 'domri': self.perm.append(['rock', ['A']]); self.pool['A'] += 1; self.domri = True
        elif tag == 'explore': self.draw(); self.play_land(self.t)
        elif tag == 'rumble': self.to_hand(4, lambda c: not self.is_land(c) or True, one=True)
        elif tag == 'bauble': self.perm.append(['bauble', []])
    def to_hand(self, k, ok, one=False):
        top, self.lib = self.lib[:k], self.lib[k:]
        hits = [c for c in top if ok(c)]
        if one: hits = sorted(hits, key=lambda c: (self.is_land(c) == self.want_land(), self.S[c].get('mv', 0)))[-1:]
        for c in hits: self.hand.append(c); self.extra += 1
        self.lib += [c for c in top if c not in hits] if not one else []
    def best_land(self, cands):
        pref = ['Yavimaya, Cradle of Growth', 'Horizon of Progress', 'Command Tower', 'Sheltered Thicket', 'Fabled Passage',
                'Mountain' if self.colour_need() == 'R' else 'Forest', 'Mountain', 'Forest']
        return min(cands, key=lambda c: pref.index(c) if c in pref else 99)
    def land_out(self, b):  # a land put onto the battlefield tapped by an effect; fetches crack at once
        if LANDS[b][2] in ('passage', 'wilds'): self.gy.append(b); self.landfall(); self.fetch({'basic'}, True)
        else: self.put_land(b, True)
    def dig_land(self, k, where, mill=False):
        top, self.lib = self.lib[:k], self.lib[k:]
        L = [c for c in top if self.S[c]['land'] and not (where == 'battlefield' and c == 'Gruul Turf')]
        if L:
            b = self.best_land(L); top.remove(b)
            if where == 'hand': self.hand.append(b)
            else: self.land_out(b)
        if mill: self.gy += [c for c in top if self.S[c]['land']]
        else: self.lib += top
    def tutor_lands(self, k, to_hand=False):
        for _ in range(k):
            L = [c for c in set(self.lib) if self.S[c]['land'] and c != 'Gruul Turf' and LANDS[c][2] not in ('passage', 'wilds')]
            if not L: return
            b = self.best_land(L); self.lib.remove(b); self.rng.shuffle(self.lib)
            if to_hand: self.hand.append(b)
            else: self.put_land(b, True)
    def vivien_plus(self):
        top, self.lib = self.lib[:4], self.lib[4:]
        ok = [c for c in top if self.is_land(c) or self.S[c]['creature']]
        if ok:
            L = [c for c in ok if self.is_land(c)]; C = [c for c in ok if not self.is_land(c)]
            b = L[0] if L and (self.want_land() or not C) else max(C, key=lambda c: self.S[c]['power'])
            top.remove(b); self.hand.append(b); self.extra += 1
        self.lib += top
    def loot_up(self, t): return self.loot and self.loot_used != t and any(c[0] == 'Loot, Exuberant Explorer' and not c[2] for c in self.crs)
    def want_land(self): return sum(self.is_land(c) for c in self.hand) == 0 and len(self.lands) < 7
    def garruk_plus(self): self.to_hand(5, lambda c: not self.is_land(c) and self.S[c]['creature'])
    def enter(self, n, pw, sick=True, token=False):
        if getattr(self, 'domri', False): pw += 1
        others = [p for _, p, _ in self.crs]
        self.crs.append([n, pw, sick]); self.entered = max(self.entered, pw)
        for c, _, _ in self.crs[:-1]:
            t = self.S.get(c, {}).get('tag', '')
            if (t == 'packleader' and pw >= 3) or (t == 'trailblazer' and pw >= 4) or (t == 'soul' and not token): self.draw()
            if t == 'selvala' and pw >= 5 and pw > max(others, default=0): self.draw()
        if n in self.S and self.S[n]['tag'] == 'trailblazer': self.pool['A'] += 1
        for _ in range(self.cream):
            top = self.lib[:pw]
            if top:
                best = max(top, key=lambda c: (self.is_land(c) == self.want_land(), self.S[c].get('mv', 0) if not self.is_land(c) else 0))
                self.lib.remove(best); self.lib.insert(0, best)

    # ---------- turn
    def priority(self, n):  # ramp/engines first through T4; from T5 the biggest threat, then Alena, then the rest
        s = self.S[n]; t = self.t; tag = s['tag']; kind = tag.split(':')[0]; early = t <= 4
        if tag == 'hold': return 60
        if n == 'Sol Ring': return 1000
        if s['mv'] <= 2 and kind in ('rock', 'dork', 'lore', 'farseek', 'growth', 'firstyear', 'fertile', 'bauble', 'explore', 'rumble', 'cream',
                                     'vinewall', 'wayfinder', 'scrying'): return 900 if early else 300
        if kind in ('rock', 'selvala', 'cultivate', 'shaper', 'loot', 'domri', 'claim', 'planar', 'dork', 'dryad', 'lantern', 'rejuv') and s['mv'] <= 4: return 800 if early else 290
        if tag == 'hour': return 800 if early else 290
        if tag == 'reflection': return 598
        if tag in ('mg', 'trailblazer'): return 700 if early else 400
        if tag == 'traverse': return 560 if self.greatest() >= 5 else 90
        if s['mv'] >= 5 or s['creature'] and s['power'] >= 5: return 600 + s['mv'] + 20 * (tag in ('soul', 'sage', 'kyoshi', 'garruk', 'packleader', 'vortex'))
        return 100 + s['mv']
    def turn(self, t):
        self.t = t; self.entered = 0; self.extra_drop = 0
        for l in self.next_lands: l[2] = False
        self.next_lands = []
        for c in self.crs: c[2] = False
        self.draw(extra=False)
        if self.kyoshi and t - self.kyoshi == 2 and not self.avatar: self.avatar = True; self.crs.append(['Avatar Kyoshi', 5, True])
        self.pool = Counter(u for l in self.lands if not l[2] for u in (self.lunits(l[1]) + ['A'] * len(l[1]) if self.regal else self.lunits(l[1])))
        for x in self.perm: self.pool.update(x[1])
        self.pool['A'] += self.fertile
        for c in self.crs:
            if c[2]: continue
            tag = self.S.get(c[0], {}).get('tag', '')
            if tag.startswith('dork'): self.pool.update('AA' if tag == 'dork:car' and self.greatest() >= 4 else tag.split(':')[1] if tag != 'dork:car' else 'A')
            if c[0] == CMDR[0]: self.pool['Gil'] += 1
        if self.refl: self.pool = Counter({k: 2 * v for k, v in self.pool.items()})
        # land drop(s)
        drops = 1 + self.loot + self.dryad
        for _ in range(drops + self.extra_drop):
            self.play_land(t)
        if self.planet and sum(self.pool.values()) >= 1: self.planetarium()
        if self.garruk: self.garruk_plus()
        if self.vivien: self.vivien_plus()
        stuck = set()
        while True:
            # landcycling when no land to play
            if self.land_played < 1 + self.loot + self.dryad and not any(self.is_land(c) for c in self.hand) and t <= 7:
                cyc = [c for c in self.hand if self.S[c]['tag'] in ('fcycle', 'bcycle') or c == 'Elvish Aberration']
                for c in cyc:
                    q = self.pay(2, 0, 0, 0, False) if self.S[c]['tag'] != 'bcycle' else self.pay(1, 0, 1, 0, False)
                    if q:
                        self.pool = q[0]; self.hand.remove(c)
                        self.fetch({'forest', 'thicket'} if self.S[c]['tag'] != 'bcycle' else {'basic'}, False, to_hand=True)
                        self.play_land(t); break
            cands = [c for c in set(self.hand) if not self.is_land(c) or (c == 'Tangled Florahedron // Tangled Vale')]
            cands = [c for c in cands if self.S[c]['tag'] != 'hold' or t >= 4]
            opts = [(self.priority(c), c) for c in cands if self.can(self.S[c])]
            for i, cm in enumerate(CMDR):
                if (self.gil if i == 0 else self.alena) is None and self.can(self.S[cm]):
                    if i == 1 and sum(self.pool.values()) < 5: continue
                    opts.append((850 if i == 0 else 750 if t <= 4 else 590, cm))
            if self.bind_ready and self.pay(4, 0, 1, 0, False): opts.append((700 if t <= 4 else 595, 'BIND'))
            if self.growth_ready and self.pay(1, 0, 1, 0, False): opts.append((900 if t <= 4 else 300, 'GROWTH'))
            if self.loot_up(t) and self.pay(4, 0, 2, 0, False): opts.append((504, 'LOOT'))
            if opts:
                _, c = max(opts)
                if c == 'GROWTH':
                    self.pool = self.pay(1, 0, 1, 0, False)[0]; self.growth_ready -= 1; self.spells += 1; self.fetch({'basic'}, True); continue
                if c == 'LOOT':
                    self.pool = self.pay(4, 0, 2, 0, False)[0]; self.loot_used = t
                    top, self.lib = self.lib[:6], self.lib[6:]
                    cr = [x for x in top if not self.is_land(x) and self.S[x]['creature'] and self.S[x]['mv'] <= len(self.lands)]
                    if cr:
                        b = max(cr, key=lambda x: self.S[x]['power']); top.remove(b); self.free += 1; self.resolve(b, self.S[b]); self.n6 += self.S[b]['threat']
                        if self.S[b]['threat'] and self.first6 is None: self.first6 = t
                    self.lib += top; continue
                if c == 'BIND':
                    self.pool = self.pay(4, 0, 1, 0, False)[0]; self.bind_ready -= 1; self.spells += 1
                    top, self.lib = self.lib[:7], self.lib[7:]
                    cr = [x for x in top if not self.is_land(x) and self.S[x]['creature']]
                    if cr:
                        b = max(cr, key=lambda x: self.S[x]['power']); self.free += 1; self.resolve(b, self.S[b])
                        if self.S[b]['threat'] and self.first6 is None: self.first6 = t
                        self.n6 += self.S[b]['threat']
                    continue
                if c in CMDR:
                    s = self.S[c]; self.pool = self.can(s)[0]; self.spells += 1
                    self.enter(c, s['power'])
                    if c == CMDR[0]: self.gil = t
                    else: self.alena = t
                    continue
                self.hand.remove(c); self.cast(c)
                continue
            # conditional mana, once each per turn: Selvala, Avatar Kyoshi, then Alena last
            done = False
            for c in self.crs:
                if c[2] or c[0] in stuck: continue
                if c[0] == 'Selvala, Heart of the Wilds' and self.greatest() >= 3:
                    q = self.pay(0, 0, 1, 0, False)
                    if q: self.pool = q[0]; self.add('A' * self.greatest()); stuck.add(c[0]); done = True; break
                if c[0] == 'Avatar Kyoshi': self.add('A' * self.greatest()); stuck.add(c[0]); done = True; break
            if not done and self.alena and self.alena < t and 'alena' not in stuck and self.entered:
                self.add('R' * self.entered); stuck.add('alena'); done = True
            if not done: break
        # mana sink: Hydra Broodmaster monstrosity X ({X}{X}{G}) makes X X/X tokens
        if self.brood and any(c[0] == 'Hydra Broodmaster' for c in self.crs) and sum(self.pool.values()) >= 5:
            x = (sum(self.pool.values()) - 1) // 2; q = self.pay(2 * x, 0, 1, 0, False)
            if q:
                self.pool = q[0]; self.brood -= 1
                for _ in range(x): self.enter('Hydra token', x, token=True)
        # flood valve: cycle Thicket / Ash Barrens / Desert with spare mana when holding lands and well stocked
        for c in ('Sheltered Thicket', 'Ash Barrens', 'Desert of the Indomitable'):
            if c in self.hand and len(self.lands) >= 6 and sum(self.is_land(x) for x in self.hand) >= 2:
                q = self.pay(2 if c == 'Sheltered Thicket' else 1, 0, 1 if c == 'Desert of the Indomitable' else 0, 0, False)
                if q: self.pool = q[0]; self.hand.remove(c); self.gy.append(c); self.draw(extra=False); self.cycled += 1
        if self.mg and self.greatest() >= 4: self.draw(self.mg)
        if self.monarch: self.draw()
    def play_land(self, t):
        hand_l = [c for c in self.hand if self.S[c]['land']]
        mdfc = 'Tangled Florahedron // Tangled Vale' in self.hand
        if not hand_l and not mdfc and self.gy and any(c[0] == 'Ramunap Excavator' for c in self.crs):
            b = self.best_land(self.gy); self.gy.remove(b); self.hand.append(b); hand_l = [b]  # play it from the graveyard
        if not hand_l and not mdfc: return
        one_drop = any(c in ('Sol Ring', 'Llanowar Elves', 'Studious First-Year // Rampant Growth') for c in self.hand)
        tapped = [c for c in hand_l if LANDS[c][1] or LANDS[c][2] == 'wilds' or (LANDS[c][2] == 'passage' and len(self.lands) < 3)]
        tapped = [c for c in tapped if not (LANDS[c][2] == 'turf' and not self.lands)]
        untapped = [c for c in hand_l if c not in tapped and not (LANDS[c][2] == 'turf')]
        want = 'basicM' if self.colour_need() == 'R' else 'basicF'
        if t == 1 and not one_drop and tapped: pick = tapped[0]
        elif untapped: pick = sorted(untapped, key=lambda c: (LANDS[c][2] == want, c == 'Command Tower'))[-1]
        elif tapped: pick = tapped[0]
        elif hand_l and LANDS[hand_l[0]][2] == 'turf' and self.lands: pick = hand_l[0]
        elif mdfc and not hand_l: pick = 'Tangled Florahedron // Tangled Vale'
        else: return
        self.hand.remove(pick); self.land_played += 1
        if t <= 4: self.drop_turns.add(t)
        if pick.startswith('Tangled'): self.put_land('Tangled Vale', True); return
        kind = LANDS[pick][2]
        if kind in ('passage', 'wilds'):
            self.landfall(); self.gy.append(pick)
            self.fetch({'basic'}, True)
            if kind == 'passage' and len(self.lands) >= 4 and self.lands[-1][2]:
                l = self.lands[-1]; l[2] = False; self.next_lands.remove(l); self.add(self.lunits(l[1]))
            return
        if kind == 'turf':
            b = next((l for l in self.lands if l[0] in ('Forest', 'Mountain')), self.lands[0])
            self.lands.remove(b); self.hand.append(b[0]) if b[0] in LANDS else None
        self.put_land(pick, LANDS[pick][1])
    def planetarium(self):
        p = self.pay(1, 0, 0, 0, False)
        if not p: return
        self.pool = p[0]
        top = self.lib[:2]
        keep = [c for c in top if not self.is_land(c) or self.want_land()]
        self.lib = keep + self.lib[2:] + [c for c in top if c not in keep]
        if self.lib and not self.is_land(self.lib[0]):
            c = self.lib.pop(0); self.free += 1; self.cast(c, paid=False)

def play(names, specs, rng, turns=8):
    g = Game(names, specs, rng)
    g.first6 = None; g.n6 = 0; g.land_played = 0; g.drop_turns = set(); g.cycled = 0; g.vortex = False
    k7 = g.mulligan()
    out = {}
    for t in range(1, turns + 1):
        g.land_played = 0
        g.turn(t)
        if t == 5: out['screw'] = g.sources() < 4
        if t >= 5: out['idle'] = out.get('idle', 0) + (sum(g.pool.values()) >= 3 and not any(not g.is_land(c) for c in g.hand))
        if t == 7: out['n7'] = g.n6
    out.update(k7=k7, drops4=len(g.drop_turns) == 4, f5=bool(g.first6 and g.first6 <= 5), f6=bool(g.first6 and g.first6 <= 6),
               spells=g.spells, extra=g.extra, free=g.free, n6=g.n6,
               flood=sum(g.is_land(c) for c in g.hand) + max(0, len(g.lands) - 8),
               gasless=sum(not g.is_land(c) for c in g.hand) <= 1)
    return out

def run(path, games=20000, seed=7, basics=0):
    names = load(path, basics)
    specs = {n: spec(n) for n in set(names) | set(CMDR) | {'Tangled Vale', 'Forest', 'Mountain'}}
    rng = random.Random(seed); agg = Counter()
    for _ in range(games):
        o = play(names, specs, rng)
        for k, v in o.items(): agg[k] += v
        agg['flooded'] += o['flood'] >= 3; agg['lo7'] += o['n7'] <= 1; agg['dry'] += o['flood'] >= 3 and o['gasless']
    L = sum(specs[n]['land'] for n in names)
    f = lambda k: agg[k] / games
    print(f"{os.path.basename(path):24s} {L:2d}L | keep7 {f('k7'):.3f} | 4 drops by T4 {f('drops4'):.3f} | 6+ threat T5 {f('f5'):.3f} T6 {f('f6'):.3f}"
          f" | spells T1-8 {f('spells'):.2f} | screw {f('screw'):.3f} | flood>=3 {f('flooded'):.3f} (mean {f('flood'):.2f})"
          f" | idle T5-8 {f('idle'):.3f} | extra draws {f('extra'):.2f} | free {f('free'):.2f} | 6+ by T8 {f('n6'):.2f} | <=1 by T7 {f('lo7'):.3f}", flush=True)

if __name__ == '__main__':
    args = sys.argv[1:]; games = 20000; basics = [0]
    if '--games' in args: i = args.index('--games'); games = int(args[i + 1]); del args[i:i + 2]
    if '--lands' in args: i = args.index('--lands'); basics = [int(x) for x in args[i + 1].split(',')]; del args[i:i + 2]
    for p in args:
        for b in basics:
            run(p, games, basics=b)
