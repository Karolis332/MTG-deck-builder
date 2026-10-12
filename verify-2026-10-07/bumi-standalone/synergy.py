"""Synergy density for the Bumi lists: per nonland card, how many other nonland cards (commander included as a partner)
it directly interacts with. A pair links once if one card gives what the other wants. Rules, from DB text:
LC land creature (earthbend / Nissa / Vitu-Ghazi), CT +1/+1 counters, P4 power >= 4 body, LD extra land / landfall,
HS haste, LG legendary creature, FO Forest count, CR any creature. Run: py synergy.py <list> [...]"""
import os, re, sqlite3, statistics, sys

db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
EB = {'LC', 'CT', 'P4'}
GIVE = {
    'Bumi, Unleashed': EB | {'LG'}, 'Toph, Greatest Earthbender': EB | {'LG'}, 'Toph, the Blind Bandit': {'LC', 'CT', 'LG'},
    'Badgermole': EB, 'Earth Kingdom General': {'LC', 'CT'}, 'Earth Rumble': {'LC', 'CT'}, 'Solid Ground': EB,
    'Cracked Earth Technique': EB, 'Rockalanche': EB, 'Awakening of Vitu-Ghazi': EB, 'Bumi, Eclectic Earthbender': EB | {'LG'},
    'The Boulder, Ready to Rumble': EB | {'LG'}, 'Nissa, Who Shakes the World': EB, 'Bitter Work': EB,
    'The Legend of Kyoshi // Avatar Kyoshi': EB, 'Earthbender Ascension': {'LC', 'CT', 'LD'}, 'Halana and Alena, Partners': {'CT', 'HS', 'LG'},
    'Innkeeper\'s Talent': {'CT'}, 'Tale of Katara and Toph': {'CT'}, 'Germination Practicum': {'CT'}, "Flopsie, Bumi's Buddy": {'CT', 'LG', 'P4'},
    'Drix Fatemaker': {'CT'}, 'Quilled Greatwurm': {'CT', 'P4'}, "Master's Guidance": {'CT'}, 'Silkguard': {'CT'}, 'Snakeskin Veil': {'CT'},
    'Hardened Scales': {'CT'}, 'Kami of Whispered Hopes': {'CT'}, 'Seismic Tutelage': {'CT'}, 'Crystalline Armor': {'P4'},
    'The Earth King': {'LD', 'P4', 'LG'}, 'Explore': {'LD'}, 'Dryad of the Ilysian Grove': {'LD', 'FO'}, 'Yavimaya, Cradle of Growth': {'FO'},
    "Nature's Lore": {'LD', 'FO'}, 'Three Visits': {'LD', 'FO'}, 'Skyshroud Claim': {'LD', 'FO'}, 'Farseek': {'LD'}, 'Rampant Growth': {'LD'},
    'Shared Roots': {'LD'}, 'Cultivate': {'LD'}, 'Circuitous Route': {'LD'}, 'Roiling Regrowth': {'LD'}, 'Simulacrum Shaper': {'LD'},
    'Lumbering Worldwagon': {'LD'}, 'Braulios of Pheres Band': {'LD', 'P4', 'LG'}, 'Bushwhack': {'LD'},
    'Smellerbee, Rebel Fighter': {'HS', 'LG'}, 'Samut, Tyrant Smasher': {'HS'}, 'Lavaspur Boots': {'HS'}, 'Haste Magic': {'HS'},
    'Moraug, Fury of Akoum': {'P4', 'LG'}, 'Thunderfoot Baloth': {'P4'}, 'Ohran Frostfang': set(), 'Mightform Harmonizer': {'P4'},
    'Amarant Coral': {'P4', 'LG'}, 'Yedora, Grave Gardener': {'P4', 'LG', 'LD'}, 'Owlbear Cub': set(), 'Overrun': set(),
}
WANT = {
    'Bumi, Unleashed': {'LC', 'HS', 'CT'}, 'Toph, Greatest Earthbender': {'LC'}, 'Toph, the Blind Bandit': {'LC', 'CT'},
    'Bumi, Eclectic Earthbender': {'LC', 'HS'}, 'The Boulder, Ready to Rumble': {'P4', 'HS', 'LC'}, 'The Earth King': {'P4', 'HS'},
    'Bitter Work': {'P4'}, "Master's Guidance": {'P4', 'LG'}, 'Ruby, Daring Tracker': {'P4'}, "Flopsie, Bumi's Buddy": {'CR', 'LC'},
    'Ilysian Caryatid': {'P4'}, 'Selvala, Heart of the Wilds': {'P4'}, "Hunter's Insight": {'P4'}, 'Bulk Up': {'P4'}, 'Temur Battle Rage': {'P4'},
    'Badgermole': {'CT'}, 'Drix Fatemaker': {'CT'}, 'Silkguard': {'CT', 'LC'}, 'Hardened Scales': {'CT'}, 'Solid Ground': {'CT'},
    'Kami of Whispered Hopes': {'CT'}, "Innkeeper's Talent": {'CT', 'LC'}, 'Quilled Greatwurm': {'CR', 'LC'}, 'Seismic Tutelage': {'CT'},
    'Overrun': {'CR', 'LC'}, 'Thunderfoot Baloth': {'CR', 'LC'}, 'Domri, Anarch of Bolas': {'CR', 'LC'}, 'Germination Practicum': {'CR', 'LC'},
    'Shamanic Revelation': {'CR', 'LC', 'P4'}, 'Ohran Frostfang': {'CR', 'LC'}, 'Tale of Katara and Toph': {'CR', 'LC'},
    'Halana and Alena, Partners': {'LC'}, 'Mightform Harmonizer': {'LD', 'P4'}, 'Tireless Provisioner': {'LD'}, 'Earthbender Ascension': {'LD'},
    'Moraug, Fury of Akoum': {'LD', 'CR', 'LC'}, 'Bumi Bash': {'LD'}, 'Rockalanche': {'FO'}, 'Nissa, Who Shakes the World': {'FO'},
    'Rocky Rebuke': {'P4'}, 'Savage Smash': {'P4'}, 'Longstalk Brawl': {'P4'}, 'The Last Agni Kai': {'P4'}, 'Earth Rumble': {'P4'},
    'Clear Shot': {'P4'}, 'Knockout Maneuver': {'P4'}, 'Fling': {'P4'}, 'Spry and Mighty': {'P4'}, 'Crystalline Armor': {'LD'},
    'Braulios of Pheres Band': {'LD', 'HS'}, 'Guardian Augmenter': {'LG'}, 'Lavaspur Boots': {'LG'}, 'Snakeskin Veil': {'LG'},
    "Tyvar's Stand": {'LG'}, 'Smellerbee, Rebel Fighter': {'CR', 'LC'}, 'Amarant Coral': {'HS'}, 'Part in Friendship': {'CR'},
    'Yedora, Grave Gardener': {'CR'}, 'Fists of Flame': {'P4'}, 'Haste Magic': {'LG'}, 'Owlbear Cub': {'LD'},
}

