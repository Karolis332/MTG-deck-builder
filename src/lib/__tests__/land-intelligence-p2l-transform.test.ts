// Unit P2-L (2026-09-30) — integrate-2 #1 transform land backs.
import { describe, it, expect } from 'vitest';
import { isLandBackDfc, applyDeadCardPass } from '../deck-builder-ai';
import type { DbCard } from '../types';

const card = (c: Partial<DbCard>): DbCard => c as DbCard;

describe('#1 transform artifacts are not land backs', () => {
  it('isLandBackDfc needs a modal DFC — a transforming Equipment // Land is a spell, not a land slot', () => {
    expect(isLandBackDfc(card({ type_line: 'Artifact — Equipment // Land', layout: 'transform' }))).toBe(false);
    expect(isLandBackDfc(card({ type_line: 'Sorcery // Land', layout: 'modal_dfc' }))).toBe(true);
    expect(isLandBackDfc(card({ type_line: 'Land // Land', layout: 'modal_dfc' }))).toBe(false);
  });
});

describe('dead-card pass leaves lands to the land base', () => {
  it('a typed fetch with few typed targets is not a dead tutor and is not swapped for a pool "land"', () => {
    const fetch = card({ name: 'Misty Rainforest', type_line: 'Land', oracle_text: '{T}, Pay 1 life, Sacrifice this land: Search your library for a Forest or Island card, put it onto the battlefield, then shuffle.', cmc: 0, layout: 'normal' });
    const forest = card({ name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '({T}: Add {G}.)', cmc: 0, layout: 'normal' });
    const abbey = card({ name: 'Westvale Abbey // Ormendahl, Profane Prince', type_line: 'Land // Legendary Creature — Demon', oracle_text: '{T}: Add {C}.', cmc: 0, layout: 'transform' });
    const r = applyDeadCardPass([{ card: fetch, quantity: 1, board: 'main' }, { card: forest, quantity: 1, board: 'main' }], [{ card: abbey, score: 90 }], ['G', 'B'], undefined);
    expect(r.replacedAsDead).toEqual([]);
    expect(r.cards.map((c) => c.card.name)).toContain('Misty Rainforest');
  });
});
