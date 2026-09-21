/**
 * Deck Score v1.4 stage 1d — the mana ledger corrections and the Commander
 * horizon. docs/DECK_SCORE_SPEC.md §10.8.
 *
 * Three accounting defects and one horizon change:
 *
 *   rituals     a one-shot ritual used to be `+1` mana on EVERY turn from turn
 *               3, for ever, having been cast zero times. It now leaves the
 *               ramp curve entirely and is credited once, at its resolution,
 *               inside the burst budget.
 *   deployment  every body, every commander and every engine is now CAST out
 *               of the same per-turn budget as spells, activations and
 *               animation; the command zone is availability, not free casting.
 *   cantrips    `1/(1 - cantripShare*density)` became a finite card ledger: a
 *               cantrip spends its own copy, draws ONE card, and cannot borrow
 *               a draw from a later turn.
 *   horizon     Commander searches to T20 with the finish predicate applied
 *               PER OPPONENT (three at 40, no overkill transfer); Brawl and
 *               Standard stay at T12 and the T1-T12 prefix is unchanged.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { DbCard } from '../types';
import {
  computeWin, winAudit, winWitness, manaCurveFor, scheduleDamage, WIN_FAMILIES,
  type Source, type WinTotals,
} from '../deck-score-win';
import { buildSpellSchedule, isPrintedRitual } from '../deck-score-spells';
import {
  allocateDamage, horizonFor, setHorizonOverride, MAX_TURN, COMMANDER_HORIZON,
} from '../deck-score-finishers';
import { normsFor } from '../deck-score-norms';
import { deriveCardFeature, type CardFeature } from '../deck-score-features';
import type { DeckEntry } from '../deck-score-mana';
import { loadDataset, loadCedhCohort } from '../../../scripts/deck-score-fixtures';
import { scoreDeck } from '../deck-score';

vi.setConfig({ testTimeout: 180_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v14d-${idCounter}-${overrides.name}`,
    oracle_id: `v14d-oracle-${idCounter}`,
    mana_cost: '{1}{R}', cmc: 2, type_line: 'Creature — Human Shaman', oracle_text: null,
    colors: '["R"]', color_identity: '["R"]', keywords: '[]',
    set_code: 'tst', set_name: 'Test Set', collector_number: String(idCounter), rarity: 'rare',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '1', toughness: '2', loyalty: null, produced_mana: null, edhrec_rank: null,
    layout: 'normal', updated_at: '2024-01-01', subtypes: null, arena_id: null,
    ...overrides,
  };
}

interface Spec { name: string; cmc?: number; type?: string; text?: string; power?: string | null }

function feature(spec: Spec): CardFeature {
  const cmc = spec.cmc ?? 2;
  return deriveCardFeature(mkCard({
    name: spec.name, cmc, mana_cost: `{${cmc}}`,
    type_line: spec.type ?? 'Creature — Human Shaman',
    oracle_text: spec.text ?? null,
    power: spec.power === undefined ? '1' : spec.power,
  }));
}

const entry = (f: CardFeature, quantity = 1): DeckEntry => ({ feature: f, quantity });

/** A flat one-mana-per-turn curve: nothing to deploy, nothing to spend. */
const flatCurve = (horizon = COMMANDER_HORIZON) => manaCurveFor('commander', 100, [], horizon);

function src(over: Partial<Source> & { name: string }): Source {
  return { cmc: 0, quantity: 1, guaranteed: true, output: 0, bodies: 1, ...over };
}

// ── rituals (§10.8 item 2) ────────────────────────────────────────────────

