/**
 * POST /optimize — take ANY decklist (pasted text or card lines), diagnose it
 * and return ranked cuts + adds with reasons. Commander formats add the Deck
 * Doctor analysis (ISS, win plan, bracket); 60-card formats use ratio quotas,
 * Karsten land math and meta ranks. Fast: no build, a handful of SQL lookups.
 */
import http from 'http';
import { parseArenaExportWithMeta } from '../../src/lib/arena-parser';
import { getRuleBasedSuggestions } from '../../src/lib/ai-suggest';
import { getCommanderCardStats, getMetaRankedCardNames } from '../../src/lib/db';
import {
  classifyCard,
  getPrimaryCategory,
  computeRatioHealth,
  computeManaCurve,
  computeOverallScore,
  generateSuggestions,
  type CardCategory,
  type ClassifiedCard,
  type RatioHealth,
} from '../../src/lib/card-classifier';
import { analyzeManaDemands } from '../../src/lib/land-intelligence';
import { classifyBracket, type BracketResult } from '../../src/lib/bracket';
import { karstenLands, karstenFormula, countMdfcLandBacks, effectiveLandCount } from '../../src/lib/land-math';
import {
  findLegalityIssues,
  rankCuts,
  pairSwaps,
  scoreDeck,
  isCommanderFormat,
  isLegalInFormat,
  isWithinColorIdentity,
  type OptimizerCard,
  type OptimizerContext,
  type CutSuggestion,
  type SwapSuggestion,
} from '../../src/lib/deck-optimizer';
import { FORMATS, FORMAT_LABELS, DEFAULT_DECK_SIZE, MANA_COLOR_NAMES } from '../../src/lib/constants';
import { normalizeDeckText, normalizeBoard, mergeDeckLines, type DeckLine } from '../../src/lib/decklist-normalize';
import type { DbCard } from '../../src/lib/types';
import { analyzeResolved, type AnalysisCore } from './analysis-core';
import {
  commanderClosers,
  cutReason,
  deckText,
  gateDeck,
  lockedNames,
  readLocks,
  readOwnedCardNames,
  type DeckTextLine,
} from './gate-wiring';
import { satisfiesCondition, deriveCondition } from '../../src/lib/deck-gate-plan';
import {
  makeCardResolver,
  resolveDeckLines,
  clampQuantity,
  MAX_CARD_QUANTITY,
  type ResolvedLine,
  type CardResolver,
} from './resolve';

export const OPTIMIZE_FORMATS = FORMATS.filter((f) => f !== '1v1' && f !== 'vintage');
const MAX_TEXT_CHARS = 20_000;
const MAX_LINES = 600;
const MAX_OWNED = 10_000;
const MAX_ADDS = 12;
const MAX_CUTS = 8;
const MAX_COMMANDERS = 2;
const MIN_LINES = 5;
const META_MIN_ROWS = 20;
const COMMANDER_STATS_ROWS = 120;
const MIN_INCLUSION_FOR_ADD = 0.1;
const FETCH_LAND_RE = /search your library for [^.]*land/i;
// Lands whose produced_mana is empty in Scryfall data but that fix any colour
// (chosen-type lands, "any color" lands).
const ANY_COLOR_LAND_RE = /choose a basic land type|mana of any color|one mana of any type/i;

interface CardOut {
  name: string;
  quantity: number;
  category: CardCategory;
  type_line: string;
  cmc: number;
  mana_cost: string | null;
  image_uri_small: string | null;
}

interface AddOut extends CardOut {
  reason: string;
  score: number;
  owned?: boolean;
}

export class OptimizeError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

function json(res: http.ServerResponse, code: number, obj: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function parseColors(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as string[]).filter((c) => 'WUBRG'.includes(c));
  } catch {
    return [];
  }
}

function isLandType(typeLine: string | null | undefined): boolean {
  return /\bLand\b/.test(typeLine || '');
}

function toCardOut(card: DbCard, quantity: number, category: CardCategory): CardOut {
  return {
    name: card.name,
    quantity,
    category,
    type_line: card.type_line || '',
    cmc: card.cmc ?? 0,
    mana_cost: card.mana_cost,
    image_uri_small: card.image_uri_small,
  };
}

// ── Input ────────────────────────────────────────────────────────────────────

interface ReadLinesResult {
  lines: DeckLine[];
  deckName?: string;
  truncated: boolean;
}

