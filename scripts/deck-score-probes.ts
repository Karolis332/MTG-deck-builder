/**
 * Deck Score v1.4 stage 0 (§10.4) — the REGISTERED gaming-invariance probes.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-probes.ts --profile commander
 *   … [--n 1824] [--k 1,5,10]
 *
 * Every probe is a NO-BENEFIT edit: it adds, removes or swaps copies that
 * cannot make a plan more executable. §10.4's allowance for the whole k-copy
 * edit is **0 S points** (unrounded tolerance 1e-6) and **+1 displayed total
 * point**. Each one runs through `scoreDeckSafely` — the shipped entry point,
 * never a component formula — on the profile's real training stride.
 *
 * Stage 0 REGISTERS the baseline: the current S is expected to fail several of
 * these, and publishing the maxima and the violating list ids is the point.
 * Nothing here edits the scorer.
 */
import fs from 'fs';
import path from 'path';
import { parseIdentity } from '../src/lib/deck-gate-parse';
import { deriveCardFeature, type CardFeature } from '../src/lib/deck-score-features';
import { candidatePlans, recipesFor, type PlanRole } from '../src/lib/deck-score-plans';
import { producerUtilisation } from '../src/lib/deck-score-producers';
import { profileOf } from '../src/lib/deck-score-norms';
import { scoreDeckSafely, type ScoreCardInput } from '../src/lib/deck-score-input';
import type { DbCard } from '../src/lib/types';
import { loadDataset, OUT_DIR } from './deck-score-fixtures';
import { cardsByName, controlPool, readSample, strideOrder, type SampleProfile } from './deck-score-piles';

/** v1.4 stage 3b: Standard now carries a frozen reference (stage 3 R4), so it
 * needs the same gaming gate. Its stride is the dated W/L cohort `bands`
 * freezes the reference on, and its fixed-slot counterpart is the 60-card
 * minimum rather than the singleton library. */
export type ProbeProfile = SampleProfile | 'standard';

const BASICS = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);

export interface Deck {
  id: string;
  format: ProbeProfile;
  main: ScoreCardInput[];
  commander: DbCard[];
  identity: string[];
}

/** `U` is read from the frozen §10.7 reason template (`U 37.0/99`) so the
 * probe grades the same useful mass the score published. */
interface Reading {
  S: number; total: number; U: number; failing: number;
  /** §10.9 item 5: the headline. Null when the list left the rank domain, so
   * a delta is only graded when BOTH endpoints carry a numeric rank. */
  rank: number | null; rankDisplay: number | null;
  /** The unrounded composed total the rank is taken of. */
  absolute: number;
}

function read(deck: Deck, main: ScoreCardInput[], unresolved: { name: string; quantity: number; board: string }[] = []): Reading | null {
  const payload = scoreDeckSafely({ format: deck.format, main, commander: deck.commander, unresolved });
  if (!payload) return null;
  const synergy = payload.components.find((c) => c.key === 'synergy');
  const mass = /U ([\d.]+)\/(\d+)/.exec(synergy?.reason ?? '');
  return {
    S: synergy?.score ?? 0, total: payload.score, U: mass ? Number(mass[1]) : 0,
    failing: payload.gates.filter((g) => g.status === 'fail').length,
    rank: payload.rank, rankDisplay: payload.rankDisplay, absolute: payload.absoluteTotal,
  };
}

/** The stride, resolved once. Unresolved names become reserved slots (§10.5),
 * so a probe that adds unknown copies starts from an honest library size. */
function stride(profile: ProbeProfile, n: number): Deck[] {
  if (profile === 'standard') return standardStride(n);
  const byName = cardsByName();
  const sample = readSample(profile);
  const out: Deck[] = [];
  for (const i of strideOrder('training', sample)) {
    if (out.length >= n) break;
    const deck = sample[i];
    if (!deck) continue;
    const main: ScoreCardInput[] = [];
    const commander: DbCard[] = [];
    const commanderName = deck.commander.toLowerCase();
    let took = false;
    let missing = 0;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing += line.quantity; continue; }
      if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    if (main.length === 0 || commander.length === 0 || missing > 0) continue;
    out.push({
      id: deck.id, format: profile, main, commander,
      identity: [...new Set(commander.flatMap((c) => parseIdentity(c.color_identity)))],
    });
  }
  return out;
}