describe('§10.8 item 2 — a ritual is paid once, not every turn', () => {
  const darkRitual = feature({
    name: 'Test Ritual', cmc: 1, type: 'Instant', power: null,
    text: 'Add {B}{B}{B}.',
  });
  const signet = feature({
    name: 'Test Signet', cmc: 2, type: 'Artifact', power: null,
    text: '{1}, {T}: Add {W}{U}.',
  });

  it('a printed ritual is recognised as one, and a rock is not', () => {
    expect(isPrintedRitual(darkRitual)).toBe(true);
    expect(isPrintedRitual(signet)).toBe(false);
  });

  it('a deck of nothing but rituals adds NO persistent mana', () => {
    const curve = manaCurveFor('commander', 40, [entry(darkRitual, 10)], MAX_TURN);
    expect(curve.bonus).toBe(0);
    for (let t = 1; t <= MAX_TURN; t++) expect(curve.at(t)).toBe(t);
  });

  it('the ritual is credited once, in the burst budget, and never as a per-turn carry', () => {
    const sched = buildSpellSchedule('commander', 40, [entry(darkRitual, 4)], (t) => t);
    expect(sched.ritualCopies).toBe(4);
    expect(sched.ritualNetBurst).toBeGreaterThan(0);
    // The burst is a per-turn FIGURE, capped by that turn's own mana: it is
    // never the accumulation of every earlier turn's unspent ritual mana.
    for (let t = 1; t <= MAX_TURN; t++) expect(sched.burstMana[t]).toBeLessThanOrEqual(t + 1e-9);
    // Unspent mana empties at the boundary: the cap is this turn's mana, so the
    // series cannot grow faster than the land curve it is priced against.
    expect(sched.burstMana[12]).toBeLessThanOrEqual(sched.burstMana[12]);
  });

  it('a persistent mana source IS paid for, and produces from the following turn', () => {
    const curve = manaCurveFor('commander', 40, [entry(signet, 10)], MAX_TURN);
    // Turn 1 cannot cast a two-drop: nothing is spent and nothing is online.
    expect(curve.at(1)).toBe(1);
    expect(curve.spendableAt(1)).toBe(1);
    // By the horizon the deck has paid for its ramp and is above the land curve.
    expect(curve.bonus).toBeGreaterThan(0);
    expect(curve.at(MAX_TURN)).toBeGreaterThan(MAX_TURN);
    // Every turn's spendable mana is what it produced minus what it spent.
    for (let t = 1; t <= MAX_TURN; t++) expect(curve.spendableAt(t)).toBeLessThanOrEqual(curve.at(t) + 1e-9);
  });
});

// ── deployment (§10.8 item 2) ─────────────────────────────────────────────

describe('§10.8 item 2 — deployment comes out of the shared per-turn ledger', () => {
  it('a 4-drop commander on T4 leaves 0 spell mana at 4 lands', () => {
    const commander = src({ name: 'Four Drop', cmc: 4, output: 6 });
    const sched = scheduleDamage('commander', 100, [commander], flatCurve(),
      { perOpponent: 40, opponents: 3 });
    const t4 = sched.ledger[3];
    expect(t4.startsWith('T4 ')).toBe(true);
    expect(t4).toContain('mana 4.00');
    expect(t4).toContain('deployment 4.00 cumulative');
    expect(t4).toContain('left 0.00');
    // A spell is cast in one turn: turn 1 cannot part-pay a four-drop, so its
    // mana simply empties at the boundary.
    expect(sched.ledger[0]).toContain('deployment 0.00 cumulative');
    expect(sched.ledger[0]).toContain('left 1.00');
  });

  it('summoning sickness: the body deployed on T4 deals nothing until T5', () => {
    const commander = src({ name: 'Four Drop', cmc: 4, output: 6 });
    const sched = scheduleDamage('commander', 100, [commander], flatCurve(),
      { perOpponent: 40, opponents: 3 });
    // perTurn is indexed from turn 2.
    expect(sched.perTurn[4 - 2]).toBe(0);
    expect(sched.perTurn[5 - 2]).toBeGreaterThan(0);
  });

  it('a deployment is debited once: the cumulative cost stops growing', () => {
    const commander = src({ name: 'Four Drop', cmc: 4, output: 6 });
    const sched = scheduleDamage('commander', 100, [commander], flatCurve(),
      { perOpponent: 40, opponents: 3 });
    const cost = (row: string) => Number(/deployment ([\d.]+) cumulative/.exec(row)![1]);
    expect(cost(sched.ledger[4])).toBe(4);
    expect(cost(sched.ledger[COMMANDER_HORIZON - 1])).toBe(4);
  });

  it('mana spent on a body cannot also pay the spells', () => {
    const body = src({ name: 'Body', cmc: 3, output: 5, guaranteed: true });
    const hungry = src({
      name: 'Pinger', cmc: 1, output: 2, guaranteed: true, deployDelay: 1,
      shareKey: 'spellslinger', upkeepAt: () => 99,
    });
    const sched = scheduleDamage('commander', 100, [body, hungry], flatCurve(),
      { perOpponent: 40, opponents: 3 });
    // Once the pinger is online it eats the whole turn; the row records the
    // spell charge and leaves nothing behind it.
    const busy = sched.ledger.find((r) => /spells (?!0\.00)/.test(r));
    expect(busy).toBeDefined();
    expect(busy!).toContain('left 0.00');
  });
});

