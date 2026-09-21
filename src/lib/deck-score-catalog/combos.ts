/**
 * Deck Score v1.4 — typed closing-combo mechanics. docs/DECK_SCORE_SPEC.md
 * §10.6.1 "Model the missing family with exact tutor predicates/destinations,
 * distinct targets, sacrifice/untap/zone requirements, mana, delays and an
 * actual outlet/finish predicate. A generic tutor or combo tag is
 * insufficient."
 *
 * Data only. `deck-score-win.ts` turns these rows into W recipes; nothing here
 * knows about scores, bands or decks. Every row names EXACT cards, the
 * mechanical prerequisite that makes the loop repeat, and — where the loop
 * produces a resource rather than a win — the outlet that converts it.
 *
 * // ponytail: exact names, not predicates. A combo is a named interaction
 * // between printed rules; a regex over oracle text cannot tell "untap this
 * // creature" in a loop from "untap this creature" as a one-shot. Upgrade
 * // path is more rows, not a cleverer matcher.
 */

/** What one iteration of the loop yields. */
export type ComboResource =
  /** Unbounded mana. Needs an outlet that converts mana into a finish. */
  | 'mana'
  /** Unbounded mana that may only be spent casting creature spells. */
  | 'creature_mana'
  /** Unbounded direct damage — a finish on its own. */
  | 'damage'
  /** Unbounded life loss/gain — a finish on its own. */
  | 'drain'
  /** Unbounded creature tokens. A finish only with haste or a turn cycle. */
  | 'tokens'
  /** The line wins outright by its own rules text. */
  | 'win';

/** One required piece. Any ONE of `any` fills it; the slot is still distinct. */
export interface ComboSlot {
  any: readonly string[];
  /** What this slot contributes — printed verbatim in the resource trace. */
  role: string;
  /** Card types a tutor must be able to name to fetch this slot. */
  types: readonly string[];
}

/** An extra mechanical requirement the slots alone do not express. */
export type ComboRoute =
  /** A creature card must reach a graveyard before the line can start. */
  | 'creature_to_graveyard'
  /** Opponents must hold enough nonland permanents for the loop to profit. */
  | 'opponent_permanents'
  /** The deck must supply mana from nonland permanents for the loop to net. */
  | 'nonland_mana';

export interface TypedCombo {
  /** Stable id; the W recipe is published as `combo:<id>`. */
  id: string;
  label: string;
  slots: readonly ComboSlot[];
  resource: ComboResource;
  /** The audited reason the loop repeats without bound. */
  prerequisite: string;
  /** Mana each iteration consumes beyond casting the pieces. */
  extraCost: number;
  /** A zone/board requirement outside the slots. */
  route?: { kind: ComboRoute; why: string };
  /** Tokens arriving with haste close in the same turn they are made. */
  hasteIncluded?: boolean;
}

/**
 * The creature-assembled families §10.6.1 names, plus the Hazel's Brewmaster
 * host the two failing Thrasios/Tymna Top-16 lists actually run (Vizier of
 * Remedies and Swift Reconfiguration are the other two hosts for the same
 * Devoted Druid loop; the three differ only in WHY the -1/-1 counter stops
 * mattering, so each is typed separately).
 */
