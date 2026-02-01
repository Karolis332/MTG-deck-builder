import { NextRequest, NextResponse } from 'next/server';
import { getCollection, getCollectionStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = (page - 1) * limit;
  const query = searchParams.get('q') || undefined;
  const rarities = searchParams.get('rarities')?.split(',').filter(Boolean) || undefined;
  const types = searchParams.get('types')?.split(',').filter(Boolean) || undefined;
  const colors = searchParams.get('colors')?.split(',').filter(Boolean) || undefined;

  try {
    const result = getCollection(limit, offset, { query, rarities, types, colors });
    const stats = getCollectionStats();

    return NextResponse.json({
      cards: result.cards,
      total: result.total,
      page,
      hasMore: offset + limit < result.total,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load collection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
