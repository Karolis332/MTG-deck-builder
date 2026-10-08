/**
 * Model lab — the best-deck engine as a local web page, no AI in the loop.
 *
 *   MTG_DB_DIR=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data npx tsx scripts/model-lab.ts [--port 3210]
 *
 * Open http://localhost:3210. Paste a commander and a list, set the weights, then Score for the
 * breakdown (Deck Score components with reasons, goldfish, role counts vs windows, objective) or
 * Climb to stream swaps pass by pass (NDJSON). Stop aborts after the current pass.
 *
 * // ponytail: single-threaded — a running climb blocks other requests until its current pass ends;
 * // move the climb into a worker_thread if two people ever use it at once.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { climbDeck, type ClimbSwap, type StopProof } from '../src/lib/deck-climb';
import type { DbCard } from '../src/lib/types';
import {
  DECK_SIZE, DEFAULT_WEIGHTS, MIN_GAIN_DEFAULT, type Owned, type Scored, type Weights, basicsFor, buildPool, cardRoles, fromNames, identityOf,
  isCommander, isLand, legalPool, loadOwned, makeScorer, parseList, powerOf, resolveCard, roleWindows, seedDeck,
} from './best-deck-lib';

const portArg = process.argv.indexOf('--port');
const PORT = portArg >= 0 ? Number(process.argv[portArg + 1]) : 3210;
const PAGE = path.resolve('scripts/model-lab.html');
const DECK_PAGE = path.resolve('scripts/deck-view.html');
const SOURCES = new Set(['paper', 'arena']);
const FORMATS = new Set(['commander', 'brawl']);
const BODY_LIMIT = 1 << 20;

interface LabRequest {
  source?: string; format?: string; commander?: string; list?: string; lock?: string; ban?: string;
  weights?: Partial<Weights>; passes?: number; topK?: number; batch?: number; epsilon?: number;
}

class BadRequest extends Error {}

// paper ownership is re-read when collection.txt or any deck file changes (registering a card mid-session must not need a restart)
const PAPER_DIR = path.resolve('decks/paper');
const DB_FILE = path.join(process.env.MTG_DB_DIR ?? path.resolve('data'), 'mtg-deck-builder.db');
const ownedStamp = (source: string): string => {
  if (source !== 'paper') return [DB_FILE, `${DB_FILE}-wal`].map((f) => (fs.existsSync(f) ? `${f}:${fs.statSync(f).mtimeMs}` : f)).join('|'); // arena rows live in the DB (WAL): re-read on write
  const files = [path.join(PAPER_DIR, 'collection.txt'), ...fs.readdirSync(path.join(PAPER_DIR, 'decks')).map((f) => path.join(PAPER_DIR, 'decks', f))];
  return files.map((f) => `${f}:${fs.statSync(f).mtimeMs}`).join('|');
};
const ownedCache = new Map<string, { stamp: string; o: Owned }>();
function owned(source: string): Owned {
  const stamp = ownedStamp(source);
  let e = ownedCache.get(source);
  if (!e || e.stamp !== stamp) { e = { stamp, o: loadOwned(source) }; ownedCache.set(source, e); }
  return e.o;
}

const clamp = (v: unknown, d: number, lo: number, hi: number): number => {
  const n = Number(v);
  return v !== undefined && v !== null && v !== '' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
/** One card name per line; a leading quantity is ignored. */
const names = (s?: string): string[] => (s ?? '').split(/\r?\n/).map((x) => x.replace(/^\d+x?\s+/, '').trim()).filter(Boolean);
const listText = (deckNames: readonly string[]): string => {
  const m = new Map<string, number>();
  deckNames.forEach((n) => m.set(n, (m.get(n) ?? 0) + 1));
  return [...m].map(([n, q]) => `${q} ${n}`).join('\n');
};

