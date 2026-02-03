import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface VersionRow {
  id: number;
  deck_id: number;
  version_number: number;
  name: string | null;
  cards_snapshot: string;
  changes_from_previous: string | null;
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

    const db = getDb();

    // Get current deck cards for snapshot
    const currentCards = db.prepare(`
      SELECT dc.card_id, c.name, dc.quantity, dc.board
      FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ?
      ORDER BY dc.board, c.name
    `).all(Number(deck_id)) as Array<{ card_id: string; name: string; quantity: number; board: string }>;

    const snapshot = currentCards.map((c) => ({
      cardId: c.card_id,
      name: c.name,
      quantity: c.quantity,
      board: c.board,
    }));

    // Get the latest version to compute diff
    const latest = db.prepare(
      'SELECT * FROM deck_versions WHERE deck_id = ? ORDER BY version_number DESC LIMIT 1'
    ).get(Number(deck_id)) as VersionRow | undefined;

    const nextVersion = latest ? latest.version_number + 1 : 1;

    // Compute changes from previous version
    let changes: Array<{ action: string; card: string; quantity: number }> = [];
    if (latest) {
      let prevCards: Array<{ name: string; quantity: number; board: string }> = [];
      try { prevCards = JSON.parse(latest.cards_snapshot); } catch {}

      const prevMap = new Map<string, { quantity: number; board: string }>();
      for (const c of prevCards) prevMap.set(`${c.name}|${c.board}`, { quantity: c.quantity, board: c.board });

      const currMap = new Map<string, { quantity: number; board: string }>();
      for (const c of snapshot) currMap.set(`${c.name}|${c.board}`, { quantity: c.quantity, board: c.board });

      // Find additions and quantity increases
      currMap.forEach((curr, key) => {
        const prev = prevMap.get(key);
        const cardName = key.split('|')[0];
        if (!prev) {
          changes.push({ action: 'added', card: cardName, quantity: curr.quantity });
        } else if (curr.quantity > prev.quantity) {
          changes.push({ action: 'added', card: cardName, quantity: curr.quantity - prev.quantity });
        } else if (curr.quantity < prev.quantity) {
          changes.push({ action: 'removed', card: cardName, quantity: prev.quantity - curr.quantity });
        }
      });

      // Find removals
      prevMap.forEach((prev, key) => {
        if (!currMap.has(key)) {
          const cardName = key.split('|')[0];
          changes.push({ action: 'removed', card: cardName, quantity: prev.quantity });
        }
      });
    }

    const result = db.prepare(`
      INSERT INTO deck_versions (deck_id, version_number, name, cards_snapshot, changes_from_previous)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      Number(deck_id),
      nextVersion,
      name || `v${nextVersion}`,
      JSON.stringify(snapshot),
      JSON.stringify(changes)
    );

    // Assign this version to any future match logs (unversioned ones for this deck)
    const versionId = Number(result.lastInsertRowid);
    db.prepare(`
      UPDATE match_logs SET deck_version_id = ?
      WHERE deck_id = ? AND deck_version_id IS NULL
    `).run(versionId, Number(deck_id));

    return NextResponse.json({
      id: versionId,
      versionNumber: nextVersion,
      name: name || `v${nextVersion}`,
      changes,
      cardCount: snapshot.filter((c) => c.board === 'main').reduce((s, c) => s + c.quantity, 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create version';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
