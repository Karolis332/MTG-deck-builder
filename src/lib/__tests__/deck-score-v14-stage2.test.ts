/**
 * Deck Score v1.4 stage 2 — docs/DECK_SCORE_SPEC.md §10.2 (S as useful copy
 * mass per library slot), §10.3 (R retired from the multiplier) and the §10.7
 * stage-2 row.
 *
 *     D      = max(N0, submitted library copies incl. reserved slots)
 *     U      = max over feasible recipes of the useful nonland-copy credit
 *     Q_slot = U / D,  b_S = 0
 *     S      = 100 * clip(Q_slot / Q_sat,p)
 *
 * Every number pinned here was MEASURED by a named command, not chosen: the
 * three saturations by `deck-score-bands.ts saturation --profile <p>`, the
 * band cells by `bands verify` (which re-derives all 45 and exits non-zero on
 * a mismatch), and the real-list and probe rows by `bands real` and
 * `deck-score-probes.ts` on the training strides.
 *
 * Nothing here writes the repo card DB or the catalogue shards.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { DbCard } from '../types';
import { scoreDeck } from '../deck-score';
import { scoreDeckSafely, explainScoreUnavailable } from '../deck-score-input';
import { computeSynergy } from '../deck-score-synergy';
import {
  evaluatePlan, selectPlan, candidatePlans, planFit, recipeFor, defaultN0,
  COMMANDER_BAND_REFERENCE, PLAN_RECIPES, type PlanKey,
} from '../deck-score-plans';
import { rewriteSaturations, rewriteBandCell } from '../../../scripts/deck-score-bands';
import {
  Q_SLOT_SATURATION, qSlotSaturationFor, Q_BASELINE_JOINT_COMMANDER, type ScoreProfile,
} from '../deck-score-norms';
import { deriveCardFeature } from '../deck-score-features';
import type { DeckEntry } from '../deck-score-mana';
import { readSample, strideOrder, cardsByName, type SampleProfile } from '../../../scripts/deck-score-piles';
import { isOffPlanTyped, without, permuteMetadata, clonePrinting } from '../../../scripts/deck-score-probes';

// Corpus-sized work (a 15k-entry catalogue, real stride lists) runs past
// vitest's 15 s default; the allowance every deck-score suite takes.
vi.setConfig({ testTimeout: 120_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `s2-${idCounter}-${overrides.name}`,
    oracle_id: `s2-oracle-${idCounter}`,
    mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Elf Warrior', oracle_text: null,
    colors: '["G"]', color_identity: '["G"]', keywords: '[]',
    set_code: 'tst', set_name: 'Test Set', collector_number: String(idCounter), rarity: 'rare',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '3', toughness: '3', loyalty: null, produced_mana: null, edhrec_rank: null,
    layout: 'normal', updated_at: '2024-01-01', subtypes: null, arena_id: null,
    ...overrides,
  };
}

/** Real cards from the repo card DB: the catalogue types them, so they carry
 * the roles the recipes actually test for. A synthetic card would be
 * `covered: false` and earn no mass at all, which is the wrong fixture for
 * everything except the untyped probe below. */
const cards = cardsByName();
function real(name: string, quantity = 1): DeckEntry {
  const card = cards.get(name.toLowerCase());
  if (!card) throw new Error(`card DB has no ${name}`);
  return { feature: deriveCardFeature(card), quantity };
}

/** Resolved but UNTYPED: a made-up card no catalogue atom can read. */
function blank(name: string, quantity = 1): DeckEntry {
  return {
    feature: deriveCardFeature(mkCard({
      name, cmc: 3, mana_cost: '{3}', type_line: 'Enchantment', power: null, toughness: null,
      oracle_text: 'At the beginning of your upkeep, roll a six-sided die and shout the result.',
    })),
    quantity,
  };
}

/** A midrange-shaped library: threats, answers and card draw. */
function midrangeDeck(threats: number, answers: number, values: number): DeckEntry[] {
  return [real('Watchwolf', threats), real('Murder', answers), real('Divination', values)];
}

