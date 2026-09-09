/**
 * Power level algorithm by EDHPowerLevel.com (edhpowerlevel.com), reimplemented
 * with permission pending; not affiliated.
 *
 * Reverse-engineered from the site's minified front-end bundle
 * (`verify-2026-09-09/edhpowerlevel-bundle.js`, captured 2026-09-09). All
 * computation on the live site happens client-side from two per-card inputs:
 * lowest market price (USD) and EDHREC rank. This module reimplements that
 * math exactly (variable-for-variable against the bundle's minified names,
 * noted in comments) so it can run offline against our local card DB.
 *
 * Algorithm summary:
 * 1. Each card gets a `priceRating` and `popRating` (0-10ish) via a shared
 *    piecewise-linear curve mapper (`mapCurve`), fed by `factors.priceCurve`
 *    and `factors.popCurve`. `impact = (priceRating + popRating) * quantity`.
 * 2. A hand-tuned override table (`CARD_OVERRIDES`, ported verbatim) nudges
 *    price/cmc/impact/producer for ~90 cards the site's author found the
 *    generic formula under- or over-rates (fetch lands, commander payoffs,
 *    reserved-list adjustments, free spells with alt costs, etc).
 * 3. Lands (type line contains "Land", or layout is a modal DFC) have their
 *    impact scaled by `factors.land` and their cmc zeroed. Basic lands
 *    (including snow duals) get a flat `impact = 2 * quantity` regardless.
 * 4. `avgCost` = total cmc (of non-MDFC cards only, land cmc is 0) / nonland
 *    card count.
 * 5. `tippingPoint` = the lowest cmc bucket at which cumulative nonland
 *    impact first exceeds 65% of total nonland impact.
 * 6. `efficiency` blends avgCost and tippingPoint against `cmcFloor`/
 *    `cmcCeiling`, then rescales into `efficiencyLimits`.
 * 7. `score = totalImpact * efficiencyScaled`; `powerLevel = mapCurve(score,
 *    powerCurve)`, clamped/labelled "10+" by the UI above 10 (this module
 *    returns the raw number, uncapped, matching the site's underlying value).
 * 8. `bracket` (WotC Commander Bracket 1-5, "recommended" reading) =
 *    ceil(mapCurve(powerLevel, bracketCurve)), floored against a minimum
 *    bracket derived from rule-of-thumb violations (extra-turn chains, mass
 *    land denial, Game Changers). The site's minimum-bracket calc ALSO folds
 *    in 2-card combo detection sourced live from commanderspellbook.com's
 *    API — that data isn't in the bundle and isn't reproducible offline, so
 *    this module's `bracket` omits the combo signal. See `minBracketPartial`
 *    on the result for what was actually used.
 */

export interface PowerLevelCardInput {
  name: string;
  quantity: number;
  price: number | null;
  edhrecRank: number | null;
  cmc: number | null;
  typeLine: string;
  layout: string;
  manaCost?: string;
  oracleText?: string | null;
  gameChanger?: boolean;
  producedMana?: string[];
  colors?: string[];
  reserved?: boolean;
}

export interface PowerLevelFactors {
  land: number;
  reserved: number;
  favorPrice: number;
  powerCurve: number[];
  popCurve: number[];
  priceCurve: number[];
  bracketCurve: number[];
  cmcFloor: number;
  cmcCeiling: number;
  efficiencyLimits: [number, number];
}

export const DEFAULT_FACTORS: PowerLevelFactors = {
  land: 0.6,
  reserved: 0.2,
  favorPrice: 0.25,
  powerCurve: [0, 250, 320, 350, 380, 420, 470, 560, 760, 890, 1000],
  popCurve: [0, 8500, 13600, 17100, 19800, 21900, 23700, 25300, 26200, 26700, 27000],
  priceCurve: [0, 0.5, 1.5, 3.5, 6, 10, 15, 25, 40, 65, 100],
  bracketCurve: [0, 4.7, 6.7, 7.7, 9.25, 10],
  cmcFloor: 1.75,
  cmcCeiling: 6,
  efficiencyLimits: [0.65, 1.1],
};

