/**
 * Land Intelligence — scores and selects lands for deck building.
 *
 * Replaces the naive "grab non-basic lands ordered by EDHREC rank" approach
 * with tier-aware, color-demand-weighted, tribal-sensitive land selection.
 *
 * Requires the `land_classifications` table (migration v19) to be populated
 * by running `scripts/classify_lands.py`.
 */

import { getDb } from '@/lib/db';
import { getLegalityKey, DEFAULT_DECK_SIZE } from '@/lib/constants';
import { isRestrictedProducer, isConditionalColoredProducer, isNeverColoredProducer, fetchLandColors, implicitLandColors, chosenTypeLandColors, buildManaSourceContext, type ManaSourceContext } from '@/lib/mana-sources';
import { ownedNamesSubqueryInline, normalizedNameExpr, stripArenaPrefix, type OwnershipFilter } from '@/lib/collection-ownership';
import type { DbCard } from '@/lib/types';

/**
 * Join clause restricting `cards c` to owned names (A--stripped, basics
 * included). A semi-join on purpose: `INNER JOIN (owned) ON strip(c.name) =
 * owned.cname` planned as SCAN c x SCAN owned, re-running the owned subquery
 * for every card (36-66 s per collection land query on the live DB). An IN
 * subquery is materialized once; same rows, same order, ~0.2 s.
 */
// ponytail: lives here because collection-ownership.ts was owned by another unit; move it next to ownedNamesSubqueryInline.
export function ownedNameJoin(filter: OwnershipFilter): string {
  return `INNER JOIN (SELECT 1) owned ON ${normalizedNameExpr('c.name')} IN (SELECT cname FROM (${ownedNamesSubqueryInline(filter)}))`;
}

// ── Fetch land relevance check ──────────────────────────────────────────────
// Fetch lands have color_identity [] but can only search for specific basic types.
// A Flooded Strand (Plains/Island) is useless in a RG deck.
const BASIC_TYPE_TO_COLOR: Record<string, string> = {
  plains: 'W', island: 'U', swamp: 'B', mountain: 'R', forest: 'G',
};

export function isFetchLandRelevant(oracleText: string, deckColors: string[]): boolean {
  const lower = oracleText.toLowerCase();
  if (!lower.includes('search your library for a')) return true;
  for (const [type, color] of Object.entries(BASIC_TYPE_TO_COLOR)) {
    if (lower.includes(type) && deckColors.includes(color)) return true;
  }
  const mentionsSpecificType = Object.keys(BASIC_TYPE_TO_COLOR).some((t) => lower.includes(t));
  return !mentionsSpecificType;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface LandScore {
  card: DbCard;
  score: number;
  tier: number;
  category: string;
  producesColors: string[];
  /** untappedCredit >= 1 — untapped on the turns that matter for THIS deck */
  entersUntapped: boolean;
  /** 1 untapped, 0.5 first-three-turns lands, 0 tapped (or an unsatisfiable condition) */
  untappedCredit: number;
  /** How much of one colour source a copy is worth in the deficit count: 1, 0.4 conditional, 0 restricted */
  sourceCredit: number;
  /** Worth a slot over a basic (untapped real fixing, a tri-land in 3+ colours, or a deck-relevant payoff) */
  clearsBar: boolean;
  reasons: string[];
}

export interface ManaDemand {
  /** Map of color → total pips in all non-land cards */
  colorDemand: Record<string, number>;
  /** The color with the most pips */
  heaviestColor: string;
  /** Ratio of pips per color (0-1) */
  colorIntensity: Record<string, number>;
  /** Total pips across all colors */
  totalPips: number;
  /** Per colour, the single most demanding card (pips of that colour, mana value) — sets the Karsten source target */
  heaviestCost: Record<string, { pips: number; mv: number }>;
}

// Karsten-style sources for a ≥90 % on-curve cast, indexed [pips][mana value]
// (mv capped at 7). 99-card table from "How many sources … in Commander"
// (2022); 60-card from the 2018 Frank Analysis. Approximate — the point is
// the ORDER: CC two-drops need far more sources than one pip on a six-drop.
const KARSTEN_99: number[][] = [[], [0, 19, 17, 15, 14, 13, 12, 11], [0, 0, 26, 24, 22, 21, 19, 18], [0, 0, 0, 33, 30, 28, 26, 24]];
const KARSTEN_60: number[][] = [[], [0, 14, 13, 12, 11, 10, 9, 9], [0, 0, 20, 18, 16, 15, 14, 13], [0, 0, 0, 23, 21, 19, 18, 17]];

function karstenSources(table: number[][], pips: number, mv: number): number {
  const p = Math.min(3, pips);
  return table[p][Math.min(7, Math.max(p, mv))];
}

/** Mana value of a cost string: generic digits + one per other symbol (hybrid, phyrexian, snow, C); X = 0. */
function manaValueOf(cost: string): number {
  let mv = 0;
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) {
    const sym = m[1];
    mv += /^\d+$/.test(sym) ? Number(sym) : sym === 'X' ? 0 : 1;
  }
  return mv;
}

/**
 * Per-colour land-source targets: the Karsten count for the deck's most
 * demanding card of that colour (99-card table for Commander-family formats;
 * rocks are on top).
 */
export function colorSourceTargets(demand: ManaDemand, format: string): Record<string, number> {
  const table = (DEFAULT_DECK_SIZE[format] ?? DEFAULT_DECK_SIZE.default) >= 99 ? KARSTEN_99 : KARSTEN_60;
  const out: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const [c, req] of Object.entries(demand.heaviestCost)) out[c] = karstenSources(table, req.pips, req.mv);
  return out;
}