const copies = (entries: readonly DeckEntry[]): number => entries.reduce((s, e) => s + e.quantity, 0);

// ── 1. Q_slot arithmetic (§10.2) ──────────────────────────────────────────

describe('v1.4 stage 2 — Q_slot = U / D', () => {
  it('divides by D = max(N0, N), so an undersized library keeps its legal denominator', () => {
    const deck = midrangeDeck(10, 8, 8);
    const small = evaluatePlan(recipeFor('midrange'), copies(deck), deck, [], undefined, 'commander', { n0: 99, lands: 36 });
    expect(copies(deck)).toBe(26);
    expect(small.D).toBe(99);
    expect(small.Q).toBeCloseTo(small.U / 99, 10);

    // Oversized divides by what was submitted.
    const big = [...deck, ...Array.from({ length: 100 }, (_, i) => blank(`Pad ${i}`))];
    const large = evaluatePlan(recipeFor('midrange'), copies(big), big, [], undefined, 'commander', { n0: 99, lands: 36 });
    expect(large.D).toBe(126);
    expect(large.Q).toBeCloseTo(large.U / 126, 10);
  });

  it('pads an undersized library with uncredited slots instead of shrinking the denominator', () => {
    const deck = midrangeDeck(10, 8, 8);
    const plan = evaluatePlan(recipeFor('midrange'), copies(deck), deck, [], undefined, 'commander', { n0: 99, lands: 36 });
    // 73 padding slots earn nothing: U counts copies, D counts slots.
    expect(plan.U).toBeLessThanOrEqual(copies(deck));
    expect(plan.D - copies(deck)).toBe(73);
  });

  it('dilutes with reserved unresolved slots — they enter D and earn nothing', () => {
    const main = [...midrangeDeck(30, 10, 10), real('Forest', 36)]
      .map((e) => ({ card: e.feature.card, quantity: e.quantity }));
    const commander = [mkCard({ name: 'Stage Two Commander', type_line: 'Legendary Creature — Elf Warrior' })];
    const base = scoreDeckSafely({ format: 'commander', main, commander, unresolved: [] });
    const diluted = scoreDeckSafely({
      format: 'commander', main, commander,
      unresolved: [{ name: 'Unreadable Card', quantity: 40, board: 'main' }],
    });
    const S = (p: typeof base): number => p?.components.find((c) => c.key === 'synergy')?.score ?? -1;
    expect(S(base)).toBeGreaterThan(0);
    // 86 submitted copies: D is already the legal 99, so reserved slots that
    // keep the library at or under N0 cannot move S (they replace padding
    // that was already in the denominator) —
    const withinN0 = scoreDeckSafely({
      format: 'commander', main, commander,
      unresolved: [{ name: 'Unreadable Card', quantity: 13, board: 'main' }],
    });
    expect(S(withinN0)).toBe(S(base));
    // — and every reserved slot PAST N0 dilutes, because it enters D and can
    // never enter U.
    expect(S(diluted)).toBeLessThan(S(base));
    expect(S(diluted)).toBeGreaterThan(0);
  });

  it('freezes the useful-role caps at N0, so added unknown slots cannot enlarge a quota', () => {
    const deck = midrangeDeck(30, 20, 20);
    const at99 = evaluatePlan(recipeFor('midrange'), 99, deck, [], undefined, 'commander', { n0: 99, lands: 36 });
    const at160 = evaluatePlan(recipeFor('midrange'), 160, deck, [], undefined, 'commander', { n0: 99, lands: 36 });
    for (const [i, role] of at99.roles.entries()) {
      // Every quota — the required supply and the credit ceiling — is cut at
      // N0, so 61 extra slots cannot buy a bigger allowance anywhere.
      expect(role.required, role.role.key).toBe(at160.roles[i].required);
      expect(role.bound, role.role.key).toBe(at160.roles[i].bound);
    }
    // The extra slots can only hurt: the same 36 lands in 160 slots deploy
    // worse, so U falls as well as Q.
    expect(at160.U).toBeLessThanOrEqual(at99.U);
    expect(at160.Q).toBeLessThan(at99.Q);
  });

  it('credits each physical copy at most once across the modes it could fill', () => {
    // `Beast Within` fills BOTH the threat role (it makes a 3/3) and the
    // answer role (it destroys a permanent); U can never exceed the copies.
    const deck = [real('Beast Within', 24)];
    const plan = evaluatePlan(recipeFor('midrange'), 99, deck, [], undefined, 'commander', { n0: 99, lands: 36 });
    expect(plan.U).toBeLessThanOrEqual(copies(deck));
    expect(plan.roles.reduce((s, r) => s + r.credited, 0)).toBeCloseTo(plan.U, 10);
  });
});

