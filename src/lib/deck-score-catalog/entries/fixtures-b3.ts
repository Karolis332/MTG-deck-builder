/**
 * Curated batch B3 — the §5 fixtures' highest-copy uncovered cards
 * (`coverage.md --set fixtures --queue`). Mostly Food/token engines,
 * replacement effects and iterated costs the oracle parser refuses.
 * Mechanics only (§8); `oracleText` is the live text these were typed
 * against (card data 2026-09-19) and is hashed at load time.
 */
import type { CatalogEntry } from '../schema';

const P = { source: 'oracle text, card data 2026-09-19', reviewedBy: 'deck-score v1.2 slice B round 2', reviewedAt: '2026-09-20' };

export const FIXTURES_B3: readonly CatalogEntry[] = [
  {
    canonicalName: 'Sylvan Library',
    oracleText: 'At the beginning of your draw step, you may draw two additional cards. If you do, choose two cards in your hand drawn this turn. For each of those cards, pay 4 life or put the card on top of your library.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'advantage', mode: 'triggered', controller: 'self', zones: ['library', 'hand'],
        prerequisites: ['your draw step', 'life to pay, else the extra cards go back'],
        cost: { mana: 2, colored: ['G'], additional: ['4 life per extra card kept'] },
        timing: { earliestTurn: 2, interval: 1, oncePerTurn: true },
        consumes: ['life'], produces: ['cards', 'selection'],
        outputBounds: { min: 0, max: 2, unit: 'cards per turn' },
      },
    ],
  },
  {
    canonicalName: 'The Mind Stone',
    oracleText: 'Indestructible\n{T}: Add {W}.\n{5}{W}, {T}: Harness The Mind Stone. (Once harnessed, its ∞ ability is active.)\n∞ — At the beginning of your end step, exile up to one other target nonland permanent you control, then return that card to the battlefield under its owner\'s control.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'activated', controller: 'self', zones: ['battlefield'],
        cost: { mana: 0 }, timing: { earliestTurn: 2, interval: 1, instantSpeed: true },
        produces: ['mana'], outputBounds: { min: 1, max: 1, unit: 'mana' },
      },
      {
        family: 'engine', mode: 'triggered', controller: 'self', zones: ['battlefield', 'exile'],
        targetFilters: ['up to one other target nonland permanent you control'],
        prerequisites: ['harnessed for {5}{W} first', 'an ETB worth re-triggering'],
        requiredSupply: [{ resource: 'enters-the-battlefield trigger', copies: 1 }],
        cost: { mana: 6, colored: ['W'] },
        timing: { earliestTurn: 8, interval: 1, oncePerTurn: true },
        produces: ['blink'], outputBounds: { min: 1, max: 1, unit: 'retriggered permanents' },
      },
    ],
  },
  {
    canonicalName: 'Bosco, Just a Bear',
    oracleText: 'When Bosco enters, create a Food token for each legendary creature you control. (It\'s an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")\n{2}{G}, Sacrifice a Food: Put two +1/+1 counters on Bosco. He gains trample until end of turn.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'etb', controller: 'self', zones: ['battlefield'],
        prerequisites: ['legendary creatures you control'],
        requiredSupply: [{ resource: 'legendary creature', copies: 1 }],
        cost: { mana: 5, colored: ['G'] }, timing: { earliestTurn: 5 },
        produces: ['food'], outputBounds: { min: 1, max: null, unit: 'food' },
      },
      {
        family: 'closing', mode: 'activated', controller: 'self', zones: ['battlefield'],
        requiredSupply: [{ resource: 'food', copies: 1 }],
        cost: { mana: 3, colored: ['G'], additional: ['sacrifice a Food'] },
        timing: { earliestTurn: 6, interval: 1 },
        consumes: ['food'], produces: ['+1/+1 counters', 'trample'],
        outputBounds: { min: 2, max: 2, unit: 'power' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 5, colored: ['G'] },
        timing: { earliestTurn: 5, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 4, max: 4, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: "Bumi's Feast Lecture",
    oracleText: 'Create a Food token. Then earthbend X, where X is twice the number of Foods you control. (A Food token is an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life." To earthbend X, target land you control becomes a 0/0 creature with haste that\'s still a land. Put X +1/+1 counters on it. When it dies or is exiled, return it to the battlefield tapped.)',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'cast', controller: 'self',
        cost: { mana: 2, colored: ['G'] }, timing: { earliestTurn: 2 },
        produces: ['food'], outputBounds: { min: 1, max: 1, unit: 'food' },
      },
      {
        family: 'closing', mode: 'cast', controller: 'self', zones: ['battlefield'],
        targetFilters: ['target land you control'],
        prerequisites: ['Foods on the battlefield scale X'],
        requiredSupply: [{ resource: 'food', copies: 1 }],
        cost: { mana: 2, colored: ['G'] }, timing: { earliestTurn: 2 },
        produces: ['+1/+1 counters', 'haste'], outputBounds: { min: 2, max: null, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Peregrin Took',
    oracleText: 'If one or more tokens would be created under your control, those tokens plus an additional Food token are created instead. (It\'s an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")\nSacrifice three Foods: Draw a card.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['something else creates a token'],
        requiredSupply: [{ resource: 'token maker', copies: 2 }],
        cost: { mana: 3, colored: ['G'] },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: false },
        produces: ['food'], outputBounds: { min: 1, max: null, unit: 'food per token event' },
      },
      {
        family: 'advantage', mode: 'activated', controller: 'self', zones: ['battlefield'],
        requiredSupply: [{ resource: 'food', copies: 3 }],
        cost: { mana: 0, additional: ['sacrifice three Foods'] },
        timing: { earliestTurn: 4, interval: 1, instantSpeed: true },
        consumes: ['food'], produces: ['cards'], outputBounds: { min: 1, max: 1, unit: 'cards' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 3, colored: ['G'] },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Syr Konrad, the Grim',
    oracleText: 'Whenever another creature dies, or a creature card is put into a graveyard from anywhere other than the battlefield, or a creature card leaves your graveyard, Syr Konrad deals 1 damage to each opponent.\n{1}{B}: Each player mills a card. (They each put the top card of their library into their graveyard.)',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield', 'graveyard'],
        prerequisites: ['creatures die, are milled, or leave your graveyard'],
        requiredSupply: [{ resource: 'creature death or mill', copies: 4 }],
        cost: { mana: 5, colored: ['B', 'B'] },
        timing: { earliestTurn: 5, interval: 1 },
        produces: ['opponent life loss'], outputBounds: { min: 1, max: null, unit: 'life lost per trigger' },
      },
      {
        family: 'engine', mode: 'activated', controller: 'any', zones: ['library', 'graveyard'],
        cost: { mana: 2, colored: ['B'] },
        timing: { earliestTurn: 5, interval: 1, instantSpeed: true },
        produces: ['graveyard cards'], outputBounds: { min: 1, max: 1, unit: 'cards milled per player' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 5, colored: ['B', 'B'] },
        timing: { earliestTurn: 5, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 5, max: 5, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Tersa Lightshatter',
    oracleText: 'Haste\nWhen Tersa Lightshatter enters, discard up to two cards, then draw that many cards.\nWhenever Tersa Lightshatter attacks, if there are seven or more cards in your graveyard, exile a card at random from your graveyard. You may play that card this turn.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'advantage', mode: 'etb', controller: 'self', zones: ['hand', 'graveyard'],
        cost: { mana: 3, colored: ['R'] }, timing: { earliestTurn: 3 },
        consumes: ['cards'], produces: ['selection', 'graveyard cards'],
        outputBounds: { min: 0, max: 0, unit: 'net cards' },
      },
      {
        family: 'advantage', mode: 'triggered', controller: 'self', zones: ['graveyard', 'exile'],
        prerequisites: ['seven or more cards in your graveyard', 'this creature attacks'],
        requiredSupply: [{ resource: 'graveyard fuel', copies: 7 }],
        cost: { mana: 3, colored: ['R'] },
        timing: { earliestTurn: 4, interval: 1 },
        produces: ['cards'], outputBounds: { min: 0, max: 1, unit: 'cards per attack' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 3, colored: ['R'] },
        timing: { earliestTurn: 3, interval: 1 },
        produces: ['pressure', 'haste'], outputBounds: { min: 3, max: 3, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Tireless Provisioner',
    oracleText: 'Landfall — Whenever a land you control enters, create a Food token or a Treasure token. (Food is an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life." Treasure is an artifact with "{T}, Sacrifice this token: Add one mana of any color.")',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        prerequisites: ['a land enters under your control'],
        cost: { mana: 3, colored: ['G'] },
        timing: { earliestTurn: 3, interval: 1 },
        produces: ['treasure', 'food'], outputBounds: { min: 1, max: 1, unit: 'tokens per land drop' },
        sharedModeBudget: 'landfall-token',
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 3, colored: ['G'] },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 3, max: 3, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Unlucky Cabbage Merchant',
    oracleText: 'When this creature enters, create a Food token. (It\'s an artifact with "{2}, {T}, Sacrifice this token: You gain 3 life.")\nWhenever you sacrifice a Food, you may search your library for a basic land card and put it onto the battlefield tapped. If you search your library this way, put this creature on the bottom of its owner\'s library, then shuffle.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'etb', controller: 'self', zones: ['battlefield'],
        cost: { mana: 2, colored: ['G'] }, timing: { earliestTurn: 2 },
        produces: ['food'], outputBounds: { min: 1, max: 1, unit: 'food' },
      },
      {
        family: 'mana', mode: 'triggered', controller: 'self', zones: ['library', 'battlefield'],
        targetFilters: ['basic land card'],
        prerequisites: ['you sacrifice a Food', 'using it bottoms this creature'],
        requiredSupply: [{ resource: 'food', copies: 1 }],
        cost: { mana: 2, colored: ['G'] }, timing: { earliestTurn: 2, oncePerTurn: true },
        consumes: ['food'], produces: ['land'], outputBounds: { min: 1, max: 1, unit: 'lands' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 2, colored: ['G'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Academy Manufactor',
    oracleText: 'If you would create a Clue, Food, or Treasure token, instead create one of each.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['something else creates a Clue, Food or Treasure'],
        requiredSupply: [{ resource: 'clue food or treasure maker', copies: 2 }],
        cost: { mana: 3 },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: false },
        produces: ['clue', 'food', 'treasure'],
        outputBounds: { min: 2, max: 2, unit: 'extra tokens per token event' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 3 },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 1, max: 1, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Case of the Uneaten Feast',
    oracleText: 'Whenever a creature you control enters, you gain 1 life.\nTo solve — You\'ve gained 5 or more life this turn. (If unsolved, solve at the beginning of your end step.)\nSolved — Sacrifice this Case: Creature cards in your graveyard gain "You may cast this card from your graveyard" until end of turn.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'advantage', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        prerequisites: ['a creature you control enters'],
        requiredSupply: [{ resource: 'creature', copies: 4 }],
        cost: { mana: 1, colored: ['W'] }, timing: { earliestTurn: 1, interval: 1 },
        produces: ['life'], outputBounds: { min: 1, max: 1, unit: 'life per creature' },
      },
      {
        family: 'engine', mode: 'activated', controller: 'self', zones: ['graveyard'],
        prerequisites: ['solved: 5 or more life gained in a turn', 'creature cards in your graveyard'],
        requiredSupply: [{ resource: 'creature in graveyard', copies: 2 }],
        cost: { mana: 0, additional: ['sacrifice this Case'] },
        timing: { earliestTurn: 3, instantSpeed: true },
        produces: ['recursion'], outputBounds: { min: 1, max: null, unit: 'recast creatures' },
      },
    ],
  },
];
