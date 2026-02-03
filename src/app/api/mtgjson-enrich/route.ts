import { NextResponse } from 'next/server';
import { enrichArenaIds } from '@/lib/mtgjson-enrich';
import { getArenaIdCoverage } from '@/lib/db';

/**
 * POST /api/mtgjson-enrich — trigger MTGJSON enrichment
 * Downloads AtomicCards.json.gz and populates cards.arena_id
 */
export async function POST() {
  try {
    const result = await enrichArenaIds();
    const coverage = getArenaIdCoverage();

    return NextResponse.json({
      ok: true,
      downloaded: result.downloaded,
      updated: result.updated,
      coverage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Enrichment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/mtgjson-enrich — check arena_id coverage
 */
export async function GET() {
  try {
    const coverage = getArenaIdCoverage();
    return NextResponse.json({ coverage });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check coverage';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
