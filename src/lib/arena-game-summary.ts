/**
 * Pure per-game consistency derivation for scripts/arena-game-report.ts.
 *
 * Takes the ArenaGameEvent stream for exactly ONE game (already sliced by the
 * caller at match_start / intermission / match_complete boundaries) and
 * derives mulligans, own-turn numbering, land drops, and battlefield/hand
 * snapshots — no DB access, no card names (grpIds only) so it stays testable
 * with a synthetic fixture.
 *
 * Zone membership (hand/battlefield) is rebuilt wholesale from each
 * `game_state_update`'s own `zones[].objectInstanceIds`, never diffed by
 * individually adding/removing a `zone_change` event's instanceId. Arena
 * assigns a NEW instanceId to a card on almost every zone transfer (the one
 * exception is Stack -> Battlefield) via an ObjectIdChanged annotation that
 * never reaches this module as an event, so "delete the instanceId this
 * transfer names" silently no-ops for the card's PREVIOUS id and the card
 * never leaves the set it's tracked in. A zone snapshot is already expressed
 * in current ids, so trusting it directly sidesteps the whole problem.
 */

import type { ArenaGameEvent } from './arena-game-events';
import { ZONE_TYPES } from './arena-game-events';

export interface DerivedGameFacts {
  /** true = my turn 1 was game turn 1; false = opponent went first; null = never saw a turn 1. */
  onPlay: boolean | null;
  /** Max mulliganCount offered to me (best-effort — Arena doesn't emit a "mulligan accepted" event). */
  mulligans: number;
  /** Kept hand: grpIds in my Hand zone the first time it's seen non-empty. */
  openingHandGrpIds: number[];
  /** Every grpId my seat ever drew this game (Library -> Hand, category Draw), opening hand excluded. */
  drawnGrpIds: number[];
  /** own turn number (1-based, mine only) -> land grpIds played that turn. */
  landsPlayedByOwnTurn: Record<number, number[]>;
  /** own turn number -> cumulative lands played by the end of that turn. */
  landCountByOwnTurn: Record<number, number>;
  /** own turn number -> true if zero lands were played that turn. */
  missedLandDrop: Record<number, boolean>;
  /** own turn number -> my battlefield grpIds (lands + everything else) at the end of that turn. */
  battlefieldGrpIdsAtOwnTurnEnd: Record<number, number[]>;
  /**
   * own turn number -> grpId -> last-seen Oracle subtypes for that battlefield permanent
   * (e.g. ["SubType_Island"] for a land that chose a type on ETB, like Multiversal
   * Passage). Only has entries for instances a game_state_update actually reported
   * subtypes for (N6).
   */
  battlefieldSubtypesAtOwnTurnEnd: Record<number, Record<number, string[]>>;
  /**
   * My battlefield grpIds already present before own turn 1 even starts — i.e. a
   * pregame "Put" (Gemstone Caverns' luck counter is the only one this deck runs).
   * Distinguishes "was already down pregame" from "I played it on turn 1", which
   * opening-hand membership can no longer tell you once N7 made the opening-hand
   * snapshot stop as soon as the card actually leaves the hand.
   */
  pregameBattlefieldGrpIds: number[];
  /** own turn number -> my hand grpIds at the end of that turn. */
  handGrpIdsAtOwnTurnEnd: Record<number, number[]>;
  /** Own turn numbers on which a commander grpId was cast (Hand/Command -> Battlefield/Stack). */
  commanderCastOwnTurns: number[];
  /** How many of my own turns this game had. */
  totalOwnTurns: number;
}

function emptyFacts(): DerivedGameFacts {
  return {
    onPlay: null,
    mulligans: 0,
    openingHandGrpIds: [],
    drawnGrpIds: [],
    landsPlayedByOwnTurn: {},
    landCountByOwnTurn: {},
    missedLandDrop: {},
    battlefieldGrpIdsAtOwnTurnEnd: {},
    battlefieldSubtypesAtOwnTurnEnd: {},
    pregameBattlefieldGrpIds: [],
    handGrpIdsAtOwnTurnEnd: {},
    commanderCastOwnTurns: [],
    totalOwnTurns: 0,
  };
}

