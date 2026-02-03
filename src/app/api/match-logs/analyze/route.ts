import { NextRequest, NextResponse } from 'next/server';
import { analyzeMatchesForDeck } from '@/lib/match-analyzer';

// GET /api/match-logs/analyze?deck_id=123
export async function GET(req: NextRequest) {
  const deckId = req.nextUrl.searchParams.get('deck_id');

  if (!deckId) {
    return NextResponse.json({ error: 'deck_id required' }, { status: 400 });
  }

  const analysis = analyzeMatchesForDeck(Number(deckId));
  return NextResponse.json(analysis);
}
