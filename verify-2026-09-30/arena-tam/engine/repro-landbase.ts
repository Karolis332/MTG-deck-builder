// Land-base diagnosis repro. Read-only intent; runs against a DB COPY only.
// Usage: MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/tam-build-db npx tsx verify-2026-09-30/arena-tam/engine/repro-landbase.ts ["Commander Name" ...]
const dir = process.env.MTG_DB_DIR || '';
if (!dir || /the-black-grimoire/i.test(dir) || /AppData[\\/]+Roaming/i.test(dir)) {
  console.error(`refusing: MTG_DB_DIR must point at a DB copy, got "${dir}"`);
  process.exit(2);
}

import { autoBuildDeck } from '../../../src/lib/deck-builder-ai';
import { scoreLandsForDeck, analyzeManaDemands } from '../../../src/lib/land-intelligence';
import { getDb } from '../../../src/lib/db';
import { auditDeck } from '../../../src/lib/deck-auditor';
import type { DbCard } from '../../../src/lib/types';

const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const USER = 1;

type LandRow = DbCard & { lc_untapped: number | null; lc_produces: string | null; lc_tier: number | null; lc_cat: string | null; arena_qty: number | null; any_qty: number | null };

function landInfo(name: string): LandRow | undefined {
  return getDb().prepare(`
    SELECT c.*, lc.enters_untapped AS lc_untapped, lc.produces_colors AS lc_produces, lc.tier AS lc_tier, lc.land_category AS lc_cat,
      (SELECT SUM(col.quantity) FROM collection col JOIN cards c2 ON c2.id = col.card_id
        WHERE c2.name = c.name AND col.user_id = ? AND col.source = 'arena') AS arena_qty,
      (SELECT SUM(col.quantity) FROM collection col JOIN cards c2 ON c2.id = col.card_id WHERE c2.name = c.name) AS any_qty
    FROM cards c LEFT JOIN land_classifications lc ON lc.card_id = c.id
    WHERE c.name = ? ORDER BY (lc.id IS NULL), c.updated_at DESC LIMIT 1`).get(USER, name) as LandRow | undefined;
}

function colorsOf(l: LandRow): string[] {
  const out = new Set<string>();
  for (const src of [l.lc_produces, l.produced_mana]) {
    try { for (const c of JSON.parse(src || '[]') as string[]) if ('WUBRG'.includes(c)) out.add(c); } catch { /* skip */ }
  }
  if (/any colou?r/i.test(l.oracle_text || '')) 'WUBRG'.split('').forEach((c) => out.add(c));
  return [...out];
}

function tapped(l: LandRow): string {
  if (l.lc_untapped != null) return l.lc_untapped === 1 ? 'untapped' : 'tapped';
  return /enters (the battlefield )?tapped/i.test(l.oracle_text || '') ? 'tapped*' : 'untapped*';
}

