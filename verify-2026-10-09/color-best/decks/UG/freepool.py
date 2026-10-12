import re,sys
sys.path.insert(0,'verify-2026-10-09/color-best/decks/UG')
from where import where
for l in open('verify-2026-10-09/color-best/decks/UG/pool.txt',encoding='utf-8').read().splitlines()[2:]:
    m=re.match(r'^\s*\S+\s+\S+\s+\d+\s+\d+\s+\S+\s+(?:(\d+)x )?(.*?) \| (.*?) \| (.*)$',l)
    if not m: print('??',l[:80]); continue
    n=m.group(2); o,u,ds=where(n)
    if o>u: print(f'{n} | {m.group(3)} | {m.group(4)[:100]}')
