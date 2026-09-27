import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { trackCFEvent } from '@/lib/cf-api-client';
import { recallCFImpression } from '@/lib/cf-impressions';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

// ModelFeed's buildDismissPayload sends deck_id + impression_id; the deck context
// comes from the impression registry, so it is the deck the suggestions were
// fetched for even after later applies.
const dismissBodySchema = z.object({
  deck_id: z.number().int().positive(),
  impression_id: z.string().optional(),
  card_name: z.string().min(1),
  source: z.string().optional(),
  candidates_shown: z.array(z.string()).optional(),
});

// POST /api/ai-suggest/dismiss — report a shown-but-not-applied CF suggestion to
// the bandit, so it stops reinforcing ignored cards. Fire-and-forget. Suggestions
// from rules/LLM sources were never registered, so they send nothing. The events
// contract has no dismiss type; card_ignored (reward 0) is its "shown, not acted on".
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = await request.json().catch(() => null);
  const parsed = dismissBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { deck_id, ...rest } = parsed.data;
  const ctx = recallCFImpression(rest.impression_id, deck_id, user.userId);
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