export const TYPED_COMBOS: readonly TypedCombo[] = [
  {
    id: 'druid-vizier',
    label: 'Devoted Druid + Vizier of Remedies',
    slots: [
      { any: ['Devoted Druid'], role: '{T}: Add {G}; put a -1/-1 counter on it: untap it', types: ['Creature'] },
      { any: ['Vizier of Remedies'], role: 'replaces one -1/-1 counter per event', types: ['Creature'] },
    ],
    resource: 'mana',
    prerequisite: 'Vizier removes the only counter the untap costs, so the Druid untaps without bound and each untap adds {G}.',
    extraCost: 0,
  },
  {
    id: 'druid-reconfigure',
    label: 'Devoted Druid + Swift Reconfiguration',
    slots: [
      { any: ['Devoted Druid'], role: '{T}: Add {G}; put a -1/-1 counter on it: untap it', types: ['Creature'] },
      { any: ['Swift Reconfiguration'], role: 'turns the Druid into a noncreature Vehicle', types: ['Enchantment'] },
    ],
    resource: 'mana',
    prerequisite: 'The enchanted Druid is an uncrewed Vehicle, so it is not a creature and its -1/-1 counters never reach lethal toughness; the mana ability and the untap both survive.',
    extraCost: 0,
  },
  {
    id: 'druid-brewmaster',
    label: "Devoted Druid + Hazel's Brewmaster",
    slots: [
      { any: ['Devoted Druid'], role: '{T}: Add {G}; put a -1/-1 counter on it: untap it', types: ['Creature'] },
      { any: ["Hazel's Brewmaster"], role: 'exiles a creature card from a graveyard and grants its activated abilities to Foods', types: ['Creature'] },
    ],
    resource: 'mana',
    prerequisite: "Brewmaster's enter/attack trigger exiles the Druid from a graveyard and makes a Food; the Food holds the Druid's abilities but is a noncreature artifact, so the -1/-1 counter the untap costs is inert.",
    extraCost: 0,
    route: {
      kind: 'creature_to_graveyard',
      why: 'the Druid has to be in a graveyard for the Brewmaster trigger to exile it',
    },
  },
  {
    id: 'kiki-copy',
    label: 'Kiki-Jiki, Mirror Breaker + an untapper',
    slots: [
      { any: ['Kiki-Jiki, Mirror Breaker'], role: '{T}: copy a nonlegendary creature; the copy has haste', types: ['Creature'] },
      {
        any: ['Zealous Conscripts', 'Felidar Guardian', 'Restoration Angel', 'Village Bell-Ringer', 'Combat Celebrant'],
        role: 'untaps or blinks Kiki-Jiki when the copy enters',
        types: ['Creature'],
      },
    ],
    resource: 'tokens',
    prerequisite: "The copy's enter trigger untaps (or blinks) Kiki-Jiki, so the copy ability can be activated again immediately.",
    extraCost: 0,
    hasteIncluded: true,
  },
  {
    id: 'mikaeus-persist',
    label: 'Mikaeus, the Unhallowed + a damage sacrifice',
    slots: [
      { any: ['Mikaeus, the Unhallowed'], role: 'gives other non-Human creatures undying', types: ['Creature'] },
      { any: ['Triskelion', 'Walking Ballista'], role: 'removes its own counters to deal damage, then sacrifices itself', types: ['Creature', 'Artifact'] },
    ],
    resource: 'damage',
    prerequisite: 'Undying returns the sacrificed body with a +1/+1 counter, which restores the counter the damage ability just spent.',
    extraCost: 0,
  },
  {
    id: 'heliod-ballista',
    label: 'Heliod, Sun-Crowned + Walking Ballista',
    slots: [
      { any: ['Heliod, Sun-Crowned'], role: 'grants lifelink and adds a counter whenever you gain life', types: ['Creature', 'Enchantment'] },
      { any: ['Walking Ballista'], role: 'removes a +1/+1 counter to deal 1 damage', types: ['Creature', 'Artifact'] },
    ],
    resource: 'damage',
    prerequisite: "Lifelink on the ping gains a life, and Heliod's trigger puts the spent +1/+1 counter straight back on Ballista.",
    extraCost: 0,
  },
  {
    id: 'food-chain',
    label: 'Food Chain + a creature that casts from exile',
    slots: [
      { any: ['Food Chain'], role: 'exile a creature for creature-only mana equal to its mana value plus one', types: ['Enchantment'] },
      { any: ['Squee, the Immortal', 'Eternal Scourge', 'Misthollow Griffin'], role: 'may be cast from exile', types: ['Creature'] },
    ],
    resource: 'creature_mana',
    prerequisite: 'Food Chain exiles the creature for more mana than recasting it from exile costs, and the creature may be cast from exile, so the loop is net positive creature mana.',
    extraCost: 0,
  },
  {
    id: 'dockside-sabertooth',
    label: 'Dockside Extortionist + Temur Sabertooth',
    slots: [
      { any: ['Dockside Extortionist'], role: "makes Treasures equal to opponents' artifacts and enchantments", types: ['Creature'] },
      { any: ['Temur Sabertooth'], role: '{1}{G}: return another creature you control to hand', types: ['Creature'] },
    ],
    resource: 'mana',
    prerequisite: 'Sabertooth rebuys Dockside; recasting it makes more Treasures than the bounce and the recast together spend.',
    extraCost: 4,
    route: {
      kind: 'opponent_permanents',
      why: 'opponents must control at least three artifacts or enchantments for the loop to profit',
    },
  },

  // The two-card loops v1.1 carried as untyped `COMBO_PAIRS`, now typed with
  // the same prerequisite/outlet contract so every admitted line has a trace.
  {
    id: 'oracle-consultation',
    label: "Thassa's Oracle + Demonic Consultation",
    slots: [
      { any: ["Thassa's Oracle"], role: 'wins on enter when the library is no larger than devotion to blue', types: ['Creature'] },
      { any: ['Demonic Consultation', 'Tainted Pact'], role: 'exiles the library naming a card it does not hold', types: ['Instant'] },
    ],
    resource: 'win',
    prerequisite: "The consultation exiles the whole library, so Oracle's enter trigger finds a library of zero cards and wins outright.",
    extraCost: 0,
  },
  {
    id: 'blood-bond',
    label: 'Exquisite Blood + a life-loss mirror',
    slots: [
      { any: ['Exquisite Blood'], role: 'gain life whenever an opponent loses life', types: ['Enchantment'] },
      { any: ['Sanguine Bond', 'Vito, Thorn of the Dusk Rose'], role: 'an opponent loses life whenever you gain life', types: ['Enchantment', 'Creature'] },
    ],
    resource: 'drain',
    prerequisite: 'Each trigger satisfies the other, so one life-loss event loops until an opponent is at zero.',
    extraCost: 1,
  },
  {
    id: 'godo-helm',
    label: 'Godo, Bandit Warlord + Helm of the Host',
    slots: [
      { any: ['Godo, Bandit Warlord'], role: 'first attack each turn untaps it and adds a combat phase', types: ['Creature'] },
      { any: ['Helm of the Host'], role: 'copies the equipped creature with haste each combat', types: ['Artifact'] },
    ],
    resource: 'tokens',
    prerequisite: "Each new combat makes another hasty Godo copy, and each copy's own first attack adds another combat phase.",
    extraCost: 0,
    hasteIncluded: true,
  },
  {
    id: 'splinter-twin',
    label: 'Splinter Twin + an untapping enter trigger',
    slots: [
      { any: ['Splinter Twin'], role: 'the enchanted creature taps to make a hasty copy of itself', types: ['Enchantment'] },
      { any: ['Deceiver Exarch', 'Pestermite', 'Village Bell-Ringer'], role: 'untaps a permanent you control when it enters', types: ['Creature'] },
    ],
    resource: 'tokens',
    prerequisite: "The token copy's enter trigger untaps the enchanted creature, so the copy ability is available again at once.",
    extraCost: 0,
    hasteIncluded: true,
  },
  {
    id: 'scepter-reversal',
    label: 'Isochron Scepter + Dramatic Reversal',
    slots: [
      { any: ['Isochron Scepter'], role: '{2}, {T}: copy the imprinted instant for free', types: ['Artifact'] },
      { any: ['Dramatic Reversal'], role: 'untaps all nonland permanents you control', types: ['Instant'] },
    ],
    resource: 'mana',
    prerequisite: 'Each copy untaps the Scepter and the mana permanents that paid for it, so the loop nets mana as long as those permanents make more than {2}.',
    extraCost: 2,
    route: {
      kind: 'nonland_mana',
      why: 'the untapped nonland permanents must together produce more than the {2} activation',
    },
  },
  {
    id: 'monolith-rings',
    label: 'Basalt Monolith + Rings of Brighthearth',
    slots: [
      { any: ['Basalt Monolith'], role: '{T}: add {C}{C}{C}; {3}: untap it', types: ['Artifact'] },
      { any: ['Rings of Brighthearth'], role: 'pay {2} to copy a non-mana activated ability', types: ['Artifact'] },
    ],
    resource: 'mana',
    prerequisite: "Rings copies the Monolith's {3} untap for {2}, so one {3} untaps it twice and each cycle nets one colourless.",
    extraCost: 3,
  },
  {
    id: 'palinchron-deadeye',
    label: 'Palinchron + Deadeye Navigator',
    slots: [
      { any: ['Palinchron'], role: 'untaps up to seven lands when it enters', types: ['Creature'] },
      { any: ['Deadeye Navigator'], role: 'soulbond grants "{1}{U}: exile this creature, then return it"', types: ['Creature'] },
    ],
    resource: 'mana',
    prerequisite: 'Each {1}{U} blink re-triggers Palinchron and untaps seven lands, netting five mana a cycle.',
    extraCost: 2,
  },
  {
    id: 'pilipala-architect',
    label: 'Pili-Pala + Grand Architect',
    slots: [
      { any: ['Pili-Pala'], role: '{2}, {Q}: add one mana of any colour', types: ['Creature', 'Artifact'] },
      { any: ['Grand Architect'], role: 'tap an untapped blue creature: add {C}{C} for artifact abilities', types: ['Creature'] },
    ],
    resource: 'mana',
    prerequisite: "Architect turns Pili-Pala blue and taps it for {C}{C}, which pays Pili-Pala's own {2}; the {Q} untap cost then readies it again, netting one mana of any colour a cycle.",
    extraCost: 1,
  },
];

