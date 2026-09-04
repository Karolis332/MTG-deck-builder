/**
 * ArenaMatch → derived DB columns, including commander names via the grpId resolver.
 * Shared by POST /api/arena-matches (insert / re-POST) and POST /api/arena-matches/reparse.
 */

import { getDb, type ArenaMatchDerived } from '@/lib/db';
import { GrpIdResolver } from '@/lib/grp-id-resolver';
import type { ArenaMatch } from '@/lib/arena-log-reader';

let resolver: GrpIdResolver | null = null;
function getResolver(): GrpIdResolver {
  if (!resolver) resolver = new GrpIdResolver(getDb());
  return resolver;
}

/** Arena rebalanced alias ("A-Name") → paper name; grpId strings kept when unresolved. */
function paperName(name: string): string {
  return name.startsWith('A-') ? name.slice(2) : name;
}

export async function resolveCommanderNames(grpIds: string[]): Promise<string | null> {
  const ids = grpIds.map((g) => Number(g)).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return null;
  const map = await getResolver().resolveMany(ids);
  const names = ids.map((id) => {
    const card = map.get(id);
    return card && !/^\d+$/.test(card.name) ? paperName(card.name) : null;
  }).filter((n): n is string => !!n);
  return names.length ? Array.from(new Set(names)).join(' // ') : null;
}

export async function deriveFromMatch(m: ArenaMatch): Promise<ArenaMatchDerived> {
  const [playerCommander, opponentCommander] = await Promise.all([
    resolveCommanderNames(m.playerCommanderGrpIds ?? []),
    resolveCommanderNames(m.opponentCommanderGrpIds ?? []),
  ]);
  return {
    playerName: m.playerName ?? null,
    opponentName: m.opponentName ?? null,
    result: m.result,
    turns: m.turns ?? 0,
    playerScreenName: m.playerScreenName ?? m.playerName ?? null,
    playerSeat: m.playerSeat ?? null,
    winnerSeat: m.winnerSeat ?? null,
    opponentCommander,
    playerCommander,
    formatNormalized: m.formatNormalized ?? 'other',
    queueRaw: m.queueRaw ?? m.format ?? null,
    gameResults: m.gameResults?.length ? JSON.stringify(m.gameResults) : null,
    durationSeconds: m.durationSeconds ?? null,
    rawEvents: m.rawEvents?.length ? JSON.stringify(m.rawEvents) : null,
    startedAt: m.startedAt ?? null,
  };
}

/** True when the payload carries the §1.5 contract fields (new parser), not a legacy shape. */
export function hasContractFields(body: Record<string, unknown>): body is Record<string, unknown> & ArenaMatch {
  return typeof body.formatNormalized === 'string' && Array.isArray(body.rawEvents);
}