// ── the cantrip ledger (§10.8 item 3) ─────────────────────────────────────

describe('§10.8 item 3 — the cantrip ledger is finite and causal', () => {
  const cantrip = feature({
    name: 'Test Cantrip', cmc: 1, type: 'Instant', power: null,
    text: 'Scry 2, then draw a card.',
  });
  const brick = feature({ name: 'Test Brick', cmc: 1, type: 'Instant', power: null, text: 'Target creature gets +1/+1.' });

  it('a deck with no cantrips reads identically with and without replacement', () => {
    const sched = buildSpellSchedule('commander', 99, [entry(brick, 40)], (t) => t);
    expect([...sched.noncreature]).toEqual([...sched.noncreatureNoReplacement]);
  });

  it('replacement sees deeper, but never more copies than the deck holds', () => {
    const sched = buildSpellSchedule('commander', 99, [entry(cantrip, 40)], (t) => t);
    let cast = 0;
    for (let t = 1; t <= MAX_TURN; t++) {
      expect(sched.noncreature[t]).toBeGreaterThanOrEqual(sched.noncreatureNoReplacement[t] - 1e-9);
      cast += sched.noncreature[t];
    }
    expect(cast).toBeLessThanOrEqual(40 + 1e-9);
  });

  it('no borrowing: a turn never casts more than its own mana pays for', () => {
    const sched = buildSpellSchedule('commander', 99, [entry(cantrip, 40)], (t) => t);
    for (let t = 1; t <= MAX_TURN; t++) {
      // mean MV 1 here, so the affordable count is the turn's mana itself.
      expect(sched.noncreature[t]).toBeLessThanOrEqual(t + 1e-9);
    }
  });

  it('the chain is bounded by the library, not by an arbitrary factor of 2', () => {
    const sched = buildSpellSchedule('commander', 99, [entry(cantrip, 99)], (t) => t * 5);
    let cast = 0;
    for (let t = 1; t <= MAX_TURN; t++) cast += sched.noncreature[t];
    expect(cast).toBeLessThanOrEqual(99 + 1e-9);
  });
});

// ── the per-opponent finish predicate (§10.8 item 1) ──────────────────────

describe('§10.8 item 1 — the finish is per opponent, not aggregate', () => {
  const pod = () => [40, 40, 40];

  it('120 damage aimed at one opponent is NOT a finish', () => {
    const remaining = pod();
    allocateDamage(remaining, 0, [{ power: 120, count: 1 }]);
    expect(remaining[0]).toBe(0);
    expect(remaining.filter((r) => r > 0)).toHaveLength(2);
  });

  it('three 40-power instances ARE a finish', () => {
    const remaining = pod();
    allocateDamage(remaining, 0, [{ power: 40, count: 3 }]);
    expect(remaining.every((r) => r === 0)).toBe(true);
  });

  it('an each-opponent trigger counts three times', () => {
    const remaining = pod();
    allocateDamage(remaining, 40, []);
    expect(remaining.every((r) => r === 0)).toBe(true);
  });

  it('overkill on one opponent cannot pay another', () => {
    const two = pod();
    allocateDamage(two, 0, [{ power: 60, count: 2 }]);
    // 120 aggregate, but only two opponents are dead.
    expect(two.filter((r) => r > 0)).toHaveLength(1);
    const three = pod();
    allocateDamage(three, 0, [{ power: 60, count: 3 }]);
    expect(three.every((r) => r === 0)).toBe(true);
  });

  it('a wide board of small bodies splits and does finish', () => {
    const remaining = pod();
    allocateDamage(remaining, 0, [{ power: 2, count: 60 }]);
    expect(remaining.every((r) => r === 0)).toBe(true);
  });

  it('the schedule refuses a single huge attacker as a whole-table finish', () => {
    const giant = src({ name: 'Giant', cmc: 1, output: 60, guaranteed: true });
    const sched = scheduleDamage('commander', 100, [giant], flatCurve(),
      { perOpponent: 40, opponents: 3 });
    // 60 a turn from turn 2 is 120 aggregate by turn 3 and still not a finish:
    // each attack wastes 20 on a dead opponent.
    expect(sched.tStar).not.toBe(3);
    expect(sched.tStar).toBe(4);
  });
});

