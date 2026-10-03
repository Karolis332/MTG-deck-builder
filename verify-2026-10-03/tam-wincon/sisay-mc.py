"""Goldfish MC: turn the Chain Veil + Teferi loop / the Jace lock becomes deployable. Run: py sisay-mc.py LIST [games]
Ignores colour requirements, opposing interaction and damage to walkers (stated in build-report §8)."""
import random, re, sqlite3, os, sys

db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
INFO = {}


def info(n):
    if n not in INFO:
        r = db.execute("select type_line, mana_cost, cmc from cards where (name = ? or name like ? || ' //%') "
                       "and type_line not like 'Card //%' limit 1", (n, n)).fetchone()
        tl, cost = r[0].split(' // ')[0], (r[1] or '').split(' // ')[0]
        cols = {c for tok in re.findall(r'\{([^}]*)\}', cost) for c in tok if c in 'WUBRG'}
        INFO[n] = dict(land='Land' in tl, legend='Legendary' in tl and not re.search('Instant|Sorcery', tl),
                       walker='Planeswalker' in tl, cols=cols, mv=int(r[2] or 0))
    return INFO[n]


ACCEL = {'Sol Ring': (2, 0), 'Arcane Signet': (1, 0), 'Talisman of Dominance': (1, 0), 'Talisman of Conviction': (1, 0),
         'Talisman of Progress': (1, 0), 'Noble Hierarch': (1, 1), 'Ignoble Hierarch': (1, 1), 'Great Divide Guide': (1, 1),
         'Bloom Tender': (2, 1), 'Faeburrow Elder': (2, 1), 'Esika, God of the Tree': (1, 1), 'Timeless Lotus': (5, 1)}
# (mana, 1 = usable from the next turn: summoning sickness / enters tapped)
LOOP_MANA = {'Timeless Lotus', 'Bloom Tender', 'Faeburrow Elder', 'Sol Ring'}
EMPOWER = {'Way of the Healer': 5, 'Way of the Mentor': 5, 'Way of the Mind Sculptor': 5, 'Way of the Paradox': 5,
           'Way of the Pyromancer': 2, 'Way of the Warlord': 5, 'Way of the Wildspeaker': 7}
JACES = {'Jace, Memory Adept': 4, 'Jace, Multiverse Architect': 4, 'The Theorist, Jace Beleren': 3}
TUTOR = {"Diabolic Tutor": 4, "Mastermind's Acquisition": 4, 'Loyal Tutor': 1, 'Pia, Aether Ascetic': 3}
PIECES = ['Way of the Mentor', 'Way of the Paradox', 'The Chain Veil', 'Teferi, Temporal Archmage', 'Jace, Reality Sculptor']
GAINERS = {'Liliana the Faultless', 'Oko, Thief of Crowns', 'Professor Dellian Fel', 'Ajani Resolute', 'Oath of Kaya'}
HELD = {'Teferi, Temporal Archmage', 'Jace, Reality Sculptor'}   # kept for the kill turn


