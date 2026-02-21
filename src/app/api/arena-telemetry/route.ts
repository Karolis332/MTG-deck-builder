import { NextRequest, NextResponse } from 'next/server';
import {
  insertTelemetryActions,
  updateMatchTelemetry,
  getMatchTimeline,
  getMatchTelemetrySummary,
  getCardsByNames,
  resolveGrpIdsToCards,
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

    const actions = getMatchTimeline(matchId) as Array<Record<string, unknown>>;
    const summary = getMatchTelemetrySummary(matchId);

    // Collect all unique card names and grpIds from actions for image resolution
    const cardNames = new Set<string>();
    const grpIds = new Set<number>();
    for (const a of actions) {
      if (a.card_name && typeof a.card_name === 'string') cardNames.add(a.card_name);
      if (a.grp_id && typeof a.grp_id === 'number') grpIds.add(a.grp_id);
    }

    // Also resolve grpIds from all summary fields
    const summaryObj = summary as Record<string, unknown> | null;
    if (summaryObj) {
      // opening_hand: number[]
      // draw_order: number[]
      // opponent_cards_seen: number[] (JSON string)
      for (const field of ['opening_hand', 'draw_order', 'opponent_cards_seen']) {
        try {
          const raw = summaryObj[field];
          if (!raw) continue;
          const ids = typeof raw === 'string' ? JSON.parse(raw) as number[] : raw as number[];
          for (const grpId of ids) {
            if (typeof grpId === 'number') grpIds.add(grpId);
          }
        } catch { /* ignore */ }
      }

      // opponent_cards_by_turn: Record<string, number[]>
      try {
        const raw = summaryObj.opponent_cards_by_turn;
        if (raw) {
          const oct = typeof raw === 'string' ? JSON.parse(raw) as Record<string, number[]> : raw as Record<string, number[]>;
          for (const ids of Object.values(oct)) {
            for (const grpId of ids) {
              if (typeof grpId === 'number') grpIds.add(grpId);
            }
          }
        }
      } catch { /* ignore */ }

      // cards_played: can be number[] or string[]
      try {
        const raw = summaryObj.cards_played;
        if (raw) {
          const items = typeof raw === 'string' ? JSON.parse(raw) as unknown[] : raw as unknown[];
          for (const item of items) {
            if (typeof item === 'number') grpIds.add(item);
          }
        }
      } catch { /* ignore */ }
    }

    // Batch resolve to image URIs
    const cardImageMap: Record<string, { image_uri_small: string | null; image_uri_normal: string | null }> = {};

    if (cardNames.size > 0) {
      const nameResults = getCardsByNames(Array.from(cardNames));
      nameResults.forEach((val, key) => { cardImageMap[key] = val; });
    }

    const grpIdImageMap: Record<number, { card_name: string; image_uri_small: string | null; image_uri_normal: string | null }> = {};
    if (grpIds.size > 0) {
      const grpResults = resolveGrpIdsToCards(Array.from(grpIds));
      grpResults.forEach((val, key) => {
        grpIdImageMap[key] = val;
        // Also add to card name map if not already present
        if (!cardImageMap[val.card_name]) {
          cardImageMap[val.card_name] = { image_uri_small: val.image_uri_small, image_uri_normal: val.image_uri_normal };
        }
      });
    }

    // Backfill card_name from grpId resolution when card_name is null
    for (const a of actions) {
      if (!a.card_name && a.grp_id && typeof a.grp_id === 'number') {
        const resolved = grpIdImageMap[a.grp_id as number];
        if (resolved?.card_name) {
          a.card_name = resolved.card_name;
        }
      }
    }

    return NextResponse.json({ actions, summary: summary ?? null, cards: cardImageMap, grpIdCards: grpIdImageMap });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
