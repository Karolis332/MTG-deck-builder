/**
 * Deck Score v1.4 stage 3x — the control family's engine requirement is never
 * dropped (docs/DECK_SCORE_SPEC.md §10.8–§10.10, monotonicity).
 *
 * `controlRecipe` entered the engine pool only while it had members. When the
 * deck's other draw engines were finishers (excluded from the pool) or
 * unverified (s < 1), deleting the last non-finisher engine removed a factor
 * < 1 from the joint access and RAISED J: synthetic Commander list,
 * J .163 -> .957, u .107 -> .632. The family now takes the max over two fixed
 * row sets (separate engine + r finishers / a finisher-engine + r-1 others),
 * and an empty pool reads 0.
 */
import { describe, it, expect } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck } from '../deck-score';
import { computeWin, winDiagnostic, type WinTotals } from '../deck-score-win';
import { deriveCardFeature } from '../deck-score-features';
import { normsFor } from '../deck-score-norms';
import type { DeckEntry } from '../deck-score-mana';

let id = 0;
const card = (o: Partial<DbCard> & { name: string }): DbCard => ({
  id: `s3x-${++id}`, oracle_id: `s3x-o-${id}`, mana_cost: '{2}{U}', cmc: 3, type_line: 'Enchantment', oracle_text: null,
  colors: '["U"]', color_identity: '["U"]', keywords: '[]', set_code: 'tst', set_name: 'Test', collector_number: String(id),
  rarity: 'common', image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
  price_usd: null, price_usd_foil: null, legalities: '{"standard":"legal","commander":"legal"}', power: null, toughness: null,
  loyalty: null, produced_mana: null, edhrec_rank: null, layout: 'normal', updated_at: '2024-01-01', subtypes: null,
  arena_id: null, ...o,
});
const entry = (c: DbCard, quantity = 1, s = 1): DeckEntry =>
  ({ feature: { ...deriveCardFeature(c), covered: true, s }, quantity });

const UPKEEP = 'At the beginning of your upkeep, draw a card.';
const study = card({ name: 'Study Engine', oracle_text: UPKEEP });
const sphinx = card({ name: 'Engine Sphinx', type_line: 'Creature — Sphinx', mana_cost: '{4}{U}', cmc: 5,
  power: '6', toughness: '6', oracle_text: `Flying\n${UPKEEP}` });
const shaky = card({ name: 'Shaky Engine', oracle_text: UPKEEP });
const zaps = Array.from({ length: 10 }, (_, i) => card({ name: `Zap ${i}`, type_line: 'Instant', mana_cost: '{1}{U}',
  cmc: 2, oracle_text: 'Destroy target creature.' }));
const giants = Array.from({ length: 24 }, (_, i) => card({ name: `Giant ${i}`, type_line: 'Creature — Giant',
  mana_cost: '{3}{U}', cmc: 4, power: '7', toughness: '7' }));
const island = card({ name: 'Island', type_line: 'Basic Land — Island', mana_cost: null, cmc: 0, produced_mana: '["U"]' });

const core = (): DeckEntry[] => [...zaps.map((c) => entry(c)), ...giants.map((c) => entry(c)), entry(island, 36)];
const TOTALS: WinTotals = { E: 20, Estar: 10, D: 20, Dstar: 10, hasDrawEngine: true };
const NORMS = normsFor('commander');

function read(main: DeckEntry[]): { W: number; J: number } {
  const W = computeWin('commander', NORMS, 'control', 99, main, [], TOTALS).score;
  const line = winDiagnostic('commander', NORMS, 'control', 99, main, [], TOTALS)
    .split('\n').find((l) => l.startsWith('control schedule'));
  return { W, J: Number(/J=([\d.]+)/.exec(line ?? '')?.[1] ?? 0) };
}

describe('stage 3x — deleting the last non-finisher draw engine', () => {
  it.each([
    ['the other engine is a finisher', entry(sphinx)],
    ['the other engine is unverified (s < 1)', entry(shaky, 1, 0.5)],
  ])('does not raise W or control access when %s', (_label, other) => {
    const before = read([...core(), other, entry(study)]);
    const after = read([...core(), other]);
    expect(before.J).toBeGreaterThan(0);
    expect(after.J).toBeLessThanOrEqual(before.J + 1e-9);
    expect(after.W).toBeLessThanOrEqual(before.W + 1e-9);
  });

  // Arm B of the property scan: the blanked copies become unresolved slots, so N is fixed.
  it('does not raise the total on a full score (blank arm)', () => {
    const deck = (withStudy: boolean) => scoreDeck({
      format: 'standard', commander: [], sideboard: [], cardDataVersion: 'test-s3x', corpus: null,
      unresolved: withStudy ? [] : [{ name: 'Unreadable Card', quantity: 4, board: 'main' }],
      main: [
        { card: island, quantity: 24 }, { card: sphinx, quantity: 4 },
        ...zaps.slice(0, 8).map((c) => ({ card: c, quantity: 2 })),
        ...giants.slice(0, 4).map((c) => ({ card: c, quantity: 4 })),
        ...(withStudy ? [{ card: study, quantity: 4 }] : []),
      ],
    });
    const before = deck(true);
    const after = deck(false);
    expect(after.absoluteTotal).toBeLessThanOrEqual(before.absoluteTotal + 1e-9);
    expect(after.components.find((c) => c.key === 'win')?.score ?? 0)
      .toBeLessThanOrEqual((before.components.find((c) => c.key === 'win')?.score ?? 0) + 1e-9);
  });
});
