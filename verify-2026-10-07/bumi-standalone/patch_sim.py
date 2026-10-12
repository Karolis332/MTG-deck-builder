"""Patch sim.py (a copy of gruul/refute/hh.py) for the sleeved Bumi cards hh.py leaves unmodelled. Every replacement is asserted.
1. Earthbended land creatures that are sacrificed return tapped (Scryfall ruling 2025-10-02: "When it dies or is exiled, return it
   to the battlefield tapped"): Lotus Field, Roiling Regrowth / Cycle of Renewal and Tectonic Split sacrifice those first.
2. Tectonic Split is cast (was a dead card): sacrifice half the lands rounded up, then lands tap for three of one colour.
3. Lair of the Hydra / Crawling Barrens as land-only-combat sinks: after Bumi untaps all lands, spare land mana animates them
   when that makes the turn lethal. Both must have been controlled since the turn began (CR 302.6).
Run once: py patch_sim.py  (reads hh-base.py, writes sim.py)"""
import shutil, os
here = os.path.dirname(os.path.abspath(__file__))
base = os.path.join(here, 'hh-base.py')
if not os.path.exists(base): shutil.copy(os.path.join(here, 'sim.py'), base)
src = open(base, encoding='utf-8').read()
def rep(old, new, count=1):
    global src
    assert src.count(old) == count, (old, src.count(old))
    src = src.replace(old, new)

rep("s.temp = 0; s.atk = 0; s.forest = False;", "s.temp = 0; s.atk = 0; s.eb = False; s.played = 0; s.forest = False;")
rep("        tgt.cr = True; s.add_counters(tgt, n); return tgt", "        tgt.cr = True; tgt.eb = True; s.add_counters(tgt, n); return tgt")
rep("        p = Perm(n, 'land', units=u, tapped=bool(tapped), forest=n in ('Forest', 'Sheltered Thicket'), basic=n in ('Forest', 'Mountain'))",
    "        p = Perm(n, 'land', units=u, tapped=bool(tapped), forest=n in ('Forest', 'Sheltered Thicket'), basic=n in ('Forest', 'Mountain'), played=s.t)")
# Tectonic Split: castable, lands tap for three
rep("    for n in names: T[n] = tag\n", "    for n in names: T[n] = tag\nT['Tectonic Split'] = 'tectonic'\n")
rep("        if dry: u = 'A' * len(u) if u != 'C' else 'A'", "        if s.has('tectonic'): u = 'AAA'\n        elif dry: u = 'A' * len(u) if u != 'C' else 'A'")
rep("        if tg in ('hold', 'tbr', 'dead', 'bulkup'):", "        if tg == 'tectonic': return 300 if len(s.lands()) >= 6 else -1\n        if tg in ('hold', 'tbr', 'dead', 'bulkup'):")
rep("        elif tg == 'vitu': s.earthbend(9)\n", "        elif tg == 'vitu': s.earthbend(9)\n        elif tg == 'tectonic': s.sac_lands(-(-len(s.lands()) // 2))\n")
# sacrifice helper: earthbended land creatures with <= 3 counters return tapped, then tapped plain lands, then the rest
rep("    def discard(s, k):\n", """    def sac_lands(s, k):
        L = s.lands()
        order = sorted([l for l in L if l.eb and l.cnt <= 3], key=lambda l: l.cnt) + \\
            sorted([l for l in L if not l.cr], key=lambda l: (not l.tapped, len(l.units))) + \\
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
""")
rep("""            b = next((l for l in s.lands() if not l.cr and l.basic and l.tapped), None) or next((l for l in s.lands() if not l.cr), None)
            if b: s.perms.remove(b)
""", "            s.sac_lands(1)\n")
rep("""        if k == 'lotus':
            for l in sorted([l for l in s.lands() if not l.cr], key=lambda l: (not l.tapped, len(l.units)))[:2]: s.perms.remove(l)""",
    """        if k == 'lotus': s.sac_lands(2)""")
rep("        att = [p for p in s.crs() if s.can_attack(p) and (kind != 'B' or p.kind == 'land')]",
    "        if kind == 'B': s.land_sink()\n        att = [p for p in s.crs() if s.can_attack(p) and (kind != 'B' or p.kind == 'land')]")
# 4. Summon: G.F. Ifrit saga (DB: "I, II — You may discard a card. If you do, draw a card. III, IV — Add {R}." sacrifice after IV)
rep("T['Tectonic Split'] = 'tectonic'\n", "T['Tectonic Split'] = 'tectonic'\nT['Summon: G.F. Ifrit'] = 'ifrit'\n")
rep("        elif tg == 'tectonic':", "        elif tg == 'ifrit': s.draw(); s.discard(1)\n        elif tg == 'tectonic':")
rep("        if s.has('domri'): s.pool['A'] += 1\n", """        if s.has('domri'): s.pool['A'] += 1
        for p in [q for q in s.perms if q.name == 'Summon: G.F. Ifrit']:
            p.lore = getattr(p, 'lore', 1) + 1
            if p.lore == 2: s.draw(); s.discard(1)
            elif p.lore in (3, 4): s.pool['R'] += 1
            if p.lore >= 4: s.perms.remove(p)
""")
rep('"""REFUTER head-to-head build', '"""bumi-standalone/sim.py = refute/hh.py + patch_sim.py (earthbend returns, Tectonic Split, Lair/Barrens sinks). REFUTER head-to-head build')
open(os.path.join(here, 'sim.py'), 'w', encoding='utf-8').write(src)
print('ok')
