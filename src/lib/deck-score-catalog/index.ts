/**
 * Deck Score v1.2 — typed-effect catalogue loader. docs/DECK_SCORE_SPEC.md §8.
 *
 * Keyed by canonical card name. `CATALOG_VERSION` is a content hash over every
 * entry's name + reviewed oracle text, so a mechanical edit changes the id the
 * score result reports (§8 "version compiled catalogue, plan recipes and norms
 * together with score 1.2.0").
 *
 * Resolution order used by deck-score-features.ts is catalogue -> oracle-regex
 * fallback -> unknown. A catalogue hit only counts as COVERAGE when the live
 * printing's oracle text still hashes to the reviewed text; otherwise the card
 * falls through to the regex path, which cannot claim coverage on its own.
 */
import { fnv1a, oracleHash, type AnswerAxis, type CatalogEntry, type EffectFamily, type MechanicKnowledge, type RequiredSupply } from './schema';
import { CEDH_CORE } from './entries/cedh-core';
import { STANDARD_CORE } from './entries/standard-core';

export * from './schema';

const ENTRIES: readonly CatalogEntry[] = [...CEDH_CORE, ...STANDARD_CORE];

const BY_NAME = new Map<string, CatalogEntry>();
for (const entry of ENTRIES) {
  BY_NAME.set(entry.canonicalName.toLowerCase(), entry);
  for (const face of entry.faces ?? []) BY_NAME.set(face.toLowerCase(), entry);
  if (entry.arenaVariant) BY_NAME.set(entry.arenaVariant.toLowerCase(), entry);
}

/** Content hash of the compiled catalogue; part of the score version id. */
export const CATALOG_VERSION = fnv1a(
  [...ENTRIES]
    .map((e) => `${e.canonicalName}|${e.knowledge}|${oracleHash(e.oracleText)}|${e.effects.length}`)
    .sort()
    .join('\n'),
);

export const CATALOG_SIZE = ENTRIES.length;

export function catalogEntry(name: string): CatalogEntry | undefined {
  return BY_NAME.get(name.toLowerCase());
}

/** The flat mechanical facts the scorer reads off an entry. */
export interface CatalogFacts {
  entry: CatalogEntry;
  knowledge: MechanicKnowledge;
  /** Reviewed oracle text still matches the live printing. */
  textMatches: boolean;
  families: ReadonlySet<EffectFamily>;
  answerAxes: readonly AnswerAxis[];
  produces: ReadonlySet<string>;
  consumes: ReadonlySet<string>;
  /** Union of every mode's typed supply requirements. */
  requiredSupply: readonly RequiredSupply[];
  /** Cheapest mode's total mana (the effective cost c_i floor). */
  cheapestMana: number;
  /** Earliest turn any mode is live. */
  earliestTurn: number;
  /** Lowest availability prior across modes; 1 when no mode is conditional. */
  availability: number;
}

const factsCache = new Map<string, CatalogFacts>();

/**
 * Look a card up and flatten its modes. `liveOracleText` is the text on the
 * printing being scored; a mismatch sets `textMatches=false` and the caller
 * must NOT treat the card as covered.
 */
export function catalogFacts(name: string, liveOracleText: string | null | undefined): CatalogFacts | null {
  const entry = catalogEntry(name);
  if (!entry) return null;
  const key = `${entry.canonicalName}|${oracleHash(liveOracleText)}`;
  const cached = factsCache.get(key);
  if (cached) return cached;

  const families = new Set<EffectFamily>();
  const axes = new Set<AnswerAxis>();
  const produces = new Set<string>();
  const consumes = new Set<string>();
  const requiredSupply: RequiredSupply[] = [];
  let cheapestMana = Infinity;
  let earliestTurn = Infinity;
  let availability = 1;

  for (const effect of entry.effects) {
    families.add(effect.family);
    for (const axis of effect.answerAxes ?? []) axes.add(axis);
    for (const p of effect.produces ?? []) produces.add(p);
    for (const c of effect.consumes ?? []) consumes.add(c);
    for (const r of effect.requiredSupply ?? []) requiredSupply.push(r);
    cheapestMana = Math.min(cheapestMana, effect.cost.mana);
    earliestTurn = Math.min(earliestTurn, effect.timing.earliestTurn);
    availability = Math.min(availability, effect.availabilityPrior ?? 1);
  }

  const facts: CatalogFacts = {
    entry,
    knowledge: entry.knowledge,
    textMatches: oracleHash(liveOracleText) === oracleHash(entry.oracleText),
    families,
    answerAxes: [...axes],
    produces,
    consumes,
    requiredSupply,
    cheapestMana: Number.isFinite(cheapestMana) ? cheapestMana : 0,
    earliestTurn: Number.isFinite(earliestTurn) ? earliestTurn : 1,
    availability,
  };
  factsCache.set(key, facts);
  return facts;
}

/** Every canonical name in the catalogue, sorted — used by the coverage tool. */
export function catalogNames(): string[] {
  return ENTRIES.map((e) => e.canonicalName).sort();
}
