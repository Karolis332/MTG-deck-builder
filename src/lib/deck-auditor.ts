/**
 * Build-time deck health auditor.
 *
 * Runs on the engine's OWN output to catch the functionally-broken decks that
 * card-count validation misses: under-sourced colors (mana screw), thin card
 * draw, tapped-land gluts, fake/unplayable lands. Returns a structured report
 * (consumed by the UI) plus actionable deficiencies (consumed by the auto-repair
 * pass in autoBuildDeck) so these defects can never ship.
 */

import { realManaSources, countColorSources, countPipDemand } from './mana-sources';
import type { ManaSourceCard } from './mana-sources';
import { isDrawEngine } from './card-classifier';

export interface AuditCard {
  card: ManaSourceCard & { cmc?: number };
  quantity: number;
  board: string;
}

export type DeficiencyKind = 'color_sources' | 'card_draw' | 'draw_engines' | 'ramp' | 'too_few_lands';

export interface Deficiency {
  kind: DeficiencyKind;
  /** color code for color_sources deficiencies */
  color?: string;
  have: number;
  want: number;
  severity: 'warn' | 'fail';
  message: string;
}

export interface DeckHealth {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  realLands: number;
  tappedLands: number;
  tappedRatio: number;
  sourcesByColor: Record<string, number>;
  pipsByColor: Record<string, number>;
  drawCount: number;
  /** repeatable card-advantage engines (subset of drawCount) */
  drawEngineCount: number;
  rampCount: number;
  fakeLands: string[];
  warnings: string[];
  deficiencies: Deficiency[];
}

const DRAW_RE = /draw (?:a|two|three|four|x|that many|cards|\d) cards?|draws? (?:a|two|three|\d|x) cards?|whenever you draw/i;
const RAMP_LAND_FETCH = /search your library for (?:a|up to (?:one|two|three))[^.]*\bland\b/i;
const RAMP_ADD = /\{t\}: add|add (?:\{[wubrgc]\}|one mana|two mana)/i;

function entersTapped(card: ManaSourceCard): boolean {
  const t = (card.oracle_text || '').toLowerCase();
  if (t.includes('enters the battlefield tapped') || t.includes('enters tapped')) {
    // Conditional untapped lands ("unless you control two or fewer other lands")
    // still effectively tap most mid/late games — count as tapped for safety.
    return true;
  }
  return false;
}

function frontIsLand(card: ManaSourceCard): boolean {
  return (card.type_line || '').split('//')[0].includes('Land');
}
function isListedLand(card: ManaSourceCard): boolean {
  return (card.type_line || '').includes('Land');
}

export interface AuditOptions {
  colors: string[];
  format: string;
  /** target land count for the format (lands + land-back MDFCs) */
  targetLands: number;
  isCommander: boolean;
  /** resolved archetype — tunes the draw-engine floor */
  strategy?: string;
}

