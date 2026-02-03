import { describe, it, expect } from 'vitest';
import {
  extractJsonBlocks,
  extractMatches,
  extractCollection,
  parseArenaLogFile,
  SAMPLE_LOG,
  SAMPLE_COLLECTION_LOG,
} from '../arena-log-reader';

// Helper to build a matchGameRoomStateChangedEvent JSON line
function roomStateEvent(
  matchId: string,
  stateType: string,
  player: { name: string; seatId: number; teamId: number; eventId?: string },
  opponent: { name: string; seatId: number; teamId: number },
  finalResult?: { winningTeamId: number }
): string {
  const reserved = [
    { userId: 'p1', playerName: player.name, systemSeatId: player.seatId, teamId: player.teamId, eventId: player.eventId || 'Play_Standard' },
    { userId: 'p2', playerName: opponent.name, systemSeatId: opponent.seatId, teamId: opponent.teamId, eventId: player.eventId || 'Play_Standard' },
  ];
  const roomInfo: Record<string, unknown> = {
    gameRoomConfig: { reservedPlayers: reserved, matchId },
    stateType,
  };
  if (finalResult) {
    roomInfo.finalMatchResult = {
      matchId,
      resultList: [
        { scope: 'MatchScope_Game', result: 'ResultType_WinLoss', winningTeamId: finalResult.winningTeamId },
        { scope: 'MatchScope_Match', result: 'ResultType_WinLoss', winningTeamId: finalResult.winningTeamId },
      ],
    };
  }
  return JSON.stringify({ transactionId: 'tx1', matchGameRoomStateChangedEvent: roomInfo });
}

function greEvent(matchId: string, messages: unknown[]): string {
  return JSON.stringify({ transactionId: 'tx2', greToClientEvent: { greToClientMessages: messages } });
}

const DEFAULT_PLAYER = { name: 'TestPlayer', seatId: 1, teamId: 1 };
const DEFAULT_OPPONENT = { name: 'Opponent', seatId: 2, teamId: 2 };

// ── extractJsonBlocks ────────────────────────────────────────────────────────

