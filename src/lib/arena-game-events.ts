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
  lastTurnNumber: number;
  lastPhase: string;
  lastStep: string;
  lastLifeTotals: Map<number, number>;
  gameNumber: number;
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
    lastTurnNumber: 0,
    lastPhase: '',
    lastStep: '',
    lastLifeTotals: new Map(),
    gameNumber: 1,
  };
}

/**
 * Extract granular game events from Arena log JSON blocks.
 * Processes the same block format as arena-log-reader but produces
 * fine-grained events instead of final match summaries.
 */
export function extractGameEvents(blocks: JsonBlock[]): ArenaGameEvent[] {
  const events: ArenaGameEvent[] = [];
  const ctx = createContext();

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

          // Parse game objects and detect zone transitions
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

            gameObjects.push({
              instanceId,
              grpId,
              ownerSeatId,
              controllerSeatId,
              zoneId,
              visibility,
              cardTypes: go.cardTypes as string[] | undefined,
              subtypes: go.subtypes as string[] | undefined,
              name: go.name as string | undefined,
            });

            // Zone change detection
            const prevZoneId = ctx.prevObjectZones.get(instanceId);
            if (prevZoneId !== undefined && prevZoneId !== zoneId) {
              const fromZone = ctx.zones.get(prevZoneId);
              const toZone = ctx.zones.get(zoneId);
              const fromZoneType = fromZone?.type ?? 'unknown';
              const toZoneType = toZone?.type ?? 'unknown';

              events.push({
                type: 'zone_change',
                instanceId,
                grpId,
                ownerSeatId,
                fromZoneId: prevZoneId,
                toZoneId: zoneId,
                fromZoneType,
                toZoneType,
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

              // Hand/Library → Battlefield or Stack = card played
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
            }
            ctx.prevObjectZones.set(instanceId, zoneId);
          }

          // Turn info
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

          // Player life totals
          const rawPlayers = (gsm.players ?? []) as Array<Record<string, unknown>>;
          const players: PlayerInfo[] = [];
          for (const p of rawPlayers) {
            const seatId = p.systemSeatId as number ?? p.seatId as number;
            const lifeTotal = p.lifeTotal as number;
            if (seatId && lifeTotal !== undefined) {
              players.push({
                seatId,
                lifeTotal,
                maxHandSize: p.maxHandSize as number | undefined,
                teamId: p.teamId as number | undefined,
              });

              const prevLife = ctx.lastLifeTotals.get(seatId);
              if (prevLife !== undefined && prevLife !== lifeTotal) {
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

          // Check for mulligan hands — detect when hand zone has exactly 7/6/5 cards
          // and we're in the opening phase
          if (parsedTurnInfo?.phase === 'Phase_Beginning' && ctx.lastTurnNumber <= 1) {
            for (const z of zones) {
              if (z.type === ZONE_TYPES.HAND && z.ownerSeatId === ctx.playerSeatId && z.objectInstanceIds) {
                const handGrpIds: number[] = [];
                for (const instId of z.objectInstanceIds) {
                  const gid = ctx.objectGrpIds.get(instId);
                  if (gid) handGrpIds.push(gid);
                }
                // Update the most recent mulligan_prompt with actual hand contents
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

  return events;
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

          // Parse game objects and detect zone transitions
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

            gameObjects.push({
              instanceId,
              grpId,
              ownerSeatId,
              controllerSeatId,
              zoneId,
              visibility,
              cardTypes: go.cardTypes as string[] | undefined,
              subtypes: go.subtypes as string[] | undefined,
              name: go.name as string | undefined,
            });

            // Zone change detection
            const prevZoneId = ctx.prevObjectZones.get(instanceId);
            if (prevZoneId !== undefined && prevZoneId !== zoneId) {
              const fromZone = ctx.zones.get(prevZoneId);
              const toZone = ctx.zones.get(zoneId);
              const fromZoneType = fromZone?.type ?? 'unknown';
              const toZoneType = toZone?.type ?? 'unknown';

              events.push({
                type: 'zone_change',
                instanceId,
                grpId,
                ownerSeatId,
                fromZoneId: prevZoneId,
                toZoneId: zoneId,
                fromZoneType,
                toZoneType,
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

              // Hand/Library → Battlefield or Stack = card played
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
            }
            ctx.prevObjectZones.set(instanceId, zoneId);
          }

          // Turn info
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

          // Player life totals
          const rawPlayers = (gsm.players ?? []) as Array<Record<string, unknown>>;
          const players: PlayerInfo[] = [];
          for (const p of rawPlayers) {
            const seatId = p.systemSeatId as number ?? p.seatId as number;
            const lifeTotal = p.lifeTotal as number;
            if (seatId && lifeTotal !== undefined) {
              players.push({
                seatId,
                lifeTotal,
                maxHandSize: p.maxHandSize as number | undefined,
                teamId: p.teamId as number | undefined,
              });

              const prevLife = ctx.lastLifeTotals.get(seatId);
              if (prevLife !== undefined && prevLife !== lifeTotal) {
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

  return events;
}