function context(q: LabRequest) {
  const source = String(q.source ?? 'paper');
  const format = String(q.format ?? 'commander');
  if (!SOURCES.has(source)) throw new BadRequest('source must be paper or arena');
  if (!FORMATS.has(format)) throw new BadRequest('format must be commander or brawl');
  const commander = resolveCard(String(q.commander ?? '').trim());
  if (!commander) throw new BadRequest(`unknown card: ${q.commander ?? ''}`);
  const o = owned(source);
  const legal = legalPool(o, format);
  const banned = new Set(names(q.ban));
  const basics = basicsFor(identityOf(commander), source, o.cards);
  const pool = buildPool(commander, legal, banned);
  const weights: Weights = {
    tempo: clamp(q.weights?.tempo, DEFAULT_WEIGHTS.tempo, 0, 100), keep: clamp(q.weights?.keep, DEFAULT_WEIGHTS.keep, 0, 100),
    role: clamp(q.weights?.role, DEFAULT_WEIGHTS.role, 0, 100), games: clamp(q.weights?.games, DEFAULT_WEIGHTS.games, 20, 3000),
  };
  const locked = new Set(names(q.lock));
  // A pasted list may carry the commander line itself ("Commander" header); it is not a 99th card.
  const { cards, missing } = fromNames(parseList(String(q.list ?? '')).filter((n) => n !== commander.name), pool, basics);
  return { source, format, commander, o, basics, pool, weights, locked, cards, missing, scorer: makeScorer(format, commander, weights) };
}
type Ctx = ReturnType<typeof context>;

type WithImages = DbCard & { image_uri_normal?: string | null; image_uri_large?: string | null };
const cardView = (card: DbCard, qty: number) => ({
  name: card.name, qty, cmc: card.cmc, type: card.type_line, mana: card.mana_cost, roles: cardRoles(card),
  image: (card as WithImages).image_uri_normal ?? null, imageLarge: (card as WithImages).image_uri_large ?? null,
});

/** Everything the page shows for one list. */
function describe(ctx: Ctx, deck: readonly DbCard[], s: Scored) {
  const counts = new Map<string, { card: DbCard; qty: number }>();
  for (const c of deck) counts.set(c.name, { card: c, qty: (counts.get(c.name)?.qty ?? 0) + 1 });
  return {
    objective: s.objective,
    parts: { absoluteTotal: s.model?.absoluteTotal ?? 0, tempo: s.gf.tempo, keep7: s.gf.keep7, penalty: s.rolePenalty, weights: ctx.weights },
    model: s.model && {
      version: s.model.version, score: s.model.score, rank: s.model.rank, provisional: s.model.provisional, evidence: s.model.evidence,
      components: s.model.components, gates: s.model.gates,
    },
    goldfish: s.gf, roles: s.roles, windows: roleWindows(ctx.format), power: powerOf(deck, ctx.commander),
    size: deck.length, lands: deck.filter(isLand).length,
    commander: cardView(ctx.commander, 1),
    cards: [...counts.values()].map(({ card, qty }) => cardView(card, qty)),
  };
}

/** Every collection-best-deck run (each verify-<date>/best-deck/<run> dir with results), newest first, with its ranked lists. */
function listRuns(): { dir: string; decks: { commander: string; objective: number; passes: number; converged: boolean; list: string }[] }[] {
  const runs: { dir: string; mtime: number }[] = [];
  for (const v of fs.readdirSync('.').filter((d) => /^verify-\d{4}-\d{2}-\d{2}/.test(d))) {
    const base = path.join(v, 'best-deck');
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base)) {
      const dir = path.join(base, d);
      const files = fs.existsSync(dir) && fs.statSync(dir).isDirectory() ? fs.readdirSync(dir).filter((f) => /^results-\d+\.jsonl$/.test(f)) : [];
      if (files.length) runs.push({ dir, mtime: Math.max(...files.map((f) => fs.statSync(path.join(dir, f)).mtimeMs)) });
    }
  }
  return runs.sort((a, b) => b.mtime - a.mtime).map(({ dir }) => {
    const latest = new Map<string, { commander: string; objective: number; passes: number; converged: boolean; deck: string[] }>();
    for (const f of fs.readdirSync(dir).filter((x) => /^results-\d+\.jsonl$/.test(x))) {
      for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean)) {
        const r = JSON.parse(l) as { commander: string; objective: number; passes: number; converged: boolean; deck: string[] };
        const prev = latest.get(r.commander);
        if (!prev || r.passes >= prev.passes) latest.set(r.commander, r);
      }
    }
    const decks = [...latest.values()].sort((a, b) => b.objective - a.objective).slice(0, 40)
      .map((r) => ({ commander: r.commander, objective: r.objective, passes: r.passes, converged: r.converged, list: listText(r.deck) }));
    return { dir: dir.replace(/\\/g, '/'), decks };
  });
}

