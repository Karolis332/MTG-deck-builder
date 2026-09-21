/**
 * Batch 6 — the closing-combo cards `deck-score-catalog/combos.ts` names that
 * the generator could not type. docs/DECK_SCORE_SPEC.md §8 / §10.6.1.
 *
 * Mechanics only; no scores, tiers or inclusion rates. Oracle text is the
 * reviewed snapshot (card data 2026-09-19) and is hashed at load time: a
 * printing whose live text no longer matches degrades to the regex fallback
 * instead of claiming coverage.
 */
import type { CatalogEntry } from '../schema';

const P = { source: 'oracle text, card data 2026-09-19', reviewedBy: 'deck-score v1.4 stage 1a', reviewedAt: '2026-09-21' };

export const CEDH_COMBOS_B6: readonly CatalogEntry[] = [
  {
    canonicalName: 'Vizier of Remedies',
    oracleText: 'If one or more -1/-1 counters would be put on a creature you control, that many -1/-1 counters minus one are put on it instead.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield'],
      cost: { mana: 2, colored: ['W'] },
      timing: { earliestTurn: 2 },
      produces: ['-1/-1 counter replacement'],
      outputBounds: { min: 1, max: 1, unit: '-1/-1 counters removed per event' },
    }],
  },
  {
    canonicalName: 'Mikaeus, the Unhallowed',
    oracleText: "Intimidate (This creature can't be blocked except by artifact creatures and/or creatures that share a color with it.)\nWhenever a Human deals damage to you, destroy it.\nOther non-Human creatures you control get +1/+1 and have undying. (When a creature with undying dies, if it had no +1/+1 counters on it, return it to the battlefield under its owner's control with a +1/+1 counter on it.)",
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield', 'graveyard'],
      prerequisites: ['the dying creature is not a Human and carries no +1/+1 counter'],
      cost: { mana: 6, colored: ['B', 'B', 'B'] },
      timing: { earliestTurn: 6 },
      produces: ['creature recursion', '+1/+1 counter'],
      outputBounds: { min: 1, max: 1, unit: 'returns per non-Human death' },
    }],
  },
  {
    canonicalName: 'Eternal Scourge',
    oracleText: 'You may cast this card from exile.\nWhen this creature becomes the target of a spell or ability an opponent controls, exile this creature.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'alternate_cost', controller: 'self', zones: ['exile', 'battlefield'],
      cost: { mana: 3 },
      timing: { earliestTurn: 3 },
      produces: ['recastable body from exile'],
      outputBounds: { min: 1, max: null, unit: 'casts from exile' },
    }],
  },
  {
    canonicalName: 'Misthollow Griffin',
    oracleText: 'Flying\nYou may cast this card from exile.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'alternate_cost', controller: 'self', zones: ['exile', 'battlefield'],
      cost: { mana: 4, colored: ['U', 'U'] },
      timing: { earliestTurn: 4 },
      produces: ['recastable body from exile'],
      outputBounds: { min: 1, max: null, unit: 'casts from exile' },
    }],
  },
  {
    canonicalName: 'Combat Celebrant',
    oracleText: "If this creature hasn't been exerted this turn, you may exert it as it attacks. When you do, untap all other creatures you control and after this phase, there is an additional combat phase. (An exerted creature won't untap during your next untap step.)",
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'triggered', controller: 'self', zones: ['battlefield'],
      prerequisites: ['it attacks and has not been exerted this turn'],
      cost: { mana: 3, colored: ['R'], additional: ['exert'] },
      timing: { earliestTurn: 3, oncePerTurn: true, summoningSickness: true },
      produces: ['untap', 'additional combat phase'],
      outputBounds: { min: 1, max: 1, unit: 'extra combats per turn' },
    }],
  },
  {
    canonicalName: 'Godo, Bandit Warlord',
    oracleText: 'When Godo enters, you may search your library for an Equipment card, put it onto the battlefield, then shuffle.\nWhenever Godo attacks for the first time each turn, untap it and all Samurai you control. After this phase, there is an additional combat phase.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'tutor', mode: 'etb', controller: 'self', zones: ['library', 'battlefield'],
        targetFilters: ['Equipment'],
        cost: { mana: 6, colored: ['R'] },
        timing: { earliestTurn: 6 },
        produces: ['Equipment onto the battlefield'],
        outputBounds: { min: 0, max: 1, unit: 'Equipment onto the battlefield' },
      },
      {
        family: 'engine', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        prerequisites: ['Godo attacks for the first time this turn'],
        cost: { mana: 0 },
        timing: { earliestTurn: 7, oncePerTurn: true, summoningSickness: true },
        produces: ['untap', 'additional combat phase'],
        outputBounds: { min: 1, max: 1, unit: 'extra combats per Godo per turn' },
      },
    ],
  },
  {
    canonicalName: 'Palinchron',
    oracleText: "Flying\nWhen this creature enters, untap up to seven lands.\n{2}{U}{U}: Return this creature to its owner's hand.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'etb', controller: 'self', zones: ['battlefield'],
        requiredSupply: [{ resource: 'land', copies: 7 }],
        cost: { mana: 7, colored: ['U', 'U'] },
        timing: { earliestTurn: 7 },
        produces: ['untapped lands'],
        outputBounds: { min: 0, max: 7, unit: 'lands untapped' },
      },
      {
        family: 'engine', mode: 'activated', controller: 'self', zones: ['battlefield', 'hand'],
        cost: { mana: 4, colored: ['U', 'U'] },
        timing: { earliestTurn: 7, instantSpeed: true, interval: 1 },
        produces: ['self bounce'],
        outputBounds: { min: 1, max: 1, unit: 'self bounces per activation' },
      },
    ],
  },
  {
    canonicalName: 'Altar of Dementia',
    oracleText: "Sacrifice a creature: Target player mills cards equal to the sacrificed creature's power.",
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'activated', controller: 'self', zones: ['battlefield', 'graveyard', 'library'],
      requiredSupply: [{ resource: 'creature', copies: 1 }],
      cost: { mana: 2, additional: ['sacrifice a creature'] },
      timing: { earliestTurn: 2, interval: 1 },
      consumes: ['creature'], produces: ['mill', 'creature in graveyard'],
      outputBounds: { min: 0, max: null, unit: 'cards milled per sacrifice' },
    }],
  },
  {
    canonicalName: 'Torment of Hailfire',
    oracleText: 'Repeat the following process X times. Each opponent loses 3 life unless that player sacrifices a nonland permanent of their choice or discards a card.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'cast', controller: 'opponent', zones: ['battlefield', 'hand'],
      prerequisites: ['X paid from available mana'],
      cost: { mana: 2, colored: ['B', 'B'] },
      timing: { earliestTurn: 4 },
      produces: ['life loss', 'opponent sacrifice', 'opponent discard'],
      outputBounds: { min: 0, max: null, unit: 'life lost per X across each opponent' },
    }],
  },
  {
    canonicalName: 'Crackle with Power',
    oracleText: 'Crackle with Power deals five times X damage to each of up to X targets.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'cast', controller: 'any', zones: ['battlefield', 'stack'],
      prerequisites: ['X paid three times from available mana'],
      cost: { mana: 2, colored: ['R', 'R'] },
      timing: { earliestTurn: 5 },
      produces: ['damage'],
      outputBounds: { min: 5, max: null, unit: 'damage per target' },
    }],
  },
  {
    canonicalName: 'Fireball',
    oracleText: 'This spell costs {1} more to cast for each target beyond the first.\nFireball deals X damage divided evenly, rounded down, among any number of targets.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'cast', controller: 'any', zones: ['battlefield', 'stack'],
      prerequisites: ['X paid from available mana, plus {1} per extra target'],
      cost: { mana: 1, colored: ['R'] },
      timing: { earliestTurn: 2 },
      produces: ['damage'],
      outputBounds: { min: 0, max: null, unit: 'damage split among any number of targets' },
    }],
  },
  {
    canonicalName: 'Beseech the Mirror',
    oracleText: "Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.)\nSearch your library for a card, exile it face down, then shuffle. If this spell was bargained, you may cast the exiled card without paying its mana cost if that spell's mana value is 4 or less. Put the exiled card into your hand if it wasn't cast this way.",
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'tutor', mode: 'cast', controller: 'self', zones: ['library', 'exile', 'hand'],
      targetFilters: [],
      prerequisites: ['bargain an artifact, enchantment or token to cast the exiled card for free at mana value 4 or less'],
      cost: { mana: 4, colored: ['B', 'B', 'B'], additional: ['bargain'] },
      timing: { earliestTurn: 4 },
      produces: ['any card to hand', 'free cast at mana value 4 or less'],
      outputBounds: { min: 1, max: 1, unit: 'cards found per cast' },
    }],
  },
];
