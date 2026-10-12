/**
 * Live run of the v2 best-deck engine on the operator's full paper collection.
 * MTG_DB_DIR=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data npx tsx verify-2026-10-12/best-deck-v2/live-run.ts
 */
import { loadOwned } from '../../scripts/best-deck-lib';
import { runBestDeck, type RunBestDeckProgress } from '../../src/lib/best-deck-run';

async function main(): Promise<void> {
  const owned = loadOwned('paper').cards.map((c) => ({ name: c.name }));
  console.log(`owned pool: ${owned.length} distinct names`);

  const stageStart = new Map<string, number>();
  const t0 = Date.now();
  const onProgress = (p: RunBestDeckProgress): void => {
    if (!stageStart.has(p.stage)) {
      stageStart.set(p.stage, Date.now());
      console.log(`[+${((Date.now() - t0) / 1000).toFixed(1)}s] stage -> ${p.stage}`);
    }
    if (p.stage === 'screening' && p.screened !== undefined && p.toScreen !== undefined && p.screened % 10 === 0) {
      console.log(`  screening ${p.screened}/${p.toScreen}: ${p.commander}`);
    }
  };

  const result = await runBestDeck({ owned, budgetUsd: 50 }, onProgress, { games: 100 });
  const totalMs = Date.now() - t0;

  console.log('\n--- stage wall time ---');
  const stages = [...stageStart.entries()].sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < stages.length; i++) {
    const [name, t] = stages[i];
    const end = i + 1 < stages.length ? stages[i + 1][1] : t0 + totalMs;
    console.log(`  ${name}: ${((end - t) / 1000).toFixed(1)}s`);
  }
  console.log(`  total: ${(totalMs / 1000).toFixed(1)}s`);

  console.log(`\nscreened: ${result.commanders.length} returned (contract caps at 10)`);
  console.log('\ntop 5 commanders (by screen objective):');
  for (const c of result.commanders.slice(0, 5)) {
    console.log(`  ${c.name} [${c.identity.join('')}] obj=${c.screenObjective.toFixed(2)} owned=${(c.ownedShare * 100).toFixed(0)}% buy=$${c.buyUsd.toFixed(2)}`);
  }

  const named = (n: string) => result.commanders.find((c) => c.name === n);
  console.log(`\nMikaeus, the Unhallowed ranked: ${named('Mikaeus, the Unhallowed') ? 'yes — ' + JSON.stringify(named('Mikaeus, the Unhallowed')) : 'no'}`);
  console.log(`Illuminor Szeras ranked: ${named('Illuminor Szeras') ? 'yes — ' + JSON.stringify(named('Illuminor Szeras')) : 'no'}`);

  console.log(`\nchosen commander: ${result.commander.name}, objective ${result.objective.toFixed(2)}`);
  console.log(`climb: ${JSON.stringify(result.climb)}`);
  console.log(`\nupgrades: ${result.upgrades.length}`);
  for (const u of result.upgrades.slice(0, 3)) console.log(`  + ${u.name} ($${u.priceUsd}) replaces ${u.replaces}, gain ${u.gain}`);
  console.log(`replacements: ${result.replacements.length}`);
  for (const r of result.replacements.slice(0, 3)) console.log(`  ~ ${r.forCard}: ${r.options.map((o) => `${o.name} (${o.delta})`).join(', ')}`);
  console.log(`nearMisses: ${result.nearMisses.length}`);
  for (const n of result.nearMisses.slice(0, 3)) console.log(`  ? ${n.name} owned=${n.owned} delta=${n.delta} slot=${n.slot}`);
  console.log(`\ntotal evaluations: climb=${result.climb.evaluations} (report evaluations are bounded <=600/60s by contract but not separately exposed on RunBestDeckResult)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
