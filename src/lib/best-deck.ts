/**
 * Best-deck engine primitives: ownership-agnostic card lookup, the CF-seeded start list, the
 * objective and the power/bracket read-out. Request-driven (no files, no `collection` table) so
 * both the CLI (`scripts/best-deck-lib.ts`, which re-exports this module) and a future build-api
 * job can use it.
 *
 *   objective = Deck Score absolute total
 *             + tempo weight × goldfish tempo + keep weight × goldfish keep-7
 *             − role weight × cards outside the format's role windows (card-classifier norms)
 *
 * The DB is opened lazily, so pure helpers (`rolePenalty`) import without one.
 */
import type { Statement } from 'better-sqlite3';
import { getDb } from './db';
import { rankRemovable, withSlot } from './deck-climb';
import { scoreDeckSafely, type DeckScorePayload } from './deck-score-input';
import { goldfish, type GoldfishStats } from './goldfish-sim';
import { computePowerLevel } from './power-level-edhpl';
import { classifyCard, computeRatioHealth, getFormatRatios, getPrimaryCategory, type CardCategory, type ClassifiedCard } from './card-classifier';
import type { DbCard } from './types';

export interface Weights { tempo: number; keep: number; role: number; games: number }
// ponytail: unmeasured weights — goldfish is a tie-breaker on top of the model (a 0.05 tempo
// change ≈ 0.5 model points); the role weight exists because without it the climb stacks 20
// rocks and cuts every removal spell (2026-10-08). Tune with --tempo-weight / --keep-weight / --role-weight.
export const DEFAULT_WEIGHTS: Weights = { tempo: 10, keep: 5, role: 2, games: 300 };
// A swap must gain at least this much objective. Below it the climb chases goldfish noise: on
// 2026-10-08 it traded Blood Artist, Viscera Seer and Gray Merchant out of an aristocrats list for
// +0.01..0.15 each. 0.25 ≈ a quarter Deck Score point.
export const MIN_GAIN_DEFAULT = 0.25;
export const SEED_LANDS = 36;
export const DECK_SIZE = 99;
export const BASICS: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
export const BASIC_RE = /^(?:Snow-Covered )?(?:Plains|Island|Swamp|Mountain|Forest|Wastes)$/;
export const ROLE_CATS: readonly CardCategory[] = ['land', 'ramp', 'draw', 'removal', 'board_wipe', 'protection'];
// A seed buy may cost at most this many times its fair share of what's left (remaining budget ÷
// min(open slots, buyable candidates left)). The earlier "half of what's left" reserve let each
// pick halve the budget: Krenko at $10 bought a few mid-price cards and seeded 83 Mountains.
// ponytail: price-blind beyond the share; the climb's canSwap spends leftover budget on upgrades.
export const BUY_SHARE_MULT = 3;

// A name containing SQL LIKE metacharacters would otherwise hit the unindexed LIKE fallback below
// (e.g. a bare "%" scans the whole table and matches the first row) — same guard as
// `LIKE_WILDCARD_RE` in `services/build-api/resolve.ts` (incident review 2026-09-07).
const LIKE_WILDCARD_RE = /[%_]/;

let exactByName: Statement | undefined;
let likeByName: Statement | undefined;
/**
 * Exact `name = ? COLLATE NOCASE` first (indexed), `LIKE 'X // %'` only on a miss and only when
 * `name` has no `%`/`_` — the OR form was an unindexed full scan per name. Same order as
 * `makeCardResolver` in `services/build-api/resolve.ts`; keeps the current-printing preference
 * (non-null arena_id, then shortest name) on both queries.
 */
export function resolveCard(name: string): DbCard | undefined {
  exactByName ??= getDb().prepare(
    "select * from cards where name = ? COLLATE NOCASE and layout not in ('art_series','token') order by (arena_id is null), length(name) limit 1",
  );
  likeByName ??= getDb().prepare(
    "select * from cards where name like ? and layout not in ('art_series','token') order by (arena_id is null), length(name) limit 1",
  );
  const exact = exactByName.get(name) as DbCard | undefined;
  if (exact || LIKE_WILDCARD_RE.test(name)) return exact;
  return likeByName.get(name + ' // %') as DbCard | undefined;
}

