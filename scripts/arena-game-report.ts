/**
 * Arena game consistency report — offline analyzer over archived Player.log files.
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/arena-game-report.ts \
 *     --commander "Tam, the Possibility" [--logs <dir>] [--out-dir <dir>] [--since YYYY-MM-DD]
 *
 * Reads every *.log in the logs dir, dedupes the same match/game seen in
 * several files, derives per-game consistency facts (mulligans, land drops,
 * colour screw, commander timing) via src/lib/arena-game-summary.ts, and
 * writes a per-commander .jsonl (raw facts) + .md (table + aggregates).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { getDb } from '../src/lib/db';
import { extractJsonBlocks, extractMatches, findScreenName, type ArenaMatch, type JsonBlock } from '../src/lib/arena-log-reader';
import { extractGameEventsWithContext, createContext, type ArenaGameEvent } from '../src/lib/arena-game-events';
import { deriveGameFacts, type DerivedGameFacts } from '../src/lib/arena-game-summary';

// ── CLI args ─────────────────────────────────────────────────────────────────

interface Args {
  commander: string | null;
  logsDir: string;
  outDir: string | null;
  since: string | null;
  arenaDb: string | null;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i > -1 ? argv[i + 1] ?? null : null;
  };
  const logsDir = get('--logs') ?? path.join(process.env.APPDATA ?? '', 'the-black-grimoire', 'data', 'arena-logs');
  return {
    commander: get('--commander'),
    logsDir,
    outDir: get('--out-dir'),
    since: get('--since'),
    arenaDb: get('--arena-db'),
  };
}

// ── MTGA client card database (local, no network) ──────────────────────────
// The client ships its own grpId -> name table that's always current (including
// cards the live app DB hasn't synced an arena_id for yet, e.g. a just-released
// set). We read it read-only for NAMES ONLY, then join that name back into the
// live DB for mana/type data.

const ARENA_DB_SEARCH_DIRS = [
  'C:/Program Files (x86)/Steam/steamapps/common/MTGA/MTGA_Data/Downloads/Raw',
  'C:/Program Files/Wizards of the Coast/MTGA/MTGA_Data/Downloads/Raw',
];

function findArenaClientDb(override: string | null): string | null {
  if (override) return fs.existsSync(override) ? override : null;
  for (const dir of ARENA_DB_SEARCH_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const candidates = fs.readdirSync(dir).filter((f) => /^Raw_CardDatabase_.*\.mtga$/.test(f));
    if (candidates.length === 0) continue;
    const newest = candidates
      .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0].f;
    return path.join(dir, newest).replace(/\\/g, '/');
  }
  return null;
}

/** grpId -> localized card name, stripped of any <...> markup tags. */
function loadArenaClientNames(dbPath: string): Map<number, string> {
  const clientDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const rows = clientDb
      .prepare(`SELECT c.GrpId AS grpId, l.Loc AS name FROM Cards c JOIN Localizations_enUS l ON l.LocId = c.TitleId`)
      .all() as Array<{ grpId: number; name: string | null }>;
    const names = new Map<number, string>();
    for (const row of rows) {
      // Several Loc rows can share a LocId (Formatted variants) — first one wins.
      if (names.has(row.grpId) || !row.name) continue;
      names.set(row.grpId, row.name.replace(/<[^>]*>/g, ''));
    }
    return names;
  } finally {
    clientDb.close();
  }
}

// ── Card resolution (read-only, no network) ─────────────────────────────────

export interface CardInfo {
  name: string;
  producedMana: string[];
  colorIdentity: string[];
  /** The card's own colour (WUBRG pips actually in its mana cost) — NOT colour identity,
   * which also picks up reminder-text/ability-text colours a permanent never pays with
   * (R3-2: Bloom Tender/Mox Amber need this, not colorIdentity). Empty for lands/colourless
   * permanents, which have no mana cost pips at all. */
  colors: string[];
  typeLine: string;
  manaCost: string | null;
  oracleText: string | null;
}

const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;
const WUBRG_SET = new Set<string>(WUBRG);

/** WUBRG pips appearing in a mana cost — a card's actual colour(s), hybrid/Phyrexian included. */
function manaCostColours(manaCost: string | null): string[] {
  if (!manaCost) return [];
  const colours = (manaCost.match(/\{[^}]+\}/g) ?? []).flatMap((sym) => sym.slice(1, -1).split('/'));
  return Array.from(new Set(colours.filter((c) => WUBRG_SET.has(c))));
}

// One-shot any-colour mana tokens (Treasure, etc). 'token' layout rows are excluded by
// CLEAN_ROWS, so the normal name/arena_id lookups never find these — short-circuit by name.
const ANY_COLOUR_TOKEN_NAMES = new Set(['Treasure']);

/**
 * Colour requirements a mana cost actually imposes, one entry per pip that
 * can't be paid without a specific colour. A hybrid/Phyrexian pip with a
 * generic alternative (e.g. "{2/W}") is NOT a colour requirement — it's
 * always payable with generic mana — so it's skipped entirely. A plain
 * hybrid pip ("{W/U}") requires ONE of its colours, so the pip is satisfied
 * if any of them is producible. A pure Phyrexian pip ("{B/P}") is ALSO not a
 * hard colour requirement — it's always payable with 2 life instead — so it's
 * skipped too (N8).
 */
export function manaCostColourPips(manaCost: string | null): string[][] {
  if (!manaCost) return [];
  const pips: string[][] = [];
  for (const symbol of manaCost.match(/\{[^}]+\}/g) ?? []) {
    const parts = symbol.slice(1, -1).split('/');
    if (parts.some((p) => /^\d+$/.test(p) || p === 'P')) continue; // generic or life alternative — always payable
    const colours = Array.from(new Set(parts.flatMap((p) => p.split('')).filter((c) => WUBRG_SET.has(c))));
    if (colours.length > 0) pips.push(colours);
  }
  return pips;
}

// ── Colour-source model (F6) ─────────────────────────────────────────────────
// produced_mana in the DB is a blunt "could tap for these colours" fact that doesn't
// model the condition several real cards attach to it. Rather than hand-roll a table
// per set, special-case the handful of named cards the deck actually plays, falling
// back to the DB's producedMana for everything else (regular lands/rocks, where the
// blunt fact already IS the truth).

/**
 * Each entry is ONE physical source (a land, rock, dork — anything that taps once) and
 * the set of colours it can choose between when it does. Needed instead of one merged
 * Set so pip-matching (isCardStuck) can require DISTINCT sources per pip: {G}{G} needs
 * two different green sources, not "is green producible at all" (round 6 decision).
 */
