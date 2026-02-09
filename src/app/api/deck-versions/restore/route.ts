import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDeckWithCards } from '@/lib/db';
import { restoreDeckToVersion } from '@/lib/deck-versioning';

// POST /api/deck-versions/restore — restore a deck to a previous version
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const body = await request.json();
    const { deck_id, version_id } = body;

    if (!deck_id || !version_id) {
      return NextResponse.json(
        { error: 'deck_id and version_id are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const deck = getDeckWithCards(Number(deck_id), authUser.userId);
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const rollbackVersion = restoreDeckToVersion(Number(deck_id), Number(version_id));

    // Reload deck state after restore
    const restored = getDeckWithCards(Number(deck_id), authUser.userId);

    return NextResponse.json({
      ok: true,
      deck: restored,
      rollbackVersion: rollbackVersion ? {
        id: rollbackVersion.id,
        versionNumber: rollbackVersion.versionNumber,
        name: rollbackVersion.name,
      } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore version';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
