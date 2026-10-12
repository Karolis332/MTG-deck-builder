/**
 * runBestDeck — one async job: resolve owned cards in memory, pick or rank a commander, build a
 * budgeted pool (owned + purchasable), climb to an objective-maximising 99, and return the
 * result. No file reads, no `collection` table, no side effects at import time — the DB handle
 * from `./db` is opened lazily so a worker can import this module before it has a request.
 *
 * Contract fields: `C:\Users\QuLeR\.claude\harness\briefs\best-deck-contract.md`.
 */
import type { Statement } from 'better-sqlite3';
import { getDb } from './db';
import { climbDeck, type ClimbOptions } from './deck-climb';
import type { DbCard } from './types';
import {
  BASIC_RE, DECK_SIZE, DEFAULT_WEIGHTS, basicsFor, buildPool, cfStats, costOf, identityOf,
  isCommander, legalIn, makeScorer, powerOf, reportAlternatives, resolveCard, seedDeck,
  type ReportNearMiss, type ReportReplacement, type ReportUpgrade, type Weights,
} from './best-deck';

const FORMAT = 'commander';
/** Not a real ownership source (`basicsFor` only special-cases `'arena'`); any other string falls
 * back to "Wastes only if owned" for a colourless identity — wrong for a request-driven run with
 * no "collection", so colourless identities are special-cased in `basicsForRequest` below instead. */
const OWNED_LIST_SOURCE = 'owned-list';

/**
 * `basicsFor` only grants Wastes when owned or when `source === 'arena'`; a request-driven run has
 * no such distinction — Wastes must be free for a colourless commander exactly like Mountain is
 * free for a mono-red one, or a colourless seed has nothing to fill its basic-land slots with.
 */
function basicsForRequest(identity: string[], owned: readonly DbCard[]): DbCard[] {
  if (identity.length) return basicsFor(identity, OWNED_LIST_SOURCE, owned as DbCard[]);
  const wastes = resolveCard('Wastes');
  return wastes ? [wastes] : [];
}

export class BestDeckInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BestDeckInputError';
  }
}

export interface RunBestDeckRequest {
  commanderName?: string;
  owned?: { name: string; quantity?: number }[];
  budgetUsd: number;
}

export interface RunBestDeckOpts {
  games?: number;
  maxPasses?: number;
  topK?: number;
  batch?: number;
  epsilon?: number;
  screenTop?: number;
  ownedCap?: number;
  buyCap?: number;
  deadlineMs?: number;
}

const OPT_DEFAULTS: Required<RunBestDeckOpts> = {
  // screenTop: Infinity — screen every owned commander by default (still bounded by the 35%
  // screening-time cutoff below); callers that want the old top-N behaviour still can.
  games: 100, maxPasses: 3, topK: 12, batch: 6, epsilon: 0.25,
  screenTop: Infinity, ownedCap: 400, buyCap: 300, deadlineMs: 210_000,
};

export interface RunBestDeckProgress {
  stage: 'resolving' | 'screening' | 'climbing' | 'reporting';
  screened?: number;
  toScreen?: number;
  commander?: string | null;
  pass?: number;
  maxPasses?: number;
  evaluations?: number;
  bestObjective?: number | null;
}

export interface CommanderRank {
  name: string;
  identity: string[];
  screenObjective: number;
  ownedShare: number;
  buyUsd: number;
  climbed: boolean;
}

export type StopReason = 'converged' | 'max-passes' | 'deadline';

export interface RunBestDeckResult {
  commander: DbCard;
  deck: (DbCard & { owned: boolean })[];
  buyList: { name: string; priceUsd: number }[];
  buyUsd: number;
  budgetUsd: number;
  objective: number;
  power: { powerLevel: number; bracket: number };
  climb: { converged: boolean; stopReason: StopReason; passes: number; evaluations: number; swaps: number; poolSize: number };
  commanders: CommanderRank[];
  note: string | null;
  unresolved: string[];
  /** Distinct owned names (quantity >= 1) that resolved to a card — for the caller's `collectionMatched`. */
  ownedResolved: number;
  // v2 (contract): the bounded post-climb report pass.
  upgrades: ReportUpgrade[];
  replacements: ReportReplacement[];
  nearMisses: ReportNearMiss[];
}

