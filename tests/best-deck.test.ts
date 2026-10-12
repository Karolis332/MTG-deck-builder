import { describe, it, expect } from 'vitest';
import { getDb } from '../src/lib/db';
import {
  seedDeck, costOf, deckScoreTotal, BASIC_RE, DEFAULT_WEIGHTS, resolveCard, basicsFor,
  buildPool, reportAlternatives, type ReportOpts,
} from '../src/lib/best-deck';
import type { DbCard } from '../src/lib/types';

let nextId = 0;
function card(name: string, opts: Partial<DbCard> & { land?: boolean } = {}): DbCard {
  return {
    id: `t${nextId++}`, name, type_line: opts.land ? 'Land' : 'Creature — Bear', oracle_text: '',
    cmc: opts.cmc ?? 2, mana_cost: opts.mana_cost ?? null, edhrec_rank: opts.edhrec_rank ?? null,
    price_usd: opts.price_usd ?? null,
  } as DbCard;
}

describe('costOf', () => {
  const owned = new Set(['Sol Ring', 'Forest']);
  it('is 0 for owned cards and basics, the price for a priced unowned card, null when unpriced', () => {
    expect(costOf(card('Sol Ring'), owned)).toBe(0);
    expect(costOf(card('Forest', { land: true }), owned)).toBe(0);
    expect(costOf(card('Priced Bomb', { price_usd: '12.50' }), owned)).toBe(12.5);
    expect(costOf(card('Unpriced Rare', { price_usd: null }), owned)).toBeNull();
  });
});

describe('seedDeck (no budget opts)', () => {
  it('orders lands and spells by inclusion then EDHREC rank, lands first then basics then spells — unchanged from before the budget option existed', () => {
    const commander = card('Cmdr');
    const basics = [card('Forest', { land: true })];
    const landA = card('LandA', { land: true, edhrec_rank: 100 });
    const landB = card('LandB', { land: true, edhrec_rank: 200 });
    const spellA = card('SpellA', { edhrec_rank: 50 });
    const spellB = card('SpellB', { edhrec_rank: 900 });
    const pool = [landB, landA, spellB, spellA]; // deliberately out of order
    const incl = new Map([['LandA', 0.9], ['LandB', 0.5], ['SpellA', 0.9], ['SpellB', 0.1]]);

    const deck = seedDeck(commander, pool, basics, { incl });

    expect(deck).toHaveLength(99);
    const names = deck.map((c) => c.name);
    expect(names.slice(0, 2)).toEqual(['LandA', 'LandB']); // lands first, by inclusion desc
    expect(names.slice(-2)).toEqual(['SpellA', 'SpellB']); // spells last, by inclusion desc
    expect(names.filter((n) => !BASIC_RE.test(n))).toEqual(['LandA', 'LandB', 'SpellA', 'SpellB']);
    expect(deck.filter((c) => BASIC_RE.test(c.name))).toHaveLength(95); // the rest backfilled with the only basic
  });
});

