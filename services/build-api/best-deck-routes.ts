/**
 * /best-deck routes — thin HTTP front for best-deck-jobs.ts.
 *
 *   POST   /best-deck                      -> 202 { jobId, status, position } | 400 | 409 | 422 | 503
 *   GET    /best-deck/:jobId?owner=<owner> -> 200 job view | 404
 *   DELETE /best-deck/:jobId?owner=<owner> -> 200 { status: 'cancelled' } | 404
 *
 * API-key gating happens in server.ts before this is called (always required for these routes,
 * unlike /build and /analyze which run open when BUILD_API_KEY is unset).
 */
import http from 'http';
import { resolveCard, isCommander, costOf } from '../../src/lib/best-deck';
import type { BestDeckQueue, Tier } from './best-deck-jobs';

const OWNER_RE = /^[\w:-]{1,64}$/;
const VALID_TIERS: readonly Tier[] = ['free', 'pro', 'commander'];
const MAX_OWNED_CARDS = 10_000;
const MAX_NAME_LENGTH = 200;
const JOB_ID_RE = /^\/best-deck\/([A-Za-z0-9-]{1,64})$/;

function json(res: http.ServerResponse, code: number, obj: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

interface ParsedBestDeckBody {
  owner: string;
  tier: Tier;
  commanderName?: string;
  ownedCards?: { name: string; quantity?: number }[];
  budgetUsd: number;
}

function parseBody(raw: string): ParsedBestDeckBody | { error: string } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw || '{}');
  } catch {
    return { error: 'invalid JSON body' };
  }

  const owner = typeof parsed.owner === 'string' ? parsed.owner : '';
  if (!OWNER_RE.test(owner)) return { error: 'owner is required and must match /^[\\w:-]{1,64}$/' };

  const tier = typeof parsed.tier === 'string' ? parsed.tier : '';
  if (!VALID_TIERS.includes(tier as Tier)) return { error: `tier must be one of: ${VALID_TIERS.join(', ')}` };

  const format = typeof parsed.format === 'string' ? parsed.format : '';
  if (format !== 'commander') return { error: "format must be 'commander'" };

  const commanderName = typeof parsed.commanderName === 'string' && parsed.commanderName.trim()
    ? parsed.commanderName.trim().slice(0, MAX_NAME_LENGTH)
    : undefined;

  let ownedCards: { name: string; quantity?: number }[] | undefined;
  if (parsed.ownedCards !== undefined) {
    if (!Array.isArray(parsed.ownedCards) || parsed.ownedCards.length > MAX_OWNED_CARDS) {
      return { error: `ownedCards must be an array of at most ${MAX_OWNED_CARDS} entries` };
    }
    ownedCards = parsed.ownedCards
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .map((c) => ({
        name: String(c.name ?? '').trim().slice(0, MAX_NAME_LENGTH),
        quantity: typeof c.quantity === 'number' ? c.quantity : undefined,
      }))
      .filter((c) => c.name.length > 0);
  }

  if (!commanderName && !ownedCards?.length) {
    return { error: 'ownedCards or commanderName is required' };
  }

  const budgetUsd = parsed.budgetUsd;
  if (typeof budgetUsd !== 'number' || !Number.isFinite(budgetUsd) || budgetUsd < 0 || budgetUsd > 10_000) {
    return { error: 'budgetUsd must be a number 0..10000' };
  }

  return { owner, tier: tier as Tier, commanderName, ownedCards, budgetUsd };
}

export function handleBestDeckRoute(
  method: string,
  pathname: string,
  search: string,
  body: string,
  res: http.ServerResponse,
  queue: BestDeckQueue,
): boolean {
  if (!pathname.startsWith('/best-deck')) return false;

  if (method === 'POST' && pathname === '/best-deck') {
    const parsed = parseBody(body);
    if ('error' in parsed) {
      json(res, 400, { error: parsed.error });
      return true;
    }

    // Cheap sync 422: resolve the name and check isCommander in the parent, before the job
    // ever reaches the queue — a bad commander name fails in milliseconds, not after a wait.
    if (parsed.commanderName) {
      const row = resolveCard(parsed.commanderName);
      if (!row) {
        json(res, 422, { error: `unknown commander: ${parsed.commanderName}` });
        return true;
      }
      if (!isCommander(row, 'commander')) {
        json(res, 422, { error: `${row.name} cannot be a commander` });
        return true;
      }
      // Unaffordable/unpriced unowned commander (refuter M2): fail fast here rather than let
      // the job queue, run, and fail deep inside the engine with the same information available.
      // N1: an owned DFC listed by its front face only (e.g. "Esika, God of the Tree" for a row
      // whose canonical name is "Esika, God of the Tree // The Prismatic Bridge") must still count
      // as owned — match either the full name or the front face, and skip zero-quantity entries.
      const ownedNames = new Set(
        (parsed.ownedCards ?? [])
          .filter((c) => (c.quantity ?? 1) >= 1)
          .map((c) => c.name.toLowerCase()),
      );
      const frontFace = row.name.split(' // ')[0].toLowerCase();
      const isOwned = ownedNames.has(row.name.toLowerCase()) || ownedNames.has(frontFace);
      if (!isOwned) {
        const cost = costOf(row, new Set());
        if (cost === null) {
          json(res, 422, { error: `${row.name} has no price data and is not owned` });
          return true;
        }
        if (cost > parsed.budgetUsd) {
          json(res, 422, { error: `${row.name} costs $${cost}, over the $${parsed.budgetUsd} budget` });
          return true;
        }
      }
    }

    const enqueued = queue.enqueue({
      owner: parsed.owner,
      tier: parsed.tier,
      request: {
        commanderName: parsed.commanderName,
        owned: parsed.ownedCards,
        budgetUsd: parsed.budgetUsd,
      },
    });
    if (enqueued.kind === 'conflict') {
      json(res, 409, { error: 'this owner already has an active job', jobId: enqueued.jobId });
      return true;
    }
    if (enqueued.kind === 'full') {
      json(res, 503, { error: 'queue full, try again shortly' });
      return true;
    }
    json(res, 202, { jobId: enqueued.jobId, status: enqueued.status, position: enqueued.position });
    return true;
  }

  const match = pathname.match(JOB_ID_RE);
  if (match && (method === 'GET' || method === 'DELETE')) {
    const jobId = match[1];
    const owner = new URLSearchParams(search).get('owner') || '';

    if (method === 'GET') {
      const job = queue.get(jobId, owner);
      if (!job) {
        json(res, 404, { error: 'unknown job or owner mismatch' });
        return true;
      }
      json(res, 200, job);
      return true;
    }

    const outcome = queue.cancel(jobId, owner);
    if (outcome === 'not-found') {
      json(res, 404, { error: 'unknown job or owner mismatch' });
      return true;
    }
    json(res, 200, { status: 'cancelled' });
    return true;
  }

  json(res, 404, { error: 'not found' });
  return true;
}
