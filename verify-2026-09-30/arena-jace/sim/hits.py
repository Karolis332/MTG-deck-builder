"""-3 hit distribution for final.txt and avg-MV / creature stats for seed vs final. Reads pool/deck oracle entries."""
import glob, re
entries = {}
for f in sorted(glob.glob('pool-0*.md')) + ['deck.md']:
    for m in re.finditer(r'^- 1x \*\*(.+?)\*\* (.*?)\(MV (\d+)\) — (.+?) — EDHREC', open(f, encoding='utf-8').read(), re.M):
        entries[m.group(1).split(' // ')[0]] = (int(m.group(3)), m.group(4).split(' // ')[0])
names = lambda f: [re.sub(r'^1 ', '', l.strip()) for l in open(f, encoding='utf-8') if l.startswith('1 ')]
HIT = {  # 1-10 hit value when put onto the battlefield by Jace -3 / Identity Echo
    'Krang, Utrom Warlord': 10, 'Zetalpa, Primal Dawn': 10, 'Valgavoth, Terror Eater': 10, 'Elesh Norn, Grand Cenobite': 9,
    'Sheoldred, the Apocalypse': 9, 'Nissa, Leyline Tamer': 9, 'Armaggon, Future Shark': 8, 'Terror of the Peaks': 7,
    'Wan Shi Tong, All-Knowing': 7, 'Doctor Doom': 7,
    'Tomik, Orzhov Lawmage': 5,  # review swap: 2/3 flyer whose static caps attacks on every walker at one creature
    'The Eternal Wanderer': 8, 'Chandra, Torch of Defiance': 7, 'Kasmina, Enigmatic Mentor': 6, 'Ral, Crackling Wit': 6,
    'Narset, Parter of Veils': 6, 'The Theorist, Jace Beleren': 6, 'Ajani, Outland Chaperone': 5,
    'Chandra, Acolyte of Flame': 5, 'Kaito, Cunning Infiltrator': 5, 'Teyo, the Shieldmage': 4, 'Saheeli, Sublime Artificer': 4,
    # seed-only hits
    'Solemn Simulacrum': 2, 'Massacre Wurm': 7, 'Goldspan Dragon': 5, 'Mirkwood Bats': 2, 'Ral, Monsoon Mage': 2,
    'Tezzeret, Cruel Captain': 4, 'Quintorius, History Chaser': 3, 'Tekuthal, Inquiry Dominus': 3,
    'Professional Face-Breaker': 2, 'Pitiless Plunderer': 2, 'Archmage Emeritus': 2, 'Hydroelectric Specimen': 1,
    'Boggart Trawler': 1, 'Ajani Unrelenting': 6,
}
for label, f in (('seed', 'current.txt'), ('final', 'final.txt')):
    deck = [n for n in names(f) if n != 'Jace, Multiverse Architect']
    nonland = [n for n in deck if not entries[n][1].startswith('Land') and 'Basic Land' not in entries[n][1]]
    hits = [n for n in deck if re.search(r'\bCreature\b|\bPlaneswalker\b', entries[n][1])]
    creatures = [n for n in hits if 'Creature' in entries[n][1]]
    walkers = [n for n in hits if 'Planeswalker' in entries[n][1]]
    mv = sum(entries[n][0] for n in nonland) / len(nonland)
    ev = sum(HIT[n] for n in hits) / len(hits)
    print(f'{label}: nonland {len(nonland)} avg MV {mv:.2f} | hits {len(hits)} = {len(creatures)} creatures + {len(walkers)} walkers | '
          f'E[hit] {ev:.2f} | creature avg {sum(HIT[n] for n in creatures)/len(creatures):.2f} | P(creature) {len(creatures)/len(hits):.0%} | '
          f'P(hit>=8) {sum(HIT[n]>=8 for n in hits)/len(hits):.0%}')
    if label == 'final':
        for n in sorted(hits, key=lambda n: -HIT[n]):
            print(f'  {HIT[n]:>2}  {n} (MV {entries[n][0]})')
