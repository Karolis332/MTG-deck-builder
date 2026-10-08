/**
 * Strongest decks a whole collection can build. Every owned commander gets a 100-card list
 * seeded from owned cards by the CF corpus (commander_card_stats inclusion rates); the
 * deck-climb swap search then maximises the objective in `best-deck-lib.ts`
 * (Deck Score + goldfish tempo/keep-7 − role-window penalty) until no swap improves it.
 *
 *   DB=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data
 *   MTG_DB_DIR=$DB npx tsx scripts/collection-best-deck.ts --source paper --format commander --out <dir> \
 *     [--shard i/n] [--passes 0|n] [--pick <dir> --top N] [--commanders "A|B"] [--games 300] \
 *     [--tempo-weight 10] [--keep-weight 5] [--role-weight 2] [--top-k 12] [--batch 6] [--epsilon 0.25] [--constraints <json>]
 *   MTG_DB_DIR=$DB npx tsx scripts/collection-best-deck.ts --report <dir> [--top 5]
 *
 * --constraints <json>: { "<commander>": { "lock": [...], "ban": [...] }, "*": { "ban": [...] } } — the
 * tuning hook for reviewer findings (locks are never swapped out, bans leave the pool).
 * --passes 0 scores the seeds only (the screen). --pick reads the best results already in <dir>
 * and climbs only the top N commanders, seeded from their previous lists. Each shard appends one
 * JSON line per commander to <out>/results-<shard>.jsonl, so a killed run keeps its progress.
 * Interactive version of the same engine: `npx tsx scripts/model-lab.ts` (local web page).
 */
import fs from 'fs';
import path from 'path';
import { climbDeck, type ClimbResult } from '../src/lib/deck-climb';
import type { GoldfishStats } from '../src/lib/goldfish-sim';
import type { DbCard } from '../src/lib/types';
import {
  DECK_SIZE, DEFAULT_WEIGHTS, MIN_GAIN_DEFAULT, basicsFor, buildPool, fromNames, identityOf, isCommander, isLand,
  legalPool, loadOwned, makeScorer, powerOf, seedDeck,
} from './best-deck-lib';
import type { DbCard as UnownedCard } from '../src/lib/types';
import { resolveCard as resolveUnowned } from './best-deck-lib';

const argv = process.argv.slice(2);
const arg = (k: string): string | undefined => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const num = (k: string, d: number): number => (arg(k) !== undefined ? Number(arg(k)) : d);

