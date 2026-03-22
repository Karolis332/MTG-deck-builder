import { NextRequest, NextResponse } from 'next/server';
import { getEDHRECConsensus } from '@/lib/cf-api-client';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { cards, commander } = body;

  if (!cards?.length || !commander) {
    return NextResponse.json({ error: 'cards and commander required' }, { status: 400 });
  }

  const result = await getEDHRECConsensus(cards, commander);
  if (!result) {
    return NextResponse.json({ error: 'CF API unavailable' }, { status: 503 });
  }

  return NextResponse.json(result);
}
