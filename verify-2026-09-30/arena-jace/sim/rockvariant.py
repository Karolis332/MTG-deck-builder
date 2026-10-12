"""Variant: Chromatic Lantern (3-mana ANY rock) replaced by a 2-mana B/R Signet; 35 land faces. Same model as landsim.py."""
import random, sys
sys.path.insert(0, 'verify-2026-09-30/arena-jace/sim')
import landsim as L
games = int(sys.argv[1]) if len(sys.argv) > 1 else 10000
keys = ['3 mana by T3', '4 mana by T4', 'Jace by T4', 'Jace by T5', 'WUBR by T5']
random.seed(20260930)
base = {s: L.run(35, games, s == 'play') for s in ('play', 'draw')}
L.ROCKS['Chromatic Lantern'] = frozenset('BR'); L.ROCK_COST['Chromatic Lantern'] = 2
random.seed(20260930)
var = {s: L.run(35, games, s == 'play') for s in ('play', 'draw')}
print('| variant | ' + ' | '.join(keys) + ' |')
for name, r in (('Lantern (3, any)', base), ('BR Signet (2)', var)):
    print(f'| {name} | ' + ' | '.join(f"{r['play'][k]:.1f} / {r['draw'][k]:.1f}" for k in keys) + ' |')