export interface CommanderStatsRow { card_name: string; inclusion_rate: number }
export type StatsOf = (commanderName: string) => CommanderStatsRow[];

let statsTop120: Statement | undefined;
/** Indexed on `(commander_name, inclusion_rate DESC)` — one query per candidate, top 120 rows. */
function defaultStatsOf(commanderName: string): CommanderStatsRow[] {
  statsTop120 ??= getDb().prepare(
    'select card_name, inclusion_rate from commander_card_stats where commander_name = ? order by inclusion_rate desc limit 120',
  );
  return statsTop120.all(commanderName) as CommanderStatsRow[];
}

/**
 * Score = summed inclusion rate of owned cards among a candidate's top-120 stats rows.
 * No-stats candidates sort last, by EDHREC rank; ties everywhere break by name for determinism.
 *
 * Measured against the full 265-commander screen in `verify-2026-10-07/best-deck/paper-2`
 * (`verify-2026-10-12/best-deck-port/prerank-eval.md`): this raw-sum formula has the best
 * top-24 recall (60% of the true top 5, 40% of the true top 10) and Spearman correlation
 * (0.40) with the full screen's objective of 7 formulas tried, including coverage-ratio and
 * inclusion² variants — kept as-is rather than swapped for a worse-measured alternative.
 */
export function preRankCommanders(
  candidates: readonly DbCard[],
  ownedNames: ReadonlySet<string>,
  statsOf: StatsOf = defaultStatsOf,
): { card: DbCard; score: number; hasStats: boolean }[] {
  const ranked = candidates.map((card) => {
    const rows = statsOf(card.name);
    const score = rows.reduce((s, r) => s + (ownedNames.has(r.card_name) ? r.inclusion_rate : 0), 0);
    return { card, score, hasStats: rows.length > 0 };
  });
  return ranked.sort((a, b) => {
    if (a.hasStats !== b.hasStats) return a.hasStats ? -1 : 1;
    if (a.hasStats) return b.score - a.score || a.card.name.localeCompare(b.card.name);
    return (a.card.edhrec_rank ?? 1e9) - (b.card.edhrec_rank ?? 1e9) || a.card.name.localeCompare(b.card.name);
  });
}

let topInclusionNames: Statement | undefined;
function topInclusionCards(commanderName: string, n: number): DbCard[] {
  topInclusionNames ??= getDb().prepare(
    'select card_name from commander_card_stats where commander_name = ? order by inclusion_rate desc limit ?',
  );
  const names = (topInclusionNames.all(commanderName, n) as { card_name: string }[]).map((r) => r.card_name);
  return names.map(resolveCard).filter((c): c is DbCard => !!c);
}

let edhrecRankCards: Statement | undefined;
/**
 * No stats rows for this commander: fall back to cards popular overall, filtered to identity in
 * JS afterwards (same `identityOf` check as `buildPool`).
 * ponytail: queries `n * 6` globally by EDHREC rank rather than filtering colour identity in SQL —
 * a narrow one-colour identity can end up with fewer than `buyCap` candidates after the JS filter.
 * Raise the multiplier if that starves a mono-colour screen in practice.
 */
function edhrecFallbackCards(n: number): DbCard[] {
  edhrecRankCards ??= getDb().prepare(
    "select * from cards where edhrec_rank is not null and price_usd is not null and layout not in ('art_series','token') order by edhrec_rank asc limit ?",
  );
  const rows = edhrecRankCards.all(n * 6) as DbCard[];
  // Different printings of the same card share a name but are different rows (different id/price)
  // — dedupe or a popular card like Command Tower comes back several times and breaks singleton.
  return [...new Map(rows.map((c) => [c.name, c])).values()];
}

interface Pool { cards: DbCard[]; poolSize: number }

/**
 * Owned legal in-identity non-basics (sorted like the seed, capped at `ownedCap`) plus unowned
 * priced-within-budget cards from the commander's top `buyCap` by inclusion (EDHREC-rank fallback
 * when the commander has no stats rows).
 */
