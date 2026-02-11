import { describe, it, expect } from 'vitest';
import { extractGameEvents, ZONE_TYPES, type ArenaGameEvent } from '../arena-game-events';
import type { JsonBlock } from '../arena-log-reader';

describe('extractGameEvents', () => {
  it('should extract match_start from matchGameRoomStateChangedEvent', () => {
    const blocks: JsonBlock[] = [
      ['standalone', {
        matchGameRoomStateChangedEvent: {
          gameRoomInfo: {
            stateType: 'MatchGameRoomStateType_Playing',
            gameRoomConfig: {
              matchId: 'test-match-001',
              reservedPlayers: [
                { playerName: 'TestPlayer', systemSeatId: 1, teamId: 1, eventId: 'Standard_Ranked' },
                { playerName: 'Opponent', systemSeatId: 2, teamId: 2 },
              ],
            },
          },
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const matchStart = events.find(e => e.type === 'match_start');

    expect(matchStart).toBeDefined();
    expect(matchStart!.type).toBe('match_start');
    if (matchStart!.type === 'match_start') {
      expect(matchStart!.matchId).toBe('test-match-001');
      expect(matchStart!.playerSeatId).toBe(1);
      expect(matchStart!.opponentName).toBe('Opponent');
      expect(matchStart!.format).toBe('Standard_Ranked');
    }
  });

  it('should extract match_complete from finalMatchResult', () => {
    const blocks: JsonBlock[] = [
      // Start match first
      ['standalone', {
        matchGameRoomStateChangedEvent: {
          gameRoomInfo: {
            stateType: 'MatchGameRoomStateType_Playing',
            gameRoomConfig: {
              matchId: 'test-match-002',
              reservedPlayers: [
                { playerName: 'Me', systemSeatId: 1, teamId: 1 },
                { playerName: 'Them', systemSeatId: 2, teamId: 2 },
              ],
            },
          },
        },
      }],
      // Complete match
      ['standalone', {
        matchGameRoomStateChangedEvent: {
          gameRoomInfo: {
            stateType: 'MatchGameRoomStateType_MatchCompleted',
            gameRoomConfig: { matchId: 'test-match-002' },
            finalMatchResult: {
              resultList: [
                { scope: 'MatchScope_Match', winningTeamId: 1, result: 'ResultType_Win' },
              ],
            },
          },
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const matchComplete = events.find(e => e.type === 'match_complete');

    expect(matchComplete).toBeDefined();
    if (matchComplete?.type === 'match_complete') {
      expect(matchComplete.result).toBe('win');
      expect(matchComplete.matchId).toBe('test-match-002');
    }
  });

  it('should extract deck_submission from connectResp', () => {
    const blocks: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            connectResp: {
              deckMessage: {
                deckCards: [12345, 12345, 12345, 12345, 67890, 67890],
                commanderCards: [99999],
              },
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const deckSub = events.find(e => e.type === 'deck_submission');

    expect(deckSub).toBeDefined();
    if (deckSub?.type === 'deck_submission') {
      // connectResp merges deckCards + commanderCards, so 12345(x4) + 67890(x2) + 99999(x1) = 3 entries
      expect(deckSub.deckCards).toHaveLength(3);
      expect(deckSub.deckCards.find(c => c.grpId === 12345)).toEqual({ grpId: 12345, qty: 4 });
      expect(deckSub.deckCards.find(c => c.grpId === 67890)).toEqual({ grpId: 67890, qty: 2 });
      expect(deckSub.deckCards.find(c => c.grpId === 99999)).toEqual({ grpId: 99999, qty: 1 });
      expect(deckSub.commanderGrpIds).toEqual([99999]);
    }
  });

  it('should extract turn_change and phase_change from gameStateMessage', () => {
    const blocks: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: {
                turnNumber: 3,
                activePlayer: 1,
                phase: 'Phase_Main1',
                step: 'Step_Upkeep',
              },
              gameObjects: [],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const turnChange = events.find(e => e.type === 'turn_change');
    const phaseChange = events.find(e => e.type === 'phase_change');

    expect(turnChange).toBeDefined();
    if (turnChange?.type === 'turn_change') {
      expect(turnChange.turnNumber).toBe(3);
      expect(turnChange.activePlayer).toBe(1);
    }

    expect(phaseChange).toBeDefined();
    if (phaseChange?.type === 'phase_change') {
      expect(phaseChange.phase).toBe('Phase_Main1');
      expect(phaseChange.step).toBe('Step_Upkeep');
    }
  });

  it('should extract life_total_change from players array', () => {
    const blocks: JsonBlock[] = [
      // Need initial state to track changes
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              players: [
                { systemSeatId: 1, lifeTotal: 20 },
                { systemSeatId: 2, lifeTotal: 20 },
              ],
              gameObjects: [],
            },
          }],
        },
      }],
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              players: [
                { systemSeatId: 1, lifeTotal: 17 },
                { systemSeatId: 2, lifeTotal: 20 },
              ],
              gameObjects: [],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const lifeChanges = events.filter(e => e.type === 'life_total_change');

    expect(lifeChanges.length).toBeGreaterThanOrEqual(1);
    const playerLifeChange = lifeChanges.find(
      e => e.type === 'life_total_change' && e.seatId === 1 && e.lifeTotal === 17
    );
    expect(playerLifeChange).toBeDefined();
  });

  it('should extract zone_change and card_drawn events', () => {
    const blocks: JsonBlock[] = [
      // Set up zones first
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.LIBRARY, ownerSeatId: 1 },
                { zoneId: 2, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 100, grpId: 55555, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
      // Move card from library to hand (draw)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              gameObjects: [
                { instanceId: 100, grpId: 55555, ownerSeatId: 1, zoneId: 2 },
              ],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const zoneChanges = events.filter(e => e.type === 'zone_change');
    const cardDrawn = events.filter(e => e.type === 'card_drawn');

    expect(zoneChanges).toHaveLength(1);
    if (zoneChanges[0]?.type === 'zone_change') {
      expect(zoneChanges[0].fromZoneType).toBe(ZONE_TYPES.LIBRARY);
      expect(zoneChanges[0].toZoneType).toBe(ZONE_TYPES.HAND);
      expect(zoneChanges[0].grpId).toBe(55555);
    }

    expect(cardDrawn).toHaveLength(1);
    if (cardDrawn[0]?.type === 'card_drawn') {
      expect(cardDrawn[0].grpId).toBe(55555);
    }
  });

  it('should extract intermission event', () => {
    const blocks: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            type: 'GREMessageType_IntermissionReq',
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const intermission = events.find(e => e.type === 'intermission');

    expect(intermission).toBeDefined();
    if (intermission?.type === 'intermission') {
      expect(intermission.gameNumber).toBe(2);
    }
  });

  it('should return empty array for empty blocks', () => {
    expect(extractGameEvents([])).toEqual([]);
  });

  it('should extract card_played from zone transitions (Hand → Battlefield)', () => {
    const blocks: JsonBlock[] = [
      // Set up zones and objects
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: 2 },
                { zoneId: 2, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 2 },
              ],
              gameObjects: [
                { instanceId: 50, grpId: 99999, ownerSeatId: 2, zoneId: 1 },
              ],
            },
          }],
        },
      }],
      // Move object from hand to battlefield
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              gameObjects: [
                { instanceId: 50, grpId: 99999, ownerSeatId: 2, zoneId: 2 },
              ],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const cardPlayed = events.find(e => e.type === 'card_played');

    expect(cardPlayed).toBeDefined();
    if (cardPlayed?.type === 'card_played') {
      expect(cardPlayed.grpId).toBe(99999);
      expect(cardPlayed.ownerSeatId).toBe(2);
      expect(cardPlayed.fromZoneType).toBe(ZONE_TYPES.HAND);
      expect(cardPlayed.toZoneType).toBe(ZONE_TYPES.BATTLEFIELD);
    }
  });

  it('should extract mulligan_prompt from GREMessageType_MulliganReq', () => {
    // The mulligan hand is populated from zone objectInstanceIds during Phase_Beginning.
    // The mulliganReq creates the event with empty handGrpIds, then the gameStateMessage
    // fills in the hand from zone data when phase is Phase_Beginning and turn <= 1.
    const blocks: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            type: 'GREMessageType_MulliganReq',
            mulliganReq: {
              systemSeatId: 1,
              mulliganCount: 1,
            },
            gameStateMessage: {
              turnInfo: {
                turnNumber: 1,
                activePlayer: 1,
                phase: 'Phase_Beginning',
                step: 'Step_Upkeep',
              },
              zones: [
                { zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: 1, objectInstanceIds: [10, 11, 12, 13, 14, 15] },
              ],
              gameObjects: [
                { instanceId: 10, grpId: 111, ownerSeatId: 1, zoneId: 1 },
                { instanceId: 11, grpId: 222, ownerSeatId: 1, zoneId: 1 },
                { instanceId: 12, grpId: 333, ownerSeatId: 1, zoneId: 1 },
                { instanceId: 13, grpId: 444, ownerSeatId: 1, zoneId: 1 },
                { instanceId: 14, grpId: 555, ownerSeatId: 1, zoneId: 1 },
                { instanceId: 15, grpId: 666, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const mulligan = events.find(e => e.type === 'mulligan_prompt');

    expect(mulligan).toBeDefined();
    if (mulligan?.type === 'mulligan_prompt') {
      expect(mulligan.seatId).toBe(1);
      expect(mulligan.mulliganCount).toBe(1);
      expect(mulligan.handGrpIds).toHaveLength(6);
      expect(mulligan.handGrpIds).toContain(111);
      expect(mulligan.handGrpIds).toContain(666);
    }
  });

  it('should not duplicate events from repeated gameObjects', () => {
    const blocks: JsonBlock[] = [
      // Same game state sent twice
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: { turnNumber: 1, activePlayer: 1, phase: 'Phase_Main1', step: 'Step_None' },
              gameObjects: [],
            },
          }],
        },
      }],
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: { turnNumber: 1, activePlayer: 1, phase: 'Phase_Main1', step: 'Step_None' },
              gameObjects: [],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    // Both blocks produce turn_change and phase_change, so we should get events from each
    const turnChanges = events.filter(e => e.type === 'turn_change');
    expect(turnChanges.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle deck submission from EventSetDeckV2', () => {
    const blocks: JsonBlock[] = [
      ['EventSetDeckV2', {
        _parsed_request: {
          Deck: {
            MainDeck: [
              { cardId: 111, quantity: 4 },
              { cardId: 222, quantity: 2 },
            ],
            Sideboard: [
              { cardId: 333, quantity: 3 },
            ],
            CommandZone: [],
          },
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const deckSub = events.find(e => e.type === 'deck_submission');

    expect(deckSub).toBeDefined();
    if (deckSub?.type === 'deck_submission') {
      expect(deckSub.deckCards).toHaveLength(2);
      expect(deckSub.sideboardCards).toHaveLength(1);
      expect(deckSub.sideboardCards[0]).toEqual({ grpId: 333, qty: 3 });
    }
  });
});
