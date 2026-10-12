// Perf probe: one autoBuildDeck run with wall/CPU/event-loop split, SQL time per
// statement (better-sqlite3 prototype patch), fetch count, and setTimeout sleeps.
// Usage: MTG_DB_DIR=... WT=<tree> npx tsx time-build.ts <label> '<json BuildOptions>'
import path from 'path';
import { performance } from 'perf_hooks';

const WT = process.env.WT!;
const [label, json] = process.argv.slice(2);

async function main() {
  const Database = require(path.join(WT, 'node_modules/better-sqlite3'));
  const sqlStats = new Map<string, { n: number; ms: number }>();
  const probe = new Database(':memory:');
  const StmtProto = Object.getPrototypeOf(probe.prepare('select 1'));
  probe.close();
  for (const m of ['all', 'get', 'run', 'iterate']) {
    const orig = StmtProto[m];
    StmtProto[m] = function (this: { source: string }, ...a: unknown[]) {
      const t0 = performance.now();
      try { return orig.apply(this, a); } finally {
        const k = this.source.replace(/\s+/g, ' ').slice(0, 140);
        const s = sqlStats.get(k) || { n: 0, ms: 0 };
        s.n++; s.ms += performance.now() - t0; sqlStats.set(k, s);
      }
    };
  }
  let fetchN = 0, fetchMs = 0;
  const origFetch = global.fetch;
  global.fetch = (async (...a: Parameters<typeof fetch>) => {
    fetchN++; const t0 = performance.now();
    try { return await origFetch(...a); } finally { fetchMs += performance.now() - t0; }
  }) as typeof fetch;
  const sleeps: number[] = [];
  const origST = global.setTimeout;
  (global as any).setTimeout = (fn: any, ms?: number, ...r: any[]) => { if ((ms || 0) >= 50) sleeps.push(ms!); return origST(fn, ms, ...r); };

  const { autoBuildDeck } = await import(require('url').pathToFileURL(path.join(WT, process.env.MOD || 'src/lib/deck-builder-ai.ts')).href);
  const opts = JSON.parse(json);
  const elu0 = performance.eventLoopUtilization();
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  const r = await autoBuildDeck(opts);
  const wall = performance.now() - t0;
  const cpu = process.cpuUsage(cpu0);
  const elu = performance.eventLoopUtilization(elu0);
  const sqlTotal = [...sqlStats.values()].reduce((s, x) => s + x.ms, 0);
  console.log(`== ${label} wall ${(wall / 1000).toFixed(1)}s cpu user ${(cpu.user / 1e6).toFixed(1)}s sys ${(cpu.system / 1e6).toFixed(1)}s ELU idle ${(elu.idle / 1000).toFixed(1)}s active ${(elu.active / 1000).toFixed(1)}s`);
  console.log(`fetch ${fetchN} (${fetchMs.toFixed(0)}ms) sleeps>=50ms ${sleeps.length} sum ${sleeps.reduce((a, b) => a + b, 0)}ms  SQL total ${(sqlTotal / 1000).toFixed(1)}s cards ${r.cards.length}`);
  if (process.env.OUT) require('fs').writeFileSync(process.env.OUT, r.cards.map((e: any) => `${e.board} ${e.quantity} ${e.card.name}`).sort().join('\n'));
  const top = [...sqlStats.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 8);
  for (const [k, s] of top) console.log(`  ${(s.ms / 1000).toFixed(2)}s n=${s.n} ${k}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
