/**
 * Canonical "real mana sources" classifier.
 *
 * Scryfall's `produced_mana` overstates fixing for several card classes that
 * the deck builder kept trusting blindly (the recurring mana-screw bug):
 *
 *   - "spend this mana only to cast creature spells"  (Cavern of Souls et al.)
 *   - one-shot sacrifice-for-mana rituals/lands         (Lotus Vale, Dark Ritual)
 *   - filter lands that need other mana to activate     (need 1 to make 2)
 *
 * This module is the single source of truth for "which WUBRG colors does this
 * card reliably provide as general-purpose fixing." Both the land scorer and
 * the post-build deck auditor consume it, so the two never disagree.
 */

export interface ManaSourceCard {
  name: string;
  type_line?: string | null;
  oracle_text?: string | null;
  produced_mana?: string | null;
  mana_cost?: string | null;
}

export interface ManaSourceProfile {
  /** WUBRG colors reliably available for ANY spell (empty if restricted/none) */
  colors: string[];
  /** Card category for source-counting */
  kind: 'land' | 'rock' | 'dork' | 'other' | 'none';
  /** false when production is restricted/conditional/one-shot */
  reliable: boolean;
  /** Whether it taps for any one of several colors (Command Tower, gates) */
  anyColor: boolean;
  note?: string;
}

const WUBRG = ['W', 'U', 'B', 'R', 'G'];

/**
 * Honest-colour-count context. Opt-in: every function below takes this as an
 * optional last argument and, without it, returns exactly what it did before
 * (Deck Score pins `countColorSources` with no ctx and must not move — see
 * `deck-score-mana.ts`). WITH a ctx, chosen-type lands credit one colour
 * instead of five, generic fetchers credit only the deck's own basics, and
 * `isConditionalColoredProducer` catches counter-gated / one-shot / granted-
 * to-others mana and un-gates "activate only if" Verges the deck can satisfy.
 */
export interface ManaSourceContext {
  /** the deck's colour identity */
  deckColors: string[];
  /** colours whose BASIC land the deck actually runs (rule: generic fetchers) */
  basicColors: string[];
  /** colours for which the deck runs any land carrying that basic land type —
   * basics, shocks, checks, triomes... (rule: "activate only if" Verge gates) */
  typedLandColors: string[];
  /** heaviest-need-first colour order for "choose a colour" lands; defaults to deckColors[0] */
  colorPriority?: string[];
}

function parseProduced(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    return (JSON.parse(json) as string[]).filter((c) => WUBRG.includes(c));
  } catch {
    return [];
  }
}

const BASIC_TYPE_TO_COLOR: Record<string, string> = {
  plains: 'W', island: 'U', swamp: 'B', mountain: 'R', forest: 'G',
};

/**
 * Fetch lands search a land onto the battlefield instead of tapping for mana,
 * so `produced_mana` is null — but they ARE premium fixing for the colors they
 * can retrieve. Returns those colors, or null if the card isn't a fetch.
 */
export function fetchLandColors(card: ManaSourceCard, ctx?: ManaSourceContext): string[] | null {
  const type = (card.type_line || '').toLowerCase();
  if (!type.includes('land')) return null;
  const o = (card.oracle_text || '').toLowerCase();
  if (!o.includes('search your library for') || !o.includes('onto the battlefield')) return null;
  // Generic "a basic land card" (Prismatic Vista, Fabled Passage, Evolving Wilds)
  if (/for a basic land/.test(o) || /for a land card/.test(o)) {
    // Honest count: credit only the colours whose basics the deck actually
    // runs, not every WUBRG colour regardless of deck identity.
    return ctx ? ctx.basicColors.filter((c) => WUBRG.includes(c)) : ['W', 'U', 'B', 'R', 'G'];
  }
  // Typed fetch (Flooded Strand → Plains/Island). Collect named basic types.
  const cols = new Set<string>();
  for (const [t, c] of Object.entries(BASIC_TYPE_TO_COLOR)) {
    if (o.includes(t)) cols.add(c);
  }
  return cols.size ? [...cols] : null;
}

/**
 * Lands whose color is chosen on entry (Multiversal Passage: "choose a basic
 * land type") have null produced_mana but flexibly fix any one color.
 */
