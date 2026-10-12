"""Monte Carlo for the Arena Jace build: land count vs mana / colour reliability.

Run: PYTHONIOENCODING=utf-8 py verify-2026-09-30/arena-jace/sim/landsim.py [games]

Model (documented in build-report.md section 5):
- 99-card library, 7-card hand. Arena Brawl free first mulligan: a hand with fewer than 2 or more than 5 land faces is
  redrawn once for free; a second bad hand goes to 6 (London: draw 7, bottom a spell when short on lands, a land when
  flooded). On the play there is no draw on turn 1; on the draw there is.
- Only real mana producers count: land faces (MDFC backs included) and the 2-mana rocks (Talismans, Signets, Arcane
  Signet) and Chromatic Lantern (3). A rock cast on turn t produces from turn t+1 (Talismans/Signets can tap the turn
  they land, but that only repays the mana spent on them). Mox Amber never counts (needs a legendary walker). Rocks are
  cast greedily, cheapest first, with the turn's whole mana, from turn 2. Colours: real land colours; fetches = any colour reachable through the shocks (Tarn/Strand = any,
  Misty = W/U/R); Verges = both colours (the paired type is on the table in almost every game by turn 4 with five shocks,
  Savai, Urborg and Passage); Command Tower / Starting Town / Multiversal Passage / Arcane Signet = any; Great Hall = any
  colour for Jace only (legendary), colourless otherwise; Otawara / Theorist's Sanctum = U; Eiganjo = W, Sokenzan = R; tapped-ness is ignored (the
  sim measures sources, the report lists the tapped lands).
"""
import random
import sys
from collections import Counter

ANY = frozenset('WUBR')
JACE_COLOURS = ANY

# name -> (colours, kind) ; kind: land | rock
LANDS = {
    'Command Tower': ANY, 'Steam Vents': frozenset('UR'), 'Hallowed Fountain': frozenset('WU'),
    'Blood Crypt': frozenset('BR'), 'Sacred Foundry': frozenset('RW'), 'Godless Shrine': frozenset('WB'),
    'Scalding Tarn': ANY, 'Flooded Strand': ANY, 'Misty Rainforest': frozenset('WUR'),
    'Spirebluff Canal': frozenset('UR'), 'Concealed Courtyard': frozenset('WB'), 'Stormcarved Coast': frozenset('UR'),
    'Deserted Beach': frozenset('WU'), 'Shattered Sanctum': frozenset('WB'), 'Sundown Pass': frozenset('RW'),
    'Riverpyre Verge': frozenset('UR'), 'Bleachbone Verge': frozenset('WB'), 'Sunbillow Verge': frozenset('RW'),
    'Starting Town': ANY, 'Multiversal Passage': ANY, 'Mount Doom': frozenset('BR'),
    'Urborg, Tomb of Yawgmoth': frozenset('B'), 'Great Hall of the Citadel': frozenset(),  # any for Jace, see below
    'Otawara, Soaring City': frozenset('U'), "Theorist's Sanctum": frozenset('U'),
    'Savai Triome': frozenset('RWB'), 'Oscorp Industries': frozenset('UBR'),
    'Island': frozenset('U'), 'Eiganjo, Seat of the Empire': frozenset('W'), 'Sokenzan, Crucible of Defiance': frozenset('R'),
    # MDFC backs
    'Sink into Stupor': frozenset('U'), 'Fell the Profane': frozenset('B'), 'Shatterskull Smashing': frozenset('R'),
    'Razorgrass Ambush': frozenset('W'),
}
JACE_ANY = {'Great Hall of the Citadel'}
ROCKS = {
    'Talisman of Indulgence': frozenset('BR'), 'Talisman of Creativity': frozenset('UR'),
    'Talisman of Dominance': frozenset('UB'), 'Talisman of Conviction': frozenset('RW'),
    'Talisman of Progress': frozenset('WU'), 'Arcane Signet': ANY, 'Azorius Signet': frozenset('WU'),
    'Chromatic Lantern': ANY,
}
ROCK_COST = {n: 2 for n in ROCKS}
ROCK_COST['Chromatic Lantern'] = 3
EXTRA_LANDS = ['Mystic Monastery', 'Nomad Outpost', 'Swamp']  # added above the base list in this order
EXTRA_COL = {'Mystic Monastery': frozenset('URW'), 'Nomad Outpost': frozenset('RWB'), 'Swamp': frozenset('B')}
LANDS.update(EXTRA_COL)


