"""Scan the pool by predicate: py scan.py <mode> ; modes: walkers | bigcreatures | lands | counters | removal | tokens | ench"""
import glob, re, sys
entries = []
for f in sorted(glob.glob('pool-0*.md')):
    for m in re.finditer(r'^- 1x \*\*(.+?)\*\* (.*?)\(MV (\d+)\) — (.+?) — EDHREC[^\n]*\n\s+(.*?)(?=^- 1x \*\*|\Z)', open(f, encoding='utf-8').read(), re.M | re.S):
        entries.append((m.group(1), m.group(2).strip(), int(m.group(3)), m.group(4), ' '.join(m.group(5).split())))
screens = ' '.join(open(f, encoding='utf-8').read().lower() for f in glob.glob('screen-0*.md'))
mode = sys.argv[1]; L = int(sys.argv[2]) if len(sys.argv) > 2 else 170
def flag(n): return 'S' if n.split(' // ')[0].lower() in screens else '-'
def show(e): print(f'[{flag(e[0])}] {e[0]} {e[1]} MV{e[2]} [{e[3]}]: {e[4][:L]}')
for e in entries:
    name, cost, mv, typ, text = e
    t = text.lower()
    if mode == 'walkers' and 'Planeswalker' in typ: show(e)
    elif mode == 'bigcreatures' and 'Creature' in typ.split(' // ')[0] and mv >= 6: show(e)
    elif mode == 'lands' and typ.startswith('Land') and sum(c in text for c in ['{W}', '{U}', '{B}', '{R}', 'any color']) >= 2: show(e)
    elif mode == 'counters' and 'Instant' in typ and 'counter target' in t and mv <= 3: show(e)
    elif mode == 'removal' and 'Instant' in typ and mv <= 2 and re.search(r'(destroy|exile) target (creature|nonland|permanent)|damage to (any target|target creature)', t): show(e)
    elif mode == 'ench' and typ.startswith(('Enchantment', 'Legendary Enchantment', 'Artifact', 'Legendary Artifact')) and 'Creature' not in typ and mv <= 5 and re.search(r'draw a card|planeswalker|loyalty|token', t): show(e)
    elif mode == 'wipes' and re.search(r'(destroy|exile) all creatures|each creature|all creatures get', t) and 'Creature' not in typ.split(' // ')[0] and mv <= 6: show(e)
