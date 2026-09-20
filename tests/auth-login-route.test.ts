/**
 * POST /api/auth/login — accepts username or email (`src/app/api/auth/login/route.ts`).
 * `@/lib/db` resolves its DB directory ONCE at import time (`resolveDbDir()` reads
 * `process.env.MTG_DB_DIR` at module load), so a static import here would freeze onto
 * the real project DB before this file's own `process.env` line ever runs
 * (tests/db.test.ts, tests/deck-analysis-route.test.ts hit the same thing) — every
 * module that transitively imports `@/lib/db` (including the route) is dynamic-imported
 * after the env var is set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const TEST_DIR = path.join(process.cwd(), 'data', 'test-auth-login-dir');
fs.rmSync(TEST_DIR, { recursive: true, force: true });
fs.mkdirSync(TEST_DIR, { recursive: true });
process.env.MTG_DB_DIR = TEST_DIR;

type DbLib = typeof import('@/lib/db');
type RouteLib = typeof import('../src/app/api/auth/login/route');
let db: ReturnType<DbLib['getDb']>;
let POST: RouteLib['POST'];

const PASSWORD = 'correct horse battery staple';

function postLogin(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  );
}

beforeAll(async () => {
  const dbLib = await import('@/lib/db');
  const { hashPassword } = await import('@/lib/password');
  db = dbLib.getDb();
  ({ POST } = await import('../src/app/api/auth/login/route'));

  dbLib.createUser('grimoire', 'grimoire@example.com', hashPassword(PASSWORD));
});

afterAll(() => {
  db.close();
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('POST /api/auth/login', () => {
  it('logs in by username', async () => {
    const res = await postLogin({ username: 'grimoire', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/auth-token=/);
  });

  it('logs in by email (same user)', async () => {
    const res = await postLogin({ username: 'grimoire@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.username).toBe('grimoire');
  });

  it('logs in by email with surrounding spaces', async () => {
    const res = await postLogin({ username: '  grimoire@example.com  ', password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it('rejects wrong password', async () => {
    const res = await postLogin({ username: 'grimoire', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown username', async () => {
    const res = await postLogin({ username: 'nobody', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await postLogin({ username: 'nobody@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects a body without a password', async () => {
    const res = await postLogin({ username: 'grimoire' });
    expect(res.status).toBe(400);
  });
});
