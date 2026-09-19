import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/web-sync';

// Isolate the route's own logic (CSRF guards, auth gating, action dispatch) from
// web-sync.ts's real behavior, which src/lib/__tests__/web-sync.test.ts already covers.
// isSameOriginRequest is kept real (spread from importOriginal) — it's the thing the
// 403 tests below and the isSameOriginRequest describe block are actually verifying.
// vi.hoisted is required here (not plain top-level consts) because this file also has a
// static `import { isSameOriginRequest } from '@/lib/web-sync'`, which runs the mock
// factory before any later top-level `const` would otherwise have been assigned.
const { getWebSyncStatus, setWebSyncSettings, syncPendingMatches, testWebSync, getAuthUser } = vi.hoisted(() => ({
  getWebSyncStatus: vi.fn(() => ({
    configured: false,
    url: 'https://theblackgrimoire.com',
    lastAt: null,
    lastResult: null,
  })),
  setWebSyncSettings: vi.fn(),
  syncPendingMatches: vi.fn(async () => ({ ok: true, sent: 0, accepted: 0, duplicates: 0, rejected: 0 })),
  testWebSync: vi.fn(async () => ({ ok: true, userId: 'u1', matches: 1 })),
  // save/test require a session; sync (called cookie-less from Electron's main process
  // on app start, via postToApi's plain http.request) must not. Default signed-in so
  // dispatch tests don't need to know about auth; the 401 tests override to null.
  getAuthUser: vi.fn(async (): Promise<{ userId: number; username: string } | null> => ({
    userId: 1,
    username: 'op',
  })),
}));

vi.mock('@/lib/web-sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/web-sync')>();
  return { ...actual, getWebSyncStatus, setWebSyncSettings, syncPendingMatches, testWebSync };
});

vi.mock('@/lib/auth-middleware', () => ({
  getAuthUser,
  unauthorizedResponse: () => NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
}));

function post(body: string, headers?: Record<string, string>) {
  return new NextRequest('http://localhost/api/web-sync', { method: 'POST', body, headers });
}

const JSON_CT = { 'Content-Type': 'application/json' };

describe('isSameOriginRequest', () => {
  function headers(map: Record<string, string>) {
    return { get: (name: string) => map[name.toLowerCase()] ?? null };
  }

  it('allows a request with neither Origin nor sec-fetch-site (postToApi from the Electron main process)', () => {
    expect(isSameOriginRequest(headers({}))).toBe(true);
  });

  it('allows a same-origin localhost/127.0.0.1 Origin, any port', () => {
    expect(isSameOriginRequest(headers({ origin: 'http://localhost:3000' }))).toBe(true);
    expect(isSameOriginRequest(headers({ origin: 'http://127.0.0.1:3311' }))).toBe(true);
  });

  it('rejects a cross-origin Origin', () => {
    expect(isSameOriginRequest(headers({ origin: 'https://evil.example' }))).toBe(false);
  });

  it('rejects sec-fetch-site: cross-site regardless of Origin', () => {
    expect(isSameOriginRequest(headers({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(
      isSameOriginRequest(headers({ origin: 'http://localhost:3000', 'sec-fetch-site': 'cross-site' }))
    ).toBe(false);
  });
});

describe('POST /api/web-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUser.mockResolvedValue({ userId: 1, username: 'op' });
  });

  it('rejects a request with no Content-Type header (defaults to text/plain) — 415 "json only"', async () => {
    const { POST } = await import('../route');
    const res = await POST(post(JSON.stringify({ action: 'save', url: 'https://evil.example' })));
    const json = await res.json();

    expect(res.status).toBe(415);
    expect(json).toEqual({ error: 'json only' });
    expect(setWebSyncSettings).not.toHaveBeenCalled();
  });

  it('rejects an explicit text/plain body (the CORS-simple-request CSRF vector)', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      post(JSON.stringify({ action: 'save', url: 'https://evil.example', token: 'x' }), {
        'Content-Type': 'text/plain',
      })
    );

    expect(res.status).toBe(415);
    expect(setWebSyncSettings).not.toHaveBeenCalled();
  });

  it('rejects text/plain with a charset param naming json (essence is still text/plain, still a CORS simple request)', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      post(JSON.stringify({ action: 'save', url: 'https://evil.example', token: 'x' }), {
        'Content-Type': 'text/plain; charset=application/json',
      })
    );

    expect(res.status).toBe(415);
    expect(setWebSyncSettings).not.toHaveBeenCalled();
  });

  it('rejects a distinct type that merely starts with the same characters (application/json-patch+json)', async () => {
    const { POST } = await import('../route');
    const res = await POST(post(JSON.stringify({ action: 'sync' }), { 'Content-Type': 'application/json-patch+json' }));

    expect(res.status).toBe(415);
    expect(syncPendingMatches).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin Origin even with application/json — 403', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      post(JSON.stringify({ action: 'save', url: 'https://evil.example', token: 'x' }), {
        ...JSON_CT,
        Origin: 'https://evil.example',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toEqual({ error: 'cross-origin request rejected' });
    expect(setWebSyncSettings).not.toHaveBeenCalled();
  });

  it('rejects sec-fetch-site: cross-site — 403', async () => {
    const { POST } = await import('../route');
    const res = await POST(post(JSON.stringify({ action: 'sync' }), { ...JSON_CT, 'sec-fetch-site': 'cross-site' }));

    expect(res.status).toBe(403);
    expect(syncPendingMatches).not.toHaveBeenCalled();
  });

  it('accepts application/json from a same-origin request and dispatches the save action', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      post(JSON.stringify({ action: 'save', url: 'https://theblackgrimoire.com', token: 'tok' }), {
        ...JSON_CT,
        Origin: 'http://localhost:3311',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(setWebSyncSettings).toHaveBeenCalledWith({ url: 'https://theblackgrimoire.com', token: 'tok' });
  });

  it('accepts a application/json content-type with a charset suffix', async () => {
    const { POST } = await import('../route');
    const res = await POST(post(JSON.stringify({ action: 'sync' }), JSON_CT));

    expect(res.status).toBe(200);
    expect(syncPendingMatches).toHaveBeenCalled();
  });

  it('requires auth for save — 401 with no session', async () => {
    getAuthUser.mockResolvedValue(null);
    const { POST } = await import('../route');
    const res = await POST(post(JSON.stringify({ action: 'save', token: 'x' }), JSON_CT));

    expect(res.status).toBe(401);
    expect(setWebSyncSettings).not.toHaveBeenCalled();
  });

  it('requires auth for test — 401 with no session', async () => {
    getAuthUser.mockResolvedValue(null);
    const { POST } = await import('../route');
    const res = await POST(post(JSON.stringify({ action: 'test' }), JSON_CT));

    expect(res.status).toBe(401);
    expect(testWebSync).not.toHaveBeenCalled();
  });

  it('does not require auth for sync — the Electron app-start hook is cookie-less', async () => {
    getAuthUser.mockResolvedValue(null);
    const { POST } = await import('../route');
    const res = await POST(post(JSON.stringify({ action: 'sync' }), JSON_CT));

    expect(res.status).toBe(200);
    expect(syncPendingMatches).toHaveBeenCalled();
  });
});
