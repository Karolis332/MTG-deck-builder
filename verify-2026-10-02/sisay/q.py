import os, sqlite3, sys, json
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
for r in c.execute(sys.argv[1]): print(' | '.join('' if v is None else str(v).replace('\n',' / ') for v in r))
