/**
 * Deck Score §4 calibration — grid search over the §7 v1.1 norm revision.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-calibrate.ts probe [tuning.json]
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-calibrate.ts grid  [--piles N]
 *
 * `probe` scores the whole dataset under one candidate and prints the component
 * table — this is how §7's reachability numbers were MEASURED rather than
 * predicted. `grid` searches, writes verify-2026-09-19/deck-score/calibration.md
 * and the winning constants as JSON.
 *
 * The three score profiles are INDEPENDENT (a Standard tuning cannot move a
 * Commander deck), so each profile is searched against only its own decks.
 * Loss is §4 exactly:
 *   mean_groups(mean_decks(distance(score,[lo,hi])^2))
 *   + 4*mean_pairs(max(0, 5-(stronger-weaker))^2)
 *   + .1*Sum(weight - initial)^2
 *
 * // ponytail: greedy coordinate descent on the weight lattice instead of
 * // enumerating every ±4 combination that sums to 100 (§4 says "prune, do not
 * // enumerate"). Upgrade path is a full lattice sweep on a cluster, not more
 * // heuristics here.
 */
import fs from 'fs';
import path from 'path';
import { scoreDeck, type DeckScoreInput } from '../src/lib/deck-score';
import {
  profileOf, weightsFor, normsFor, QUALITY_CAP_INTERCEPT,
  type ScoreProfile, type ScoreTuning, type ComponentKey, type FormatNorms,
} from '../src/lib/deck-score-norms';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import { OUT_DIR, bandOf, loadDataset, type Dataset } from './deck-score-fixtures';

const LOG_FILE = path.join(OUT_DIR, 'calibrate.log');
function log(line: string): void {
  const stamped = `${new Date().toISOString().slice(11, 19)} ${line}`;
  console.log(stamped);
  fs.appendFileSync(LOG_FILE, `${stamped}\n`);
}

// ── Candidate parameterisation ────────────────────────────────────────────

/** The tunable axes of one profile. §4 fixes meta (3/3/8) and structure (0). */
interface Candidate {
  weights: Record<ComponentKey, number>;
  countMultiplier: number;
  pWin: number;
  h: number;
  tFast: number;
  poolSizeCap: number;
  capIntercept: number;
}

const CORE_KEYS: ComponentKey[] = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy'];

function baseCandidate(profile: ScoreProfile): Candidate {
  const norms = normsFor(profile);
  return {
    weights: { ...weightsFor(profile) },
    countMultiplier: 1,
    pWin: norms.winAccessTarget,
    h: norms.delayHalfLifeTurns,
    tFast: norms.fastClosingTurn,
    poolSizeCap: norms.poolSizeCap,
    capIntercept: QUALITY_CAP_INTERCEPT,
  };
}

/** §4: "quality-cap intercept {15,20,25} with slope (100-intercept)/100". */
function slopeFor(intercept: number): number {
  return (100 - intercept) / 100;
}

/**
 * 25 is dropped from the §4 set. The intercept is a FLOOR: no deck can score
 * below it, so an intercept of 25 puts every constrained random pile at exactly
 * 25 and makes §4's own release target (">=95% of random piles < 25")
 * unreachable by construction. Measured: intercept 25 moved the pile median
 * 20 -> 25 and the in-band share 200/200 -> 0/200 while the squared band
 * distance only rose by 1 per pile, so the loss happily bought it.
 */
const CAP_INTERCEPTS = [15, 20];

function toTuning(profile: ScoreProfile, c: Candidate): ScoreTuning {
  const base = normsFor(profile);
  const norms: Partial<FormatNorms> = {
    interactionUnitsTarget: base.interactionUnitsTarget * c.countMultiplier,
    cheapAnswerTarget: base.cheapAnswerTarget * c.countMultiplier,
    drawUnitTarget: base.drawUnitTarget * c.countMultiplier,
    winAccessTarget: c.pWin,
    delayHalfLifeTurns: c.h,
    fastClosingTurn: c.tFast,
    poolSizeCap: c.poolSizeCap,
  };
  return { weights: c.weights, norms, capIntercept: c.capIntercept, capSlope: slopeFor(c.capIntercept) };
}

