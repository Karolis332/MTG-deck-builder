/**
 * Deck-builder constraints engine.
 *
 * Solves the root cause of why the auto-builder produces bad decks:
 *   1. It fills by curve bucket, not by *role* (ramp / draw / removal / payoff).
 *   2. It trusts collection bonus + meta inclusion, so low-quality owned cards
 *      drown out real archetype payoffs.
 *   3. Generic synergy patterns can't distinguish "this is a real artifact
 *      payoff (Foundry Inspector)" from "this card happens to mention artifact
 *      (Sokka's Haiku)".
 *
 * This module provides:
 *   - Curated archetype payoff lists (per SynergyCategory) — the *actual* cards
 *     a real deck-builder would force into an artifact/graveyard/tokens list.
 *   - A quality floor helper — penalizes random unseen filler cards so they
 *     never beat established staples just because the user owns them.
 *   - pickByRole(): a two-pass picker that first fills hard role quotas from
 *     the template (ramp / draw / removal / wipes / protection / payoffs),
 *     then fills remaining slots by score. Uses classifyCard() from
 *     card-classifier.ts to guarantee each slot has a real, classified card.
 *
 * Consumed by deck-builder-ai.ts::autoBuildDeck() to replace the curve-fill
 * pass that produced Bender's-Waterskin-tier decks.
 */

import type { DbCard } from './types';
import { classifyCard } from './card-classifier';
import type { CardCategory } from './card-classifier';
import type { CommanderSynergyProfile, SynergyCategory } from './commander-synergy';
import { ARCHETYPE_TEMPLATES, getTemplate } from './deck-templates';
import type { Archetype } from './deck-templates';

// ── Curated archetype payoff lists ─────────────────────────────────────────
// These are the *actual* named cards that define each archetype. When the
// commander has the matching trigger category, these cards get a large bonus
// and are prioritized ahead of loose pattern-matches.
//
// Names are lowercase for case-insensitive matching. Arena-legal where
// possible (brawl players will still have the 30%+ of these that are legal;
// the rest get filtered by legality checks upstream).

