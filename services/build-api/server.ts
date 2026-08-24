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
import { analyzeCommander } from '../../src/lib/commander-synergy';
import { computeSynergyGraph } from '../../src/lib/synergy-graph';
import type { CardLike } from '../../src/lib/synergy-graph';
import { deriveWinPlan } from '../../src/lib/win-conditions';
import { computeCurveScore } from '../../src/lib/curve-score';
import { deriveKeepCriteria } from '../../src/lib/mulligan-advisor';
import type { Archetype } from '../../src/lib/deck-templates';
import type { DbCard } from '../../src/lib/types';

const PORT = Number(process.env.PORT || 8100);
const API_KEY = process.env.BUILD_API_KEY || '';
const VALID_FORMATS = ['commander', 'brawl', 'standardbrawl'] as const;
const VALID_POWER = ['casual', 'optimized', 'cedh'];

// ponytail: single counter, not a queue — builds are CPU-bound (~15-40s each);
// beyond 2 concurrent the box thrashes. Upgrade to a real queue if traffic demands.
let activeBuilds = 0;
const MAX_CONCURRENT = 2;

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
  const find = db.prepare(
    `SELECT id FROM cards WHERE name = ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE
     ORDER BY (name = ? COLLATE NOCASE) DESC LIMIT 1`
  );
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
      const row = find.get(name, `${name} //%`, name) as { id: string } | undefined;
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
    const db = getDb();
    // Exact match FIRST: 'Mountain' has a reversible printing named
    // 'Mountain // Mountain' that the LIKE fallback would otherwise return.
    const findCard = db.prepare(
      `SELECT * FROM cards WHERE name = ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE
       ORDER BY (name = ? COLLATE NOCASE) DESC LIMIT 1`
    );
    const commanderRow = findCard.get(commanderName, `${commanderName} //%`, commanderName) as DbCard | undefined;
    if (!commanderRow) {
      return json(res, 422, { error: `commander not found: ${commanderName}` });
    }

    const resolved: Array<{ card: DbCard; quantity: number }> = [];
    const unresolved: string[] = [];
    for (const c of cardsIn) {
      const name = String(c.name || '').trim();
      if (!name) continue;
      const row = findCard.get(name, `${name} //%`, name) as DbCard | undefined;
      if (row) resolved.push({ card: row, quantity: Math.max(1, Math.floor(Number(c.quantity)) || 1) });
      else unresolved.push(name);
    }
    if (resolved.length < 10) {
      return json(res, 422, { error: `only ${resolved.length} cards recognized`, unresolved: unresolved.slice(0, 20) });
    }

    let colorIdentity: string[] = [];
    try { colorIdentity = commanderRow.color_identity ? JSON.parse(commanderRow.color_identity) : []; } catch { /* empty */ }
    const commanderOracle = commanderRow.oracle_text || '';
    const synergyProfile = analyzeCommander(commanderOracle, commanderRow.type_line || '', colorIdentity);
    const archetype: Archetype = (synergyProfile?.detectedArchetype ?? 'midrange') as Archetype;

    const nonLand = resolved.filter((r) => !(r.card.type_line || '').includes('Land'));
    const nonLandCardLikes: CardLike[] = nonLand.map((r) => ({
      name: r.card.name,
      oracleText: r.card.oracle_text,
      typeLine: r.card.type_line || '',
    }));
    const commanderLike: CardLike = {
      name: commanderRow.name,
      oracleText: commanderOracle,
      typeLine: commanderRow.type_line || '',
    };

    const graph = computeSynergyGraph(nonLandCardLikes, { ...commanderLike, synergyProfile, directNeeds: null });
    const winPlan = deriveWinPlan({
      commander: commanderLike,
      synergyProfile,
      cards: nonLand.map((r) => ({
        name: r.card.name,
        oracleText: r.card.oracle_text,
        typeLine: r.card.type_line || '',
        cmc: r.card.cmc ?? 0,
      })),
    });

    const nonLandCopies = nonLand.flatMap((r) =>
      Array.from({ length: r.quantity }, () => ({ cmc: r.card.cmc ?? 0 }))
    );
    const curveScore = computeCurveScore(archetype, commanderRow.cmc ?? 0, nonLandCopies);

    const totalCards = resolved.reduce((s, r) => s + r.quantity, 0);
    const landCount = resolved
      .filter((r) => (r.card.type_line || '').includes('Land'))
      .reduce((s, r) => s + r.quantity, 0);
    const avgCmc = nonLandCopies.length
      ? nonLandCopies.reduce((s, c) => s + c.cmc, 0) / nonLandCopies.length
      : 0;
    const mulliganCriteria = deriveKeepCriteria(
      { totalCards, landCount, avgCmc, colors: colorIdentity },
      archetype,
      winPlan,
      commanderRow.cmc ?? 0,
    );

    const gameChangers = resolved
      .filter((r) => (r.card as DbCard & { game_changer?: number }).game_changer === 1)
      .map((r) => r.card.name);

    const categories: Record<string, number> = {};
    for (const r of resolved) {
      const cat = getPrimaryCategory(
        classifyCard(r.card.name, r.card.oracle_text || '', r.card.type_line || '', r.card.cmc ?? 0)
      );
      categories[cat] = (categories[cat] || 0) + r.quantity;
    }

    // WinPlan.cardRoles is a Map — swap for a plain object on the wire
    const winPlanOut = {
      ...winPlan,
      cardRoles: winPlan.cardRoles instanceof Map ? Object.fromEntries(winPlan.cardRoles) : winPlan.cardRoles,
    };

    json(res, 200, {
      commander: commanderRow.name,
      archetype,
      iss: graph.deckISS,
      topSynergyPairs: graph.topSynergyPairs,
      curveScore,
      winPlan: winPlanOut,
      mulliganCriteria,
      gameChangers: { count: gameChangers.length, names: gameChangers },
      categories,
      stats: { totalCards, landCount, avgCmc: Math.round(avgCmc * 100) / 100 },
      unresolved: unresolved.slice(0, 30),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'analysis failed';
    console.error(`[build-api] analyze error for "${commanderName}":`, message);
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
    const find = db.prepare(
      `SELECT name, type_line, cmc, mana_cost, color_identity, rarity, set_code,
              image_uri_small, image_uri_normal, price_usd, game_changer
       FROM cards WHERE name = ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE
       ORDER BY (name = ? COLLATE NOCASE) DESC LIMIT 1`
    );
    const cards: Record<string, unknown>[] = [];
    const unresolved: string[] = [];
    for (const raw of names) {
      const name = String(raw || '').trim();
      if (!name || name.length > 200) continue;
      const row = find.get(name, `${name} //%`, name) as (DbCard & { game_changer?: number }) | undefined;
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
