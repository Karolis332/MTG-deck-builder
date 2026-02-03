import { NextRequest, NextResponse } from 'next/server';
import {
  getDeckWithCards,
  updateDeck,
  deleteDeck,
  addCardToDeck,
  removeCardFromDeck,
  setCardQuantityInDeck,
} from '@/lib/db';
import type { DeckPatchOp } from '@/lib/types';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = parseInt(params.id, 10);
    if (isNaN(deckId)) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    const deck = getDeckWithCards(deckId, authUser.userId);
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    return NextResponse.json({ deck });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load deck';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = parseInt(params.id, 10);
    if (isNaN(deckId)) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    const body = await request.json();
    updateDeck(deckId, body, authUser.userId);
    const deck = getDeckWithCards(deckId, authUser.userId);
    return NextResponse.json({ deck });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update deck';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = parseInt(params.id, 10);
    if (isNaN(deckId)) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    deleteDeck(deckId, authUser.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete deck';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = parseInt(params.id, 10);
    if (isNaN(deckId)) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    // Verify ownership
    const existingDeck = getDeckWithCards(deckId, authUser.userId);
    if (!existingDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const body = await request.json();
    const operations: DeckPatchOp[] = body.operations || [body];

    for (const op of operations) {
      switch (op.op) {
        case 'add_card':
          addCardToDeck(deckId, op.card_id, op.quantity, op.board);
          break;
        case 'remove_card':
          removeCardFromDeck(deckId, op.card_id, op.board);
          break;
        case 'set_quantity':
          setCardQuantityInDeck(deckId, op.card_id, op.quantity, op.board);
          break;
        case 'move_card':
          removeCardFromDeck(deckId, op.card_id, op.from_board);
          addCardToDeck(deckId, op.card_id, 1, op.to_board);
          break;
      }
    }

    const deck = getDeckWithCards(deckId, authUser.userId);
    return NextResponse.json({ deck });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update deck cards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
