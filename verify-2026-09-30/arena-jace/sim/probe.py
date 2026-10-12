"""Probe the pool for named staples: prints MV/type/oracle (truncated) for each hit, NOT FOUND otherwise."""
import glob, re, sys
entries = {}
for f in sorted(glob.glob('pool-0*.md')):
    for m in re.finditer(r'^- 1x \*\*(.+?)\*\* (.*?)\(MV (\d+)\) — (.+?) — EDHREC[^\n]*\n\s+(.*?)(?=^- 1x \*\*|\Z)', open(f, encoding='utf-8').read(), re.M | re.S):
        entries[m.group(1).lower()] = (m.group(1), m.group(2).strip(), m.group(3), m.group(4), ' '.join(m.group(5).split()))
final = {re.sub(r'^1 ', '', l.strip()).lower() for l in open('final.txt', encoding='utf-8') if l.startswith('1 ')}
screens = ' '.join(open(f, encoding='utf-8').read().lower() for f in glob.glob('screen-0*.md'))
maxlen = int(sys.argv[1]) if sys.argv[1].isdigit() else 220
names = sys.argv[2:] if sys.argv[1].isdigit() else sys.argv[1:]
for q in names:
    ql = q.lower()
    hits = [v for k, v in entries.items() if ql in k]
    if not hits:
        print(f'-- {q}: NOT IN POOL'); continue
    for name, cost, mv, typ, text in hits:
        flag = 'FINAL' if name.split(' // ')[0].lower() in final else ('screened' if name.split(' // ')[0].lower() in screens else 'UNSCREENED')
        print(f'{name} {cost} MV{mv} [{typ}] <{flag}>: {text[:maxlen]}')
