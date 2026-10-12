import io, os, glob
roots = [r'C:\Users\QuLeR\MTG-deck-builder\src\lib', r'C:\Users\QuLeR\MTG-deck-builder\scripts']
total = 0
for root in roots:
    for dirpath, _dirs, files in os.walk(root):
        if 'deck-score-catalog' in dirpath: continue
        for f in files:
            if not f.endswith('.ts'):
                continue
            path = os.path.join(dirpath, f)
            s = io.open(path, encoding='utf-8').read()
            n = s.count('\x08')
            if n:
                io.open(path, 'w', encoding='utf-8', newline='\n').write(s.replace('\x08', '\\b'))
                print(os.path.basename(path), n)
                total += n
print('total', total)