describe('seedDeck (budget)', () => {
  const ownedNames = new Set(['OwnLand1', 'OwnLand2', 'OwnSpell1', 'OwnSpell2']);
  const cost = (c: DbCard) => costOf(c, ownedNames);
  const commander = card('Cmdr2');
  const basics = [card('Island', { land: true })];
  const pool = [
    card('OwnLand1', { land: true, edhrec_rank: 10 }),
    card('OwnLand2', { land: true, edhrec_rank: 20 }),
    card('BuyLand1', { land: true, edhrec_rank: 5, price_usd: '3.00' }),
    card('OwnSpell1', { edhrec_rank: 10 }),
    card('OwnSpell2', { edhrec_rank: 20 }),
    card('BuySpell1', { edhrec_rank: 1, price_usd: '2.00' }),
    card('BuySpell2', { edhrec_rank: 2, price_usd: '500.00' }), // affordable rank but far over budget
    card('Unpriced', { edhrec_rank: 3, price_usd: null }), // unowned and unpriced: never purchasable
  ];
  const incl = new Map<string, number>();

  it('budget 0 takes owned cards and basics only', () => {
    const deck = seedDeck(commander, pool, basics, { incl, cost, budget: 0 });
    expect(deck).toHaveLength(99);
    expect(deck.filter((c) => !ownedNames.has(c.name) && !BASIC_RE.test(c.name))).toHaveLength(0);
  });

  it('never spends more than the budget, skips unpriced cards, and the reserve still lets an affordable buy through', () => {
    const budget = 30;
    const deck = seedDeck(commander, pool, basics, { incl, cost, budget });
    expect(deck).toHaveLength(99);
    const spent = deck.reduce((s, c) => s + (cost(c) ?? 0), 0);
    expect(spent).toBeLessThanOrEqual(budget);
    expect(deck.some((c) => c.name === 'Unpriced')).toBe(false);
    expect(deck.some((c) => c.name === 'BuySpell2')).toBe(false); // $500 > budget
    // the reserve shrinks as slots fill, so the one affordable buy isn't crowded out by basics
    expect(deck.some((c) => c.name === 'BuyLand1')).toBe(true);
    expect(deck.some((c) => c.name === 'BuySpell1')).toBe(true);
  });
});

describe('seedDeck (budget, empty collection — N2 reserve cap)', () => {
  // No owned cards at all: the flat per-slot reserve (0.25 * ~98 open slots ≈ $24.50) alone would
  // exceed a $10 budget and block every buy before the cap existed, seeding basics/empty slots only.
  const ownedNames = new Set<string>();
  const cost = (c: DbCard) => costOf(c, ownedNames);
  const commander = card('Cmdr3');
  const basics = [card('Mountain', { land: true })];
  const pool = [
    card('CheapLand', { land: true, edhrec_rank: 1, price_usd: '1.00' }),
    card('CheapSpell', { edhrec_rank: 1, price_usd: '1.50' }),
  ];
  const incl = new Map<string, number>();

  it('buys at least one affordable card and never exceeds the budget', () => {
    const budget = 10;
    const deck = seedDeck(commander, pool, basics, { incl, cost, budget });
    expect(deck).toHaveLength(99);
    const spent = deck.reduce((s, c) => s + (cost(c) ?? 0), 0);
    expect(spent).toBeLessThanOrEqual(budget);
    expect(deck.some((c) => c.name === 'CheapLand' || c.name === 'CheapSpell')).toBe(true);
  });

  it('spends a small budget on spells before utility lands a free basic nearly replaces', () => {
    // Refute-ab N2 round 3: lands-first bought 10 utility lands and 1 spell for Krenko at $10 → 84 Mountains.
    const lands = Array.from({ length: 12 }, (_, i) => card(`UtilLand${i}`, { land: true, edhrec_rank: i, price_usd: '0.80' }));
    const spells = Array.from({ length: 40 }, (_, i) => card(`CheapSpell${i}`, { edhrec_rank: 100 + i, price_usd: '0.20' }));
    const deck = seedDeck(commander, [...lands, ...spells], basics, { incl, cost, budget: 10 });
    expect(deck).toHaveLength(99);
    expect(deck.reduce((s, c) => s + (cost(c) ?? 0), 0)).toBeLessThanOrEqual(10);
    expect(deck.filter((c) => c.name.startsWith('CheapSpell')).length).toBeGreaterThanOrEqual(30);
  });
});

