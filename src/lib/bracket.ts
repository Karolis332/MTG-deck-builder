/**
 * WotC Commander Bracket classifier (Commander Brackets beta, Feb 2026 rules
 * text: https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-2026).
 * Pure functions only — no DB access.
 *
 * Bracket 1 (Exhibition) is never inferred here — it's a table agreement, not
 * a deck property.
 *
 * B2 (Core):    0 game changers, no mass land denial, no chained extra turns, no 2-card combos.
 * B3 (Upgraded): <=3 game changers, no MLD, no chained extra turns (single extra-turn card OK),
 *                no early 2-card combos (simplification: ANY curated combo pair present disqualifies B3).
 * B4 (Optimized): anything above the B3 line.
 * B5 (cEDH, heuristic): B4 AND >=2 distinct combo pairs AND >=4 fast-mana cards.
 */

import { COMBO_PAIRS } from './win-conditions';
import { classifyCard } from './card-classifier';

export interface BracketCard {
  name: string;
  oracle_text?: string | null;
  type_line?: string | null;
  cmc?: number | null;
  game_changer?: number | boolean | null;
}

export interface BracketResult {
  bracket: 1 | 2 | 3 | 4 | 5;
  gameChangers: string[];
  twoCardCombos: string[][];
  massLandDenial: string[];
  extraTurnCards: string[];
  chainedExtraTurns: boolean;
  tutors: number;
  fastMana: string[];
  reasons: string[];
}

// Source: WotC Commander Brackets rules doc, "Mass Land Denial" examples list.
export const MASS_LAND_DENIAL = new Set([
  'armageddon', 'ravages of war', 'jokulhaups', 'obliterate', 'decree of annihilation',
  'cataclysm', 'fall of the thran', 'sunder', 'winter orb', 'static orb', 'stasis',
  'blood moon', 'magus of the moon', 'back to basics', 'ruination', 'impending disaster',
  'wildfire', 'burning of xinye', 'destructive force', 'worldslayer', 'boil',
  'boiling seas', 'flashfires', 'tsunami', 'global ruin', 'catastrophe', 'devastation',
  'apocalypse',
]);

// Source: well-known extra-turn spells (Time Warp effects) commonly cited in
// bracket guidance. Not exhaustive.
export const EXTRA_TURN = new Set([
  'time warp', 'temporal manipulation', 'capture of jingzhou', 'time stretch',
  'temporal mastery', 'nexus of fate', 'expropriate', "alrund's epiphany",
  "karn's temporal sundering", 'part the waterveil', 'walk the aeons',
  'savor the moment', 'temporal trespass', 'beacon of tomorrows', 'plea for power',
  'temporal cascade', 'notorious throng', 'seedtime', 'timestream navigator',
]);

// Source: commonly-cited "fast mana" cards in bracket/cEDH guidance.
export const FAST_MANA = new Set([
  'mana crypt', 'mana vault', 'sol ring', 'chrome mox', 'mox diamond', 'mox opal',
  'mox amber', 'lotus petal', 'jeweled lotus', 'grim monolith', 'dark ritual',
  'cabal ritual', 'simian spirit guide', 'elvish spirit guide', 'ancient tomb',
  'gemstone caverns',
]);

const RECAST_HEURISTIC = /return\b[^.]*\b(?:library|hand)\b/i;

function lname(name: string): string {
  return (name || '').toLowerCase();
}

