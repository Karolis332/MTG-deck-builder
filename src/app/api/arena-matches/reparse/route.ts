import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getArenaMatchesForReparse,
  getArenaMatchAudit,
  applyArenaDerivedBatch,
  type ArenaMatchDerived,
} from '@/lib/db';
import {
  extractMatches,
  parseArenaLogFile,
  deriveLegacyFields,
  type ArenaMatch,
  type JsonBlock,
} from '@/lib/arena-log-reader';
import { deriveFromMatch } from '../_derive';

/**
 * POST /api/arena-matches/reparse
 * Body (all optional): { logText?: string; screenName?: string; dryRun?: boolean }
 *
 * Rebuilds ONLY derived columns (result / turns / opponent_name / player_name + the
 * migration-42 contract columns) for every row, in one transaction. Rows are never
 * inserted or deleted. Source per row, in order:
 *   1. the match found in `logText` (Player.log text)   → full re-extraction + raw_events refresh
 *   2. raw_events (stored by the new parser)            → full re-extraction
 *   3. neither                                          → legacy derivation (format mapping;
 *      swap names + flip result when opponent_name == screenName)
 * No auth, like its siblings: called from the Electron shell on localhost.
 */
const bodySchema = z.object({
  logText: z.string().max(200 * 1024 * 1024).optional(),
  screenName: z.string().min(1).max(64).optional(),
  dryRun: z.boolean().optional(),
});

type Source = 'raw_events' | 'log_text' | 'legacy_swap' | 'legacy_format_only';

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { logText, dryRun } = parsed.data;
    const rows = getArenaMatchesForReparse();
    const before = getArenaMatchAudit();

    const fromLog = new Map<string, ArenaMatch>();
    let screenName = parsed.data.screenName ?? null;
    if (logText) {
      const res = parseArenaLogFile(logText, { screenName });
      for (const m of res.matches) fromLog.set(m.matchId, m);
      screenName = screenName ?? res.screenName;
    }
    const screenNameSource = parsed.data.screenName ? 'body' : screenName ? 'log' : 'majority_player_name';
    screenName = screenName ?? majorityName(rows.map((r) => r.player_name));

    const updates: Array<{ matchId: string; derived: ArenaMatchDerived }> = [];
    const perSource: Record<Source, number> = { raw_events: 0, log_text: 0, legacy_swap: 0, legacy_format_only: 0 };
    const changes: Array<{ matchId: string; source: Source; before: string; after: string }> = [];
    const unparseable: string[] = [];

    for (const row of rows) {
      let match: ArenaMatch | null = null;
      let source: Source;
      if (fromLog.has(row.match_id)) {
        // Fresh log text beats stored raw_events (fuller, and refreshes raw_events).
        match = fromLog.get(row.match_id)!;
        source = 'log_text';
      } else if (row.raw_events) {
        match = replayRaw(row.raw_events, screenName);
        source = 'raw_events';
      } else {
        const legacy = deriveLegacyFields(row, screenName);
        source = legacy.swapped ? 'legacy_swap' : 'legacy_format_only';
        updates.push({
          matchId: row.match_id,
          derived: {
            playerName: legacy.playerName,
            opponentName: legacy.opponentName,
            result: legacy.result ?? row.result ?? 'loss',
            turns: row.turns ?? 0,
            playerScreenName: legacy.playerScreenName,
            playerSeat: null,
            winnerSeat: null,
            opponentCommander: null,
            playerCommander: null,
            formatNormalized: legacy.formatNormalized,
            queueRaw: legacy.queueRaw,
            gameResults: null,
            durationSeconds: null,
            rawEvents: null,
            startedAt: null,
          },
        });
        perSource[source]++;
        if (legacy.swapped) {
          changes.push({ matchId: row.match_id, source, before: summary(row.player_name, row.opponent_name, row.result, row.turns), after: summary(legacy.playerName, legacy.opponentName, legacy.result, row.turns) });
        }
        continue;
      }
      if (!match) {
        unparseable.push(row.match_id);
        continue;
      }
      const derived = await deriveFromMatch(match);
      updates.push({ matchId: row.match_id, derived });
      perSource[source]++;
      const beforeStr = summary(row.player_name, row.opponent_name, row.result, row.turns);
      const afterStr = summary(derived.playerName, derived.opponentName, derived.result, derived.turns);
      if (beforeStr !== afterStr) changes.push({ matchId: row.match_id, source, before: beforeStr, after: afterStr });
    }

    const applied = dryRun ? 0 : applyArenaDerivedBatch(updates);
    const after = dryRun ? before : getArenaMatchAudit();

    return NextResponse.json({
      ok: true,
      dryRun: !!dryRun,
      screenName,
      screenNameSource,
      rows: rows.length,
      applied,
      perSource,
      unparseable,
      changes,
      before,
      after,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reparse failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function replayRaw(rawEvents: string, screenName: string | null): ArenaMatch | null {
  try {
    const blocks = JSON.parse(rawEvents) as JsonBlock[];
    if (!Array.isArray(blocks)) return null;
    return extractMatches(blocks, { screenName })[0] ?? null;
  } catch {
    return null;
  }
}

function majorityName(names: Array<string | null>): string | null {
  const counts = new Map<string, number>();
  for (const n of names) if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function summary(p: string | null, o: string | null, r: string | null, t: number | null): string {
  return `${p ?? '?'} vs ${o ?? '?'} ${r ?? '?'} t${t ?? 0}`;
}
