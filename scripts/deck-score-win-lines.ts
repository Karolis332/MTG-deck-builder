/**
 * Deck Score v1.4 stage 1a — win-line trace. docs/DECK_SCORE_SPEC.md §10.6.1.
 *
 * Every admitted closing line must carry a RESOURCE / TUTOR / FINISH trace: the
 * engine's loop, the tutors that reach its pieces, and the outlet that converts
 * the loop into a finish predicate. `pile-diag --win` prints the recipe table;
 * this prints the trace and works on the cEDH cohort as well as the fixtures,
 * which is where the two missing lines live.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-win-lines.ts <fixture|cedh-N> [...]
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-win-lines.ts --cedh-all
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-win-lines.ts --anchors
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-win-lines.ts --witness <fixture>
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-win-lines.ts --horizon-invariance
 */
import { scoreDeck, type DeckScoreInput } from '../src/lib/deck-score';
import { normsFor } from '../src/lib/deck-score-norms';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import type { DeckEntry } from '../src/lib/deck-score-mana';
import { computeInteraction, computeAdvantage } from '../src/lib/deck-score-interaction';
import { winDiagnostic, computeWin, winAudit, winWitness } from '../src/lib/deck-score-win';
import { setHorizonOverride, MAX_TURN, COMMANDER_HORIZON } from '../src/lib/deck-score-finishers';
import { loadDataset, loadCedhCohort, FIXTURES } from './deck-score-fixtures';

function entriesOf(input: DeckScoreInput): { N: number; all: DeckEntry[]; cmd: DeckEntry[] } {
  const all: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
  const cmd: DeckEntry[] = input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
  return { N: all.reduce((s, e) => s + e.quantity, 0), all, cmd };
}

function trace(label: string, input: DeckScoreInput, verbose: boolean): void {
  const { N, all, cmd } = entriesOf(input);
  const fmt = input.format;
  const norms = normsFor(fmt);
  const inter = computeInteraction(fmt, norms, 'midrange', N, all);
  const adv = computeAdvantage(fmt, norms, 'midrange', N, all);
  const cmdFeatures = cmd.map((e) => e.feature);
  const totals = {
    E: inter.E, Estar: inter.Estar, D: adv.D, Dstar: adv.Dstar, hasDrawEngine: adv.hasDrawEngine,
  };
  const win = computeWin(fmt, norms, 'midrange', N, all, cmdFeatures, totals);
  const scored = scoreDeck(input);
  const S = scored.components.find((c) => c.key === 'synergy');
  console.log(`## ${label} (${fmt}, N=${N})`);
  console.log(`total ${scored.score}${scored.provisional ? ' (provisional)' : ''}  W ${win.score.toFixed(1)}  S ${(S?.score ?? 0).toFixed(1)}`);
  console.log(`W reason: ${win.reason}`);
  console.log(`S reason: ${S?.reason ?? '-'}`);
  console.log(`closing: ${win.closing ? `${win.closing.id} [${win.closing.label}] pieces=${win.closing.pieces.join(' + ')} r=${win.closing.required} cost=${win.closing.cost} T${win.closing.tStar}` : 'none'}`);
  for (const l of win.closingLines) {
    console.log(`  line ${l.id}: ${l.label} | pieces ${l.pieces.join(' + ')} | r=${l.required} cost=${l.cost} T${l.tStar}`);
    if (l.trace) {
      console.log(`    resource: ${l.trace.resource}`);
      console.log(`    tutor:    ${l.trace.tutor}`);
      console.log(`    finish:   ${l.trace.finish}`);
    } else {
      console.log('    NO TRACE');
    }
  }
  if (verbose) console.log(winDiagnostic(fmt, norms, 'midrange', N, all, cmdFeatures, totals));
  if (verbose) {
    const { notes } = winAudit(fmt, norms, 'midrange', N, all, cmdFeatures, totals);
    for (const n of notes) console.log(`  rejected ${n.family}: ${n.code} — ${n.detail}`);
  }
  console.log('');
}

/** Section 10.8 item 3: the per-turn witness for one fixture at its own horizon. */
function witness(label: string, input: DeckScoreInput): void {
  const { N, all, cmd } = entriesOf(input);
  const fmt = input.format;
  const norms = normsFor(fmt);
  const inter = computeInteraction(fmt, norms, 'midrange', N, all);
  const adv = computeAdvantage(fmt, norms, 'midrange', N, all);
  const totals = { E: inter.E, Estar: inter.Estar, D: adv.D, Dstar: adv.Dstar, hasDrawEngine: adv.hasDrawEngine };
  const scored = scoreDeck(input);
  console.log(`## witness ${label}`);
  console.log(winWitness(fmt, norms, 'midrange', N, all, cmd.map((e) => e.feature), totals));
  console.log(`composed total ${scored.score}${scored.provisional ? ' (provisional)' : ''}`);
  console.log('');
}

