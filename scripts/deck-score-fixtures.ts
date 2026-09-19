/**
 * Deck Score — the calibration dataset, loaded once and shared.
 *
 * `scripts/deck-score-report.ts` (one table) and `scripts/deck-score-calibrate.ts`
 * (a grid over thousands of candidate norm sets) must score the SAME decks, and
 * the grid must not re-read SQLite per candidate. Everything here returns plain
 * `DeckScoreInput` values that are built once and scored many times.
 *
 * Datasets (docs/DECK_SCORE_SPEC.md §5 + §7):
 *   - 16 repository test-vector fixtures with their expected bands
 *   - `decks/test-builds/refs/thrasios-tymna/cedhtop16.json` — all 30 decks
 *   - `data/export-standard.db` — dated Standard decks with a W/L record,
 *     split into a positive and a negative cohort
 *   - seeded constrained-random legal piles for The Cabbage Merchant
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { getDb } from '../src/lib/db';
import { parseDecklist, resolveLines, parseIdentity, type DeckLine, type Board } from '../src/lib/deck-gate-parse';
import type { DeckScoreInput, ScoreFormat } from '../src/lib/deck-score';
import { getColorAdjustment } from '../src/lib/deck-templates';
import type { DbCard } from '../src/lib/types';
import type { ResolvedCard } from '../services/build-api/analysis-core';

export const ROOT = path.resolve(__dirname, '..');
export const OUT_DIR = path.join(ROOT, 'verify-2026-09-19', 'deck-score');
const CARD_DATA_VERSION = 'deck-score-report-2026-09-19';

export interface LoadedDeck {
  input: DeckScoreInput;
  unresolvedNames: string[];
}

/**
 * `resolveLines` selects a column subset of `cards`; `power`/`toughness` were
 * missing from it until 2026-09-19, which silently deleted every creature from
 * W's pressure recipe. Fill any gap here, at the seam that builds
 * `DeckScoreInput`, because `DeckScoreInput.main` is typed `DbCard` and must
 * carry every column the scorer reads.
 */
const powerCache = new Map<string, { power: string | null; toughness: string | null }>();
function hydratePower(cards: DbCard[]): void {
  const db = getDb();
  const stmt = db.prepare('SELECT power, toughness FROM cards WHERE id = ?');
  for (const card of cards) {
    if (card.power !== undefined) continue;
    let row = powerCache.get(card.id);
    if (!row) {
      const hit = stmt.get(card.id) as { power: string | null; toughness: string | null } | undefined;
      row = { power: hit?.power ?? null, toughness: hit?.toughness ?? null };
      powerCache.set(card.id, row);
    }
    card.power = row.power;
    card.toughness = row.toughness;
  }
}

/**
 * `resolveLines` rebuilds its name cache per call and its front-face lookup is
 * a `LIKE` scan of 35k rows, so resolving one 60-card list costs ~1.9 s. The
 * calibration cohorts share almost every card name, so cache resolution across
 * decks: 306 Standard lists collapse to a few hundred distinct names.
 */
const nameCache = new Map<string, DbCard | null>();

function resolveCached(names: string[], format: ScoreFormat): void {
  const missing = [...new Set(names.map((n) => n.toLowerCase()))]
    .filter((k) => !nameCache.has(`${format}|${k}`));
  if (missing.length === 0) return;
  const originals = new Map<string, string>();
  for (const n of names) originals.set(n.toLowerCase(), n);
  const probe: DeckLine[] = missing.map((k) => ({ quantity: 1, name: originals.get(k) ?? k, board: 'main' as Board }));
  const { resolved, unresolved } = resolveLines(probe, format);
  for (const r of resolved) nameCache.set(`${format}|${r.line.name.toLowerCase()}`, r.card);
  for (const n of unresolved) nameCache.set(`${format}|${n.toLowerCase()}`, null);
}

export function toInput(lines: DeckLine[], format: ScoreFormat): LoadedDeck {
  resolveCached(lines.map((l) => l.name), format);
  const resolved: Array<{ line: DeckLine; card: DbCard }> = [];
  const unresolved: string[] = [];
  for (const line of lines) {
    const card = nameCache.get(`${format}|${line.name.toLowerCase()}`);
    if (card) resolved.push({ line, card: { ...card } });
    else unresolved.push(line.name);
  }
  hydratePower(resolved.map((r) => r.card));
  const main: ResolvedCard[] = resolved.filter((r) => r.line.board === 'main').map((r) => ({ card: r.card, quantity: r.line.quantity }));
  const commander: DbCard[] = resolved.filter((r) => r.line.board === 'commander').map((r) => r.card);
  const sideboard: ResolvedCard[] = resolved.filter((r) => r.line.board === 'sideboard').map((r) => ({ card: r.card, quantity: r.line.quantity }));
  const companionRow = resolved.find((r) => r.line.board === 'companion');
  return {
    input: {
      format, main, commander, sideboard,
      companion: companionRow?.card,
      unresolved: unresolved.map((name) => ({ name, quantity: 1, board: 'main' })),
      cardDataVersion: CARD_DATA_VERSION,
      corpus: null,
    },
    unresolvedNames: unresolved,
  };
}

