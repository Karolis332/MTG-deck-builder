/**
 * Deck Score v1.2 — S / pile-separation diagnostic. docs/DECK_SCORE_SPEC.md §8.
 *
 * For the 20 highest-S constrained-random piles plus the named anchors, print
 * the selected recipe, per-role supply/credit, R's weakest essential, B, and
 * the 10 cards that contributed the most Q mass. Read-only: no scoring
 * constant is touched here.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-pile-diag.ts [topN]
 */
import { scoreDeck, type DeckScoreInput } from '../src/lib/deck-score';
import { selectPlan, evaluatePlan, evaluateClosing, planFit, recipesFor, qBaselineFor, PLAN_RECIPES, PLAN_BAND_REFERENCE }
  from '../src/lib/deck-score-plans';
import { profileOf } from '../src/lib/deck-score-norms';
import { computeSynergy } from '../src/lib/deck-score-synergy';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import type { DeckEntry } from '../src/lib/deck-score-mana';
import { loadDataset, loadRandomPiles } from './deck-score-fixtures';
import { loadMatchedPiles, loadCohortPiles, type SampleCohort } from './deck-score-piles';
import { typalTheme, typalRecipe } from '../src/lib/deck-score-plans';
import { normsFor } from '../src/lib/deck-score-norms';
import { computeInteraction, computeAdvantage } from '../src/lib/deck-score-interaction';
import { winDiagnostic, computeWin } from '../src/lib/deck-score-win';
import { producerUtilisation } from '../src/lib/deck-score-producers';

const TOP = Number(process.argv[2] ?? 20);

function entriesOf(input: DeckScoreInput): { N: number; all: DeckEntry[]; nonLand: DeckEntry[]; cmd: DeckEntry[] } {
  const all: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
  const cmd: DeckEntry[] = input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
  return { N: all.reduce((s, e) => s + e.quantity, 0), all, nonLand: all.filter((e) => !e.feature.isLand), cmd };
}

function diag(label: string, input: DeckScoreInput): string {
  const { N, all, nonLand, cmd } = entriesOf(input);
  const plan = selectPlan(Math.max(1, N), nonLand, cmd);
  const syn = computeSynergy(plan, N, all);
  const scale = N / PLAN_BAND_REFERENCE;
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);

  const roleLines = plan.roles.map((r) => {
    const tag = r.role.essential ? 'ESS' : r.role.infrastructure ? 'inf' : '   ';
    const ratio = r.required > 0 ? (r.supply / r.required).toFixed(2) : 'n/a';
    return `    ${tag} ${r.role.key.padEnd(14)} supply ${String(r.supply).padStart(3)} / req ${r.required.toFixed(1).padStart(5)} (${ratio})  credited ${r.credited.toFixed(1)} (max ${(r.role.max * scale).toFixed(1)})`;
  });

  // Which cards carry the Q mass: replay the same first-match assignment.
  const contrib: Array<{ name: string; role: string; q: number; c: number; pw: number | null }> = [];
  for (const e of nonLand) {
    if (e.feature.s < 1) continue;
    const role = plan.recipe.roles.find((r) => r.fills(e.feature));
    if (!role) continue;
    contrib.push({ name: e.feature.card.name, role: role.key, q: e.quantity, c: e.feature.c, pw: e.feature.power });
  }
  const byRole = new Map<string, number>();
  for (const c of contrib) byRole.set(c.role, (byRole.get(c.role) ?? 0) + c.q);
  const top = contrib.slice().sort((a, b) => b.q - a.q || a.c - b.c).slice(0, 10);

  // §9 decision 3 / §9.6 step 4: per-producer utilisation, the term that
  // replaced B. `u` rows are only emitted for copies whose output is CHARGED
  // — everything reaching a direct plan use is u = 1 and is left out.
  const util = producerUtilisation(nonLand, cmd);
  const scored = scoreDeck(input);
  const W = scored.components.find((c) => c.key === 'win')?.score ?? 0;
  const utilLines = util.rows.length === 0
    ? ['    (no charged production: every producer reaches a direct plan use)']
    : util.rows.slice(0, 12).map((r) =>
      `    u=${r.u.toFixed(2)} ${r.name.slice(0, 28).padEnd(28)} ${r.side} ${r.resource}`
      + ` served ${r.servedOutput.toFixed(1)}/${r.fixedUsefulOutput.toFixed(1)} via ${r.route}`);

  return [
    `## ${label}`,
    `  N=${N} F=${F} recipe=${plan.recipe.key} essFrac=${plan.essentialFraction.toFixed(2)}`,
    `  S=${syn.score.toFixed(1)}  Q=${plan.Q.toFixed(3)}  R=${plan.R.toFixed(3)}  B=${syn.B.toFixed(3)} (legacy)  U=${syn.U.toFixed(3)}  W=${W.toFixed(1)}  total=${scored.score}  weakest=${plan.weakest.key} ${plan.weakest.supply.toFixed(1)}/${plan.weakest.required.toFixed(1)}`,
    ...roleLines,
    `  producer utilisation (${util.rows.length} charged, ${util.rows.filter((r) => r.u === 0).length} stranded):`,
    ...utilLines,
    `  assigned copies by role: ${[...byRole].map(([k, v]) => `${k}=${v}`).join(' ')}`,
    `  top Q cards: ${top.map((t) => `${t.name}[${t.role} c${t.c} p${t.pw ?? '-'}]`).join(', ')}`,
  ].join('\n');
}

