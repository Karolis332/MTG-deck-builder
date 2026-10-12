"""Build the neutral head-to-head sim hh.py from bumi/sim.py (read-only) plus the refuter's fixes. Every replacement is asserted."""
import re
src = open('verify-2026-10-07/gruul/bumi/sim.py', encoding='utf-8').read()
def rep(old, new, count=1):
    global src
    assert src.count(old) == count, (old, src.count(old))
    src = src.replace(old, new)

# --- tags for the Gilanra-side cards bumi/sim.py leaves vanilla; keywords; constants
rep("    for n in names: T[n] = tag\n", """    for n in names: T[n] = tag
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
    o = re.sub(r'\\([^)]*\\)', '', ((o and o[0]) or '').split('//')[0]).lower()
    ls = [l.strip() for l in o.splitlines()]
    has = lambda k: any(re.fullmatch(r'(?:[\\w ]+, )*' + k + r'(?:, [\\w {}]+)*', l) for l in ls)
    return dict(trample=has('trample'), flying=has('flying'), menace=has('menace'))
""")
rep("'Calamity, Galloping Inferno', 'Ruby, Daring Tracker'}", "'Calamity, Galloping Inferno', 'Ruby, Daring Tracker', 'Gigantic Big Bear'}")
# neutral sink set: repeatable mana sinks / land-to-threat engines only (one-shot spells removed)
rep("""SINKS = {'Ba Sing Se',""", """SINKS_OLD = {'Ba Sing Se',""")
rep("CHEAP_RAMP = (", """SINKS = {'Ba Sing Se', 'Crawling Barrens', 'Lair of the Hydra', "Rogue's Passage", 'Savage Mansion', 'Omashu City', 'Cryptic Caves',
         'Spinerock Knoll', 'Rockalanche', 'Bitter Work', 'Nissa, Who Shakes the World', 'Planetarium of Wan Shi Tong', 'Spearbreaker Behemoth',
         'Hoard-Smelter Dragon', 'Garruk, Caller of Beasts', 'Faithless Looting', 'Lumbering Worldwagon'}
CHEAP_RAMP = (""")
rep("legend='Legendary' in front, instant='Instant' in front, beast='Beast' in front, star=p == '*')",
    "legend='Legendary' in front, instant='Instant' in front, beast='Beast' in front, star=p == '*', **kws(name))")
rep("s.alena_t = None; s.entered = 0", "s.alena_t = None; s.entered = 0; s.bind = 0; s.burned = 0; s._big = False")

# --- Gilanra is tapped first for a 6+ MV spell (bumi/sim.py tapped her only when lands ran out); Selvala mana
rep("            elif p.cr and p.units and (not p.sick or p.haste): out.append((1, p.units, p))\n",
    """            elif p.cr and p.units and (not p.sick or p.haste): out.append((-1 if (s._big and p.units == 'g') else 1, p.units, p))
            elif p.cr and p.name == 'Selvala, Heart of the Wilds' and not p.sick:
                g = s.greatest() if g is None else g
                if g >= 2: out.append((1, 'A' * min(g - 1, 30), p))  # net of the {G} it needs
""")
rep("pool = s.pool.copy(); taps = []; src = s.sources(allow_lcr); tre = 0", "s._big = big; pool = s.pool.copy(); taps = []; src = s.sources(allow_lcr); s._big = False; tre = 0")

# --- casting: Spider untap, Apex cascade x4, Myojin from hand
rep("""        s.spells += 1
        if sp['creature']:""", """        s.spells += 1
        if sp['mv'] >= 4:
            for q in s.perms:
                if q.name == 'Spider Manifestation' and q.tapped and not q.sick: q.tapped = False
        if sp['tag'] == 'cascade4':
            for _ in range(4): s.discover(sp['mv'] - 1)
        if sp['tag'] == 'myojin' and paid: s.burn(7)
        if sp['creature']:""")