/** The Standard training stride: the same dated event cohort `bands` freezes
 * the Standard reference on, in the same order, so a probe grades the lists
 * the CDF was cut from. Colour identity is the union of the list's own cards —
 * a 60-card deck has no command zone to read it from. */
export function standardStride(n: number): Deck[] {
  const data = loadDataset(0);
  const out: Deck[] = [];
  for (const row of [...data.standardPositive, ...data.standardNegative]) {
    if (out.length >= n) break;
    if (row.input.unresolved.length > 0 || row.input.main.length === 0) continue;
    const identity = [...new Set(row.input.main.flatMap((e) => parseIdentity(e.card.color_identity)))];
    out.push({
      id: `standard:${row.id}`, format: 'standard',
      main: row.input.main.map((e) => ({ card: e.card, quantity: e.quantity })),
      commander: [], identity,
    });
  }
  return out;
}

/** Standard's addition pool: the cards the stride itself runs, which are
 * snapshot-legal in the format by construction. `controlPool` only knows the
 * two 100-card profiles. */
let standardPoolCache: { card: DbCard; covered: boolean; identity: string[] }[] | null = null;
function standardPool(): { card: DbCard; covered: boolean; identity: string[] }[] {
  if (standardPoolCache) return standardPoolCache;
  const seen = new Map<string, { card: DbCard; covered: boolean; identity: string[] }>();
  for (const deck of standardStride(100000)) {
    for (const e of deck.main) {
      if (seen.has(e.card.id)) continue;
      const feature = deriveCardFeature(e.card);
      if (feature.isLand) continue;
      seen.set(e.card.id, { card: e.card, covered: feature.covered, identity: parseIdentity(e.card.color_identity) });
    }
  }
  standardPoolCache = [...seen.values()];
  return standardPoolCache;
}

// ── edit construction ─────────────────────────────────────────────────────

/** A typed copy no recipe of this profile can use: it fills NO role of ANY
 * recipe, so it is proved zero-use for Q under every feasible plan. */
export function isOffPlanTyped(feature: CardFeature, profile: ProbeProfile): boolean {
  if (feature.isLand || !feature.covered) return false;
  return !recipesFor(profileOf(profile)).some((r) => r.roles.some((role) => role.fills(feature)));
}

function offPlanTyped(deck: Deck, profile: ProbeProfile): ScoreCardInput[] {
  return deck.main
    .filter((e) => isOffPlanTyped(deriveCardFeature(e.card), profile))
    .sort((a, b) => (a.card.name < b.card.name ? -1 : 1));
}

/** Remove `k` copies of the listed entries, deterministically. */
export function without(main: readonly ScoreCardInput[], remove: readonly ScoreCardInput[], k: number): ScoreCardInput[] | null {
  let left = k;
  const out: ScoreCardInput[] = [];
  const ids = new Map(remove.map((e) => [e.card.id, e]));
  for (const e of main) {
    if (left > 0 && ids.has(e.card.id)) {
      const cut = Math.min(left, e.quantity);
      left -= cut;
      if (e.quantity - cut > 0) out.push({ card: e.card, quantity: e.quantity - cut });
      continue;
    }
    out.push(e);
  }
  return left === 0 ? out : null;
}

const saturatedCache = new Map<string, { saturated: PlanRole[]; slack: PlanRole[] }>();
/**
 * Roles this deck has ALREADY filled to their §10.2 bound, over EVERY recipe
 * of the profile — not just the selected one. A copy is mechanically zero-use
 * only when every role it could fill, under every recipe, is saturated:
 * otherwise the addition feeds a slack role of some recipe, which is a real
 * improvement and belongs in §10.4's separately traced bucket.
 */