async function run(commander: string) {
  const db = getDb();
  const ci = JSON.parse((db.prepare('SELECT color_identity FROM cards WHERE name = ? LIMIT 1').get(commander) as { color_identity: string }).color_identity) as string[];
  const res = await autoBuildDeck({ format: 'brawl', colors: [], useCollection: true, commanderName: commander, userId: USER, powerLevel: 'optimized' });
  const main = res.cards.filter((c) => c.board === 'main');
  const lands = main.filter((c) => (c.card.type_line || '').split('//')[0].includes('Land'));
  const nonlands = main.filter((c) => !lands.includes(c));
  const basicQty = lands.filter((c) => BASICS.has(c.card.name)).reduce((s, c) => s + c.quantity, 0);
  const nb = lands.filter((c) => !BASICS.has(c.card.name));
  console.log(`\n==== ${commander} [${ci.join('')}] strategy=${res.strategy} main=${main.reduce((s, c) => s + c.quantity, 0)}`);
  console.log(`lands=${lands.reduce((s, c) => s + c.quantity, 0)} basics=${basicQty} nonbasics=${nb.length}`);
  console.log('basics:', lands.filter((c) => BASICS.has(c.card.name)).map((c) => `${c.quantity} ${c.card.name}`).join(', '));

  const demand = analyzeManaDemands(nonlands.map((p) => ({ mana_cost: p.card.mana_cost, quantity: p.quantity })));
  console.log('pips:', JSON.stringify(demand.colorDemand));
  const health = auditDeck(res.cards, { colors: ci, format: 'brawl', targetLands: 38, isCommander: true });
  console.log('audit sourcesByColor:', JSON.stringify(health.sourcesByColor), 'deficiencies:', JSON.stringify(health.deficiencies.map((d) => d.message)));
  const scored = scoreLandsForDeck({ colors: ci, format: 'brawl', collectionOnly: true, manaDemand: demand, commanderName: commander });
  // scored holds one row per printing; the first (highest) is the one buildOptimalLandBase takes.
  const rank = new Map<string, { i: number; s: (typeof scored)[number] }>();
  scored.forEach((s, i) => { if (!rank.has(s.card.name)) rank.set(s.card.name, { i: i + 1, s }); });
  console.log(`scoreLandsForDeck: ${scored.length} candidates (collectionOnly, any user/source)`);

  let untapped = 0; let tappedN = 0; let offArena = 0;
  console.log('picked nonbasics: rank score | name | colours | tapped | arenaQty anyQty | tier cat');
  for (const p of nb) {
    const l = landInfo(p.card.name)!;
    const r = rank.get(p.card.name);
    const t = tapped(l);
    if (t.startsWith('untapped')) untapped++; else tappedN++;
    if (!l.arena_qty) offArena++;
    console.log(`  ${r ? `#${r.i} ${r.s.score}` : '(not scored)'} | ${p.card.name} | ${colorsOf(l).filter((c) => ci.includes(c)).join('')} | ${t} | ${l.arena_qty ?? 0} ${l.any_qty ?? 0} | ${l.lc_tier ?? '-'} ${l.lc_cat ?? '-'} | ${r ? r.s.reasons.join('; ') : ''} | ${(l.oracle_text || '').replace(/\n/g, ' / ').slice(0, 140)}`);
  }
  console.log(`nonbasic untapped=${untapped} tapped=${tappedN} notOwnedOnArena=${offArena}`);

  // Owned Arena fixing lands (2+ deck colours or any colour), brawl-legal, not picked.
  const owned = db.prepare(`
    SELECT DISTINCT c.name FROM collection col JOIN cards c ON c.id = col.card_id
    WHERE col.user_id = ? AND col.source = 'arena' AND col.quantity > 0
      AND c.type_line LIKE '%Land%' AND c.type_line NOT LIKE '%Basic%'
      AND json_extract(c.legalities, '$.brawl') = 'legal'`).all(USER) as Array<{ name: string }>;
  const pickedSet = new Set(nb.map((p) => p.card.name));
  const fixers = owned.map((o) => landInfo(o.name)!).filter((l) => l && colorsOf(l).filter((c) => ci.includes(c)).length >= Math.min(2, ci.length));
  const missed = fixers.filter((l) => !pickedSet.has(l.name));
  console.log(`owned Arena fixers: ${fixers.length}, picked ${fixers.length - missed.length}, missed ${missed.length}`);
  const cut = nb.map((p) => rank.get(p.card.name)?.s.score ?? 0);
  console.log(`lowest picked score: ${Math.min(...cut)}`);
  for (const l of missed.sort((a, b) => (rank.get(b.name)?.s.score ?? -1) - (rank.get(a.name)?.s.score ?? -1))) {
    const r = rank.get(l.name);
    console.log(`  MISSED ${r ? `#${r.i} ${r.s.score}` : '(not scored)'} | ${l.name} | ${colorsOf(l).filter((c) => ci.includes(c)).join('')} | ${tapped(l)} | tier ${l.lc_tier ?? '-'} ${l.lc_cat ?? '-'} | ci ${l.color_identity} | ${r ? r.s.reasons.join('; ') : ''}`);
  }
  const top = scored.slice(0, 45).map((s, i) => `#${i + 1} ${s.score} ${s.card.name}${landInfo(s.card.name)?.arena_qty ? '' : ' [NOT ARENA]'}${pickedSet.has(s.card.name) ? ' *' : ''}`);
  console.log('scored top 45 (* = picked):\n  ' + top.join('\n  '));
}

(async () => {
  const names = process.argv.slice(2);
  for (const n of names.length ? names : ['Tam, the Possibility']) await run(n);
})().catch((e) => { console.error('REPRO_ERROR', e); process.exit(1); });