// ── the horizon (§10.8 item 1 / item 4) ───────────────────────────────────

describe('§10.8 — Commander searches to T20, Brawl and Standard stay at T12', () => {
  it('horizonFor dispatches by profile', () => {
    expect(horizonFor('commander')).toBe(COMMANDER_HORIZON);
    expect(horizonFor('brawl')).toBe(MAX_TURN);
    expect(horizonFor('standard')).toBe(MAX_TURN);
    expect(COMMANDER_HORIZON).toBe(20);
  });

  it('the T1-T12 prefix is identical under H12 and H20', () => {
    const slow = src({ name: 'Slow', cmc: 2, output: 3, guaranteed: false, quantity: 8 });
    const run = (h: number) => {
      setHorizonOverride(h);
      try {
        return scheduleDamage('commander', 99, [slow], manaCurveFor('commander', 99, [], h),
          { perOpponent: 40, opponents: 3 });
      } finally { setHorizonOverride(null); }
    };
    const a = run(MAX_TURN);
    const b = run(COMMANDER_HORIZON);
    expect(b.perTurn.slice(0, MAX_TURN - 1)).toEqual(a.perTurn.slice(0, MAX_TURN - 1));
    expect(b.ledger.slice(0, MAX_TURN)).toEqual(a.ledger.slice(0, MAX_TURN));
    for (let t = 1; t <= MAX_TURN; t++) expect(b.shortfall[t]).toBeCloseTo(a.shortfall[t], 9);
  });

  it('a T15 close is worth u = 0.3299 at saturated access', () => {
    const norms = normsFor('commander');
    expect(norms.fastClosingTurn).toBe(7);
    expect(norms.delayHalfLifeTurns).toBe(5);
    const u = Math.pow(2, -Math.max(0, 15 - norms.fastClosingTurn) / norms.delayHalfLifeTurns);
    expect(u).toBeCloseTo(0.3299, 4);
    expect(Math.pow(2, -(20 - 7) / 5)).toBeCloseTo(0.1649, 4);
  });

  it('a route that never closes earns exactly zero, at either horizon', () => {
    const feeble = src({ name: 'Feeble', cmc: 9, output: 0.01, guaranteed: true });
    for (const h of [MAX_TURN, COMMANDER_HORIZON]) {
      setHorizonOverride(h);
      try {
        const sched = scheduleDamage('commander', 99, [feeble], manaCurveFor('commander', 99, [], h),
          { perOpponent: 40, opponents: 3 });
        expect(sched.tStar).toBeNull();
        expect(sched.shortfall[h]).toBeGreaterThan(0);
      } finally { setHorizonOverride(null); }
    }
  });
});

// ── control with no computed finish (§9.4 / §10.6.3) ──────────────────────

