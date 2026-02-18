import { NextRequest, NextResponse } from 'next/server';
import {
  insertTelemetryActions,
  updateMatchTelemetry,
  getMatchTimeline,
  getMatchTelemetrySummary,
} from '@/lib/db';

/**
 * POST /api/arena-telemetry
 * Batch-insert telemetry actions + optional match summary update.
 * Called from Electron main process (no auth — same as /api/arena-matches).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actions, summary } = body;

    let inserted = 0;
    if (Array.isArray(actions) && actions.length > 0) {
      inserted = insertTelemetryActions(actions);
    }

    let summaryUpdated = false;
    if (summary && summary.match_id) {
      summaryUpdated = updateMatchTelemetry(summary.match_id, summary);
    }

    return NextResponse.json({ ok: true, inserted, summaryUpdated });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/arena-telemetry?match_id=xxx
 * Retrieve match timeline (all actions) or telemetry summary.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('match_id');

    if (!matchId) {
      return NextResponse.json(
        { error: 'match_id parameter is required' },
        { status: 400 }
      );
    }

    const view = searchParams.get('view');

    if (view === 'summary') {
      const summary = getMatchTelemetrySummary(matchId);
      return NextResponse.json({ summary: summary ?? null });
    }

    const actions = getMatchTimeline(matchId);
    const summary = getMatchTelemetrySummary(matchId);

    return NextResponse.json({ actions, summary: summary ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
