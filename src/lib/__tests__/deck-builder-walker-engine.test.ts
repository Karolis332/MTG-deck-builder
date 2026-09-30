import { describe, it, expect } from 'vitest';
import { isWalkerEngineCard, walkerEngineFloor, WALKER_ENGINE_RATIO, isStep4bDisplaceable } from '../deck-builder-ai';
import type { Step4bDisplaceableCtx } from '../deck-builder-ai';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard>): DbCard {
  return {
    id: 'test-id', oracle_id: 'test-oracle', name: 'Test Card', mana_cost: '{2}', cmc: 2, type_line: 'Artifact',
    oracle_text: null, colors: '[]', color_identity: '[]', keywords: '[]', set_code: 'tst', set_name: 'Test Set',
    collector_number: '1', rarity: 'common', image_uri_small: null, image_uri_normal: null, image_uri_large: null,
    image_uri_art_crop: null, price_usd: null, price_usd_foil: null, legalities: '{"commander":"legal"}', power: null,
    toughness: null, loyalty: null, produced_mana: null, edhrec_rank: null, layout: 'normal', updated_at: '2024-01-01',
    subtypes: null, arena_id: null, game_changer: 0, ...overrides,
  } as DbCard;
}
function baseCtx(overrides: Partial<Step4bDisplaceableCtx>): Step4bDisplaceableCtx {
  return { category: 'draw', protectedNames: new Set(), tribalNames: new Set(), rampCount: 10, rampFloor: 10, ...overrides };
}

// Real oracle text from the card DB (U12 fix 1). A deck-wide, repeatable
// loyalty engine is what a superfriends build is built around; a card that
// merely mentions planeswalkers (Mox Amber, pillow-fort) is not.
const ENCH = 'Legendary Enchantment';
const REMINDER = '(Put five loyalty counters on a Jace token you control. If you don\'t control one, first create a blue Jace planeswalker token with "[−1]: Surveil 1" and "[−3]: Draw a card.")';

describe('isWalkerEngineCard (U12 fix 1)', () => {
  it('loyalty on every walker per trigger (Way of the Mentor)', () => {
    expect(isWalkerEngineCard({ type_line: ENCH, oracle_text: `When Way of the Mentor enters, empower Jace 5. ${REMINDER}\nWhenever you gain life, put a loyalty counter on each planeswalker you control.` })).toBe(true);
  });
  it('grants a loyalty ability to every walker (Way of the Pyromancer)', () => {
    expect(isWalkerEngineCard({ type_line: ENCH, oracle_text: `When Way of the Pyromancer enters, empower Jace 2. ${REMINDER}\nPlaneswalkers you control have "[+1]: Add {R}."` })).toBe(true);
  });
  it('pays off every loyalty activation (Way of the Paradox)', () => {
    expect(isWalkerEngineCard({ type_line: ENCH, oracle_text: `When Way of the Paradox enters, empower Jace 5. ${REMINDER}\nWhenever you activate a loyalty ability, you gain 1 life. You may play an additional land this turn.` })).toBe(true);
  });
  it('extra activations (Oath of Teferi) and per-walker activation (The Chain Veil)', () => {
    expect(isWalkerEngineCard({ type_line: ENCH, oracle_text: 'When Oath of Teferi enters, exile another target permanent you control. Return it to the battlefield under its owner\'s control at the beginning of the next end step.\nYou may activate the loyalty abilities of planeswalkers you control twice each turn rather than only once.' })).toBe(true);
    expect(isWalkerEngineCard({ type_line: 'Legendary Artifact', oracle_text: 'At the beginning of your end step, if you didn\'t activate a loyalty ability of a planeswalker this turn, you lose 2 life.\n{4}, {T}: For each planeswalker you control, you may activate one of its loyalty abilities once this turn as though none of its loyalty abilities have been activated this turn.' })).toBe(true);
  });
  it('a mention as a mana source or an attack target is not an engine (Mox Amber, Sphere of Safety)', () => {
    expect(isWalkerEngineCard({ type_line: 'Legendary Artifact', oracle_text: '{T}: Add one mana of any color among legendary creatures and planeswalkers you control.' })).toBe(false);
    expect(isWalkerEngineCard({ type_line: 'Enchantment', oracle_text: 'Creatures can\'t attack you or planeswalkers you control unless their controller pays {X} for each of those creatures, where X is the number of enchantments you control.' })).toBe(false);
  });
  it('a one-shot loyalty add or a single-subtype trigger is support, not an engine (Elspeth Conquers Death, Chandra\'s Regulator)', () => {
    expect(isWalkerEngineCard({ type_line: 'Enchantment — Saga', oracle_text: 'III — Return target creature or planeswalker card from your graveyard to the battlefield. Put a +1/+1 counter or a loyalty counter on it.' })).toBe(false);
    expect(isWalkerEngineCard({ type_line: 'Legendary Artifact', oracle_text: 'Whenever you activate a loyalty ability of a Chandra planeswalker, you may pay {1}. If you do, copy that ability.' })).toBe(false);
  });
  it('reminder text alone never makes an engine (Tam\'s Resistance), and a walker is never its own engine', () => {
    expect(isWalkerEngineCard({ type_line: 'Sorcery', oracle_text: 'Put a +1/+1 counter on up to one target creature. It gains vigilance until end of turn. Empower Jace 4. (Put four loyalty counters on a Jace token you control. If you don\'t control one, first create a blue Jace planeswalker token.)' })).toBe(false);
    expect(isWalkerEngineCard({ type_line: 'Legendary Planeswalker — Jace', oracle_text: 'Planeswalkers you control have "[+1]: Draw a card."' })).toBe(false);
  });
});

