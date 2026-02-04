import { NextRequest, NextResponse } from 'next/server';
import { enrichArenaIds, getEnrichmentProgress, cancelEnrichment } from '@/lib/mtgjson-enrich';
import { getArenaIdCoverage } from '@/lib/db';

/**
 * POST /api/mtgjson-enrich — trigger or cancel MTGJSON enrichment
 * Body: { action: 'cancel' } to cancel, otherwise starts enrichment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'cancel') {
      const cancelled = cancelEnrichment();
      return NextResponse.json({ ok: cancelled, cancelled });
    }

    // Start enrichment in background — return immediately
    const progress = getEnrichmentProgress();
    if (progress.phase === 'downloading' || progress.phase === 'parsing' || progress.phase === 'updating') {
      return NextResponse.json({ ok: true, status: 'already_running', progress });
    }

    // Fire and forget — enrichment runs async
    enrichArenaIds()
      .then(() => {
        // done — progress is updated internally
      })
      .catch(() => {
        // error — progress is updated internally
      });

    return NextResponse.json({ ok: true, status: 'started' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Enrichment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/mtgjson-enrich — check progress or coverage
 * ?progress=true to get enrichment progress
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('progress') === 'true') {
      const progress = getEnrichmentProgress();
      const coverage = getArenaIdCoverage();
      return NextResponse.json({ progress, coverage });
    }

    const coverage = getArenaIdCoverage();
    return NextResponse.json({ coverage });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check coverage';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