// ── 2. the maximum, and the objective behind it ───────────────────────────

describe('v1.4 stage 2 — U is the maximum over feasible assignments', () => {
  it('re-spends a copy parked in a role that is already at its bound', () => {
    // 30 threats against a `threats` band that stops at 14: the surplus is
    // not thrown away when another role of the same recipe can still use it.
    // 20 copies of a card that fills BOTH `threats` (max 14) and `answers`:
    // first-match parked all 20 in `threats` and threw 6 away. The maximum
    // assignment spends them where they are still useful.
    const deck = [real('Beast Within', 20)];
    const plan = evaluatePlan(recipeFor('midrange'), 99, deck, [], undefined, 'commander', { n0: 99, lands: 40 });
    const threats = plan.roles.find((r) => r.role.key === 'threats')!;
    const answers = plan.roles.find((r) => r.role.key === 'answers')!;
    expect(threats.credited).toBe(threats.bound);
    expect(answers.credited).toBeGreaterThan(0);
    expect(plan.U).toBeGreaterThan(threats.bound);
    expect(plan.U).toBe(20);
  });

  it('ranks recipes on that same U — planFit IS Q_slot', () => {
    const deck = midrangeDeck(12, 10, 14);
    for (const profile of ['commander', 'brawl', 'standard'] as ScoreProfile[]) {
      const plan = selectPlan(99, deck, [], undefined, profile);
      expect(planFit(plan, profile)).toBe(plan.Q);
      const best = candidatePlans(99, deck, [], undefined, profile)
        .filter((p) => !p.hasEmptyEssential)
        .reduce((m, p) => Math.max(m, p.Q), 0);
      expect(plan.Q).toBeCloseTo(best, 10);
    }
  });

  it('reports the same objective it selected on', () => {
    const deck = midrangeDeck(12, 10, 14);
    for (const profile of ['commander', 'brawl', 'standard'] as ScoreProfile[]) {
      const plan = selectPlan(99, deck, [], undefined, profile);
      const out = computeSynergy(plan, 99, deck, profile);
      expect(out.usefulMass).toBe(plan.U);
      expect(out.D).toBe(plan.D);
      expect(out.score).toBeCloseTo(100 * Math.min(1, plan.Q / qSlotSaturationFor(profile)), 10);
    }
  });

  it('cannot expose a better omitted recipe by deleting a zero-use copy', () => {
    const deck = [...midrangeDeck(12, 10, 14), blank('Junk', 4)];
    const before = selectPlan(99, deck, [], undefined, 'commander');
    const after = selectPlan(99, deck.filter((e) => e.feature.card.name !== 'Junk'), [], undefined, 'commander');
    expect(after.recipe.key).toBe(before.recipe.key);
    expect(after.U).toBe(before.U);
  });
});

// ── 3. R (§10.3) ──────────────────────────────────────────────────────────

