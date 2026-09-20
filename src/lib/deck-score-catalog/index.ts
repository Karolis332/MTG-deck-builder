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
import { entryHash, fnv1a, oracleHash, type AnswerAxis, type CatalogEntry, type EffectFamily, type MechanicKnowledge, type RequiredSupply, type TypedEffect } from './schema';
import { CEDH_CORE } from './entries/cedh-core';
import { STANDARD_CORE } from './entries/standard-core';
import { CEDH_STAPLES_B1 } from './entries/cedh-staples-b1';
import { CEDH_STAPLES_B2 } from './entries/cedh-staples-b2';
import { FIXTURES_B3 } from './entries/fixtures-b3';
import { STANDARD_B4 } from './entries/standard-b4';
// Generated shard: data only, so it is JSON rather than a 5 MB TypeScript
// literal tsc would have to type-check. `generated-partial.json` is NOT loaded
// here — a partial entry can never count as coverage, so only the coverage
// tool needs it (`scripts/deck-score-coverage.ts`).
import GENERATED_JSON from './entries/generated.json';

const GENERATED = GENERATED_JSON as unknown as readonly CatalogEntry[];

export * from './schema';

/** Curated entries are listed last so they overwrite the generated shard for
 * the same name (§1 "curate the exceptional ones by canonical identity"). */
export const CURATED: readonly CatalogEntry[] = [
  ...CEDH_CORE, ...STANDARD_CORE, ...CEDH_STAPLES_B1, ...CEDH_STAPLES_B2, ...FIXTURES_B3, ...STANDARD_B4,
];
const ENTRIES: readonly CatalogEntry[] = [...GENERATED, ...CURATED];

const BY_NAME = new Map<string, CatalogEntry>();
// Canonical names first. A face alias must never shadow a real card: the
// split card `Emeritus of Woe // Demonic Tutor` registers the face `Demonic
// Tutor`, which used to overwrite the actual Demonic Tutor entry and make
// every copy of it fail the hash check.
for (const entry of ENTRIES) BY_NAME.set(entry.canonicalName.toLowerCase(), entry);
for (const entry of ENTRIES) {
  for (const alias of [...(entry.faces ?? []), ...(entry.arenaVariant ? [entry.arenaVariant] : [])]) {
    const key = alias.toLowerCase();
    if (!BY_NAME.has(key)) BY_NAME.set(key, entry);
  }
}

/** Every entry, generated shard first then curated overrides. */
export function catalogEntries(): readonly CatalogEntry[] {
  return ENTRIES;
}

/** True when the entry was emitted by `generate.ts` rather than hand-typed. */
export function isGenerated(entry: CatalogEntry): boolean {
  return entry.provenance.source === 'generated from oracle text';
}

/** Content hash of the compiled catalogue; part of the score version id. */
export const CATALOG_VERSION = fnv1a(
  [...ENTRIES]
    .map((e) => `${e.canonicalName}|${e.knowledge}|${entryHash(e)}|${e.effects.length}`)
    .sort()
    .join('\n'),
);

export const CATALOG_SIZE = ENTRIES.length;

export function catalogEntry(name: string): CatalogEntry | undefined {
  return BY_NAME.get(name.toLowerCase());
}

/**
 * ONE alternative mode of a card, evaluated on its own. §9.3/§9.6 step 1:
 * "replace `catalogFacts`' union of alternative-mode requirements with
 * mode-resolved evaluation … modal budgets remain exclusive". The union was
 * wrong in both directions: a card with a cheap irrelevant mode and an
 * expensive relevant one appeared to need BOTH modes' supply, and a modal
 * card could satisfy two roles at once from two modes of the same copy.
 */
export interface CatalogMode {
  effect: TypedEffect;
  family: EffectFamily;
  produces: ReadonlySet<string>;
  consumes: ReadonlySet<string>;
  requiredSupply: readonly RequiredSupply[];
  /** `outputBounds.min` — the lower-bounded output this mode actually makes. */
  output: number;
  unit: string;
  mana: number;
  earliestTurn: number;
  /** Modes sharing a key are alternatives: at most one may be counted per
   * copy. Defaults to the effect's own index, i.e. its own budget. */
  budget: string;
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
  /** Every mode, kept separate. Callers pick ONE per copy (§9.3). */
  modes: readonly CatalogMode[];
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
  const modes: CatalogMode[] = [];
  let cheapestMana = Infinity;
  let earliestTurn = Infinity;
  let availability = 1;

  for (const [i, effect] of entry.effects.entries()) {
    families.add(effect.family);
    for (const axis of effect.answerAxes ?? []) axes.add(axis);
    for (const p of effect.produces ?? []) produces.add(p);
    for (const c of effect.consumes ?? []) consumes.add(c);
    cheapestMana = Math.min(cheapestMana, effect.cost.mana);
    earliestTurn = Math.min(earliestTurn, effect.timing.earliestTurn);
    availability = Math.min(availability, effect.availabilityPrior ?? 1);
    modes.push({
      effect,
      family: effect.family,
      produces: new Set(effect.produces ?? []),
      consumes: new Set(effect.consumes ?? []),
      requiredSupply: effect.requiredSupply ?? [],
      output: effect.outputBounds?.min ?? 0,
      unit: effect.outputBounds?.unit ?? 'unspecified',
      mana: effect.cost.mana,
      earliestTurn: effect.timing.earliestTurn,
      budget: effect.sharedModeBudget ?? `#${i}`,
    });
  }

  const facts: CatalogFacts = {
    entry,
    knowledge: entry.knowledge,
    textMatches: oracleHash(liveOracleText) === entryHash(entry),
    families,
    answerAxes: [...axes],
    produces,
    consumes,
    modes,
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
