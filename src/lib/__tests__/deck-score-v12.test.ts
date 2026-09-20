/**
 * Deck Score v1.2 (docs/DECK_SCORE_SPEC.md §8) — the slice-A changes:
 * the multiplicative S formula, single-plan Q counting, generic plan
 * inference, renormalised meta-free weights, the evidence gate that replaced
 * the mechanical 69 cap, and the typed-effect catalogue seam.
 */
import { describe, it, expect } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, type DeckScoreInput } from '../deck-score';
import { WEIGHTS, weightsFor, Q_BASELINE, Q_SATURATION, type ScoreFormat } from '../deck-score-norms';
import { computeSynergy } from '../deck-score-synergy';
import { selectPlan, evaluatePlan, recipeFor, PLAN_RECIPES } from '../deck-score-plans';
import { catalogFacts, CATALOG_SIZE, oracleHash } from '../deck-score-catalog';
import { deriveCardFeature } from '../deck-score-features';
import type { DeckEntry } from '../deck-score-mana';

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v12-${idCounter}-${overrides.name}`,
    oracle_id: `v12-oracle-${idCounter}`,
    mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: null,
    colors: '["G"]', color_identity: '["G"]', keywords: '[]',
    set_code: 'tst', set_name: 'Test Set', collector_number: String(idCounter), rarity: 'common',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '2', toughness: '2', loyalty: null, produced_mana: null, edhrec_rank: null,
    layout: 'normal', updated_at: '2024-01-01', subtypes: null, arena_id: null,
    ...overrides,
  };
}

function forest(quantity = 1): { card: DbCard; quantity: number } {
  return { card: mkCard({ name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: null, cmc: 0, power: null, toughness: null, colors: null }), quantity };
}

function creatures(count: number, power: number, cmc: number, tag = 'Body'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${power}p ${i}`, type_line: 'Creature — Bear',
      mana_cost: cmc === 0 ? null : `{${cmc}}`, cmc,
      power: String(power), toughness: String(Math.max(1, power)),
    }),
    quantity: 1,
  }));
}

