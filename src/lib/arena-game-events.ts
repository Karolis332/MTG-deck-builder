/**
 * Arena game event types and extraction from JSON blocks.
 *
 * Transforms raw Arena log JSON blocks into granular, typed game events
 * that the GameStateEngine can process into a live game state.
 */

import type { JsonBlock } from './arena-log-reader';

// ── Event Types ──────────────────────────────────────────────────────────────

export interface MatchStartEvent {
  type: 'match_start';
  matchId: string;
  playerSeatId: number;
  playerTeamId: number;
  playerName: string | null;
  opponentName: string | null;
  format: string | null;
}

export interface DeckSubmissionEvent {
  type: 'deck_submission';
  deckCards: Array<{ grpId: number; qty: number }>;
  commanderGrpIds: number[];
  sideboardCards: Array<{ grpId: number; qty: number }>;
}

export interface GameStateUpdateEvent {
  type: 'game_state_update';
  gameObjects: GameObjectInfo[];
  zones: ZoneInfo[];
  turnInfo?: TurnInfo;
  players?: PlayerInfo[];
}

export interface GameObjectInfo {
  instanceId: number;
  grpId: number;
  ownerSeatId: number;
  controllerSeatId: number;
  zoneId: number;
  visibility: string;
  cardTypes?: string[];
  subtypes?: string[];
  superTypes?: string[];
  name?: string;
}

export interface ZoneInfo {
  zoneId: number;
  type: string; // ZoneType_Hand, ZoneType_Library, ZoneType_Battlefield, etc.
  ownerSeatId: number;
  objectInstanceIds?: number[];
}

export interface TurnInfo {
  turnNumber: number;
  activePlayer: number;
  phase: string;
  step: string;
  decisionPlayer?: number;
}

export interface PlayerInfo {
  seatId: number;
  lifeTotal: number;
  maxHandSize?: number;
  teamId?: number;
}

export interface MulliganPromptEvent {
  type: 'mulligan_prompt';
  seatId: number;
  mulliganCount: number;
  handGrpIds: number[];
}

export interface CardDrawnEvent {
  type: 'card_drawn';
  instanceId: number;
  grpId: number;
  ownerSeatId: number;
}

export interface CardPlayedEvent {
  type: 'card_played';
  instanceId: number;
  grpId: number;
  ownerSeatId: number;
  fromZoneType: string;
  toZoneType: string;
}

export interface ZoneChangeEvent {
  type: 'zone_change';
  instanceId: number;
  grpId: number;
  ownerSeatId: number;
  fromZoneId: number;
  toZoneId: number;
  fromZoneType: string;
  toZoneType: string;
  /** ZoneTransfer category: Draw, CastSpell, Resolve, PlayLand, Destroy, Exile, Discard, Sacrifice, Counter, Mill, etc. */
  category?: string;
}

export interface LifeTotalChangeEvent {
  type: 'life_total_change';
  seatId: number;
  lifeTotal: number;
}

export interface TurnChangeEvent {
  type: 'turn_change';
  turnNumber: number;
  activePlayer: number;
}

export interface PhaseChangeEvent {
  type: 'phase_change';
  phase: string;
  step: string;
  turnNumber: number;
}

export interface DamageDealtEvent {
  type: 'damage_dealt';
  sourceInstanceId: number;
  sourceGrpId: number;
  targetSeatId: number | null;
  targetInstanceId: number | null;
  targetGrpId: number | null;
  amount: number;
  isCombat: boolean;
}

export interface IntermissionEvent {
  type: 'intermission';
  gameNumber: number;
}

export interface MatchCompleteEvent {
  type: 'match_complete';
  matchId: string;
  result: 'win' | 'loss' | 'draw';
  winningTeamId: number | null;
}

export type ArenaGameEvent =
  | MatchStartEvent
  | DeckSubmissionEvent
  | GameStateUpdateEvent
  | MulliganPromptEvent
  | CardDrawnEvent
  | CardPlayedEvent
  | ZoneChangeEvent
  | LifeTotalChangeEvent
  | TurnChangeEvent
  | PhaseChangeEvent
  | DamageDealtEvent
  | IntermissionEvent
  | MatchCompleteEvent;