/** Flat paper/brawl lists carry no `Commander:` header — the §5 fixture table
 * names the commander explicitly; reassign that one line's board. */
function reassignCommander(lines: DeckLine[], commanderName: string): DeckLine[] {
  let done = false;
  return lines.map((line) => {
    if (!done && line.board === 'main' && line.name.toLowerCase() === commanderName.toLowerCase()) {
      done = true;
      return { ...line, board: 'commander' as Board };
    }
    return line;
  });
}

export function loadTextFixture(relPath: string, format: ScoreFormat, commanderName: string | null): LoadedDeck {
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  let lines = parseDecklist(text);
  if (commanderName) lines = reassignCommander(lines, commanderName);
  return toInput(lines, format);
}

function cedhDeckLines(cards: string[]): DeckLine[] {
  return [
    { quantity: 1, name: 'Thrasios, Triton Hero', board: 'commander' },
    { quantity: 1, name: 'Tymna the Weaver', board: 'commander' },
    ...cards.map((name) => ({ quantity: 1, name, board: 'main' as Board })),
  ];
}

interface CedhJson { decks: Array<{ id: string; cards: string[]; placement: number | null; wins: number; losses: number }> }

function readCedhJson(): CedhJson {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'decks/test-builds/refs/thrasios-tymna/cedhtop16.json'), 'utf-8')) as CedhJson;
}

/** §5 names `decks[2]` as the single named fixture. */
export function loadCedhJsonFixture(): LoadedDeck {
  return toInput(cedhDeckLines(readCedhJson().decks[2].cards), 'commander');
}

/** §7 cohort: every deck in the Top-16 reference, all tournament finishers. */
export function loadCedhCohort(): LoadedDeck[] {
  return readCedhJson().decks.map((d) => toInput(cedhDeckLines(d.cards), 'commander'));
}

function standardDb(): InstanceType<typeof Database> {
  return new Database(path.join(ROOT, 'data', 'export-standard.db'), { readonly: true });
}

function standardLines(db: InstanceType<typeof Database>, deckId: number): DeckLine[] {
  const rows = db.prepare(
    'SELECT card_name, board, SUM(quantity) AS qty FROM community_deck_cards WHERE community_deck_id = ? GROUP BY card_name, board'
  ).all(deckId) as Array<{ card_name: string; board: string; qty: number }>;
  return rows.map((r) => ({ quantity: r.qty, name: r.card_name, board: (r.board === 'sideboard' ? 'sideboard' : 'main') as Board }));
}

export function loadStandardDbFixture(deckId: number): LoadedDeck {
  const db = standardDb();
  try {
    return toInput(standardLines(db, deckId), 'standard');
  } finally {
    db.close();
  }
}

export interface StandardCohortDeck extends LoadedDeck {
  id: number;
  eventDate: string;
  winRate: number;
}

/**
 * §7 dataset (a): dated Standard decks carrying a real W/L record.
 * Positive = placement 1, or a 5-0 league run, or >= 80% game wins.
 * Negative = <= 40% wins. Most recent first, capped.
 */
export function loadStandardCohorts(cap = 300): { positive: StandardCohortDeck[]; negative: StandardCohortDeck[] } {
  const db = standardDb();
  try {
    const rows = db.prepare(
      `SELECT id, event_date, placement, wins, losses
         FROM community_decks
        WHERE event_date IS NOT NULL AND wins IS NOT NULL AND losses IS NOT NULL AND (wins + losses) > 0
        ORDER BY event_date DESC, id DESC`
    ).all() as Array<{ id: number; event_date: string; placement: number | null; wins: number; losses: number }>;

    const positive: StandardCohortDeck[] = [];
    const negative: StandardCohortDeck[] = [];
    for (const r of rows) {
      const winRate = r.wins / (r.wins + r.losses);
      const isPositive = r.placement === 1 || (r.wins === 5 && r.losses === 0) || winRate >= 0.8;
      const isNegative = winRate <= 0.4;
      const bucket = isPositive ? positive : isNegative ? negative : null;
      if (!bucket || bucket.length >= cap) continue;
      bucket.push({ ...toInput(standardLines(db, r.id), 'standard'), id: r.id, eventDate: r.event_date, winRate });
    }
    return { positive, negative };
  } finally {
    db.close();
  }
}

