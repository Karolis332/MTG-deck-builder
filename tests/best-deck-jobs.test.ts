import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBestDeckQueue, type StartJob, type JobHandle } from '../services/build-api/best-deck-jobs';
import type { RunBestDeckRequest } from '../src/lib/best-deck-run';

const req = (over: Partial<RunBestDeckRequest> = {}): RunBestDeckRequest => ({ budgetUsd: 25, ...over });

/** A fake startJob that never settles on its own — the test drives it via the returned controls. */
function fakeStartJob(): {
  startJob: StartJob;
  settle: (jobIndex: number, msg: Parameters<Parameters<StartJob>[1]>[0]) => void;
  kills: JobHandle[];
  started: number;
} {
  const onMessages: Parameters<StartJob>[1][] = [];
  const kills: JobHandle[] = [];
  const startJob: StartJob = (_request, onMessage) => {
    onMessages.push(onMessage);
    const handle: JobHandle = { kill: vi.fn() };
    kills.push(handle);
    return handle;
  };
  return {
    startJob,
    settle: (jobIndex, msg) => onMessages[jobIndex](msg),
    kills,
    get started() { return onMessages.length; },
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('createBestDeckQueue — priority and FIFO', () => {
  it('runs pro/commander ahead of free, FIFO within a tier', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob });

    const a = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    const b = queue.enqueue({ owner: 'b', tier: 'free', request: req() });
    const c = queue.enqueue({ owner: 'c', tier: 'pro', request: req() });

    expect(a.kind).toBe('ok');
    if (a.kind !== 'ok') return;
    expect(a.status).toBe('running'); // first job in, concurrency 1, nothing ahead of it yet

    const bView = queue.get((b as { jobId: string }).jobId, 'b');
    const cView = queue.get((c as { jobId: string }).jobId, 'c');
    // c (pro) queued after b (free) but must be positioned ahead of it
    expect(cView?.position).toBe(1);
    expect(bView?.position).toBe(2);

    // finishing the running job should start the pro job next, not the earlier free one
    fake.settle(0, { type: 'done', result: { ok: true } });
    expect(queue.get((c as { jobId: string }).jobId, 'c')?.status).toBe('running');
    expect(queue.get((b as { jobId: string }).jobId, 'b')?.status).toBe('queued');
  });

  it('honours the concurrency cap', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 2, startJob: fake.startJob });
    queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    queue.enqueue({ owner: 'b', tier: 'free', request: req() });
    queue.enqueue({ owner: 'c', tier: 'free', request: req() });

    expect(queue.stats()).toEqual({ running: 2, queued: 1 });
    expect(fake.started).toBe(2);
  });
});

describe('createBestDeckQueue — per-owner conflict', () => {
  it('rejects a second active job for the same owner with the existing jobId', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 2, startJob: fake.startJob });
    const first = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    expect(first.kind).toBe('ok');
    if (first.kind !== 'ok') return;

    const second = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    expect(second).toEqual({ kind: 'conflict', jobId: first.jobId });
  });

  it('allows a new job once the owner\'s previous job has finished', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob });
    const first = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    if (first.kind !== 'ok') throw new Error('expected ok');
    fake.settle(0, { type: 'done', result: {} });

    const second = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    expect(second.kind).toBe('ok');
  });
});

describe('createBestDeckQueue — cancel', () => {
  it('drops a queued job', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob });
    queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    const queued = queue.enqueue({ owner: 'b', tier: 'free', request: req() });
    if (queued.kind !== 'ok') throw new Error('expected ok');

    const outcome = queue.cancel(queued.jobId, 'b');
    expect(outcome).toBe('cancelled');
    expect(queue.get(queued.jobId, 'b')?.status).toBe('cancelled');
  });

  it('kills a running job and marks it cancelled', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob });
    const running = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    if (running.kind !== 'ok') throw new Error('expected ok');

    const outcome = queue.cancel(running.jobId, 'a');
    expect(outcome).toBe('cancelled');
    expect(fake.kills[0].kill).toHaveBeenCalledOnce();
    expect(queue.get(running.jobId, 'a')?.status).toBe('cancelled');
  });
});

