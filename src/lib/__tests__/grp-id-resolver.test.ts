import { describe, it, expect, beforeEach } from 'vitest';
import { GrpIdResolver } from '../grp-id-resolver';

describe('GrpIdResolver', () => {
  let resolver: GrpIdResolver;

  beforeEach(() => {
    resolver = new GrpIdResolver();
  });

  it('should start with empty cache', () => {
    expect(resolver.cacheSize).toBe(0);
  });

  it('should return unknown card when no DB and no API', async () => {
    // Mock fetch to simulate 404
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('Not found', { status: 404 });

    try {
      const card = await resolver.resolve(99999);
      expect(card.name).toContain('Unknown');
      expect(card.grpId).toBe(99999);
      expect(card.imageUriSmall).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should cache resolved cards in memory', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return new Response('Not found', { status: 404 });
    };

    try {
      await resolver.resolve(12345);
      expect(resolver.cacheSize).toBe(1);
      expect(fetchCount).toBe(1);

      // Second call should use cache
      await resolver.resolve(12345);
      expect(fetchCount).toBe(1); // No additional fetch
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should getCached return null for uncached grpId', () => {
    expect(resolver.getCached(12345)).toBeNull();
  });

  it('should getCached return card for cached grpId', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('Not found', { status: 404 });

    try {
      await resolver.resolve(12345);
      const cached = resolver.getCached(12345);
      expect(cached).not.toBeNull();
      expect(cached!.grpId).toBe(12345);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should resolve from Scryfall API when available', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/cards/arena/')) {
        return new Response(JSON.stringify({
          name: 'Lightning Bolt',
          mana_cost: '{R}',
          cmc: 1,
          type_line: 'Instant',
          oracle_text: 'Lightning Bolt deals 3 damage to any target.',
          image_uris: {
            small: 'https://example.com/small.jpg',
            normal: 'https://example.com/normal.jpg',
          },
        }), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    };

    try {
      const card = await resolver.resolve(44444);
      expect(card.name).toBe('Lightning Bolt');
      expect(card.manaCost).toBe('{R}');
      expect(card.cmc).toBe(1);
      expect(card.typeLine).toBe('Instant');
      expect(card.imageUriSmall).toBe('https://example.com/small.jpg');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle double-faced cards from Scryfall', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        name: 'Fable of the Mirror-Breaker // Reflection of Kiki-Jiki',
        mana_cost: null,
        cmc: 3,
        type_line: 'Enchantment — Saga // Enchantment Creature — Goblin Shaman',
        card_faces: [
          {
            name: 'Fable of the Mirror-Breaker',
            mana_cost: '{2}{R}',
            oracle_text: 'Create a 2/2 red Goblin token.',
            image_uris: {
              small: 'https://example.com/front-small.jpg',
              normal: 'https://example.com/front-normal.jpg',
            },
          },
          {
            name: 'Reflection of Kiki-Jiki',
            mana_cost: '',
            oracle_text: 'Create a copy.',
          },
        ],
      }), { status: 200 });
    };

    try {
      const card = await resolver.resolve(55555);
      expect(card.name).toBe('Fable of the Mirror-Breaker // Reflection of Kiki-Jiki');
      expect(card.manaCost).toBe('{2}{R}');
      expect(card.imageUriSmall).toBe('https://example.com/front-small.jpg');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should deduplicate concurrent requests for same grpId', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      await new Promise(r => setTimeout(r, 50));
      return new Response('Not found', { status: 404 });
    };

    try {
      const [card1, card2] = await Promise.all([
        resolver.resolve(77777),
        resolver.resolve(77777),
      ]);

      expect(fetchCount).toBe(1); // Only one fetch despite two calls
      expect(card1.grpId).toBe(card2.grpId);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should resolveMany batch resolve multiple grpIds', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('Not found', { status: 404 });

    try {
      const results = await resolver.resolveMany([111, 222, 333]);
      expect(results.size).toBe(3);
      expect(results.get(111)!.grpId).toBe(111);
      expect(results.get(222)!.grpId).toBe(222);
      expect(results.get(333)!.grpId).toBe(333);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should warmCache load entries from DB into memory', async () => {
    const mockDb = {
      prepare: (sql: string) => ({
        get: (...args: unknown[]) => {
          if (sql.includes('grp_id_cache')) {
            const grpId = args[0] as number;
            if (grpId === 100 || grpId === 200) {
              return {
                grp_id: grpId,
                card_name: `Card ${grpId}`,
                scryfall_id: null,
                image_uri_small: null,
                image_uri_normal: null,
                mana_cost: null,
                cmc: 0,
                type_line: null,
                oracle_text: null,
              };
            }
          }
          return undefined;
        },
        run: () => {},
        all: () => [],
      }),
    };

    const dbResolver = new GrpIdResolver(mockDb);
    expect(dbResolver.cacheSize).toBe(0);

    dbResolver.warmCache([100, 200, 999]);

    expect(dbResolver.cacheSize).toBe(2);
    expect(dbResolver.getCached(100)).not.toBeNull();
    expect(dbResolver.getCached(100)!.name).toBe('Card 100');
    expect(dbResolver.getCached(200)!.name).toBe('Card 200');
    expect(dbResolver.getCached(999)).toBeNull(); // Not in DB
  });

  it('should warmCache skip already-cached grpIds', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('Not found', { status: 404 });

    try {
      // Pre-cache one entry
      await resolver.resolve(100);
      expect(resolver.cacheSize).toBe(1);

      // warmCache without DB should be a no-op
      resolver.warmCache([100]);
      expect(resolver.cacheSize).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should fall through arena_id layer to Scryfall when no DB match', async () => {
    let fetchCalled = false;
    const mockDb = {
      prepare: (sql: string) => ({
        get: () => undefined, // No DB match for either table
        run: () => {},
        all: () => [],
      }),
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({
        name: 'Scryfall Result',
        mana_cost: '{1}{U}',
        cmc: 2,
        type_line: 'Instant',
        oracle_text: 'Draw a card.',
        image_uris: { small: 'https://s.jpg', normal: 'https://n.jpg' },
      }), { status: 200 });
    };

    try {
      const dbResolver = new GrpIdResolver(mockDb);
      const card = await dbResolver.resolve(77777);
      expect(fetchCalled).toBe(true);
      expect(card.name).toBe('Scryfall Result');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should store resolved Scryfall result back to DB cache', async () => {
    let storedArgs: unknown[] = [];
    const mockDb = {
      prepare: (sql: string) => ({
        get: () => undefined,
        run: (...args: unknown[]) => {
          if (sql.includes('INSERT OR REPLACE')) {
            storedArgs = args;
          }
        },
        all: () => [],
      }),
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        name: 'Stored Card',
        mana_cost: '{G}',
        cmc: 1,
        type_line: 'Creature',
        image_uris: { small: 'https://sm.jpg', normal: 'https://nm.jpg' },
      }), { status: 200 });
    };

    try {
      const dbResolver = new GrpIdResolver(mockDb);
      await dbResolver.resolve(55555);
      expect(storedArgs[0]).toBe(55555); // grp_id
      expect(storedArgs[1]).toBe('Stored Card'); // card_name
      expect(storedArgs[8]).toBe('scryfall'); // source
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should setDb allow adding DB after construction', async () => {
    const mockDb = {
      prepare: (sql: string) => ({
        get: (...args: unknown[]) => {
          if (sql.includes('grp_id_cache') && args[0] === 42) {
            return {
              grp_id: 42,
              card_name: 'Late DB Card',
              scryfall_id: null,
              image_uri_small: null,
              image_uri_normal: null,
              mana_cost: null,
              cmc: 0,
              type_line: null,
              oracle_text: null,
            };
          }
          return undefined;
        },
        run: () => {},
        all: () => [],
      }),
    };

    // Start without DB
    const r = new GrpIdResolver();
    r.setDb(mockDb);

    const card = await r.resolve(42);
    expect(card.name).toBe('Late DB Card');
  });

  it('should use DB adapter when provided', async () => {
    const mockDb = {
      prepare: (sql: string) => ({
        get: (...args: unknown[]) => {
          if (sql.includes('grp_id_cache') && args[0] === 88888) {
            return {
              grp_id: 88888,
              card_name: 'Cached Card',
              scryfall_id: 'abc',
              image_uri_small: 'https://cached.jpg',
              image_uri_normal: null,
              mana_cost: '{2}{W}',
              cmc: 3,
              type_line: 'Creature',
              oracle_text: null,
            };
          }
          return undefined;
        },
        run: () => {},
        all: () => [],
      }),
    };

    const dbResolver = new GrpIdResolver(mockDb);
    const card = await dbResolver.resolve(88888);
    expect(card.name).toBe('Cached Card');
    expect(card.manaCost).toBe('{2}{W}');
  });
});