export const ARCHETYPE_PAYOFFS: Record<SynergyCategory, Set<string>> = {
  artifact_synergy: new Set([
    // Cost reducers / cheaters
    'foundry inspector', 'inspiring statuary', 'cloud key', 'etherium sculptor',
    'jhoira\'s familiar', 'vedalken archmage', 'semblance anvil',
    // Anthems / lords
    'padeem, consul of innovation', 'steel overseer', 'metallic mimic',
    'master of etherium', 'tempered steel', 'broodstar',
    // Value / draw
    'thought monitor', 'thoughtcast', 'reverse engineer', 'fabrication foundry',
    'sai, master thopterist', 'thopter spy network', 'thopter foundry',
    'emry, lurker of the loch', 'sai of the shinobi', 'trading post',
    'scrap trawler', 'myr retriever', 'workshop assistant', 'junk diver',
    // Creatures that care
    'unctus, grand metatect', 'urza, lord high artificer', 'breya\'s apprentice',
    'arcbound ravager', 'hangarback walker', 'walking ballista',
    'myr battlesphere', 'solemn simulacrum', 'baleful strix',
    'karn, scion of urza', 'karn, silver golem', 'master transmuter',
    // Tezzeret / planeswalkers
    'tezzeret the seeker', 'tezzeret, artifice master', 'tezzeret, cruel captain',
    'tezzeret, agent of bolas',
    // Cheap artifact creatures
    'ornithopter', 'memnite', 'phyrexian walker', 'salvage titan',
    'gingerbrute', 'bomat courier', 'gleaming barrier',
    // Finishers
    'blightsteel colossus', 'wurmcoil engine', 'darksteel forge',
    'mystic forge', 'the one ring', 'spine of ish sah',
    // Utility
    'voltaic key', 'manifold key', 'unwinding clock', 'paradox engine',
    'chromatic star', 'chromatic sphere', 'mishra\'s bauble',
  ]),

  graveyard: new Set([
    // Reanimate
    'reanimate', 'animate dead', 'necromancy', 'dance of the dead',
    'victimize', 'exhume', 'unburial rites', 'persist', 'life//death',
    'beacon of unrest', 'bring back', 'rise again',
    // Self-mill
    'stitcher\'s supplier', 'satyr wayfinder', 'stinkweed imp',
    'golgari grave-troll', 'hedron crab', 'ruin crab', 'mesmeric orb',
    'altar of dementia', 'dreamscape artist', 'underrealm lich',
    'mulch', 'grisly salvage', 'grapple with the past', 'winding way',
    // Recursion engines
    'meren of clan nel toth', 'the gitrog monster', 'gravecrawler',
    'bloodghast', 'reassembling skeleton', 'haakon, stromgald scourge',
    'lord of extinction', 'sepulchral primordial', 'living death',
    'balthor the defiled', 'jarad, golgari lich lord',
    // Tutors for graveyard
    'entomb', 'buried alive', 'final parting', 'jarad\'s orders',
    // Payoffs
    'syr konrad, the grim', 'glint-horn buccaneer', 'nethroi, apex of death',
    'muldrotha, the gravetide', 'karador, ghost chieftain',
  ]),

  token_generation: new Set([
    // Anthems
    'intangible virtue', 'anointed procession', 'parallel lives',
    'doubling season', 'second harvest', 'divine visitation',
    'cathars\' crusade', 'beastmaster ascension',
    // Generators
    'bitterblossom', 'dreadhorde invasion', 'ophiomancer', 'bloodline keeper',
    'hangarback walker', 'sai, master thopterist', 'krenko, mob boss',
    'thopter spy network', 'bennie bracks, zoologist', 'verdant embrace',
    // Sac outlets + payoffs
    'grave pact', 'dictate of erebos', 'butcher of malakir',
    // Lords
    'adeline, resplendent cathar', 'crusade of the kindled flame',
    'skullclamp',
    // Planeswalkers
    'elspeth, sun\'s champion', 'elspeth, sun\'s nemesis',
    'freyalise, llanowar\'s fury', 'huatli, radiant champion',
  ]),

  counters: new Set([
    // Proliferate
    'inexorable tide', 'contagion engine', 'contagion clasp',
    'tezzeret\'s gambit', 'thrummingbird', 'viral drake',
    'tekuthal, inquiry dominus', 'evolution sage', 'karn\'s bastion',
    'plaguemaw beast', 'fuel for the cause',
    // +1/+1 enablers
    'hardened scales', 'branching evolution', 'kalonian hydra',
    'solidarity of heroes', 'inspiring call', 'bow of nylea',
    'the ozolith', 'cathars\' crusade', 'conclave mentor',
    'winding constrictor', 'hydra\'s growth', 'forgotten ancient',
    'ivy lane denizen', 'champion of lambholt', 'walking ballista',
    'ezuri, claw of progress', 'kami of whispered hopes', 'zaxara, the exemplary',
    // Mana dorks that care
    'good-fortune unicorn', 'tuskguard captain',
  ]),

  spell_cast: new Set([
    // Magecraft / prowess
    'monastery swiftspear', 'soul-scar mage', 'stormchaser mage',
    'thing in the ice', 'young pyromancer', 'murmuring mystic',
    'talrand, sky summoner', 'guttersnipe', 'firebrand archer',
    'veyran, voice of duality', 'kalamax, the stormsire',
    // Storm / cost reduction
    'baral, chief of compliance', 'goblin electromancer',
    'thousand-year storm', 'dualcaster mage', 'dualcaster mage',
    'mizzix of the izmagnus', 'niv-mizzet, parun', 'niv-mizzet, the firemind',
    // Rebound / copy
    'increasing vengeance', 'reverberate', 'fork', 'twincast',
    // Draw on cast
    'docent of perfection', 'archmage emeritus', 'adeliz, the cinder wind',
    'brilliant spectrum', 'mind\'s desire',
  ]),

  creature_etb: new Set([
    // Blink
    'ephemerate', 'cloudshift', 'essence flux', 'ghostway', 'eerie interlude',
    'eldrazi displacer', 'flickerwisp', 'restoration angel', 'teleportation circle',
    'conjurer\'s closet', 'panharmonicon', 'cloudstone curio',
    // ETB stacker
    'soul warden', 'soul\'s attendant', 'aetherflux reservoir',
    'purphoros, god of the forge', 'elesh norn, grand cenobite',
    'cavalier of gales', 'mulldrifter', 'reflector mage', 'venser, shaper savant',
    'charming prince', 'acrobatic maneuver', 'thassa, deep-dwelling',
    'brago, king eternal', 'yorion, sky nomad',
  ]),

  creature_dies: new Set([
    // Aristocrats
    'blood artist', 'zulaport cutthroat', 'cruel celebrant', 'falkenrath noble',
    'judith, the scourge diva', 'bastion of remembrance', 'pitiless plunderer',
    'corpse knight', 'vindictive vampire',
    // Sac outlets
    'viscera seer', 'ashnod\'s altar', 'phyrexian altar', 'carrion feeder',
    'yahenni, undying partisan', 'priest of forgotten gods',
    'woe strider', 'greater gargadon', 'goblin bombardment',
    // Recursion
    'grave pact', 'dictate of erebos', 'butcher of malakir',
    'teysa karlov', 'karador, ghost chieftain', 'meren of clan nel toth',
  ]),

  attack_trigger: new Set([
    // Extra combats
    'aggravated assault', 'combat celebrant', 'breath of fury',
    'world at war', 'savage beating', 'waves of aggression',
    'port razer', 'moraug, fury of akoum',
    // Attack triggers / anthems
    'hellrider', 'raging goblin', 'brutal hordechief', 'iroas, god of victory',
    'reconnaissance', 'edric, spymaster of trest', 'bident of thassa',
    'shiny impetus', 'coastal piracy',
    // Haste enablers
    'lightning greaves', 'swiftfoot boots', 'hall of the bandit lord',
    'urabrask the hidden', 'anger', 'fires of yavimaya',
    // Voltron
    'rafiq of the many', 'rogue\'s passage', 'shizo, death\'s storehouse',
    'whispersilk cloak', 'trailblazer\'s boots',
  ]),

  lifegain: new Set([
    'soul warden', 'soul\'s attendant', 'auriok champion', 'essence warden',
    'ajani\'s pridemate', 'voice of the blessed', 'bloodthirsty aerialist',
    'karlov of the ghost council', 'oloro, ageless ascetic',
    'rhox faithmender', 'cradle of vitality', 'well of lost dreams',
    'serra ascendant', 'archangel of thune', 'vito, thorn of the dusk rose',
    'sanguine bond', 'exquisite blood', 'aetherflux reservoir',
    'trudge garden', 'felidar sovereign',
  ]),

  land_matters: new Set([
    // Landfall
    'lotus cobra', 'tireless tracker', 'tireless provisioner',
    'omnath, locus of creation', 'omnath, locus of rage',
    'scute swarm', 'felidar retreat', 'tatyova, benthic druid',
    'roil elemental', 'retreat to coralhelm', 'avenger of zendikar',
    'rampaging baloths', 'splendid reclamation', 'crucible of worlds',
    'ramunap excavator', 'titania, protector of argoth',
    'world shaper', 'azusa, lost but seeking', 'exploration',
    'burgeoning', 'oracle of mul daya', 'courser of kruphix',
  ]),

  exile_cast: new Set([
    // Impulse draw
    'light up the stage', 'experimental frenzy', 'outpost siege',
    'valakut exploration', 'magda, brazen outlaw', 'birgi, god of storytelling',
    'professional face-breaker', 'apex of power', 'etali, primal storm',
    'kari zev\'s expertise', 'bloodsworn steward',
  ]),

  exile_enter: new Set([
    'flickerwisp', 'restoration angel', 'eldrazi displacer',
    'conjurer\'s closet', 'ghostway', 'teferi\'s protection',
    'ephemerate', 'cloudshift', 'brago, king eternal',
    'eerie interlude', 'displacement wave',
  ]),

  enchantment_synergy: new Set([
    'sigil of the empty throne', 'starfield of nyx', 'eidolon of blossoms',
    'setessan champion', 'destiny spinner', 'sterling grove',
    'enchantress\'s presence', 'argothian enchantress', 'mesa enchantress',
    'satyr enchanter', 'grim guardian', 'kor spiritdancer',
    'ancestral mask', 'ethereal armor', 'all that glitters',
    'sythis, harvest\'s hand', 'daxos, blessed by the sun',
    'calix, destiny\'s hand', 'tuvasa the sunlit',
  ]),

  tribal_lands: new Set([
    'unclaimed territory', 'secluded courtyard', 'cavern of souls',
    'path of ancestry', 'kindred discovery', 'vanquisher\'s banner',
    'herald\'s horn', 'urza\'s incubator', 'door of destinies',
    'coat of arms', 'obelisk of urd', 'stoneforge masterwork',
  ]),
};