# --- ETB triggers: Terror, Warstorm, Selvala draw, Cream, BSA, Roxanne, Trailblazer mana
rep("        s.entered = max(s.entered, pw)\n", """        s.entered = max(s.entered, pw)
        pwn = s.power(p)
        for q in s.perms[:-1]:
            if q.name == 'Terror of the Peaks': s.burn(pwn)
            if q.name == 'Selvala, Heart of the Wilds' and pwn > max((s.power(x) for x in s.crs() if x is not p), default=-1): s.draw()
            if q.name == 'Cream of the Crop': s.cream(pwn)
        if s.has('warstorm'): s.burn(pwn)
        if n == "Burning Sun's Avatar": s.burn(3)
        if n == 'Roxanne, Starfall Savant': s.meteor()
        if n == 'Outcaster Trailblazer': s.pool['A'] += 1
""")
rep("        elif tg == 'combustible' and s.rng.random() < 0.5: s.draw(3)\n", """        elif tg == 'combustible':
            if s.rng.random() < 0.5: s.draw(3)
            else: s.burn(sum(s.S[c].get('mv', 0) for c in s.lib[:3] if not s.is_land(c))); s.lib = s.lib[3:]
        elif tg == 'bind': s.bind += 1
""")
rep("    def discard(s, k):\n", """    def burn(s, n):
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
    def discard(s, k):
""")
# --- Bind to Life and Planetarium as main-phase mana sinks
rep("    def sinks(s, phase):\n", """    def sinks(s, phase):
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
""")
# --- combat: Surrak, Drakuseth, Roxanne, generic TBR, Moraug count before damage, chump blocker
rep("        if s.innk: s.add", """        if s.has('surrak') and sum(s.power(p) for p in s.crs()) >= 8:
            sk = [p for p in s.crs() if not s.can_attack(p) and not p.tapped and p.kind != 'land']
            if sk: max(sk, key=s.power).haste = True
        if s.innk: s.add""")
rep("            if s.tag(p.name) == 'boulder':", """            if p.name == 'Drakuseth, Maw of Flames': s.burn(4)
            if p.name == 'Roxanne, Starfall Savant': s.meteor()
            if s.tag(p.name) == 'boulder':""")
rep("            s.hand.remove('Temur Battle Rage'); s.spells += 1; b.ds = True\n", """            s.hand.remove('Temur Battle Rage'); s.spells += 1; b.ds = True
        if not b and 'Temur Battle Rage' in s.hand:
            x = max((p for p in att if not s.ds(p)), key=s.power, default=None)
            if x and s.power(x) >= 5 and s.pay(1, 1, 0, 0): s.hand.remove('Temur Battle Rage'); s.spells += 1; x.ds = True; x.tr = True
        blk = None
        if CHUMP:
            cand = [p for p in att if not s.evasive(p)]
            if cand: blk = max(cand, key=lambda p: s.power(p) * (2 if s.ds(p) else 1))
""")
rep("""            strikes = 2 if s.ds(p) else 1""", """            strikes = 2 if s.ds(p) else 1; p.atk += 1""")
rep("""                d = s.power(p)
                if d <= 0: continue""", """                d = s.power(p)
                if p is blk: d = (d - 1 if _k == 0 else d) if s.trample(p) else 0
                if d <= 0: continue""")
rep("            for _ in range(strikes):\n                d = s.power(p)", "            for _k in range(strikes):\n                d = s.power(p)")
rep("            p.atk += 1\n", "", 1)
# --- MDFC as a land; landcycling; keep rule counts the MDFC as a land
rep("""        hand_l = [c for c in s.hand if s.is_land(c)]
        if not hand_l: return False""", """        hand_l = [c for c in s.hand if s.is_land(c)]
        if not hand_l and MDFC in s.hand:
            s.hand.remove(MDFC); s.drops -= 1; s.drops_t.add(s.t); s.put_land('Tangled Vale', True); return True
        if not hand_l: return False""")
