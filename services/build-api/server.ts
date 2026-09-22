/**
 * Build API — thin HTTP wrapper around the deck-builder engine so the web app
 * (black-grimoire-web) can build decks online with the exact same engine the
 * desktop client uses.
 *
 * Runs on the VPS under PM2:  MTG_DB_DIR=/opt/grimoire-build-api/db \
 *   BUILD_API_KEY=... npx tsx services/build-api/server.ts
 * nginx exposes it at /build-api/ (proxy to 127.0.0.1:8100).
 */
import http from 'http';
import { autoBuildDeck } from '../../src/lib/deck-builder-ai';
import { classifyCard, getPrimaryCategory } from '../../src/lib/card-classifier';
import { getDb } from '../../src/lib/db';
import type { DbCard } from '../../src/lib/types';
import { analyzeResolved } from './analysis-core';
import { handleOptimize } from './optimize';
import { handleMetaRoute } from './meta-routes';
import { handleIngestRoute, startIngestSchedule } from './ingest-routes';
import { makeCardResolver, resolveDeckLines } from './resolve';
import { deckText, gateDeck, readLocks, readOwnedCardNames } from './gate-wiring';
import { scoreDeckSafely } from '../../src/lib/deck-score-input';
import { findAlternatives } from '../../src/lib/card-alternatives';

const PORT = Number(process.env.PORT || 8100);
const API_KEY = process.env.BUILD_API_KEY || '';
const VALID_FORMATS = ['commander', 'brawl', 'standardbrawl'] as const;
const VALID_POWER = ['casual', 'optimized', 'cedh'];

// ponytail: single counter, not a queue — builds are CPU-bound (~15-40s each);
// beyond 2 concurrent the box thrashes. Upgrade to a real queue if traffic demands.
let activeBuilds = 0;
const MAX_CONCURRENT = 2;
// /optimize is synchronous (~0.1–1.5 s); a few in flight is plenty (review 2026-09-07).
let activeOptimizes = 0;
const MAX_CONCURRENT_OPTIMIZE = 4;

// ponytail: the engine reads the collection table UNSCOPED (single-user design),
// so collection builds are serialized and the table holds exactly one request's
// cards at a time. Upgrade path: user_id scoping inside deck-builder-ai queries.
let collectionBuildActive = false;
const TEMP_USER_ID = 999901;

interface OwnedCard {
  name: string;
  quantity: number;
}

/** Replace the (disposable) service DB's collection with this request's cards. */
function seedTempCollection(cards: OwnedCard[]): number {
  const db = getDb();
  // collection.user_id has an FK to users — make sure the temp user exists
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, email, password_hash, subscription_tier, subscription_status)
     VALUES (?, 'web-build-temp', 'temp@build.local', 'unused', 'free', 'active')`
  ).run(TEMP_USER_ID);
  const findExact = db.prepare('SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1');
  const findDfc = db.prepare('SELECT id FROM cards WHERE name LIKE ? COLLATE NOCASE LIMIT 1');
  const ins = db.prepare(
    "INSERT OR IGNORE INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, ?, 'web-build')"
  );
  let matched = 0;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM collection').run();
    for (const c of cards) {
      const name = String(c.name || '').trim();
      if (!name || name.length > 200) continue;
      const qty = Math.max(1, Math.min(99, Math.floor(Number(c.quantity)) || 1));
      const row = (findExact.get(name) || findDfc.get(`${name} //%`)) as { id: string } | undefined;
      if (row) {
        ins.run(TEMP_USER_ID, row.id, qty);
        matched++;
      }
    }
  });
  tx();
  return matched;
}

function clearTempCollection(): void {
  try {
    getDb().prepare('DELETE FROM collection').run();
  } catch { /* next seed also deletes */ }
}

/** DB stores color_identity as a JSON-encoded array ('["R"]'); serve it compact ('R'). */
function parseColorIdentity(raw: string | null): string {
  if (!raw) return '';
  try {
    return (JSON.parse(raw) as string[]).join('');
  } catch {
    return raw;
  }
}

