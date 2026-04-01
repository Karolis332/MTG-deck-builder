import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();
    const db = getDb();

    if (provider === 'groq') {
      const row = db.prepare("SELECT value FROM app_state WHERE key = 'setting_groq_api_key'").get() as { value: string } | undefined;
      const key = row?.value;
      if (!key) return NextResponse.json({ ok: false, error: 'No Groq API key saved' });

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_completion_tokens: 5,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err?.error?.message || `HTTP ${resp.status}` });
      }
      const data = await resp.json();
      const model = data.model || 'llama-3.3-70b-versatile';
      return NextResponse.json({ ok: true, model });
    }

    if (provider === 'xai') {
      const row = db.prepare("SELECT value FROM app_state WHERE key = 'setting_xai_api_key'").get() as { value: string } | undefined;
      const key = row?.value;
      if (!key) return NextResponse.json({ ok: false, error: 'No xAI API key saved' });

      const resp = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'grok-3-mini-fast',
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_completion_tokens: 5,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err?.error?.message || `HTTP ${resp.status}` });
      }
      const data = await resp.json();
      const model = data.model || 'grok-3-mini-fast';
      return NextResponse.json({ ok: true, model });
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Test failed';
    return NextResponse.json({ ok: false, error: msg });
  }
}
