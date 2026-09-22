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
import { isCommanderFamily, referenceLibrarySize, HARD_CAP_INVALID, HARD_CAP_STRUCTURE, type ScoreFormat } from './deck-score-norms';
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

export interface StructureResult {
  structureScore: number;
  gates: ScoreGate[];
  hardCaps: number[];
  /** §10.5: unresolved copies are KEPT as reserved library slots instead of
   * being silently dropped. MAIN-board only — the slots that belong to the
   * library `N` (and stage 2's `D`); an unresolved commander is counted by
   * `unknownCommander`, exactly as a resolved commander is outside `N`. */
  reservedSlots: number;
  /** A commander-family list whose commander line(s) did not resolve: its
   * identity/plan supply is unknown, not illegal (§10.5). */
  unknownCommander: boolean;
}

/** Structure (G) + the hard-cap set. Weight is always 0 (§1 G) — this feeds
 * `gates`/hard-cap composition in deck-score.ts, never the weighted sum. */
export function computeStructure(input: StructureInput): StructureResult {
  const gates: ScoreGate[] = [];
  const hardCaps: number[] = [];
  const reservedSlots = input.unresolved
    .filter((u) => u.board === 'main')
    .reduce((s, u) => s + u.quantity, 0);
  const unresolvedCommanders = input.unresolved
    .filter((u) => u.board === 'commander')
    .reduce((s, u) => s + u.quantity, 0);
  const fail = (reason: string): StructureResult => {
    gates.push({ key: 'structure', kind: 'rules', status: 'fail', cap: HARD_CAP_INVALID, reason });
    return { structureScore: 0, gates, hardCaps: [HARD_CAP_INVALID], reservedSlots, unknownCommander: false };
  };

  if (!allSafePositiveIntegers(input)) {
    return fail('invalid (nonpositive/non-integer) card quantity in input.');
  }
  const totalMain = input.main.reduce((s, e) => s + e.quantity, 0);
  if (totalMain === 0 && input.commander.length === 0) {
    return fail('empty deck: no main or commander cards.');
  }
  const commanderFamily = isCommanderFamily(input.format);
  // §10.5: "Unknown commander identity needs resolution rather than a
  // fabricated legality verdict." An unresolved commander LINE fills the
  // command zone slot as evidence, so the count below is not a rule failure.
  const unknownCommander = commanderFamily && input.commander.length === 0 && unresolvedCommanders > 0;
  const commanderSlots = input.commander.length + (unknownCommander ? unresolvedCommanders : 0);
  const validCommanderCount = commanderFamily ? commanderSlots === 1 || commanderSlots === 2 : input.commander.length === 0;
  if (!validCommanderCount) {
    return fail(`missing/invalid commander configuration (${input.commander.length} commander card(s) for ${input.format}).`);
  }

  const resolved: Resolved[] = [
    ...input.main.map((e) => toResolved(e.card, e.quantity, 'main' as const)),
    ...input.sideboard.map((e) => toResolved(e.card, e.quantity, 'sideboard' as const)),
    ...(input.companion ? [toResolved(input.companion, 1, 'sideboard' as const)] : []),
    ...input.commander.map((c) => toResolved(c, 1, 'commander' as const)),
  ];

  // §10.5: "Do not silently drop those copies and then impose a fabricated
  // size failure." No downgrade is needed here: `deck-validation` reports an
  // UNDER-sized library as a warning and only an OVER-sized one as an error,
  // and dropping unreadable copies can only shrink the count — so missing
  // evidence can never manufacture a size cap. The reserved slots still enter
  // the library `N` the scorer divides by (deck-score.ts).
  const checks: GateCheck[] = [...formatChecks(resolved, input.format)];

  // §10.9 item 7 #8 (stage 3): the SCORER owns its size rule. `deck-validation`
  // calls an UNDERSIZED commander deck a warning because the deck editor shows
  // in-progress lists; a list submitted for scoring that is short of its
  // profile's library is a structural failure exactly like an oversized one.
  // Reserved unresolved slots count: they are real library cards whose name did
  // not resolve, never deleted copies.
  // v1.4 stage 3c (§10.4): the rule is NOT commander-family only. A 60-card
  // profile has a MINIMUM library too, and trimming a Standard list to 59 was
  // paying +1.60 S with no size failure (stage 3b, `delete-offplan-typed`).
  {
    const requiredMain = referenceLibrarySize(input.format) - (commanderFamily && commanderSlots === 2 ? 1 : 0);
    const submittedMain = totalMain + reservedSlots;
    if (submittedMain < requiredMain) {
      const size = checks.find((c) => c.id === 'size');
      if (size) {
        size.status = 'fail';
        size.detail = `${submittedMain} library card(s) submitted; ${input.format} requires ${requiredMain}`
          + `${size.detail ? `; ${size.detail}` : ''}`;
      }
    }
  }

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

  // §10.5 supersedes the §2/§8 unresolved cap of 39: an unresolved name alone
  // is MISSING EVIDENCE, not a rule failure, so it warns and caps nothing.
  // The copies stay as reserved slots (`reservedSlots`).
  if (hasUnresolved) {
    gates.push({
      key: 'unresolved',
      kind: 'evidence',
      status: 'warn',
      cap: null,
      reason: `${input.unresolved.length} card name(s) unresolved against the card database` +
        `; ${reservedSlots} library slot(s) reserved — provisional, not capped.`,
    });
  }
  if (unknownCommander) {
    gates.push({
      key: 'unknown_commander',
      kind: 'evidence',
      status: 'warn',
      cap: null,
      reason: `${unresolvedCommanders} commander line(s) unresolved: colour identity and command-zone supply are unknown, not illegal.`,
    });
  }

  const structureScore = hasFail ? 0 : hasUnresolved || unknownCommander ? 50 : 100;
  const passedCount = checks.filter((c) => c.status === 'pass').length;
  gates.unshift({
    key: 'structure',
    kind: 'rules',
    status: hasFail ? 'fail' : hasUnresolved || unknownCommander ? 'warn' : 'pass',
    cap: null,
    reason: `${passedCount}/${checks.length} rule checks verified; ${hasFail ? checks.find((c) => c.status === 'fail')?.id : hasUnresolved ? 'unresolved cards' : unknownCommander ? 'unresolved commander' : 'none'}; cap ${hardCaps.length ? Math.min(...hardCaps) : 'none'}.`,
  });

  return { structureScore, gates, hardCaps, reservedSlots, unknownCommander };
}