export function chosenTypeLandColors(card: ManaSourceCard, ctx?: ManaSourceContext): string[] | null {
  const type = (card.type_line || '').toLowerCase();
  if (!type.includes('land')) return null;
  const o = (card.oracle_text || '').toLowerCase();
  if (/choose a basic land type/.test(o) || /becomes? a .* of the chosen/.test(o)) {
    if (!ctx) return ['W', 'U', 'B', 'R', 'G'];
    // Honest count: it becomes ONE basic type — the best single deck colour
    // — never five.
    const best = (ctx.colorPriority && ctx.colorPriority[0]) || ctx.deckColors[0];
    return best ? [best] : [];
  }
  return null;
}

/** Colors a land provides despite null produced_mana (fetch or chosen-type). */
export function implicitLandColors(card: ManaSourceCard, ctx?: ManaSourceContext): string[] | null {
  return fetchLandColors(card, ctx) ?? chosenTypeLandColors(card, ctx);
}

/** True when the card's colored mana can only pay for a card-type subset. */
export function isRestrictedProducer(oracleText: string | null | undefined): boolean {
  const t = (oracleText || '').toLowerCase();
  if (!t) return false;
  // "Spend this mana only to cast creature spells" / "...only to cast artifact..."
  if (/spend this mana only to cast/.test(t)) return true;
  // Older templating: "...can be spent only to cast..."
  if (/can be spent only to cast/.test(t)) return true;
  return false;
}

/**
 * True when a land's COLORED/any-color production is gated so it isn't a
 * turn-after-turn fixing source: Mirrex ("activate only if this land entered
 * this turn"), Nykthos (devotion), Baxter Building / Spire of Industry
 * ("activate only if you control ..."). Also gated: a costed activation
 * (Conduit Pylons "{1}, {T}: Add one mana of any color", Cascading Cataracts
 * "{5}, {T}: ...") or an X-scaled amount (Baldur's Gate "Add X mana of any
 * one color") — paying extra mana (or a variable amount) for one land's worth
 * of fixing isn't the same free, reliable source as a {T}-only rainbow land
 * (City of Brass, Mana Confluence, Command Tower, Exotic Orchard). Its
 * colorless {C} may still be free, but it should not count as reliable
 * rainbow fixing.
 */
/**
 * True when a land's coloured mana can NEVER be relied on at all — not even
 * at the 0.4x conditional discount `isConditionalColoredProducer` applies to
 * a Verge or a costed activation. These read as full WUBRG rainbow lands to
 * Scryfall's `produced_mana` / `classify_lands.py`, but the colour is gated
 * behind a counter the land must first acquire, granted only to OTHER
 * permanents, a one-shot trigger, or "any type a Gate could produce". Opt-in
 * (ctx) like the rest of this module — without ctx, always false.
 */
