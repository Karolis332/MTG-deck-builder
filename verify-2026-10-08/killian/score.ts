/** One-off in-process scorer (lab server is down): MTG_DB_DIR=… npx tsx verify-2026-10-08/killian/score.ts <list.txt> [--games 300] */
import fs from 'fs';
import { DEFAULT_WEIGHTS, basicsFor, buildPool, fromNames, identityOf, legalPool, loadOwned, makeScorer, parseList, resolveCard } from '../../scripts/best-deck-lib';
const file = process.argv[2];
const g = process.argv.indexOf('--games');
const games = g >= 0 ? Number(process.argv[g + 1]) : 300;
const lines = fs.readFileSync(file, 'utf8');
const cmdrName = lines.match(/^Commander\s*\n1 (.+)$/m)![1].trim();
const commander = resolveCard(cmdrName)!;
const names = parseList(lines.replace(/^Commander[\s\S]*?\n\n/, '')).filter((n) => n !== cmdrName);
const owned = loadOwned('paper');
const pool = buildPool(commander, legalPool(owned, 'commander'), new Set());
const basics = basicsFor(identityOf(commander), 'paper', owned.cards);
const { cards, missing } = fromNames(names, pool, basics);
if (missing.length) console.log('missing:', missing.join(', '));
const s = makeScorer('commander', commander, { ...DEFAULT_WEIGHTS, games })(cards);
const comps = (s.model?.components ?? []).map((c: any) => `${c.key ?? c.name}=${Math.round(c.score)}`).join(' ');
console.log(JSON.stringify({ file, objective: +s.objective.toFixed(2), deckScore: +(s.model?.absoluteTotal ?? 0).toFixed(1), rolePenalty: s.rolePenalty, roles: s.roles, gf: s.gf, comps }, null, 0));