describe('isWalkerEngineCard — repeatable and usable only (U12 fix 1)', () => {
  it('a one-shot copy (instant) or a Saga chapter is not an engine, a creature granting "[+2]" to every walker is', () => {
    expect(isWalkerEngineCard({ type_line: 'Instant', oracle_text: 'When you next cast an instant spell, cast a sorcery spell, or activate a loyalty ability this turn, copy that spell or ability twice.' })).toBe(false);
    expect(isWalkerEngineCard({ type_line: 'Enchantment — Saga', oracle_text: 'III — You may activate the loyalty abilities of planeswalkers you control twice this turn rather than only once.' })).toBe(false);
    expect(isWalkerEngineCard({ type_line: 'Creature — Horror', oracle_text: 'Planeswalkers you control aren\'t put into their owners\' graveyards for having 0 loyalty.\nPlaneswalkers you control have "[+2]: This planeswalker deals 1 damage to each opponent."' })).toBe(true);
  });
  it('a granted ultimate ("[−8]", "[−10]") is not a usable engine; "[−4]" is', () => {
    expect(isWalkerEngineCard({ type_line: 'Legendary Creature — Merfolk Noble', oracle_text: 'Planeswalkers you control have "[−8]: Create an 8/8 blue Leviathan creature token with hexproof."' })).toBe(false);
    expect(isWalkerEngineCard({ type_line: 'Creature — Avatar', oracle_text: 'Planeswalkers you control have "[−10]: Put a +1/+1 counter on target creature for each land you control."' })).toBe(false);
    expect(isWalkerEngineCard({ type_line: ENCH, oracle_text: 'Planeswalkers you control have "[−4]: Create a 4/4 green Beast creature token with trample."' })).toBe(true);
  });
});

describe('engine floor (U12 fix 1)', () => {
  it('two engines per three walkers: Tam (18 walkers) -> 12, a 12-walker shell -> 8', () => {
    expect(WALKER_ENGINE_RATIO).toBeCloseTo(2 / 3);
    expect(walkerEngineFloor(18)).toBe(12);
    expect(walkerEngineFloor(12)).toBe(8);
  });
  it('Step 4b never displaces an engine in a superfriends build (it is the lowest-scored card in the deck), but may outside one', () => {
    const way = makeCard({ name: 'Way of the Mentor', type_line: ENCH, oracle_text: 'Whenever you gain life, put a loyalty counter on each planeswalker you control.' });
    const pick = { card: way, quantity: 1, board: 'main' as const };
    expect(isStep4bDisplaceable(pick, baseCtx({ category: 'draw', isSuperfriends: true }))).toBe(false);
    expect(isStep4bDisplaceable(pick, baseCtx({ category: 'draw', isSuperfriends: false }))).toBe(true);
  });
});
