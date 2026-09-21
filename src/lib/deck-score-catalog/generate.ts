/**
 * Deck Score v1.2 — generated catalogue entries. docs/DECK_SCORE_SPEC.md §1
 * "generate simple cases from oracle text and types; curate exceptional
 * costs, loops and alternate wins by canonical identity" and §8.
 *
 * `generateEntry` is a PURE function of one card row. It types the clause
 * shapes that are unambiguous in isolation and refuses the rest: a sentence
 * whose text is not fully accounted for by a typed atom plus mechanical glue
 * is recorded verbatim in `untyped` and forces `knowledge: 'partial'`, which
 * the loader never counts as coverage. Nothing here may invent an effect the
 * oracle text does not state (§8 "do not type a card you cannot ground in
 * its oracle text").
 *
 * The parser runs offline (`scripts/deck-score-catalog-generate.ts`) because
 * mana value, type line and printed power are not recoverable from oracle
 * text alone; the emitted shard is plain data.
 */
import { oracleHash, type AnswerAxis, type CatalogEntry, type EffectCost, type EffectFamily, type EffectMode, type TypedEffect } from './schema';

/** The columns the parser reads. A subset of `DbCard`. */
export interface GeneratableCard {
  name: string;
  mana_cost: string | null;
  cmc: number;
  type_line: string;
  oracle_text: string | null;
  power?: string | null;
  toughness?: string | null;
  produced_mana?: string | null;
}

const NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, x: 0,
};

function num(word: string | undefined): number {
  if (!word) return 1;
  const n = Number(word);
  if (Number.isFinite(n)) return n;
  return NUMBERS[word.toLowerCase()] ?? 1;
}

/** Keywords that need no clause of their own; they shape the creature body. */
const EVASION = ['flying', 'menace', 'trample', 'shadow', 'horsemanship', 'fear', 'intimidate', 'skulk'];
const COMBAT_KW = ['deathtouch', 'lifelink', 'first strike', 'double strike', 'vigilance', 'haste', 'reach', 'defender', 'prowess', 'infect', 'annihilator', 'toxic', 'afflict', 'bushido', 'battle cry', 'exalted', 'melee', 'mentor', 'training', 'undying', 'persist', 'daybound', 'nightbound', 'renown'];
const PROTECTION_KW = ['hexproof', 'shroud', 'indestructible', 'ward', 'protection'];
/** Keywords whose whole mechanical content is "this line is a keyword". */
const OTHER_KW = [
  'flash', 'cycling', 'flashback', 'kicker', 'multikicker', 'entwine', 'escape', 'madness', 'buyback', 'overload',
  'convoke', 'delve', 'improvise', 'affinity', 'cascade', 'storm', 'replicate', 'rebound', 'jump-start', 'aftermath',
  'split second', 'echo', 'evoke', 'foretell', 'disturb', 'embalm', 'eternalize', 'unearth', 'adapt', 'monstrosity',
  'crew', 'equip', 'fortify', 'reconfigure', 'bestow', 'outlast', 'level up', 'scavenge', 'transmute', 'forecast',
  'miracle', 'morph', 'megamorph', 'disguise', 'cloak', 'manifest', 'plot', 'suspend', 'vanishing', 'fading',
  'cumulative upkeep', 'phasing', 'banding', 'changeling', 'devoid', 'ingest', 'amass', 'mutate', 'companion',
  'partner', 'friends forever', 'choose a background', 'boast', 'blitz', 'casualty', 'connive', 'hideaway',
  'prototype', 'unleash', 'soulbond', 'living weapon', 'extort', 'dash', 'emerge', 'surge', 'spectacle', 'riot',
  'mentor', 'adamant', 'boast', 'ninjutsu', 'channel', 'soulshift', 'offering', 'splice', 'sunburst', 'graft',
  'modular', 'sunburst', 'dredge', 'haunt', 'provoke', 'recover', 'ripple', 'shadow', 'storm', 'threshold',
  'totem armor', 'vanishing', 'wither', 'retrace', 'unleash', 'tribute', 'dethrone', 'exploit', 'awaken',
  'myriad', 'assist', 'jump-start', 'spree', 'freerunning', 'impending', 'gift', 'offspring', 'time travel',
  'saddle', 'station', 'harmonize', 'max speed', 'start your engines!', 'exhaust', 'job select', 'tiered',
  'double agenda', 'read ahead', 'toxic', 'backup', 'prowl', 'evolve', 'landfall', 'flurry', 'valiant',
  'start your engines', 'mobilize', 'warp', 'storied', 'bargain', 'disturb', 'corrupted', 'descend', 'craft', 'forage', 'squad',
  'for mirrodin!', 'melee', 'raid', 'delirium', 'domain', 'coven', 'eerie', 'flurry', 'survival', 'expend',
  'double strike', 'menace', 'lifelink', 'deathtouch', 'devotion', 'affinity', 'enlist', 'toxic', 'bloodthirst',
  // v1.3: ability words / keywords whose whole content is the keyword itself.
  'demonstrate', 'paradigm', 'gravestorm', 'forestwalk', 'islandwalk', 'swampwalk', 'mountainwalk',
  'plainswalk', 'landwalk', 'flanking', 'horsemanship', 'rampage', 'shroud', 'intimidate', 'wither',
  'persist', 'undying', 'conspire', 'entwine', 'epic', 'fateseal', 'exert', 'afterlife', 'ascend',
  // round 1: keyword lines the corpus plays that the table did not admit.
  'cleave', 'escalate', 'embalm', 'bargain', 'toxic', 'training', 'affinity for artifacts',
  'affinity for creatures', 'affinity for enchantments', 'affinity for planeswalkers',
  'affinity for lands', 'affinity for artifact creatures', 'devoid', 'seek', 'blitz',
  "doctor's companion", 'villainous choice', 'escalate', 'surveil', 'living metal',
  'firebending', 'earthbending', 'waterbending', 'airbending', 'sneak', 'mayhem', 'encore',
  'empower', 'gift', 'flurry', 'renew', 'disguise', 'solved', 'valiant', 'behold',
  'umbra armor', 'shadowborn', 'fading', 'sunburst', 'devour', 'exalted',
];
const ALL_KW = new Set([...EVASION, ...COMBAT_KW, ...PROTECTION_KW, ...OTHER_KW]);

/** Text that carries no score-relevant mechanic once its atom is consumed. */
const GLUE = new Set([
  'a', 'an', 'the', 'this', 'that', 'those', 'these', 'it', 'its', 'their', 'them', 'they', 'you', 'your', 'yours',
  'and', 'or', 'then', 'also', 'if', 'do', 'so', 'may', 'up', 'to', 'of', 'on', 'in', 'into', 'from', 'with', 'for',
  'target', 'targets', 'each', 'any', 'all', 'other', 'another', 'is', 'are', 'was', 'were', 'be', 'been', 'as',
  'until', 'end', 'turn', 'card', 'cards', 'creature', 'creatures', 'permanent', 'permanents', 'player', 'players',
  'opponent', 'opponents', 'control', 'controls', 'controller', 'owner', 'owners', 'hand', 'battlefield', 'graveyard',
  'library', 'exile', 'exiled', 'when', 'whenever', 'at', 'beginning', 'one', 'two', 'instead', 'way', 'ways',
  'gets', 'get', 'gains', 'gain', 'has', 'have', 'source', 'spell', 'spells', 'ability', 'abilities', 'instant',
  'sorcery', 'artifact', 'artifacts', 'enchantment', 'enchantments', 'land', 'lands', 'token', 'tokens', 'copy',
  'there', 'where', 'x', 'n', 'equal', 'number', 'more', 'less', 'than', 'least', 'most', 'greatest', 'total',
  'value', 'mana', 'color', 'colors', 'colour', 'nonland', 'noncreature', 'choose', 'chosen', 'may', 'can', 'cant',
  'only', 'during', 'before', 'after', 'step', 'phase', 'upkeep', 'draw', 'main', 'combat', 'damage', 'life',
  'counter', 'counters', 'same', 'different', 'name', 'named', 'nontoken', 'legendary', 'basic', 'random', 'order',
  'rest', 'bottom', 'top', 'face', 'down', 'up', 'under', 'put', 'puts', 'return', 'returns', 'way', 'this', 'new',
  'among', 'those', 'both', 'twice', 'first', 'next', 'last', 'tapped', 'untapped', 'nonbasic', 'attacking',
  'blocking', 'blocked', 'unblocked', 'white', 'blue', 'black', 'red', 'green', 'colorless', 'multicolored',
  'mono', 'cost', 'costs', 'without', 'paying', 'pays', 'paid', 'per', 'per-turn', 'unless', 'while', 'but',
  'over', 'out', 'onto', 'off', 'about', 'by', 'not', 'no', 'nothing', 'anything', 'something', 'someone',
  'greater', 'fewer', 'many', 'much', 'half', 'rounded', 'plus', 'minus', 'times', 'type', 'types', 'subtype',
  'zero', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'able', 'possible', 'way',
  'dont', 'doesnt', 'isnt', 'wont', 'arent', 'hasnt', 'havent', 'didnt', 'wouldnt', 'couldnt', 'werent',
  'him', 'her', 'his', 'hers', 'itself', 'himself', 'herself', 'themselves', 'way', 'this',
  'enchanted', 'equipped', 'attached', 'vehicle', 'vehicles', 'planeswalker', 'planeswalkers', 'battle',
  'battles', 'equipment', 'aura', 'auras', 'saga', 'sagas', 'time', 'times', 'resolved', 'second', 'third',
  'power', 'toughness', 'base', 'additional', 'another', 'other', 'own', 'owns', 'sacrificed', 'destroyed',
  'gain', 'gains', 'granted', 'foods', 'clues', 'treasures', 'blood', 'maps', 'lander', 'landers',
  'choice', 'choices', 'becomes', 'become', 'addition', 'otherwise', 'energy', 'devotion', 'historic',
]);

export interface Atom {
  kind: 'effect' | 'rider';
  re: RegExp;
  make?: (m: RegExpExecArray, ctx: Ctx) => Partial<TypedEffect> | null;
}

interface Ctx {
  card: GeneratableCard;
  mode: EffectMode;
  cost: EffectCost;
  earliestTurn: number;
  summoningSickness: boolean;
  instantSpeed: boolean;
  controller: 'self' | 'opponent' | 'any';
  prerequisites: string[];
  /** §9.6 step 1: what the MODE's trigger or cost consumes. A trigger clause
   * is the consumer side of a typed resource — "whenever you gain life" is a
   * life-gain EVENT consumer, distinct from the life AMOUNT an effect
   * produces and from life PAID as a cost. `finish` merges these in so
   * `deck-score-producers.ts` can match producers to present consumers. */
  consumes: string[];
}

/** Resources a trigger clause reads. Pure text -> resource, no card names. */
const TRIGGER_CONSUMES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\byou gain(?:ed)?(?: or lose)? \d* ?(?:or more )?life|\bgains? life\b/i, 'life gain event'],
  [/\byou cast (?:a|an|another|your|each|this)\b[^,]*\bspell/i, 'spell cast'],
  [/\b(?:creature|permanent|artifact|another creature|this creature)[^,]*\bdies\b|\bdies\b/i, 'creature death'],
  [/\b(?:creature|another creature|a creature you control|permanent)[^,]*\benters\b/i, 'creature etb'],
  [/\+1\/\+1 counters? (?:is|are) put|\bcounters? (?:is|are) put on/i, 'counter placement'],
  [/\bcards? (?:is|are) put into your graveyard|\bmills?\b|\bput into (?:a|your) graveyard from/i, 'graveyard cards'],
  [/\byou sacrifice\b|\bsacrifices? (?:a|an|another)\b/i, 'creature death'],
];

function eff(
  family: EffectFamily,
  ctx: Ctx,
  extra: Partial<TypedEffect> & { outputBounds: TypedEffect['outputBounds'] },
): Partial<TypedEffect> {
  return { family, ...extra };
}

