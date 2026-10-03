"""Every pool card has exactly one row in its screen file.  py verify-2026-10-03/tam-wincon/check-screens.py"""
import pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
SOURCES = {1: ['chunk-1.md', 'chunk-2.md'], 2: ['chunk-3.md', 'chunk-4.md'], 3: ['chunk-5.md', 'chunk-6.md'],
           4: ['chunk-7.md', 'chunk-8.md'], 5: ['other.md']}


def norm(s):
    return re.sub(r'\s+', ' ', s.replace('*', '').replace('`', '')).strip().lower()


ok = True
for k, files in SOURCES.items():
    want = [norm(re.sub(r'\s*\[.*$', '', l[4:].split(' | ')[0])) for f in files
            for l in (HERE / f).read_text(encoding='utf-8').splitlines() if l.startswith('### ')]
    screen = HERE / f'screen-{k}.md'
    if not screen.exists():
        print(f'screen-{k}: MISSING FILE')
        ok = False
        continue
    got = [norm(re.sub(r'\s*\[.*$', '', c.split('|')[1])) for c in screen.read_text(encoding='utf-8').splitlines()
           if c.startswith('|') and not re.match(r'^\|\s*(Card|-+)\s*\|', c)]
    missing = [w for w in want if w not in set(got)]
    print(f'screen-{k}: {len(got)} rows / {len(want)} cards, missing {len(missing)}' + (f': {missing[:10]}' if missing else ''))
    ok &= not missing
print('PASS' if ok else 'FAIL')
