/**
 * GET /api/deck-analysis — deckScore wiring (docs/DECK_SCORE_SPEC.md,
 * src/lib/deck-score-input.ts). `@/lib/db` resolves its DB directory ONCE at
 * import time (`resolveDbDir()` reads `process.env.MTG_DB_DIR` at module
 * load), so a static import here would freeze onto the real project DB
 * before this file's own `process.env` line ever runs (tests/db.test.ts hit
 * the same thing) — every module that transitively imports `@/lib/db`
 * (including the route) is dynamic-imported after the env var is set.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'data', 'test-deck-analysis-dir');
fs.rmSync(TEST_DIR, { recursive: true, force: true });
fs.mkdirSync(TEST_DIR, { recursive: true });
process.env.MTG_DB_DIR = TEST_DIR;

vi.mock('@/lib/auth-middleware', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getAuthUser: vi.fn().mockResolvedValue({ userId: 1, username: 'test' }) };
});

type DbLib = typeof import('@/lib/db');
type RouteLib = typeof import('../src/app/api/deck-analysis/route');
let db: ReturnType<DbLib['getDb']>;
let GET: RouteLib['GET'];

function seedCard(db_: ReturnType<DbLib['getDb']>, id: string, name: string, typeLine: string, extra: Record<string, unknown> = {}): void {
  db_
    .prepare(
      `INSERT INTO cards (id, oracle_id, name, cmc, type_line, colors, color_identity, legalities, layout,
                          set_code, set_name, collector_number, rarity)
       VALUES (@id, @id, @name, @cmc, @typeLine, @colors, @colorIdentity, @legalities, 'normal',
               'tst', 'Test Set', @id, 'common')`
    )
    .run({
      id, name, cmc: (extra.cmc as number) ?? 2, typeLine,
      colors: '["U"]', colorIdentity: '["U"]', legalities: '{"commander":"legal"}',
      ...extra,
    });
}

beforeAll(async () => {
  const lib = await import('@/lib/db');
  db = lib.getDb();
  ({ GET } = await import('../src/app/api/deck-analysis/route'));

  db.prepare(`INSERT INTO users (id, username, email, password_hash) VALUES (1, 'test', 't@t.com', 'x')`).run();
  seedCard(db, 'cmd1', 'Adeliz, the Cinder Wind', 'Legendary Creature — Human Wizard');
  for (let i = 0; i < 20; i++) seedCard(db, `c${i}`, `Filler ${i}`, 'Instant', { cmc: 1 });
  db.prepare(`INSERT INTO decks (id, name, format, user_id) VALUES (1, 'Test Deck', 'commander', 1)`).run();
  db.prepare(`INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'cmd1', 1, 'commander')`).run();
  const ins = db.prepare(`INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, ?, 1, 'main')`);
  for (let i = 0; i < 20; i++) ins.run(`c${i}`);
});

afterAll(() => {
  db.close();
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('GET /api/deck-analysis — deckScore', () => {
  it('carries an additive deckScore field alongside overallScore', async () => {
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/deck-analysis?deckId=1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect('deckScore' in json).toBe(true);
    expect(typeof json.overallScore).toBe('number');
    if (json.deckScore) {
      expect(typeof json.deckScore.score).toBe('number');
      expect(Array.isArray(json.deckScore.components)).toBe(true);
    }
  });
});
