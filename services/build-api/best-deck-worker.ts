/**
 * best-deck-worker — forked child process for one best-deck job.
 *
 * Receives `{ request }` over IPC from the parent (best-deck-jobs.ts), runs the engine, streams
 * `{ type: 'progress', progress }` messages, then sends one final `{ type: 'done', result }` or
 * `{ type: 'failed', error, inputError? }` and exits. Never imports `server.ts` — that file calls
 * `server.listen(PORT)` at import time and would try to re-bind the same port in this process.
 */
import { runBestDeck, BestDeckInputError, type RunBestDeckRequest, type RunBestDeckProgress, type RunBestDeckResult } from '../../src/lib/best-deck-run';
import { scoreDeckSafely } from '../../src/lib/deck-score-input';
import { toBuildCard } from './resolve';
import type { DbCard } from '../../src/lib/types';

type DoneMessage = { type: 'done'; result: unknown };
type FailedMessage = { type: 'failed'; error: string; inputError?: boolean };
/** Engine progress plus the one stage the engine never emits itself — sent once, right before `done`. */
type WorkerProgress = Omit<RunBestDeckProgress, 'stage'> & { stage: RunBestDeckProgress['stage'] | 'finalizing' };
type ProgressMessage = { type: 'progress'; progress: WorkerProgress };
type OutMessage = DoneMessage | FailedMessage | ProgressMessage;

/**
 * `process.send` queues the message to the OS pipe and returns before it's flushed — exiting
 * right after (the old `finally { process.exit(0) }`) can truncate a large `done` payload if the
 * pipe's buffer is full (refuter M4). Exit only from the flush callback, and only for the final
 * message of the run.
 */
function sendFinal(msg: DoneMessage | FailedMessage): void {
  if (process.send) process.send(msg, () => process.exit(0));
  else process.exit(0);
}

function sendProgress(progress: WorkerProgress): void {
  process.send?.({ type: 'progress', progress } satisfies ProgressMessage);
}

// ponytail: env-flag guard, not a runtime check — vitest's own worker pool is itself a forked
// process with an IPC channel, so importing `buildDoneResult` for a unit test would otherwise
// also wire this file's 'message'/'disconnect' listeners onto vitest's unrelated IPC traffic and
// process.exit(0) the test worker (observed: "Worker exited unexpectedly" under `vitest run`).
if (!process.env.VITEST) {
  // The parent disconnects its IPC channel when it kills/forgets this job; exit immediately
  // rather than keep running an orphaned build.
  process.on('disconnect', () => process.exit(0));
  process.on('message', (msg: { request: RunBestDeckRequest }) => {
    void run(msg.request);
  });
}

/**
 * The `done` payload — every non-optional `BuildResult`/`BestDeckResult` field from the web's
 * `types.ts` must be present (refuter H1: a missing `themes` crashed `deck-result.tsx:200`'s
 * `.map`). Pure and exported so a test can check the full key set without forking a real worker.
 */
export function buildDoneResult(result: RunBestDeckResult, request: RunBestDeckRequest, elapsedMs: number): unknown {
  const deckScore = scoreDeckSafely({
    format: 'commander',
    main: result.deck.map((c) => ({ card: c as DbCard, quantity: 1 })),
    commander: [result.commander],
  });

  const cards = result.deck.map((c) => toBuildCard(c, { quantity: 1, board: 'main', owned: c.owned }));

  // refuter L3: `result.unresolved` is capped at 30 (contract), so `requested - unresolved.length`
  // undercounted whenever more than 30 names missed. The engine now counts this itself.
  const collectionMatched = result.ownedResolved;
  const buyUsd = Math.round(result.buyUsd * 100) / 100;

  return {
    commander: result.commander.name,
    partner: null,
    format: 'commander',
    strategy: 'best-deck',
    themes: [],
    tribalType: null,
    elapsedMs,
    collectionMode: Boolean(request.owned?.length),
    collectionMatched,
    deckScore,
    cards,
    buyList: result.buyList,
    buyUsd,
    budgetUsd: result.budgetUsd,
    objective: result.objective,
    power: result.power,
    climb: result.climb,
    commanders: result.commanders,
    note: result.note,
    unresolved: result.unresolved,
    price: {
      currency: 'USD',
      total: buyUsd,
      unpricedCount: 0,
      maxCardPrice: null,
      maxDeckPrice: result.budgetUsd,
      excludedByCardCap: 0,
      replacedForBudget: [],
    },
  };
}

async function run(request: RunBestDeckRequest): Promise<void> {
  const t0 = Date.now();
  try {
    const result = await runBestDeck(request, (progress) => sendProgress(progress));

    sendProgress({
      stage: 'finalizing',
      commander: result.commander.name,
      pass: result.climb.passes,
      maxPasses: result.climb.passes,
      evaluations: result.climb.evaluations,
      bestObjective: result.objective,
    });

    sendFinal({ type: 'done', result: buildDoneResult(result, request, Date.now() - t0) });
  } catch (error) {
    const inputError = error instanceof BestDeckInputError;
    const message = error instanceof Error ? error.message : 'best-deck job failed';
    // Input errors (bad commander, over budget, etc.) are the caller's own mistake and safe to
    // show verbatim; anything else may carry internal detail (DB/SQL text, stack frames) — log it
    // server-side and send the user a generic message (refuter L1).
    if (!inputError) console.error('[best-deck-worker] job failed:', error instanceof Error ? error.stack || error.message : error);
    sendFinal({ type: 'failed', error: inputError ? message : 'best-deck job failed — try again shortly', inputError });
  }
}