def build(n_lands, n_rocks=len(ROCKS)):
    base = [n for n in LANDS if n not in EXTRA_COL]
    assert len(base) == 34, len(base)
    lands = base[:]
    if n_lands < 34:
        for cut in ['Sokenzan, Crucible of Defiance', 'Eiganjo, Seat of the Empire', 'Island'][: 34 - n_lands]:
            lands.remove(cut)
    else:
        lands += EXTRA_LANDS[: n_lands - 34]
    rocks = list(ROCKS)[:n_rocks]
    spells = 99 - len(lands) - len(rocks)
    return [('L', n) for n in lands] + [('R', n) for n in rocks] + [('S', 'spell')] * spells


def draw_hand(deck):
    random.shuffle(deck)
    hand, lib = deck[:7], deck[7:]
    good = lambda h: 2 <= sum(c[0] == 'L' for c in h) <= 5
    if not good(hand):  # free mulligan
        random.shuffle(deck)
        hand, lib = deck[:7], deck[7:]
        if not good(hand):  # London to 6
            random.shuffle(deck)
            hand, lib = deck[:7], deck[7:]
            nl = sum(c[0] == 'L' for c in hand)
            kind = 'S' if nl <= 3 else 'L'
            i = next((i for i, c in enumerate(hand) if c[0] == kind), 0)
            lib = lib + [hand.pop(i)]
    return hand, lib


def play(deck, on_play, turns=6):
    hand, lib = draw_hand(deck)
    seen = list(hand)
    lands_seen, rocks_seen = [], []
    for c in hand:
        (lands_seen if c[0] == 'L' else rocks_seen if c[0] == 'R' else []).append(c[1])
    per_turn = {}
    rocks_online = 0
    online_rocks = []
    for t in range(1, turns + 1):
        if t > 1 or not on_play:
            c = lib.pop(0)
            seen.append(c)
            if c[0] == 'L':
                lands_seen.append(c[1])
            elif c[0] == 'R':
                rocks_seen.append(c[1])
        lands_in_play = min(len(lands_seen), t)  # one land drop per turn
        mana = lands_in_play + rocks_online
        colours = set()
        for n in lands_seen[:lands_in_play]:
            colours |= LANDS[n]
        jace_colours = set(colours)
        for n in lands_seen[:lands_in_play]:
            if n in JACE_ANY:
                jace_colours |= ANY
        for n in online_rocks:
            colours |= ROCKS[n]
            jace_colours |= ROCKS[n]
        per_turn[t] = dict(lands=lands_in_play, lands_seen=len(lands_seen), mana=mana,
                           colours=colours, jace_ok=(mana >= 5 and jace_colours >= JACE_COLOURS))
        # cast rocks after the turn's snapshot (they produce from next turn)
        if t >= 2:
            budget = mana
            for n in sorted((r for r in rocks_seen if r not in online_rocks), key=lambda r: ROCK_COST[r]):
                if ROCK_COST[n] <= budget:
                    budget -= ROCK_COST[n]
                    online_rocks.append(n)
            rocks_online = len(online_rocks)
    return per_turn


def run(n_lands, games, on_play):
    deck = build(n_lands)
    hits = Counter()
    for _ in range(games):
        pt = play(list(deck), on_play)
        hits['2 lands by T2'] += pt[2]['lands_seen'] >= 2
        hits['3 mana by T3'] += pt[3]['mana'] >= 3
        hits['4 mana by T4'] += pt[4]['mana'] >= 4
        hits['Jace by T4'] += pt[4]['jace_ok']
        hits['Jace by T5'] += pt[5]['jace_ok']
        hits['WUBR by T5'] += pt[5]['colours'] >= ANY
        hits['flood: 7+ lands by T6'] += pt[6]['lands_seen'] >= 7
        hits['screw: <=2 lands by T4'] += pt[4]['lands_seen'] <= 2
    return {k: 100 * v / games for k, v in hits.items()}


if __name__ == '__main__':
    games = int(sys.argv[1]) if len(sys.argv) > 1 else 20000
    random.seed(20260930)
    keys = ['2 lands by T2', '3 mana by T3', '4 mana by T4', 'Jace by T4', 'Jace by T5', 'WUBR by T5',
            'flood: 7+ lands by T6', 'screw: <=2 lands by T4']
    print(f'games per row: {games}; values are % (play / draw); rocks counted: {len(ROCKS)}')
    print('| land faces | ' + ' | '.join(keys) + ' |')
    print('|---' * (len(keys) + 1) + '|')
    for n in (33, 34, 35, 36):
        p = run(n, games, True)
        d = run(n, games, False)
        print(f'| {n} | ' + ' | '.join(f'{p[k]:.1f} / {d[k]:.1f}' for k in keys) + ' |')