describe('extractJsonBlocks', () => {
  it('extracts method call JSON blocks', () => {
    const log = '==> Event.DeckSubmitV3(123): {"CourseDeck":{"mainDeck":[]}}';
    const blocks = extractJsonBlocks(log);
    expect(blocks).toHaveLength(1);
    expect(blocks[0][0]).toBe('Event.DeckSubmitV3');
    expect(blocks[0][1]).toEqual({ CourseDeck: { mainDeck: [] } });
  });

  it('extracts response blocks with <==', () => {
    const log = '<== PlayerInventory.GetPlayerCardsV3(456): {"67890": 4}';
    const blocks = extractJsonBlocks(log);
    expect(blocks).toHaveLength(1);
    expect(blocks[0][0]).toBe('PlayerInventory.GetPlayerCardsV3');
    expect(blocks[0][1]).toEqual({ '67890': 4 });
  });

  it('extracts standalone UnityCrossThreadLogger JSON', () => {
    const log = '[UnityCrossThreadLogger]{"matchId":"abc-123"}';
    const blocks = extractJsonBlocks(log);
    expect(blocks).toHaveLength(1);
    expect(blocks[0][0]).toBe('standalone');
    expect(blocks[0][1]).toEqual({ matchId: 'abc-123' });
  });

  it('extracts bare JSON lines with transactionId', () => {
    const log = '{ "transactionId": "abc", "greToClientEvent": {} }';
    const blocks = extractJsonBlocks(log);
    expect(blocks).toHaveLength(1);
    expect(blocks[0][1]).toHaveProperty('transactionId');
  });

  it('extracts new format [UnityCrossThreadLogger]==> Method {json}', () => {
    const log = '[UnityCrossThreadLogger]==> EventGetCoursesV2 {"id":"abc","request":"{}"}';
    const blocks = extractJsonBlocks(log);
    expect(blocks).toHaveLength(1);
    expect(blocks[0][0]).toBe('EventGetCoursesV2');
  });

  it('handles multi-line JSON', () => {
    const log = [
      '==> Test(1): {',
      '  "key": "value"',
      '}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    expect(blocks).toHaveLength(1);
    expect(blocks[0][1]).toEqual({ key: 'value' });
  });

  it('skips malformed JSON', () => {
    const log = '==> Bad(1): {not valid json at all}}}';
    const blocks = extractJsonBlocks(log);
    expect(blocks).toHaveLength(0);
  });

  it('handles empty input', () => {
    expect(extractJsonBlocks('')).toEqual([]);
  });

  it('handles mixed valid and invalid lines', () => {
    const log = [
      'Some random log line',
      '==> Good(1): {"ok": true}',
      'Another random line',
      '==> Bad(2): {broken',
      '==> Good2(3): {"also": "ok"}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0][1]).toEqual({ ok: true });
  });

  it('extracts from SAMPLE_LOG', () => {
    const blocks = extractJsonBlocks(SAMPLE_LOG);
    expect(blocks.length).toBeGreaterThanOrEqual(4);
  });
});

// ── extractMatches ───────────────────────────────────────────────────────────

describe('extractMatches', () => {
  it('extracts win from current Arena format', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m1', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      roomStateEvent('m1', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 1 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchId).toBe('m1');
    expect(matches[0].result).toBe('win');
    expect(matches[0].playerName).toBe('TestPlayer');
    expect(matches[0].opponentName).toBe('Opponent');
  });

  it('extracts loss when opponent wins', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m2', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      roomStateEvent('m2', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 2 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
    expect(matches[0].result).toBe('loss');
  });

  it('extracts format from eventId', () => {
    const player = { ...DEFAULT_PLAYER, eventId: 'Play_Brawl_Historic' };
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m3', 'MatchGameRoomStateType_Playing', player, DEFAULT_OPPONENT),
      roomStateEvent('m3', 'MatchGameRoomStateType_MatchCompleted', player, DEFAULT_OPPONENT, { winningTeamId: 1 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches[0].format).toBe('Play_Brawl_Historic');
  });

  it('extracts deck from connectResp', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m4', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      greEvent('m4', [{
        connectResp: {
          deckMessage: { deckCards: [111, 111, 222, 333], commanderCards: [444] },
        },
      }]),
      roomStateEvent('m4', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 1 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
    expect(matches[0].deckCards).toContainEqual({ id: '111', qty: 2 });
    expect(matches[0].deckCards).toContainEqual({ id: '222', qty: 1 });
    expect(matches[0].deckCards).toContainEqual({ id: '444', qty: 1 });
  });

  it('extracts turn count from game state messages', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m5', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      greEvent('m5', [{
        gameStateMessage: { turnInfo: { turnNumber: 7 } },
      }]),
      roomStateEvent('m5', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 2 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches[0].turns).toBe(7);
  });

  it('extracts cards played from game objects', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m6', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      greEvent('m6', [{
        gameStateMessage: {
          turnInfo: { turnNumber: 3 },
          gameObjects: [
            { ownerSeatId: 1, grpId: 111 },
            { ownerSeatId: 2, grpId: 222 },
          ],
        },
      }]),
      roomStateEvent('m6', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 1 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
    expect(matches[0].cardsPlayed).toContain('111');
    expect(matches[0].opponentCardsSeen).toContain('222');
  });

  it('detects player name from authenticateResponse', () => {
    const log = [
      `{ "transactionId": "t1", "authenticateResponse": { "screenName": "MyName" } }`,
      roomStateEvent('m7', 'MatchGameRoomStateType_Playing', { name: 'MyName', seatId: 1, teamId: 1 }, DEFAULT_OPPONENT),
      roomStateEvent('m7', 'MatchGameRoomStateType_MatchCompleted', { name: 'MyName', seatId: 1, teamId: 1 }, DEFAULT_OPPONENT, { winningTeamId: 1 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches[0].playerName).toBe('MyName');
  });

  it('returns empty array for no matches', () => {
    const log = '[UnityCrossThreadLogger]{"someOtherEvent": true}';
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toEqual([]);
  });

  it('skips matches without results', () => {
    const log = roomStateEvent('no-result', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT);
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toEqual([]);
  });

  it('deduplicates matches by matchId', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('dup', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      roomStateEvent('dup', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 1 }),
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
  });
});

