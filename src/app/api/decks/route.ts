import { NextRequest, NextResponse } from 'next/server';
import { getAllDecks, createDeck } from '@/lib/db';

export async function GET() {
  try {
    const decks = getAllDecks();
    return NextResponse.json({ decks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load decks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, format, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Deck name is required' }, { status: 400 });
    }

    const deck = createDeck(name.trim(), format, description);
    return NextResponse.json({ deck }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create deck';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
