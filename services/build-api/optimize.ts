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
} from '../../src/lib/deck-optimizer';
import { FORMATS, FORMAT_LABELS, DEFAULT_DECK_SIZE, MANA_COLOR_NAMES } from '../../src/lib/constants';
import { normalizeDeckText } from '../../src/lib/decklist-normalize';
import type { DbCard } from '../../src/lib/types';
import { analyzeResolved, type AnalysisCore } from './analysis-core';
import { makeCardResolver, resolveDeckLines, type DeckLineInput, type ResolvedLine, type CardResolver } from './resolve';

export const OPTIMIZE_FORMATS = FORMATS.filter((f) => f !== '1v1' && f !== 'vintage');
const MAX_TEXT_CHARS = 20_000;
const MAX_LINES = 600;
const MAX_OWNED = 10_000;
const MAX_ADDS = 12;
const MAX_CUTS = 8;
const META_MIN_ROWS = 20;
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

/** Accept either pre-split card lines or raw pasted text. */
function readLines(parsed: Record<string, unknown>): { lines: DeckLineInput[]; deckName?: string } {
  if (Array.isArray(parsed.cards) && parsed.cards.length) {
    const lines = (parsed.cards as DeckLineInput[]).slice(0, MAX_LINES).map((c) => ({
      name: String(c?.name || ''),
      quantity: Number(c?.quantity) || 1,
      board: typeof c?.board === 'string' ? c.board : 'main',
    }));
    return { lines, deckName: typeof parsed.deckName === 'string' ? parsed.deckName.slice(0, 120) : undefined };
  }
  const text = typeof parsed.text === 'string' ? parsed.text.slice(0, MAX_TEXT_CHARS) : '';
  if (!text.trim()) throw new OptimizeError(400, 'text or cards[] is required');
  const norm = normalizeDeckText(text);
  const result = parseArenaExportWithMeta(norm.text);
  // The parser's blank-line-means-sideboard rule is an Arena convention; without
  // an explicit Sideboard header every block is main deck (Moxfield/Archidekt/plain lists).
  const lines: DeckLineInput[] = [
    ...norm.commanderNames.map((name) => ({ name, quantity: 1, board: 'commander' })),
    ...result.cards.map((c) => ({
      name: c.name,
      quantity: c.quantity,
      board: c.board === 'sideboard' && !norm.hasSideboardHeader ? 'main' : c.board,
    })),
  ].slice(0, MAX_LINES);
  return { lines, deckName: (norm.deckName ?? result.deckName)?.slice(0, 120) };
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

function landSources(lands: ResolvedLine[], deckColors: string[]): Record<string, number> {
  const sources: Record<string, number> = {};
  for (const c of deckColors) sources[c] = 0;
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

interface DeckShape {
  format: string;
  deckSize: number;
  commanderFormat: boolean;
  commanderRow: DbCard | null;
  main: ResolvedLine[];
  sideboard: ResolvedLine[];
}

function splitBoards(
  resolved: ResolvedLine[],
  commanderName: string,
  format: string,
  findCard: CardResolver,
): DeckShape {
  const commanderFormat = isCommanderFormat(format);
  let commanderRow: DbCard | null = null;
  if (commanderFormat) {
    const fromBoard = resolved.find((r) => r.board === 'commander');
    const wanted = commanderName || fromBoard?.card.name || '';
    if (!wanted) throw new OptimizeError(422, 'commanderName is required for commander formats');
    commanderRow = fromBoard && fromBoard.card.name.toLowerCase() === wanted.toLowerCase()
      ? fromBoard.card
      : findCard(wanted) ?? null;
    if (!commanderRow) throw new OptimizeError(422, `commander not found: ${wanted}`);
  }
  const cmdLower = commanderRow?.name.toLowerCase();
  const main = resolved.filter((r) => r.board === 'main' && r.card.name.toLowerCase() !== cmdLower);
  const sideboard = resolved.filter((r) => r.board === 'sideboard');
  return {
    format,
    deckSize: DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default || 60,
    commanderFormat,
    commanderRow,
    main,
    sideboard,
  };
}

function classifyMain(shape: DeckShape): { cards: OptimizerCard[]; byCategory: Record<CardCategory, ClassifiedCard[]> } {
  const commanderOracle = shape.commanderRow?.oracle_text || undefined;
  const byCategory = {} as Record<CardCategory, ClassifiedCard[]>;
  const cards: OptimizerCard[] = shape.main.map(({ card, quantity, board }) => {
    const categories = classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc ?? 0, commanderOracle);
    const primary = getPrimaryCategory(categories);
    const classified: ClassifiedCard = {
      name: card.name, cardId: card.id, categories, primaryCategory: primary,
      cmc: card.cmc ?? 0, typeLine: card.type_line || '', oracleText: card.oracle_text || '',
    };
    // ratio quotas are copy counts (a 4-of is four slots), so one entry per copy
    for (let i = 0; i < quantity; i++) {
      (byCategory[primary] ||= []).push(classified);
    }
    return {
      name: card.name, quantity, board, cmc: card.cmc ?? 0, typeLine: card.type_line || '',
      colorIdentity: parseColors(card.color_identity), legalities: card.legalities,
      oracleText: card.oracle_text, categories, primary,
    };
  });
  return { cards, byCategory };
}

function collectAdds(
  shape: DeckShape,
  core: AnalysisCore | null,
  deckColors: string[],
  owned: Set<string> | null,
  metaRanks: Map<string, number>,
  findCard: CardResolver,
): AddOut[] {
  const inDeck = new Set(shape.main.map((r) => r.card.name.toLowerCase()));
  if (shape.commanderRow) inDeck.add(shape.commanderRow.name.toLowerCase());
  const addQty = shape.commanderFormat ? 1 : 2;
  const seen = new Set<string>();
  const out: AddOut[] = [];

  const accept = (card: DbCard, reason: string, score: number): void => {
    const key = card.name.toLowerCase();
    if (seen.has(key) || inDeck.has(key)) return;
    if (!isLegalInFormat(card.legalities, shape.format)) return;
    if (!isWithinColorIdentity(parseColors(card.color_identity), deckColors)) return;
    seen.add(key);
    const category = getPrimaryCategory(classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc ?? 0, shape.commanderRow?.oracle_text || undefined));
    out.push({ ...toCardOut(card, addQty, category), reason, score, owned: owned ? owned.has(key) : undefined });
  };

  const deckCards = shape.main.map((r) => ({ ...r.card, quantity: r.quantity, board: r.board }));
  for (const s of getRuleBasedSuggestions(deckCards, shape.format)) accept(s.card, s.reason, s.score);

  if (core && shape.commanderRow) {
    for (const row of getCommanderCardStats(shape.commanderRow.name, 120)) {
      if (inDeck.has(row.cardName.toLowerCase()) || row.inclusionRate < 0.1) continue;
      const card = findCard(row.cardName);
      if (!card) continue;
      const pct = Math.round(row.inclusionRate * 100);
      accept(card, `In ${pct}% of ${shape.commanderRow.name} decks`, 60 + row.inclusionRate * 40 + Math.max(0, row.synergyScore) * 10);
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

export function optimizeDeck(parsed: Record<string, unknown>): Record<string, unknown> {
  const started = Date.now();
  const format = typeof parsed.format === 'string' ? parsed.format : '';
  if (!(OPTIMIZE_FORMATS as readonly string[]).includes(format)) {
    throw new OptimizeError(400, `format must be one of: ${OPTIMIZE_FORMATS.join(', ')}`);
  }
  const commanderName = typeof parsed.commanderName === 'string' ? parsed.commanderName.trim().slice(0, 200) : '';
  const { lines, deckName } = readLines(parsed);
  if (lines.length < 5) throw new OptimizeError(400, 'at least 5 card lines are required');

  const findCard = makeCardResolver();
  const { resolved, unresolved } = resolveDeckLines(lines, findCard);
  if (resolved.length < 5) {
    throw new OptimizeError(422, `only ${resolved.length} cards recognized`, { unresolved: unresolved.slice(0, 20) });
  }
  const shape = splitBoards(resolved, commanderName, format, findCard);
  if (shape.main.length < 5) throw new OptimizeError(422, 'main deck has fewer than 5 recognized cards');

  const { cards, byCategory } = classifyMain(shape);
  const lands = shape.main.filter((r) => isLandType(r.card.type_line));
  const nonLand = shape.main.filter((r) => !isLandType(r.card.type_line));
  const totalCards = shape.main.reduce((s, r) => s + r.quantity, 0) + (shape.commanderRow ? 1 : 0);
  const landCount = lands.reduce((s, r) => s + r.quantity, 0);
  const nonLandCopies = nonLand.reduce((s, r) => s + r.quantity, 0);
  const avgCmc = nonLandCopies ? nonLand.reduce((s, r) => s + (r.card.cmc ?? 0) * r.quantity, 0) / nonLandCopies : 0;

  const core = shape.commanderRow ? analyzeResolved(shape.commanderRow, shape.main) : null;
  const deckColors = core
    ? core.colorIdentity
    : Array.from(new Set(nonLand.flatMap((r) => parseColors(r.card.color_identity))));

  const health = computeRatioHealth(byCategory, format);
  const curve = computeManaCurve(shape.main.flatMap((r) =>
    Array.from({ length: r.quantity }, () => ({ cmc: r.card.cmc ?? 0, typeLine: r.card.type_line || '' }))));
  const notes = generateSuggestions(health, avgCmc, format);

  const cheap = cards.filter((c) => c.board === 'main' && c.cmc <= 2 && (c.categories.includes('ramp') || c.categories.includes('draw')))
    .reduce((s, c) => s + c.quantity, 0);
  const mdfc = countMdfcLandBacks(shape.main.map((r) => ({ type_line: r.card.type_line, layout: r.card.layout, quantity: r.quantity })));
  const landSize = shape.deckSize >= 100 ? 99 : 60;
  const recommendedLands = karstenLands(landSize, avgCmc, cheap);
  const effectiveLands = effectiveLandCount(landCount, mdfc);

  const demand = analyzeManaDemands(nonLand.map((r) => ({ mana_cost: r.card.mana_cost, quantity: r.quantity })));
  const sources = landSources(lands, deckColors);
  const manaWarnings: string[] = [];
  for (const c of deckColors) {
    const pips = demand.colorDemand[c] || 0;
    if (pips === 0) continue;
    const needed = sourcesNeeded(demand.colorIntensity[c] || 0, shape.deckSize);
    if ((sources[c] || 0) < needed) {
      manaWarnings.push(`Only ${sources[c] || 0} ${MANA_COLOR_NAMES[c] || c} sources for ${pips} ${c} pips (wants ~${needed})`);
    }
  }

  // Map is insertion-ordered by composite meta score (db.ts) — iteration order == rank.
  const metaRanks = !shape.commanderFormat ? getMetaRankedCardNames(format, 500) : new Map<string, number>();
  const ctx: OptimizerContext = {
    format,
    commanderColors: core ? core.colorIdentity : undefined,
    cardISS: core?.cardISS,
    curvePerBucket: core?.payload.curveScore.perBucket,
    metaRanks: metaRanks.size >= META_MIN_ROWS
      ? new Map(Array.from(metaRanks.entries()).map(([n, r]) => [n.toLowerCase(), r]))
      : undefined,
    health,
    protectedNames: core ? [...core.winPlan.keyCards.enablers, ...core.winPlan.keyCards.payoffs] : undefined,
  };
  const legality = findLegalityIssues(cards, ctx);
  const cuts = rankCuts(cards, ctx, MAX_CUTS);
  const adds = collectAdds(shape, core, deckColors, readOwnedNames(parsed), metaRanks, findCard);
  const swaps = pairSwaps(cuts, adds);

  let bracket: BracketResult | null = null;
  if (shape.commanderRow) {
    const pool = [...shape.main.map((r) => r.card), shape.commanderRow];
    bracket = classifyBracket(
      pool.map((c) => ({ name: c.name, oracle_text: c.oracle_text, type_line: c.type_line, cmc: c.cmc, game_changer: c.game_changer ?? null })),
      { commanderNames: [shape.commanderRow.name] },
    );
  }

  const score = scoreDeck(computeOverallScore(health), legality, Math.round(effectiveLands - recommendedLands));
  const byName = new Map(cards.map((c) => [c.name, c]));

  return {
    format,
    deckName: deckName || null,
    commander: shape.commanderRow?.name || null,
    stats: { totalCards, landCount, avgCmc: Math.round(avgCmc * 100) / 100, colors: deckColors },
    score,
    health,
    curve,
    notes,
    mana: { demand: demand.colorDemand, sources, warnings: manaWarnings },
    landTarget: {
      current: landCount,
      effective: effectiveLands,
      recommended: recommendedLands,
      mdfcLandBacks: mdfc,
      cheapSpells: cheap,
      formula: karstenFormula(landSize),
    },
    legality,
    cuts,
    adds,
    swaps,
    analysis: core?.payload ?? null,
    bracket,
    main: shape.main.map((r) => toCardOut(r.card, r.quantity, byName.get(r.card.name)?.primary ?? 'utility')),
    sideboard: shape.sideboard.map((r) => ({ name: r.card.name, quantity: r.quantity })),
    unresolved: unresolved.slice(0, 30),
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
    const message = error instanceof Error ? error.message : 'optimize failed';
    console.error('[build-api] optimize error:', message);
    json(res, 500, { error: message });
  }
}