// ── Tutors ────────────────────────────────────────────────────────────────

export type TutorDestination = 'battlefield' | 'hand' | 'top' | 'graveyard';

export interface ComboTutor {
  name: string;
  destination: TutorDestination;
  /** Card types it can name; empty = any card. */
  finds: readonly string[];
  /** Total mana paid to land a piece of mana value `mv`, this tutor included. */
  cost: (mv: number) => number;
  /** Printed in the tutor trace. */
  note: string;
}

/**
 * A tutor earns access to a piece only when its DESTINATION actually produces
 * the piece: a battlefield tutor lands it for its own cost, a hand tutor still
 * has to cast it, a top-of-library tutor costs a draw step on top of that.
 * `TOP_DELAY` prices that extra turn as one mana of the line's schedule.
 */
export const TOP_DELAY = 1;

export const COMBO_TUTORS: readonly ComboTutor[] = [
  { name: 'Chord of Calling', destination: 'battlefield', finds: ['Creature'], cost: (mv) => mv + 3, note: 'convoke, instant speed' },
  { name: "Green Sun's Zenith", destination: 'battlefield', finds: ['Creature'], cost: (mv) => mv + 1, note: 'green creatures only' },
  { name: 'Finale of Devastation', destination: 'battlefield', finds: ['Creature'], cost: (mv) => mv + 2, note: 'library or graveyard' },
  { name: 'Natural Order', destination: 'battlefield', finds: ['Creature'], cost: () => 4, note: 'sacrifice a green creature; green targets only' },
  { name: "Nature's Rhythm", destination: 'battlefield', finds: ['Creature'], cost: (mv) => mv + 2, note: 'library only' },
  { name: 'Neoform', destination: 'battlefield', finds: ['Creature'], cost: () => 2, note: 'sacrifice a creature of the target mana value minus one' },
  { name: 'Eldritch Evolution', destination: 'battlefield', finds: ['Creature'], cost: () => 3, note: 'sacrifice a creature of the target mana value minus two' },
  { name: 'Birthing Pod', destination: 'battlefield', finds: ['Creature'], cost: () => 4, note: 'sorcery speed, sacrifice one mana value lower' },
  { name: 'Fiend Artisan', destination: 'battlefield', finds: ['Creature'], cost: (mv) => mv + 2, note: 'sacrifice a creature' },
  { name: "Eladamri's Call", destination: 'hand', finds: ['Creature'], cost: (mv) => mv + 2, note: 'instant speed' },
  { name: 'Worldly Tutor', destination: 'top', finds: ['Creature'], cost: (mv) => mv + 1 + TOP_DELAY, note: 'top of library' },
  { name: 'Survival of the Fittest', destination: 'hand', finds: ['Creature'], cost: (mv) => mv + 1, note: 'discard a creature card' },
  { name: 'Demonic Tutor', destination: 'hand', finds: [], cost: (mv) => mv + 2, note: 'any card' },
  { name: 'Diabolic Intent', destination: 'hand', finds: [], cost: (mv) => mv + 2, note: 'sacrifice a creature' },
  { name: 'Grim Tutor', destination: 'hand', finds: [], cost: (mv) => mv + 3, note: 'lose 3 life' },
  { name: 'Vampiric Tutor', destination: 'top', finds: [], cost: (mv) => mv + 1 + TOP_DELAY, note: 'top of library, lose 2 life' },
  { name: 'Imperial Seal', destination: 'top', finds: [], cost: (mv) => mv + 1 + TOP_DELAY, note: 'top of library, lose 2 life' },
  { name: 'Enlightened Tutor', destination: 'top', finds: ['Artifact', 'Enchantment'], cost: (mv) => mv + 1 + TOP_DELAY, note: 'top of library' },
  { name: 'Beseech the Mirror', destination: 'hand', finds: [], cost: (mv) => mv + 4, note: 'bargain casts it free at mana value 4 or less' },
  { name: 'Entomb', destination: 'graveyard', finds: [], cost: () => 1, note: 'straight to the graveyard' },
  { name: 'Buried Alive', destination: 'graveyard', finds: ['Creature'], cost: () => 3, note: 'three creature cards to the graveyard' },
];

