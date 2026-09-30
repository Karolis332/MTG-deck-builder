// Unit P2-G (2026-09-30): guards, budget, partners — see
// ~/.claude/harness/runs/landbase-2026-09-30/FIX-P2-BRIEFS.md.
import { describe, it, expect } from 'vitest';
import { isBoardWipe } from '../card-classifier';
import { isBoardWipe as isBoardWipeBase } from './baseline/card-classifier-6791d3e';
import { isWipeBackfillCandidate, isStep4bDisplaceable, applyDeckBudget, partnerPairNames } from '../deck-builder-ai';
import { commanderToSlug } from '../edhrec';

describe('B-D4 partner pair: EDHREC pair page names', () => {
  it('slugs to the combined commander page, both orders', () => {
    const names = partnerPairNames('Tymna the Weaver', 'Thrasios, Triton Hero');
    expect(names.map(commanderToSlug)).toEqual(['tymna-the-weaver-thrasios-triton-hero', 'thrasios-triton-hero-tymna-the-weaver']);
  });
});
import type { Step4bDisplaceableCtx } from '../deck-builder-ai';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id', oracle_id: 'test-oracle', name: 'Test Card', mana_cost: '{2}', cmc: 2, type_line: 'Sorcery',
    oracle_text: null, colors: '[]', color_identity: '[]', keywords: '[]', set_code: 'tst', set_name: 'Test Set',
    collector_number: '1', rarity: 'common', image_uri_small: null, image_uri_normal: null, image_uri_large: null,
    image_uri_art_crop: null, price_usd: null, price_usd_foil: null, legalities: '{"commander":"legal"}', power: null,
    toughness: null, loyalty: null, produced_mana: null, edhrec_rank: null, layout: 'normal', updated_at: '2024-01-01',
    subtypes: null, arena_id: null, game_changer: 0, ...overrides,
  } as DbCard;
}
const pick = (card: DbCard) => ({ card, quantity: 1, board: 'main' as const });
const ctx = (o: Partial<Step4bDisplaceableCtx> = {}): Step4bDisplaceableCtx => ({
  category: 'tribal', protectedNames: new Set(), tribalNames: new Set(), rampCount: 10, rampFloor: 10, classifyOpts: STRICT, ...o,
});
const GARRUKS_WAKE = { name: "In Garruk's Wake", oracle_text: "Destroy all creatures you don't control and all planeswalkers you don't control." };

describe('#11 budget swaps never seat bulk', () => {
  const main = (card: DbCard, quantity = 1) => ({ card, quantity, board: 'main' as const });
  const creature = (name: string, price: string | null, edhrec_rank: number | null = null) =>
    makeCard({ name, price_usd: price, type_line: 'Creature — Bear', oracle_text: null, edhrec_rank });
  it('nonland: a candidate needs edhrec_rank <= 5000 or a score at/above the deck 25th percentile, else the card stays', () => {
    const bomb = creature('Bomb', '40.00');
    const picked = [bomb, creature('Good1', '1.00'), creature('Good2', '1.00'), creature('Good3', '1.00')].map((c) => main(c));
    const deckScores = [{ card: bomb, score: 100 }, { card: picked[1].card, score: 90 }, { card: picked[2].card, score: 80 }, { card: picked[3].card, score: 70 }];
    const junk = { card: creature('Junk', '0.50', 20000), score: 10 };
    const staple = { card: creature('Staple', '1.00', 3000), score: 20 };
    const solid = { card: creature('Solid', '1.00', null), score: 75 };
    // junk only → Bomb stays
    expect(applyDeckBudget(picked, [...deckScores, junk], 10, new Map(), false, undefined).replacedForBudget).toEqual([]);
    // popular staple qualifies by rank
    expect(applyDeckBudget(picked, [...deckScores, junk, staple], 10, new Map(), false, undefined).replacedForBudget[0]?.in).toBe('Staple');
    // a scored card at the deck's 25th percentile qualifies by score, and wins on score
    expect(applyDeckBudget(picked, [...deckScores, junk, staple, solid], 10, new Map(), false, undefined).replacedForBudget[0]?.in).toBe('Solid');
  });
  it('land: the best unpicked scored land producing the deficit colour beats the basic fallback', () => {
    const pricy = makeCard({ name: 'Pricy Dual', price_usd: '30.00', type_line: 'Land', oracle_text: '{T}: Add {R} or {G}.' });
    const mountain = makeCard({ name: 'Mountain', price_usd: '0.10', type_line: 'Basic Land — Mountain', oracle_text: '({T}: Add {R}.)' });
    const redSpell = makeCard({ name: 'Red Spell', mana_cost: '{R}{R}', colors: '["R"]', type_line: 'Creature' });
    const picked = [main(pricy), main(mountain, 5), main(redSpell)];
    const cheapRed = makeCard({ name: 'Cheap Red Dual', price_usd: '2.00', type_line: 'Land', oracle_text: '{T}: Add {R} or {G}.' });
    const cheapBlue = makeCard({ name: 'Cheap Blue', price_usd: '1.00', type_line: 'Land', oracle_text: '{T}: Add {U}.' });
    const landPool = [
      { card: cheapBlue, score: 90, producesColors: ['U'], clearsBar: true },
      { card: cheapRed, score: 80, producesColors: ['R', 'G'], clearsBar: true },
    ];
    const { cards, replacedForBudget } = applyDeckBudget(picked, [], 5, new Map(), false, undefined, { landPool });
    expect(replacedForBudget).toEqual([{ out: 'Pricy Dual', in: 'Cheap Red Dual', saved: 28 }]);
    expect(cards.find((c) => c.card.name === 'Mountain')?.quantity).toBe(5);
    expect(cards.find((c) => c.card.name === 'Cheap Red Dual')?.quantity).toBe(1);
  });
});