let cfExact: Statement | undefined;
let cfLike: Statement | undefined;
/** `commander_card_stats` inclusion rates for a commander: exact match first, `LIKE` DFC fallback only on a miss. */
export function cfStats(commanderName: string): Map<string, number> {
  cfExact ??= getDb().prepare('select card_name, inclusion_rate from commander_card_stats where commander_name = ?');
  cfLike ??= getDb().prepare('select card_name, inclusion_rate from commander_card_stats where commander_name like ?');
  let rows = cfExact.all(commanderName) as { card_name: string; inclusion_rate: number }[];
  if (!rows.length) rows = cfLike.all(commanderName.split(' // ')[0] + ' // %') as typeof rows;
  return new Map(rows.map((r) => [r.card_name, r.inclusion_rate]));
}

export const identityOf = (c: DbCard): string[] => { try { return JSON.parse(c.color_identity || '[]'); } catch { return []; } };
export const legalIn = (c: DbCard, format: string): boolean => { try { return JSON.parse(c.legalities || '{}')[format] === 'legal'; } catch { return false; } };
export const isLand = (c: DbCard): boolean => /\bLand\b/.test(c.type_line.split(' // ')[0]);

export function isCommander(c: DbCard, format: string): boolean {
  const front = c.type_line.split(' // ')[0];
  const legendary = /Legendary/.test(front);
  return legalIn(c, format) && (
    (legendary && /Creature/.test(front)) ||
    (legendary && /Vehicle|Spacecraft/.test(front) && c.power !== null) ||
    (format === 'brawl' && legendary && /Planeswalker/.test(front)) ||
    /can be your commander/i.test(c.oracle_text || '')
  );
}

/** Basics are unlimited, except Wastes in paper: they count only when the collection lists them. */
export function basicsFor(identity: string[], source: string, owned: DbCard[]): DbCard[] {
  const wastes = source === 'arena' || owned.some((c) => c.name === 'Wastes') ? ['Wastes'] : [];
  const names = identity.length ? identity.map((c) => BASICS[c]) : wastes;
  return names.map((n) => resolveCard(n)!).filter(Boolean);
}