function roleSplit(deck: Deck, profile: ProbeProfile): { saturated: PlanRole[]; slack: PlanRole[] } {
  const hit = saturatedCache.get(deck.id);
  if (hit) return hit;
  const entries = deck.main.map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }));
  const nonLand = entries.filter((e) => !e.feature.isLand);
  const commanderEntries = deck.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
  const N = entries.reduce((s, e) => s + e.quantity, 0);
  const utilisation = producerUtilisation(nonLand, commanderEntries);
  // EVERY candidate the scorer could select, the deck-shaped typal recipe
  // included — reading `recipesFor` alone missed the recipe that was actually
  // selected on 5 of the first 8 violators.
  const full: PlanRole[] = [];
  const open: PlanRole[] = [];
  const openKeys = new Set<string>();
  for (const evaluation of candidatePlans(Math.max(1, N), nonLand, commanderEntries, utilisation, profileOf(profile))) {
    for (const r of evaluation.roles) {
      // Every open role object is kept, NOT one per key: two recipes can
      // share a role key and test different cards for it, so deduplicating by
      // key let a copy the aristocrats `value` role accepts pass the aggro
      // `value` predicate instead and enter the graded pool.
      if (r.credited + 1e-9 >= r.bound) full.push(r.role);
      else { openKeys.add(r.role.key); open.push(r.role); }
    }
  }
  const split = { saturated: full.filter((r) => !openKeys.has(r.key)), slack: open };
  saturatedCache.set(deck.id, split);
  return split;
}

const poolCache = new Map<string, DbCard[]>();
/** `k` identity-legal additions the deck does not already run, by category. */
function additions(
  deck: Deck, profile: ProbeProfile, kind: 'untyped' | 'ramp' | 'saturated', k: number,
): DbCard[] {
  const split = kind === 'saturated' ? roleSplit(deck, profile) : { saturated: [], slack: [] };
  const roles = split.saturated;
  if (kind === 'saturated' && roles.length === 0) return [];
  // The saturated pool depends on this deck's OWN open roles — including the
  // deck-shaped typal predicates — so it is keyed by the list, not by the
  // role names: a pool cached under a matching saturated signature admitted
  // cards another deck's slack `value` role would have accepted.
  const key = `${profile}|${kind}|${[...deck.identity].sort().join('')}` +
    (kind === 'saturated' ? `|${deck.id}` : '');
  let pool = poolCache.get(key);
  if (!pool) {
    pool = (profile === 'standard' ? standardPool() : controlPool(profile))
      .filter((p) => p.identity.every((c) => deck.identity.includes(c)))
      .filter((p) => {
        if (kind === 'untyped') return !p.covered;
        if (!p.covered) return false;
        const feature = deriveCardFeature(p.card);
        // A candidate that ALSO fills a role with headroom is a real
        // upgrade, not a zero-use staple: it must not enter the graded pool.
        return kind === 'ramp'
          ? feature.isRamp
          : roles.some((r) => r.fills(feature)) && !split.slack.some((r) => r.fills(feature));
      })
      .map((p) => p.card)
      .sort((a, b) => (a.name < b.name ? -1 : 1));
    poolCache.set(key, pool);
  }
  const held = new Set(deck.main.map((e) => e.card.name.toLowerCase()));
  const out: DbCard[] = [];
  for (const card of pool) {
    if (out.length >= k) break;
    if (held.has(card.name.toLowerCase())) continue;
    out.push(card);
  }
  return out.length === k ? out : [];
}

/** A different PRINTING of the same basic land: identical name, colour
 * availability, timing, cost and text — the §10.4 "equal count, colour
 * availability, tapped timing, costs and relevant effects" swap. */
export function clonePrinting(card: DbCard, i: number): DbCard {
  return { ...card, id: `${card.id}:printing-${i}`, set_code: 'PRB', collector_number: `${900 + i}` };
}

/** Everything §1 forbids the score from reading, moved at once, plus input
 * order. §10.4 requires DeltaS = DeltaT = 0 exactly. */
export function permuteMetadata(main: readonly ScoreCardInput[]): ScoreCardInput[] {
  return [...main].reverse().map((e, i) => ({
    quantity: e.quantity,
    card: {
      ...e.card,
      price_usd: `${(i % 97) + 0.99}`,
      price_usd_foil: `${(i % 31) + 9.99}`,
      edhrec_rank: 40000 - (e.card.edhrec_rank ?? 0),
      rarity: ['common', 'uncommon', 'rare', 'mythic'][i % 4],
      set_code: 'PRB',
      collector_number: `${100 + i}`,
      image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
      updated_at: '1999-01-01 00:00:00',
    },
  }));
}

