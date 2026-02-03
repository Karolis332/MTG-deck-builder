import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT key, value FROM app_state WHERE key LIKE 'setting_%'")
      .all() as Array<{ key: string; value: string }>;

    const settings: Record<string, string> = {};
    for (const row of rows) {
      // Strip 'setting_' prefix
      const name = row.key.replace(/^setting_/, '');
      // Mask API keys for security
      if (name.includes('api_key') && row.value.length > 8) {
        settings[name] = row.value.slice(0, 4) + '...' + row.value.slice(-4);
      } else {
        settings[name] = row.value;
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const dbKey = `setting_${key}`;

    if (value === null || value === undefined || value === '') {
      db.prepare('DELETE FROM app_state WHERE key = ?').run(dbKey);
    } else {
      db.prepare(
        'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)'
      ).run(dbKey, String(value));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save setting';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
