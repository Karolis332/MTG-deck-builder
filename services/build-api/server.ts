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
import { makeCardResolver, resolveDeckLines } from './resolve';

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

async function handleBuild(body: string, res: http.ServerResponse): Promise<void> {
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
    });

    if (!result.cards.length) {
      return json(res, 422, { error: 'Build produced no cards — commander not found or card DB missing' });
    }

    json(res, 200, {
      commander: commanderName,
      partner: partnerName || null,
      format,
      strategy: result.strategy,
      themes: result.themes,
      tribalType: result.tribalType || null,
      collectionMode: Boolean(ownedCards),
      collectionMatched: ownedCards ? collectionMatched : undefined,
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
function handleAnalyze(body: string, res: http.ServerResponse): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    return json(res, 400, { error: 'invalid JSON body' });
  }

  const commanderName = typeof parsed.commanderName === 'string' ? parsed.commanderName.trim() : '';
  const cardsIn = Array.isArray(parsed.cards) ? (parsed.cards as OwnedCard[]).slice(0, 600) : [];
  if (!commanderName || commanderName.length > 200) {
    return json(res, 400, { error: 'commanderName is required' });
  }
  if (cardsIn.length < 10) {
    return json(res, 400, { error: 'cards[] required (at least 10 entries)' });
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
    json(res, 200, { ...payload, unresolved: unresolved.slice(0, 30) });
  } catch (error) {
    // Engine/DB exceptions carry SQL text and filesystem paths — log, never return them.
    console.error(`[build-api] analyze error for "${commanderName}":`, error instanceof Error ? error.stack || error.message : error);
    json(res, 500, { error: 'Analysis hit an internal error. Try again shortly.' });
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
  const url = (req.url || '').split('?')[0];

  if (req.method === 'GET' && url === '/health') {
    return json(res, 200, { status: 'ok', service: 'build-api', activeBuilds });
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[build-api] listening on 127.0.0.1:${PORT} (db dir: ${process.env.MTG_DB_DIR || 'auto'})`);
});
