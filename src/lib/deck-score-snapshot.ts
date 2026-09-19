/**
 * Deck Score v1 — corpus snapshot builder.
 *
 * // ponytail: STUB, not the real builder. Brief scope item 3 allows this:
 * // "write buildCorpusSnapshot(db, format, context) ONLY if <=120 lines
 * // using getMetaCardStats; otherwise leave a typed stub that returns null
 * // and say so." The app's own data/mtg-deck-builder.db has zero
 * // community_decks rows (the scraped corpus lives in a separate export DB
 * // — see docs/RESEARCH_STANDARD_CORPUS.md), and §1 Fmeta's per-card
 * // CorpusCard needs age-weighted effective wins/losses/inclusion and a
 * // same-archetype baseline that getMetaCardStats does not compute — that
 * // aggregation is a real second unit, not a <=120-line wrapper. Every
 * // caller therefore gets `corpus: null` -> Fmeta's documented 50 + evidence
 * // warn path (computeMeta in deck-score-meta.ts) until that unit ships.
 */
import type Database from 'better-sqlite3';
import type { ScoreFormat } from './deck-score-norms';
import type { ScoreCorpusSnapshot } from './deck-score-meta';

export function buildCorpusSnapshot(
  _db: Database.Database,
  _format: ScoreFormat,
  _context: string,
): ScoreCorpusSnapshot | null {
  return null;
}