export interface ColourSources {
  /** Freely spendable on anything. */
  unrestricted: string[][];
  /** Interplanar Beacon — only pays for planeswalker spells. */
  walkerOnly: string[][];
  /** Great Hall of the Citadel — only pays for legendary spells. */
  legendaryOnly: string[][];
}

export function emptyColourSources(): ColourSources {
  return { unrestricted: [], walkerOnly: [], legendaryOnly: [] };
}

/**
 * Verge cycle (and anything shaped like it): "{T}: Add {X}." unconditional, plus one or
 * more further "{T}: Add {Y}. Activate only if you control a <Type> [or a <Type2>]."
 * lines. Parsed from oracle text instead of hardcoding names so any future Verge-shaped
 * land (or Bleachbone Verge, the one this deck actually runs) is covered the same way.
 */
export function parseConditionalManaLines(oracleText: string): Array<{ colour: string; requiresLandTypes: string[] | null }> {
  const out: Array<{ colour: string; requiresLandTypes: string[] | null }> = [];
  for (const line of oracleText.split('\n')) {
    const add = line.match(/^\{T\}: Add \{([WUBRG])\}\.(.*)$/);
    if (!add) continue;
    const cond = add[2].match(/Activate only if you control an? (\w+)(?: or an? (\w+))?/);
    out.push({ colour: add[1], requiresLandTypes: cond ? [cond[1], cond[2]].filter((x): x is string => !!x) : null });
  }
  return out;
}

/** Adds gid's colour contribution (if any) to `out`, given the rest of the board. */
export const BASIC_LAND_SUBTYPE_COLOUR: Record<string, string> = {
  SubType_Plains: 'W', SubType_Island: 'U', SubType_Swamp: 'B', SubType_Mountain: 'R', SubType_Forest: 'G',
};

type SourceBucket = keyof ColourSources;
type SourceEntry = { bucket: SourceBucket; colours: string[] };

/** One tap's worth of mana from one source: its WUBRG options (sorted, deduped) in a bucket. */
function oneSource(colours: Iterable<string>, bucket: SourceBucket = 'unrestricted'): SourceEntry[] {
  const options = Array.from(new Set(Array.from(colours).filter((c) => WUBRG_SET.has(c)))).sort();
  return options.length ? [{ bucket, colours: options }] : [];
}

/**
 * The colour options ONE physical source offers when tapped. Usually one entry; a source
 * that taps for several mana at once (Bloom Tender) yields one entry per mana.
 */
function sourceEntries(
  gid: number,
  info: CardInfo,
  battlefieldInfos: Array<{ gid: number; info: CardInfo }>,
  openingHandSet: Set<number>,
  onPlay: boolean | null,
  commanderColourIdentity: string[],
  subtypesByGrpId: Record<number, string[]>,
): SourceEntry[] {
  const hasUrborg = battlefieldInfos.some((b) => b.info.name === 'Urborg, Tomb of Yawgmoth');
  const controlsLandType = (type: string) =>
    battlefieldInfos.some((b) => b.info.typeLine.includes(type)) ||
    (type === 'Swamp' && hasUrborg && battlefieldInfos.some((b) => b.info.typeLine.includes('Land')));

  switch (info.name) {
    case 'Interplanar Beacon':
      return oneSource(WUBRG, 'walkerOnly');
    case 'Great Hall of the Citadel':
      return oneSource(WUBRG, 'legendaryOnly');
    case 'Gemstone Caverns':
      // Only gets its luck counter if it started in the opening hand of a non-starting
      // player; otherwise it just taps for {C}, which contributes no WUBRG colour.
      return openingHandSet.has(gid) && onPlay === false ? oneSource(WUBRG) : [];
    case 'Mox Amber':
      return oneSource(
        battlefieldInfos
          .filter((b) => b.gid !== gid && /Legendary/.test(b.info.typeLine) && /Creature|Planeswalker/.test(b.info.typeLine))
          .flatMap((b) => b.info.colorIdentity),
      );
    case 'Command Tower':
      return oneSource(commanderColourIdentity);
    case 'Multiversal Passage':
      // N6: Arena reports the chosen basic land type on the object itself once it's
      // picked (GameObjectInfo.subtypes, e.g. ["SubType_Island"]) — read that instead
      // of guessing. Falls back to no colour (not a guessed one) if it's unseen.
      return oneSource((subtypesByGrpId[gid] ?? []).map((st) => BASIC_LAND_SUBTYPE_COLOUR[st]).filter(Boolean));
  }

  // Bloom Tender / Faeburrow Elder and kin (N1): "For each color among permanents you
  // control, add one mana of that color" — NOT the WUBRG the DB's produced_mana claims.
  // Detected from oracle text (not a name list) so any future card worded the same way
  // is covered. Counts itself (it IS one of "permanents you control"). One mana per
  // colour, so one single-colour entry per colour.
  if (info.oracleText && /for each color among permanents you control, add one mana of that color/i.test(info.oracleText)) {
    return battlefieldInfos.flatMap((b) => b.info.colorIdentity).flatMap((c) => oneSource([c]))
      .filter((e, i, all) => all.findIndex((o) => o.colours[0] === e.colours[0]) === i)
      .sort((a, b) => a.colours[0].localeCompare(b.colours[0]));
  }

  const conditional = info.oracleText ? parseConditionalManaLines(info.oracleText) : [];
  if (conditional.some((p) => p.requiresLandTypes)) {
    return oneSource(
      conditional.filter((p) => !p.requiresLandTypes || p.requiresLandTypes.some((t) => controlsLandType(t))).map((p) => p.colour),
    );
  }

  // N8: produced_mana can include "C" (colourless) alongside WUBRG (e.g. Interplanar
  // Beacon) — colourless isn't a colour and must never satisfy a colour pip or show up
  // in a colour string. oneSource drops it.
  return oneSource(info.producedMana);
}

export function addColourSources(
  gid: number,
  info: CardInfo,
  battlefieldInfos: Array<{ gid: number; info: CardInfo }>,
  openingHandSet: Set<number>,
  onPlay: boolean | null,
  commanderColourIdentity: string[],
  out: ColourSources,
  subtypesByGrpId: Record<number, string[]> = {},
): void {
  for (const { bucket, colours } of sourceEntries(gid, info, battlefieldInfos, openingHandSet, onPlay, commanderColourIdentity, subtypesByGrpId)) {
    out[bucket].push(colours);
  }
}

/** Every colour any source in `sources` can make, flat and sorted (for display). */
export function allColours(sources: ColourSources): string[] {
  return Array.from(new Set([...sources.unrestricted, ...sources.walkerOnly, ...sources.legendaryOnly].flat())).sort();
}