// ── Universal ramp / draw / removal curated lists ─────────────────────────
// These are format- and commander-agnostic staples. If one of these is in
// the pool and we're short on the role, take it first. Arena-legal choices
// prioritized (Brawl-friendly).

export const STAPLE_RAMP = new Set([
  // Artifact ramp
  'arcane signet', 'mind stone', 'thought vessel', 'commander\'s sphere',
  'fellwar stone', 'prismatic lens', 'coldsteel heart', 'coalition relic',
  'talisman of dominance', 'talisman of progress', 'talisman of conviction',
  'talisman of curiosity', 'talisman of creativity', 'talisman of hierarchy',
  'talisman of indulgence', 'talisman of impulse', 'talisman of resilience',
  'talisman of unity', 'dimir signet', 'boros signet', 'azorius signet',
  'orzhov signet', 'rakdos signet', 'simic signet', 'golgari signet',
  'izzet signet', 'selesnya signet', 'gruul signet',
  'worn powerstone', 'hedron archive', 'thran dynamo', 'basalt monolith',
  'gilded lotus', 'chromatic lantern',
  // Creature ramp
  'llanowar elves', 'elvish mystic', 'birds of paradise', 'gilded goose',
  'paradise druid', 'ignoble hierarch', 'noble hierarch', 'fyndhorn elves',
  'elves of deep shadow', 'avacyn\'s pilgrim', 'deathrite shaman',
  'sakura-tribe elder', 'wood elves', 'farhaven elf', 'dawntreader elk',
  'solemn simulacrum', 'burnished hart', 'ornithopter of paradise',
  // Land ramp
  'cultivate', 'kodama\'s reach', 'farseek', 'rampant growth',
  'nature\'s lore', 'three visits', 'skyshroud claim', 'explosive vegetation',
  'circuitous route', 'migration path', 'harrow', 'edge of autumn',
  // Enchantment ramp
  'utopia sprawl', 'wild growth', 'overgrowth', 'carpet of flowers',
  'exploration', 'burgeoning',
]);