const TUTORS_BY_NAME = new Map(COMBO_TUTORS.map((t) => [t.name.toLowerCase(), t]));

export function comboTutor(name: string): ComboTutor | undefined {
  return TUTORS_BY_NAME.get(name.toLowerCase());
}

/** A tutor reaches a slot when it can name one of the slot's card types and
 * its destination actually yields the card (a graveyard tutor does not put a
 * combo piece onto the battlefield or into hand). */
export function tutorReachesSlot(tutor: ComboTutor, slot: ComboSlot): boolean {
  if (tutor.destination === 'graveyard') return false;
  if (tutor.finds.length === 0) return true;
  return slot.types.some((t) => tutor.finds.includes(t));
}

// ── Routes ────────────────────────────────────────────────────────────────

/**
 * Cards that put a creature card from hand or battlefield into a graveyard as
 * part of their own cost or effect — the zone requirement `druid-brewmaster`
 * needs. Tutors with a graveyard destination qualify too and are read from
 * `COMBO_TUTORS`.
 */
export const GRAVEYARD_ROUTES: readonly string[] = [
  'Survival of the Fittest', 'Neoform', 'Eldritch Evolution', 'Birthing Pod', 'Fiend Artisan',
  'Diabolic Intent', 'Natural Order', 'Culling the Weak', 'Viscera Seer', 'Carrion Feeder',
  'Goblin Bombardment', 'Altar of Dementia', 'Phyrexian Tower', 'Ashnod\'s Altar',
  'Faithless Looting', 'Frantic Search', 'Careful Study',
  'Entomb', 'Buried Alive', 'Bone Shards', 'Grisly Salvage',
];

