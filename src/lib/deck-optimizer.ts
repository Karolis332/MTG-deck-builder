/**
 * Deck optimizer — the pure half of the build-api /optimize endpoint.
 * Given classified, resolved main-deck cards and precomputed signals (ratio
 * health, per-card ISS, curve deltas, meta ranks) it ranks CUTS with stated
 * reasons and pairs them with adds. No DB access, no engine imports beyond
 * types and constants — unit-tested with synthetic decks.
 *
 * ponytail: additive integer scores, not a tuned model. Upgrade only if a
 * calibration round shows the ranking disagrees with human cuts.
 */
import type { CardCategory, RatioHealth } from './card-classifier';
import { CATEGORY_LABELS } from './card-classifier';
import { COMMANDER_FORMATS, getLegalityKey } from './constants';

export interface OptimizerCard {
  name: string;
  quantity: number;
  board: string;
  cmc: number;
  typeLine: string;
  colorIdentity: string[];
  legalities: string | null;
  oracleText: string | null;
  categories: CardCategory[];
  primary: CardCategory;
}

export interface OptimizerContext {
  format: string;
  /** Commander colour identity — commander formats only. */
  commanderColors?: string[];
  /** Raw per-card ISS by name — commander formats only. */
  cardISS?: Map<string, number>;
  /** actual − target per CMC bucket ("0".."6","7+") — commander formats only. */
  curvePerBucket?: Record<string, number>;
  /** name (lower-case) → meta rank — 60-card formats with meta data only. */
  metaRanks?: Map<string, number>;
  health: RatioHealth[];
  /** Win-plan key cards that should survive soft cuts. */
  protectedNames?: string[];
}

export type LegalityProblem = 'not_legal' | 'off_color' | 'too_many_copies';

export interface LegalityIssue {
  name: string;
  problem: LegalityProblem;
  detail: string;
}

export interface CutSuggestion {
  name: string;
  quantity: number;
  category: CardCategory;
  cmc: number;
  score: number;
  hard: boolean;
  reasons: string[];
}

export interface AddLike {
  name: string;
  category: CardCategory;
}

export interface SwapSuggestion {
  cut: string;
  add: string | null;
  reason: string;
}

const ANY_NUMBER_RE = /a deck can have any number of cards named/i;
const HARD_CUT_SCORE = 10;
const MIN_SOFT_SCORE = 2;
const MAX_COPIES_60 = 4;
const ROLE_LESS_CATEGORIES = new Set<CardCategory>(['utility', 'synergy', 'win_condition', 'tutor']);

export function isCommanderFormat(format: string): boolean {
  return (COMMANDER_FORMATS as readonly string[]).includes(format);
}

function isBasicLand(card: Pick<OptimizerCard, 'typeLine'>): boolean {
  return /\bBasic\b/.test(card.typeLine) && /\bLand\b/.test(card.typeLine);
}

function isLand(card: Pick<OptimizerCard, 'typeLine'>): boolean {
  return /\bLand\b/.test(card.typeLine);
}

function legalityStatus(legalities: string | null, format: string): string | undefined {
  if (!legalities) return undefined;
  try {
    const parsed = JSON.parse(legalities) as Record<string, string>;
    return parsed[getLegalityKey(format)];
  } catch {
    return undefined;
  }
}

export function isLegalInFormat(legalities: string | null, format: string): boolean {
  const status = legalityStatus(legalities, format);
  return status === 'legal' || status === 'restricted';
}

export function isWithinColorIdentity(cardColors: string[], commanderColors: string[]): boolean {
  const allowed = new Set(commanderColors);
  return cardColors.every((c) => allowed.has(c));
}

export function findLegalityIssues(cards: OptimizerCard[], ctx: OptimizerContext): LegalityIssue[] {
  const issues: LegalityIssue[] = [];
  const singleton = isCommanderFormat(ctx.format);
  const maxCopies = singleton ? 1 : MAX_COPIES_60;
  for (const card of cards) {
    if (card.board !== 'main') continue;
    if (!isLegalInFormat(card.legalities, ctx.format)) {
      const status = legalityStatus(card.legalities, ctx.format) || 'not legal';
      issues.push({ name: card.name, problem: 'not_legal', detail: `${status.replace('_', ' ')} in ${ctx.format}` });
    }
    if (ctx.commanderColors && !isWithinColorIdentity(card.colorIdentity, ctx.commanderColors)) {
      issues.push({
        name: card.name,
        problem: 'off_color',
        detail: `outside the commander's colour identity (${ctx.commanderColors.join('') || 'colourless'})`,
      });
    }
    const unlimited = isBasicLand(card) || ANY_NUMBER_RE.test(card.oracleText || '');
    if (!unlimited && card.quantity > maxCopies) {
      issues.push({
        name: card.name,
        problem: 'too_many_copies',
        detail: `${card.quantity} copies; the limit is ${maxCopies}`,
      });
    }
  }
  return issues;
}

function bucketKey(cmc: number): string {
  return cmc >= 7 ? '7+' : String(Math.max(0, Math.floor(cmc)));
}

const MIN_VALUES_FOR_DECILE = 10;

/**
 * Value below which a card counts as bottom-decile. Needs at least ten
 * positive values, and callers compare with `<` so a uniform deck (every card
 * at the same ISS) never flags everything (review 2026-09-07).
 */
