/**
 * Deck edit plans from the model: for each paper deck, rank cuts and adds using the commander
 * corpus (inclusion % and lift for the exact commander, full table pulled from the VPS), the CF
 * recommender, the role quotas and the owned-card pool. Writes decks/paper/edit-plan.html (+ a
 * Desktop copy) with card images and the argument for every swap, and
 * decks/paper/proposals/<deck>-model.txt (ManaBox) per auto-planned deck.
 *
 *   npx tsx scripts/deck-edit-plan.ts
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { classifyCard, getPrimaryCategory } from '../src/lib/card-classifier';
import { optimizeDeck } from '../services/build-api/optimize';

const ROOT = path.resolve(__dirname, '..', 'decks', 'paper');
const OUT_HTML = [path.join(ROOT, 'edit-plan.html'), 'C:/Users/QuLeR/Desktop/MTG collection/MTG decks/edit-plan.html'];
const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
// 99-card role bands the arguments refer to.
const BAND: Record<string, [number, number]> = { ramp: [10, 12], draw: [10, 12], removal: [8, 10], board_wipe: [2, 3], protection: [2, 4], win_condition: [4, 7] };
const NL = String.fromCharCode(10);
// Mana-curve targets for the ~63 nonland cards of a 99 (bucket -> ideal count); a bucket is "full" 2 above target.
const CURVE: Array<[string, number]> = [['1', 7], ['2', 16], ['3', 16], ['4', 11], ['5', 7], ['6+', 5]];
const bucket = (cmc: number) => (cmc >= 6 ? '6+' : String(Math.max(1, Math.round(cmc))));

interface Line { quantity: number; name: string }
interface CardInfo { name: string; cmc: number; role: string; img: string; ci: string[]; inc: number | null; lift: number | null; cf: number | null; prod: string[]; tapped: boolean }
interface Deck { key: string; title: string; file: string; commander: string; fixedSwaps?: string; basicsTopUp?: string; minLands?: number; caveat?: string }
interface Swap { out: CardInfo; in: CardInfo; why: string }

const DECKS: Deck[] = [
  { key: 'meren', title: 'Meren of Clan Nel Toth', file: 'meren-of-clan-nel-toth.txt', commander: 'Meren of Clan Nel Toth', fixedSwaps: 'meren-final.txt' },
  { key: 'imotekh', title: 'Imotekh the Stormlord', file: 'imotekh-the-stormlord.txt', commander: 'Imotekh the Stormlord', fixedSwaps: 'imotekh-final.txt',
    caveat: 'The optimizer score means little for this deck: its synergy taxonomy has no model of Necron artifact recursion and reads the tribal core as 16 win conditions. Judge the swaps by the corpus columns.' },
  { key: 'tazri', title: 'Tazri, Beacon of Unity', file: 'tazri-beacon-of-unity.txt', commander: 'Tazri, Beacon of Unity', fixedSwaps: 'tazri-final.txt' },
];

const read = (f: string): Line[] => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/).map((l) => { const m = /^(\d+) (.+)$/.exec(l)!; return { quantity: +m[1], name: m[2] }; });
const face = (n: string) => n.split(' // ')[0];
const db = getDb();
const cardQ = db.prepare("select name, cmc, type_line, oracle_text, color_identity, image_uri_normal, produced_mana from cards where name = ? or name like ? order by (layout not in ('art_series','token')) desc, length(name) limit 1");
const localStat = db.prepare('select inclusion_rate, lift from commander_card_stats where commander_name = ? and card_name = ?');
const cfKey = (db.prepare("select value from app_state where key='cf_api_key'").get() as { value: string } | undefined)?.value ?? '';
const cfBase = (db.prepare("select value from app_state where key='cf_api_url'").get() as { value: string } | undefined)?.value ?? 'http://187.77.110.100/cf-api';

// Full corpus numbers for every owned name (the local table only holds the top 300 per commander).
// Produced by scripts/corpus-stats-cache.sh (VPS psql → data/corpus-stats.json); missing file = local table only.
const CACHE = path.resolve(__dirname, '..', 'data', 'corpus-stats.json');
const vps = new Map<string, { inc: number; lift: number | null }>();
const vpsLoaded = new Set<string>();
function loadVpsStats(commander: string): void {
  if (!fs.existsSync(CACHE)) { console.error(`no ${CACHE} — run scripts/corpus-stats-cache.sh first; using the local top-300 table`); return; }
  const data = JSON.parse(fs.readFileSync(CACHE, 'utf8')) as Record<string, Record<string, [number, number | null]>>;
  const rows = data[commander];
  if (!rows) { console.error(`no cached corpus rows for ${commander}`); return; }
  for (const [name, [inc, lift]] of Object.entries(rows)) vps.set(`${commander}|${name}`, { inc, lift });
  vpsLoaded.add(commander);
}

function info(name: string, commander: string, cf: Map<string, number>): CardInfo | null {
  const c = cardQ.get(name, name + ' // %') as { name: string; cmc: number; type_line: string; oracle_text: string; color_identity: string; image_uri_normal: string; produced_mana: string | null } | undefined;
  if (!c) return null;
  const role = /Land/.test(c.type_line) ? 'land' : getPrimaryCategory(classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0));
  const v = vps.get(`${commander}|${c.name}`) || vps.get(`${commander}|${face(c.name)}`);
  const s = localStat.get(commander, c.name) as { inclusion_rate: number; lift: number | null } | undefined;
  // With the full corpus loaded, a missing row means the card is essentially unplayed with this commander.
  const inc = v ? v.inc : s ? s.inclusion_rate : vpsLoaded.has(commander) ? 0 : null;
  const lift = v ? v.lift : s?.lift ?? null;
  const oracle = c.oracle_text || '';
  const fetch = /search your library for a (basic )?(land|forest|plains|island|swamp|mountain)/i.test(oracle) && role === 'land';
  const prod: string[] = fetch ? ['W', 'U', 'B', 'R', 'G'] : (JSON.parse(c.produced_mana || '[]') as string[]);
  const tapped = /enters (the battlefield )?tapped\b/i.test(oracle) && !/unless you control two or fewer/.test(oracle) && !/pay 2 life/.test(oracle);
  return { name: c.name, cmc: c.cmc, role, img: c.image_uri_normal, ci: JSON.parse(c.color_identity || '[]'), inc, lift, cf: cf.get(c.name) ?? cf.get(face(c.name)) ?? null, prod, tapped };
}

async function cfRanks(deck: Line[], commander: string): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  try {
    const res = await fetch(`${cfBase}/recommend`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': cfKey }, body: JSON.stringify({ cards: deck.slice(1).map((c) => c.name), commander, limit: 80 }), signal: AbortSignal.timeout(20_000) });
    const data = await res.json() as { recommendations?: Array<{ card_name?: string; name?: string }> };
    (data.recommendations || []).forEach((r, i) => m.set(r.card_name || r.name || '', i + 1));
  } catch { /* CF offline: ranks stay empty and the page says so */ }
  return m;
}

