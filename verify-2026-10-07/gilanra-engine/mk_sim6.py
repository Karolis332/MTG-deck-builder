"""Build sim6.py from gruul/gilanra/sim5.py (itself an extension of alena-gilanra/sim4.py) by exact text patches."""
src = open('gruul/gilanra/sim5.py', encoding='utf-8').read()
def sub(old, new, count=1):
    global src
    assert src.count(old) == count, (old, src.count(old))
    src = src.replace(old, new)
sub('"""Gruul goldfish for three lists', '"""sim6 (gilanra-engine): sim5 + Gilanra-draw / Alena-chain / 6+ cast metrics, main phase 2 after attack-trigger mana\n(Shriekwood untap, Ventmaw, Sakiko), Studious First-Year, Lumra, Realm Seekers, more dorks. Literal flood = > 8 lands seen by T8.\nGruul goldfish for three lists')
sub("'Part in Friendship': 'plain',", "'Part in Friendship': 'plain', 'Poison Dart Frog': 'dork:A', 'Noxious Newt': 'dork:G', 'Nightshade Dryad': 'dork:A',\n    'Devoted Druid': 'dork:G', 'Hardbristle Bandit': 'dork:A', 'Animal Attendant': 'dork:A', 'Orchard Strider': 'bcycle',\n    'Lumra, Bellow of the Woods': 'lumra', 'Studious First-Year // Rampant Growth': 'firstyear', 'Shriekwood Devourer': 'shriek',\n    'Savage Ventmaw': 'ventmaw', 'Sakiko, Mother of Summer': 'sakiko', 'Realm Seekers': 'seekers',")
sub("'Hydra Broodmaster', 'Gruul Locket'}", "'Hydra Broodmaster', 'Gruul Locket', 'Realm Seekers'}")
# cheap ramp for the keep rule
sub("in ('rock', 'dork', 'lore', 'farseek', 'growth', 'explore', 'bushwhack')\n", "in ('rock', 'dork', 'lore', 'farseek', 'growth', 'explore', 'bushwhack', 'firstyear')\n")
# Gilanra draw counter
sub("        if gil and s['mv'] >= 6: g.draw()\n", "        if gil and s['mv'] >= 6:\n            g.draw()\n            if g.t <= 8: g.gil_draws += 1\n")
# Alena tap marks her mana live; a creature cast after it is a chain
sub("                c.tapped = True; g.pool['R'] += g.entered; return True", "                c.tapped = True; g.pool['R'] += g.entered; g.alena_live = True; return True")
sub("        g.spells += 1\n        if s['creature']:\n            if g.has('sage'): g.draw()",
    "        g.spells += 1\n        if s['mv'] >= 6 and g.t <= 8: g.big += 1\n        if paid and s['creature'] and g.alena_live:\n            g.alena_live = False\n            if g.t <= 10: g.chains.add(g.t)\n        if s['creature']:\n            if g.has('sage'): g.draw()")
# Realm Seekers: X = cards in all hands (3 opponents modelled at 4 cards each)
sub("            c = g.enter(n, s['power'], tag=tag, haste=s['haste'])", "            c = g.enter(n, 12 + len(g.hand) if tag == 'seekers' else s['power'], tag=tag, haste=s['haste'])")
# Lumra: mill 4, lands among them return tapped (graveyard lands from earlier fetches not tracked)
sub("        elif tag == 'heartbeat': g.flags['heartbeat'] = 1", "        elif tag == 'heartbeat': g.flags['heartbeat'] = 1\n        elif tag == 'lumra':\n            top, g.lib = g.lib[:4], g.lib[4:]\n            for x in top:\n                if g.S[x]['land']: g.put_land(x, True)\n                elif x.startswith('Tangled'): g.put_land('Tangled Vale', True)\n        elif tag == 'firstyear': g.flags['growth_ready'] += 1")
# Rampant Growth copy from a prepared Studious First-Year
sub("            if g.flags['bind'] and g.pay(4, 0, 1, 0, False):", "            if g.flags['growth_ready'] and g.pay(1, 0, 1, 0, False): opts.append((890 if g.t <= 4 else 300, 'GROWTH'))\n            if g.flags['bind'] and g.pay(4, 0, 1, 0, False):")
sub("                if c == 'EXHAUST':", "                if c == 'GROWTH':\n                    g.pool = g.pay(1, 0, 1, 0, False)[0]; g.flags['growth_ready'] -= 1; g.spells += 1; g.fetch({'basic'}, True); continue\n                if c == 'EXHAUST':")
# per-turn resets + main phase 2 with attack-trigger mana
sub("        g.pumps = []\n", "        g.pumps = []; g.alena_live = False; g.post = Counter()\n")
sub("        g.combat()\n", "        g.combat()\n        if g.post:  # Shriekwood untapped lands / Ventmaw / Sakiko: main phase 2\n            g.pool.update(g.post); g.main()\n")
sub("        if g.flags['bitter'] and any(g.power(c) >= 4 for c in atk): g.draw(g.flags['bitter'])",
    "        if g.flags['bitter'] and any(g.power(c) >= 4 for c in atk): g.draw(g.flags['bitter'])\n        if g.has('shriek'):\n            x = max(g.power(c) for c in atk)\n            for l in [l for l in g.lands if not l['cr']][:x]: g.post.update(l['units'])\n        if any(c.tag == 'ventmaw' for c in atk): g.post.update('RRRGGG')\n        if g.has('sakiko'): g.post['G'] += dmg")