/**
 * Can every pip be paid by a DIFFERENT source that offers one of its colours? Kuhn's
 * augmenting-path matching; sizes are a handful of pips against a dozen sources at most.
 */
export function canPayPipsWithDistinctSources(pips: string[][], pool: string[][]): boolean {
  if (pips.length > pool.length) return false;
  const pipBySource: Array<number | null> = pool.map(() => null);
  const place = (pip: number, seen: Set<number>): boolean => {
    for (let s = 0; s < pool.length; s++) {
      if (seen.has(s) || !pips[pip].some((c) => pool[s].includes(c))) continue;
      seen.add(s);
      const current = pipBySource[s];
      if (current === null || place(current, seen)) {
        pipBySource[s] = pip;
        return true;
      }
    }
    return false;
  };
  return pips.every((_, pip) => place(pip, new Set()));
}

/**
 * "Stuck" = a non-land card whose coloured pips cannot each be paid by a distinct
 * producible source (unrestricted, or a restricted source this card's own type qualifies
 * for). {G}{G} needs two green sources, not "is green producible at all" (round 6).
 * Pure given the already-computed colour sources at the turn in question — no DB access.
 */
export function isCardStuck(info: CardInfo, sources: ColourSources): boolean {
  if (info.typeLine.includes('Land')) return false;
  const pips = manaCostColourPips(info.manaCost);
  if (pips.length === 0) return false;
  const pool = [
    ...sources.unrestricted,
    ...(info.typeLine.includes('Planeswalker') ? sources.walkerOnly : []),
    ...(info.typeLine.includes('Legendary') ? sources.legendaryOnly : []),
  ];
  return !canPayPipsWithDistinctSources(pips, pool);
}

// Never resolve to art-series/token/emblem rows, nor the ~2,240 corrupt doubled-name rows.
// Copied from src/lib/deck-gate-parse.ts's unexported CLEAN_ROWS (same predicate, not importable).
const CLEAN_ROWS = "layout NOT IN ('art_series','token','double_faced_token','emblem') AND type_line <> 'Card // Card'";

type CardRow = { name: string; produced_mana: string | null; color_identity: string | null; type_line: string; mana_cost: string | null; oracle_text: string | null };

function makeResolver(db: ReturnType<typeof getDb>, clientNames: Map<number, string>) {
  const cache = new Map<number, CardInfo | null>();
  const byArenaId = db.prepare(
    `SELECT name, produced_mana, color_identity, type_line, mana_cost, oracle_text FROM cards WHERE arena_id = ? AND ${CLEAN_ROWS} ORDER BY length(name) LIMIT 1`
  );
  const byGrpCache = db.prepare(
    `SELECT card_name AS name, type_line FROM grp_id_cache WHERE grp_id = ? LIMIT 1`
  );
  // MDFCs/split cards: the live DB stores them as "Front // Back". ORDER BY length(name)
  // prefers the plain "Front // Back" row over any art-series duplicate CLEAN_ROWS misses.
  const byName = db.prepare(
    `SELECT name, produced_mana, color_identity, type_line, mana_cost, oracle_text FROM cards
     WHERE (name = ? OR name LIKE ? || ' //%') AND ${CLEAN_ROWS} ORDER BY length(name) LIMIT 1`
  );
  // N2: once a card is on the battlefield, Arena gives its grpId as the BACK face only
  // (e.g. "Shatterskull, the Hammer Pass", not the spell side) — byName's "front //%"
  // match never fires for that name. Fall back to matching it as the back face of some
  // "Front // Back" row.
  const byBackFace = db.prepare(
    `SELECT name, produced_mana, color_identity, type_line, mana_cost, oracle_text FROM cards
     WHERE name LIKE '% // ' || ? AND ${CLEAN_ROWS} ORDER BY length(name) LIMIT 1`
  );
  const mana = (row: CardRow | undefined, displayName: string, useRowName: boolean): CardInfo => ({
    name: useRowName ? (row?.name ?? displayName) : displayName,
    producedMana: safeJsonArray(row?.produced_mana ?? null),
    colorIdentity: safeJsonArray(row?.color_identity ?? null),
    colors: manaCostColours(row?.mana_cost ?? null),
    typeLine: row?.type_line ?? '',
    manaCost: row?.mana_cost ?? null,
    oracleText: row?.oracle_text ?? null,
  });
  return function resolve(grpId: number): CardInfo | null {
    if (cache.has(grpId)) return cache.get(grpId)!;
    let info: CardInfo | null = null;

    const clientName = clientNames.get(grpId);
    if (clientName && ANY_COLOUR_TOKEN_NAMES.has(clientName)) {
      info = { name: clientName, producedMana: [...WUBRG], colorIdentity: [], colors: [], typeLine: 'Token', manaCost: null, oracleText: null };
    } else if (clientName) {
      const row = byName.get(clientName, clientName) as CardRow | undefined;
      if (row) {
        info = mana(row, clientName, true);
      } else {
        const backRow = byBackFace.get(clientName) as CardRow | undefined;
        // Display the back face's own name (what the client/battlefield actually calls
        // it), not the "Front // Back" combo the row is stored under.
        info = mana(backRow, clientName, false);
      }
    } else {
      const row = byArenaId.get(grpId) as CardRow | undefined;
      if (row) {
        info = mana(row, row.name, true);
      } else {
        const cached = byGrpCache.get(grpId) as { name: string; type_line: string | null } | undefined;
        if (cached) {
          info = ANY_COLOUR_TOKEN_NAMES.has(cached.name)
            ? { name: cached.name, producedMana: [...WUBRG], colorIdentity: [], colors: [], typeLine: 'Token', manaCost: null, oracleText: null }
            : { name: cached.name, producedMana: [], colorIdentity: [], colors: [], typeLine: cached.type_line ?? '', manaCost: null, oracleText: null };
        }
      }
    }
    cache.set(grpId, info);
    return info;
  };
}

function safeJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function cardName(resolve: (grpId: number) => CardInfo | null, grpId: number): string {
  return resolve(grpId)?.name ?? `#${grpId}`;
}

/** F8: a deckName ("Tam Superfriends v2") doesn't pin an exact list — Arena lets the
 * name survive edits. Hash the actually-submitted {id, qty} pairs (commander already
 * folded in by whichever source produced the list, N3) so two games under the same
 * name with a different list don't get merged. */
export function hashDeckList(deckCards: Array<{ id: string; qty: number }> | null): string | null {
  if (!deckCards) return null;
  const sortedDeck = [...deckCards].sort((a, b) => a.id.localeCompare(b.id)).map((c) => `${c.id}x${c.qty}`);
  return crypto.createHash('sha1').update(sortedDeck.join(',')).digest('hex').slice(0, 10);
}

