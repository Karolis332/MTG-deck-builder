/** Swap lab: score a base list, then each `Out => In` swap alone, then all swaps together.
 *  MTG_DB_DIR=… npx tsx verify-2026-10-09/tazri/swap-lab.ts <base.txt> <swaps.txt> [--games 300] */
import fs from 'fs';
import { DEFAULT_WEIGHTS, basicsFor, buildPool, fromNames, identityOf, legalPool, loadOwned, makeScorer, parseList, resolveCard } from '../../scripts/best-deck-lib';
const [base, swapsFile] = process.argv.slice(2);
const g = process.argv.indexOf('--games');
const games = g >= 0 ? Number(process.argv[g + 1]) : 300;
const text = fs.readFileSync(base, 'utf8');
const cmdrName = text.match(/^Commander\s*\n1 (.+)$/m)![1].trim();
const commander = resolveCard(cmdrName)!;
const baseNames = parseList(text.replace(/^Commander[\s\S]*?\n\n/, '')).filter((n) => n !== cmdrName);
const owned = loadOwned('paper');
const pool = buildPool(commander, legalPool(owned, 'commander'), new Set());
const basics = basicsFor(identityOf(commander), 'paper', owned.cards);
const scorer = makeScorer('commander', commander, { ...DEFAULT_WEIGHTS, games });
const score = (names: string[]) => {
  const { cards, missing } = fromNames(names, pool, basics);
  if (missing.length) console.log('  missing:', missing.join(', '));
  const s = scorer(cards);
  const comps = (s.model?.components ?? []).map((c: any) => `${c.key ?? c.name}=${Math.round(c.score)}`).join(' ');
  return { obj: s.objective, ds: s.model?.absoluteTotal ?? 0, pen: s.rolePenalty, roles: s.roles, comps };
};
const swaps = fs.readFileSync(swapsFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split('=>').map((x) => x.trim()) as [string, string]);
const apply = (names: string[], out: string, inn: string) => {
  const i = names.indexOf(out);
  if (i < 0) throw new Error(`not in list: ${out}`);
  return [...names.slice(0, i), inn, ...names.slice(i + 1)];
};
const b = score(baseNames);
console.log(`BASE obj ${b.obj.toFixed(2)} DS ${b.ds.toFixed(1)} pen ${b.pen} ${JSON.stringify(b.roles)} ${b.comps}`);
let all = baseNames;
for (const [out, inn] of swaps) {
  const s = score(apply(baseNames, out, inn));
  console.log(`${(s.obj - b.obj).toFixed(2).padStart(7)}  ${out} => ${inn}   DS ${(s.ds - b.ds).toFixed(1)} pen ${s.pen} ${s.comps}`);
  all = apply(all, out, inn);
}
const a = score(all);
console.log(`ALL  obj ${a.obj.toFixed(2)} (${(a.obj - b.obj).toFixed(2)}) DS ${a.ds.toFixed(1)} pen ${a.pen} ${JSON.stringify(a.roles)} ${a.comps}`);
