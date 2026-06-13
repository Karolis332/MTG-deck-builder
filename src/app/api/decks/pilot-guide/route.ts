import { NextRequest, NextResponse } from 'next/server';
import { getDeckWithCards } from '@/lib/db';
import { buildPilotGuide } from '@/lib/pilot-guide';
import type { PilotCard } from '@/lib/pilot-guide';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

interface DeckCardRow {
  name: string;
  type_line?: string | null;
  oracle_text?: string | null;
  mana_cost?: string | null;
  cmc?: number | null;
  color_identity?: string | null;
  board: string;
}

/** Deterministic per-deck piloting guide (no LLM). */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = Number(new URL(request.url).searchParams.get('deckId'));
    if (!deckId) return NextResponse.json({ error: 'deckId required' }, { status: 400 });

    const deck = getDeckWithCards(deckId, authUser.userId) as
      | { format?: string; cards: DeckCardRow[] }
      | null;
    if (!deck) return NextResponse.json({ error: 'Deck not found' }, { status: 404 });

    const commanderRow = deck.cards.find((c) => c.board === 'commander');
    if (!commanderRow) {
      return NextResponse.json({ error: 'Piloting guide is only available for commander decks' }, { status: 400 });
    }
    const partnerRow = deck.cards.filter((c) => c.board === 'commander')[1];

    const guide = buildPilotGuide({
      commander: commanderRow.name,
      partner: partnerRow?.name,
      format: deck.format || 'commander',
      archetype: '',
      cards: deck.cards as PilotCard[],
      commanderCard: commanderRow,
    });

    return NextResponse.json(guide);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pilot guide failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
