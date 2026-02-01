import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCardCount } from '@/lib/db';
import * as scryfall from '@/lib/scryfall';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    // Try local first
    const localCardCount = getCardCount();
    if (localCardCount > 0) {
      const db = getDb();
      const results = db
        .prepare(
          `SELECT DISTINCT name FROM cards
           WHERE name LIKE ? COLLATE NOCASE
           ORDER BY edhrec_rank ASC NULLS LAST
           LIMIT 10`
        )
        .all(`${query}%`) as Array<{ name: string }>;

      if (results.length > 0) {
        return NextResponse.json({
          suggestions: results.map((r) => r.name),
        });
      }
    }

    // Fallback to Scryfall
    const suggestions = await scryfall.autocomplete(query);
    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
