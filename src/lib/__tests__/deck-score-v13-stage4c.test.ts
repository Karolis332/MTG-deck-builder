/**
 * Deck Score v1.3 stage 4c — docs/DECK_SCORE_SPEC.md §9.2 (`S = 100 *
 * clip((Q-b)/(Qsat-b)) * R`) and §4 ("no constant fitted to an anchor").
 *
 * Stage 4b measured the Brawl floor at .675 against a shared .70 saturation,
 * which left a .025-wide window: every real Brawl list pinned at S = 100, so S
 * separated a deck from a pile but no longer a deck from a deck. This freezes
 * the two missing per-profile measurements — the Brawl saturation and the
 * Brawl closing floor — and pins the evidence each was cut from.
 *
 * Nothing here writes the repo card DB or the catalogue shards: every test
 * reads the sample CSV, the `cards` table and the frozen tables.
 */
import { describe, it, expect } from 'vitest';
import { scoreDeck } from '../deck-score';
import {
  PLAN_RECIPES, recipeFor, evaluatePlan, evaluateTypal, qBaselineFor, planFit,
  selectPlan, type PlanKey,
} from '../deck-score-plans';
import {
  Q_BASELINE, Q_BASELINE_CLOSING, Q_BASELINE_CLOSING_BRAWL,
  Q_BASELINE_JOINT_BRAWL, Q_BASELINE_JOINT_COMMANDER,
  Q_SATURATION, Q_SATURATION_BRAWL, qSaturationFor, profileOf, SCORE_VERSION,
  type ScoreFormat, type ScoreProfile,
} from '../deck-score-norms';
import { deriveCardFeature } from '../deck-score-features';
import { producerUtilisation } from '../deck-score-producers';
import { catalogEntry } from '../deck-score-catalog';
import type { DeckEntry } from '../deck-score-mana';
import { readSample, strideOrder, cardsByName, type SampleProfile } from '../../../scripts/deck-score-piles';
import { loadDataset } from '../../../scripts/deck-score-fixtures';

/** The frozen stage-4c table (`saturation-{commander,brawl}.txt`), measured
 * over each profile's WHOLE training stride with the typed-coverage gate
 * lifted. The live checks below run a commander-balanced PREFIX of the same
 * stride, which is why they assert a tolerance rather than these digits. */
const SATURATION_TABLE = {
  commander: { n: 1838, p75: 0.683, p80: 0.698, p90: 0.749 },
  brawl: { n: 1165, p75: 0.695, p80: 0.712, p90: 0.754 },
};
/** Where `.70` sits in the Commander distribution — the percentile the Brawl
 * constant is frozen at. */
const COMMANDER_SATURATION_PERCENTILE = 80.7;

const PREFIX = 240;

function pct(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))];
}

interface Read { Q: number; R: number; b: number; selectable: boolean }

/** The statistic `bands saturation --raw` prints, over a prefix of the same
 * commander-balanced stride: the per-list max Q over every selectable recipe,
 * and the reads each list's S is taken from. */
