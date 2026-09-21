/**
 * Deck Score wiring seam — the ONE place that turns product-shaped card rows
 * (desktop deck_cards join, build-api resolved lines) into `DeckScoreInput`,
 * and the ONE wire shape (`DeckScorePayload`) build-api and the web consume.
 *
 * Additive only: `runDeckScore` never throws for an unsupported format — it
 * returns null so callers can splice `deckScore: null` in without a 500.
 */
import { scoreDeck, SCORE_VERSION, type DeckScoreInput, type DeckScoreResult, type ComponentKey } from './deck-score';
import type { ScoreFormat } from './deck-score-norms';
import type { ScoreGate } from './deck-score-gates';
import type { DbCard } from './types';
import { getDb } from './db';

const SCORE_FORMATS: readonly ScoreFormat[] = ['commander', 'brawl', 'competitivebrawl', 'standardbrawl', 'standard'];

/** Product format string (`decks.format`, build-api `format`) -> `ScoreFormat`, or null if unsupported. */
export function toScoreFormat(format: string | null | undefined): ScoreFormat | null {
  return SCORE_FORMATS.includes(format as ScoreFormat) ? (format as ScoreFormat) : null;
}

export interface ScoreCardInput {
  card: DbCard;
  quantity: number;
}

export interface BuildDeckScoreInputArgs {
  format: string | null | undefined;
  main: readonly ScoreCardInput[];
  commander: readonly DbCard[];
  sideboard?: readonly ScoreCardInput[];
  companion?: DbCard;
  unresolved?: readonly { name: string; quantity: number; board: string }[];
}

let cachedCardDataVersion: string | null = null;

/** One frozen id per DB snapshot (§1). Prefers the Arena card-seed version
 * stamp; falls back to a row count so a DB with no seed marker still scores. */
function cardDataVersion(): string {
  if (cachedCardDataVersion) return cachedCardDataVersion;
  const db = getDb();
  try {
    const row = db.prepare("SELECT value FROM app_state WHERE key = 'arena_card_db_version'").get() as
      | { value: string }
      | undefined;
    if (row?.value) {
      cachedCardDataVersion = `arena-${row.value}`;
      return cachedCardDataVersion;
    }
  } catch {
    // app_state may not exist in a bare service DB
  }
  const count = (db.prepare('SELECT COUNT(*) AS n FROM cards').get() as { n: number }).n;
  cachedCardDataVersion = `cards-${count}`;
  return cachedCardDataVersion;
}

/**
 * §10.2/§10.5: why this input has NO numeric total, or null when it is
 * scorable. "An entirely unevaluable essential component yields provisional
 * component diagnostics and no numeric total, rather than invented credit."
 *
 * This is the one predicate `scoreDeckSafely`'s null return follows, so a
 * calibration script can report the reason instead of an anonymous null.
 * Partial evidence is NOT unavailable: an unresolved copy, or an unresolved
 * commander line with a readable library, still yields a provisional score.
 */
export function explainScoreUnavailable(args: BuildDeckScoreInputArgs): string | null {
  const format = toScoreFormat(args.format);
  if (!format) return `unsupported format "${args.format ?? 'null'}" — the scorer has no norms for it.`;
  const copies = args.main.reduce((s, e) => s + e.quantity, 0);
  if (args.main.length === 0 || copies <= 0) {
    const reserved = (args.unresolved ?? []).filter((u) => u.board === 'main').length;
    return reserved > 0
      ? `no resolved main-board card: all ${reserved} library slot(s) are unresolved names.`
      : 'no main-board cards to evaluate.';
  }
  return null;
}

/** Empty main deck (e.g. a brand-new commander deck) has nothing to score —
 * null so the caller falls back to the old number, not a misleading {score: 0}. */
export function buildDeckScoreInput(args: BuildDeckScoreInputArgs): DeckScoreInput | null {
  const format = toScoreFormat(args.format);
  if (!format || explainScoreUnavailable(args) !== null) return null;
  return {
    format,
    main: args.main,
    commander: args.commander,
    sideboard: args.sideboard ?? [],
    companion: args.companion,
    unresolved: args.unresolved ?? [],
    cardDataVersion: cardDataVersion(),
    corpus: null,
  };
}

export interface DeckScorePayload {
  version: string;
  score: number;
  provisional: boolean;
  components: { key: ComponentKey; score: number; weight: number; reason: string }[];
  gates: ScoreGate[];
}

function toPayload(result: DeckScoreResult): DeckScorePayload {
  return {
    version: SCORE_VERSION,
    score: result.score,
    provisional: result.provisional,
    components: result.components,
    gates: result.gates,
  };
}

/** Never throws: a null input or a scorer exception both yield null. */
export function runDeckScore(input: DeckScoreInput | null): DeckScorePayload | null {
  if (!input) return null;
  try {
    return toPayload(scoreDeck(input));
  } catch {
    return null;
  }
}

/** The one call site should use — builds the input AND scores it inside a
 * single try, so a throw anywhere in either step (including `cardDataVersion`'s
 * DB read) yields null instead of a 500. */
export function scoreDeckSafely(args: BuildDeckScoreInputArgs): DeckScorePayload | null {
  try {
    return runDeckScore(buildDeckScoreInput(args));
  } catch {
    return null;
  }
}
