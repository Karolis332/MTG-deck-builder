import { NextResponse } from 'next/server';
import { getCFApiUrl, buildCFHeaders } from '@/lib/cf-api-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = getCFApiUrl();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const resp = await fetch(`${url}/events/track`, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return NextResponse.json({ status: 'error', code: resp.status }, { status: 200 });
    }
    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'error', reason: 'unreachable' }, { status: 200 });
  }
}
