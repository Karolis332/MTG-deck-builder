/**
 * Deck Score reaching build-api /optimize as an additive `deckScore` field
 * (docs/DECK_SCORE_SPEC.md, src/lib/deck-score-input.ts). Reuses the
 * emperor-v5 fixture from tests/build-api-gate-wiring.test.ts.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const FIX = path.join(process.cwd(), 'src/lib/__tests__/fixtures/deck-gate');
const V5 = fs.readFileSync(path.join(FIX, 'emperor-v5.txt'), 'utf8');

let testDb: Database.Database;
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getDb: () => testDb };
});

import type { ServerResponse } from 'http';
import type { DbCard } from '../src/lib/types';
import { optimizeDeck } from '../services/build-api/optimize';

vi.mock('@/lib/deck-builder-ai', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, autoBuildDeck: vi.fn() };
});
import { autoBuildDeck } from '@/lib/deck-builder-ai';
import { handleAnalyze, handleBuild } from '../services/build-api/server';
import { scoreDeckSafely, explainScoreUnavailable } from '../src/lib/deck-score-input';

/** Minimal fake http.ServerResponse — captures status + parsed JSON body. */
function fakeRes(): { res: ServerResponse; result: () => { status: number; body: Record<string, unknown> } } {
  let status = 0;
  let body = '';
  const res = {
    writeHead: (code: number) => { status = code; },
    end: (chunk?: string) => { body = chunk ?? ''; },
  } as unknown as ServerResponse;
  return { res, result: () => ({ status, body: JSON.parse(body || '{}') }) };
}

const MAIN_NAMES = [
  "Thran Portal", 'Aetherize', 'Aggravated Assault', "An Offer You Can't Refuse", 'Arcane Epiphany',
  'Arcane Signet', 'Archmage Emeritus', 'Arena of Glory', "Baldur's Gate", 'Big Score',
  'Blasphemous Act', 'Burst Lightning',
];

interface OptimizeOut extends Record<string, unknown> {
  deckScore: { version: string; score: number; provisional: boolean; components: unknown[]; gates: unknown[] } | null;
}

const run = (body: Record<string, unknown>): OptimizeOut =>
  optimizeDeck({ format: 'brawl', text: V5, ...body }) as OptimizeOut;

beforeAll(() => {
  const cards = JSON.parse(fs.readFileSync(path.join(FIX, 'cards.json'), 'utf8')) as Array<
    Record<string, string | number | null>
  >;
  testDb = new Database(':memory:');
  testDb.exec(`
    CREATE TABLE cards (
      id TEXT PRIMARY KEY, name TEXT, mana_cost TEXT, cmc REAL, type_line TEXT,
      oracle_text TEXT, colors TEXT, color_identity TEXT, legalities TEXT, layout TEXT,
      set_code TEXT, collector_number TEXT, rarity TEXT, image_uri_small TEXT,
      image_uri_normal TEXT, produced_mana TEXT, edhrec_rank INTEGER, game_changer INTEGER, power TEXT, toughness TEXT, loyalty TEXT
    );
    CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT, quantity INTEGER, foil INTEGER,
      source TEXT, imported_at TEXT, user_id INTEGER
    );
  `);
  const ins = testDb.prepare(
    `INSERT INTO cards (id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity,
     legalities, layout, set_code, produced_mana, rarity, edhrec_rank)
     VALUES (@id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @colors, @color_identity,
     @legalities, @layout, @set_code, @produced_mana, @rarity, @edhrec_rank)`
  );
  for (const c of cards) ins.run(c);
});

describe('POST /optimize — deckScore', () => {
  it('carries an additive deckScore payload for a Brawl (commander-family) list', () => {
    const r = run({});
    expect(r.deckScore).not.toBeNull();
    expect(typeof r.deckScore!.version).toBe('string');
    expect(typeof r.deckScore!.score).toBe('number');
    expect(Array.isArray(r.deckScore!.components)).toBe(true);
    expect(Array.isArray(r.deckScore!.gates)).toBe(true);
  });

  it('never touches the existing response fields', () => {
    const r = run({});
    expect(r.gate).toBeTruthy();
    expect(Array.isArray(r.cuts)).toBe(true);
    expect(Array.isArray(r.adds)).toBe(true);
  });

  it('is null for a format the scorer does not support (e.g. modern)', () => {
    const r = run({ format: 'modern' });
    expect(r.deckScore).toBeNull();
  });
});

