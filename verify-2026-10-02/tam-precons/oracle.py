"""Oracle dump for every precon card (both decks), minus basics and cards already in Tam."""
import os, re, sqlite3
HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
NOT_TOKEN = "layout not in ('art_series','token','double_faced_token','emblem')"
tam = {l.split(' ', 1)[1].strip() for l in open(os.path.join(HERE, '../../decks/paper/decks/tam-the-possibility.txt'), encoding='utf-8') if l.strip()}
BASIC = {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}
out = []
for deck, tag in (('QuandrixUnlimited_SOC.txt', 'Q'), ('SilverquillInfluence_SOC.txt', 'S')):
    for line in open(os.path.join(HERE, deck), encoding='utf-8'):
        n = line.strip().split(' ', 1)[1]
        if n in BASIC: continue
        r = c.execute(f"select name, mana_cost, cmc, type_line, oracle_text, edhrec_rank from cards where (name=? or name like ? || ' // %') and {NOT_TOKEN} order by (edhrec_rank is null), edhrec_rank limit 1", (n, n)).fetchone()
        t = (r[4] or '').replace('\n', ' | ')
        out.append(f'- [{tag}]{" (IN TAM)" if n in tam else ""} **{r[0]}** {r[1] or ""} (MV {r[2]:g}) — {r[3]} — #{r[5]}\n  {t}')
open(os.path.join(HERE, 'precon-oracle.md'), 'w', encoding='utf-8').write(
    '# Quandrix Unlimited [Q] + Silverquill Influence [S] — oracle (basics omitted)\n\n' + '\n'.join(out) + '\n')
print(len(out))
