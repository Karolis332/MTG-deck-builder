"""-3 / Identity Echo hit distribution and health stats, start.txt (creature build) vs final.txt (superfriends).

Run from the repo root: PYTHONIOENCODING=utf-8 py verify-2026-09-30/arena-jace-pw/sim/hits.py
Reads oracle entries from ../arena-jace/pool-0*.md + deck.md (read-only).

HIT = value 1-10 when put onto the battlefield by Jace -3 / Identity Echo (a walker enters with full loyalty and may
activate at once). CAST = value 1-10 when drawn and cast on curve. One scale for both lists so they compare.
"""
import glob, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'arena-jace')
entries = {}
for f in sorted(glob.glob(os.path.join(SRC, 'pool-0*.md'))) + [os.path.join(SRC, 'deck.md')]:
    for m in re.finditer(r'^- 1x \*\*(.+?)\*\* (.*?)\(MV (\d+)\) — (.+?) — EDHREC', open(f, encoding='utf-8').read(), re.M):
        entries[m.group(1).split(' // ')[0]] = (int(m.group(3)), m.group(4).split(' // ')[0])
names = lambda f: [re.sub(r'^1 ', '', l.strip()) for l in open(f, encoding='utf-8') if l.startswith('1 ')]
HIT = {
    'Zetalpa, Primal Dawn': 10, 'Krang, Utrom Warlord': 10, 'Valgavoth, Terror Eater': 10, 'Elesh Norn, Grand Cenobite': 9,
    'Sheoldred, the Apocalypse': 9, 'Nissa, Leyline Tamer': 9, 'Armaggon, Future Shark': 8, 'The Eternal Wanderer': 8,
    'Terror of the Peaks': 7, 'Wan Shi Tong, All-Knowing': 7, 'Chandra, Torch of Defiance': 7,
    'Ajani Unrelenting': 7, 'Garruk, Veiled Butcher': 7, 'Ob Nixilis, the Hate-Twisted': 7, 'Quintorius Kand': 7,
    'Kasmina, Enigmatic Mentor': 6, 'Ral, Crackling Wit': 6, 'Narset, Parter of Veils': 6, 'The Theorist, Jace Beleren': 6,
    'The Wanderer': 6, 'Appa, Steadfast Guardian': 6,
    'Ajani, Outland Chaperone': 5, 'Chandra, Acolyte of Flame': 5, 'Kaito, Cunning Infiltrator': 5, 'Saheeli, Sublime Artificer': 5,
    'Teyo, the Shieldmage': 4, 'Flux Channeler': 3, 'Tomik, Orzhov Lawmage': 2,
    'Dovin, Hand of Control': 5, 'Kaito, Bane of Nightmares': 5,
}
CAST = {  # value when drawn: castable on curve and what it does from hand
    'Zetalpa, Primal Dawn': 1, 'Krang, Utrom Warlord': 1, 'Valgavoth, Terror Eater': 1, 'Elesh Norn, Grand Cenobite': 2,
    'Sheoldred, the Apocalypse': 8, 'Nissa, Leyline Tamer': 3, 'Armaggon, Future Shark': 2, 'The Eternal Wanderer': 6,
    'Terror of the Peaks': 5, 'Wan Shi Tong, All-Knowing': 5, 'Chandra, Torch of Defiance': 7,
    'Ajani Unrelenting': 5, 'Garruk, Veiled Butcher': 7, 'Ob Nixilis, the Hate-Twisted': 6, 'Quintorius Kand': 6,
    'Kasmina, Enigmatic Mentor': 6, 'Ral, Crackling Wit': 7, 'Narset, Parter of Veils': 7, 'The Theorist, Jace Beleren': 7,
    'The Wanderer': 6, 'Appa, Steadfast Guardian': 6,
    'Ajani, Outland Chaperone': 6, 'Chandra, Acolyte of Flame': 6, 'Kaito, Cunning Infiltrator': 6, 'Saheeli, Sublime Artificer': 6,
    'Teyo, the Shieldmage': 6, 'Flux Channeler': 7, 'Tomik, Orzhov Lawmage': 6,
    'Dovin, Hand of Control': 5, 'Kaito, Bane of Nightmares': 5,
}
for label, f in (('start', os.path.join(HERE, '..', 'start.txt')), ('quick-v2', os.path.join(HERE, '..', 'quick-v2.txt')), ('final', os.path.join(HERE, '..', 'final.txt'))):
    deck = [n for n in names(f) if n != 'Jace, Multiverse Architect']
    nonland = [n for n in deck if not entries[n][1].startswith('Land') and 'Basic Land' not in entries[n][1]]
    hits = [n for n in deck if re.search(r'\bCreature\b|\bPlaneswalker\b', entries[n][1])]
    creatures = [n for n in hits if 'Creature' in entries[n][1]]
    walkers = [n for n in hits if 'Planeswalker' in entries[n][1]]
    mv = sum(entries[n][0] for n in nonland) / len(nonland)
    ev = sum(HIT[n] for n in hits) / len(hits)
    ec = sum(CAST[n] for n in hits) / len(hits)
    print(f'{label}: nonland {len(nonland)} avg MV {mv:.2f} | hits {len(hits)} = {len(creatures)} creatures + {len(walkers)} walkers | '
          f'P(walker) {len(walkers)/len(hits):.0%} P(creature) {len(creatures)/len(hits):.0%} | E[hit] {ev:.2f} | '
          f'E[cast] {ec:.2f} | creature hit avg {sum(HIT[n] for n in creatures)/len(creatures):.2f} | '
          f'walker hit avg {sum(HIT[n] for n in walkers)/len(walkers):.2f} | P(hit>=8) {sum(HIT[n]>=8 for n in hits)/len(hits):.0%} | '
          f'P(hit<=3) {sum(HIT[n]<=3 for n in hits)/len(hits):.0%} | E[MV cheated] {sum(entries[n][0] for n in hits)/len(hits):.1f}')
    if label == 'final':
        for n in sorted(hits, key=lambda n: -HIT[n]):
            print(f'  hit {HIT[n]:>2} cast {CAST[n]:>2}  {n} (MV {entries[n][0]})')
