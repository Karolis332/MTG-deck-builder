/**
 * Slice A2 measurement script — read-only against the live app DB.
 *
 *   MTG_DB_DIR=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data npx tsx verify-2026-10-12/best-deck-port/measure.ts
 *
 * Runs the three scenarios in the brief sequentially (one measure process, no concurrent runs)
 * and writes measure-results.md next to this file.
 */
import fs from 'fs';
import path from 'path';
import { loadOwned } from '../../scripts/best-deck-lib';
import { isCommander } from '../../src/lib/best-deck';
import { preRankCommanders, runBestDeck, type RunBestDeckProgress, type RunBestDeckRequest } from '../../src/lib/best-deck-run';

const OUT_DIR = __dirname;
const FORMAT = 'commander';
// Top 5 from the earlier full screen of this same owned pool (budget 0, no commander given):
// verify-2026-10-07/best-deck/paper-2/REPORT.md
const EARLIER_TOP5 = ['Mikaeus, the Unhallowed', 'Meren of Clan Nel Toth', 'Dina, Essence Brewer', 'Imotekh the Stormlord', 'Illuminor Szeras'];

interface RunRecord {
  label: string;
  ms: number;
  stopReason: string;
  passes: number;
  evaluations: number;
  top5: string[];
}

async function run(label: string, req: RunBestDeckRequest): Promise<RunRecord> {
  const progress: RunBestDeckProgress[] = [];
  const start = Date.now();
  const result = await runBestDeck(req, (p) => progress.push(p));
  const ms = Date.now() - start;
  fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify({ ...result, progressCount: progress.length }, null, 2));
  return {
    label, ms, stopReason: result.climb.stopReason, passes: result.climb.passes, evaluations: result.climb.evaluations,
    top5: result.commanders.length
      ? result.commanders.slice(0, 5).map((c) => `${c.name} (${c.screenObjective.toFixed(1)})`)
      : [`${result.commander.name} (given, objective ${result.objective.toFixed(1)})`],
  };
}

async function main(): Promise<void> {
  const owned = loadOwned('paper');
  const ownedReq = owned.cards.map((c) => ({ name: c.name, quantity: 1 }));
  const ownedNames = new Set(owned.cards.map((c) => c.name));

  // Pre-rank check: does preRankCommanders' top screenTop(24) window contain the earlier full
  // screen's top 5 (same owned pool, same budget-0, no-commander setup)?
  const candidates = owned.cards.filter((c) => isCommander(c, FORMAT));
  const ranked = preRankCommanders(candidates, ownedNames);
  const top24 = new Set(ranked.slice(0, 24).map((r) => r.card.name));
  const preRankCheck = EARLIER_TOP5.map((name) => ({ name, inTop24: top24.has(name) }));

  const runs: RunRecord[] = [];
  runs.push(await run('a-no-commander-budget0', { owned: ownedReq, budgetUsd: 0 }));
  runs.push(await run('b-no-commander-budget50', { owned: ownedReq, budgetUsd: 50 }));
  runs.push(await run('c-beledros-budget0', { owned: ownedReq, commanderName: 'Beledros Witherbloom', budgetUsd: 0 }));

  const rows = runs.map((r) => `| ${r.label} | ${r.ms}ms | ${r.stopReason} | ${r.passes} | ${r.evaluations} | ${r.top5.join('; ')} |`).join('\n');
  const preRankRows = preRankCheck.map((c) => `| ${c.name} | ${c.inTop24 ? 'yes' : 'NO'} |`).join('\n');
  const md = `# Slice A2 measure results

Owned pool: \`decks/paper/collection.txt\` ∪ \`decks/paper/decks/*.txt\` (loadOwned('paper')), ${owned.cards.length} resolved cards.

## Runs

| run | time | stopReason | passes | evaluations | top 5 |
|---|---|---|---|---|---|
${rows}

## Pre-rank check

Earlier full screen of this pool (budget 0, no commander given): \`verify-2026-10-07/best-deck/paper-2/REPORT.md\` top 5.
Does \`preRankCommanders\`'s top-24 window (screenTop default) contain each?

| commander | in pre-rank top 24 |
|---|---|
${preRankRows}
`;
  fs.writeFileSync(path.join(OUT_DIR, 'measure-results.md'), md);
  console.log(md);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