/**
 * Section 10.8 item 4: the SAME corrected evaluator at H12 and H20 on the 30
 * cEDH lists. The gate is 0 per-list changes in W or composed total.
 */
function horizonInvariance(): void {
  const cedh = loadCedhCohort().map((d) => d.input);
  const read = (input: DeckScoreInput): { W: number; total: number | null } => {
    const { N, all, cmd } = entriesOf(input);
    const norms = normsFor(input.format);
    const inter = computeInteraction(input.format, norms, 'midrange', N, all);
    const adv = computeAdvantage(input.format, norms, 'midrange', N, all);
    const totals = { E: inter.E, Estar: inter.Estar, D: adv.D, Dstar: adv.Dstar, hasDrawEngine: adv.hasDrawEngine };
    const win = computeWin(input.format, norms, 'midrange', N, all, cmd.map((e) => e.feature), totals);
    return { W: win.score, total: scoreDeck(input).score };
  };
  setHorizonOverride(MAX_TURN);
  const at12 = cedh.map(read);
  setHorizonOverride(COMMANDER_HORIZON);
  const at20 = cedh.map(read);
  setHorizonOverride(null);
  let changed = 0;
  console.log('| list | W H12 | W H20 | total H12 | total H20 | change |');
  console.log('|---|---:|---:|---:|---:|---|');
  for (let i = 0; i < cedh.length; i++) {
    const dW = Math.abs(at20[i].W - at12[i].W) > 1e-9;
    const dT = at20[i].total !== at12[i].total;
    if (dW || dT) changed += 1;
    console.log(`| cedh-${i} | ${at12[i].W.toFixed(3)} | ${at20[i].W.toFixed(3)} | ${at12[i].total} `
      + `| ${at20[i].total} | ${dW || dT ? 'CHANGED' : 'same'} |`);
  }
  console.log('');
  console.log(`cEDH horizon invariance: ${changed} per-list change(s) out of ${cedh.length} `
    + `(section 10.8 item 4 requires 0).`);
}

function main(): void {
  const verbose = process.argv.includes('-v');
  const witnessArg = process.argv.indexOf('--witness');
  const args = process.argv.slice(2)
    .filter((a, i) => !a.startsWith('-') && i + 2 !== witnessArg + 1);
  const wantCedhAll = process.argv.includes('--cedh-all');
  const wantAnchors = process.argv.includes('--anchors');
  if (process.argv.includes('--horizon-invariance')) { horizonInvariance(); return; }
  const wArg = process.argv.indexOf('--witness');
  if (wArg > 0) {
    const name = process.argv[wArg + 1];
    const hit = loadDataset(200).fixtures.find((x) => x.name === name);
    if (!hit) { console.log(`no fixture ${name}`); return; }
    witness(name, hit.input);
    return;
  }

  const cedhNeeded = wantCedhAll || args.some((a) => /^cedh-\d+$/.test(a));
  const cedh = cedhNeeded ? loadCedhCohort().map((d) => d.input) : [];
  const fixturesNeeded = wantAnchors || args.some((a) => !/^cedh-\d+$/.test(a));
  const ds = fixturesNeeded ? loadDataset(200) : null;

  if (wantCedhAll) {
    for (let i = 0; i < cedh.length; i++) trace(`cedh-${i}`, cedh[i], verbose);
    return;
  }
  if (wantAnchors) {
    for (const f of FIXTURES) {
      const hit = ds?.fixtures.find((x) => x.name === f.name);
      if (hit) trace(`${f.name} [band ${f.band}]`, hit.input, verbose);
    }
    return;
  }
  for (const name of args) {
    const m = /^cedh-(\d+)$/.exec(name);
    if (m) {
      const input = cedh[Number(m[1])];
      if (!input) { console.log(`no cedh list ${name}`); continue; }
      trace(name, input, verbose);
      continue;
    }
    const hit = ds?.fixtures.find((x) => x.name === name);
    if (!hit) { console.log(`no fixture ${name}`); continue; }
    trace(name, hit.input, verbose);
  }
}

main();
