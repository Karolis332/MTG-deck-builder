/**
 * Curated batch B1 — the cEDH cards `generate.ts` leaves `partial`, in
 * descending list frequency from `coverage.md --set cedh --queue`. Each turns
 * on a mechanic the oracle parser cannot ground: a free/alternate cast cost,
 * a deferred cost, a stax lock, or a replacement effect. Mechanics only — no
 * tiers, no inclusion rates (§8). `oracleText` is the live text they were
 * typed against (card data 2026-09-19); a printing whose text drifts is
 * reported stale and falls back to the regex path instead of claiming it.
 */
import type { CatalogEntry } from '../schema';

const P = { source: 'oracle text, card data 2026-09-19', reviewedBy: 'deck-score v1.2 slice B', reviewedAt: '2026-09-20' };

export const CEDH_STAPLES_B1: readonly CatalogEntry[] = [
  {
    canonicalName: 'Fierce Guardianship',
    oracleText: 'If you control a commander, you may cast this spell without paying its mana cost.\nCounter target noncreature spell.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'alternate_cost', controller: 'self', zones: ['stack'],
        targetFilters: ['target noncreature spell'], answerAxes: ['stack'],
        prerequisites: ['you control a commander'],
        cost: { mana: 0 }, timing: { earliestTurn: 1, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'spells answered' }, sharedModeBudget: 'counter',
      },
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['stack'],
        targetFilters: ['target noncreature spell'], answerAxes: ['stack'],
        cost: { mana: 3, colored: ['U'] }, timing: { earliestTurn: 3, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'spells answered' }, sharedModeBudget: 'counter',
      },
    ],
  },
  {
    canonicalName: 'Force of Will',
    oracleText: "You may pay 1 life and exile a blue card from your hand rather than pay this spell's mana cost.\nCounter target spell.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'alternate_cost', controller: 'self', zones: ['stack', 'hand'],
        targetFilters: ['target spell'], answerAxes: ['stack'],
        requiredSupply: [{ resource: 'blue card in hand', copies: 1 }],
        cost: { mana: 0, additional: ['1 life', 'exile a blue card from hand'] },
        timing: { earliestTurn: 1, instantSpeed: true },
        consumes: ['cards'], outputBounds: { min: 1, max: 1, unit: 'spells answered' }, sharedModeBudget: 'counter',
      },
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['stack'],
        targetFilters: ['target spell'], answerAxes: ['stack'],
        cost: { mana: 5, colored: ['U', 'U'] }, timing: { earliestTurn: 5, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'spells answered' }, sharedModeBudget: 'counter',
      },
    ],
  },
  {
    canonicalName: 'Force of Negation',
    oracleText: "If it's not your turn, you may exile a blue card from your hand rather than pay this spell's mana cost.\nCounter target noncreature spell. If that spell is countered this way, exile it instead of putting it into its owner's graveyard.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'alternate_cost', controller: 'self', zones: ['stack', 'hand'],
        targetFilters: ['target noncreature spell'], answerAxes: ['stack'],
        prerequisites: ["it's not your turn"],
        requiredSupply: [{ resource: 'blue card in hand', copies: 1 }],
        cost: { mana: 0, additional: ['exile a blue card from hand'] },
        timing: { earliestTurn: 1, instantSpeed: true },
        consumes: ['cards'], outputBounds: { min: 1, max: 1, unit: 'spells answered' }, sharedModeBudget: 'counter',
      },
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['stack'],
        targetFilters: ['target noncreature spell'], answerAxes: ['stack'],
        cost: { mana: 3, colored: ['U', 'U'] }, timing: { earliestTurn: 3, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'spells answered' }, sharedModeBudget: 'counter',
      },
    ],
  },
  {
    canonicalName: 'Mindbreak Trap',
    oracleText: "If an opponent cast three or more spells this turn, you may pay {0} rather than pay this spell's mana cost.\nExile any number of target spells.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'alternate_cost', controller: 'opponent', zones: ['stack'],
        targetFilters: ['any number of target spells'], answerAxes: ['stack'],
        prerequisites: ['an opponent cast three or more spells this turn'],
        cost: { mana: 0 }, timing: { earliestTurn: 1, instantSpeed: true },
        outputBounds: { min: 1, max: null, unit: 'spells answered' },
        sharedModeBudget: 'exile-spells', availabilityPrior: 0.5,
      },
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['stack'],
        targetFilters: ['any number of target spells'], answerAxes: ['stack'],
        cost: { mana: 4, colored: ['U', 'U'] }, timing: { earliestTurn: 4, instantSpeed: true },
        outputBounds: { min: 1, max: null, unit: 'spells answered' }, sharedModeBudget: 'exile-spells',
      },
    ],
  },
  {
    canonicalName: 'Pact of Negation',
    oracleText: 'Counter target spell.\nAt the beginning of your next upkeep, pay {3}{U}{U}. If you don\'t, you lose the game.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['stack'],
        targetFilters: ['target spell'], answerAxes: ['stack'],
        prerequisites: ['{3}{U}{U} available on your next upkeep or you lose the game'],
        cost: { mana: 0, additional: ['deferred {3}{U}{U} next upkeep'] },
        timing: { earliestTurn: 1, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'spells answered' },
      },
    ],
  },
  {
    canonicalName: 'Deadly Rollick',
    oracleText: 'If you control a commander, you may cast this spell without paying its mana cost.\nExile target creature.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'alternate_cost', controller: 'self', zones: ['battlefield'],
        targetFilters: ['target creature'], answerAxes: ['creature'],
        prerequisites: ['you control a commander'],
        cost: { mana: 0 }, timing: { earliestTurn: 1, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'permanents answered' }, sharedModeBudget: 'exile-creature',
      },
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['battlefield'],
        targetFilters: ['target creature'], answerAxes: ['creature'],
        cost: { mana: 4, colored: ['B'] }, timing: { earliestTurn: 4, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'permanents answered' }, sharedModeBudget: 'exile-creature',
      },
    ],
  },
  {
    canonicalName: 'Mox Diamond',
    oracleText: "If this artifact would enter, you may discard a land card instead. If you do, put this artifact onto the battlefield. If you don't, put it into its owner's graveyard.\n{T}: Add one mana of any color.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'activated', controller: 'self', zones: ['battlefield'],
        requiredSupply: [{ resource: 'land card in hand', copies: 1 }],
        cost: { mana: 0, additional: ['discard a land card'] },
        timing: { earliestTurn: 1, interval: 1, instantSpeed: true },
        consumes: ['cards'], produces: ['mana'], outputBounds: { min: 1, max: 1, unit: 'mana' },
      },
    ],
  },
  {
    canonicalName: 'Mox Amber',
    oracleText: '{T}: Add one mana of any color among legendary creatures and planeswalkers you control.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'activated', controller: 'self', zones: ['battlefield'],
        prerequisites: ['a legendary creature or planeswalker you control'],
        requiredSupply: [{ resource: 'legendary permanent', copies: 1 }],
        cost: { mana: 0 }, timing: { earliestTurn: 1, interval: 1, instantSpeed: true },
        produces: ['mana'], outputBounds: { min: 0, max: 1, unit: 'mana' },
      },
    ],
  },
  {
    canonicalName: 'Veil of Summer',
    oracleText: "Draw a card if an opponent has cast a blue or black spell this turn. Spells you control can't be countered this turn. You and permanents you control gain hexproof from blue and from black until end of turn. (You and they can't be the targets of blue or black spells or abilities your opponents control.)",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'self', answerAxes: ['graveyard_or_protection'],
        prerequisites: ['effect lasts one turn'],
        cost: { mana: 1, colored: ['G'] }, timing: { earliestTurn: 1, instantSpeed: true },
        produces: ['protection'], outputBounds: { min: 1, max: null, unit: 'spells protected' },
      },
      {
        family: 'advantage', mode: 'cast', controller: 'opponent',
        prerequisites: ['an opponent has cast a blue or black spell this turn'],
        cost: { mana: 1, colored: ['G'] }, timing: { earliestTurn: 1, instantSpeed: true },
        produces: ['cards'], outputBounds: { min: 0, max: 1, unit: 'cards' }, availabilityPrior: 0.5,
      },
    ],
  },
  {
    canonicalName: 'Grand Abolisher',
    oracleText: "During your turn, your opponents can't cast spells or activate abilities of artifacts, creatures, or enchantments.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'static', controller: 'opponent', zones: ['battlefield'],
        answerAxes: ['stack', 'graveyard_or_protection'],
        prerequisites: ['your turn only'],
        cost: { mana: 2, colored: ['W', 'W'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: false },
        produces: ['protection'], outputBounds: { min: 1, max: null, unit: 'spells answered' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 2, colored: ['W', 'W'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Seedborn Muse',
    oracleText: 'Untap all permanents you control during each other player\'s untap step.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['permanents that tap for value'],
        requiredSupply: [{ resource: 'tap ability', copies: 1 }],
        cost: { mana: 5, colored: ['G', 'G'] },
        timing: { earliestTurn: 5, interval: 1, summoningSickness: true },
        produces: ['untap step', 'mana'], outputBounds: { min: 1, max: null, unit: 'extra untaps per round' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 5, colored: ['G', 'G'] },
        timing: { earliestTurn: 5, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Training Grounds',
    oracleText: "Activated abilities of creatures you control cost {2} less to activate. This effect can't reduce the mana in that cost to less than one mana.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['creatures with activated abilities'],
        requiredSupply: [{ resource: 'creature activated ability', copies: 2 }],
        cost: { mana: 1, colored: ['U'] }, timing: { earliestTurn: 1, interval: 1 },
        produces: ['cost reduction'], outputBounds: { min: 1, max: 2, unit: 'mana saved per activation' },
      },
    ],
  },
  {
    canonicalName: "Biomancer's Familiar",
    oracleText: "Activated abilities of creatures you control cost {2} less to activate. This effect can't reduce the mana in that cost to less than one mana.\n{T}: The next time target creature adapts this turn, it adapts as though it had no +1/+1 counters on it.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['creatures with activated abilities'],
        requiredSupply: [{ resource: 'creature activated ability', copies: 2 }],
        cost: { mana: 2, colored: ['G', 'U'] }, timing: { earliestTurn: 2, interval: 1 },
        produces: ['cost reduction'], outputBounds: { min: 1, max: 2, unit: 'mana saved per activation' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 2, colored: ['G', 'U'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Kinnan, Bonder Prodigy',
    oracleText: 'Whenever you tap a nonland permanent for mana, add one mana of any type that permanent produced.\n{5}{G}{U}: Look at the top five cards of your library. You may put a non-Human creature card from among them onto the battlefield. Put the rest on the bottom of your library in a random order.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'mana', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        prerequisites: ['you tap a nonland permanent for mana'],
        requiredSupply: [{ resource: 'nonland mana producer', copies: 2 }],
        cost: { mana: 2, colored: ['G', 'U'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['mana'], outputBounds: { min: 1, max: 1, unit: 'extra mana per tap' },
      },
      {
        family: 'tutor', mode: 'activated', controller: 'self', zones: ['library', 'battlefield'],
        targetFilters: ['non-Human creature card'],
        cost: { mana: 7, colored: ['G', 'U'] }, timing: { earliestTurn: 7, interval: 1 },
        produces: ['permanent'], outputBounds: { min: 0, max: 1, unit: 'permanents' },
      },
    ],
  },
  {
    canonicalName: 'Delney, Streetwise Lookout',
    oracleText: "Creatures you control with power 2 or less can't be blocked by creatures with power 3 or greater.\nIf a triggered ability of a creature you control with power 2 or less triggers, that ability triggers an additional time.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['creatures with power 2 or less that carry triggered abilities'],
        requiredSupply: [{ resource: 'small creature trigger', copies: 2 }],
        cost: { mana: 3, colored: ['W'] },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: true },
        produces: ['doubled triggers'], outputBounds: { min: 1, max: null, unit: 'extra triggers' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 3, colored: ['W'] },
        timing: { earliestTurn: 3, interval: 1, summoningSickness: true },
        produces: ['pressure', 'evasion'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
];