// ── probes ────────────────────────────────────────────────────────────────

interface Delta {
  S: number; total: number; absolute: number; U: number; repaired: boolean;
  /** null when either endpoint has no rank — reported, never graded as 0. */
  rank: number | null; rankDisplay: number | null;
}
interface ProbeResult { delta: Delta | null; skipped: boolean }

const bothRanked = (a: number | null, b: number | null): number | null =>
  (a === null || b === null ? null : b - a);

const diff = (before: Reading, after: Reading): Delta => ({
  S: after.S - before.S,
  total: after.total - before.total,
  absolute: after.absolute - before.absolute,
  U: after.U - before.U,
  rank: bothRanked(before.rank, after.rank),
  rankDisplay: bothRanked(before.rankDisplay, after.rankDisplay),
  // An edit that removes a card the deck was ILLEGAL for repairs a rule
  // failure. That is a benefit, so the displayed total is allowed to move.
  repaired: after.failing < before.failing,
});

type Probe = (deck: Deck, base: Reading, k: number, profile: ProbeProfile) => ProbeResult;

const SKIP: ProbeResult = { delta: null, skipped: true };

const PROBES: Record<string, Probe> = {
  /** Delete k proved-zero-use typed copies. The library shrinks, so an
   * under-sized singleton list also picks up its own rule cap — the S
   * movement is what this probe grades. */
  'delete-offplan-typed': (deck, base, k, profile) => {
    const main = without(deck.main, offPlanTyped(deck, profile), k);
    if (!main) return SKIP;
    const after = read(deck, main);
    return after ? { delta: diff(base, after), skipped: false } : SKIP;
  },

  /** The fixed-size counterpart: the same k copies become zero-credit unknown
   * slots, so no size cap can conceal an S gain (§10.4). */
  'replace-offplan-unknown': (deck, base, k, profile) => {
    const main = without(deck.main, offPlanTyped(deck, profile), k);
    if (!main) return SKIP;
    const after = read(deck, main, [{ name: 'Unreadable Card', quantity: k, board: 'main' }]);
    return after ? { delta: diff(base, after), skipped: false } : SKIP;
  },

  /** Add k resolved-but-UNTYPED copies: U cannot rise, and Q_slot's
   * denominator grows, so S must not move up. */
  'add-untyped': (deck, base, k, profile) => {
    const add = additions(deck, profile, 'untyped', k);
    if (add.length < k) return SKIP;
    const after = read(deck, [...deck.main, ...add.map((card) => ({ card, quantity: 1 }))]);
    return after ? { delta: diff(base, after), skipped: false } : SKIP;
  },

  /** Add k typed, identity-legal staples that fill a role this deck ALREADY
   * saturates: mechanically zero-use, so staple membership must supply zero
   * credit. This is the graded staple probe. */
  'add-saturated-staples': (deck, base, k, profile) => {
    const add = additions(deck, profile, 'saturated', k);
    if (add.length < k) return SKIP;
    const after = read(deck, [...deck.main, ...add.map((card) => ({ card, quantity: 1 }))]);
    return after ? { delta: diff(base, after), skipped: false } : SKIP;
  },

  /** UNMATCHED (§10.4 "report unmatched edits separately"): k typed ramp
   * staples regardless of saturation. Extra ramp can be a real mana upgrade,
   * so a rise here is reported as a mechanical change, not a gaming failure. */
  'add-ramp-unmatched': (deck, base, k, profile) => {
    const add = additions(deck, profile, 'ramp', k);
    if (add.length < k) return SKIP;
    const after = read(deck, [...deck.main, ...add.map((card) => ({ card, quantity: 1 }))]);
    return after ? { delta: diff(base, after), skipped: false } : SKIP;
  },

  /** Swap k basics for a different printing of the SAME basic: identical
   * count, colours, timing, cost and text. S and total must not move at all. */
  'swap-lands': (deck, base, k) => {
    const basics = deck.main.filter((e) => BASICS.has(e.card.name.toLowerCase()));
    if (basics.reduce((s, e) => s + e.quantity, 0) < k) return SKIP;
    const main: ScoreCardInput[] = [];
    let left = k;
    for (const e of deck.main) {
      if (left > 0 && BASICS.has(e.card.name.toLowerCase())) {
        const cut = Math.min(left, e.quantity);
        if (e.quantity - cut > 0) main.push({ card: e.card, quantity: e.quantity - cut });
        for (let i = 0; i < cut; i++) main.push({ card: clonePrinting(e.card, left - i), quantity: 1 });
        left -= cut;
        continue;
      }
      main.push(e);
    }
    const after = read(deck, main);
    return after ? { delta: diff(base, after), skipped: false } : SKIP;
  },

  /** Price, popularity, rarity, set, printing, art and input order (§10.4
   * "DeltaS = DeltaT = 0 under provenance/ownership/price/popularity"). */
  metadata: (deck, base) => {
    const after = read(deck, permuteMetadata(deck.main));
    return after ? { delta: diff(base, after), skipped: false } : SKIP;
  },
};