const pct = (v: number | null) => (v == null ? 'no corpus data' : v === 0 ? '0%' : v < 0.01 ? '<1%' : `${Math.round(v * 100)}%`);
const liftTxt = (v: number | null) => (v == null ? '' : `, lift ${v >= 0 ? '+' : ''}${v.toFixed(1)}`);

function curveCounts(cards: CardInfo[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const x of cards) if (x.role !== 'land') c[bucket(x.cmc)] = (c[bucket(x.cmc)] || 0) + 1;
  return c;
}
const curveText = (cards: CardInfo[]) => {
  const c = curveCounts(cards); const n = cards.filter((x) => x.role !== 'land');
  const avg = n.length ? (n.reduce((t, x) => t + x.cmc, 0) / n.length).toFixed(2) : '0';
  return `${CURVE.map(([b, t]) => `${b}: ${c[b] || 0}${(c[b] || 0) > t + 2 ? ' (full)' : ''}`).join(' | ')} | avg ${avg}`;
};

function roleCounts(cards: CardInfo[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const x of cards) c[x.role] = (c[x.role] || 0) + 1;
  return c;
}

function autoPlan(deck: Line[], commander: string, open: Line[], cf: Map<string, number>, opts: Deck, exclude: Set<string> = new Set()): { swaps: Swap[]; notes: string[] } {
  const notes: string[] = [];
  const deckInfo = deck.slice(1).flatMap((l) => { const i = info(l.name, commander, cf); return i ? (Array(l.quantity).fill(i) as CardInfo[]) : []; });
  const counts = roleCounts(deckInfo);
  const cmdCi = new Set(info(commander, commander, cf)?.ci || []);
  const inDeck = new Set(deckInfo.map((c) => c.name));
  const lands = deckInfo.filter((c) => c.role === 'land').length;
  const extraBasics = opts.minLands && lands < opts.minLands ? opts.minLands - lands : 0;
  if (extraBasics) notes.push(`${lands} lands is too few for this curve; ${extraBasics} ${opts.basicsTopUp} go in before any spell swap (basics are free).`);

  const over = (r: string) => Boolean(BAND[r]) && (counts[r] || 0) > BAND[r][1];
  const under = (r: string) => Boolean(BAND[r]) && (counts[r] || 0) < BAND[r][0];
  const curve = curveCounts(deckInfo);
  const full = (cmc: number) => (curve[bucket(cmc)] || 0) > (CURVE.find(([b]) => b === bucket(cmc))?.[1] ?? 99) + 2;
  if (exclude.size) notes.push(`Not available to this deck (single copies already assigned to another plan): ${[...exclude].join(', ')}.`);
  // Cuts: weakest corpus usage first. Never a land, a basic, an under-band role, or a card the corpus marks as commander-specific.
  const cutPool = deckInfo
    .filter((c) => c.role !== 'land' && !BASICS.has(c.name) && !under(c.role) && (c.inc ?? 0) < 0.2 && (c.lift ?? 0) < 1.5)
    .map((c) => ({ c, score: (c.inc ?? 0) + (over(c.role) ? 0 : 0.05) + ((c.lift ?? 0) > 1 ? 0.05 : 0) - (full(c.cmc) ? 0.04 : 0) }))
    .sort((a, b) => a.score - b.score);
  // Adds: owned, colour-legal, not in the deck, corpus usage ≥ 12 %; gap roles get a bonus; over-band roles only with a strong signal.
  const seen = new Set<string>();
  const addPool = open
    .map((l) => info(l.name, commander, cf))
    .filter((c): c is CardInfo => !!c && !inDeck.has(c.name) && !exclude.has(face(c.name)) && c.role !== 'land' && !seen.has(c.name) && (seen.add(c.name), true) && c.ci.every((x) => cmdCi.has(x)) && (c.inc ?? 0) >= 0.12 && (!over(c.role) || (c.inc ?? 0) >= 0.25))
    .map((c) => ({ c, score: (c.inc ?? 0) + (under(c.role) ? 0.15 : 0) + (c.cf ? Math.max(0, 0.1 - c.cf * 0.002) : 0) - (full(c.cmc) ? 0.08 : 0) }))
    .sort((a, b) => b.score - a.score);

  const swaps: Swap[] = [];
  const used = new Set<string>();
  for (let i = 0; i < extraBasics; i++) {
    const cut = cutPool.find((x) => !used.has(x.c.name) && (x.c.inc ?? 0) < 0.03 && (x.c.lift ?? 0) < 0.5);
    const basic = info(opts.basicsTopUp!, commander, cf);
    if (!cut || !basic) break;
    used.add(cut.c.name);
    swaps.push({ out: cut.c, in: basic, why: `OUT ${cut.c.name}: in ${pct(cut.c.inc)} of ${commander} decks${liftTxt(cut.c.lift)}; the slot goes to a basic ${opts.basicsTopUp} because the land count is ${lands} against a target of ${opts.minLands}.` });
  }
  const n = Math.min(12, addPool.length, cutPool.length) - swaps.length;
  for (let i = 0; i < n; i++) {
    const add = addPool[i].c;
    const cut = cutPool.find((x) => !used.has(x.c.name) && over(x.c.role) && x.c.role === add.role) || cutPool.find((x) => !used.has(x.c.name));
    if (!cut) break;
    used.add(cut.c.name);
    const outWhy = `OUT ${cut.c.name}: in ${pct(cut.c.inc)} of ${commander} decks${liftTxt(cut.c.lift)}; ${cut.c.role} ${over(cut.c.role) ? `over quota (${counts[cut.c.role]} vs ${BAND[cut.c.role][1]} max)` : 'is the weakest remaining slot'}${full(cut.c.cmc) ? `; the ${bucket(cut.c.cmc)}-drop slot is over-full` : ''}.`;
    const inWhy = `IN ${add.name}: in ${pct(add.inc)}${liftTxt(add.lift)}${add.cf ? `, CF model #${add.cf}` : ''}; ${under(add.role) ? `fills ${add.role} (${counts[add.role] || 0} → ${(counts[add.role] || 0) + 1}, band ${BAND[add.role].join('–')})` : `role ${add.role}`}${add.cmc < cut.c.cmc ? `; curve ${cut.c.cmc} → ${add.cmc} MV` : ''}.`;
    swaps.push({ out: cut.c, in: add, why: `${outWhy} ${inWhy}` });
    counts[cut.c.role] = (counts[cut.c.role] || 1) - 1;
    counts[add.role] = (counts[add.role] || 0) + 1;
    curve[bucket(cut.c.cmc)] = (curve[bucket(cut.c.cmc)] || 1) - 1; curve[bucket(add.cmc)] = (curve[bucket(add.cmc)] || 0) + 1;
  }
  return { swaps, notes };
}

