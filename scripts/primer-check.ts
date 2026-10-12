/**
 * Validate a deck primer before it reaches the deck-check page: schema, every card name in the DB,
 * swaps consistent with the list, and (with --base) every change between base and list explained.
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/primer-check.ts decks/paper/primers/<slug>.json [--base <list.txt>]
 *
 * Exit 1 on any FAIL.
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { parsePrimer, primerCardNames } from '../src/lib/deck-primer';

const [file, flag, basePath] = process.argv.slice(2);
if (!file || (flag && flag !== '--base') || (flag && !basePath)) {
  console.error('usage: primer-check.ts <primer.json> [--base <list.txt>]');
  process.exit(2);
}
const ROOT = path.resolve(__dirname, '..');
const dbDir = process.env.MTG_DB_DIR || path.join(process.env.APPDATA!, 'the-black-grimoire', 'data');
const db = new Database(path.join(dbDir, 'mtg-deck-builder.db'), { readonly: true });
const known = db.prepare("select 1 from cards where name = ? or name like ? limit 1");

const names = (rel: string) => {
  const m = new Map<string, number>();
  for (const l of fs.readFileSync(path.resolve(ROOT, rel), 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const r = l.match(/^(\d+)\s+(.+)$/);
    const n = r ? r[2] : l;
    m.set(n, (m.get(n) ?? 0) + (r ? Number(r[1]) : 1));
  }
  return m;
};

const fails: string[] = [];
const warns: string[] = [];
let p;
try {
  p = parsePrimer(JSON.parse(fs.readFileSync(file, 'utf8')));
} catch (e) {
  console.log(`FAIL schema: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

const unknown = primerCardNames(p).filter((n) => !known.get(n, n + ' // %'));
if (unknown.length) fails.push(`names not in the DB: ${unknown.join('; ')}`);

// quotes must be verbatim oracle text: each piece between "…" a substring of the card's DB text
const oracleQ = db.prepare("select oracle_text from cards where name = ? or name like ? order by length(name) limit 1");
// punctuation-insensitive: " / " marks a line break and keyword lines gain a full stop in prose; words must match exactly
const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ \/ /g, ' ').replace(/[.,;:•]/g, '').replace(/\s+/g, ' ').trim();
const quoteOk = (cardName: string, quote: string) => {
  const row = oracleQ.get(cardName, cardName + ' // %') as { oracle_text: string | null } | undefined;
  const text = norm(row?.oracle_text ?? '');
  return quote.split(/\s*(?:…|\.\.\.)\s*/).map((q) => norm(q).replace(/^"|"$/g, '')).filter(Boolean).every((piece) => text.includes(piece));
};
for (const s of p.swaps) {
  if (s.quoteOut && (!s.out || !quoteOk(s.out, s.quoteOut))) fails.push(`quoteOut is not verbatim DB text of ${s.out}: "${s.quoteOut}"`);
  if (s.quoteIn && (!s.in || !quoteOk(s.in, s.quoteIn))) fails.push(`quoteIn is not verbatim DB text of ${s.in}: "${s.quoteIn}"`);
}

const list = names(p.deck.list);
const inList = (n: string) => list.has(n);
for (const s of p.swaps) {
  if (s.in && !inList(s.in)) fails.push(`swap IN not in the list: ${s.in}`);
  if (s.out && inList(s.out) && !(basePath && (names(basePath).get(s.out) ?? 0) > (list.get(s.out) ?? 0))) fails.push(`swap OUT still in the list: ${s.out}`);
}
for (const c of [...p.deck.commanders, ...p.winConditions.flatMap((w) => w.pieces), ...p.phases.flatMap((x) => x.cards), ...p.keepers.map((k) => k.card)]) {
  if (!inList(c)) fails.push(`not in the list (commander, win piece, phase card or keeper): ${c}`);
}
for (const t of p.nearTies) {
  if (!inList(t.kept)) fails.push(`near-tie kept card not in the list: ${t.kept}`);
  if (inList(t.alt)) warns.push(`near-tie alternative is also in the list: ${t.alt}`);
}

// every card that changed between base and list must appear in a swap (basics by count)
if (basePath) {
  const base = names(basePath);
  const outs = [...base].filter(([n, q]) => q > (list.get(n) ?? 0)).map(([n]) => n);
  const ins = [...list].filter(([n, q]) => q > (base.get(n) ?? 0)).map(([n]) => n);
  const sOut = new Set(p.swaps.map((s) => s.out));
  const sIn = new Set(p.swaps.map((s) => s.in));
  const missOut = outs.filter((n) => !sOut.has(n));
  const missIn = ins.filter((n) => !sIn.has(n));
  if (missOut.length) fails.push(`cuts without a swap entry: ${missOut.join('; ')}`);
  if (missIn.length) fails.push(`adds without a swap entry: ${missIn.join('; ')}`);
}

const total = [...list.values()].reduce((a, b) => a + b, 0);
console.log(`${fails.length ? 'FAIL' : 'PASS'} ${path.basename(file)}: list ${p.deck.list} (${total} cards), ${p.swaps.length} swaps, ${p.winConditions.length} win conditions`);
fails.forEach((f) => console.log(`  FAIL ${f}`));
warns.forEach((w) => console.log(`  warn ${w}`));
process.exit(fails.length ? 1 : 0);