export const STAPLE_DRAW = new Set([
  // Cantrips
  'brainstorm', 'ponder', 'preordain', 'opt', 'consider', 'serum visions',
  'gitaxian probe', 'crop rotation', 'worldly tutor', 'mystical tutor',
  'sleight of hand', 'peek',
  // Draw-2 / 3
  'night\'s whisper', 'sign in blood', 'read the bones', 'painful truths',
  'ancient craving', 'promise of power', 'harmonize', 'concentrate',
  'inspiration', 'deep analysis', 'costly plunder', 'village rites',
  // Repeatable engines
  'rhystic study', 'mystic remora', 'phyrexian arena', 'sylvan library',
  'necropotence', 'dark confidant', 'bolas\'s citadel', 'the one ring',
  'esper sentinel', 'smuggler\'s copter', 'the great henge',
  'beast whisperer', 'guardian project', 'garruk\'s uprising',
  'up the beanstalk', 'fblthp, the lost', 'glimpse the unthinkable',
  'ledger shredder', 'faerie mastermind', 'jace, the perfected mind',
  // Wheels / bulk
  'wheel of fortune', 'windfall', 'echo of eons', 'timetwister',
  'jace\'s archivist', 'whispering madness', 'magus of the wheel',
]);

export const STAPLE_REMOVAL = new Set([
  // White
  'swords to plowshares', 'path to exile', 'generous gift', 'beast within',
  'oblation', 'chaos warp', 'anguished unmaking', 'vindicate',
  'assassin\'s trophy', 'abrupt decay', 'fateful absence', 'prismatic ending',
  'get lost', 'march of otherworldly light', 'unexpectedly absent',
  // Black
  'infernal grasp', 'fatal push', 'heartless act', 'go for the throat',
  'feed the swarm', 'hero\'s downfall', 'eat to extinction', 'bloodchief\'s thirst',
  'doom blade', 'ultimate price', 'murderous rider', 'cut down',
  // Red
  'lightning bolt', 'abrade', 'chaos warp', 'unholy heat', 'chain reaction',
  'play with fire', 'play with fire', 'burst lightning',
  // Green
  'beast within', 'krosan grip', 'nature\'s claim', 'return to nature',
  'reclamation sage', 'outland liberator',
  // Blue
  'pongify', 'rapid hybridization', 'reality shift', 'cyclonic rift',
  // Counters
  'counterspell', 'negate', 'swan song', 'mana drain', 'force of will',
  'force of negation', 'fierce guardianship', 'dovin\'s veto', 'mana leak',
  'dispel', 'spell pierce', 'make disappear', 'stern dismissal',
  'pact of negation', 'archmage\'s charm',
]);