function removal(count: number, cmc: number, tag = 'Zap'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${cmc} ${i}`, type_line: 'Instant', oracle_text: 'Destroy target creature.',
      mana_cost: `{${cmc}}`, cmc, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function cantrips(count: number, cmc = 1, tag = 'Peek'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Sorcery', oracle_text: 'Draw a card.',
      mana_cost: `{${cmc}}`, cmc, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function burn(count: number, tag = 'Bolt'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Instant', oracle_text: 'This spell deals 3 damage to any target.',
      mana_cost: '{R}', cmc: 1, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function entriesOf(cards: Array<{ card: DbCard; quantity: number }>): DeckEntry[] {
  return cards.map((c) => ({ feature: deriveCardFeature(c.card), quantity: c.quantity }));
}

function standardDeck(main: Array<{ card: DbCard; quantity: number }>): DeckScoreInput {
  return { format: 'standard', main, commander: [], sideboard: [], unresolved: [], cardDataVersion: 'test-v12', corpus: null };
}

// ── S = 100 * clip((Q-.30)/(.70-.30)) * R * B ─────────────────────────────

describe('computeSynergy v1.2 — the multiplicative S formula', () => {
  it('is 0 when Q is at or below the .30 unstructured baseline', () => {
    const deck = entriesOf([...creatures(4, 3, 2, 'OnPlan'), ...creatures(36, 0, 9, 'Junk')]);
    const out = computeSynergy(null, 60, deck);
    expect(out.Q).toBeLessThanOrEqual(Q_BASELINE);
    expect(out.score).toBe(0);
  });

  it('is 0 when an essential role is missing, however high Q is (R=0)', () => {
    const deck = entriesOf(creatures(30, 3, 3, 'Beater'));
    const out = computeSynergy(null, 60, deck);
    expect(out.Q).toBeGreaterThan(Q_BASELINE);
    expect(out.R).toBe(0);
    expect(out.score).toBe(0);
  });

  it('equals 100*coherence*R*B and never exceeds 100 at saturation', () => {
    const deck = entriesOf([...creatures(14, 3, 3, 'Beater'), ...removal(10, 2), ...cantrips(10)]);
    const out = computeSynergy(null, 60, deck);
    expect(out.Q).toBeGreaterThanOrEqual(Q_SATURATION);
    expect(out.score).toBeCloseTo(100 * out.R * out.B, 6);
    expect(out.score).toBeLessThanOrEqual(100);
  });
});

// ── Q counts each copy once, toward one plan ──────────────────────────────

describe('evaluatePlan v1.2 — one copy, one role, one plan', () => {
  it('assigns a card that fills two roles to exactly one of them', () => {
    const dual = mkCard({
      name: 'Dual Role Bear', type_line: 'Creature — Bear',
      oracle_text: 'When this creature enters, draw a card.',
      mana_cost: '{1}{G}', cmc: 2, power: '3', toughness: '3',
    });
    const evaluation = evaluatePlan(recipeFor('midrange'), 60, entriesOf([{ card: dual, quantity: 4 }]));
    expect(evaluation.roles.reduce((s, r) => s + r.supply, 0)).toBe(4);
    expect(evaluation.Q).toBeLessThanOrEqual(1);
  });

  it('gives an unknown-mechanic copy no on-plan credit but keeps it in F', () => {
    const known = creatures(10, 3, 3, 'Known');
    const unknownCards = Array.from({ length: 10 }, (_, i) => ({
      card: mkCard({
        name: `Unknown ${i}`, type_line: 'Creature — Bear', mana_cost: '{2}{G}', cmc: 3,
        power: null, toughness: null,
        oracle_text: 'Some long rules text that no catalogue entry or regex identifies at all.',
      }),
      quantity: 1,
    }));
    const withUnknown = evaluatePlan(recipeFor('midrange'), 60, entriesOf([...known, ...unknownCards]));
    const withoutUnknown = evaluatePlan(recipeFor('midrange'), 60, entriesOf(known));
    expect(withUnknown.Q).toBeLessThan(withoutUnknown.Q);
    expect(withUnknown.roles.find((r) => r.role.key === 'threats')!.supply).toBe(10);
  });

  it('bounds infrastructure Q mass by the direct plan mass it serves', () => {
    const rocks = Array.from({ length: 20 }, (_, i) => ({
      card: mkCard({ name: `Rock ${i}`, type_line: 'Artifact', oracle_text: 'Add one mana of any color.', mana_cost: '{2}', cmc: 2, power: null, toughness: null }),
      quantity: 1,
    }));
    const fixing = evaluatePlan(recipeFor('midrange'), 60, entriesOf(rocks)).roles.find((r) => r.role.key === 'fixing')!;
    expect(fixing.supply).toBe(20);
    expect(fixing.credited).toBe(0);
  });
});

// ── Generic plan inference on a 60-card list ──────────────────────────────

describe('selectPlan v1.2 — inference from the whole deck', () => {
  it('reads a creature-and-burn list as aggro, not the midrange fallback', () => {
    const plan = selectPlan(60, entriesOf([...creatures(16, 2, 2, 'Goblin'), ...burn(8), ...cantrips(4)]));
    expect(plan.recipe.key).toBe('aggro');
  });

  it('scoreDeck no longer labels every commanderless Standard deck midrange', () => {
    const result = scoreDeck(standardDeck([forest(24), ...creatures(20, 2, 2, 'Rush'), ...burn(12), ...cantrips(4)]));
    const synergy = result.components.find((c) => c.key === 'synergy')!;
    expect(synergy.reason).toContain('aggro');
    expect(synergy.reason).not.toContain('midrange');
  });

  it('every recipe declares an essential role and an ordered band', () => {
    for (const recipe of PLAN_RECIPES) {
      expect(recipe.roles.some((r) => r.essential)).toBe(true);
      for (const role of recipe.roles) expect(role.max).toBeGreaterThanOrEqual(role.min);
    }
  });
});

// ── Renormalised, snapshot-independent weights ────────────────────────────

describe('v1.2 weights — meta at 0, core renormalised once per profile', () => {
  const formats: Array<[ScoreFormat, keyof typeof WEIGHTS]> = [
    ['commander', 'commander'], ['brawl', 'brawl'], ['standard', 'standard'],
  ];

  it.each(formats)('%s zeroes meta, divides by (1-w_meta), and still sums to 100', (format, profile) => {
    const w = weightsFor(format);
    expect(w.meta).toBe(0);
    expect(w.structure).toBe(0);
    const divisor = 1 - WEIGHTS[profile].meta / 100;
    expect(w.mana).toBeCloseTo(WEIGHTS[profile].mana / divisor, 9);
    expect(w.synergy).toBeCloseTo(WEIGHTS[profile].synergy / divisor, 9);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });

  it('does not change when a corpus snapshot is supplied or removed', () => {
    const main = [forest(24), ...creatures(20, 2, 2, 'Rush'), ...burn(12), ...cantrips(4)];
    const snapshot = { id: 'snap', asOf: '2026-09-20', format: 'standard' as const, cardsByContext: {}, archetypes: [] };
    const withSnapshot = scoreDeck({ ...standardDeck(main), corpus: snapshot });
    const without = scoreDeck(standardDeck(main));
    expect(withSnapshot.components.map((c) => c.weight)).toEqual(without.components.map((c) => c.weight));
  });
});

// ── The typed-effect catalogue seam ───────────────────────────────────────

describe('deck-score catalogue — a typed entry beats the regex fallback', () => {
  it('ships seed entries and hashes their reviewed oracle text', () => {
    expect(CATALOG_SIZE).toBeGreaterThan(0);
    expect(CATALOG_SIZE).toBeLessThanOrEqual(40);
    const facts = catalogFacts('Rhystic Study', 'Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.');
    expect(facts?.textMatches).toBe(true);
    expect(facts?.families.has('advantage')).toBe(true);
    expect(facts?.availability).toBe(0.5);
  });

  it('marks a catalogued card covered and supported where no regex identifies it', () => {
    const dramatic = deriveCardFeature(mkCard({
      name: 'Dramatic Reversal', type_line: 'Instant',
      oracle_text: 'Untap all nonland permanents you control.',
      mana_cost: '{1}{U}', cmc: 2, power: null, toughness: null,
    }));
    expect(dramatic.covered).toBe(true);
    expect(dramatic.s).toBe(1);
    expect(dramatic.isRamp).toBe(true);
  });

  it('falls back to the regex path when the live oracle text has drifted', () => {
    const drifted = deriveCardFeature(mkCard({
      name: 'Dramatic Reversal', type_line: 'Instant',
      oracle_text: 'Untap all nonland permanents you control. Then something new happened in errata.',
      mana_cost: '{1}{U}', cmc: 2, power: null, toughness: null,
    }));
    expect(drifted.covered).toBe(false);
    expect(oracleHash('a  b')).toBe(oracleHash('A B'));
  });
});

// ── The evidence gate ─────────────────────────────────────────────────────

describe('scoreDeck v1.2 — the evidence gate replaced the mechanical 69 cap', () => {
  it('reports typed coverage with no cap and marks the total provisional', () => {
    const result = scoreDeck(standardDeck([forest(24), ...creatures(20, 2, 2, 'Rush'), ...burn(12), ...cantrips(4)]));
    const coverage = result.gates.find((g) => g.key === 'coverage')!;
    expect(coverage.kind).toBe('evidence');
    expect(coverage.cap).toBeNull();
    expect(coverage.reason).toMatch(/typed in the effect catalogue/);
    expect(result.provisional).toBe(true);
    expect(result.gates.map((g) => g.cap)).not.toContain(69);
  });
});
