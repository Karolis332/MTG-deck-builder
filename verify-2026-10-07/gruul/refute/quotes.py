import os, re, sqlite3, sys
DB = sqlite3.connect(f"file:{os.path.join(os.environ['APPDATA'],'the-black-grimoire','data','mtg-deck-builder.db')}?mode=ro", uri=True)
norm = lambda s: re.sub(r'\s+', ' ', s.replace('’', "'").replace('—', '-').replace('−', '-').replace('–', '-')).lower().strip()
names = {}
for n, o, tl in DB.execute("select name, oracle_text, type_line from cards where layout not in ('art_series','token','front_card') and oracle_text is not null"):
    names.setdefault(n, norm((o or '') + ' ' + (tl or '')))
    for part in n.split(' // '): names.setdefault(part, names[n])
pool = set(re.findall(r'^### (.+?) \[', open('verify-2026-10-07/gruul/pool.md', encoding='utf-8').read(), re.M)) | {'Bumi, Unleashed', 'Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper'}
pool |= {p for n in list(pool) for p in n.split(' // ')}
short = {'Toph GE': 'Toph, Greatest Earthbender', 'Moraug': 'Moraug, Fury of Akoum', 'Kyoshi': 'The Legend of Kyoshi', 'Bumi': 'Bumi, Unleashed', 'Drix': 'Drix Fatemaker', 'Samut': 'Samut, Tyrant Smasher', 'Smellerbee': 'Smellerbee, Rebel Fighter', 'Thunderfoot': 'Thunderfoot Baloth', 'Pyrewood': 'Pyrewood Gearhulk', 'Ruby': 'Ruby, Daring Tracker', 'Selvala': 'Selvala, Heart of the Wilds', 'Terror': 'Terror of the Peaks', 'Gilanra': 'Gilanra, Caller of Wirewood', 'Alena': 'Alena, Kessig Trapper', 'Domri': 'Domri, Anarch of Bolas', 'Edgar': 'Edgar, Moonlit Sovereign', 'Nissa': 'Nissa, Who Shakes the World', 'Mightform': 'Mightform Harmonizer', 'Halana': 'Halana and Alena, Partners', 'Germination': 'Germination Practicum', 'Talisman': 'Talisman of Impulse', 'Signet': 'Arcane Signet', 'Bind to Life': 'Vastlands Scavenger', 'Kami': 'Kami of Whispered Hopes', 'Caryatid': 'Ilysian Caryatid', 'Innkeeper': "Innkeeper's Talent", 'Thicket': 'Sheltered Thicket', 'Mansion': 'Savage Mansion', 'Myojin': 'Myojin of Roaring Blades', 'Drakuseth': 'Drakuseth, Maw of Flames', 'Lair': 'Lair of the Hydra', 'Yavimaya': 'Yavimaya, Cradle of Growth', 'Boots': 'Lavaspur Boots', 'Cream': 'Cream of the Crop', 'Big Bear': 'Gigantic Big Bear', 'Earth King': 'The Earth King', 'Apex': 'Apex Devastator', 'Coral': 'Amarant Coral', 'Spider': 'Spider Manifestation', 'Vitu-Ghazi': 'Awakening of Vitu-Ghazi', 'Quilled': 'Quilled Greatwurm', 'Packleader': "Garruk's Packleader", 'Tale': 'Tale of Katara and Toph', 'Florahedron': 'Tangled Florahedron', 'Vale': 'Tangled Florahedron'}
tot = bad = 0
for line in open(sys.argv[1], encoding='utf-8'):
    qs = re.findall(r'"([^"]{6,})"', line)
    if not qs: continue
    cands = {n for n in pool if n in line and n in names} | {v for k, v in short.items() if re.search(r'\b' + re.escape(k) + r'\b', line) and v in names}
    for q in qs:
        for frag in re.split(r'\s*(?:…|\.\.\.)\s*', q):
            frag = norm(frag.strip(' .,;:'))
            if len(frag) < 6: continue
            tot += 1
            hit = [n for n in cands if frag in names[n]]
            if not hit:
                glob_hit = [n for n in pool if n in names and frag in names[n]][:3]
                bad += 1; print(f'MISS "{frag}" | line cands {len(cands)} | found in {glob_hit}')
print(f'{sys.argv[1]}: {tot} fragments, {bad} not found on a card named in the same line')