rep("        s.drops = 1 + s.cnt('dryad'); s.phase = 'main1'\n", "        s.drops = 1 + s.cnt('dryad'); s.phase = 'main1'\n        s.landcycle()\n")
rep("        L = sum(s.is_land(c) for c in hand)\n", "        L = sum(s.is_land(c) or c == MDFC for c in hand)\n")
rep("p.tapped_once = False; p.ds = False", "p.tapped_once = False; p.ds = False; p.tr = False")
rep("        if s.monarch: s.draw()\n", "        if s.monarch: s.draw()\n        if s.kill is None and s.dmg >= 40: s.kill = t\n")
rep("('Kami of Whispered Hopes', 'Ilysian Caryatid', 'Avatar Kyoshi')", "('Kami of Whispered Hopes', 'Ilysian Caryatid', 'Avatar Kyoshi', 'Selvala, Heart of the Wilds')")
# --- priorities for Gilanra-side engines bumi/sim.py left at 100 + MV
rep("        if tg == 'shamanic':", """        if tg == 'selvala': return 800 if early else 400
        if tg in ('cream', 'vortex'): return 700
        if n == 'Primeval Bounty': return 760
        if tg == 'shamanic':""")
# --- one commander policy for every list: cast a commander whenever castable (bumi/sim.py gave Bumi 950, Gilanra 850, Alena 750/590)
rep("""            if n == 'Gilanra, Caller of Wirewood': return 850
            if n == 'Alena, Kessig Trapper': return 750 if early else 590
            return 950""", "            return 950")
# --- Blossoming Bogbeast (missed-swap test): attack -> creatures +2/+2 and trample until end of turn
rep("            if p.name == 'Drakuseth, Maw of Flames': s.burn(4)", """            if p.name == 'Blossoming Bogbeast': s.flags['bog'] += 1
            if p.name == 'Drakuseth, Maw of Flames': s.burn(4)""")
rep("b += s.cnt('domri') + 3 * s.flags['overrun']", "b += s.cnt('domri') + 3 * s.flags['overrun'] + 2 * s.flags['bog']")
rep("getattr(p, 'tr', False) or s.flags['overrun']", "getattr(p, 'tr', False) or s.flags['overrun'] or s.flags['bog']")
# --- Moraug replacements (operator 2026-10-07: Moraug is sleeved in Tazri): Edgar sink, Wilderland Scrounger, Primeval Bounty
rep("            if p.name == 'Blossoming Bogbeast': s.flags['bog'] += 1", """            if p.name == 'Blossoming Bogbeast': s.flags['bog'] += 1
            if p.name == 'Wilderland Scrounger' and any(s.power(q) >= 4 for q in s.crs()):
                for q in s.crs(): s.add_counters(q, 1)""")
rep("        if sp['tag'] == 'myojin' and paid: s.burn(7)", """        if sp['tag'] == 'myojin' and paid: s.burn(7)
        if any(q.name == 'Primeval Bounty' for q in s.perms):
            if sp['creature']: s.enter_cr('Beast', 3)
            else: s.add_counters(s.best_attacker(), 3)""")
rep("        pl = next((q for q in s.perms if q.name == 'Planetarium of Wan Shi Tong' and not q.tapped), None)", """        if any(q.name == 'Edgar, Moonlit Sovereign' for q in s.perms):
            for _ in range(3):
                if not s.pay(4, 0, 1, 0, allow_lcr=phase == 'main2'): break
                for q in s.crs():
                    if q.cnt > 0: s.add_counters(q, 1)
        pl = next((q for q in s.perms if q.name == 'Planetarium of Wan Shi Tong' and not q.tapped), None)""")
# --- CLI
rep("    if '--seed' in a:", """    if '--chump' in a: a.remove('--chump'); CHUMP = True
    if '--combat-only' in a: a.remove('--combat-only'); COMBAT_ONLY = True
    if '--seed' in a:""")
rep('"""Gruul goldfish', '"""REFUTER head-to-head build of bumi/sim.py (see refute/make_hh.py for every change). Gruul goldfish')
open('verify-2026-10-07/gruul/refute/hh.py', 'w', encoding='utf-8').write(src)
print('ok')