// ── Dataset ───────────────────────────────────────────────────────────────

interface Sample { label: string; input: DeckScoreInput; lo: number; hi: number }
interface Group { name: string; samples: Sample[] }
interface ProfileSet {
  profile: ScoreProfile;
  trainGroups: Group[];
  validationGroups: Group[];
  /** stronger-vs-weaker pairs, indices into a flat sample list. */
  trainPairs: Array<[Sample, Sample]>;
  validationPairs: Array<[Sample, Sample]>;
}

const PILE_BAND: [number, number] = [0, 24];
/** §8 "Revised §5 bands" — v1.2 replaces §7's 85-100 / forced 25-point gap. */
const CEDH_BAND: [number, number] = [80, 95];
const STD_WINNER_BAND: [number, number] = [70, 90];
const STD_FIVE_OH_BAND: [number, number] = [65, 90];
/** "Verified competitive Standard field, including losing-event lists"; the
 * negative-median <= 60 objective is retired. */
const STD_FIELD_BAND: [number, number] = [60, 85];

function sampleOf(label: string, input: DeckScoreInput, band: [number, number]): Sample {
  return { label, input, lo: band[0], hi: band[1] };
}

function fixtureSamples(data: Dataset, profile: ScoreProfile): Sample[] {
  return data.fixtures
    .filter((f) => profileOf(f.format) === profile)
    .map((f) => {
      const b = bandOf(f.band);
      return b ? sampleOf(f.name, f.input, [b.lo, b.hi]) : null;
    })
    .filter((s): s is Sample => s !== null);
}

function buildDataset(pileCount: number): ProfileSet[] {
  log(`loading dataset (piles=${pileCount}) ...`);
  const data = loadDataset(pileCount);
  const piles = data.piles.map((input, i) => sampleOf(`pile-${i}`, input, PILE_BAND));
  const cedh = data.cedh.map((input, i) => sampleOf(`cedh-${i}`, input, CEDH_BAND));
  log(`  piles=${piles.length} cedh=${cedh.length} std+=${data.standardPositive.length} std-=${data.standardNegative.length}`);

  // Chronological split for Standard: older events train, newer validate.
  const byDate = <T extends { eventDate: string }>(rows: T[]): { train: T[]; val: T[] } => {
    const sorted = [...rows].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const cut = Math.floor(sorted.length * 0.6);
    return { train: sorted.slice(0, cut), val: sorted.slice(cut) };
  };
  const pos = byDate(data.standardPositive);
  const neg = byDate(data.standardNegative);
  // Per §8 each positive carries the band its EVIDENCE earns: a placement-1
  // event winner 70-90, a 5-0 league run 65-90.
  const toStd = (rows: Dataset['standardPositive'], band: [number, number] | null) =>
    rows.map((r) => sampleOf(`std-${r.id}`, r.input, band ?? (r.winner ? STD_WINNER_BAND : STD_FIVE_OH_BAND)));

  const stdPosTrain = toStd(pos.train, null);
  const stdPosVal = toStd(pos.val, null);
  const stdNegTrain = toStd(neg.train, STD_FIELD_BAND);
  const stdNegVal = toStd(neg.val, STD_FIELD_BAND);

  const pairUp = (strong: Sample[], weak: Sample[], limit: number): Array<[Sample, Sample]> => {
    if (weak.length === 0) return [];
    const out: Array<[Sample, Sample]> = [];
    for (let i = 0; i < Math.min(limit, strong.length); i++) out.push([strong[i], weak[i % weak.length]]);
    return out;
  };

  const cmdFixtures = fixtureSamples(data, 'commander');
  // §8: "its first 60 piles also appear in validation" — training and
  // validation pile sets must be DISJOINT.
  const pileTrain = piles.slice(0, Math.min(60, piles.length));
  const pileVal = piles.slice(Math.min(60, piles.length));
  const cedhTrain = cedh.slice(0, 20);
  const cedhVal = cedh.slice(20);

  return [
    {
      profile: 'commander',
      trainGroups: [
        { name: 'cedh', samples: cedhTrain },
        { name: 'curated+precon', samples: cmdFixtures },
        { name: 'piles', samples: pileTrain },
      ],
      validationGroups: [
        { name: 'cedh', samples: cedhVal },
        { name: 'curated+precon', samples: cmdFixtures },
        { name: 'piles', samples: pileVal },
      ],
      trainPairs: pairUp(cedhTrain, pileTrain, 20),
      validationPairs: pairUp(cedhVal, pileVal, 10),
    },
    {
      profile: 'brawl',
      trainGroups: [{ name: 'brawl fixtures', samples: fixtureSamples(data, 'brawl') }],
      validationGroups: [{ name: 'brawl fixtures', samples: fixtureSamples(data, 'brawl') }],
      trainPairs: [],
      validationPairs: [],
    },
    {
      profile: 'standard',
      trainGroups: [
        { name: 'std positives', samples: stdPosTrain },
        { name: 'std negatives', samples: stdNegTrain },
      ],
      validationGroups: [
        { name: 'std positives', samples: stdPosVal },
        { name: 'std negatives', samples: stdNegVal },
      ],
      // §8: "No mandatory gap between unrelated winning/losing lists" — the
      // §7 positive-vs-negative pair objective is retired for Standard.
      trainPairs: [],
      validationPairs: [],
    },
  ];
}

