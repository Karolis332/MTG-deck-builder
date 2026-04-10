import { describe, it, expect, beforeEach } from 'vitest';
import { HighlightDetector, type Highlight } from '../highlight-detector';
import type { GameStateSnapshot } from '../game-state-engine';
import type { ArenaGameEvent } from '../arena-game-events';

function makeState(overrides: Partial<GameStateSnapshot> = {}): GameStateSnapshot {
  return {
    matchId: 'test-match-1',
    gameNumber: 1,
    playerSeatId: 1,
    playerName: 'TestPlayer',
    opponentName: 'Opponent',
    format: 'Standard',
    deckList: [],
    sideboardList: [],
    commanderGrpIds: [],
    librarySize: 40,
    hand: [1, 2, 3],
    battlefield: [10, 11, 12],
    graveyard: [],
    exile: [],
    opponentBattlefield: [20, 21, 22, 23],
    opponentGraveyard: [],
    playerLife: 20,
    opponentLife: 20,
    turnNumber: 4,
    phase: 'Phase_Main1',
    step: '',
    activePlayer: 1,
    opponentCardsSeen: [],
    cardsDrawn: [],
    mulliganCount: 0,
    openingHand: [],
    isActive: true,
    isSideboarding: false,
    drawProbabilities: {},
    ...overrides,
  };
}

