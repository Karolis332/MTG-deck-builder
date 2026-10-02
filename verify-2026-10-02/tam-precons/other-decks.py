"""Cards in the other paper decks, ranked by EDHREC, with a short oracle — candidates to move into Tam."""
import os, re, sqlite3, json
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
NOT_TOKEN = "layout not in ('art_series','token','double_faced_token','emblem')"
D = 'decks/paper/decks'
tam = {l.strip().split(' ', 1)[1] for l in open(f'{D}/tam-the-possibility.txt', encoding='utf-8') if l.strip()}
rows = []
for f in sorted(os.listdir(D)):
    if f.startswith('tam'): continue
    for l in open(f'{D}/{f}', encoding='utf-8'):
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if not m: continue
        n = m.group(2)
        r = c.execute(f"select name, mana_cost, type_line, edhrec_rank, oracle_text, color_identity from cards where (name=? or name like ? || ' // %') and {NOT_TOKEN} order by (edhrec_rank is null), edhrec_rank limit 1", (n, n)).fetchone()
        if not r or 'Basic' in (r[2] or '') or n in tam: continue
        rows.append((r[3] or 99999, f[:-4], r))
rows.sort()
for rank, deck, r in rows[:160]:
    print(f'#{rank} [{deck.split("-")[0]}] {r[0]} {r[1] or ""} — {(r[2] or "")[:30]} — {(r[4] or "").replace(chr(10)," | ")[:110]}')