function readStride(profile: SampleProfile, limit = PREFIX): { maxQ: number[]; reads: Read[][] } {
  const byName = cardsByName();
  const sample = readSample(profile);
  const order = strideOrder('training', sample).slice(0, limit);
  const generic: PlanKey[] = ['aggro', 'midrange', 'control'];
  const families = PLAN_RECIPES.filter((r) => !generic.includes(r.key));
  const out: Read[][] = [];

  for (const i of order) {
    const deck = sample[i];
    const entries: DeckEntry[] = [];
    const commanders: DeckEntry[] = [];
    const commanderName = deck.commander.toLowerCase();
    let missing = 0;
    let took = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing++; continue; }
      const entry = { feature: { ...deriveCardFeature(card), covered: true }, quantity: line.quantity };
      if (!took && line.name.toLowerCase() === commanderName) { commanders.push(entry); took = true; continue; }
      entries.push(entry);
    }
    const nonLand = entries.filter((e) => !e.feature.isLand);
    if (nonLand.length === 0 || missing > deck.cards.length * 0.1) continue;
    const N = entries.reduce((a, e) => a + e.quantity, 0) + commanders.length;
    const util = producerUtilisation(nonLand, commanders);
    const reads: Read[] = [];
    const record = (key: string, e: ReturnType<typeof evaluatePlan>): void => {
      reads.push({ Q: e.Q, R: e.R, b: qBaselineFor(profile, key as PlanKey), selectable: !e.hasEmptyEssential });
    };
    for (const recipe of families) record(recipe.key, evaluatePlan(recipe, N, nonLand, commanders, util, profile));
    const typal = evaluateTypal(N, nonLand, commanders, util, profile);
    if (typal) record('typal', typal);
    for (const key of generic) record(key, evaluatePlan(recipeFor(key), N, nonLand, commanders, util, profile));
    out.push(reads);
  }
  const maxQ = out.map((r) => r.filter((x) => x.selectable).reduce((m, x) => Math.max(m, x.Q), 0)).sort((a, b) => a - b);
  return { maxQ, reads: out };
}

function sUnder(reads: Read[][], sat: number): number[] {
  return reads
    .map((row) => {
      const pool = row.some((r) => r.selectable) ? row.filter((r) => r.selectable) : row;
      return 100 * pool.reduce((m, r) => Math.max(m, Math.max(0, Math.min(1, (r.Q - r.b) / (sat - r.b))) * r.R), 0);
    })
    .sort((a, b) => a - b);
}

// ── 1. the saturation table ───────────────────────────────────────────────

describe('stage 4c — per-profile S saturation', () => {
  it('freezes the Commander table it was cut from, and .70 IS its p80', () => {
    const t = SATURATION_TABLE.commander;
    expect(t.n).toBe(1838);
    // The shared spec constant sits inside the p75..p90 band of the deck
    // population it grades, at the 80.7th percentile — and Commander p80 is
    // .698, .002 away. That is why p80, not p90, is the percentile Brawl
    // inherits (§4: the percentile is transferred, never the anchor).
    expect(t.p80).toBeCloseTo(Q_SATURATION, 2);
    expect(Q_SATURATION).toBeGreaterThan(t.p75);
    expect(Q_SATURATION).toBeLessThan(t.p90);
    expect(COMMANDER_SATURATION_PERCENTILE).toBeGreaterThan(80);
    expect(COMMANDER_SATURATION_PERCENTILE).toBeLessThan(81);
  });

  it('freezes Q_SATURATION_BRAWL at p80 of the BRAWL distribution', () => {
    const t = SATURATION_TABLE.brawl;
    expect(t.n).toBe(1165);
    expect(Q_SATURATION_BRAWL).toBe(0.712);
    expect(Q_SATURATION_BRAWL).toBe(t.p80);
    // It must clear the stage-4b floor by more than the .025 that pinned every
    // Brawl deck at 100, and stay a saturation rather than a second floor.
    expect(Q_SATURATION_BRAWL).toBeGreaterThan(Q_BASELINE_JOINT_BRAWL);
    expect(Q_SATURATION_BRAWL - Q_BASELINE_JOINT_BRAWL).toBeGreaterThan(0.03);
    expect(Q_SATURATION_BRAWL).toBeLessThan(t.p90);
  });

  it('leaves the Commander constant untouched, enumerated over every format', () => {
    const formats: ScoreFormat[] = ['commander', 'brawl', 'competitivebrawl', 'standardbrawl', 'standard'];
    for (const format of formats) {
      const profile = profileOf(format);
      const expected = profile === 'brawl' ? Q_SATURATION_BRAWL : Q_SATURATION;
      expect(qSaturationFor(profile), format).toBe(expected);
    }
    // Commander and Standard keep the spec number; only Brawl moved.
    expect(qSaturationFor('commander')).toBe(0.70);
    expect(qSaturationFor('standard')).toBe(0.70);
    expect(qSaturationFor('brawl')).toBe(0.712);
    const profiles: ScoreProfile[] = ['commander', 'brawl', 'standard'];
    expect(new Set(profiles.map((p) => qSaturationFor(p))).size).toBe(2);
  });

  it('measures p80 of a prefix of each training stride within noise of the frozen table', () => {
    for (const profile of ['commander', 'brawl'] as const) {
      const { maxQ } = readStride(profile);
      expect(maxQ.length, profile).toBeGreaterThan(200);
      expect(pct(maxQ, 80), profile).toBeCloseTo(SATURATION_TABLE[profile].p80, 1);
    }
  }, 120_000);
});

