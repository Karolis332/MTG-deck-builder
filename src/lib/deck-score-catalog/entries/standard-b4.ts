/**
 * Curated batch B4 — the global work queue's top uncovered cards
 * (`coverage.md`), the Standard/Commander cards whose text the parser
 * refuses: nested triggers, loyalty-dependent CDAs, replacement effects and
 * spree/teamwork modes. Mechanics only (§8); `oracleText` is the live text
 * (card data 2026-09-19), hashed at load time.
 */
import type { CatalogEntry } from '../schema';

const P = { source: 'oracle text, card data 2026-09-19', reviewedBy: 'deck-score v1.2 slice B round 2', reviewedAt: '2026-09-20' };

export const STANDARD_B4: readonly CatalogEntry[] = [
  {
    canonicalName: 'Thorin, Mountain-king',
    oracleText: 'Trample\nWhen Thorin enters, attach any number of target Equipment you control to target creature you control. When one or more Equipment become attached to that creature this way, that creature deals damage equal to its power to up to one target creature.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'etb', controller: 'any', zones: ['battlefield'],
        targetFilters: ['up to one target creature'], answerAxes: ['creature'],
        prerequisites: ['an Equipment you control to move', 'a creature to attach it to'],
        requiredSupply: [{ resource: 'equipment', copies: 1 }],
        cost: { mana: 4, colored: ['R'] }, timing: { earliestTurn: 4 },
        outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 4, colored: ['R'] },
        timing: { earliestTurn: 4, interval: 1, summoningSickness: true },
        produces: ['pressure', 'trample'], outputBounds: { min: 3, max: 3, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Kaito, Bane of Nightmares',
    oracleText: 'Ninjutsu {1}{U}{B} ({1}{U}{B}, Return an unblocked attacker you control to hand: Put this card onto the battlefield from your hand tapped and attacking.)\nDuring your turn, as long as Kaito has one or more loyalty counters on him, he\'s a 3/4 Ninja creature and has hexproof.\n+1: You get an emblem with "Ninjas you control get +1/+1."\n0: Surveil 2. Then draw a card for each opponent who lost life this turn.\n−2: Tap target creature. Put two stun counters on it.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'advantage', mode: 'activated', controller: 'self', zones: ['library', 'hand'],
        prerequisites: ['an opponent lost life this turn for the draw'],
        cost: { mana: 0, additional: ['loyalty'] },
        timing: { earliestTurn: 4, interval: 1, oncePerTurn: true },
        produces: ['selection', 'cards'], outputBounds: { min: 0, max: null, unit: 'cards per turn' },
      },
      {
        family: 'answer', mode: 'activated', controller: 'any', zones: ['battlefield'],
        targetFilters: ['target creature'], answerAxes: ['creature'],
        prerequisites: ['two loyalty', 'stun counters only delay the creature'],
        cost: { mana: 0, additional: ['loyalty'] },
        timing: { earliestTurn: 4, oncePerTurn: true },
        outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['your turn only', 'loyalty counters remain'],
        cost: { mana: 4, colored: ['U', 'B'] },
        timing: { earliestTurn: 4, interval: 1 },
        produces: ['pressure', 'hexproof'], outputBounds: { min: 3, max: 3, unit: 'power' },
      },
      {
        family: 'closing', mode: 'alternate_cost', controller: 'self', zones: ['hand', 'battlefield'],
        prerequisites: ['an unblocked attacker you control to return'],
        requiredSupply: [{ resource: 'evasive creature', copies: 1 }],
        cost: { mana: 3, colored: ['U', 'B'], additional: ['return an unblocked attacker'] },
        timing: { earliestTurn: 3 },
        produces: ['pressure'], outputBounds: { min: 3, max: 3, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Deadly Cover-Up',
    oracleText: 'As an additional cost to cast this spell, you may collect evidence 6.\nDestroy all creatures. If evidence was collected, exile a card from an opponent\'s graveyard. Then search its owner\'s graveyard, hand, and library for any number of cards with that name and exile them. That player shuffles, then draws a card for each card exiled from their hand this way.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'any', zones: ['battlefield'],
        targetFilters: ['all creatures'], answerAxes: ['creature'],
        cost: { mana: 5, colored: ['B', 'B'] }, timing: { earliestTurn: 5 },
        outputBounds: { min: 2, max: null, unit: 'permanents answered' },
      },
      {
        family: 'answer', mode: 'cast', controller: 'opponent', zones: ['graveyard', 'library', 'hand'],
        answerAxes: ['graveyard_or_protection'],
        prerequisites: ['evidence 6 collected'],
        cost: { mana: 5, colored: ['B', 'B'], additional: ['exile 6 mana value from your graveyard'] },
        timing: { earliestTurn: 5 },
        outputBounds: { min: 1, max: null, unit: 'cards answered' },
      },
    ],
  },
  {
    canonicalName: 'Political Triumph',
    oracleText: 'Whenever a creature you control enters, scry 1 and put a plan counter on this enchantment.\nWhen the fourth plan counter is put on this enchantment, sacrifice it, draw a card, and put a +1/+1 counter on each creature you control.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'advantage', mode: 'triggered', controller: 'self', zones: ['library'],
        prerequisites: ['a creature you control enters'],
        requiredSupply: [{ resource: 'creature', copies: 4 }],
        cost: { mana: 1, colored: ['W'] }, timing: { earliestTurn: 1, interval: 1 },
        produces: ['selection'], outputBounds: { min: 0, max: 0, unit: 'net cards' },
      },
      {
        family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        prerequisites: ['four creatures have entered since this resolved'],
        requiredSupply: [{ resource: 'creature', copies: 4 }],
        cost: { mana: 1, colored: ['W'] }, timing: { earliestTurn: 4 },
        produces: ['cards', '+1/+1 counters'], outputBounds: { min: 1, max: null, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Three Steps Ahead',
    oracleText: 'Spree (Choose one or more additional costs.)\n+ {1}{U} — Counter target spell.\n+ {3} — Create a token that\'s a copy of target artifact or creature you control.\n+ {2} — Draw two cards, then discard a card.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['stack'],
        targetFilters: ['target spell'], answerAxes: ['stack'],
        cost: { mana: 3, colored: ['U', 'U'] }, timing: { earliestTurn: 3, instantSpeed: true },
        outputBounds: { min: 1, max: 1, unit: 'spells answered' }, sharedModeBudget: 'spree',
      },
      {
        family: 'engine', mode: 'cast', controller: 'self', zones: ['battlefield'],
        targetFilters: ['target artifact or creature you control'],
        requiredSupply: [{ resource: 'permanent worth copying', copies: 1 }],
        cost: { mana: 4, colored: ['U'] }, timing: { earliestTurn: 4, instantSpeed: true },
        produces: ['copy'], outputBounds: { min: 1, max: 1, unit: 'copied permanents' }, sharedModeBudget: 'spree',
      },
      {
        family: 'advantage', mode: 'cast', controller: 'self', zones: ['hand'],
        cost: { mana: 3, colored: ['U'] }, timing: { earliestTurn: 3, instantSpeed: true },
        produces: ['cards'], outputBounds: { min: 1, max: 1, unit: 'net cards' }, sharedModeBudget: 'spree',
      },
    ],
  },
  {
    canonicalName: 'Essence Channeler',
    oracleText: "As long as you've lost life this turn, this creature has flying and vigilance.\nWhenever you gain life, put a +1/+1 counter on this creature.\nWhen this creature dies, put its counters on target creature you control.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        prerequisites: ['you gain life'],
        requiredSupply: [{ resource: 'lifegain', copies: 3 }],
        cost: { mana: 2, colored: ['W'] }, timing: { earliestTurn: 2, interval: 1 },
        produces: ['+1/+1 counters'], outputBounds: { min: 1, max: null, unit: 'power per lifegain' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['flying and vigilance only while you have lost life this turn'],
        cost: { mana: 2, colored: ['W'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Raubahn, Bull of Ala Mhigo',
    oracleText: "Ward—Pay life equal to Raubahn's power.\nWhenever Raubahn attacks, attach up to one target Equipment you control to target attacking creature.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'closing', mode: 'triggered', controller: 'self', zones: ['battlefield'],
        targetFilters: ['target attacking creature'],
        prerequisites: ['this creature attacks', 'an Equipment you control'],
        requiredSupply: [{ resource: 'equipment', copies: 2 }],
        cost: { mana: 2, colored: ['R'] }, timing: { earliestTurn: 3, interval: 1 },
        produces: ['equipment move'], outputBounds: { min: 1, max: null, unit: 'power' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 2, colored: ['R'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure', 'ward'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Bloodghast',
    oracleText: "This creature can't block.\nThis creature has haste as long as an opponent has 10 or less life.\nLandfall — Whenever a land you control enters, you may return this card from your graveyard to the battlefield.",
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'engine', mode: 'triggered', controller: 'self', zones: ['graveyard', 'battlefield'],
        prerequisites: ['this card is in your graveyard', 'a land enters under your control'],
        cost: { mana: 0 }, timing: { earliestTurn: 2, interval: 1 },
        produces: ['recursion'], outputBounds: { min: 1, max: 1, unit: 'permanents per land drop' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        prerequisites: ['cannot block; haste only below 10 opposing life'],
        cost: { mana: 2, colored: ['B', 'B'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Mutagen Man, Living Ooze',
    oracleText: 'Trample\nActivated abilities of artifact tokens you control cost {1} less to activate.\nWhen Mutagen Man enters, create X Mutagen tokens. (They\'re artifacts with "{1}, {T}, Sacrifice this token: Put a +1/+1 counter on target creature. Activate only as a sorcery.")',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'closing', mode: 'etb', controller: 'self', zones: ['battlefield'],
        prerequisites: ['X mana paid beyond {G}{G}'],
        cost: { mana: 2, colored: ['G', 'G'] }, timing: { earliestTurn: 3 },
        produces: ['artifact token', '+1/+1 counters'],
        outputBounds: { min: 1, max: null, unit: 'power' },
      },
      {
        family: 'engine', mode: 'static', controller: 'self', zones: ['battlefield'],
        requiredSupply: [{ resource: 'artifact token', copies: 2 }],
        cost: { mana: 2, colored: ['G', 'G'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: false },
        produces: ['cost reduction'], outputBounds: { min: 1, max: 1, unit: 'mana saved per activation' },
      },
      {
        family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
        cost: { mana: 2, colored: ['G', 'G'] },
        timing: { earliestTurn: 2, interval: 1, summoningSickness: true },
        produces: ['pressure', 'trample'], outputBounds: { min: 2, max: 2, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'Pinnacle Starcage',
    oracleText: 'When this artifact enters, exile all artifacts and creatures with mana value 2 or less until this artifact leaves the battlefield.\n{6}{W}{W}: Put each card exiled with this artifact into its owner\'s graveyard, then create a 2/2 colorless Robot artifact creature token for each card put into a graveyard this way. Sacrifice this artifact.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'etb', controller: 'any', zones: ['battlefield', 'exile'],
        targetFilters: ['all artifacts and creatures with mana value 2 or less'],
        answerAxes: ['creature', 'permanent'],
        prerequisites: ['the exile ends if this artifact leaves'],
        cost: { mana: 3, colored: ['W', 'W'] }, timing: { earliestTurn: 3 },
        outputBounds: { min: 2, max: null, unit: 'permanents answered' },
      },
      {
        family: 'closing', mode: 'activated', controller: 'self', zones: ['exile', 'graveyard'],
        prerequisites: ['cards exiled with this artifact'],
        cost: { mana: 8, colored: ['W', 'W'], additional: ['sacrifice this artifact'] },
        timing: { earliestTurn: 11 },
        produces: ['tokens', 'pressure'], outputBounds: { min: 2, max: null, unit: 'power' },
      },
    ],
  },
  {
    canonicalName: 'We Say Thee Nay!',
    oracleText: 'Teamwork 2 (As an additional cost to cast this spell, you may tap any number of creatures you control with total power 2 or more.)\nCounter target spell unless its controller pays {2}. Counter that spell unless its controller pays {4} instead if this spell was cast using teamwork.',
    provenance: P, knowledge: 'known',
    effects: [
      {
        family: 'answer', mode: 'cast', controller: 'self', zones: ['stack'],
        targetFilters: ['target spell'], answerAxes: ['stack'],
        prerequisites: ['the opponent may pay {2}, or {4} with teamwork'],
        cost: { mana: 2, colored: ['U'] }, timing: { earliestTurn: 2, instantSpeed: true },
        outputBounds: { min: 0, max: 1, unit: 'spells answered' }, availabilityPrior: 0.5,
      },
    ],
  },
];
