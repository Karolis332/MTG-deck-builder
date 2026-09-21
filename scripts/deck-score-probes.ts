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
import { recipesFor, selectPlan, type PlanRole } from '../src/lib/deck-score-plans';
import { producerUtilisation } from '../src/lib/deck-score-producers';
import { profileOf } from '../src/lib/deck-score-norms';
import { scoreDeckSafely, type ScoreCardInput } from '../src/lib/deck-score-input';
import type { DbCard } from '../src/lib/types';
import { OUT_DIR } from './deck-score-fixtures';
import { cardsByName, controlPool, readSample, strideOrder, type SampleProfile } from './deck-score-piles';

const BASICS = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);

interface Deck {
  id: string;
  format: SampleProfile;
  main: ScoreCardInput[];
  commander: DbCard[];
  identity: string[];
}

interface Reading { S: number; total: number }

function read(deck: Deck, main: ScoreCardInput[], unresolved: { name: string; quantity: number; board: string }[] = []): Reading | null {
  const payload = scoreDeckSafely({ format: deck.format, main, commander: deck.commander, unresolved });
  if (!payload) return null;
  return { S: payload.components.find((c) => c.key === 'synergy')?.score ?? 0, total: payload.score };
}

/** The stride, resolved once. Unresolved names become reserved slots (§10.5),
 * so a probe that adds unknown copies starts from an honest library size. */
function stride(profile: SampleProfile, n: number): Deck[] {
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

// ── edit construction ─────────────────────────────────────────────────────

/** A typed copy no recipe of this profile can use: it fills NO role of ANY
 * recipe, so it is proved zero-use for Q under every feasible plan. */
export function isOffPlanTyped(feature: CardFeature, profile: SampleProfile): boolean {
  if (feature.isLand || !feature.covered) return false;
  return !recipesFor(profileOf(profile)).some((r) => r.roles.some((role) => role.fills(feature)));
}

function offPlanTyped(deck: Deck, profile: SampleProfile): ScoreCardInput[] {
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

const saturatedCache = new Map<string, PlanRole[]>();
/**
 * Roles of the SELECTED plan whose credited Q mass is already below the
 * copies assigned to them — the "already-saturated infrastructure role" of
 * §10.4. Another copy of such a role is mechanically zero-use: it can add
 * supply but no credit. Adding to an UNSATURATED role is a real improvement
 * and must not be graded as a gaming failure, so it is reported separately.
 */
function saturatedRoles(deck: Deck, profile: SampleProfile): PlanRole[] {
  const hit = saturatedCache.get(deck.id);
  if (hit) return hit;
  const entries = deck.main.map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }));
  const nonLand = entries.filter((e) => !e.feature.isLand);
  const commanderEntries = deck.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
  const N = entries.reduce((s, e) => s + e.quantity, 0);
  const utilisation = producerUtilisation(nonLand, commanderEntries);
  const plan = selectPlan(Math.max(1, N), nonLand, commanderEntries, utilisation, profileOf(profile));
  const roles = plan.roles.filter((r) => r.supply > r.credited + 1e-9).map((r) => r.role);
  saturatedCache.set(deck.id, roles);
  return roles;
}