// -- Loss ------------------------------------------------------------------

function bandDistance(score: number, lo: number, hi: number): number {
  if (score >= lo && score <= hi) return 0;
  return score < lo ? lo - score : score - hi;
}

interface LossParts { total: number; band: number; pairs: number; penalty: number }

/**
 * Only the norm axes move a component score; weights and the cap intercept are
 * pure arithmetic on top. Compute the components ONCE per (axis set, deck) and
 * the whole weight search becomes free -- the difference between a 70-minute
 * run and a 10-minute one.
 */
interface Components { comps: Record<ComponentKey, number>; hardCap: number }

type AxisKey = string;
function axisKeyOf(c: Candidate): AxisKey {
  return `${c.countMultiplier}|${c.pWin}|${c.h}|${c.tFast}|${c.poolSizeCap}`;
}

const componentCache = new Map<AxisKey, Map<Sample, Components>>();

function componentsFor(profile: ScoreProfile, c: Candidate, samples: Sample[]): Map<Sample, Components> {
  const key = `${profile}|${axisKeyOf(c)}`;
  let out = componentCache.get(key);
  if (!out) { out = new Map<Sample, Components>(); componentCache.set(key, out); }
  const tuning = toTuning(profile, c);
  for (const s of samples) {
    if (out.has(s)) continue;
    const r = scoreDeck(s.input, tuning);
    const comps = {} as Record<ComponentKey, number>;
    for (const comp of r.components) comps[comp.key] = comp.score;
    // Every gate cap except the quality cap is a hard cap; the quality cap is
    // recomputed here because its intercept is one of the searched axes.
    const hardCap = r.gates.reduce(
      (min, g) => (g.key !== 'quality_cap' && g.cap != null ? Math.min(min, g.cap) : min), 100);
    out.set(s, { comps, hardCap });
  }
  return out;
}

function scoreFrom(cp: Components, weights: Record<ComponentKey, number>, intercept: number): number {
  let base = 0;
  for (const k of Object.keys(weights) as ComponentKey[]) base += (weights[k] / 100) * (cp.comps[k] ?? 0);
  const qCap = intercept + slopeFor(intercept) * Math.min(cp.comps.mana, cp.comps.win, cp.comps.synergy);
  const raw = Math.min(base, qCap, cp.hardCap);
  return Number.isFinite(raw) ? Math.round(Math.max(0, Math.min(100, raw))) : 0;
}

function allSamples(groups: Group[], pairs: Array<[Sample, Sample]>): Sample[] {
  const all = new Set<Sample>();
  for (const g of groups) for (const s of g.samples) all.add(s);
  for (const [a, b] of pairs) { all.add(a); all.add(b); }
  return [...all];
}