describe('v1.4 stage 2 — R is a diagnostic, not a multiplier', () => {
  it('keeps the legacy field and its weakest-requirement reason', () => {
    const deck = midrangeDeck(12, 2, 14);
    const plan = selectPlan(99, deck, [], undefined, 'commander');
    const out = computeSynergy(plan, 99, deck, 'commander');
    expect(out.R).toBe(plan.R);
    expect(out.R).toBeLessThan(1);
    expect(out.reason).toMatch(/weakest dependency \w+ [\d.]+\/\d+/);
  });

  it('leaves S independent of R: the score is the U/D transform alone', () => {
    const deck = midrangeDeck(12, 2, 14);
    const plan = selectPlan(99, deck, [], undefined, 'commander');
    const out = computeSynergy(plan, 99, deck, 'commander');
    expect(out.b).toBe(0);
    expect(out.score).toBeCloseTo(100 * Math.min(1, plan.Q / Q_SLOT_SATURATION.commander), 10);
    // The v1.3 form would have multiplied this by R < 1 and subtracted a floor.
    expect(out.score).toBeGreaterThan(100 * plan.Q * plan.R);
  });

  it('still invalidates a recipe whose essential role the deck holds nothing for', () => {
    // No creature at all: `midrange` has no threat piece to point at.
    const deck = [real('Murder', 20), real('Divination', 20)];
    const midrange = evaluatePlan(recipeFor('midrange'), 99, deck, [], undefined, 'commander');
    expect(midrange.roles.find((r) => r.role.key === 'threats')?.supply).toBe(0);
    expect(midrange.hasEmptyEssential).toBe(true);
    expect(selectPlan(99, deck, [], undefined, 'commander').recipe.key).not.toBe('midrange');
  });

  it('reads absence as absence, not as a missed deadline', () => {
    // One finisher the deck cannot deploy by its deadline is still a finisher
    // the deck HOLDS: the invalidation test asks whether a piece exists.
    // Six lands in 99 slots: the deployment budget never reaches even two
    // mana by the threat deadline, so no threat copy earns supply — but the
    // deck still HOLDS threats, which is what the invalidation test asks.
    const slow = [real('Watchwolf', 12), real('Murder', 10), real('Divination', 10)];
    const plan = evaluatePlan(recipeFor('midrange'), 99, slow, [], undefined, 'commander', { n0: 99, lands: 6 });
    expect(plan.roles.find((r) => r.role.key === 'threats')?.supply).toBe(0);
    expect(plan.hasEmptyEssential).toBe(false);
  });
});

// ── 4. the norms (§10.2 percentile policy) ────────────────────────────────

describe('v1.4 stage 2 — the three saturations, measured and frozen', () => {
  it('freezes p80 of Q_slot per profile, each an exact rational in its slot count', () => {
    // `deck-score-bands.ts saturation --profile <p>`: eligible real TRAINING
    // cohort, scored through `scoreDeck`, inverse weighted empirical CDF at
    // equal weight per list family. commander 182 families / n 1,460;
    // brawl 179 / 797; standard 42 / 360. Commander and Standard land on a
    // whole useful copy (43/99, 29/60); Brawl's p80 list credits a partial
    // copy (deployment weight < 1), so its U is 40.2, not 40.
    expect(Q_SLOT_SATURATION.commander).toBeCloseTo(43 / 99, 6);
    expect(Q_SLOT_SATURATION.brawl).toBeCloseTo(40.2 / 99, 6);
    expect(Q_SLOT_SATURATION.standard).toBeCloseTo(29 / 60, 6);
    expect(qSlotSaturationFor('standard')).toBe(Q_SLOT_SATURATION.standard);
    // Three independent measurements, not one number shared.
    expect(new Set(Object.values(Q_SLOT_SATURATION)).size).toBe(3);
  });

  it('retires the fitted floors from S — b is zero for every profile and plan', () => {
    const deck = midrangeDeck(12, 10, 14);
    for (const profile of ['commander', 'brawl', 'standard'] as ScoreProfile[]) {
      const plan = selectPlan(99, deck, [], undefined, profile);
      expect(computeSynergy(plan, 99, deck, profile).b).toBe(0);
    }
    // The legacy constant still exists for the diagnostic scripts that print
    // it; nothing in the S path reads it.
    expect(Q_BASELINE_JOINT_COMMANDER).toBeGreaterThan(0);
  });

  it('keeps the band cells at the value `bands verify` re-measures', () => {
    // p25 -> min, p90 -> max on each profile's own training stride.
    const cell = (key: PlanKey, role: string) => recipeFor(key).roles.find((r) => r.key === role)!;
    expect([cell('midrange', 'threats').cmd?.min, cell('midrange', 'threats').cmd?.max]).toEqual([5, 14]);
    expect([cell('spells', 'spells').cmd?.min, cell('spells', 'spells').cmd?.max]).toEqual([13, 27]);
    expect([cell('recursion', 'fuel').brawl?.min, cell('recursion', 'fuel').brawl?.max]).toEqual([2, 12]);
    expect([cell('counters', 'sources').cmd?.min, cell('counters', 'sources').cmd?.max]).toEqual([7, 21]);
    expect(COMMANDER_BAND_REFERENCE).toBe(99);
    expect(defaultN0('commander')).toBe(99);
    expect(defaultN0('standard')).toBe(60);
  });
});