export interface LandBaseResult {
  lands: Array<{ card: DbCard; quantity: number }>;
  basicDistribution: Record<string, number>;
  totalNonBasic: number;
}

// ── Mana Demand Analysis ────────────────────────────────────────────────────

const PIP_REGEX = /\{([WUBRG])\}/g;

/**
 * Analyze mana demands from non-land cards to determine color intensity.
 */
export function analyzeManaDemands(
  nonLandCards: Array<{ mana_cost: string | null; quantity: number }>
): ManaDemand {
  const colorDemand: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const heaviestCost: ManaDemand['heaviestCost'] = {};

  for (const card of nonLandCards) {
    if (!card.mana_cost || card.quantity <= 0) continue;
    let match;
    const regex = new RegExp(PIP_REGEX.source, PIP_REGEX.flags);
    const cardPips: Record<string, number> = {};
    while ((match = regex.exec(card.mana_cost)) !== null) {
      colorDemand[match[1]] += card.quantity;
      cardPips[match[1]] = (cardPips[match[1]] || 0) + 1;
    }
    const mv = manaValueOf(card.mana_cost);
    for (const [c, pips] of Object.entries(cardPips)) {
      const prev = heaviestCost[c];
      if (!prev || karstenSources(KARSTEN_99, pips, mv) > karstenSources(KARSTEN_99, prev.pips, prev.mv)) heaviestCost[c] = { pips, mv };
    }
  }

  const totalPips = Object.values(colorDemand).reduce((s, v) => s + v, 0);
  const colorIntensity: Record<string, number> = {};
  let heaviestColor = 'W';
  let maxPips = 0;

  for (const [color, pips] of Object.entries(colorDemand)) {
    colorIntensity[color] = totalPips > 0 ? pips / totalPips : 0;
    if (pips > maxPips) {
      maxPips = pips;
      heaviestColor = color;
    }
  }

  return { colorDemand, heaviestColor, colorIntensity, totalPips, heaviestCost };
}

// Strategy → the classify_lands.py synergy tag worth a slot in that deck.
const STRATEGY_LAND_TAGS: Record<string, string> = {
  artifacts: 'artifact', aristocrats: 'sac_outlet', superfriends: 'proliferate',
};

// ── "Untapped only when true" ────────────────────────────────────────────────
// Formats where "unless you have two or more opponents" (bond lands) holds.
const MULTIPLAYER_FORMATS = new Set(['commander']);

type TappedCondition =
  | { kind: 'untapped' } | { kind: 'tapped' } | { kind: 'payLife' } | { kind: 'firstTurns' } | { kind: 'opponents' }
  | { kind: 'reveal'; types: string[] } | { kind: 'basicType'; types: string[] } | { kind: 'other'; text: string };

/**
 * Read the land's own ETB clause: the sentence with "enters tapped", its
 * "unless …" tail, or (for "If you don't, it enters tapped.") the choice
 * sentence before it. No such sentence = untapped; no condition = tapped.
 */