export const STAPLE_BOARD_WIPE = new Set([
  'wrath of god', 'day of judgment', 'damnation', 'toxic deluge', 'damn',
  'supreme verdict', 'farewell', 'austere command', 'vanquish the horde',
  'cyclonic rift', 'blasphemous act', 'chain reaction', 'meathook massacre',
  'the meathook massacre', 'living death', 'in garruk\'s wake',
  'hour of revelation', 'depopulate', 'divine reckoning', 'pyroclasm',
  'anger of the gods', 'sweltering suns', 'shatter the sky',
  'dusk // dawn', 'settle the wreckage', 'kindred dominance',
]);

export const STAPLE_PROTECTION = new Set([
  'lightning greaves', 'swiftfoot boots', 'whispersilk cloak',
  'heroic intervention', 'teferi\'s protection', 'flawless maneuver',
  'boros charm', 'deflecting swat', 'snakeskin veil', 'blossoming defense',
  'sheltering word', 'tamiyo\'s safekeeping', 'apostle\'s blessing',
  'veil of summer', 'autumn\'s veil', 'silence',
]);

// ── Quality floor helper ──────────────────────────────────────────────────

/**
 * Determine if a card is likely filler that should be penalized.
 *
 * A card is considered filler if ALL of these are true:
 *   - It has no commander-specific data (commanderCardStats miss)
 *   - It has no global meta inclusion data
 *   - Its edhrec_rank is missing or > 18,000
 *   - It's not in any curated staple or payoff list
 *
 * This prevents Bender's-Waterskin-tier random recent-set cards from
 * beating real staples just because the user owns them.
 */
export function isLikelyFiller(
  card: DbCard,
  signals: {
    hasCommanderData: boolean;
    hasMetaData: boolean;
    hasEdhrecData: boolean;
    hasCfData: boolean;
    hasMlData: boolean;
  },
  payoffNames: Set<string>,
): boolean {
  const name = card.name.toLowerCase();

  // In any curated list → not filler
  if (payoffNames.has(name)) return false;
  if (STAPLE_RAMP.has(name) || STAPLE_DRAW.has(name) || STAPLE_REMOVAL.has(name)
      || STAPLE_BOARD_WIPE.has(name) || STAPLE_PROTECTION.has(name)) {
    return false;
  }

  // Has signal data → not filler
  if (signals.hasCommanderData || signals.hasMetaData || signals.hasCfData || signals.hasMlData) {
    return false;
  }

  // Has decent EDHREC rank → not filler
  const rank = card.edhrec_rank ?? 999999;
  if (rank <= 18000) return false;

  return true;
}

// ── Build the payoff name set for a given commander profile ──────────────

/**
 * Get the union of curated payoff card names for a commander profile.
 * Used by the picker to identify "real" archetype payoffs.
 */
export function getPayoffNamesForProfile(
  profile: CommanderSynergyProfile | null,
): Set<string> {
  const out = new Set<string>();
  if (!profile) return out;
  for (const cat of profile.triggerCategories) {
    const list = ARCHETYPE_PAYOFFS[cat];
    if (!list) continue;
    for (const name of list) out.add(name);
  }
  return out;
}

// ── Role quotas ───────────────────────────────────────────────────────────

export interface RoleQuotas {
  ramp: number;
  draw: number;
  removal: number;
  board_wipe: number;
  protection: number;
  synergy_payoff: number;
  win_condition: number;
}

/**
 * Derive hard role quotas from an archetype template.
 * These are *minimums* — the picker will try to hit them exactly.
 *
 * Commander profile can reduce draw/removal requirements if the commander
 * itself generates those resources.
 */
