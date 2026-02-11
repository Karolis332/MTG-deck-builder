import { describe, it, expect } from 'vitest';
import { analyzeMulligan, type DeckInfo } from '../mulligan-advisor';
import type { ResolvedCard } from '../game-state-engine';

// Helper to build a card map from grpId → partial card data
function buildCardMap(cards: Array<[number, Partial<ResolvedCard>]>) {
  const map = new Map<number, ResolvedCard>();
  for (const [grpId, partial] of cards) {
    map.set(grpId, {
      grpId,
      name: partial.name ?? `Card ${grpId}`,
      manaCost: partial.manaCost ?? null,
      cmc: partial.cmc ?? 0,
      typeLine: partial.typeLine ?? null,
      oracleText: partial.oracleText ?? null,
      imageUriSmall: null,
      imageUriNormal: null,
    });
  }
  return { get: (id: number) => map.get(id) ?? null };
}

const defaultDeckInfo: DeckInfo = {
  totalCards: 60,
  landCount: 24,
  avgCmc: 3.0,
  colors: ['W', 'U'],
};

describe('analyzeMulligan', () => {
  it('should KEEP a 7-card hand with 3 lands and good curve', () => {
    const hand = [1, 2, 3, 4, 5, 6, 7];
    const cardMap = buildCardMap([
      [1, { name: 'Plains', typeLine: 'Basic Land — Plains', cmc: 0, oracleText: '{T}: Add {W}' }],
      [2, { name: 'Island', typeLine: 'Basic Land — Island', cmc: 0, oracleText: '{T}: Add {U}' }],
      [3, { name: 'Hallowed Fountain', typeLine: 'Land — Plains Island', cmc: 0, oracleText: '{T}: Add {W} or {U}' }],
      [4, { name: 'Soldier', typeLine: 'Creature', cmc: 1, manaCost: '{W}' }],
      [5, { name: 'Counterspell', typeLine: 'Instant', cmc: 2, manaCost: '{U}{U}', oracleText: 'Counter target spell.' }],
      [6, { name: 'Knight', typeLine: 'Creature', cmc: 3, manaCost: '{2}{W}' }],
      [7, { name: 'Divination', typeLine: 'Sorcery', cmc: 3, manaCost: '{2}{U}', oracleText: 'Draw two cards.' }],
    ]);

    const advice = analyzeMulligan(hand, defaultDeckInfo, 'standard', 'midrange', cardMap, 0);
    expect(advice.recommendation).toBe('keep');
    expect(advice.score).toBeGreaterThanOrEqual(50);
  });

  it('should MULLIGAN a 7-card hand with 0 lands', () => {
    const hand = [1, 2, 3, 4, 5, 6, 7];
    const cardMap = buildCardMap([
      [1, { name: 'Creature A', typeLine: 'Creature', cmc: 1, manaCost: '{W}' }],
      [2, { name: 'Creature B', typeLine: 'Creature', cmc: 2, manaCost: '{1}{U}' }],
      [3, { name: 'Creature C', typeLine: 'Creature', cmc: 2, manaCost: '{1}{W}' }],
      [4, { name: 'Creature D', typeLine: 'Creature', cmc: 3, manaCost: '{2}{U}' }],
      [5, { name: 'Creature E', typeLine: 'Creature', cmc: 3, manaCost: '{2}{W}' }],
      [6, { name: 'Spell A', typeLine: 'Instant', cmc: 4, manaCost: '{3}{U}' }],
      [7, { name: 'Spell B', typeLine: 'Sorcery', cmc: 5, manaCost: '{4}{W}' }],
    ]);

    const advice = analyzeMulligan(hand, defaultDeckInfo, 'standard', null, cardMap, 0);
    expect(advice.recommendation).toBe('mulligan');
    expect(advice.handAnalysis.landCount).toBe(0);
  });

  it('should MULLIGAN a 7-card hand with 6 lands', () => {
    const hand = [1, 2, 3, 4, 5, 6, 7];
    const cardMap = buildCardMap([
      [1, { name: 'Plains', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [2, { name: 'Island', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {U}' }],
      [3, { name: 'Plains 2', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [4, { name: 'Island 2', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {U}' }],
      [5, { name: 'Plains 3', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [6, { name: 'Island 3', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {U}' }],
      [7, { name: 'Creature', typeLine: 'Creature', cmc: 5, manaCost: '{4}{W}' }],
    ]);

    const advice = analyzeMulligan(hand, defaultDeckInfo, 'standard', null, cardMap, 0);
    expect(advice.recommendation).toBe('mulligan');
    expect(advice.handAnalysis.landCount).toBe(6);
  });

  it('should KEEP a 5-card hand with 2 lands', () => {
    const hand = [1, 2, 3, 4, 5];
    const cardMap = buildCardMap([
      [1, { name: 'Plains', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [2, { name: 'Island', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {U}' }],
      [3, { name: 'Creature A', typeLine: 'Creature', cmc: 2, manaCost: '{1}{W}' }],
      [4, { name: 'Creature B', typeLine: 'Creature', cmc: 3, manaCost: '{2}{U}' }],
      [5, { name: 'Spell', typeLine: 'Instant', cmc: 4, manaCost: '{3}{W}' }],
    ]);

    const advice = analyzeMulligan(hand, defaultDeckInfo, 'standard', null, cardMap, 2);
    expect(advice.recommendation).toBe('keep');
  });

  it('should KEEP a 4-card hand regardless', () => {
    const hand = [1, 2, 3, 4];
    const cardMap = buildCardMap([
      [1, { name: 'Spell A', typeLine: 'Sorcery', cmc: 5, manaCost: '{4}{W}' }],
      [2, { name: 'Spell B', typeLine: 'Sorcery', cmc: 6, manaCost: '{5}{U}' }],
      [3, { name: 'Spell C', typeLine: 'Sorcery', cmc: 7, manaCost: '{6}{W}' }],
      [4, { name: 'Plains', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
    ]);

    const advice = analyzeMulligan(hand, defaultDeckInfo, 'standard', null, cardMap, 3);
    expect(advice.recommendation).toBe('keep');
  });

  it('should penalize aggro hand with no turn 1 play', () => {
    const hand = [1, 2, 3, 4, 5, 6, 7];
    const cardMap = buildCardMap([
      [1, { name: 'Plains', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [2, { name: 'Mountain', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {R}' }],
      [3, { name: 'Plains 2', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [4, { name: 'Creature 3cmc', typeLine: 'Creature', cmc: 3, manaCost: '{2}{W}' }],
      [5, { name: 'Creature 3cmc2', typeLine: 'Creature', cmc: 3, manaCost: '{2}{R}' }],
      [6, { name: 'Creature 4cmc', typeLine: 'Creature', cmc: 4, manaCost: '{3}{W}' }],
      [7, { name: 'Creature 5cmc', typeLine: 'Creature', cmc: 5, manaCost: '{4}{R}' }],
    ]);

    const aggroAdvice = analyzeMulligan(hand, { ...defaultDeckInfo, colors: ['W', 'R'] }, 'standard', 'aggro', cardMap, 0);
    const controlAdvice = analyzeMulligan(hand, { ...defaultDeckInfo, colors: ['W', 'R'] }, 'standard', 'control', cardMap, 0);

    // Aggro should score lower than control for the same no-T1-play hand
    expect(aggroAdvice.score).toBeLessThan(controlAdvice.score);
  });

  it('should give bonus for ramp/draw/removal presence', () => {
    const hand = [1, 2, 3, 4, 5, 6, 7];
    const withUtility = buildCardMap([
      [1, { name: 'Plains', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [2, { name: 'Forest', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {G}' }],
      [3, { name: 'Plains 2', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [4, { name: 'Rampant Growth', typeLine: 'Sorcery', cmc: 2, manaCost: '{1}{G}', oracleText: 'Search your library for a basic land card, put it onto the battlefield tapped.' }],
      [5, { name: 'Swords', typeLine: 'Instant', cmc: 1, manaCost: '{W}', oracleText: 'Exile target creature.' }],
      [6, { name: 'Preordain', typeLine: 'Sorcery', cmc: 1, manaCost: '{U}', oracleText: 'Scry 2, then draw a card.' }],
      [7, { name: 'Creature', typeLine: 'Creature', cmc: 3, manaCost: '{2}{G}' }],
    ]);

    const noUtility = buildCardMap([
      [1, { name: 'Plains', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [2, { name: 'Forest', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {G}' }],
      [3, { name: 'Plains 2', typeLine: 'Basic Land', cmc: 0, oracleText: '{T}: Add {W}' }],
      [4, { name: 'Vanilla 1', typeLine: 'Creature', cmc: 2, manaCost: '{1}{G}' }],
      [5, { name: 'Vanilla 2', typeLine: 'Creature', cmc: 2, manaCost: '{1}{W}' }],
      [6, { name: 'Vanilla 3', typeLine: 'Creature', cmc: 3, manaCost: '{2}{G}' }],
      [7, { name: 'Vanilla 4', typeLine: 'Creature', cmc: 3, manaCost: '{2}{W}' }],
    ]);

    const deckInfo = { ...defaultDeckInfo, colors: ['W', 'G'] };
    const withScore = analyzeMulligan(hand, deckInfo, 'standard', 'midrange', withUtility, 0);
    const withoutScore = analyzeMulligan(hand, deckInfo, 'standard', 'midrange', noUtility, 0);

    // Both are great hands, but utility hand should score >= the vanilla hand
    expect(withScore.score).toBeGreaterThanOrEqual(withoutScore.score);
    expect(withScore.handAnalysis.hasRamp).toBe(true);
    expect(withScore.handAnalysis.hasRemoval).toBe(true);
    expect(withScore.handAnalysis.hasDraw).toBe(true);
    // Vanilla hand should lack utility
    expect(withoutScore.handAnalysis.hasRamp).toBe(false);
    expect(withoutScore.handAnalysis.hasRemoval).toBe(false);
    expect(withoutScore.handAnalysis.hasDraw).toBe(false);
  });

  it('should include correct hand analysis properties', () => {
    const hand = [1, 2, 3];
    const cardMap = buildCardMap([
      [1, { name: 'Plains', typeLine: 'Basic Land — Plains', cmc: 0, oracleText: '{T}: Add {W}' }],
      [2, { name: 'Sol Ring', typeLine: 'Artifact', cmc: 1, manaCost: '{1}', oracleText: '{T}: Add {C}{C}' }],
      [3, { name: 'Creature', typeLine: 'Creature', cmc: 2, manaCost: '{1}{W}' }],
    ]);

    const advice = analyzeMulligan(hand, defaultDeckInfo, 'standard', null, cardMap, 0);
    expect(advice.handAnalysis.landCount).toBe(1);
    expect(advice.handAnalysis.nonlandCount).toBe(2);
    expect(advice.handAnalysis.colors).toContain('W');
    expect(typeof advice.handAnalysis.avgCmc).toBe('number');
    expect(typeof advice.handAnalysis.hasPlayOnTurn1).toBe('boolean');
    expect(typeof advice.handAnalysis.hasPlayOnTurn2).toBe('boolean');
    expect(typeof advice.handAnalysis.hasPlayOnTurn3).toBe('boolean');
  });

  it('should handle unknown cards (null resolved)', () => {
    const hand = [999, 998, 997];
    const emptyMap = { get: () => null };

    // Should not throw
    const advice = analyzeMulligan(hand, defaultDeckInfo, 'standard', null, emptyMap, 0);
    expect(advice.recommendation).toBeDefined();
    expect(advice.handAnalysis.landCount).toBe(0);
    expect(advice.handAnalysis.nonlandCount).toBe(3);
  });
});
