import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateEngine } from '../game-state-engine';
import type { ArenaGameEvent } from '../arena-game-events';

describe('GameStateEngine', () => {
  let engine: GameStateEngine;

  beforeEach(() => {
    engine = new GameStateEngine();
  });

  it('should start with empty state', () => {
    const state = engine.getState();
    expect(state.matchId).toBeNull();
    expect(state.isActive).toBe(false);
    expect(state.playerLife).toBe(20);
    expect(state.opponentLife).toBe(20);
    expect(state.turnNumber).toBe(0);
    expect(state.deckList).toEqual([]);
  });

  it('should handle match_start event', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: 'TestPlayer',
      opponentName: 'Opponent',
      format: 'Standard_Ranked',
    });

    const state = engine.getState();
    expect(state.matchId).toBe('test-123');
    expect(state.isActive).toBe(true);
    expect(state.playerName).toBe('TestPlayer');
    expect(state.opponentName).toBe('Opponent');
    expect(state.format).toBe('Standard_Ranked');
    expect(state.playerLife).toBe(20);
  });

  it('should set 40 life for commander format', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'cmd-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: 'Me',
      opponentName: 'Them',
      format: 'Commander_Casual',
    });

    const state = engine.getState();
    expect(state.playerLife).toBe(40);
    expect(state.opponentLife).toBe(40);
  });

  it('should handle deck_submission event', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [
        { grpId: 111, qty: 4 },
        { grpId: 222, qty: 2 },
      ],
      commanderGrpIds: [],
      sideboardCards: [{ grpId: 333, qty: 3 }],
    });

    const state = engine.getState();
    expect(state.deckList).toHaveLength(2);
    expect(state.deckList[0].grpId).toBe(111);
    expect(state.deckList[0].qty).toBe(4);
    expect(state.deckList[0].remaining).toBe(4);
    expect(state.sideboardList).toHaveLength(1);
    expect(state.librarySize).toBe(6); // 4 + 2
  });

  it('should handle card_drawn and update remaining', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [{ grpId: 111, qty: 4 }],
      commanderGrpIds: [],
      sideboardCards: [],
    });

    engine.processEvent({
      type: 'card_drawn',
      instanceId: 1,
      grpId: 111,
      ownerSeatId: 1,
    });

    const state = engine.getState();
    expect(state.deckList[0].remaining).toBe(3);
    expect(state.librarySize).toBe(3);
    expect(state.cardsDrawn).toEqual([111]);
  });

  it('should handle life_total_change events', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'life_total_change',
      seatId: 1,
      lifeTotal: 17,
    });

    engine.processEvent({
      type: 'life_total_change',
      seatId: 2,
      lifeTotal: 14,
    });

    const state = engine.getState();
    expect(state.playerLife).toBe(17);
    expect(state.opponentLife).toBe(14);
  });

  it('should handle turn_change events', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'turn_change',
      turnNumber: 5,
      activePlayer: 2,
    });

    const state = engine.getState();
    expect(state.turnNumber).toBe(5);
    expect(state.activePlayer).toBe(2);
  });

  it('should compute draw probabilities', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [
        { grpId: 111, qty: 4 },
        { grpId: 222, qty: 6 },
      ],
      commanderGrpIds: [],
      sideboardCards: [],
    });

    const probs = engine.getDrawProbabilities();
    expect(probs[111]).toBeCloseTo(4 / 10);
    expect(probs[222]).toBeCloseTo(6 / 10);
  });

  it('should handle intermission (sideboarding)', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [{ grpId: 111, qty: 4 }],
      commanderGrpIds: [],
      sideboardCards: [],
    });

    // Draw some cards
    engine.processEvent({ type: 'card_drawn', instanceId: 1, grpId: 111, ownerSeatId: 1 });

    // Intermission
    engine.processEvent({ type: 'intermission', gameNumber: 2 });

    const state = engine.getState();
    expect(state.gameNumber).toBe(2);
    expect(state.isSideboarding).toBe(true);
    expect(state.cardsDrawn).toEqual([]);
    expect(state.hand).toEqual([]);
    // Deck remaining should be reset
    expect(state.deckList[0].remaining).toBe(4);
  });

  it('should handle match_complete', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'match_complete',
      matchId: 'test-123',
      result: 'win',
      winningTeamId: 1,
    });

    const state = engine.getState();
    expect(state.isActive).toBe(false);
  });

  it('should notify state change listeners', () => {
    const states: unknown[] = [];
    engine.onStateChange((state) => states.push(state));

    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    expect(states).toHaveLength(1);
  });

  it('should allow unsubscribing from state changes', () => {
    const states: unknown[] = [];
    const unsub = engine.onStateChange((state) => states.push(state));

    engine.processEvent({
      type: 'turn_change',
      turnNumber: 1,
      activePlayer: 1,
    });
    expect(states).toHaveLength(1);

    unsub();

    engine.processEvent({
      type: 'turn_change',
      turnNumber: 2,
      activePlayer: 2,
    });
    expect(states).toHaveLength(1);
  });

  it('should track mulligan count', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'mulligan_prompt',
      seatId: 1,
      mulliganCount: 1,
      handGrpIds: [111, 222, 333, 444, 555, 666],
    });

    const state = engine.getState();
    expect(state.mulliganCount).toBe(1);
    expect(state.openingHand).toEqual([111, 222, 333, 444, 555, 666]);
  });

  it('should reset state properly', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: 'Me',
      opponentName: null,
      format: null,
    });

    engine.reset();

    const state = engine.getState();
    expect(state.matchId).toBeNull();
    expect(state.isActive).toBe(false);
    expect(state.playerName).toBeNull();
  });

  // ── New tests: resolveCard, phase_change, zone rebuild, multi-event ──

  it('should resolveCard and attach card info to deck list', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-resolve',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [{ grpId: 111, qty: 4 }],
      commanderGrpIds: [],
      sideboardCards: [{ grpId: 222, qty: 2 }],
    });

    engine.resolveCard(111, {
      grpId: 111,
      name: 'Lightning Bolt',
      manaCost: '{R}',
      cmc: 1,
      typeLine: 'Instant',
      oracleText: 'Deals 3 damage.',
      imageUriSmall: null,
      imageUriNormal: null,
    });

    engine.resolveCard(222, {
      grpId: 222,
      name: 'Searing Blood',
      manaCost: '{R}{R}',
      cmc: 2,
      typeLine: 'Instant',
      oracleText: null,
      imageUriSmall: null,
      imageUriNormal: null,
    });

    const state = engine.getState();
    expect(state.deckList[0].card).not.toBeNull();
    expect(state.deckList[0].card!.name).toBe('Lightning Bolt');
    expect(state.sideboardList[0].card).not.toBeNull();
    expect(state.sideboardList[0].card!.name).toBe('Searing Blood');
  });

  it('should not overwrite already-resolved card in deck list', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-no-overwrite',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [{ grpId: 111, qty: 4 }],
      commanderGrpIds: [],
      sideboardCards: [],
    });

    const card1 = {
      grpId: 111, name: 'Original', manaCost: '{R}', cmc: 1,
      typeLine: 'Instant', oracleText: null, imageUriSmall: null, imageUriNormal: null,
    };
    const card2 = {
      grpId: 111, name: 'Overwrite Attempt', manaCost: '{R}', cmc: 1,
      typeLine: 'Instant', oracleText: null, imageUriSmall: null, imageUriNormal: null,
    };

    engine.resolveCard(111, card1);
    engine.resolveCard(111, card2);

    const state = engine.getState();
    expect(state.deckList[0].card!.name).toBe('Original');
  });

  it('should handle phase_change event', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-phase',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'phase_change',
      phase: 'Phase_Combat',
      step: 'Step_DeclareAttack',
      turnNumber: 3,
    });

    const state = engine.getState();
    expect(state.phase).toBe('Phase_Combat');
    expect(state.step).toBe('Step_DeclareAttack');
    expect(state.turnNumber).toBe(3);
  });

  it('should rebuild zone contents from game_state_update', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-zones',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    // game_state_update with zones and objects
    engine.processEvent({
      type: 'game_state_update',
      zones: [
        { zoneId: 10, type: 'ZoneType_Hand', ownerSeatId: 1 },
        { zoneId: 20, type: 'ZoneType_Battlefield', ownerSeatId: 1 },
        { zoneId: 30, type: 'ZoneType_Graveyard', ownerSeatId: 1 },
        { zoneId: 40, type: 'ZoneType_Battlefield', ownerSeatId: 2 },
      ],
      gameObjects: [
        { instanceId: 1, grpId: 100, ownerSeatId: 1, controllerSeatId: 1, zoneId: 10, visibility: 'Visibility_Public' },
        { instanceId: 2, grpId: 200, ownerSeatId: 1, controllerSeatId: 1, zoneId: 20, visibility: 'Visibility_Public' },
        { instanceId: 3, grpId: 300, ownerSeatId: 1, controllerSeatId: 1, zoneId: 30, visibility: 'Visibility_Public' },
        { instanceId: 4, grpId: 400, ownerSeatId: 2, controllerSeatId: 2, zoneId: 40, visibility: 'Visibility_Public' },
      ],
      turnInfo: undefined,
      players: undefined,
    });

    const state = engine.getState();
    expect(state.hand).toContain(100);
    expect(state.battlefield).toContain(200);
    expect(state.graveyard).toContain(300);
    expect(state.opponentBattlefield).toContain(400);
  });

  it('should update turn info from game_state_update', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-turn-gsu',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'game_state_update',
      zones: [],
      gameObjects: [],
      turnInfo: { turnNumber: 7, activePlayer: 2, phase: 'Phase_Main2', step: 'Step_None' },
      players: undefined,
    });

    const state = engine.getState();
    expect(state.turnNumber).toBe(7);
    expect(state.activePlayer).toBe(2);
    expect(state.phase).toBe('Phase_Main2');
  });

  it('should update life from game_state_update players', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-life-gsu',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'game_state_update',
      zones: [],
      gameObjects: [],
      turnInfo: undefined,
      players: [
        { seatId: 1, lifeTotal: 15 },
        { seatId: 2, lifeTotal: 8 },
      ],
    });

    const state = engine.getState();
    expect(state.playerLife).toBe(15);
    expect(state.opponentLife).toBe(8);
  });

  it('should processEvents batch multiple events', () => {
    engine.processEvents([
      {
        type: 'match_start',
        matchId: 'test-batch',
        playerSeatId: 1,
        playerTeamId: 1,
        playerName: 'Batch',
        opponentName: 'Opp',
        format: 'Standard',
      },
      {
        type: 'deck_submission',
        deckCards: [{ grpId: 111, qty: 4 }],
        commanderGrpIds: [],
        sideboardCards: [],
      },
      { type: 'card_drawn', instanceId: 1, grpId: 111, ownerSeatId: 1 },
      { type: 'turn_change', turnNumber: 1, activePlayer: 1 },
      { type: 'life_total_change', seatId: 2, lifeTotal: 17 },
    ]);

    const state = engine.getState();
    expect(state.matchId).toBe('test-batch');
    expect(state.deckList[0].remaining).toBe(3);
    expect(state.turnNumber).toBe(1);
    expect(state.opponentLife).toBe(17);
    expect(state.cardsDrawn).toEqual([111]);
  });

  it('should handle zone_change from library to battlefield (not via draw)', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-zone-change',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'deck_submission',
      deckCards: [{ grpId: 111, qty: 4 }],
      commanderGrpIds: [],
      sideboardCards: [],
    });

    // Library → Battlefield (e.g., ramp spell putting land on BF)
    engine.processEvent({
      type: 'zone_change',
      instanceId: 1,
      grpId: 111,
      ownerSeatId: 1,
      fromZoneId: 1,
      toZoneId: 2,
      fromZoneType: 'ZoneType_Library',
      toZoneType: 'ZoneType_Battlefield',
    });

    const state = engine.getState();
    expect(state.deckList[0].remaining).toBe(3);
    expect(state.librarySize).toBe(3);
  });

  it('should handle draw probabilities with 0 library size', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-empty-lib',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    // No deck submitted → library size 0
    const probs = engine.getDrawProbabilities();
    expect(Object.keys(probs).length).toBe(0);
  });

  it('should set brawl starting life to 25', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-brawl',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: 'Brawl_Ranked',
    });

    const state = engine.getState();
    expect(state.playerLife).toBe(25);
    expect(state.opponentLife).toBe(25);
  });

  it('should track opponent cards from card_played events', () => {
    engine.processEvent({
      type: 'match_start',
      matchId: 'test-123',
      playerSeatId: 1,
      playerTeamId: 1,
      playerName: null,
      opponentName: null,
      format: null,
    });

    engine.processEvent({
      type: 'card_played',
      instanceId: 50,
      grpId: 999,
      ownerSeatId: 2,
      fromZoneType: 'ZoneType_Hand',
      toZoneType: 'ZoneType_Battlefield',
    });

    const state = engine.getState();
    expect(state.opponentCardsSeen).toContain(999);
  });
});
