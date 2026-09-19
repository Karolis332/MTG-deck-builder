/**
 * Best paper Standard 60+15 buildable from the owned collection, ranked against the local
 * Standard meta corpus (mtgo/mtggoldfish/mtgtop8 decks synced from the VPS scrapers).
 *
 *   npx tsx scripts/standard-from-collection.ts
 *
 * Data sources: data/mtg-deck-builder.db (cards, collection.txt) and data/export-standard.db
 * (community_decks / community_deck_cards — the raw per-deck rows; the app DB's copies of
 * meta_card_stats/archetype_win_stats are format-wide, not per-archetype, so this script
 * re-aggregates per-archetype directly from export-standard.db).
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { validateDeck } from '../src/lib/deck-validation';
import { findLegalityIssues, scoreDeck, type OptimizerCard, type OptimizerContext } from '../src/lib/deck-optimizer';

const ROOT = path.resolve(__dirname, '..');
const mainDb = new Database(path.join(process.env.MTG_DB_DIR ?? path.join(ROOT, 'data'), 'mtg-deck-builder.db'), { readonly: true });
const metaDb = new Database(path.join(ROOT, 'data', 'export-standard.db'), { readonly: true });

type CardRow = {
  name: string; cmc: number; mana_cost: string; type_line: string; color_identity: string;
  legalities: string; price_usd: string | null; set_code: string;
};

function readList(file: string): { name: string; qty: number }[] {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !/^(Commander|Deck|Sideboard|\/\/)/i.test(l))
    .map((l) => /^(\d+)\s+(.+)$/.exec(l)).filter(Boolean)
    .map((m) => ({ name: m![2].trim(), qty: +m![1] }));
}

const cardQ = mainDb.prepare(`select name, cmc, mana_cost, type_line, color_identity, legalities, price_usd, set_code
  from cards where (name = ? or name like ?) and layout not in ('art_series','token')
  order by (json_extract(legalities,'$.standard')='legal') desc, length(name) limit 1`);

function resolve(name: string): CardRow | undefined {
  return cardQ.get(name, name + ' // %') as CardRow | undefined;
}
const isStandardLegal = (c: CardRow) => {
  try { return JSON.parse(c.legalities || '{}').standard === 'legal'; } catch { return false; }
};

// --- Step 1: owned Standard-legal pool -------------------------------------------------
const collection = readList(process.env.COLLECTION_FILE ?? path.join(ROOT, 'decks', 'paper', 'collection.txt'));
const deckFiles = process.env.COLLECTION_FILE ? [] : fs.readdirSync(path.join(ROOT, 'decks', 'paper', 'decks')).filter((f) => f.endsWith('.txt'));
const inDeckNames = new Map<string, string>(); // card name -> deck slug
for (const f of deckFiles) {
  for (const r of readList(path.join(ROOT, 'decks', 'paper', 'decks', f))) {
    if (!inDeckNames.has(r.name)) inDeckNames.set(r.name, f.replace('.txt', ''));
  }
}

type PoolCard = CardRow & { qty: number; tag: string };
const pool: PoolCard[] = [];
const unresolved: string[] = [];
for (const row of collection) {
  const c = resolve(row.name);
  if (!c) { unresolved.push(row.name); continue; }
  if (!isStandardLegal(c)) continue;
  const tag = inDeckNames.has(c.name) ? `in:${inDeckNames.get(c.name)}` : 'open';
  pool.push({ ...c, name: c.name.split(' // ')[0], qty: row.qty, tag }); // front face: meta lists use front-face names
}
const openCount = pool.filter((p) => p.tag === 'open').length;
const inDeckCount = pool.length - openCount;
const newestSets = [...new Set(pool.map((p) => p.set_code))].sort();

// --- Step 2: archetypes with >=10 decks -------------------------------------------------
type Archetype = { name: string; decks: number; wins: number; losses: number; winRate: number | null; core: Map<string, { rate: number; avgCopies: number }>; all: Map<string, { rate: number; avgCopies: number }>; avgLands: number };
const archRows = metaDb.prepare(`select archetype, count(*) n from community_decks where format='standard' and archetype is not null group by archetype having n>=10`).all() as { archetype: string; n: number }[];
const wlStmt = metaDb.prepare(`select sum(wins) w, sum(losses) l from community_decks where format='standard' and archetype=? and wins is not null`);
const coreStmt = metaDb.prepare(`
  select card_name, count(*) decks_with, avg(q) avg_copies from (
    select c.community_deck_id, c.card_name, sum(c.quantity) q
    from community_deck_cards c join community_decks d on d.id = c.community_deck_id
    where d.format='standard' and d.archetype=? and c.board='main'
    group by c.community_deck_id, c.card_name)
  group by card_name`);

const archetypes: Archetype[] = [];
for (const a of archRows) {
  const wl = wlStmt.get(a.archetype) as { w: number | null; l: number | null };
  const winRate = wl.w != null && wl.l != null && (wl.w + wl.l) > 0 ? wl.w / (wl.w + wl.l) : null;
  const core = new Map<string, { rate: number; avgCopies: number }>();
  const all = new Map<string, { rate: number; avgCopies: number }>();
  let avgLands = 0; // archetype's average land count per deck (drives landTarget)
  for (const row of coreStmt.all(a.archetype) as { card_name: string; decks_with: number; avg_copies: number }[]) {
    const rate = row.decks_with / a.n;
    all.set(row.card_name, { rate, avgCopies: row.avg_copies });
    if (rate >= 0.5) core.set(row.card_name, { rate, avgCopies: row.avg_copies });
    if (/\bLand\b/.test(resolve(row.card_name)?.type_line || '')) avgLands += rate * row.avg_copies;
  }
  archetypes.push({ name: a.archetype, decks: a.n, wins: wl.w ?? 0, losses: wl.l ?? 0, winRate, core, all, avgLands });
}

// colour-support filter: basics assumed unlimited, so any colour with a basic land type is
// always supported (>=8 sources). Only flag if an archetype's core needs a colour with no
// basic (never happens in Standard — WUBRG only) — so this filter is a no-op here; kept for
// completeness per the brief.
const BASIC_COLORS = new Set(['W', 'U', 'B', 'R', 'G']);
function archetypeColors(a: Archetype): string[] {
  const colors = new Set<string>();
  for (const name of a.core.keys()) {
    const c = resolve(name);
    if (!c) continue;
    for (const col of JSON.parse(c.color_identity || '[]')) colors.add(col);
  }
  return [...colors];
}
const eligible = archetypes.filter((a) => archetypeColors(a).every((c) => BASIC_COLORS.has(c)));

// --- Step 3: coverage ranking -------------------------------------------------------------
const poolByName = new Map<string, PoolCard>();
for (const p of pool) poolByName.set(p.name, p);

function coverage(a: Archetype): number {
  let owned = 0, needed = 0;
  for (const [name, info] of a.core) {
    const copies = Math.min(4, Math.round(info.avgCopies));
    needed += copies;
    const p = poolByName.get(name);
    if (p) owned += Math.min(copies, p.qty);
  }
  return needed > 0 ? owned / needed : 0;
}

// Only mtgo rows carry W/L; mtgtop8/mtggoldfish rows do not. Dropping archetypes without a
// win rate therefore dropped the format's biggest decks (Izzet Prowess, n=1305) from
// candidacy entirely. Unmeasured archetypes fall back to the format-wide mtgo win rate, so
// they are ranked on coverage and popularity instead of being silently excluded.
const fmtWl = metaDb.prepare(`select sum(wins) w, sum(losses) l from community_decks where format='standard' and wins is not null`).get() as { w: number | null; l: number | null };
const fallbackWinRate = fmtWl.w != null && fmtWl.l != null && fmtWl.w + fmtWl.l > 0 ? fmtWl.w / (fmtWl.w + fmtWl.l) : 0.5;
const ranked = eligible.map((a) => ({ a, cov: coverage(a), score: coverage(a) * (a.winRate ?? fallbackWinRate) }))
  .sort((x, y) => y.score - x.score);
const top5 = ranked.slice(0, 5);
if (process.env.DEBUG_RANK) for (const r of ranked.slice(0, 20)) console.error(`RANK ${r.a.name} n=${r.a.decks} cov=${(r.cov*100).toFixed(1)} wr=${r.a.winRate ?? 'n/a'} score=${r.score.toFixed(3)}`);

// --- Step 4: build the best archetype's 60 + 15 -------------------------------------------
function buildDeck(a: Archetype) {
  const coreSorted = [...a.core.entries()].sort((x, y) => y[1].rate - x[1].rate);
  const nonlandCore = coreSorted.filter(([name]) => {
    const c = resolve(name);
    return c && !/\bLand\b/.test(c.type_line);
  });
  const avgCmc = nonlandCore.length
    ? nonlandCore.reduce((s, [name, info]) => s + (resolve(name)?.cmc ?? 0) * info.avgCopies, 0) / nonlandCore.reduce((s, [, info]) => s + info.avgCopies, 0)
    : 3;
  const landTarget = a.avgLands > 0 ? Math.round(a.avgLands) : (avgCmc < 2.2 ? 20 : avgCmc < 2.8 ? 22 : 24);

  const colors = archetypeColors(a);
  const main: { name: string; qty: number; tag: string }[] = [];
  const usedQty = new Map<string, number>(); // track copies used from pool across main+side

  function takeFromPool(name: string, want: number): { got: number; tag: string } {
    const p = poolByName.get(name);
    if (!p) return { got: 0, tag: 'buy' };
    const already = usedQty.get(name) || 0;
    const got = Math.max(0, Math.min(want, p.qty - already));
    usedQty.set(name, already + got);
    return { got, tag: p.tag };
  }

  // nonland core cards, capped at 4 and at owned qty; missing copies substituted below
  const substitutions: { missing: string; sub: string; qty: number }[] = [];
  let nonlandSlots = 0;
  const nonlandTarget = 60 - landTarget;
  for (const [name, info] of nonlandCore) {
    if (nonlandSlots >= nonlandTarget) break;
    const want = Math.min(4, Math.round(info.avgCopies), nonlandTarget - nonlandSlots);
    const { got, tag } = takeFromPool(name, want);
    if (got > 0) { main.push({ name, qty: got, tag }); nonlandSlots += got; }
    if (got < want) {
      // substitute: next highest-inclusion owned Standard card of the same broad type not
      // already in the deck, from the archetype's wider card pool (any inclusion rate).
      const c0 = resolve(name)!;
      const wantType = /Creature/.test(c0.type_line) ? 'Creature' : 'Other';
      const candidates = metaDb.prepare(`select c.card_name, count(distinct c.community_deck_id) n
        from community_deck_cards c join community_decks d on d.id=c.community_deck_id
        where d.format='standard' and d.archetype=? and c.board='main' group by c.card_name order by n desc`).all(a.name) as { card_name: string; n: number }[];
      let filled = got; // bug fix: track cumulative substitute copies, not just the first candidate's
      for (const cand of candidates) {
        if (filled >= want || nonlandSlots >= nonlandTarget) break;
        if (main.some((m) => m.name === cand.card_name)) continue;
        const cc = resolve(cand.card_name);
        if (!cc || /\bLand\b/.test(cc.type_line)) continue;
        const ccType = /Creature/.test(cc.type_line) ? 'Creature' : 'Other';
        if (ccType !== wantType) continue;
        const need = want - filled;
        const { got: subGot, tag: subTag } = takeFromPool(cand.card_name, need);
        if (subGot > 0) {
          main.push({ name: cand.card_name, qty: subGot, tag: subTag });
          nonlandSlots += subGot;
          filled += subGot;
          substitutions.push({ missing: name, sub: cand.card_name, qty: subGot });
        }
      }
    }
  }
  // filler if still short: owned Standard-legal nonland cards within the archetype's colour
  // identity (or colourless), cheapest CMC first so an aggro shell doesn't get stuffed with
  // top-end Commander bombs. off-colour cards are excluded outright rather than price-sorted.
  // ponytail: no removal/creature-role balancing here, just colour + curve fit.
  let fillerCount = 0;
  if (nonlandSlots < nonlandTarget) {
    const inColor = (ci: string) => {
      const cs: string[] = JSON.parse(ci || '[]');
      return cs.length === 0 || cs.every((c) => colors.includes(c));
    };
    const fillerPool = pool.filter((p) => !/\bLand\b/.test(p.type_line) && !main.some((m) => m.name === p.name) && inColor(p.color_identity))
      .sort((x, y) => (x.cmc - y.cmc) || ((Number(y.price_usd) || 0) - (Number(x.price_usd) || 0)));
    for (const p of fillerPool) {
      if (nonlandSlots >= nonlandTarget) break;
      const want = Math.min(4, p.qty, nonlandTarget - nonlandSlots);
      main.push({ name: p.name, qty: want, tag: p.tag + ' (filler)' });
      nonlandSlots += want;
      fillerCount += want;
    }
  }

  // lands: the archetype's own lands by inclusion (nonbasics at their average copies), basics fill the
  // rest split like the archetype's basic mix
  const isBasic = (n: string) => /^(Plains|Island|Swamp|Mountain|Forest)$/.test(n);
  const isLand = (n: string) => /\bLand\b/.test(resolve(n)?.type_line || '');
  const colorMap: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
  const archLands = [...a.all.entries()].filter(([name, info]) => isLand(name) && !isBasic(name) && info.rate >= 0.1).sort((x, y) => y[1].rate - x[1].rate);
  const basicWeights = colors.map((c) => { const info = a.all.get(colorMap[c]); return info ? info.rate * info.avgCopies : 0; });
  const weightSum = basicWeights.reduce((s, w) => s + w, 0);
  const basicReserve = Math.round(weightSum);
  let landSlots = 0;
  const lands: { name: string; qty: number; tag: string }[] = [];
  for (const [name, info] of archLands) {
    const room = landTarget - basicReserve - landSlots;
    if (room <= 0) break;
    const { got, tag } = takeFromPool(name, Math.min(4, Math.round(info.avgCopies), room));
    if (got > 0) { lands.push({ name, qty: got, tag }); landSlots += got; }
  }
  const remaining = landTarget - landSlots;
  const shares = colors.map((_, i) => (weightSum > 0 ? basicWeights[i] / weightSum : 1 / colors.length));
  const counts = shares.map((s) => Math.floor(s * remaining));
  let leftover = remaining - counts.reduce((s, n) => s + n, 0);
  const byRemainder = shares.map((s, i) => [s * remaining - counts[i], i] as const).sort((x, y) => y[0] - x[0]);
  for (const [, i] of byRemainder) { if (leftover <= 0) break; counts[i]++; leftover--; }
  colors.forEach((c, i) => { if (counts[i] > 0) lands.push({ name: colorMap[c], qty: counts[i], tag: 'basic (unlimited)' }); });
  if (colors.length === 0 && remaining > 0) lands.push({ name: 'Wastes', qty: remaining, tag: 'basic (unlimited)' });

  // sideboard: next 15 owned cards by archetype inclusion (main+side board), not already in main/lands
  const sideCandidates = metaDb.prepare(`select c.card_name, count(distinct c.community_deck_id) n
    from community_deck_cards c join community_decks d on d.id=c.community_deck_id
    where d.format='standard' and d.archetype=? group by c.card_name order by n desc`).all(a.name) as { card_name: string; n: number }[];
  const side: { name: string; qty: number; tag: string }[] = [];
  let sideSlots = 0;
  for (const cand of sideCandidates) {
    if (sideSlots >= 15) break;
    if (main.some((m) => m.name === cand.card_name) || isLand(cand.card_name)) continue;
    const { got, tag } = takeFromPool(cand.card_name, Math.min(4, 15 - sideSlots));
    if (got > 0) { side.push({ name: cand.card_name, qty: got, tag }); sideSlots += got; }
  }

  const coreSlots = nonlandSlots - substitutions.reduce((s, x) => s + x.qty, 0) - fillerCount;
  return { main: [...main, ...lands], side, avgCmc, landTarget, colors, substitutions, nonlandSlots, landSlots, sideSlots, fillerCount, coreSlots };
}

// --- run for #1 and #2 ---------------------------------------------------------------------
// ARCHETYPE=<name> builds that archetype instead of the top-ranked one (the score ignores
// popularity, so the format's most-played deck can rank below a better-covered smaller one).
const forced = process.env.ARCHETYPE ? ranked.find((r) => r.a.name.toLowerCase() === process.env.ARCHETYPE!.toLowerCase()) : undefined;
if (process.env.ARCHETYPE && !forced) throw new Error(`ARCHETYPE not among ranked archetypes: ${process.env.ARCHETYPE}`);
const best = forced ?? top5[0];
const runnerUp = top5[1];
const deck = buildDeck(best.a);

// --- Step 5: validate + advisory optimizer score -----------------------------------------
// ponytail: validateDeck only reads entry.card.name/legalities, so a partial CardRow cast is
// enough — no need to hydrate the full DbCard shape for this report-only check.
const deckEntries = [...deck.main, ...deck.side].map((c) => {
  const row = resolve(c.name)!;
  return { card_id: c.name, quantity: c.qty, board: deck.main.includes(c) ? 'main' : 'sideboard', card: row as unknown as Parameters<typeof validateDeck>[0][number]['card'] };
});
const validationIssues = validateDeck(deckEntries, 'standard');

// ponytail: full ratioScore needs the card-classifier/analysis-core RatioHealth pipeline,
// out of scope here. Use real legality issues + real land delta, neutral ratioScore=70
// (documented as an approximation in the report).
const optimizerCards: OptimizerCard[] = [...deck.main, ...deck.side].map((c) => {
  const row = resolve(c.name)!;
  return {
    name: c.name,
    quantity: c.qty,
    board: deck.main.includes(c) ? 'main' : 'sideboard',
    cmc: row.cmc,
    typeLine: row.type_line,
    colorIdentity: JSON.parse(row.color_identity || '[]'),
    legalities: row.legalities,
    oracleText: null,
    categories: [],
    primary: 'synergy',
  };
});
const optCtx: OptimizerContext = { format: 'standard' } as OptimizerContext;
const legalityIssues = findLegalityIssues(optimizerCards, optCtx);
// deck.landSlots only counts the nonbasic-land loop, not the basics appended after it —
// recount from the actual built main deck for an honest land total.
const totalLands = deck.main.filter((c) => /\bLand\b/.test(resolve(c.name)?.type_line || '')).reduce((s, c) => s + c.qty, 0);
const landDelta = totalLands - deck.landTarget;
const advisoryScore = scoreDeck(70, legalityIssues, landDelta);

// --- buy list: core cards (>=50% inclusion) missing entirely from the built deck, ranked
// by inclusion rate, capped at 15 (brief limit). ponytail: no price-per-playset math, just
// the DB's single-copy price_usd per line.
const deckNames = new Set(deck.main.map((c) => c.name));
const coreSorted2 = [...best.a.core.entries()].sort((x, y) => y[1].rate - x[1].rate);
const buyList = coreSorted2
  .filter(([name]) => !deckNames.has(name) && !poolByName.has(name)) // owned-but-unplayed is not a purchase
  .slice(0, 15)
  .map(([name, info]) => {
    const row = resolve(name);
    return { name, qty: Math.min(4, Math.round(info.avgCopies)), rate: info.rate, price: row?.price_usd ?? 'n/a' };
  });

// write proposal file
const slug = best.a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const outLines: string[] = [];
for (const c of deck.main) outLines.push(`${c.qty} ${c.name}`);
outLines.push('');
outLines.push('// Sideboard');
for (const c of deck.side) outLines.push(`${c.qty} ${c.name}`);
const outPath = path.join(ROOT, 'decks', 'paper', 'proposals', `standard-${slug}${process.env.OUT_SUFFIX ?? ''}.txt`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, outLines.join('\n') + '\n');

// --- print everything the report needs ------------------------------------------------------
console.log('=== POOL ===');
console.log(`pool size: ${pool.length} (open ${openCount}, in-deck ${inDeckCount}), unresolved: ${unresolved.length}`);
console.log('newest sets seen in legal pool:', newestSets.join(', '));
console.log('unresolved names:', unresolved.join('; '));

console.log('\n=== TOP 5 ARCHETYPES (decks / WR / coverage / score) ===');
for (const r of top5) {
  console.log(`${r.a.name} | decks ${r.a.decks} | WR ${r.a.winRate == null ? 'n/a' : (r.a.winRate * 100).toFixed(1) + '%'} (${r.a.wins}-${r.a.losses}) | coverage ${(r.cov * 100).toFixed(1)}% | score ${r.score.toFixed(3)}`);
}

console.log(`\n=== BUILD: ${best.a.name} ===`);
console.log(`colors ${deck.colors.join('') || 'C'} | avg nonland cmc ${deck.avgCmc.toFixed(2)} | land target ${deck.landTarget} | nonland slots filled ${deck.nonlandSlots} (core ${deck.coreSlots}, substitute ${deck.nonlandSlots - deck.coreSlots - deck.fillerCount}, filler ${deck.fillerCount}) | land slots filled ${deck.landSlots} | side slots ${deck.sideSlots}`);
console.log('MAIN:');
for (const c of deck.main) console.log(`  ${c.qty} ${c.name} [${c.tag}]`);
console.log('SIDEBOARD:');
for (const c of deck.side) console.log(`  ${c.qty} ${c.name} [${c.tag}]`);
console.log('SUBSTITUTIONS (missing core card -> owned substitute):');
for (const s of deck.substitutions) console.log(`  ${s.missing} -> ${s.qty}x ${s.sub}`);

console.log(`\n=== RUNNER-UP: ${runnerUp ? runnerUp.a.name : 'n/a'} ===`);
if (runnerUp) {
  const coreSorted = [...runnerUp.a.core.entries()].sort((x, y) => y[1].rate - x[1].rate);
  for (const [name, info] of coreSorted) console.log(`  ${Math.min(4, Math.round(info.avgCopies))}x ${name} (inc ${(info.rate * 100).toFixed(0)}%)`);
}

console.log('\n=== VALIDATION (deck-validation.ts, standard) ===');
if (validationIssues.length === 0) console.log('  PASS: no issues');
else for (const i of validationIssues) console.log(`  [${i.level}] ${i.message}`);

console.log('\n=== OPTIMIZER SCORE (advisory, deck-optimizer.ts) ===');
console.log(`  legality issues: ${legalityIssues.length}${legalityIssues.length ? ' — ' + legalityIssues.map((i) => `${i.name} (${i.problem})`).join(', ') : ''}`);
console.log(`  land delta: ${landDelta} (built ${totalLands} vs target ${deck.landTarget})`);
console.log(`  score: ${advisoryScore}/100 (ratioScore fixed at 70 — full quota-ratio engine out of scope, PLACEHOLDER, see report caveats)`);

console.log(`\n=== BUY LIST (<=15, missing core cards vs ${best.a.name}) ===`);
if (buyList.length === 0) console.log('  none — every core card is already in the build');
else for (const b of buyList) console.log(`  ${b.qty}x ${b.name} (core inclusion ${(b.rate * 100).toFixed(0)}%, $${b.price})`);

console.log(`\nproposal written: ${outPath}`);