export function getRoleQuotas(
  archetype: Archetype,
  nonLandTarget: number,
  commanderProfile: CommanderSynergyProfile | null,
): RoleQuotas {
  const t = ARCHETYPE_TEMPLATES[archetype] || ARCHETYPE_TEMPLATES.midrange;

  // Start from template midpoints, biased toward minimums for safety
  const rampTarget = Math.round((t.ramp.totalMin + t.ramp.totalMax) / 2);
  const drawTarget = Math.round((t.draw.totalMin + t.draw.totalMax) / 2);
  const removalTarget = Math.round((t.removal.spot[0] + t.removal.spot[1]) / 2);
  const wipeTarget = Math.round((t.removal.wipes[0] + t.removal.wipes[1]) / 2);
  const counterTarget = Math.round((t.removal.counterspells[0] + t.removal.counterspells[1]) / 2);

  // Commander-provided draw/removal reduces external requirement
  const drawReduction = commanderProfile?.drawReduction ?? 0;
  const removalReduction = commanderProfile?.removalReduction ?? 0;

  // Payoff minimum: sum of commander's synergy minimums (capped)
  let payoffMin = 0;
  if (commanderProfile) {
    for (const v of Object.values(commanderProfile.synergyMinimums)) {
      payoffMin += v;
    }
  }
  // Cap payoff at 25% of non-land slots to avoid crowding staples out
  payoffMin = Math.min(payoffMin, Math.round(nonLandTarget * 0.25));

  return {
    ramp: Math.max(6, rampTarget),
    draw: Math.max(6, drawTarget - drawReduction),
    removal: Math.max(4, removalTarget + counterTarget - removalReduction),
    board_wipe: Math.max(2, wipeTarget),
    protection: 3,
    synergy_payoff: payoffMin,
    win_condition: Math.round((t.winConditionSlots[0] + t.winConditionSlots[1]) / 2),
  };
}

// ── Role-based picker ────────────────────────────────────────────────────

export interface RolePickInput {
  card: DbCard;
  score: number;
}

export interface PickedRoleCard {
  card: DbCard;
  quantity: number;
  board: 'main' | 'sideboard';
  role: CardCategory | 'payoff';
  reason: string;
}

export interface PickByRoleOptions {
  pool: RolePickInput[];
  nonLandTarget: number;
  quotas: RoleQuotas;
  payoffNames: Set<string>;
  commanderOracle?: string;
  getMaxQty: (card: DbCard) => number;
  isCommanderFormat: boolean;
  /** Cards already placed by the caller (e.g. arsenal pre-fill). Used to
   *  seed role fill counts so quotas are not double-counted. */
  preFilled?: DbCard[];
  /** Name set of cards to accept in Pass B. Cards outside this set AND
   *  without a recognized role category are rejected as filler. */
  passBAllowed?: Set<string>;
}

export interface PickByRoleResult {
  picks: PickedRoleCard[];
  roleFills: Record<string, number>;
  totalPicked: number;
  reasoning: string[];
}

/**
 * Two-pass role-aware picker:
 *   Pass A: classify every pool card, fill hard role quotas in priority order
 *           (ramp → draw → removal → wipes → protection → payoff → wincon).
 *           Within each role, pick by descending score.
 *   Pass B: fill remaining non-land slots with the highest-scored cards
 *           regardless of role.
 *
 * Returns a reasoning trail the UI can display so the user understands why
 * each card was picked.
 */