/** `--plans <fixture>`: every recipe's fit side by side, including the closing
 * recipe the win line derives — the only way to see WHY one won. */
function plans(name: string): void {
  const ds = loadDataset(200);
  const hit = ds.fixtures.find((f) => f.name === name);
  if (!hit) { console.log(`no fixture ${name}`); return; }
  const { N, nonLand, cmd } = entriesOf(hit.input);
  const rows = PLAN_RECIPES.map((r) => evaluatePlan(r, Math.max(1, N), nonLand, cmd));
  const theme = typalTheme([...nonLand, ...cmd].map((e) => e.feature));
  if (theme.tribes.length > 0 || theme.artifacts || theme.party) {
    console.log(`theme: tribes=[${theme.tribes.join(',')}] artifacts=${theme.artifacts} party=${theme.party}`);
    rows.push(evaluatePlan(typalRecipe(theme), Math.max(1, N), nonLand, cmd));
  } else console.log('theme: none');
  console.log(`## ${name} — N=${N}`);
  console.log('| recipe | Q | R | fit | essFrac | empty | weakest |');
  console.log('|---|---:|---:|---:|---:|---|---|');
  for (const e of rows.sort((a, b) => planFit(b) - planFit(a))) {
    console.log(`| ${e.recipe.key} | ${e.Q.toFixed(3)} | ${e.R.toFixed(3)} | ${planFit(e).toFixed(3)} | ${e.essentialFraction.toFixed(2)} | ${e.hasEmptyEssential ? 'yes' : 'no'} | ${e.weakest.key} ${e.weakest.supply}/${e.weakest.required.toFixed(1)} |`);
  }
  console.log(diag(name, hit.input));
}

/**
 * `--control <commander substring> [--cohort holdout|training]`: the same
 * per-recipe table for ONE matched negative control, plus the closing plan the
 * §9.5 fold-in would compare against it. A pile that reads `combo` is an
 * acceptance failure, and this is the only way to see whether the cause is the
 * line W assembled or the floor the other recipes answer to.
 */