const poolCache = new Map<string, DbCard[]>();
/** `k` identity-legal additions the deck does not already run, by category. */
function additions(
  deck: Deck, profile: SampleProfile, kind: 'untyped' | 'ramp' | 'saturated', k: number,
): DbCard[] {
  const roles = kind === 'saturated' ? saturatedRoles(deck, profile) : [];
  if (kind === 'saturated' && roles.length === 0) return [];
  const key = `${profile}|${kind}|${[...deck.identity].sort().join('')}` +
    (kind === 'saturated' ? `|${roles.map((r) => r.key).sort().join(',')}` : '');
  let pool = poolCache.get(key);
  if (!pool) {
    pool = controlPool(profile)
      .filter((p) => p.identity.every((c) => deck.identity.includes(c)))
      .filter((p) => {
        if (kind === 'untyped') return !p.covered;
        if (!p.covered) return false;
        const feature = deriveCardFeature(p.card);
        return kind === 'ramp' ? feature.isRamp : roles.some((r) => r.fills(feature));
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

interface ProbeResult { delta: { S: number; total: number } | null; skipped: boolean }

type Probe = (deck: Deck, base: Reading, k: number, profile: SampleProfile) => ProbeResult;

const SKIP: ProbeResult = { delta: null, skipped: true };

const PROBES: Record<string, Probe> = {
  /** Delete k proved-zero-use typed copies. The library shrinks, so an
   * under-sized singleton list also picks up its own rule cap — the S
   * movement is what this probe grades. */
  'delete-offplan-typed': (deck, base, k, profile) => {
    const main = without(deck.main, offPlanTyped(deck, profile), k);
    if (!main) return SKIP;
    const after = read(deck, main);
    return after ? { delta: { S: after.S - base.S, total: after.total - base.total }, skipped: false } : SKIP;
  },

  /** The fixed-size counterpart: the same k copies become zero-credit unknown
   * slots, so no size cap can conceal an S gain (§10.4). */
  'replace-offplan-unknown': (deck, base, k, profile) => {
    const main = without(deck.main, offPlanTyped(deck, profile), k);
    if (!main) return SKIP;
    const after = read(deck, main, [{ name: 'Unreadable Card', quantity: k, board: 'main' }]);
    return after ? { delta: { S: after.S - base.S, total: after.total - base.total }, skipped: false } : SKIP;
  },

  /** Add k resolved-but-UNTYPED copies: U cannot rise, and Q_slot's
   * denominator grows, so S must not move up. */
  'add-untyped': (deck, base, k, profile) => {
    const add = additions(deck, profile, 'untyped', k);
    if (add.length < k) return SKIP;
    const after = read(deck, [...deck.main, ...add.map((card) => ({ card, quantity: 1 }))]);
    return after ? { delta: { S: after.S - base.S, total: after.total - base.total }, skipped: false } : SKIP;
  },

  /** Add k typed, identity-legal staples that fill a role this deck ALREADY
   * saturates: mechanically zero-use, so staple membership must supply zero
   * credit. This is the graded staple probe. */
  'add-saturated-staples': (deck, base, k, profile) => {
    const add = additions(deck, profile, 'saturated', k);
    if (add.length < k) return SKIP;
    const after = read(deck, [...deck.main, ...add.map((card) => ({ card, quantity: 1 }))]);
    return after ? { delta: { S: after.S - base.S, total: after.total - base.total }, skipped: false } : SKIP;
  },

  /** UNMATCHED (§10.4 "report unmatched edits separately"): k typed ramp
   * staples regardless of saturation. Extra ramp can be a real mana upgrade,
   * so a rise here is reported as a mechanical change, not a gaming failure. */
  'add-ramp-unmatched': (deck, base, k, profile) => {
    const add = additions(deck, profile, 'ramp', k);
    if (add.length < k) return SKIP;
    const after = read(deck, [...deck.main, ...add.map((card) => ({ card, quantity: 1 }))]);
    return after ? { delta: { S: after.S - base.S, total: after.total - base.total }, skipped: false } : SKIP;
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
    return after ? { delta: { S: after.S - base.S, total: after.total - base.total }, skipped: false } : SKIP;
  },

  /** Price, popularity, rarity, set, printing, art and input order (§10.4
   * "DeltaS = DeltaT = 0 under provenance/ownership/price/popularity"). */
  metadata: (deck, base) => {
    const after = read(deck, permuteMetadata(deck.main));
    return after ? { delta: { S: after.S - base.S, total: after.total - base.total }, skipped: false } : SKIP;
  },
};

// ── run ───────────────────────────────────────────────────────────────────

interface Row {
  probe: string; k: number; lists: number; skipped: number;
  maxS: number; maxTotal: number; violatorsS: string[]; violatorsTotal: string[];
}

const S_TOLERANCE = 1e-6;
const TOTAL_ALLOWANCE = 1;

function run(profile: SampleProfile, n: number, ks: number[]): string {
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
      const row: Row = { probe: name, k, lists: 0, skipped: 0, maxS: 0, maxTotal: 0, violatorsS: [], violatorsTotal: [] };
      for (const deck of decks) {
        const b = base.get(deck.id);
        if (!b) { row.skipped++; continue; }
        const { delta, skipped } = probe(deck, b, k, profile);
        if (skipped || !delta) { row.skipped++; continue; }
        row.lists++;
        row.maxS = Math.max(row.maxS, delta.S);
        row.maxTotal = Math.max(row.maxTotal, delta.total);
        const sBad = name === 'metadata' || name === 'swap-lands' ? Math.abs(delta.S) > S_TOLERANCE : delta.S > S_TOLERANCE;
        const tBad = name === 'metadata' || name === 'swap-lands'
          ? Math.abs(delta.total) > 0
          : delta.total > TOTAL_ALLOWANCE;
        if (sBad && row.violatorsS.length < 8) row.violatorsS.push(`${deck.id}(+${delta.S.toFixed(1)})`);
        if (tBad && row.violatorsTotal.length < 8) row.violatorsTotal.push(`${deck.id}(+${delta.total})`);
        if (sBad) row.maxS = Math.max(row.maxS, delta.S);
      }
      rows.push(row);
    }
  }

  const out = [
    `## §10.4 gaming probes — ${profile} training stride (${decks.length} fully resolved lists)`,
    '',
    'Allowance for the WHOLE k-copy edit: max +0 S (1e-6) and +1 displayed total.',
    '`swap-lands` and `metadata` are equivalences: |ΔS| and |Δtotal| must be 0.',
    '`add-ramp-unmatched` is an UNMATCHED edit: extra ramp can be a real mana',
    'upgrade, so its movement is reported, not graded.',
    '',
    '| probe | k | lists | skipped | max ΔS | max Δtotal | S violations | total violations | worst lists |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|',
  ];
  for (const r of rows) {
    out.push(`| ${r.probe} | ${r.k || '-'} | ${r.lists} | ${r.skipped} | ${r.maxS.toFixed(2)} | ${r.maxTotal} | ` +
      `${r.violatorsS.length >= 8 ? '8+' : r.violatorsS.length} | ${r.violatorsTotal.length >= 8 ? '8+' : r.violatorsTotal.length} | ` +
      `${r.violatorsS.slice(0, 3).join(' ') || r.violatorsTotal.slice(0, 3).join(' ') || '—'} |`);
  }
  return out.join('\n');
}

function main(): void {
  const arg = (flag: string, fallback: string): string => {
    const i = process.argv.indexOf(flag);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
  };
  const profile = (arg('--profile', 'commander') === 'brawl' ? 'brawl' : 'commander') as SampleProfile;
  const n = Number(arg('--n', '100000'));
  const ks = arg('--k', '1,5,10').split(',').map(Number).filter((x) => x > 0);
  const text = run(profile, n, ks);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `probes-${profile}.md`), `${text}\n`);
  process.stdout.write(`${text}\n`);
}

if (require.main === module) main();