export function pickByRole(opts: PickByRoleOptions): PickByRoleResult {
  const {
    pool, nonLandTarget, quotas, payoffNames, commanderOracle,
    getMaxQty, isCommanderFormat, preFilled, passBAllowed,
  } = opts;

  const picks: PickedRoleCard[] = [];
  const pickedNames = new Set<string>();
  const reasoning: string[] = [];
  let totalPicked = 0;

  const roleFills: Record<string, number> = {
    ramp: 0, draw: 0, removal: 0, board_wipe: 0,
    protection: 0, synergy_payoff: 0, win_condition: 0,
  };

  // ── Seed roleFills from caller-provided pre-filled picks ────────────────
  // The arsenal pre-fill in deck-builder-ai.ts places payoffs/ramp/draw/etc.
  // before this function runs. Without this seeding, quotas would be
  // double-counted (arsenal contributes N, then pickByRole tries to add N
  // more from the remaining pool). Classify each pre-filled card and bump
  // the matching quota so Pass A only fills the *remaining* need.
  if (preFilled && preFilled.length > 0) {
    for (const card of preFilled) {
      const cats = classifyCard(
        card.name,
        card.oracle_text || '',
        card.type_line || '',
        card.cmc || 0,
        commanderOracle,
      );
      const isPayoff = payoffNames.has(card.name.toLowerCase());
      if (isPayoff) roleFills.synergy_payoff += 1;
      if (cats.includes('ramp')) roleFills.ramp += 1;
      if (cats.includes('draw')) roleFills.draw += 1;
      if (cats.includes('removal')) roleFills.removal += 1;
      if (cats.includes('board_wipe')) roleFills.board_wipe += 1;
      if (cats.includes('protection')) roleFills.protection += 1;
      if (cats.includes('win_condition')) roleFills.win_condition += 1;
    }
  }

  // Pre-classify every pool entry once.
  interface Classified extends RolePickInput {
    categories: Set<CardCategory>;
    isPayoff: boolean;
  }
  const classified: Classified[] = pool.map(entry => {
    const cats = classifyCard(
      entry.card.name,
      entry.card.oracle_text || '',
      entry.card.type_line || '',
      entry.card.cmc || 0,
      commanderOracle,
    );
    return {
      ...entry,
      categories: new Set(cats),
      isPayoff: payoffNames.has(entry.card.name.toLowerCase()),
    };
  });

  // Helper to take a pick
  const takePick = (c: Classified, role: PickedRoleCard['role'], reason: string): boolean => {
    if (pickedNames.has(c.card.name)) return false;
    if (totalPicked >= nonLandTarget) return false;
    const cardMax = getMaxQty(c.card);
    if (cardMax <= 0) return false;
    const qty = isCommanderFormat ? 1 : Math.min(cardMax, nonLandTarget - totalPicked);
    if (qty <= 0) return false;
    picks.push({ card: c.card, quantity: qty, board: 'main', role, reason });
    pickedNames.add(c.card.name);
    totalPicked += qty;
    return true;
  };

  // Pass A1: Fill role quotas, one role at a time, highest-score first.
  // Order matters: payoffs first (these are the *reason* to play the deck),
  // then ramp (without ramp, nothing else matters), then draw/removal.
  const rolePasses: Array<{
    key: keyof RoleQuotas;
    roleLabel: PickedRoleCard['role'];
    match: (c: Classified) => boolean;
    describe: (c: Classified) => string;
  }> = [
    {
      key: 'synergy_payoff',
      roleLabel: 'payoff',
      match: (c) => c.isPayoff,
      describe: (c) => `archetype payoff: ${c.card.name}`,
    },
    {
      key: 'ramp',
      roleLabel: 'ramp',
      match: (c) => c.categories.has('ramp'),
      describe: (c) => `ramp (role quota): ${c.card.name}`,
    },
    {
      key: 'draw',
      roleLabel: 'draw',
      match: (c) => c.categories.has('draw'),
      describe: (c) => `card draw (role quota): ${c.card.name}`,
    },
    {
      key: 'removal',
      roleLabel: 'removal',
      match: (c) => c.categories.has('removal'),
      describe: (c) => `spot removal (role quota): ${c.card.name}`,
    },
    {
      key: 'board_wipe',
      roleLabel: 'board_wipe',
      match: (c) => c.categories.has('board_wipe'),
      describe: (c) => `board wipe (role quota): ${c.card.name}`,
    },
    {
      key: 'protection',
      roleLabel: 'protection',
      match: (c) => c.categories.has('protection'),
      describe: (c) => `protection (role quota): ${c.card.name}`,
    },
    {
      key: 'win_condition',
      roleLabel: 'win_condition',
      match: (c) => c.categories.has('win_condition'),
      describe: (c) => `win condition (role quota): ${c.card.name}`,
    },
  ];

  for (const pass of rolePasses) {
    const need = quotas[pass.key];
    if (need <= 0) continue;
    for (const c of classified) {
      if (roleFills[pass.key] >= need) break;
      if (totalPicked >= nonLandTarget) break;
      if (pickedNames.has(c.card.name)) continue;
      if (!pass.match(c)) continue;
      if (takePick(c, pass.roleLabel, pass.describe(c))) {
        roleFills[pass.key] += 1;
      }
    }
    if (roleFills[pass.key] < need) {
      reasoning.push(
        `role shortfall: ${pass.key} needs ${need}, filled ${roleFills[pass.key]} — pool exhausted or collection blocked`,
      );
    }
  }

  // Pass B: Fill remaining slots by descending score (pool is pre-sorted).
  //
  // CRITICAL: Pass B is where filler used to slip through — any owned card
  // with a positive score would get picked to hit 99. Now we require the
  // card to have SOME recognized function: either in the allowlist
  // (arsenal / commander-stats), a payoff, or a classified role (ramp /
  // draw / removal / wipe / protection / wincon / synergy). Utility-only
  // cards with no role are rejected as filler.
  //
  // Fallback: if we can't hit nonLandTarget with allowlisted picks, do a
  // second sweep that relaxes the filter so the deck still ships 99 cards.
  const passBFilter = (c: Classified): { accept: boolean; role: PickedRoleCard['role']; reason: string } => {
    if (c.isPayoff) {
      return { accept: true, role: 'payoff', reason: `extra payoff: ${c.card.name}` };
    }
    if (c.categories.has('ramp')) return { accept: true, role: 'ramp', reason: `extra ramp: ${c.card.name}` };
    if (c.categories.has('draw')) return { accept: true, role: 'draw', reason: `extra draw: ${c.card.name}` };
    if (c.categories.has('removal')) return { accept: true, role: 'removal', reason: `extra removal: ${c.card.name}` };
    if (c.categories.has('board_wipe')) return { accept: true, role: 'board_wipe', reason: `extra wipe: ${c.card.name}` };
    if (c.categories.has('protection')) return { accept: true, role: 'protection', reason: `extra protection: ${c.card.name}` };
    if (c.categories.has('win_condition')) return { accept: true, role: 'win_condition', reason: `finisher: ${c.card.name}` };
    if (c.categories.has('synergy')) return { accept: true, role: 'synergy', reason: `commander synergy: ${c.card.name}` };
    if (passBAllowed && passBAllowed.has(c.card.name)) {
      return { accept: true, role: 'utility', reason: `allowlisted (arsenal/commander stats): ${c.card.name}` };
    }
    return { accept: false, role: 'utility', reason: `rejected filler: ${c.card.name}` };
  };

  // First sweep: strict filter
  for (const c of classified) {
    if (totalPicked >= nonLandTarget) break;
    if (pickedNames.has(c.card.name)) continue;
    const verdict = passBFilter(c);
    if (!verdict.accept) continue;
    takePick(c, verdict.role, verdict.reason);
  }

  // Fallback sweep: if still short, take best-scored unclassified cards so
  // the deck reaches 99. Record a warning so the caller knows the archetype
  // pool was thin.
  if (totalPicked < nonLandTarget) {
    const short = nonLandTarget - totalPicked;
    reasoning.push(
      `pass-B fallback: ${short} slots needed relaxed filter — archetype pool was thin`,
    );
    for (const c of classified) {
      if (totalPicked >= nonLandTarget) break;
      if (pickedNames.has(c.card.name)) continue;
      takePick(c, 'utility', `fallback fill (score ${c.score}): ${c.card.name}`);
    }
  }

  return { picks, roleFills, totalPicked, reasoning };
}

