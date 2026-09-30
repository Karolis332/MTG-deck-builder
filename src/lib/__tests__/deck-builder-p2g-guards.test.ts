// Unit P2-G (2026-09-30): guards, budget, partners — see
// ~/.claude/harness/runs/landbase-2026-09-30/FIX-P2-BRIEFS.md.
import { describe, it, expect } from 'vitest';
import { isBoardWipe } from '../card-classifier';
import { isBoardWipe as isBoardWipeBase } from './baseline/card-classifier-6791d3e';
import { isWipeBackfillCandidate, isStep4bDisplaceable } from '../deck-builder-ai';
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
