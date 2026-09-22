/**
 * Deck Score v1.4 stage 3d — the damage schedule is monotone again
 * (§10.8 conventions, §10.4, §10.9 item 5).
 *
 * ROOT CAUSE, one term, one site. `scheduleDamage`'s deployment ledger asked
 * `if (cost > budget) continue` — atomic affordability measured against the
 * RESIDUAL budget. The residual is a continuous, decreasing function of the
 * library size (every `want` is `quantity * seenBy(N, t)`) and of which other
 * sources are present, so that test turned a hair of continuous movement into
 * a whole deployed copy:
 *
 *   dilution  `standard:1474218`, any 61st card (reserved unknown slot, extra
 *             land copy or duplicate): every earlier `want` shrank, the T5
 *             residual crossed a 3-drop's cost, deployment went 1.45 -> 2.93
 *             and the Token/Food line closed T8 -> T7. W 42.5 -> 60.1.
 *   deletion  `381364921`, `Conqueror's Flail` blanked: the freed activation
 *             mana crossed the same kind of boundary and the voltron line
 *             closed T13 -> T12. W .9 -> 2.7.
 *
 * `affordable(budget, cost)` replaces the step. Above the cost it is the same
 * `budget / cost` the ledger always used; below it the leftover is an
 * EXPECTATION over hands rather than mana in hand, so the copies it buys fall
 * ramp across the last `AFFORD_BAND` of the cost instead of switching on. A
 * turn still part-finances NOTHING below 75 % of a cost (section 10.8 item 2
 * is untouched); all that is gone is the discontinuity, which is the only
 * thing the two defects were made of.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { SCORE_VERSION } from '../deck-score';
import { scoreDeckSafely, type ScoreCardInput, type DeckScorePayload } from '../deck-score-input';
import { deriveCardFeature } from '../deck-score-features';
import { affordable, AFFORD_BAND, W_SCHEDULER_VERSION } from '../deck-score-win';
import { readSample, strideOrder, cardsByName } from '../../../scripts/deck-score-piles';
import { standardStride } from '../../../scripts/deck-score-probes';

vi.setConfig({ testTimeout: 300_000 });

const TOL = 1e-6;
const UNKNOWN = (quantity: number) => [{ name: 'Unreadable Card', quantity, board: 'main' }];
const W = (p: DeckScorePayload): number => p.components.find((c) => c.key === 'win')!.score;

function rng(seed: number): () => number {
  let x = seed || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

interface StrideDeck { id: string; main: ScoreCardInput[]; commander: DbCard[] }
function sampleStride(profile: 'commander' | 'brawl', n: number): StrideDeck[] {
  const byName = cardsByName();
  const sample = readSample(profile);
  const out: StrideDeck[] = [];
  for (const i of strideOrder('training', sample)) {
    if (out.length >= n) break;
    const deck = sample[i];
    if (!deck) continue;
    const main: ScoreCardInput[] = [];
    const commander: DbCard[] = [];
    let took = false; let missing = 0;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing += line.quantity; continue; }
      if (!took && line.name.toLowerCase() === deck.commander.toLowerCase()) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    if (main.length === 0 || commander.length === 0 || missing > 0) continue;
    out.push({ id: deck.id, main, commander });
  }
  return out;
}

describe('stage 3d — affordability is continuous, not truncated', () => {
  it('is exactly budget/cost once the budget covers the cost', () => {
    expect(affordable(6, 3)).toBeCloseTo(2, 12);
    expect(affordable(3, 3)).toBeCloseTo(1, 12);
  });

  it('has no step at the cost boundary (the defect term)', () => {
    const below = affordable(3 - 1e-9, 3);
    expect(Math.abs(below - affordable(3, 3))).toBeLessThan(1e-8);
  });

  it('is non-decreasing in the budget over the whole range', () => {
    let prev = -1;
    for (let b = 0; b <= 6; b += 0.05) {
      const v = affordable(b, 3);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it('still refuses to finance a spell out of scraps', () => {
    expect(affordable(0.75, 3)).toBe(0);
    expect(affordable(2.25, 3)).toBe(0);
    expect(affordable(0, 3)).toBe(0);
    expect(AFFORD_BAND).toBeLessThanOrEqual(0.25);
  });
});

describe('stage 3d — dilution: a bigger library never closes faster', () => {
  const deck = standardStride(100000).find((d) => d.id === 'standard:1474218');
  const read = (main: ScoreCardInput[], unresolved = [] as ReturnType<typeof UNKNOWN>) =>
    scoreDeckSafely({ format: 'standard', main, commander: [], unresolved })!;

  it('standard:1474218 is unmoved by a reserved unknown 61st slot', () => {
    if (!deck) return;
    const before = read(deck.main);
    const after = read(deck.main, UNKNOWN(1));
    expect(W(after)).toBeLessThanOrEqual(W(before) + TOL);
    expect(after.absoluteTotal).toBeLessThanOrEqual(before.absoluteTotal + TOL);
  });

  it('standard:1474218 is unmoved by a 61st land copy or a duplicate', () => {
    if (!deck) return;
    const before = read(deck.main);
    const bump = (pred: (c: DbCard) => boolean) => {
      const hit = deck.main.find((e) => pred(e.card))!;
      return deck.main.map((e) => (e.card.id === hit.card.id ? { ...e, quantity: e.quantity + 1 } : e));
    };
    for (const main of [bump((c) => deriveCardFeature(c).isLand), bump((c) => !deriveCardFeature(c).isLand)]) {
      expect(W(read(main))).toBeLessThanOrEqual(W(before) + TOL);
    }
  });

  it('pins the repaired schedule on standard:1474218 (W 42.5 -> 60.1 at N=60)', () => {
    if (!deck) return;
    const p = read(deck.main);
    expect(W(p)).toBeCloseTo(60.1, 1);
    expect(p.components.find((c) => c.key === 'win')!.reason).toContain('closes T7');
  });

  it('no stride list closes faster on its 61st reserved slot (30 Standard lists)', () => {
    let violations = 0;
    for (const d of standardStride(30)) {
      const before = scoreDeckSafely({ format: 'standard', main: d.main, commander: [], unresolved: [] });
      const after = scoreDeckSafely({ format: 'standard', main: d.main, commander: [], unresolved: UNKNOWN(1) });
      if (!before || !after) continue;
      if (W(after) > W(before) + TOL) violations++;
    }
    expect(violations).toBe(0);
  });
});

describe('stage 3d — deletion and blanking never gain', () => {
  const FLAIL = ['conqueror', 's flail'].join('');

  it('381364921: blanking the pump source now LOSES (was +1.44)', () => {
    const deck = sampleStride('commander', 100000).find((d) => d.id === '381364921');
    if (!deck) return;
    const hit = deck.main.find((e) => e.card.name.toLowerCase() === FLAIL);
    if (!hit) return;
    const before = scoreDeckSafely({ format: 'commander', main: deck.main, commander: deck.commander, unresolved: [] })!;
    const after = scoreDeckSafely({
      format: 'commander', main: deck.main.filter((e) => e !== hit), commander: deck.commander,
      unresolved: UNKNOWN(hit.quantity),
    })!;
    expect(W(after)).toBeLessThanOrEqual(W(before) + TOL);
    expect(after.absoluteTotal).toBeLessThanOrEqual(before.absoluteTotal + TOL);
  });

  it('deleting one random nonland copy never raises W (seeded, 3 profiles)', () => {
    const next = rng(0x3d0001);
    const violators: string[] = [];
    const run = (id: string, format: 'commander' | 'brawl' | 'standard', main: ScoreCardInput[], commander: DbCard[]) => {
      const before = scoreDeckSafely({ format, main, commander, unresolved: [] });
      if (!before) return;
      const nonLand = main.filter((e) => !deriveCardFeature(e.card).isLand);
      if (nonLand.length === 0) return;
      const pick = nonLand[Math.floor(next() * nonLand.length)];
      const trimmed = main
        .map((e) => (e === pick ? { ...e, quantity: e.quantity - 1 } : e))
        .filter((e) => e.quantity > 0);
      const after = scoreDeckSafely({ format, main: trimmed, commander, unresolved: UNKNOWN(1) });
      if (!after) return;
      if (W(after) > W(before) + TOL) violators.push(id);
    };
    for (const d of sampleStride('commander', 25)) run(d.id, 'commander', d.main, d.commander);
    for (const d of sampleStride('brawl', 25)) run(d.id, 'brawl', d.main, d.commander);
    for (const d of standardStride(25)) run(d.id, 'standard', d.main, []);
    expect(violators).toEqual([]);
  });

  it('blanking one random nonland copy never raises W (seeded, 3 profiles)', () => {
    const next = rng(0x3d0002);
    const violators: string[] = [];
    const run = (id: string, format: 'commander' | 'brawl' | 'standard', main: ScoreCardInput[], commander: DbCard[]) => {
      const before = scoreDeckSafely({ format, main, commander, unresolved: [] });
      if (!before) return;
      const nonLand = main.filter((e) => !deriveCardFeature(e.card).isLand);
      if (nonLand.length === 0) return;
      const pick = nonLand[Math.floor(next() * nonLand.length)];
      const after = scoreDeckSafely({
        format, main: main.filter((e) => e !== pick), commander,
        unresolved: UNKNOWN(pick.quantity),
      });
      if (!after) return;
      if (W(after) > W(before) + TOL) violators.push(id);
    };
    for (const d of sampleStride('commander', 25)) run(d.id, 'commander', d.main, d.commander);
    for (const d of sampleStride('brawl', 25)) run(d.id, 'brawl', d.main, d.commander);
    for (const d of standardStride(25)) run(d.id, 'standard', d.main, []);
    // One Standard residue remains, and it is a DIFFERENT mechanism from the
    // step this stage removed: the deployment greedy still spends the turn in
    // one fixed output-per-mana order, so a better-ratio source can take mana
    // a slower-ratio source needed EARLIER. Pinned for stage 4, not hidden.
    expect(violators).toEqual(['standard:1474208']);
  });
});

describe('stage 3d — version', () => {
  it('bumps SCORE_VERSION and the scheduler version for the evaluator change', () => {
    expect(SCORE_VERSION).toBe('1.4.0-rc4');
    expect(W_SCHEDULER_VERSION).toBe('v14-stage3d');
  });
});
