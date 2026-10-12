"""Single-swap screen of the 2026-10-07 Omo-box / second-copy cards against consistency.txt (sim4, 20k games, 12 procs).
Run: py omo_swaps.py [base.txt] [jobs.txt games] > omo/screen.log  (jobs.txt: one variant per line, swaps "Out=>In" joined by ";")"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = sys.argv[1] if len(sys.argv) > 1 else 'consistency.txt'
SUPPORT = ['Dryad of the Ilysian Grove', 'Sage of the Maze', 'Chromatic Lantern', 'Elvish Rejuvenator', 'Poison Dart Frog',
           'Sylvan Scrying', 'Floriferous Vinewall', 'Satyr Wayfinder', 'Hour of Promise', 'Ramunap Excavator',
           'Mana Reflection', "Seer's Sundial", 'Vivien Reid']
SUPPORT_OUT = ['Elvish Aberration', 'Tangled Florahedron', 'Talisman of Impulse', 'Ilysian Caryatid', 'Traverse the Outlands',
               'Shriekwood Devourer', 'Paleoloth']
THREATS = ['Apex Devastator', 'Hydra Broodmaster', 'Avenger of Zendikar', 'Terastodon']
THREAT_OUT = ['Shriekwood Devourer', 'Paleoloth', 'Oblivion Sower', 'Gigantic Big Bear']
LANDS = ['Yavimaya, Cradle of Growth', 'Horizon of Progress', 'Lair of the Hydra', 'Desert of the Indomitable']
LAND_OUT = ['Forest', 'Mountain', 'Evolving Wilds', 'Spinerock Knoll']

GAMES = sys.argv[3] if len(sys.argv) > 3 else '20000'
jobs = [(o, i) for i in SUPPORT for o in SUPPORT_OUT] + [(o, i) for i in THREATS for o in THREAT_OUT] + [(o, i) for i in LANDS for o in LAND_OUT]
if len(sys.argv) > 2: jobs = [tuple(l.strip().split(';')) for l in open(os.path.join(HERE, sys.argv[2]), encoding='utf-8') if l.strip()]
os.makedirs(os.path.join(HERE, 'omo'), exist_ok=True)

def one(k_job):
    k, job = k_job
    sw = [f'{job[0]}=>{job[1]}'] if len(sys.argv) <= 2 else list(job)
    path = os.path.join('omo', f'{os.path.splitext(os.path.basename(sys.argv[2]))[0] if len(sys.argv) > 2 else "o"}{k}.txt')
    subprocess.run(['py', 'mk.py', BASE, path, *sw], cwd=HERE, check=True, capture_output=True)
    r = subprocess.run(['py', 'sim4.py', path, '--games', GAMES], cwd=HERE, capture_output=True, text=True, encoding='utf-8')
    return ' + '.join(x.replace('=>', ' -> ') for x in sw) + ' | ' + (r.stdout.strip() or r.stderr.strip().splitlines()[-1])

with ThreadPoolExecutor(12) as ex:
    for line in ex.map(one, enumerate([('', '') if len(sys.argv) <= 2 else ('=>',)] + jobs)):
        print(line, flush=True)
