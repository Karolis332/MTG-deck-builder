"""Print full pool/deck entries for the names given on argv (case-insensitive substring)."""
import glob, re, sys
entries = []
for f in sorted(glob.glob('verify-2026-09-30/arena-jace/pool-0*.md')) + ['verify-2026-09-30/arena-jace/deck.md']:
    txt = open(f, encoding='utf-8').read()
    for m in re.finditer(r'^- 1x \*\*(.+?)\*\*(.*?)(?=^- 1x \*\*|\Z)', txt, re.M | re.S):
        entries.append((m.group(1), m.group(0).strip()))
for q in sys.argv[1:]:
    ql = q.lower()
    hits = [e for e in entries if ql in e[0].lower()]
    if not hits:
        print(f'## NOT FOUND: {q}')
    for n, body in hits:
        print(body)
