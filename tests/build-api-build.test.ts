import { describe, it, expect } from 'vitest';
import http from 'http';
import { handleBuild } from '../services/build-api/server';

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