# bumi-standalone additions (DB text): UL = untap all lands (Bumi); sacrificed earthbended lands return tapped (CR 701.66a)
GIVE['Bumi, Unleashed'] = GIVE['Bumi, Unleashed'] | {'UL'}
WANT.update({'Heartbeat of Spring': {'UL'}, 'Tectonic Split': {'UL', 'LC'}, 'Nissa, Who Shakes the World': {'FO', 'UL'},
             'Fling': {'P4', 'LC'}, 'Roiling Regrowth': {'LC'}, 'Part in Friendship': {'CR', 'LC'}, 'Owlbear Cub': set(),
             'Bumi Bash': {'LD'}, 'Ilysian Caryatid': {'P4'}, 'Kami of Whispered Hopes': {'CT'}})

def load(path):
    out = {}
    for l in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if not m: continue
        n = m.group(2); n = 'The Legend of Kyoshi // Avatar Kyoshi' if n == 'The Legend of Kyoshi' else n
        r = db.execute("select type_line, power from cards where (name = ? or name like ?) and layout <> 'front_card' limit 1", (n, n + ' // %')).fetchone()
        tl, p = r; front = tl.split(' // ')[0]
        if 'Land' in front and 'Creature' not in front and n != 'Yavimaya, Cradle of Growth': continue
        g = set(GIVE.get(n, set()))
        if 'Creature' in front: g.add('CR')
        if 'Creature' in front and p and str(p).isdigit() and int(p) >= 4: g.add('P4')
        if 'Legendary Creature' in front: g.add('LG')
        out[n] = (g, WANT.get(n, set()))
    return out

SHOW = [a[7:] for a in sys.argv[1:] if a.startswith('--card=')]
for path in [a for a in sys.argv[1:] if not a.startswith('--card=')]:
    c = load(path); lk = {n: set() for n in c}
    for a, (ga, wa) in c.items():
        for b, (gb, wb) in c.items():
            if a != b and (ga & wb or gb & wa): lk[a].add(b)
    body = {n: len(v) for n, v in lk.items() if n != 'Bumi, Unleashed'}
    low = sorted(body.items(), key=lambda kv: kv[1])[:8]
    print(f"{os.path.basename(path)}: {len(body)} nonland, links min {min(body.values())} median {statistics.median(body.values())}"
          f" | Bumi {len(lk.get('Bumi, Unleashed', ()))}")
    for n in SHOW:
        if n in lk: print(f'  {n}: {len(lk[n])} -> ' + ', '.join(sorted(lk[n])))
    print('  lowest:', ', '.join(f'{n} {k}' for n, k in low))