function control(needle: string, cohort: SampleCohort): void {
  const piles = loadCohortPiles(cohort, 1000, 0.93);
  const matches = piles.filter((p) => p.commander.toLowerCase().includes(needle.toLowerCase()) || p.sampleId === needle);
  if (matches.length === 0) { console.log(`no ${cohort} control matching "${needle}"`); return; }
  // The round-robin order gives one pile per commander per pass, so a
  // commander appears up to ten times with ten different seeds. Summarise them
  // all, then open the one that reads `combo` (the acceptance failure) or the
  // first otherwise.
  for (const p of matches) {
    const scored = scoreDeck(p.input);
    console.log(`- sample ${p.sampleId}: total ${scored.score}, ` +
      `S ${(scored.components.find((c) => c.key === 'synergy')?.score ?? 0).toFixed(1)}, ` +
      `${scored.components.find((c) => c.key === 'synergy')?.reason ?? ''}`);
  }
  const hit = matches.find((p) => p.sampleId === needle)
    ?? matches.find((p) => /supports combo;/.test(
      scoreDeck(p.input).components.find((c) => c.key === 'synergy')?.reason ?? ''))
    ?? matches[0];
  const { N, all, nonLand, cmd } = entriesOf(hit.input);
  const fmt = hit.input.format;
  const norms = normsFor(fmt);
  const util = producerUtilisation(nonLand, cmd);
  const inter = computeInteraction(fmt, norms, 'midrange', N, all);
  const adv = computeAdvantage(fmt, norms, 'midrange', N, all);
  const win = computeWin(fmt, norms, 'midrange', N, all, cmd.map((e) => e.feature), {
    E: inter.E, Estar: inter.Estar, D: adv.D, Dstar: adv.Dstar, hasDrawEngine: adv.hasDrawEngine,
  });
  const rows = recipesFor('commander').map((r) => evaluatePlan(r, Math.max(1, N), nonLand, cmd, util, 'commander'));
  if (win.closing) {
    rows.push(evaluateClosing(win.closing, nonLand, [], util, 'commander',
      win.closingLines.filter((l) => l.id !== win.closing?.id)));
  }
  const r = scoreDeck(hit.input);
  console.log(`## ${hit.commander} (sample ${hit.sampleId}, ${cohort}) — N=${N}, lands ${hit.lands}, ` +
    `total ${r.score}, S ${(r.components.find((c) => c.key === 'synergy')?.score ?? 0).toFixed(1)}, ` +
    `closing line ${win.closing?.id ?? 'none'}`);
  console.log(`W ${win.score.toFixed(1)} — ${win.reason}`);
  console.log(`closingLines: ${win.closingLines.map((l) => `${l.id} (${l.pieces.length} pieces, r=${l.required}, T${l.tStar})`).join(' | ') || 'none'}`);
  console.log('| recipe | Q | R | b | fit | essFrac | empty | weakest |');
  console.log('|---|---:|---:|---:|---:|---:|---|---|');
  for (const e of rows.sort((a, b) => planFit(b, 'commander') - planFit(a, 'commander'))) {
    console.log(`| ${e.recipe.key} | ${e.Q.toFixed(3)} | ${e.R.toFixed(3)} | ${qBaselineFor('commander', e.recipe.key).toFixed(3)} | ` +
      `${planFit(e, 'commander').toFixed(3)} | ${e.essentialFraction.toFixed(2)} | ${e.hasEmptyEssential ? 'yes' : 'no'} | ` +
      `${e.weakest.key} ${e.weakest.supply.toFixed(1)}/${e.weakest.required.toFixed(1)} |`);
  }
}

/** `--win <fixture>`: every W recipe with its pools, t* and u. */
function win(name: string): void {
  const ds = loadDataset(200);
  const hit = ds.fixtures.find((f) => f.name === name);
  if (!hit) { console.log(`no fixture ${name}`); return; }
  const { N, all, cmd } = entriesOf(hit.input);
  const fmt = hit.input.format;
  const norms = normsFor(fmt);
  const inter = computeInteraction(fmt, norms, 'midrange', N, all);
  const adv = computeAdvantage(fmt, norms, 'midrange', N, all);
  const cmdFeatures = cmd.map((e) => e.feature);
  console.log(winDiagnostic(fmt, norms, 'midrange', N, all, cmdFeatures, {
    E: inter.E, Estar: inter.Estar, D: adv.D, Dstar: adv.Dstar, hasDrawEngine: adv.hasDrawEngine,
  }));
  const q = (pred: (f: typeof all[number]['feature']) => boolean) =>
    all.filter((e) => pred(e.feature)).reduce((a, e) => a + e.quantity, 0);
  console.log(`sweepers ${q((f) => f.isSweeper)} cheapAnswers ${q((f) => f.answerAxes.length > 0 && f.c <= 3 && f.s >= 1)} drawEngines ${q((f) => f.isDrawEngine)} pw ${q((f) => /Planeswalker/.test(f.card.type_line || ''))} big ${q((f) => (f.power ?? 0) >= 4)}`);
}

