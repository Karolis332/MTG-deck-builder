import { NextRequest, NextResponse } from 'next/server';
import { createDeck, addCardToDeck, getCardByName, getDeckWithCards } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { COMMANDER_FORMATS } from '@/lib/constants';
import { optimizeDeck, OptimizeError } from '../../../../../../services/build-api/optimize';

interface DeckCardRow {
  name: string;
  quantity: number;
  board: string;
}

interface OptimizeResult {
  cuts: Array<{ name: string; quantity: number }>;
  adds: Array<{ name: string; quantity: number; reason: string }>;
  swaps: Array<{ cut: string; add: string | null }>;
  score: number;
  landTarget: { current: number; recommended: number };
}

/**
 * POST /api/decks/:id/optimize-apply — 60-card "Rebuild with model".
 *
 * The from-scratch engine has no meta or archetype input for 60-card formats and
 * produced mana-rock piles (2026-09-08). For these formats "rebuild" now means:
 * run the optimizer on the list and save `main − cuts + paired adds` as a new
 * deck, exactly what the web /optimizer applies by default. The original deck is
 * untouched; commander formats keep the engine build (/api/decks/auto-build).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = parseInt(params.id, 10);
    if (isNaN(deckId)) return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });

    const deck = getDeckWithCards(deckId, authUser.userId) as
      | ({ name: string; format: string; cards: DeckCardRow[] } & Record<string, unknown>)
      | null;
    if (!deck) return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    if ((COMMANDER_FORMATS as readonly string[]).includes(deck.format)) {
      return NextResponse.json({ error: 'Commander formats use Rebuild with model (auto-build)' }, { status: 400 });
    }

    const lines = deck.cards
      .filter((c) => c.board === 'main' || c.board === 'sideboard')
      .map((c) => ({ name: c.name, quantity: c.quantity, board: c.board }));
    const result = optimizeDeck({ format: deck.format, cards: lines, deckName: deck.name }) as unknown as OptimizeResult;

    // Default selection mirrors the web: every cut, plus the add paired with it.
    const cutQty = new Map(result.cuts.map((c) => [c.name.toLowerCase(), c.quantity]));
    const pairedAdds = new Set(result.swaps.map((s) => s.add).filter((a): a is string => Boolean(a)));
    const adds = result.adds.filter((a) => pairedAdds.has(a.name));
    if (cutQty.size === 0 && adds.length === 0) {
      return NextResponse.json({ error: 'The optimizer found nothing to change in this list' }, { status: 422 });
    }

    const newDeck = createDeck(
      `${deck.name} (Optimized)`,
      deck.format,
      `Optimized from "${deck.name}": ${result.cuts.length} cut(s), ${adds.length} add(s). Score ${result.score}/100, lands ${result.landTarget.current} → target ${result.landTarget.recommended}.`,
      authUser.userId,
      'engine'
    );
    const newDeckId = Number(newDeck.id);

    for (const c of deck.cards) {
      if (c.board !== 'main' && c.board !== 'sideboard') continue;
      const cut = c.board === 'main' ? cutQty.get(c.name.toLowerCase()) ?? 0 : 0;
      const quantity = c.quantity - cut;
      if (quantity <= 0) continue;
      const card = getCardByName(c.name) as { id: string } | undefined;
      if (card) addCardToDeck(newDeckId, card.id, quantity, c.board);
    }
    for (const a of adds) {
      const card = getCardByName(a.name) as { id: string } | undefined;
      if (card) addCardToDeck(newDeckId, card.id, a.quantity, 'main');
    }

    return NextResponse.json({
      deckId: newDeckId,
      cuts: result.cuts.map((c) => ({ name: c.name, quantity: c.quantity })),
      adds: adds.map((a) => ({ name: a.name, quantity: a.quantity, reason: a.reason })),
      score: result.score,
    });
  } catch (error) {
    if (error instanceof OptimizeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[optimize-apply] failed:', error instanceof Error ? error.stack || error.message : error);
    return NextResponse.json({ error: 'Optimize failed' }, { status: 500 });
  }
}
