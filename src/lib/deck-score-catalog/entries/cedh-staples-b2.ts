/**
 * Curated batch B2 — continuation of `cedh-staples-b1.ts`, same queue order.
 * Mechanics only (§8). `oracleText` is the live text these were typed against
 * (card data 2026-09-19) and is hashed at load time.
 */
import type { CatalogEntry } from '../schema';

const P = { source: 'oracle text, card data 2026-09-19', reviewedBy: 'deck-score v1.2 slice B', reviewedAt: '2026-09-20' };

export const CEDH_STAPLES_B2: readonly CatalogEntry[] = [
  {
    canonicalName: 'Tainted Pact',
    oracleText: 'Exile the top card of your library. You may put that card into your hand unless it has the same name as another card exiled this way. Repeat this process until you put a card into your hand or you exile two cards with the same name, whichever comes first.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'tutor', mode: 'cast', controller: 'self', zones: ['library', 'exile', 'hand'],
        targetFilters: ['any card'],
        prerequisites: ['few duplicate names in the library'],
        cost: { mana: 2, colored: ['B'] }, timing: { earliestTurn: 2, instantSpeed: true },
        consumes: ['library'], produces: ['card', 'empty library'],
        outputBounds: { min: 1, max: 1, unit: 'cards' },
      },
    ],
  },
  {
    canonicalName: 'Finale of Devastation',
    oracleText: 'Search your library and/or graveyard for a creature card with mana value X or less and put it onto the battlefield. If you search your library this way, shuffle. If X is 10 or more, creatures you control get +X/+X and gain haste until end of turn.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'tutor', mode: 'cast', controller: 'self', zones: ['library', 'graveyard', 'battlefield'],
        targetFilters: ['creature card with mana value X or less'],
        cost: { mana: 2, colored: ['G', 'G'] }, timing: { earliestTurn: 3 },
        produces: ['permanent'], outputBounds: { min: 1, max: 1, unit: 'permanents' },
      },
      {
        family: 'closing', mode: 'cast', controller: 'self', zones: ['battlefield'],
        prerequisites: ['X is 10 or more, i.e. 12 mana available'],
        cost: { mana: 12, colored: ['G', 'G'] }, timing: { earliestTurn: 12 },
        produces: ['anthem', 'haste'], outputBounds: { min: 10, max: null, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Neoform',
    oracleText: "As an additional cost to cast this spell, sacrifice a creature.\nSearch your library for a creature card with mana value equal to 1 plus the sacrificed creature's mana value, put that card onto the battlefield with an additional +1/+1 counter on it, then shuffle.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'tutor', mode: 'cast', controller: 'self', zones: ['library', 'battlefield'],
        targetFilters: ["creature card with mana value equal to the sacrificed creature's + 1"],
        requiredSupply: [{ resource: 'creature', copies: 1 }],
        cost: { mana: 2, colored: ['G', 'U'], additional: ['sacrifice a creature'] },
        timing: { earliestTurn: 2 },
        consumes: ['creature'], produces: ['permanent'],
        outputBounds: { min: 1, max: 1, unit: 'permanents' },
      },
    ],
  },
  {
    canonicalName: 'Swift Reconfiguration',
    oracleText: "Flash\nEnchant creature or Vehicle\nEnchanted permanent is a Vehicle artifact with crew 5 and it loses all other card types. (It's not a creature unless it's crewed.)",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield'],
        targetFilters: ['creature or Vehicle'], answerAxes: ['creature'],
        prerequisites: ['the creature stops being a creature; it stays on the battlefield'],
        cost: { mana: 1, colored: ['W'] }, timing: { earliestTurn: 1, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
      },
    ],
  },
  {
    canonicalName: 'Culling Ritual',
    oracleText: 'Destroy each nonland permanent with mana value 2 or less. Add {B} or {G} for each permanent destroyed this way.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield'],
        targetFilters: ['each nonland permanent with mana value 2 or less'],
        answerAxes: ['creature', 'permanent'],
        cost: { mana: 4, colored: ['B', 'G'] }, timing: { earliestTurn: 4 },
        outputBounds: { min: 2, max: null, unit: 'permanents answered' },
      },
      {
        family: 'mana', mode: 'cast', controller: 'self',
        prerequisites: ['permanents were destroyed this way'],
        cost: { mana: 4, colored: ['B', 'G'] }, timing: { earliestTurn: 4 },
        produces: ['mana'], outputBounds: { min: 0, max: null, unit: 'mana' },
      },
    ],
  },
  {
    canonicalName: "Orim's Chant",
    oracleText: "Kicker {W} (You may pay an additional {W} as you cast this spell.)\nTarget player can't cast spells this turn. If this spell was kicked, creatures can't attack this turn.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'opponent', zones: ['stack'],
        targetFilters: ['target player'], answerAxes: ['stack'],
        prerequisites: ['effect lasts one turn'],
        cost: { mana: 1, colored: ['W'] }, timing: { earliestTurn: 1, instantSpeed: true },
        outputBounds: { min: 1, max: null, unit: 'spells answered' },
      },
      {
        family: 'answer', mode: 'cast', controller: 'opponent', zones: ['battlefield'],
        answerAxes: ['creature'],
        prerequisites: ['kicked', 'effect lasts one turn'],
        cost: { mana: 2, colored: ['W', 'W'] }, timing: { earliestTurn: 2, instantSpeed: true },
        outputBounds: { min: 1, max: null, unit: 'attacks answered' },
      },
    ],
  },
  {
    canonicalName: 'Swords to Plowshares',
    oracleText: 'Exile target creature. Its controller gains life equal to its power.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield', 'exile'],
        targetFilters: ['target creature'], answerAxes: ['creature'],
        cost: { mana: 1, colored: ['W'] }, timing: { earliestTurn: 1, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
      },
    ],
  },
  {
    canonicalName: 'Snap',
    oracleText: "Return target creature to its owner's hand. Untap up to two lands.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield', 'hand'],
        targetFilters: ['target creature'], answerAxes: ['creature'],
        cost: { mana: 2, colored: ['U'] }, timing: { earliestTurn: 2, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
      },
      {
        family: 'mana', mode: 'cast', controller: 'self', zones: ['battlefield'],
        requiredSupply: [{ resource: 'land', copies: 2 }],
        cost: { mana: 2, colored: ['U'] }, timing: { earliestTurn: 2, instantSpeed: true },
        produces: ['mana'], outputBounds: { min: 0, max: 2, unit: 'mana' },
      },
    ],
  },
  {
    canonicalName: 'Cloud of Faeries',
    oracleText: 'Flying\nWhen this creature enters, untap up to two lands.\nCycling {2} ({2}, Discard this card: Draw a card.)',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'etb', controller: 'self', zones: ['battlefield'],
        requiredSupply: [{ resource: 'land', copies: 2 }],
        cost: { mana: 2, colored: ['U'] }, timing: { earliestTurn: 2 },
        produces: ['mana'], outputBounds: { min: 0, max: 2, unit: 'mana' },
      },
      {
        family: 'advantage', mode: 'activated', controller: 'self', zones: ['hand'],
        cost: { mana: 2, additional: ['discard this card'] },
        timing: { earliestTurn: 2, instantSpeed: true },
        produces: ['cards'], outputBounds: { min: 1, max: 1, unit: 'cards' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 2, colored: ['U'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure', 'flying'], outputBounds: { min: 1, max: 1, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Endurance',
    oracleText: 'Flash\nReach\nWhen this creature enters, up to one target player puts all the cards from their graveyard on the bottom of their library in a random order.\nEvoke—Exile a green card from your hand.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'alternate_cost', controller: 'opponent', zones: ['graveyard', 'library'],
        targetFilters: ['up to one target player'], answerAxes: ['graveyard_or_protection'],
        requiredSupply: [{ resource: 'green card in hand', copies: 1 }],
        cost: { mana: 0, additional: ['exile a green card from hand'] },
        timing: { earliestTurn: 1, instantSpeed: true },
        consumes: ['cards'], outputBounds: { min: 1, max: 1, unit: 'graveyards answered' },
        sharedModeBudget: 'graveyard-hate',
      },
      {
        family: 'answer', mode: 'etb', controller: 'opponent', zones: ['graveyard', 'library'],
        targetFilters: ['up to one target player'], answerAxes: ['graveyard_or_protection'],
        cost: { mana: 3, colored: ['G', 'G'] }, timing: { earliestTurn: 3, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'graveyards answered' }, sharedModeBudget: 'graveyard-hate',
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 3, colored: ['G', 'G'] },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 3, max: 3, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'The One Ring',
    oracleText: 'Indestructible\nWhen The One Ring enters, if you cast it, you gain protection from everything until your next turn.\nAt the beginning of your upkeep, you lose 1 life for each burden counter on The One Ring.\n{T}: Put a burden counter on The One Ring, then draw a card for each burden counter on The One Ring.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'advantage', mode: 'activated', controller: 'self', zones: ['library', 'hand'],
        cost: { mana: 0, additional: ['cumulative life loss per burden counter'] },
        timing: { earliestTurn: 4, interval: 1 },
        consumes: ['life'], produces: ['cards'],
        outputBounds: { min: 1, max: null, unit: 'cards per turn' },
      },
      {
        family: 'answer', mode: 'etb', controller: 'self', answerAxes: ['graveyard_or_protection'],
        prerequisites: ['cast, not put onto the battlefield', 'lasts until your next turn'],
        cost: { mana: 4 }, timing: { earliestTurn: 4 },
        produces: ['protection'], outputBounds: { min: 1, max: 1, unit: 'turns protected' },
      },
    ],
  },
  {
    canonicalName: 'High Fae Trickster',
    oracleText: 'Flash (You may cast this spell any time you could cast an instant.)\nFlying\nYou may cast spells as though they had flash.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['hand'],
        cost: { mana: 4, colored: ['U'] },
        timing: { earliestTurn: 4, interval: 1, instantSpeed: true },
        produces: ['flash access'], outputBounds: { min: 1, max: null, unit: 'spells per turn' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 4, colored: ['U'] },
        timing: { earliestTurn: 4, interval: 1, summoningSickness: true },
        produces: ['pressure', 'flying'], outputBounds: { min: 4, max: 4, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Mockingbird',
    oracleText: "Flying\nYou may have this creature enter as a copy of any creature on the battlefield with mana value less than or equal to the amount of mana spent to cast this creature, except it's a Bird in addition to its other types and it has flying.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'etb', controller: 'any', zones: ['battlefield'],
        targetFilters: ['any creature on the battlefield with mana value <= X'],
        prerequisites: ['a creature worth copying is on the battlefield'],
        cost: { mana: 1, colored: ['U'] }, timing: { earliestTurn: 1 },
        produces: ['copy'], outputBounds: { min: 1, max: 1, unit: 'copied permanents' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 1, colored: ['U'] },
        timing: { earliestTurn: 1, interval: 1, summoningSickness: true },
        produces: ['pressure', 'flying'], outputBounds: { min: 1, max: null, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: "Hazel's Brewmaster",
    oracleText: 'Menace\nWhenever this creature enters or attacks, exile up to one target card from a graveyard and create a Food token.\nFoods you control have all activated abilities of all creature cards exiled with this creature.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'triggered', controller: 'any', zones: ['graveyard', 'exile'],
        targetFilters: ['up to one target card from a graveyard'], answerAxes: ['graveyard_or_protection'],
        prerequisites: ['this creature enters or attacks'],
        cost: { mana: 4, colored: ['B'] }, timing: { earliestTurn: 4, interval: 1 },
        produces: ['food'], outputBounds: { min: 1, max: 1, unit: 'cards answered' },
      },
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield', 'exile'],
        requiredSupply: [{ resource: 'food', copies: 1 }, { resource: 'creature activated ability', copies: 1 }],
        cost: { mana: 4, colored: ['B'] }, timing: { earliestTurn: 5, interval: 1 },
        consumes: ['food'], produces: ['granted activated abilities'],
        outputBounds: { min: 1, max: null, unit: 'activations' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 4, colored: ['B'] },
        timing: { earliestTurn: 4, interval: 1, summoningSickness: true },
        produces: ['pressure', 'menace'], outputBounds: { min: 3, max: 3, unit: 'power' },
      },
    ],
  },
];
