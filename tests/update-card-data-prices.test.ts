import { describe, it, expect } from 'vitest';
import { foldMinPrice, finalizeMinPrice, computePriceRefresh, parseArgs } from '../scripts/update-card-data';
import type { MinPriceAcc, PriceRow } from '../scripts/update-card-data';

describe('parseArgs — CLI flag validation', () => {
  it('rejects an unknown flag', () => {
    expect(() => parseArgs(['--bogus'])).toThrow(/Unknown flag: --bogus/);
  });

  it('accepts --dry-run and --prices-only', () => {
    expect(parseArgs(['--dry-run', '--prices-only'])).toEqual({ dryRun: true, pricesOnly: true, dbDir: undefined });
  });

  it('accepts --db <dir> and overrides MTG_DB_DIR semantics', () => {
    expect(parseArgs(['--db', 'C:/tmp/some-db'])).toEqual({ dryRun: false, pricesOnly: false, dbDir: 'C:/tmp/some-db' });
  });

  it('--db with no argument throws', () => {
    expect(() => parseArgs(['--db'])).toThrow(/--db requires a directory/);
  });
});

const EMPTY: MinPriceAcc = { usd: null, foil: null, etched: null };

describe('foldMinPrice / finalizeMinPrice — lowest price across printings', () => {
  it('3 printings: null usd / $5 / $3 -> $3', () => {
    let acc = EMPTY;
    acc = foldMinPrice(acc, { usd: null });
    acc = foldMinPrice(acc, { usd: '5.00' });
    acc = foldMinPrice(acc, { usd: '3.00' });
    expect(finalizeMinPrice(acc)).toBe(3);
  });

  it('all printings null usd, one foil $9 -> falls back to $9', () => {
    let acc = EMPTY;
    acc = foldMinPrice(acc, { usd: null, usd_foil: null });
    acc = foldMinPrice(acc, { usd: null, usd_foil: '9.00' });
    expect(finalizeMinPrice(acc)).toBe(9);
  });

  it('no usd or foil anywhere, etched $12 -> falls back to etched', () => {
    let acc = EMPTY;
    acc = foldMinPrice(acc, { usd: null, usd_foil: null, usd_etched: '12.00' });
    expect(finalizeMinPrice(acc)).toBe(12);
  });

  it('no printing has any price -> null', () => {
    const acc = foldMinPrice(EMPTY, { usd: null, usd_foil: null, usd_etched: null });
    expect(finalizeMinPrice(acc)).toBeNull();
  });
});

// U9a finding 7 — the old backfill UPDATE gated on `price_usd IS NULL`, so a
// price it wrote once was frozen forever, never refreshed on a later run
// even after the cheapest printing's price changed. computePriceRefresh()
// replaces that: a row's own printing (when it has a price) always wins;
// otherwise the current cross-printing lowest always refreshes; a null
// never overwrites a known price.
describe('computePriceRefresh — refreshes every run, own printing wins, null never overwrites', () => {
  it('a row whose own printing has no price takes the current cross-printing lowest', () => {
    const rows: PriceRow[] = [{ id: 'p1', oracle_id: 'o1', price_usd: null }];
    const minByOracle = new Map<string, MinPriceAcc>([['o1', { usd: 3, foil: null, etched: null }]]);
    const updates = computePriceRefresh(rows, new Map(), minByOracle);
    expect(updates).toEqual([{ id: 'p1', price: '3.00' }]);
  });

  it('two consecutive runs: the cheapest printing drops from $5 to $3 — the backfilled price refreshes, not frozen', () => {
    const rows: PriceRow[] = [{ id: 'p1', oracle_id: 'o1', price_usd: '5.00' }]; // backfilled last run
    const runTwoMin = new Map<string, MinPriceAcc>([['o1', { usd: 3, foil: null, etched: null }]]);
    const updates = computePriceRefresh(rows, new Map(), runTwoMin);
    expect(updates).toEqual([{ id: 'p1', price: '3.00' }]);
  });

  it('a row whose own printing HAS a price takes that, even when another printing is cheaper', () => {
    const rows: PriceRow[] = [{ id: 'p1', oracle_id: 'o1', price_usd: '5.00' }];
    const priceByPrintingId = new Map<string, number>([['p1', 8]]); // own printing: $8
    const minByOracle = new Map<string, MinPriceAcc>([['o1', { usd: 3, foil: null, etched: null }]]); // cheapest printing: $3
    const updates = computePriceRefresh(rows, priceByPrintingId, minByOracle);
    expect(updates).toEqual([{ id: 'p1', price: '8.00' }]);
  });

  it('neither source has a price — a known price is left untouched', () => {
    const rows: PriceRow[] = [{ id: 'p1', oracle_id: 'o1', price_usd: '5.00' }];
    const updates = computePriceRefresh(rows, new Map(), new Map());
    expect(updates).toEqual([]);
  });

  it('a row already at the computed price is skipped (no-op)', () => {
    const rows: PriceRow[] = [{ id: 'p1', oracle_id: 'o1', price_usd: '3.00' }];
    const minByOracle = new Map<string, MinPriceAcc>([['o1', { usd: 3, foil: null, etched: null }]]);
    const updates = computePriceRefresh(rows, new Map(), minByOracle);
    expect(updates).toEqual([]);
  });
});