export function auditDeck(cards: AuditCard[], opts: AuditOptions): DeckHealth {
  const main = cards.filter((c) => c.board === 'main');
  const lands = main.filter((c) => isListedLand(c.card));
  const realLandCards = main.filter((c) => frontIsLand(c.card));
  const nonLands = main.filter((c) => !isListedLand(c.card));

  const realLands = realLandCards.reduce((s, c) => s + c.quantity, 0);
  const landBackMdfc = lands.filter((c) => !frontIsLand(c.card)).reduce((s, c) => s + c.quantity, 0);
  const tappedLands = lands.filter((c) => entersTapped(c.card)).reduce((s, c) => s + c.quantity, 0);
  const totalLandSlots = realLands + landBackMdfc;
  const tappedRatio = totalLandSlots > 0 ? tappedLands / totalLandSlots : 0;

  // Mana sources include lands + mana rocks/dorks (reliable producers only)
  const sourceCards = main.filter((c) => realManaSources(c.card).reliable);
  const sourcesByColor = countColorSources(sourceCards);
  const pipsByColor = countPipDemand(nonLands);

  const drawCount = nonLands.filter((c) => DRAW_RE.test(c.card.oracle_text || '')).reduce((s, c) => s + c.quantity, 0);
  const drawEngineCount = nonLands.filter((c) => isDrawEngine(c.card.name, c.card.oracle_text || '', c.card.type_line || '')).reduce((s, c) => s + c.quantity, 0);
  const rampCount = nonLands.filter((c) => {
    const ot = c.card.oracle_text || '';
    return RAMP_LAND_FETCH.test(ot) || (RAMP_ADD.test(ot) && /artifact|creature/i.test(c.card.type_line || ''));
  }).reduce((s, c) => s + c.quantity, 0);

  const fakeLands = lands
    .filter((c) => !frontIsLand(c.card) && (c.card.type_line || '').split('//').length === 1)
    .map((c) => c.card.name);

  const deficiencies: Deficiency[] = [];
  const warnings: string[] = [];

  // ── Color sources vs demand ──────────────────────────────────────────────
  // Floor scales with how heavily a color is pipped. Conservative: only fires
  // on genuinely under-sourced colors so repair stays surgical.
  for (const color of opts.colors) {
    const pips = pipsByColor[color] || 0;
    if (pips < 4) continue; // splash — don't demand a full source count
    const want = Math.min(18, Math.max(7, Math.round(pips * 0.5) + 4));
    const have = sourcesByColor[color] || 0;
    if (have < want) {
      deficiencies.push({
        kind: 'color_sources',
        color,
        have,
        want,
        severity: have < want - 3 ? 'fail' : 'warn',
        message: `${color}: ${have} sources for ${pips} pips (want ~${want})`,
      });
    }
  }

  // ── Card draw ──────────────────────────────────────────────────────────
  const drawFloor = opts.isCommander ? 8 : 4;
  if (drawCount < drawFloor) {
    deficiencies.push({
      kind: 'card_draw',
      have: drawCount,
      want: drawFloor,
      severity: drawCount < drawFloor - 2 ? 'fail' : 'warn',
      message: `only ${drawCount} card-draw sources (want >= ${drawFloor})`,
    });
  }

  // ── Repeatable card-advantage engines ─────────────────────────────────────
  // The "goes stale after the commander" failure: enough one-shot draw to pass
  // the count floor, but no sticky engines to refill once you've spent your
  // hand. Grindy archetypes need several; aggro can run lean.
  const engineFloor = opts.isCommander
    ? (['aggro', 'voltron'].includes(opts.strategy ?? '') ? 3 : 5)
    : 2;
  if (drawEngineCount < engineFloor) {
    deficiencies.push({
      kind: 'draw_engines',
      have: drawEngineCount,
      want: engineFloor,
      severity: drawEngineCount < engineFloor - 2 ? 'fail' : 'warn',
      message: `only ${drawEngineCount} repeatable draw engines (want >= ${engineFloor}) — deck will run out of gas`,
    });
  }

  // ── Land count ───────────────────────────────────────────────────────────
  if (totalLandSlots < opts.targetLands - 3) {
    deficiencies.push({
      kind: 'too_few_lands',
      have: totalLandSlots,
      want: opts.targetLands,
      severity: 'fail',
      message: `${totalLandSlots} land slots (want ${opts.targetLands})`,
    });
  }

  // ── Warnings (surfaced, not auto-repaired) ─────────────────────────────────
  if (tappedRatio > 0.55) {
    warnings.push(`${Math.round(tappedRatio * 100)}% of lands enter tapped — slow starts likely`);
  }
  if (fakeLands.length) {
    warnings.push(`${fakeLands.length} unplayable "land" entries: ${fakeLands.slice(0, 4).join(', ')}`);
  }

  // ── Grade ──────────────────────────────────────────────────────────────
  const fails = deficiencies.filter((d) => d.severity === 'fail').length;
  const warnCount = deficiencies.filter((d) => d.severity === 'warn').length + warnings.length;
  let grade: DeckHealth['grade'];
  if (fails === 0 && warnCount === 0) grade = 'A';
  else if (fails === 0 && warnCount <= 1) grade = 'B';
  else if (fails <= 1) grade = 'C';
  else if (fails <= 2) grade = 'D';
  else grade = 'F';

  return {
    grade,
    realLands,
    tappedLands,
    tappedRatio: Math.round(tappedRatio * 100) / 100,
    sourcesByColor,
    pipsByColor,
    drawCount,
    drawEngineCount,
    rampCount,
    fakeLands,
    warnings,
    deficiencies,
  };
}
