import { NextRequest, NextResponse } from 'next/server';
import { searchCards, getCardCount } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-middleware';
import * as scryfall from '@/lib/scryfall';
import type { ScryfallCard } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);
  const source = searchParams.get('source') || 'auto';
  const format = searchParams.get('format') || undefined;
  const collectionOnly = searchParams.get('collectionOnly') === 'true';
  const colors = searchParams.get('colors')?.split(',').filter(Boolean) || undefined;
  const offset = (page - 1) * limit;

  // Resolve userId for collection filtering
  let userId: number | undefined;
  if (collectionOnly) {
    const user = await getAuthUser(request);
    if (user) userId = user.userId;
  }

  const searchOptions = {
    format,
    collectionOnly: collectionOnly && userId != null,
    userId,
    colorIdentity: colors,
  };

  try {
    // If we have local cards, search locally first
    const localCardCount = getCardCount();

    if (source !== 'scryfall' && localCardCount > 0 && query) {
      const result = searchCards(query, limit, offset, searchOptions);
      if (result.cards.length > 0) {
        return NextResponse.json({
          cards: result.cards,
          total: result.total,
          page,
          hasMore: offset + limit < result.total,
          source: 'local',
        });
      }
    }

    // Fall back to Scryfall API (no format/collection filtering for Scryfall)
    // Normalize raw Scryfall objects to match DB card format so CardImage works
    if (query) {
      const scryfallResult = await scryfall.searchCards(query, page);
      const normalizedCards = scryfallResult.data.map((card: ScryfallCard) =>
        scryfall.scryfallToDbCard(card)
      );
      return NextResponse.json({
        cards: normalizedCards,
        total: scryfallResult.total_cards,
        page,
        hasMore: scryfallResult.has_more,
        source: 'scryfall',
      });
    }

    // No query — return popular cards from local DB
    if (localCardCount > 0) {
      const result = searchCards('', limit, offset, searchOptions);
      return NextResponse.json({
        cards: result.cards,
        total: result.total,
        page,
        hasMore: offset + limit < result.total,
        source: 'local',
      });
    }

    return NextResponse.json({ cards: [], total: 0, page: 1, hasMore: false, source: 'none' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