function runCommanders(): void {
  const source = arg('--source') ?? 'paper';
  const format = arg('--format') ?? 'commander';
  const out = arg('--out')!;
  const passes = num('--passes', 0);
  const weights = {
    tempo: num('--tempo-weight', DEFAULT_WEIGHTS.tempo), keep: num('--keep-weight', DEFAULT_WEIGHTS.keep),
    role: num('--role-weight', DEFAULT_WEIGHTS.role), games: num('--games', DEFAULT_WEIGHTS.games),
  };
  const [shard, shards] = (arg('--shard') ?? '0/1').split('/').map(Number);
  fs.mkdirSync(out, { recursive: true });

  const owned = loadOwned(source);
  const legal = legalPool(owned, format);
  let commanders = legal.filter((c) => isCommander(c, format));
  if (arg('--commanders')) {
    // "A|B" or @file (one name per line); names not in the owned pool resolve from the DB — the buy screen
    const v = arg('--commanders')!;
    const names = v.startsWith('@') ? fs.readFileSync(v.slice(1), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean) : v.split('|');
    const want = new Set(names);
    const ownedNames = new Set(legal.map((c) => c.name));
    const unowned = names.filter((n) => !ownedNames.has(n)).map((n) => resolveUnowned(n)).filter((c): c is UnownedCard => !!c && isCommander(c, format));
    commanders = [...legal.filter((c) => want.has(c.name)), ...unowned];
  }
  const picked = new Map<string, string[]>();
  if (arg('--pick')) {
    const best = readResults(arg('--pick')!).slice(0, num('--top', 10));
    best.forEach((r) => picked.set(r.commander, r.deck));
    commanders = commanders.filter((c) => picked.has(c.name));
  }
  const constraints: Record<string, { lock?: string[]; ban?: string[] }> = arg('--constraints')
    ? JSON.parse(fs.readFileSync(arg('--constraints')!, 'utf8'))
    : {};
  commanders = commanders.sort((a, b) => a.name.localeCompare(b.name)).filter((_, i) => i % shards === shard);

  const file = path.join(out, `results-${shard}.jsonl`);
  for (const commander of commanders) {
    const t0 = Date.now();
    const identity = identityOf(commander);
    const rules = constraints[commander.name] ?? {};
    const banned = new Set([...(constraints['*']?.ban ?? []), ...(rules.ban ?? [])]);
    const basics = basicsFor(identity, source, owned.cards);
    const pool = buildPool(commander, legal, banned);
    const scorer = makeScorer(format, commander, weights);

    const cf = seedDeck(commander, pool, basics);
    const seeds = [cf];
    const sleeved = owned.decks.get(commander.name);
    const previous = picked.get(commander.name);
    for (const names of [sleeved, previous].filter((x): x is string[] => !!x)) {
      // Banned or unowned names drop out; pad from the CF seed so the list still seeds the climb.
      const list = fromNames(names, pool, basics).cards;
      const padded = [...list, ...cf.filter((c) => !list.includes(c))].slice(0, DECK_SIZE);
      if (padded.length === DECK_SIZE) seeds.push(padded);
    }
    // Locked cards go in over the seed's last (least relevant) non-locked cards.
    const locked = new Set(rules.lock ?? []);
    const withLocks = seeds.map((s) => {
      const missing = fromNames([...locked].filter((n) => !s.some((c) => c.name === n)), pool, basics).cards;
      const keep = s.filter((c) => !locked.has(c.name)).slice(0, DECK_SIZE - locked.size);
      return [...keep, ...s.filter((c) => locked.has(c.name)), ...missing].slice(0, DECK_SIZE);
    }).filter((s) => s.length === DECK_SIZE);
    const seedLabels = ['cf', ...(sleeved ? ['sleeved'] : []), ...(previous ? ['previous'] : [])];
    const seedScored = withLocks.map((s) => scorer(s));
    const seedScores = seedScored.map((s) => s.objective);
    const start = withLocks[seedScores.indexOf(Math.max(...seedScores))];

    const climb: ClimbResult<DbCard> = passes > 0
      ? climbDeck(start, [...pool, ...basics], (d) => scorer(d).objective, {
        maxPasses: passes, topK: num('--top-k', 12), batch: num('--batch', 6), epsilon: num('--epsilon', MIN_GAIN_DEFAULT),
        repeatable: new Set(basics.map((b) => b.name)), locked,
      })
      : { deck: start, score: Math.max(...seedScores), swaps: [], passes: 0, converged: false, evaluations: seeds.length, stopProof: null };

    const final = scorer(climb.deck);
    const line = {
      commander: commander.name, identity: identity.join(''), source, format,
      objective: final.objective, seedObjective: Math.max(...seedScores), seededFrom: seedLabels[withLocks.indexOf(start)] ?? 'cf',
      score: final.model?.score ?? null, absoluteTotal: final.model?.absoluteTotal ?? null, rank: final.model?.rank ?? null,
      components: final.model?.components.map((c) => ({ key: c.key, score: Math.round(c.score), reason: c.reason })) ?? [],
      goldfish: final.gf, power: powerOf(climb.deck, commander), roles: final.roles, rolePenalty: final.rolePenalty,
      lands: climb.deck.filter(isLand).length,
      converged: climb.converged, passes: climb.passes, evaluations: climb.evaluations, swaps: climb.swaps,
      stopProof: climb.stopProof, deck: climb.deck.map((c) => c.name), ms: Date.now() - t0,
    };
    fs.appendFileSync(file, JSON.stringify(line) + '\n');
    const roleStr = (r: Record<string, number>): string => Object.entries(r).map(([k, v]) => `${k.replace('board_wipe', 'wipe').slice(0, 4)}${v}`).join(' ');
    const seedStr = seedScored.map((s, i) => `${seedLabels[i] ?? i} ${s.objective.toFixed(2)} [${roleStr(s.roles)} pen${s.rolePenalty}]`).join(' | ');
    process.stdout.write(`${commander.name}: ${line.objective.toFixed(2)} [${roleStr(final.roles)} pen${final.rolePenalty}] (seeds ${seedStr}; ${climb.swaps.length} swaps, ${line.ms} ms)\n`);
  }
}

