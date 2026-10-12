import re,sys,glob
names=[n.strip() for n in sys.argv[1:] if n.strip()]
entries={}
for f in sorted(glob.glob('pool-0*.md'))+['deck.md']:
    lines=open(f,encoding='utf-8').read().split('\n')
    for i,l in enumerate(lines):
        m=re.match(r'- \d+x \*\*(.+?)\*\*(.*)',l)
        if m:
            entries[m.group(1)]=(f,m.group(2).strip(),lines[i+1].strip() if i+1<len(lines) else '')
for n in names:
    hit=[k for k in entries if k==n or k.split(' // ')[0]==n]
    if not hit: print(f'!! NOT FOUND: {n}'); continue
    for k in hit:
        f,h,t=entries[k]; print(f'{k} {h} [{f}]\n    {t}')
