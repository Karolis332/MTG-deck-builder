/**
 * Deck Score v1 — Legality/structure (G) and the §2 hard caps.
 *
 * Reuses deck-gate's individual CHECK FUNCTIONS (formatChecks, identityCheck)
 * against a synthetic `Resolved[]` built from the score input — never
 * `gateDeck`'s verdict, which also fails on ownership (not intrinsic deck
 * quality, per the brief and §2 "never copy a blanket GateVerdict.fail").
 *
 * // ponytail: companion-specific deckbuilding restrictions (§1 "Companion
 * // exceptions require explicit validation") are not implemented — a
 * // companion is folded into the sideboard board for legality/identity
 * // checks only. Upgrade path: a dedicated companion-restriction checker.
 */
import { formatChecks, identityCheck } from './deck-gate-checks';
import { frontName, parseIdentity, type Resolved, type DeckLine, type GateCheck } from './deck-gate-parse';
import { isCommanderFamily, HARD_CAP_INVALID, HARD_CAP_STRUCTURE, HARD_CAP_UNRESOLVED, type ScoreFormat } from './deck-score-norms';
import type { DbCard } from './types';

export interface ScoreGate {
  key: string;
  kind: 'rules' | 'quality' | 'evidence';
  status: 'pass' | 'warn' | 'fail';
  cap: number | null;
  reason: string;
}

interface StructureInput {
  format: ScoreFormat;
  main: readonly { card: DbCard; quantity: number }[];
  commander: readonly DbCard[];
  sideboard: readonly { card: DbCard; quantity: number }[];
  companion?: DbCard;
  unresolved: readonly { name: string; quantity: number; board: string }[];
}

function toResolved(card: DbCard, quantity: number, board: DeckLine['board']): Resolved {
  return { line: { quantity, name: card.name, board }, card, front: frontName(card.name) };
}

function allSafePositiveIntegers(input: StructureInput): boolean {
  const quantities = [
    ...input.main.map((e) => e.quantity),
    ...input.sideboard.map((e) => e.quantity),
    ...input.commander.map(() => 1),
    ...(input.companion ? [1] : []),
  ];
  return quantities.every((q) => Number.isSafeInteger(q) && q > 0);
}

/** Structure (G) + the hard-cap set. Weight is always 0 (§1 G) — this feeds
 * `gates`/hard-cap composition in deck-score.ts, never the weighted sum. */
export function computeStructure(input: StructureInput): { structureScore: number; gates: ScoreGate[]; hardCaps: number[] } {
  const gates: ScoreGate[] = [];
  const hardCaps: number[] = [];

  if (!allSafePositiveIntegers(input)) {
    gates.push({ key: 'structure', kind: 'rules', status: 'fail', cap: HARD_CAP_INVALID, reason: 'invalid (nonpositive/non-integer) card quantity in input.' });
    return { structureScore: 0, gates, hardCaps: [HARD_CAP_INVALID] };
  }
  const totalMain = input.main.reduce((s, e) => s + e.quantity, 0);
  if (totalMain === 0 && input.commander.length === 0) {
    gates.push({ key: 'structure', kind: 'rules', status: 'fail', cap: HARD_CAP_INVALID, reason: 'empty deck: no main or commander cards.' });
    return { structureScore: 0, gates, hardCaps: [HARD_CAP_INVALID] };
  }
  const commanderFamily = isCommanderFamily(input.format);
  const validCommanderCount = commanderFamily ? input.commander.length === 1 || input.commander.length === 2 : input.commander.length === 0;
  if (!validCommanderCount) {
    gates.push({ key: 'structure', kind: 'rules', status: 'fail', cap: HARD_CAP_INVALID, reason: `missing/invalid commander configuration (${input.commander.length} commander card(s) for ${input.format}).` });
    return { structureScore: 0, gates, hardCaps: [HARD_CAP_INVALID] };
  }

  const resolved: Resolved[] = [
    ...input.main.map((e) => toResolved(e.card, e.quantity, 'main' as const)),
    ...input.sideboard.map((e) => toResolved(e.card, e.quantity, 'sideboard' as const)),
    ...(input.companion ? [toResolved(input.companion, 1, 'sideboard' as const)] : []),
    ...input.commander.map((c) => toResolved(c, 1, 'commander' as const)),
  ];

  const checks: GateCheck[] = [...formatChecks(resolved, input.format)];

  let identityGate: GateCheck | null = null;
  if (commanderFamily && input.commander.length > 0) {
    const identities = input.commander.map((c) => parseIdentity(c.color_identity));
    const union = [...new Set(identities.flat())];
    const syntheticCommander: Resolved = toResolved({ ...input.commander[0], color_identity: JSON.stringify(union) }, 1, 'commander');
    identityGate = identityCheck(resolved, syntheticCommander, input.format);
    checks.push(identityGate);
  }

  const hasFail = checks.some((c) => c.status === 'fail');
  const hasUnresolved = input.unresolved.length > 0;

  for (const check of checks) {
    gates.push({
      key: check.id,
      kind: 'rules',
      status: check.status === 'skip' ? 'pass' : check.status,
      cap: check.status === 'fail' ? HARD_CAP_STRUCTURE : null,
      reason: check.detail,
    });
    if (check.status === 'fail') hardCaps.push(HARD_CAP_STRUCTURE);
  }

  if (hasUnresolved) {
    gates.push({
      key: 'unresolved',
      kind: 'evidence',
      status: 'warn',
      cap: HARD_CAP_UNRESOLVED,
      reason: `${input.unresolved.length} card name(s) unresolved against the card database.`,
    });
    hardCaps.push(HARD_CAP_UNRESOLVED);
  }

  const structureScore = hasFail ? 0 : hasUnresolved ? 50 : 100;
  const passedCount = checks.filter((c) => c.status === 'pass').length;
  gates.unshift({
    key: 'structure',
    kind: 'rules',
    status: hasFail ? 'fail' : hasUnresolved ? 'warn' : 'pass',
    cap: null,
    reason: `${passedCount}/${checks.length} rule checks verified; ${hasFail ? checks.find((c) => c.status === 'fail')?.id : hasUnresolved ? 'unresolved cards' : 'none'}; cap ${hardCaps.length ? Math.min(...hardCaps) : 'none'}.`,
  });

  return { structureScore, gates, hardCaps };
}
