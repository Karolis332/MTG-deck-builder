/**
 * Seed catalogue entries chosen by MEASURED uncovered copy mass — the top of
 * `verify-2026-09-19/deck-score/coverage.md` when the catalogue held only the
 * 16 cards §8 names (cEDH median coverage 7.0%, Standard 0.0%). Mechanics
 * only. Slice B extends this list from the same report, in descending
 * uncovered copy mass, until every reference list is above 80%.
 *
 * Oracle text is the reviewed snapshot (card data 2026-09-19) and is hashed
 * at load time; a printing whose live text no longer matches degrades to the
 * regex fallback rather than claiming coverage.
 */
import type { CatalogEntry } from '../schema';

const P = { source: 'oracle text, card data 2026-09-19', reviewedBy: 'deck-score v1.2 slice A', reviewedAt: '2026-09-20' };

export const STANDARD_CORE: readonly CatalogEntry[] = [
  {
    canonicalName: 'Icetill Explorer',
    oracleText: 'You may play an additional land on each of your turns.\nYou may play lands from your graveyard.\nLandfall — Whenever a land you control enters, mill a card.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'mana', mode: 'static', controller: 'self', zones: ['hand', 'graveyard', 'battlefield'],
      cost: { mana: 4, colored: ['G', 'G'] },
      timing: { earliestTurn: 4, interval: 1 },
      produces: ['extra land drop'], outputBounds: { min: 1, max: 1, unit: 'extra lands per turn' },
    }],
  },
  {
    canonicalName: "Sazh's Chocobo",
    oracleText: 'Landfall — Whenever a land you control enters, put a +1/+1 counter on this creature.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
      prerequisites: ['a land enters under your control'],
      requiredSupply: [{ resource: 'nonland mana producer', copies: 0 }],
      cost: { mana: 1, colored: ['G'] },
      timing: { earliestTurn: 1, interval: 1, summoningSickness: true },
      produces: ['+1/+1 counters'], outputBounds: { min: 1, max: 1, unit: 'power per land drop' },
    }],
  },
  {
    canonicalName: 'Earthbender Ascension',
    oracleText: 'When this enchantment enters, earthbend 2. Then search your library for a basic land card, put it onto the battlefield tapped, then shuffle.\nLandfall — Whenever a land you control enters, put a quest counter on this enchantment. When you do, if it has four or more quest counters on it, put a +1/+1 counter on target creature you control. It gains trample until end of turn.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'etb', controller: 'self', zones: ['library', 'battlefield'],
        targetFilters: ['basic land card'],
        cost: { mana: 3, colored: ['G'] },
        timing: { earliestTurn: 3 },
        produces: ['tapped basic land', '+1/+1 counters'], outputBounds: { min: 1, max: 1, unit: 'lands' },
      },
      {
        family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        targetFilters: ['creature you control'],
        prerequisites: ['four or more quest counters'],
        cost: { mana: 0 },
        timing: { earliestTurn: 7, interval: 1 },
        produces: ['+1/+1 counters', 'trample'], outputBounds: { min: 1, max: 1, unit: 'power per land drop' },
      },
    ],
  },
  {
    canonicalName: 'Requiting Hex',
    oracleText: "As an additional cost to cast this spell, you may blight 1. (You may put a -1/-1 counter on a creature you control.)\nDestroy target creature with mana value 2 or less. If this spell's additional cost was paid, you gain 2 life.",
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield'],
      targetFilters: ['creature with mana value 2 or less'],
      answerAxes: ['creature'],
      cost: { mana: 1, colored: ['B'], additional: ['optional blight 1'] },
      timing: { earliestTurn: 1, instantSpeed: true },
      produces: ['destroy'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
    }],
  },
  {
    canonicalName: 'Mightform Harmonizer',
    oracleText: 'Landfall — Whenever a land you control enters, double the power of target creature you control until end of turn.\nWarp {2}{G} (You may cast this card from your hand for its warp cost. Exile this creature at the beginning of the next end step, then you may cast it from exile on a later turn.)',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        targetFilters: ['creature you control'],
        prerequisites: ['a land enters under your control'],
        cost: { mana: 4, colored: ['G', 'G'] },
        timing: { earliestTurn: 4, interval: 1 },
        produces: ['power doubling'], outputBounds: { min: 1, max: null, unit: 'power added' },
        sharedModeBudget: 'harmonizer',
      },
      {
        family: 'closing', mode: 'alternate_cost', controller: 'self', zones: ['hand', 'exile'],
        cost: { mana: 3, colored: ['G'] },
        timing: { earliestTurn: 3 },
        produces: ['temporary body'], outputBounds: { min: 4, max: 4, unit: 'power' },
        sharedModeBudget: 'harmonizer',
      },
    ],
  },
  {
    canonicalName: 'Burst Lightning',
    oracleText: 'Kicker {4} (You may pay an additional {4} as you cast this spell.)\nBurst Lightning deals 2 damage to any target. If this spell was kicked, it deals 4 damage instead.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield', 'stack'],
        targetFilters: ['any target'], answerAxes: ['creature'],
        cost: { mana: 1, colored: ['R'] },
        timing: { earliestTurn: 1, instantSpeed: true },
        produces: ['damage'], outputBounds: { min: 2, max: 2, unit: 'damage' },
        sharedModeBudget: 'burst',
      },
      {
        family: 'closing', mode: 'cast', controller: 'any',
        targetFilters: ['any target'],
        cost: { mana: 5, colored: ['R'] },
        timing: { earliestTurn: 5, instantSpeed: true },
        produces: ['damage'], outputBounds: { min: 4, max: 4, unit: 'damage' },
        sharedModeBudget: 'burst',
      },
    ],
  },
  {
    canonicalName: 'Opt',
    oracleText: 'Scry 1. (Look at the top card of your library. You may put that card on the bottom.)\nDraw a card.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'advantage', mode: 'cast', controller: 'self', zones: ['library', 'hand'],
      cost: { mana: 1, colored: ['U'] },
      timing: { earliestTurn: 1, instantSpeed: true },
      produces: ['cards', 'selection'], outputBounds: { min: 0, max: 0, unit: 'net cards' },
    }],
  },
  {
    canonicalName: 'Erode',
    oracleText: 'Destroy target creature or planeswalker. Its controller may search their library for a basic land card, put it onto the battlefield tapped, then shuffle.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield'],
      targetFilters: ['creature', 'planeswalker'], answerAxes: ['creature', 'permanent'],
      cost: { mana: 1, colored: ['W'] },
      timing: { earliestTurn: 1, instantSpeed: true },
      produces: ['destroy'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
    }],
  },
  {
    canonicalName: 'Sapling Nursery',
    oracleText: 'Affinity for Forests (This spell costs {1} less to cast for each Forest you control.)\nLandfall — Whenever a land you control enters, create a 3/4 green Treefolk creature token with reach.\n{1}{G}, Exile this enchantment: Treefolk and Forests you control gain indestructible until end of turn.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
      prerequisites: ['a land enters under your control'],
      cost: { mana: 8, colored: ['G', 'G'], additional: ['affinity for Forests reduces the generic cost'] },
      timing: { earliestTurn: 4, interval: 1 },
      produces: ['creature token'], outputBounds: { min: 3, max: 3, unit: 'power per land drop' },
    }],
  },
  {
    canonicalName: 'Sleight of Hand',
    oracleText: 'Look at the top two cards of your library. Put one of them into your hand and the other on the bottom of your library.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'advantage', mode: 'cast', controller: 'self', zones: ['library', 'hand'],
      cost: { mana: 1, colored: ['U'] },
      timing: { earliestTurn: 1 },
      produces: ['cards', 'selection'], outputBounds: { min: 0, max: 0, unit: 'net cards' },
    }],
  },
  {
    canonicalName: 'Voice of Victory',
    oracleText: "Mobilize 2 (Whenever this creature attacks, create two tapped and attacking 1/1 red Warrior creature tokens. Sacrifice them at the beginning of the next end step.)\nYour opponents can't cast spells during your turn.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        prerequisites: ['this creature attacks'],
        cost: { mana: 2, colored: ['W'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['creature token'], outputBounds: { min: 2, max: 2, unit: 'power per attack' },
      },
      {
        family: 'answer', mode: 'static', controller: 'opponent', zones: ['stack'],
        answerAxes: ['stack'],
        cost: { mana: 2, colored: ['W'] },
        timing: { earliestTurn: 2, interval: 1 },
        produces: ['cannot cast during your turn'], outputBounds: { min: 0, max: null, unit: 'spells denied' },
      },
    ],
  },
  {
    canonicalName: 'Stock Up',
    oracleText: 'Look at the top five cards of your library. Put two of them into your hand and the rest on the bottom of your library in any order.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'advantage', mode: 'cast', controller: 'self', zones: ['library', 'hand'],
      cost: { mana: 3, colored: ['U'] },
      timing: { earliestTurn: 3 },
      produces: ['cards', 'selection'], outputBounds: { min: 1, max: 1, unit: 'net cards' },
    }],
  },
];