// ── 2. what the saturation buys: S separates deck from deck ───────────────

describe('stage 4c — Brawl S spread', () => {
  it('unpins the Brawl deck population: under 25% at S = 100, spread >= 40', () => {
    const { reads } = readStride('brawl');
    const S = sUnder(reads, Q_SATURATION_BRAWL);
    const pinned = S.filter((x) => x >= 99.95).length;
    expect(pinned / S.length).toBeLessThan(0.25);
    expect(pct(S, 90) - pct(S, 10)).toBeGreaterThanOrEqual(40);
  }, 120_000);

  it('is strictly harsher than the shared .70 it replaces', () => {
    const { reads } = readStride('brawl');
    const under712 = sUnder(reads, Q_SATURATION_BRAWL);
    const under70 = sUnder(reads, Q_SATURATION);
    const pinned = (v: number[]): number => v.filter((x) => x >= 99.95).length;
    expect(pinned(under712)).toBeLessThan(pinned(under70));
    // A wider window can only lower S, never raise it, so no pile can leak.
    expect(pct(under712, 50)).toBeLessThanOrEqual(pct(under70, 50));
    expect(pct(under712, 90)).toBeLessThanOrEqual(pct(under70, 90));
  }, 120_000);

  it('drives S through planFit for the Brawl profile only', () => {
    const at = (Q: number, profile: ScoreProfile): number => {
      const b = qBaselineFor(profile, 'midrange');
      return 100 * Math.max(0, Math.min(1, (Q - b) / (qSaturationFor(profile) - b)));
    };
    // A Brawl list at exactly the frozen saturation saturates, one below it
    // does not — the property the .025 window destroyed.
    expect(at(Q_SATURATION_BRAWL, 'brawl')).toBe(100);
    expect(at(0.70, 'brawl')).toBeLessThan(100);
    expect(at(0.70, 'brawl')).toBeGreaterThan(50);
    // Commander is unmoved at the same Q.
    expect(at(0.70, 'commander')).toBe(100);
  });
});

// ── 3. the Brawl closing floor ────────────────────────────────────────────

describe('stage 4c — Brawl closing floor', () => {
  /** `closing-floor-brawl-holdout.txt`. The Brawl TRAINING cohort assembles
   * ZERO lines over 1,037 controls, so the statistic comes from the holdout,
   * exactly as the Commander one did. */
  const BRAWL_CLOSING = { trainingReads: 0, trainingPiles: 1037, holdoutReads: 106, holdoutPiles: 501, p95: 0.338 };

  it('is frozen at the holdout p95, above the Commander floor', () => {
    expect(BRAWL_CLOSING.trainingReads).toBe(0);
    expect(BRAWL_CLOSING.trainingPiles).toBeGreaterThan(1000);
    expect(BRAWL_CLOSING.holdoutReads).toBeGreaterThanOrEqual(30);
    expect(Q_BASELINE_CLOSING_BRAWL).toBe(0.338);
    expect(Q_BASELINE_CLOSING_BRAWL).toBe(BRAWL_CLOSING.p95);
    expect(Q_BASELINE_CLOSING_BRAWL).toBeGreaterThan(Q_BASELINE_CLOSING);
    // It is a closing floor, not a plan floor: still far under the joint one,
    // and far under the weakest reviewed cEDH closing Q (.600).
    expect(Q_BASELINE_CLOSING_BRAWL).toBeLessThan(Q_BASELINE_JOINT_BRAWL);
    expect(Q_BASELINE_CLOSING_BRAWL).toBeLessThan(0.6);
  });

  it('dispatches every plan floor by profile, combo included', () => {
    for (const recipe of PLAN_RECIPES) {
      expect(qBaselineFor('commander', recipe.key), recipe.key).toBe(Q_BASELINE_JOINT_COMMANDER);
      expect(qBaselineFor('brawl', recipe.key), recipe.key).toBe(Q_BASELINE_JOINT_BRAWL);
      expect(qBaselineFor('standard', recipe.key), recipe.key).toBe(Q_BASELINE);
    }
    expect(qBaselineFor('commander', 'combo')).toBe(Q_BASELINE_CLOSING);
    expect(qBaselineFor('brawl', 'combo')).toBe(Q_BASELINE_CLOSING_BRAWL);
    expect(qBaselineFor('standard', 'combo')).toBe(Q_BASELINE);
  });
});