def game(cmdr, deck, T, rng):
    lib = deck[:]
    rng.shuffle(lib)
    hand, lib = lib[:7], lib[7:]
    bf, lands, ready, pend, cz, acc = [], 0, 0, 0, True, 0
    res = {'loop': None, 'lock': None, 'p5': None, 'p7': None}
    sisay = cmdr.startswith('Sisay')

    def power():
        if not (sisay and cmdr in bf):
            return 0
        return 2 + len({c for n in bf if n != cmdr and info(n)['legend'] for c in info(n)['cols']})

    def cost(n):
        d = 1 if info(n)['walker'] and ('Oath of Ajani' in bf or 'Tam, the Possibility' in bf) else 0
        return max(info(n)['mv'] - d, 0)

    def deploy(n):
        if n in bf:
            return 0
        if n in hand:
            return cost(n)
        if n in lib and info(n)['mv'] < power():
            return 5
        return 99

    for t in range(1, T + 1):
        hand.append(lib.pop(0))
        ready, pend = ready + pend, 0
        ld = [c for c in hand if info(c)['land']]
        if ld:
            hand.remove(ld[0])
            lands += 1
        mana = lands + ready
        engine = 'Way of the Mentor' in bf and 'Way of the Paradox' in bf
        if (res['loop'] is None and (engine or 'Carth the Lion' in bf) and any(m in bf for m in LOOP_MANA)
                and 'Teferi, Temporal Archmage' in deck
                and deploy('Teferi, Temporal Archmage') + deploy('The Chain Veil') + 4 <= mana):
            res['loop'] = t
        if res['lock'] is None and deploy('Jace, Reality Sculptor') <= mana:
            # 25 among Jaces: token (Ways' empower) + Jaces on board + JRS 5; + Paradox->Mentor +1 per activation per Jace;
            # + Tam proliferate X (walker types, x2 with Tekuthal) on the Jaces already out, if 5 mana is left after JRS
            token = sum(EMPOWER.get(n, 0) for n in bf)
            jaces = [JACES[n] for n in bf if n in JACES] + [5] + ([token] if token else [])
            acts = sum(1 for n in bf if info(n)['walker']) + (1 if token else 0)
            bonus = acts * len(jaces) if engine else 0
            if 'Tam, the Possibility' in bf and mana - deploy('Jace, Reality Sculptor') >= 5:
                bonus += (acts * (2 if 'Tekuthal, Inquiry Dominus' in bf else 1)) * (len(jaces) - 1)
            if sum(jaces) + acc + bonus >= 25:
                res['lock'] = t
        if power() >= 5 and res['p5'] is None:
            res['p5'] = t
        if power() >= 7 and res['p7'] is None:
            res['p7'] = t
        if res['loop'] and res['lock']:
            break
        # spend: commander, accel, tutors, pieces, Sisay fetches, colour-growing legendaries, Ways/walkers
        if cz and mana >= 3:
            bf.append(cmdr)
            mana -= 3
            cz = False
        for n in sorted([c for c in hand if c in ACCEL], key=cost):
            if cost(n) <= mana:
                hand.remove(n)
                bf.append(n)
                mana -= cost(n)
                v, slow = ACCEL[n]
                if slow:
                    pend += v
                else:
                    ready += v
                    mana += v
        missing = [p for p in PIECES if p in deck and p not in hand and p not in bf]
        for n in [c for c in hand if c in TUTOR]:
            want = [p for p in missing if p in lib and (n != 'Loyal Tutor' or info(p)['walker'])
                    and (not n.startswith('Pia') or p.startswith('Way'))]
            if want and TUTOR[n] <= mana:
                hand.remove(n)
                mana -= TUTOR[n]
                lib.remove(want[0])
                hand.append(want[0])
                missing.remove(want[0])
                if n.startswith('Pia'):
                    bf.append(n)

        def cast(names):
            nonlocal mana
            for n in sorted(names, key=cost):
                if n in hand and cost(n) <= mana:
                    hand.remove(n)
                    bf.append(n)
                    mana -= cost(n)

        cast([p for p in PIECES if p not in HELD])
        while mana >= 5 and power():
            pw = power()
            have = {c for n in bf if n != cmdr and info(n)['legend'] for c in info(n)['cols']}
            pick = [p for p in PIECES if p not in HELD and p in lib and info(p)['mv'] < pw]
            if not pick:
                pick = sorted([n for n in set(lib) if info(n)['legend'] and info(n)['mv'] < pw and info(n)['cols'] - have],
                              key=lambda n: (-len(info(n)['cols'] - have), info(n)['mv']))[:1]
            if not pick:
                break
            lib.remove(pick[0])
            bf.append(pick[0])
            mana -= 5
        cast([c for c in hand if info(c)['legend'] and c not in HELD])
        cast([c for c in hand if c in EMPOWER or (info(c)['walker'] and c not in HELD)])
        # loyalty carried into later turns on the Jaces already out (token, MA, MuA, Theorist); no attacks (goldfish)
        token = any(n in EMPOWER for n in bf)
        jc = sum(1 for n in bf if n in JACES) + (1 if token else 0)
        acts = sum(1 for n in bf if info(n)['walker']) + (1 if token else 0)
        if 'Way of the Mentor' in bf:
            gains = acts if 'Way of the Paradox' in bf else int(any(n in bf for n in GAINERS))
            acc += gains * jc
        if 'Tam, the Possibility' in bf and mana >= 5:
            acc += acts * (2 if 'Tekuthal, Inquiry Dominus' in bf else 1) * jc
    return res


if __name__ == '__main__':
    path, G = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 20000
    flat = [n for k, n in (l.strip().split(' ', 1) for l in open(path, encoding='utf-8') if l.strip()) for _ in range(int(k))]
    cmdr, deck = flat[0], flat[1:]
    if len(sys.argv) > 3 and sys.argv[3] == 'lock':   # lock-first policy: never spend fetches/tutors on Veil or Teferi
        PIECES[:] = ['Way of the Mentor', 'Way of the Paradox', 'Jace, Reality Sculptor']
    assert len(deck) == 99, len(deck)
    rng = random.Random(11)
    R = [game(cmdr, deck, 9, rng) for _ in range(G)]
    by = lambda k, t: sum(1 for r in R if r[k] and r[k] <= t) / G
    ei = lambda t: sum(1 for r in R if (r['loop'] or 99) <= t or (r['lock'] or 99) <= t) / G
    out = (f'{os.path.basename(path)} ({cmdr}): loop T7 {by("loop", 7):.2f} T9 {by("loop", 9):.2f} | '
           f'Jace lock T7 {by("lock", 7):.2f} T9 {by("lock", 9):.2f} | either T7 {ei(7):.2f} T9 {ei(9):.2f}')
    if cmdr.startswith('Sisay'):
        out += (f' | Sisay power>=5 by T4 {by("p5", 4):.2f} T5 {by("p5", 5):.2f} T6 {by("p5", 6):.2f}'
                f' | power 7 by T6 {by("p7", 6):.2f} T7 {by("p7", 7):.2f} T9 {by("p7", 9):.2f}')
    print(out)
