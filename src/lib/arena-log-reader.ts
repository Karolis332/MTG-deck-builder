/**
 * MTG Arena Player.log parser
 *
 * Parses the Arena log to extract:
 * - Match data (results, deck submissions, cards played)
 * - Collection data (PlayerInventory.GetPlayerCardsV3)
 *
 * Current Arena log format (2025+):
 *   [UnityCrossThreadLogger]==> MethodName {"id":"...","request":"..."}
 *   <== MethodName(requestId)
 *   { "transactionId": "...", "greToClientEvent": {...} }
 *   [UnityCrossThreadLogger]Connecting to matchId ...
 *
 * JSON payloads appear on standalone lines after the logger header lines.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ArenaMatch {
  matchId: string;
  playerName: string | null;
  opponentName: string | null;
  result: 'win' | 'loss' | 'draw';
  format: string | null;
  turns: number;
  deckCards: Array<{ id: string; qty: number }> | null;
  cardsPlayed: string[];
  opponentCardsSeen: string[];
  /** Per-turn card play tracking (turn number → grpIds played that turn) */
  cardsPlayedByTurn: Record<number, string[]>;
  /** Turns on which the commander was cast */
  commanderCastTurns: number[];
  /** Per-turn land plays (turn number → grpIds of lands played) */
  landsPlayedByTurn: Record<number, string[]>;
}

export type JsonBlock = [method: string, data: Record<string, unknown>];

export interface ArenaLogResult {
  matches: ArenaMatch[];
  collection: Record<string, number> | null;
}

// ── JSON Block Extraction ────────────────────────────────────────────────────

