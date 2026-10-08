/**
 * Buy lab for the Beledros 99: every card the operator does NOT own from the two EDHREC Beledros pages and from the CF
 * corpus stats (commander_card_stats, 300 rows) is scored in every slot of the final list (nonland candidates in the
 * nonland slots, lands in the land slots). Ownership is bypassed on purpose: these are purchases.
 * Output: buy-lab.json + buy-lab.md (best slot, model Δ, inclusion, price).
 *
 *   MTG_DB_DIR=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data npx tsx verify-2026-10-08/best-deck/buy-lab.ts [--games 100]
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { DbCard } from '../../src/lib/types';
import { BASIC_RE, DEFAULT_WEIGHTS, basicsFor, buildPool, cardRoles, fromNames, identityOf, isLand, legalIn, legalPool, loadOwned, makeScorer, parseList, resolveCard } from '../../scripts/best-deck-lib';

const DIR = __dirname;
const gamesArg = process.argv.indexOf('--games');
const GAMES = gamesArg >= 0 ? Number(process.argv[gamesArg + 1]) : 100;

const commander = resolveCard('Beledros Witherbloom');
if (!commander) throw new Error('commander not in DB');
const owned = loadOwned('paper');
const ownedNames = new Set(owned.cards.flatMap((c) => [c.name, c.name.split(' // ')[0]]));
const banned = new Set([...fs.readFileSync(path.join(DIR, 'beledros-climb-ban.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean), 'Bane of Progress']); // Culling Ritual ban overridden by the operator 2026-10-08
if (banned.size < 500) throw new Error(`ban list too small: ${banned.size}`);
const identity = identityOf(commander);
const basics = basicsFor(identity, 'paper', owned.cards);
const pool = buildPool(commander, legalPool(owned, 'commander'), banned);
const listNames = parseList(fs.readFileSync(path.join(DIR, 'beledros-recommended.txt'), 'utf8')).filter((n) => n !== commander.name);
const { cards, missing } = fromNames(listNames, pool, basics);
if (missing.length || cards.length !== 99) throw new Error(`deck resolved to ${cards.length}; missing: ${missing.join(', ')}`);
const inDeck = new Set(cards.flatMap((c) => [c.name, c.name.split(' // ')[0]]));

const db = new Database(path.join(process.env.MTG_DB_DIR || path.join(process.env.APPDATA!, 'the-black-grimoire', 'data'), 'mtg-deck-builder.db'), { readonly: true });
const stats = db.prepare('select card_name, inclusion_rate from commander_card_stats where commander_name = ?').all(commander.name) as { card_name: string; inclusion_rate: number }[];
const INCL = new Map(stats.map((r) => [r.card_name, r.inclusion_rate]));
const edhrec = ['beledros-edhrec-optimized.txt', 'beledros-edhrec-lifegain.txt'].flatMap((f) => parseList(fs.readFileSync(path.join(DIR, f), 'utf8')));
const onlyArg = process.argv.indexOf('--only'); // --only "A|B": score just these proposals, owned or not (operator proposals go through the same lab)
const only = onlyArg >= 0 ? process.argv[onlyArg + 1].split('|').map((x) => x.trim()) : null;
const wanted = only ?? [...new Set([...edhrec, ...stats.map((r) => r.card_name)])];
const okIdentity = (c: DbCard): boolean => identityOf(c).every((x) => identity.includes(x));
const candidates = wanted
  .filter((n) => (only ? !inDeck.has(n) : !ownedNames.has(n) && !inDeck.has(n) && !banned.has(n)))
  .map((n) => resolveCard(n))
  .filter((c): c is DbCard => !!c && legalIn(c, 'commander') && okIdentity(c) && !BASIC_RE.test(c.name) && !inDeck.has(c.name) && (only ? true : !ownedNames.has(c.name)));
const uniq = [...new Map(candidates.map((c) => [c.name, c])).values()];
console.error(`${uniq.length} unowned candidates (EDHREC ${edhrec.length} names + corpus ${stats.length} rows), ${GAMES} games`);

const scorer = makeScorer('commander', commander, { ...DEFAULT_WEIGHTS, games: GAMES });
const base = scorer(cards).objective;
// --swap "In=Out|In=Out": score each named swap in its named slot, then all together (operator decisions, for the record)
const swapArg = process.argv.indexOf('--swap');
if (swapArg >= 0) {
  const pairs = process.argv[swapArg + 1].split('|').map((p) => p.split('=').map((x) => x.trim()) as [string, string]);
  let deck = cards;
  const out: Record<string, number> = {};
  for (const [inn, outn] of pairs) {
    const c = resolveCard(inn);
    const i = cards.findIndex((d) => d.name === outn);
    if (!c || i < 0) throw new Error(`swap ${inn}=${outn}: ${!c ? 'card not in DB' : 'slot not in the 99'}`);
    out[`${inn} for ${outn}`] = scorer(cards.map((d, j) => (j === i ? c : d))).objective - base;
    deck = deck.map((d, j) => (j === i ? c : d));
  }
  out['all together'] = scorer(deck).objective - base;
  console.log(JSON.stringify({ base, games: GAMES, deltas: out }, null, 1));
  process.exit(0);
}
const landSlots = [...new Map(cards.map((c, i) => [c.name, i])).entries()].filter(([n]) => isLand(cards[cards.findIndex((c) => c.name === n)])).map(([, i]) => i);
const nonlandSlots = cards.map((c, i) => (isLand(c) ? -1 : i)).filter((i) => i >= 0);
type Row = { name: string; type: string; mv: number; delta: number; slot: string; incl: number; price: number | null; roles: string[] };
const rows: Row[] = [];
const t0 = Date.now();
uniq.forEach((c, k) => {
  const slots = isLand(c) ? landSlots : nonlandSlots;
  let best = { delta: -Infinity, slot: '' };
  for (const i of slots) {
    const deck = cards.map((d, j) => (j === i ? c : d));
    const delta = scorer(deck).objective - base;
    if (delta > best.delta) best = { delta, slot: cards[i].name };
  }
  rows.push({ name: c.name, type: c.type_line.split(' // ')[0], mv: c.cmc ?? 0, delta: best.delta, slot: best.slot, incl: INCL.get(c.name) ?? 0, price: c.price_usd ?? null, roles: cardRoles(c) });
  console.error(`${String(k + 1).padStart(3)}/${uniq.length} ${c.name.padEnd(36)} ${best.delta >= 0 ? '+' : ''}${best.delta.toFixed(2)} for ${best.slot}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
});
rows.sort((a, b) => b.delta - a.delta || b.incl - a.incl);
if (only) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
fs.writeFileSync(path.join(DIR, 'buy-lab.json'), JSON.stringify({ base, games: GAMES, generated: new Date().toISOString(), rows }, null, 1));
const md = [`# Beledros buy lab — ${uniq.length} unowned candidates, every slot, ${GAMES} games, base ${base.toFixed(2)}`, '',
  '| # | Card | Type | MV | Δ | For | Beledros incl. | $ |', '|---|---|---|---|---|---|---|---|',
  ...rows.map((r, i) => `| ${i + 1} | ${r.name} | ${r.type} | ${r.mv} | ${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)} | ${r.slot} | ${(r.incl * 100).toFixed(0)}% | ${r.price ?? '?'} |`)];
fs.writeFileSync(path.join(DIR, 'buy-lab.md'), md.join('\n') + '\n');
console.log(`buy-lab: ${rows.length} rows, base ${base.toFixed(2)}, top: ${rows.slice(0, 5).map((r) => `${r.name} ${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)}`).join(' | ')}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
