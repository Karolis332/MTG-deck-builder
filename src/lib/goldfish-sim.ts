/**
 * Goldfish Monte Carlo for a Commander/Brawl library: seeded shuffles, London mulligan
 * (first mulligan free, multiplayer rule), one land a turn, greedy casting on an empty table.
 *
 * Seeded per game → common random numbers: two libraries that differ in one slot see the
 * same shuffle, so a one-card difference in the stats is signal, not sampling noise.
 *
 * // ponytail: no card draw / tutors / interaction, conditional "enters tapped" lands count
 * // as untapped, ramp spells fetch one tapped land. Upgrade path: per-card effect tags
 * // from the deck-score features instead of these regexes.
 */
import type { DbCard } from './types';

export interface GoldfishOptions {
  games?: number;
  turns?: number;
  seed?: number;
  onThePlay?: boolean;
}

export interface GoldfishStats {
  games: number;
  /** Share of games kept at seven (after the free mulligan). */
  keep7: number;
  avgHandSize: number;
  /** P(4+ lands in play on turn 4). */
  landsT4: number;
  /** P(fewer than 3 lands in play on turn 3). */
  screwT3: number;
  /** P(7+ lands in play on turn 6). */
  floodT6: number;
  /** Mean turn the commander is cast (turns + 1 when never). */
  commanderTurn: number;
  /** P(commander cast by turn max(cmc, 1)). */
  commanderOnCurve: number;
  /** Mana spent over turns 1..T divided by 1+2+…+T (a perfect land-a-turn curve = 1). */
  tempo: number;
  /** Mean spells cast by turn 6, commander included. */
  spellsByT6: number;
}

const W = 1, U = 2, B = 4, R = 8, G = 16, C = 32;
const ALL = W | U | B | R | G;
const COLOR_BIT: Record<string, number> = { W, U, B, R, G, C };
const BASIC_TYPE_BIT: [RegExp, number][] = [[/Plains/, W], [/Island/, U], [/Swamp/, B], [/Mountain/, R], [/Forest/, G]];

interface SimCard {
  land: boolean;
  tapped: boolean;
  /** Colours this card's mana can be (lands, rocks, dorks); 0 for non-producers. */
  mask: number;
  /** Mana a rock/dork adds per tap; 1 for lands. */
  amount: number;
  rock: boolean;
  dork: boolean;
  /** Puts a land from the library onto the battlefield. */
  ramp: boolean;
  cmc: number;
  generic: number;
  /** One mask per coloured pip (hybrid = union). */
  pips: number[];
}

const DEAD: SimCard = { land: false, tapped: false, mask: 0, amount: 0, rock: false, dork: false, ramp: false, cmc: 99, generic: 99, pips: [] };
const simCache = new Map<string, SimCard>();

function producedMask(card: DbCard): number {
  let mask = 0;
  try {
    for (const c of JSON.parse(card.produced_mana || '[]') as string[]) mask |= COLOR_BIT[c] ?? 0;
  } catch { /* unparsable produced_mana → fall through to text */ }
  const text = card.oracle_text || '';
  if (/mana of any (?:color|type)/i.test(text)) mask |= ALL;
  for (const [re, bit] of BASIC_TYPE_BIT) if (re.test(card.type_line.split(' // ')[0])) mask |= bit;
  return mask;
}

function parseCost(cost: string | null): { generic: number; pips: number[] } {
  let generic = 0;
  const pips: number[] = [];
  for (const m of (cost || '').split(' // ')[0].matchAll(/\{([^}]+)\}/g)) {
    const sym = m[1];
    if (/^\d+$/.test(sym)) generic += Number(sym);
    else if (sym === 'X' || sym === 'Y') continue;
    else if (sym.includes('P') || sym === 'C' || sym === 'S') generic += 1;
    else {
      const mask = sym.split('/').reduce((acc, s) => acc | (COLOR_BIT[s] ?? 0), 0);
      if (mask) pips.push(mask);
      else generic += 1;
    }
  }
  return { generic, pips };
}

