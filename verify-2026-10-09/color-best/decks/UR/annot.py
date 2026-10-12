import re,sys
sys.path.insert(0,'verify-2026-10-09/color-best/decks/UR')
from avail import status
model=set(re.sub(r'^\d+\s+','',l.strip()) for l in open('verify-2026-10-09/color-best/lists/UR-saheeli-jewel-of-avishkar.txt',encoding='utf-8') if re.match(r'^\d',l))
for l in open('verify-2026-10-09/color-best/decks/UR/pool.txt',encoding='utf-8'):
    if ' | ' not in l: continue
    left,typ,orc=l.split(' | ',2)
    nm=re.sub(r"^[0-9]+x +","", " ".join(left.split()[5:])).strip()
    parts=left.split()
    st=status(nm) if status(nm)!="UNOWNED" or "//" not in nm else status(nm.split(" // ")[0])
    tag='M' if nm in model else ' '
    print(f"{tag} {st[:22]:22} {parts[2] if len(parts)>2 else ''} {nm} | {typ} | {orc.strip()[:100]}")
