/**
 * Deck Score v1.3 §9.2 — matched Commander negative controls.
 *
 * The §5 piles in `deck-score-fixtures.ts` are ONE commander, ONE land count
 * and a flat draw from the whole legal pool, so neither their curve nor their
 * colours are those of a real Commander deck. §9.2 asks the generic Q baseline
 * to be learned from "legal, land/curve/colour-matched Commander piles" whose
 * seeds AND commanders are held out from the 200 validation piles and from
 * every §5 fixture — otherwise the prior is fitted to the decks it grades.
 *
 * Each control copies ONE real list's commander, land count and nonland MV
 * histogram, then fills those slots with cards drawn deterministically from
 * the legal pool. Same shape, no plan.
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { parseIdentity } from '../src/lib/deck-gate-parse';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import type { DeckScoreInput } from '../src/lib/deck-score';
import type { DbCard } from '../src/lib/types';
import type { ResolvedCard } from '../services/build-api/analysis-core';
import { ROOT } from './deck-score-fixtures';

const SAMPLE_CSV = path.join(ROOT, 'verify-2026-09-20', 'commander-sample.csv');
const CARD_DATA_VERSION = 'deck-score-report-2026-09-19';
const BASIC_BY_COLOR: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };

/** RFC-4180 enough for this file: quoted fields may contain commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

export interface SampleDeck { id: string; commander: string; cards: Array<{ name: string; quantity: number }> }

/** The 2,777-list stratified pull from the VPS corpus, in stable file order. */
export function readCommanderSample(): SampleDeck[] {
  const lines = fs.readFileSync(SAMPLE_CSV, 'utf-8').split(/\r?\n/);
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const [iDeck, iCmd, iName, iBoard, iQty] = ['deck_id', 'commander', 'card_name', 'board', 'quantity']
    .map((n) => header.indexOf(n));
  const decks = new Map<string, SampleDeck>();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = splitCsvLine(lines[i]);
    if (iBoard >= 0 && f[iBoard] && f[iBoard] !== 'main' && f[iBoard] !== 'commander') continue;
    let deck = decks.get(f[iDeck]);
    if (!deck) { deck = { id: f[iDeck], commander: f[iCmd], cards: [] }; decks.set(f[iDeck], deck); }
    deck.cards.push({ name: f[iName], quantity: Number(f[iQty]) || 1 });
  }
  return [...decks.values()];
}

/** One pass over `cards` beats 229k parameterised lookups. */
export function cardsByName(): Map<string, DbCard> {
  const rows = getDb().prepare(
    `SELECT id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, keywords,
            legalities, power, toughness, loyalty, produced_mana, edhrec_rank, layout, subtypes, game_changer
     FROM cards WHERE type_line <> 'Card // Card'`
  ).all() as DbCard[];
  const map = new Map<string, DbCard>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    if (!map.has(key)) map.set(key, row);
    const front = key.split(' // ')[0];
    if (!map.has(front)) map.set(front, row);
  }
  return map;
}

/** Commanders the §5 fixtures and the 200 validation piles already use.
 * §9.2: "hold out seeds and commanders". */
export const HELD_OUT_COMMANDERS: ReadonlySet<string> = new Set([
  'the cabbage merchant', 'meren of clan nel toth', 'willowdusk, essence seer',
  'imotekh the stormlord', 'tazri, beacon of unity', 'ramos, dragon engine',
  'thrasios, triton hero', 'tymna the weaver', 'kuja, genome sorcerer',
  'vivi ornitier', 'a-vivi ornitier', 'fire lord azula',
]);

/** FNV-1a over the canonical id — the job SHA-256 does in §5's generator, at a
 * cost that survives 1,000 piles against a 10k-card pool. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mvBucket(cmc: number): number {
  return Math.max(0, Math.min(9, Math.round(cmc)));
}

function syntheticBasic(color: string, template: DbCard, quantity: number): ResolvedCard {
  const name = BASIC_BY_COLOR[color];
  return {
    card: {
      ...template,
      id: `synthetic-basic-${name.toLowerCase()}`,
      oracle_id: `synthetic-basic-${name.toLowerCase()}`,
      name, type_line: `Basic Land — ${name}`,
      mana_cost: null, cmc: 0, oracle_text: null, power: null, toughness: null,
      color_identity: '[]', colors: null, keywords: '[]', produced_mana: JSON.stringify([color]),
      edhrec_rank: null, game_changer: 0,
    },
    quantity,
  };
}

export interface MatchedPile {
  input: DeckScoreInput;
  commander: string;
  sampleId: string;
  lands: number;
}

interface PoolCard { card: DbCard; identity: string[]; bucket: number; key: number; covered: boolean }

/**
 * `count` piles, one per usable sample list starting at `offset`; the draw seed
 * is `seedBase + sampleIndex`, so two calls with disjoint `seedBase`/`offset`
 * ranges share neither a seed nor a source list.
 *
 * `coverageTarget` is §9.2's "match typed coverage to positives so unknown
 * cards are not the discriminator". An uncovered copy earns NO Q under §8's
 * evidence policy, so a pile drawn from the raw pool understates the leak
 * (§5's piles sit at 56-61% coverage) while a fully typed pile overstates it.
 * Each MV bucket therefore takes `round(coverageTarget * n)` of its cards from
 * the typed sub-pool and the rest from the untyped one, so the control's
 * coverage matches the reference cohort it is separated from.
 */