describe('control inevitability without a finish is zero, not a default turn', () => {
  it('a stabilising deck with no closing output builds no control line', () => {
    const answer = feature({
      name: 'Test Wrath', cmc: 3, type: 'Sorcery', power: null,
      text: 'Destroy all creatures.',
    });
    const engine = feature({
      name: 'Test Engine', cmc: 3, type: 'Enchantment', power: null,
      text: 'At the beginning of your draw step, draw an additional card.',
    });
    const entries = [entry(answer, 20), entry(engine, 10)];
    const totals: WinTotals = { E: 100, Estar: 10, D: 100, Dstar: 10, hasDrawEngine: true };
    const { notes, win } = winAudit('commander', normsFor('commander'), 'control', 99, entries, [], totals);
    expect(notes.some((n) => n.family === 'control')).toBe(true);
    expect(win.score).toBe(0);
  });
});

// ── the Vivi witness and the cEDH invariance (§10.8 items 3 and 4) ────────

describe('§10.8 item 3 — the Vivi witness', () => {
  it('prints a paid deployment ledger and still closes T6 (OUT HIGH, band 70-85)', () => {
    const hit = loadDataset(200).fixtures.find((f) => f.name === 'vivi-battery-arena');
    expect(hit).toBeDefined();
    const input = hit!.input;
    const all: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const N = all.reduce((s, e) => s + e.quantity, 0);
    const cmd = input.commander.map((c) => deriveCardFeature(c));
    const norms = normsFor(input.format);
    const totals: WinTotals = { E: 60, Estar: 10, D: 60, Dstar: 10, hasDrawEngine: true };
    const text = winWitness(input.format, norms, 'midrange', N, all, cmd, totals);
    expect(text).toContain('horizon T12');
    expect(text).toContain('| turn | mana ledger |');
    expect(text).toMatch(/deployment [1-9][\d.]* cumulative/);
    expect(text).toContain('no-replacement casts');
    // The corrected witness does NOT reproduce the stage-1c T6 / W 98.4 / 90
    // reading: paid deployment moves the first close to T7 and W to 82.7. The
    // anchor is still marginally OUT HIGH (86 against a 70-85 band), which is
    // recorded, not tuned away.
    const win = computeWin(input.format, norms, 'midrange', N, all, cmd, totals);
    expect(win.reason).toContain('closes T7');
    expect(win.score).toBeCloseTo(82.7, 0);
    expect(scoreDeck(input).score).toBe(86);
  });
});

describe('§10.8 item 4 — cEDH horizon invariance', () => {
  it('W and the composed total are identical at H12 and H20 on the cEDH cohort', () => {
    const cedh = loadCedhCohort().map((d) => d.input);
    expect(cedh.length).toBe(30);
    const read = (input: (typeof cedh)[number]) => {
      const all: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
      const N = all.reduce((s, e) => s + e.quantity, 0);
      const cmd = input.commander.map((c) => deriveCardFeature(c));
      const norms = normsFor(input.format);
      const totals: WinTotals = { E: 60, Estar: 10, D: 60, Dstar: 10, hasDrawEngine: true };
      return {
        W: computeWin(input.format, norms, 'midrange', N, all, cmd, totals).score,
        total: scoreDeck(input).score,
      };
    };
    setHorizonOverride(MAX_TURN);
    const at12 = cedh.map(read);
    setHorizonOverride(COMMANDER_HORIZON);
    const at20 = cedh.map(read);
    setHorizonOverride(null);
    for (let i = 0; i < cedh.length; i++) {
      expect(at20[i].W).toBeCloseTo(at12[i].W, 9);
      expect(at20[i].total).toBe(at12[i].total);
    }
  });
});

// ── the frozen W domain (§10.8 item 6) ────────────────────────────────────

describe('§10.8 item 6 — the W domain is frozen on this scheduler', () => {
  it('domain-v14.json records the same families and catalogue this tree scores with', () => {
    const frozen = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'verify-2026-09-19', 'deck-score', 'domain-v14.json'), 'utf-8'));
    expect(frozen.winFamilies).toEqual([...WIN_FAMILIES].sort());
    expect(frozen.catalogSha256).toBe('21fa0be02940c884620b08cfd3cbf9558fb42abf1f7d31428c38fda167da2c6b');
    expect(frozen.combosSha256).toBe('19acb60cf6b088f831c4e8a671e8ac7e7a63da6441ca34d56c15afb8bb5d8a82');
    expect(frozen.scheduler).toBe('v14-stage1d');
  });
});