const ANCHORS = [
  'meren-powerhouse', 'precon-witherbloom', 'standard-1445893-univerce', 'vivi-battery-arena',
  'kuja-genome-sorcerer-arena', 'fire-lord-azula-competitive', 'cedhtop16-ballooncon6',
  'the-cabbage-merchant', 'tazri-upgraded-arena', 'standard-1445867-aljce',
];

/** `--summary`: the two acceptance distributions plus the anchor S values, for
 * a fast iteration loop that does not rebuild the whole report. */
function summary(): void {
  const data = loadDataset(200);
  const S = (r: ReturnType<typeof scoreDeck>): number => r.components.find((c) => c.key === 'synergy')?.score ?? 0;
  const q = (v: number[], p: number): number => v[Math.min(v.length - 1, Math.round(p * (v.length - 1)))];
  const res = data.piles.map((p) => scoreDeck(p));
  const ss = res.map(S).sort((a, b) => a - b);
  const ts = res.map((r) => r.score).sort((a, b) => a - b);
  console.log(`piles S  min ${ss[0]} p50 ${q(ss, 0.5)} p90 ${q(ss, 0.9)} max ${ss[ss.length - 1]}  <=5: ${ss.filter((x) => x <= 5).length}/${ss.length}`);
  console.log(`piles T  min ${ts[0]} p50 ${q(ts, 0.5)} max ${ts[ts.length - 1]}  <25: ${ts.filter((x) => x < 25).length}/${ts.length}`);
  for (const n of ANCHORS) {
    const f = data.fixtures.find((x) => x.name === n);
    if (!f) { console.log(`${n} MISSING`); continue; }
    const r = scoreDeck(f.input);
    console.log(`${n.padEnd(30)} score ${String(r.score).padStart(3)}  S ${S(r).toFixed(1).padStart(5)}  ${r.components.find((c) => c.key === 'synergy')?.reason ?? ''}`);
  }
  const dist = (label: string, inputs: DeckScoreInput[]): void => {
    const rs = inputs.map((i) => scoreDeck(i));
    const sv = rs.map(S).sort((a, b) => a - b);
    const tv = rs.map((r) => r.score).sort((a, b) => a - b);
    // Read the plan off the SCORED reason, not selectPlan: only scoreDeck
    // folds in the closing recipe, so selectPlan cannot see a `combo` read.
    const plans = new Map<string, number>();
    for (const r of rs) {
      const key = /supports (\w+)/.exec(r.components.find((c) => c.key === 'synergy')?.reason ?? '')?.[1] ?? 'none';
      plans.set(key, (plans.get(key) ?? 0) + 1);
    }
    console.log(`${label} n=${inputs.length} S p10 ${q(sv, 0.1)} p50 ${q(sv, 0.5)} p90 ${q(sv, 0.9)} | total p50 ${q(tv, 0.5)} | plans ${[...plans].map(([k, v]) => `${k}=${v}`).join(' ')}`);
  };
  dist('cEDH  ', data.cedh);
  dist('stdPos', data.standardPositive.map((r) => r.input));
  dist('piles ', data.piles);
  const cedh = data.cedh.map((i) => scoreDeck(i).score).sort((a, b) => a - b);
  const sorted = [...data.standardPositive].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const held = sorted.slice(Math.floor(sorted.length * 0.6)).map((r) => scoreDeck(r.input).score).sort((a, b) => a - b);
  console.log(`cEDH median ${q(cedh, 0.5)} (n=${cedh.length}); held-out Standard positive median ${q(held, 0.5)} (n=${held.length})`);
}

/** `--cards <fixture>`: every nonland copy with the typed flags a recipe can
 * key off. The only way to design an engine recipe against reality. */
