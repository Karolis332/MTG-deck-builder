import fs from 'fs';
import { resolveCard, cardRoles, roleWindows, parseList, loadOwned, legalPool, buildPool, basicsFor, identityOf, fromNames } from '../../scripts/best-deck-lib';
const cmdr = resolveCard('Beledros Witherbloom')!; const owned = loadOwned('paper'); const pool = buildPool(cmdr, legalPool(owned, 'commander'), new Set(['Bane of Progress']));
const names = parseList(fs.readFileSync('verify-2026-10-08/best-deck/beledros-recommended.txt', 'utf8')).filter((n) => n !== cmdr.name);
const { cards, missing } = fromNames(names, pool, basicsFor(identityOf(cmdr), 'paper', owned.cards));
const counts: Record<string, number> = {}; for (const c of cards) for (const r of cardRoles(c)) counts[r] = (counts[r] ?? 0) + 1;
console.log('missing', missing.join(',') || 'none', '| counts', JSON.stringify(counts)); console.log('windows', JSON.stringify(roleWindows('commander')));
for (const n of ["Ashnod's Altar", 'Inside Information', 'Argentum Masticore', 'Dark Ritual', 'Insidious Roots', 'Horizon of Progress', 'Flare of Cultivation', 'Deadly Dispute', 'Omnipresence']) console.log(n.padEnd(22), cardRoles(resolveCard(n)!).join(','));
