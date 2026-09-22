import { describe, it, expect, vi } from 'vitest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { handleBuild } from '../services/build-api/server';
import { getDb } from '../src/lib/db';
import type { DbCard } from '../src/lib/types';
import type { BuildResult } from '../src/lib/deck-builder-ai';

vi.mock('../src/lib/deck-builder-ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/deck-builder-ai')>();
  return { ...actual, autoBuildDeck: vi.fn() };
});

function fakeRes(): { res: http.ServerResponse; done: Promise<{ status: number; body: unknown }> } {
  let statusCode = 0;
  let resolveDone!: (v: { status: number; body: unknown }) => void;
  const done = new Promise<{ status: number; body: unknown }>((resolve) => { resolveDone = resolve; });
  const res = {
    writeHead(code: number) { statusCode = code; return res; },
    end(chunk?: string) {
      resolveDone({ status: statusCode, body: chunk ? JSON.parse(chunk) : undefined });
    },
  } as unknown as http.ServerResponse;
  return { res, done };
}

async function build(body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
  const { res, done } = fakeRes();
  void handleBuild(JSON.stringify(body), res);
  return done;
}

// Request-parsing validation only (§ contract). These all fail before the
// engine is invoked (commanderName presence is checked first, but any
// nonempty string satisfies that — the DB lookup for the commander happens
// deeper in autoBuildDeck, past the fields under test here).
describe('POST /build — price cap / deck budget / bracket request validation', () => {
  it('rejects an out-of-range bracket', async () => {
    const { status, body } = await build({ commanderName: 'Krenko, Mob Boss', bracket: 7 });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/bracket/i);
  });

  it('rejects a non-integer bracket', async () => {
    const { status, body } = await build({ commanderName: 'Krenko, Mob Boss', bracket: 2.5 });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/bracket/i);
  });

  it('rejects a negative maxCardPrice', async () => {
    const { status, body } = await build({ commanderName: 'Krenko, Mob Boss', maxCardPrice: -1 });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/maxCardPrice/i);
  });

  it('rejects a negative maxDeckPrice', async () => {
    const { status, body } = await build({ commanderName: 'Krenko, Mob Boss', maxDeckPrice: -5 });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/maxDeckPrice/i);
  });

  it('rejects string values for the numeric fields', async () => {
    const r1 = await build({ commanderName: 'Krenko, Mob Boss', maxCardPrice: '10' });
    expect(r1.status).toBe(400);
    const r2 = await build({ commanderName: 'Krenko, Mob Boss', maxDeckPrice: '100' });
    expect(r2.status).toBe(400);
    const r3 = await build({ commanderName: 'Krenko, Mob Boss', bracket: '2' });
    expect(r3.status).toBe(400);
  });
});

// Round 2 (web refuter H2): a real collection build must report `owned` per
// card so the web can reconcile its totals against price.total; a build with
// no collection must not carry the key at all (not just false everywhere).
// Round 3: the previous version of this suite called the real engine (a live
// EDHREC network fetch, ~35s/build) and timed out under contention in the
// full run. `autoBuildDeck` is mocked so these are deterministic, offline,
// and only exercise the response mapper in server.ts.
describe('POST /build — owned flag on cards[]', () => {
  function cardRow(name: string): DbCard {
    const row = getDb().prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1').get(name) as DbCard | undefined;
    if (!row) throw new Error(`fixture card not found in repo DB: ${name}`);
    return row;
  }

  // >= 60 real, DB-recognized names so handleBuild's collectionMatched gate
  // passes — this list has always been a fast local lookup, never the slow part.
  const bulkOwnedNames = fs.readFileSync(
    path.join(__dirname, '../decks/test-builds/meren-nel-toth--winning-reference.txt'), 'utf8'
  )
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('//'))
    .map((l) => l.replace(/^\d+\s+/, '').replace(' *CMDR*', '').trim())
    .filter((n) => n !== 'Journey to Eternity'); // not in the repo DB

  const mockResult: BuildResult = {
    cards: [
      { card: cardRow('Sol Ring'), quantity: 1, board: 'main' }, // in bulkOwnedNames
      { card: cardRow('Birds of Paradise'), quantity: 1, board: 'main' }, // in bulkOwnedNames
      { card: cardRow('Lightning Bolt'), quantity: 1, board: 'main' }, // not owned
      { card: cardRow('Counterspell'), quantity: 1, board: 'main' }, // not owned
    ],
    themes: [],
    strategy: 'midrange',
  };
  it('marks owned:true only for cards the caller declared owned', async () => {
    const { autoBuildDeck } = await import('../src/lib/deck-builder-ai');
    vi.mocked(autoBuildDeck).mockResolvedValue(mockResult);
    const { status, body } = await build({
      commanderName: 'Krenko, Mob Boss',
      ownedCards: bulkOwnedNames.map((name) => ({ name, quantity: 1 })),
    });
    expect(status).toBe(200);
    const cards = (body as { cards: Array<{ name: string; owned?: boolean }> }).cards;
    expect(cards).toHaveLength(4);
    expect(cards.find((c) => c.name === 'Sol Ring')?.owned).toBe(true);
    expect(cards.find((c) => c.name === 'Birds of Paradise')?.owned).toBe(true);
    expect(cards.find((c) => c.name === 'Lightning Bolt')?.owned).toBe(false);
    expect(cards.find((c) => c.name === 'Counterspell')?.owned).toBe(false);
  });

  it('omits the owned key entirely for a non-collection build', async () => {
    const { autoBuildDeck } = await import('../src/lib/deck-builder-ai');
    vi.mocked(autoBuildDeck).mockResolvedValue(mockResult);
    const { status, body } = await build({ commanderName: 'Krenko, Mob Boss' });
    expect(status).toBe(200);
    const cards = (body as { cards: Array<Record<string, unknown>> }).cards;
    expect(cards).toHaveLength(4);
    for (const c of cards) expect('owned' in c).toBe(false);
  });
});