function fixedPlan(deck: Line[], proposalFile: string, commander: string, cf: Map<string, number>): { swaps: Swap[]; notes: string[] } {
  const cur = new Map(deck.map((c) => [c.name, c.quantity]));
  const nxt = new Map(read(path.join(ROOT, 'proposals', proposalFile)).map((c) => [c.name, c.quantity]));
  const expand = (a: Map<string, number>, b: Map<string, number>) => [...a].filter(([n, q]) => q > (b.get(n) || 0)).flatMap(([n, q]) => Array(q - (b.get(n) || 0)).fill(n) as string[]);
  const outInfo = expand(cur, nxt).map((n) => info(n, commander, cf)).filter((x): x is CardInfo => !!x);
  const inInfo = expand(nxt, cur).map((n) => info(n, commander, cf)).filter((x): x is CardInfo => !!x);
  // Pair cuts with adds of the same role where possible so each row reads as a like-for-like swap.
  const swaps: Swap[] = [];
  for (const a of inInfo) {
    const j = outInfo.findIndex((o) => o.role === a.role);
    const o = j >= 0 ? outInfo.splice(j, 1)[0] : outInfo.shift();
    if (!o) break;
    swaps.push({ out: o, in: a, why: `OUT ${o.name}: in ${pct(o.inc)} of ${commander} decks${liftTxt(o.lift)}, role ${o.role}. IN ${a.name}: in ${pct(a.inc)}${liftTxt(a.lift)}${a.cf ? `, CF model #${a.cf}` : ''}, role ${a.role}.` });
  }
  return { swaps, notes: [`Final recommendation (${proposalFile}): corpus plan + Codex gpt-6-astra review + EDHPowerLevel check, reconciled by hand; the numbers are the corpus data behind each swap.`] };
}


const COLOR_NAME: Record<string, string> = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green' };
const KEEP_LANDS = new Set(['Command Tower', 'Exotic Orchard', 'Base Camp', 'Path of Ancestry', 'Bojuka Bog', 'Myriad Landscape']);
// Lands whose produced_mana lists every colour but only give it conditionally are colourless for balancing purposes.
const TRUE_RAINBOW = new Set(['Command Tower', 'Exotic Orchard', 'Path of Ancestry', 'Mana Confluence', 'City of Brass', 'Forbidden Orchard', 'The World Tree', 'Cascading Cataracts', 'Plaza of Heroes', 'Reflecting Pool', 'Gemstone Mine', 'Grand Coliseum']);
const BASIC_OF: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
const BASIC_COLOR: Record<string, string> = { plains: 'W', island: 'U', swamp: 'B', mountain: 'R', forest: 'G' };
const oracleCache = new Map<string, { oracle: string; type: string }>();
/** Colours a land gives without conditions: plain "{T}: Add ..." abilities, fetchable basics, choose-a-colour lands. */
function landColors(name: string, colors: string[]): string[] {
  if (TRUE_RAINBOW.has(face(name))) return colors;
  let cached = oracleCache.get(name);
  if (!cached) { const row = cardQ.get(name, name + ' // %') as { oracle_text: string; type_line: string } | undefined; cached = { oracle: row?.oracle_text || '', type: row?.type_line || '' }; oracleCache.set(name, cached); }
  const oracle = cached.oracle;
  const out = new Set<string>();
  const landHalf = cached.type.split(' // ').find((t) => /Land/.test(t)) || '';
  for (const [t, c] of Object.entries(BASIC_COLOR)) if (new RegExp(`\\b${t}\\b`, 'i').test(landHalf.replace(/^.*— ?/, ''))) out.add(c);
  const fetch = /search your library for (?:a |up to \w+ )?basic ([A-Za-z ,]+?) cards?/i.exec(oracle);
  if (fetch) {
    const types = fetch[1].toLowerCase();
    if (/^land$/.test(types.trim()) || /land/.test(types)) colors.forEach((c) => out.add(c));
    else for (const [t, c] of Object.entries(BASIC_COLOR)) if (types.includes(t)) out.add(c);
  }
  for (const line of oracle.split(String.fromCharCode(10))) {
    if (!/^\(?\{T\}: Add /.test(line)) continue;
    if (/activate only|only if|spend this mana only|could produce|unless/i.test(line)) continue;
    if (/any color|any type/i.test(line) || /chosen color/i.test(line)) { colors.forEach((c) => out.add(c)); continue; }
    for (const m of line.matchAll(/\{([WUBRG])\}/g)) out.add(m[1]);
  }
  return colors.filter((c) => out.has(c));
}
const effProd = (c: CardInfo, colors: string[]): string[] => landColors(c.name, colors);

/** Rebalance colour sources against pip demand: source slots are shared out in proportion to pips; basics move first (free), then owned duals replace lands that feed only surplus colours. */
function landPass(list: Line[], commander: string, open: Line[], cf: Map<string, number>): { swaps: Swap[]; note: string } {
  const r = optimizeDeck({ format: 'commander', cards: list.map((c, i) => ({ ...c, board: i === 0 ? 'commander' : 'main' })), commanderName: commander }) as { mana?: { demand: Record<string, number> } };
  if (!r.mana) return { swaps: [], note: '' };
  const demand = r.mana.demand;
  const colors = Object.keys(demand).filter((c) => (demand[c] || 0) > 0 && COLOR_NAME[c]);
  if (colors.length < 2) return { swaps: [], note: 'single-colour deck, no colour balancing needed' };
  const deck = list.slice(1).flatMap((l) => { const i = info(l.name, commander, cf); return i ? (Array(l.quantity).fill(i) as CardInfo[]) : []; });
  const landsIn = deck.filter((c) => c.role === 'land');
  const sources: Record<string, number> = Object.fromEntries(colors.map((c) => [c, 0]));
  for (const l of landsIn) for (const x of effProd(l, colors)) sources[x] += 1;
  const totalPips = colors.reduce((t, c) => t + demand[c], 0);
  const slots = colors.reduce((t, c) => t + sources[c], 0);
  // Target = source slots shared half by pip share, half evenly (pure pip share starves the splash colours you still need on turn 2).
  const target: Record<string, number> = Object.fromEntries(colors.map((c) => [c, Math.max(1, Math.round((0.5 * (demand[c] / totalPips) + 0.5 / colors.length) * slots))]));
  const deficit = (c: string) => target[c] - sources[c];
  const worst = () => colors.filter((c) => deficit(c) >= 1).sort((a, b) => deficit(b) - deficit(a))[0];
  const richest = (not: string) => colors.filter((c) => c !== not && deficit(c) <= -1).sort((a, b) => deficit(a) - deficit(b))[0];
  const state = () => colors.map((c) => `${COLOR_NAME[c]} ${sources[c]}/${target[c]}`).join(', ');
  const swaps: Swap[] = [];
  const cutCount = new Map<string, number>();
  const available = (c: CardInfo) => landsIn.filter((x) => face(x.name) === face(c.name)).length - (cutCount.get(face(c.name)) || 0) > 0;
  const take = (c: CardInfo) => cutCount.set(face(c.name), (cutCount.get(face(c.name)) || 0) + 1);
  const intro = `Pip demand ${colors.map((c) => `${COLOR_NAME[c]} ${demand[c]} (${Math.round((demand[c] / totalPips) * 100)}%)`).join(', ')} across ${slots} coloured source slots (half by pip share, half even) → targets ${colors.map((c) => `${COLOR_NAME[c]} ${target[c]}`).join(', ')}; before: ${state()}.`;

  // A. basics: a basic of a surplus colour becomes a basic of the most-short colour (free).
  for (let guard = 0; guard < 4; guard++) {
    const under = worst(); if (!under) break;
    const overC = richest(under); if (!overC) break;
    const out = landsIn.find((c) => c.name === BASIC_OF[overC] && available(c));
    const inn = info(BASIC_OF[under], commander, cf);
    if (!out || !inn) break;
    take(out); sources[overC] -= 1; sources[under] += 1;
    swaps.push({ out, in: inn, why: `Colour balance: ${COLOR_NAME[under]} is short (${sources[under] - 1} of a ${target[under]} target for ${demand[under]} pips) while ${COLOR_NAME[overC]} has ${sources[overC] + 1} sources for a ${target[overC]} target. A basic ${BASIC_OF[overC]} becomes a basic ${BASIC_OF[under]} at no cost.` });
  }
  // B. duals: owned lands feeding short colours replace lands that feed only surplus colours, colourless utility lands, or surplus basics.
  const seen = new Set<string>();
  const inDeck = new Set(landsIn.map((c) => face(c.name)));
  const pool = open.map((l) => info(l.name, commander, cf)).filter((c): c is CardInfo => !!c && c.role === 'land' && !inDeck.has(face(c.name)) && !seen.has(c.name) && (seen.add(c.name), true) && c.ci.every((x) => colors.includes(x)) && effProd(c, colors).length > 0);
  const used = new Set<string>();
  for (let guard = 0; guard < 6; guard++) {
    const short = colors.filter((c) => deficit(c) >= 1); if (!short.length) break;
    const ranked = pool.filter((c) => !used.has(c.name)).map((c) => ({ c, s: effProd(c, colors).filter((x) => short.includes(x)).length * 2 + (c.tapped ? 0 : 1) + (c.inc ?? 0) })).filter((x) => x.s >= 2).sort((a, b) => b.s - a.s);
    const add = ranked[0]?.c; if (!add) break;
    const feedsOnlySurplus = (c: CardInfo) => { const e = effProd(c, colors); return e.length > 0 && e.every((x) => deficit(x) <= -1); };
    const out = landsIn.filter((c) => available(c) && !KEEP_LANDS.has(face(c.name)) && (c.inc ?? 0) < 0.1 && effProd(c, colors).length === 0).sort((a, b) => (a.inc ?? 0) - (b.inc ?? 0))[0]
      || landsIn.filter((c) => available(c) && !BASICS.has(c.name) && !KEEP_LANDS.has(face(c.name)) && feedsOnlySurplus(c) && (c.tapped || !add.tapped)).sort((a, b) => Number(!a.tapped) - Number(!b.tapped) || (a.inc ?? 0) - (b.inc ?? 0))[0]
      || landsIn.filter((c) => available(c) && BASICS.has(c.name) && feedsOnlySurplus(c))[0];
    if (!out) break;
    take(out); used.add(add.name);
    for (const x of effProd(out, colors)) sources[x] -= 1;
    for (const x of effProd(add, colors)) sources[x] += 1;
    const covers = effProd(add, colors).filter((x) => short.includes(x)).map((x) => COLOR_NAME[x]).join(' and ');
    const outWhy = effProd(out, colors).length === 0 ? 'produces no reliable colour' : `feeds only ${effProd(out, colors).map((x) => COLOR_NAME[x]).join('/')}, which ${effProd(out, colors).length > 1 ? 'are' : 'is'} over target`;
    swaps.push({ out, in: add, why: `Colour balance: ${short.map((x) => `${COLOR_NAME[x]} ${sources[x] - (effProd(add, colors).includes(x) ? 1 : 0)}/${target[x]}`).join(', ')} short. IN ${add.name} adds ${covers}${add.tapped ? ' (enters tapped)' : ' (untapped)'}${add.inc ? `, in ${pct(add.inc)} of ${commander} decks` : ''}. OUT ${out.name}: ${outWhy}${out.inc != null ? `, in ${pct(out.inc)} of ${commander} decks` : ''}.` });
  }
  const left = colors.filter((c) => deficit(c) >= 2).map((c) => `${COLOR_NAME[c]} ${sources[c]}/${target[c]}`);
  return { swaps, note: `${intro} After: ${state()}. ${left.length ? `Still short: ${left.join(', ')} — only more any-colour lands fix that.` : 'Every colour is within one source of its target.'}` };
}

function score(list: Line[], commander: string, owned: string[]) {
  const r = optimizeDeck({ format: 'commander', cards: list.map((c, i) => ({ ...c, board: i === 0 ? 'commander' : 'main' })), commanderName: commander, ownedCards: owned }) as { score: number; landTarget: { current: number; recommended: number }; health: Array<{ category: string; status: string }>; mana?: { warnings?: string[] } };
  return {
    score: r.score,
    lands: `${r.landTarget.current} (formula says ${r.landTarget.recommended})`,
    flags: (r.health || []).filter((h) => h.status !== 'ok').map((h) => `${h.category} ${h.status}`).join(', ') || 'all roles in band',
    mana: (r.mana?.warnings || []).join(' / ') || 'colour sources balanced',
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const tile = (c: CardInfo) => `<div class="tile"><img src="${esc(c.img)}" alt="${esc(c.name)}"><b>${esc(face(c.name))}</b><small>${esc(c.role)} · ${c.cmc} MV · ${pct(c.inc)}${esc(liftTxt(c.lift))}${c.cf ? ` · CF #${c.cf}` : ''}</small></div>`;

(async () => {
  const open = read(path.join(ROOT, 'open-cards.txt'));
  const openQty = new Map(open.map((c) => [face(c.name), c.quantity]));
  const cfByDeck = new Map<string, Map<string, number>>();
  const deckLists = new Map<string, Line[]>();
  for (const d of DECKS) {
    const deck = read(path.join(ROOT, 'decks', d.file));
    deckLists.set(d.key, deck);
    cfByDeck.set(d.key, await cfRanks(deck, d.commander));
    loadVpsStats(d.commander);
  }
  const planFor = (d: Deck, exclude: Set<string>) => {
    const deck = deckLists.get(d.key)!; const cf = cfByDeck.get(d.key)!;
    return d.fixedSwaps ? fixedPlan(deck, d.fixedSwaps, d.commander, cf) : autoPlan(deck, d.commander, open, cf, d, exclude);
  };
  // Pass 1: plan every deck independently. Pass 2: a card wanted by more decks than you own copies of goes to
  // the curated list first, then to the deck whose corpus rates it highest; the others are re-planned without it.
  const plans = new Map(DECKS.map((d) => [d.key, planFor(d, new Set())]));
  const claims = new Map<string, Array<{ key: string; inc: number; fixed: boolean }>>();
  for (const d of DECKS) for (const sw of plans.get(d.key)!.swaps) {
    const n = face(sw.in.name);
    if (BASICS.has(n)) continue;
    if (!claims.has(n)) claims.set(n, []);
    claims.get(n)!.push({ key: d.key, inc: sw.in.inc ?? 0, fixed: Boolean(d.fixedSwaps) });
  }
  const exclusions = new Map(DECKS.map((d) => [d.key, new Set<string>()]));
  const contested: string[] = [];
  for (const [name, wanters] of claims) {
    const copies = openQty.get(name) || 0;
    if (wanters.length <= copies) continue;
    const ranked = [...wanters].sort((a, b) => Number(b.fixed) - Number(a.fixed) || b.inc - a.inc);
    for (const loser of ranked.slice(copies)) exclusions.get(loser.key)!.add(name);
    contested.push(`${name} (${copies} owned) -> ${ranked.slice(0, copies).map((w) => w.key).join(', ')}`);
  }
  for (const d of DECKS) if (exclusions.get(d.key)!.size) plans.set(d.key, planFor(d, exclusions.get(d.key)!));
  console.log(contested.length ? 'single copies assigned by corpus rating: ' + contested.join(' | ') : 'no card is wanted by more decks than you own copies of');

  let sections = '';
  for (const d of DECKS) {
    const deck = deckLists.get(d.key)!; const cf = cfByDeck.get(d.key)!; const plan = plans.get(d.key)!;
    const owned = [...deck, ...open].map((c) => c.name);
    // Apply the swaps. Deck files carry front-face names; CardInfo carries the full DFC name.
    const next = new Map(deck.map((c) => [face(c.name), c.quantity]));
    for (const sw of plan.swaps) {
      const o = face(sw.out.name); const a = face(sw.in.name);
      next.set(o, (next.get(o) || 1) - 1);
      if ((next.get(o) || 0) <= 0) next.delete(o);
      next.set(a, (next.get(a) || 0) + 1);
    }
    const commanderName = face(deck[0].name);
    const build = () => [{ quantity: 1, name: commanderName }, ...[...next].filter(([n]) => n !== commanderName).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name))] as Line[];
    const landFix = landPass(build(), d.commander, open, cf);
    for (const sw of landFix.swaps) {
      const o = face(sw.out.name); const a = face(sw.in.name);
      next.set(o, (next.get(o) || 1) - 1);
      if ((next.get(o) || 0) <= 0) next.delete(o);
      next.set(a, (next.get(a) || 0) + 1);
    }
    plan.swaps.push(...landFix.swaps);
    if (landFix.note) plan.notes.push(`Lands: ${landFix.note}.`);
    const nextList = build();
    const proposalFile = d.fixedSwaps ? `${d.key}-final.txt` : `${d.key}-model.txt`;
    fs.writeFileSync(path.join(ROOT, 'proposals', proposalFile), nextList.map((c) => `${c.quantity} ${c.name}`).join(NL) + NL);
    const before = score(deck, d.commander, owned);
    const after = score(nextList, d.commander, owned);
    const infoOf = (l: Line[]) => l.slice(1).flatMap((x) => { const i = info(x.name, d.commander, cf); return i ? (Array(x.quantity).fill(i) as CardInfo[]) : []; });
    const curveBefore = curveText(infoOf(deck)); const curveAfter = curveText(infoOf(nextList));
    const total = nextList.reduce((t, c) => t + c.quantity, 0);
    console.log(`${d.title}: ${plan.swaps.length} swaps, score ${before.score} -> ${after.score}, ${total} cards -> proposals/${proposalFile}${vpsLoaded.has(d.commander) ? '' : ' (VPS stats missing!)'}`);

    const notes = [...(d.caveat ? [d.caveat] : []), ...plan.notes];
    sections += `<section id="${d.key}"><h2>${esc(d.title)} <span class="count"></span></h2>
<table class="stats"><tr><th></th><th>now</th><th>after</th></tr><tr><td>Optimizer score</td><td>${before.score}</td><td><b>${after.score}</b></td></tr><tr><td>Lands</td><td>${esc(before.lands)}</td><td>${esc(after.lands)}</td></tr><tr><td>Role quotas</td><td>${esc(before.flags)}</td><td>${esc(after.flags)}</td></tr><tr><td>Mana curve (nonland by MV)</td><td>${esc(curveBefore)}</td><td>${esc(curveAfter)}</td></tr><tr><td>Colour sources</td><td>${esc(before.mana)}</td><td>${esc(after.mana)}</td></tr></table>
${notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}
<p class="note">ManaBox list after all swaps: <code>decks/paper/proposals/${esc(proposalFile)}</code> (copy on the Desktop). ${cf.size ? 'CF # = rank in the trained recommender for this exact deck.' : 'The CF recommender was offline for this run; only corpus numbers are shown.'}</p>
<div class="swaps">${plan.swaps.map((sw, i) => `<label class="swap" data-key="${d.key}:${esc(sw.out.name)}>${esc(sw.in.name)}"><input type="checkbox"><span class="n">${i + 1}</span>${tile(sw.out)}<span class="arrow">→</span>${tile(sw.in)}<p class="why">${esc(sw.why)}</p></label>`).join('')}</div></section>`;
  }

  const css = [
    'body{margin:0;background:#15110d;color:#e8dcc4;font:15px/1.45 Georgia,serif}',
    'header{position:sticky;top:0;background:#1d1711;border-bottom:1px solid #6b5220;padding:10px 18px;display:flex;gap:18px;align-items:center;z-index:2}',
    'h1{font-size:18px;margin:0;color:#d4af37}h2{font-size:20px;color:#d4af37;margin:26px 18px 8px;border-bottom:1px solid #3a2d17;padding-bottom:4px}nav a{color:#d4af37;margin-right:12px}',
    '.stats{margin:0 18px 8px;border-collapse:collapse;font-size:14px}.stats td,.stats th{border:1px solid #3a2d17;padding:4px 10px;text-align:left}.stats th{color:#b5a27b;font-weight:normal}',
    '.note{margin:6px 18px;color:#b5a27b;font-size:13px}code{color:#e8dcc4}',
    '.swaps{display:grid;gap:12px;padding:6px 18px}.swap{display:grid;grid-template-columns:24px 28px 150px 30px 150px minmax(0,1fr);gap:12px;align-items:center;background:#221b13;border:1px solid #3a2d17;border-radius:8px;padding:10px;cursor:pointer}',
    '.swap:has(input:checked){opacity:.4}.swap input{width:18px;height:18px;accent-color:#d4af37}.n{color:#b5a27b;font-family:monospace}.arrow{color:#d4af37;font-size:22px;text-align:center}',
    '.tile{width:150px}.tile img{width:150px;height:auto;aspect-ratio:488/680;border-radius:6px;display:block;background:#0e0b08}.tile b{display:block;font-size:13px;margin-top:4px}.tile small{color:#b5a27b;font-size:11px;display:block}.why{margin:0;font-size:13px}',
    '.count{font-weight:normal;font-size:13px;color:#b5a27b}@media(max-width:900px){.swap{grid-template-columns:24px 28px 150px 30px 150px}.why{grid-column:1/-1}}@media print{header,.swap input{display:none}.swap:has(input:checked){display:none}}',
  ].join(NL);
  const js = [
    "const K='deck-edit-ticks';const s=new Set(JSON.parse(localStorage.getItem(K)||'[]'));const all=[...document.querySelectorAll('.swap')];",
    "const upd=()=>{document.getElementById('done').textContent=all.filter(x=>s.has(x.dataset.key)).length+' / '+all.length+' swaps done';document.querySelectorAll('section').forEach(sec=>{const c=[...sec.querySelectorAll('.swap')];sec.querySelector('.count').textContent=c.filter(x=>s.has(x.dataset.key)).length+'/'+c.length+' done';});};",
    "all.forEach(x=>{const i=x.querySelector('input');i.checked=s.has(x.dataset.key);i.addEventListener('change',()=>{i.checked?s.add(x.dataset.key):s.delete(x.dataset.key);localStorage.setItem(K,JSON.stringify([...s]));upd();});});upd();",
  ].join(NL);
  const legend = 'Inclusion % = share of that commander\'s decks in the 4M-deck corpus running the card (0% = practically never). Lift = log-ratio against decks of the same colours; positive means commander-specific. CF # = rank from the trained recommender for this exact list. Tick a swap once the cards are sleeved. A single copy is never proposed to two decks: a contested card goes to the curated list first, then to the deck whose corpus rates it highest.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck edit plans — ${new Date().toISOString().slice(0, 10)}</title><style>${css}</style></head><body>`
    + `<header><h1>Deck edit plans — final recommendation (2026-09-09)</h1><nav>${DECKS.map((d) => `<a href="#${d.key}">${esc(d.title.split(',')[0])}</a>`).join('')}</nav><span id="done"></span><span style="margin-left:auto;font-size:12px;color:#b5a27b;max-width:46%">${esc(legend)}</span></header>`
    + sections + `<script>${js}</script></body></html>`;
  for (const f of OUT_HTML) fs.writeFileSync(f, html);
  console.log('written', OUT_HTML.join(' , '));
})();
