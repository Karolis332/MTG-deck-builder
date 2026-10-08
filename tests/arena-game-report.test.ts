import { describe, it, expect } from 'vitest';
import {
  addColourSources,
  emptyColourSources,
  isCardStuck,
  segmentEvents,
  diffCounts,
  countsFromDeckList,
  type CardInfo,
} from '../scripts/arena-game-report';
import type { ArenaGameEvent } from '../src/lib/arena-game-events';

const MY_SEAT = 1;

function card(overrides: Partial<CardInfo>): CardInfo {
  return {
    name: 'Test Card', producedMana: [], colorIdentity: [], typeLine: '', manaCost: null, oracleText: null,
    ...overrides,
  };
}

describe('addColourSources (N1/N6 report-layer colour model)', () => {
  it('Bloom Tender with only green permanents on board adds G only', () => {
    // Reverting the oracle-text regex to a name list (or removing it) makes this fall
    // through to the DB's blunt producedMana (WUBRG), which would add all 5 colours —
    // this test fails the moment that happens.
    const bloomTender = card({
      name: 'Bloom Tender',
      colorIdentity: ['G'],
      oracleText: 'For each color among permanents you control, add one mana of that color.',
    });
    const forest = card({ name: 'Forest', colorIdentity: ['G'] });
    const battlefieldInfos = [{ gid: 1, info: bloomTender }, { gid: 2, info: forest }];
    const out = emptyColourSources();
    addColourSources(1, bloomTender, battlefieldInfos, new Set(), null, [], out);
    expect(out.unrestricted).toEqual([['G']]);
  });

  it('a Verge without its required land type still produces its unconditional colour', () => {
    // If the land-type gate is dropped, the conditional line would wrongly fire too —
    // this fixture has no Mountain/Island on board, so only the unconditional W must show.
    const verge = card({
      name: 'Bleachbone Verge',
      oracleText: '{T}: Add {W}.\n{T}: Add {U}. Activate only if you control an Island or a Plains.',
    });
    const out = emptyColourSources();
    addColourSources(1, verge, [{ gid: 1, info: verge }], new Set(), null, [], out);
    expect(out.unrestricted).toEqual([['W']]);
  });

  it('Multiversal Passage with an Island subtype on the object credits U (N6)', () => {
    // Reverting to the old hardcoded 'G' guess makes this assert fail immediately.
    const passage = card({ name: 'Multiversal Passage', typeLine: 'Land' });
    const out = emptyColourSources();
    addColourSources(1, passage, [{ gid: 1, info: passage }], new Set(), null, [], out, { 1: ['SubType_Island'] });
    expect(out.unrestricted).toEqual([['U']]);
  });

  it('a dual land is ONE source with two options, not two sources', () => {
    const dual = card({ name: 'Sacred Foundry', typeLine: 'Land — Mountain Plains', producedMana: ['R', 'W'] });
    const out = emptyColourSources();
    addColourSources(1, dual, [{ gid: 1, info: dual }], new Set(), null, [], out);
    expect(out.unrestricted).toEqual([['R', 'W']]);
  });
});

describe('isCardStuck (stuck-in-hand check)', () => {
  const withSources = (...entries: string[][]) => {
    const sources = emptyColourSources();
    sources.unrestricted.push(...entries);
    return sources;
  };

  it('{G}{G} needs two distinct green sources (round 6: pips take distinct sources)', () => {
    const spell = card({ name: 'Test Spell', manaCost: '{G}{G}' });
    expect(isCardStuck(spell, withSources(['W'], ['W']))).toBe(true);
    expect(isCardStuck(spell, withSources(['G'], ['W']))).toBe(true);
    expect(isCardStuck(spell, withSources(['G'], ['G', 'W']))).toBe(false);
  });

  it('a dual is not spent twice: {R}{W} with one R/W dual alone is stuck, with a Plains beside it is not', () => {
    const spell = card({ name: 'Boros Spell', manaCost: '{R}{W}' });
    expect(isCardStuck(spell, withSources(['R', 'W']))).toBe(true);
    expect(isCardStuck(spell, withSources(['R', 'W'], ['W']))).toBe(false);
  });

  it('Interplanar Beacon pays a planeswalker pip but not a creature pip', () => {
    const sources = emptyColourSources();
    sources.walkerOnly.push(['W', 'U', 'B', 'R', 'G']);
    expect(isCardStuck(card({ name: 'Walker', typeLine: 'Legendary Planeswalker — Jace', manaCost: '{U}' }), sources)).toBe(false);
    expect(isCardStuck(card({ name: 'Bear', typeLine: 'Creature — Bear', manaCost: '{G}' }), sources)).toBe(true);
  });

  it('is never stuck on a Phyrexian pip (N8 — always payable with life)', () => {
    const spell = card({ name: 'Phyrexian Spell', manaCost: '{B/P}' });
    expect(isCardStuck(spell, emptyColourSources())).toBe(false);
  });
});

describe('segmentEvents (N5 reconnect-fragment merge)', () => {
  it('merges two match_start fragments of the same matchId into one bucket with all turns', () => {
    const events: ArenaGameEvent[] = [
      { type: 'match_start', matchId: 'abc123', playerSeatId: MY_SEAT, playerTeamId: 1, playerName: null, opponentName: null, format: null },
      { type: 'turn_change', turnNumber: 1, activePlayer: MY_SEAT },
      { type: 'turn_change', turnNumber: 2, activePlayer: MY_SEAT === 1 ? 2 : 1 },
      // Reconnect: Arena resends match_start for the SAME matchId mid-game instead of
      // a MatchCompleted. The old "keep only the longer flush" logic discarded the two
      // turn_change events above entirely — this test fails if that regresses.
      { type: 'match_start', matchId: 'abc123', playerSeatId: MY_SEAT, playerTeamId: 1, playerName: null, opponentName: null, format: null },
      { type: 'turn_change', turnNumber: 3, activePlayer: MY_SEAT },
    ];
    const buckets = segmentEvents(events);
    const bucket = buckets.get('abc123#1');
    expect(bucket).toBeDefined();
    const turnChanges = bucket!.events.filter((e) => e.type === 'turn_change');
    expect(turnChanges).toHaveLength(3);
  });
});

describe('diffCounts / countsFromDeckList (ledger diff)', () => {
  it('a commander + 99 identical to the ledger entry diffs to zero (matches ledger)', () => {
    const list = [
      { name: 'Tam, the Possibility', qty: 1 },
      { name: 'Sol Ring', qty: 1 },
      { name: 'Forest', qty: 1 },
    ];
    const submitted = countsFromDeckList(list);
    const ledger = countsFromDeckList(list);
    const { plus, minus } = diffCounts(submitted, ledger);
    expect(plus).toBe(0);
    expect(minus).toBe(0);
  });

  it('a real edit (swap one card) shows up as +1 -1', () => {
    const ledger = countsFromDeckList([{ name: 'Tam, the Possibility', qty: 1 }, { name: 'Sol Ring', qty: 1 }]);
    const submitted = countsFromDeckList([{ name: 'Tam, the Possibility', qty: 1 }, { name: 'Mana Crypt', qty: 1 }]);
    const { plus, minus } = diffCounts(submitted, ledger);
    expect(plus).toBe(1);
    expect(minus).toBe(1);
  });
});
