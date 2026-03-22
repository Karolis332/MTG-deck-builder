import { NextRequest, NextResponse } from 'next/server';
import { updateLiveSessionResult } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { matchId, result, opponentName } = await request.json();

    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }

    updateLiveSessionResult(matchId, result ?? 'unknown', opponentName ?? null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update result';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
