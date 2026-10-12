/**
 * best-deck-jobs — in-memory job queue for /best-deck. One forked child (best-deck-worker.ts)
 * per job, paid tiers (pro/commander) ahead of free, FIFO within a priority band.
 *
 * No timers for cleanup: finished jobs older than `SWEEP_AFTER_MS` are dropped lazily, on the
 * next call into the queue (enqueue/get/cancel/stats) — a queue nobody polls never needs a timer
 * of its own. The hard per-job timeout IS a real timer (a stuck child has no other way to be
 * noticed), cleared as soon as the job finishes by any other path.
 */
import { fork, type ChildProcess } from 'child_process';
import path from 'path';
import { randomUUID } from 'crypto';
import type { RunBestDeckRequest } from '../../src/lib/best-deck-run';

export type Tier = 'free' | 'pro' | 'commander';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface BestDeckJobInput {
  owner: string;
  tier: Tier;
  request: RunBestDeckRequest;
}

/** The engine's internal stages plus the one the worker synthesizes right before `done` (contract). */
export type BestDeckStage = 'resolving' | 'screening' | 'climbing' | 'finalizing';

/** The full contract progress shape — every field always present (refuter H2: a partial object
 * made the web's `bestObjective !== null` check pass for `undefined` and crash on `.toFixed`). */
export interface BestDeckProgress {
  stage: BestDeckStage;
  screened: number;
  toScreen: number;
  commander: string | null;
  pass: number;
  maxPasses: number;
  evaluations: number;
  bestObjective: number | null;
  elapsedMs: number;
}

export interface JobView {
  jobId: string;
  status: JobStatus;
  position?: number;
  progress?: BestDeckProgress;
  result?: unknown;
  error?: string;
}

export type EnqueueResult =
  | { kind: 'ok'; jobId: string; status: JobStatus; position: number }
  | { kind: 'conflict'; jobId: string }
  | { kind: 'full' };

/** What a job handle needs to support; `startJob` returns one per started job. */
export interface JobHandle {
  kill(): void;
}

type OnMessage = (msg: { type: 'progress'; progress: Partial<BestDeckProgress> } | { type: 'done'; result: unknown } | { type: 'failed'; error: string; inputError?: boolean }) => void;
type OnExit = (code: number | null) => void;

export type StartJob = (request: RunBestDeckRequest, onMessage: OnMessage, onExit: OnExit) => JobHandle;

const MAX_QUEUE_LENGTH = 40;
const HARD_TIMEOUT_MS = 420_000;
const SWEEP_AFTER_MS = 60 * 60_000;
// Mirrors best-deck-run.ts's OPT_DEFAULTS.maxPasses — this layer never overrides it, so it's the
// right fallback before the worker's first progress message reports the real value.
const DEFAULT_MAX_PASSES = 3;

interface Job {
  id: string;
  owner: string;
  tier: Tier;
  priority: number; // 0 = pro/commander, 1 = free
  seq: number; // FIFO tiebreaker within a priority band
  status: JobStatus;
  request: RunBestDeckRequest;
  progress?: Partial<BestDeckProgress>;
  result?: unknown;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  settled?: boolean; // true once a 'done'/'failed' message has been handled — guards the exit race (M4)
  handle?: JobHandle;
  timeoutTimer?: NodeJS.Timeout;
}

/** Fill every contract field so the web never sees `undefined` where it expects `null`/`0`. */
function normalizeProgress(partial: Partial<BestDeckProgress> | undefined, elapsedMs: number): BestDeckProgress {
  return {
    stage: partial?.stage ?? 'resolving',
    screened: partial?.screened ?? 0,
    toScreen: partial?.toScreen ?? 0,
    commander: partial?.commander ?? null,
    pass: partial?.pass ?? 0,
    maxPasses: partial?.maxPasses ?? DEFAULT_MAX_PASSES,
    evaluations: partial?.evaluations ?? 0,
    bestObjective: partial?.bestObjective ?? null,
    elapsedMs,
  };
}

const WORKER_PATH = path.join(__dirname, 'best-deck-worker.ts');

/**
 * `fork()` defaults `execArgv` to `process.execArgv`, which already carries tsx's loader when
 * this process was itself started with tsx (pm2, or `npx tsx services/build-api/server.ts`) — so
 * the common case needs no override. Only a bare `node` parent (no tsx in its own execArgv) needs
 * one added so the child can load the worker's `.ts` file at all.
 */
function workerExecArgv(): string[] {
  const inherited = process.execArgv;
  if (inherited.some((a) => a.includes('tsx'))) return inherited;
  return [...inherited, '--import', 'tsx'];
}

const defaultStartJob: StartJob = (request, onMessage, onExit) => {
  const child: ChildProcess = fork(WORKER_PATH, [], { execArgv: workerExecArgv() });
  child.on('message', (msg) => onMessage(msg as Parameters<OnMessage>[0]));
  // 'close' (stdio + ipc fully torn down), not 'exit' (process gone, pipes may still be
  // draining) — pairs with the worker's send-then-exit-in-callback fix (refuter M4).
  child.on('close', onExit);
  // A spawn failure (EAGAIN/ENOMEM) emits 'error', not 'exit' — without this handler it's an
  // unhandled error that crashes the whole server (refuter M3).
  child.on('error', (err) => {
    console.error('[best-deck-jobs] worker spawn/runtime error:', err);
    onExit(null);
  });
  child.send({ request });
  return { kill: () => child.kill() };
};