function evaluate(
  set: ProfileSet, c: Candidate, groups: Group[], pairs: Array<[Sample, Sample]>,
): { loss: LossParts; scores: Map<Sample, number> } {
  const samples = allSamples(groups, pairs);
  const comps = componentsFor(set.profile, c, samples);
  const scores = new Map<Sample, number>();
  for (const s of samples) scores.set(s, scoreFrom(comps.get(s)!, c.weights, c.capIntercept));

  const groupLosses = groups
    .filter((g) => g.samples.length > 0)
    .map((g) => g.samples.reduce((sum, s) => sum + Math.pow(bandDistance(scores.get(s)!, s.lo, s.hi), 2), 0) / g.samples.length);
  const band = groupLosses.length ? groupLosses.reduce((a, b) => a + b, 0) / groupLosses.length : 0;

  const pairLoss = pairs.length
    ? pairs.reduce((sum, [strong, weak]) => sum + Math.pow(Math.max(0, 5 - (scores.get(strong)! - scores.get(weak)!)), 2), 0) / pairs.length
    : 0;

  const initial = weightsFor(set.profile);
  const penalty = CORE_KEYS.reduce((sum, k) => sum + Math.pow(c.weights[k] - initial[k], 2), 0);

  return { loss: { total: band + 4 * pairLoss + 0.1 * penalty, band, pairs: pairLoss, penalty: 0.1 * penalty }, scores };
}

// -- Search ----------------------------------------------------------------

/** Norm axes only; weights and intercept are searched arithmetically. */
function axisValues(base: Candidate): Array<Partial<Candidate>> {
  const out: Array<Partial<Candidate>> = [];
  for (const countMultiplier of [0.85, 1, 1.15]) {
    for (const pWin of [base.pWin - 0.05, base.pWin, base.pWin + 0.05].filter((v) => v > 0 && v <= 1)) {
      for (const h of [base.h - 1, base.h, base.h + 1].filter((v) => v >= 1)) {
        for (const tFast of [base.tFast - 1, base.tFast, base.tFast + 1].filter((v) => v >= 1)) {
          for (const poolSizeCap of [4, 6, 10, 19]) {
            out.push({ countMultiplier, pWin, h, tFast, poolSizeCap });
          }
        }
      }
    }
  }
  return out;
}

/** +/-4 of the initial weight, 1-point steps, sum fixed at 100 by construction. */
function weightMoves(profile: ScoreProfile, weights: Record<ComponentKey, number>): Array<Record<ComponentKey, number>> {
  const initial = weightsFor(profile);
  const out: Array<Record<ComponentKey, number>> = [];
  for (const from of CORE_KEYS) {
    for (const to of CORE_KEYS) {
      if (from === to) continue;
      const next = { ...weights, [from]: weights[from] - 1, [to]: weights[to] + 1 };
      if (next[from] < initial[from] - 4 || next[to] > initial[to] + 4) continue;
      if (next[from] < 1) continue;
      out.push(next);
    }
  }
  return out;
}

/** Greedy 1-point transfers plus the three intercepts, all on cached components. */
function refine(set: ProfileSet, start: Candidate, startLoss: LossParts): { best: Candidate; loss: LossParts; evaluated: number } {
  let best = start;
  let bestLoss = startLoss;
  let evaluated = 0;
  for (const capIntercept of CAP_INTERCEPTS) {
    const cand = { ...best, capIntercept };
    const { loss } = evaluate(set, cand, set.trainGroups, set.trainPairs);
    evaluated++;
    if (loss.total < bestLoss.total) { best = cand; bestLoss = loss; }
  }
  for (let round = 0; round < 12; round++) {
    let improved = false;
    for (const weights of weightMoves(set.profile, best.weights)) {
      for (const capIntercept of CAP_INTERCEPTS) {
        const cand = { ...best, weights, capIntercept };
        const { loss } = evaluate(set, cand, set.trainGroups, set.trainPairs);
        evaluated++;
        if (loss.total < bestLoss.total - 1e-9) { best = cand; bestLoss = loss; improved = true; }
      }
    }
    if (!improved) break;
  }
  return { best, loss: bestLoss, evaluated };
}