function lineFromEntry(entry: unknown): DeckLine | null {
  if (typeof entry === 'string') return { name: entry, quantity: 1, board: 'main' };
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as { name?: unknown; quantity?: unknown; board?: unknown };
  const name = typeof e.name === 'string' ? e.name : '';
  return name ? { name, quantity: clampQuantity(e.quantity), board: normalizeBoard(e.board) } : null;
}

/** Accept either pre-split card lines or raw pasted text; duplicates merged. */
function readLines(parsed: Record<string, unknown>, format: string): ReadLinesResult {
  if (Array.isArray(parsed.cards) && parsed.cards.length) {
    const entries = parsed.cards as unknown[];
    const lines = entries.slice(0, MAX_LINES).map(lineFromEntry).filter((l): l is DeckLine => l !== null);
    return {
      lines: mergeDeckLines(lines, MAX_CARD_QUANTITY),
      deckName: typeof parsed.deckName === 'string' ? parsed.deckName.slice(0, 120) : undefined,
      truncated: entries.length > MAX_LINES,
    };
  }
  const rawText = typeof parsed.text === 'string' ? parsed.text : '';
  if (!rawText.trim()) throw new OptimizeError(400, 'text or cards[] is required');
  const text = rawText.slice(0, MAX_TEXT_CHARS);
  const norm = normalizeDeckText(text, { inferSideboard: !isCommanderFormat(format) });
  const result = parseArenaExportWithMeta(norm.text);
  // The parser's blank-line-means-sideboard rule is an Arena convention; without
  // an explicit Sideboard header every block is main deck (Moxfield/Archidekt/plain lists).
  const parsedLines: DeckLine[] = [
    ...norm.commanderNames.map((name) => ({ name, quantity: 1, board: 'commander' })),
    ...result.cards.map((c) => ({
      name: c.name,
      quantity: clampQuantity(c.quantity),
      board: c.board === 'sideboard' && !norm.hasSideboardHeader ? 'main' : c.board,
    })),
  ];
  return {
    lines: mergeDeckLines(parsedLines.slice(0, MAX_LINES), MAX_CARD_QUANTITY),
    deckName: (norm.deckName ?? result.deckName)?.slice(0, 120),
    truncated: rawText.length > MAX_TEXT_CHARS || parsedLines.length > MAX_LINES,
  };
}

function readOwnedNames(parsed: Record<string, unknown>): Set<string> | null {
  if (!Array.isArray(parsed.ownedCards)) return null;
  const owned = new Set<string>();
  for (const entry of (parsed.ownedCards as unknown[]).slice(0, MAX_OWNED)) {
    const name = typeof entry === 'string' ? entry : String((entry as { name?: unknown })?.name || '');
    if (name.trim()) owned.add(name.trim().toLowerCase());
  }
  return owned;
}

// ── Deck shape ───────────────────────────────────────────────────────────────

interface DeckShape {
  format: string;
  deckSize: number;
  commanderFormat: boolean;
  /** Commander(s): one, or a partner pair. Empty for 60-card formats. */
  commanders: DbCard[];
  main: ResolvedLine[];
  sideboard: ResolvedLine[];
}

/**
 * Commander(s) come from the list's Commander lines first; the explicit
 * `commanderName` is a fallback only, so a stale picker value can never
 * override a pasted Commander section (review 2026-09-07).
 */
function pickCommanders(resolved: ResolvedLine[], commanderName: string, findCard: CardResolver): DbCard[] {
  const fromBoard = resolved.filter((r) => r.board === 'commander').map((r) => r.card).slice(0, MAX_COMMANDERS);
  if (fromBoard.length) return fromBoard;
  if (!commanderName) throw new OptimizeError(422, 'commanderName is required for commander formats');
  const row = findCard(commanderName);
  if (!row) throw new OptimizeError(422, `commander not found: ${commanderName}`);
  return [row];
}

function splitBoards(resolved: ResolvedLine[], commanderName: string, format: string, findCard: CardResolver): DeckShape {
  const commanderFormat = isCommanderFormat(format);
  const commanders = commanderFormat ? pickCommanders(resolved, commanderName, findCard) : [];
  const commanderNames = new Set(commanders.map((c) => c.name.toLowerCase()));
  return {
    format,
    deckSize: DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default || 60,
    commanderFormat,
    commanders,
    main: resolved.filter((r) => r.board === 'main' && !commanderNames.has(r.card.name.toLowerCase())),
    sideboard: resolved.filter((r) => r.board === 'sideboard'),
  };
}

function commanderColors(shape: DeckShape): string[] {
  return Array.from(new Set(shape.commanders.flatMap((c) => parseColors(c.color_identity))));
}

