import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import {
  getWebSyncStatus,
  isSameOriginRequest,
  setWebSyncSettings,
  syncPendingMatches,
  testWebSync,
} from '@/lib/web-sync';

// Force dynamic — this route always reflects live app_state / DB rows.
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  action: z.enum(['sync', 'test', 'save']),
  force: z.boolean().optional(),
  url: z.string().optional(),
  token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // CSRF layer 1: text/plain is a CORS "simple request" (no preflight) — a page the
    // operator's browser visits could otherwise POST here cross-origin. application/json
    // can't be set on a simple request, so requiring it forces a preflight the browser
    // blocks cross-origin.
    // Compare the MIME essence (before any ';' parameter), not a substring/prefix — a
    // prefix check would wrongly accept a distinct type like application/json-patch+json.
    const essence = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (essence !== 'application/json') {
      return NextResponse.json({ error: 'json only' }, { status: 415 });
    }

    // CSRF layer 2: belt-and-braces in case content-type is ever spoofable by a client
    // the Fetch/CORS model doesn't cover.
    if (!isSameOriginRequest(request.headers)) {
      return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // `sync` is also called cookie-less from the Electron main process on app start
    // (postToApi has no cookie jar to attach auth-token with). `save`/`test` are only
    // ever user-initiated from the Settings dialog, which always has a session — gate
    // those like any other mutating desktop route.
    if (parsed.data.action !== 'sync') {
      const authUser = await getAuthUser(request);
      if (!authUser) return unauthorizedResponse();
    }

    if (parsed.data.action === 'test') {
      const result = await testWebSync({});
      return NextResponse.json(result);
    }

    if (parsed.data.action === 'save') {
      setWebSyncSettings({ url: parsed.data.url, token: parsed.data.token });
      return NextResponse.json({ ok: true });
    }

    const result = await syncPendingMatches({ force: parsed.data.force });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Web sync request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Never the token — see getWebSyncStatus. No auth gate: matches /api/settings,
    // returns no secret (configured/url/lastAt/lastResult only).
    return NextResponse.json(getWebSyncStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load web sync status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