function readBody(req: http.IncomingMessage): Promise<LabRequest> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk;
      if (data.length > BODY_LIMIT) { reject(new BadRequest('body too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) as LabRequest : {}); } catch { reject(new BadRequest('invalid JSON')); } });
    req.on('error', reject);
  });
}
const json = (res: http.ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

async function climb(ctx: Ctx, q: LabRequest, res: http.ServerResponse): Promise<void> {
  if (ctx.cards.length !== DECK_SIZE) {
    throw new BadRequest(`climb needs exactly ${DECK_SIZE} resolved cards, got ${ctx.cards.length}${ctx.missing.length ? ` (${ctx.missing.length} not in the pool)` : ''}`);
  }
  const passes = clamp(q.passes, 3, 1, 50);
  const topK = clamp(q.topK, 12, 2, 40);
  const batch = clamp(q.batch, 6, 1, 20);
  const epsilon = clamp(q.epsilon, MIN_GAIN_DEFAULT, 0, 10);
  let closed = false;
  res.on('close', () => { if (!res.writableFinished) closed = true; });
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' });
  const send = (o: unknown): void => { res.write(JSON.stringify(o) + '\n'); };
  const flush = (): Promise<void> => new Promise((f) => setImmediate(f));

  let deck = ctx.cards;
  send({ type: 'start', passes, topK, batch, epsilon, missing: ctx.missing, ...describe(ctx, deck, ctx.scorer(deck)) });
  await flush();
  const swaps: ClimbSwap[] = [];
  let converged = false;
  let stopProof: StopProof | null = null;
  let evaluations = 0;
  let pass = 0;
  for (pass = 1; pass <= passes && !closed; pass++) {
    const r = climbDeck(deck, [...ctx.pool, ...ctx.basics], (d) => ctx.scorer(d).objective, {
      maxPasses: 1, topK, batch, epsilon, repeatable: new Set(ctx.basics.map((b) => b.name)), locked: ctx.locked,
    });
    deck = r.deck;
    swaps.push(...r.swaps);
    evaluations += r.evaluations;
    send({ type: 'pass', pass, swaps: r.swaps, evaluations, ...describe(ctx, deck, ctx.scorer(deck)) });
    await flush();
    if (r.converged) { converged = true; stopProof = r.stopProof; break; }
  }
  send({ type: 'done', converged, stopped: closed, passes: Math.min(pass, passes), swaps, evaluations, stopProof, list: listText(deck.map((c) => c.name)) });
  res.end();
}

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const param = (k: string): string => url.searchParams.get(k) ?? '';
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(PAGE));
    } else if (req.method === 'GET' && url.pathname === '/deck') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(DECK_PAGE));
    } else if (req.method === 'GET' && url.pathname === '/api/commanders') {
      const source = param('source') || 'paper';
      const format = param('format') || 'commander';
      if (!SOURCES.has(source) || !FORMATS.has(format)) throw new BadRequest('bad source or format');
      const o = owned(source);
      json(res, 200, legalPool(o, format).filter((c) => isCommander(c, format))
        .map((c) => ({ name: c.name, identity: identityOf(c).join(''), sleeved: o.decks.has(c.name) }))
        .sort((a, b) => a.name.localeCompare(b.name)));
    } else if (req.method === 'GET' && url.pathname === '/api/seed') {
      const ctx = context({ source: param('source'), format: param('format'), commander: param('commander') });
      const sleeved = ctx.o.decks.get(ctx.commander.name);
      json(res, 200, { cf: listText(seedDeck(ctx.commander, ctx.pool, ctx.basics).map((c) => c.name)), sleeved: sleeved ? listText(sleeved) : null });
    } else if (req.method === 'GET' && url.pathname === '/api/runs') {
      json(res, 200, listRuns());
    } else if (req.method === 'GET' && url.pathname === '/api/card') {
      const c = resolveCard(param('name'));
      if (!c) throw new BadRequest(`unknown card: ${param('name')}`);
      json(res, 200, { name: c.name, mana_cost: c.mana_cost, type_line: c.type_line, oracle_text: c.oracle_text, roles: cardRoles(c) });
    } else if (req.method === 'POST' && url.pathname === '/api/score') {
      const ctx = context(await readBody(req));
      json(res, 200, { missing: ctx.missing, ...describe(ctx, ctx.cards, ctx.scorer(ctx.cards)) });
    } else if (req.method === 'POST' && url.pathname === '/api/climb') {
      const q = await readBody(req);
      await climb(context(q), q, res);
    } else if (url.pathname === '/favicon.ico') {
      res.writeHead(204); res.end();
    } else {
      json(res, 404, { error: 'not found' });
    }
  } catch (e) {
    const status = e instanceof BadRequest ? 400 : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) json(res, status, { error: (e as Error).message });
    else { res.write(JSON.stringify({ type: 'error', message: (e as Error).message }) + '\n'); res.end(); }
  }
}).listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`model lab → http://localhost:${PORT}  (sources: paper | arena; formats: commander | brawl)\n`);
});