function commanderOracle(shape: DeckShape): string | undefined {
  return shape.commanders.length ? shape.commanders.map((c) => c.oracle_text || '').join('\n') : undefined;
}

// ── Classification ───────────────────────────────────────────────────────────

interface Classified {
  cards: OptimizerCard[];
  byCategory: Record<CardCategory, ClassifiedCard[]>;
}

function classifyMain(shape: DeckShape): Classified {
  const oracle = commanderOracle(shape);
  const byCategory = {} as Record<CardCategory, ClassifiedCard[]>;
  const cards: OptimizerCard[] = shape.main.map(({ card, quantity, board }) => {
    const categories = classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc ?? 0, oracle);
    const primary = getPrimaryCategory(categories);
    const classified: ClassifiedCard = {
      name: card.name, cardId: card.id, categories, primaryCategory: primary,
      cmc: card.cmc ?? 0, typeLine: card.type_line || '', oracleText: card.oracle_text || '',
    };
    // ratio quotas are copy counts (a 4-of is four slots), so one entry per copy
    byCategory[primary] = [...(byCategory[primary] ?? []), ...Array.from({ length: quantity }, () => classified)];
    return {
      name: card.name, quantity, board, cmc: card.cmc ?? 0, typeLine: card.type_line || '',
      colorIdentity: parseColors(card.color_identity), legalities: card.legalities,
      oracleText: card.oracle_text, categories, primary,
    };
  });
  return { cards, byCategory };
}

// ── Lands and mana ───────────────────────────────────────────────────────────

interface LandReport {
  current: number;
  effective: number;
  recommended: number;
  mdfcLandBacks: number;
  cheapSpells: number;
  formula: string;
}

function landReport(shape: DeckShape, cards: OptimizerCard[], avgCmc: number): LandReport {
  const landCount = shape.main.filter((r) => isLandType(r.card.type_line)).reduce((s, r) => s + r.quantity, 0);
  const cheap = cards
    .filter((c) => c.cmc <= 2 && (c.categories.includes('ramp') || c.categories.includes('draw')))
    .reduce((s, c) => s + c.quantity, 0);
  const mdfc = countMdfcLandBacks(shape.main.map((r) => ({ type_line: r.card.type_line, layout: r.card.layout, quantity: r.quantity })));
  const landSize = shape.deckSize >= 100 ? 99 : 60;
  return {
    current: landCount,
    effective: effectiveLandCount(landCount, mdfc),
    recommended: karstenLands(landSize, avgCmc, cheap),
    mdfcLandBacks: mdfc,
    cheapSpells: cheap,
    formula: karstenFormula(landSize),
  };
}

function landSources(lands: ResolvedLine[], deckColors: string[]): Record<string, number> {
  const sources: Record<string, number> = Object.fromEntries(deckColors.map((c) => [c, 0]));
  for (const { card, quantity } of lands) {
    let produced = parseColors(card.produced_mana).filter((c) => deckColors.includes(c));
    const oracle = card.oracle_text || '';
    if (produced.length === 0 && (FETCH_LAND_RE.test(oracle) || ANY_COLOR_LAND_RE.test(oracle))) produced = deckColors;
    for (const c of produced) sources[c] = (sources[c] || 0) + quantity;
  }
  return sources;
}

// ponytail: three-band approximation of Karsten's two-colour source tables
// (main colour ≈ 14/24, secondary ≈ 12/24, splash ≈ 8/24). Upgrade path: the
// per-pip, per-turn table when the mana warnings get calibrated.
function sourcesNeeded(intensity: number, deckSize: number): number {
  const lands = deckSize >= 99 ? 37 : 24;
  const share = intensity >= 0.4 ? 0.58 : intensity >= 0.15 ? 0.5 : 0.33;
  return Math.round(lands * share);
}

interface ManaReport {
  demand: Record<string, number>;
  sources: Record<string, number>;
  warnings: string[];
}

function manaReport(shape: DeckShape, deckColors: string[]): ManaReport {
  const nonLand = shape.main.filter((r) => !isLandType(r.card.type_line));
  const lands = shape.main.filter((r) => isLandType(r.card.type_line));
  const demand = analyzeManaDemands(nonLand.map((r) => ({ mana_cost: r.card.mana_cost, quantity: r.quantity })));
  const sources = landSources(lands, deckColors);
  const warnings = deckColors.flatMap((c) => {
    const pips = demand.colorDemand[c] || 0;
    if (pips === 0) return [];
    const needed = sourcesNeeded(demand.colorIntensity[c] || 0, shape.deckSize);
    return (sources[c] || 0) < needed
      ? [`Only ${sources[c] || 0} ${MANA_COLOR_NAMES[c] || c} sources for ${pips} ${c} pips (wants ~${needed})`]
      : [];
  });
  return { demand: demand.colorDemand, sources, warnings };
}