// ── Zone Type Constants ──────────────────────────────────────────────────────

export const ZONE_TYPES = {
  HAND: 'ZoneType_Hand',
  LIBRARY: 'ZoneType_Library',
  BATTLEFIELD: 'ZoneType_Battlefield',
  GRAVEYARD: 'ZoneType_Graveyard',
  EXILE: 'ZoneType_Exile',
  STACK: 'ZoneType_Stack',
  COMMAND: 'ZoneType_Command',
  LIMBO: 'ZoneType_Limbo',
} as const;

// ── Annotation Types (from MtgaProto) ───────────────────────────────────────

interface AnnotationDetail {
  key: string;
  type?: string;
  valueInt32?: number[];
  valueUint32?: number[];
  valueString?: string[];
  valueBool?: boolean[];
}

interface AnnotationInfo {
  id: number;
  affectorId?: number;
  affectedIds?: number[];
  type: string[]; // ARRAY — e.g. ["AnnotationType_ZoneTransfer"]
  details?: AnnotationDetail[];
}

function getAnnotationDetail(ann: AnnotationInfo, key: string): AnnotationDetail | undefined {
  return ann.details?.find(d => d.key === key);
}

function hasAnnotationType(ann: AnnotationInfo, typeName: string): boolean {
  return ann.type?.some(t => t === typeName || t === `AnnotationType_${typeName}`) ?? false;
}

// ── Event Extraction ─────────────────────────────────────────────────────────

export interface ExtractionContext {
  playerName: string | null;
  playerSeatId: number;
  playerTeamId: number;
  currentMatchId: string | null;
  zones: Map<number, { type: string; ownerSeatId: number }>;
  prevObjectZones: Map<number, number>;
  objectGrpIds: Map<number, number>;
  objectOwners: Map<number, number>;
  /** Chain of ObjectIdChanged remaps: newId → origId (for multi-hop resolution) */
  idChanges: Map<number, number>;
  lastTurnNumber: number;
  lastPhase: string;
  lastStep: string;
  lastLifeTotals: Map<number, number>;
  gameNumber: number;
  /** Debug counters from the last extraction call */
  lastStats: ExtractionStats;
}

export interface ExtractionStats {
  gsmCount: number;
  objectIdChanges: number;
  zoneTransfers: number;
  shuffleRemaps: number;
  grpIdHits: number;
  grpIdMisses: number;
  diffDeleted: number;
}

export function createContext(): ExtractionContext {
  return {
    playerName: null,
    playerSeatId: 1,
    playerTeamId: 1,
    currentMatchId: null,
    zones: new Map(),
    prevObjectZones: new Map(),
    objectGrpIds: new Map(),
    objectOwners: new Map(),
    idChanges: new Map(),
    lastTurnNumber: 0,
    lastPhase: '',
    lastStep: '',
    lastLifeTotals: new Map(),
    gameNumber: 1,
    lastStats: { gsmCount: 0, objectIdChanges: 0, zoneTransfers: 0, shuffleRemaps: 0, grpIdHits: 0, grpIdMisses: 0, diffDeleted: 0 },
  };
}

/**
 * Resolve an instanceId to its grpId, walking the ObjectIdChanged chain
 * if the direct lookup fails. Returns 0 if unresolvable.
 */
function resolveGrpId(ctx: ExtractionContext, instanceId: number): number {
  // Direct lookup
  const direct = ctx.objectGrpIds.get(instanceId);
  if (direct && direct > 0) return direct;

  // Walk the idChanges chain (newId → origId → origOrigId → ...)
  let current = instanceId;
  const visited = new Set<number>();
  while (ctx.idChanges.has(current)) {
    const prev = ctx.idChanges.get(current)!;
    if (visited.has(prev)) break; // cycle guard
    visited.add(prev);
    const grpId = ctx.objectGrpIds.get(prev);
    if (grpId && grpId > 0) return grpId;
    current = prev;
  }

  return 0;
}