describe('reportAlternatives (repo DB, Krenko mono-red)', () => {
  function buildFixture(): { deck: DbCard[]; buyList: { name: string; priceUsd: number }[]; opts: ReportOpts } {
    const db = getDb();
    const commander = resolveCard('Krenko, Mob Boss')!;
    const rows = db.prepare(`
      select name from cards
      where color_identity = '["R"]'
        and legalities like '%"commander":"legal"%'
        and layout not in ('art_series', 'token')
        and type_line not like '%Legendary%'
      order by edhrec_rank asc
      limit 150
    `).all() as { name: string }[];
    const allCards = rows.map((r) => resolveCard(r.name)!).filter(Boolean);
    const legalPool = buildPool(commander, allCards, new Set());
    // Own the cheaper half of the pool; leave the rest purchasable so seedDeck's budget buys a few,
    // which becomes this fixture's buyList (reportAlternatives needs at least one buy-list slot).
    const ownedNames = new Set(legalPool.slice(Math.floor(legalPool.length / 2)).map((c) => c.name));
    const ownedCards = legalPool.filter((c) => ownedNames.has(c.name));
    const basics = basicsFor(['R'], 'owned-list', []);
    const cost = (c: DbCard) => costOf(c, ownedNames);
    const deck = seedDeck(commander, legalPool, basics, { cost, budget: 50 });
    const buyList = deck
      .filter((c) => !ownedNames.has(c.name) && !BASIC_RE.test(c.name))
      .map((c) => ({ name: c.name, priceUsd: cost(c) ?? 0 }));
    expect(buyList.length).toBeGreaterThan(0); // fixture sanity: the report pass needs a buy-list to test replacements

    // 150 evaluations comfortably covers the ~deck-size-bound removal ranking (see the ponytail
    // note in reportAlternatives) plus room for the gated upgrade/replacement loops to actually
    // run — a tighter cap would only prove the removal-ranking floor, not the budget gate itself.
    const opts: ReportOpts = {
      format: 'commander', commander, weights: { ...DEFAULT_WEIGHTS, games: 5 },
      ownedCards, ownedNames, basics, maxEvaluations: 150, deadlineMs: 90_000,
    };
    return { deck, buyList, opts };
  }

  it('stays within the evaluation budget and every list obeys its documented bound', () => {
    const { deck, buyList, opts } = buildFixture();
    const report = reportAlternatives(deck, buyList, opts);

    expect(report.evaluations).toBeLessThanOrEqual(150);
    expect(report.upgrades.length).toBeLessThanOrEqual(15);
    expect(report.upgrades.every((u) => u.gain >= 0.25)).toBe(true);
    expect(report.replacements.length).toBeLessThanOrEqual(buyList.length);
    expect(report.replacements.every((r) => r.options.length <= 2)).toBe(true);
    expect(report.nearMisses.length).toBeLessThanOrEqual(12);
    expect(report.nearMisses.every((n) => n.delta > -0.25 && n.delta < 0.25)).toBe(true);
  }, 150_000);

  it('is deterministic: same inputs twice produce the exact same report', () => {
    const { deck, buyList, opts } = buildFixture();
    const a = reportAlternatives(deck, buyList, opts);
    const b = reportAlternatives(deck, buyList, opts);
    expect(b).toEqual(a);
  }, 280_000);

  it('upgrades ignore the remaining budget — a candidate priced over it may still appear', () => {
    const { deck, buyList, opts } = buildFixture();
    const report = reportAlternatives(deck, buyList, { ...opts, maxEvaluations: 600, deadlineMs: 60_000 });
    // Not an assertion that an expensive upgrade exists (depends on live prices) — only that
    // nothing in reportAlternatives filtered candidates by opts.budget (there is no such field).
    expect('budget' in opts).toBe(false);
    expect(report.upgrades.every((u) => u.priceUsd > 0)).toBe(true);
  }, 90_000);
});

describe('deckScoreTotal', () => {
  it('reads absoluteTotal (1.4+), falls back to score (1.2 on the VPS), 0 when unscored', () => {
    expect(deckScoreTotal({ absoluteTotal: 86.08, score: 86 })).toBe(86.08);
    expect(deckScoreTotal({ score: 71 })).toBe(71);
    expect(deckScoreTotal(null)).toBe(0);
  });
});