// ── Deck name attribution ────────────────────────────────────────────────────
// extractJsonBlocks drops EventSetDeckV3/DeckUpsertDeckV3 blocks (no colon after
// the method header, and no key it recognizes for a bare JSON line), so the Arena
// deck name never reaches ArenaMatch. Scanned directly off the raw log text instead.
// The operator plays several queues in one session (Brawl, Draft, Standard), each
// with its own deck, interleaved in the log — so "last deck name submitted" is
// tracked PER QUEUE (InternalEventName), not globally, and joined to a match by
// its ArenaMatch.queueRaw (same raw string Arena uses for InternalEventName).
const DECK_EVENT = /"InternalEventName":"([^"]*)"[^}]*?"CourseDeckSummary":\{"DeckId":"[^"]+","Name":"([^"]*)"/g;
const CONNECTING_TO_MATCH = /Connecting to matchId ([0-9a-f-]+)/g;

/** matchId -> (queue -> deck name as of that point in the log). */
function extractDeckNameSnapshotsByMatchId(logText: string): Map<string, Map<string, string>> {
  const marks: Array<{ index: number; queue?: string; deckName?: string; matchId?: string }> = [];
  for (const m of logText.matchAll(DECK_EVENT)) marks.push({ index: m.index, queue: m[1], deckName: m[2] });
  for (const m of logText.matchAll(CONNECTING_TO_MATCH)) marks.push({ index: m.index, matchId: m[1] });
  marks.sort((a, b) => a.index - b.index);

  const lastByQueue = new Map<string, string>();
  const snapshots = new Map<string, Map<string, string>>();
  for (const mark of marks) {
    if (mark.queue !== undefined) lastByQueue.set(mark.queue, mark.deckName!);
    else if (mark.matchId) snapshots.set(mark.matchId, new Map(lastByQueue));
  }
  return snapshots;
}

// N4: arena-log-reader.ts's extractMatches only records the GRE deck submission once
// a room-state event for that match has been seen, so a ConnectResp that arrives FIRST
// (1fc1f8c8 L11629 < room L11632; c1042a06 L38267 < L38270; 5e31bbcc) is silently
// dropped (match.deckCards = null). Scanned independently here, order-independent: every
// "deckMessage" block is matched to whichever "Connecting to matchId" marker is
// textually nearest it, deckCards + commanderCards tallied together (same 100-card
// convention the ledger files use).
const DECK_MESSAGE = /"deckMessage":\s*\{\s*"deckCards":\s*\[([^\]]*)\][^}]*?(?:"commanderCards":\s*\[([^\]]*)\])?\s*\}/g;

