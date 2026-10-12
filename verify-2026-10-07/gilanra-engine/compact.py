"""Compact view of gruul/pool.md: [GIL] + [FREE] only ([BUMI] stays in Bumi), reminder text stripped."""
import re, sys
txt = open('verify-2026-10-07/gruul/pool.md', encoding='utf-8').read()
blocks = re.split(r'\n### ', txt)[1:]
out = []
for b in blocks:
    head, *body = b.split('\n')
    m = re.match(r'(.+?) \[(\w+)\] \| (.*?) \(MV (\d+)\) \| (.*)', head)
    if not m: print('??', head, file=sys.stderr); continue
    name, tag, cost, mv, tl = m.groups()
    if tag == 'BUMI': continue
    o = re.sub(r'\s*\([^)]*\)', '', ' / '.join(l for l in body if l.strip()))
    out.append(f"{tag[0]}|{mv}|{name}|{cost}|{tl}|{o}")
print(len(out))
open('verify-2026-10-07/gilanra-engine/pool-compact.txt', 'w', encoding='utf-8').write('\n'.join(out))