function cards(name: string): void {
  const data = loadDataset(200);
  const f = data.fixtures.find((x) => x.name === name);
  if (!f) { console.log(`no fixture ${name}`); return; }
  const { N, nonLand, cmd } = entriesOf(f.input);
  const plan = selectPlan(Math.max(1, N), nonLand, cmd, undefined, profileOf(f.input.format));
  console.log(`| q | card | c | pw | s | covered | role (${plan.recipe.key}) | type | flags |`);
  for (const e of nonLand) {
    const t = e.feature;
    const flags = Object.entries({
      ramp: t.isRamp, draw: t.isDraw, engine: t.isDrawEngine, tutor: t.isTutor, rem: t.isRemoval,
      wipe: t.isWipe, cs: t.isCounterspell, prot: t.isProtection, win: t.isWinConditionRole,
      food: t.isFoodProducer, foodP: t.isFoodPayoff, treas: t.isTreasureProducer, tok: t.isTokenProducer,
      ctok: t.isCreatureTokenProducer, tokP: t.isTokenPayoff, sac: t.isSacOutlet, drain: t.isDrainPayoff,
      dies: t.hasDiesTrigger, eq: t.isEquipmentOrAura, ev: t.hasKeywordEvasion, anthem: t.isAnthemOrOverrun,
      alt: t.isAltWin, pw: t.isPlaneswalker, dmg: t.isDirectDamage,
    }).filter(([, v]) => v).map(([k]) => k).join(' ');
    const role = t.s >= 1 && t.covered ? plan.recipe.roles.find((r) => r.fills(t))?.key ?? 'NONE' : 'gated';
    console.log(`| ${e.quantity} | ${t.card.name} | ${t.c} | ${t.power ?? ''} | ${t.s} | ${t.covered ? 'y' : 'N'} | ${role} | ${(t.card.type_line || '').split('—')[0].trim()} | ${flags} |`);
  }
}

/** `--worst`: for every positive Standard list with S = 0, which essential
 * role of the SELECTED recipe is empty. Tells a too-tight predicate from a
 * too-high floor. */
