import { describe, it, expect } from 'vitest';
import http from 'http';
import { handleAlternatives } from '../services/build-api/server';

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

async function alternatives(body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
  const { res, done } = fakeRes();
  handleAlternatives(JSON.stringify(body), res);
  return done;
}

describe('POST /alternatives', () => {
  it('400s when format is missing', async () => {
    const { status, body } = await alternatives({ card: 'Lightning Bolt', deck: ['Lightning Bolt'] });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/format/i);
  });

  it('400s when deck is empty', async () => {
    const { status, body } = await alternatives({ format: 'commander', card: 'Lightning Bolt', deck: [] });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/deck/i);
  });

  it('400s on a negative maxPrice', async () => {
    const { status, body } = await alternatives({
      format: 'commander', card: 'Lightning Bolt', deck: ['Lightning Bolt'], maxPrice: -5,
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/maxPrice/i);
  });

  it('clamps a limit above 20 down to 20', async () => {
    const { status, body } = await alternatives({
      format: 'commander', card: 'Lightning Bolt', deck: ['Lightning Bolt', 'Shock'], limit: 50,
    });
    expect(status).toBe(200);
    expect((body as { alternatives: unknown[] }).alternatives.length).toBeLessThanOrEqual(20);
  });

  it('returns "card not in deck" when the target card is not among the deck names', async () => {
    const { status, body } = await alternatives({
      format: 'commander', card: 'Lightning Bolt', deck: ['Shock'],
    });
    expect(status).toBe(404);
    expect((body as { error: string }).error).toBe('card not in deck');
  });

  it('404s when the target card itself does not resolve', async () => {
    const { status, body } = await alternatives({
      format: 'commander', card: 'Not A Real Card Name 12345', deck: ['Not A Real Card Name 12345'],
    });
    expect(status).toBe(404);
    expect((body as { error: string }).error).toMatch(/not found/i);
  });

  it('happy path: every alternative carries a priceUsd field (null-safe) and the owned flag', async () => {
    const { status, body } = await alternatives({
      format: 'commander',
      card: 'Lightning Bolt',
      deck: ['Lightning Bolt', 'Shock'],
      ownedCards: ['Chain Lightning'],
      limit: 8,
    });
    expect(status).toBe(200);
    const parsed = body as { card: { name: string; priceUsd: number | null }; alternatives: Array<{ priceUsd: number | null; owned: boolean }> };
    expect(parsed.card.name).toBe('Lightning Bolt');
    expect(parsed.alternatives.length).toBeGreaterThan(0);
    for (const alt of parsed.alternatives) {
      expect(alt).toHaveProperty('priceUsd');
      expect(alt).toHaveProperty('owned');
    }
  });
});
