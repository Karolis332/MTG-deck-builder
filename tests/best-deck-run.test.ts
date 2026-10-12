import { describe, it, expect } from 'vitest';
import { getDb } from '../src/lib/db';
import type { DbCard } from '../src/lib/types';
import { resolveCard } from '../src/lib/best-deck';
import { BestDeckInputError, preRankCommanders, runBestDeck, type RunBestDeckProgress } from '../src/lib/best-deck-run';

describe('resolveCard (H4 — wildcard guard)', () => {
  it('never falls through to the LIKE fallback for a name containing % or _', () => {
    // A bare "%" (or "_") with no guard would hit `LIKE '% // %'`, an unindexed full-table scan
    // that matches the first DFC row (e.g. "Push // Pull") and silently resolves as owned.
    expect(resolveCard('%')).toBeUndefined();
    expect(resolveCard('_')).toBeUndefined();
    expect(resolveCard('100% Nope')).toBeUndefined();
  });

  it('still resolves a real double-faced card by its front face (the LIKE fallback this guard narrows)', () => {
    expect(resolveCard('Valakut Awakening')?.name).toBe('Valakut Awakening // Valakut Stoneforge');
  });
});

describe('preRankCommanders', () => {
  const card = (name: string, edhrec_rank: number | null = null): DbCard => ({ name, edhrec_rank } as DbCard);

  it('ranks by summed inclusion of owned cards; no-stats candidates sort last by EDHREC rank; ties break by name', () => {
    const a = card('A', 500);
    const b = card('B', 100);
    const c = card('C', null); // no stats rows
    const d = card('D', null); // no stats rows, ties C on rank -> breaks by name
    const owned = new Set(['Sol Ring', 'Rhystic Study']);
    const statsOf = (name: string) => {
      if (name === 'A') return [{ card_name: 'Sol Ring', inclusion_rate: 0.9 }, { card_name: 'Rhystic Study', inclusion_rate: 0.5 }];
      if (name === 'B') return [{ card_name: 'Sol Ring', inclusion_rate: 0.9 }, { card_name: 'Lightning Bolt', inclusion_rate: 0.8 }];
      return [];
    };
    const ranked = preRankCommanders([b, a, d, c], owned, statsOf);
    expect(ranked.map((r) => r.card.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(ranked[0].score).toBeCloseTo(1.4);
    expect(ranked[1].score).toBeCloseTo(0.9);
    expect(ranked[2].hasStats).toBe(false);
    expect(ranked[3].hasStats).toBe(false);
  });
});

describe('runBestDeck input errors', () => {
  it('throws BestDeckInputError for an unknown commander name', async () => {
    await expect(runBestDeck({ commanderName: 'Not A Real Card Name Zzyzx', budgetUsd: 10 })).rejects.toBeInstanceOf(BestDeckInputError);
  });

  it('throws BestDeckInputError for a card that cannot be a commander', async () => {
    await expect(runBestDeck({ commanderName: 'Sol Ring', budgetUsd: 10 })).rejects.toBeInstanceOf(BestDeckInputError);
  });

  it('throws when an unowned commander alone exceeds the budget', async () => {
    await expect(runBestDeck({ commanderName: 'Krenko, Mob Boss', budgetUsd: 0 })).rejects.toBeInstanceOf(BestDeckInputError);
  });

  it('throws when no owned card can be a commander', async () => {
    await expect(runBestDeck({ owned: [{ name: 'Sol Ring' }, { name: 'Lightning Bolt' }], budgetUsd: 10 })).rejects.toBeInstanceOf(BestDeckInputError);
  });
});

describe('runBestDeck integration (repo DB, no commander given)', () => {
  it('ranks Krenko from an owned mono-red pool, climbs within budget, returns a 99-card in-identity deck', async () => {
    const db = getDb();
    const pool = db.prepare(`
      select name from cards
      where color_identity = '["R"]'
        and legalities like '%"commander":"legal"%'
        and layout not in ('art_series', 'token')
        and type_line not like '%Legendary%'
      order by edhrec_rank asc
      limit 120
    `).all() as { name: string }[];
    expect(pool.length).toBeGreaterThanOrEqual(100);

    const owned = [{ name: 'Krenko, Mob Boss' }, ...pool.map((r) => ({ name: r.name }))];
    const ownedNames = new Set(owned.map((o) => o.name));
    const progress: RunBestDeckProgress[] = [];

    const result = await runBestDeck(
      { owned, budgetUsd: 25 },
      (p) => progress.push(p),
      { games: 20, maxPasses: 1, screenTop: 4, ownedCap: 150, buyCap: 20 },
    );

    expect(result.commander.name).toBe('Krenko, Mob Boss');
    // every name in this fixture is a real DB card; the query can return the same name twice
    // across different printings, so compare against the distinct-name count, not owned.length
    expect(result.ownedResolved).toBe(new Set(owned.map((o) => o.name)).size);
    expect(result.deck).toHaveLength(99);
    for (const c of result.deck) {
      const identity = JSON.parse(c.color_identity || '[]') as string[];
      expect(identity.every((x) => x === 'R')).toBe(true); // in-identity, colourless cards included
      expect(c.owned).toBe(ownedNames.has(c.name) || /^(?:Mountain|Wastes)$/.test(c.name));
    }
    expect(result.buyUsd).toBeLessThanOrEqual(25);

    const krenkoRank = result.commanders.find((c) => c.name === 'Krenko, Mob Boss');
    expect(krenkoRank).toBeDefined();
    expect(result.objective).toBeGreaterThanOrEqual(krenkoRank!.screenObjective - 1e-9);
    expect(progress.some((p) => p.stage === 'screening')).toBe(true);
    expect(progress.some((p) => p.stage === 'climbing')).toBe(true);

    // H3 guard: no duplicate non-basic printings snuck into the deck (singleton except basics).
    const nonBasicCounts = new Map<string, number>();
    for (const c of result.deck) if (!/^(?:Mountain|Wastes)$/.test(c.name)) nonBasicCounts.set(c.name, (nonBasicCounts.get(c.name) ?? 0) + 1);
    expect([...nonBasicCounts.values()].every((n) => n === 1)).toBe(true);
  }, 90_000);

  it('stops screening early once 35% of an expiring deadline has passed, and still climbs the best seen so far', async () => {
    const db = getDb();
    const spells = db.prepare(`
      select name from cards
      where color_identity = '["R"]'
        and legalities like '%"commander":"legal"%'
        and layout not in ('art_series', 'token')
        and type_line not like '%Legendary%'
      order by edhrec_rank asc
      limit 120
    `).all() as { name: string }[];
    // 3 owned mono-red commander candidates; an all-but-expired deadline must stop after the first.
    const owned = [{ name: 'Krenko, Mob Boss' }, { name: 'Etali, Primal Storm' }, { name: 'Hanweir, the Writhing Township' }, ...spells.map((r) => ({ name: r.name }))];

    const result = await runBestDeck(
      { owned, budgetUsd: 25 },
      undefined,
      { games: 20, maxPasses: 1, screenTop: 3, ownedCap: 150, buyCap: 20, deadlineMs: 1 },
    );

    expect(result.commanders.length).toBeLessThan(3);
    expect(result.deck).toHaveLength(99);
  }, 90_000);
});

describe('runBestDeck integration (repo DB, colourless commander — M1)', () => {
  it('fills a colourless commander to 99 cards with Wastes, even at $0 budget', async () => {
    const result = await runBestDeck(
      { commanderName: 'Karn, Legacy Reforged', owned: [{ name: 'Karn, Legacy Reforged' }, { name: 'Sol Ring' }], budgetUsd: 0 },
      undefined,
      { games: 20, maxPasses: 1 },
    );
    expect(result.commander.name).toBe('Karn, Legacy Reforged');
    expect(result.deck).toHaveLength(99);
    expect(result.deck.filter((c) => c.name === 'Wastes').length).toBeGreaterThan(0);
    expect(result.buyUsd).toBe(0);
  }, 90_000);
});
