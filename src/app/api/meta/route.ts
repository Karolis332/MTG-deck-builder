import { NextRequest, NextResponse } from 'next/server';
import { getMetaBreakdown } from '@/lib/global-learner';

// GET /api/meta?format=standard&days=28
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'standard';
    const days = parseInt(searchParams.get('days') || '28', 10);

    const breakdown = getMetaBreakdown(format, days);

    return NextResponse.json({ format, days, meta: breakdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load meta data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
