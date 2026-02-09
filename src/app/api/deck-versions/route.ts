import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createVersionSnapshot } from '@/lib/deck-versioning';

interface VersionRow {
  id: number;
  deck_id: number;
  version_number: number;
  name: string | null;
  cards_snapshot: string;
  changes_from_previous: string | null;
  source: string | null;
  change_type: string | null;
  created_at: string;
}

// GET /api/deck-versions?deck_id=1 — list all versions with win rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deck_id');
    if (!deckId) {
      return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
    }

    const db = getDb();
    const versions = db.prepare(
      'SELECT * FROM deck_versions WHERE deck_id = ? ORDER BY version_number DESC'
    ).all(Number(deckId)) as VersionRow[];

    // Compute win rates per version
    const versionsWithStats = versions.map((v) => {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
        FROM match_logs WHERE deck_version_id = ?
      `).get(v.id) as { total: number; wins: number; losses: number };

      let changes: Array<{ action: string; card: string; quantity: number }> = [];
      try {
        changes = JSON.parse(v.changes_from_previous || '[]');
      } catch {}

      return {
        id: v.id,
        versionNumber: v.version_number,
        name: v.name,
        source: v.source || 'manual',
        changeType: v.change_type,
        createdAt: v.created_at,
        changes,
        stats: {
          total: stats.total,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : null,
        },
      };
    });

    return NextResponse.json({ versions: versionsWithStats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load versions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/deck-versions — snapshot the current deck state as a new version
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deck_id, name } = body;

    if (!deck_id) {
      return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
    }

    const versionInfo = createVersionSnapshot(Number(deck_id), 'snapshot', undefined, name);

    if (!versionInfo) {
      return NextResponse.json({ error: 'Version creation debounced (too recent)' }, { status: 429 });
    }

    return NextResponse.json({
      id: versionInfo.id,
      versionNumber: versionInfo.versionNumber,
      name: versionInfo.name,
      changes: versionInfo.changes,
      cardCount: versionInfo.cardCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create version';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
