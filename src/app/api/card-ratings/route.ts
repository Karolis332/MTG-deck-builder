import { NextRequest, NextResponse } from 'next/server';
import { getTopCards, getCardGlobalScore, getOpeningHandRankings } from '@/lib/global-learner';

// GET /api/card-ratings?format=standard&limit=50
// GET /api/card-ratings?format=standard&card_name=Lightning+Bolt
// GET /api/card-ratings?format=standard&type=opening_hand
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'standard';
    const cardName = searchParams.get('card_name');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Single card lookup
    if (cardName) {
      const score = getCardGlobalScore(cardName, format);
      return NextResponse.json({ card: cardName, format, ...score });
    }

    // Opening hand rankings
    if (type === 'opening_hand') {
      const rankings = getOpeningHandRankings(format);
      return NextResponse.json({ format, type: 'opening_hand', rankings });
    }

    // Top cards by Elo
    const topCards = getTopCards(format, limit);
    return NextResponse.json({ format, cards: topCards });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load card ratings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
