import { NextRequest, NextResponse } from 'next/server';
import { getCFApiUrl, buildCFHeaders } from '@/lib/cf-api-client';

/**
 * POST /api/cf-player — proxy heartbeat/match to CF API player endpoints.
 * Body: { action: 'heartbeat' | 'match', ...data }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = getCFApiUrl();
    const { action, ...data } = body;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let endpoint: string;
    if (action === 'heartbeat') {
      endpoint = `${url}/players/heartbeat`;
    } else if (action === 'match') {
      endpoint = `${url}/players/match`;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return NextResponse.json({ status: 'error', code: resp.status }, { status: 200 });
    }
    const result = await resp.json();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ status: 'error', reason: 'unreachable' }, { status: 200 });
  }
}

/**
 * GET /api/cf-player?username=X — get player stats from CF API.
 */
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'username required' }, { status: 400 });
    }

    const url = getCFApiUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(`${url}/players/stats/${encodeURIComponent(username)}`, {
      headers: buildCFHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return NextResponse.json({ status: 'error', code: resp.status }, { status: 200 });
    }
    return NextResponse.json(await resp.json());
  } catch {
    return NextResponse.json({ status: 'error', reason: 'unreachable' }, { status: 200 });
  }
}