// ── extractCollection ────────────────────────────────────────────────────────

describe('extractCollection', () => {
  it('extracts collection from GetPlayerCardsV3 response', () => {
    const blocks = extractJsonBlocks(SAMPLE_COLLECTION_LOG);
    const collection = extractCollection(blocks);
    expect(collection).not.toBeNull();
    expect(collection!['67890']).toBe(4);
    expect(collection!['67891']).toBe(2);
    expect(collection!['12345']).toBe(1);
  });

  it('returns null when no collection event exists', () => {
    const blocks = extractJsonBlocks(SAMPLE_LOG);
    const collection = extractCollection(blocks);
    expect(collection).toBeNull();
  });

  it('takes the last occurrence of collection data', () => {
    const log = [
      '<== PlayerInventory.GetPlayerCardsV3(1): {"100": 1}',
      '<== PlayerInventory.GetPlayerCardsV3(2): {"200": 5, "300": 3}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const collection = extractCollection(blocks);
    expect(collection).toEqual({ '200': 5, '300': 3 });
  });

  it('ignores non-numeric keys in collection data', () => {
    const log = '<== PlayerInventory.GetPlayerCardsV3(1): {"67890": 4, "notAnId": "string", "12345": 1}';
    const blocks = extractJsonBlocks(log);
    const collection = extractCollection(blocks);
    expect(collection).toEqual({ '67890': 4, '12345': 1 });
  });
});

// ── parseArenaLogFile (integration) ──────────────────────────────────────────

describe('parseArenaLogFile', () => {
  it('returns matches from current format log', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m1', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      roomStateEvent('m1', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 1 }),
      roomStateEvent('m2', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, { name: 'Opp2', seatId: 2, teamId: 2 }),
      roomStateEvent('m2', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, { name: 'Opp2', seatId: 2, teamId: 2 }, { winningTeamId: 2 }),
    ].join('\n');
    const result = parseArenaLogFile(log);
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].result).toBe('win');
    expect(result.matches[1].result).toBe('loss');
    expect(result.collection).toBeNull();
  });

  it('returns collection data when present', () => {
    const result = parseArenaLogFile(SAMPLE_COLLECTION_LOG);
    expect(result.matches).toHaveLength(0);
    expect(result.collection).not.toBeNull();
    expect(Object.keys(result.collection!).length).toBe(3);
  });

  it('returns both matches and collection from combined log', () => {
    const log = [
      `[UnityCrossThreadLogger]{"authenticateResponse":{"screenName":"TestPlayer"}}`,
      roomStateEvent('m1', 'MatchGameRoomStateType_Playing', DEFAULT_PLAYER, DEFAULT_OPPONENT),
      roomStateEvent('m1', 'MatchGameRoomStateType_MatchCompleted', DEFAULT_PLAYER, DEFAULT_OPPONENT, { winningTeamId: 1 }),
      SAMPLE_COLLECTION_LOG,
    ].join('\n');
    const result = parseArenaLogFile(log);
    expect(result.matches).toHaveLength(1);
    expect(result.collection).not.toBeNull();
  });

  it('handles empty input', () => {
    const result = parseArenaLogFile('');
    expect(result.matches).toEqual([]);
    expect(result.collection).toBeNull();
  });

  it('handles garbage input gracefully', () => {
    const result = parseArenaLogFile('random text\nmore text\n12345');
    expect(result.matches).toEqual([]);
    expect(result.collection).toBeNull();
  });
});