export function isNeverColoredProducer(card: ManaSourceCard, ctx?: ManaSourceContext): boolean {
  if (!ctx) return false;
  const t = (card.oracle_text || '').toLowerCase();
  if (!t) return false;
  // Mana granted only to OTHER permanents — the card itself never taps
  // for it (Forgotten Monument: "Other Caves you control have ...").
  if (/other [a-z]+s? you control have ["'][^"']*add/.test(t)) return true;
  // Gated behind a counter the land must first acquire (Gemstone Caverns'
  // luck counter, Mirrodin's Core's charge counter).
  if (/counter on (?:it|this (?:land|card))[^.]*,?\s*(?:instead )?add/.test(t)) return true;
  if (/remove an? [a-z]+ counter[^:]*:\s*add/.test(t)) return true;
  // One-shot trigger (Branch of Vitu-Ghazi's disguise face-up trigger) —
  // not a repeatable {T} source.
  if (/when this (?:land|card) is turned face up[^.]*add/.test(t)) return true;
  // "Any type a Gate could produce" (Plaza of Harmony) is Gate-count
  // gated, not general fixing. Only the Gate wording: "a land you control
  // could produce" (Reflecting Pool) is a real source in any real mana base.
  if (/any (?:type|color) (?:of mana )?that a gate you control could produce/.test(t)) return true;
  // Any player may switch it off (Rhystic Cave).
  if (/unless any player pays/.test(t)) return true;
  // Colour that only comes from sacrificing the land itself (Archaeological
  // Dig) is one-shot; the Odyssey cycle keeps its plain "{T}: Add {W}" line.
  const colourLines = t.split('\n').filter((line) => /add .*(?:any (?:one )?color|\{[wubrg]\})/.test(line.slice(line.indexOf(':') + 1)));
  if (colourLines.length && colourLines.every((line) => /sacrifice this land/.test(line.split(':')[0]))) return true;
  return false;
}

export function isConditionalColoredProducer(card: ManaSourceCard, ctx?: ManaSourceContext): boolean {
  const t = (card.oracle_text || '').toLowerCase();
  if (!t) return false;
  if (isNeverColoredProducer(card, ctx)) return true;

  if (ctx) {
    // Opt-in (ctx) like the rest: colour that costs a permanent (Lazotep
    // Quarry "{T}, Sacrifice a creature: Add one mana of any color",
    // Phyrexian Tower), a basic-land search that costs mana (Demolition
    // Field, Myriad Landscape, Thawing Glaciers — not the free "{T},
    // Sacrifice this land:" fetches), or colour read off the graveyard (The
    // Grey Havens "any color among legendary creature cards in your
    // graveyard") is not a turn-after-turn source.
    if (/any color among/.test(t)) return true;
    for (const line of t.split('\n')) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const costPart = line.slice(0, colon);
      const effect = line.slice(colon + 1);
      const makesMana = /add .*(?:any (?:one )?color|\{[wubrg]\})/.test(effect);
      const fetches = /search your library for .*onto the battlefield/.test(effect);
      if (makesMana && /sacrifice (?:a|an|another|two|x) |tap an untapped/.test(costPart)) return true;
      if (fetches && /\{(?!t\})[^}]*\}/.test(costPart)) return true;
    }
  }

  const makesColor = /add (?:one|x|five|\d+) mana of any (?:one )?color|add an amount of .* mana|add .*\{[wubrg]\}|any combination of colors/.test(t);
  if (!makesColor) return false;
  if (/activated? only if/.test(t)) {
    // "Activate only if you control a <basic type>" (Verges) is full
    // credit — not conditional — when the deck runs a land of that basic
    // type: basics, shocks, typed duals and triomes all count.
    if (ctx) {
      const cond = t.match(/activated? only if you control an? ([^.]+)/);
      if (cond) {
        const named = cond[1].split(/,| or | and /).map((s) => s.replace(/^\s*(a|an)\s+/, '').trim());
        const satisfied = named.some((n) => {
          const c = BASIC_TYPE_TO_COLOR[n];
          return c != null && ctx.typedLandColors.includes(c);
        });
        if (satisfied) return false;
      }
    }
    return true;
  }
  if (/entered (?:the battlefield )?this turn/.test(t)) return true;
  if (/devotion/.test(t)) return true;
  // Costed or X-scaled any-color activation: look at each ability line's
  // cost (before the ':') for a mana symbol other than a bare {T}, or an
  // "X mana" amount, on a line that produces any color.
  for (const line of t.split('\n')) {
    if (!/add .*(?:any (?:one )?color|any combination of colors)/.test(line)) continue;
    const costPart = line.split(':')[0];
    const costedActivation = /\{(?!t\})[^}]*\}/.test(costPart);
    const xScaled = /add x mana/.test(line);
    if (costedActivation || xScaled) return true;
  }
  return false;
}