/**
 * Resolve an instanceId to its ownerSeatId, walking the chain if needed.
 */
function resolveOwner(ctx: ExtractionContext, instanceId: number, fallback: number): number {
  const direct = ctx.objectOwners.get(instanceId);
  if (direct !== undefined) return direct;

  let current = instanceId;
  const visited = new Set<number>();
  while (ctx.idChanges.has(current)) {
    const prev = ctx.idChanges.get(current)!;
    if (visited.has(prev)) break;
    visited.add(prev);
    const owner = ctx.objectOwners.get(prev);
    if (owner !== undefined) return owner;
    current = prev;
  }

  return fallback;
}

/**
 * Extract granular game events from Arena log JSON blocks.
 * Delegates to extractGameEventsWithContext with a fresh context.
 */
export function extractGameEvents(blocks: JsonBlock[]): ArenaGameEvent[] {
  return extractGameEventsWithContext(blocks, createContext());
}

/**
 * Extract game events using a persistent context.
 * Use this for streaming mode where blocks arrive incrementally
 * and context (player seat, zone map, etc.) must persist across calls.
 */
export function extractGameEventsWithContext(
  blocks: JsonBlock[],
  ctx: ExtractionContext,
): ArenaGameEvent[] {
  const events: ArenaGameEvent[] = [];
  const stats: ExtractionStats = {
    gsmCount: 0, objectIdChanges: 0, zoneTransfers: 0,
    shuffleRemaps: 0, grpIdHits: 0, grpIdMisses: 0, diffDeleted: 0,
  };

  for (const [method, data] of blocks) {
    // Player name detection
    if ('authenticateResponse' in data) {
      const auth = data.authenticateResponse as Record<string, unknown>;
      if (typeof auth.screenName === 'string') {
        ctx.playerName = auth.screenName;
      }
    }
    if ('screenName' in data && typeof data.screenName === 'string') {
      ctx.playerName = data.screenName;
    }

    // Match room state — start and end
    if ('matchGameRoomStateChangedEvent' in data) {
      const event = data.matchGameRoomStateChangedEvent as Record<string, unknown>;
      const roomInfo = (event.gameRoomInfo ?? event) as Record<string, unknown>;
      const config = roomInfo.gameRoomConfig as Record<string, unknown> | undefined;
      const stateType = roomInfo.stateType as string | undefined;

      if (config) {
        const matchId = config.matchId as string | undefined;
        const reservedPlayers = (config.reservedPlayers ?? []) as Array<Record<string, unknown>>;

        if (matchId && stateType !== 'MatchGameRoomStateType_MatchCompleted') {
          let pName = ctx.playerName;
          let oName: string | null = null;
          let pSeatId = 1;
          let pTeamId = 1;
          let format: string | null = null;

          for (const rp of reservedPlayers) {
            const rpName = rp.playerName as string | undefined;
            const rpSeatId = rp.systemSeatId as number | undefined;
            const rpTeamId = rp.teamId as number | undefined;
            const rpEventId = rp.eventId as string | undefined;

            if (rpName === ctx.playerName || (!ctx.playerName && rpSeatId === 1)) {
              pName = rpName ?? pName;
              pSeatId = rpSeatId ?? 1;
              pTeamId = rpTeamId ?? 1;
              if (rpEventId) format = rpEventId;
            } else {
              oName = rpName ?? null;
            }
          }

          if (!pName && reservedPlayers.length >= 2) {
            const rp0 = reservedPlayers[0];
            const rp1 = reservedPlayers[1];
            pName = rp0.playerName as string ?? null;
            oName = rp1.playerName as string ?? null;
            pSeatId = (rp0.systemSeatId as number) ?? 1;
            pTeamId = (rp0.teamId as number) ?? 1;
            format = (rp0.eventId as string) ?? null;
          }

          ctx.playerSeatId = pSeatId;
          ctx.playerTeamId = pTeamId;
          ctx.currentMatchId = matchId;
          ctx.gameNumber = 1;

          events.push({
            type: 'match_start',
            matchId,
            playerSeatId: pSeatId,
            playerTeamId: pTeamId,
            playerName: pName,
            opponentName: oName,
            format,
          });
        }

        // Match complete
        const finalResult = roomInfo.finalMatchResult as Record<string, unknown> | undefined;
        if (finalResult && stateType === 'MatchGameRoomStateType_MatchCompleted' && ctx.currentMatchId) {
          const resultList = (finalResult.resultList ?? []) as Array<Record<string, unknown>>;
          let result: 'win' | 'loss' | 'draw' = 'draw';
          let winningTeamId: number | null = null;

          for (const r of resultList) {
            if (r.scope === 'MatchScope_Match') {
              winningTeamId = (r.winningTeamId as number) ?? null;
              const resultType = r.result as string | undefined;
              if (resultType === 'ResultType_Draw') {
                result = 'draw';
              } else if (winningTeamId === ctx.playerTeamId) {
                result = 'win';
              } else if (winningTeamId != null) {
                result = 'loss';
              }
              break;
            }
          }

          events.push({
            type: 'match_complete',
            matchId: ctx.currentMatchId,
            result,
            winningTeamId,
          });
          ctx.currentMatchId = null;
        }
      }
    }

    // Deck submission events
    if (method === 'EventSetDeckV2' || ['Event.DeckSubmitV3', 'DeckSubmit', 'DeckSubmitV3'].includes(method)) {
      const req = (data._parsed_request ?? data) as Record<string, unknown>;
      const deckData = (req.Deck ?? req.deck ?? req.CourseDeck ?? req) as Record<string, unknown>;
      const mainDeck = (deckData.MainDeck ?? deckData.mainDeck ?? []) as unknown[];
      const sideboard = (deckData.Sideboard ?? deckData.sideboard ?? deckData.SideboardCards ?? []) as unknown[];
      const cmdZone = (deckData.CommandZone ?? deckData.commandZone ?? []) as unknown[];

      const parseDeckEntries = (entries: unknown[]): Array<{ grpId: number; qty: number }> => {
        const result: Array<{ grpId: number; qty: number }> = [];
        for (const entry of entries) {
          if (typeof entry === 'object' && entry !== null) {
            const e = entry as Record<string, unknown>;
            const grpId = Number(e.cardId ?? e.Id ?? 0);
            const qty = Number(e.quantity ?? e.Quantity ?? 1);
            if (grpId > 0) result.push({ grpId, qty });
          } else if (typeof entry === 'number') {
            result.push({ grpId: entry, qty: 1 });
          }
        }
        return result;
      };

      const deckCards = parseDeckEntries(mainDeck);
      const sideboardCards = parseDeckEntries(sideboard);
      const commanderGrpIds: number[] = [];
      for (const entry of cmdZone) {
        if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>;
          const grpId = Number(e.cardId ?? e.Id ?? 0);
          if (grpId > 0) commanderGrpIds.push(grpId);
        }
      }

      if (deckCards.length > 0) {
        events.push({
          type: 'deck_submission',
          deckCards,
          commanderGrpIds,
          sideboardCards,
        });
      }
    }

    // GRE to client events — game state updates, mulligans, etc.
    if ('greToClientEvent' in data) {
      const gre = data.greToClientEvent as Record<string, unknown>;
      const messages = (gre.greToClientMessages ?? []) as Array<Record<string, unknown>>;

      for (const msg of messages) {
        const msgType = msg.type as string | undefined;

        // Connect response — contains deck info
        if (msg.connectResp) {
          const resp = msg.connectResp as Record<string, unknown>;
          const deckMsg = resp.deckMessage as Record<string, unknown> | undefined;
          if (deckMsg) {
            const deckCards = (deckMsg.deckCards ?? []) as number[];
            const commanderCards = (deckMsg.commanderCards ?? []) as number[];
            const cardCounts = new Map<number, number>();
            for (const cid of [...deckCards, ...commanderCards]) {
              cardCounts.set(cid, (cardCounts.get(cid) || 0) + 1);
            }
            events.push({
              type: 'deck_submission',
              deckCards: Array.from(cardCounts.entries()).map(([grpId, qty]) => ({ grpId, qty })),
              commanderGrpIds: commanderCards,
              sideboardCards: [],
            });
          }
        }

        // Mulligan prompt
        if (msgType === 'GREMessageType_MulliganReq' || msgType === 'GREMessageType_GroupReq') {
          const prompt = msg.mulliganReq as Record<string, unknown> | undefined;
          if (prompt) {
            const seatId = (prompt.systemSeatId as number) ?? ctx.playerSeatId;
            events.push({
              type: 'mulligan_prompt',
              seatId,
              mulliganCount: (prompt.mulliganCount as number) ?? 0,
              handGrpIds: [], // Will be filled from game state
            });
          }
        }

        // Intermission (sideboarding between games)
        if (msgType === 'GREMessageType_IntermissionReq') {
          ctx.gameNumber++;
          events.push({
            type: 'intermission',
            gameNumber: ctx.gameNumber,
          });
        }

        // Game state message — the big one
        const gsm = msg.gameStateMessage as Record<string, unknown> | undefined;
        if (gsm) {
          const gameObjects: GameObjectInfo[] = [];
          const zones: ZoneInfo[] = [];
          stats.gsmCount++;

          // ── Step 0: Clean up deleted instances ────────────────────────
          const deletedIds = (gsm.diffDeletedInstanceIds ?? []) as number[];
          for (const delId of deletedIds) {
            ctx.objectGrpIds.delete(delId);
            ctx.objectOwners.delete(delId);
            ctx.prevObjectZones.delete(delId);
            stats.diffDeleted++;
          }

          // Parse zones
          const rawZones = (gsm.zones ?? []) as Array<Record<string, unknown>>;
          for (const z of rawZones) {
            const zoneId = z.zoneId as number;
            const zoneType = (z.type ?? '') as string;
            const ownerSeatId = (z.ownerSeatId as number) ?? 0;
            ctx.zones.set(zoneId, { type: zoneType, ownerSeatId });
            zones.push({
              zoneId,
              type: zoneType,
              ownerSeatId,
              objectInstanceIds: z.objectInstanceIds as number[] | undefined,
            });
          }

          // Parse game objects — update context maps for grpId/owner/zone tracking
          const rawObjects = (gsm.gameObjects ?? []) as Array<Record<string, unknown>>;
          for (const go of rawObjects) {
            const instanceId = go.instanceId as number;
            const grpId = go.grpId as number;
            const ownerSeatId = (go.ownerSeatId as number) ?? 0;
            const controllerSeatId = (go.controllerSeatId as number) ?? ownerSeatId;
            const zoneId = go.zoneId as number;
            const visibility = (go.visibility as string) ?? 'Visibility_Public';

            if (!instanceId || !grpId) continue;

            ctx.objectGrpIds.set(instanceId, grpId);
            ctx.objectOwners.set(instanceId, ownerSeatId);
            ctx.prevObjectZones.set(instanceId, zoneId);

            gameObjects.push({
              instanceId,
              grpId,
              ownerSeatId,
              controllerSeatId,
              zoneId,
              visibility,
              cardTypes: go.cardTypes as string[] | undefined,
              subtypes: go.subtypes as string[] | undefined,
              // Arena's name field is often a numeric localization ID (e.g. 748691), not a card name.
              // Only pass through actual string names, not numeric IDs.
              name: typeof go.name === 'string' && isNaN(Number(go.name)) ? go.name : undefined,
            });
          }

          // ── Annotation-based event extraction ──────────────────────────
          // Arena sends zone transfers, life changes, and damage as annotations
          // on ~70% of game state messages (no gameObjects in those diffs).
          // The annotation `type` field is an ARRAY, not a string.

          const rawAnnotations = (gsm.annotations ?? []) as Array<Record<string, unknown>>;
          const annotations: AnnotationInfo[] = rawAnnotations.map(a => ({
            id: (a.id as number) ?? 0,
            affectorId: a.affectorId as number | undefined,
            affectedIds: (a.affectedIds ?? []) as number[],
            type: (a.type ?? []) as string[],
            details: (a.details ?? []) as AnnotationDetail[],
          }));

          // Step 1: Process ObjectIdChanged — map old instanceId → new instanceId
          // Record in idChanges for chain walking, and copy grpId/owner to new ID.
          for (const ann of annotations) {
            if (hasAnnotationType(ann, 'ObjectIdChanged')) {
              const origDetail = getAnnotationDetail(ann, 'orig_id');
              const newDetail = getAnnotationDetail(ann, 'new_id');
              const origId = origDetail?.valueInt32?.[0];
              const newId = newDetail?.valueInt32?.[0];
              if (origId && newId) {
                stats.objectIdChanges++;
                // Record the chain link: newId came from origId
                ctx.idChanges.set(newId, origId);
                // Eagerly copy grpId and owner from old instance to new
                const grpId = resolveGrpId(ctx, origId);
                const owner = ctx.objectOwners.get(origId);
                if (grpId > 0) ctx.objectGrpIds.set(newId, grpId);
                if (owner !== undefined) ctx.objectOwners.set(newId, owner);
              }
            }
          }

          // Step 1b: Process Shuffle annotations — bulk remap instanceIds
          // When a library is shuffled, Arena assigns new instanceIds to every card.
          // Without this, all post-shuffle grpId lookups fail.
          for (const ann of annotations) {
            if (!hasAnnotationType(ann, 'Shuffle')) continue;

            const oldIdsDetail = getAnnotationDetail(ann, 'OldIds');
            const newIdsDetail = getAnnotationDetail(ann, 'NewIds');
            const oldIds = oldIdsDetail?.valueInt32 ?? [];
            const newIds = newIdsDetail?.valueInt32 ?? [];

            if (oldIds.length === 0 || oldIds.length !== newIds.length) continue;

            for (let si = 0; si < oldIds.length; si++) {
              const oldId = oldIds[si];
              const newId = newIds[si];
              if (!oldId || !newId || oldId === newId) continue;

              stats.shuffleRemaps++;
              // Record chain link
              ctx.idChanges.set(newId, oldId);
              // Copy grpId and owner
              const grpId = resolveGrpId(ctx, oldId);
              const owner = ctx.objectOwners.get(oldId);
              if (grpId > 0) ctx.objectGrpIds.set(newId, grpId);
              if (owner !== undefined) ctx.objectOwners.set(newId, owner);
            }
          }

          // Step 2: Process ZoneTransfer annotations — the primary source of
          // card_drawn, card_played, and zone_change events
          for (const ann of annotations) {
            if (!hasAnnotationType(ann, 'ZoneTransfer')) continue;

            const instanceId = ann.affectedIds?.[0];
            if (!instanceId) continue;

            stats.zoneTransfers++;

            const zoneSrcDetail = getAnnotationDetail(ann, 'zone_src');
            const zoneDestDetail = getAnnotationDetail(ann, 'zone_dest');
            const categoryDetail = getAnnotationDetail(ann, 'category');

            const fromZoneId = zoneSrcDetail?.valueInt32?.[0];
            const toZoneId = zoneDestDetail?.valueInt32?.[0];
            const category = categoryDetail?.valueString?.[0] ?? '';

            if (fromZoneId === undefined || toZoneId === undefined) continue;
            if (fromZoneId === toZoneId) continue;

            const fromZone = ctx.zones.get(fromZoneId);
            const toZone = ctx.zones.get(toZoneId);
            const fromZoneType = fromZone?.type ?? 'unknown';
            const toZoneType = toZone?.type ?? 'unknown';

            // Use chain-walking resolution for grpId and owner
            const grpId = resolveGrpId(ctx, instanceId);
            const ownerSeatId = resolveOwner(ctx, instanceId, fromZone?.ownerSeatId ?? 0);

            // Update zone tracking
            ctx.prevObjectZones.set(instanceId, toZoneId);

            if (grpId === 0) {
              stats.grpIdMisses++;
              continue; // Can't emit events without a card identity
            }
            stats.grpIdHits++;

            // Also store the resolved grpId back so future lookups are direct
            ctx.objectGrpIds.set(instanceId, grpId);

            events.push({
              type: 'zone_change',
              instanceId,
              grpId,
              ownerSeatId,
              fromZoneId,
              toZoneId,
              fromZoneType,
              toZoneType,
              category: category || undefined,
            });

            // Library → Hand = card drawn
            if (fromZoneType === ZONE_TYPES.LIBRARY && toZoneType === ZONE_TYPES.HAND) {
              events.push({
                type: 'card_drawn',
                instanceId,
                grpId,
                ownerSeatId,
              });
            }

            // Hand/Library → Battlefield or Stack = card played/cast
            if (
              (fromZoneType === ZONE_TYPES.HAND || fromZoneType === ZONE_TYPES.LIBRARY) &&
              (toZoneType === ZONE_TYPES.BATTLEFIELD || toZoneType === ZONE_TYPES.STACK)
            ) {
              events.push({
                type: 'card_played',
                instanceId,
                grpId,
                ownerSeatId,
                fromZoneType,
                toZoneType,
              });
            }

            // Stack → Battlefield = spell resolving (also counts as "played" for permanents)
            if (
              fromZoneType === ZONE_TYPES.STACK &&
              toZoneType === ZONE_TYPES.BATTLEFIELD &&
              category === 'Resolve'
            ) {
              events.push({
                type: 'card_played',
                instanceId,
                grpId,
                ownerSeatId,
                fromZoneType,
                toZoneType,
              });
            }
          }

          // Step 3: Process ModifiedLife annotations for life total changes
          // (covers the 90% of diffs that don't have a players array)
          // NOTE: The 'life' detail holds the DELTA (e.g. -2 for damage), NOT the absolute.
          for (const ann of annotations) {
            if (!hasAnnotationType(ann, 'ModifiedLife')) continue;

            const lifeDetail = getAnnotationDetail(ann, 'life');
            const seatDetail = getAnnotationDetail(ann, 'systemSeatId');
            if (!lifeDetail || lifeDetail.valueInt32 == null || lifeDetail.valueInt32.length === 0) continue;

            const lifeDelta = lifeDetail.valueInt32[0];
            // affectedIds[0] can hold the seatId, or use the detail
            const seatId = seatDetail?.valueInt32?.[0] ?? ann.affectedIds?.[0] ?? 0;
            if (!seatId) continue;

            const prevLife = ctx.lastLifeTotals.get(seatId);
            // Compute absolute from delta. If we don't know the previous life, use 20 as fallback.
            const lifeTotal = (prevLife ?? 20) + lifeDelta;

            if (prevLife === undefined || prevLife !== lifeTotal) {
              ctx.lastLifeTotals.set(seatId, lifeTotal);
              events.push({
                type: 'life_total_change',
                seatId,
                lifeTotal,
              });
            }
          }

          // Step 4: Process DamageDealt annotations
          for (const ann of annotations) {
            if (!hasAnnotationType(ann, 'DamageDealt')) continue;

            const dmgAmountDetail = getAnnotationDetail(ann, 'damage_amount');
            const amount = dmgAmountDetail?.valueInt32?.[0] ?? 0;
            if (amount <= 0) continue;

            const sourceId = ann.affectorId ?? 0;
            const targetIds = ann.affectedIds ?? [];
            const sourceGrpId = sourceId ? resolveGrpId(ctx, sourceId) : 0;

            // Check if combat damage
            const isCombatDetail = getAnnotationDetail(ann, 'is_combat_damage');
            const isCombat = isCombatDetail?.valueBool?.[0] ?? false;

            for (const targetId of targetIds) {
              // Target could be a player (seatId) or a creature (instanceId)
              const targetGrpId = resolveGrpId(ctx, targetId);
              // If targetGrpId resolves, it's a creature; otherwise check if it's a seat
              const targetSeatId = targetGrpId === 0 ? targetId : null;

              events.push({
                type: 'damage_dealt',
                sourceInstanceId: sourceId,
                sourceGrpId,
                targetSeatId: targetGrpId === 0 ? targetSeatId : null,
                targetInstanceId: targetGrpId > 0 ? targetId : null,
                targetGrpId: targetGrpId > 0 ? targetGrpId : null,
                amount,
                isCombat,
              });
            }
          }

          // ── Turn info ──────────────────────────────────────────────────
          const turnInfo = gsm.turnInfo as Record<string, unknown> | undefined;
          let parsedTurnInfo: TurnInfo | undefined;
          if (turnInfo) {
            const turnNumber = (turnInfo.turnNumber as number) ?? 0;
            const activePlayer = (turnInfo.activePlayer as number) ?? 0;
            const phase = (turnInfo.phase as string) ?? '';
            const step = (turnInfo.step as string) ?? '';

            parsedTurnInfo = { turnNumber, activePlayer, phase, step };

            if (turnNumber > 0 && turnNumber !== ctx.lastTurnNumber) {
              ctx.lastTurnNumber = turnNumber;
              events.push({
                type: 'turn_change',
                turnNumber,
                activePlayer,
              });
            }

            if (phase && (phase !== ctx.lastPhase || step !== ctx.lastStep)) {
              ctx.lastPhase = phase;
              ctx.lastStep = step;
              events.push({
                type: 'phase_change',
                phase,
                step,
                turnNumber: ctx.lastTurnNumber,
              });
            }
          }

          // ── Player life totals (from players array, ~10% of diffs) ────
          const rawPlayers = (gsm.players ?? []) as Array<Record<string, unknown>>;
          const players: PlayerInfo[] = [];
          for (const p of rawPlayers) {
            const seatId = p.systemSeatNumber as number ?? p.systemSeatId as number ?? p.controllerSeatId as number ?? p.seatId as number;
            const lifeTotal = p.lifeTotal as number;
            if (seatId && lifeTotal !== undefined) {
              players.push({
                seatId,
                lifeTotal,
                maxHandSize: p.maxHandSize as number | undefined,
                teamId: p.teamId as number | undefined,
              });

              const prevLife = ctx.lastLifeTotals.get(seatId);
              if (prevLife === undefined || prevLife !== lifeTotal) {
                events.push({
                  type: 'life_total_change',
                  seatId,
                  lifeTotal,
                });
              }
              ctx.lastLifeTotals.set(seatId, lifeTotal);
            }
          }

          events.push({
            type: 'game_state_update',
            gameObjects,
            zones,
            turnInfo: parsedTurnInfo,
            players: players.length > 0 ? players : undefined,
          });

          // Check for mulligan hands
          if (parsedTurnInfo?.phase === 'Phase_Beginning' && ctx.lastTurnNumber <= 1) {
            for (const z of zones) {
              if (z.type === ZONE_TYPES.HAND && z.ownerSeatId === ctx.playerSeatId && z.objectInstanceIds) {
                const handGrpIds: number[] = [];
                for (const instId of z.objectInstanceIds) {
                  const gid = ctx.objectGrpIds.get(instId);
                  if (gid) handGrpIds.push(gid);
                }
                for (let i = events.length - 1; i >= 0; i--) {
                  if (events[i].type === 'mulligan_prompt' && (events[i] as MulliganPromptEvent).handGrpIds.length === 0) {
                    (events[i] as MulliganPromptEvent).handGrpIds = handGrpIds;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  ctx.lastStats = stats;
  return events;
}