interface ResultLine {
  commander: string; identity: string; objective: number; score: number | null; rank: number | null; absoluteTotal: number | null;
  components: { key: string; score: number; reason: string }[]; goldfish: GoldfishStats; power: { powerLevel: number; bracket: number };
  lands: number; converged: boolean; passes: number; swaps: unknown[]; deck: string[]; seededFrom: string; stopProof: unknown;
  roles?: Record<string, number>; rolePenalty?: number;
}

/** Latest line per commander across all shard files, best objective first. */
function readResults(dir: string): ResultLine[] {
  const latest = new Map<string, ResultLine>();
  for (const f of fs.readdirSync(dir).filter((x) => /^results-\d+\.jsonl$/.test(x))) {
    for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(l) as ResultLine;
      const prev = latest.get(r.commander);
      if (!prev || r.passes >= prev.passes) latest.set(r.commander, r);
    }
  }
  return [...latest.values()].sort((a, b) => b.objective - a.objective);
}

function report(dir: string): void {
  const top = num('--top', 5);
  const results = readResults(dir);
  const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pct = (x: number): string => `${Math.round(x * 100)}%`;
  const rows = results.slice(0, top).map((r, i) => {
    const counts = new Map<string, number>();
    r.deck.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
    const file = `top-${i + 1}-${slug(r.commander)}.txt`;
    fs.writeFileSync(path.join(dir, file), `Commander\n1 ${r.commander}\n\nDeck\n${[...counts].map(([n, q]) => `${q} ${n}`).join('\n')}\n`);
    const comp = Object.fromEntries(r.components.map((c) => [c.key, c.score]));
    const roles = r.roles ? `${r.roles.ramp}/${r.roles.draw}/${r.roles.removal}/${r.roles.board_wipe}/${r.roles.protection}${r.rolePenalty ? ` ⚠️${r.rolePenalty}` : ''}` : '-';
    return `| ${i + 1} | ${r.commander} | ${r.identity} | **${r.objective.toFixed(1)}** | ${r.score} | ${r.rank?.toFixed(0) ?? '-'} | ${r.power.powerLevel} / B${r.power.bracket} | ${comp.synergy} | ${comp.win} | ${comp.mana} | ${pct(r.goldfish.keep7)} | ${pct(r.goldfish.landsT4)} | ${pct(r.goldfish.screwT3)} | ${r.goldfish.commanderTurn.toFixed(1)} | ${r.goldfish.tempo.toFixed(2)} | ${r.lands} | ${roles} | ${r.converged ? '✅' : '⚠️'} ${r.swaps.length} | \`${file}\` |`;
  });
  const w = DEFAULT_WEIGHTS;
  const md = [
    `# Strongest decks — ${dir}`, '',
    `${results.length} commanders scored. Objective = Deck Score absolute + ${w.tempo}×tempo + ${w.keep}×keep-7 (goldfish, ${w.games} seeded games, on the play) − ${w.role}×cards outside the Commander role windows.`, '',
    '| # | Commander | CI | Objective | Deck Score | Rank | Power / bracket | Synergy | Win | Mana | Keep 7 | 4 lands T4 | Screw T3 | Cmdr turn | Tempo | Lands | Roles (ramp/draw/removal/wipe/prot) | Converged / swaps | List |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows, '',
    '## Next 15', '',
    ...results.slice(top, top + 15).map((r, i) => `${top + i + 1}. ${r.commander} — ${r.objective.toFixed(1)} (score ${r.score}, ${r.converged ? 'converged' : `passes ${r.passes}`})`),
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'REPORT.md'), md + '\n');
  process.stdout.write(md + '\n');
}

if (arg('--report')) report(arg('--report')!);
else runCommanders();