/**
 * Derive per-game facts from one game's worth of ArenaGameEvents.
 *
 * @param events events for exactly one game, in log order
 * @param playerSeatId the local player's systemSeatId for this game
 * @param commanderGrpIds grpIds in the player's command zone (for cast-turn tracking)
 */
export function deriveGameFacts(
  events: ArenaGameEvent[],
  playerSeatId: number,
  commanderGrpIds: number[],
): DerivedGameFacts {
  const facts = emptyFacts();
  const commanderSet = new Set(commanderGrpIds);

  // Ground truth for "what's in zone X right now", rebuilt wholesale whenever
  // a game_state_update reports that zone's contents (not every update does).
  // Hand is a private per-player zone (its own zoneId, a real ownerSeatId on the
  // zone itself). Battlefield is ONE shared zone for both players with no
  // ownerSeatId at all — "mine" has to come from each gameObject's own owner.
  const grpIdByInstance = new Map<number, number>();
  const ownerByInstance = new Map<number, number>();
  // N6: last-seen subtypes per instance (e.g. a land that chose a basic type on ETB).
  const subtypesByInstance = new Map<number, string[]>();
  let battlefieldAll: number[] = [];
  let hand: number[] = [];
  // A mulligan replaces the hand before turn 1 begins — "first non-empty hand seen"
  // would freeze on the DISCARDED hand, not the kept one. Keep overwriting on every
  // Hand-zone snapshot until turn 1 actually starts, then stop (N7).
  let openingHandLocked = false;

  let ownTurnCounter = 0;
  let currentOwnTurn: number | null = null;
  let cumulativeLands = 0;
  let mulliganOffers = 0;
  // GameStateUpdate_Undo full states resend annotations already processed (e.g. a
  // CancelActionReq replay re-sends the same PlayLand ZoneTransfer). Dedupe by the
  // transfer's own identity so a replay is a no-op instead of double-counting.
  const seenZoneTransfers = new Set<string>();

  const resolveNames = (instanceIds: number[]): number[] =>
    instanceIds.map((id) => grpIdByInstance.get(id)).filter((g): g is number => g != null);
  const mine = (instanceIds: number[]): number[] => instanceIds.filter((id) => ownerByInstance.get(id) === playerSeatId);

  const snapshotEnd = (ownTurn: number) => {
    const myBattlefield = mine(battlefieldAll);
    facts.battlefieldGrpIdsAtOwnTurnEnd[ownTurn] = resolveNames(myBattlefield);
    const subtypesByGrpId: Record<number, string[]> = {};
    for (const instanceId of myBattlefield) {
      const grpId = grpIdByInstance.get(instanceId);
      const subtypes = subtypesByInstance.get(instanceId);
      if (grpId != null && subtypes) subtypesByGrpId[grpId] = subtypes;
    }
    facts.battlefieldSubtypesAtOwnTurnEnd[ownTurn] = subtypesByGrpId;
    facts.handGrpIdsAtOwnTurnEnd[ownTurn] = resolveNames(hand);
    facts.landCountByOwnTurn[ownTurn] = cumulativeLands;
    facts.missedLandDrop[ownTurn] = (facts.landsPlayedByOwnTurn[ownTurn] ?? []).length === 0;
  };

  for (const ev of events) {
    if (ev.type === 'game_state_update') {
      for (const go of ev.gameObjects) {
        grpIdByInstance.set(go.instanceId, go.grpId);
        ownerByInstance.set(go.instanceId, go.ownerSeatId);
        if (go.subtypes) subtypesByInstance.set(go.instanceId, go.subtypes);
      }
      for (const z of ev.zones) {
        if (z.objectInstanceIds === undefined) continue;
        if (z.type === ZONE_TYPES.BATTLEFIELD) {
          battlefieldAll = z.objectInstanceIds;
          // Keep overwriting until turn 1 locks, same as the opening-hand snapshot —
          // whatever is mine on the battlefield at that instant got there pregame.
          if (!openingHandLocked) facts.pregameBattlefieldGrpIds = resolveNames(mine(battlefieldAll));
          continue;
        }
        if (z.ownerSeatId !== playerSeatId) continue;
        if (z.type === ZONE_TYPES.HAND) {
          hand = z.objectInstanceIds;
          if (!openingHandLocked && hand.length > 0) {
            facts.openingHandGrpIds = resolveNames(hand);
          }
        }
      }
      continue;
    }

    if (ev.type === 'turn_change') {
      if (facts.onPlay === null && ev.turnNumber === 1) {
        facts.onPlay = ev.activePlayer === playerSeatId;
        openingHandLocked = true;
      }
      // Close out the own turn that just ended.
      if (currentOwnTurn != null) snapshotEnd(currentOwnTurn);
      if (ev.activePlayer === playerSeatId) {
        ownTurnCounter += 1;
        currentOwnTurn = ownTurnCounter;
      } else {
        currentOwnTurn = null;
      }
      continue;
    }

    if (ev.type === 'mulligan_prompt') {
      // ev.mulliganCount isn't reliable across every Arena log format (some blocks never
      // carry it, so it reads 0 even after a real mulligan — see 422ad877, which DOES
      // carry 1). Arena also re-emits this prompt once per hand offered, so (offers - 1)
      // is an independent cross-check; take whichever signal is higher.
      if (ev.seatId === playerSeatId) {
        mulliganOffers += 1;
        facts.mulligans = Math.max(facts.mulligans, ev.mulliganCount, mulliganOffers - 1);
      }
      continue;
    }

    if (ev.type === 'zone_change') {
      const transferKey = `${ev.instanceId}|${ev.category ?? ''}|${ev.fromZoneType}|${ev.toZoneType}`;
      if (seenZoneTransfers.has(transferKey)) continue; // Undo replay of an already-applied transfer
      seenZoneTransfers.add(transferKey);

      // A zone_change already carries a resolved grpId even when no game_state_update's
      // gameObjects[] array ever names this instanceId directly (e.g. a card that moves
      // straight from Library to Hand via a "Put" transfer, never re-announced). Record it
      // here too so resolveNames/mine() don't silently drop the card.
      grpIdByInstance.set(ev.instanceId, ev.grpId);
      ownerByInstance.set(ev.instanceId, ev.ownerSeatId);

      const mine = ev.ownerSeatId === playerSeatId;

      if (mine && ev.category === 'Draw' && ev.toZoneType === ZONE_TYPES.HAND) {
        facts.drawnGrpIds.push(ev.grpId);
      }

      if (mine && ev.category === 'PlayLand' && ev.toZoneType === ZONE_TYPES.BATTLEFIELD && currentOwnTurn != null) {
        (facts.landsPlayedByOwnTurn[currentOwnTurn] ??= []).push(ev.grpId);
        cumulativeLands += 1;
      }

      // Commander casts from the Command Zone go Command -> Stack/Battlefield, which
      // never fires a 'card_played' event (that type only covers Hand -> Stack/Battlefield).
      // Track both paths directly off the zone transfer.
      if (
        mine && currentOwnTurn != null && commanderSet.has(ev.grpId) &&
        (ev.fromZoneType === ZONE_TYPES.HAND || ev.fromZoneType === ZONE_TYPES.COMMAND) &&
        (ev.toZoneType === ZONE_TYPES.BATTLEFIELD || ev.toZoneType === ZONE_TYPES.STACK)
      ) {
        facts.commanderCastOwnTurns.push(currentOwnTurn);
      }
      continue;
    }
  }

  if (currentOwnTurn != null) snapshotEnd(currentOwnTurn);
  facts.totalOwnTurns = ownTurnCounter;
  return facts;
}
