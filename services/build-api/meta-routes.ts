/**
 * Meta routes — read-only HTTP surface over the scraped tournament corpus.
 *
 * Thin by design: all correctness (duplicate-row collapsing, undated-deck
 * exclusion) lives in src/lib/meta-queries.ts where it is unit-tested. This file
 * only validates input and shapes the response.
 *
 * GET /meta/freshness?format=standard
 * GET /meta/archetypes?format=standard&days=30&sources=mtgo
 * GET /meta/consensus?format=standard&archetype=Grixis&days=30&minInclusion=0.5
 * GET /meta/cards?format=standard&days=30&limit=200
 * GET /meta/decks?format=standard&archetype=Izzet&minWinRate=0.8&limit=50
 * GET /meta/deck/123
 */
import http from 'http';
import {
  getArchetypeStats,
  getArchetypeConsensus,
  getMetaCardStats,
  searchMetaDecks,
  getMetaDeck,
  getCorpusFreshness,
  type MetaWindow,
} from '../../src/lib/meta-queries';

/** Formats the corpus actually carries. Rejecting anything else keeps the query bounded. */
const VALID_FORMATS = new Set([
  'standard',
  'pioneer',
  'modern',
  'legacy',
  'vintage',
  'pauper',
  'commander',
  'brawl',
  'standardbrawl',
  'explorer',
  'historic',
  'timeless',
  'pacific',
]);
const VALID_SOURCES = new Set(['mtgo', 'mtggoldfish', 'mtgtop8', 'topdeck', 'melee']);
const MAX_NAME_LEN = 120;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function json(res: http.ServerResponse, code: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function num(q: URLSearchParams, key: string): number | undefined {
  const raw = q.get(key);
  if (raw === null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

class BadRequest extends Error {}

/** Parse and validate the window shared by every meta endpoint. */
function parseWindow(q: URLSearchParams): MetaWindow {
  const format = (q.get('format') || 'standard').toLowerCase();
  if (!VALID_FORMATS.has(format)) throw new BadRequest(`unsupported format: ${format}`);

  const since = q.get('since') || undefined;
  if (since && !ISO_DATE.test(since)) throw new BadRequest('since must be YYYY-MM-DD');

  const days = num(q, 'days');
  if (days !== undefined && (days <= 0 || days > 3650)) {
    throw new BadRequest('days must be between 1 and 3650');
  }

  const sources = (q.get('sources') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const s of sources) {
    if (!VALID_SOURCES.has(s)) throw new BadRequest(`unknown source: ${s}`);
  }

  // Default to a 30-day window: an unbounded default would quietly serve the
  // 5931 undated mtgtop8 decks as if they were current.
  return {
    format,
    since,
    days: since ? undefined : (days ?? 30),
    sources,
    includeUndated: q.get('includeUndated') === '1',
  };
}

function name(q: URLSearchParams, key: string): string | undefined {
  const raw = q.get(key);
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length > MAX_NAME_LEN) throw new BadRequest(`${key} too long`);
  return trimmed || undefined;
}

/**
 * Handle a /meta/* GET. Returns true when the path was ours, false to fall
 * through to the next route in the server.
 */
export function handleMetaRoute(pathname: string, search: string, res: http.ServerResponse): boolean {
  if (!pathname.startsWith('/meta/')) return false;

  const q = new URLSearchParams(search);
  try {
    if (pathname === '/meta/freshness') {
      const format = (q.get('format') || 'standard').toLowerCase();
      if (!VALID_FORMATS.has(format)) throw new BadRequest(`unsupported format: ${format}`);
      const sources = getCorpusFreshness(format);
      // Surface the caveat with the data rather than leaving callers to discover it.
      const trustworthy = sources.filter((s) => s.withDate > 0 && s.withRecord > 0);
      json(res, 200, {
        format,
        sources,
        datedDecks: sources.reduce((n, s) => n + s.withDate, 0),
        recordedDecks: sources.reduce((n, s) => n + s.withRecord, 0),
        totalDecks: sources.reduce((n, s) => n + s.decks, 0),
        recommendedSources: trustworthy.map((s) => s.source),
      });
      return true;
    }

    if (pathname === '/meta/archetypes') {
      const w = parseWindow(q);
      const stats = getArchetypeStats(w);
      const minDecks = num(q, 'minDecks') ?? 0;
      json(res, 200, { window: w, archetypes: stats.filter((s) => s.decks >= minDecks) });
      return true;
    }

    if (pathname === '/meta/consensus') {
      const w = parseWindow(q);
      const archetype = name(q, 'archetype');
      if (!archetype) throw new BadRequest('archetype is required');
      const minInclusion = num(q, 'minInclusion');
      if (minInclusion !== undefined && (minInclusion < 0 || minInclusion > 1)) {
        throw new BadRequest('minInclusion must be between 0 and 1');
      }
      json(res, 200, { window: w, ...getArchetypeConsensus({ ...w, archetype, minInclusion }) });
      return true;
    }

    if (pathname === '/meta/cards') {
      const w = parseWindow(q);
      json(res, 200, { window: w, cards: getMetaCardStats({ ...w, limit: num(q, 'limit') }) });
      return true;
    }

    if (pathname === '/meta/decks') {
      const w = parseWindow(q);
      const minWinRate = num(q, 'minWinRate');
      if (minWinRate !== undefined && (minWinRate < 0 || minWinRate > 1)) {
        throw new BadRequest('minWinRate must be between 0 and 1');
      }
      const decks = searchMetaDecks({
        ...w,
        archetype: name(q, 'archetype'),
        minWinRate,
        limit: num(q, 'limit'),
      });
      json(res, 200, { window: w, count: decks.length, decks });
      return true;
    }

    const deckMatch = pathname.match(/^\/meta\/deck\/(\d+)$/);
    if (deckMatch) {
      const deck = getMetaDeck(Number(deckMatch[1]));
      if (!deck) return json(res, 404, { error: 'deck not found' }), true;
      json(res, 200, deck);
      return true;
    }

    json(res, 404, { error: 'not found' });
    return true;
  } catch (error) {
    if (error instanceof BadRequest) {
      json(res, 400, { error: error.message });
      return true;
    }
    // Never leak internals to the caller; the stack goes to the service log only.
    console.error('[meta] query failed:', error);
    json(res, 500, { error: 'meta query failed' });
    return true;
  }
}