/** True for one-shot mana (rituals, sac-for-mana) — burst, not a stable source. */
function isOneShotMana(card: ManaSourceCard): boolean {
  const t = (card.oracle_text || '').toLowerCase();
  const type = (card.type_line || '').toLowerCase();
  // Rituals: instant/sorcery that adds mana
  if ((type.includes('instant') || type.includes('sorcery')) && /add (?:\{|one|two|three)/.test(t)) return true;
  // Lands/artifacts that sacrifice THEMSELVES to add mana (Lotus Vale makes mana
  // repeatedly, but cards like Lotus Petal / Black Lotus are one-shot)
  if (/sacrifice [^.]*: add/i.test(card.oracle_text || '') && type.includes('artifact') && !/\{t\}: add/i.test(card.oracle_text || '')) return true;
  return false;
}

/**
 * Classify a card's reliable colored-mana contribution for source counting.
 */
export function realManaSources(card: ManaSourceCard, ctx?: ManaSourceContext): ManaSourceProfile {
  const type = (card.type_line || '').toLowerCase();
  const produced = parseProduced(card.produced_mana);
  const isLand = type.split('//')[0].includes('land');
  const isRock = !isLand && type.includes('artifact') && produced.length > 0;
  const isDork = !isLand && type.includes('creature') && produced.length > 0;

  const kind: ManaSourceProfile['kind'] = isLand ? 'land' : isRock ? 'rock' : isDork ? 'dork' : produced.length ? 'other' : 'none';

  // Fetch / chosen-type lands: credit colors despite null produced_mana.
  const implicit = implicitLandColors(card, ctx);
  if (implicit) {
    return { colors: implicit, kind: 'land', reliable: true, anyColor: implicit.length >= 3, note: 'fetch/chosen land' };
  }

  if (produced.length === 0) {
    return { colors: [], kind: 'none', reliable: false, anyColor: false };
  }

  if (isRestrictedProducer(card.oracle_text)) {
    return { colors: [], kind, reliable: false, anyColor: false, note: 'restricted: spell-type only' };
  }

  if (isOneShotMana(card)) {
    return { colors: [], kind, reliable: false, anyColor: false, note: 'one-shot burst' };
  }

  // Conditional any-color lands (Mirrex/Nykthos/Spire) aren't reliable rainbow
  // fixing — don't credit their colored output as general sources.
  if (isConditionalColoredProducer(card, ctx)) {
    return { colors: [], kind, reliable: false, anyColor: false, note: 'conditional/gated colored mana' };
  }

  // Reliable. A producer of 3+ WUBRG colors taps for any ONE of them per use
  // (Command Tower, gates, chosen-color lands) — still counts as a source of
  // each color by the standard deckbuilding convention.
  const anyColor = produced.length >= 3;
  return { colors: produced, kind, reliable: true, anyColor };
}

/**
 * Count reliable WUBRG sources across a card list (with quantities).
 * Each reliable producer adds 1 toward every color it can make.
 */
export function countColorSources(
  cards: Array<{ card: ManaSourceCard; quantity: number }>,
  ctx?: ManaSourceContext
): Record<string, number> {
  const sources: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const { card, quantity } of cards) {
    const prof = realManaSources(card, ctx);
    if (!prof.reliable) continue;
    for (const c of prof.colors) {
      if (sources[c] !== undefined) sources[c] += quantity;
    }
  }
  return sources;
}

/**
 * Build a ManaSourceContext from a card list (basics + typed lands) plus the
 * deck's colour identity. Shared by the land scorer (pre-build, no basic
 * counts yet — falls back to deckColors) and the post-build auditor (real
 * counts from the finished decklist).
 */
export function buildManaSourceContext(
  deckColors: string[],
  landCards?: Array<{ card: ManaSourceCard; quantity: number }>,
  colorPriority?: string[]
): ManaSourceContext {
  if (!landCards) {
    // Pre-build: no basic distribution exists yet. The land builder always
    // fills any remaining slots with basics of the deck's own colours
    // (Step 7), so the deck's colour identity is the honest approximation.
    return { deckColors, basicColors: deckColors, typedLandColors: deckColors, colorPriority };
  }
  const basicColors = new Set<string>();
  const typedLandColors = new Set<string>();
  for (const { card } of landCards) {
    const type = (card.type_line || '');
    if (!type.includes('Land')) continue;
    const subtypePart = type.split('—')[1] || '';
    const isBasic = type.includes('Basic Land');
    for (const [basicType, color] of Object.entries(BASIC_TYPE_TO_COLOR)) {
      if (subtypePart.toLowerCase().includes(basicType)) {
        typedLandColors.add(color);
        if (isBasic) basicColors.add(color);
      }
    }
  }
  return {
    deckColors,
    basicColors: [...basicColors],
    typedLandColors: [...typedLandColors],
    colorPriority,
  };
}

/** Sum colored pips across nonland cards' mana costs (with quantities). */
export function countPipDemand(
  cards: Array<{ card: ManaSourceCard; quantity: number }>
): Record<string, number> {
  const pips: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const { card, quantity } of cards) {
    const type = (card.type_line || '').toLowerCase();
    if (type.split('//')[0].includes('land')) continue;
    const mc = card.mana_cost || '';
    for (const m of mc.matchAll(/\{([WUBRG])\}/g)) {
      pips[m[1]] += quantity;
    }
  }
  return pips;
}
