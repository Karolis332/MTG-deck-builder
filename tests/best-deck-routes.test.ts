import { describe, it, expect, vi } from 'vitest';
import http from 'http';
import { handleBestDeckRoute } from '../services/build-api/best-deck-routes';
import { createBestDeckQueue, type StartJob } from '../services/build-api/best-deck-jobs';

function fakeRes(): { res: http.ServerResponse; done: Promise<{ status: number; body: unknown }> } {
  let statusCode = 0;
  let resolveDone!: (v: { status: number; body: unknown }) => void;
  const done = new Promise<{ status: number; body: unknown }>((resolve) => { resolveDone = resolve; });
  const res = {
    writeHead(code: number) { statusCode = code; return res; },
    end(chunk?: string) {
      resolveDone({ status: statusCode, body: chunk ? JSON.parse(chunk) : undefined });
    },
  } as unknown as http.ServerResponse;
  return { res, done };
}

// A startJob that never settles — these tests exercise request validation and routing, not the
// engine, so the job just sits 'running' for the duration of the test.
const neverSettleStartJob: StartJob = () => ({ kill: vi.fn() });

function post(body: Record<string, unknown>, queue = createBestDeckQueue({ startJob: neverSettleStartJob })) {
  const { res, done } = fakeRes();
  handleBestDeckRoute('POST', '/best-deck', '', JSON.stringify(body), res, queue);
  return done;
}

const validBody = {
  owner: 'user:42',
  tier: 'free' as const,
  format: 'commander' as const,
  commanderName: 'Krenko, Mob Boss',
  budgetUsd: 25,
};

describe('POST /best-deck — validation', () => {
  it('rejects a missing/invalid owner', async () => {
    const { status, body } = await post({ ...validBody, owner: '' });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/owner/i);
  });

  it('rejects an invalid tier', async () => {
    const { status, body } = await post({ ...validBody, tier: 'whale' });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/tier/i);
  });

  it('rejects a format other than commander', async () => {
    const { status, body } = await post({ ...validBody, format: 'brawl' });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/format/i);
  });

  it('rejects a body with neither ownedCards nor commanderName', async () => {
    const { status, body } = await post({ owner: 'user:1', tier: 'free', format: 'commander', budgetUsd: 10 });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/ownedCards|commanderName/i);
  });

  it('rejects budgetUsd out of range', async () => {
    const r1 = await post({ ...validBody, budgetUsd: -1 });
    expect(r1.status).toBe(400);
    const r2 = await post({ ...validBody, budgetUsd: 10_001 });
    expect(r2.status).toBe(400);
  });

  it('rejects an oversized ownedCards array', async () => {
    const { status, body } = await post({
      owner: 'user:1',
      tier: 'free',
      format: 'commander',
      budgetUsd: 10,
      ownedCards: Array.from({ length: 10_001 }, (_, i) => ({ name: `Card ${i}` })),
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/ownedCards/i);
  });

  it('422s an unknown commander name', async () => {
    const { status, body } = await post({ ...validBody, commanderName: 'Totally Not A Real Card Name XYZ' });
    expect(status).toBe(422);
    expect((body as { error: string }).error).toMatch(/unknown commander/i);
  });

  it('422s a real card that cannot be a commander', async () => {
    const { status, body } = await post({ ...validBody, commanderName: 'Sol Ring' });
    expect(status).toBe(422);
    expect((body as { error: string }).error).toMatch(/cannot be a commander/i);
  });

  // Refuter M2: an unowned commander whose price exceeds the budget (or has no price data) used
  // to queue a job that just failed deep inside the engine with the same information — fail
  // synchronously here instead.
  it('422s an unaffordable, unowned commander instead of queuing a job that will just fail', async () => {
    const { status, body } = await post({ ...validBody, commanderName: 'Krenko, Mob Boss', ownedCards: undefined, budgetUsd: 0.01 });
    expect(status).toBe(422);
    expect((body as { error: string }).error).toMatch(/costs \$|over the \$|no price data/i);
  });

  // Refuter N1 (regression from M2): a DFC commander owned under its front-face name — the DB's
  // canonical name is "Esika, God of the Tree // The Prismatic Bridge" — must not 422 on budget.
  it('does not 422 a DFC commander owned under its front-face name', async () => {
    const { status } = await post({
      ...validBody,
      commanderName: 'Esika, God of the Tree',
      ownedCards: [{ name: 'Esika, God of the Tree' }],
      budgetUsd: 0,
    });
    expect(status).not.toBe(422);
  });

  it('does not count a zero-quantity owned entry as owned', async () => {
    const { status, body } = await post({
      ...validBody,
      commanderName: 'Krenko, Mob Boss',
      ownedCards: [{ name: 'Krenko, Mob Boss', quantity: 0 }],
      budgetUsd: 0.01,
    });
    expect(status).toBe(422);
    expect((body as { error: string }).error).toMatch(/costs \$|over the \$|no price data/i);
  });

  it('does not 422 on budget when the commander is itself in ownedCards', async () => {
    const { status } = await post({
      ...validBody,
      commanderName: 'Krenko, Mob Boss',
      ownedCards: [{ name: 'Krenko, Mob Boss' }],
      budgetUsd: 0.01,
    });
    expect(status).not.toBe(422);
  });

  it('202s a valid body and 409s a second one from the same owner', async () => {
    const queue = createBestDeckQueue({ startJob: neverSettleStartJob });
    const first = await post(validBody, queue);
    expect(first.status).toBe(202);
    const firstBody = first.body as { jobId: string; status: string; position: number };
    expect(firstBody.jobId).toBeTruthy();
    expect(['queued', 'running']).toContain(firstBody.status);

    const second = await post(validBody, queue);
    expect(second.status).toBe(409);
    expect((second.body as { jobId: string }).jobId).toBe(firstBody.jobId);
  });
});

describe('GET/DELETE /best-deck/:jobId', () => {
  it('404s an unknown job id', async () => {
    const queue = createBestDeckQueue({ startJob: neverSettleStartJob });
    const { res, done } = fakeRes();
    handleBestDeckRoute('GET', '/best-deck/does-not-exist', 'owner=user:1', '', res, queue);
    const { status } = await done;
    expect(status).toBe(404);
  });

  it('404s on an owner mismatch', async () => {
    const queue = createBestDeckQueue({ startJob: neverSettleStartJob });
    const created = await post(validBody, queue);
    const { jobId } = created.body as { jobId: string };

    const { res, done } = fakeRes();
    handleBestDeckRoute('GET', `/best-deck/${jobId}`, 'owner=someone-else', '', res, queue);
    const { status } = await done;
    expect(status).toBe(404);
  });

  it('returns the job for the right owner, and cancels it', async () => {
    const queue = createBestDeckQueue({ startJob: neverSettleStartJob });
    const created = await post(validBody, queue);
    const { jobId } = created.body as { jobId: string };

    const getRes = fakeRes();
    handleBestDeckRoute('GET', `/best-deck/${jobId}`, `owner=${validBody.owner}`, '', getRes.res, queue);
    const getDone = await getRes.done;
    expect(getDone.status).toBe(200);
    expect((getDone.body as { jobId: string }).jobId).toBe(jobId);

    const delRes = fakeRes();
    handleBestDeckRoute('DELETE', `/best-deck/${jobId}`, `owner=${validBody.owner}`, '', delRes.res, queue);
    const delDone = await delRes.done;
    expect(delDone.status).toBe(200);
    expect(delDone.body).toEqual({ status: 'cancelled' });
  });
});
