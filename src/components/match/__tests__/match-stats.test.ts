import { describe, it, expect } from 'vitest';
import {
  type ArenaMatchRow,
  matchResult,
  normalizeFormat,
  computeRecord,
  currentStreak,
  sparklineSeries,
  sparklinePoints,
  formatDuration,
  durationSeconds,
  parseGameResults,
  filterMatches,
  buildTurnLanes,
  EMPTY_FILTERS,
} from '../match-stats';

function row(over: Partial<ArenaMatchRow> = {}): ArenaMatchRow {
  return {
    id: 1, match_id: 'm', player_name: 'me', opponent_name: 'opp', result: 'win', format: 'Play_Brawl_Historic',
    turns: 10, deck_cards: null, cards_played: null, opponent_cards_seen: null, parsed_at: '2026-04-01 10:00:00',
    deck_id: null, deck_match_confidence: null, cards_played_by_turn: null, commander_cast_turns: null,
    lands_played_by_turn: null, opening_hand: null, mulligan_count: 0, on_play: null, match_start_time: null,
    match_end_time: null, game_count: 1, life_progression: null, draw_order: null, sideboard_changes: null,
    opponent_cards_by_turn: null, ...over,
  };
}

describe('matchResult', () => {
  it('reads result column, falls back to seats, else null', () => {
    expect(matchResult(row({ result: 'WIN' }))).toBe('win');
    expect(matchResult(row({ result: null, winner_seat: 2, player_seat: 2 }))).toBe('win');
    expect(matchResult(row({ result: null, winner_seat: 1, player_seat: 2 }))).toBe('loss');
    expect(matchResult(row({ result: null }))).toBeNull();
    expect(matchResult(row({ result: 'garbage' }))).toBeNull();
  });
});

describe('normalizeFormat', () => {
  it('prefers the T2 enum', () => {
    expect(normalizeFormat({ format: 'Play_Brawl_Historic', format_normalized: 'timeless' })).toBe('timeless');
    expect(normalizeFormat({ format: 'Brawl', format_normalized: 'bogus' })).toBe('standardbrawl');
  });
  it('maps real queue strings from the operator DB', () => {
    expect(normalizeFormat({ format: 'Play_Brawl_Historic' })).toBe('brawl');
    expect(normalizeFormat({ format: 'Historic Brawl' })).toBe('brawl');
    expect(normalizeFormat({ format: 'Brawl_Challenge_20260331' })).toBe('competitivebrawl');
    expect(normalizeFormat({ format: 'Brawl' })).toBe('standardbrawl');
    expect(normalizeFormat({ format: 'PremierDraft_ECL_20260120' })).toBe('draft');
    expect(normalizeFormat({ format: 'ArenaDirect_ECL_Play_Sealed_20260213' })).toBe('sealed');
    expect(normalizeFormat({ format: 'Standard' })).toBe('standard');
  });
  it('does not guess Ladder / Play / Constructed_Event', () => {
    for (const f of ['Ladder', 'Play', 'Constructed_Event_2026', 'DirectGame', null]) {
      expect(normalizeFormat({ format: f })).toBe('other');
    }
  });
});

describe('record + streak + sparkline', () => {
  const rows = [
    row({ result: 'win' }), row({ result: 'win' }), row({ result: 'draw' }),
    row({ result: 'loss' }), row({ result: null }), row({ result: 'win' }),
  ];
  it('computeRecord excludes draws from win%', () => {
    expect(computeRecord(rows)).toEqual({ wins: 3, losses: 1, draws: 1, total: 5, winPct: 75 });
    expect(computeRecord([])).toEqual({ wins: 0, losses: 0, draws: 0, total: 0, winPct: null });
  });
  it('currentStreak counts from newest, stops at first different result', () => {
    expect(currentStreak(rows)).toEqual({ kind: 'win', length: 2 });
    expect(currentStreak([row({ result: 'draw' }), row({ result: 'win' })])).toBeNull();
    expect(currentStreak([row({ result: null }), row({ result: 'loss' }), row({ result: 'loss' })])).toEqual({ kind: 'loss', length: 2 });
    expect(currentStreak([])).toBeNull();
  });
  it('sparklineSeries is oldest→newest, skips unknown, capped at n', () => {
    expect(sparklineSeries(rows)).toEqual([1, -1, 0, 1, 1]);
    expect(sparklineSeries(rows, 2)).toEqual([1, 1]);
  });
  it('sparklinePoints scales cumulative score into the box', () => {
    expect(sparklinePoints([], 40, 10)).toBe('');
    expect(sparklinePoints([1, 1], 40, 10)).toBe('0.0,10.0 20.0,5.0 40.0,0.0');
    expect(sparklinePoints([-1], 40, 10)).toBe('0.0,0.0 40.0,10.0');
  });
});