describe('createBestDeckQueue — owner mismatch', () => {
  it('returns undefined/not-found for the wrong owner on get and cancel', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob });
    const job = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    if (job.kind !== 'ok') throw new Error('expected ok');

    expect(queue.get(job.jobId, 'someone-else')).toBeUndefined();
    expect(queue.cancel(job.jobId, 'someone-else')).toBe('not-found');
  });
});

describe('createBestDeckQueue — timeout', () => {
  it('kills and fails a job that runs past the hard timeout', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob });
    const job = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    if (job.kind !== 'ok') throw new Error('expected ok');

    vi.advanceTimersByTime(420_000);

    expect(fake.kills[0].kill).toHaveBeenCalledOnce();
    const view = queue.get(job.jobId, 'a');
    expect(view?.status).toBe('failed');
    expect(view?.error).toMatch(/timed out/);
  });
});

describe('createBestDeckQueue — TTL sweep', () => {
  it('drops a finished job 60 minutes after it finished', () => {
    const fake = fakeStartJob();
    let clock = 0;
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob, now: () => clock });
    const job = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    if (job.kind !== 'ok') throw new Error('expected ok');
    fake.settle(0, { type: 'done', result: { ok: true } });
    expect(queue.get(job.jobId, 'a')?.status).toBe('done');

    clock = 60 * 60_000 + 1;
    expect(queue.get(job.jobId, 'a')).toBeUndefined();
  });
});

describe('createBestDeckQueue — progress normalization (refuter H2)', () => {
  it('fills every contract field so the web never sees undefined/missing progress keys', () => {
    const fake = fakeStartJob();
    const queue = createBestDeckQueue({ concurrency: 1, startJob: fake.startJob });
    const job = queue.enqueue({ owner: 'a', tier: 'free', request: req() });
    if (job.kind !== 'ok') throw new Error('expected ok');

    // The worker's early 'resolving' message carries only `stage` — this used to leave every
    // other field `undefined`, and the web's `bestObjective !== null` check is true for
    // `undefined` too, so it called `.toFixed` on it and crashed.
    fake.settle(0, { type: 'progress', progress: { stage: 'resolving' } });
    const resolving = queue.get(job.jobId, 'a')?.progress;
    expect(resolving).toEqual({
      stage: 'resolving', screened: 0, toScreen: 0, commander: null, pass: 0, maxPasses: 3,
      evaluations: 0, bestObjective: null, elapsedMs: resolving?.elapsedMs,
    });

    fake.settle(0, { type: 'progress', progress: { stage: 'climbing', commander: 'Krenko, Mob Boss', pass: 2, maxPasses: 3, evaluations: 50, bestObjective: 80.5 } });
    const climbing = queue.get(job.jobId, 'a')?.progress;
    expect(climbing?.stage).toBe('climbing');
    expect(climbing?.commander).toBe('Krenko, Mob Boss');
    expect(climbing?.evaluations).toBe(50);
    expect(climbing?.bestObjective).toBe(80.5);
    expect(climbing?.screened).toBe(0); // not sent for this message, still present as 0
    expect(typeof climbing?.elapsedMs).toBe('number');

    // The worker also emits a synthetic 'finalizing' stage right before 'done' — must be a valid
    // contract stage, not dropped or coerced.
    fake.settle(0, { type: 'progress', progress: { stage: 'finalizing', commander: 'Krenko, Mob Boss' } });
    expect(queue.get(job.jobId, 'a')?.progress?.stage).toBe('finalizing');
  });
});

describe('createBestDeckQueue — queue full', () => {
  it('returns full once 40 jobs are queued', () => {
    const fake = fakeStartJob();
    // concurrency 0 keeps every job queued (none promoted to running) so the cap is exercised
    const queue = createBestDeckQueue({ concurrency: 0, startJob: fake.startJob });
    for (let i = 0; i < 40; i++) {
      const r = queue.enqueue({ owner: `owner-${i}`, tier: 'free', request: req() });
      expect(r.kind).toBe('ok');
    }
    const overflow = queue.enqueue({ owner: 'owner-40', tier: 'free', request: req() });
    expect(overflow.kind).toBe('full');
  });
});
