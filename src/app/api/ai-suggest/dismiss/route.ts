import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { trackCFEvent } from '@/lib/cf-api-client';

const dismissBodySchema = z.object({
  impression_id: z.string().optional(),
  card_name: z.string(),
  commander: z.string(),
  source: z.string().optional(),
  color_identity: z.string().optional().default(''),
  deck_cards: z.array(z.string()).optional().default([]),
  candidates_shown: z.array(z.string()).optional(),
});

// POST /api/ai-suggest/dismiss — report a shown-but-not-applied suggestion
// to the CF bandit, so it stops reinforcing ignored cards. Fire-and-forget.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = dismissBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await trackCFEvent({
    event_type: 'suggestion_dismissed',
    ...parsed.data,
  });

  return NextResponse.json({ ok: true });
}