# game state + outputs
sub("    g.first6 = None; g.kyoshi = None; g.t = 0; g.pool = Counter()", "    g.first6 = None; g.kyoshi = None; g.t = 0; g.pool = Counter(); g.gil_draws = 0; g.big = 0; g.chains = set(); g.alena_live = False; g.post = Counter()")
sub("            out['flood'] = g.lands_seen > 8 and not sink", "            out['flood'] = g.lands_seen > 8; out['gild'] = g.gil_draws; out['big'] = g.big")
sub("        if g.kill and t >= 8: break", "        if g.kill and t >= 10: break")
sub("    out['kill'] = g.kill or turns + 1", "    out['kill'] = g.kill or turns + 1; out['chain'] = len(g.chains)")
sub('''          f" | flood {f('flood'):.3f} | spells T1-8 {f('spells'):.2f}''', '''          f" | flood {f('flood'):.3f} | spells T1-8 {f('spells'):.2f} | 6+ cast T8 {f('big'):.2f} | Gil draws T8 {f('gild'):.2f} | Alena chains T10 {f('chain'):.2f}''')
sub("    'Sheltering Landscape': ([], False, 'wilds'),", """    'Horizon of Progress': (['A'], False, None), 'Sapseep Forest': (['G'], True, None), 'Path of Ancestry': (['A'], True, None),
    'Exotic Orchard': (['A'], False, None), 'Oran-Rief, the Vastwood': (['G'], True, None), 'Hidden Nursery': (['G'], True, None),
    'Lair of the Hydra': (['G'], False, None), 'Opal Palace': (['C'], False, None), 'Mirage Mesa': (['A'], True, None),
    'Tarnation Vista': (['A'], True, None), 'Yavimaya, Cradle of Growth': (['G'], False, None),
    'Sheltering Landscape': ([], False, 'wilds'),""")
sub("""'Savage Ventmaw': 'ventmaw',""", """'Savage Ventmaw': 'ventmaw', 'Nissa, Who Shakes the World': 'nissa', 'Channeler Initiate': 'dork:A',
    'Elvish Archdruid': 'dork:GG', 'Loot, the Nexus': 'dork:AA',""")
# Nissa: Forest-type lands add an extra G; +1 untaps one land each turn (its land-creature part not modelled)
sub("""        for p in g.perm: g.pool.update(p[1])
""", """        for p in g.perm: g.pool.update(p[1])
        if g.has('nissa'):
            fl = [l for l in g.lands if l['n'] in ('Forest', 'Sheltered Thicket', 'Sapseep Forest') and not l['cr']]
            g.pool['G'] += len(fl) + (2 if fl else 0)
""")
sub("""        elif tag == 'warstorm': g.perm.append(['warstorm', []])""", """        elif tag == 'warstorm': g.perm.append(['warstorm', []])
        elif tag == 'nissa': g.perm.append(['nissa', []])""")
open('gilanra-engine/sim6.py', 'w', encoding='utf-8').write(src)
print('ok')
