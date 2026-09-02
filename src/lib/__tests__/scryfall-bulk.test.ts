import { describe, it, expect } from 'vitest';
import { gzipSync } from 'zlib';
import { isJsonl, iterateBulkCards } from '../scryfall-bulk';

async function collect(gen: AsyncGenerator<Record<string, unknown>>) {
  const out: Record<string, unknown>[] = [];
  for await (const c of gen) out.push(c);
  return out;
}

describe('scryfall-bulk', () => {
  it('detects jsonl urls', () => {
    expect(isJsonl('https://data.scryfall.io/oracle-cards/x.jsonl.gz')).toBe(true);
    expect(isJsonl('https://data.scryfall.io/oracle-cards/x.jsonl')).toBe(true);
    expect(isJsonl('https://data.scryfall.io/oracle-cards/x.json')).toBe(false);
  });

  it('streams gzip jsonl line by line, skipping blank lines', async () => {
    const body = gzipSync(Buffer.from('{"name":"Sol Ring"}\n\n{"name":"Krenko, Mob Boss"}\n'));
    const cards = await collect(iterateBulkCards(new Response(body), 'https://x/oracle.jsonl.gz'));
    expect(cards.map((c) => c.name)).toEqual(['Sol Ring', 'Krenko, Mob Boss']);
  });

  it('falls back to a plain json array', async () => {
    const cards = await collect(
      iterateBulkCards(new Response('[{"name":"A"},{"name":"B"}]'), 'https://x/oracle.json')
    );
    expect(cards.map((c) => c.name)).toEqual(['A', 'B']);
  });
});