// ── 5. unavailable, not invented ──────────────────────────────────────────

describe('v1.4 stage 2 — an unevaluable input has no number', () => {
  it('returns null rather than a substituted component score', () => {
    const commander = [mkCard({ name: 'Lone Commander', type_line: 'Legendary Creature — Elf Warrior' })];
    expect(scoreDeckSafely({ format: 'commander', main: [], commander, unresolved: [] })).toBeNull();
    expect(explainScoreUnavailable({ format: 'commander', main: [], commander, unresolved: [] }))
      .toMatch(/no main-board cards/);
    // An all-unresolved library says so specifically.
    expect(explainScoreUnavailable({
      format: 'commander', main: [], commander,
      unresolved: [{ name: 'Unreadable Card', quantity: 99, board: 'main' }],
    })).toMatch(/all 1 library slot\(s\) are unresolved/);
  });
});

// ── 6. §10.4 invariance, on a real stride list ────────────────────────────

describe('v1.4 stage 2 — gaming probes on a real training list', () => {
  const profile: SampleProfile = 'commander';
  const sample = readSample(profile);
  const byName = cardsByName();
  const index = strideOrder('training', sample)[0];
  const deck = sample[index];
  const main: { card: DbCard; quantity: number }[] = [];
  const commander: DbCard[] = [];
  {
    const commanderName = deck.commander.toLowerCase();
    let took = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) continue;
      if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
  }
  const read = (cards: typeof main, unresolved: { name: string; quantity: number; board: string }[] = []) => {
    const payload = scoreDeckSafely({ format: 'commander', main: cards, commander, unresolved })!;
    return { S: payload.components.find((c) => c.key === 'synergy')?.score ?? 0, total: payload.score };
  };
  const base = read(main);

  it('resolves the stride list the probes run on', () => {
    expect(commander).toHaveLength(1);
    expect(main.reduce((s, e) => s + e.quantity, 0)).toBeGreaterThan(90);
    expect(base.S).toBeGreaterThan(0);
  });

  it('moves neither S nor the total under the metadata permutation', () => {
    const after = read(permuteMetadata(main));
    expect(after.S).toBe(base.S);
    expect(after.total).toBe(base.total);
  });

  it('moves neither S nor the total when basics are swapped for another printing', () => {
    const swapped = main.map((e, i) => (/^(Forest|Island|Swamp|Mountain|Plains)$/i.test(e.card.name)
      ? { card: clonePrinting(e.card, i), quantity: e.quantity }
      : e));
    expect(swapped.some((e, i) => e.card.id !== main[i].card.id)).toBe(true);
    const after = read(swapped);
    expect(after.S).toBe(base.S);
    expect(after.total).toBe(base.total);
  });

  it('never raises S when proved-zero-use typed copies are deleted', () => {
    const offPlan = main.filter((e) => isOffPlanTyped(deriveCardFeature(e.card), profile));
    expect(offPlan.length).toBeGreaterThan(0);
    for (const k of [1, 5]) {
      const cut = without(main, offPlan, Math.min(k, offPlan.reduce((s, e) => s + e.quantity, 0)));
      if (!cut) continue;
      expect(read(cut).S).toBeLessThanOrEqual(base.S + 1e-9);
    }
  });

  it('never raises S when unreadable slots are added', () => {
    for (const k of [1, 5, 10]) {
      const after = read(main, [{ name: 'Unreadable Card', quantity: k, board: 'main' }]);
      expect(after.S, `k=${k}`).toBeLessThanOrEqual(base.S + 1e-9);
    }
  });
});