function buildBudgetedPool(
  commander: DbCard, ownedCards: readonly DbCard[], ownedNames: ReadonlySet<string>, budget: number, o: Required<RunBestDeckOpts>,
): Pool {
  const identity = identityOf(commander);
  const ownedLegal = ownedCards.filter((c) => legalIn(c, FORMAT) && !BASIC_RE.test(c.name));
  const incl = cfStats(commander.name);
  const order = (a: DbCard, b: DbCard): number =>
    (incl.get(b.name) ?? 0) - (incl.get(a.name) ?? 0) || (a.edhrec_rank ?? 1e6) - (b.edhrec_rank ?? 1e6);
  // Dedupe by name, not just id — `ownedLegal`/`buildPool` are already name-unique (from
  // `dedupOwned`), but dedupe defensively anyway since a broken singleton here breaks the deck.
  const ownedSorted = buildPool(commander, ownedLegal, new Set()).sort(order);
  const ownedPool = [...new Map(ownedSorted.map((c) => [c.name, c])).values()].slice(0, o.ownedCap);

  const inOwnedPool = new Set(ownedPool.map((c) => c.name));
  const buyCandidatesRaw = incl.size ? topInclusionCards(commander.name, o.buyCap) : edhrecFallbackCards(o.buyCap);
  const buyCandidates = [...new Map(buyCandidatesRaw.map((c) => [c.name, c])).values()];
  const buyPool = buyCandidates.filter((c) => {
    if (c.name === commander.name || ownedNames.has(c.name) || inOwnedPool.has(c.name)) return false;
    if (!legalIn(c, FORMAT) || !identityOf(c).every((x) => identity.includes(x))) return false;
    const cost = costOf(c, ownedNames);
    return cost !== null && cost > 0 && cost <= budget;
  });

  const cards = [...ownedPool, ...buyPool];
  return { cards, poolSize: cards.length };
}

async function flush(): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
}

/** Engine-bug guard, not a user-input error: the seed/pool/climb stages must never hand back a
 * mis-sized or non-singleton deck (H3/M1 — duplicate printings and a starved colourless seed). */
function assertValidDeck(deck: readonly DbCard[]): void {
  if (deck.length !== DECK_SIZE) throw new Error(`best-deck engine produced ${deck.length} cards, expected ${DECK_SIZE}`);
  const counts = new Map<string, number>();
  for (const c of deck) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  for (const [name, n] of counts) {
    if (n > 1 && !BASIC_RE.test(name)) throw new Error(`best-deck engine produced ${n} copies of non-basic "${name}"`);
  }
}

interface ClimbOutcome { deck: DbCard[]; objective: number; converged: boolean; stopReason: StopReason; passes: number; evaluations: number; swaps: number }

/** `maxPasses: 1` per iteration + a flush between passes, as `scripts/model-lab.ts:176-190` does. */
async function climbWithBudget(
  commander: DbCard, seed: readonly DbCard[], poolCards: readonly DbCard[], basics: readonly DbCard[],
  budget: number, ownedNames: ReadonlySet<string>, weights: Weights, o: Required<RunBestDeckOpts>,
  deadlineAt: number, onProgress?: (p: RunBestDeckProgress) => void,
): Promise<ClimbOutcome> {
  const scorer = makeScorer(FORMAT, commander, weights);
  const costFn = (c: DbCard): number | null => costOf(c, ownedNames);
  const canSwap: NonNullable<ClimbOptions<DbCard>['canSwap']> = (d, slot, card) => {
    const spent = d.reduce((s, c) => s + (costFn(c) ?? 0), 0) - (costFn(d[slot]) ?? 0) + (costFn(card) ?? Infinity);
    return spent <= budget;
  };
  const candidatePool = [...poolCards, ...basics];
  const repeatable = new Set(basics.map((b) => b.name));

  let deck = seed.slice();
  let evaluations = 0;
  let swaps = 0;
  let converged = false;
  let stopReason: StopReason = 'max-passes';
  let passesRun = 0;
  for (let pass = 1; pass <= o.maxPasses; pass++) {
    if (Date.now() >= deadlineAt) { stopReason = 'deadline'; break; }
    const bestSoFar = scorer(deck).objective;
    const evaluationsBeforePass = evaluations;
    onProgress?.({ stage: 'climbing', commander: commander.name, pass, maxPasses: o.maxPasses, evaluations, bestObjective: bestSoFar });
    // Progress within the pass, throttled — a tick per evaluation would flood the IPC pipe to a
    // build-api worker's parent for no benefit the UI could show faster than ~5 evaluations apart.
    const onEvaluate = (n: number): void => {
      if (n % 5 === 0) onProgress?.({ stage: 'climbing', commander: commander.name, pass, maxPasses: o.maxPasses, evaluations: evaluationsBeforePass + n, bestObjective: bestSoFar });
    };
    const r = climbDeck(deck, candidatePool, (d) => scorer(d).objective, {
      maxPasses: 1, topK: o.topK, batch: o.batch, epsilon: o.epsilon, repeatable, canSwap, onEvaluate,
    });
    deck = r.deck;
    swaps += r.swaps.length;
    evaluations += r.evaluations;
    passesRun = pass;
    if (r.converged) { converged = true; stopReason = 'converged'; break; }
    await flush();
  }
  return { deck, objective: scorer(deck).objective, converged, stopReason, passes: passesRun, evaluations, swaps };
}