export function loadMatchedPiles(
  count: number, offset: number, seedBase: number, coverageTarget = 1,
): MatchedPile[] {
  const byName = cardsByName();
  const rows = getDb().prepare(
    `SELECT id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, keywords, set_code, set_name,
            collector_number, rarity, image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
            price_usd, price_usd_foil, legalities, power, toughness, loyalty, produced_mana, edhrec_rank, layout,
            updated_at, subtypes, arena_id, game_changer
     FROM cards
     WHERE json_extract(legalities,'$.commander')='legal'
       AND layout NOT IN ('art_series','token','double_faced_token','emblem')
       AND type_line <> 'Card // Card'
       AND type_line NOT LIKE 'Basic Land%'`
  ).all() as DbCard[];
  const pool: PoolCard[] = rows
    .filter((c) => !/\bLand\b/.test(c.type_line || ''))
    .map((c) => ({
      card: c, identity: parseIdentity(c.color_identity),
      bucket: mvBucket(c.cmc ?? 0), key: hash32(c.id), covered: deriveCardFeature(c).covered,
    }));

  const bucketCache = new Map<string, { typed: PoolCard[][]; untyped: PoolCard[][] }>();
  const bucketsFor = (identity: string[]): { typed: PoolCard[][]; untyped: PoolCard[][] } => {
    const key = [...identity].sort().join('');
    let hit = bucketCache.get(key);
    if (!hit) {
      hit = {
        typed: Array.from({ length: 10 }, () => [] as PoolCard[]),
        untyped: Array.from({ length: 10 }, () => [] as PoolCard[]),
      };
      for (const p of pool) {
        if (!p.identity.every((col) => identity.includes(col))) continue;
        (p.covered ? hit.typed : hit.untyped)[p.bucket].push(p);
      }
      bucketCache.set(key, hit);
    }
    return hit;
  };

  const out: MatchedPile[] = [];
  const sample = readCommanderSample();
  for (let i = offset; i < sample.length && out.length < count; i++) {
    const deck = sample[i];
    const commander = byName.get(deck.commander.toLowerCase());
    if (!commander) continue;
    if (HELD_OUT_COMMANDERS.has(commander.name.toLowerCase())) continue;
    const typeLine = commander.type_line || '';
    if (!/Legendary/.test(typeLine) || !/Creature/.test(typeLine)) continue;
    const identity = parseIdentity(commander.color_identity);
    const colors = identity.length ? identity : ['C'];
    if (!colors.every((c) => BASIC_BY_COLOR[c])) continue;

    // Shape of the real list: land count and nonland MV histogram.
    const histogram = new Array(10).fill(0) as number[];
    let lands = 0;
    let missing = 0;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing += line.quantity; continue; }
      if (card.name.toLowerCase() === commander.name.toLowerCase()) continue;
      if (/\bLand\b/.test(card.type_line || '')) lands += line.quantity;
      else histogram[mvBucket(card.cmc ?? 0)] += line.quantity;
    }
    const nonLandTotal = histogram.reduce((s, v) => s + v, 0);
    if (missing > deck.cards.length * 0.1 || nonLandTotal < 40 || lands < 20 || lands > 50) continue;

    const target = 99 - lands;
    const scale = target / nonLandTotal;
    const want = histogram.map((v) => Math.round(v * scale));
    const buckets = bucketsFor(colors);
    const seed = (seedBase + i) >>> 0;
    const chosen: DbCard[] = [];
    const taken = new Set<string>([commander.id]);
    const drawFrom = (from: PoolCard[], n: number): number => {
      if (n <= 0) return 0;
      const ordered = [...from].sort((a, b) => ((a.key ^ seed) >>> 0) - ((b.key ^ seed) >>> 0));
      let got = 0;
      for (const p of ordered) {
        if (got >= n) break;
        if (taken.has(p.card.id)) continue;
        taken.add(p.card.id);
        chosen.push(p.card);
        got++;
      }
      return got;
    };
    for (let b = 0; b < want.length; b++) {
      const typedWanted = Math.round(coverageTarget * want[b]);
      const gotTyped = drawFrom(buckets.typed[b], typedWanted);
      const gotUntyped = drawFrom(buckets.untyped[b], want[b] - typedWanted);
      // A short sub-pool falls back to the other one rather than shrinking the
      // bucket: the curve match matters more than the last point of coverage.
      drawFrom(buckets.typed[b], want[b] - gotTyped - gotUntyped);
    }
    // Buckets the pool cannot fill (0-drops in one colour) spill outward.
    for (let b = 2; chosen.length < target && b < 10; b++) {
      drawFrom(buckets.typed[b], target - chosen.length);
    }
    if (chosen.length < target) continue;

    const per = Math.floor(lands / colors.length);
    const basics = colors.map((c, idx) => syntheticBasic(c, commander, per + (idx === 0 ? lands % colors.length : 0)));
    const main = [...basics, ...chosen.slice(0, target).map((card) => ({ card, quantity: 1 }))];
    out.push({
      commander: commander.name,
      sampleId: deck.id,
      lands,
      input: {
        format: 'commander', main, commander: [commander], sideboard: [],
        unresolved: [], cardDataVersion: CARD_DATA_VERSION, corpus: null,
      },
    });
  }
  return out;
}