function worst(): void {
  const data = loadDataset(200);
  const tally = new Map<string, number>();
  let zero = 0;
  for (const row of data.standardPositive) {
    const { N, nonLand, cmd } = entriesOf(row.input);
    const plan = selectPlan(Math.max(1, N), nonLand, cmd);
    if (plan.R > 0) continue;
    zero += 1;
    for (const r of plan.roles) {
      if (!r.role.essential || r.supply > 0) continue;
      const k = `${plan.recipe.key}.${r.role.key}`;
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
  }
  console.log(`S=0 lists: ${zero}/${data.standardPositive.length}`);
  let shown = 0;
  for (const row of data.standardPositive) {
    const { N, nonLand, cmd } = entriesOf(row.input);
    if (selectPlan(Math.max(1, N), nonLand, cmd).R > 0 || shown >= 3) continue;
    shown += 1;
    console.log(diag(`stdPos ${row.id} (${row.eventDate})`, row.input));
    const unverified = nonLand.filter((e) => e.feature.s < 1).reduce((a, e) => a + e.quantity, 0);
    console.log(`  unverified copies: ${unverified} / ${nonLand.reduce((a, e) => a + e.quantity, 0)}`);
    console.log(`  cards: ${nonLand.map((e) => `${e.quantity}x ${e.feature.card.name}[c${e.feature.c}${e.feature.s < 1 ? ' s.5' : ''}]`).join(', ')}`);
  }
  for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  empty ${k}: ${v}`);
}

/** `--gaming <fixture>`: §4's quota-gaming operation (blank every payoff /
 * converter's rules text, keep name, type, MV and colour) side by side with
 * the untouched list, so Q / R / B / recipe can be compared term by term. */
function gaming(name: string): void {
  const data = loadDataset(200);
  const f = data.fixtures.find((x) => x.name === name);
  if (!f) { console.log(`no fixture ${name}`); return; }
  const feats = f.input.main.map((rc) => deriveCardFeature(rc.card));
  const isConverter = (x: typeof feats[number]) => x.isAnthemOrOverrun || x.isFoodPayoff || x.isDrainPayoff;
  const broken = {
    ...f.input,
    main: f.input.main.map((rc, i) => (isConverter(feats[i]) ? { ...rc, card: { ...rc.card, oracle_text: '', keywords: null } } : rc)),
  };
  console.log(`broken copies: ${f.input.main.filter((_, i) => isConverter(feats[i])).map((rc) => rc.card.name).join(', ')}`);
  console.log(diag(`${name} BEFORE`, f.input));
  console.log(diag(`${name} AFTER`, broken));
}

/** `--allplans <fixture>`: every candidate recipe's Q / R / fit side by side,
 * with the Q floor each one answers to (§9.2). The only way to tell "this deck
 * has no engine recipe" from "its engine recipe lost the ranking". */
function allPlans(name: string): void {
  const data = loadDataset(200);
  const f = data.fixtures.find((x) => x.name === name);
  if (!f) { console.log(`no fixture ${name}`); return; }
  const { N, nonLand, cmd } = entriesOf(f.input);
  const profile = profileOf(f.format);
  const util = producerUtilisation(nonLand, cmd);
  console.log(`${name} (${f.format}, N=${N}) — selected ${selectPlan(Math.max(1, N), nonLand, cmd, util, profile).recipe.key}`);
  console.log('| recipe | Q | R | b | fit | essFrac | emptyEssential | weakest |');
  console.log('|---|---:|---:|---:|---:|---:|---|---|');
  for (const recipe of recipesFor(profile)) {
    const e = evaluatePlan(recipe, Math.max(1, N), nonLand, cmd, util, profile);
    console.log(`| ${recipe.key} | ${e.Q.toFixed(3)} | ${e.R.toFixed(3)} | ${qBaselineFor(profile, recipe.key).toFixed(3)} | ` +
      `${planFit(e, profile).toFixed(3)} | ${e.essentialFraction.toFixed(2)} | ${e.hasEmptyEssential} | ` +
      `${e.weakest.key} ${e.weakest.supply.toFixed(1)}/${e.weakest.required.toFixed(1)} |`);
  }
}

/** `--pins`: the exact numbers the v1.3 regression tests pin, printed in the
 * shape they are pasted in. Re-run after any scoring change that is MEANT to
 * move them; a change that moves them silently is the bug the pins catch. */
function pins(): void {
  const piles = loadRandomPiles(20).map((input) => scoreDeck(input).score);
  console.log(`§5 piles 0-19 totals: [${piles.join(', ')}]`);
  const controls = loadMatchedPiles(10, 2000, 0xf00d0000, 0.93);
  console.log(`fresh matched controls 0-9 totals: [${controls.map((c) => scoreDeck(c.input).score).join(', ')}]`);
  console.log(`fresh matched controls commanders: ${controls.map((c) => c.commander).join(' | ')}`);
}

function main(): void {
  if (process.argv.includes('--pins')) { pins(); return; }
  const ai = process.argv.indexOf('--allplans');
  if (ai > 0) { allPlans(process.argv[ai + 1]); return; }
  const gi = process.argv.indexOf('--gaming');
  if (gi > 0) { gaming(process.argv[gi + 1]); return; }
  const coi = process.argv.indexOf('--control');
  if (coi > 0) {
    const chi = process.argv.indexOf('--cohort');
    control(process.argv[coi + 1], chi > 0 ? (process.argv[chi + 1] as SampleCohort) : 'holdout');
    return;
  }
  const wi = process.argv.indexOf('--win');
  if (wi > 0) { win(process.argv[wi + 1]); return; }
  const pi = process.argv.indexOf('--plans');
  if (pi > 0) { plans(process.argv[pi + 1]); return; }
  if (process.argv.includes('--worst')) { worst(); return; }
  if (process.argv.includes('--summary')) { summary(); return; }
  const ci = process.argv.indexOf('--cards');
  if (ci > 0) { cards(process.argv[ci + 1]); return; }
  const data = loadDataset(200);
  const scored = data.piles.map((input, i) => ({
    i, input,
    S: scoreDeck(input).components.find((c) => c.key === 'synergy')?.score ?? 0,
    total: scoreDeck(input).score,
  }));
  scored.sort((a, b) => b.S - a.S);

  const out: string[] = ['# S / pile diagnostic', ''];
  for (const p of scored.slice(0, TOP)) out.push(diag(`pile seed ${p.i} (S=${p.S}, total=${p.total})`, p.input), '');

  const named = process.argv.slice(2).filter((a) => !a.startsWith('-') && Number.isNaN(Number(a)));
  for (const name of named.length ? named : ['meren-powerhouse', 'precon-witherbloom', 'standard-1445893-univerce']) {
    const f = data.fixtures.find((x) => x.name === name);
    if (f) out.push(diag(`FIXTURE ${name}`, f.input), '');
  }
  // univerce lives in the fixture list under that name; if absent, fall back
  // to the newest Standard positive.
  console.log(out.join('\n'));
}

main();
