"""Proof each screener read its whole chunk (line 1 names the true last card) and invented no names."""
import glob, os, re
D = os.path.dirname(os.path.abspath(__file__))
total = 0
for pool in sorted(glob.glob(os.path.join(D, 'pool-*.md'))):
    nn = pool[-5:-3]
    names = re.findall(r'^- \*\*(.+?)\*\*', open(pool, encoding='utf-8').read(), re.M)
    screen = os.path.join(D, f'screen-{nn}.md')
    if not os.path.exists(screen):
        print(nn, 'MISSING'); continue
    text = open(screen, encoding='utf-8').read()
    head = text.splitlines()[0] if text else ''
    m = re.match(r'screened (\d+)/(\d+), passed (\d+), last card read: (.+)$', head.strip())
    passed = re.findall(r'^- (.+?) — ', text, re.M)
    fake = [p for p in passed if p not in names]
    ok = bool(m) and m.group(4).strip() == names[-1]
    total += len(passed)
    print(nn, 'OK ' if ok else 'BAD', f'chunk {len(names)}, passed {len(passed)}', '| not in chunk:', fake[:5] or 'none')
print('total passed', total)
