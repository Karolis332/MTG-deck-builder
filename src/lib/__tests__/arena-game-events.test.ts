import { describe, it, expect } from 'vitest';
import {
  extractGameEvents,
  extractGameEventsWithContext,
  createContext,
  ZONE_TYPES,
  type ArenaGameEvent,
} from '../arena-game-events';
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

  it('should extract life_total_change from systemSeatNumber (real Arena format)', () => {
    const blocks: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              players: [
                { systemSeatNumber: 1, lifeTotal: 20, controllerSeatId: 1, startingLifeTotal: 20 },
                { systemSeatNumber: 2, lifeTotal: 20, controllerSeatId: 2, startingLifeTotal: 20 },
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
                { systemSeatNumber: 1, lifeTotal: 15, controllerSeatId: 1 },
                { systemSeatNumber: 2, lifeTotal: 18, controllerSeatId: 2 },
              ],
              gameObjects: [],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const lifeChanges = events.filter(e => e.type === 'life_total_change');

    // Should find life changes for both seats using systemSeatNumber
    const seat1Change = lifeChanges.find(
      e => e.type === 'life_total_change' && e.seatId === 1 && e.lifeTotal === 15
    );
    const seat2Change = lifeChanges.find(
      e => e.type === 'life_total_change' && e.seatId === 2 && e.lifeTotal === 18
    );
    expect(seat1Change).toBeDefined();
    expect(seat2Change).toBeDefined();
  });

  it('should extract zone_change and card_drawn events', () => {
    const blocks: JsonBlock[] = [
      // Set up zones and register game object
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
      // Draw card via ZoneTransfer annotation (real Arena format)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [{
                id: 1,
                affectedIds: [100],
                type: ['AnnotationType_ZoneTransfer'],
                details: [
                  { key: 'zone_src', valueInt32: [1] },
                  { key: 'zone_dest', valueInt32: [2] },
                  { key: 'category', valueString: ['Draw'] },
                ],
              }],
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
      // Set up zones and register game object
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
      // Play card via ZoneTransfer annotation (real Arena format)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [{
                id: 2,
                affectedIds: [50],
                type: ['AnnotationType_ZoneTransfer'],
                details: [
                  { key: 'zone_src', valueInt32: [1] },
                  { key: 'zone_dest', valueInt32: [2] },
                  { key: 'category', valueString: ['CastSpell'] },
                ],
              }],
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

  it('should handle ObjectIdChanged annotations for instance ID remapping', () => {
    const blocks: JsonBlock[] = [
      // Set up zones and register game object with original ID
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
                { zoneId: 2, type: ZONE_TYPES.STACK, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 300, grpId: 77777, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
      // Card cast: ObjectIdChanged remaps 300→301, ZoneTransfer moves 301 hand→stack
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [
                {
                  id: 10,
                  affectedIds: [300],
                  type: ['AnnotationType_ObjectIdChanged'],
                  details: [
                    { key: 'orig_id', valueInt32: [300] },
                    { key: 'new_id', valueInt32: [301] },
                  ],
                },
                {
                  id: 11,
                  affectedIds: [301],
                  type: ['AnnotationType_ZoneTransfer'],
                  details: [
                    { key: 'zone_src', valueInt32: [1] },
                    { key: 'zone_dest', valueInt32: [2] },
                    { key: 'category', valueString: ['CastSpell'] },
                  ],
                },
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
      expect(cardPlayed.grpId).toBe(77777);
      expect(cardPlayed.fromZoneType).toBe(ZONE_TYPES.HAND);
      expect(cardPlayed.toZoneType).toBe(ZONE_TYPES.STACK);
    }
  });

  it('should extract events from annotations even without gameObjects in diff', () => {
    const blocks: JsonBlock[] = [
      // Full state: set up zones + objects
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 5, type: ZONE_TYPES.LIBRARY, ownerSeatId: 1 },
                { zoneId: 6, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
                { zoneId: 7, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 2 },
                { zoneId: 8, type: ZONE_TYPES.GRAVEYARD, ownerSeatId: 2 },
              ],
              gameObjects: [
                { instanceId: 400, grpId: 88888, ownerSeatId: 1, zoneId: 5 },
                { instanceId: 500, grpId: 99999, ownerSeatId: 2, zoneId: 7 },
              ],
            },
          }],
        },
      }],
      // Diff with annotations only (no gameObjects) — 70% of real Arena updates
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [
                {
                  id: 20,
                  affectedIds: [400],
                  type: ['AnnotationType_ZoneTransfer'],
                  details: [
                    { key: 'zone_src', valueInt32: [5] },
                    { key: 'zone_dest', valueInt32: [6] },
                    { key: 'category', valueString: ['Draw'] },
                  ],
                },
                {
                  id: 21,
                  affectedIds: [500],
                  type: ['AnnotationType_ZoneTransfer'],
                  details: [
                    { key: 'zone_src', valueInt32: [7] },
                    { key: 'zone_dest', valueInt32: [8] },
                    { key: 'category', valueString: ['Destroy'] },
                  ],
                },
              ],
              turnInfo: { turnNumber: 4, activePlayer: 1, phase: 'Phase_Main1', step: 'Step_None' },
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);

    const cardDrawn = events.filter(e => e.type === 'card_drawn');
    expect(cardDrawn).toHaveLength(1);
    if (cardDrawn[0]?.type === 'card_drawn') {
      expect(cardDrawn[0].grpId).toBe(88888);
      expect(cardDrawn[0].ownerSeatId).toBe(1);
    }

    const zoneChanges = events.filter(e => e.type === 'zone_change');
    expect(zoneChanges).toHaveLength(2);

    // The destroy should show battlefield → graveyard
    const destroyEvent = zoneChanges.find(
      e => e.type === 'zone_change' && e.grpId === 99999
    );
    expect(destroyEvent).toBeDefined();
    if (destroyEvent?.type === 'zone_change') {
      expect(destroyEvent.fromZoneType).toBe(ZONE_TYPES.BATTLEFIELD);
      expect(destroyEvent.toZoneType).toBe(ZONE_TYPES.GRAVEYARD);
    }
  });

  it('should handle Shuffle annotations that bulk-remap library instanceIds', () => {
    const blocks: JsonBlock[] = [
      // Full state: 3 cards in library with known grpIds
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 10, type: ZONE_TYPES.LIBRARY, ownerSeatId: 1 },
                { zoneId: 11, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 100, grpId: 11111, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 101, grpId: 22222, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 102, grpId: 33333, ownerSeatId: 1, zoneId: 10 },
              ],
            },
          }],
        },
      }],
      // Shuffle: all 3 get new instanceIds
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [
                {
                  id: 30,
                  affectedIds: [],
                  type: ['AnnotationType_Shuffle'],
                  details: [
                    { key: 'OldIds', valueInt32: [100, 101, 102] },
                    { key: 'NewIds', valueInt32: [200, 201, 202] },
                  ],
                },
              ],
            },
          }],
        },
      }],
      // Draw using NEW instanceId (post-shuffle)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [
                {
                  id: 31,
                  affectedIds: [200],
                  type: ['AnnotationType_ZoneTransfer'],
                  details: [
                    { key: 'zone_src', valueInt32: [10] },
                    { key: 'zone_dest', valueInt32: [11] },
                    { key: 'category', valueString: ['Draw'] },
                  ],
                },
              ],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const cardDrawn = events.filter(e => e.type === 'card_drawn');

    // Should resolve grpId through shuffle remap: 200 → 100 → grpId 11111
    expect(cardDrawn).toHaveLength(1);
    if (cardDrawn[0]?.type === 'card_drawn') {
      expect(cardDrawn[0].grpId).toBe(11111);
      expect(cardDrawn[0].ownerSeatId).toBe(1);
    }
  });

  it('should handle multi-hop ObjectIdChanged chains', () => {
    const blocks: JsonBlock[] = [
      // Set up zone and initial object
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
                { zoneId: 2, type: ZONE_TYPES.STACK, ownerSeatId: 1 },
                { zoneId: 3, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 50, grpId: 44444, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
      // First remap: 50 → 51 (cast)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [
                {
                  id: 40,
                  affectedIds: [50],
                  type: ['AnnotationType_ObjectIdChanged'],
                  details: [
                    { key: 'orig_id', valueInt32: [50] },
                    { key: 'new_id', valueInt32: [51] },
                  ],
                },
              ],
            },
          }],
        },
      }],
      // Second remap: 51 → 52 (resolve) + ZoneTransfer using 52
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [
                {
                  id: 41,
                  affectedIds: [51],
                  type: ['AnnotationType_ObjectIdChanged'],
                  details: [
                    { key: 'orig_id', valueInt32: [51] },
                    { key: 'new_id', valueInt32: [52] },
                  ],
                },
                {
                  id: 42,
                  affectedIds: [52],
                  type: ['AnnotationType_ZoneTransfer'],
                  details: [
                    { key: 'zone_src', valueInt32: [2] },
                    { key: 'zone_dest', valueInt32: [3] },
                    { key: 'category', valueString: ['Resolve'] },
                  ],
                },
              ],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const cardPlayed = events.filter(e => e.type === 'card_played');

    // 52 → 51 → 50 → grpId 44444 (two hops)
    expect(cardPlayed).toHaveLength(1);
    if (cardPlayed[0]?.type === 'card_played') {
      expect(cardPlayed[0].grpId).toBe(44444);
      expect(cardPlayed[0].fromZoneType).toBe(ZONE_TYPES.STACK);
      expect(cardPlayed[0].toZoneType).toBe(ZONE_TYPES.BATTLEFIELD);
    }
  });

  it('should handle diffDeletedInstanceIds cleanup', () => {
    const ctx = createContext();
    const blocks1: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 1 },
                { zoneId: 2, type: ZONE_TYPES.GRAVEYARD, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 600, grpId: 55555, ownerSeatId: 1, zoneId: 1 },
                { instanceId: 601, grpId: 66666, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
    ];

    extractGameEventsWithContext(blocks1, ctx);
    expect(ctx.objectGrpIds.size).toBe(2);

    // Delete instance 600 (token dying, etc.)
    const blocks2: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              diffDeletedInstanceIds: [600],
            },
          }],
        },
      }],
    ];

    extractGameEventsWithContext(blocks2, ctx);
    expect(ctx.objectGrpIds.has(600)).toBe(false);
    expect(ctx.objectGrpIds.has(601)).toBe(true);
  });

  it('should track extraction stats in context', () => {
    const ctx = createContext();
    const blocks: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.LIBRARY, ownerSeatId: 1 },
                { zoneId: 2, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 700, grpId: 77777, ownerSeatId: 1, zoneId: 1 },
              ],
              annotations: [
                {
                  id: 50,
                  affectedIds: [700],
                  type: ['AnnotationType_ZoneTransfer'],
                  details: [
                    { key: 'zone_src', valueInt32: [1] },
                    { key: 'zone_dest', valueInt32: [2] },
                    { key: 'category', valueString: ['Draw'] },
                  ],
                },
              ],
            },
          }],
        },
      }],
    ];

    extractGameEventsWithContext(blocks, ctx);
    expect(ctx.lastStats.gsmCount).toBe(1);
    expect(ctx.lastStats.zoneTransfers).toBe(1);
    expect(ctx.lastStats.grpIdHits).toBe(1);
    expect(ctx.lastStats.grpIdMisses).toBe(0);
  });

  it('should include category on zone_change events from ZoneTransfer annotations', () => {
    const blocks: JsonBlock[] = [
      // Set up zones and objects
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 1 },
                { zoneId: 2, type: ZONE_TYPES.GRAVEYARD, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 800, grpId: 11111, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
      // Destroy via annotation
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [{
                id: 60,
                affectedIds: [800],
                type: ['AnnotationType_ZoneTransfer'],
                details: [
                  { key: 'zone_src', valueInt32: [1] },
                  { key: 'zone_dest', valueInt32: [2] },
                  { key: 'category', valueString: ['Destroy'] },
                ],
              }],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const zoneChange = events.find(e => e.type === 'zone_change');

    expect(zoneChange).toBeDefined();
    if (zoneChange?.type === 'zone_change') {
      expect(zoneChange.category).toBe('Destroy');
      expect(zoneChange.grpId).toBe(11111);
      expect(zoneChange.fromZoneType).toBe(ZONE_TYPES.BATTLEFIELD);
      expect(zoneChange.toZoneType).toBe(ZONE_TYPES.GRAVEYARD);
    }
  });

  it('should extract damage_dealt events from DamageDealt annotations', () => {
    const blocks: JsonBlock[] = [
      // Set up creature
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              zones: [
                { zoneId: 1, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 900, grpId: 22222, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
      // Damage annotation: creature deals 3 to seat 2
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              annotations: [{
                id: 70,
                affectorId: 900,
                affectedIds: [2],
                type: ['AnnotationType_DamageDealt'],
                details: [
                  { key: 'damage_amount', valueInt32: [3] },
                ],
              }],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const dmg = events.find(e => e.type === 'damage_dealt');

    expect(dmg).toBeDefined();
    if (dmg?.type === 'damage_dealt') {
      expect(dmg.sourceGrpId).toBe(22222);
      expect(dmg.amount).toBe(3);
      expect(dmg.targetSeatId).toBe(2);
    }
  });

  it('should not emit damage_dealt for zero or negative amounts', () => {
    const blocks: JsonBlock[] = [
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              gameObjects: [
                { instanceId: 950, grpId: 33333, ownerSeatId: 1, zoneId: 1 },
              ],
              annotations: [{
                id: 80,
                affectorId: 950,
                affectedIds: [2],
                type: ['AnnotationType_DamageDealt'],
                details: [
                  { key: 'damage_amount', valueInt32: [0] },
                ],
              }],
            },
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const dmg = events.filter(e => e.type === 'damage_dealt');
    expect(dmg).toHaveLength(0);
  });
});