// ── run ───────────────────────────────────────────────────────────────────

interface Row {
  probe: string; k: number; lists: number; skipped: number;
  maxS: number; maxTotal: number; violatorsS: string[]; violatorsTotal: string[];
  /** §10.9 item 5 maxima. `rankGone` counts edits where the rank appeared or
   * disappeared (a rule repair or a new rule failure): not a numeric delta. */
  maxAbs: number; maxRank: number; maxRankDisplay: number; rankGone: number;
  violatorsRank: string[];
  /** §10.2: an addition whose max-U assignment gains real useful mass is not
   * a no-benefit edit. Counted and reported, never graded. */
  mass: number; maxSMass: number; maxU: number;
  /** Edits that lifted a rule failure — graded on S, not on the total. */
  repaired: number;
}

/** Extra ramp can be a real mana upgrade (§10.4 "report unmatched edits
 * separately"), so its movement is measured and printed, never graded. */
const UNGRADED = new Set(['add-ramp-unmatched']);

const S_TOLERANCE = 1e-6;
const TOTAL_ALLOWANCE = 1;

function run(profile: ProbeProfile, n: number, ks: number[]): string {
  const decks = stride(profile, n);
  const rows: Row[] = [];
  const base = new Map<string, Reading>();
  for (const deck of decks) {
    const r = read(deck, deck.main);
    if (r) base.set(deck.id, r);
  }

  for (const [name, probe] of Object.entries(PROBES)) {
    // The metadata permutation is not a k-copy edit; it runs once.
    for (const k of name === 'metadata' ? [0] : ks) {
      const row: Row = {
        probe: name, k, lists: 0, skipped: 0, maxS: 0, maxTotal: 0,
        violatorsS: [], violatorsTotal: [], mass: 0, maxSMass: 0, maxU: 0, repaired: 0,
        maxAbs: 0, maxRank: 0, maxRankDisplay: 0, rankGone: 0, violatorsRank: [],
      };
      for (const deck of decks) {
        const b = base.get(deck.id);
        if (!b) { row.skipped++; continue; }
        const { delta, skipped } = probe(deck, b, k, profile);
        if (skipped || !delta) { row.skipped++; continue; }
        row.lists++;
        // §10.2 makes U the MAXIMUM over feasible assignments, and that
        // maximum is monotone: a copy filling only saturated roles can still
        // displace a dual-role occupant into a slack one, so the deck really
        // does hold one more useful copy. Such an edit is not the zero-use
        // membership §10.4 grades — it is measured and reported instead.
        const exact = name === 'metadata' || name === 'swap-lands';
        const gainedMass = !exact && delta.U > S_TOLERANCE;
        if (gainedMass) {
          row.mass++;
          row.maxSMass = Math.max(row.maxSMass, delta.S);
          row.maxU = Math.max(row.maxU, delta.U);
          continue;
        }
        row.maxS = Math.max(row.maxS, delta.S);
        if (delta.rank === null) row.rankGone++;
        if (delta.repaired) row.repaired++;
        else {
          row.maxTotal = Math.max(row.maxTotal, delta.total);
          row.maxAbs = Math.max(row.maxAbs, delta.absolute);
          if (delta.rank !== null) row.maxRank = Math.max(row.maxRank, delta.rank);
          if (delta.rankDisplay !== null) row.maxRankDisplay = Math.max(row.maxRankDisplay, delta.rankDisplay);
        }
        if (UNGRADED.has(name)) continue;
        const sBad = exact ? Math.abs(delta.S) > S_TOLERANCE : delta.S > S_TOLERANCE;
        const tBad = !delta.repaired
          && (exact ? Math.abs(delta.total) > 0 : delta.total > TOTAL_ALLOWANCE);
        // §10.9 item 5: "Deltaunrounded rank <=1 and Deltadisplayed rank <=1",
        // and exactly 0 for the metadata/equivalence probes.
        const rBad = !delta.repaired && delta.rank !== null
          && (exact
            ? Math.abs(delta.rank) > 0 || Math.abs(delta.rankDisplay ?? 0) > 0
            : delta.rank > 1 || (delta.rankDisplay ?? 0) > 1);
        if (rBad && delta.rank !== null && row.violatorsRank.length < 8) {
          row.violatorsRank.push(`${deck.id}(rank+${delta.rank.toFixed(2)}/disp+${delta.rankDisplay ?? 0})`);
        }
        if (sBad && row.violatorsS.length < 8) row.violatorsS.push(`${deck.id}(+${delta.S.toFixed(1)})`);
        if (tBad && row.violatorsTotal.length < 8) row.violatorsTotal.push(`${deck.id}(+${delta.total})`);
      }
      rows.push(row);
    }
  }

  const out = [
    `## §10.4 gaming probes — ${profile} training stride (${decks.length} fully resolved lists)`,
    '',
    'Allowance for the WHOLE k-copy edit: max +0 S (1e-6), +1 displayed total,',
    '+1 unrounded rank and +1 displayed rank (§10.9 item 5).',
    '`rank absent` counts edits where one endpoint left the rank domain: no',
    'numeric rank delta exists there, so it is counted, never graded as 0.',
    '`swap-lands` and `metadata` are equivalences: |ΔS| and |Δtotal| must be 0.',
    '`add-ramp-unmatched` is an UNMATCHED edit: extra ramp can be a real mana',
    'upgrade, so its movement is reported, not graded.',
    'The `ΔU>0` columns hold the lists where the edit raised the §10.2 useful',
    'mass itself — a real assignment gain, reported and excluded from grading.',
    '`repaired` counts edits that removed a card the deck was ILLEGAL for:',
    'lifting a rule failure is a benefit, so those totals are not graded.',
    '',
    '| probe | k | lists | skipped | max ΔS | max ΔT_abs | max Δtotal | max Δrank | max Δrank shown '
      + '| S viol | total viol | rank viol | rank absent | repaired | ΔU>0 | max ΔU | max ΔS there | worst lists |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
  ];
  for (const r of rows) {
    out.push(`| ${r.probe} | ${r.k || '-'} | ${r.lists} | ${r.skipped} | ${r.maxS.toFixed(2)} | ` +
      `${r.maxAbs.toFixed(2)} | ${r.maxTotal} | ${r.maxRank.toFixed(2)} | ${r.maxRankDisplay} | ` +
      `${r.violatorsS.length >= 8 ? '8+' : r.violatorsS.length} | ${r.violatorsTotal.length >= 8 ? '8+' : r.violatorsTotal.length} | ` +
      `${r.violatorsRank.length >= 8 ? '8+' : r.violatorsRank.length} | ${r.rankGone} | ` +
      `${r.repaired} | ${r.mass} | ${r.maxU.toFixed(1)} | ${r.maxSMass.toFixed(1)} | ` +
      `${r.violatorsS.slice(0, 3).join(' ') || r.violatorsRank.slice(0, 3).join(' ') || r.violatorsTotal.slice(0, 3).join(' ') || '—'} |`);
  }
  return out.join('\n');
}

function main(): void {
  const arg = (flag: string, fallback: string): string => {
    const i = process.argv.indexOf(flag);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
  };
  const requested = arg('--profile', 'commander');
  const profile = (requested === 'brawl' || requested === 'standard' ? requested : 'commander') as ProbeProfile;
  const n = Number(arg('--n', '100000'));
  const ks = arg('--k', '1,5,10').split(',').map(Number).filter((x) => x > 0);
  const text = run(profile, n, ks);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `probes-${profile}.md`), `${text}\n`);
  process.stdout.write(`${text}\n`);
}

if (require.main === module) main();
