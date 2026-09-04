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

export type JsonBlock = [method: string, data: Record<string, unknown>];

export interface ArenaLogResult {
  matches: ArenaMatch[];
  collection: Record<string, number> | null;
  /** Screen name from the last authenticateResponse in the text, if any. */
  screenName: string | null;
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

// GRE header prefix carries the local account id: "[UnityCrossThreadLogger]<ts>: Match to <userId>: X"
// or "<userId> to Match: X" (17Lands MATCH_ACCOUNT_INFO_REGEX). Emitted as a synthetic block.
const MATCH_ACCOUNT = /: (?:Match to (\w+)|(\w+) to Match):/;

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
  let lastUserId: string | null = null;

  while (i < lines.length) {
    const line = lines[i];

    const acct = MATCH_ACCOUNT.exec(line);
    if (acct) {
      const userId = acct[1] ?? acct[2];
      if (userId && userId !== lastUserId) {
        lastUserId = userId;
        blocks.push(['standalone', { matchAccountUserId: userId }]);
      }
      i++;
      continue;
    }

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

// ── Match extraction (shared by full parse, watcher and reparse) ─────────────
// Field contract: orchestration/desktop-overhaul-2026-09/spec.md §1.5.

// ── Types ────────────────────────────────────────────────────────────────────

export type FormatNormalized =
  | 'standard' | 'alchemy' | 'historic' | 'explorer' | 'timeless'
  | 'brawl' | 'competitivebrawl' | 'standardbrawl'
  | 'draft' | 'sealed' | 'other';

export type MatchResult = 'win' | 'loss' | 'draw';

export interface GameResult {
  game: number;
  winningTeamId: number | null;
  winnerSeat: number | null;
  result: MatchResult;
  reason: string | null;
  turns: number;
}

/** How the local player's seat was established — `assumed_seat1` is a guess. */
export type IdentitySource = 'user_id' | 'screen_name' | 'gre_seat' | 'assumed_seat1';

export interface ArenaMatch {
  matchId: string;
  playerName: string | null;
  opponentName: string | null;
  result: MatchResult;
  /** Raw Arena eventId (existing column `format`; kept as-is). */
  format: string | null;
  turns: number;
  deckCards: Array<{ id: string; qty: number }> | null;
  cardsPlayed: string[];
  opponentCardsSeen: string[];
  cardsPlayedByTurn: Record<number, string[]>;
  commanderCastTurns: number[];
  landsPlayedByTurn: Record<number, string[]>;
  // ── §1.5 contract fields ──
  playerScreenName: string | null;
  playerSeat: number | null;
  winnerSeat: number | null;
  queueRaw: string | null;
  formatNormalized: FormatNormalized;
  gameResults: GameResult[];
  durationSeconds: number | null;
  /** ISO start time from the room event wrapper timestamp (epoch ms). */
  startedAt: string | null;
  /** Command-zone card grpIds by owner (resolved to names at the API layer). */
  playerCommanderGrpIds: string[];
  opponentCommanderGrpIds: string[];
  identitySource: IdentitySource;
  /** Reduced block sequence sufficient to re-derive every field above. */
  rawEvents: JsonBlock[];
}

export interface MatchExtractOptions {
  /** Known local screen name (watcher persists it across buffer clears). */
  screenName?: string | null;
}

interface ReservedPlayer {
  userId: string | null;
  playerName: string | null;
  systemSeatId: number | null;
  teamId: number | null;
  eventId: string | null;
}

// ── Queue → format ───────────────────────────────────────────────────────────

// docs/RESEARCH_ARENA_LOGS_2026-09-04.md §5 — order matters, first match wins, case-insensitive.
const QUEUE_TABLE: Array<[RegExp, FormatNormalized]> = [
  [/^Brawl_Ladder$/i, 'competitivebrawl'], // [UNCERTAIN 0.85: ranked Brawl queue name inferred from launch timing]
  [/^(Play_)?Brawl(_Historic)?$|^Historic[ _]?Brawl|Brawl_Challenge|^Brawl$|DirectGameBrawl/i, 'brawl'], // +DirectGameBrawl: 13 live rows, rule 11 would mis-file them
  [/Standard_?Brawl|^Play_Brawl_Standard/i, 'standardbrawl'],
  [/^(Traditional_)?Ladder$|^Play$|^Traditional_Play$|^Constructed_(Event|BestOf[13])|Standard/i, 'standard'],
  [/Alchemy/i, 'alchemy'],
  [/^(Traditional_)?Historic_Ladder$|^Historic_Play|^Historic(?!.*Brawl)/i, 'historic'],
  [/Explorer/i, 'explorer'],
  [/Timeless/i, 'timeless'],
  [/^(Quick|Premier|PickTwo|Trad(itional)?|Cube|Arena)?Draft_|_Draft(_|$)|Draft/i, 'draft'],
  [/Sealed|ArenaDirect.*Sealed|Jump_?In|JumpIn/i, 'sealed'],
  [/Midweek|Sparky|Precon|ColorChallenge|DirectGame|NPE|Bot/i, 'other'],
];

export function normalizeQueue(eventId: string | null | undefined, variant?: string | null): FormatNormalized {
  let fmt: FormatNormalized = 'other';
  if (eventId) {
    for (const [re, f] of QUEUE_TABLE) if (re.test(eventId)) { fmt = f; break; }
  }
  // Cross-check: a Brawl game variant whose queue name matched no Brawl rule is still Brawl.
  if (variant === 'GameVariant_Brawl' && !isBrawlFormat(fmt)) return 'brawl';
  return fmt;
}

export function isBrawlFormat(fmt: FormatNormalized): boolean {
  return fmt === 'brawl' || fmt === 'competitivebrawl' || fmt === 'standardbrawl';
}

// ── Identity ─────────────────────────────────────────────────────────────────

function readReservedPlayers(config: Record<string, unknown>): ReservedPlayer[] {
  const list = (config.reservedPlayers ?? []) as Array<Record<string, unknown>>;
  return list.map((rp) => ({
    userId: typeof rp.userId === 'string' ? rp.userId : null,
    playerName: typeof rp.playerName === 'string' ? rp.playerName : null,
    systemSeatId: typeof rp.systemSeatId === 'number' ? rp.systemSeatId : null,
    teamId: typeof rp.teamId === 'number' ? rp.teamId : null,
    eventId: typeof rp.eventId === 'string' ? rp.eventId : null,
  }));
}

export interface PlayerIdentity {
  player: ReservedPlayer | null;
  opponent: ReservedPlayer | null;
  source: IdentitySource;
}

/**
 * Pick the local player among reservedPlayers. Order: account userId (log header /
 * authenticateResponse.clientId) → screen name → GRE seat hint (single-recipient
 * `systemSeatIds`) → seat 1 (flagged as a guess).
 * Shared with arena-game-events.ts so the overlay and history agree.
 */
export function identifyPlayer(
  reserved: Array<Record<string, unknown>>,
  screenName: string | null | undefined,
  localSeatHint: number | null | undefined,
  userId?: string | null,
): PlayerIdentity {
  const players = readReservedPlayers({ reservedPlayers: reserved });
  const pick = (p: ReservedPlayer | undefined, source: IdentitySource): PlayerIdentity | null =>
    p ? { player: p, opponent: players.find((o) => o !== p) ?? null, source } : null;

  if (userId) {
    const byId = pick(players.find((p) => p.userId === userId), 'user_id');
    if (byId) return byId;
  }
  if (screenName) {
    const byName = pick(players.find((p) => p.playerName === screenName), 'screen_name');
    if (byName) return byName;
  }
  if (localSeatHint != null) {
    const bySeat = pick(players.find((p) => p.systemSeatId === localSeatHint), 'gre_seat');
    if (bySeat) return bySeat;
  }
  return pick(players.find((p) => p.systemSeatId === 1) ?? players[0], 'assumed_seat1')
    ?? { player: null, opponent: null, source: 'assumed_seat1' };
}

// ── Internal context ─────────────────────────────────────────────────────────

interface Ctx {
  matchId: string;
  reserved: ReservedPlayer[];
  identity: PlayerIdentity;
  localSeatHint: number | null;
  format: string | null;
  variant: string | null;
  deck: Array<{ id: string; qty: number }> | null;
  turns: number;
  currentGame: number;
  gameTurns: Map<number, number>;
  gameResults: Map<number, GameResult>;
  cardsPlayed: Set<string>;
  opponentCards: Set<string>;
  result: MatchResult | null;
  winningTeamId: number | null;
  cardsPlayedByTurn: Map<number, Set<string>>;
  commanderGrpIds: Set<string>;
  commanderCastTurns: number[];
  landsPlayedByTurn: Map<number, Set<string>>;
  currentTurn: number;
  prevZones: Map<number, string>;
  commandZoneIds: Set<number>;
  commandersBySeat: Map<number, Set<string>>;
  startMs: number | null;
  endMs: number | null;
  raw: JsonBlock[];
}

function newCtx(matchId: string, reserved: ReservedPlayer[], identity: PlayerIdentity): Ctx {
  return {
    matchId, reserved, identity, localSeatHint: null,
    format: identity.player?.eventId ?? reserved[0]?.eventId ?? null,
    variant: null,
    deck: null, turns: 0, currentGame: 1,
    gameTurns: new Map(), gameResults: new Map(),
    cardsPlayed: new Set(), opponentCards: new Set(),
    result: null, winningTeamId: null,
    cardsPlayedByTurn: new Map(), commanderGrpIds: new Set(), commanderCastTurns: [],
    landsPlayedByTurn: new Map(), currentTurn: 0, prevZones: new Map(),
    commandZoneIds: new Set(), commandersBySeat: new Map(),
    startMs: null, endMs: null, raw: [],
  };
}

function mapToRecord(map: Map<number, Set<string>>): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  map.forEach((set, turn) => { out[turn] = Array.from(set); });
  return out;
}

/** Wrapper `timestamp` is epoch ms on room/GRE events, .NET ticks on auth — accept only ms. */
function epochMs(data: Record<string, unknown>): number | null {
  const raw = data.timestamp;
  const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 1e12 && n < 1e13 ? n : null;
}

function seatOfTeam(ctx: Ctx, teamId: number | null): number | null {
  if (teamId == null) return null;
  return ctx.reserved.find((p) => p.teamId === teamId)?.systemSeatId ?? null;
}

function resultForTeam(ctx: Ctx, resultType: string | undefined, winningTeamId: number | null): MatchResult {
  if (resultType === 'ResultType_Draw' || winningTeamId == null) return 'draw';
  return winningTeamId === ctx.identity.player?.teamId ? 'win' : 'loss';
}

function finalize(ctx: Ctx): ArenaMatch {
  const fmt = normalizeQueue(ctx.format, ctx.variant);
  const pSeat = ctx.identity.player?.systemSeatId ?? null;
  const oSeat = ctx.identity.opponent?.systemSeatId ?? null;
  const cmd = (seat: number | null) =>
    seat != null && isBrawlFormat(fmt) ? Array.from(ctx.commandersBySeat.get(seat) ?? []) : [];
  return {
    matchId: ctx.matchId,
    playerName: ctx.identity.player?.playerName ?? null,
    opponentName: ctx.identity.opponent?.playerName ?? null,
    result: ctx.result!,
    format: ctx.format,
    turns: ctx.turns,
    deckCards: ctx.deck,
    cardsPlayed: Array.from(ctx.cardsPlayed),
    opponentCardsSeen: Array.from(ctx.opponentCards),
    cardsPlayedByTurn: mapToRecord(ctx.cardsPlayedByTurn),
    commanderCastTurns: [...ctx.commanderCastTurns],
    landsPlayedByTurn: mapToRecord(ctx.landsPlayedByTurn),
    playerScreenName: ctx.identity.player?.playerName ?? null,
    playerSeat: ctx.identity.source === 'assumed_seat1' ? null : pSeat,
    winnerSeat: seatOfTeam(ctx, ctx.winningTeamId),
    queueRaw: ctx.format,
    formatNormalized: fmt,
    gameResults: Array.from(ctx.gameResults.values()).sort((a, b) => a.game - b.game),
    durationSeconds: ctx.startMs != null && ctx.endMs != null && ctx.endMs >= ctx.startMs
      ? Math.round((ctx.endMs - ctx.startMs) / 1000) : null,
    startedAt: ctx.startMs != null ? new Date(ctx.startMs).toISOString() : null,
    playerCommanderGrpIds: cmd(pSeat),
    opponentCommanderGrpIds: cmd(oSeat),
    identitySource: ctx.identity.source,
    rawEvents: ctx.raw,
  };
}

// ── Raw-event reduction ──────────────────────────────────────────────────────

function withTs(data: Record<string, unknown>, body: Record<string, unknown>): JsonBlock {
  const ts = epochMs(data);
  return ['standalone', ts != null ? { timestamp: String(ts), ...body } : body];
}

function reducedRoomBlock(data: Record<string, unknown>, roomInfo: Record<string, unknown>, config: Record<string, unknown>): JsonBlock {
  const reduced: Record<string, unknown> = {
    gameRoomConfig: { matchId: config.matchId, reservedPlayers: readReservedPlayers(config) },
    stateType: roomInfo.stateType,
  };
  if (roomInfo.finalMatchResult) reduced.finalMatchResult = roomInfo.finalMatchResult;
  return withTs(data, { matchGameRoomStateChangedEvent: { gameRoomInfo: reduced } });
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Extract completed matches from JSON blocks. Deterministic on the reduced
 * `rawEvents` it emits: `extractMatches(m.rawEvents)` reproduces every contract field.
 */
export function extractMatches(blocks: JsonBlock[], opts: MatchExtractOptions = {}): ArenaMatch[] {
  const matches: ArenaMatch[] = [];
  const seen = new Set<string>();
  let screenName: string | null = opts.screenName ?? null;
  let userId: string | null = null;
  let ctx: Ctx | null = null;

  const emit = (c: Ctx) => {
    if (c.result && !seen.has(c.matchId)) {
      seen.add(c.matchId);
      matches.push(finalize(c));
    }
  };

  for (const [method, data] of blocks) {
    if ('authenticateResponse' in data) {
      const auth = data.authenticateResponse as Record<string, unknown>;
      if (typeof auth.screenName === 'string') screenName = auth.screenName;
      if (typeof auth.clientId === 'string') userId = auth.clientId;
    }
    if (typeof data.screenName === 'string') screenName = data.screenName;
    if (typeof data.matchAccountUserId === 'string') userId = data.matchAccountUserId;

    if ('matchGameRoomStateChangedEvent' in data) {
      const event = data.matchGameRoomStateChangedEvent as Record<string, unknown>;
      const roomInfo = (event.gameRoomInfo ?? event) as Record<string, unknown>;
      const config = roomInfo.gameRoomConfig as Record<string, unknown> | undefined;
      const stateType = roomInfo.stateType as string | undefined;
      const matchId = config?.matchId as string | undefined;
      if (!config || !matchId) continue;

      if (ctx && ctx.matchId !== matchId) { emit(ctx); ctx = null; }
      if (!ctx) {
        const reserved = readReservedPlayers(config);
        ctx = newCtx(matchId, reserved, identifyPlayer(reserved as unknown as Array<Record<string, unknown>>, screenName, null, userId));
        ctx.raw.push(['standalone', { authenticateResponse: { screenName, clientId: userId } }]);
      }
      ctx.raw.push(reducedRoomBlock(data, roomInfo, config));
      const ts = epochMs(data);
      if (ts != null && ctx.startMs == null) ctx.startMs = ts;

      const finalResult = roomInfo.finalMatchResult as Record<string, unknown> | undefined;
      if (finalResult && stateType === 'MatchGameRoomStateType_MatchCompleted') {
        if (ts != null) ctx.endMs = ts;
        applyResults(ctx, (finalResult.resultList ?? []) as Array<Record<string, unknown>>, ctx.currentGame);
        emit(ctx);
        ctx = null;
        continue;
      }
    }

    if (!ctx) continue;

    if ('greToClientEvent' in data) {
      const gre = data.greToClientEvent as Record<string, unknown>;
      const messages = (gre.greToClientMessages ?? []) as Array<Record<string, unknown>>;
      const keptMessages: Array<Record<string, unknown>> = [];
      for (const msg of messages) {
        const kept = processGreMessage(ctx, msg);
        if (kept) keptMessages.push(kept);
      }
      // A single-recipient GRE seat corrects an identity that was only a seat-1 guess.
      if (ctx.identity.source === 'assumed_seat1' && ctx.localSeatHint != null) {
        ctx.identity = identifyPlayer(ctx.reserved as unknown as Array<Record<string, unknown>>, screenName, ctx.localSeatHint, userId);
        ctx.format = ctx.identity.player?.eventId ?? ctx.format;
      }
      if (keptMessages.length) {
        ctx.raw.push(withTs(data, { greToClientEvent: { greToClientMessages: keptMessages } }));
      }
    }

    if (/^EventSetDeckV\d+$/.test(method) || ['Event.DeckSubmitV3', 'DeckSubmit', 'DeckSubmitV3'].includes(method)) {
      const deck = parseDeckSubmission(method, data);
      if (deck.length > 0) ctx.deck = deck;
    }

    if (['MatchComplete', 'Event.MatchComplete'].includes(method) || 'matchComplete' in data) {
      const mc = (data.matchComplete ?? data) as Record<string, unknown>;
      const resultStr = String(mc.result ?? mc.matchResult ?? '');
      if (!ctx.result) {
        if (resultStr.includes('Win')) ctx.result = 'win';
        else if (resultStr.includes('Loss')) ctx.result = 'loss';
        else if (resultStr.includes('Draw')) ctx.result = 'draw';
      }
      if (ctx.result) ctx.raw.push([method, { matchComplete: { result: resultStr } }]);
    }
  }

  if (ctx) emit(ctx);
  return matches;
}

function applyResults(ctx: Ctx, list: Array<Record<string, unknown>>, gameNumber: number): void {
  for (const r of list) {
    const winningTeamId = typeof r.winningTeamId === 'number' ? r.winningTeamId : null;
    const resultType = r.result as string | undefined;
    const reason = typeof r.reason === 'string' ? r.reason : null;
    if (r.scope === 'MatchScope_Game') {
      ctx.gameResults.set(gameNumber, {
        game: gameNumber,
        winningTeamId,
        winnerSeat: seatOfTeam(ctx, winningTeamId),
        result: resultForTeam(ctx, resultType, winningTeamId),
        reason,
        turns: ctx.gameTurns.get(gameNumber) ?? 0,
      });
    } else if (r.scope === 'MatchScope_Match') {
      ctx.winningTeamId = winningTeamId;
      ctx.result = resultForTeam(ctx, resultType, winningTeamId);
    }
  }
  // Single-game match reported only at MatchScope_Match: mirror it as game 1.
  if (ctx.result && ctx.gameResults.size === 0) {
    ctx.gameResults.set(gameNumber, {
      game: gameNumber, winningTeamId: ctx.winningTeamId, winnerSeat: seatOfTeam(ctx, ctx.winningTeamId),
      result: ctx.result, reason: null, turns: ctx.gameTurns.get(gameNumber) ?? 0,
    });
  }
}

/** Returns a reduced copy of the message when it carried something derivable, else null. */
function processGreMessage(ctx: Ctx, msg: Record<string, unknown>): Record<string, unknown> | null {
  const seats = msg.systemSeatIds as number[] | undefined;
  const kept: Record<string, unknown> = {};
  if (Array.isArray(seats) && seats.length === 1 && typeof seats[0] === 'number' && ctx.localSeatHint == null) {
    ctx.localSeatHint = seats[0];
    kept.systemSeatIds = seats;
  }

  if (msg.connectResp) {
    const resp = msg.connectResp as Record<string, unknown>;
    const deckMsg = resp.deckMessage as Record<string, unknown> | undefined;
    if (deckMsg) {
      const deckCards = (deckMsg.deckCards ?? []) as number[];
      const commanderCards = (deckMsg.commanderCards ?? []) as number[];
      const counts = new Map<number, number>();
      for (const cid of [...deckCards, ...commanderCards]) counts.set(cid, (counts.get(cid) || 0) + 1);
      ctx.deck = Array.from(counts.entries()).map(([id, qty]) => ({ id: String(id), qty }));
      for (const cid of commanderCards) ctx.commanderGrpIds.add(String(cid));
      kept.connectResp = { deckMessage: { deckCards, commanderCards } };
      if (seats) kept.systemSeatIds = seats;
    }
  }

  const gsm = msg.gameStateMessage as Record<string, unknown> | undefined;
  if (gsm) {
    const keptGsm: Record<string, unknown> = {};
    const gameInfo = gsm.gameInfo as Record<string, unknown> | undefined;
    if (gameInfo) {
      const gn = typeof gameInfo.gameNumber === 'number' ? gameInfo.gameNumber : ctx.currentGame;
      if (gn !== ctx.currentGame) { ctx.currentGame = gn; ctx.currentTurn = 0; }
      if (typeof gameInfo.variant === 'string' && !ctx.variant) { ctx.variant = gameInfo.variant; }
      const results = gameInfo.results as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(results) && results.length > 0) {
        // Game-scope results are per-game truth; match-scope is the backup for a missing room event.
        applyResults(ctx, results.filter((r) => r.scope === 'MatchScope_Game'), gn);
        if (gameInfo.matchState === 'MatchState_MatchComplete') {
          applyResults(ctx, results.filter((r) => r.scope === 'MatchScope_Match'), gn);
        }
        keptGsm.gameInfo = { gameNumber: gn, matchState: gameInfo.matchState, results };
      } else if (typeof gameInfo.gameNumber === 'number') {
        keptGsm.gameInfo = { gameNumber: gn, matchState: gameInfo.matchState };
      }
    }

    const turnInfo = gsm.turnInfo as Record<string, unknown> | undefined;
    let t = typeof turnInfo?.turnNumber === 'number' ? turnInfo.turnNumber : 0;
    // Game-end Diff messages omit turnInfo; players[].turnNumber (turns taken per seat) sums to the game turn.
    const players = gsm.players as Array<Record<string, unknown>> | undefined;
    if (t === 0 && Array.isArray(players) && players.length > 0) {
      t = players.reduce((sum, pl) => sum + (typeof pl.turnNumber === 'number' ? pl.turnNumber : 0), 0);
      if (t < ctx.currentTurn) t = 0;
    }
    if (t > 0 && t !== ctx.currentTurn) {
      ctx.currentTurn = t;
      ctx.turns = t;
      ctx.gameTurns.set(ctx.currentGame, Math.max(ctx.gameTurns.get(ctx.currentGame) ?? 0, t));
      keptGsm.turnInfo = { turnNumber: t };
      if (ctx.variant) keptGsm.gameInfo = { ...(keptGsm.gameInfo as Record<string, unknown> | undefined), gameNumber: ctx.currentGame, variant: ctx.variant };
    }

    const zones = (gsm.zones ?? []) as Array<Record<string, unknown>>;
    for (const z of zones) {
      if (z.type === 'ZoneType_Command' && typeof z.zoneId === 'number') ctx.commandZoneIds.add(z.zoneId);
    }

    const keptObjects: Array<Record<string, unknown>> = [];
    const gameObjects = (gsm.gameObjects ?? []) as Array<Record<string, unknown>>;
    const pSeat = ctx.identity.player?.systemSeatId ?? ctx.localSeatHint ?? 1;
    for (const go of gameObjects) {
      const grpId = go.grpId as number | undefined;
      if (!grpId) continue;
      const grpStr = String(grpId);
      const owner = go.ownerSeatId as number | undefined;
      const zoneId = go.zoneId as number | undefined;

      if (zoneId != null && ctx.commandZoneIds.has(zoneId) && owner != null
        && (go.type === 'GameObjectType_Card' || go.type == null)) {
        const set = ctx.commandersBySeat.get(owner) ?? new Set<string>();
        if (!set.has(grpStr)) {
          set.add(grpStr);
          ctx.commandersBySeat.set(owner, set);
          keptObjects.push({ grpId, ownerSeatId: owner, zoneId, type: go.type ?? 'GameObjectType_Card' });
        }
      }

      if (owner === pSeat) {
        ctx.cardsPlayed.add(grpStr);
        trackPlayerObject(ctx, go, grpStr);
      } else {
        ctx.opponentCards.add(grpStr);
      }
    }
    if (keptObjects.length) {
      keptGsm.zones = Array.from(ctx.commandZoneIds).map((zoneId) => ({ zoneId, type: 'ZoneType_Command' }));
      keptGsm.gameObjects = keptObjects;
    }
    if (Object.keys(keptGsm).length) kept.gameStateMessage = keptGsm;
  }

  return Object.keys(kept).length ? kept : null;
}

function trackPlayerObject(ctx: Ctx, go: Record<string, unknown>, grpStr: string): void {
  const instanceId = go.instanceId as number | undefined;
  const zoneId = go.zoneId as number | undefined;
  const turn = ctx.currentTurn;
  if (turn > 0 && instanceId && zoneId) {
    const prevZone = ctx.prevZones.get(instanceId);
    const currZone = String(zoneId);
    if (prevZone && prevZone !== currZone) {
      if (!ctx.cardsPlayedByTurn.has(turn)) ctx.cardsPlayedByTurn.set(turn, new Set());
      ctx.cardsPlayedByTurn.get(turn)!.add(grpStr);
      if (ctx.commanderGrpIds.has(grpStr)) ctx.commanderCastTurns.push(turn);
    }
    ctx.prevZones.set(instanceId, currZone);
  }
  const cardTypes = go.cardTypes;
  const isLand = (typeof go.type === 'string' && go.type.includes('Land'))
    || (typeof cardTypes === 'string' && cardTypes.includes('Land'))
    || (Array.isArray(cardTypes) && cardTypes.includes('CardType_Land'));
  if (isLand) {
    if (!ctx.landsPlayedByTurn.has(turn)) ctx.landsPlayedByTurn.set(turn, new Set());
    ctx.landsPlayedByTurn.get(turn)!.add(grpStr);
  }
}

function parseDeckSubmission(method: string, data: Record<string, unknown>): Array<{ id: string; qty: number }> {
  const req = (data._parsed_request ?? data) as Record<string, unknown>;
  const deckData = (req.Deck ?? req.deck ?? req.CourseDeck ?? req) as Record<string, unknown>;
  const mainDeck = (deckData.MainDeck ?? deckData.mainDeck ?? []) as unknown[];
  const cmdZone = /^EventSetDeckV\d+$/.test(method) ? ((deckData.CommandZone ?? deckData.commandZone ?? []) as unknown[]) : [];
  const deck: Array<{ id: string; qty: number }> = [];
  const push = (entry: unknown, forceQty?: number) => {
    if (typeof entry === 'object' && entry !== null) {
      const e = entry as Record<string, unknown>;
      deck.push({ id: String(e.cardId ?? e.Id ?? ''), qty: forceQty ?? ((e.quantity ?? e.Quantity ?? 1) as number) });
    } else if (typeof entry === 'number') {
      deck.push({ id: String(entry), qty: 1 });
    }
  };
  for (const e of mainDeck) push(e);
  for (const e of cmdZone) push(e, 1);
  return deck;
}

// ── Legacy row derivation (rows stored before raw_events existed) ────────────

export interface LegacyRow {
  player_name: string | null;
  opponent_name: string | null;
  result: string | null;
  format: string | null;
}

export interface LegacyDerived {
  playerName: string | null;
  opponentName: string | null;
  result: string | null;
  playerScreenName: string | null;
  queueRaw: string | null;
  formatNormalized: FormatNormalized;
  swapped: boolean;
}

/**
 * The old parser fell back to "seat 1 is me" when the screen name was unknown, which put
 * the local player in `opponent_name` and inverted `result` (verified on match
 * 8476a579: QuLeR seat 2, winningTeamId 2, stored 'loss'). With no raw events the
 * only recoverable fix is the swap + flip; `turns` stays as stored.
 */
export function deriveLegacyFields(row: LegacyRow, screenName: string | null): LegacyDerived {
  const swapped = !!screenName && row.opponent_name === screenName && row.player_name !== screenName;
  const flip = (r: string | null) => (r === 'win' ? 'loss' : r === 'loss' ? 'win' : r);
  return {
    playerName: swapped ? row.opponent_name : row.player_name,
    opponentName: swapped ? row.player_name : row.opponent_name,
    result: swapped ? flip(row.result) : row.result,
    playerScreenName: screenName ?? (swapped ? row.opponent_name : row.player_name),
    queueRaw: row.format,
    formatNormalized: normalizeQueue(row.format),
    swapped,
  };
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
export function parseArenaLogFile(logText: string, opts: MatchExtractOptions = {}): ArenaLogResult {
  const blocks = extractJsonBlocks(logText);
  const matches = extractMatches(blocks, opts);
  const collection = extractCollection(blocks);
  return { matches, collection, screenName: findScreenName(blocks) ?? opts.screenName ?? null };
}

/** Last authenticateResponse.screenName in the blocks, or null. */
export function findScreenName(blocks: JsonBlock[]): string | null {
  let name: string | null = null;
  for (const [, data] of blocks) {
    const auth = data.authenticateResponse as Record<string, unknown> | undefined;
    if (auth && typeof auth.screenName === 'string') name = auth.screenName;
  }
  return name;
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