/** Ordered: longer / more specific shapes first so they claim their span. */
const ATOMS: Atom[] = [
  // --- mana -------------------------------------------------------------
  {
    kind: 'effect',
    re: /\badds? (?:an additional )?(?:\{[^}]+\})+|adds? (?:an additional )?(one|two|three|x) mana of (?:any|the chosen) (?:colou?r that a land (?:you|an opponent) controls? could produce|colou?r among [^.]*|type that a land you control could produce|of the exiled card's colou?rs|(?:one )?colou?r(?: in your commander's colou?r identity)?)|adds? (\w+) mana in any combination of colou?rs|\badds? an amount of \{[WUBRGC]\} equal to [^.,]*/gi,
    make: (m, ctx) => {
      const pips = (m[0].match(/\{[^}]+\}/g) ?? []).length;
      const n = pips || num(m[1] ?? m[2]);
      return eff('mana', ctx, { produces: ['mana'], outputBounds: { min: n, max: n, unit: 'mana' } });
    },
  },
  {
    kind: 'effect',
    re: /\bcreates? (a|an|one|two|three|\d+) (?:tapped )?treasure tokens?/gi,
    make: (m, ctx) => eff('mana', ctx, { produces: ['treasure'], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'treasure' } }),
  },
  {
    kind: 'effect',
    re: /\bsearch(?:es)? your library for (?:a|up to (?:one|two|three)) basic land cards?(?: and\/or [a-z]+ cards?)?,? put (?:it|them) onto the battlefield(?: tapped)?|\bsearch(?:es)? your library for an? (?:plains|island|swamp|mountain|forest)(?:,? (?:or )?(?:plains|island|swamp|mountain|forest))* cards?,? put it onto the battlefield(?: tapped)?|\byou may put an? [a-z' -]* cards? from among them onto the battlefield(?: tapped)?/gi,
    make: (m, ctx) => eff('mana', ctx, { zones: ['library', 'battlefield'], targetFilters: ['basic land card'], produces: ['land'], outputBounds: { min: 1, max: 1, unit: 'lands' } }),
  },
  {
    kind: 'effect',
    re: /\byou may play an additional land (?:on each of your turns|this turn)/gi,
    make: (m, ctx) => eff('mana', ctx, { produces: ['extra land drop'], outputBounds: { min: 1, max: 1, unit: 'extra lands per turn' } }),
  },
  // --- tutor ------------------------------------------------------------
  {
    kind: 'effect',
    re: /\bsearch(?:es)? your library (?:and\/or graveyard )?for (a|an|up to (?:one|two|three)) ([a-z' -]+?) cards?(?: with [a-z' ]*value x or less)?(?:,? (?:reveal|put|and put)[^.,]*)?/gi,
    make: (m, ctx) => eff('tutor', ctx, { zones: ['library'], targetFilters: [`${m[2]} card`], produces: ['card'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /search(?:es)? your library for a card,? (?:exile it face down|put it into your (?:hand|graveyard))/gi,
    make: (m, ctx) => eff('tutor', ctx, { zones: ['library'], targetFilters: ['any card'], produces: ['card'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\bsearch(?:es)? your library for a card(?: with [^,.]*)?,? (?:reveal it, )?(?:exile it face down|put (?:it|that card) into your (?:hand|graveyard)|then shuffle and put that card on top)/gi,
    make: (m, ctx) => eff('tutor', ctx, { zones: ['library'], targetFilters: ['any card'], produces: ['card'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  // --- advantage --------------------------------------------------------
  {
    kind: 'effect',
    re: /\bdraws? (a|an|one|two|three|four|five|x|\d+|half x|that many) cards?/gi,
    make: (m, ctx) => {
      const n = num(m[1]);
      return eff('advantage', ctx, { produces: ['cards'], outputBounds: { min: n, max: n, unit: 'cards' } });
    },
  },
  {
    kind: 'effect',
    re: /\b(?:looks? at|exiles?) the top (?:(a|an|one|two|three|four|five|six|seven|x|\d+) )?cards? of (?:your|target player's) library/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library'], produces: ['selection'], outputBounds: { min: 0, max: num(m[1]), unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\b(surveil|scry) (one|two|three|four|x|\d+)/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library'], produces: ['selection'], outputBounds: { min: 0, max: 0, unit: 'net cards' } }),
  },
  {
    kind: 'effect',
    re: /\bmills? (a|an|one|two|three|four|five|x|\d+) cards?/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library', 'graveyard'], produces: ['graveyard cards'], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'graveyard cards' } }),
  },
  {
    kind: 'effect',
    re: /\bcreates? (a|an|one|two|three|\d+) (?:lander|map|blood|powerstone|incubator|junk|shard|gold|walker|thopter|servo|fungus) tokens?/gi,
    make: (m, ctx) => eff('engine', ctx, { produces: ['artifact token'], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'tokens' } }),
  },
  {
    kind: 'effect',
    re: /\bcreates? (a|an|one|two|three|\d+) clue tokens?/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['clue'], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'clues' } }),
  },
  {
    kind: 'effect',
    re: /\bcreates? (a|an|one|two|three|\d+) food tokens?/gi,
    make: (m, ctx) => eff('engine', ctx, { produces: ['food'], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'food' } }),
  },
  // §9.6 step 1: life-gain AMOUNT. A life-gain EVENT (the trigger "whenever
  // you gain life") is a CONSUMER and is typed from the trigger clause in
  // `generateEntry`, not here; life PAID is a cost, typed in `activationCost`
  // and the life-payment rider. Keeping the three apart is what lets
  // `deck-score-producers.ts` charge unserved life production.
  {
    kind: 'effect',
    re: /\byou (?:may )?gain (one|two|three|four|five|six|seven|x|\d+) life|\b(?:you|its controller|that player) gains? (?:that much|x) life/gi,
    make: (m, ctx) => {
      const n = m[1] ? num(m[1]) : 1;
      return eff('advantage', ctx, { produces: ['life'], outputBounds: { min: n, max: m[1] ? n : null, unit: 'life' } });
    },
  },
  {
    kind: 'effect',
    re: /\breturns? (?:another target|target|up to (?:one|two|three|x)|all|each) ([a-z' -]*?)cards?(?: with [^,.]*?)? from your graveyard to (?:your hand|the battlefield)(?: tapped)?/gi,
    make: (m, ctx) => eff('engine', ctx, { zones: ['graveyard'], targetFilters: [`${(m[1] || '').trim() || 'any'} card`], consumes: ['graveyard cards'], produces: ['recursion'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  // --- answers ----------------------------------------------------------
  {
    kind: 'effect',
    re: /\b(destroys?|exiles?) (?:all|each) ([a-z' -]+?)(?: with mana value x or less)?(?=[,.]|$)/gi,
    make: (m, ctx) => {
      const axes: AnswerAxis[] = /creature/i.test(m[2]) ? ['creature'] : ['permanent'];
      return eff('answer', ctx, { answerAxes: axes, targetFilters: [`all ${m[2].trim()}`], outputBounds: { min: 2, max: null, unit: 'permanents answered' } });
    },
  },
  {
    kind: 'effect',
    re: /\b(destroys?|exiles?) (?:up to (?:one|two|three|four|x) )?(?:other |another )?target ([a-z' ,-]*?)(creature|permanent|artifact|enchantment|planeswalker|land|battle|token)s?\b(?: and\/or [a-z]+s?\b)?[a-z ,\/]*/gi,
    make: (m, ctx) => {
      const axes: AnswerAxis[] = m[3] === 'creature' ? ['creature'] : ['permanent'];
      if (m[3] !== 'creature' && /creature/i.test(m[0])) axes.push('creature');
      return eff('answer', ctx, { answerAxes: axes, targetFilters: [`target ${m[2]}${m[3]}`.trim()], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } });
    },
  },
  {
    kind: 'effect',
    re: /\bcounters? target ([a-z' ,-]*?)spell(?: unless its controller pays (?:\{[^}]+\})+)?|\bexiles? any number of target spells/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['stack'], targetFilters: [`target ${(m[1] || '').trim()} spell`.replace(/\s+/g, ' ')], outputBounds: { min: 1, max: 1, unit: 'spells answered' } }),
  },
  {
    kind: 'effect',
    re: /\bdeals? (one|two|three|four|five|six|seven|x|\d+) damage (?:divided as you choose )?(?:among|to) (any number of target [a-z' -]+|any target|up to (?:one|two|three) targets?[a-z' ,-]*|target [a-z' ,-]+|each [a-z' -]+|that [a-z' -]+)/gi,
    make: (m, ctx) => {
      const target = m[2].toLowerCase();
      const axes: AnswerAxis[] = [];
      if (/creature|any target|permanent|each/.test(target)) axes.push('creature');
      if (/planeswalker|permanent/.test(target)) axes.push('permanent');
      const family: EffectFamily = /opponent|player|any target/.test(target) ? 'closing' : 'answer';
      return eff(family, ctx, { answerAxes: axes, targetFilters: [target], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'damage' } });
    },
  },
  {
    kind: 'effect',
    re: /\breturns? (target|all|each|up to (?:one|two|three)|one or two target|two target) ([a-z' -]*?)(creatures?|permanents?|cards?)\b[a-z ,'\/-]*? to (?:its owner's|their owners'|your) hands?/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: /creature/i.test(m[3]) ? ['creature'] : ['permanent'], targetFilters: [`${m[1]} ${m[2]}${m[3]}`.trim()], outputBounds: { min: 1, max: null, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\b(?:target|all|each) creatures? (?:you control |an opponent controls )?gets? (-\d+\/-\d+)/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['creature'], targetFilters: ['target creature'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\btaps? (?:up to (?:one|two|three) )?target ([a-z' -]*?)creatures?/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['creature'], prerequisites: ['effect is temporary'], targetFilters: ['target creature'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\bcounters? target activated or triggered ability/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['stack'], targetFilters: ['target ability'], outputBounds: { min: 1, max: 1, unit: 'abilities answered' } }),
  },
  {
    kind: 'effect',
    re: /\b(?:deals? damage equal to [^.]*? to (?:up to one )?target ([a-z' -]*?)creature[a-z ']*|fights? (?:up to one )?target creature[a-z ']*)/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['creature'], targetFilters: ['target creature'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\bshuffles? [a-z' ]*target creature[^.]*into (?:their owners'|its owner's) librar(?:y|ies)/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['creature'], targetFilters: ['target creature'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\blooks? at target opponent's hand|\btarget opponent reveals their hand/gi,
    make: (m, ctx) => eff('advantage', ctx, { controller: 'opponent', zones: ['hand'], produces: ['information'], outputBounds: { min: 0, max: 0, unit: 'net cards' } }),
  },
  {
    kind: 'effect',
    re: /\bexiles? (?:a|an|one) (?:nonland|noncreature, nonland|creature|artifact)?\s?cards? from (?:it|their hand|that player's hand)[^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, { controller: 'opponent', zones: ['hand'], produces: ['hand disruption'], outputBounds: { min: 1, max: 1, unit: 'cards stripped' } }),
  },
  {
    kind: 'effect',
    re: /\b(?:this permanent|this creature|it) explores\b/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library'], produces: ['selection'], outputBounds: { min: 0, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\bexiles? (?:x target|target|a) ([a-z' -]*?)cards? from (?:a|an opponent's|target player's) graveyard|\bexiles? (?:all cards from )?(?:target player's|each opponent's) graveyard/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['graveyard_or_protection'], zones: ['graveyard'], targetFilters: ['card in a graveyard'], outputBounds: { min: 1, max: 1, unit: 'cards answered' } }),
  },
  {
    kind: 'effect',
    re: /\byour opponents can't cast (?:spells|noncreature spells|creature spells)(?: this turn)?/gi,
    make: (m, ctx) => eff('answer', ctx, { controller: 'opponent', answerAxes: ['stack'], prerequisites: ['effect lasts one turn'], outputBounds: { min: 1, max: null, unit: 'spells answered' } }),
  },
  {
    kind: 'effect',
    re: /\bspells you control can't be countered(?: this turn)?|\byou (?:and permanents you control )?(?:gain|have) hexproof(?: from [a-z]+)?(?: this turn)?/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['graveyard_or_protection'], outputBounds: { min: 1, max: 1, unit: 'spells protected' } }),
  },
  {
    kind: 'effect',
    re: /\bputs? (?:it|that card|(?:one|two|up to one|up to two) of (?:those cards|them)) into your hand/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['hand'], produces: ['cards'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\bputs? target ([a-z' -]*?)cards? from a graveyard onto the battlefield(?: under your control)?/gi,
    make: (m, ctx) => eff('engine', ctx, { zones: ['graveyard', 'battlefield'], targetFilters: [`target ${(m[1] || '').trim()} card`], produces: ['recursion'], outputBounds: { min: 1, max: 1, unit: 'permanents' } }),
  },
  {
    kind: 'effect',
    re: /\bloses all abilities and is an? [a-z ]*creature with base power and toughness \d+\/\d+/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['creature'], targetFilters: ['enchanted creature'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\byou may have this (?:creature|enchantment|artifact|permanent) enter as a copy of [^.]*|\bcreates? a token that's a copy of [a-z' ]*(?:permanent|creature)[a-z' ]*/gi,
    make: (m, ctx) => eff('engine', ctx, { controller: 'any', zones: ['battlefield'], targetFilters: ['a permanent on the battlefield'], produces: ['copy'], outputBounds: { min: 1, max: 1, unit: 'copied permanents' } }),
  },
  {
    kind: 'effect',
    re: /\bexiles? (?:another )?target (?:creature|permanent) you control, then returns? it to the battlefield[a-z' ]*/gi,
    make: (m, ctx) => eff('engine', ctx, { controller: 'self', zones: ['battlefield', 'exile'], targetFilters: ['permanent you control'], produces: ['blink'], outputBounds: { min: 1, max: 1, unit: 'retriggered permanents' } }),
  },
  {
    kind: 'effect',
    re: /\buntaps? (?:x |up to (?:one|two|three) )?target lands?|\buntaps? up to (?:one|two|three|x) lands?|\buntaps? all (?:lands|permanents|creatures) you control/gi,
    make: (m, ctx) => eff('mana', ctx, { controller: 'self', zones: ['battlefield'], produces: ['mana'], outputBounds: { min: 1, max: null, unit: 'mana' } }),
  },
  {
    kind: 'effect',
    re: /\bchanges? the target of target spell[a-z' ]*|\bgains? control of target (?:noncreature )?spell/gi,
    make: (m, ctx) => eff('answer', ctx, { controller: 'opponent', zones: ['stack'], answerAxes: ['stack'], targetFilters: ['target spell'], outputBounds: { min: 1, max: 1, unit: 'spells answered' } }),
  },
  {
    kind: 'effect',
    re: /\btarget player draws (a|an|one|two|three|x|\d+) cards?|\byou gain life equal to [^.,]*/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: [m[1] ? 'cards' : 'life'], outputBounds: { min: m[1] ? num(m[1]) : 1, max: m[1] ? num(m[1]) : null, unit: m[1] ? 'cards' : 'life' } }),
  },
  {
    kind: 'effect',
    re: /\bcopy (?:target|that) (?:instant or sorcery|activated or triggered ability|spell)[a-z' ]*|\bcopy that spell\b/gi,
    make: (m, ctx) => eff('engine', ctx, { zones: ['stack'], targetFilters: ['target spell or ability'], produces: ['copy'], outputBounds: { min: 1, max: 1, unit: 'copies' } }),
  },
  {
    kind: 'effect',
    re: /\bprevents? all (?:combat )?damage that would be dealt(?: to [a-z' ]*)?(?: this turn)?/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['creature'], prerequisites: ['effect lasts one turn'], outputBounds: { min: 1, max: null, unit: 'attacks answered' } }),
  },
  {
    kind: 'effect',
    re: /\breturns? this card from your graveyard to (?:your hand|the battlefield)[a-z' ]*/gi,
    make: (m, ctx) => eff('engine', ctx, { zones: ['graveyard'], produces: ['recursion'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\bcreates? a number of [a-z' \/\d-]*tokens? equal to [^.,]*/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['tokens', 'pressure'], outputBounds: { min: 1, max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    re: /\bdoubles? all damage that sources you control[^.]*|\bit deals that much damage plus \d+ instead|\bthere is an additional combat phase[^.]*/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['damage multiplier'], outputBounds: { min: 1, max: null, unit: 'extra damage' } }),
  },
  {
    kind: 'effect',
    re: /\bdeals? damage equal to [^.,]*? to (any target|target [a-z' -]+|each opponent[a-z' ]*|each [a-z' -]+)/gi,
    make: (m, ctx) => eff(/opponent|player|any target/.test(m[1]) ? 'closing' : 'answer', ctx, { targetFilters: [m[1]], outputBounds: { min: 1, max: null, unit: 'damage' } }),
  },
  // Keyword actions are rules text with a fixed meaning (CR 701): each one is
  // the effect it names, so they type like any other clause.
  {
    kind: 'effect',
    re: /\binvestigates?\b|\binvestigate \d+/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['clue'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\bdiscover [x\d]+/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library'], produces: ['free cast'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\b(?:adapt|devour|earthbend|bolster|monstrosity) [x\d]+|\benters with (?:an additional )?[x\d]+ \+1\/\+1 counters?[^.]*|\bmoves? any number of \+1\/\+1 counters[^.]*/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['pressure'], outputBounds: { min: 1, max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    re: /\bit becomes an? \d+\/\d+ [a-z]+ creature in addition to its other types/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['pressure'], outputBounds: { min: 1, max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    re: /\beach (?:opponent|player) (?:sacrifices?|chooses an? [a-z' -]+ they control)[^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['permanent'], controller: 'opponent', targetFilters: ['each player'], outputBounds: { min: 1, max: null, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\bprevents? all (?:combat )?damage[^.]*|\byou gain protection from everything[^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['graveyard_or_protection'], produces: ['protection'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } }),
  },
  {
    kind: 'effect',
    re: /\byou gain life and draws? cards? equal to [^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['card', 'life'], outputBounds: { min: 1, max: null, unit: 'net cards' } }),
  },
  // --- closing ----------------------------------------------------------
  {
    kind: 'effect',
    re: /\b(?:each opponent|target opponent|target player|each player|its controller|that player)(?: [a-z]+){0,4}? loses (one|two|three|four|five|six|seven|x|\d+|that much|) ?life(?: equal to [^.,]*)?/gi,
    make: (m, ctx) => eff('closing', ctx, { controller: 'opponent', produces: ['opponent life loss'], outputBounds: { min: m[1] ? num(m[1]) : 1, max: m[1] ? num(m[1]) : null, unit: 'life lost' } }),
  },
  {
    kind: 'effect',
    re: /\bcreates? (a|an|one|two|three|four|five|six|\d+|x|twice x|that many) (?:tapped |tapped and attacking )?([\dx*]+\/[\dx*]+) ([a-z' -]+?) (?:creature )?tokens?(?: with "[^"]*")?(?: with [a-z, ]+(?:and [a-z]+)?)?/gi,
    make: (m, ctx) => {
      const n = num(m[1]);
      const power = Number(m[2].split('/')[0]) || 0;
      // "Its controller creates a 2/2 Bird" (Swan Song) is the OPPONENT's
      // board, not ours — §1 "our own spells do not satisfy an opponent's
      // trigger" cuts both ways.
      const before = m.input.slice(Math.max(0, m.index - 28), m.index).toLowerCase();
      const theirs = /its controller|that player|each opponent|target opponent|each other player/.test(before);
      return eff('closing', ctx, {
        ...(theirs ? { controller: 'opponent' as const } : {}),
        // §9.6 step 1 "Food / Treasure / creature-token distinctions": a
        // CREATURE token is a body, which is direct pressure. Treasure is
        // mana and Food is life — each has its own produces key above, so
        // `deck-score-producers.ts` can tell a Kuja token (direct combat use)
        // from a Food (needs a life route).
        produces: ['tokens', 'creature token', 'pressure'],
        outputBounds: { min: theirs ? 0 : n * power, max: theirs ? 0 : n * power, unit: 'power' },
      });
    },
  },
  {
    kind: 'effect',
    re: /\bputs? (a|an|one|two|three|four|five|x|that many|\d+) \+1\/\+1 counters? on/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['+1/+1 counters'], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'power' } }),
  },
  // §9.6 step 1 "graveyard entry / exit / recursion". Entry is the mill atom
  // above (`produces: graveyard cards`); these two are EXIT: a card leaving a
  // graveyard is only useful where something put it there, so they consume.
  {
    kind: 'effect',
    re: /\byou may cast this card from your graveyard[^.]*|\beach [a-z' ]*cards? in your graveyard gains? (?:unearth|flashback|escape)[^.]*|\byou may cast [a-z' ]*spells? from [a-z' ]*your graveyard[^.]*/gi,
    make: (m, ctx) => eff('engine', ctx, { zones: ['graveyard'], consumes: ['graveyard cards'], produces: ['recursion'], outputBounds: { min: 1, max: null, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\bfabricate [x\d]+/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['+1/+1 counters', 'tokens', 'creature token', 'pressure'], outputBounds: { min: num(m[0].split(' ')[1]), max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    re: /\b(?:[a-z,' -]+ )?(?:creatures )?you control gets? \+(\d+)\/\+(\d+)/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['anthem'], outputBounds: { min: num(m[1]), max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    re: /\b(?:equipped|enchanted|target|this permanent|this creature) creature?(?: you control)? gets \+(\d+)\/\+(\d+)/gi,
    make: (m, ctx) => eff('closing', ctx, { targetFilters: ['target creature'], produces: ['pump'], outputBounds: { min: num(m[1]), max: num(m[1]), unit: 'power' } }),
  },
  // --- riders: text with no independent score-relevant output -----------
  { kind: 'rider', re: /\bthis (spell|ability) costs (?:\{[^}]+\}|\{x\}) less to cast(?:[^.]*)?/gi },
  { kind: 'rider', re: /\bas an additional cost to cast this spell,? [^.]*/gi },
  { kind: 'rider', re: /\bthis (creature|artifact|enchantment|permanent|land) enters tapped(?: if [^.]*| unless [^.]*)?/gi },
  { kind: 'rider', re: /\bthen shuffles?(?: your library)?/gi },
  { kind: 'rider', re: /\bactivate(?: this ability)? only (?:as a sorcery|once each turn|during your turn)[^.]*/gi },
  { kind: 'rider', re: /\bthis ability triggers only once each turn/gi },
  { kind: 'rider', re: /\bdiscards? (?:a|an|one|two|three|x|\d+) [a-z' -]*cards?|discards? (?:your|their) hand/gi },
  { kind: 'rider', re: /\bsacrifices? (?:this|a|an|another|one|two|\d+) [a-z' -]*/gi },
  { kind: 'rider', re: /\bexiles? (?:it|this card|that card|them)\b/gi },
  { kind: 'rider', re: /\bputs? the rest (?:on the bottom of your library|into your graveyard)[a-z ,]*/gi },
  { kind: 'rider', re: /\b(?:it|that creature|they|target creature) (?:gains?|has) (?:flying|trample|lifelink|deathtouch|haste|menace|vigilance|first strike|double strike|hexproof|indestructible|protection|reach|ward)[a-z {}0-9]*/gi },
  { kind: 'rider', re: /\b(?:with|and) (?:a|an|one|two|\d+) (?:finality|stun|shield|lore|age|quest|charge|loyalty|\+1\/\+1|-1\/-1) counters? on (?:it|them|that permanent)/gi },
  { kind: 'rider', re: /\bthis effect lasts? until end of turn|until end of turn/gi },
  { kind: 'rider', re: /\byou may pay (?:\{[^}]+\})+(?: rather than pay this spell's mana cost)?|if you do(?:n't)?,/gi },
  { kind: 'rider', re: /\breveals? (?:the top card of your library|it|that card|your hand)/gi },
  { kind: 'rider', re: /\bthey can't be regenerated|it can't be regenerated/gi },
  { kind: 'rider', re: /\bactivate(?: this ability)? only [^.]*/gi },
  { kind: 'rider', re: /\b(?:it|this creature|this land|this permanent) enters tapped[^.]*|if you don't,? it enters tapped/gi },
  { kind: 'rider', re: /\bas this (?:land|creature|artifact|enchantment) enters,? you may pay \d+ life/gi },
  { kind: 'rider', re: /\byou (?:may )?lose \d+ life\b|pays? \d+ life\b/gi },
  { kind: 'rider', re: /\bspend this mana only (?:to|on) [^.]*/gi },
  { kind: 'rider', re: /\byou may play (?:those cards|that card|them|it) this turn|you may cast (?:it|that card|them|spells this turn)[^.]*/gi },
  { kind: 'rider', re: /\byou may cast (?:this spell|it) without paying its mana cost|(?:this|that) spell can't be countered/gi },
  // Stage 4a: the copy rider read "for it" only, so `Thousand-Year Storm`
  // ("...copy it for each other instant and sorcery spell you've cast before
  // it this turn. You may choose new targets for the copies.") finished with
  // ZERO typed effects and no coverage at all — the marquee payoff of every
  // storm list. The sentence carries no independent output in either form.
  { kind: 'rider', re: /\byou may choose new targets for (?:it|the copy|the copies|that copy|those copies)|this (?:creature|permanent) can't (?:block|attack)[^.,]*/gi },
  // The same class of narrow miss: the `looks? at the top N cards` atom above
  // consumes its own clause and leaves the reorder tail unclaimed, which is
  // why `Ponder` and every other look-and-reorder cantrip stayed partial.
  { kind: 'rider', re: /\bputs? (?:them|it|those cards|these cards) back(?: in any order)?(?: on top(?: of your library)?)?/gi },
  { kind: 'rider', re: /\bwhen you do,?|if you don't,?|if it (?:was|is|does|isn't)[^.,]*,?/gi },
  { kind: 'rider', re: /\bnamed [A-Z][A-Za-z'\u2019-]*(?: [A-Z][A-Za-z'\u2019-]*)*/g },
  { kind: 'rider', re: /\blevel(?: up)?(?: \d+(?:-\d+)?)?\b|\bventure into the dungeon/gi },
  { kind: 'rider', re: /\bshuffles? (?:your library|their library)/gi },
  { kind: 'rider', re: /\bwhere x is [^.,]*|for each [a-z' -]+(?: you control| in your graveyard| on the battlefield)?/gi },
  { kind: 'rider', re: /\bwith (?:total )?mana value \d+ or (?:less|greater)/gi },
  { kind: 'rider', re: /\bit's still a land|it's not a creature|it loses all other card types/gi },
  { kind: 'rider', re: /\byou don't lose this mana as steps and phases end/gi },
  { kind: 'rider', re: /\btransforms? (?:this permanent|it|this creature)/gi },
  { kind: 'rider', re: /\bputs? (?:a|an|one|two|three|x|\d+) (?!\+1\/\+1)[a-z-]+ counters? on [a-z' ]*/gi },
  { kind: 'rider', re: /\benters? with (?:a|an|one|two|x|\d+) [+\-\dx/]* ?[a-z-]* counters? on (?:it|him|her|them)/gi },
  { kind: 'rider', re: /\bshuffles?\b/gi },
  { kind: 'rider', re: /\bgains? (?:flying|trample|lifelink|deathtouch|haste|menace|vigilance|first strike|double strike|hexproof|indestructible|reach|ward)[a-z {}0-9]*/gi },
  { kind: 'rider', re: /\bexiles? (?:this permanent|this creature|this card)\b/gi },
  { kind: 'rider', re: /\byou may play it until the end of your next turn/gi },
  { kind: 'rider', re: /\byou may choose new targets for (?:it|the copy)/gi },
  { kind: 'rider', re: /\bexiles? (?:a|an|one) [a-z, '-]* cards? from your hand/gi },
  { kind: 'rider', re: /\breveals? (?:a|an|one|up to (?:one|two|three)) [a-z' -]* cards?[a-z ']*/gi },
  { kind: 'rider', re: /\bat random\b|\bin any order\b|\bface down\b/gi },
  { kind: 'rider', re: /\b(?:has|have|gains?|gain)(?: your choice of)? (?:double strike|first strike|flying|trample|haste|lifelink|deathtouch|vigilance|menace|reach|prowess|indestructible|shroud|defender|flash|hexproof(?: from [a-z]+)?|ward\s*(?:\{[^}]*\}|[\u2014\u2013-]\s*pay \d+ life)?)(?:(?:,| and| or)+ (?:double strike|first strike|flying|trample|haste|lifelink|deathtouch|vigilance|menace|reach|prowess|indestructible|shroud|defender|flash|hexproof(?: from [a-z]+)?|ward\s*(?:\{[^}]*\}|[\u2014\u2013-]\s*pay \d+ life)?))*/gi },
  { kind: 'rider', re: /\bwith (?:double strike|first strike|flying|trample|haste|lifelink|deathtouch|vigilance|menace|reach|prowess|indestructible|ward\s*\{[^}]*\})(?:(?:,| and) (?:double strike|first strike|flying|trample|haste|lifelink|deathtouch|vigilance|menace|reach|prowess|indestructible))*/gi },
  { kind: 'rider', re: /\bas long as [^,.]*/gi },
  { kind: 'rider', re: /\bif you've [a-z0-9 '\u2019]*|you've gained \d+ or more life this turn/gi },
  { kind: 'rider', re: /\bif you cast (?:it|this spell),?|if this spell was cast from [^,.]*,?/gi },
  { kind: 'rider', re: /\bdeals? \d+ damage to you\b/gi },
  { kind: 'rider', re: /\bit's an? (?:enchantment|artifact|creature|land)\b/gi },
  { kind: 'rider', re: /\benchant [a-z' ]*|\bif this card is in your opening hand[^.]*/gi },
  { kind: 'rider', re: /\battach (?:any number of )?target [a-z' ]*/gi },
  { kind: 'rider', re: /\bthis (?:artifact|creature|land|permanent) doesn't untap during your untap step|\buntaps? this (?:artifact|creature|land|permanent)/gi },
  { kind: 'rider', re: /\bdamage can't be prevented this turn|\bthat player may pay (?:\{[^}]+\})+/gi },
  { kind: 'rider', re: /\bthis (?:vehicle|creature|permanent)'s power (?:and toughness )?(?:is|are) equal to [^.]*|\bthen amass [a-z]* ?\d+/gi },
  { kind: 'rider', re: /\bputs? it onto the battlefield[a-z' ]*|\btransformed under its owner's control/gi },
  { kind: 'rider', re: /\buntaps? that (?:land|creature|permanent|artifact)|\bchoose one\s*[\u2014\u2013-]?/gi },
  { kind: 'rider', re: /\bif that spell is countered this way, exile it instead of putting it into its owner's graveyard/gi },
  { kind: 'rider', re: /\bcan't be blocked(?: by [a-z0-9' -]*)?|\bcan't block[a-z' ]*/gi },
  { kind: 'rider', re: /\bdoubles? the number of \+1\/\+1 counters on [a-z' ]*/gi },
  { kind: 'rider', re: /\bthe first [a-z' -]*spell[a-z' ]*(?:you cast)?[a-z' ]*costs (?:\{[^}]+\})+ less to cast|\bequip abilities you activate[^.]*|\byou may pay \{0\} rather than pay the equip cost[^.]*/gi },
  { kind: 'rider', re: /\bif this spell was kicked,?|\bif (?:\{[^}]+\})+ was spent to cast it,?/gi },
  { kind: 'rider', re: /\byou choose an? [a-z, -]* card from it|\bthat player discards that card/gi },
  { kind: 'rider', re: /\bexiles? it instead of putting it into its owner's graveyard/gi },
  // A generated free-spell card keeps its PRINTED cost: the alternate cost is
  // accounted for as text but not as a cheaper mode. The §8-named free spells
  // (Force of Will, Fierce Guardianship, Deadly Rollick, ...) are curated with
  // an explicit `alternate_cost` mode instead.
  { kind: 'rider', re: /\bif you control a commander,?|\byou may exile (?:a|an|two|one) [a-z ]*cards? from your hand rather than pay this spell's mana cost/gi },
  { kind: 'rider', re: /\bif you (?:gained|lost|gained and lost) life this turn,?|\bif (?:this is the|it's the) (?:first|second|third) time[^.,]*,?/gi },
  { kind: 'rider', re: /\byou may attach this equipment to it|\bstart your engines!/gi },
  { kind: 'rider', re: /\byou lose life equal to (?:that permanent's|that card's|its) mana value/gi },
  { kind: 'rider', re: /\b[a-z]+ spells you cast cost (?:\{[^}]+\})+ less to cast|\bproliferate\b/gi },
  { kind: 'rider', re: /\bat the beginning of the next turn's upkeep|\bput the rest on the bottom[a-z ]*/gi },
  { kind: 'rider', re: /\bits controller may search their library for a basic land card[^.]*|\bis an? [A-Za-z]+ in addition to its other types|\byou don't lose unspent [a-z]* ?mana as steps and phases end/gi },
  { kind: 'rider', re: /\bregenerates? each creature you control|\botherwise,?|\byou get (?:\{E\})+|\bbecomes? (?:red|blue|green|white|black|a green|an? [a-z]+ creature)[^.,]*/gi },
  { kind: 'rider', re: /\byou may tap or untap target permanent|\bputs? this permanent onto the battlefield from the command zone/gi },
  { kind: 'rider', re: /\byou may cast (?:noncreature )?spells as though they had flash|\buntaps? them\b/gi },
  { kind: 'rider', re: /\buntaps? (?:it|another target [a-z' ]*|this permanent|this creature)\b/gi },
  { kind: 'rider', re: /\bif you (?:have|control|gained|would|don't|do not|can't|'ve completed)[^.,]*,?|\bif a (?:triggered|source|creature|player|permanent)[^.,]*,?/gi },
  { kind: 'rider', re: /\byou don't lose this mana|\byou have no cards in hand|\bthis permanent is [a-z' 0-9\/]*/gi },
  // `(?!target)` keeps this from swallowing a real targeted effect that no
  // atom happens to cover — those must stay untyped, not silently vanish.
  { kind: 'rider', re: /\byou may (?:remove|return|tap|play|pay|exile|put) (?!target)[a-z' 0-9{}\/+-]*\b/gi },
  { kind: 'rider', re: /\bif (?!(?:[^,]*\bwould\b))(?:you|two|three|four|a|an|it|that|this|the|there|no|all|its)[a-z0-9 ,'+/-]{0,58}?,(?= )/gi },
  { kind: 'rider', re: /\bthen discards? a card unless [^.]*|\bciphe?r\b|\bit deals no combat damage[^.]*/gi },
  { kind: 'rider', re: /\byou take the initiative|\bthis (?:creature|permanent) becomes prepared|\bthis creature enters prepared/gi },
  { kind: 'rider', re: /\bthis ability costs (?:\{[^}]+\})+ less to activate[^.]*|\bactivated abilities of [a-z' ]*cost (?:\{[^}]+\})+ less to activate/gi },
  { kind: 'rider', re: /\byou may play (?:those cards|that card|them|it) until (?:your next|the end of your next) (?:turn|end step)/gi },
  // --- v1.3 riders (§9.6 step 1 residue) ---------------------------------
  // Text that changes no score-relevant resource once its atom is consumed.
  { kind: 'rider', re: /\btaps? (?:it|them|this permanent|this creature)\b/gi },
  { kind: 'rider', re: /\byou have no maximum hand size\b/gi },
  { kind: 'rider', re: /\bit'?s an? [a-z]+ (?:land|creature|artifact)\b/gi },
  { kind: 'rider', re: /\b(?:they'?re|it'?s|that creature becomes|creatures you control are|this artifact becomes)[a-z' ]* (?:an? )?[a-z' ]*(?:artifacts?|creatures?) in addition to (?:its|their) other (?:types|card types)/gi },
  { kind: 'rider', re: /\bputs? that many [a-z-]+ counters? on [a-z' ]*/gi },
  { kind: 'rider', re: /\ban opponent gains control of this [a-z]+\b/gi },
  { kind: 'rider', re: /\bas this (?:artifact|creature|permanent|enchantment|land) enters,? (?:choose|you may choose) (?:an?|one) [a-z ]*/gi },
  { kind: 'rider', re: /\byou (?:may )?lose life equal to [^.,]*|\byou may pay life equal to [^.,]*|\brather than pay the mana cost of [^,.]*/gi },
  { kind: 'rider', re: /\bthis (?:artifact|creature|permanent|enchantment|land) enters with [a-z0-9 +\/-]* counters? on it/gi },
  { kind: 'rider', re: /\bthen search your library for (?:up to )?[a-z0-9 ']* cards?[^.]*/gi },
  { kind: 'rider', re: /\bchoose another target [a-z' ]*|\bchoose target [a-z' ]* you control and target [a-z' ]* you don't control/gi },
  { kind: 'rider', re: /\bwhen that [a-z' ]* dies this turn,?|\bat the beginning of the next end step,?/gi },
  { kind: 'rider', re: /\bit'?s a [A-Za-z]+ in addition to its other types/gi },
  { kind: 'rider', re: /\bharness this permanent\b|\btap x untapped [a-z' ]*you control/gi },
  { kind: 'rider', re: /\bsacrifices? any number of [a-z' ]*you control\b/gi },
  { kind: 'rider', re: /\bthe same is true for [^.]*/gi },
  // --- v1.3 riders, second batch (party / dungeon / legendary residue) ----
  { kind: 'rider', re: /\bthis permanent is also an? [A-Za-z]+(?:,? (?:and\/or |and |or )?[A-Za-z]+)*\b/gi },
  { kind: 'rider', re: /\buntaps? (?:a|all|up to (?:one|two|three)) [a-z' ]*(?:creatures?|permanents?|lands?)[a-z' ]*/gi },
  { kind: 'rider', re: /\blands you control enter untapped\b|\byou can spend mana of any type to cast [a-z' ]*spells?\b/gi },
  { kind: 'rider', re: /\broom abilities of dungeons you own trigger an additional time\b|\bventure into the dungeon\b/gi },
  { kind: 'rider', re: /\b(?:that|this) (?:spell|ability|creature|permanent) (?:has|gains) [a-z]+\b|\bthat ability triggers an additional time\b/gi },
  { kind: 'rider', re: /\bchoose (?:hexproof or indestructible|one or both|a creature type|a color)\b/gi },
  { kind: 'rider', re: /\b(?:creatures you control|this creature|it) can'?t be blocked(?: except by [a-z' ]*)?(?: if [^.,]*)?/gi },
  { kind: 'rider', re: /\b(?:equipped|enchanted|this) creature has [a-z]+ if you control [^.]*/gi },
  { kind: 'rider', re: /\b[a-z]+(?:,? (?:and |or |and\/or )?[a-z]+)* spells you cast cost (?:\{[^}]+\})+ less to cast\b|\bspells you cast from [a-z' ]* cost (?:\{[^}]+\})+ less to cast\b/gi },
  { kind: 'rider', re: /\bdiscards? up to (?:one|two|three|x|\d+) cards?\b/gi },
  { kind: 'rider', re: /\bcreate (?:three|two|x) of those tokens instead[^.]*|\bsacrifices? those tokens\b/gi },
  { kind: 'rider', re: /\bit can'?t attack or block(?:,? and its activated abilities can'?t be activated)?/gi },
  { kind: 'rider', re: /\bif (?:it was kicked|you'?ve completed [a-z' ]*|you have a full party|you haven'?t completed [a-z' ]*),?/gi },
  { kind: 'rider', re: /\buntil your next turn,?|\bduring your end step,?|\bfor each opponent,?/gi },
  { kind: 'rider', re: /\bspecialize (?:\{[^}]+\})+|\bit gains suspend\b|\bit has all activated abilities of [^.]*/gi },
  // --- v1.3 atoms, second batch -----------------------------------------
];

/** Atoms appended after the rider table; kept separate only so the v1.3
 * additions read as one block. Order inside `ATOMS` is irrelevant — overlap
 * is resolved effect-first then longest-first in `scanSentence`. */
const V13_ATOMS: Atom[] = [
  {
    kind: 'effect',
    re: /\byou may cast [a-z', ]*spells? from the top of your library|\byou may cast (?:a|an) [a-z' ]*spell[^.]*without paying its mana cost|\byou may cast [a-z', ]*spells? (?:from your graveyard|as though they had flash)[^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library', 'graveyard'], produces: ['free cast'], outputBounds: { min: 1, max: null, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    // A NAMED token with no printed P/T. The noncreature token names are
    // excluded by hand: Treasure is mana, Food is life, a Clue is a card —
    // §9.6 step 1's "Food / Treasure / creature-token distinctions" is
    // exactly what a bare `[A-Za-z]+ token` match would destroy.
    // The `those characteristics` branch is FIRST: alternation is ORDERED, so
    // with the generic branch first `exec` returned the shorter
    // "Create a red and white creature token" and left " with those
    // characteristics" as non-glue residue — `Outlaws' Merriment` stayed
    // partial while its own atom matched.
    re: /\bcreates? a [a-z, ]*creature token with those characteristics\b|\bcreates? (?:a|an|one|two|three|x) (?:tapped )?(?!treasure|food|clue|blood|map|powerstone|incubator|junk|shard|gold|lander|role|wicked|cursed|young|monster|royal|sorcerer|mutavault)[A-Za-z][A-Za-z' -]* token\b/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['tokens', 'creature token', 'pressure'], outputBounds: { min: 1, max: null, unit: 'power' } }),
  },
  // A modal bullet that IS a token spec: `3/1 Human Warrior with trample`.
  {
    kind: 'effect',
    re: /^[\dx*]+\/[\dx*]+ [A-Za-z][A-Za-z' -]*(?: with [^.]*)?$/gi,
    make: (m, ctx) => {
      const power = Number(m[0].split('/')[0]) || 0;
      return eff('closing', ctx, { produces: ['tokens', 'creature token', 'pressure'], outputBounds: { min: power, max: power, unit: 'power' } });
    },
  },
  {
    kind: 'effect',
    re: /\b(?:its controller|you|that player) gains? life equal to [^.,]*/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['life'], outputBounds: { min: 1, max: null, unit: 'life' } }),
  },
  {
    kind: 'effect',
    re: /\bcounters? that spell(?: or ability)?(?: unless its controller pays (?:\{[^}]+\})+)?/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: ['stack'], targetFilters: ['that spell'], outputBounds: { min: 1, max: 1, unit: 'spells answered' } }),
  },
  {
    kind: 'effect',
    re: /\b(?:destroys?|exiles?) that (?:creature|planeswalker|permanent|artifact|enchantment|token)\b/gi,
    make: (m, ctx) => eff('answer', ctx, { answerAxes: /creature/i.test(m[0]) ? ['creature'] : ['permanent'], targetFilters: ['that permanent'], outputBounds: { min: 1, max: 1, unit: 'permanents answered' } }),
  },
  // §9.6 step 1 graveyard EXIT, granted form: `Each creature card in your
  // graveyard that's a Cleric ... has unearth {1}{B}`.
  {
    kind: 'effect',
    re: /\beach [a-z' ]*cards? in your graveyard[a-z' ,]*(?:has|have|gains?) (?:unearth|flashback|escape|embalm|eternalize)[^.]*/gi,
    make: (m, ctx) => eff('engine', ctx, { zones: ['graveyard'], consumes: ['graveyard cards'], produces: ['recursion'], outputBounds: { min: 1, max: null, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\breturns? target [a-z' ]*cards? and up to (?:one|two) target [a-z', ]*cards? from your graveyard to (?:the battlefield|your hand)/gi,
    make: (m, ctx) => eff('engine', ctx, { zones: ['graveyard'], consumes: ['graveyard cards'], produces: ['recursion'], outputBounds: { min: 2, max: 2, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    // The card filter may itself be a type LIST — "up to two Cleric, Rogue,
    // Warrior, Wizard, and/or Ally cards" — so the class before `cards` has to
    // admit the slash `and/or` prints, exactly as the class after it already
    // does. Without it `Tazri, Beacon of Unity` finished with this sentence
    // unclaimed and stayed `partial`, so the commander of a party deck earned
    // no typed coverage and no party-payoff role.
    re: /\byou may reveal (?:a|an|up to (?:one|two|three)) [a-z', \/]*cards?[a-z', \/]*(?:from among them )?and put (?:it|them|those cards) into your hand/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library', 'hand'], produces: ['cards'], outputBounds: { min: 0, max: null, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    re: /\bexiles? cards? from the top of your library until you exile [^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, { zones: ['library'], produces: ['selection'], outputBounds: { min: 0, max: null, unit: 'cards' } }),
  },
  // ── stage 4c: four shapes from the `tazri-upgraded-arena` queue ─────────
  // Each fires on >= 3 corpus cards (distinct names in `cards`); the queue's
  // one- and two-card shapes are listed in the stage-4c report and
  // deliberately NOT typed — a one-card rule is a hand-written exception
  // wearing a generator's clothes.
  {
    kind: 'effect',
    // 10 cards: the Wilds of Eldraine Role cycle. Every Role "attached to
    // target creature YOU CONTROL" grants at least +1/+1, so one point of
    // power is the bound the text guarantees; the rest is not claimed.
    re: /\bcreates? (?:a|an) (?:cursed|monster|royal|sorcerer|wicked|young hero) role token attached to target creature you control/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['pressure'], outputBounds: { min: 1, max: 1, unit: 'power' } }),
  },
  {
    kind: 'effect',
    // 22 cards: the Panharmonicon family. It consumes triggers the deck
    // already produces and yields one more — a doubler, not a source.
    re: /\bif (?:a|an|one or more)[^.]*causes? a triggered ability of [^.]*to trigger, that ability triggers an additional time/gi,
    make: (m, ctx) => eff('engine', ctx, { consumes: ['triggers'], produces: ['triggers'], outputBounds: { min: 1, max: 1, unit: 'triggers' } }),
  },
  {
    kind: 'effect',
    // 13 cards: `Add X mana in any combination of {U} and/or {R}`. The mana
    // atom above only admits the "in any combination of colors" wording, so
    // every card that spells its colours out stayed partial. X is bounded by
    // the `where X is ...` rider, not here.
    re: /\badds? (\w+) mana in any combination of (?:\{[WUBRGC]\}(?:,? (?:and\/or|and|or) )?)+/gi,
    make: (m, ctx) => {
      const n = num(m[1]) || 1;
      return eff('mana', ctx, { produces: ['mana'], outputBounds: { min: n, max: n, unit: 'mana' } });
    },
  },
  // 7 cards: a pure replacement RIDER on a cast-from-elsewhere effect. It
  // makes no mechanical claim of its own — it only says where the card goes
  // afterwards — so it consumes its span and produces nothing.
  { kind: 'rider', re: /\bif (?:a|an) [a-z' \/]*spells? cast this way would be put into your graveyard, exiles? it instead/gi },
];
ATOMS.push(...V13_ATOMS);

/**
 * Coverage round 1. The generator had never been run over the real corpus, so
 * the first pass simply added 8,400 cards it already parses. What was left is
 * the tail measured in `coverage-queue-corpus.csv`: sentences that are common
 * ACROSS cards but rare per card. Every atom below fires on >= 3 distinct
 * corpus cards (counts in the round-1 report); one- and two-card shapes are
 * listed there and deliberately left untyped — a one-card rule is a curated
 * entry wearing a generator's clothes.
 */
const ROUND1_ATOMS: Atom[] = [
  // ── riders: text with no independent score-relevant output ─────────────
  // A deck-construction permission, not a board effect.
  { kind: 'rider', re: /\ba deck can have any number of cards named [^.]*/gi },
  // The drawback half of a temporary-copy / temporary-token effect.
  { kind: 'rider', re: /\bsacrifices? (?:it|them|that token|those tokens) at the beginning of the next end step/gi },
  // Saga / Case final chapter: the transform itself makes no new claim; the
  // back face is a separate printing with its own entry.
  { kind: 'rider', re: /\bexiles? this (?:saga|case|permanent), then returns? it to the battlefield transformed under your control/gi },
  // Mode selection at ETB: "As this Aura enters, choose a color."
  { kind: 'rider', re: /\bas this [a-z]*\s?enters,? (?:you may )?choose [^.]*/gi },
  // The visible half of a targeted-discard spell; the discard is typed.
  { kind: 'rider', re: /\btarget player reveals their hand\b/gi },
  // The Ring mechanic's trigger text; the Ring's own abilities are not on the card.
  { kind: 'rider', re: /\bthe ring tempts you\b/gi },
  // Type-granting on a chosen-type permanent — read by the typal recipe from
  // the subtype line, not from this sentence.
  { kind: 'rider', re: /\bthis (?:creature|permanent|artifact) is the chosen type in addition to its other types\b/gi },
  // `You get an emblem with "…"` — the quoted ability is typed on its own by
  // the depth-1 quote pass; this only consumes the wrapper.
  { kind: 'rider', re: /\byou get an emblem with\b/gi },
  // The cost half of a cast-from-elsewhere permission that is itself typed.
  { kind: 'rider', re: /\bif you cast a spell this way, pay life equal to its mana value rather than pay its mana cost/gi },
  // Flashback granted by another effect: the cost is not an output.
  { kind: 'rider', re: /\bthe flashback cost is equal to its mana cost\b/gi },

  // ── effects ────────────────────────────────────────────────────────────
  {
    kind: 'effect',
    // Counter multipliers (Hardened Scales, Branching Evolution, Ozolith …):
    // a replacement that CONSUMES counter placement the deck already produces
    // and yields more of it — a doubler, never a source.
    re: /\bif one or more (?:\+1\/\+1 |\+1\/\+1 or [a-z0-9\/+ -]+)?counters? would be put on [^,]*,? (?:that many plus (?:one|two)|twice that many|\w+ times that many)[^.]*/gi,
    make: (m, ctx) => eff('engine', ctx, {
      consumes: ['counter placement'], produces: ['+1/+1 counters'],
      outputBounds: { min: 1, max: null, unit: 'counters' },
    }),
  },
  {
    kind: 'effect',
    // Token multipliers (Doubling Season, Parallel Lives, Mondrak …). Same
    // shape as the counter one: consumes the deck's own token production.
    re: /\bif (?:an effect would create one or more tokens|one or more tokens would be created)[^,]*,? (?:it creates )?twice that many[^.]*/gi,
    make: (m, ctx) => eff('engine', ctx, {
      consumes: ['tokens'], produces: ['tokens', 'creature token'],
      outputBounds: { min: 1, max: null, unit: 'tokens' },
    }),
  },
  {
    kind: 'effect',
    // Damage multipliers (Fiery Emancipation, City on Fire, Solphim …).
    re: /\bif a source you control would deal (?:noncombat )?damage to [^,]*,? it deals (?:double|triple|twice) that damage[^.]*/gi,
    make: (m, ctx) => eff('closing', ctx, {
      consumes: ['damage'], produces: ['damage multiplier'],
      outputBounds: { min: 1, max: null, unit: 'extra damage' },
    }),
  },
  {
    kind: 'effect',
    // Equipment / Aura pump with ANY sign. The existing atom only admits
    // `+N/+N`, so Skullclamp (`+1/-1`) and every X-pump stayed partial.
    re: /\b(?:equipped|enchanted) creature gets? [+-][\dx*]+\/[+-][\dx*]+/gi,
    make: (m, ctx) => {
      const power = Number((m[0].match(/([+-][\dx*]+)\//i) ?? [])[1]?.replace('+', '')) || 0;
      return eff('closing', ctx, {
        targetFilters: ['equipped creature'], produces: ['pump'],
        outputBounds: { min: Math.max(0, power), max: Math.max(0, power), unit: 'power' },
      });
    },
  },
  {
    kind: 'effect',
    // Typal anthems that name the CHOSEN type rather than a printed tribe.
    re: /\b(?:creatures|permanents) you control of the chosen type get \+(\d+)\/\+(\d+)/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['anthem'], outputBounds: { min: num(m[1]), max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    // Attack taxes (Ghostly Prison, Propaganda, Windborn Muse …): an answer on
    // the creature axis that prices attackers instead of removing them.
    re: /\bcreatures can'?t attack you[^.]*unless [^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['creature'], targetFilters: ['attacking creatures'],
      outputBounds: { min: 1, max: null, unit: 'attacks answered' },
    }),
  },
  {
    kind: 'effect',
    // Clone tokens (Helm of the Host, Kiki-Jiki's reflection, Vile
    // Duplication …). The copy's power is whatever it copies, so only the
    // lower bound is claimed.
    re: /\bcreates? (?:a|an|x|one|two|\d+) tokens? that'?s? (?:a|an) copy of [^.]*/gi,
    make: (m, ctx) => eff('closing', ctx, {
      produces: ['tokens', 'creature token', 'pressure'],
      outputBounds: { min: 1, max: null, unit: 'power' },
    }),
  },
  {
    kind: 'effect',
    // Characteristic-defining bodies (Lumra, Psychosis Crawler, Ashaya …).
    // The printed P/T is `*`, so `bodyEffect` reads nothing and the card had
    // no pressure at all.
    re: /\bthis permanent'?s power and toughness are each equal to [^.]*/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['pressure'], outputBounds: { min: 1, max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    // "Draw cards equal to …" — the existing draw atom needs a literal count.
    re: /\bdraws? cards? equal to [^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['cards'], outputBounds: { min: 1, max: null, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    // Bounded exile removal (Skyclave Apparition, Lord Skitter …).
    re: /\bexiles? up to (?:one|two|x|\d+) target [a-z', -]*permanents? [^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['permanent'], targetFilters: ['target permanent'],
      outputBounds: { min: 0, max: null, unit: 'permanents answered' },
    }),
  },
  {
    kind: 'effect',
    // Mass counter placement on a tribe / on each of a board of creatures.
    re: /\bputs? a (?:\+1\/\+1|-1\/-1) counter on each [a-z' ]*(?:you control|creature)[^.]*/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['+1/+1 counters'], outputBounds: { min: 1, max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    // Granted flashback on a graveyard card (Snapcaster Mage, Flashback …).
    re: /\btarget instant or sorcery card in your graveyard gains flashback until end of turn/gi,
    make: (m, ctx) => eff('engine', ctx, {
      zones: ['graveyard'], consumes: ['graveyard cards'], produces: ['recursion'],
      outputBounds: { min: 1, max: 1, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Bounce a spell on the stack (Reprieve, Bilbo's Gambit …) — a stack
    // answer that is not a counter.
    re: /\breturns? target spell to its owner'?s hand/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['stack'], targetFilters: ['target spell'],
      outputBounds: { min: 1, max: 1, unit: 'spells answered' },
    }),
  },
];
ATOMS.push(...ROUND1_ATOMS);

/**
 * Coverage round 1, batch 2. Batch 1 worked the top of the copy-weighted
 * queue, which is a long tail of 1-2 card shapes. These were found the other
 * way round — the untyped sentences that recur across the MOST distinct corpus
 * cards — so each one fires on 20-70 of them (counts in the round-1 report).
 */
const ROUND1_ATOMS_B2: Atom[] = [
  // ── riders ─────────────────────────────────────────────────────────────
  // Regeneration is a protection shield, not an output.
  { kind: 'rider', re: /\bregenerates? (?:this creature|this permanent|it|them|target [a-z' ]*creature|that creature)\b/gi },
  // Living weapon / reconfigure attach clause: the Equipment's pump is typed.
  { kind: 'rider', re: /\battach (?:it|them|this permanent|that equipment) to target [a-z' ]*(?:creature|permanent)(?: you control)?\b/gi },
  // Dice mechanic: the OUTCOME rows carry the effects and are typed on their
  // own lines; the roll itself claims nothing.
  { kind: 'rider', re: /\brolls? (?:a|an|two|three|x|\d+) d\d+\b/gi },
  // Per-turn limiter, the `activate only once each turn` shape in prose form.
  { kind: 'rider', re: /\bdo this only once each turn\b/gi },
  // Replacement on where a countered / cast card goes afterwards.
  { kind: 'rider', re: /\bif that (?:spell|card|creature|permanent) would be put into (?:their|its owner'?s|a|your) graveyard[^,]*, exiles? it instead/gi },
  // Deck-construction permission (the Companion / background / commander rules).
  { kind: 'rider', re: /\bthis permanent can be your commander\b/gi },
  // Alchemy: a spellbook draft resolves to another card's text, not this one's.
  { kind: 'rider', re: /\byou may choose not to untap this (?:permanent|artifact|creature|land) during your untap step/gi },
  // Kicked / escaped alternate-mode riders.
  { kind: 'rider', re: /\bif this spell was kicked,? [^.]*/gi },
  { kind: 'rider', re: /\bsacrifices? it unless it escaped\b/gi },
  // The wrapper around a granted ability that the quote pass types on its own.
  { kind: 'rider', re: /\bcommander creatures you own have\b/gi },
  // `Equipped creature gets +2/+2 and has "<quoted ability>"` — the pump and
  // the quote are both typed; only the conjunction is left.
  { kind: 'rider', re: /\b(?:and )?(?:gains?|has|have) protection from [^.]*/gi },

  // ── effects ────────────────────────────────────────────────────────────
  {
    kind: 'effect',
    // Variable-damage sources: the existing damage atom needs a literal
    // number, so every `equal to …` burn spell and X-fireball stayed partial.
    re: /\bthis permanent deals damage to ([^.]*?) equal to [^.]*/gi,
    make: (m, ctx) => eff(/opponent|player|any target/i.test(m[1]) ? 'closing' : 'answer', ctx, {
      targetFilters: [m[1].trim()],
      ...(/opponent|player|any target/i.test(m[1]) ? {} : { answerAxes: ['creature' as const] }),
      outputBounds: { min: 1, max: null, unit: 'damage' },
    }),
  },
  {
    kind: 'effect',
    // Redirected / repeated damage: `it deals that much damage to each other
    // opponent`.
    re: /\bit deals that much damage to (?:each other opponent|each opponent|any target|that player|each player)\b/gi,
    make: (m, ctx) => eff('closing', ctx, { outputBounds: { min: 1, max: null, unit: 'damage' } }),
  },
  {
    kind: 'effect',
    // The monarch is a repeating draw engine, which is the whole reason a
    // deck plays these.
    re: /\byou become the monarch\b/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['cards'], outputBounds: { min: 1, max: null, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    // Extra turns.
    re: /\btakes? an extra turn after this one\b/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['extra turn'], outputBounds: { min: 1, max: 1, unit: 'turns' } }),
  },
  {
    kind: 'effect',
    // Counters on a TARGET, any kind. The existing atom only admits the
    // `+1/+1 counter on this creature` form.
    re: /\bputs? (?:a|an|one|two|three|four|x|\d+) (?:\+1\/\+1|-1\/-1|\+1\/\+0|charge|loyalty|oil|lore|level) counters? on target [^.]*/gi,
    make: (m, ctx) => eff('closing', ctx, { produces: ['+1/+1 counters'], outputBounds: { min: 1, max: null, unit: 'power' } }),
  },
  {
    kind: 'effect',
    // Pacifism-shaped removal: the creature survives but stops working.
    re: /\benchanted creature can'?t attack(?: or block)?[^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['creature'], targetFilters: ['enchanted creature'],
      outputBounds: { min: 1, max: 1, unit: 'creatures answered' },
    }),
  },
  {
    kind: 'effect',
    // Ramp / tutor wordings the two existing land-search atoms miss: the
    // `and/or <type> cards` joint search and the `basic <Type>` name list.
    re: /\bsearch(?:es)? your library for up to (?:one|two|three|x|\d+) basic land cards?(?: and\/or [a-z' ]*cards?)?[^.]*/gi,
    make: (m, ctx) => eff('mana', ctx, {
      zones: ['library', 'battlefield'], targetFilters: ['basic land card'], produces: ['land'],
      outputBounds: { min: 1, max: null, unit: 'lands' },
    }),
  },
  {
    kind: 'effect',
    re: /\bsearch(?:es)? your library for an? basic (?:plains|island|swamp|mountain|forest)(?:,? (?:or |and\/or )?(?:plains|island|swamp|mountain|forest))* cards?[^.]*/gi,
    make: (m, ctx) => eff('mana', ctx, {
      zones: ['library', 'battlefield'], targetFilters: ['basic land card'], produces: ['land'],
      outputBounds: { min: 1, max: 1, unit: 'lands' },
    }),
  },
  {
    kind: 'effect',
    // Named-card tutors (`search your library for a card named …`).
    re: /\byou may search your library for a card named [^.]*/gi,
    make: (m, ctx) => eff('tutor', ctx, {
      zones: ['library'], targetFilters: ['named card'], produces: ['card'],
      outputBounds: { min: 0, max: 1, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Dig-until-you-hit selection.
    re: /\breveals? cards? from the top of your library until you reveal [^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, {
      zones: ['library'], produces: ['selection'], outputBounds: { min: 0, max: null, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // `Put that card onto the battlefield …` — the payoff half of a dig.
    re: /\bputs? that card onto the battlefield[^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, {
      zones: ['library', 'battlefield'], produces: ['cards'], outputBounds: { min: 1, max: 1, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Graveyard hate on a single card.
    re: /\bexiles? up to (?:one|two|three|x|\d+) target cards? from (?:a|each|target player'?s) graveyard/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['graveyard_or_protection'], targetFilters: ['graveyard card'],
      outputBounds: { min: 0, max: null, unit: 'cards answered' },
    }),
  },
  {
    kind: 'effect',
    // Casting an opponent's card: the existing free-cast atom needs the word
    // `spell`, and these say `instant or sorcery card`.
    re: /\byou may cast target [a-z' ]*cards? from (?:an opponent'?s|a|your|target player'?s) graveyard(?: without paying its mana cost)?/gi,
    make: (m, ctx) => eff('advantage', ctx, {
      zones: ['graveyard'], produces: ['free cast'], outputBounds: { min: 1, max: 1, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Untap effects are the mana/engine half of every untapper.
    re: /\buntaps? (?:target|another target|up to (?:one|two|three)) [a-z' ]*(?:creature|permanent|artifact|land)s?(?: you control)?\b/gi,
    make: (m, ctx) => eff('engine', ctx, { produces: ['untap'], outputBounds: { min: 1, max: null, unit: 'permanents' } }),
  },
  {
    kind: 'effect',
    // Anaphoric bounce: `… return it to its owner's hand.`
    re: /\breturns? it to its owner'?s hand\b/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['permanent'], targetFilters: ['that permanent'],
      outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
    }),
  },
  {
    kind: 'effect',
    // Alchemy spellbook draft — a real card-advantage engine on Arena.
    re: /\bdrafts? a card from this permanent'?s spellbook[^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['cards'], outputBounds: { min: 1, max: 1, unit: 'cards' } }),
  },
  {
    kind: 'effect',
    // The counter multipliers again, in the two `would put` wordings
    // (Doubling Season's second sentence, Vorinclex, Innkeeper's Talent).
    re: /\bif (?:an effect|you|a source) would put one or more counters on [^,]*,? (?:it puts |put )?twice that many[^.]*/gi,
    make: (m, ctx) => eff('engine', ctx, {
      consumes: ['counter placement'], produces: ['+1/+1 counters'],
      outputBounds: { min: 1, max: null, unit: 'counters' },
    }),
  },
];
ATOMS.push(...ROUND1_ATOMS_B2);

/**
 * Coverage round 1, batch 3 — the shapes still recurring across >= 10 distinct
 * CORPUS-PLAYED cards after batches 1-2. Everything past this batch is 1-2
 * card shapes (see the round-1 report's stopping table).
 */
const ROUND1_ATOMS_B3: Atom[] = [
  // ── riders ─────────────────────────────────────────────────────────────
  // Frequency limiter in prose form; the ability itself is typed.
  { kind: 'rider', re: /\bonce (?:during )?each (?:of your turns|turn),?/gi },
  // Modal permission, not an effect.
  { kind: 'rider', re: /\byou may choose the same mode more than once\b/gi },
  // Exile-replacement on a creature that is already being answered.
  { kind: 'rider', re: /\bif that (?:creature|permanent) would die this turn, exiles? it instead\b/gi },
  { kind: 'rider', re: /\bif this permanent would be put into a graveyard from anywhere, exiles? it instead\b/gi },
  // Additional-cost clauses on an otherwise typed cast permission.
  { kind: 'rider', re: /\bby discarding (?:a|an|one|two|three|x|\d+) [a-z' ]*cards?[^.]*/gi },
  { kind: 'rider', re: /\byou may cast this spell as though it had flash[^.]*/gi },
  // Self life payment: a cost, never an output. Restricted to `and lose` /
  // `you lose` so an OPPONENT's life loss (`each opponent loses N life`,
  // `your opponents lose N life`) can never be swallowed by it.
  { kind: 'rider', re: /\b(?:and|you) lose \d+ life\b/gi },

  // ── effects ────────────────────────────────────────────────────────────
  {
    kind: 'effect',
    // Target pump with ANY sign or variable, the shape `+2/+0` and `+X/+X`
    // that the `\+(\d+)\/\+(\d+)` atom cannot see.
    re: /\b(?:target|another target|up to (?:one|two|three) target|this permanent|this creature) [a-z' ]*creatures? (?:you control )?gets? ([+-][\dx*]+)\/[+-][\dx*]+/gi,
    make: (m, ctx) => {
      const power = Number(m[1].replace('+', '')) || 0;
      // `-3/-3` is REMOVAL, not a pump: same shape, opposite family. Typing it
      // as a 0-power pump would give a creature-kill spell no answer credit.
      if (power < 0) {
        return eff('answer', ctx, {
          answerAxes: ['creature'], targetFilters: ['target creature'],
          outputBounds: { min: 1, max: 1, unit: 'creatures answered' },
        });
      }
      return eff('closing', ctx, {
        targetFilters: ['target creature'], produces: ['pump'],
        outputBounds: { min: power, max: power, unit: 'power' },
      });
    },
  },
  {
    kind: 'effect',
    // Tapping down a blocker / attacker is an answer on the creature axis.
    re: /\btaps? (?:enchanted|target|another target|up to (?:one|two|three) target) [a-z' ]*(?:creature|permanent)s?[^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['creature'], targetFilters: ['target creature'],
      outputBounds: { min: 1, max: 1, unit: 'creatures answered' },
    }),
  },
  {
    kind: 'effect',
    re: /\byou may taps? or untaps? target [a-z' ]*permanent\b/gi,
    make: (m, ctx) => eff('engine', ctx, { produces: ['untap'], outputBounds: { min: 1, max: 1, unit: 'permanents' } }),
  },
  {
    kind: 'effect',
    // Mass free casting (`any number of spells`), which the existing free-cast
    // atom cannot see because it requires a singular `a|an … spell`.
    re: /\byou may cast any number of [a-z' ]*spells?[^.]*without paying (?:their|its) mana costs?/gi,
    make: (m, ctx) => eff('advantage', ctx, {
      produces: ['free cast'], outputBounds: { min: 1, max: null, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // `Reveal the top N cards of your library` — the look/exile atom only
    // admits `look at` and `exile`.
    re: /\breveals? the top (?:(a|an|one|two|three|four|five|six|seven|x|\d+) )?cards? of (?:your|target player'?s|each player'?s) library/gi,
    make: (m, ctx) => eff('advantage', ctx, {
      zones: ['library'], produces: ['selection'], outputBounds: { min: 0, max: num(m[1]), unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Experience counters are a permanent, growing engine resource.
    re: /\byou get an experience counter\b/gi,
    make: (m, ctx) => eff('engine', ctx, {
      produces: ['+1/+1 counters'], outputBounds: { min: 1, max: 1, unit: 'counters' },
    }),
  },
];
ATOMS.push(...ROUND1_ATOMS_B3);

/**
 * Coverage round 1, batch 4 — keyword words used as VERBS mid-sentence
 * (`… , populate.`, `… , amass Orcs 1.`), which `keywordTokens` never sees
 * because it only classifies whole LINES, plus the last shapes on >= 10
 * corpus-played cards. After this batch the residue is 1-2 card shapes:
 * 3,479 of 4,372 remaining shapes are on exactly one card.
 */
const ROUND1_ATOMS_B4: Atom[] = [
  {
    kind: 'effect',
    // Keyword verbs that make BODIES.
    re: /\b(?:populates?|amass(?:es)? [A-Za-z]+ \d+|incubates? \d+|creates? a lander token)\b/gi,
    make: (m, ctx) => eff('closing', ctx, {
      produces: ['tokens', 'creature token', 'pressure'], outputBounds: { min: 1, max: null, unit: 'power' },
    }),
  },
  {
    kind: 'effect',
    // Keyword verbs that place COUNTERS.
    re: /\b(?:proliferates?|bolsters? \d+|supports? \d+|monstrosity \d+|adapts? \d+|trains?\b)/gi,
    make: (m, ctx) => eff('closing', ctx, {
      produces: ['+1/+1 counters'], outputBounds: { min: 1, max: null, unit: 'power' },
    }),
  },
  {
    kind: 'effect',
    // Keyword verbs that see CARDS.
    re: /\b(?:explores?|investigates?|connives?(?: \d+)?|manifests? dread|ventures? into (?:the dungeon|undercity)|learns?|surveils? \d+|seeks? [^.]*)\b/gi,
    make: (m, ctx) => eff('advantage', ctx, {
      zones: ['library'], produces: ['selection'], outputBounds: { min: 0, max: null, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Anaphoric reanimation: `… return it/that card to the battlefield under
    // your control.` — the payoff half of every recursion trigger.
    re: /\breturns? (?:it|them|that card|those cards|that creature card) to the battlefield(?: under your control)?[^.]*/gi,
    make: (m, ctx) => eff('engine', ctx, {
      zones: ['graveyard', 'battlefield'], consumes: ['graveyard cards'], produces: ['recursion'],
      outputBounds: { min: 1, max: null, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Non-basic land search (`up to four land cards with different names`).
    re: /\bsearch(?:es)? your library for up to (?:one|two|three|four|five|x|\d+) land cards?[^.]*/gi,
    make: (m, ctx) => eff('mana', ctx, {
      zones: ['library', 'battlefield'], targetFilters: ['land card'], produces: ['land'],
      outputBounds: { min: 1, max: null, unit: 'lands' },
    }),
  },
  {
    kind: 'effect',
    // `Until end of turn, you may cast spells from among them.`
    re: /\byou may cast (?:spells|those cards|them|that card)\b[^.]*/gi,
    make: (m, ctx) => eff('advantage', ctx, {
      produces: ['free cast'], outputBounds: { min: 1, max: null, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // Untapping a group the previous clause named.
    re: /\buntaps? (?:those|them|all|each) [a-z' ]*(?:creatures?|permanents?|lands?|artifacts?)?\b/gi,
    make: (m, ctx) => eff('engine', ctx, { produces: ['untap'], outputBounds: { min: 1, max: null, unit: 'permanents' } }),
  },
  {
    kind: 'effect',
    // Split damage (`deals 3 damage divided as you choose among …`).
    re: /\bthis permanent deals \d+ damage divided as you choose among [^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['creature'], targetFilters: ['divided targets'],
      outputBounds: { min: 1, max: null, unit: 'damage' },
    }),
  },
  {
    kind: 'effect',
    // Lockdown auras (`Enchanted creature doesn't untap during its
    // controller's untap step.`).
    re: /\benchanted (?:creature|permanent|artifact|land) doesn'?t untap during [^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['creature'], targetFilters: ['enchanted permanent'],
      outputBounds: { min: 1, max: 1, unit: 'permanents answered' },
    }),
  },
  // ── riders ─────────────────────────────────────────────────────────────
  // A bare targeting sentence; the effect that uses the target is its own one.
  { kind: 'rider', re: /\bchoose target (?:creature|opponent|player|permanent)(?: you control| you don'?t control)?\b/gi },
  // Coin flips and damage prevention carry no output of their own.
  { kind: 'rider', re: /\bflips? a coin\b/gi },
  // `… from your graveyard using its mutate ability` / `… by paying its
  // <keyword> cost` — the cast permission itself is already typed.
  { kind: 'rider', re: /\busing its [a-z' ]*ability\b/gi },
];
ATOMS.push(...ROUND1_ATOMS_B4);

/**
 * Coverage round 1, batch 5 — the last shapes on >= 9 corpus-played cards.
 * The stop rule fires here: below this the shapes are 1-2 cards each (3,468 of
 * 4,355 remaining shapes are on exactly one card), so the next 100 cards would
 * cost far more than 10 atoms.
 */
const ROUND1_ATOMS_B5: Atom[] = [
  {
    kind: 'effect',
    // Turn-to-a-Frog removal: the creature survives with nothing left.
    re: /\b(?:target|enchanted|this) [a-z' ]*creatures? loses? all abilities and becomes? [^.]*/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['creature'], targetFilters: ['target creature'],
      outputBounds: { min: 1, max: 1, unit: 'creatures answered' },
    }),
  },
  {
    kind: 'effect',
    // `Target player gains N life.`
    re: /\b(?:target player|target opponent|its controller|that player|you) gains? \d+ life\b/gi,
    make: (m, ctx) => eff('advantage', ctx, { produces: ['life'], outputBounds: { min: 1, max: null, unit: 'life' } }),
  },
  {
    kind: 'effect',
    // Alchemy's `empower <planeswalker> N`.
    re: /\bempowers? [A-Za-z]+ \d+/gi,
    make: (m, ctx) => eff('engine', ctx, { produces: ['+1/+1 counters'], outputBounds: { min: 1, max: null, unit: 'counters' } }),
  },
  {
    kind: 'effect',
    // Exile-tutors that take a SET of cards (`up to three monocolored cards
    // with different names`), which the singular tutor atom cannot see.
    re: /\bsearch(?:es)? your library for up to (?:one|two|three|four|five|x|\d+) [a-z', -]*cards?[^.]*/gi,
    make: (m, ctx) => eff('tutor', ctx, {
      zones: ['library'], targetFilters: ['any card'], produces: ['card'],
      outputBounds: { min: 1, max: null, unit: 'cards' },
    }),
  },
  {
    kind: 'effect',
    // `it deals that much damage to each creature that player controls` — the
    // batch-2 atom only listed the player-facing targets.
    re: /\bit deals that much damage to [^.]*/gi,
    make: (m, ctx) => eff(/opponent|player|any target/i.test(m[0]) ? 'closing' : 'answer', ctx, {
      outputBounds: { min: 1, max: null, unit: 'damage' },
    }),
  },
  {
    kind: 'effect',
    re: /\bthis permanent deals that much damage to [^.]*/gi,
    make: (m, ctx) => eff(/opponent|player|any target/i.test(m[0]) ? 'closing' : 'answer', ctx, {
      outputBounds: { min: 1, max: null, unit: 'damage' },
    }),
  },
  {
    kind: 'effect',
    re: /\byou may taps? or untaps? target [a-z' ]*(?:creature|permanent|artifact|land)\b/gi,
    make: (m, ctx) => eff('engine', ctx, { produces: ['untap'], outputBounds: { min: 1, max: 1, unit: 'permanents' } }),
  },
  {
    kind: 'effect',
    // Lifegain denial is a real answer against lifegain plans.
    re: /\byour opponents can'?t gain life\b|\bplayers can'?t gain life\b/gi,
    make: (m, ctx) => eff('answer', ctx, {
      answerAxes: ['permanent'], targetFilters: ['opponent lifegain'],
      outputBounds: { min: 1, max: 1, unit: 'effects answered' },
    }),
  },
  // ── riders ─────────────────────────────────────────────────────────────
  // A bare keyword line left behind by a Class / Saga / level bracket.
  { kind: 'rider', re: /^(?:flying|trample|haste|vigilance|lifelink|deathtouch|menace|reach|hexproof|indestructible|flash|first strike|double strike)(?:,? (?:and )?(?:flying|trample|haste|vigilance|lifelink|deathtouch|menace|reach|hexproof|indestructible|flash|first strike|double strike))*\.?$/gi },
  // The anaphoric forms of riders that already exist for explicit nouns.
  { kind: 'rider', re: /\bsacrifices? (?:it|them)\b/gi },
  { kind: 'rider', re: /\bcop(?:y|ies) it\b/gi },
  { kind: 'rider', re: /\bdestroys? it\b/gi },
  // `The owner of target permanent shuffles it into their library, then
  // reveals the top card of their library.` — 11 and 18 corpus cards. Both
  // are text consumption only: for Legacy Weapon or Audacious Swap the removal
  // verb is in another clause, and for the Colossus cycle the shuffle is a
  // self-recursion replacement. Chaos Warp therefore becomes `known` WITHOUT
  // answer credit, which UNDERSTATES it; typing that removal needs a shape
  // that fires on more than one card (round 2).
  { kind: 'rider', re: /\bshuffles? (?:it|that card|them) into (?:their|its owner'?s) library\b/gi },
  { kind: 'rider', re: /\breveals? the top card of (?:their|his or her) library\b/gi },
  { kind: 'rider', re: /\bexiles? the top card of each opponent'?s library\b/gi },
];
ATOMS.push(...ROUND1_ATOMS_B5);

/** The round-1 batches, exported so `scripts/deck-score-atoms.ts` can audit
 * each atom's fires-on count and false-positive samples over the card
 * universe, and so the suite can pin a positive and a negative sentence per
 * atom without re-typing the regex. */
export const ROUND1_ATOM_BATCHES: ReadonlyArray<{ label: string; atoms: readonly Atom[] }> = [
  { label: 'b1', atoms: ROUND1_ATOMS },
  { label: 'b2', atoms: ROUND1_ATOMS_B2 },
  { label: 'b3', atoms: ROUND1_ATOMS_B3 },
  { label: 'b4', atoms: ROUND1_ATOMS_B4 },
  { label: 'b5', atoms: ROUND1_ATOMS_B5 },
];


interface ScanResult {
  effects: Partial<TypedEffect>[];
  matched: boolean;
}

/** Strip reminder text; keep the mechanical sentence intact. */
export function stripReminders(text: string): string {
  return text
    .replace(/\([^)]*\)/g, ' ')
    // `Counter target spell [that wasn't cast from its owner's hand].` — the
    // bracketed span is the cleave/alternate-mode-only text, so the printed
    // spell is what is left. The negative lookahead keeps `[+1]:`-style
    // loyalty costs, which `LOYALTY_RE` still needs.
    .replace(/\[(?![+\u2212-]?\d+\])[^\]]{4,}\]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ');
}

/** Oracle text names the card; the residual check must not see it as a noun. */
export function selfName(text: string, card: GeneratableCard): string {
  let out = text;
  // An Arena rebalanced printing is named `A-Vivi Ornitier` but its oracle
  // text still says `Vivi Ornitier`, so the unprefixed face has to be tried
  // too or the card's own name is left as an untyped noun.
  const faces = [card.name, ...card.name.split(' // ')];
  for (const face of [...faces, ...faces.map((f) => f.replace(/^A-/, ''))]) {
    const short = face.split(',')[0].trim();
    for (const variant of [face, short]) {
      if (variant.length < 3) continue;
      out = out.split(variant).join('this permanent');
    }
  }
  return out;
}

function sentences(body: string): string[] {
  return body
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface Candidate { start: number; end: number; effect?: Partial<TypedEffect> }

/**
 * Scan a sentence: collect every atom match, resolve overlaps LONGEST FIRST,
 * then check the residual is glue. Longest-first matters — a short rider that
 * happens to start earlier would otherwise steal the prefix of a longer,
 * more specific shape and leave its tail untyped.
 */
export function scanSentence(sentence: string, ctx: Ctx, depth = 0): ScanResult {
  const candidates: Candidate[] = [];

  // A granted ability is real text: `Equipped creature ... has "Whenever you
  // cast a noncreature spell, this creature deals 1 damage to each opponent."`
  // Type the quoted clause with the same machinery; if the inner clause does
  // not parse, the quote stays unconsumed and the card stays partial.
  if (depth === 0) {
    for (const m of sentence.matchAll(/"([^"]+)"/g)) {
      // The quoted ability is a whole ability: it carries its own trigger or
      // activation cost, which the line-level pass already stripped outside.
      const inner = m[1].replace(TRIGGER_RE, '').replace(ACTIVATED_RE, '');
      const scan = scanSentence(inner, ctx, depth + 1);
      if (!scan.matched) continue;
      candidates.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
      for (const effect of scan.effects) {
        candidates.push({
          start: m.index ?? 0,
          end: (m.index ?? 0) + m[0].length,
          effect: { ...effect, prerequisites: [...(effect.prerequisites ?? []), 'granted ability'] },
        });
      }
    }
  }

  for (const atom of ATOMS) {
    atom.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = atom.re.exec(sentence)) !== null) {
      if (m[0].length === 0) { atom.re.lastIndex += 1; continue; }
      const built = atom.kind === 'effect' && atom.make ? atom.make(m, ctx) : null;
      candidates.push({ start: m.index, end: m.index + m[0].length, ...(built ? { effect: built } : {}) });
    }
  }
  // A rider only consumes text; an effect carries score meaning. When the two
  // cover the same words the effect must win, or a longer rider silently
  // swallows a real ability (that bug cost Deep-Cavern Bat its hand-attack).
  candidates.sort((a, b) => Number(Boolean(b.effect)) - Number(Boolean(a.effect))
    || (b.end - b.start) - (a.end - a.start) || a.start - b.start);

  const spans: Array<[number, number]> = [];
  const effects: Partial<TypedEffect>[] = [];
  for (const c of candidates) {
    const identical = spans.some(([s, e]) => s === c.start && e === c.end);
    if (!identical && spans.some(([s, e]) => c.start < e && c.end > s)) continue;
    if (!identical) spans.push([c.start, c.end]);
    if (c.effect) effects.push(c.effect);
  }

  let residual = sentence;
  for (const [s, e] of [...spans].sort((a, b) => b[0] - a[0])) residual = residual.slice(0, s) + ' ' + residual.slice(e);
  const leftover = residual
    .toLowerCase()
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[^a-z' ]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/'s$/, '').replace(/'/g, ''))
    .filter((w) => w.length > 0 && !GLUE.has(w));
  return { effects, matched: leftover.length === 0 && spans.length > 0 };
}

const TRIGGER_RE = /^(when|whenever|at the beginning of|at end of)\b[^,]*,\s*/i;
const LOYALTY_RE = /^\[?[+\u2212-]?\d+\]?:\s*/;
/** `Tap X untapped artifacts you control:` — the second word may be a
 * variable (`X`), so the cost token cannot demand a lower-case continuation. */
const ACTIVATED_RE = /^((?:\{[^}]+\}|[A-Z][a-z]+ [A-Za-z][^:{]*|,|\s)+):\s*/;
const ABILITY_WORD_RE = /^(?:[IVX]+(?:, [IVX]+)*|[A-Z][A-Za-z'’]*(?: [A-Za-z][A-Za-z'’]*){0,3})\s+[—–-]\s+/;

function castCost(card: GeneratableCard): EffectCost {
  const colored = (card.mana_cost ?? '').match(/\{([WUBRGC])\}/g)?.map((p) => p.slice(1, -1)) ?? [];
  return colored.length > 0 ? { mana: card.cmc, colored } : { mana: card.cmc };
}

function activationCost(prefix: string, card: GeneratableCard): { cost: EffectCost; needsTap: boolean } {
  const generic = prefix.match(/\{(\d+)\}/g)?.reduce((sum, p) => sum + Number(p.slice(1, -1)), 0) ?? 0;
  const colored = prefix.match(/\{([WUBRGC])\}/g)?.map((p) => p.slice(1, -1)) ?? [];
  const additional: string[] = [];
  if (/sacrifice/i.test(prefix)) additional.push('sacrifice');
  if (/discard/i.test(prefix)) additional.push('discard');
  if (/pay \d+ life|\{[SE]\}/i.test(prefix)) additional.push('life');
  const cost: EffectCost = { mana: generic + colored.length };
  if (colored.length > 0) (cost as { colored?: string[] }).colored = colored;
  if (additional.length > 0) (cost as { additional?: string[] }).additional = additional;
  return { cost, needsTap: /\{T\}/.test(prefix) };
}

function isPermanent(typeLine: string): boolean {
  return /Creature|Artifact|Enchantment|Land|Planeswalker|Battle/.test(typeLine);
}

/** Keyword with its cost/measure stripped: `Ward—Pay 3 life` -> `ward`. */
function keywordBase(token: string): string {
  const base = token
    .replace(/\s*\{[^}]*\}.*$/, '')
    .replace(/\s*[\u2014\u2013-]\s*(?:pay|discard|sacrifice|reveal).*$/i, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s+from .*$/i, '')
    .replace(/[.!]$/, '')
    .toLowerCase()
    .trim();
  if (ALL_KW.has(base)) return base;
  // Round 1: a keyword with a PARAMETER is still that keyword — `Amass Orcs 1`,
  // `Equip Equipment {2}`, `Manifest dread`, `Gift a card`, `Ward {2}`. The
  // head word carries the mechanic; the tail names what it applies to and has
  // no clause of its own. 110+ corpus cards were `partial` on nothing but such
  // a line. A token containing a colon is an ACTIVATED ABILITY, never a bare
  // keyword line, so it is excluded; so is anything long enough to be prose.
  const headWord = base.split(' ')[0];
  if (!token.includes(':') && base.split(' ').length <= 4 && ALL_KW.has(headWord)) return headWord;
  return base;
}

function keywordTokens(line: string): string[] | null {
  const tokens = line.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  const known = tokens.every((t) => {
    const base = keywordBase(t);
    return ALL_KW.has(base);
  });
  return known ? tokens : null;
}

/** Body pressure from a printed creature body plus its keywords. */
function bodyEffect(card: GeneratableCard, keywords: string[]): TypedEffect | null {
  if (!/\bCreature\b/.test(card.type_line)) return null;
  const power = Number(card.power);
  if (!Number.isFinite(power)) return null;
  const produces = ['pressure', ...keywords.filter((k) => EVASION.includes(k) || COMBAT_KW.includes(k))];
  return {
    family: 'closing', mode: 'static', controller: 'self', zones: ['battlefield'],
    cost: castCost(card),
    timing: { earliestTurn: Math.max(1, card.cmc), summoningSickness: !keywords.includes('haste'), interval: 1 },
    produces,
    outputBounds: { min: power, max: power, unit: 'power' },
  };
}

function landManaEffect(card: GeneratableCard): TypedEffect | null {
  if (!/\bLand\b/.test(card.type_line)) return null;
  const produced = (card.produced_mana ?? '').replace(/[^WUBRGC]/g, '');
  return {
    family: 'mana', mode: 'activated', controller: 'self', zones: ['battlefield'],
    cost: { mana: 0 },
    timing: { earliestTurn: 1, interval: 1 },
    produces: produced.length > 0 ? ['mana'] : ['land drop'],
    outputBounds: { min: produced.length > 0 ? 1 : 0, max: 1, unit: 'mana' },
  };
}

function finish(partial: Partial<TypedEffect>, ctx: Ctx): TypedEffect {
  const prerequisites = [...ctx.prerequisites, ...(partial.prerequisites ?? [])];
  const consumes = [...new Set([...ctx.consumes, ...(partial.consumes ?? [])])];
  return {
    family: partial.family ?? 'advantage',
    mode: partial.mode ?? ctx.mode,
    controller: partial.controller ?? ctx.controller,
    ...(partial.zones ? { zones: partial.zones } : {}),
    ...(partial.targetFilters ? { targetFilters: partial.targetFilters } : {}),
    ...(partial.answerAxes ? { answerAxes: partial.answerAxes } : {}),
    ...(prerequisites.length > 0 ? { prerequisites } : {}),
    cost: partial.cost ?? ctx.cost,
    timing: {
      earliestTurn: ctx.earliestTurn,
      ...(ctx.summoningSickness ? { summoningSickness: true } : {}),
      ...(ctx.instantSpeed ? { instantSpeed: true } : {}),
      ...(ctx.mode === 'activated' || ctx.mode === 'triggered' || ctx.mode === 'static' ? { interval: 1 } : {}),
    },
    ...(partial.produces ? { produces: partial.produces } : {}),
    ...(consumes.length > 0 ? { consumes } : {}),
    outputBounds: partial.outputBounds ?? { min: 0, max: null, unit: 'unspecified' },
    ...(ctx.controller === 'opponent' ? { availabilityPrior: 0.5 } : {}),
  };
}

const GEN_PROVENANCE = {
  source: 'generated from oracle text',
  reviewedBy: 'deck-score-catalog/generate.ts',
  reviewedAt: '2026-09-20',
};

/**
 * Type one card. `knowledge` is `known` only when every non-keyword sentence
 * was fully accounted for; anything else is `partial` and the untyped
 * sentences are kept verbatim so the queue can show them.
 */
export function generateEntry(card: GeneratableCard): CatalogEntry {
  const raw = card.oracle_text ?? '';
  const text = stripReminders(raw);
  const effects: TypedEffect[] = [];
  const untyped: string[] = [];
  const keywords: string[] = [];

  const land = landManaEffect(card);
  if (land) effects.push(land);

  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim();
    if (line.length === 0 || line === '//') continue;

    const kw = keywordTokens(line);
    if (kw) {
      for (const k of kw) keywords.push(keywordBase(k));
      continue;
    }

    // Modal bullets and saga chapters keep their own line; drop the marker.
    if (/^(choose one|choose two|choose one or more)\b/i.test(line)) continue;
    line = line.replace(/^[•+]\s*/, '').replace(/^\{[^}]+\}\s*[—–-]\s*/, '')
      // `8+ | Flying` — a Class/level BRACKET label, not a clause.
      .replace(/^\d+\+?\s*\|\s*/, '');
    const abilityWord = line.match(ABILITY_WORD_RE);
    if (abilityWord) line = line.slice(abilityWord[0].length);

    const ctx: Ctx = {
      card,
      mode: isPermanent(card.type_line) ? 'static' : 'cast',
      cost: castCost(card),
      earliestTurn: Math.max(1, card.cmc),
      summoningSickness: false,
      instantSpeed: /\bInstant\b/.test(card.type_line),
      controller: 'self',
      prerequisites: [],
      consumes: [],
    };

    const trigger = line.match(TRIGGER_RE);
    if (trigger) {
      const clause = trigger[0].replace(/,\s*$/, '');
      line = line.slice(trigger[0].length);
      ctx.mode = /\benters?\b/i.test(clause) && /\bthis\b|^when /i.test(clause) ? 'etb' : 'triggered';
      ctx.prerequisites.push(clause);
      // §9.6 step 1: the trigger clause IS the consumer side. Our own trigger
      // never reads an opponent's resource, so an opponent-controlled trigger
      // consumes nothing of ours.
      if (/\bopponent|\ban opponent|each opponent\b/i.test(clause)) ctx.controller = 'opponent';
      else for (const [re, resource] of TRIGGER_CONSUMES) if (re.test(clause)) ctx.consumes.push(resource);
    } else {
      const loyalty = line.match(LOYALTY_RE);
      if (loyalty) {
        line = line.slice(loyalty[0].length);
        ctx.mode = 'activated';
        ctx.cost = { mana: 0, additional: ['loyalty'] };
        ctx.earliestTurn = Math.max(1, card.cmc);
      }
      const activated = loyalty ? null : line.match(ACTIVATED_RE);
      if (activated && /\{|sacrifice|discard|pay|counter on this|remove a[^:]*counter|tap (?:an|x|two|three) untapped|return a land/i.test(activated[1])) {
        const { cost, needsTap } = activationCost(activated[1], card);
        line = line.slice(activated[0].length);
        ctx.mode = 'activated';
        ctx.cost = cost;
        ctx.instantSpeed = true;
        // A repeatable "Sacrifice a creature:" outlet is a DEATH SOURCE: it
        // consumes bodies and produces creature deaths (§9.6 step 1
        // "sacrifice throughput ... expendable bodies AND a death source").
        if (/sacrifice (?:a|an|another|two|three|x) [a-z' ]*creature/i.test(activated[1])) {
          ctx.consumes.push('creature');
        }
        if (/pay \d+ life|pay life/i.test(activated[1])) ctx.consumes.push('life payment');
        if (needsTap && /\bCreature\b/.test(card.type_line)) {
          ctx.summoningSickness = true;
          ctx.earliestTurn = Math.max(1, card.cmc) + 1;
        }
      }
    }

    for (const sentence of sentences(selfName(line, card))) {
      // A keyword can be glued to the end of a prose line (`… . Equip {2}`,
      // `… . Flying`), in which case the line-level `keywordTokens` check
      // above rejected the whole line. A sentence that is nothing but
      // keywords is the same keyword line, one sentence later.
      const sentenceKw = keywordTokens(sentence.replace(/\.$/, ''));
      if (sentenceKw) {
        for (const k of sentenceKw) keywords.push(keywordBase(k));
        continue;
      }
      const scan = scanSentence(sentence, ctx);
      for (const partial of scan.effects) effects.push(finish(partial, ctx));
      if (!scan.matched) untyped.push(sentence);
    }
  }

  const body = bodyEffect(card, keywords);
  if (body) effects.push(body);

  const knowledge = untyped.length > 0 ? 'partial' : 'known';
  const faces = card.name.includes(' // ') ? card.name.split(' // ').map((f) => f.trim()) : undefined;
  return {
    canonicalName: card.name,
    ...(faces ? { faces } : {}),
    oracleText: '',
    oracleHash: oracleHash(raw),
    provenance: GEN_PROVENANCE,
    knowledge,
    effects,
    ...(untyped.length > 0 ? { untyped } : {}),
  };
}