export function parseTappedCondition(oracle: string | null | undefined): TappedCondition {
  const sentences = (oracle || '').toLowerCase().split(/[.\n]/).map((s) => s.trim());
  const i = sentences.findIndex((s) => /enters(?: the battlefield)? tapped\b/.test(s));
  if (i === -1) return { kind: 'untapped' };
  const s = sentences[i];
  let cond = s.match(/tapped unless (.+)$/)?.[1];
  if (cond == null && /^if you don'?t/.test(s)) cond = [...sentences.slice(0, i)].reverse().find((p) => /you may/.test(p)) ?? '';
  if (cond == null) return { kind: 'tapped' };
  if (/pay \d+ life/.test(cond)) return { kind: 'payLife' };
  if (/first, second, or third turn/.test(cond)) return { kind: 'firstTurns' };
  if (/two or more opponents/.test(cond)) return { kind: 'opponents' };
  const basics = Object.keys(BASIC_TYPE_TO_COLOR).filter((t) => cond!.includes(t));
  if (basics.length) return { kind: 'basicType', types: basics };
  const reveal = cond.match(/reveal(?:ed)? an? ([a-z]+)(?: or an? ([a-z]+))? card/);
  if (reveal) return { kind: 'reveal', types: [reveal[1], reveal[2]].filter(Boolean) as string[] };
  return { kind: 'other', text: cond };
}

/** 1 / 0.5 / 0 — how much of the flat untapped bonus the condition earns for THIS deck. */
function untappedCreditFor(
  cond: TappedCondition, colors: string[], tribalTypes: string[] | undefined, format: string, classified: number | null,
): number {
  const tribes = (tribalTypes || []).map((t) => t.toLowerCase());
  switch (cond.kind) {
    case 'untapped': case 'payLife': return 1;
    case 'tapped': return 0;
    case 'firstTurns': return 0.5;
    case 'opponents': return MULTIPLAYER_FORMATS.has(format) ? 1 : 0;
    case 'reveal': return cond.types.some((t) => tribes.includes(t)) ? 1 : 0;
    case 'basicType': return cond.types.some((t) => colors.includes(BASIC_TYPE_TO_COLOR[t])) ? 1 : 0;
    case 'other':
      // Slow/fast lands and "a basic land" are always satisfiable; anything
      // else (a planeswalker, 13 or less life, eight opponent lands…) keeps
      // the classifier's verdict, which is "tapped" for the generic branch.
      if (/two or (?:more|fewer) other lands|a basic land/.test(cond.text)) return 1;
      return classified === 1 ? 1 : 0;
  }
}

// ── Land Scoring ─────────────────────────────────────────────────────────────

interface ScoreOptions {
  colors: string[];
  format: string;
  strategy?: string;
  tribalTypes?: string[];
  commanderName?: string;
  userId?: number;
  /** Restrict ownership to one collection source (e.g. 'arena', 'paper'). Undefined = every source. */
  collectionSource?: string;
  manaDemand?: ManaDemand;
  collectionOnly?: boolean;
  rarityFilter?: 'pauper' | 'peasant';
  /** USD price ceiling per land; ignored when collectionOnly (owned = free) */
  maxCardPrice?: number;
}

/**
 * Score all available lands for a given deck configuration.
 * Returns scored lands sorted by score descending.
 */
export function scoreLandsForDeck(options: ScoreOptions): LandScore[] {
  const { colors, format, strategy, tribalTypes, commanderName, manaDemand, collectionOnly, userId } = options;
  const db = getDb();

  // Honest colour count: chosen-type lands credit one colour (the deck's
  // heaviest, if pip demand is known) instead of five, and generic fetchers
  // credit only the deck's own colours instead of unconditional WUBRG.
  const colorPriority = manaDemand
    ? [...colors].sort((a, b) => (manaDemand.colorIntensity[b] || 0) - (manaDemand.colorIntensity[a] || 0))
    : undefined;
  const manaCtx: ManaSourceContext = buildManaSourceContext(colors, undefined, colorPriority);

  // Build legality filter
  const legalityKey = getLegalityKey(format);
  const rarityCondition = options.rarityFilter === 'pauper' ? " AND c.rarity = 'common'" : options.rarityFilter === 'peasant' ? " AND c.rarity IN ('common', 'uncommon')" : '';
  const legalityFilter = `AND json_extract(c.legalities, '$.${legalityKey}') IN ('legal', 'restricted')${rarityCondition}`;

  // Collection filter: name-based join (A--stripped, so "A-X" and "X" count
  // as one card) with basic land exemptions, scoped to the building user
  // and, if given, one collection source — unscoped, it let land planning
  // see (and count as "owned") every other user's cards too, and it could
  // disagree with the pool's own ownership check (getMaxQty).
  const colJoin = collectionOnly
    ? ownedNameJoin({ userId, source: options.collectionSource })
    : '';

  // Fetch all non-basic lands with classifications
  const lands = db.prepare(`
    SELECT c.*, lc.land_category, lc.produces_colors, lc.enters_untapped,
           lc.enters_untapped_condition, lc.tribal_types, lc.synergy_tags, lc.tier
    FROM cards c
    ${colJoin}
    LEFT JOIN land_classifications lc ON lc.card_id = c.id
    WHERE c.type_line LIKE '%Land%'
    AND c.type_line NOT LIKE '%Basic%'
    ${legalityFilter}
    ORDER BY lc.tier ASC NULLS LAST, c.edhrec_rank ASC NULLS LAST
    LIMIT 1000
  `).all() as Array<DbCard & {
    land_category: string | null;
    produces_colors: string | null;
    enters_untapped: number | null;
    enters_untapped_condition: string | null;
    tribal_types: string | null;
    synergy_tags: string | null;
    tier: number | null;
  }>;

  // Per-card price cap (rule 2 — "lands included"). Not applied when
  // collectionOnly, since that pool is already owned-only (free to the user).
  const cappedLands = options.maxCardPrice != null && options.maxCardPrice > 0 && !collectionOnly
    ? lands.filter((l) => {
        const price = l.price_usd != null ? parseFloat(l.price_usd) : NaN;
        return Number.isNaN(price) || price <= options.maxCardPrice!;
      })
    : lands;

  // Get EDHREC land recommendations for this commander
  const edhrecLands = new Set<string>();
  if (commanderName) {
    const rows = db.prepare(`
      SELECT card_name FROM edhrec_avg_decks
      WHERE commander_name = ? AND card_type = 'land'
    `).all(commanderName) as Array<{ card_name: string }>;
    for (const r of rows) edhrecLands.add(r.card_name.toLowerCase());
  }

  // Get tournament land presence
  const metaLands = new Map<string, number>();
  try {
    const metaRows = db.prepare(`
      SELECT card_name, meta_inclusion_rate FROM meta_card_stats
      WHERE format = ? AND meta_inclusion_rate > 0
    `).all(format) as Array<{ card_name: string; meta_inclusion_rate: number }>;
    for (const r of metaRows) metaLands.set(r.card_name.toLowerCase(), r.meta_inclusion_rate);
  } catch { /* table might not exist */ }

  const scored: LandScore[] = [];
  const allowedColorSet = new Set(colors);

  for (const land of cappedLands) {
    // ── Hard color-identity filter ───────────────────────────────
    // MDFCs (e.g. Shatterskull Smashing, Sundering Eruption) carry the
    // colored spell face's CI even though the land face is colorless.
    // Reject anything with a CI color outside the deck's identity.
    if (land.color_identity) {
      try {
        const ci: string[] = JSON.parse(land.color_identity);
        let legal = true;
        for (const c of ci) {
          if (!allowedColorSet.has(c)) { legal = false; break; }
        }
        if (!legal) continue;
      } catch { /* malformed CI — fall through */ }
    }

    // Only cards that can actually be PLAYED as a land belong in the mana
    // base: the front face must be a Land, or it must be a modal DFC whose
    // back face is a land. Transform/meld cards with land back faces
    // (Dowsing Dagger, Growing Rites, the Ojer gods) are NOT castable as
    // lands and were polluting every generated mana base.
    const frontType = (land.type_line || '').split('//')[0];
    const frontIsLand = frontType.includes('Land');
    const isModalDfc = land.layout === 'modal_dfc';
    if (!frontIsLand && !isModalDfc) continue;

    // ── Mono-colour "beats a basic" filter ─────────────────────────
    // A basic taps for the deck's one colour, untapped, no downside. A
    // nonbasic only earns a slot in a mono-colour base if it clears that
    // bar. These shapes never do, no matter what else they're stapled to:
    if (colors.length <= 1) {
      const lower = (land.oracle_text || '').toLowerCase();
      const deckColor = colors[0];

      // Any-colour (Command Tower) or chosen-type (Thran Portal, Multiversal
      // Passage: chosen basic land type; Temple of the Dragon Queen: chosen
      // COLOR, not tied to a basic type) lands are flexible fixing in
      // multicolour, but in mono they just become "your one colour" — no
      // upside over a basic, sometimes with a tapped/life-cost downside.
      const anyColor = /add (?:one|two|three|four|five|x|\d+|an amount of) mana of any(?: one)? color/.test(lower)
        || /any combination of colors/.test(lower)
        // Guild-Gate typal fixing (Plaza of Harmony: "any type that a Gate
        // you control could produce") — flexible, not deck-colour-specific.
        || /any type (?:of mana )?that a .*? could produce/.test(lower);
      const chosenColor = /choose a color/.test(lower) && /chosen color/.test(lower);
      // Cavern of Souls' "any color" is restricted to casting a creature of
      // the chosen type AND that spell can't be countered — a real utility
      // clause, not just fixing, so it isn't the flexible-in-multicolour-only
      // shape this filter targets. Only worth a mono slot when the deck
      // actually runs the tribe; genericTribalLand (below) gives it credit
      // once it survives here. A creature-type-restricted "any colour" land
      // with NO extra clause (Unclaimed Territory, Secluded Courtyard — the
      // "or activate an ability of a creature source" tail is still just
      // fixing) has no upside over a basic in mono and stays excluded.
      const cavernTribal = /spend this mana only to cast a creature spell of the chosen type.*can't be countered/.test(lower)
        && !!tribalTypes && tribalTypes.length > 0;
      if ((anyColor && !cavernTribal) || chosenColor || chosenTypeLandColors(land) !== null) continue;

      // Any fetch that deposits its target TAPPED — the ETB-sacrifice "gate"
      // family (Cabaretti Courtyard, Brokers Hideout) and the activated
      // basic-fetchers (Evolving Wilds, Terramorphic Expanse, Fabled
      // Passage, Escape Tunnel) alike — just becomes a tapped basic.
      // Strictly worse than running the basic untapped. Untapped fetches
      // (Misty Rainforest, Prismatic Vista, Polluted Delta...) are real
      // thinning and stay eligible.
      if (fetchLandColors(land) !== null && /onto the battlefield tapped/.test(lower)) continue;

      // Fetches that enter tapped THEMSELVES and can only ever be
      // sacrificed for a basic (the Fallen Empires cycle: Bad River, Flood
      // Plain, Rocky Tar Pit, Mountain Valley, Grasslands — no independent
      // mana ability at all) are a tapped land for a turn that then becomes
      // the exact basic a mono deck already runs, for a point of life.
      // Strictly worse than the basic itself.
      const entersTappedItself = lower.includes('enters the battlefield tapped') || lower.includes('enters tapped');
      if (fetchLandColors(land) !== null && entersTappedItself) continue;

      // Pain lands that charge life for the SAME colour a basic gives free.
      if (deckColor && new RegExp(`pay \\d+ life:\\s*add \\{${deckColor}\\}`, 'i').test(lower)) continue;

      // Conditional duals whose untap condition names basic types this deck
      // doesn't run (Kishla Village: "unless you control an Island or a
      // Swamp" in mono-green never triggers) — always-tapped for nothing.
      // A generic condition ("a basic land") is always satisfiable and
      // falls through untouched (Ba Sing Se).
      const untapCond = lower.match(/enters tapped unless you control ([^.]+)/);
      if (untapCond) {
        const namedTypes = untapCond[1].split(/,| or /).map((s) => s.replace(/^\s*(a|an)\s+/, '').trim());
        const namesBasicType = namedTypes.some((t) => BASIC_TYPE_TO_COLOR[t]);
        const satisfiable = namedTypes.some((t) => BASIC_TYPE_TO_COLOR[t] === deckColor);
        if (namesBasicType && !satisfiable) continue;
      }
    }

    let producesColors: string[] = [];
    try { producesColors = JSON.parse(land.produces_colors || '[]'); } catch { /* empty */ }
    // land_classifications may be unpopulated — fall back to Scryfall's
    // produced_mana so the color-match bonus still fires.
    if (producesColors.length === 0 && land.produced_mana) {
      try {
        producesColors = (JSON.parse(land.produced_mana) as string[]).filter((c) => 'WUBRG'.includes(c));
      } catch { /* empty */ }
    }
    // Choose-a-colour abilities gated on a creature-type/tribal count (Three
    // Tree City: "choose a color, add mana of that color per creature of
    // the chosen type") aren't reliable fixing — value is entirely tribal
    // payoff, not colour production. Whenever the deck has no tribe (mono or
    // multicolour), strip the classified colour credit so it's judged
    // colourless (a tribal deck gets it back via the tribal-match exemption).
    if (!tribalTypes?.length && /choose a color\.[^.]*add[^.]*of (?:that|the chosen) color[^.]*(?:creature|of the chosen type)/.test((land.oracle_text || '').toLowerCase())) {
      producesColors = producesColors.filter((c) => c === 'C');
    }
    // Restricted production ("spend this mana only to cast planeswalker
    // spells" — Interplanar Beacon) isn't real colour fixing in mono
    // either: that {G} is unusable outside the narrow cast window, so the
    // land is effectively colourless. Only strip credit when there's no
    // OTHER, unrestricted plain "{T}: Add {X}" line — Castle Garenbrig's
    // six-mana ability is restricted too, but its base {T}: Add {G} isn't.
    if (colors.length <= 1 && isRestrictedProducer(land.oracle_text)) {
      const hasUnrestrictedColorTap = (land.oracle_text || '').split('\n')
        .some((line) => /^\{t\}:\s*add \{[wubrg]\}\.?$/i.test(line.trim()));
      if (!hasUnrestrictedColorTap) producesColors = producesColors.filter((c) => c === 'C');
    }
    // Fetch / chosen-type lands have no produced_mana but ARE fixing for the
    // colors they retrieve/become. Credit them; fetches don't enter tapped.
    const fetched = fetchLandColors(land, manaCtx);
    const implicit = implicitLandColors(land, manaCtx);
    const isFetch = fetched !== null;
    // Fetch/chosen-type colours OVERRIDE land_classifications and Scryfall
    // produced_mana, not just fill a gap — classify_lands.py still lists
    // these as flat WUBRG (that's the honest-count bug itself), so a
    // fallback-when-empty rule would never see the ctx-scoped colours.
    if (implicit) {
      producesColors = implicit;
    }
    // Honest count: gated-behind-a-counter / granted-to-others / one-shot /
    // Gate-any-type mana is NOT a discount case (that's the 0.4x
    // `conditional` scale below, for a Verge or a costed activation that
    // sometimes pays off) — it's never a source at all.
    if (isNeverColoredProducer(land, manaCtx)) {
      producesColors = producesColors.filter((c) => c === 'C');
    }

    let tribalTypesArr: string[] = [];
    try { tribalTypesArr = JSON.parse(land.tribal_types || '[]'); } catch { /* empty */ }
    let synergyTags: string[] = [];
    try { synergyTags = JSON.parse(land.synergy_tags || '[]'); } catch { /* empty */ }

    const matchingColors = producesColors.filter(c => colors.includes(c));

    // A land that's colourless in practice (gated behind a counter, granted
    // to others, one-shot, Gate-any-type) is a trap regardless of what
    // classify_lands.py tiered it at — it doesn't deserve tier-1 treatment
    // just because Scryfall's produced_mana said WUBRG.
    let tier = land.tier || 3;
    if (isNeverColoredProducer(land, manaCtx) && tier < 4) tier = 4;
    const tapText = (land.oracle_text || '').toLowerCase();
    // Untapped only when true. Fetches are judged on their own ETB plus what
    // they deposit (Thawing Glaciers / Krosan Verge enter tapped, Evolving
    // Wilds fetches tapped); every other land on its ETB clause read against
    // THIS deck — reveal-a-type only with the tribe, check types only for
    // deck colours, "two or more opponents" only in multiplayer, first-three-
    // turns lands at half — never the classifier's flat enters_untapped.
    const ownEntersTapped = tapText.includes('enters the battlefield tapped') || tapText.includes('enters tapped');
    const depositsTapped = /onto the battlefield tapped/.test(tapText);
    const untappedCredit = isFetch
      ? (!ownEntersTapped && !depositsTapped ? 1 : 0)
      : untappedCreditFor(parseTappedCondition(land.oracle_text), colors, tribalTypes, format, land.enters_untapped);
    const entersUntapped = untappedCredit >= 1;
    // No land that isn't reliably untapped is tier 1-2 (the classifier's own
    // rule, re-applied to the deck-specific verdict — Starting Town is a
    // tapped land from turn 4); a tapped land producing 3+ deck colours in a
    // 3+ colour deck (triomes) is real fixing, not gainland tier.
    if (untappedCredit < 1 && tier < 3) tier = 3;
    if (tier === 4 && matchingColors.length >= 3 && colors.length >= 3) tier = 3;
    const category = land.land_category || 'utility';
    const reasons: string[] = [];

    // ── Base score from tier ──────────────────────────────────────
    const tierBase = { 1: 100, 2: 70, 3: 40, 4: 15 }[tier] ?? 30;
    let score = tierBase;

    // ── Untapped bonus ───────────────────────────────────────────
    if (untappedCredit > 0) {
      score += Math.round(40 * untappedCredit);
      reasons.push(entersUntapped ? 'enters untapped' : 'untapped on turns 1-3 only');
    }

    // ── Color match bonus ────────────────────────────────────────
    // Restricted producers (Cavern of Souls: "spend only to cast creature
    // spells") are NOT general fixing — Scryfall's produced_mana says WUBRG
    // but a spell-heavy deck can't pay for charms or draw with them. Treat
    // their colored production at a steep discount so at most a couple make
    // the cut, instead of 8 of them masquerading as a rainbow mana base.
    // Superfriends: planeswalker- / legendary-only mana (Interplanar Beacon,
    // Great Hall of the Citadel) pays for most of that deck — a real source.
    const walkerMana = strategy === 'superfriends' && /only to cast (?:planeswalker|legendary) spells/i.test(land.oracle_text || '');
    const restricted = isRestrictedProducer(land.oracle_text) && !walkerMana;
    // A TYPED fetch (Verdant Catacombs: Swamp/Forest) that only matches ONE
    // color of a 2+ color deck is only worth its thinning — it can't fix the
    // other color(s), unlike a dual or an on-colour fetch. Generic fetches
    // (Evolving Wilds, Prismatic Vista: "a basic land") return all 5 WUBRG
    // colors from fetchLandColors, so they always match every deck color and
    // never hit this branch; a mono-colour deck's single-color match isn't
    // penalized either (colors.length < 2).
    const matchCountBeforeScale = producesColors.filter(c => colors.includes(c)).length;
    const fetchOffColor = isFetch && !!fetched && fetched.length < 5 && colors.length >= 2 && matchCountBeforeScale === 1;
    const conditional = (isConditionalColoredProducer(land, manaCtx) && !walkerMana) || fetchOffColor;
    const colorBonusScale = restricted ? 0.25 : conditional ? 0.4 : 1;
    if (restricted) reasons.push('restricted producer');
    if (fetchOffColor) reasons.push('off-color fetch (thinning only)');
    else if (conditional) reasons.push('conditional colored mana');

    if (matchingColors.length > 0) {
      // Cap breadth at 3: a 5-colour land is worth a triome, not 2.5 duals —
      // tier and untapped-ness decide the order among real fixers instead
      // of colour count alone dominating.
      score += Math.round(30 * Math.min(matchingColors.length, 3) * colorBonusScale);
      reasons.push(`produces ${matchingColors.join('')}`);

      // Bonus for matching heaviest color
      if (manaDemand && matchingColors.includes(manaDemand.heaviestColor)) {
        const intensity = manaDemand.colorIntensity[manaDemand.heaviestColor] || 0;
        score += Math.round(20 * intensity * colorBonusScale);
        reasons.push(`matches heavy color (${manaDemand.heaviestColor})`);
      }
    } else if (producesColors.length === 0 || producesColors.every(c => c === 'C')) {
      // Colorless-producing or unclassified lands — check oracle text for
      // type-granting effects that only benefit specific colors
      const oracleLC = (land.oracle_text || '').toLowerCase();
      const typeGrants: Record<string, string> = {
        'swamp': 'B', 'mountain': 'R', 'forest': 'G', 'plains': 'W', 'island': 'U',
      };
      let grantsOffColor = false;
      for (const [basicType, grantColor] of Object.entries(typeGrants)) {
        // Match patterns like "each land is a Swamp" or "lands you control are Swamps"
        if ((oracleLC.includes(`is a ${basicType}`) || oracleLC.includes(`are ${basicType}`))
            && !colors.includes(grantColor)) {
          grantsOffColor = true;
          break;
        }
      }
      if (grantsOffColor) continue; // e.g. Urborg in a non-black deck
      score += 5;
    } else {
      // Produces ONLY off-colors — hard exclude (e.g. Urborg in UR deck)
      continue;
    }

    // Skip fetch lands that search for basic types not in deck colors
    // (e.g. Flooded Strand in a RG deck)
    if (!isFetchLandRelevant(land.oracle_text || '', colors)) continue;

    // ── Tribal match bonus ───────────────────────────────────────
    let tribalMatch = false;
    if (tribalTypes && tribalTypes.length > 0 && tribalTypesArr.length > 0) {
      tribalMatch = tribalTypesArr.some(t =>
        tribalTypes.some(dt => dt.toLowerCase() === t.toLowerCase())
      );
      if (tribalMatch) {
        score += 50;
        reasons.push('tribal synergy');
      }
    }

    // Special tribal lands by category (Three Tree City: works for ANY
    // chosen creature type, so it has no fixed tribal_types to match — the
    // deck running a tribal plan at all is the relevance signal).
    const genericTribalLand = category === 'tribal' && !!tribalTypes && tribalTypes.length > 0;
    if (genericTribalLand) {
      score += 30;
      reasons.push('tribal land');
    }

    // ── Mono-colour: colourless-only lands need a premium ability ────
    // A basic already gives the deck's one colour for free, untapped. A
    // {C}-only land (no colour match at all) only clears that bar with a
    // genuinely strong, deck-relevant payoff — hard evasion (Rogue's
    // Passage), hard removal/exile, or an extra turn. "No maximum hand
    // size" (Reliquary Tower), Gate-count lifegain (Plaza of Harmony), a
    // {4}-activated 3/3 (Soulstone Sanctuary), or a one-shot disguise mana
    // burst (Branch of Vitu-Ghazi) don't. Tribal-relevant colourless lands
    // are exempt — their value isn't in the mana they make. A land that
    // ALWAYS enters tapped (Evendo, Waking Haven — unconditional, not the
    // Kishla/Castle "unless" duals already handled above) needs the same
    // bar even when it does match the deck colour: a permanently-tapped
    // land is a worse basic unless something else redeems it.
    const alwaysTapped = !isFetch && ownEntersTapped && !/tapped unless/.test(tapText);
    // Manlands (Mutavault, Den of the Bugbear, Inkmoth/Blinkmoth Nexus) are
    // a genuine threat stapled to a land — that IS the premium payoff, even
    // when (like Den of the Bugbear) the land also enters tapped sometimes.
    // Detected from oracle text (a name list misses Lair of the Hydra, Hall
    // of Storm Giants, the Restless cycle...): the subject animating into a
    // creature must be the land ITSELF ("this land becomes ..."), not some
    // other permanent it targets (Mech Hangar: "Target Vehicle becomes an
    // artifact creature", Ba Sing Se: "Target land you control becomes...").
    const isManland = /\bthis land becomes an? [\s\S]*?\bcreature\b/i.test(tapText);
    // Modal DFC spell-lands (Valakut Awakening, Khalni Ambush, Bala Ged
    // Recovery, Talrand's cycle) are a free spell stapled to a tapped land —
    // already priced as "tapped-land equivalent at best" by the MDFC bonus
    // below, not held to the always-tapped colourless bar again here.
    const isMdfcSpellLand = isModalDfc && !frontIsLand;
    // Nykthos: devotion scales with the deck, not a fixed weak rate.
    const nykthosDevotion = /devotion/.test(tapText);
    // Ancient Tomb: unconditional double colorless is real fast mana.
    // Named, not pattern-matched: an unconditional {C}{C} land with a real
    // downside (City of Traitors doesn't untap; Mishra's Workshop is
    // artifacts-only) is still a worse basic — only Ancient Tomb's plain
    // "{T}: Add {C}{C}, take 2" clears the bar on fast mana alone.
    const ancientTombDoubleC = land.name === 'Ancient Tomb';
    const isUrzasSaga = (land.type_line || '').includes('Saga');
    const exemptColorless = isManland || isMdfcSpellLand || nykthosDevotion || ancientTombDoubleC || isUrzasSaga;
    if (colors.length <= 1 && (matchingColors.length === 0 || alwaysTapped) && !tribalMatch && !genericTribalLand && !exemptColorless) {
      const PREMIUM_COLORLESS_UTILITY = [
        /can't be blocked/,
        /destroy target/,
        /exile target/,
        /extra turn/,
      ];
      if (!PREMIUM_COLORLESS_UTILITY.some((re) => re.test(tapText))) continue;
    }

    // ── Strategy → synergy_tags bonus (A-D7) ─────────────────────
    const wantedTag = strategy ? STRATEGY_LAND_TAGS[strategy] : undefined;
    if (wantedTag && synergyTags.includes(wantedTag)) {
      score += 40;
      reasons.push(`strategy ${strategy}: ${wantedTag}`);
    }

    // ── EDHREC recommendation bonus ──────────────────────────────
    if (edhrecLands.has(land.name.toLowerCase())) {
      score += 20;
      reasons.push('EDHREC recommended');
    }

    // ── Tournament presence bonus ────────────────────────────────
    const metaRate = metaLands.get(land.name.toLowerCase());
    if (metaRate && metaRate > 0.05) {
      score += Math.round(15 * Math.min(metaRate / 0.3, 1));
      reasons.push(`meta ${Math.round(metaRate * 100)}%`);
    }

    // ── MDFC bonus — modal spell//land cards are versatile, but they are
    // tapped-land equivalents at best. Small bonus only, and only for true
    // modal DFCs (transforms are excluded above).
    if (isModalDfc && !frontIsLand) {
      score += 10;
      reasons.push('MDFC (spell+land)');
    }

    // ── EDHREC rank as tiebreaker ────────────────────────────────
    if (land.edhrec_rank && land.edhrec_rank < 5000) {
      score += Math.round(10 * (1 - land.edhrec_rank / 5000));
    }

    // ── Quality bar: worth a slot over a basic? ───────────────────
    // Mono-colour: the "beats a basic" gate above already IS the bar.
    // Multicolour: untapped real fixing at full credit (2+ deck colours at
    // any tier, or one colour at tier 1-2 — shock, Verge, channel, artifact
    // land), an untapped fetch for any deck colour (thinning), a tapped land
    // producing 3+ deck colours in a 3+ colour deck (triomes), or a payoff
    // this deck uses (tribal, manland, Nykthos, Ancient Tomb, Urza's Saga,
    // an MDFC spell face). Colourless utility with none of those (Three
    // Tree City without a tribe, Reliquary Tower) and costed / conditional
    // rainbows (Conduit Pylons, Opal Palace) do not — a basic is better.
    const fixes = matchingColors.length;
    const sourceCredit = restricted ? 0 : colorBonusScale;
    const payoff = tribalMatch || genericTribalLand || exemptColorless;
    // A one-colour land that charges life for that colour (Hashep Oasis) is
    // a worse basic in any deck; the mono gate above already drops it there.
    const paysLifeForColor = fixes === 1 && new RegExp(`pay \\d+ life:\\s*add \\{${matchingColors[0]}\\}`, 'i').test(tapText);
    const clearsBar = colors.length <= 1
      || (entersUntapped && sourceCredit >= 1 && (fixes >= 2 || (fixes >= 1 && tier <= 2 && !paysLifeForColor)))
      || (isFetch && entersUntapped && fixes >= 1)
      || (fixes >= 3 && colors.length >= 3 && sourceCredit >= 1)
      || payoff;

    scored.push({ card: land, score, tier, category, producesColors, entersUntapped, untappedCredit, sourceCredit, clearsBar, reasons });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ── Optimal Land Base Builder ────────────────────────────────────────────────

const BASIC_LAND_MAP: Record<string, string> = {
  W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
};

/** A nonbasic below this score isn't worth a slot over a basic. */
const SELECT_MIN_SCORE = 20;

interface BuildOptions {
  colors: string[];
  format: string;
  strategy?: string;
  targetLandCount: number;
  tribalTypes?: string[];
  commanderName?: string;
  existingNonLandCards?: Array<{ mana_cost: string | null; quantity: number }>;
  userId?: number;
  /** Restrict ownership to one collection source (e.g. 'arena', 'paper'). Undefined = every source. */
  collectionSource?: string;
  collectionOnly?: boolean;
  rarityFilter?: 'pauper' | 'peasant';
  isCommander?: boolean;
  /** USD price ceiling per land; ignored when collectionOnly (owned = free) */
  maxCardPrice?: number;
  /**
   * A--stripped card names already spoken for elsewhere in the deck (e.g. an
   * MDFC taken as a spell). Skipped during selection so the slot goes to the
   * next-best land instead of being silently lost to Step 7 basics.
   */
  excludeNames?: Set<string>;
}

/**
 * Build an optimal land base for a deck.
 * Returns selected non-basic lands and basic land distribution
 * based on color demands.
 */
export function buildOptimalLandBase(options: BuildOptions): LandBaseResult {
  const {
    colors, format, strategy, targetLandCount, tribalTypes,
    commanderName, existingNonLandCards, userId, collectionOnly, isCommander,
  } = options;

  // Analyze mana demands if we have the non-land cards
  const manaDemand = existingNonLandCards
    ? analyzeManaDemands(existingNonLandCards)
    : undefined;

  // Score all available lands
  const scored = scoreLandsForDeck({
    colors, format, strategy, tribalTypes, commanderName, userId, manaDemand, collectionOnly,
    collectionSource: options.collectionSource,
    rarityFilter: options.rarityFilter, maxCardPrice: options.maxCardPrice,
  });

  // Candidates: lands that clear the quality bar (scoreLandsForDeck) and the
  // minimum score. The nonbasic count is the smaller of the colour-count
  // ceiling and how many candidates exist — never a quota that junk fills
  // (a flat 30 in 4-5 colours used to guarantee Temple of the Dragon Queen,
  // Starting Town and the tapped Landscapes a slot).
  const candidates = scored.filter((s) => s.clearsBar && s.score >= SELECT_MIN_SCORE);
  const basicColors = colors.filter((c) => BASIC_LAND_MAP[c]);

  // Colour-deficit selection: Karsten-style land-source targets from the
  // deck's most demanding card per colour. A colour's need is its relative
  // shortfall, weighted half by its pip share so that when both targets
  // cannot fit (Tatyova: G 39 pips / U 22, Karsten 24 + 26 > 38 lands) the
  // colour most of the deck is cast with gives up the least. Every slot goes
  // to the candidate maximising score + a bonus for the need it closes — a
  // G/R shock covering two half-short colours beats a B artifact land for
  // the single shortest colour — where a basic of the neediest colour is a
  // candidate too (BASIC_SCORE: below any untapped land with an upside,
  // above a colourless manland while a colour is still short). So the
  // nonbasic count is whatever beats a basic, not a flat quota junk fills,
  // and the second-heaviest colour gets its sources (Tam's B sat at 19).
  const targets: Record<string, number> = manaDemand && manaDemand.totalPips > 0
    ? colorSourceTargets(manaDemand, format)
    : Object.fromEntries(colors.map((c) => [c, targetLandCount]));
  const sources: Record<string, number> = Object.fromEntries(colors.map((c) => [c, 0]));
  const intensity = (c: string) => manaDemand?.colorIntensity[c] ?? 1 / colors.length;
  const need = (c: string) => Math.max(0, (targets[c] ?? 0) - (sources[c] ?? 0)) / Math.max(1, targets[c] ?? 1)
    * (0.5 + 0.5 * intensity(c) * colors.length);
  const neediestBasic = () => [...basicColors].sort((a, b) => need(b) - need(a) || intensity(b) - intensity(a))[0];

  // MDFC spell//land cards are capped — EDHREC consensus decks run 2-4 of
  // them, not 15+, because they are functionally tapped lands stapled to
  // mediocre spells.
  const MAX_MDFC_LANDS = 4;
  const selectedLands: Array<{ card: DbCard; quantity: number }> = [];
  const selectedNames = new Set<string>();
  const basicDistribution: Record<string, number> = {};
  let nonBasicCount = 0;
  let basicCount = 0;
  let mdfcCount = 0;
  const isMdfcSpell = (s: LandScore) => !(s.card.type_line || '').split('//')[0].includes('Land');
  const eligible = (s: LandScore): boolean => {
    // A--stripped: an Arena-rebalanced "A-X" and its paper name "X" are one card.
    const landKey = stripArenaPrefix(s.card.name);
    if (selectedNames.has(landKey)) return false;
    if (options.excludeNames?.has(landKey)) return false; // already picked elsewhere (e.g. MDFC spell)
    if (isMdfcSpell(s) && mdfcCount >= MAX_MDFC_LANDS) return false;
    return true;
  };
  const giveBasic = (c: string) => {
    basicDistribution[BASIC_LAND_MAP[c]] = (basicDistribution[BASIC_LAND_MAP[c]] || 0) + 1;
    sources[c] += 1;
    basicCount += 1;
  };

  // A fully-short colour is worth one untapped bonus and a half; scaled by
  // untapped and source credit, so a tapped triome, a conditional rainbow
  // or a tier-3 pain rainbow (Tarnished Citadel) never jumps an untapped
  // tier-1 dual on breadth alone.
  const DEFICIT_WEIGHT = 60;
  const BASIC_SCORE = 100;
  const gainOf = (s: LandScore): number => {
    let covered = 0;
    for (const c of s.producesColors) if (c in sources) covered += need(c);
    return Math.min(3, covered) * s.untappedCredit * s.sourceCredit;
  };

  // One basic per colour first (fetch targets, check-land types).
  if (targetLandCount >= basicColors.length) for (const c of basicColors) giveBasic(c);

  const remaining = [...candidates]; // score-descending
  while (nonBasicCount + basicCount < targetLandCount) {
    let idx = -1;
    let bestKey = -Infinity;
    remaining.forEach((s, i) => {
      if (!eligible(s)) return;
      const key = s.score + DEFICIT_WEIGHT * gainOf(s);
      if (key > bestKey) { bestKey = key; idx = i; }
    });
    const basicColor = neediestBasic();
    const basicKey = basicColor ? BASIC_SCORE + DEFICIT_WEIGHT * need(basicColor) : -Infinity;
    if (idx === -1 && !basicColor) break;
    if (idx === -1 || basicKey >= bestKey) { giveBasic(basicColor); continue; }
    const [pick] = remaining.splice(idx, 1);
    const qty = isCommander ? 1 : Math.min(4, targetLandCount - nonBasicCount - basicCount);
    selectedLands.push({ card: pick.card, quantity: qty });
    selectedNames.add(stripArenaPrefix(pick.card.name));
    if (isMdfcSpell(pick)) mdfcCount++;
    nonBasicCount += qty;
    for (const c of pick.producesColors) if (c in sources) sources[c] += pick.sourceCredit * qty;
  }

  return {
    lands: selectedLands,
    basicDistribution,
    totalNonBasic: nonBasicCount,
  };
}