function captureConnectRespDecks(logText: string): Map<string, Array<{ id: string; qty: number }>> {
  const matchMarkers: Array<{ index: number; matchId: string }> = [];
  for (const m of logText.matchAll(CONNECTING_TO_MATCH)) matchMarkers.push({ index: m.index, matchId: m[1] });

  const result = new Map<string, Array<{ id: string; qty: number }>>();
  for (const m of logText.matchAll(DECK_MESSAGE)) {
    let nearest: { index: number; matchId: string } | null = null;
    for (const marker of matchMarkers) {
      if (!nearest || Math.abs(marker.index - m.index) < Math.abs(nearest.index - m.index)) nearest = marker;
    }
    if (!nearest || result.has(nearest.matchId)) continue; // keep the first (match-start) submission

    const ids = [
      ...m[1].split(',').map((s) => s.trim()).filter(Boolean),
      ...(m[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    ];
    const tally = new Map<string, number>();
    for (const id of ids) tally.set(id, (tally.get(id) ?? 0) + 1);
    result.set(nearest.matchId, Array.from(tally, ([id, qty]) => ({ id, qty })));
  }
  return result;
}

// ── Per-game row (one game, fully derived) ──────────────────────────────────

interface GameRow {
  matchId: string;
  matchIdShort: string;
  game: number;
  date: string | null;
  queueRaw: string | null;
  /** Arena deck name ("Tam Superfriends v2") at the time this match was played, null if unknown. */
  deckName: string | null;
  /** Hash of the submitted decklist (F8 — a deckName can be reused over a changed list). */
  deckHash: string | null;
  /** Resolved {name, qty} pairs actually submitted this game (commander + deck), for the ledger diff. */
  deckList: Array<{ name: string; qty: number }> | null;
  /** 'incomplete' = no MatchCompleted was ever logged (reconnect/client-shutdown mid-game). */
  result: 'win' | 'loss' | 'draw' | 'incomplete';
  onPlay: boolean | null;
  mulligans: number;
  openingHand: string[];
  /** Every card my seat drew this game, in addition to the opening hand (real Library->Hand draws). */
  drawnCards: string[];
  landCountByOwnTurn: Record<number, number>;
  missedLandDrop: Record<number, boolean>;
  coloursByOwnTurn: Record<number, string[]>;
  commanderCastOwnTurns: number[];
  stuckInHandAtTurn5: string[];
  totalOwnTurns: number;
  opponentCommander: string | null;
  commanderNames: string[];
  eventCount: number;
}

// ── Log loading + match/event extraction ────────────────────────────────────

interface FileParse {
  matches: ArenaMatch[];
  events: ArenaGameEvent[];
  deckNameSnapshotsByMatchId: Map<string, Map<string, string>>;
  connectRespDecksByMatchId: Map<string, Array<{ id: string; qty: number }>>;
}

function matchIdOf(data: Record<string, unknown>): string | null {
  const event = data.matchGameRoomStateChangedEvent as Record<string, unknown> | undefined;
  if (!event) return null;
  const roomInfo = (event.gameRoomInfo ?? event) as Record<string, unknown>;
  const config = roomInfo.gameRoomConfig as Record<string, unknown> | undefined;
  return typeof config?.matchId === 'string' ? config.matchId : null;
}

/**
 * Split one file's blocks into one group per match. Arena resets GRE instance
 * ids every match, but `extractGameEventsWithContext`'s own per-match reset
 * (arena-game-events.ts ~370) only clears seat/team/matchId/gameNumber — the
 * zone/grpId/idChanges maps carry over, so a later match's instanceId can
 * collide with an id an earlier match already mapped to a different grpId
 * (confirmed: instance 448 resolves to a leftover grpId from an earlier game
 * in a whole-file parse). A fresh context per match-sized block group avoids
 * the collision entirely. Does NOT also split per game within a Bo3 match
 * (same root cause, un-split here) — every match in the current logs is Bo1.
 */
function splitBlocksByMatch(blocks: JsonBlock[]): JsonBlock[][] {
  const groups: JsonBlock[][] = [];
  let current: JsonBlock[] = [];
  let currentMatchId: string | null = null;
  for (const block of blocks) {
    const matchId = matchIdOf(block[1]);
    if (matchId && matchId !== currentMatchId) {
      if (current.length) groups.push(current);
      current = [];
      currentMatchId = matchId;
    }
    current.push(block);
  }
  if (current.length) groups.push(current);
  return groups;
}

/** Last authenticateResponse.clientId / matchAccountUserId in the blocks, mirrors findScreenName. */
function findUserId(blocks: JsonBlock[]): string | null {
  let userId: string | null = null;
  for (const [, data] of blocks) {
    const auth = data.authenticateResponse as Record<string, unknown> | undefined;
    if (auth && typeof auth.clientId === 'string') userId = auth.clientId;
    if (typeof data.matchAccountUserId === 'string') userId = data.matchAccountUserId;
  }
  return userId;
}

function parseLogFile(logText: string): FileParse {
  const blocks = extractJsonBlocks(logText);
  const matches = extractMatches(blocks);
  // Identity (screenName/userId) is only sent once per session, not re-sent before every
  // match, so a fresh per-match context (F2) must be seeded with it or identifyPlayer falls
  // back to "seat 1 is me" for every match after the first — wrong whenever I'm seat 2.
  const screenName = findScreenName(blocks);
  const userId = findUserId(blocks);
  const events = splitBlocksByMatch(blocks).flatMap((group) => {
    const ctx = createContext();
    ctx.playerName = screenName;
    ctx.localUserId = userId;
    return extractGameEventsWithContext(group, ctx);
  });
  const deckNameSnapshotsByMatchId = extractDeckNameSnapshotsByMatchId(logText);
  const connectRespDecksByMatchId = captureConnectRespDecks(logText);
  return { matches, events, deckNameSnapshotsByMatchId, connectRespDecksByMatchId };
}

/** Segment the flat event stream into (matchId, gameNumber) buckets. */
export function segmentEvents(events: ArenaGameEvent[]): Map<string, { events: ArenaGameEvent[]; playerSeatId: number }> {
  const buckets = new Map<string, { events: ArenaGameEvent[]; playerSeatId: number }>();
  let matchId: string | null = null;
  let gameNumber = 1;
  let playerSeatId = 1;
  let current: ArenaGameEvent[] = [];

  // N5: a reconnect resends match_start for the SAME matchId mid-game (5ed577c5).
  // The old "keep whichever flush is longer" logic threw the pre-reconnect fragment
  // away outright instead of losing only its own duplicate turns. Concatenate same-key
  // fragments in log order instead — the pre-reconnect turns are real game history.
  const flush = () => {
    if (matchId && current.length > 0) {
      const key = `${matchId}#${gameNumber}`;
      const existing = buckets.get(key);
      if (existing) {
        buckets.set(key, { events: [...existing.events, ...current], playerSeatId });
      } else {
        buckets.set(key, { events: current, playerSeatId });
      }
    }
    current = [];
  };

  for (const ev of events) {
    if (ev.type === 'match_start') {
      flush();
      matchId = ev.matchId;
      gameNumber = 1;
      playerSeatId = ev.playerSeatId;
      continue;
    }
    if (ev.type === 'intermission') {
      flush();
      gameNumber = ev.gameNumber;
      continue;
    }
    if (ev.type === 'match_complete') {
      flush();
      matchId = null;
      continue;
    }
    if (matchId) current.push(ev);
  }
  flush();
  return buckets;
}

// Fields buildRows actually reads off a match — real ArenaMatch rows and the
// 'incomplete' fallback below both satisfy this.
interface MatchLike {
  playerCommanderGrpIds: string[];
  opponentCommanderGrpIds: string[];
  gameResults: ArenaMatch['gameResults'];
  result: 'win' | 'loss' | 'draw' | 'incomplete';
  startedAt: string | null;
  queueRaw: string | null;
  deckCards: ArenaMatch['deckCards'];
}

/**
 * extractMatches() (arena-log-reader.ts) only emits a match once it has a
 * result, so a reconnect/client-shutdown game with no MatchCompleted (F7,
 * e.g. 5ed577c5) never gets an ArenaMatch row at all — segmentEvents still
 * buckets its events (match_start fired, so there's something to bucket),
 * it's only the lookup by matchId that comes up empty. Recover just enough
 * to report it ('incomplete', excluded from W-L) by scanning the same flat
 * event stream directly for match_start + the deck_submission that follows it.
 */
function buildFallbackMatchInfo(events: ArenaGameEvent[]): Map<string, MatchLike> {
  const fallback = new Map<string, MatchLike>();
  let matchId: string | null = null;
  let format: string | null = null;
  for (const ev of events) {
    if (ev.type === 'match_start') {
      matchId = ev.matchId;
      format = ev.format;
      continue;
    }
    if (ev.type === 'match_complete') {
      matchId = null;
      continue;
    }
    if (ev.type === 'deck_submission' && matchId) {
      fallback.set(matchId, {
        playerCommanderGrpIds: ev.commanderGrpIds.map(String),
        opponentCommanderGrpIds: [],
        gameResults: [],
        result: 'incomplete',
        startedAt: null,
        queueRaw: format,
        deckCards: null,
      });
    }
  }
  return fallback;
}

// ── Build rows from one file ─────────────────────────────────────────────────

function buildRows(parse: FileParse, resolve: (grpId: number) => CardInfo | null): GameRow[] {
  const segments = segmentEvents(parse.events);
  const matchById = new Map<string, MatchLike>(parse.matches.map((m) => [m.matchId, m]));
  const fallbackMatchById = buildFallbackMatchInfo(parse.events);
  const rows: GameRow[] = [];

  for (const [key, seg] of segments) {
    const [matchId, gameStr] = key.split('#');
    const game = Number(gameStr);
    const match = matchById.get(matchId) ?? fallbackMatchById.get(matchId);
    if (!match) continue; // no match_start and no completed-match row — nothing to report

    const commanderGrpIds = match.playerCommanderGrpIds.map(Number);
    const facts: DerivedGameFacts = deriveGameFacts(seg.events, seg.playerSeatId, commanderGrpIds);
    const submittedDeck = parse.connectRespDecksByMatchId.get(matchId) ?? match.deckCards;

    const gameResult = match.gameResults.find((g) => g.game === game)?.result ?? match.result;
    const commanderColourIdentity = Array.from(
      new Set(commanderGrpIds.flatMap((g) => resolve(g)?.colorIdentity ?? [])),
    );

    const coloursByOwnTurn: Record<number, string[]> = {};
    const sourcesByOwnTurn: Record<number, ColourSources> = {};
    for (const turn of [2, 3, 4, 5]) {
      const grpIds = facts.battlefieldGrpIdsAtOwnTurnEnd[turn] ?? [];
      const battlefieldInfos = grpIds
        .map((gid) => ({ gid, info: resolve(gid) }))
        .filter((b): b is { gid: number; info: CardInfo } => b.info != null);
      const openingHandSet = new Set(facts.openingHandGrpIds);
      const subtypesByGrpId = facts.battlefieldSubtypesAtOwnTurnEnd[turn] ?? {};
      const sources = emptyColourSources();
      for (const { gid, info } of battlefieldInfos) {
        addColourSources(gid, info, battlefieldInfos, openingHandSet, facts.onPlay, commanderColourIdentity, sources, subtypesByGrpId);
      }
      sourcesByOwnTurn[turn] = sources;
      coloursByOwnTurn[turn] = allColours(sources);
    }

    const handAtTurn5 = facts.handGrpIdsAtOwnTurnEnd[5] ?? [];
    const sourcesAt5 = sourcesByOwnTurn[5] ?? emptyColourSources();
    // "Stuck" = a non-land card in hand whose MANA COST (not colour identity — colour
    // identity covers reminder-text/ability colours that are never actually paid) needs
    // a colour my permanents can't produce yet. Restricted sources (Beacon, Great Hall)
    // only count toward the spell types their own text allows them to pay for.
    const stuckInHandAtTurn5 = handAtTurn5
      .filter((gid) => {
        const info = resolve(gid);
        return info != null && isCardStuck(info, sourcesAt5);
      })
      .map((gid) => cardName(resolve, gid));

    const landCountByOwnTurn: Record<number, number> = {};
    const missedLandDrop: Record<number, boolean> = {};
    for (let t = 1; t <= Math.min(8, facts.totalOwnTurns); t++) {
      landCountByOwnTurn[t] = facts.landCountByOwnTurn[t] ?? landCountByOwnTurn[t - 1] ?? 0;
      missedLandDrop[t] = facts.missedLandDrop[t] ?? false;
    }

    rows.push({
      matchId,
      matchIdShort: matchId.slice(0, 8),
      game,
      date: match.startedAt,
      queueRaw: match.queueRaw,
      deckName: (match.queueRaw && parse.deckNameSnapshotsByMatchId.get(matchId)?.get(match.queueRaw)) ?? null,
      // N4: arena-log-reader.ts only records the GRE deck submission once it's seen a
      // room-state event for the match; when the ConnectResp arrives first in the log,
      // match.deckCards is null. The independently-scanned capture (order-independent,
      // matched by nearest "Connecting to matchId" marker) is preferred over it.
      // N3: both sources already fold the commander into the list — don't re-add it.
      deckHash: hashDeckList(submittedDeck),
      deckList: submittedDeck ? submittedDeck.map((c) => ({ name: cardName(resolve, Number(c.id)), qty: c.qty })) : null,
      result: gameResult,
      onPlay: facts.onPlay,
      mulligans: facts.mulligans,
      openingHand: facts.openingHandGrpIds.map((g) => cardName(resolve, g)),
      drawnCards: facts.drawnGrpIds.map((g) => cardName(resolve, g)),
      landCountByOwnTurn,
      missedLandDrop,
      coloursByOwnTurn,
      commanderCastOwnTurns: Array.from(new Set(facts.commanderCastOwnTurns)).sort((a, b) => a - b),
      stuckInHandAtTurn5,
      totalOwnTurns: facts.totalOwnTurns,
      opponentCommander: match.opponentCommanderGrpIds[0] ? cardName(resolve, Number(match.opponentCommanderGrpIds[0])) : null,
      commanderNames: commanderGrpIds.map((g) => cardName(resolve, g)),
      eventCount: seg.events.length,
    });
  }
  return rows;
}

// ── Aggregates ───────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const UNKNOWN_DECK = '(other/unknown)';

/**
 * F8: deckName alone doesn't pin a list — Arena lets the submitted deck change under
 * the same name (DeckId 4d5ab307 kept "Tam Superfriends v2" while its commander
 * changed Tam -> Esika). Group by deckName + commander first, then split THAT group
 * by deckHash in date order: the first hash seen keeps the plain name, every later
 * distinct hash becomes "<name> (edit N)".
 */
function groupByDeckIteration(rows: GameRow[]): Map<string, GameRow[]> {
  const byNameAndCommander = new Map<string, GameRow[]>();
  for (const r of rows) {
    const key = `${r.deckName ?? UNKNOWN_DECK}|${r.commanderNames.join('/')}`;
    (byNameAndCommander.get(key) ?? byNameAndCommander.set(key, []).get(key)!).push(r);
  }
  const groups = new Map<string, GameRow[]>();
  for (const [key, groupRows] of byNameAndCommander) {
    const label = key.split('|')[0];
    const sorted = [...groupRows].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

    // N4: a game whose decklist couldn't be captured (deckHash null) must not form its
    // own "(edit N)" bucket — attach it to whichever dated game in this group DOES have
    // a real hash and is closest in time, which is almost certainly the same submission.
    const dateMs = sorted.map((r) => (r.date ? Date.parse(r.date) : null));
    const effectiveHash: Array<string | null> = sorted.map((r) => r.deckHash);
    for (let i = 0; i < sorted.length; i++) {
      if (effectiveHash[i] != null) continue;
      let best = -1;
      const di = dateMs[i];
      for (let j = 0; j < sorted.length; j++) {
        if (effectiveHash[j] == null) continue;
        if (best === -1) { best = j; continue; }
        const dj = dateMs[j];
        const db = dateMs[best];
        if (di == null || dj == null || db == null) continue;
        if (Math.abs(dj - di) < Math.abs(db - di)) best = j;
      }
      if (best !== -1) effectiveHash[i] = effectiveHash[best];
    }

    const hashOrder: string[] = [];
    sorted.forEach((r, i) => {
      const h = effectiveHash[i] ?? 'unknown';
      if (!hashOrder.includes(h)) hashOrder.push(h);
      const editIndex = hashOrder.indexOf(h);
      const groupLabel = editIndex === 0 ? label : `${label} (edit ${editIndex + 1})`;
      (groups.get(groupLabel) ?? groups.set(groupLabel, []).get(groupLabel)!).push(r);
    });
  }
  return groups;
}

interface LedgerEntry {
  v: number;
  file: string;
}

let ledgerCache: Record<string, LedgerEntry[]> | null = null;

function loadLedger(): Record<string, LedgerEntry[]> {
  if (ledgerCache) return ledgerCache;
  const p = path.join(process.cwd(), 'decks', 'arena', 'iterations.json');
  ledgerCache = fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, LedgerEntry[]>) : {};
  return ledgerCache;
}

/** MDFCs compare by front face only, per spec ("front-face names, ignore set codes"). */
export function normalizeCardName(name: string): string {
  return name.split(' // ')[0].trim();
}

function addCount(counts: Map<string, number>, name: string, qty: number): void {
  const n = normalizeCardName(name);
  counts.set(n, (counts.get(n) ?? 0) + qty);
}

/** Arena .txt export format: "About"/"Commander"/"Deck"/"Sideboard" sections, lines
 * "<qty> <name>" with an optional "(SET) number" suffix to strip. */
function parseDeckListFile(filePath: string): Map<string, number> {
  const counts = new Map<string, number>();
  if (!fs.existsSync(filePath)) return counts;
  let section: 'commander' | 'deck' | 'other' = 'other';
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (/^commander$/i.test(line)) { section = 'commander'; continue; }
    if (/^deck$/i.test(line)) { section = 'deck'; continue; }
    if (/^(about|sideboard)$/i.test(line)) { section = 'other'; continue; }
    if (!line || section === 'other') continue;
    const m = line.match(/^(\d+)\s+(.+?)(?:\s+\([A-Za-z0-9]+\)\s+\S+)?$/);
    if (m) addCount(counts, m[2], Number(m[1]));
  }
  return counts;
}

