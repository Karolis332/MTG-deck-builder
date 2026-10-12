"""Karsten coloured sources (principles.md 3.2, 99-card column, scaled by land share).
Weights: land 1 (fetch = full for each colour it finds), rock 3/4 (spells MV>=3), fragile dork 1/2 (MV>=2; Selvala MV>=4),
2-MV land ramp 3/4 (MV>=3, colours it can find: Lore/Visits find Forest cards = G (+R only via the one Thicket, not counted),
Farseek = R). Usage: py colours.py <list.txt> [...]"""
import re, sys
LAND = {'Forest': 'G', 'Mountain': 'R', 'Command Tower': 'RG', 'Spinerock Knoll': 'R', 'Gruul Turf': 'RG', 'Sheltered Thicket': 'RG',
        'Fabled Passage': 'RG', 'Evolving Wilds': 'RG', 'Terramorphic Expanse': 'RG', 'Riveteers Overlook': 'RG', 'Diamond City': '',
        'Yavimaya, Cradle of Growth': 'G', 'Horizon of Progress': 'RG', 'Lair of the Hydra': 'G', 'Desert of the Indomitable': 'G',
        'Hidden Nursery': 'G', 'Ba Sing Se': 'G', 'Savage Mansion': 'RG', 'Omashu City': 'RG', 'Rumble Arena': '', "Rogue's Passage": '', 'Cryptic Caves': '', 'Bristling Backwoods': 'RG', 'Konstrari Annex': 'RG', 'Exotic Orchard': 'RG', 'Sapseep Forest': 'G', 'Path of Ancestry': 'RG', 'Oran-Rief, the Vastwood': 'G'}
ROCK = {'Arcane Signet': 'RG', 'Talisman of Impulse': 'RG', 'Chromatic Lantern': 'RG'}
DORK = {'Llanowar Elves': 'G', 'Ruby, Daring Tracker': 'RG', 'Ilysian Caryatid': 'RG', 'Tangled Florahedron // Tangled Vale': 'G', 'Tangled Florahedron': 'G',
        'Sage of the Maze': 'RG', 'Poison Dart Frog': 'RG', 'Dryad of the Ilysian Grove': 'RG',
        'Selvala, Heart of the Wilds': 'RG*', 'Elvish Mystic': 'G', 'Spider Manifestation': 'RG', 'Frog Butler': 'RG', 'Paradise Druid': 'RG', 'Noxious Newt': 'G', 'Nightshade Dryad': 'RG'}
RAMP2 = {"Nature's Lore": 'G', 'Three Visits': 'G', 'Farseek': 'R', 'Rampant Growth': 'RG', 'Studious First-Year // Rampant Growth': 'RG', 'Sylvan Scrying': 'RG'}
NEED = {'1C': 19, '3C': 16, '1CC': 28, '2CC': 26, '3CC': 23, '4CC': 22, '1CCC': 33, '2CCC': 30, '3CCC': 28, '4CCC': 26}  # 4CCC: table trend (not in S20)
for path in sys.argv[1:]:
    cards = []
    for l in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if m: cards += [m.group(2).strip()] * int(m.group(1))
    L = sum(c in LAND for c in cards)
    def src(col, mv):
        s = sum(col in LAND[c] for c in cards if c in LAND)
        s += .75 * sum(col in ROCK[c] for c in cards if c in ROCK) if mv >= 3 else 0
        s += .5 * sum(col in DORK[c] for c in cards if c in DORK and (DORK[c][-1] != '*' or mv >= 4)) if mv >= 2 else 0
        s += .75 * sum(col in RAMP2[c] for c in cards if c in RAMP2) if mv >= 3 else 0
        return s
    rows = [('R', 6, '3CCC', "Burning Sun's Avatar {3}{R}{R}{R}"), ('R', 5, '3CC', 'Terror of the Peaks {3}{R}{R}'),
            ('G', 3, '1CC', 'Selvala / Vastlands {1}{G}{G}'), ('G', 4, '2CC', 'Surrak {2}{G}{G}'), ('G', 6, '4CC', '{4}{G}{G} fatties'), ('R', 7, '4CCC', 'Drakuseth/Tyrant {4}{R}{R}{R}'), ('R', 4, '3C', 'Smellerbee {3}{R}'), ('G', 1, '1C', 'Elvish Mystic {G} (T1, untapped)')]
    print(f'{path}: {L} lands')
    for col, mv, pat, card in rows:
        need = NEED[pat] / 41 * L; have = src(col, mv)
        print(f'  {col} for {card:36s} need {need:5.2f}  have {have:5.2f}  {"OK" if have >= need - 1e-9 else "SHORT %.2f" % (need - have)}')
