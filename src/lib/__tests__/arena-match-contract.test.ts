/**
 * §1.5 field-contract tests on reduced block sequences cut from the operator's real
 * Player.log (2026-09-03), names anonymised to PlayerA (local) / PlayerB (opponent).
 * See fixtures/arena/README.md for provenance of each file.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractMatches,
  normalizeQueue,
  identifyPlayer,
  deriveLegacyFields,
  type JsonBlock,
  type ArenaMatch,
} from '../arena-log-reader';
import { extractGameEvents } from '../arena-game-events';

const FIX = path.join(__dirname, 'fixtures', 'arena');
const load = (name: string): JsonBlock[] => JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf-8'));
const one = (name: string, screenName?: string | null): ArenaMatch => {
  const blocks = load(name);
  // Fixture block 0 is the synthetic auth block; drop it when simulating a watcher that never
  // saw authenticateResponse (screenName null) or only has an external hint (screenName string).
  const input = screenName === undefined ? blocks : blocks.slice(1);
  const matches = extractMatches(input, screenName ? { screenName } : {});
  expect(matches).toHaveLength(1);
  return matches[0];
};

describe('contract: Brawl win, local seat 1', () => {
  const m = one('brawl-win-seat1.json');
  it('identity + result from finalMatchResult mapped through the player team', () => {
    expect(m.playerScreenName).toBe('PlayerA');
    expect(m.playerName).toBe('PlayerA');
    expect(m.opponentName).toBe('PlayerB');
    expect(m.playerSeat).toBe(1);
    expect(m.winnerSeat).toBe(1);
    expect(m.result).toBe('win');
    expect(m.identitySource).toBe('user_id');
  });
  it('turns, duration, queue mapping', () => {
    expect(m.turns).toBe(9);
    expect(m.durationSeconds).toBe(344);
    expect(m.startedAt).toBe('2026-09-03T17:27:21.052Z');
    expect(m.queueRaw).toBe('Brawl_Ladder');
    expect(m.formatNormalized).toBe('competitivebrawl'); // research §5 rule 1 [UNCERTAIN 0.85]
    expect(m.format).toBe('Brawl_Ladder');
  });
  it('commanders from the command zone per owner seat', () => {
    expect(m.playerCommanderGrpIds).toEqual(['102111']);
    expect(m.opponentCommanderGrpIds).toEqual(['90503']);
  });
  it('single game mirrored into gameResults', () => {
    expect(m.gameResults).toEqual([
      { game: 1, winningTeamId: 1, winnerSeat: 1, result: 'win', reason: 'ResultReason_Game', turns: 9 },
    ]);
  });
});

describe('contract: Brawl loss, local seat 1', () => {
  const m = one('brawl-loss-seat1.json');
  it('loss when the other team wins', () => {
    expect(m.result).toBe('loss');
    expect(m.playerSeat).toBe(1);
    expect(m.winnerSeat).toBe(2);
    expect(m.turns).toBe(9);
    expect(m.gameResults[0].reason).toBe('ResultReason_Concede');
    expect(m.opponentCommanderGrpIds).toEqual(['91778']);
  });
});

describe('contract: draft match', () => {
  const m = one('draft-loss.json');
  it('normalises the dated draft queue and carries no commanders', () => {
    expect(m.queueRaw).toBe('QuickDraft_SOS_20260831');
    expect(m.formatNormalized).toBe('draft');
    expect(m.playerCommanderGrpIds).toEqual([]);
    expect(m.opponentCommanderGrpIds).toEqual([]);
    expect(m.result).toBe('loss');
    expect(m.turns).toBe(17);
  });
});

describe('contract: local player in seat 2 (the opponent==self defect)', () => {
  it('with the screen name known: PlayerA seat 2 wins', () => {
    const m = one('brawl-win-seat2-opponent-eq-self.json');
    expect(m.playerName).toBe('PlayerA');
    expect(m.opponentName).toBe('PlayerB');
    expect(m.playerSeat).toBe(2);
    expect(m.winnerSeat).toBe(2);
    expect(m.result).toBe('win');
    expect(m.turns).toBe(14);
  });
  it('userId from the GRE header / clientId beats the screen name', () => {
    const blocks = load('brawl-win-seat2-opponent-eq-self.json').slice(1);
    const m = extractMatches([['standalone', { matchAccountUserId: 'USER_A' }], ...blocks], { screenName: 'PlayerB' })[0];
    expect(m.identitySource).toBe('user_id');
    expect(m.playerName).toBe('PlayerA');
    expect(m.result).toBe('win');
  });
  it('without any screen name or userId: GRE single-recipient seat identifies PlayerA (never seat-1 guess)', () => {
    const m = one('brawl-win-seat2-opponent-eq-self.json', null);
    expect(m.identitySource).toBe('gre_seat');
    expect(m.playerName).toBe('PlayerA');
    expect(m.opponentName).toBe('PlayerB');
    expect(m.playerSeat).toBe(2);
    expect(m.result).toBe('win');
  });
  it('a wrong screen name hint falls through to the GRE seat', () => {
    const m = one('brawl-win-seat2-opponent-eq-self.json', 'SomeoneElse');
    expect(m.identitySource).toBe('gre_seat');
    expect(m.playerName).toBe('PlayerA');
    expect(m.result).toBe('win');
  });
  it('overlay event extractor agrees on the seat via the shared identity rule', () => {
    const blocks = load('brawl-win-seat2-opponent-eq-self.json').slice(1);
    const events = extractGameEvents(blocks);
    const done = events.find((e) => e.type === 'match_complete');
    expect(done && done.type === 'match_complete' ? done.result : null).toBe('win');
  });
});

describe('contract: Bo3 (synthetic, cut from real blocks)', () => {
  const m = one('bo3-synthetic-win-1-2.json');
  it('per-game results with turns, match result from MatchScope_Match', () => {
    expect(m.gameResults.map((g) => [g.game, g.result, g.turns])).toEqual([
      [1, 'loss', 8],
      [2, 'win', 11],
      [3, 'win', 6],
    ]);
    expect(m.result).toBe('win');
    expect(m.winnerSeat).toBe(1);
    expect(m.turns).toBe(6); // last turnInfo of the match (contract); per-game turns live in gameResults
    expect(m.durationSeconds).toBe(1800);
  });
});

describe('rawEvents replay is deterministic', () => {
  for (const f of ['brawl-win-seat1.json', 'brawl-loss-seat1.json', 'draft-loss.json', 'brawl-win-seat2-opponent-eq-self.json', 'bo3-synthetic-win-1-2.json']) {
    it(f, () => {
      const m = one(f);
      const replay = extractMatches(m.rawEvents)[0];
      const { rawEvents: _a, cardsPlayed: _b, opponentCardsSeen: _c, cardsPlayedByTurn: _d, landsPlayedByTurn: _e, commanderCastTurns: _f, ...contract } = m;
      const { rawEvents: _g, cardsPlayed: _h, opponentCardsSeen: _i, cardsPlayedByTurn: _j, landsPlayedByTurn: _k, commanderCastTurns: _l, ...replayed } = replay;
      expect(replayed).toEqual(contract);
      expect(JSON.stringify(m.rawEvents).length).toBeLessThan(20_000);
    });
  }
});

describe('normalizeQueue (research §5 table, every queue string seen in the operator DB/logs)', () => {
  it.each([
    ['Brawl_Ladder', 'competitivebrawl'],
    ['Play_Brawl_Historic', 'brawl'],
    ['Play_Brawl', 'brawl'],
    ['Brawl_Challenge_20260331', 'brawl'],
    ['DirectGameBrawl', 'brawl'],
    ['Historic Brawl', 'brawl'],
    ['Standard_Brawl', 'standardbrawl'],
    ['PickTwoDraft_HOB_20260811', 'draft'],
    ['QuickDraft_SOS_20260831', 'draft'],
    ['PremierDraft_ECL_20260120', 'draft'],
    ['CubeDraft_Powered_20260331', 'draft'],
    ['ArenaDirect_ECL_Play_Sealed_20260213', 'sealed'],
    ['Ladder', 'standard'],
    ['Traditional_Ladder', 'standard'],
    ['Play', 'standard'],
    ['Constructed_Event_2026', 'standard'],
    ['Alchemy_Ladder', 'alchemy'],
    ['Spark_Alchemy_Ladder', 'alchemy'],
    ['Historic_Ladder', 'historic'],
    ['Explorer_Ladder', 'explorer'],
    ['Timeless_Ladder', 'timeless'],
    ['DirectGame', 'other'],
    ['ColorChallenge_Node5_W', 'other'],
    ['SparkyStarterDeckDuel', 'other'],
    [null, 'other'],
  ])('%s → %s', (q, expected) => {
    expect(normalizeQueue(q)).toBe(expected);
  });
  it('GameVariant_Brawl overrides a non-Brawl queue match', () => {
    expect(normalizeQueue('DirectGame', 'GameVariant_Brawl')).toBe('brawl');
    expect(normalizeQueue('Brawl_Ladder', 'GameVariant_Brawl')).toBe('competitivebrawl');
  });
});

describe('turns fallback from players[].turnNumber (game-end Diff omits turnInfo)', () => {
  it('sums per-seat turn counts when turnInfo is absent', () => {
    const blocks = load('brawl-win-seat1.json');
    const end = blocks.length - 1;
    const withPlayers: JsonBlock[] = [
      ...blocks.slice(0, end),
      ['standalone', { greToClientEvent: { greToClientMessages: [{ gameStateMessage: {
        players: [{ systemSeatNumber: 1, turnNumber: 6 }, { systemSeatNumber: 2, turnNumber: 5 }],
      } }] } }],
      blocks[end],
    ];
    expect(extractMatches(withPlayers)[0].turns).toBe(11);
  });
});

describe('identifyPlayer', () => {
  const reserved = [
    { userId: 'U1', playerName: 'Other', systemSeatId: 1, teamId: 1, eventId: 'Brawl_Ladder' },
    { userId: 'U2', playerName: 'Me', systemSeatId: 2, teamId: 2, eventId: 'Brawl_Ladder' },
  ];
  it('userId wins over everything', () => {
    const id = identifyPlayer(reserved, 'Other', 1, 'U2');
    expect(id.source).toBe('user_id');
    expect(id.player?.playerName).toBe('Me');
  });
  it('screen name wins over seat hint', () => {
    const id = identifyPlayer(reserved, 'Me', 1);
    expect(id.source).toBe('screen_name');
    expect(id.player?.systemSeatId).toBe(2);
    expect(id.opponent?.playerName).toBe('Other');
  });
  it('seat hint when name unknown', () => {
    const id = identifyPlayer(reserved, null, 2);
    expect(id.source).toBe('gre_seat');
    expect(id.player?.playerName).toBe('Me');
  });
  it('flags the seat-1 assumption', () => {
    const id = identifyPlayer(reserved, null, null);
    expect(id.source).toBe('assumed_seat1');
    expect(id.player?.playerName).toBe('Other');
  });
});

describe('deriveLegacyFields (rows without raw_events)', () => {
  it('swaps names and flips result when opponent_name is the local screen name', () => {
    const d = deriveLegacyFields({ player_name: 'PepeSilvia', opponent_name: 'QuLeR', result: 'loss', format: 'Brawl_Ladder' }, 'QuLeR');
    expect(d).toEqual({
      playerName: 'QuLeR', opponentName: 'PepeSilvia', result: 'win', playerScreenName: 'QuLeR',
      queueRaw: 'Brawl_Ladder', formatNormalized: 'competitivebrawl', swapped: true,
    });
  });
  it('leaves correctly attributed rows alone, only mapping the format', () => {
    const d = deriveLegacyFields({ player_name: 'QuLeR', opponent_name: 'X', result: 'win', format: 'PickTwoDraft_TMT_20260303' }, 'QuLeR');
    expect(d.swapped).toBe(false);
    expect(d.result).toBe('win');
    expect(d.formatNormalized).toBe('draft');
  });
  it('does nothing without a screen name', () => {
    const d = deriveLegacyFields({ player_name: 'A', opponent_name: 'B', result: 'loss', format: null }, null);
    expect(d.swapped).toBe(false);
    expect(d.formatNormalized).toBe('other');
  });
});