export function countsFromDeckList(list: Array<{ name: string; qty: number }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { name, qty } of list) addCount(counts, name, qty);
  return counts;
}

export function diffCounts(submitted: Map<string, number>, ledger: Map<string, number>): { plus: number; minus: number } {
  let plus = 0;
  let minus = 0;
  for (const name of new Set([...submitted.keys(), ...ledger.keys()])) {
    const diff = (submitted.get(name) ?? 0) - (ledger.get(name) ?? 0);
    if (diff > 0) plus += diff;
    if (diff < 0) minus += -diff;
  }
  return { plus, minus };
}

/** "matches ledger" / "edited in Arena: +X -Y" / "-" when the deckName doesn't carry a
 * "<base> vN" version Pins can be matched against, or the ledger has no such entry. */
function ledgerStatus(deckName: string | null, deckList: Array<{ name: string; qty: number }> | null): string {
  if (!deckName || !deckList) return '-';
  const m = deckName.match(/^(.*) v(\d+)$/);
  if (!m) return '-';
  const entry = loadLedger()[m[1]]?.find((e) => e.v === Number(m[2]));
  if (!entry) return '-';
  const { plus, minus } = diffCounts(countsFromDeckList(deckList), parseDeckListFile(path.join(process.cwd(), entry.file)));
  return plus === 0 && minus === 0 ? 'matches ledger' : `edited in Arena: +${plus} -${minus}`;
}