describe('#7 protection floor holds through every displacement', () => {
  const veto = pick(makeCard({ name: "Dovin's Veto", type_line: 'Instant', oracle_text: "This spell can't be countered.\nCounter target noncreature spell." }));
  it('a protection piece is not displaceable at the floor, is above it, and is unguarded when no floor is given', () => {
    expect(isStep4bDisplaceable(veto, ctx({ category: 'planeswalker', protectionCount: 2, protectionFloor: 2 }))).toBe(false);
    expect(isStep4bDisplaceable(veto, ctx({ category: 'planeswalker', protectionCount: 3, protectionFloor: 2 }))).toBe(true);
    expect(isStep4bDisplaceable(veto, ctx({ category: 'planeswalker' }))).toBe(true);
  });
});

describe('#6 symmetric creature wipes in creature-heavy builds', () => {
  it('backfill skips a symmetric wipe when the deck is creature-heavy, keeps one-sided wipes', () => {
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, scoreFloor: 0, creatureHeavy: true })).toBe(false);
    expect(isWipeBackfillCandidate(GARRUKS_WAKE, { classifyOpts: STRICT, scoreFloor: 0, creatureHeavy: true })).toBe(true);
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, scoreFloor: 0, creatureHeavy: false })).toBe(true);
  });
  it('Step 4b may displace a symmetric wipe only in a creature-heavy build; one-sided wipes stay', () => {
    const wrath = pick(makeCard(WRATH));
    const oneSided = pick(makeCard(GARRUKS_WAKE));
    expect(isStep4bDisplaceable(wrath, ctx({ creatureHeavy: true }))).toBe(true);
    expect(isStep4bDisplaceable(wrath, ctx({ creatureHeavy: false }))).toBe(false);
    expect(isStep4bDisplaceable(wrath, ctx())).toBe(false);
    expect(isStep4bDisplaceable(oneSided, ctx({ creatureHeavy: true }))).toBe(false);
  });
});

const STRICT = { strict: true } as const;
const WRATH = { name: 'Wrath of God', oracle_text: "Destroy all creatures. They can't be regenerated." };
const TURTLES = { name: 'Turtles in Time', oracle_text: "Return all creatures to their owners' hands. Each player may shuffle their hand and graveyard into their library, then each player who does draws seven cards.\nExile Turtles in Time." };

describe('#10 wipe backfill has a score floor', () => {
  it('rejects a pool card below the quality floor, accepts one above it or never scored', () => {
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, score: 21, scoreFloor: 60 })).toBe(false);
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, score: 80, scoreFloor: 60 })).toBe(true);
    expect(isWipeBackfillCandidate(WRATH, { classifyOpts: STRICT, score: undefined, scoreFloor: 60 })).toBe(true);
  });
  it('Turtles in Time at pool score 21 stays benched; a non-wipe never qualifies', () => {
    expect(isWipeBackfillCandidate(TURTLES, { classifyOpts: STRICT, score: 21, scoreFloor: 60 })).toBe(false);
    expect(isWipeBackfillCandidate({ name: 'Doom Blade', oracle_text: 'Destroy target nonblack creature.' }, { classifyOpts: STRICT, score: 200, scoreFloor: 60 })).toBe(false);
  });
});

const ASHLINGS_COMMAND = 'Choose two —\n'
  + '• Create a token that\'s a copy of target Elemental you control.\n'
  + '• Target player draws two cards.\n'
  + '• Ashling\'s Command deals 2 damage to each creature target player controls.\n'
  + '• Target player creates two Treasure tokens.';
const BOROS_CHARM = 'Choose one —\n• Boros Charm deals 4 damage to target player or planeswalker.\n'
  + '• Permanents you control gain indestructible until end of turn.\n• Target creature gains double strike until end of turn.';

describe('#12 strict modal guard covers every "Choose N —" header', () => {
  it('"Choose two —" is not a wipe on the strict path', () => {
    expect(isBoardWipe("Ashling's Command", ASHLINGS_COMMAND, { strict: true })).toBe(false);
    expect(isBoardWipe('Boros Charm', BOROS_CHARM, { strict: true })).toBe(false);
  });
  it('default path is byte-identical to 6791d3e', () => {
    for (const [n, t] of [["Ashling's Command", ASHLINGS_COMMAND], ['Boros Charm', BOROS_CHARM], ['Wrath of God', 'Destroy all creatures. They can\'t be regenerated.']]) {
      expect(isBoardWipe(n, t), n).toBe(isBoardWipeBase(n, t));
    }
  });
});
