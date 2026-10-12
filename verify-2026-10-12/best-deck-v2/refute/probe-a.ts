/**
 * Refuter probe A (read-only): why 0 upgrades for the live winner (Mirri, paper, budget 50, games 100).
 * MTG_DB_DIR=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data npx tsx verify-2026-10-12/best-deck-v2/refute/probe-a.ts
 */
import { loadOwned } from '../../../scripts/best-deck-lib';
import { runBestDeck } from '../../../src/lib/best-deck-run';
import { buyCandidatesForReport, cfStats, costOf, identityOf, legalIn, isLand, makeScorer, reportAlternatives, resolveCard, DEFAULT_WEIGHTS, BASIC_RE } from '../../../src/lib/best-deck';
import { rankRemovable, withSlot } from '../../../src/lib/deck-climb';
import { getDb } from '../../../src/lib/db';
import type { DbCard } from '../../../src/lib/types';

const CMD = 'Mirri, Weatherlight Duelist';
const t = () => `${(performance.now() / 1000).toFixed(1)}s`;
async function main(): Promise<void> {
  const db = getDb();
  const q = (sql: string) => db.prepare(sql).get() as Record<string, number>;
  console.log('priced rows', q("select count(*) n from cards where price_usd is not null and layout not in ('art_series','token')").n,
    '| priced with NULL edhrec_rank', q("select count(*) n from cards where price_usd is not null and edhrec_rank is null and layout not in ('art_series','token')").n);
  const first1500 = db.prepare("select name, edhrec_rank from cards where price_usd is not null and layout not in ('art_series','token') order by edhrec_rank asc limit 1500").all() as { name: string; edhrec_rank: number | null }[];
  console.log('report pool (limit 1500): null-rank rows', first1500.filter((r) => r.edhrec_rank === null).length, '| distinct names', new Set(first1500.map((r) => r.name)).size);

  const owned = loadOwned('paper').cards.map((c) => ({ name: c.name }));
  const res = await runBestDeck({ owned, budgetUsd: 50, commanderName: CMD }, undefined, { games: 100, deadlineMs: 900_000 });
  console.log(`[${t()}] run: objective ${res.objective.toFixed(2)} climb ${JSON.stringify(res.climb)} buyUsd ${res.buyUsd.toFixed(2)} upgrades ${res.upgrades.length} repl ${res.replacements.length} near ${res.nearMisses.length}`);
  const commander = res.commander;
  const idt = identityOf(commander);
  const ownedNames = new Set(owned.map((o) => resolveCard(o.name)?.name).filter(Boolean) as string[]);
  const ownedCards = [...new Map([...ownedNames].map((n) => [n, resolveCard(n)!])).values()];
  const deck = res.deck as DbCard[];
  const basics = ['Plains', 'Forest'].map((n) => resolveCard(n)!);
  const remaining = 50 - res.buyUsd;
  const flag = (n: string) => { const c = resolveCard(n)!; return `${identityOf(c).every((x) => idt.includes(x)) ? 'in-id' : 'OFF-ID ' + identityOf(c).join('')}${legalIn(c, 'commander') ? '' : ' ILLEGAL'}`; };
  console.log('replacements (full):');
  for (const r of res.replacements) console.log(`  ${r.forCard}: ${r.options.map((o) => `${o.name} ${o.delta} [${flag(o.name)}]`).join(' | ')}`);
  console.log(`nearMisses (remaining budget $${remaining.toFixed(2)}):`);
  for (const n of res.nearMisses) console.log(`  ${n.name} owned=${n.owned} $${n.priceUsd} delta=${n.delta.toFixed(3)} slot=${n.slot} [${flag(n.name)}]${!n.owned && (n.priceUsd ?? Infinity) > remaining ? ' UNAFFORDABLE' : ''}`);

  // Determinism: the same report input again, directly.
  const opts = { format: 'commander', commander, weights: { ...DEFAULT_WEIGHTS, games: 100 }, ownedCards, ownedNames, basics };
  const t0 = performance.now();
  const rep2 = reportAlternatives(deck, res.buyList, opts);
  console.log(`[${t()}] direct report #2: ${((performance.now() - t0) / 1000).toFixed(1)}s, evaluations ${rep2.evaluations}, identical arrays to run's report: ${JSON.stringify([rep2.upgrades, rep2.replacements, rep2.nearMisses]) === JSON.stringify([res.upgrades, res.replacements, res.nearMisses])} (repl ${rep2.replacements.length}, near ${rep2.nearMisses.length})`);

  // Upgrade candidates + weak slots + best gain.
  const scorer = makeScorer('commander', commander, opts.weights);
  const score = (d: readonly (DbCard | null)[]) => scorer(d).objective;
  const current = score(deck);
  console.log(`base objective (report scorer) ${current.toFixed(3)} vs run objective ${res.objective.toFixed(3)}`);
  const ranked = rankRemovable(deck, current, score, { repeatable: new Set(basics.map((b) => b.name)) });
  console.log('weakest 10 slots:', ranked.slice(0, 10).map((r) => `${r.name}(${r.loss.toFixed(2)})`).join(', '));
  const weak6 = ranked.slice(0, 6);
  const weak20 = ranked.filter((r, i, a) => a.findIndex((x) => x.name === r.name) === i).slice(0, 20);
  const incl = cfStats(commander.name);
  const deckNames = new Set(deck.map((c) => c.name));
  const cands = buyCandidatesForReport(commander, 'commander', ownedNames, deckNames, 30);
  console.log(`candidates ${cands.length}, lands ${cands.filter(isLand).length}, with Mirri inclusion>0 ${cands.filter((c) => (incl.get(c.name) ?? 0) > 0).length}; cfStats rows ${incl.size}`);
  for (const c of cands) {
    const p = costOf(c, ownedNames);
    const pRes = costOf(resolveCard(c.name)!, ownedNames);
    let b6 = -Infinity; for (const s of weak6) b6 = Math.max(b6, score(withSlot(deck, s.i, c)) - current);
    let b20 = -Infinity; let s20 = ''; for (const s of weak20) { const d = score(withSlot(deck, s.i, c)) - current; if (d > b20) { b20 = d; s20 = s.name; } }
    console.log(`  ${c.name.padEnd(32)} $${p}${pRes !== p ? ` (resolveCard row $${pRes})` : ''} incl ${(incl.get(c.name) ?? 0).toFixed(2)} rank ${c.edhrec_rank} ${isLand(c) ? 'LAND' : ''} best6 ${b6.toFixed(2)} best20 ${b20.toFixed(2)} @${s20}`);
  }
  console.log(`[${t()}] done candidates`);

  // Counter-probe: Mirri's own top-inclusion unowned cards (budget ignored), tested in the 6 weak slots.
  const top = (db.prepare('select card_name from commander_card_stats where commander_name = ? order by inclusion_rate desc limit 300').all(commander.name) as { card_name: string }[])
    .map((r) => resolveCard(r.card_name)).filter((c): c is DbCard => !!c)
    .filter((c) => !ownedNames.has(c.name) && !deckNames.has(c.name) && !BASIC_RE.test(c.name) && legalIn(c, 'commander') && identityOf(c).every((x) => idt.includes(x)) && costOf(c, ownedNames) !== null)
    .slice(0, 40);
  const inReport = new Set(cands.map((c) => c.name));
  let over = 0;
  for (const c of top) {
    let b = -Infinity; let at = ''; for (const s of weak6) { const d = score(withSlot(deck, s.i, c)) - current; if (d > b) { b = d; at = s.name; } }
    if (b >= 0.25) over++;
    console.log(`  CF ${c.name.padEnd(32)} $${costOf(c, ownedNames)} incl ${(incl.get(c.name) ?? 0).toFixed(2)} inReportList ${inReport.has(c.name)} best6 ${b.toFixed(2)} @${at}`);
  }
  console.log(`[${t()}] CF-top unowned tested ${top.length}, gain>=0.25: ${over}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