// ── Random constrained-legal piles ────────────────────────────────────────

const BASIC_BY_COLOR: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };

function buildRandomPile(seed: number, commander: DbCard, eligible: DbCard[], landCount: number): DeckScoreInput {
  const scored = eligible.map((card) => ({
    card,
    hash: crypto.createHash('sha256').update(`${seed}:${card.id}`).digest('hex'),
  }));
  scored.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  const chosen = scored.slice(0, 99 - landCount).map((s) => s.card);

  const identity = parseIdentity(commander.color_identity);
  const colors = identity.length ? identity : ['C'];
  const basics: ResolvedCard[] = colors
    .filter((c) => BASIC_BY_COLOR[c])
    .map((c, i, arr) => ({
      card: { ...commander, name: BASIC_BY_COLOR[c], type_line: `Basic Land — ${BASIC_BY_COLOR[c]}`, mana_cost: null, cmc: 0, oracle_text: null, power: null, toughness: null, color_identity: '[]', colors: null },
      quantity: Math.floor(landCount / arr.length) + (i === 0 ? landCount % arr.length : 0),
    }));

  return {
    format: 'commander',
    main: [...basics, ...chosen.map((card) => ({ card, quantity: 1 }))],
    commander: [commander],
    sideboard: [],
    unresolved: [],
    cardDataVersion: CARD_DATA_VERSION,
    corpus: null,
  };
}

/** §5: eligible legal singleton cards ordered by SHA-256(seed + id). */
export function loadRandomPiles(count: number): DeckScoreInput[] {
  const { resolved } = resolveLines([{ quantity: 1, name: 'The Cabbage Merchant', board: 'commander' }], 'commander');
  const commander = resolved[0]?.card;
  if (!commander) return [];

  const db = getDb();
  const identity = parseIdentity(commander.color_identity);
  const rows = db.prepare(
    `SELECT id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, keywords, set_code, set_name,
            collector_number, rarity, image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
            price_usd, price_usd_foil, legalities, power, toughness, loyalty, produced_mana, edhrec_rank, layout,
            updated_at, subtypes, arena_id, game_changer
     FROM cards
     WHERE json_extract(legalities,'$.commander')='legal'
       AND layout NOT IN ('art_series','token','double_faced_token','emblem')
       AND type_line <> 'Card // Card'
       AND type_line NOT LIKE 'Basic Land%'
       AND name <> 'The Cabbage Merchant'`
  ).all() as DbCard[];
  const eligible = rows.filter((c) => parseIdentity(c.color_identity).every((col) => identity.includes(col)));
  const landCount = getColorAdjustment(Math.max(1, identity.length)).lands;

  const piles: DeckScoreInput[] = [];
  for (let seed = 0; seed < count; seed++) piles.push(buildRandomPile(seed, commander, eligible, landCount));
  return piles;
}

// ── The 16 named §5 fixtures ──────────────────────────────────────────────

export interface FixtureSpec {
  name: string;
  format: ScoreFormat;
  band: string;
  purpose: string;
  load: () => LoadedDeck;
}