/** Owned, legal, in-identity, not banned. A colourless commander also bans "commander's color identity" producers. */
export function buildPool(commander: DbCard, legal: DbCard[], banned: ReadonlySet<string>): DbCard[] {
  const identity = identityOf(commander);
  const ban = new Set(banned);
  if (!identity.length) for (const c of legal) if (/commander's color identity/i.test(c.oracle_text || '')) ban.add(c.name);
  return legal.filter((c) => c.name !== commander.name && !ban.has(c.name) && identityOf(c).every((x) => identity.includes(x)));
}

/** Names → pool/basic cards; `missing` lists names that are not in the pool (unowned, off-colour, banned or unknown). */
export function fromNames(names: string[], pool: DbCard[], basics: DbCard[]): { cards: DbCard[]; missing: string[] } {
  const cards: DbCard[] = [];
  const missing: string[] = [];
  for (const n of names) {
    const hit = BASIC_RE.test(n)
      ? basics.find((b) => b.name === n.replace('Snow-Covered ', ''))
      : pool.find((c) => c.name === n || c.name.startsWith(n + ' // '));
    if (hit) cards.push(hit); else missing.push(n);
  }
  return { cards, missing };
}

/** 0 for owned cards and basics; otherwise the card's price. Unpriced unowned cards are not purchasable (null). */
export function costOf(card: DbCard, ownedNames: ReadonlySet<string>): number | null {
  if (ownedNames.has(card.name) || BASIC_RE.test(card.name)) return 0;
  const n = card.price_usd === null ? NaN : Number(card.price_usd);
  return Number.isFinite(n) ? n : null;
}

/** Deck Score on its 0-100 scale. 1.4+ payloads carry `absoluteTotal`; 1.2 (still on the build-api VPS) only `score`. */
export const deckScoreTotal = (m: { absoluteTotal?: number; score?: number } | null): number => m?.absoluteTotal ?? m?.score ?? 0;

export interface SeedOpts {
  /** Inclusion-rate map, e.g. a precomputed `cfStats(commander.name)` — skips the DB query. */
  incl?: Map<string, number>;
  /** Card price; null = not purchasable. Defaults to free (today's owned-only behaviour). */
  cost?: (card: DbCard) => number | null;
  /** USD budget for non-zero-cost picks. 0 = owned + basics only. Defaults to unlimited. */
  budget?: number;
}

/** CF-seeded starting list: lands by inclusion then EDHREC rank, basics by pip share, spells by inclusion. */
export function seedDeck(commander: DbCard, pool: DbCard[], basics: DbCard[], opts?: SeedOpts): DbCard[] {
  const incl = opts?.incl ?? cfStats(commander.name);
  const rel = (c: DbCard): number => incl.get(c.name) ?? incl.get(c.name.split(' // ')[0]) ?? 0;
  const order = (a: DbCard, b: DbCard): number => rel(b) - rel(a) || (a.edhrec_rank ?? 1e6) - (b.edhrec_rank ?? 1e6);

  const landTarget = basics.length ? SEED_LANDS - basics.length * 4 : SEED_LANDS;
  const landCandidates = pool.filter(isLand).sort(order).filter((c) => rel(c) >= 0.05 || (c.edhrec_rank ?? 1e6) < 2000);

  const costFn = opts?.cost;
  let remaining = opts?.budget ?? Infinity;
  const take = (sorted: DbCard[], slots: number): DbCard[] => {
    const out: DbCard[] = [];
    const costs = sorted.map((c) => (costFn ? costFn(c) : 0));
    // Buyable candidates from index i on — the share below divides the budget among them.
    const buyableFrom = new Array<number>(sorted.length + 1).fill(0);
    for (let i = sorted.length - 1; i >= 0; i--) buyableFrom[i] = buyableFrom[i + 1] + ((costs[i] ?? 0) > 0 ? 1 : 0);
    for (let i = 0; i < sorted.length && out.length < slots; i++) {
      const cost = costs[i];
      if (cost === null) continue;
      if (cost > 0) {
        const share = Math.min(slots - out.length, buyableFrom[i]);
        if (cost > Math.min(remaining, (BUY_SHARE_MULT * remaining) / share)) continue;
        remaining -= cost;
      }
      out.push(sorted[i]);
    }
    return out;
  };

  // With basics, spells get first call on the budget: a free basic nearly replaces a bought utility
  // land, so lands-first spent a small budget on lands (refute-ab N2: Krenko $10 → 84 Mountains).
  // Costs are 0 without a budget, so the order changes nothing there.
  const spellCandidates = pool.filter((c) => !isLand(c)).sort(order);
  let lands: DbCard[];
  let spells: DbCard[];
  if (basics.length) {
    spells = take(spellCandidates, DECK_SIZE - SEED_LANDS);
    lands = take(landCandidates, landTarget);
  } else {
    lands = take(landCandidates, landTarget);
    spells = take(spellCandidates, DECK_SIZE - lands.length);
  }

  const pips = new Map(basics.map((b) => [b, 1]));
  for (const s of spells) for (const b of basics) {
    const letter = Object.entries(BASICS).find(([, n]) => n === b.name)?.[0];
    if (letter) pips.set(b, (pips.get(b) ?? 0) + ((s.mana_cost || '').split(`{${letter}}`).length - 1));
  }
  const totalPips = [...pips.values()].reduce((a, b) => a + b, 0);
  const basicSlots = DECK_SIZE - lands.length - spells.length;
  const basicList: DbCard[] = [];
  basics.forEach((b, i) => {
    const n = i === basics.length - 1 ? basicSlots - basicList.length : Math.round((basicSlots * (pips.get(b) ?? 1)) / totalPips);
    for (let k = 0; k < n; k++) basicList.push(b);
  });
  return [...lands, ...basicList, ...spells].slice(0, DECK_SIZE);
}

const roleCache = new Map<string, CardCategory[]>();
export function cardRoles(c: DbCard): CardCategory[] {
  let r = roleCache.get(c.name);
  if (!r) { r = classifyCard(c.name, c.oracle_text || '', c.type_line, c.cmc); roleCache.set(c.name, r); }
  return r;
}
export const roleWindows = (format: string): Record<string, { min: number; max: number }> =>
  Object.fromEntries(ROLE_CATS.flatMap((k) => { const t = getFormatRatios(format).targets[k]; return t ? [[k, { min: t.min, max: t.max }]] : []; }));

/** Cards outside the format's role windows, summed over roles; `roles` = count per role. */
export function rolePenalty(deck: readonly (DbCard | null)[], format: string): { penalty: number; roles: Record<string, number> } {
  const cats = {} as Record<CardCategory, ClassifiedCard[]>;
  for (const c of deck) {
    if (!c) continue;
    for (const k of cardRoles(c)) (cats[k] ??= []).push({ name: c.name } as ClassifiedCard);
  }
  const health = computeRatioHealth(cats, format).filter((h) => (ROLE_CATS as readonly string[]).includes(h.category));
  const penalty = health.reduce((s, h) => s + (h.status === 'low' ? h.target.min - h.current : h.status === 'high' ? h.current - h.target.max : 0), 0);
  return { penalty, roles: Object.fromEntries(health.map((h) => [h.category, h.current])) };
}

export interface Scored { model: DeckScorePayload | null; gf: GoldfishStats; roles: Record<string, number>; rolePenalty: number; objective: number }

export function makeScorer(format: string, commander: DbCard, w: Weights) {
  return (deck: readonly (DbCard | null)[]): Scored => {
    const counts = new Map<string, { card: DbCard; quantity: number }>();
    let blanks = 0;
    for (const c of deck) {
      if (!c) { blanks++; continue; }
      const hit = counts.get(c.name);
      counts.set(c.name, { card: c, quantity: (hit?.quantity ?? 0) + 1 });
    }
    const model = scoreDeckSafely({
      format, main: [...counts.values()], commander: [commander],
      unresolved: blanks ? [{ name: '(blank)', quantity: blanks, board: 'main' }] : [],
    });
    const gf = goldfish(deck, [commander], { games: w.games });
    const { penalty, roles } = rolePenalty(deck, format);
    return { model, gf, roles, rolePenalty: penalty, objective: deckScoreTotal(model) + w.tempo * gf.tempo + w.keep * gf.keep7 - w.role * penalty };
  };
}

// ── Report pass (v2): bounded model-scored upgrades / replacements / near-misses ────────────
// Contract: `C:\Users\QuLeR\.claude\harness\briefs\best-deck-contract.md` ("v2" fields).

let priceRankedStmt: Statement | undefined;
/** A broad, EDHREC-rank-ordered, priced-only pool — deduped by name (printings share a name but
 * are different rows). `n` is generous relative to `limit` so identity/legality filtering in JS
 * afterwards doesn't starve a narrow colour identity (same shape as `edhrecFallbackCards`). */
function priceRankedCards(n: number): DbCard[] {
  priceRankedStmt ??= getDb().prepare(
    "select * from cards where price_usd is not null and layout not in ('art_series','token') order by edhrec_rank asc limit ?",
  );
  const rows = priceRankedStmt.all(n) as DbCard[];
  return [...new Map(rows.map((c) => [c.name, c])).values()];
}

/**
 * Unowned, priced, in-identity, legal, not already in the deck — sorted by this commander's
 * inclusion rate (desc) then EDHREC rank (asc), ties by name. Budget is deliberately ignored
 * here: the upgrades pass tests gain-per-dollar itself, so filtering by price here would hide a
 * correct (if expensive) upgrade before it's even scored.
 */
export function buyCandidatesForReport(
  commander: DbCard, format: string, ownedNames: ReadonlySet<string>, inDeckNames: ReadonlySet<string>, limit: number,
): DbCard[] {
  const identity = identityOf(commander);
  const incl = cfStats(commander.name);
  const pool = priceRankedCards(limit * 50);
  return pool
    .filter((c) => c.name !== commander.name && !ownedNames.has(c.name) && !inDeckNames.has(c.name)
      && legalIn(c, format) && identityOf(c).every((x) => identity.includes(x)))
    .sort((a, b) => (incl.get(b.name) ?? 0) - (incl.get(a.name) ?? 0) || (a.edhrec_rank ?? 1e6) - (b.edhrec_rank ?? 1e6) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export interface ReportUpgrade { name: string; priceUsd: number; replaces: string; gain: number }
export interface ReportReplacementOption { name: string; delta: number }
export interface ReportReplacement { forCard: string; options: ReportReplacementOption[] }
export interface ReportNearMiss { name: string; owned: boolean; priceUsd: number | null; delta: number; slot: string }
export interface ReportResult {
  upgrades: ReportUpgrade[];
  replacements: ReportReplacement[];
  nearMisses: ReportNearMiss[];
  evaluations: number;
}

export interface ReportOpts {
  format: string;
  commander: DbCard;
  weights: Weights;
  /** Resolved owned cards (for same-role replacement candidates), not just names. */
  ownedCards: readonly DbCard[];
  ownedNames: ReadonlySet<string>;
  basics: readonly DbCard[];
  /** Default: ≤ 600 evaluations. */
  maxEvaluations?: number;
  /** Default: ≤ 60s, relative to now. */
  deadlineMs?: number;
  /** Minimum |delta| to count as an upgrade; also the near-miss band's half-width. Default 0.25. */
  epsilon?: number;
}

const REPORT_UPGRADE_CANDIDATES = 30;
const REPORT_UPGRADE_MAX = 15;
const REPORT_UPGRADE_SLOTS = 6; // K in the brief
const REPORT_REPLACEMENT_CANDIDATES = 5;
const REPORT_REPLACEMENT_MAX = 2;
const REPORT_NEAR_MISS_MAX = 12;
export const REPORT_MAX_EVALUATIONS = 600;
export const REPORT_DEADLINE_MS = 60_000;

/**
 * Bounded post-climb report: top unowned upgrades (budget ignored, ranked gain/$), the best owned
 * stand-ins for each buy-list card, and everything tested that landed in neither bucket (the
 * maybeboard). Stops issuing new tests once the evaluation or wall-clock budget is spent — a
 * partially-filled report (fewer than the max rows) is the correct behaviour under pressure, not
 * a bug. Deterministic: every candidate list and every output list has a name tiebreak.
 */
export function reportAlternatives(
  deck: readonly DbCard[], buyList: readonly { name: string; priceUsd: number }[], opts: ReportOpts,
): ReportResult {
  const deadlineAt = Date.now() + (opts.deadlineMs ?? REPORT_DEADLINE_MS);
  const maxEvaluations = opts.maxEvaluations ?? REPORT_MAX_EVALUATIONS;
  const epsilon = opts.epsilon ?? MIN_GAIN_DEFAULT;
  const scorer = makeScorer(opts.format, opts.commander, opts.weights);
  const repeatable = new Set(opts.basics.map((b) => b.name));

  let evaluations = 0;
  const withinBudget = (): boolean => evaluations < maxEvaluations && Date.now() < deadlineAt;
  const score = (d: readonly (DbCard | null)[]): number => {
    evaluations++;
    return scorer(d).objective;
  };

  // ponytail: this removal ranking isn't itself budget-gated — it always costs up to one
  // evaluation per non-basic deck slot (DECK_SIZE = 99, well under maxEvaluations' 600 default),
  // same as climbDeck's own per-pass ranking. Only safe because the deck size is fixed and small;
  // gate it too if `reportAlternatives` is ever asked to rank something unbounded.
  const current = score(deck);
  const deckNames = new Set(deck.map((c) => c.name));
  const weakSlots = rankRemovable(deck, current, score, { repeatable }).slice(0, REPORT_UPGRADE_SLOTS);

  // Every candidate tested (upgrade or replacement), keyed by name, remembering the
  // smallest-magnitude delta seen — the near-miss pass reuses this rather than re-testing.
  const tested = new Map<string, { delta: number; slot: string; owned: boolean; priceUsd: number | null }>();
  const remember = (name: string, delta: number, slot: string, owned: boolean, priceUsd: number | null): void => {
    const prior = tested.get(name);
    if (!prior || Math.abs(delta) < Math.abs(prior.delta)) tested.set(name, { delta, slot, owned, priceUsd });
  };

  // ── upgrades: top unpriced candidates tested on the K weakest slots, budget ignored ──
  const upgrades: ReportUpgrade[] = [];
  if (withinBudget() && weakSlots.length) {
    const candidates = buyCandidatesForReport(opts.commander, opts.format, opts.ownedNames, deckNames, REPORT_UPGRADE_CANDIDATES);
    for (const cand of candidates) {
      if (!withinBudget()) break;
      const price = costOf(cand, opts.ownedNames);
      if (price === null || price <= 0) continue;
      let bestDelta = -Infinity;
      let bestSlot = weakSlots[0].name;
      for (const slot of weakSlots) {
        if (!withinBudget()) break;
        const delta = score(withSlot(deck, slot.i, cand)) - current;
        if (delta > bestDelta) { bestDelta = delta; bestSlot = slot.name; }
      }
      remember(cand.name, bestDelta, bestSlot, false, price);
      if (bestDelta >= epsilon) {
        upgrades.push({ name: cand.name, priceUsd: price, replaces: bestSlot, gain: Math.round(bestDelta * 100) / 100 });
      }
    }
  }
  upgrades.sort((a, b) => (b.gain / b.priceUsd) - (a.gain / a.priceUsd) || a.name.localeCompare(b.name));
  const upgradesOut = upgrades.slice(0, REPORT_UPGRADE_MAX);

  // ── replacements: per buy-list card, the best owned same-role stand-ins for its slot ──
  const incl = cfStats(opts.commander.name);
  const ownedNotInDeck = opts.ownedCards.filter((c) => !deckNames.has(c.name) && !BASIC_RE.test(c.name));
  const replacements: ReportReplacement[] = [];
  for (const buyEntry of buyList) {
    if (!withinBudget() || buyEntry.name === opts.commander.name) continue;
    const slotIdx = deck.findIndex((c) => c.name === buyEntry.name);
    if (slotIdx === -1) continue;
    const slotCard = deck[slotIdx];
    const role = getPrimaryCategory(classifyCard(slotCard.name, slotCard.oracle_text || '', slotCard.type_line, slotCard.cmc));
    const candidates = ownedNotInDeck
      .filter((c) => getPrimaryCategory(classifyCard(c.name, c.oracle_text || '', c.type_line, c.cmc)) === role)
      .sort((a, b) => (incl.get(b.name) ?? 0) - (incl.get(a.name) ?? 0) || (a.edhrec_rank ?? 1e6) - (b.edhrec_rank ?? 1e6) || a.name.localeCompare(b.name))
      .slice(0, REPORT_REPLACEMENT_CANDIDATES);

    const options: ReportReplacementOption[] = [];
    for (const cand of candidates) {
      if (!withinBudget()) break;
      const delta = Math.round((score(withSlot(deck, slotIdx, cand)) - current) * 100) / 100;
      options.push({ name: cand.name, delta });
      remember(cand.name, delta, slotCard.name, true, null);
    }
    options.sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name));
    replacements.push({ forCard: buyEntry.name, options: options.slice(0, REPORT_REPLACEMENT_MAX) });
  }
  replacements.sort((a, b) => a.forCard.localeCompare(b.forCard));

  // ── near-misses: everything tested above that landed within ε of entering (the maybeboard) ──
  const nearMisses: ReportNearMiss[] = [...tested.entries()]
    .filter(([, v]) => v.delta > -epsilon && v.delta < epsilon)
    .map(([name, v]) => ({ name, owned: v.owned, priceUsd: v.priceUsd, delta: v.delta, slot: v.slot }))
    .sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name))
    .slice(0, REPORT_NEAR_MISS_MAX);

  return { upgrades: upgradesOut, replacements, nearMisses, evaluations };
}

export function powerOf(deck: readonly DbCard[], commander: DbCard): { powerLevel: number; bracket: number } {
  const counts = new Map<string, { card: DbCard; quantity: number }>();
  for (const c of [commander, ...deck]) counts.set(c.name, { card: c, quantity: (counts.get(c.name)?.quantity ?? 0) + 1 });
  const r = computePowerLevel([...counts.values()].map(({ card, quantity }) => ({
    name: card.name, quantity, price: card.price_usd ? Number(card.price_usd) : null, edhrecRank: card.edhrec_rank,
    cmc: card.cmc, typeLine: card.type_line, layout: card.layout, manaCost: card.mana_cost ?? undefined,
    oracleText: card.oracle_text, gameChanger: !!card.game_changer,
    producedMana: card.produced_mana ? JSON.parse(card.produced_mana) : undefined,
  })), [commander.name]);
  return { powerLevel: r.powerLevel, bracket: r.bracket };
}