// ── Adds ─────────────────────────────────────────────────────────────────────

interface AddContext {
  shape: DeckShape;
  deckColors: string[];
  owned: Set<string> | null;
  metaRanks: Map<string, number>;
  findCard: CardResolver;
}

function collectAdds(ctx: AddContext): AddOut[] {
  const { shape, deckColors, owned, metaRanks, findCard } = ctx;
  // Sideboard names count as "in deck" so a 60-card add never pushes a card past four copies.
  const inDeck = new Set([
    ...shape.main.map((r) => r.card.name.toLowerCase()),
    ...shape.sideboard.map((r) => r.card.name.toLowerCase()),
    ...shape.commanders.map((c) => c.name.toLowerCase()),
  ]);
  const addQty = shape.commanderFormat ? 1 : 2;
  const oracle = commanderOracle(shape);
  const seen = new Set<string>();
  const out: AddOut[] = [];

  const accept = (card: DbCard, reason: string, score: number): void => {
    const key = card.name.toLowerCase();
    if (seen.has(key) || inDeck.has(key)) return;
    if (!isLegalInFormat(card.legalities, shape.format)) return;
    if (!isWithinColorIdentity(parseColors(card.color_identity), deckColors)) return;
    seen.add(key);
    const category = getPrimaryCategory(classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc ?? 0, oracle));
    // Never ship a blank row: the web app renders `reason` verbatim.
    const why = reason.trim() || `Fills the deck's ${category} slot at ${card.cmc ?? 0} mana`;
    out.push({ ...toCardOut(card, addQty, category), reason: why, score, owned: owned ? owned.has(key) : undefined });
  };

  const deckCards = shape.main.map((r) => ({ ...r.card, quantity: r.quantity, board: r.board }));
  for (const s of getRuleBasedSuggestions(deckCards, shape.format)) accept(s.card, s.reason, s.score);

  for (const commander of shape.commanders) {
    for (const row of getCommanderCardStats(commander.name, COMMANDER_STATS_ROWS)) {
      if (inDeck.has(row.cardName.toLowerCase()) || row.inclusionRate < MIN_INCLUSION_FOR_ADD) continue;
      const card = findCard(row.cardName);
      if (!card) continue;
      const pct = Math.round(row.inclusionRate * 100);
      accept(card, `In ${pct}% of ${commander.name} decks`, 60 + row.inclusionRate * 40 + Math.max(0, row.synergyScore) * 10);
    }
  }

  if (!shape.commanderFormat && metaRanks.size >= META_MIN_ROWS) {
    const label = FORMAT_LABELS[shape.format] || shape.format;
    let rank = 0;
    for (const name of metaRanks.keys()) {
      rank++;
      if (out.length >= MAX_ADDS * 2) break;
      if (inDeck.has(name.toLowerCase())) continue;
      const card = findCard(name);
      if (card) accept(card, `#${rank} ${label} meta card by inclusion and placement`, 80 - rank * 0.2);
    }
  }

  return [...out]
    .sort((a, b) => Number(Boolean(b.owned)) - Number(Boolean(a.owned)) || b.score - a.score)
    .slice(0, MAX_ADDS);
}

// ── Orchestration ────────────────────────────────────────────────────────────

interface Diagnosis {
  shape: DeckShape;
  cards: OptimizerCard[];
  core: AnalysisCore | null;
  deckColors: string[];
  health: RatioHealth[];
  avgCmc: number;
  metaRanks: Map<string, number>;
}

function diagnose(shape: DeckShape): Diagnosis {
  const { cards, byCategory } = classifyMain(shape);
  const nonLand = shape.main.filter((r) => !isLandType(r.card.type_line));
  const nonLandCopies = nonLand.reduce((s, r) => s + r.quantity, 0);
  const avgCmc = nonLandCopies ? nonLand.reduce((s, r) => s + (r.card.cmc ?? 0) * r.quantity, 0) / nonLandCopies : 0;
  const core = shape.commanders.length ? analyzeResolved(shape.commanders[0], shape.main) : null;
  const deckColors = shape.commanders.length
    ? commanderColors(shape)
    : Array.from(new Set(nonLand.flatMap((r) => parseColors(r.card.color_identity))));
  // Map is insertion-ordered by composite meta score (db.ts) — iteration order == rank.
  const metaRanks = !shape.commanderFormat ? getMetaRankedCardNames(shape.format, 500) : new Map<string, number>();
  return { shape, cards, core, deckColors, health: computeRatioHealth(byCategory, shape.format), avgCmc, metaRanks };
}