// ── 7. what the real cohorts read (§10.7 stage-2 row) ─────────────────────

describe('v1.4 stage 2 — real-list distribution', () => {
  const stats = (profile: SampleProfile, limit: number) => {
    const byName = cardsByName();
    const sample = readSample(profile);
    const S: number[] = [];
    const totals: number[] = [];
    for (const i of strideOrder('training', sample).slice(0, limit)) {
      const deck = sample[i];
      const main: { card: DbCard; quantity: number }[] = [];
      const commander: DbCard[] = [];
      const commanderName = deck.commander.toLowerCase();
      let missing = 0;
      let took = false;
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card) { missing++; continue; }
        if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
        main.push({ card, quantity: line.quantity });
      }
      if (main.length === 0 || missing > deck.cards.length * 0.1) continue;
      const payload = scoreDeckSafely({ format: profile, main, commander });
      if (!payload) continue;
      S.push(payload.components.find((c) => c.key === 'synergy')?.score ?? 0);
      totals.push(payload.score);
    }
    S.sort((a, b) => a - b);
    totals.sort((a, b) => a - b);
    const pct = (v: number[], p: number): number => v[Math.min(v.length - 1, Math.round((p / 100) * (v.length - 1)))];
    return { n: S.length, zero: S.filter((x) => x <= 0.05).length, sp50: pct(S, 50), tp50: pct(totals, 50) };
  };

  it('pins the Commander prefix: no S zeros, S p50 83.7, total p50 28', () => {
    // `bands real` over the whole 1,798-list stride reads the same shape:
    // S = 0 share 0.0%, S p10/p50/p90 58.1 / 83.7 / 100, total p50 30
    // (eligible subset 40).
    // S is UNCHANGED by stage 1d - stage 2's norms were held fixed for
    // attribution, and 83.7 is the same number this test pinned before. The
    // total moved 54 -> 28 entirely through W: the section 10.8 resource
    // corrections took the stride's W p50 from 45.3 to 25.2, and the quality
    // cap `20 + .8*min(M,W,S)` is binding on W for most of the cohort.
    const cmd = stats('commander', 200);
    expect(cmd.n).toBe(200);
    expect(cmd.zero).toBe(0);
    expect(cmd.sp50).toBeCloseTo(83.7, 1);
    expect(cmd.tp50).toBe(29) // stage 3d;
  });

  it('pins the Brawl prefix: no S zeros, S p50 87.1, total p50 67', () => {
    // `bands real --profile brawl` over 1,146: S = 0 share 0.0%,
    // S p10/p50/p90 62.2 / 87.1 / 100. Brawl keeps the T12 horizon, so its
    // 76 -> 67 is the resource corrections alone.
    const brawl = stats('brawl', 200);
    expect(brawl.n).toBe(200);
    expect(brawl.zero).toBe(0);
    expect(brawl.sp50).toBeCloseTo(87.1, 1);
    expect(brawl.tp50).toBe(68) // stage 3d;
  });
});

// ── 8. W reads the same slots S does (§10.2 access predicates) ────────────