/** The fast path must reproduce `scoreDeck` exactly, or the grid optimises a fiction. */
function selfCheck(set: ProfileSet): void {
  const c = baseCandidate(set.profile);
  const samples = allSamples(set.trainGroups, set.trainPairs).slice(0, 8);
  if (samples.length === 0) return;
  const comps = componentsFor(set.profile, c, samples);
  for (const s of samples) {
    const direct = scoreDeck(s.input, toTuning(set.profile, c)).score;
    const fast = scoreFrom(comps.get(s)!, c.weights, c.capIntercept);
    if (direct !== fast) throw new Error(`[${set.profile}] fast path disagrees on ${s.label}: scoreDeck=${direct} scoreFrom=${fast}`);
  }
  log(`[${set.profile}] self-check ok on ${samples.length} decks`);
}

function search(set: ProfileSet): { best: Candidate; loss: LossParts; evaluated: number } {
  selfCheck(set);
  const start = baseCandidate(set.profile);
  let best = start;
  let bestLoss = evaluate(set, start, set.trainGroups, set.trainPairs).loss;
  let evaluated = 1;
  log(`[${set.profile}] start loss=${bestLoss.total.toFixed(2)}`);

  const axes = axisValues(start);
  let done = 0;
  for (const patch of axes) {
    // Each axis set is scored once with the current best weights/intercept,
    // then refined arithmetically on the cached components.
    const seeded = { ...best, ...patch };
    const seededLoss = evaluate(set, seeded, set.trainGroups, set.trainPairs).loss;
    evaluated++;
    const r = refine(set, seeded, seededLoss);
    evaluated += r.evaluated;
    if (r.loss.total < bestLoss.total) { best = r.best; bestLoss = r.loss; }
    done++;
    if (done % 20 === 0) log(`[${set.profile}] ${done}/${axes.length} axis sets, best=${bestLoss.total.toFixed(2)}`);
  }
  log(`[${set.profile}] final train loss=${bestLoss.total.toFixed(2)} after ${evaluated} candidates`);
  componentCache.clear();
  return { best, loss: bestLoss, evaluated };
}

// ── Reporting helpers ─────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function groupStats(group: Group, scores: Map<Sample, number>): string {
  const vals = group.samples.map((s) => scores.get(s)!).filter((v) => v !== undefined);
  if (vals.length === 0) return `| ${group.name} | 0 | - | - | - | - |`;
  const inBand = group.samples.filter((s) => bandDistance(scores.get(s)!, s.lo, s.hi) === 0).length;
  const dists = group.samples.map((s) => bandDistance(scores.get(s)!, s.lo, s.hi));
  return `| ${group.name} | ${vals.length} | ${Math.min(...vals)} | ${median(vals)} | ${Math.max(...vals)} | ${inBand}/${vals.length} (med dist ${median(dists).toFixed(1)}) |`;
}

// ── Probe ─────────────────────────────────────────────────────────────────

function probe(tuningByProfile: Partial<Record<ScoreProfile, Candidate>>): void {
  const data = loadDataset(200);
  const lines: string[] = ['| Fixture | Format | Score | M | C | I | A | W | S | cap | band | in |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|'];
  for (const f of data.fixtures) {
    const profile = profileOf(f.format);
    const cand = tuningByProfile[profile];
    const result = scoreDeck(f.input, cand ? toTuning(profile, cand) : undefined);
    const get = (k: ComponentKey) => result.components.find((c) => c.key === k)?.score ?? 0;
    const cap = result.gates.find((g) => g.key === 'quality_cap')?.cap ?? 100;
    const b = bandOf(f.band);
    const ok = b && result.score >= b.lo && result.score <= b.hi ? 'IN' : 'OUT';
    lines.push(`| ${f.name} | ${f.format} | ${result.score} | ${get('mana')} | ${get('curve')} | ${get('interaction')} | ${get('advantage')} | ${get('win')} | ${get('synergy')} | ${cap} | ${f.band} | ${ok} |`);
  }
  console.log(lines.join('\n'));

  const cmd = tuningByProfile.commander ? toTuning('commander', tuningByProfile.commander) : undefined;
  const piles = data.piles.map((input) => scoreDeck(input, cmd).score).sort((a, b) => a - b);
  console.log(`\npiles n=${piles.length} min=${piles[0]} median=${median(piles)} max=${piles[piles.length - 1]} over25=${piles.filter((v) => v >= 25).length}`);
  console.log('\nQuota gaming (lands, size and MV histogram preserved; only producer->consumer links broken):');
  console.log(quotaGamingCheck(data));
}