function optimizerContext(d: Diagnosis): OptimizerContext {
  return {
    format: d.shape.format,
    commanderColors: d.shape.commanders.length ? d.deckColors : undefined,
    cardISS: d.core?.cardISS,
    curvePerBucket: d.core?.payload.curveScore.perBucket,
    metaRanks: d.metaRanks.size >= META_MIN_ROWS
      ? new Map(Array.from(d.metaRanks.entries()).map(([n, r]) => [n.toLowerCase(), r]))
      : undefined,
    health: d.health,
    protectedNames: d.core ? [...d.core.winPlan.keyCards.enablers, ...d.core.winPlan.keyCards.payoffs] : undefined,
  };
}

function bracketFor(shape: DeckShape): BracketResult | null {
  if (!shape.commanders.length) return null;
  const pool = [...shape.main.map((r) => r.card), ...shape.commanders];
  return classifyBracket(
    pool.map((c) => ({ name: c.name, oracle_text: c.oracle_text, type_line: c.type_line, cmc: c.cmc, game_changer: c.game_changer ?? null })),
    { commanderNames: shape.commanders.map((c) => c.name) },
  );
}

function readFormat(parsed: Record<string, unknown>): string {
  const format = typeof parsed.format === 'string' ? parsed.format : '';
  if (!(OPTIMIZE_FORMATS as readonly string[]).includes(format)) {
    throw new OptimizeError(400, 'unsupported format');
  }
  return format;
}

interface CutOut extends CutSuggestion {
  /** Always non-empty — the web app renders this row verbatim. */
  reason: string;
}

/**
 * Drop every cut the gate's `locks` check would fail on, fill in a reason for
 * the rest, and flag the ones that never satisfy the commander's condition.
 */
function finishCuts(
  cuts: CutSuggestion[],
  shape: DeckShape,
  locks: string[]
): { cuts: CutOut[]; lockedFromCuts: string[] } {
  const commanderOracle = shape.commanders[0]?.oracle_text || '';
  const pool = shape.main.map((r) => ({ name: r.card.name, oracle_text: r.card.oracle_text }));
  const locked = lockedNames(
    pool.map((c) => c.name),
    locks,
    commanderClosers(pool, commanderOracle)
  );
  const condition = commanderOracle
    ? deriveCondition(
        commanderOracle,
        shape.commanders[0]?.type_line || '',
        parseColors(shape.commanders[0]?.color_identity ?? null),
        shape.commanders[0]?.mana_cost
      )
    : null;
  const byName = new Map(shape.main.map((r) => [r.card.name, r.card]));

  const lockedFromCuts: string[] = [];
  const kept: CutOut[] = [];
  for (const cut of cuts) {
    if (locked.has(cut.name)) {
      lockedFromCuts.push(cut.name);
      continue;
    }
    const card = byName.get(cut.name);
    const offPlan = Boolean(
      condition &&
        card &&
        !isLandType(card.type_line) &&
        !satisfiesCondition(
          {
            name: cut.name,
            cmc: card.cmc ?? 0,
            typeLine: card.type_line || '',
            oracleText: card.oracle_text || '',
            quantity: cut.quantity,
          },
          condition
        )
    );
    kept.push({ ...cut, reason: cutReason(cut, offPlan) });
  }
  return { cuts: kept, lockedFromCuts };
}

/** The list as it would stand once the proposed swaps are applied. */
function afterLines(shape: DeckShape, swaps: SwapSuggestion[], cuts: CutOut[]): DeckTextLine[] {
  const qty = new Map<string, number>(shape.main.map((r) => [r.card.name, r.quantity]));
  const cutQty = new Map(cuts.map((c) => [c.name, c.quantity]));
  for (const swap of swaps) {
    const removed = cutQty.get(swap.cut) ?? 1;
    const left = (qty.get(swap.cut) ?? 0) - removed;
    if (left > 0) qty.set(swap.cut, left);
    else qty.delete(swap.cut);
    if (swap.add) qty.set(swap.add, (qty.get(swap.add) ?? 0) + removed);
  }
  return [
    ...shape.commanders.map((c) => ({ name: c.name, quantity: 1, board: 'commander' })),
    ...[...qty.entries()].map(([name, quantity]) => ({ name, quantity, board: 'main' })),
  ];
}

