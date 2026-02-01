import { NextRequest, NextResponse } from 'next/server';
import { searchCards, getCardCount } from '@/lib/db';
import * as scryfall from '@/lib/scryfall';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const source = searchParams.get('source') || 'auto';
  const offset = (page - 1) * limit;

  try {
    // If we have local cards, search locally first
    const localCardCount = getCardCount();

    if (source !== 'scryfall' && localCardCount > 0 && query) {
      const result = searchCards(query, limit, offset);
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

    // Fall back to Scryfall API
    if (query) {
      const scryfallResult = await scryfall.searchCards(query, page);
      return NextResponse.json({
        cards: scryfallResult.data,
        total: scryfallResult.total_cards,
        page,
        hasMore: scryfallResult.has_more,
        source: 'scryfall',
      });
    }

    // No query — return popular cards from local DB
    if (localCardCount > 0) {
      const result = searchCards('', limit, offset);
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
