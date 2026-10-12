/** Typed coverage of the 372 Reality Fracture (fra+frc) cards, same buckets as
 * scripts/deck-score-coverage.ts. Usage: MTG_DB_DIR=... npx tsx verify-2026-09-27/deck-score-cards/fra-coverage.ts */
import fs from 'fs';
import { deriveCardFeature } from '../../src/lib/deck-score-features';
import { catalogEntry, entryHash, isGenerated, oracleHash } from '../../src/lib/deck-score-catalog';
import PARTIAL_JSON from '../../src/lib/deck-score-catalog/entries/generated-partial.json';
import { cardsByName } from '../../scripts/deck-score-piles';

const partial = new Set((PARTIAL_JSON as { canonicalName: string }[]).map((e) => e.canonicalName.toLowerCase()));
const cards = JSON.parse(fs.readFileSync('verify-2026-09-27/deck-score-cards/fra-cards.json', 'utf-8')) as { name: string; set: string }[];
const byName = cardsByName();
const counts: Record<string, number> = {};
const untyped: string[] = [];
for (const c of cards) {
  const card = byName.get(c.name.toLowerCase());
  let bucket: string;
  if (!card) bucket = 'missing-from-db';
  else {
    const f = deriveCardFeature(card);
    const entry = catalogEntry(card.name);
    const kind = f.isLand ? 'land' : 'nonland';
    if (!entry) bucket = `${kind}:${partial.has(card.name.toLowerCase()) ? 'partial' : f.covered ? 'trivial' : 'unknown'}`;
    else if (oracleHash(card.oracle_text) !== entryHash(entry)) bucket = `${kind}:stale`;
    else bucket = `${kind}:${entry.knowledge !== 'known' ? 'partial' : isGenerated(entry) ? 'generated' : 'curated'}`;
    if (!f.isLand && !f.covered) untyped.push(`${card.name} [${bucket}]`);
  }
  counts[bucket] = (counts[bucket] ?? 0) + 1;
}
console.log(`fra+frc ${cards.length}:`, JSON.stringify(counts));
console.log(`nonland not covered (${untyped.length}): ${untyped.slice(0, 40).join('; ')}`);
