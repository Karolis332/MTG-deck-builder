import { describe, it, expect } from 'vitest';
import { deriveGameFacts } from '../arena-game-summary';
import type { ArenaGameEvent } from '../arena-game-events';
import { ZONE_TYPES } from '../arena-game-events';

const MY_SEAT = 2;
const OPP_SEAT = 1;

describe('deriveGameFacts', () => {
  it('numbers own turns correctly when on the draw', () => {
    const events: ArenaGameEvent[] = [
      { type: 'turn_change', turnNumber: 1, activePlayer: OPP_SEAT },
      { type: 'turn_change', turnNumber: 2, activePlayer: MY_SEAT },
      { type: 'turn_change', turnNumber: 3, activePlayer: OPP_SEAT },
      { type: 'turn_change', turnNumber: 4, activePlayer: MY_SEAT },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    expect(facts.onPlay).toBe(false);
    expect(facts.totalOwnTurns).toBe(2);
  });

  it('attributes each land play to the correct own-turn number on the draw (catches an off-by-one shift)', () => {
    const land: ArenaGameEvent = {
      type: 'zone_change', instanceId: 101, grpId: 9001, ownerSeatId: MY_SEAT,
      fromZoneId: 1, toZoneId: 2, fromZoneType: ZONE_TYPES.HAND, toZoneType: ZONE_TYPES.BATTLEFIELD,
      category: 'PlayLand',
    };
    const events: ArenaGameEvent[] = [
      { type: 'turn_change', turnNumber: 1, activePlayer: OPP_SEAT }, // opponent's turn 1 (I'm on the draw)
      { type: 'turn_change', turnNumber: 2, activePlayer: MY_SEAT },  // my own turn 1
      land,
      { type: 'turn_change', turnNumber: 3, activePlayer: OPP_SEAT },
      { type: 'turn_change', turnNumber: 4, activePlayer: MY_SEAT },  // my own turn 2
      { ...land, instanceId: 102, grpId: 9002 },
      { type: 'turn_change', turnNumber: 5, activePlayer: OPP_SEAT },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    // A mutant that shifts currentOwnTurn by +1 on the draw keeps totalOwnTurns and onPlay
    // correct (they don't depend on the per-turn key) but files this land under own-turn 2.
    expect(facts.landsPlayedByOwnTurn[1]).toEqual([9001]);
    expect(facts.landCountByOwnTurn[1]).toBe(1);
    expect(facts.landsPlayedByOwnTurn[2]).toEqual([9002]);
    expect(facts.landCountByOwnTurn[2]).toBe(2);
  });

  it('flags a missed land drop on an own turn with zero land plays', () => {
    const events: ArenaGameEvent[] = [
      { type: 'turn_change', turnNumber: 1, activePlayer: MY_SEAT },
      {
        type: 'zone_change', instanceId: 101, grpId: 9001, ownerSeatId: MY_SEAT,
        fromZoneId: 1, toZoneId: 2, fromZoneType: ZONE_TYPES.HAND, toZoneType: ZONE_TYPES.BATTLEFIELD,
        category: 'PlayLand',
      },
      { type: 'turn_change', turnNumber: 2, activePlayer: OPP_SEAT },
      { type: 'turn_change', turnNumber: 3, activePlayer: MY_SEAT },
      // no land play this own turn
      { type: 'turn_change', turnNumber: 4, activePlayer: OPP_SEAT },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    expect(facts.missedLandDrop[1]).toBe(false);
    expect(facts.landCountByOwnTurn[1]).toBe(1);
    expect(facts.missedLandDrop[2]).toBe(true);
    expect(facts.landCountByOwnTurn[2]).toBe(1);
  });

  it('tracks the highest mulligan count offered to me', () => {
    const events: ArenaGameEvent[] = [
      { type: 'mulligan_prompt', seatId: MY_SEAT, mulliganCount: 0, handGrpIds: [] },
      { type: 'mulligan_prompt', seatId: OPP_SEAT, mulliganCount: 5, handGrpIds: [] },
      { type: 'mulligan_prompt', seatId: MY_SEAT, mulliganCount: 1, handGrpIds: [] },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    expect(facts.mulligans).toBe(1);
  });

  it('survives a card changing instanceId on its own zone transfer (F1: draw id != cast id)', () => {
    // Pia-shaped case: drawn as instance 551, then ObjectIdChanged remaps it to 552
    // before the cast's ZoneTransfer annotation fires — arena-game-events.ts never
    // emits that remap as an event, so a transfer-diffing tracker leaves 551
    // "stuck" in hand forever. The zone-snapshot rebuild must not care.
    const events: ArenaGameEvent[] = [
      // The opening hand is always dealt before turn 1's turn_change fires (confirmed
      // against a real log for N7) — this must precede, not follow, the turn change.
      {
        type: 'game_state_update',
        gameObjects: [{ instanceId: 551, grpId: 999, ownerSeatId: MY_SEAT, controllerSeatId: MY_SEAT, zoneId: 1, visibility: 'Visibility_Private' }],
        zones: [{ zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: MY_SEAT, objectInstanceIds: [551] }],
      },
      { type: 'turn_change', turnNumber: 1, activePlayer: MY_SEAT },
      {
        type: 'game_state_update',
        gameObjects: [{ instanceId: 552, grpId: 999, ownerSeatId: MY_SEAT, controllerSeatId: MY_SEAT, zoneId: 2, visibility: 'Visibility_Public' }],
        zones: [
          { zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: MY_SEAT, objectInstanceIds: [] },
          { zoneId: 2, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: MY_SEAT, objectInstanceIds: [552] },
        ],
      },
      { type: 'turn_change', turnNumber: 2, activePlayer: OPP_SEAT },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    expect(facts.openingHandGrpIds).toEqual([999]);
    expect(facts.handGrpIdsAtOwnTurnEnd[1]).toEqual([]);
    expect(facts.battlefieldGrpIdsAtOwnTurnEnd[1]).toEqual([999]);
  });

  it('dedupes a replayed zone transfer (F4: GameStateUpdate_Undo resends the same PlayLand)', () => {
    const land: ArenaGameEvent = {
      type: 'zone_change', instanceId: 483, grpId: 9001, ownerSeatId: MY_SEAT,
      fromZoneId: 1, toZoneId: 2, fromZoneType: ZONE_TYPES.HAND, toZoneType: ZONE_TYPES.BATTLEFIELD,
      category: 'PlayLand',
    };
    const events: ArenaGameEvent[] = [
      { type: 'turn_change', turnNumber: 1, activePlayer: MY_SEAT },
      land,
      land, // the Undo full-state replay resends the identical annotation
      { type: 'turn_change', turnNumber: 2, activePlayer: OPP_SEAT },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    expect(facts.landCountByOwnTurn[1]).toBe(1);
    expect(facts.landsPlayedByOwnTurn[1]).toEqual([9001]);
  });

  it('uses the kept hand after a mulligan, not the discarded one (N7)', () => {
    const events: ArenaGameEvent[] = [
      // Dealt 7, don't like it.
      {
        type: 'game_state_update',
        gameObjects: [{ instanceId: 1, grpId: 111, ownerSeatId: MY_SEAT, controllerSeatId: MY_SEAT, zoneId: 1, visibility: 'Visibility_Private' }],
        zones: [{ zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: MY_SEAT, objectInstanceIds: [1] }],
      },
      { type: 'mulligan_prompt', seatId: MY_SEAT, mulliganCount: 0, handGrpIds: [111] },
      // Mulligan to 6 — new instanceId, new hand snapshot, all before turn 1 starts.
      {
        type: 'game_state_update',
        gameObjects: [{ instanceId: 2, grpId: 222, ownerSeatId: MY_SEAT, controllerSeatId: MY_SEAT, zoneId: 1, visibility: 'Visibility_Private' }],
        zones: [{ zoneId: 1, type: ZONE_TYPES.HAND, ownerSeatId: MY_SEAT, objectInstanceIds: [2] }],
      },
      { type: 'turn_change', turnNumber: 1, activePlayer: MY_SEAT },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    expect(facts.openingHandGrpIds).toEqual([222]);
  });

  it('records the chosen-type subtypes for a battlefield permanent (N6: Multiversal Passage)', () => {
    const events: ArenaGameEvent[] = [
      { type: 'turn_change', turnNumber: 1, activePlayer: MY_SEAT },
      {
        type: 'game_state_update',
        gameObjects: [{
          instanceId: 701, grpId: 88888, ownerSeatId: MY_SEAT, controllerSeatId: MY_SEAT,
          zoneId: 2, visibility: 'Visibility_Public', subtypes: ['SubType_Island'],
        }],
        zones: [{ zoneId: 2, type: ZONE_TYPES.BATTLEFIELD, ownerSeatId: MY_SEAT, objectInstanceIds: [701] }],
      },
      { type: 'turn_change', turnNumber: 2, activePlayer: OPP_SEAT },
    ];
    const facts = deriveGameFacts(events, MY_SEAT, []);
    expect(facts.battlefieldSubtypesAtOwnTurnEnd[1]).toEqual({ 88888: ['SubType_Island'] });
  });
});