// ── Outlets ───────────────────────────────────────────────────────────────

export interface ManaOutlet {
  name: string;
  /** How unbounded mana becomes a finish predicate. */
  mechanism: string;
  /** Castable with Food Chain's creature-only mana. */
  creatureCastable?: boolean;
}

/**
 * §10.6.1 "infinite mana → typed outlet present". A draw engine is NOT an
 * outlet: drawing the library does not defeat an opponent. Each row names the
 * printed rules text that turns unbounded mana into lethal output.
 */
export const MANA_OUTLETS: readonly ManaOutlet[] = [
  { name: 'Finale of Devastation', mechanism: 'X of 10 or more gives every creature you control +X/+X and haste: lethal combat the same turn' },
  { name: 'Exsanguinate', mechanism: 'each opponent loses X life' },
  { name: 'Torment of Hailfire', mechanism: 'X iterations of lose 3 life, sacrifice or discard' },
  { name: 'Comet Storm', mechanism: 'X damage to each of any number of targets' },
  { name: 'Fireball', mechanism: 'X damage split among any number of targets' },
  { name: 'Crackle with Power', mechanism: '5X damage spread over X targets' },
  { name: 'Walking Ballista', mechanism: '{4} buys a +1/+1 counter and each counter removed deals 1 damage', creatureCastable: true },
  { name: 'Blue Sun\'s Zenith', mechanism: 'target player draws X: an opponent is decked on their next draw' },
];

const OUTLETS_BY_NAME = new Map(MANA_OUTLETS.map((o) => [o.name.toLowerCase(), o]));

export function manaOutlet(name: string): ManaOutlet | undefined {
  return OUTLETS_BY_NAME.get(name.toLowerCase());
}

// ── Unbounded draw sinks ────────────────────────────────────────

/**
 * An activated ability that turns mana into cards with no bound on the number
 * of activations. Behind an unbounded mana loop it draws the entire library,
 * so the loop's OUTLET no longer has to be drawn — which is why a cEDH pilot
 * counts a one-of finisher as reliably available once the engine is online.
 * The collapse only applies when the sink is in the command zone: a sink that
 * must itself be drawn is no more accessible than the outlet it would find.
 *
 * // ponytail: named cards, and only the command-zone case. A library sink
 * // would need its own access pool, which is the same polynomial the outlet
 * // already has. Upgrade path is a joint pool, not a looser predicate.
 */
export const UNBOUNDED_DRAW_SINKS: readonly { name: string; mechanism: string }[] = [
  { name: 'Thrasios, Triton Hero', mechanism: '{4}: scry 1, then draw a card or put a land onto the battlefield' },
  { name: 'Kenrith, the Returned King', mechanism: '{2}{U}: each player draws a card' },
];

const SINKS_BY_NAME = new Map(UNBOUNDED_DRAW_SINKS.map((d) => [d.name.toLowerCase(), d]));

export function unboundedDrawSink(name: string): { name: string; mechanism: string } | undefined {
  return SINKS_BY_NAME.get(name.toLowerCase());
}

/** Resources that cannot close without a separate outlet. */
export function needsOutlet(resource: ComboResource): boolean {
  return resource === 'mana' || resource === 'creature_mana';
}
