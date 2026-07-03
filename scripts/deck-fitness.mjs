/**
 * Fitness gate for the autonomous deck-engine improver.
 *
 * Reads the harness output (decks/test-builds/results.json) and reduces it to
 * two numbers the improver loop gates on:
 *   hardFails — correctness regressions that must NEVER increase
 *               (failed build, illegal cards, Ramos counters-matters leak)
 *   score     — soft signal to maximize (convergence to human winning refs +
 *               Ramos gold-spell density)
 *
 * Modes:
 *   node deck-fitness.mjs                      → prints {"hardFails":N,"score":M}
 *   node deck-fitness.mjs --accept BASE NEW    → exit 0 if NEW is a strict improvement, else 1
 *   node deck-fitness.mjs --selftest           → asserts, exit 0/1
 *
 * ponytail: additive bounded score, hard-fail floor. Not a tuned polynomial —
 * upgrade the weighting only if the loop starts gaming it.
 */
import fs from 'fs';
import path from 'path';

const RESULTS = process.env.RESULTS_FILE || path.join(process.cwd(), 'decks', 'test-builds', 'results.json');

function computeFitness(builds) {
  let hardFails = 0;
  let score = 0;
  for (const b of builds) {
    if (!b.ok) { hardFails += 1; continue; }
    if ((b.illegalCardsForFormat?.length || 0) > 0) hardFails += 1;
    if (b.scenario === 'ramos-dragon-engine' && (b.counterMattersCount || 0) > 0) hardFails += 1;
    score += b.referenceOverlapPct || 0;
    if (b.scenario === 'ramos-dragon-engine') score += Math.min(b.goldSpellCount || 0, 50);
  }
  return { hardFails, score };
}

// NEW is accepted only if it introduces no new correctness regression AND
// strictly improves the soft score (strict > prevents no-op churn commits).
function accepts(base, next) {
  return next.hardFails <= base.hardFails && next.score > base.score;
}

function readResults() {
  if (!fs.existsSync(RESULTS)) throw new Error(`missing ${RESULTS} — harness did not produce output`);
  return JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
}

function selftest() {
  const worse = { hardFails: 1, score: 100 };
  const base = { hardFails: 0, score: 100 };
  const better = { hardFails: 0, score: 101 };
  const same = { hardFails: 0, score: 100 };
  const cleanerSameScore = { hardFails: 0, score: 100 };
  console.assert(accepts(base, better) === true, 'strict score gain accepted');
  console.assert(accepts(base, same) === false, 'no score gain rejected');
  console.assert(accepts(base, worse) === false, 'never accept: score up but a gate broke');
  console.assert(accepts({ hardFails: 2, score: 50 }, { hardFails: 1, score: 51 }) === true, 'fewer fails + higher score accepted');
  console.assert(accepts(base, cleanerSameScore) === false, 'fewer-fails alone without score gain rejected');

  const f = computeFitness([
    { ok: true, scenario: 'ramos-dragon-engine', illegalCardsForFormat: [], counterMattersCount: 0, referenceOverlapPct: 20, goldSpellCount: 40 },
    { ok: true, scenario: 'mono-r-krenko', illegalCardsForFormat: ['Illegal Card'], referenceOverlapPct: 10 },
    { ok: false, scenario: 'mono-g-ghalta' },
  ]);
  // ramos: 20 overlap + min(40,50)=40 → 60 ; krenko: +10 overlap ; ghalta: 0
  console.assert(f.score === 70, `score expected 70, got ${f.score}`);
  // ghalta !ok (1) + krenko illegal (1) = 2
  console.assert(f.hardFails === 2, `hardFails expected 2, got ${f.hardFails}`);

  // counters-matters leak on ramos is a hard fail
  const leak = computeFitness([{ ok: true, scenario: 'ramos-dragon-engine', illegalCardsForFormat: [], counterMattersCount: 3, referenceOverlapPct: 0, goldSpellCount: 0 }]);
  console.assert(leak.hardFails === 1, `ramos counters leak should be a hardFail, got ${leak.hardFails}`);

  console.log('deck-fitness selftest: OK');
}

const args = process.argv.slice(2);
if (args[0] === '--selftest') {
  selftest();
} else if (args[0] === '--accept') {
  const base = JSON.parse(args[1]);
  const next = JSON.parse(args[2]);
  process.exit(accepts(base, next) ? 0 : 1);
} else {
  process.stdout.write(JSON.stringify(computeFitness(readResults())));
}
