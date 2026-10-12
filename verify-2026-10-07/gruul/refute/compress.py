import re
p = 'verify-2026-10-07/gruul/REFUTE.md'
s = open(p, encoding='utf-8').read()
lines = s.split('\n')

def join_block(start_pat, sep=' · ', head_sep=' '):
    """Join the line matching start_pat with the following '- ' / '  - ' / '   - ' bullet lines into one line."""
    global lines
    i = next(k for k, l in enumerate(lines) if l.startswith(start_pat))
    j = i + 1
    parts = []
    while j < len(lines) and re.match(r'^\s*- ', lines[j]):
        parts.append(re.sub(r'^\s*- ', '', lines[j]))
        j += 1
    assert parts, start_pat
    lines = lines[:i] + [lines[i] + head_sep + sep.join(parts)] + lines[j:]

join_block('**Rev 2 (operator correction)', sep=' ')
join_block('3. **Interacts and protects the win turn.**', sep=' ')
join_block("**Gilanra's real edge", sep=' ')
join_block('**Rulings**', sep=' ')
join_block('**Gates and maths.**', sep=' ')
join_block('- **`hh.py`**', sep='; ', head_sep=' ')
join_block('**`bumi/sim.py`:**', sep=' · ')
join_block('**`gilanra/sim5.py`:**', sep=' · ')
join_block('**`hh.py` limits:**', sep='; ')
join_block('- **Why Pyrewood:**', sep=' ')
join_block('**§4b.', sep=' ')
# numbered reason 1 sub-bullets
i = next(k for k, l in enumerate(lines) if l.startswith('1. **Faster in one neutral sim**'))
j = i + 1; parts = []
while re.match(r'^\s+- ', lines[j]): parts.append(re.sub(r'^\s+- ', '', lines[j])); j += 1
lines = lines[:i] + [lines[i] + ' ' + ' '.join(parts)] + lines[j:]
open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print(len(lines))