/** One compact block per deck name/iteration, for comparing versions. */
function buildDeckNameAggregates(rows: GameRow[]): string {
  const groups = groupByDeckIteration(rows);
  const lines = [
    '## By deck iteration', '',
    '| Deck | Games | W-L | Keep-7 | T1 | T2 | T3 | T4 | Cmdr cast (median own turn) | Ledger |',
    '|------|-------|-----|--------|----|----|----|----|-----------------------------|--------|',
  ];
  for (const [name, group] of groups) {
    const n = group.length;
    const wins = group.filter((r) => r.result === 'win').length;
    const losses = group.filter((r) => r.result === 'loss').length;
    const keep7 = group.filter((r) => r.mulligans === 0).length;
    const hitPct = (t: number) => {
      const eligible = group.filter((r) => r.totalOwnTurns >= t);
      const hit = eligible.filter((r) => !r.missedLandDrop[t]).length;
      return eligible.length ? `${Math.round((100 * hit) / eligible.length)}%` : '-';
    };
    const castTurns = group.map((r) => r.commanderCastOwnTurns[0]).filter((t): t is number => t != null);
    const med = median(castTurns);
    const ledgerRow = group.find((r) => r.deckList);
    const ledger = ledgerStatus(ledgerRow?.deckName ?? null, ledgerRow?.deckList ?? null);
    lines.push(`| ${name} | ${n} | ${wins}-${losses} | ${n ? Math.round((100 * keep7) / n) : 0}% | ${hitPct(1)} | ${hitPct(2)} | ${hitPct(3)} | ${hitPct(4)} | ${med != null ? med : 'never'} | ${ledger} |`);
  }
  return lines.join('\n');
}

