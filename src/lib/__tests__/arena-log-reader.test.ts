import { describe, it, expect } from 'vitest';
import {
  extractJsonBlocks,
  extractMatches,
  extractCollection,
  parseArenaLogFile,
  SAMPLE_LOG,
  SAMPLE_COLLECTION_LOG,
} from '../arena-log-reader';

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
  it('extracts win and loss from sample log', () => {
    const blocks = extractJsonBlocks(SAMPLE_LOG);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(2);
    expect(matches[0].matchId).toBe('match-001-test');
    expect(matches[0].result).toBe('win');
    expect(matches[1].matchId).toBe('match-002-test');
    expect(matches[1].result).toBe('loss');
  });

  it('extracts deck submission', () => {
    const blocks = extractJsonBlocks(SAMPLE_LOG);
    const matches = extractMatches(blocks);
    // Deck was submitted before the first match
    expect(matches[0].deckCards).toBeDefined();
    expect(matches[0].deckCards).toEqual([
      { id: '67890', qty: 4 },
      { id: '67891', qty: 3 },
    ]);
  });

  it('extracts turn count', () => {
    const blocks = extractJsonBlocks(SAMPLE_LOG);
    const matches = extractMatches(blocks);
    expect(matches[0].turns).toBe(1);
    expect(matches[1].turns).toBe(5);
  });

  it('handles draw result', () => {
    const log = [
      '[UnityCrossThreadLogger]{"matchId":"draw-match","gameStateMessage":{"turnInfo":{"turnNumber":3}}}',
      '[UnityCrossThreadLogger]==> MatchComplete(99): {"matchComplete":{"result":"ResultType_Draw"}}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
    expect(matches[0].result).toBe('draw');
  });

  it('detects player name from screenName', () => {
    const log = [
      '[UnityCrossThreadLogger]{"screenName":"TestPlayer"}',
      '[UnityCrossThreadLogger]{"matchId":"m1","gameStateMessage":{"turnInfo":{"turnNumber":1}}}',
      '[UnityCrossThreadLogger]==> MatchComplete(1): {"matchComplete":{"result":"ResultType_Win"}}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches[0].playerName).toBe('TestPlayer');
  });

  it('returns empty array for no matches', () => {
    const log = '[UnityCrossThreadLogger]{"someOtherEvent": true}';
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toEqual([]);
  });

  it('skips matches without results', () => {
    const log = '[UnityCrossThreadLogger]{"matchId":"no-result","gameStateMessage":{"turnInfo":{"turnNumber":2}}}';
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toEqual([]);
  });

  it('handles DeckSubmit method variant', () => {
    const log = [
      '==> DeckSubmit(1): {"mainDeck":[{"cardId":111,"quantity":2}]}',
      '[UnityCrossThreadLogger]{"matchId":"m-ds","gameStateMessage":{"turnInfo":{"turnNumber":1}}}',
      '==> MatchComplete(2): {"matchComplete":{"result":"ResultType_Win"}}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
    expect(matches[0].deckCards).toEqual([{ id: '111', qty: 2 }]);
  });

  it('handles integer-only mainDeck entries', () => {
    const log = [
      '==> Event.DeckSubmitV3(1): {"CourseDeck":{"mainDeck":[12345, 67890]}}',
      '[UnityCrossThreadLogger]{"matchId":"m-int","gameStateMessage":{"turnInfo":{"turnNumber":1}}}',
      '==> MatchComplete(2): {"matchComplete":{"result":"ResultType_Win"}}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches[0].deckCards).toEqual([
      { id: '12345', qty: 1 },
      { id: '67890', qty: 1 },
    ]);
  });

  it('extracts cards played from game objects', () => {
    const log = [
      '[UnityCrossThreadLogger]{"matchId":"m-cards"}',
      '[UnityCrossThreadLogger]{"type":"GREMessageType_GameStateMessage","gameStateMessage":{"turnInfo":{"turnNumber":3},"gameObjects":[{"ownerSeatId":1,"grpId":111},{"ownerSeatId":2,"grpId":222}]}}',
      '==> MatchComplete(1): {"matchComplete":{"result":"ResultType_Win"}}',
    ].join('\n');
    const blocks = extractJsonBlocks(log);
    const matches = extractMatches(blocks);
    expect(matches).toHaveLength(1);
    expect(matches[0].cardsPlayed).toContain('111');
    expect(matches[0].opponentCardsSeen).toContain('222');
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
  it('returns both matches and null collection from match-only log', () => {
    const result = parseArenaLogFile(SAMPLE_LOG);
    expect(result.matches).toHaveLength(2);
    expect(result.collection).toBeNull();
  });

  it('returns collection data when present', () => {
    const result = parseArenaLogFile(SAMPLE_COLLECTION_LOG);
    expect(result.matches).toHaveLength(0);
    expect(result.collection).not.toBeNull();
    expect(Object.keys(result.collection!).length).toBe(3);
  });

  it('returns both matches and collection from combined log', () => {
    const combined = SAMPLE_LOG + '\n' + SAMPLE_COLLECTION_LOG;
    const result = parseArenaLogFile(combined);
    expect(result.matches).toHaveLength(2);
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