describe('HighlightDetector', () => {
  let detector: HighlightDetector;
  let detected: Highlight[];

  beforeEach(() => {
    detector = new HighlightDetector();
    detected = [];
    detector.onHighlight((hl) => detected.push(hl));
    detector.setCardNameResolver(() => 'Test Card');
  });

  it('detects life swing on turn boundary', () => {
    const state = makeState({ playerLife: 20, opponentLife: 20, turnNumber: 2 });

    // Start match
    detector.processEvent(
      { type: 'match_start', matchId: 'm1', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp', format: 'Standard' },
      state,
    );

    // Turn 1 starts
    detector.processEvent({ type: 'turn_change', turnNumber: 1, activePlayer: 1 }, state);

    // Simulate big life change
    const stateAfterDmg = makeState({ playerLife: 20, opponentLife: 8, turnNumber: 2 });
    detector.processEvent(
      { type: 'life_total_change', seatId: 2, lifeTotal: 8 },
      stateAfterDmg,
    );

    // Turn 2 triggers turn-end check for turn 1
    detector.processEvent({ type: 'turn_change', turnNumber: 2, activePlayer: 2 }, stateAfterDmg);

    const lifeSwings = detected.filter(h => h.type === 'life_swing');
    expect(lifeSwings.length).toBe(1);
    expect(lifeSwings[0].severity).toBeGreaterThanOrEqual(4);
    expect(lifeSwings[0].caption).toContain('12');
  });

  it('detects spell flurry (3+ spells in one turn)', () => {
    const state = makeState({ turnNumber: 4 });

    detector.processEvent(
      { type: 'match_start', matchId: 'm1', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp', format: 'Standard' },
      state,
    );

    detector.processEvent({ type: 'turn_change', turnNumber: 3, activePlayer: 1 }, state);

    // Play 4 spells
    for (let i = 0; i < 4; i++) {
      detector.processEvent(
        { type: 'card_played', instanceId: 100 + i, grpId: 500 + i, ownerSeatId: 1, fromZoneType: 'ZoneType_Hand', toZoneType: 'ZoneType_Stack' },
        state,
      );
    }

    // End turn triggers check
    detector.processEvent({ type: 'turn_change', turnNumber: 4, activePlayer: 2 }, state);

    const flurries = detected.filter(h => h.type === 'spell_flurry');
    expect(flurries.length).toBe(1);
    expect(flurries[0].caption).toContain('4 spells');
  });

  it('detects board wipe (3+ creatures removed)', () => {
    const startState = makeState({
      turnNumber: 4,
      opponentBattlefield: [20, 21, 22, 23, 24],
    });

    detector.processEvent(
      { type: 'match_start', matchId: 'm1', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp', format: 'Standard' },
      startState,
    );

    detector.processEvent({ type: 'turn_change', turnNumber: 5, activePlayer: 1 }, startState);

    // Cast wrath
    detector.processEvent(
      { type: 'card_played', instanceId: 200, grpId: 600, ownerSeatId: 1, fromZoneType: 'ZoneType_Hand', toZoneType: 'ZoneType_Stack' },
      startState,
    );

    // Board state after wipe
    const afterWipe = makeState({
      turnNumber: 6,
      opponentBattlefield: [],
      battlefield: [],
    });

    detector.processEvent({ type: 'turn_change', turnNumber: 6, activePlayer: 2 }, afterWipe);

    const wipes = detected.filter(h => h.type === 'board_wipe');
    expect(wipes.length).toBe(1);
    expect(wipes[0].severity).toBeGreaterThanOrEqual(6);
  });

  it('detects comeback from low life', () => {
    const state = makeState({ turnNumber: 10 });

    detector.processEvent(
      { type: 'match_start', matchId: 'm1', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp', format: 'Standard' },
      state,
    );

    // Drop to 2 life
    detector.processEvent(
      { type: 'life_total_change', seatId: 1, lifeTotal: 2 },
      makeState({ playerLife: 2, turnNumber: 8 }),
    );

    // Win the match
    detector.processEvent(
      { type: 'match_complete', matchId: 'm1', result: 'win', winningTeamId: 1 },
      makeState({ playerLife: 5, opponentLife: 0, turnNumber: 12 }),
    );

    const comebacks = detected.filter(h => h.type === 'comeback');
    expect(comebacks.length).toBe(1);
    expect(comebacks[0].severity).toBeGreaterThanOrEqual(9);
    expect(comebacks[0].caption).toContain('2 life');
  });

  it('detects lethal turn on match win', () => {
    const state = makeState({ turnNumber: 8 });

    detector.processEvent(
      { type: 'match_start', matchId: 'm1', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp', format: 'Standard' },
      state,
    );

    detector.processEvent({ type: 'turn_change', turnNumber: 7, activePlayer: 1 }, state);

    detector.processEvent(
      { type: 'match_complete', matchId: 'm1', result: 'win', winningTeamId: 1 },
      makeState({ playerLife: 10, opponentLife: 0, turnNumber: 8 }),
    );

    const lethals = detected.filter(h => h.type === 'lethal_turn');
    expect(lethals.length).toBe(1);
    expect(lethals[0].severity).toBe(8);
  });

  it('detects topdeck when playing a just-drawn card with near-empty hand', () => {
    const state = makeState({ hand: [999], turnNumber: 6 });

    detector.processEvent(
      { type: 'match_start', matchId: 'm1', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp', format: 'Standard' },
      state,
    );

    detector.processEvent({ type: 'turn_change', turnNumber: 5, activePlayer: 1 }, state);

    // Draw with empty hand (state.hand includes the drawn card already)
    const drawState = makeState({ hand: [777], turnNumber: 6 });
    detector.processEvent(
      { type: 'card_drawn', instanceId: 300, grpId: 777, ownerSeatId: 1 },
      drawState,
    );

    // Immediately play it
    detector.processEvent(
      { type: 'card_played', instanceId: 300, grpId: 777, ownerSeatId: 1, fromZoneType: 'ZoneType_Hand', toZoneType: 'ZoneType_Stack' },
      makeState({ hand: [], turnNumber: 6 }),
    );

    const topdecks = detected.filter(h => h.type === 'topdeck');
    expect(topdecks.length).toBe(1);
    expect(topdecks[0].severity).toBe(7);
  });

  it('does not detect highlights when match is not active', () => {
    const state = makeState({ turnNumber: 4 });

    // No match_start — just fire events
    detector.processEvent({ type: 'turn_change', turnNumber: 3, activePlayer: 1 }, state);
    detector.processEvent({ type: 'turn_change', turnNumber: 4, activePlayer: 2 }, state);

    expect(detected.length).toBe(0);
  });

  it('resets state between matches', () => {
    const state = makeState();

    // First match
    detector.processEvent(
      { type: 'match_start', matchId: 'm1', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp', format: 'Standard' },
      state,
    );
    detector.processEvent(
      { type: 'match_complete', matchId: 'm1', result: 'win', winningTeamId: 1 },
      makeState({ playerLife: 15, opponentLife: 0, turnNumber: 8 }),
    );

    const firstMatchHighlights = detected.length;

    // Second match — highlights should be fresh
    detector.processEvent(
      { type: 'match_start', matchId: 'm2', playerSeatId: 1, playerTeamId: 1, playerName: 'Me', opponentName: 'Opp2', format: 'Standard' },
      state,
    );

    expect(detector.getHighlights().length).toBe(0); // Reset on new match
  });
});