// Old format: ==> Method(id): {json} or <== Method(id): {json}
const METHOD_WITH_PARENS =
  /(?:==>|<==)\s+(\w+(?:\.\w+)*)\s*\([^)]*\)\s*:\s*(\{.*)/;

// New format: [UnityCrossThreadLogger]==> MethodName {json}
const METHOD_NEW_FORMAT =
  /\[UnityCrossThreadLogger\]\s*(?:==>|<==)\s+(\w+(?:\.\w+)*)\s+(\{.*)/;

// Standalone JSON with logger prefix: [UnityCrossThreadLogger]{json}
const STANDALONE_WITH_PREFIX = /\[UnityCrossThreadLogger\]\s*(\{.*)/;

// Bare JSON line (common in current format — game events on their own line)
const BARE_JSON = /^(\s*\{.*)/;

/**
 * Collect a potentially multi-line JSON string until braces balance.
 */
function collectJson(start: string, lines: string[], nextIdx: number): string {
  let result = start;
  let depth = (result.match(/\{/g) || []).length - (result.match(/\}/g) || []).length;

  let idx = nextIdx;
  while (depth > 0 && idx < lines.length) {
    const line = lines[idx];
    result += '\n' + line;
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    idx++;
    if (idx - nextIdx > 200) break; // safety limit
  }

  return result;
}

/**
 * Extract tagged JSON blocks from the Arena log text.
 */
export function extractJsonBlocks(logText: string): JsonBlock[] {
  const blocks: JsonBlock[] = [];
  const lines = logText.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Old format: ==> Method(id): {json}  or  <== Method(id): {json}
    const oldMatch = METHOD_WITH_PARENS.exec(line);
    if (oldMatch) {
      const method = oldMatch[1];
      const jsonStr = collectJson(oldMatch[2], lines, i + 1);
      try {
        const data = JSON.parse(jsonStr);
        // Parse nested request field (double-encoded JSON in EventSetDeckV2 etc.)
        if (typeof data.request === 'string') {
          try { data._parsed_request = JSON.parse(data.request); } catch { /* skip */ }
        }
        blocks.push([method, data]);
      } catch { /* skip */ }
      i++;
      continue;
    }

    // New format: [UnityCrossThreadLogger]==> MethodName {json}
    const newMatch = METHOD_NEW_FORMAT.exec(line);
    if (newMatch) {
      const method = newMatch[1];
      const jsonStr = collectJson(newMatch[2], lines, i + 1);
      try {
        const data = JSON.parse(jsonStr);
        // Parse nested request field (double-encoded JSON in EventSetDeckV2 etc.)
        if (typeof data.request === 'string') {
          try { data._parsed_request = JSON.parse(data.request); } catch { /* skip */ }
        }
        blocks.push([method, data]);
      } catch { /* skip */ }
      i++;
      continue;
    }

    // [UnityCrossThreadLogger]{json} (standalone with prefix)
    const standaloneMatch = STANDALONE_WITH_PREFIX.exec(line);
    if (standaloneMatch && standaloneMatch[1].startsWith('{')) {
      const jsonStr = collectJson(standaloneMatch[1], lines, i + 1);
      try {
        blocks.push(['standalone', JSON.parse(jsonStr)]);
      } catch { /* skip */ }
      i++;
      continue;
    }

    // Bare JSON line (no prefix — current Arena format for game events)
    const bareMatch = BARE_JSON.exec(line);
    if (bareMatch) {
      const jsonStr = collectJson(bareMatch[1], lines, i + 1);
      try {
        const data = JSON.parse(jsonStr);
        // Only accept objects that look like Arena events (have transactionId or known keys)
        if (
          typeof data === 'object' &&
          data !== null &&
          ('transactionId' in data ||
            'greToClientEvent' in data ||
            'matchGameRoomStateChangedEvent' in data ||
            'authenticateResponse' in data ||
            'Courses' in data ||
            'MatchesV3' in data)
        ) {
          blocks.push(['standalone', data]);
        }
      } catch { /* skip */ }
      i++;
      continue;
    }

    i++;
  }

  return blocks;
}

// ── Match Extraction ─────────────────────────────────────────────────────────

interface DeckCard {
  id: string;
  qty: number;
}

interface MatchContext {
  matchId: string;
  playerName: string | null;
  opponentName: string | null;
  playerSeatId: number;
  playerTeamId: number;
  format: string | null;
  deck: DeckCard[] | null;
  turns: number;
  cardsPlayed: Set<string>;
  opponentCards: Set<string>;
  result: 'win' | 'loss' | 'draw' | null;
  /** Per-turn card plays: turn → set of grpIds */
  cardsPlayedByTurn: Map<number, Set<string>>;
  /** Commander grpIds (from connectResp) */
  commanderGrpIds: Set<string>;
  /** Turns on which a commander was cast */
  commanderCastTurns: number[];
  /** Per-turn land plays: turn → set of grpIds */
  landsPlayedByTurn: Map<number, Set<string>>;
  /** Current turn number from last turnInfo */
  currentTurn: number;
  /** Track which zones objects are in to detect plays */
  prevZones: Map<number, string>;
}

/** Convert a Map<number, Set<string>> to a plain Record<number, string[]> */
function mapToRecord(map: Map<number, Set<string>>): Record<number, string[]> {
  const result: Record<number, string[]> = {};
  map.forEach((set, turn) => {
    result[turn] = Array.from(set);
  });
  return result;
}

/** Convert MatchContext to ArenaMatch output format */
function finalizeMatch(ctx: MatchContext): ArenaMatch {
  return {
    matchId: ctx.matchId,
    playerName: ctx.playerName,
    opponentName: ctx.opponentName,
    result: ctx.result!,
    format: ctx.format,
    turns: ctx.turns,
    deckCards: ctx.deck,
    cardsPlayed: Array.from(ctx.cardsPlayed),
    opponentCardsSeen: Array.from(ctx.opponentCards),
    cardsPlayedByTurn: mapToRecord(ctx.cardsPlayedByTurn),
    commanderCastTurns: [...ctx.commanderCastTurns],
    landsPlayedByTurn: mapToRecord(ctx.landsPlayedByTurn),
  };
}

/**
 * Extract matches from parsed JSON blocks.
 */
export function extractMatches(blocks: JsonBlock[]): ArenaMatch[] {
  const matches: ArenaMatch[] = [];
  let playerName: string | null = null;
  let currentMatch: MatchContext | null = null;
  const seenMatchIds = new Set<string>();

  for (const [method, data] of blocks) {
    // Detect player name from authenticateResponse
    if ('authenticateResponse' in data) {
      const auth = data.authenticateResponse as Record<string, unknown>;
      if (typeof auth.screenName === 'string') {
        playerName = auth.screenName;
      }
    }

    // Also detect screenName at top level
    if ('screenName' in data && typeof data.screenName === 'string') {
      playerName = data.screenName;
    }

    // Match room state — contains matchId, player info, format, and final result
    if ('matchGameRoomStateChangedEvent' in data) {
      const event = data.matchGameRoomStateChangedEvent as Record<string, unknown>;
      // Arena format: gameRoomConfig and stateType can be directly in the event
      // or nested under gameRoomInfo depending on the Arena version
      const roomInfo = (event.gameRoomInfo ?? event) as Record<string, unknown>;

      const config = roomInfo.gameRoomConfig as Record<string, unknown> | undefined;
      const stateType = roomInfo.stateType as string | undefined;

      if (config) {
        const matchId = config.matchId as string | undefined;
        const reservedPlayers = (config.reservedPlayers ?? []) as Array<Record<string, unknown>>;

        if (matchId && !currentMatch) {
          // Initialize match context
          let pName = playerName;
          let oName: string | null = null;
          let pSeatId = 1;
          let pTeamId = 1;
          let format: string | null = null;

          for (const rp of reservedPlayers) {
            const rpName = rp.playerName as string | undefined;
            const rpSeatId = rp.systemSeatId as number | undefined;
            const rpTeamId = rp.teamId as number | undefined;
            const rpEventId = rp.eventId as string | undefined;

            if (rpName === playerName || (!playerName && rpSeatId === 1)) {
              pName = rpName ?? pName;
              pSeatId = rpSeatId ?? 1;
              pTeamId = rpTeamId ?? 1;
              if (rpEventId) format = rpEventId;
            } else {
              oName = rpName ?? null;
            }
          }

          // If we couldn't identify who we are, use seat 1 as player
          if (!pName && reservedPlayers.length >= 2) {
            const rp0 = reservedPlayers[0];
            const rp1 = reservedPlayers[1];
            pName = rp0.playerName as string ?? null;
            oName = rp1.playerName as string ?? null;
            pSeatId = (rp0.systemSeatId as number) ?? 1;
            pTeamId = (rp0.teamId as number) ?? 1;
            format = (rp0.eventId as string) ?? null;
          }

          currentMatch = {
            matchId,
            playerName: pName,
            opponentName: oName,
            playerSeatId: pSeatId,
            playerTeamId: pTeamId,
            format,
            deck: null,
            turns: 0,
            cardsPlayed: new Set(),
            opponentCards: new Set(),
            result: null,
            cardsPlayedByTurn: new Map(),
            commanderGrpIds: new Set(),
            commanderCastTurns: [],
            landsPlayedByTurn: new Map(),
            currentTurn: 0,
            prevZones: new Map(),
          };
        }

        // Check for final match result
        const finalResult = roomInfo.finalMatchResult as Record<string, unknown> | undefined;
        if (finalResult && currentMatch && stateType === 'MatchGameRoomStateType_MatchCompleted') {
          const resultList = (finalResult.resultList ?? []) as Array<Record<string, unknown>>;

          for (const r of resultList) {
            if (r.scope === 'MatchScope_Match') {
              const winningTeamId = r.winningTeamId as number | undefined;
              const resultType = r.result as string | undefined;

              if (resultType === 'ResultType_Draw') {
                currentMatch.result = 'draw';
              } else if (winningTeamId === currentMatch.playerTeamId) {
                currentMatch.result = 'win';
              } else if (winningTeamId != null) {
                currentMatch.result = 'loss';
              }
              break;
            }
          }

          // Finalize match
          if (currentMatch.result && !seenMatchIds.has(currentMatch.matchId)) {
            seenMatchIds.add(currentMatch.matchId);
            matches.push(finalizeMatch(currentMatch));
          }
          currentMatch = null;
          continue;
        }
      }
    }

    // Process game events within current match
    if (!currentMatch) continue;

    // greToClientEvent — contains game state messages
    if ('greToClientEvent' in data) {
      const gre = data.greToClientEvent as Record<string, unknown>;
      const messages = (gre.greToClientMessages ?? []) as Array<Record<string, unknown>>;

      for (const msg of messages) {
        // Extract deck from connect response
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
            currentMatch.deck = Array.from(cardCounts.entries()).map(([id, qty]) => ({
              id: String(id),
              qty,
            }));
            // Track commander grpIds for cast detection
            for (const cid of commanderCards) {
              currentMatch.commanderGrpIds.add(String(cid));
            }
          }
        }

        // Extract game state info
        const gsm = msg.gameStateMessage as Record<string, unknown> | undefined;
        if (gsm) {
          // Turn info
          const turnInfo = gsm.turnInfo as Record<string, unknown> | undefined;
          const t = (turnInfo?.turnNumber as number) || 0;
          if (t > currentMatch.turns) currentMatch.turns = t;
          if (t > 0) currentMatch.currentTurn = t;

          // Game objects — track cards by owner + zone transitions
          const gameObjects = (gsm.gameObjects ?? []) as Array<Record<string, unknown>>;
          for (const go of gameObjects) {
            const grpId = go.grpId as number | undefined;
            if (!grpId) continue;
            const grpStr = String(grpId);
            const instanceId = go.instanceId as number | undefined;
            const zoneId = go.zoneId as number | undefined;
            const zoneType = (go.type ?? '') as string;

            if (go.ownerSeatId === currentMatch.playerSeatId) {
              currentMatch.cardsPlayed.add(grpStr);

              // Track per-turn plays via zone transitions
              const turn = currentMatch.currentTurn;
              if (turn > 0 && instanceId && zoneId) {
                const prevZone = currentMatch.prevZones.get(instanceId);
                const currZone = String(zoneId);

                // Detect card moving to battlefield (zone change)
                if (prevZone && prevZone !== currZone) {
                  if (!currentMatch.cardsPlayedByTurn.has(turn)) {
                    currentMatch.cardsPlayedByTurn.set(turn, new Set());
                  }
                  currentMatch.cardsPlayedByTurn.get(turn)!.add(grpStr);

                  // Detect commander casts
                  if (currentMatch.commanderGrpIds.has(grpStr)) {
                    currentMatch.commanderCastTurns.push(turn);
                  }
                }

                currentMatch.prevZones.set(instanceId, currZone);
              }

              // Track lands by checking type
              if (zoneType.includes('Land') || (typeof go.cardTypes === 'string' && (go.cardTypes as string).includes('Land'))) {
                if (!currentMatch.landsPlayedByTurn.has(currentMatch.currentTurn)) {
                  currentMatch.landsPlayedByTurn.set(currentMatch.currentTurn, new Set());
                }
                currentMatch.landsPlayedByTurn.get(currentMatch.currentTurn)!.add(grpStr);
              }
            } else {
              currentMatch.opponentCards.add(grpStr);
            }
          }

          // Also check gameInfo for match result (backup detection)
          const gameInfo = gsm.gameInfo as Record<string, unknown> | undefined;
          if (gameInfo && gameInfo.matchState === 'MatchState_MatchComplete' && !currentMatch.result) {
            const results = (gameInfo.results ?? []) as Array<Record<string, unknown>>;
            for (const r of results) {
              if (r.scope === 'MatchScope_Match') {
                const winTeam = r.winningTeamId as number | undefined;
                const resType = r.result as string | undefined;
                if (resType === 'ResultType_Draw') {
                  currentMatch.result = 'draw';
                } else if (winTeam === currentMatch.playerTeamId) {
                  currentMatch.result = 'win';
                } else if (winTeam != null) {
                  currentMatch.result = 'loss';
                }
                break;
              }
            }
          }
        }
      }
    }

    // Deck submission via EventSetDeckV2 (current Arena format)
    if (method === 'EventSetDeckV2') {
      const req = (data._parsed_request ?? data) as Record<string, unknown>;
      const deckData = (req.Deck ?? req.deck ?? {}) as Record<string, unknown>;
      const mainDeck = (deckData.MainDeck ?? deckData.mainDeck ?? []) as unknown[];
      const deck: DeckCard[] = [];
      for (const entry of mainDeck) {
        if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>;
          const cardId = String(e.cardId ?? e.Id ?? '');
          const qty = (e.quantity ?? e.Quantity ?? 1) as number;
          deck.push({ id: cardId, qty });
        } else if (typeof entry === 'number') {
          deck.push({ id: String(entry), qty: 1 });
        }
      }
      // Also capture commander zone
      const cmdZone = (deckData.CommandZone ?? deckData.commandZone ?? []) as unknown[];
      for (const entry of cmdZone) {
        if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>;
          const cardId = String(e.cardId ?? e.Id ?? '');
          deck.push({ id: cardId, qty: 1 });
        }
      }
      if (deck.length > 0) currentMatch.deck = deck;
    }

    // Legacy: Deck submission events (older log format)
    if (['Event.DeckSubmitV3', 'DeckSubmit', 'DeckSubmitV3'].includes(method)) {
      const deckData = (data.CourseDeck ?? data) as Record<string, unknown>;
      const mainDeck = (deckData.mainDeck ?? deckData.MainDeck ?? []) as unknown[];
      const deck: DeckCard[] = [];
      for (const entry of mainDeck) {
        if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>;
          const cardId = String(e.cardId ?? e.Id ?? '');
          const qty = (e.quantity ?? e.Quantity ?? 1) as number;
          deck.push({ id: cardId, qty });
        } else if (typeof entry === 'number') {
          deck.push({ id: String(entry), qty: 1 });
        }
      }
      if (deck.length > 0) currentMatch.deck = deck;
    }

    // Legacy: matchId at top level (older format)
    if ('matchId' in data && typeof data.matchId === 'string') {
      // Just update matchId if needed
    }

    // Legacy: matchComplete / MatchComplete
    if (
      ['MatchComplete', 'Event.MatchComplete'].includes(method) ||
      'matchComplete' in data
    ) {
      const mc = (data.matchComplete ?? data) as Record<string, unknown>;
      const resultStr = (mc.result ?? mc.matchResult ?? '') as string;
      if (typeof resultStr === 'string' && !currentMatch.result) {
        if (resultStr.includes('Win') || resultStr === 'ResultType_Win') {
          currentMatch.result = 'win';
        } else if (resultStr.includes('Loss') || resultStr === 'ResultType_Loss') {
          currentMatch.result = 'loss';
        } else if (resultStr.includes('Draw')) {
          currentMatch.result = 'draw';
        }
      }
    }
  }

  // Handle last match if it wasn't finalized by a MatchCompleted event
  if (currentMatch && currentMatch.result && !seenMatchIds.has(currentMatch.matchId)) {
    seenMatchIds.add(currentMatch.matchId);
    matches.push(finalizeMatch(currentMatch));
  }

  return matches;
}