describe('duration', () => {
  it('formatDuration', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(-5)).toBe('—');
    expect(formatDuration(65)).toBe('1m 05s');
    expect(formatDuration(3720)).toBe('1h 02m');
  });
  it('durationSeconds prefers contract column, then start/end', () => {
    expect(durationSeconds({ duration_seconds: 90, match_start_time: null, match_end_time: null })).toBe(90);
    expect(durationSeconds({ match_start_time: '2026-04-01T10:00:00Z', match_end_time: '2026-04-01T10:12:30Z' })).toBe(750);
    expect(durationSeconds({ match_start_time: '2026-04-01T10:12:30Z', match_end_time: '2026-04-01T10:00:00Z' })).toBeNull();
    expect(durationSeconds({ match_start_time: 'nope', match_end_time: '2026-04-01T10:00:00Z' })).toBeNull();
    expect(durationSeconds({ match_start_time: null, match_end_time: null })).toBeNull();
  });
});

describe('parseGameResults', () => {
  it('accepts several shapes and never throws', () => {
    expect(parseGameResults({ game_results: null })).toEqual([]);
    expect(parseGameResults({ game_results: '{bad' })).toEqual([]);
    expect(parseGameResults({ game_results: '["win","loss","win"]' })).toEqual([
      { game: 1, result: 'win' }, { game: 2, result: 'loss' }, { game: 3, result: 'win' },
    ]);
    expect(parseGameResults({ game_results: '[{"game":2,"won":false}]' })).toEqual([{ game: 2, result: 'loss' }]);
    expect(parseGameResults({ game_results: '[{"winner_seat":1}]', player_seat: 1 })).toEqual([{ game: 1, result: 'win' }]);
    expect(parseGameResults({ game_results: '[{"foo":1}]' })).toEqual([{ game: 1, result: null }]);
  });
});

describe('filterMatches', () => {
  const now = Date.parse('2026-04-10T00:00:00Z');
  const rows = [
    row({ id: 1, result: 'win', format: 'Standard', opponent_name: 'Alice', parsed_at: '2026-04-09 10:00:00', deck_id: 7 }),
    row({ id: 2, result: 'loss', format: 'Play_Brawl_Historic', opponent_name: 'Bob', opponent_commander: 'Krenko, Mob Boss', parsed_at: '2026-02-01 10:00:00' }),
    row({ id: 3, result: 'win', format: 'Ladder', opponent_name: 'Carol', match_start_time: '2026-04-05T10:00:00Z', parsed_at: '2026-01-01 00:00:00' }),
  ];
  const ids = (xs: ArenaMatchRow[]) => xs.map((r) => r.id);
  it('empty filters pass everything', () => expect(ids(filterMatches(rows, EMPTY_FILTERS, now))).toEqual([1, 2, 3]));
  it('format chips', () => expect(ids(filterMatches(rows, { ...EMPTY_FILTERS, formats: ['brawl', 'other'] }, now))).toEqual([2, 3]));
  it('result', () => expect(ids(filterMatches(rows, { ...EMPTY_FILTERS, result: 'loss' }, now))).toEqual([2]));
  it('opponent matches name or commander, case-insensitive', () => {
    expect(ids(filterMatches(rows, { ...EMPTY_FILTERS, opponent: 'krenko' }, now))).toEqual([2]);
    expect(ids(filterMatches(rows, { ...EMPTY_FILTERS, opponent: 'ALI' }, now))).toEqual([1]);
  });
  it('date preset uses match_start_time over parsed_at', () => {
    expect(ids(filterMatches(rows, { ...EMPTY_FILTERS, date: '7d' }, now))).toEqual([1, 3]);
    expect(ids(filterMatches(rows, { ...EMPTY_FILTERS, date: '90d' }, now))).toEqual([1, 2, 3]);
  });
  it('deckId', () => expect(ids(filterMatches(rows, { ...EMPTY_FILTERS, deckId: 7 }, now))).toEqual([1]));
});

describe('buildTurnLanes', () => {
  it('merges lanes per turn from real-shape JSON, tolerates nulls and bad JSON', () => {
    const lanes = buildTurnLanes(row({
      cards_played_by_turn: '{"2":["91063"],"4":["93977","Llanowar Elves"]}',
      lands_played_by_turn: '{"1":["Forest"]}',
      opponent_cards_by_turn: '{"3":[79735,75539]}',
      life_progression: '[{"turn":0,"player":20,"opponent":20},{"turn":3,"player":18,"opponent":20},{"turn":3,"player":17,"opponent":20}]',
    }));
    expect(lanes.map((l) => l.turn)).toEqual([1, 2, 3, 4]);
    expect(lanes[1]).toEqual({ turn: 2, you: ['91063'], lands: [], opponent: [], life: null });
    expect(lanes[2]).toEqual({ turn: 3, you: [], lands: [], opponent: ['79735', '75539'], life: { player: 17, opponent: 20 } });
    expect(lanes[3].you).toEqual(['93977', 'Llanowar Elves']);
    expect(buildTurnLanes(row())).toEqual([]);
    expect(buildTurnLanes(row({ cards_played_by_turn: '{bad', life_progression: 'null' }))).toEqual([]);
  });
});