describe('POST /analyze — deckScore', () => {
  const body = (format?: string) =>
    JSON.stringify({
      commanderName: 'Adeliz, the Cinder Wind',
      ...(format ? { format } : {}),
      cards: MAIN_NAMES.map((name) => ({ name, quantity: 1 })),
    });

  it('scores as commander by default (no format field, back-compat)', () => {
    const { res, result } = fakeRes();
    handleAnalyze(body(), res);
    const { status, body: out } = result();
    expect(status).toBe(200);
    expect(out.deckScore).not.toBeNull();
  });

  it('threads an explicit format through instead of hardcoding commander', () => {
    const { res: resC, result: resultC } = fakeRes();
    handleAnalyze(body('commander'), resC);
    const { res: resB, result: resultB } = fakeRes();
    handleAnalyze(body('brawl'), resB);
    const scoreC = resultC().body.deckScore as { score: number } | null;
    const scoreB = resultB().body.deckScore as { score: number } | null;
    expect(scoreC).not.toBeNull();
    expect(scoreB).not.toBeNull();
    expect(scoreB!.score).not.toBe(scoreC!.score);
  });

  it('rejects an unsupported format with 400, same enum as /build', () => {
    const { res, result } = fakeRes();
    handleAnalyze(body('modern'), res);
    expect(result().status).toBe(400);
  });
});

// v1.4 §10.5: the seam every call site shares. An unresolved name is missing
// EVIDENCE — the payload stays present, turns provisional, keeps the copies
// as reserved slots and carries NO cap. (`optimize.ts` resolves `unresolved`
// for its own response but does not hand it to the scorer yet; that seam gap
// is a services-side fix, not a scorer one.)
describe('scoreDeckSafely — unresolved names', () => {
  const deck = (): Parameters<typeof scoreDeckSafely>[0] => {
    const cards = JSON.parse(fs.readFileSync(path.join(FIX, 'cards.json'), 'utf8')) as DbCard[];
    const commander = cards.find((c) => c.name === 'Adeliz, the Cinder Wind')!;
    const main = MAIN_NAMES.map((name) => ({ card: cards.find((c) => c.name === name)!, quantity: 1 }));
    return { format: 'brawl', main, commander: [commander] };
  };

  it('stays scored, turns provisional and caps nothing', () => {
    const clean = scoreDeckSafely(deck());
    const withUnknown = scoreDeckSafely({ ...deck(), unresolved: [{ name: 'Not A Card', quantity: 2, board: 'main' }] });
    expect(clean).not.toBeNull();
    expect(withUnknown).not.toBeNull();
    expect(withUnknown!.provisional).toBe(true);
    const gate = withUnknown!.gates.find((g) => g.key === 'unresolved');
    expect(gate).toMatchObject({ kind: 'evidence', status: 'warn', cap: null });
    expect(withUnknown!.gates.every((g) => g.cap !== 39)).toBe(true);
  });

  it('explains an unavailable input instead of returning an anonymous null', () => {
    expect(scoreDeckSafely({ ...deck(), main: [] })).toBeNull();
    expect(explainScoreUnavailable({ ...deck(), main: [] })).toMatch(/no main-board cards/);
    expect(explainScoreUnavailable(deck())).toBeNull();
  });
});

describe('POST /build — deckScore', () => {
  it('carries deckScore built from the engine result', async () => {
    const commander = JSON.parse(fs.readFileSync(path.join(FIX, 'cards.json'), 'utf8')).find(
      (c: { name: string }) => c.name === 'Adeliz, the Cinder Wind'
    );
    const filler = JSON.parse(fs.readFileSync(path.join(FIX, 'cards.json'), 'utf8')).find(
      (c: { name: string }) => c.name === 'Arcane Signet'
    );
    vi.mocked(autoBuildDeck).mockResolvedValue({
      cards: [{ card: filler, quantity: 40, board: 'main' }],
      themes: [],
      strategy: 'midrange',
    });
    const { res, result } = fakeRes();
    await handleBuild(JSON.stringify({ commanderName: commander.name, format: 'commander' }), res);
    const { status, body: out } = result();
    expect(status).toBe(200);
    // 40 copies of one card is a scorable (if illegal) deck: the payload must be present,
    // not null — null is reserved for unsupported formats / empty input / scorer throws.
    const ds = out.deckScore as { version: string; score: number; components: unknown[]; gates: unknown[] } | null;
    expect(ds).not.toBeNull();
    expect(typeof ds!.version).toBe('string');
    expect(typeof ds!.score).toBe('number');
    expect(Array.isArray(ds!.components)).toBe(true);
    expect(Array.isArray(ds!.gates)).toBe(true);
  });
});