export async function runBestDeck(
  req: RunBestDeckRequest,
  onProgress?: (p: RunBestDeckProgress) => void,
  opts?: RunBestDeckOpts,
): Promise<RunBestDeckResult> {
  const o: Required<RunBestDeckOpts> = { ...OPT_DEFAULTS, ...opts };
  const deadlineAt = Date.now() + o.deadlineMs;
  const weights: Weights = { ...DEFAULT_WEIGHTS, games: o.games };

  onProgress?.({ stage: 'resolving' });
  // Sort first so resolution and every downstream ranking is independent of request order.
  const uniqueNames = [...new Set((req.owned ?? []).filter((x) => (x.quantity ?? 1) >= 1).map((x) => x.name))].sort();
  const resolved: DbCard[] = [];
  const unresolvedAll: string[] = [];
  for (const name of uniqueNames) {
    const hit = resolveCard(name);
    if (hit) resolved.push(hit); else unresolvedAll.push(name);
  }
  const dedupOwned = [...new Map(resolved.map((c) => [c.name, c])).values()];
  const ownedNames = new Set(dedupOwned.map((c) => c.name));
  const unresolved = unresolvedAll.slice(0, 30);
  const ownedResolved = dedupOwned.length; // distinct resolved cards: "Sol Ring" + "sol ring" count once (refute-ab L4)

  let commander: DbCard;
  let remainingBudget = req.budgetUsd;
  let commanders: CommanderRank[] = [];
  let note: string | null = null;
  let basics: DbCard[];
  let pool: Pool;
  let seed: DbCard[];

  if (req.commanderName) {
    const given = resolveCard(req.commanderName);
    if (!given) throw new BestDeckInputError(`unknown commander: ${req.commanderName}`);
    if (!isCommander(given, FORMAT)) throw new BestDeckInputError(`${given.name} cannot be a commander in ${FORMAT}`);
    commander = given;
    if (!ownedNames.has(commander.name)) {
      const cost = costOf(commander, ownedNames);
      if (cost === null) throw new BestDeckInputError(`${commander.name} has no price data and is not owned`);
      if (cost > req.budgetUsd) throw new BestDeckInputError(`${commander.name} costs $${cost}, over the $${req.budgetUsd} budget`);
      remainingBudget = req.budgetUsd - cost;
    }
    basics = basicsForRequest(identityOf(commander), dedupOwned);
    pool = buildBudgetedPool(commander, dedupOwned, ownedNames, remainingBudget, o);
    seed = seedDeck(commander, pool.cards, basics, { incl: cfStats(commander.name), cost: (c) => costOf(c, ownedNames), budget: remainingBudget });
  } else {
    const candidates = dedupOwned.filter((c) => isCommander(c, FORMAT));
    if (!candidates.length) throw new BestDeckInputError('no owned card can be a commander');
    const ranked = preRankCommanders(candidates, ownedNames, defaultStatsOf);
    const screenPool = ranked.slice(0, o.screenTop).map((r) => r.card);

    // Stop screening early once 35% of the deadline has elapsed and climb the best seen so far —
    // screening 24 budgeted seeds dominates wall time (measured ~165-220s of a 210s deadline), so
    // without this a slow screen could leave no time to climb at all.
    const screenDeadline = deadlineAt - o.deadlineMs * 0.65;
    const screened: { card: DbCard; screenObjective: number; ownedShare: number; buyUsd: number; basics: DbCard[]; pool: Pool; seed: DbCard[] }[] = [];
    for (let i = 0; i < screenPool.length; i++) {
      if (i > 0 && Date.now() >= screenDeadline) break;
      const cmd = screenPool[i];
      onProgress?.({ stage: 'screening', screened: i, toScreen: screenPool.length, commander: cmd.name });
      const cmdBasics = basicsForRequest(identityOf(cmd), dedupOwned);
      const cmdPool = buildBudgetedPool(cmd, dedupOwned, ownedNames, remainingBudget, o);
      const costFn = (c: DbCard): number | null => costOf(c, ownedNames);
      const cmdSeed = seedDeck(cmd, cmdPool.cards, cmdBasics, { incl: cfStats(cmd.name), cost: costFn, budget: remainingBudget });
      const screenObjective = makeScorer(FORMAT, cmd, weights)(cmdSeed).objective;
      const nonBasic = cmdSeed.filter((c) => !BASIC_RE.test(c.name));
      const ownedShare = nonBasic.length ? nonBasic.filter((c) => ownedNames.has(c.name)).length / nonBasic.length : 1;
      const buyUsd = cmdSeed.reduce((s, c) => s + (costFn(c) ?? 0), 0);
      screened.push({ card: cmd, screenObjective, ownedShare, buyUsd, basics: cmdBasics, pool: cmdPool, seed: cmdSeed });
      await flush();
    }
    screened.sort((a, b) => b.screenObjective - a.screenObjective || a.card.name.localeCompare(b.card.name));
    commanders = screened.slice(0, 10).map((s, idx) => ({
      name: s.card.name, identity: identityOf(s.card), screenObjective: s.screenObjective, ownedShare: s.ownedShare, buyUsd: s.buyUsd, climbed: idx === 0,
    }));
    if (screened.length > 1 && screened[0].screenObjective - screened[1].screenObjective <= 1.5) {
      note = `#2 (${screened[1].card.name}) is within the model's margin of #1 (${screened[0].card.name})`;
    }
    const best = screened[0];
    commander = best.card;
    basics = best.basics;
    pool = best.pool;
    seed = best.seed;
  }

  const climbResult = await climbWithBudget(commander, seed, pool.cards, basics, remainingBudget, ownedNames, weights, o, deadlineAt, onProgress);
  const finalDeck = climbResult.deck;
  assertValidDeck(finalDeck);
  const costFn = (c: DbCard): number | null => costOf(c, ownedNames);
  const commanderCost = ownedNames.has(commander.name) ? 0 : (costOf(commander, ownedNames) ?? 0);
  const buyList = [
    ...(commanderCost > 0 ? [{ name: commander.name, priceUsd: commanderCost }] : []),
    ...finalDeck.filter((c) => !ownedNames.has(c.name) && !BASIC_RE.test(c.name)).map((c) => ({ name: c.name, priceUsd: costFn(c) ?? 0 })),
  ];

  onProgress?.({ stage: 'reporting', evaluations: climbResult.evaluations });
  const report = reportAlternatives(finalDeck, buyList, {
    format: FORMAT, commander, weights, ownedCards: dedupOwned, ownedNames, basics,
  });

  return {
    commander,
    deck: finalDeck.map((c) => ({ ...c, owned: ownedNames.has(c.name) || BASIC_RE.test(c.name) })),
    buyList,
    buyUsd: buyList.reduce((s, b) => s + b.priceUsd, 0),
    budgetUsd: req.budgetUsd,
    objective: climbResult.objective,
    power: powerOf(finalDeck, commander),
    climb: { converged: climbResult.converged, stopReason: climbResult.stopReason, passes: climbResult.passes, evaluations: climbResult.evaluations, swaps: climbResult.swaps, poolSize: pool.poolSize },
    commanders,
    note,
    unresolved,
    ownedResolved,
    upgrades: report.upgrades,
    replacements: report.replacements,
    nearMisses: report.nearMisses,
  };
}

// Re-exported for anything (e.g. tests) that wants the deck size without importing best-deck.ts directly.
export { DECK_SIZE };
