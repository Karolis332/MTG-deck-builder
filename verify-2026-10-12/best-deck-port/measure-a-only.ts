import fs from 'fs';
import path from 'path';
import { loadOwned } from '../../scripts/best-deck-lib';
import { runBestDeck, type RunBestDeckProgress } from '../../src/lib/best-deck-run';

async function main(): Promise<void> {
  const owned = loadOwned('paper');
  const ownedReq = owned.cards.map((c) => ({ name: c.name, quantity: 1 }));
  const progress: RunBestDeckProgress[] = [];
  const start = Date.now();
  const result = await runBestDeck({ owned: ownedReq, budgetUsd: 0 }, (p) => progress.push(p));
  const ms = Date.now() - start;
  const top5 = result.commanders.slice(0, 5).map((c) => `${c.name} (${c.screenObjective.toFixed(1)})`);
  const screenedCount = progress.filter((p) => p.stage === 'screening').length;
  fs.writeFileSync(path.join(__dirname, 'a-no-commander-budget0-round2.json'), JSON.stringify({ ...result, progressCount: progress.length }, null, 2));
  console.log(JSON.stringify({ ms, stopReason: result.climb.stopReason, passes: result.climb.passes, evaluations: result.climb.evaluations, screenedCount, top5 }, null, 2));
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
