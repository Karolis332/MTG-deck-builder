import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCFDeckContext, trackCFEvent } from '@/lib/cf-api-client';

// ModelFeed's buildDismissPayload sends deck_id, not commander/deck_cards; the
// context is read server-side so the event joins its impression (getCFDeckContext).
const dismissBodySchema = z.object({
  deck_id: z.number().int().positive(),
  impression_id: z.string().optional(),
  card_name: z.string().min(1),
  source: z.string().optional(),
  candidates_shown: z.array(z.string()).optional(),
});

// POST /api/ai-suggest/dismiss — report a shown-but-not-applied suggestion
// to the CF bandit, so it stops reinforcing ignored cards. Fire-and-forget.
// The events contract has no dismiss type; card_ignored (reward 0) is its
// "shown, not acted on" event.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = dismissBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { deck_id, ...rest } = parsed.data;
  const ctx = getCFDeckContext(deck_id);
  if (ctx) {
    await trackCFEvent({
      event_type: 'card_ignored',
      ...rest,
      commander: ctx.commander,
      color_identity: ctx.colorIdentity,
      deck_cards: ctx.deckCards,
    });
  }

  return NextResponse.json({ ok: true });
}