export function simCard(card: DbCard | null): SimCard {
  if (!card) return DEAD;
  const hit = simCache.get(card.id);
  if (hit) return hit;
  const front = card.type_line.split(' // ')[0];
  const text = card.oracle_text || '';
  const land = /\bLand\b/.test(front);
  const tapped = /enters(?: the battlefield)? tapped/i.test(text) && !/unless|you may pay|if you control/i.test(text);
  const addClause = /\{T\}(?:, [^:]*)?: Add ([^.]*)/.exec(text);
  const producer = !land && !!addClause;
  const creature = /\bCreature\b/.test(front);
  const { generic, pips } = parseCost(card.mana_cost);
  const sim: SimCard = {
    land,
    tapped,
    mask: land || producer ? producedMask(card) || (land ? C : 0) : 0,
    amount: producer ? Math.max(1, (addClause![1].match(/\{[WUBRGC]\}/g) || []).length) : land ? 1 : 0,
    rock: producer && !creature,
    dork: producer && creature,
    ramp: !land && /search your library for [^.]*\b(?:land|Plains|Island|Swamp|Mountain|Forest)\b[^.]*onto the battlefield/i.test(text),
    cmc: land ? 0 : card.cmc,
    generic,
    pips,
  };
  simCache.set(card.id, sim);
  return sim;
}

/** Mulberry32 — small, fast, seedable. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Source { mask: number; amount: number }

/** Pay a cost from the sources (mutates `free`): coloured pips first from the least flexible source. */
function pay(free: Source[], card: SimCard): boolean {
  const left = free.map((s) => ({ ...s }));
  for (const pip of card.pips) {
    let best = -1;
    for (let i = 0; i < left.length; i++) {
      if (left[i].amount > 0 && left[i].mask & pip && (best < 0 || popcount(left[i].mask) < popcount(left[best].mask))) best = i;
    }
    if (best < 0) return false;
    left[best].amount--;
  }
  let generic = card.generic;
  for (const s of left) {
    const take = Math.min(s.amount, generic);
    s.amount -= take;
    generic -= take;
  }
  if (generic > 0) return false;
  for (let i = 0; i < free.length; i++) free[i].amount = left[i].amount;
  return true;
}

function popcount(x: number): number {
  let n = 0;
  while (x) { n += x & 1; x >>= 1; }
  return n;
}

function landCount(hand: SimCard[]): number {
  return hand.reduce((n, c) => n + (c.land ? 1 : 0), 0);
}

/** London mulligan: draw 7, bottom n. Keeps 2–5 lands at 7, 2–4 at 6, anything at 5. */
function drawOpening(order: SimCard[], freeMulligan: boolean): { hand: SimCard[]; library: SimCard[]; kept7: boolean } {
  const maxMulls = freeMulligan ? 3 : 2;
  for (let attempt = 0; attempt <= maxMulls; attempt++) {
    // Each attempt reshuffles by rotating the seeded order — keeps the CRN property.
    const offset = attempt * 7;
    const deck = [...order.slice(offset), ...order.slice(0, offset)];
    const bottomN = Math.max(0, attempt - (freeMulligan ? 1 : 0));
    const seven = deck.slice(0, 7);
    const { hand, bottomed } = bottomCards(seven, bottomN);
    const lands = landCount(hand);
    const size = hand.length;
    const ok = size <= 5 || (size === 7 ? lands >= 2 && lands <= 5 : lands >= 2 && lands <= 4);
    if (ok || attempt === maxMulls) {
      return { hand, library: [...deck.slice(7), ...bottomed], kept7: size === 7 };
    }
  }
  throw new Error('unreachable');
}

/** Bottom n: a land while the hand holds 4+, otherwise the most expensive spell. */
function bottomCards(seven: SimCard[], n: number): { hand: SimCard[]; bottomed: SimCard[] } {
  const hand = seven.slice();
  const bottomed: SimCard[] = [];
  for (let i = 0; i < n; i++) {
    const lands = landCount(hand);
    const target = lands > 3 ? hand.findIndex((c) => c.land) : hand.reduce((bi, c, ci) => (!c.land && (bi < 0 || c.cmc > hand[bi].cmc) ? ci : bi), -1);
    bottomed.push(...hand.splice(target >= 0 ? target : 0, 1));
  }
  return { hand, bottomed };
}

/** Greedy cast: commander first when it fits, then the largest spell that can be paid, repeat. */
function castTurn(sources: Source[], hand: SimCard[], commander: SimCard | null): { spent: number; cast: SimCard[]; commanderCast: boolean } {
  const free = sources.map((s) => ({ ...s }));
  const cast: SimCard[] = [];
  let spent = 0;
  let commanderCast = false;
  if (commander && pay(free, commander)) {
    spent += commander.cmc;
    commanderCast = true;
  }
  const spells = hand.filter((c) => !c.land).sort((a, b) => b.cmc - a.cmc);
  for (const s of spells) {
    if (pay(free, s)) {
      spent += s.cmc;
      cast.push(s);
      if (s.rock && !s.tapped) free.push({ mask: s.mask, amount: s.amount });
    }
  }
  return { spent, cast, commanderCast };
}

