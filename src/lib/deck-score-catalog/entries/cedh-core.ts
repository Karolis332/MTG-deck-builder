/**
 * Seed catalogue entries — the cards docs/DECK_SCORE_SPEC.md §8 names by hand.
 * Mechanics only; no scores, tiers or inclusion rates. Oracle text is the
 * reviewed snapshot (card data 2026-09-19) and is hashed at load time: a
 * printing whose live text no longer matches degrades to the regex fallback
 * instead of claiming coverage.
 */
import type { CatalogEntry } from '../schema';

const P = { source: 'oracle text, card data 2026-09-19', reviewedBy: 'deck-score v1.2 slice A', reviewedAt: '2026-09-20' };

export const CEDH_CORE: readonly CatalogEntry[] = [
  {
    canonicalName: 'Ad Nauseam',
    oracleText: 'Reveal the top card of your library and put that card into your hand. You lose life equal to its mana value. You may repeat this process any number of times.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'advantage', mode: 'cast', controller: 'self', zones: ['library', 'hand'],
      prerequisites: ['life total exceeds the revealed mana values'],
      cost: { mana: 5, colored: ['B', 'B'] },
      timing: { earliestTurn: 5, instantSpeed: true },
      produces: ['cards'], consumes: ['life'],
      outputBounds: { min: 4, max: null, unit: 'net cards' },
    }],
  },
  {
    canonicalName: 'Necropotence',
    oracleText: 'Skip your draw step.\nWhenever you discard a card, exile that card from your graveyard.\nPay 1 life: Exile the top card of your library face down. Put that card into your hand at the beginning of your next end step.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'advantage', mode: 'activated', controller: 'self', zones: ['library', 'exile', 'hand'],
      prerequisites: ['life to pay'],
      cost: { mana: 0, additional: ['1 life per card'] },
      timing: { earliestTurn: 3, interval: 1 },
      produces: ['cards'], consumes: ['life', 'draw step'],
      outputBounds: { min: 1, max: null, unit: 'delayed cards per turn' },
    }],
  },
  {
    canonicalName: 'Rhystic Study',
    oracleText: 'Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'advantage', mode: 'triggered', controller: 'opponent',
      prerequisites: ['opponent declines to pay {1}'],
      cost: { mana: 3, colored: ['U'] },
      timing: { earliestTurn: 3, interval: 1 },
      produces: ['cards'],
      outputBounds: { min: 0, max: null, unit: 'cards per opponent spell' },
      availabilityPrior: 0.5,
    }],
  },
  {
    canonicalName: 'Mystic Remora',
    oracleText: 'Cumulative upkeep {1} (At the beginning of your upkeep, put an age counter on this permanent, then sacrifice it unless you pay its upkeep cost for each age counter on it.)\nWhenever an opponent casts a noncreature spell, you may draw a card unless that player pays {4}.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'advantage', mode: 'triggered', controller: 'opponent',
      prerequisites: ['opponent casts a NONCREATURE spell and declines to pay {4}', 'cumulative upkeep paid'],
      cost: { mana: 1, colored: ['U'], additional: ['cumulative upkeep {1}'] },
      timing: { earliestTurn: 1, interval: 1 },
      produces: ['cards'], consumes: ['mana'],
      outputBounds: { min: 0, max: null, unit: 'cards per opponent noncreature spell' },
      availabilityPrior: 0.5,
    }],
  },
  {
    canonicalName: 'Underworld Breach',
    oracleText: "Each nonland card in your graveyard has escape. The escape cost is equal to the card's mana cost plus exile three other cards from your graveyard. (You may cast cards from your graveyard for their escape cost.)\nAt the beginning of the end step, sacrifice this enchantment.",
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'static', controller: 'self', zones: ['graveyard'],
      requiredSupply: [{ resource: 'graveyard fuel', copies: 3 }],
      cost: { mana: 2, colored: ['R'] },
      timing: { earliestTurn: 2, interval: 1 },
      consumes: ['graveyard cards'], produces: ['recast nonland spells'],
      outputBounds: { min: 1, max: null, unit: 'recasts per 3 exiled cards' },
    }],
  },
  {
    canonicalName: "Sensei's Divining Top",
    oracleText: "{1}: Look at the top three cards of your library, then put them back in any order.\n{T}: Draw a card, then put this artifact on top of its owner's library.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'advantage', mode: 'activated', controller: 'self', zones: ['library'],
        cost: { mana: 1 }, timing: { earliestTurn: 1, interval: 1, instantSpeed: true },
        produces: ['selection'], outputBounds: { min: 0, max: 0, unit: 'net cards' },
        sharedModeBudget: 'top',
      },
      {
        family: 'advantage', mode: 'activated', controller: 'self', zones: ['library'],
        prerequisites: ['shuffle or replay to repeat'],
        cost: { mana: 0, additional: ['{T}', 'return to library'] },
        timing: { earliestTurn: 1, interval: 1, instantSpeed: true },
        produces: ['cards'], outputBounds: { min: 1, max: 1, unit: 'net cards' },
        sharedModeBudget: 'top',
      },
    ],
  },
  {
    canonicalName: 'Dockside Extortionist',
    oracleText: 'When this creature enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'mana', mode: 'etb', controller: 'opponent', zones: ['battlefield'],
      prerequisites: ['opponents control artifacts/enchantments'],
      cost: { mana: 2, colored: ['R'] },
      timing: { earliestTurn: 2 },
      produces: ['treasure'], outputBounds: { min: 0, max: null, unit: 'treasure tokens' },
      availabilityPrior: 0.5,
    }],
  },
  {
    canonicalName: "Thassa's Oracle",
    oracleText: 'When this creature enters, look at the top X cards of your library, where X is your devotion to blue. Put up to one of them on top of your library and the rest on the bottom of your library in a random order. If X is greater than or equal to the number of cards in your library, you win the game.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'etb', controller: 'self', zones: ['library'],
      prerequisites: ['library size <= devotion to blue'],
      requiredSupply: [{ resource: 'library emptier', copies: 1 }],
      cost: { mana: 2, colored: ['U', 'U'] },
      timing: { earliestTurn: 2 },
      produces: ['alternate win'], outputBounds: { min: 1, max: 1, unit: 'game win' },
    }],
  },
  {
    canonicalName: 'Demonic Consultation',
    oracleText: 'Choose a card name. Exile the top six cards of your library, then reveal cards from the top of your library until you reveal a card with the chosen name. Put that card into your hand and exile all other cards revealed this way.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'tutor', mode: 'cast', controller: 'self', zones: ['library', 'hand', 'exile'],
      targetFilters: ['any card name'],
      cost: { mana: 1, colored: ['B'] },
      timing: { earliestTurn: 1, instantSpeed: true },
      consumes: ['library'], produces: ['named card', 'empty library'],
      outputBounds: { min: 1, max: 1, unit: 'tutored card' },
    }],
  },
  {
    canonicalName: 'Dramatic Reversal',
    oracleText: 'Untap all nonland permanents you control.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'mana', mode: 'cast', controller: 'self', zones: ['battlefield'],
      requiredSupply: [{ resource: 'nonland mana producer', copies: 3 }],
      cost: { mana: 2, colored: ['U'] },
      timing: { earliestTurn: 2, instantSpeed: true },
      produces: ['untap'], outputBounds: { min: 0, max: null, unit: 'mana from untapped nonlands' },
    }],
  },
  {
    canonicalName: 'Isochron Scepter',
    oracleText: 'Imprint — When this artifact enters, you may exile an instant card with mana value 2 or less from your hand.\n{2}, {T}: You may copy the exiled card. If you do, you may cast the copy without paying its mana cost.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'activated', controller: 'self', zones: ['exile', 'hand'],
      prerequisites: ['an instant with mana value <= 2 in hand on ETB'],
      requiredSupply: [{ resource: 'instant mv<=2', copies: 1 }],
      cost: { mana: 2, additional: ['{T}', 'imprint an instant'] },
      timing: { earliestTurn: 3, interval: 1, summoningSickness: false },
      produces: ['free copy of the imprinted instant'],
      outputBounds: { min: 1, max: 1, unit: 'copies per activation' },
    }],
  },
  {
    canonicalName: 'Meren of Clan Nel Toth',
    oracleText: "Whenever another creature you control dies, you get an experience counter.\nAt the beginning of your end step, choose target creature card in your graveyard. If that card's mana value is less than or equal to the number of experience counters you have, return it to the battlefield. Otherwise, put it into your hand.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'triggered', controller: 'self', zones: ['battlefield', 'graveyard'],
        requiredSupply: [{ resource: 'creature', copies: 8 }],
        cost: { mana: 4, colored: ['B', 'G'] },
        timing: { earliestTurn: 4, interval: 1 },
        consumes: ['creature deaths'], produces: ['experience counters'],
        outputBounds: { min: 1, max: null, unit: 'counters per death' },
      },
      {
        family: 'engine', mode: 'triggered', controller: 'self', zones: ['graveyard', 'battlefield'],
        targetFilters: ['creature card in your graveyard'],
        requiredSupply: [{ resource: 'creature in graveyard', copies: 1 }],
        cost: { mana: 0 },
        timing: { earliestTurn: 5, oncePerTurn: true, interval: 1 },
        produces: ['recursion'], outputBounds: { min: 1, max: 1, unit: 'creatures returned per turn' },
      },
    ],
  },
  {
    canonicalName: 'Viscera Seer',
    oracleText: 'Sacrifice a creature: Scry 1.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'engine', mode: 'activated', controller: 'self', zones: ['battlefield'],
      requiredSupply: [{ resource: 'creature', copies: 8 }],
      cost: { mana: 1, colored: ['B'], additional: ['sacrifice a creature'] },
      timing: { earliestTurn: 1, interval: 1, summoningSickness: false, instantSpeed: true },
      consumes: ['creature'], produces: ['sacrifice outlet', 'selection'],
      outputBounds: { min: 0, max: 0, unit: 'net cards' },
    }],
  },
  {
    canonicalName: 'Blood Artist',
    oracleText: 'Whenever this creature or another creature dies, target player loses 1 life and you gain 1 life.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'triggered', controller: 'any', zones: ['battlefield'],
      targetFilters: ['player'],
      requiredSupply: [{ resource: 'creature deaths', copies: 8 }],
      cost: { mana: 2, colored: ['B'] },
      timing: { earliestTurn: 2, interval: 1 },
      consumes: ['creature deaths'], produces: ['single-target drain'],
      outputBounds: { min: 1, max: 1, unit: 'life lost per death, one opponent' },
    }],
  },
  {
    canonicalName: 'Zulaport Cutthroat',
    oracleText: 'Whenever this creature or another creature you control dies, each opponent loses 1 life and you gain 1 life.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
      requiredSupply: [{ resource: 'creature deaths', copies: 8 }],
      cost: { mana: 2, colored: ['B'] },
      timing: { earliestTurn: 2, interval: 1 },
      consumes: ['creature deaths'], produces: ['all-opponent drain'],
      outputBounds: { min: 1, max: 1, unit: 'life lost per death, every opponent' },
    }],
  },
  {
    canonicalName: 'Sakura-Tribe Elder',
    oracleText: 'Sacrifice this creature: Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.',
    provenance: P, knowledge: 'known',
    effects: [{
      family: 'mana', mode: 'activated', controller: 'self', zones: ['library', 'battlefield'],
      targetFilters: ['basic land card'],
      cost: { mana: 2, colored: ['G'], additional: ['sacrifice this creature'] },
      timing: { earliestTurn: 2, summoningSickness: false, instantSpeed: true },
      consumes: ['this creature'], produces: ['tapped basic land'],
      outputBounds: { min: 1, max: 1, unit: 'lands' },
    }],
  },
];