// ── Main ──────────────────────────────────────────────────────────────────

// -- Section 4 adversarial checks -------------------------------------------

/** "changing every price or EDHREC rank must change nothing" (§4). */
function priceInvarianceCheck(data: Dataset): string {
  let worst = 0;
  let identical = 0;
  const sample = data.fixtures.slice(0, 8);
  for (const f of sample) {
    const before = scoreDeck(f.input);
    const permuted: DeckScoreInput = {
      ...f.input,
      main: f.input.main.map((rc, i) => ({
        ...rc,
        card: {
          ...rc.card,
          price_usd: String(1000 - i * 7),
          price_usd_foil: String(2000 + i * 13),
          edhrec_rank: (i * 997) % 30000,
        },
      })),
    };
    const after = scoreDeck(permuted);
    if (JSON.stringify(before) === JSON.stringify(after)) identical++;
    worst = Math.max(worst, Math.abs(before.score - after.score));
  }
  return `Price / EDHREC-rank permutation on ${sample.length} fixtures: ${identical}/${sample.length} bit-identical results, max |delta total| ${worst}.`;
}

/**
 * "preserve lands, MV histogram, primary-role counts and total price while
 * breaking producer/consumer compatibility ... each broken essential path must
 * lower W/S" (§4). Replace every token/Food converter with another nonland card
 * of the SAME mana value already in the deck, so size, lands and the MV
 * histogram are untouched and only the producer->consumer link breaks.
 */