// ── Collection Extraction ────────────────────────────────────────────────────

/**
 * Extract collection data from PlayerInventory.GetPlayerCardsV3 events.
 * Returns a map of arena_id (string) → quantity, or null if not found.
 * Takes the LAST occurrence for most recent state.
 */
export function extractCollection(
  blocks: JsonBlock[]
): Record<string, number> | null {
  let lastCollection: Record<string, number> | null = null;

  for (const [method, data] of blocks) {
    if (
      method === 'PlayerInventory.GetPlayerCardsV3' ||
      method === 'PlayerInventory_GetPlayerCardsV3'
    ) {
      const collection: Record<string, number> = {};
      let hasEntries = false;

      for (const [key, value] of Object.entries(data)) {
        if (/^\d+$/.test(key) && typeof value === 'number') {
          collection[key] = value;
          hasEntries = true;
        }
      }

      if (hasEntries) {
        lastCollection = collection;
      }
    }
  }

  return lastCollection;
}

// ── High-level API ───────────────────────────────────────────────────────────

/**
 * Parse an entire Arena Player.log file.
 * Returns extracted matches and collection data.
 */
export function parseArenaLogFile(logText: string): ArenaLogResult {
  const blocks = extractJsonBlocks(logText);
  const matches = extractMatches(blocks);
  const collection = extractCollection(blocks);
  return { matches, collection };
}

// ── Sample log for testing ───────────────────────────────────────────────────

export const SAMPLE_LOG = `
[UnityCrossThreadLogger]==> Event.DeckSubmitV3(12345): {"CourseDeck":{"mainDeck":[{"cardId":67890,"quantity":4},{"cardId":67891,"quantity":3}]}}
[UnityCrossThreadLogger]{"matchId":"match-001-test","gameStateMessage":{"turnInfo":{"turnNumber":1}}}
[UnityCrossThreadLogger]==> MatchComplete(12346): {"matchComplete":{"result":"ResultType_Win"}}
[UnityCrossThreadLogger]{"matchId":"match-002-test","gameStateMessage":{"turnInfo":{"turnNumber":5}}}
[UnityCrossThreadLogger]==> MatchComplete(12347): {"matchComplete":{"result":"ResultType_Loss"}}
`;

export const SAMPLE_COLLECTION_LOG = `
[UnityCrossThreadLogger]<== PlayerInventory.GetPlayerCardsV3(12348): {"67890": 4, "67891": 2, "12345": 1}
`;