/** Basic lands (incl. snow-covered) always score a flat impact, regardless
 *  of price/popularity — matches the bundle's hardcoded name list. */
const BASIC_LAND_NAMES = new Set([
  'Mountain', 'Forest', 'Island', 'Swamp', 'Plains', 'Wastes',
  'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Island',
  'Snow-Covered Swamp', 'Snow-Covered Plains', 'Snow-Covered Wastes',
]);

interface CardOverride {
  name: string;
  price?: number;
  cmc?: number;
  impact?: number;
  commanderImpact?: number;
  producer?: string[];
}

/** Ported verbatim from the bundle's `Ba` array (hand-tuned per-card nudges). */
export const CARD_OVERRIDES: CardOverride[] = [
  { name: 'Arid Mesa', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Bloodstained Mire', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Flooded Strand', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Marsh Flats', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Misty Rainforest', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Polluted Delta', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Scalding Tarn', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Verdant Catacombs', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Windswept Heath', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Wooded Foothills', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Terramorphic Expanse', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Evolving Wilds', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Ash Barrens', producer: ['W', 'R', 'G', 'U', 'B', 'C'] },
  { name: 'Prismatic Vista', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Fabled Passage', producer: ['W', 'R', 'G', 'U', 'B'] },
  { name: 'Krosan Verge', producer: ['W', 'R', 'G', 'U', 'B', 'C'] },
  { name: 'Myriad Landscape', producer: ['W', 'R', 'G', 'U', 'B', 'C'] },
  { name: 'Vivi Ornitier', commanderImpact: 3 },
  { name: 'Korvold, Fae-Cursed King', commanderImpact: 3 },
  { name: 'Chulane, Teller of Tales', commanderImpact: 3 },
  { name: "Yuriko, the Tiger's Shadow", commanderImpact: 3 },
  { name: "Shirei, Shizo's Caretaker", commanderImpact: 2.5 },
  { name: 'Orvar, the All-Form', commanderImpact: 3 },
  { name: 'Magda, Brazen Outlaw', commanderImpact: 3.5 },
  { name: "Tergrid, God of Fright // Tergrid's Lantern", commanderImpact: 2.5 },
  { name: 'Winota, Joiner of Forces', commanderImpact: 3 },
  { name: 'Sisay, Weatherlight Captain', commanderImpact: 4 },
  { name: 'Urza, Lord High Artificer', commanderImpact: 3 },
  { name: 'Kinnan, Bonder Prodigy', commanderImpact: 4 },
  { name: 'Yedora, Grave Gardener', commanderImpact: 2 },
  { name: "Kraum, Ludevic's Opus", commanderImpact: 2 },
  { name: 'Thrasios, Triton Hero', commanderImpact: 3.5 },
  { name: 'Tymna the Weaver', commanderImpact: 2 },
  { name: 'Vial Smasher the Fierce', commanderImpact: 2 },
  { name: 'Cataclysm', impact: 1.7 },
  { name: 'Jokulhaups', impact: 1.7 },
  { name: 'Boom // Bust', impact: 1.7 },
  { name: 'Armageddon', impact: 1.4 },
  { name: 'Mystic Remora', price: 2 },
  { name: 'Rest in Peace', price: 2.5 },
  { name: 'The One Ring', price: 0.8 },
  { name: 'Sylvan Library', price: 0.6 },
  { name: 'Ragavan, Nimble Pilferer', price: 0.4 },
  { name: 'Sol Ring', price: 8 },
  { name: 'Fierce Guardianship', cmc: 0 },
  { name: 'Deflecting Swat', cmc: 0 },
  { name: 'Deadly Rollick', cmc: 0 },
  { name: 'Flawless Maneuver', cmc: 0 },
  { name: 'Obscuring Haze', cmc: 0 },
  { name: 'Flare of Denial', cmc: 0 },
  { name: 'Flare of Fortitude', cmc: 0 },
  { name: 'Flare of Duplication', cmc: 0 },
  { name: 'Flare of Malice', cmc: 0 },
  { name: 'Flare of Cultivation', cmc: 0 },
  { name: 'Endurance', cmc: 0 },
  { name: 'Solitude', cmc: 0 },
  { name: 'Grief', cmc: 0 },
  { name: 'Subtlety', cmc: 0 },
  { name: 'Fury', cmc: 0 },
  { name: 'Force of Vigor', cmc: 0 },
  { name: 'Force of Negation', cmc: 0 },
  { name: 'Force of Despair', cmc: 0 },
  { name: 'Force of Virtue', cmc: 0 },
  { name: 'Force of Rage', cmc: 0 },
  { name: 'Force of Will', cmc: 0 },
  { name: 'Misdirection', cmc: 0 },
  { name: 'Submerge', cmc: 0 },
  { name: 'Snuff Out', cmc: 0 },
  { name: 'Daze', cmc: 0 },
  { name: 'Foil', cmc: 0 },
  { name: 'Gush', cmc: 0 },
  { name: 'Shriekmaw', cmc: 2 },
  { name: 'Blasphemous Act', cmc: 3 },
  { name: 'The Great Henge', cmc: 5 },
  { name: 'Vandalblast', cmc: 3 },
  { name: 'Cyclonic Rift', cmc: 5 },
  { name: 'Everflowing Chalice', cmc: 2 },
  { name: 'Dig Through Time', cmc: 4 },
  { name: 'Temporal Trespass', cmc: 7 },
  { name: 'Treasure Cruise', cmc: 3 },
  { name: 'Emrakul, the Promised End', cmc: 7 },
];

/** Mass-land-denial / whitelist / restricted-extra-turn lists, ported
 *  verbatim from the bundle's `cardLists`. Used for the (partial) minimum
 *  Commander Bracket estimate — see module header. */
export const MASS_LAND_DENIAL = [
  'Vorinclex, Voice of Hunger', 'Hall of Gemstone', 'Contamination', 'Cataclysm',
  'Dimensional Breach', 'Epicenter', 'Global Ruin', 'Hokori, Dust Drinker',
  "Razia's Purification", 'Rising Waters', 'Soulscour', 'Sunder', 'Apocalypse',
  'Bearer of the Heavens', 'Conversion', 'Glaciers', 'Pox', 'Death Cloud',
  'Tangle Wire', 'Restore Balance', 'Realm Razer', 'Spreading Algae',
  'Numot, the Devastator', 'Kudzu', 'Demonic Hordes', "Urza's Sylex",
  'Infernal Darkness', 'Trinisphere', 'Worldfire', 'Worldslayer',
  'Gilt-Leaf Archdruid', 'Worldpurge', 'Stasis',
];
export const MLD_WHITELIST = ['Charitable Levy'];
export const EXTRA_TURNS = [
  'Time Warp', 'Temporal Manipulation', 'Walk the Aeons', 'Capture of Jingzhou',
  'Expropriate', 'Time Stretch', 'Nexus of Fate', 'Timestream Navigator',
  'Sage of Hours', 'Lighthouse Chronologist', 'Time Sieve', 'Magosi, the Waterveil',
];

const EXTRA_TURN_REGEX = /(take an extra turn|target player takes an extra turn|target player takes \w* extra turns)/;
const DENIAL_REGEX = /(^(noncreature|creature|red|white|blue|black|green) spells|^spells your opponents cast) cost \{\d\} more to cast|each player sacrifices \w* (lands|land for each)|destroy all (lands|islands|mountains|forests|swamps|plains)|destroy all (\w*, )*and lands|untap (only|more than) \w* (land|permanent|nonbasic)|(islands|mountains|forests|swamps|plains|\w* lands) don't untap|nonbasic lands are (mountains|islands)/;

/**
 * Piecewise-linear curve mapper. `stops` is a list of thresholds; the
 * returned value is the (fractional) index into `stops` that `t` falls at,
 * scaled by `o`. Ported from the bundle's `de` function.
 */
export function mapCurve(t: number, stops: number[], o = 1): number {
  if (t <= stops[0]) return 0;
  if (t > stops[stops.length - 1]) return (stops.length - 1) * o;
  for (let p = 0; p < stops.length - 1; p++) {
    if (t < stops[p + 1] && t >= stops[p]) {
      return p * o + (t - stops[p]) / (stops[p + 1] - stops[p]);
    }
  }
  return 0;
}

export interface PerCardResult {
  name: string;
  quantity: number;
  impact: number;
  priceRating: number;
  popRating: number;
  isLand: boolean;
  cmc: number;
}

export interface PowerLevelResult {
  impactTotal: number;
  avgCost: number;
  tippingPoint: number;
  efficiency: number;
  score: number;
  powerLevel: number;
  bracket: number;
  /** Minimum bracket used to floor `bracket`, from the rule signals this
   *  module CAN check offline (extra-turn chains, mass land denial, Game
   *  Changers). Excludes the site's combo-based signal — see module header. */
  minBracketPartial: number;
  perCard: PerCardResult[];
}

function findOverride(name: string): CardOverride | undefined {
  return CARD_OVERRIDES.find((o) => o.name === name);
}

/** Score one card. Mirrors the bundle's `te` function. */
function scoreCard(
  card: PowerLevelCardInput,
  commanders: string[],
  factors: PowerLevelFactors,
): PerCardResult {
  const override = findOverride(card.name);
  let price = card.price ?? 0;
  let cmc = card.cmc ?? 0;

  if (override?.price !== undefined) price *= override.price;
  if (override?.cmc !== undefined) cmc = override.cmc;

  if (card.reserved) price *= factors.reserved;

  const edhrecRank = card.edhrecRank ?? 0;
  const priceRating = mapCurve(price, factors.priceCurve, 1 + factors.favorPrice);
  const popRating = mapCurve(
    factors.popCurve[factors.popCurve.length - 1] - edhrecRank,
    factors.popCurve,
    1 - factors.favorPrice,
  );

  let impact = (priceRating + popRating) * card.quantity;

  if (override?.impact !== undefined) impact *= override.impact;
  if (override?.commanderImpact !== undefined && commanders.includes(card.name)) {
    impact *= override.commanderImpact;
  }

  const frontFaceType = card.typeLine.split(' // ')[0].split(' — ')[0];
  const isLand = frontFaceType.includes('Land') || card.layout === 'modal_dfc';
  if (isLand) {
    impact *= factors.land;
    cmc = 0;
  }

  if (BASIC_LAND_NAMES.has(card.name)) {
    impact = 2 * card.quantity;
  }

  return { name: card.name, quantity: card.quantity, impact, priceRating, popRating, isLand, cmc };
}

function minBracketFor(matchesLen: number, maxes: number[], restrictedLen: number, restrictedUnderBracket: number): number {
  let result = 0;
  maxes.forEach((max, idx) => {
    if (matchesLen > max) result = idx + 1;
  });
  if (restrictedLen > 0 && result < restrictedUnderBracket) result = restrictedUnderBracket;
  return result;
}

/** Partial minimum-bracket estimate (extra turns, mass land denial, Game
 *  Changers only — no combo detection, see module header). */
function estimateMinBracket(cards: PowerLevelCardInput[]): number {
  const turnsMatches = new Set<string>();
  const turnsRestricted = new Set<string>();
  const denialMatches = new Set<string>();
  const denialRestricted = new Set<string>();
  const gameChangerMatches = new Set<string>();

  for (const card of cards) {
    const lines = (card.oracleText ?? '').split('\n').filter(Boolean);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (EXTRA_TURN_REGEX.test(lower)) turnsMatches.add(card.name);
      if (DENIAL_REGEX.test(lower) && !MLD_WHITELIST.includes(card.name)) denialMatches.add(card.name);
    }
    if (card.gameChanger) gameChangerMatches.add(card.name);
    if (EXTRA_TURNS.includes(card.name)) turnsRestricted.add(card.name);
    if (MASS_LAND_DENIAL.includes(card.name)) denialRestricted.add(card.name);
  }

  const turnsBracket = minBracketFor(turnsMatches.size, [0, 2, 3, 100, 100], turnsRestricted.size, 3);
  const denialBracket = minBracketFor(denialMatches.size, [0, 0, 0, 100, 100], denialRestricted.size, 3);
  const gameChangerBracket = minBracketFor(gameChangerMatches.size, [0, 0, 3, 100, 100], 0, 0);

  return Math.max(turnsBracket, denialBracket, gameChangerBracket);
}

