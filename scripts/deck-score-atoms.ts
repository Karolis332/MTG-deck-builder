/**
 * Deck Score — per-atom audit for the coverage round-1 batches.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-atoms.ts [--samples 20]
 *
 * For every atom added in round 1, over the DISTINCT non-land cards the two
 * real corpus samples play: how many cards its regex fires on, and a
 * deterministic sample of those cards with the exact sentence claimed. An
 * atom that fires on fewer than three corpus cards is a one-card rule in
 * disguise and is reported as BELOW-FLOOR; the sample is the false-positive
 * check the brief asks for — read the claimed sentence, not the card name.
 */
import { ROUND1_ATOM_BATCHES, stripReminders, selfName } from '../src/lib/deck-score-catalog/generate';
import { readSample, cardsByName } from './deck-score-piles';
import type { DbCard } from '../src/lib/types';

function corpusCards(): DbCard[] {
  const byName = cardsByName();
  const out = new Map<string, DbCard>();
  for (const profile of ['commander', 'brawl'] as const) {
    for (const deck of readSample(profile)) {
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card || /\bLand\b/.test(card.type_line || '')) continue;
        if (!out.has(card.name)) out.set(card.name, card);
      }
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function main(): void {
  const sArg = process.argv.indexOf('--samples');
  const wanted = sArg > 0 ? Number(process.argv[sArg + 1]) : 20;
  const cards = corpusCards();
  // Same normalisation the generator applies before scanning: the card's own
  // name becomes `this permanent`, so an atom written in that form is
  // counted, not reported as firing on nothing.
  const texts = cards.map((c) => ({ name: c.name, text: selfName(stripReminders(c.oracle_text ?? ''), c) }));
  let below = 0;
  let index = 0;

  for (const batch of ROUND1_ATOM_BATCHES) {
    for (const atom of batch.atoms) {
      index += 1;
      const hits: { name: string; claimed: string }[] = [];
      for (const t of texts) {
        atom.re.lastIndex = 0;
        const m = atom.re.exec(t.text);
        if (!m || m[0].length === 0) continue;
        hits.push({ name: t.name, claimed: m[0].replace(/\s+/g, ' ').slice(0, 140) });
      }
      const flag = hits.length < 3 ? ' BELOW-FLOOR (<3 corpus cards)' : '';
      if (hits.length < 3) below += 1;
      console.log(`\n#${index} ${batch.label} ${atom.kind} fires on ${hits.length} corpus cards${flag}`);
      console.log(`    ${String(atom.re)}`.slice(0, 200));
      // Evenly spaced through the alphabetical hit list, so the sample is not
      // the first N of one card cycle.
      const step = Math.max(1, Math.floor(hits.length / wanted));
      for (let i = 0, shown = 0; i < hits.length && shown < wanted; i += step, shown++) {
        console.log(`    ${hits[i].name} :: ${hits[i].claimed}`);
      }
    }
  }
  console.log(`\n${index} round-1 atoms; ${below} fire on fewer than 3 corpus cards.`);
  if (below > 0) process.exitCode = 1;
}

main();