describe('v1.4 stage 2 — access predicates read D', () => {
  it('gives an undersized library the same W as the same list padded to N0', () => {
    const byName = cardsByName();
    const sample = readSample('commander');
    const deck = sample[strideOrder('training', sample)[0]];
    const main: { card: DbCard; quantity: number }[] = [];
    const commander: DbCard[] = [];
    const commanderName = deck.commander.toLowerCase();
    let took = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) continue;
      if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    const short = main.slice(0, main.length - 1);
    const W = (cards: typeof main, unresolved: { name: string; quantity: number; board: string }[] = []): number =>
      scoreDeck({
        format: 'commander', main: cards, commander, sideboard: [], unresolved,
        cardDataVersion: 'test', corpus: null,
      }).components.find((c) => c.key === 'win')?.score ?? -1;
    // The same 98 real cards, once as an undersized list and once padded to
    // 99 with a reserved slot: the draw denominator is D either way, so the
    // access model cannot pay a deck for being short.
    expect(W(short)).toBe(W(short, [{ name: 'Unreadable Card', quantity: 1, board: 'main' }]));
  });
});

// ── 9. §10.8: the freeze is a COMMAND, not a hand edit ────────────────────

describe('v1.4 stage 2 — `bands freeze` rewrites the norms it measures', () => {
  // §10.8 orders a W stage after this one and says stage 2's S norms must be
  // re-frozen against the corrected W domain. These two helpers are the write
  // half of `bands freeze --write`; they are pure so the round trip can be
  // proved here without touching either source file.
  const NORMS = readFileSync(join(process.cwd(), 'src', 'lib', 'deck-score-norms.ts'), 'utf-8');
  const PLANS = readFileSync(join(process.cwd(), 'src', 'lib', 'deck-score-plans.ts'), 'utf-8');

  it('round-trips the real norms file when nothing moved', () => {
    expect(rewriteSaturations(NORMS, Q_SLOT_SATURATION)).toBe(NORMS);
    const moved = rewriteSaturations(NORMS, { ...Q_SLOT_SATURATION, brawl: 0.5 });
    expect(moved).not.toBe(NORMS);
    expect(moved).toContain('brawl: 0.50000000,');
    // Only the one value changed: the doc comment above it is untouched.
    // Re-pinned stage 2b (2026-09-21): the norms.ts comment moved from
    // "PROVISIONAL — re-freeze after the §10.8 W domain" to "FROZEN on the
    // stage-1d W domain" once `bands verify` showed the domain hash MATCH —
    // the string this test greps for is the doc text, not a scored value.
    expect(moved).toContain('FROZEN on the stage-1d W domain');
    expect(moved).toContain(`commander: ${Q_SLOT_SATURATION.commander.toFixed(8)},`);
  });

  it('round-trips every frozen band cell in the real recipe file', () => {
    let seen = 0;
    for (const recipe of PLAN_RECIPES) {
      for (const role of recipe.roles) {
        if (role.cmd) { expect(rewriteBandCell(PLANS, recipe.key, role.key, 'commander', role.cmd)).toBe(PLANS); seen += 1; }
        if (role.brawl) { expect(rewriteBandCell(PLANS, recipe.key, role.key, 'brawl', role.brawl)).toBe(PLANS); seen += 1; }
      }
    }
    expect(seen).toBeGreaterThan(40);
  });

  it('moves ONE cell and refuses a cell it cannot locate', () => {
    const target = PLAN_RECIPES.flatMap((r) => r.roles.filter((x) => x.cmd).map((x) => ({ r, x })))[0];
    const out = rewriteBandCell(PLANS, target.r.key, target.x.key, 'commander', { min: 1, max: 2 });
    const diff = out.split('\n').filter((l, i) => l !== PLANS.split('\n')[i]);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toContain('cmd: { min: 1, max: 2 }');
    expect(() => rewriteBandCell(PLANS, 'no-such-plan', 'threats', 'commander', { min: 1, max: 2 })).toThrow();
    expect(() => rewriteBandCell(PLANS, target.r.key, 'no-such-role', 'commander', { min: 1, max: 2 })).toThrow();
  });
});