// ── Reasoning summary helper ─────────────────────────────────────────────

/**
 * Generate a compact build report explaining what roles were filled and where
 * shortfalls occurred. Intended for debug logging and UI tooltips.
 */
export function buildReasoningSummary(
  archetype: Archetype,
  quotas: RoleQuotas,
  result: PickByRoleResult,
  nonLandTarget: number,
): string {
  const lines: string[] = [];
  const t = getTemplate(archetype);
  lines.push(`Archetype: ${t.label} — targeting ${nonLandTarget} nonland slots`);
  lines.push(`Role fills:`);
  const rows: Array<[string, number, number]> = [
    ['ramp', roleGet(result, 'ramp'), quotas.ramp],
    ['draw', roleGet(result, 'draw'), quotas.draw],
    ['removal', roleGet(result, 'removal'), quotas.removal],
    ['wipes', roleGet(result, 'board_wipe'), quotas.board_wipe],
    ['protection', roleGet(result, 'protection'), quotas.protection],
    ['payoffs', roleGet(result, 'synergy_payoff'), quotas.synergy_payoff],
    ['wincons', roleGet(result, 'win_condition'), quotas.win_condition],
  ];
  for (const [label, got, want] of rows) {
    const mark = got >= want ? 'OK' : 'SHORT';
    lines.push(`  ${label.padEnd(10)} ${got}/${want} ${mark}`);
  }
  if (result.reasoning.length > 0) {
    lines.push(`Warnings:`);
    for (const w of result.reasoning) lines.push(`  - ${w}`);
  }
  return lines.join('\n');
}

function roleGet(result: PickByRoleResult, key: string): number {
  return result.roleFills[key] ?? 0;
}