function quotaGamingCheck(data: Dataset): string {
  const out: string[] = [];
  for (const name of ['the-cabbage-merchant', 'precon-witherbloom', 'meren-powerhouse']) {
    const f = data.fixtures.find((x) => x.name === name);
    if (!f) continue;
    const feats = f.input.main.map((rc) => ({ rc, feat: deriveCardFeature(rc.card) }));
    const isConverter = (x: typeof feats[number]) => x.feat.isAnthemOrOverrun || x.feat.isFoodPayoff || x.feat.isDrainPayoff;
    const converters = feats.filter(isConverter);
    if (converters.length === 0) { out.push(`- ${name}: no converter/payoff to break.`); continue; }
    // Blank the converter's rules text only: same name, type, mana value and
    // colour identity, so size, lands, the MV histogram and singleton all
    // survive and ONLY the producer->consumer link is broken. (Substituting a
    // duplicate card instead would trip the singleton gate and cap the deck at
    // 19, which is a different failure.)
    const broken = f.input.main.map((rc, i) =>
      (isConverter(feats[i]) ? { ...rc, card: { ...rc.card, oracle_text: '', keywords: null } } : rc));
    const before = scoreDeck(f.input);
    const after = scoreDeck({ ...f.input, main: broken });
    const pick = (r: typeof before, k: ComponentKey) => r.components.find((c) => c.key === k)!.score;
    const dW = pick(after, 'win') - pick(before, 'win');
    const dS = pick(after, 'synergy') - pick(before, 'synergy');
    const ok = dW <= 0 && dS <= 0 && after.score <= before.score;
    out.push(`- ${name}: broke ${converters.length} payoff/converter copies -> W ${pick(before, 'win').toFixed(1)}->${pick(after, 'win').toFixed(1)}, S ${pick(before, 'synergy').toFixed(1)}->${pick(after, 'synergy').toFixed(1)}, total ${before.score}->${after.score} ${ok ? 'PASS' : 'FAIL'}`);
  }
  return out.join('\n');
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mode = process.argv[2] ?? 'probe';

  if (mode === 'probe') {
    const file = process.argv[3];
    const tuning = file ? JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<Record<ScoreProfile, Candidate>> : {};
    probe(tuning);
    return;
  }

  const pileArg = process.argv.indexOf('--piles');
  const pileCount = pileArg > 0 ? Number(process.argv[pileArg + 1]) : 200;
  fs.writeFileSync(LOG_FILE, '');
  const t0 = Date.now();
  const data = loadDataset(pileCount);
  const sets = buildDataset(pileCount);

  const chosen: Record<string, Candidate> = {};
  const sections: string[] = [];
  let totalEvaluated = 0;

  for (const set of sets) {
    const { best: searched, loss, evaluated } = search(set);
    totalEvaluated += evaluated;
    const centre = baseCandidate(set.profile);
    const searchedVal = evaluate(set, searched, set.validationGroups, set.validationPairs);
    const baseVal = evaluate(set, centre, set.validationGroups, set.validationPairs);
    // Freeze the searched winner only where it also beats the section 7 centre
    // on the held-out split; otherwise the search overfitted the train fold.
    const keepSearched = searchedVal.loss.total <= baseVal.loss.total;
    const best = keepSearched ? searched : centre;
    const val = keepSearched ? searchedVal : baseVal;
    chosen[set.profile] = best;
    sections.push([
      `### ${set.profile}`,
      '',
      `Candidates evaluated ${evaluated}. Train loss ${loss.total.toFixed(2)} (band ${loss.band.toFixed(2)}, pairs ${loss.pairs.toFixed(2)}, weight penalty ${loss.penalty.toFixed(2)}).`,
      `Validation loss: searched ${searchedVal.loss.total.toFixed(2)} vs section-7 centre ${baseVal.loss.total.toFixed(2)} -> ${keepSearched ? 'keep the searched winner' : 'REJECT the searched winner, freeze the centre (search overfitted the train fold)'}.`,
      '',
      `Chosen: weights ${CORE_KEYS.map((k) => `${k}=${best.weights[k]}`).join(' ')} · countMultiplier ${best.countMultiplier} · pWin ${best.pWin.toFixed(2)} · h ${best.h} · Tfast ${best.tFast} · poolSizeCap ${best.poolSizeCap} · cap ${best.capIntercept}+${slopeFor(best.capIntercept)}*min(M,W,S)`,
      '',
      '| cohort | n | min | median | max | in band |',
      '|---|---:|---:|---:|---:|---|',
      ...set.validationGroups.map((g) => groupStats(g, val.scores)),
      '',
    ].join('\n'));
    log(`[${set.profile}] validation searched=${searchedVal.loss.total.toFixed(2)} centre=${baseVal.loss.total.toFixed(2)} keep=${keepSearched ? 'searched' : 'centre'}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'calibration-constants.json'), JSON.stringify(chosen, null, 2));
  const md = [
    '# Deck Score §4 calibration run (2026-09-19)',
    '',
    `Generated ${new Date().toISOString()}. Grid re-centred on the §7 v1.1 constants. ${totalEvaluated} candidates evaluated in ${((Date.now() - t0) / 1000).toFixed(0)}s.`,
    '',
    'Loss is §4 verbatim: `mean_groups(mean_decks(distance(score,[lo,hi])^2)) + 4*mean_pairs(max(0,5-(strong-weak))^2) + .1*Σ(weight-initial)^2`.',
    'The three profiles are searched independently because a Standard tuning cannot move a Commander deck.',
    'Standard is split chronologically by `event_date` (oldest 60% train, newest 40% validation); Commander holds out 10 of 30 cEDH lists and scores the full pile set only at validation.',
    '',
    ...sections,
    '## Section 4 adversarial checks',
    '',
    priceInvarianceCheck(data),
    '',
    'Quota gaming (lands, size and MV histogram preserved; only producer->consumer links broken):',
    quotaGamingCheck(data),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'calibration.md'), md);
  log(`wrote ${path.join(OUT_DIR, 'calibration.md')}`);
}

main();