function buildAggregates(rows: GameRow[]): string {
  const n = rows.length;
  const wins = rows.filter((r) => r.result === 'win').length;
  const losses = rows.filter((r) => r.result === 'loss').length;
  const keep7 = rows.filter((r) => r.mulligans === 0).length;
  const meanMull = mean(rows.map((r) => r.mulligans));

  const landHit: string[] = [];
  for (let t = 1; t <= 6; t++) {
    const eligible = rows.filter((r) => r.totalOwnTurns >= t);
    const hit = eligible.filter((r) => !r.missedLandDrop[t]).length;
    landHit.push(`T${t}: ${eligible.length ? Math.round((100 * hit) / eligible.length) : 0}% (${hit}/${eligible.length})`);
  }

  // F6: the stuck check reads the board at own turn 5, so the denominator must require
  // the game actually reached own turn 5 — a game that ended at T4 was never checked.
  const screwed = rows.filter((r) => r.totalOwnTurns >= 5 && r.stuckInHandAtTurn5.length > 0).length;
  const screwEligible = rows.filter((r) => r.totalOwnTurns >= 5).length;

  // N8: key on the FIRST cast turn only — joining every cast into one composite key
  // (e.g. "4,6,8,9") gave every recast pattern its own one-off bucket instead of
  // counting "first cast turn 4" once and recasts separately.
  const castDist = new Map<string, number>();
  let recastCount = 0;
  let recastGames = 0;
  for (const r of rows) {
    const key = r.commanderCastOwnTurns.length ? String(r.commanderCastOwnTurns[0]) : 'never';
    castDist.set(key, (castDist.get(key) ?? 0) + 1);
    const recasts = Math.max(0, r.commanderCastOwnTurns.length - 1);
    if (recasts > 0) { recastCount += recasts; recastGames += 1; }
  }

  const stuckCount = new Map<string, number>();
  for (const r of rows) for (const name of r.stuckInHandAtTurn5) stuckCount.set(name, (stuckCount.get(name) ?? 0) + 1);
  const topStuck = Array.from(stuckCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const seenCount = new Map<string, { wins: number; losses: number }>();
  for (const r of rows) {
    for (const name of new Set([...r.openingHand, ...r.drawnCards])) {
      const e = seenCount.get(name) ?? { wins: 0, losses: 0 };
      if (r.result === 'win') e.wins++;
      if (r.result === 'loss') e.losses++;
      seenCount.set(name, e);
    }
  }
  const perCard = Array.from(seenCount.entries())
    .filter(([, v]) => v.wins + v.losses >= 3)
    .sort((a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses));

  return [
    `## Aggregates (${n} games)`,
    '',
    `- Record: ${wins}W-${losses}L (${n - wins - losses} draw/incomplete)`,
    `- Keep-7 rate: ${n ? Math.round((100 * keep7) / n) : 0}% (${keep7}/${n})`,
    `- Mean mulligans: ${meanMull.toFixed(2)}`,
    `- Land-drop hit rate: ${landHit.join(' | ')}`,
    `- Colour-screwed (unproducible colour stuck in hand at own T5, among games that reached T5): ${screwEligible ? Math.round((100 * screwed) / screwEligible) : 0}% (${screwed}/${screwEligible})`,
    `- Commander cast-turn distribution (first cast only): ${Array.from(castDist.entries()).map(([k, v]) => `${k}: ${v}`).join(' | ') || 'none'}`,
    `- Commander recast count: ${recastCount} (across ${recastGames} game(s))`,
    '',
    '### Top stuck-in-hand cards (seen ≥1 game, at own turn 5)',
    ...(topStuck.length ? topStuck.map(([name, c], i) => `${i + 1}. ${name} — ${c} game(s)`) : ['none']),
    '',
    '### Drawn-in-wins vs drawn-in-losses (cards seen in ≥3 games; real draws — opening hand + Library→Hand draw events)',
    '| Card | Wins | Losses |',
    '|------|------|--------|',
    ...(perCard.length ? perCard.map(([name, v]) => `| ${name} | ${v.wins} | ${v.losses} |`) : ['| none | - | - |']),
  ].join('\n');
}

function buildMarkdown(commander: string, rows: GameRow[]): string {
  const sorted = [...rows].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const header = [
    `# Arena game report — ${commander}`,
    '',
    `${rows.length} games found.`,
    '',
    '| Date | Deck | Match | G | Queue | Result | P/D | Mull | Own turns | Cmdr cast | Land drops (T1-6) | Colours T2-5 | Stuck @T5 | Opp cmdr |',
    '|------|------|-------|---|-------|--------|-----|------|-----------|-----------|--------------------|--------------|-----------|----------|',
  ];
  const lines = sorted.map((r) => {
    const landStr = Array.from({ length: 6 }, (_, i) => i + 1)
      .map((t) => (t > r.totalOwnTurns ? '-' : r.missedLandDrop[t] ? `${r.landCountByOwnTurn[t]}!` : String(r.landCountByOwnTurn[t])))
      .join(',');
    const colourStr = [2, 3, 4, 5].map((t) => `T${t}:${(r.coloursByOwnTurn[t] ?? []).join('') || '-'}`).join(' ');
    return `| ${r.date?.slice(0, 10) ?? '?'} | ${r.deckName ?? UNKNOWN_DECK} | ${r.matchIdShort} | ${r.game} | ${r.queueRaw ?? '?'} | ${r.result} | ${r.onPlay == null ? '?' : r.onPlay ? 'play' : 'draw'} | ${r.mulligans} | ${r.totalOwnTurns} | ${r.commanderCastOwnTurns.join(',') || '-'} | ${landStr} | ${colourStr} | ${r.stuckInHandAtTurn5.join('; ') || '-'} | ${r.opponentCommander ?? '?'} |`;
  });
  return [...header, ...lines, '', buildDeckNameAggregates(rows), '', buildAggregates(rows)].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = args.outDir ?? path.join(args.logsDir, 'reports');
  fs.mkdirSync(outDir, { recursive: true });

  // Stale reports from before grpId name resolution worked (slug is bare digits, e.g. "106521.md").
  for (const f of fs.readdirSync(outDir)) {
    if (/^\d+(-games\.jsonl|\.md)$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  }

  const logFiles = fs.readdirSync(args.logsDir).filter((f) => f.endsWith('.log'));
  if (logFiles.length === 0) {
    console.error(`No .log files found in ${args.logsDir}`);
    process.exit(1);
  }

  const arenaDbPath = findArenaClientDb(args.arenaDb);
  const clientNames = arenaDbPath ? loadArenaClientNames(arenaDbPath) : new Map<number, string>();
  console.log(arenaDbPath ? `Arena client card DB: ${arenaDbPath} (${clientNames.size} names)` : 'Arena client card DB: not found, falling back to arena_id/grp_id_cache only');

  const db = getDb();
  const resolve = makeResolver(db, clientNames);

  const sinceMs = args.since ? Date.parse(args.since) : null;
  const allRows = new Map<string, GameRow>(); // dedupe key: matchId#game
  for (const file of logFiles) {
    const logText = fs.readFileSync(path.join(args.logsDir, file), 'utf8');
    const parse = parseLogFile(logText);
    const rows = buildRows(parse, resolve);
    for (const row of rows) {
      if (sinceMs != null && row.date && Date.parse(row.date) < sinceMs) continue;
      const key = `${row.matchId}#${row.game}`;
      const existing = allRows.get(key);
      if (!existing || row.eventCount > existing.eventCount) allRows.set(key, row);
    }
  }

  const byCommander = new Map<string, GameRow[]>();
  for (const row of allRows.values()) {
    const key = row.commanderNames[0] ?? 'Unknown';
    (byCommander.get(key) ?? byCommander.set(key, []).get(key)!).push(row);
  }

  const wanted = args.commander
    ? [args.commander]
    : Array.from(byCommander.keys());

  console.log(`Parsed ${logFiles.length} log file(s), ${allRows.size} unique games across ${byCommander.size} commander(s):`);
  for (const [name, rows] of byCommander) console.log(`  ${name}: ${rows.length} games`);

  for (const commander of wanted) {
    const rows = byCommander.get(commander) ?? [];
    const slug = commander.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const jsonlPath = path.join(outDir, `${slug}-games.jsonl`);
    const mdPath = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(jsonlPath, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
    fs.writeFileSync(mdPath, buildMarkdown(commander, rows) + '\n');
    console.log(`Wrote ${rows.length} games for "${commander}" -> ${mdPath}`);
  }
}

if (require.main === module) main();