export function goldfish(library: readonly (DbCard | null)[], commanders: readonly DbCard[], opts: GoldfishOptions = {}): GoldfishStats {
  const games = opts.games ?? 300;
  const turns = opts.turns ?? 7;
  const seed = opts.seed ?? 1;
  const onThePlay = opts.onThePlay ?? true;
  const cards = library.map(simCard);
  const cmd = commanders.map(simCard);
  const ideal = (turns * (turns + 1)) / 2;
  const acc = { keep7: 0, hand: 0, landsT4: 0, screwT3: 0, floodT6: 0, cmdTurn: 0, cmdCurve: 0, tempo: 0, spells6: 0 };

  for (let g = 0; g < games; g++) {
    const rand = rng(seed * 100003 + g);
    const idx = cards.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const opening = drawOpening(idx.map((i) => cards[i]), true);
    const hand = opening.hand;
    const library = opening.library;
    acc.keep7 += opening.kept7 ? 1 : 0;
    acc.hand += hand.length;

    const battlefield: Source[] = [];
    let pendingSources: Source[] = [];
    let landsInPlay = 0;
    let spent = 0;
    let spells = 0;
    let cmdTurn = turns + 1;
    let waiting = cmd.slice();

    for (let t = 1; t <= turns; t++) {
      battlefield.push(...pendingSources);
      pendingSources = [];
      if (!(t === 1 && onThePlay) && library.length) hand.push(library.shift()!);

      const landIdx = chooseLand(hand, battlefield, waiting[0] ?? null);
      if (landIdx >= 0) {
        const land = hand.splice(landIdx, 1)[0];
        landsInPlay++;
        if (land.tapped) pendingSources.push({ mask: land.mask, amount: 1 });
        else battlefield.push({ mask: land.mask, amount: 1 });
      }

      const turn = castTurn(battlefield, hand, waiting[0] ?? null);
      spent += turn.spent;
      if (turn.commanderCast) {
        waiting = waiting.slice(1);
        spells++;
        if (cmdTurn > turns) cmdTurn = t;
      }
      for (const c of turn.cast) {
        hand.splice(hand.indexOf(c), 1);
        spells++;
        if (c.rock && !c.tapped) battlefield.push({ mask: c.mask, amount: c.amount });
        else if (c.dork || c.rock) pendingSources.push({ mask: c.mask, amount: c.amount });
        if (c.ramp) { pendingSources.push({ mask: ALL, amount: 1 }); landsInPlay++; }
      }
      if (t === 3 && landsInPlay < 3) acc.screwT3++;
      if (t === 4 && landsInPlay >= 4) acc.landsT4++;
      if (t === 6) { if (landsInPlay >= 7) acc.floodT6++; acc.spells6 += spells; }
    }
    acc.cmdTurn += cmdTurn;
    if (cmd.length && cmdTurn <= Math.max(1, cmd[0].cmc)) acc.cmdCurve++;
    acc.tempo += spent / ideal;
  }

  return {
    games,
    keep7: acc.keep7 / games,
    avgHandSize: acc.hand / games,
    landsT4: acc.landsT4 / games,
    screwT3: acc.screwT3 / games,
    floodT6: acc.floodT6 / games,
    commanderTurn: acc.cmdTurn / games,
    commanderOnCurve: acc.cmdCurve / games,
    tempo: acc.tempo / games,
    spellsByT6: acc.spells6 / games,
  };
}

/** Untapped land when this turn's spend needs it, otherwise a tapped one first (saves the untapped for later). */
function chooseLand(hand: SimCard[], battlefield: Source[], commander: SimCard | null): number {
  const untapped = hand.findIndex((c) => c.land && !c.tapped);
  const tapped = hand.findIndex((c) => c.land && c.tapped);
  if (untapped < 0 || tapped < 0) return untapped >= 0 ? untapped : tapped;
  const withUntapped = castTurn([...battlefield, { mask: hand[untapped].mask, amount: 1 }], hand, commander).spent;
  const withoutNew = castTurn(battlefield, hand, commander).spent;
  return withUntapped > withoutNew ? untapped : tapped;
}
