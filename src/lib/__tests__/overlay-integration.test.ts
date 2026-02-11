/**
 * End-to-end integration test: JSON blocks → game events → game state snapshot.
 *
 * Simulates a realistic Arena match flow through the full overlay pipeline.
 */

import { describe, it, expect } from 'vitest';
import { extractGameEvents, ZONE_TYPES } from '../arena-game-events';
import { GameStateEngine } from '../game-state-engine';
import type { JsonBlock } from '../arena-log-reader';

describe('Overlay Integration: blocks → events → state', () => {
  it('should process a full match flow from start to finish', () => {
    const blocks: JsonBlock[] = [
      // 1. Match starts
      ['standalone', {
        matchGameRoomStateChangedEvent: {
          gameRoomInfo: {
            stateType: 'MatchGameRoomStateType_Playing',
            gameRoomConfig: {
              matchId: 'integration-test-001',
              reservedPlayers: [
                { playerName: 'Hero', systemSeatId: 1, teamId: 1, eventId: 'Standard_Ranked' },
                { playerName: 'Villain', systemSeatId: 2, teamId: 2 },
              ],
            },
          },
        },
      }],
      // 2. Deck submission via connectResp
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            connectResp: {
              deckMessage: {
                deckCards: [
                  // 4x Lightning Bolt (grpId 1001)
                  1001, 1001, 1001, 1001,
                  // 3x Goblin Guide (grpId 1002)
                  1002, 1002, 1002,
                  // 2x Monastery Swiftspear (grpId 1003)
                  1003, 1003,
                ],
                commanderCards: [],
              },
            },
          }],
        },
      }],
      // 3. Opening hand (mulligan prompt)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            type: 'GREMessageType_MulliganReq',
            mulliganReq: {
              systemSeatId: 1,
              mulliganCount: 0,
            },
            gameStateMessage: {
              turnInfo: { turnNumber: 1, activePlayer: 1, phase: 'Phase_Beginning', step: 'Step_Upkeep' },
              zones: [
                { zoneId: 10, type: ZONE_TYPES.HAND, ownerSeatId: 1, objectInstanceIds: [101, 102, 103, 104, 105, 106, 107] },
                { zoneId: 20, type: ZONE_TYPES.LIBRARY, ownerSeatId: 1 },
                { zoneId: 30, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 1 },
                { zoneId: 40, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 2 },
                { zoneId: 50, type: ZONE_TYPES.GRAVEYARD, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 101, grpId: 1001, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 102, grpId: 1001, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 103, grpId: 1002, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 104, grpId: 1002, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 105, grpId: 1003, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 106, grpId: 5001, ownerSeatId: 1, zoneId: 10 }, // land
                { instanceId: 107, grpId: 5002, ownerSeatId: 1, zoneId: 10 }, // land
              ],
            },
          }],
        },
      }],
      // 4. Turn 1: Play land, play creature (zone changes)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: { turnNumber: 1, activePlayer: 1, phase: 'Phase_Main1', step: 'Step_None' },
              zones: [
                { zoneId: 10, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
                { zoneId: 30, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: 1 },
              ],
              gameObjects: [
                // Land played to battlefield
                { instanceId: 106, grpId: 5001, ownerSeatId: 1, zoneId: 30 },
                // Creature played to battlefield
                { instanceId: 103, grpId: 1002, ownerSeatId: 1, zoneId: 30 },
                // Remaining hand
                { instanceId: 101, grpId: 1001, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 102, grpId: 1001, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 104, grpId: 1002, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 105, grpId: 1003, ownerSeatId: 1, zoneId: 10 },
                { instanceId: 107, grpId: 5002, ownerSeatId: 1, zoneId: 10 },
              ],
              players: [
                { systemSeatId: 1, lifeTotal: 20 },
                { systemSeatId: 2, lifeTotal: 20 },
              ],
            },
          }],
        },
      }],
      // 5. Opponent plays a card on their turn
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: { turnNumber: 2, activePlayer: 2, phase: 'Phase_Main1', step: 'Step_None' },
              gameObjects: [
                // Opponent plays a creature
                { instanceId: 201, grpId: 9001, ownerSeatId: 2, zoneId: 40 },
              ],
              players: [
                { systemSeatId: 1, lifeTotal: 20 },
                { systemSeatId: 2, lifeTotal: 17 },
              ],
            },
          }],
        },
      }],
      // 6. Turn 3: Card in library (pre-draw state)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: { turnNumber: 3, activePlayer: 1, phase: 'Phase_Beginning', step: 'Step_Upkeep' },
              zones: [
                { zoneId: 10, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
                { zoneId: 20, type: ZONE_TYPES.LIBRARY, ownerSeatId: 1 },
              ],
              gameObjects: [
                // Card in library before draw
                { instanceId: 108, grpId: 1001, ownerSeatId: 1, zoneId: 20 },
              ],
            },
          }],
        },
      }],
      // 6b. Card moves from library → hand (draw)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: { turnNumber: 3, activePlayer: 1, phase: 'Phase_Beginning', step: 'Step_Draw' },
              gameObjects: [
                { instanceId: 108, grpId: 1001, ownerSeatId: 1, zoneId: 10 },
              ],
            },
          }],
        },
      }],
      // 7. Life total changes (combat damage)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              players: [
                { systemSeatId: 1, lifeTotal: 18 },
                { systemSeatId: 2, lifeTotal: 14 },
              ],
              gameObjects: [],
            },
          }],
        },
      }],
    ];

    // ── Extract events ──
    const events = extractGameEvents(blocks);

    // Verify key events were extracted
    const matchStart = events.find(e => e.type === 'match_start');
    expect(matchStart).toBeDefined();

    const deckSub = events.find(e => e.type === 'deck_submission');
    expect(deckSub).toBeDefined();

    const mulligan = events.find(e => e.type === 'mulligan_prompt');
    expect(mulligan).toBeDefined();
    if (mulligan?.type === 'mulligan_prompt') {
      expect(mulligan.mulliganCount).toBe(0);
      expect(mulligan.handGrpIds).toHaveLength(7);
    }

    const turnChanges = events.filter(e => e.type === 'turn_change');
    expect(turnChanges.length).toBeGreaterThanOrEqual(2);

    const lifeChanges = events.filter(e => e.type === 'life_total_change');
    expect(lifeChanges.length).toBeGreaterThanOrEqual(1);

    // ── Feed events into GameStateEngine ──
    const engine = new GameStateEngine();
    engine.processEvents(events);

    const state = engine.getState();

    // Match info
    expect(state.matchId).toBe('integration-test-001');
    expect(state.isActive).toBe(true);
    expect(state.playerName).toBe('Hero');
    expect(state.opponentName).toBe('Villain');
    expect(state.format).toBe('Standard_Ranked');

    // Deck was submitted with 9 cards total (4+3+2)
    expect(state.deckList).toHaveLength(3);
    const boltEntry = state.deckList.find(e => e.grpId === 1001);
    expect(boltEntry).toBeDefined();
    expect(boltEntry!.qty).toBe(4);

    // Life totals reflect latest values
    expect(state.playerLife).toBe(18);
    expect(state.opponentLife).toBe(14);

    // Turn tracking
    expect(state.turnNumber).toBe(3);

    // Cards drawn should include the draw on turn 3
    expect(state.cardsDrawn.length).toBeGreaterThanOrEqual(1);

    // Draw probabilities should be computed
    const probs = engine.getDrawProbabilities();
    expect(probs.size).toBeGreaterThan(0);
  });

  it('should handle Bo3 with intermission and deck reset', () => {
    const blocks: JsonBlock[] = [
      // Match start
      ['standalone', {
        matchGameRoomStateChangedEvent: {
          gameRoomInfo: {
            stateType: 'MatchGameRoomStateType_Playing',
            gameRoomConfig: {
              matchId: 'bo3-test-001',
              reservedPlayers: [
                { playerName: 'Player1', systemSeatId: 1, teamId: 1, eventId: 'Traditional_Standard' },
                { playerName: 'Player2', systemSeatId: 2, teamId: 2 },
              ],
            },
          },
        },
      }],
      // Deck submission
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            connectResp: {
              deckMessage: {
                deckCards: [1001, 1001, 1001, 1001, 2001, 2001],
                commanderCards: [],
              },
            },
          }],
        },
      }],
      // Draw some cards in game 1
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              turnInfo: { turnNumber: 1, activePlayer: 1, phase: 'Phase_Main1', step: 'Step_None' },
              zones: [
                { zoneId: 1, type: ZONE_TYPES.LIBRARY, ownerSeatId: 1 },
                { zoneId: 2, type: ZONE_TYPES.HAND, ownerSeatId: 1 },
              ],
              gameObjects: [
                { instanceId: 1, grpId: 1001, ownerSeatId: 1, zoneId: 1 },
              ],
            },
          }],
        },
      }],
      // Card drawn
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            gameStateMessage: {
              gameObjects: [
                // Card moved from library to hand
                { instanceId: 1, grpId: 1001, ownerSeatId: 1, zoneId: 2 },
              ],
            },
          }],
        },
      }],
      // Intermission (game 1 → game 2)
      ['standalone', {
        greToClientEvent: {
          greToClientMessages: [{
            type: 'GREMessageType_IntermissionReq',
          }],
        },
      }],
    ];

    const events = extractGameEvents(blocks);
    const engine = new GameStateEngine();
    engine.processEvents(events);

    const state = engine.getState();

    // Should be in sideboarding state
    expect(state.isSideboarding).toBe(true);
    expect(state.gameNumber).toBe(2);

    // Zones should be cleared
    expect(state.hand).toEqual([]);
    expect(state.battlefield).toEqual([]);
    expect(state.cardsDrawn).toEqual([]);

    // Deck remaining should be reset to full
    for (const entry of state.deckList) {
      expect(entry.remaining).toBe(entry.qty);
    }
  });

  it('should handle match completion and mark inactive', () => {
    const blocks: JsonBlock[] = [
      // Match start
      ['standalone', {
        matchGameRoomStateChangedEvent: {
          gameRoomInfo: {
            stateType: 'MatchGameRoomStateType_Playing',
            gameRoomConfig: {
              matchId: 'complete-test-001',
              reservedPlayers: [
                { playerName: 'Winner', systemSeatId: 1, teamId: 1 },
                { playerName: 'Loser', systemSeatId: 2, teamId: 2 },
              ],
            },
          },
        },
      }],
      // Match complete — player wins
      ['standalone', {
        matchGameRoomStateChangedEvent: {
          gameRoomInfo: {
            stateType: 'MatchGameRoomStateType_MatchCompleted',
            gameRoomConfig: { matchId: 'complete-test-001' },
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
    const engine = new GameStateEngine();
    engine.processEvents(events);

    const state = engine.getState();
    expect(state.isActive).toBe(false);
    expect(state.isSideboarding).toBe(false);
  });

  it('should resolve card names and attach to deck entries', () => {
    const engine = new GameStateEngine();

    engine.processEvent({
      type: 'match_start',
      matchId: 'resolve-test',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: 'Test',
      opponentName: 'Opp',
      format: 'Standard',
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [
        { grpId: 1001, qty: 4 },
        { grpId: 2001, qty: 3 },
      ],
      commanderGrpIds: [],
      sideboardCards: [{ grpId: 3001, qty: 2 }],
    });

    // Simulate card resolution (what GrpIdResolver would provide)
    engine.resolveCard(1001, {
      grpId: 1001,
      name: 'Lightning Bolt',
      manaCost: '{R}',
      cmc: 1,
      typeLine: 'Instant',
      oracleText: 'Lightning Bolt deals 3 damage to any target.',
      imageUriSmall: 'https://example.com/bolt-sm.jpg',
      imageUriNormal: 'https://example.com/bolt.jpg',
    });

    engine.resolveCard(3001, {
      grpId: 3001,
      name: 'Searing Blood',
      manaCost: '{R}{R}',
      cmc: 2,
      typeLine: 'Instant',
      oracleText: null,
      imageUriSmall: null,
      imageUriNormal: null,
    });

    const state = engine.getState();

    // Main deck card resolved
    const bolt = state.deckList.find(e => e.grpId === 1001);
    expect(bolt?.card).not.toBeNull();
    expect(bolt?.card?.name).toBe('Lightning Bolt');

    // Unresolved card should have null
    const unresolved = state.deckList.find(e => e.grpId === 2001);
    expect(unresolved?.card).toBeNull();

    // Sideboard card resolved
    const sb = state.sideboardList.find(e => e.grpId === 3001);
    expect(sb?.card?.name).toBe('Searing Blood');

    // Draw probabilities should work with resolved cards
    const probs = engine.getDrawProbabilities();
    expect(probs.get(1001)).toBeCloseTo(4 / 7); // 4 out of 7 total cards
    expect(probs.get(2001)).toBeCloseTo(3 / 7);
  });
});
