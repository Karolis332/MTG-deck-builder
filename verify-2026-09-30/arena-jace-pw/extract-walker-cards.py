"""Every card in arena-jace/pool-*.md + deck.md that is a planeswalker or whose text names planeswalker/loyalty/proliferate.
Supplement to the full pool files, not a replacement. Run: PYTHONIOENCODING=utf-8 py verify-2026-09-30/arena-jace-pw/extract-walker-cards.py"""
import glob, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'arena-jace')
entries = []
for f in sorted(glob.glob(os.path.join(SRC, 'pool-*.md'))) + [os.path.join(SRC, 'deck.md')]:
    lines = open(f, encoding='utf-8').read().split('\n')
    for i, l in enumerate(lines):
        if l.startswith('- ') and '**' in l:
            text = lines[i + 1] if i + 1 < len(lines) else ''
            entries.append((os.path.basename(f), l, text))
walk = [e for e in entries if 'Planeswalker' in e[1]]
supp = [e for e in entries if 'Planeswalker' not in e[1] and re.search(r'planeswalker|loyalty|proliferate', e[2], re.I)]
with open(os.path.join(HERE, 'walker-cards.md'), 'w', encoding='utf-8') as o:
    o.write(f'# Planeswalkers ({len(walk)}) — every owned W/U/B/R walker (pool + seed deck.md)\n\n')
    for src, l, t in walk: o.write(f'{l}  [{src}]\n{t}\n')
    o.write(f'\n# Non-walker cards whose text names planeswalker / loyalty / proliferate ({len(supp)})\n\n')
    for src, l, t in supp: o.write(f'{l}  [{src}]\n{t}\n')
print(len(entries), 'cards scanned;', len(walk), 'walkers;', len(supp), 'support')
