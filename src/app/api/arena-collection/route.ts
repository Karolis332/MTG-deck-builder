import { NextRequest, NextResponse } from 'next/server';
import { resolveArenaIds, upsertCollectionCard } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-middleware';

/**
 * POST /api/arena-collection
 *
 * Accepts collection data from Arena's PlayerInventory.GetPlayerCardsV3.
 * Format: { collection: { "arena_id": quantity, ... } }
 *
 * Resolves arena IDs to card database IDs via the cards.arena_id column,
 * then upserts into the collection table with source='arena'.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    const body = await request.json();
    const { collection } = body as { collection: Record<string, number> };

    if (!collection || typeof collection !== 'object') {
      return NextResponse.json(
        { error: 'collection object is required' },
        { status: 400 }
      );
    }

    const arenaIds = Object.keys(collection);
    if (arenaIds.length === 0) {
      return NextResponse.json(
        { error: 'Empty collection' },
        { status: 400 }
      );
    }

    // Resolve arena IDs to card records
    const cardMap = resolveArenaIds(arenaIds);

    let imported = 0;
    const failed: string[] = [];

    for (const [arenaId, quantity] of Object.entries(collection)) {
      const card = cardMap.get(arenaId);
      if (card && card.id) {
        const cardId = card.id as string;
        upsertCollectionCard(cardId, quantity, false, userId, 'arena');
        imported++;
      } else {
        failed.push(arenaId);
      }
    }

    return NextResponse.json({
      imported,
      failed: failed.length,
      failedIds: failed.slice(0, 50), // limit response size
      total: arenaIds.length,
      resolved: cardMap.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import arena collection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