function json(res: http.ServerResponse, code: number, obj: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

export async function handleBuild(body: string, res: http.ServerResponse): Promise<void> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    return json(res, 400, { error: 'invalid JSON body' });
  }

  const commanderName = typeof parsed.commanderName === 'string' ? parsed.commanderName.trim() : '';
  const partnerName = typeof parsed.partnerName === 'string' && parsed.partnerName.trim() ? parsed.partnerName.trim() : undefined;
  const format = typeof parsed.format === 'string' ? parsed.format : 'commander';
  const powerLevel = typeof parsed.powerLevel === 'string' && VALID_POWER.includes(parsed.powerLevel) ? parsed.powerLevel : undefined;
  const buildHints = typeof parsed.buildHints === 'string' && parsed.buildHints.trim() ? parsed.buildHints.trim().slice(0, 500) : undefined;

  if (!commanderName || commanderName.length > 200) {
    return json(res, 400, { error: 'commanderName is required' });
  }
  if (!VALID_FORMATS.includes(format as (typeof VALID_FORMATS)[number])) {
    return json(res, 400, { error: `format must be one of: ${VALID_FORMATS.join(', ')}` });
  }

  // Price cap / deck budget / bracket target — additive, all optional.
  let maxCardPrice: number | undefined;
  if (parsed.maxCardPrice !== undefined) {
    if (typeof parsed.maxCardPrice !== 'number' || !Number.isFinite(parsed.maxCardPrice) || parsed.maxCardPrice <= 0) {
      return json(res, 400, { error: 'maxCardPrice must be a number > 0' });
    }
    maxCardPrice = parsed.maxCardPrice;
  }
  let maxDeckPrice: number | undefined;
  if (parsed.maxDeckPrice !== undefined) {
    if (typeof parsed.maxDeckPrice !== 'number' || !Number.isFinite(parsed.maxDeckPrice) || parsed.maxDeckPrice <= 0) {
      return json(res, 400, { error: 'maxDeckPrice must be a number > 0' });
    }
    maxDeckPrice = parsed.maxDeckPrice;
  }
  let bracket: 1 | 2 | 3 | 4 | 5 | undefined;
  if (parsed.bracket !== undefined) {
    if (typeof parsed.bracket !== 'number' || !Number.isInteger(parsed.bracket) || parsed.bracket < 1 || parsed.bracket > 5) {
      return json(res, 400, { error: 'bracket must be an integer 1-5' });
    }
    bracket = parsed.bracket as 1 | 2 | 3 | 4 | 5;
  }
  // Bracket is a Commander Brackets concept — ignored for 60-card formats,
  // but VALID_FORMATS above already restricts /build to commander/brawl/
  // standardbrawl, so this is always a no-op guard, not live behaviour.
  const effectiveBracket = format !== 'standard' ? bracket : undefined;
  if (activeBuilds >= MAX_CONCURRENT) {
    return json(res, 429, { error: 'build queue full, retry in a minute' });
  }

  // Collection-constrained build: caller sends their owned cards
  const ownedCards = Array.isArray(parsed.ownedCards)
    ? (parsed.ownedCards as OwnedCard[]).slice(0, 10000)
    : null;
  let collectionMatched = 0;
  if (ownedCards) {
    if (collectionBuildActive) {
      return json(res, 429, { error: 'a collection build is already running, retry in a minute' });
    }
    collectionBuildActive = true;
    try {
      collectionMatched = seedTempCollection(ownedCards);
    } catch (error) {
      collectionBuildActive = false;
      const message = error instanceof Error ? error.message : 'collection seeding failed';
      console.error('[build-api] collection seed error:', message);
      return json(res, 500, { error: `collection processing failed: ${message}` });
    }
    if (collectionMatched < 60) {
      clearTempCollection();
      collectionBuildActive = false;
      return json(res, 422, {
        error: `only ${collectionMatched} of your cards were recognized — a collection build needs at least ~60 owned cards (excluding basic lands)`,
        collectionMatched,
      });
    }
  }

  activeBuilds++;
  const started = Date.now();
  try {
    const result = await autoBuildDeck({
      format,
      colors: [],
      commanderName,
      partnerName,
      powerLevel: powerLevel as 'casual' | 'optimized' | 'cedh' | undefined,
      buildHints,
      // userId always: enables the community-stats arsenal (collection table
      // is empty for non-collection builds, so no substitutes leak in)
      useCollection: Boolean(ownedCards),
      userId: TEMP_USER_ID,
      maxCardPrice,
      maxDeckPrice,
      bracket: effectiveBracket,
    });

    if (!result.cards.length) {
      return json(res, 422, { error: 'Build produced no cards — commander not found or card DB missing' });
    }

    const gate = gateDeck(
      deckText(result.cards.map((e) => ({ name: (e.card as DbCard).name, quantity: e.quantity, board: e.board }))),
      { format, ownedCards: readOwnedCardNames(parsed), locks: readLocks(parsed) }
    );

    const craftList = result.craftList;
    const craftSummary = craftList && craftList.length
      ? {
          count: craftList.length,
          byRarity: craftList.reduce(
            (acc, c) => {
              const key = c.rarity as 'common' | 'uncommon' | 'rare' | 'mythic';
              if (key in acc) acc[key] += 1;
              return acc;
            },
            { common: 0, uncommon: 0, rare: 0, mythic: 0 }
          ),
          paperUsd: Math.round(craftList.reduce((sum, c) => sum + (c.priceUsd || 0), 0) * 100) / 100,
        }
      : undefined;

    const findCard = makeCardResolver();
    const commanderRows = [findCard(commanderName), partnerName ? findCard(partnerName) : undefined].filter(
      (c): c is DbCard => Boolean(c)
    );
    const deckScore = scoreDeckSafely({
      format,
      main: result.cards.filter((e) => e.board === 'main'),
      commander: commanderRows,
    });

    json(res, 200, {
      commander: commanderName,
      partner: partnerName || null,
      format,
      gate,
      deckScore,
      strategy: result.strategy,
      themes: result.themes,
      tribalType: result.tribalType || null,
      collectionMode: Boolean(ownedCards),
      collectionMatched: ownedCards ? collectionMatched : undefined,
      hints: result.hints,
      craftList,
      craftSummary,
      price: result.price,
      bracket: result.bracket,
      elapsedMs: Date.now() - started,
      cards: result.cards.map((entry) => {
        const card = entry.card as DbCard;
        return {
          name: card.name,
          quantity: entry.quantity,
          board: entry.board,
          type_line: card.type_line,
          cmc: card.cmc,
          mana_cost: card.mana_cost,
          color_identity: parseColorIdentity(card.color_identity),
          set_code: card.set_code,
          collector_number: card.collector_number,
          image_uri_normal: card.image_uri_normal,
          image_uri_small: card.image_uri_small,
          priceUsd: card.price_usd != null ? parseFloat(card.price_usd) : null,
          category: getPrimaryCategory(
            classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc ?? 0)
          ),
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'build failed';
    console.error(`[build-api] build error for "${commanderName}" (${format}):`, message);
    // Engine throws a clear message for format-illegal commanders — that's caller error, not ours
    json(res, /not legal as a commander/i.test(message) ? 422 : 500, { error: message });
  } finally {
    activeBuilds--;
    if (ownedCards) {
      clearTempCollection();
      collectionBuildActive = false;
    }
  }
}

/**
 * POST /analyze — full deck analysis for ANY decklist (the Deck Doctor engine).
 * No build, just scoring: ISS + explained synergy pairs, win plan, curve score,
 * mulligan criteria, Game Changer count, category breakdown. Fast (<1s).
 */
export function handleAnalyze(body: string, res: http.ServerResponse): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    return json(res, 400, { error: 'invalid JSON body' });
  }

  const commanderName = typeof parsed.commanderName === 'string' ? parsed.commanderName.trim() : '';
  const cardsIn = Array.isArray(parsed.cards) ? (parsed.cards as OwnedCard[]).slice(0, 600) : [];
  // Optional — Deck Doctor is a single-commander pass regardless of format, but
  // the Deck Score profile (commander/brawl/...) changes what's legal and what
  // "on curve" means, so a Brawl caller must be able to say so.
  const format = typeof parsed.format === 'string' ? parsed.format : 'commander';
  if (!commanderName || commanderName.length > 200) {
    return json(res, 400, { error: 'commanderName is required' });
  }
  if (cardsIn.length < 10) {
    return json(res, 400, { error: 'cards[] required (at least 10 entries)' });
  }
  if (!VALID_FORMATS.includes(format as (typeof VALID_FORMATS)[number])) {
    return json(res, 400, { error: `format must be one of: ${VALID_FORMATS.join(', ')}` });
  }

  try {
    const findCard = makeCardResolver();
    const commanderRow = findCard(commanderName);
    if (!commanderRow) {
      return json(res, 422, { error: `commander not found: ${commanderName}` });
    }

    const { resolved, unresolved } = resolveDeckLines(cardsIn, findCard);
    if (resolved.length < 10) {
      return json(res, 422, { error: `only ${resolved.length} cards recognized`, unresolved: unresolved.slice(0, 20) });
    }

    const { payload } = analyzeResolved(commanderRow, resolved);
    const deckScore = scoreDeckSafely({
      format,
      main: resolved.filter((r) => r.board === 'main'),
      commander: [commanderRow],
      sideboard: resolved.filter((r) => r.board === 'sideboard'),
      unresolved: unresolved.slice(0, 30).map((name) => ({ name, quantity: 1, board: 'main' })),
    });
    json(res, 200, { ...payload, unresolved: unresolved.slice(0, 30), deckScore });
  } catch (error) {
    // Engine/DB exceptions carry SQL text and filesystem paths — log, never return them.
    console.error(`[build-api] analyze error for "${commanderName}":`, error instanceof Error ? error.stack || error.message : error);
    json(res, 500, { error: 'Analysis hit an internal error. Try again shortly.' });
  }
}

const MAX_ALTERNATIVES_LIMIT = 20;
const DEFAULT_ALTERNATIVES_LIMIT = 8;

/**
 * POST /alternatives — cheaper same-role candidates for one card in a deck
 * context. Local scoring only (src/lib/card-alternatives.ts); no CF/EDHREC
 * network calls, so this stays well under a second even on the VPS.
 */
export function handleAlternatives(body: string, res: http.ServerResponse): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    return json(res, 400, { error: 'invalid JSON body' });
  }

  const format = typeof parsed.format === 'string' && parsed.format.trim() ? parsed.format.trim() : '';
  if (!format) return json(res, 400, { error: 'format is required' });

  const cardName = typeof parsed.card === 'string' ? parsed.card.trim() : '';
  if (!cardName || cardName.length > 200) return json(res, 400, { error: 'card is required' });

  const deckNames = Array.isArray(parsed.deck) ? (parsed.deck as unknown[]).filter((n) => typeof n === 'string').slice(0, 200) as string[] : [];
  if (!deckNames.length) return json(res, 400, { error: 'deck must be a non-empty array of card names' });

  const commanderNames = Array.isArray(parsed.commander)
    ? (parsed.commander as unknown[]).filter((n) => typeof n === 'string').slice(0, 2) as string[]
    : [];

  let maxPrice: number | undefined;
  if (parsed.maxPrice !== undefined) {
    if (typeof parsed.maxPrice !== 'number' || !Number.isFinite(parsed.maxPrice) || parsed.maxPrice <= 0) {
      return json(res, 400, { error: 'maxPrice must be a number > 0' });
    }
    maxPrice = parsed.maxPrice;
  }

  let limit = DEFAULT_ALTERNATIVES_LIMIT;
  if (parsed.limit !== undefined) {
    if (typeof parsed.limit !== 'number' || !Number.isInteger(parsed.limit) || parsed.limit < 1) {
      return json(res, 400, { error: 'limit must be a positive integer' });
    }
    limit = Math.min(MAX_ALTERNATIVES_LIMIT, parsed.limit);
  }

  const ownedNames = new Set(
    Array.isArray(parsed.ownedCards)
      ? (parsed.ownedCards as unknown[]).filter((n) => typeof n === 'string') as string[]
      : []
  );

  try {
    const findCard = makeCardResolver();
    const unresolved: string[] = [];

    const commanders = commanderNames
      .map((n) => findCard(n))
      .filter((c): c is DbCard => {
        if (!c) return false;
        return true;
      });
    for (let i = 0; i < commanderNames.length; i++) {
      if (!findCard(commanderNames[i])) unresolved.push(commanderNames[i]);
    }

    const deckCards: DbCard[] = [];
    for (const name of deckNames) {
      const row = findCard(name);
      if (row) deckCards.push(row);
      else unresolved.push(name);
    }

    const cardRow = findCard(cardName);
    if (!cardRow) return json(res, 404, { error: `card not found: ${cardName}` });

    const inDeck = deckNames.some((n) => n.trim().toLowerCase() === cardName.toLowerCase());
    if (!inDeck) return json(res, 404, { error: 'card not in deck' });

    const result = findAlternatives({
      format,
      commanders,
      deckCards,
      card: cardRow,
      maxPrice,
      limit,
      ownedNames,
    });

    json(res, 200, { ...result, unresolved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'alternatives lookup failed';
    console.error(`[build-api] alternatives error for "${cardName}":`, message);
    json(res, 500, { error: message });
  }
}

/**
 * POST /cards/lookup — batched card display data for the web collection viewer.
 * {names: string[]} (≤1000) → per-name card info from the local DB; no external calls.
 */
function handleCardsLookup(body: string, res: http.ServerResponse): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    return json(res, 400, { error: 'invalid JSON body' });
  }
  const names = Array.isArray(parsed.names) ? (parsed.names as unknown[]).slice(0, 1000) : [];
  if (!names.length) return json(res, 400, { error: 'names[] required (max 1000)' });

  try {
    const db = getDb();
    // Exact (NOCASE-indexed) first; the LIKE DFC fallback only runs on a miss —
    // the OR-combined form forced a full table scan PER NAME (incident 2026-08-25).
    const LOOKUP_COLS = `name, type_line, cmc, mana_cost, color_identity, rarity, set_code,
              image_uri_small, image_uri_normal, price_usd, game_changer`;
    const findExact = db.prepare(
      `SELECT ${LOOKUP_COLS} FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1`
    );
    const findDfc = db.prepare(
      `SELECT ${LOOKUP_COLS} FROM cards WHERE name LIKE ? COLLATE NOCASE LIMIT 1`
    );
    const cards: Record<string, unknown>[] = [];
    const unresolved: string[] = [];
    for (const raw of names) {
      const name = String(raw || '').trim();
      if (!name || name.length > 200) continue;
      const row = (findExact.get(name) || findDfc.get(`${name} //%`)) as (DbCard & { game_changer?: number }) | undefined;
      if (!row) { unresolved.push(name); continue; }
      cards.push({
        name: row.name,
        type_line: row.type_line,
        cmc: row.cmc,
        mana_cost: row.mana_cost,
        color_identity: parseColorIdentity(row.color_identity),
        rarity: row.rarity,
        set_code: row.set_code,
        image_uri_small: row.image_uri_small,
        image_uri_normal: row.image_uri_normal,
        price_usd: row.price_usd,
        game_changer: row.game_changer === 1,
      });
    }
    json(res, 200, { cards, unresolved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'lookup failed';
    json(res, 500, { error: message });
  }
}

const server = http.createServer((req, res) => {
  const [url, search = ''] = (req.url || '').split('?');

  if (req.method === 'GET' && url === '/health') {
    return json(res, 200, { status: 'ok', service: 'build-api', activeBuilds });
  }

  // Read-only meta corpus. Key-gated like the rest of the service; the handler
  // returns false for paths that are not /meta/*, so other routes still match.
  if (req.method === 'GET' && url.startsWith('/meta/')) {
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      return json(res, 401, { error: 'unauthorized' });
    }
    if (handleMetaRoute(url, search, res)) return;
  }

  // Scraper control. Writes to the corpus and spawns processes, so it is always
  // key-gated even when the rest of the service is running open.
  if (url.startsWith('/ingest')) {
    if (!API_KEY || req.headers['x-api-key'] !== API_KEY) {
      return json(res, 401, { error: 'unauthorized' });
    }
    if (req.method === 'GET') {
      if (handleIngestRoute('GET', url, '', res)) return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10_000) req.destroy();
      });
      req.on('end', () => handleIngestRoute('POST', url, body, res));
      return;
    }
  }

  if (req.method === 'POST' && url === '/cards/lookup') {
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      return json(res, 401, { error: 'unauthorized' });
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_500_000) req.destroy();
    });
    req.on('end', () => handleCardsLookup(body, res));
    return;
  }

  if (req.method === 'POST' && url === '/analyze') {
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      return json(res, 401, { error: 'unauthorized' });
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_500_000) req.destroy();
    });
    req.on('end', () => handleAnalyze(body, res));
    return;
  }

  if (req.method === 'POST' && url === '/optimize') {
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      return json(res, 401, { error: 'unauthorized' });
    }
    // Synchronous handler on the same loop as /build — bound it like builds are.
    if (activeOptimizes >= MAX_CONCURRENT_OPTIMIZE) {
      return json(res, 429, { error: 'optimizer busy, retry in a few seconds' });
    }
    // Counted from the moment the body starts streaming, so pending requests
    // (not just the one executing) are bounded.
    activeOptimizes++;
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_500_000) req.destroy(); // decklist text + a ~10K-name ownedCards list
    });
    req.on('close', () => { activeOptimizes = Math.max(0, activeOptimizes - 1); });
    req.on('end', () => handleOptimize(body, res));
    return;
  }

  if (req.method === 'POST' && url === '/alternatives') {
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      return json(res, 401, { error: 'unauthorized' });
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_500_000) req.destroy();
    });
    req.on('end', () => handleAlternatives(body, res));
    return;
  }

  if (req.method === 'POST' && url === '/build') {
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      return json(res, 401, { error: 'unauthorized' });
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_500_000) req.destroy(); // room for a ~10K-card ownedCards list
    });
    req.on('end', () => void handleBuild(body, res));
    return;
  }

  json(res, 404, { error: 'not found' });
});

// ponytail: env-flag guard, not require.main === module — this file's request
// handlers are imported directly by tests (vitest sets VITEST), and require.main
// doesn't survive ESM/CJS interop the same way tsx and vitest load the file.
if (!process.env.VITEST) server.listen(PORT, '127.0.0.1', () => {
  console.log(`[build-api] listening on 127.0.0.1:${PORT} (db dir: ${process.env.MTG_DB_DIR || 'auto'})`);
  // No-op unless INGEST_SCHEDULE_HOURS is set.
  startIngestSchedule();
});
