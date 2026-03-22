import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function getCFApiUrl(): string {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_state WHERE key = 'cf_api_url'").get() as { value: string } | undefined;
    if (row?.value) return row.value;
  } catch {}
  return 'http://187.77.110.100/cf-api';
}

function getCFApiKey(): string {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_state WHERE key = 'cf_api_key'").get() as { value: string } | undefined;
    return row?.value || '';
  } catch {
    return '';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = getCFApiUrl();
    const apiKey = getCFApiKey();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;

    // Fire to CF API, don't wait long
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const resp = await fetch(`${url}/events/track`, {
      method: 'POST',
      headers,
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
