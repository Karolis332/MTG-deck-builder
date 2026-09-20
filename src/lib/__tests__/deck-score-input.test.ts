/**
 * Deck Score wiring seam — src/lib/deck-score-input.ts. Format mapping and
 * the additive `DeckScorePayload` shape, isolated from the real DB via an
 * in-memory `app_state`/`cards` stand-in (mirrors tests/build-api-gate-wiring.test.ts).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { DbCard } from '../types';

let testDb: Database.Database;
vi.mock('../db', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getDb: () => testDb };
});

import { toScoreFormat, buildDeckScoreInput, runDeckScore, scoreDeckSafely } from '../deck-score-input';

beforeAll(() => {
  testDb = new Database(':memory:');
  testDb.exec(`
    CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE cards (id TEXT PRIMARY KEY, name TEXT);
    INSERT INTO app_state (key, value) VALUES ('arena_card_db_version', '2026-09-20');
    INSERT INTO cards (id, name) VALUES ('c1', 'Forest');
  `);
});

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `id-${idCounter}`, oracle_id: `oracle-${idCounter}`,
    mana_cost: null, cmc: 0, type_line: 'Basic Land — Forest', oracle_text: null,
    colors: null, color_identity: '[]', keywords: '[]',
    set_code: 'tst', set_name: 'Test', collector_number: String(idCounter), rarity: 'common',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"commander":"legal"}', power: null, toughness: null, loyalty: null,
    produced_mana: null, edhrec_rank: null, layout: 'normal', updated_at: '2024-01-01',
    subtypes: null, arena_id: null,
    ...overrides,
  };
}

describe('toScoreFormat', () => {
  it('maps the five product formats the scorer supports', () => {
    for (const f of ['commander', 'brawl', 'competitivebrawl', 'standardbrawl', 'standard']) {
      expect(toScoreFormat(f)).toBe(f);
    }
  });

  it('rejects any other product format, including null/undefined', () => {
    for (const f of ['modern', 'pioneer', '1v1', null, undefined, '']) {
      expect(toScoreFormat(f)).toBeNull();
    }
  });
});

describe('buildDeckScoreInput', () => {
  it('returns null for an unsupported format without touching the DB', () => {
    expect(buildDeckScoreInput({ format: 'modern', main: [], commander: [] })).toBeNull();
  });

  it('builds a well-shaped DeckScoreInput for a supported format', () => {
    const forest = mkCard({ name: 'Forest' });
    const input = buildDeckScoreInput({ format: 'commander', main: [{ card: forest, quantity: 40 }], commander: [forest] });
    expect(input).not.toBeNull();
    expect(input!.format).toBe('commander');
    expect(input!.main).toHaveLength(1);
    expect(input!.commander).toHaveLength(1);
    expect(input!.sideboard).toEqual([]);
    expect(input!.unresolved).toEqual([]);
    expect(input!.corpus).toBeNull();
    expect(input!.cardDataVersion).toBe('arena-2026-09-20');
  });

  it('returns null for an empty main deck instead of a misleading {score: 0}', () => {
    const forest = mkCard({ name: 'Forest' });
    expect(buildDeckScoreInput({ format: 'commander', main: [], commander: [forest] })).toBeNull();
  });
});

describe('runDeckScore', () => {
  it('returns null for a null input without throwing', () => {
    expect(runDeckScore(null)).toBeNull();
  });

  it('returns a DeckScorePayload with the wire shape for a scoreable input', () => {
    const forest = mkCard({ name: 'Forest' });
    const input = buildDeckScoreInput({ format: 'commander', main: [{ card: forest, quantity: 40 }], commander: [forest] });
    const payload = runDeckScore(input);
    expect(payload).not.toBeNull();
    expect(typeof payload!.version).toBe('string');
    expect(typeof payload!.score).toBe('number');
    expect(typeof payload!.provisional).toBe('boolean');
    expect(Array.isArray(payload!.components)).toBe(true);
    expect(Array.isArray(payload!.gates)).toBe(true);
  });
});

describe('scoreDeckSafely', () => {
  it('is null for an unsupported format, without a separate build+run step', () => {
    expect(scoreDeckSafely({ format: 'modern', main: [], commander: [] })).toBeNull();
  });

  it('builds and scores a supported deck in one call, same result as the two-step path', () => {
    const forest = mkCard({ name: 'Forest' });
    const args = { format: 'commander' as const, main: [{ card: forest, quantity: 40 }], commander: [forest] };
    expect(scoreDeckSafely(args)).toEqual(runDeckScore(buildDeckScoreInput(args)));
  });

  it('never throws for a null-shaped step failure (empty main)', () => {
    const forest = mkCard({ name: 'Forest' });
    expect(scoreDeckSafely({ format: 'commander', main: [], commander: [forest] })).toBeNull();
  });
});