/**
 * Compute a full EDHPowerLevel-style power-level report for a decklist.
 * Pure function — no DB or network access.
 */
export function computePowerLevel(
  cards: PowerLevelCardInput[],
  commanders: string[],
  factors: PowerLevelFactors = DEFAULT_FACTORS,
): PowerLevelResult {
  const perCard = cards.map((c) => scoreCard(c, commanders, factors));

  const impactTotal = perCard.reduce((sum, c) => sum + c.impact, 0);
  const nonlandCount = perCard.filter((c) => !c.isLand).reduce((sum, c) => sum + c.quantity, 0);

  // avgCost numerator: cmc*qty for every card whose layout isn't modal_dfc
  // (land cmc is already 0, so this reduces to non-MDFC nonland cards).
  let cmcNumerator = 0;
  cards.forEach((card, i) => {
    if (card.layout !== 'modal_dfc') cmcNumerator += perCard[i].cmc * card.quantity;
  });
  const avgCost = nonlandCount > 0 ? Number((cmcNumerator / nonlandCount).toFixed(2)) : 0;

  // Tipping point: nonland impact bucketed by cmc; find the first cmc where
  // cumulative nonland impact exceeds 65% of total nonland impact.
  const nonlandImpactByCmc: number[] = [];
  let nonlandImpactTotal = 0;
  perCard.forEach((c) => {
    if (c.isLand) return;
    nonlandImpactByCmc[c.cmc] = (nonlandImpactByCmc[c.cmc] ?? 0) + c.impact;
    nonlandImpactTotal += c.impact;
  });

  let tippingPoint = 0;
  let cumulative = 0;
  for (let z = 0; z < nonlandImpactByCmc.length; z++) {
    cumulative += nonlandImpactByCmc[z] ?? 0;
    if (cumulative > nonlandImpactTotal * 0.65) {
      tippingPoint = z;
      break;
    }
  }

  const midpoint = (avgCost + tippingPoint) / 2;
  const efficiency = (factors.cmcCeiling - midpoint) / (factors.cmcCeiling - factors.cmcFloor);
  const scaledEfficiency = factors.efficiencyLimits[0]
    + (factors.efficiencyLimits[1] - factors.efficiencyLimits[0]) * efficiency;
  const score = impactTotal * scaledEfficiency;
  const powerLevel = Number(mapCurve(score, factors.powerCurve).toFixed(2));

  const minBracketPartial = estimateMinBracket(cards);
  const powerBracket = powerLevel > 0 ? Math.ceil(mapCurve(powerLevel, factors.bracketCurve)) : 5;
  const bracket = Math.max(powerBracket, minBracketPartial + 1);

  return {
    impactTotal,
    avgCost,
    tippingPoint,
    efficiency,
    score,
    powerLevel,
    bracket,
    minBracketPartial,
    perCard,
  };
}