function issDecileFloor(values: number[], fraction: number): number | undefined {
  if (values.length < MIN_VALUES_FOR_DECILE) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

interface ScoredCut extends CutSuggestion {
  sortName: string;
}

function scoreCard(
  card: OptimizerCard,
  ctx: OptimizerContext,
  hardIssues: Map<string, LegalityIssue[]>,
  overQuota: Map<string, RatioHealth>,
  issFloor: number | undefined,
  protectedSet: Set<string>,
): ScoredCut {
  const reasons: string[] = [];
  let score = 0;
  const hard = hardIssues.has(card.name);
  if (hard) {
    score += HARD_CUT_SCORE;
    for (const issue of hardIssues.get(card.name) || []) reasons.push(issue.detail);
  }

  const quota = overQuota.get(card.primary);
  if (quota) {
    score += 3;
    reasons.push(`${quota.label} over quota (${quota.current}/${quota.target.max}) — weakest ${quota.label.toLowerCase()} slot`);
  }

  // Function cards (ramp, removal, draw, wipes, protection) earn their slot by
  // role, not by synergy edges — judge them on quota only.
  const iss = ROLE_LESS_CATEGORIES.has(card.primary) ? ctx.cardISS?.get(card.name) : undefined;
  if (iss !== undefined) {
    if (iss <= 0) {
      score += 3;
      reasons.push('No synergy edges with the commander or the rest of the deck');
    } else if (issFloor !== undefined && iss < issFloor) {
      score += 2;
      reasons.push(`Bottom-decile synergy (ISS ${iss.toFixed(1)})`);
    }
  }

  const delta = ctx.curvePerBucket?.[bucketKey(card.cmc)];
  if (delta !== undefined && delta >= 2) {
    score += 1;
    reasons.push(`Curve has ${delta} too many ${bucketKey(card.cmc)}-drops`);
  }

  if (ctx.metaRanks && ctx.metaRanks.size > 0 && !ctx.metaRanks.has(card.name.toLowerCase())) {
    score += 1;
    reasons.push(`Not among the top ${ctx.metaRanks.size} ${ctx.format} meta cards`);
  }

  if (card.primary === 'utility' && card.cmc >= 5) {
    score += 1;
    reasons.push('Expensive card with no identified role');
  }

  if (!hard && protectedSet.has(card.name.toLowerCase())) {
    score -= 3;
  }

  return {
    name: card.name,
    quantity: hard ? card.quantity : Math.min(card.quantity, 2),
    category: card.primary,
    cmc: card.cmc,
    score,
    hard,
    reasons,
    sortName: card.name.toLowerCase(),
  };
}

/** Ranked cut suggestions: hard legality cuts first, then the weakest slots. */
export function rankCuts(cards: OptimizerCard[], ctx: OptimizerContext, limit = 8): CutSuggestion[] {
  const hardIssues = new Map<string, LegalityIssue[]>();
  for (const issue of findLegalityIssues(cards, ctx)) {
    hardIssues.set(issue.name, [...(hardIssues.get(issue.name) || []), issue]);
  }
  const overQuota = new Map<string, RatioHealth>();
  for (const h of ctx.health) {
    if (h.status === 'high' && h.category !== 'land') overQuota.set(h.category, h);
  }
  const candidates = cards.filter((c) => c.board === 'main' && !isLand(c));
  const issValues = ctx.cardISS
    ? candidates.map((c) => ctx.cardISS!.get(c.name)).filter((v): v is number => v !== undefined && v > 0)
    : [];
  const issFloor = issDecileFloor(issValues, 0.1);
  const protectedSet = new Set((ctx.protectedNames || []).map((n) => n.toLowerCase()));

  const scored = candidates
    .map((c) => scoreCard(c, ctx, hardIssues, overQuota, issFloor, protectedSet))
    .filter((c) => c.hard || c.score >= MIN_SOFT_SCORE);

  const sorted = [...scored].sort((a, b) => {
    if (a.hard !== b.hard) return a.hard ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    if (b.cmc !== a.cmc) return b.cmc - a.cmc;
    return a.sortName.localeCompare(b.sortName);
  });
  return sorted.slice(0, limit).map(({ sortName: _drop, ...cut }) => cut);
}

/** Pair each cut with an unused add of the same category, else the next unused add. */
export function pairSwaps(cuts: CutSuggestion[], adds: AddLike[]): SwapSuggestion[] {
  const used = new Set<string>();
  const pick = (predicate: (a: AddLike) => boolean): AddLike | undefined =>
    adds.find((a) => !used.has(a.name) && predicate(a));
  return cuts.map((cut) => {
    const add = pick((a) => a.category === cut.category) ?? pick((a) => a.category !== 'land');
    if (add) used.add(add.name);
    return { cut: cut.name, add: add?.name ?? null, reason: cut.reasons[0] ?? CATEGORY_LABELS[cut.category] };
  });
}

/** Final 0–100 score: ratio health, minus legality problems and a land-count miss. */
export function scoreDeck(ratioScore: number, issues: LegalityIssue[], landDelta: number): number {
  const legalityPenalty = Math.min(30, issues.length * 10);
  const landPenalty = Math.abs(landDelta) >= 3 ? 5 : 0;
  return Math.max(0, Math.min(100, Math.round(ratioScore - legalityPenalty - landPenalty)));
}
