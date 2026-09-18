/**
 * Deck gate — one canonical judgment on a decklist before it reaches a human.
 *
 * Built after the 2026-09-18 Brawl incident, where a chat-built "The Emperor of
 * Palamecia" list reached the operator with cards they did not own, `Front // Back`
 * names Arena's importer rejects, two thirds of the nonland cards unable to
 * trigger the commander, and hand-restored fetch lands. Every check exists
 * because one of those slipped through. See docs/DECK_GATE.md.
 *
 * The gate judges; it never builds.
 */
import { DEFAULT_DECK_SIZE } from './constants';
import {
  parseDecklist,
  resolveLines,
  isLand,
  parseIdentity,
  worst,
  type GateCheck,
  type GateOptions,
  type GateStatus,
} from './deck-gate-parse';
import {
  arenaNamesCheck,
  formatChecks,
  identityCheck,
  landsCheck,
  locksCheck,
  ownershipCheck,
  winconCheck,
} from './deck-gate-checks';
import { deriveCondition, planReport, type PlanReport, type PlanCard } from './deck-gate-plan';

export {
  parseDecklist,
  DEFAULT_LOCKS,
  type DeckLine,
  type GateCheck,
  type GateOptions,
  type GateStatus,
} from './deck-gate-parse';
export type { PlanReport } from './deck-gate-plan';
export { commanderClosers } from './deck-gate-checks';

export interface GateVerdict {
  verdict: GateStatus;
  format: string;
  commander: string | null;
  totals: {
    cards: number;
    lands: number;
    effectiveLands: number;
    nonland: number;
    avgMv: number;
  };
  curve: Record<number, number>;
  plan: PlanReport | null;
  unresolved: string[];
  checks: GateCheck[];
}

/** Cards that interact at all (satisfy the condition, or name a trigger noun). */
const PLAN_FAIL_RATIO = 0.4;
const PLAN_WARN_RATIO = 0.55;
/** Cards that can actually satisfy the commander's cost/type condition. */
const ENABLER_FAIL_RATIO = 0.35;
const ENABLER_WARN_RATIO = 0.5;

export function gateDeck(text: string, opts: GateOptions): GateVerdict {
  const lines = parseDecklist(text);
  const { resolved, unresolved } = resolveLines(lines, opts.format);
  const commander = resolved.find((r) => r.line.board === 'commander');
  const commanderOracle = commander?.card.oracle_text || '';

  const main = resolved.filter((r) => r.line.board !== 'sideboard');
  const nonlandRows = main.filter((r) => r.line.board !== 'commander' && !isLand(r.card.type_line));
  const nonland = nonlandRows.reduce((s, r) => s + r.line.quantity, 0);
  const avgMv = nonland
    ? nonlandRows.reduce((s, r) => s + (r.card.cmc ?? 0) * r.line.quantity, 0) / nonland
    : 0;
  const totalCards = main.reduce((s, r) => s + r.line.quantity, 0);

  const curve: Record<number, number> = {};
  for (const r of nonlandRows) {
    const k = Math.min(7, Math.round(r.card.cmc ?? 0));
    curve[k] = (curve[k] ?? 0) + r.line.quantity;
  }

  const checks: GateCheck[] = [...formatChecks(resolved, opts.format)];
  checks.push(identityCheck(resolved, commander, opts.format));
  checks.push(ownershipCheck(resolved, opts));
  checks.push(arenaNamesCheck(resolved));

  const landInfo = landsCheck(resolved, DEFAULT_DECK_SIZE[opts.format] ?? 60, avgMv);
  checks.push(landInfo.check);

  // Plan and curve both hang off the commander's trigger condition.
  let plan: PlanReport | null = null;
  if (commander) {
    const condition = deriveCondition(
      commanderOracle,
      commander.card.type_line || '',
      parseIdentity(commander.card.color_identity),
      commander.card.mana_cost
    );
    const planCards: PlanCard[] = main
      .filter((r) => r.line.board !== 'commander')
      .map((r) => ({
        name: r.front,
        cmc: r.card.cmc ?? 0,
        typeLine: r.card.type_line || '',
        oracleText: r.card.oracle_text || '',
        quantity: r.line.quantity,
      }));
    plan = planReport(planCards, condition);

    // Two numbers, because they differ: naming the commander's trigger is not
    // the same as being able to meet it, and that gap is the 2026-09-18 bug.
    const status: GateStatus =
      plan.ratio < PLAN_FAIL_RATIO || plan.enablerRatio < ENABLER_FAIL_RATIO
        ? 'fail'
        : plan.ratio < PLAN_WARN_RATIO || plan.enablerRatio < ENABLER_WARN_RATIO
          ? 'warn'
          : 'pass';
    const enablerNote =
      condition.threshold !== null || condition.requires
        ? `; only ${plan.enablers}/${plan.nonland} (${Math.round(plan.enablerRatio * 100)}%) can satisfy it`
        : '';
    checks.push({
      id: 'plan',
      status,
      detail: `${plan.interacting}/${plan.nonland} nonland cards interact (${Math.round(plan.ratio * 100)}%) — ${condition.description}${enablerNote}`,
      cards: plan.nonInteracting.map((c) => `${c.name} (MV ${c.cmc})`),
    });

    const threshold = condition.threshold;
    if (threshold !== null) {
      const below = nonlandRows
        .filter((r) => (r.card.cmc ?? 0) < threshold)
        .reduce((s, r) => s + r.line.quantity, 0);
      const share = nonland ? below / nonland : 0;
      checks.push({
        id: 'curve',
        status: share > 0.5 ? 'warn' : 'pass',
        detail: `avg MV ${avgMv.toFixed(2)}; ${below}/${nonland} nonland cards below the commander's ${threshold}-mana threshold (${Math.round(share * 100)}%)`,
      });
    } else {
      checks.push({
        id: 'curve',
        status: 'pass',
        detail: `avg MV ${avgMv.toFixed(2)}; commander sets no cost threshold`,
      });
    }
  } else {
    checks.push({ id: 'plan', status: 'pass', detail: 'no commander — plan not checked' });
    checks.push({ id: 'curve', status: 'pass', detail: `avg MV ${avgMv.toFixed(2)}` });
  }

  checks.push(winconCheck(resolved, commanderOracle));
  checks.push(locksCheck(resolved, opts));

  if (unresolved.length) {
    checks.push({
      id: 'resolution',
      status: 'fail',
      detail: `${unresolved.length} card name(s) not in the card DB`,
      cards: unresolved,
    });
  }

  return {
    verdict: worst(checks.map((c) => c.status)),
    format: opts.format,
    commander: commander ? commander.front : null,
    totals: {
      cards: totalCards,
      lands: landInfo.lands,
      effectiveLands: landInfo.effective,
      nonland,
      avgMv: Math.round(avgMv * 100) / 100,
    },
    curve,
    plan,
    unresolved,
    checks,
  };
}
