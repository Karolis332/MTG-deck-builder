/**
 * TypeScript port of scripts/arena_log_parser.py
 *
 * Parses MTG Arena Player.log files to extract:
 * - Match data (results, deck submissions, cards played)
 * - Collection data (PlayerInventory.GetPlayerCardsV3)
 *
 * Arena log format:
 *   ==> MethodName(requestId): {json}
 *   <== MethodName(requestId): {json}
 *   [UnityCrossThreadLogger]{json}
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
}

export type JsonBlock = [method: string, data: Record<string, unknown>];

export interface ArenaLogResult {
  matches: ArenaMatch[];
  collection: Record<string, number> | null;
}

// ── JSON Block Extraction ────────────────────────────────────────────────────

const JSON_LINE_PATTERN =
  /(?:==>|<==)\s+(\w+(?:\.\w+)*)\s*\([^)]*\)\s*:\s*(\{.*)/;

const STANDALONE_JSON = /\[UnityCrossThreadLogger\]\s*(\{.*)/;

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

    // Try method call pattern: ==> Method(id): {json}  or  <== Method(id): {json}
    const methodMatch = JSON_LINE_PATTERN.exec(line);
    if (methodMatch) {
      const method = methodMatch[1];
      const jsonStr = collectJson(methodMatch[2], lines, i + 1);
      try {
        const data = JSON.parse(jsonStr);
        blocks.push([method, data]);
      } catch {
        // malformed JSON, skip
      }
      i++;
      continue;
    }

    // Try standalone JSON: [UnityCrossThreadLogger]{json}
    const standaloneMatch = STANDALONE_JSON.exec(line);
    if (standaloneMatch) {
      const jsonStr = collectJson(standaloneMatch[1], lines, i + 1);
      try {
        const data = JSON.parse(jsonStr);
        blocks.push(['standalone', data]);
      } catch {
        // malformed JSON, skip
      }
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

interface MatchBuildInput {
  matchId: string;
  events: Record<string, unknown>[];
  deck: DeckCard[] | null;
  playerName: string | null;
}

function buildMatch(input: MatchBuildInput): ArenaMatch | null {
  const { matchId, events, deck, playerName } = input;
  let result: 'win' | 'loss' | 'draw' | null = null;
  let turns = 0;
  const cardsPlayed = new Set<string>();
  const opponentCards = new Set<string>();

  for (const event of events) {
    // Extract result from match complete
    if ('_matchComplete' in event) {
      const mc = event._matchComplete as Record<string, unknown>;
      const resultStr = (mc.result ?? mc.matchResult ?? '') as string;
      if (typeof resultStr === 'string') {
        if (resultStr.includes('Win') || resultStr === 'ResultType_Win') {
          result = 'win';
        } else if (resultStr.includes('Loss') || resultStr === 'ResultType_Loss') {
          result = 'loss';
        } else if (resultStr.includes('Draw')) {
          result = 'draw';
        }
      }
    }

    // Extract game state info
    if ('gameStateMessage' in event) {
      const gsm = event.gameStateMessage as Record<string, unknown>;
      const turnInfo = gsm.turnInfo as Record<string, unknown> | undefined;
      const t = (turnInfo?.turnNumber as number) || 0;
      if (t > turns) turns = t;
    }

    // Extract cards played from game objects
    if ('type' in event && event.type === 'GREMessageType_GameStateMessage') {
      const gsm = (event.gameStateMessage ?? {}) as Record<string, unknown>;
      const gameObjects = (gsm.gameObjects ?? []) as Array<Record<string, unknown>>;
      for (const go of gameObjects) {
        const grpId = go.grpId as number | undefined;
        if (!grpId) continue;
        if (go.ownerSeatId === 1) {
          cardsPlayed.add(String(grpId));
        } else if (go.ownerSeatId === 2) {
          opponentCards.add(String(grpId));
        }
      }
    }
  }

  if (!result) return null;

  return {
    matchId,
    playerName,
    opponentName: null,
    result,
    format: null,
    turns,
    deckCards: deck,
    cardsPlayed: Array.from(cardsPlayed),
    opponentCardsSeen: Array.from(opponentCards),
  };
}

/**
 * Extract matches from parsed JSON blocks using a state machine.
 */
export function extractMatches(blocks: JsonBlock[]): ArenaMatch[] {
  const matches: ArenaMatch[] = [];
  let currentDeck: DeckCard[] | null = null;
  let currentMatchId: string | null = null;
  let currentEvents: Record<string, unknown>[] = [];
  let playerName: string | null = null;

  for (const [method, data] of blocks) {
    // Detect player name
    if ('screenName' in data && typeof data.screenName === 'string') {
      playerName = data.screenName;
    } else if ('playerName' in data && typeof data.playerName === 'string') {
      playerName = data.playerName;
    }

    // Deck submission
    if (['Event.DeckSubmitV3', 'DeckSubmit', 'DeckSubmitV3'].includes(method)) {
      const deckData = (data.CourseDeck ?? data) as Record<string, unknown>;
      const mainDeck = (deckData.mainDeck ?? deckData.MainDeck ?? []) as unknown[];
      currentDeck = [];
      for (const entry of mainDeck) {
        if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>;
          const cardId = String(e.cardId ?? e.Id ?? '');
          const qty = (e.quantity ?? e.Quantity ?? 1) as number;
          currentDeck.push({ id: cardId, qty });
        } else if (typeof entry === 'number') {
          currentDeck.push({ id: String(entry), qty: 1 });
        }
      }
    }

    // Match start — new matchId detected
    if ('matchId' in data && currentMatchId !== data.matchId) {
      // Save previous match if exists
      if (currentMatchId && currentEvents.length > 0) {
        const match = buildMatch({
          matchId: currentMatchId,
          events: currentEvents,
          deck: currentDeck,
          playerName,
        });
        if (match) matches.push(match);
      }
      currentMatchId = data.matchId as string;
      currentEvents = [];
    }

    // Collect game events
    if ('greToClientEvent' in data) {
      const gre = data.greToClientEvent as Record<string, unknown>;
      const messages = (gre.greToClientMessages ?? []) as Record<string, unknown>[];
      currentEvents.push(...messages);
    } else if ('gameStateMessage' in data) {
      currentEvents.push(data as Record<string, unknown>);
    }

    // Match complete
    if (
      ['MatchComplete', 'Event.MatchComplete'].includes(method) ||
      'matchComplete' in data
    ) {
      const resultData = (data.matchComplete ?? data) as Record<string, unknown>;
      if (currentMatchId) {
        currentEvents.push({ _matchComplete: resultData });
        const match = buildMatch({
          matchId: currentMatchId,
          events: currentEvents,
          deck: currentDeck,
          playerName,
        });
        if (match) matches.push(match);
        currentMatchId = null;
        currentEvents = [];
      }
    }
  }

  // Handle last match
  if (currentMatchId && currentEvents.length > 0) {
    const match = buildMatch({
      matchId: currentMatchId,
      events: currentEvents,
      deck: currentDeck,
      playerName,
    });
    if (match) matches.push(match);
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
    // The collection response comes from PlayerInventory.GetPlayerCardsV3
    if (
      method === 'PlayerInventory.GetPlayerCardsV3' ||
      method === 'PlayerInventory_GetPlayerCardsV3'
    ) {
      // The response payload is { "arena_id_int": qty, ... }
      // Keys are string representations of arena IDs, values are quantities
      const collection: Record<string, number> = {};
      let hasEntries = false;

      for (const [key, value] of Object.entries(data)) {
        // Keys should be numeric strings, values should be numbers
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