export interface BestDeckQueue {
  enqueue(input: BestDeckJobInput): EnqueueResult;
  get(jobId: string, owner: string): JobView | undefined;
  cancel(jobId: string, owner: string): 'cancelled' | 'not-found';
  stats(): { running: number; queued: number };
}

export interface CreateBestDeckQueueOpts {
  concurrency?: number;
  startJob?: StartJob;
  now?: () => number;
}

export function createBestDeckQueue(opts: CreateBestDeckQueueOpts = {}): BestDeckQueue {
  const envConcurrency = Number(process.env.BEST_DECK_CONCURRENCY);
  const concurrency = opts.concurrency ?? (Number.isFinite(envConcurrency) && envConcurrency > 0 ? envConcurrency : 2);
  const startJob = opts.startJob ?? defaultStartJob;
  const now = opts.now ?? Date.now;

  const jobs = new Map<string, Job>();
  let seq = 0;

  function sweep(): void {
    const cutoff = now() - SWEEP_AFTER_MS;
    for (const [id, job] of jobs) {
      if (job.finishedAt !== undefined && job.finishedAt < cutoff) jobs.delete(id);
    }
  }

  function queuedJobsSorted(): Job[] {
    return [...jobs.values()]
      .filter((j) => j.status === 'queued')
      .sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  }

  function activeCount(): number {
    let n = 0;
    for (const job of jobs.values()) if (job.status === 'running') n++;
    return n;
  }

  function finishJob(job: Job, status: 'done' | 'failed' | 'cancelled', result?: unknown, error?: string): void {
    if (job.finishedAt !== undefined) return; // already settled (e.g. cancel racing a 'done')
    if (job.timeoutTimer) clearTimeout(job.timeoutTimer);
    job.status = status;
    job.result = result;
    job.error = error;
    job.finishedAt = now();
    job.settled = true;
    tryStartNext();
  }

  function startRunning(job: Job): void {
    job.status = 'running';
    job.startedAt = now();
    job.timeoutTimer = setTimeout(() => {
      job.handle?.kill();
      finishJob(job, 'failed', undefined, 'timed out');
    }, HARD_TIMEOUT_MS);
    job.handle = startJob(
      job.request,
      (msg) => {
        if (msg.type === 'progress') job.progress = msg.progress;
        else if (msg.type === 'done') finishJob(job, 'done', msg.result);
        else if (msg.type === 'failed') finishJob(job, 'failed', undefined, msg.error);
      },
      (code) => {
        // Worker closed without a done/failed message ever being handled (crash, or the pipe
        // dropped the final send) — `settled` (not just job.status) guards against a 'close'
        // that arrives after finishJob already ran for this job.
        if (!job.settled) finishJob(job, 'failed', undefined, `worker exited unexpectedly (code ${code ?? 'null'})`);
      },
    );
  }

  function tryStartNext(): void {
    while (activeCount() < concurrency) {
      const [next] = queuedJobsSorted();
      if (!next) return;
      startRunning(next);
    }
  }

  function toView(job: Job): JobView {
    const view: JobView = { jobId: job.id, status: job.status };
    if (job.status === 'queued') {
      view.position = queuedJobsSorted().findIndex((j) => j.id === job.id) + 1;
    } else if (job.status === 'running') {
      view.position = 0;
      view.progress = normalizeProgress(job.progress, now() - (job.startedAt ?? now()));
    } else if (job.status === 'done') {
      view.result = job.result;
    } else if (job.status === 'failed') {
      view.error = job.error;
    }
    return view;
  }

  return {
    enqueue(input) {
      sweep();
      for (const job of jobs.values()) {
        if (job.owner === input.owner && (job.status === 'queued' || job.status === 'running')) {
          return { kind: 'conflict', jobId: job.id };
        }
      }
      if (queuedJobsSorted().length >= MAX_QUEUE_LENGTH) return { kind: 'full' };

      const job: Job = {
        id: randomUUID(),
        owner: input.owner,
        tier: input.tier,
        priority: input.tier === 'free' ? 1 : 0,
        seq: seq++,
        status: 'queued',
        request: input.request,
      };
      jobs.set(job.id, job);
      tryStartNext();
      const view = toView(job);
      return { kind: 'ok', jobId: job.id, status: view.status, position: view.position ?? 0 };
    },

    get(jobId, owner) {
      sweep();
      const job = jobs.get(jobId);
      if (!job || job.owner !== owner) return undefined;
      return toView(job);
    },

    cancel(jobId, owner) {
      sweep();
      const job = jobs.get(jobId);
      if (!job || job.owner !== owner) return 'not-found';
      if (job.status === 'queued') {
        finishJob(job, 'cancelled');
        return 'cancelled';
      }
      if (job.status === 'running') {
        job.handle?.kill();
        finishJob(job, 'cancelled');
        return 'cancelled';
      }
      return 'not-found'; // already done/failed/cancelled — nothing to cancel
    },

    stats() {
      sweep();
      return { running: activeCount(), queued: queuedJobsSorted().length };
    },
  };
}