// ── 4. tazri-upgraded-arena: typed, still out, and why ────────────────────

describe('stage 4c — tazri-upgraded-arena', () => {
  it('types the four multi-card shapes from its queue and leaves the rest', () => {
    // Each of these was `partial` in stage 4b and is covered by an atom that
    // fires on >= 3 corpus cards (Role cycle 10, Panharmonicon family 22,
    // "cast this way ... exile it instead" 7, spelled-out mana pips 13).
    for (const name of ['Charming Scoundrel', 'Gandalf the White', 'Bilbo, Thief in the Night', 'A-Vivi Ornitier']) {
      expect(catalogEntry(name)?.knowledge, name).toBe('known');
    }
    // The queue's one- and two-card shapes stay untyped ON PURPOSE: a rule
    // that fires on a single corpus card is a hand-written exception.
    for (const name of ['Twilight Diviner', "Zurgo, Thunder's Decree", 'Bloom Tender']) {
      // They ARE in the catalogue, as `partial` — not simply absent.
      expect(catalogEntry(name)?.knowledge === 'known', name).toBe(false);
    }
  });

  it('stays OUT of 45-65 because its party PAYOFFS, not its bodies, are the bound', () => {
    const fixture = loadDataset(0).fixtures.find((x) => x.name === 'tazri-upgraded-arena');
    if (!fixture) throw new Error('missing fixture tazri-upgraded-arena');
    const result = scoreDeck(fixture.input);
    const S = result.components.find((c) => c.key === 'synergy');
    expect(result.score).toBeLessThan(45);
    expect(S?.score).toBe(0);

    const entries: DeckEntry[] = fixture.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const nonLand = entries.filter((e) => !e.feature.isLand);
    const cmd: DeckEntry[] = fixture.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
    const N = entries.reduce((a, e) => a + e.quantity, 0);
    const plan = selectPlan(Math.max(1, N), nonLand, cmd, producerUtilisation(nonLand, cmd), 'brawl');
    expect(plan.recipe.key).toBe('typal');
    // `enabler` is servedBy payoff at 8:1, so covering four more party BODIES
    // cannot raise Q: the enabler credit is already pinned at 8 x payoff.
    const payoff = plan.roles.find((r) => r.role.key === 'payoff');
    const enabler = plan.roles.find((r) => r.role.key === 'enabler');
    expect(enabler?.role.servedBy).toEqual({ roles: ['payoff'], ratio: 8 });
    expect(enabler?.credited).toBe(8 * (payoff?.supply ?? 0));
    // And the plan is under the measured Brawl floor, so S is 0 by the FLOOR,
    // not by the saturation this stage moved.
    expect(plan.Q).toBeLessThan(Q_BASELINE_JOINT_BRAWL);
    expect(planFit(plan, 'brawl')).toBe(0);
  });
});

// ── 5. the version the wiring reads ───────────────────────────────────────

describe('stage 4c — score version', () => {
  it('bumps to the deployable candidate', () => {
    expect(SCORE_VERSION).toBe('1.3.0-rc2');
  });
});