export const FIXTURES: FixtureSpec[] = [
  { name: 'meren-powerhouse', format: 'commander', band: '65-80', purpose: 'Required powerhouse anchor', load: () => loadTextFixture('decks/paper/proposals/meren-powerhouse.txt', 'commander', 'Meren of Clan Nel Toth') },
  { name: 'cabbage-cedh-input', format: 'commander', band: '35-50', purpose: 'Required reviewed web build', load: () => loadTextFixture('verify-2026-09-19/cabbage-cedh-input.txt', 'commander', null) },
  { name: 'precon-witherbloom', format: 'commander', band: '40-55', purpose: 'Witherbloom Witchcraft precon', load: () => loadTextFixture('verify-2026-09-09/precon-witherbloom-list.txt', 'commander', 'Willowdusk, Essence Seer') },
  { name: 'the-cabbage-merchant', format: 'commander', band: '55-70', purpose: 'Food deck, real conversion support', load: () => loadTextFixture('decks/paper/decks/the-cabbage-merchant.txt', 'commander', 'The Cabbage Merchant') },
  { name: 'imotekh-the-stormlord', format: 'commander', band: '45-65', purpose: 'Artifact/graveyard plan', load: () => loadTextFixture('decks/paper/decks/imotekh-the-stormlord.txt', 'commander', 'Imotekh the Stormlord') },
  { name: 'tazri-beacon-of-unity', format: 'commander', band: '40-60', purpose: 'Five-color party plan', load: () => loadTextFixture('decks/paper/decks/tazri-beacon-of-unity.txt', 'commander', 'Tazri, Beacon of Unity') },
  { name: 'meren-of-clan-nel-toth', format: 'commander', band: '0-19', purpose: 'As stored: 101 cards', load: () => loadTextFixture('decks/paper/decks/meren-of-clan-nel-toth.txt', 'commander', 'Meren of Clan Nel Toth') },
  { name: 'ramos-dragon-engine', format: 'commander', band: '0-19', purpose: 'As stored: 3-card incomplete list', load: () => loadTextFixture('decks/paper/decks/ramos-dragon-engine.txt', 'commander', 'Ramos, Dragon Engine') },
  { name: 'cabbage-merchant-current-brawl', format: 'brawl', band: '0-19', purpose: 'As stored: 101 cards', load: () => loadTextFixture('decks/brawl/cabbage-merchant-current.txt', 'brawl', 'The Cabbage Merchant') },
  { name: 'tazri-upgraded-arena', format: 'brawl', band: '45-65', purpose: 'Singleton, five-color source demands', load: () => loadTextFixture('decks/brawl/tazri-upgraded-arena.txt', 'brawl', null) },
  { name: 'kuja-genome-sorcerer-arena', format: 'brawl', band: '60-80', purpose: 'Spell-trigger pressure', load: () => loadTextFixture('decks/brawl/kuja-genome-sorcerer-arena.txt', 'brawl', null) },
  { name: 'vivi-battery-arena', format: 'brawl', band: '70-85', purpose: 'Activation timing/untap prerequisites', load: () => loadTextFixture('decks/brawl/vivi-battery-arena.txt', 'brawl', null) },
  { name: 'fire-lord-azula-competitive', format: 'competitivebrawl', band: '75-90', purpose: 'Commander ban check, real line support', load: () => loadTextFixture('decks/brawl/fire-lord-azula-competitive.txt', 'competitivebrawl', null) },
  { name: 'cedhtop16-ballooncon6', format: 'commander', band: '85-100', purpose: 'Ballon Con 6, placement 1, 4-1', load: loadCedhJsonFixture },
  { name: 'standard-1445893-univerce', format: 'standard', band: '85-100', purpose: 'Standard Challenge 32, placement 1, 8-1', load: () => loadStandardDbFixture(1445893) },
  { name: 'standard-1445867-aljce', format: 'standard', band: '85-100', purpose: '5-0 league, distinct evidence source', load: () => loadStandardDbFixture(1445867) },
];

export function bandOf(band: string): { lo: number; hi: number } | null {
  const m = band.match(/(\d+)\D+(\d+)/);
  return m ? { lo: Number(m[1]), hi: Number(m[2]) } : null;
}

export function inBand(score: number, band: string): boolean | 'n/a' {
  const b = bandOf(band);
  if (!b) return 'n/a';
  return score >= b.lo && score <= b.hi;
}

// ── Whole-dataset disk cache ──────────────────────────────────────────────

export interface Dataset {
  fixtures: Array<{ name: string; format: ScoreFormat; band: string; purpose: string; input: DeckScoreInput; unresolvedNames: string[] }>;
  cedh: DeckScoreInput[];
  standardPositive: Array<{ id: number; eventDate: string; input: DeckScoreInput }>;
  standardNegative: Array<{ id: number; eventDate: string; input: DeckScoreInput }>;
  piles: DeckScoreInput[];
}

/**
 * Building the dataset costs ~4 minutes of SQLite name resolution; a grid run
 * and every probe need the identical decks. Cache the built inputs as JSON
 * (they are plain data) so only the first run pays.
 */
export function loadDataset(pileCount: number, opts: { refresh?: boolean } = {}): Dataset {
  const cacheFile = path.join(OUT_DIR, `dataset-${pileCount}.json`);
  if (!opts.refresh && fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as Dataset;
  }
  const std = loadStandardCohorts(300);
  const data: Dataset = {
    fixtures: FIXTURES.map((f) => {
      const d = f.load();
      return { name: f.name, format: f.format, band: f.band, purpose: f.purpose, input: d.input, unresolvedNames: d.unresolvedNames };
    }),
    cedh: loadCedhCohort().map((d) => d.input),
    standardPositive: std.positive.map((d) => ({ id: d.id, eventDate: d.eventDate, input: d.input })),
    standardNegative: std.negative.map((d) => ({ id: d.id, eventDate: d.eventDate, input: d.input })),
    piles: loadRandomPiles(pileCount),
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(data));
  return data;
}