export function optimizeDeck(parsed: Record<string, unknown>): Record<string, unknown> {
  const started = Date.now();
  const format = readFormat(parsed);
  const commanderName = typeof parsed.commanderName === 'string' ? parsed.commanderName.trim().slice(0, 200) : '';
  const { lines, deckName, truncated } = readLines(parsed, format);
  if (lines.length < MIN_LINES) throw new OptimizeError(400, `at least ${MIN_LINES} card lines are required`);

  const findCard = makeCardResolver();
  const { resolved, unresolved } = resolveDeckLines(lines, findCard);
  if (resolved.length < MIN_LINES) {
    throw new OptimizeError(422, `only ${resolved.length} cards recognized`, { unresolved: unresolved.slice(0, 20) });
  }
  const shape = splitBoards(resolved, commanderName, format, findCard);
  if (shape.main.length < MIN_LINES) throw new OptimizeError(422, `main deck has fewer than ${MIN_LINES} recognized cards`);

  const d = diagnose(shape);
  const ctx = optimizerContext(d);
  const legality = findLegalityIssues(d.cards, ctx);
  const locks = readLocks(parsed);
  const { cuts, lockedFromCuts } = finishCuts(rankCuts(d.cards, ctx, MAX_CUTS), shape, locks);
  const adds = collectAdds({ shape, deckColors: d.deckColors, owned: readOwnedNames(parsed), metaRanks: d.metaRanks, findCard });
  const cutReasonByName = new Map(cuts.map((c) => [c.name, c.reason]));
  const swaps = pairSwaps(cuts, adds).map((sw) => ({ ...sw, reason: cutReasonByName.get(sw.cut) || sw.reason }));
  const lands = landReport(shape, d.cards, d.avgCmc);
  const mana = manaReport(shape, d.deckColors);
  const byName = new Map(d.cards.map((c) => [c.name, c]));

  return {
    format,
    deckName: deckName || null,
    commander: shape.commanders[0]?.name ?? null,
    partner: shape.commanders[1]?.name ?? null,
    stats: {
      totalCards: shape.main.reduce((s, r) => s + r.quantity, 0) + shape.commanders.length,
      landCount: lands.current,
      avgCmc: Math.round(d.avgCmc * 100) / 100,
      colors: d.deckColors,
    },
    score: scoreDeck(computeOverallScore(d.health), legality, Math.round(lands.effective - lands.recommended)),
    health: d.health,
    curve: computeManaCurve(shape.main.flatMap((r) =>
      Array.from({ length: r.quantity }, () => ({ cmc: r.card.cmc ?? 0, typeLine: r.card.type_line || '' })))),
    notes: generateSuggestions(d.health, d.avgCmc, format),
    mana,
    landTarget: lands,
    legality,
    cuts,
    adds,
    swaps,
    lockedFromCuts,
    gate: gateDeck(deckText(afterLines(shape, swaps, cuts)), {
      format,
      ownedCards: readOwnedCardNames(parsed),
      locks,
      before: [...shape.commanders.map((c) => c.name), ...shape.main.map((r) => r.card.name)],
      after: afterLines(shape, swaps, cuts).map((l) => l.name),
    }),
    analysis: d.core?.payload ?? null,
    bracket: bracketFor(shape),
    main: shape.main.map((r) => toCardOut(r.card, r.quantity, byName.get(r.card.name)?.primary ?? 'utility')),
    sideboard: shape.sideboard.map((r) => ({ name: r.card.name, quantity: r.quantity })),
    unresolved: unresolved.slice(0, 30),
    truncated,
    elapsedMs: Date.now() - started,
  };
}

export function handleOptimize(body: string, res: http.ServerResponse): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    return json(res, 400, { error: 'invalid JSON body' });
  }
  try {
    json(res, 200, optimizeDeck(parsed));
  } catch (error) {
    if (error instanceof OptimizeError) {
      return json(res, error.status, { error: error.message, ...(error.extra || {}) });
    }
    // Engine/DB exceptions carry SQL text and filesystem paths — log, never return them.
    console.error('[build-api] optimize error:', error instanceof Error ? error.stack || error.message : error);
    json(res, 500, { error: 'The optimizer hit an internal error. Try again shortly.' });
  }
}