export function classifyBracket(cards: BracketCard[], opts?: { commanderNames?: string[] }): BracketResult {
  const excluded = new Set((opts?.commanderNames ?? []).map(lname));
  const pool = cards.filter((c) => !excluded.has(lname(c.name)));

  const reasons: string[] = [];
  const names = new Set(pool.map((c) => lname(c.name)));

  const gameChangers = pool.filter((c) => !!c.game_changer).map((c) => c.name);
  if (gameChangers.length > 0) reasons.push(`${gameChangers.length} game changer(s): ${gameChangers.join(', ')}`);

  const massLandDenial = pool.filter((c) => MASS_LAND_DENIAL.has(lname(c.name))).map((c) => c.name);
  if (massLandDenial.length > 0) reasons.push(`Mass land denial: ${massLandDenial.join(', ')}`);

  const extraTurnCards = pool.filter((c) => EXTRA_TURN.has(lname(c.name))).map((c) => c.name);
  const recastable = pool.filter((c) => EXTRA_TURN.has(lname(c.name)) && RECAST_HEURISTIC.test(c.oracle_text || ''));
  const chainedExtraTurns = extraTurnCards.length >= 2 || recastable.length > 0;
  if (chainedExtraTurns) {
    reasons.push(
      extraTurnCards.length >= 2
        ? `Chained extra turns: ${extraTurnCards.join(', ')}`
        : `Chained extra turns (recastable, heuristic): ${recastable.map((c) => c.name).join(', ')}`
    );
  } else if (extraTurnCards.length === 1) {
    reasons.push(`Single extra-turn card (allowed; only chaining is restricted): ${extraTurnCards[0]}`);
  }

  const twoCardCombos: string[][] = [];
  for (const [a, b] of COMBO_PAIRS) {
    if (names.has(lname(a)) && names.has(lname(b))) twoCardCombos.push([a, b]);
  }
  if (twoCardCombos.length > 0) {
    reasons.push(`2-card combo(s) present: ${twoCardCombos.map((p) => p.join(' + ')).join('; ')}`);
  }

  const fastMana = pool.filter((c) => FAST_MANA.has(lname(c.name))).map((c) => c.name);

  const tutors = pool.filter((c) =>
    classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc ?? 0).includes('tutor')
  ).length;

  const b2Clean =
    gameChangers.length === 0 && massLandDenial.length === 0 && !chainedExtraTurns &&
    twoCardCombos.length === 0;

  let bracket: BracketResult['bracket'];
  if (b2Clean) {
    bracket = 2;
  } else {
    const b3Eligible =
      gameChangers.length <= 3 && massLandDenial.length === 0 && !chainedExtraTurns && twoCardCombos.length === 0;
    bracket = b3Eligible ? 3 : 4;
  }

  if (bracket === 4 && twoCardCombos.length >= 2 && fastMana.length >= 4) {
    bracket = 5;
    reasons.push('Heuristic: >=2 combo pairs + >=4 fast-mana cards -> flagged cEDH (bracket 5)');
  }

  return { bracket, gameChangers, twoCardCombos, massLandDenial, extraTurnCards, chainedExtraTurns, tutors, fastMana, reasons };
}

// ── Build-time bracket targeting (additive) ─────────────────────────────────
// Used by deck-builder-ai.ts to exclude offending cards from the candidate
// pool BEFORE picking, and to name the category of an already-picked card
// for the post-build swap pass. Pure — no DB access.

export type BracketOffenseCategory = 'game_changer' | 'mass_land_denial' | 'extra_turn' | 'fast_mana';

/** Which category (if any) makes this card ineligible for a target bracket. */
export function bracketOffenseCategory(card: BracketCard): BracketOffenseCategory | null {
  if (card.game_changer) return 'game_changer';
  const n = lname(card.name);
  if (MASS_LAND_DENIAL.has(n)) return 'mass_land_denial';
  if (EXTRA_TURN.has(n)) return 'extra_turn';
  if (FAST_MANA.has(n)) return 'fast_mana';
  return null;
}

/**
 * Categories to strike from the candidate pool for a given bracket target.
 * 1-2: no game changers, MLD, extra turns, or fast mana.
 * 3: MLD only (game-changer count is capped post-build instead, since the
 *    top-3-by-score rule needs the whole built list, not the raw pool).
 * 4-5: no pool-level exclusions.
 */
export function bracketPoolExclusions(target: 1 | 2 | 3 | 4 | 5): Set<BracketOffenseCategory> {
  if (target <= 2) return new Set(['game_changer', 'mass_land_denial', 'extra_turn', 'fast_mana']);
  if (target === 3) return new Set(['mass_land_denial']);
  return new Set();
}
