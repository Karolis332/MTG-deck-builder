"""Refuter recount: creatures, legends, noncreature spells, avg MV, cheap ramp, opening-7 odds. Usage: py numbers.py <list.txt> [...]"""
import os, re, sqlite3, sys, json
from math import comb
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
CMD = {'Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper'}
CHEAP = {'Sol Ring', 'Arcane Signet', 'Talisman of Impulse', 'Llanowar Elves', 'Ruby, Daring Tracker', "Nature's Lore", 'Farseek', 'Three Visits'}
def hyp(N, K, n, k): return comb(K, k) * comb(N - K, n - k) / comb(N, n)
for path in sys.argv[1:]:
    rows = []
    for l in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if not m: continue
        r = db.execute("select name, cmc, type_line, power, mana_cost from cards where name = ? or name like ? limit 1", (m.group(2), m.group(2) + ' // %')).fetchone()
        rows += [(m.group(2), r[1], r[2].split(' // ')[0], r[3], r[4])] * int(m.group(1))
    lands = [r for r in rows if 'Land' in r[2] and 'Creature' not in r[2]]
    nonl = [r for r in rows if r not in lands]
    lib = [r for r in nonl if r[0] not in CMD]
    cre = [r for r in nonl if 'Creature' in r[2]]
    leg = [r[0] for r in cre if 'Legendary' in r[2]]
    noncre = [r[0] for r in nonl if 'Creature' not in r[2]]
    cheap = [r[0] for r in lib if r[0] in CHEAP]
    avg_all = sum(r[1] for r in nonl) / len(nonl); avg_lib = sum(r[1] for r in lib) / len(lib)
    L = len(lands); C = len(cheap)
    p3 = sum(hyp(99, L, 7, k) for k in range(3, 8))
    keep = sum(hyp(99, L, 7, a) * hyp(99 - L, C, 7 - a, b) / 1 for a in range(2, 6) for b in range(0, 8 - a) if a + b >= 3 and True) if False else None
    # exact: P(lands=a, cheap=b) multivariate hypergeometric
    keep = sum(comb(L, a) * comb(C, b) * comb(99 - L - C, 7 - a - b) / comb(99, 7) for a in range(2, 8) for b in range(0, 8 - a) if a + b >= 3)
    keep25 = sum(comb(L, a) * comb(C, b) * comb(99 - L - C, 7 - a - b) / comb(99, 7) for a in range(2, 6) for b in range(0, 8 - a) if a + b >= 3)
    mvcre = [r for r in cre if r[0] not in CMD]
    print(f"{os.path.basename(path)}: {len(rows)} cards, {L} lands, {len(nonl)} nonland | creatures {len(cre)} (99-lib {len(mvcre)}) | legendary creatures {len(leg)} | noncreature {len(noncre)}")
    print(f"  avgMV nonland incl. commanders {avg_all:.2f}, excl. {avg_lib:.2f} | cheap {C} {cheap}")
    print(f"  Karsten regression incl {31.42 + 3.13*avg_all - 0.28*C:.1f} excl {31.42 + 3.13*avg_lib - 0.28*C:.1f} | P(>=3 lands in 7) {p3:.3f} | keepable(>=2 lands, lands+cheap>=3) {keep:.3f} (2-5 lands {keep25:.3f})")
    print(f"  P(>=1 creature in 7 milled, library ~80 with {len(mvcre)-6} creatures) {1 - hyp(80, len(mvcre)-6, 7, 0):.3f}")
    print('  legends:', leg); print('  noncreature:', noncre)
