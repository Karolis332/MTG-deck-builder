/**
 * Refresh the local card database from Scryfall oracle-cards bulk data.
 *
 * - Updates volatile fields (oracle_text, legalities, prices, edhrec_rank, ...)
 *   on existing cards, keyed by oracle_id so primary keys referenced by
 *   deck_cards/collection never change.
 * - Inserts cards from sets released since the last seed.
 * - Preserves arena_id and subtypes (maintained by mtgjson-enrich).
 *
 * Usage: npx tsx scripts/update-card-data.ts [--dry-run] [--prices-only] [--db <dir>]
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'url';
import { iterateBulkCards } from '../src/lib/scryfall-bulk';

const KNOWN_FLAGS = new Set(['--dry-run', '--prices-only', '--db']);

/** Validates argv before any DB is touched. Exits non-zero with usage on an unknown flag. */
export function parseArgs(argv: string[]): { dryRun: boolean; pricesOnly: boolean; dbDir?: string } {
  let dbDir: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    if (arg === '--db') {
      dbDir = argv[++i];
      if (!dbDir) {
        throw new Error('--db requires a directory argument\n\nUsage: npx tsx scripts/update-card-data.ts [--dry-run] [--prices-only] [--db <dir>]');
      }
      continue;
    }
    if (!KNOWN_FLAGS.has(arg)) {
      throw new Error(`Unknown flag: ${arg}\n\nUsage: npx tsx scripts/update-card-data.ts [--dry-run] [--prices-only] [--db <dir>]`);
    }
  }
  return { dryRun: argv.includes('--dry-run'), pricesOnly: argv.includes('--prices-only'), dbDir };
}

let ARGS: { dryRun: boolean; pricesOnly: boolean; dbDir?: string };
try {
  ARGS = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
const DRY_RUN = ARGS.dryRun;
const PRICES_ONLY = ARGS.pricesOnly;

function resolveDbPath(): string {
  const dbDir = ARGS.dbDir ?? process.env.MTG_DB_DIR;
  if (dbDir) {
    return path.join(dbDir, 'mtg-deck-builder.db');
  }
  const appData = process.env.APPDATA;
  if (appData) {
    const electronDb = path.join(appData, 'the-black-grimoire', 'data', 'mtg-deck-builder.db');
    if (fs.existsSync(electronDb)) return electronDb;
  }
  return path.join(process.cwd(), 'data', 'mtg-deck-builder.db');
}

interface ScryfallBulkCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  image_uris?: Record<string, string>;
  card_faces?: Array<{
    mana_cost?: string;
    oracle_text?: string;
    image_uris?: Record<string, string>;
  }>;
  prices?: { usd?: string | null; usd_foil?: string | null };
  legalities: Record<string, string>;
  power?: string;
  toughness?: string;
  loyalty?: string;
  produced_mana?: string[];
  edhrec_rank?: number;
  game_changer?: boolean;
  layout: string;
}

async function downloadBulk(): Promise<ScryfallBulkCard[]> {
  console.log('[1/4] Fetching bulk-data manifest...');
  const manifestRes = await fetch('https://api.scryfall.com/bulk-data/oracle-cards', {
    headers: { 'User-Agent': 'BlackGrimoire/1.0' },
  });
  if (!manifestRes.ok) throw new Error(`Manifest fetch failed: ${manifestRes.status}`);
  // Scryfall replaced `download_uri` (JSON array) with `jsonl_download_uri` (gzip JSONL)
  // in 2026 — same change that broke /api/cards/seed. Shared streaming reader.
  const manifest = await manifestRes.json() as {
    download_uri?: string; jsonl_download_uri?: string; updated_at: string; size?: number; compressed_size?: number;
  };
  const bulkUrl = manifest.jsonl_download_uri ?? manifest.download_uri;
  if (!bulkUrl) throw new Error('Scryfall bulk-data manifest has no download URI');
  const mb = ((manifest.compressed_size ?? manifest.size ?? 0) / 1e6).toFixed(0);
  console.log(`      Bulk updated_at=${manifest.updated_at} size=${mb}MB`);

  console.log('[2/4] Downloading oracle-cards bulk...');
  const bulkRes = await fetch(bulkUrl, { headers: { 'User-Agent': 'BlackGrimoire/1.0' } });
  if (!bulkRes.ok) throw new Error(`Bulk download failed: ${bulkRes.status}`);
  const cards: ScryfallBulkCard[] = [];
  for await (const card of iterateBulkCards(bulkRes, bulkUrl)) cards.push(card as unknown as ScryfallBulkCard);
  console.log(`      Parsed ${cards.length} oracle cards`);
  return cards;
}

function toRow(card: ScryfallBulkCard) {
  const imageUris = card.image_uris || card.card_faces?.[0]?.image_uris;
  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || null,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text || card.card_faces?.map((f) => f.oracle_text).filter(Boolean).join('\n//\n') || null,
    colors: card.colors ? JSON.stringify(card.colors) : null,
    color_identity: JSON.stringify(card.color_identity),
    keywords: JSON.stringify(card.keywords ?? []),
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    image_uri_small: imageUris?.small || null,
    image_uri_normal: imageUris?.normal || null,
    image_uri_large: imageUris?.large || null,
    image_uri_art_crop: imageUris?.art_crop || null,
    price_usd: card.prices?.usd || null,
    price_usd_foil: card.prices?.usd_foil || null,
    legalities: JSON.stringify(card.legalities),
    power: card.power || null,
    toughness: card.toughness || null,
    loyalty: card.loyalty || null,
    produced_mana: card.produced_mana ? JSON.stringify(card.produced_mana) : null,
    edhrec_rank: card.edhrec_rank ?? null,
    game_changer: card.game_changer ? 1 : 0,
    layout: card.layout,
  };
}

/** Per-oracle_id running minimum price across every printing seen so far. */
export interface MinPriceAcc {
  usd: number | null;
  foil: number | null;
  etched: number | null;
}

const EMPTY_MIN_PRICE_ACC: MinPriceAcc = { usd: null, foil: null, etched: null };

function lowerOf(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/**
 * Folds one printing's prices into a running per-oracle_id minimum. Immutable
 * (returns a new accumulator) so the caller can stream millions of printings
 * without holding them all in memory — only one small accumulator per
 * oracle_id lives in the Map.
 */
export function foldMinPrice(
  acc: MinPriceAcc,
  printing: { usd?: string | null; usd_foil?: string | null; usd_etched?: string | null }
): MinPriceAcc {
  const usd = printing.usd != null ? parseFloat(printing.usd) : null;
  const foil = printing.usd_foil != null ? parseFloat(printing.usd_foil) : null;
  const etched = printing.usd_etched != null ? parseFloat(printing.usd_etched) : null;
  return {
    usd: lowerOf(acc.usd, Number.isFinite(usd as number) ? usd : null),
    foil: lowerOf(acc.foil, Number.isFinite(foil as number) ? foil : null),
    etched: lowerOf(acc.etched, Number.isFinite(etched as number) ? etched : null),
  };
}

/** Lowest nonfoil USD across printings; falls back to foil, then etched. */
export function finalizeMinPrice(acc: MinPriceAcc): number | null {
  return acc.usd ?? acc.foil ?? acc.etched;
}

export interface PriceRow {
  id: string;
  oracle_id: string;
  price_usd: string | null;
}

export interface PriceUpdate {
  id: string;
  price: string;
}

/**
 * Decides the fresh price_usd for every row, every run:
 * - the row's OWN printing has a USD price -> take that (always refreshed).
 * - it doesn't -> take the current lowest price across all printings of the
 *   same oracle_id (always refreshed — a previously backfilled value is not
 *   frozen forever, unlike the old `WHERE price_usd IS NULL` guard).
 * - neither source has a price -> a null never overwrites a known price,
 *   the row is left untouched.
 * Rows already at the computed value are skipped (no-op, no updated_at bump).
 */
export function computePriceRefresh(
  rows: PriceRow[],
  priceByPrintingId: Map<string, number>,
  minByOracle: Map<string, MinPriceAcc>,
): PriceUpdate[] {
  const updates: PriceUpdate[] = [];
  for (const row of rows) {
    const ownPrice = priceByPrintingId.get(row.id);
    const oracleAcc = minByOracle.get(row.oracle_id);
    const fallback = oracleAcc ? finalizeMinPrice(oracleAcc) : null;
    const next = ownPrice ?? fallback;
    if (next == null) continue; // neither source has a price — leave it alone
    const nextStr = next.toFixed(2);
    if (row.price_usd === nextStr) continue; // already correct
    updates.push({ id: row.id, price: nextStr });
  }
  return updates;
}

/**
 * Streams the Scryfall default-cards bulk (every printing, one row each) and
 * refreshes every row's price_usd every run via computePriceRefresh().
 * Standalone mode via --prices-only: `npx tsx scripts/update-card-data.ts --prices-only`.
 */
async function backfillPricesFromDefaultCards(db: Database.Database): Promise<number> {
  console.log('Fetching default-cards bulk-data manifest...');
  const manifestRes = await fetch('https://api.scryfall.com/bulk-data/default-cards', {
    headers: { 'User-Agent': 'BlackGrimoire/1.0' },
  });
  if (!manifestRes.ok) throw new Error(`default-cards manifest fetch failed: ${manifestRes.status}`);
  const manifest = await manifestRes.json() as {
    download_uri?: string; jsonl_download_uri?: string; updated_at: string; size?: number; compressed_size?: number;
  };
  const bulkUrl = manifest.jsonl_download_uri ?? manifest.download_uri;
  if (!bulkUrl) throw new Error('Scryfall default-cards manifest has no download URI');
  const mb = ((manifest.compressed_size ?? manifest.size ?? 0) / 1e6).toFixed(0);
  console.log(`Downloading default-cards bulk (${mb}MB, streamed)...`);

  const bulkRes = await fetch(bulkUrl, { headers: { 'User-Agent': 'BlackGrimoire/1.0' } });
  if (!bulkRes.ok) throw new Error(`default-cards bulk download failed: ${bulkRes.status}`);

  const minByOracle = new Map<string, MinPriceAcc>();
  const priceByPrintingId = new Map<string, number>();
  let printingsSeen = 0;
  for await (const raw of iterateBulkCards(bulkRes, bulkUrl)) {
    const card = raw as unknown as { id: string; oracle_id: string; prices?: { usd?: string | null; usd_foil?: string | null; usd_etched?: string | null } };
    if (!card.oracle_id || !card.prices) continue;
    printingsSeen++;
    const printingAcc = foldMinPrice(EMPTY_MIN_PRICE_ACC, card.prices);
    minByOracle.set(card.oracle_id, foldMinPrice(minByOracle.get(card.oracle_id) ?? EMPTY_MIN_PRICE_ACC, card.prices));
    const ownPrice = finalizeMinPrice(printingAcc);
    if (card.id && ownPrice != null) priceByPrintingId.set(card.id, ownPrice);
  }
  console.log(`      ${printingsSeen} printings across ${minByOracle.size} oracle ids`);

  const rows = db.prepare('SELECT id, oracle_id, price_usd FROM cards').all() as PriceRow[];
  const updates = computePriceRefresh(rows, priceByPrintingId, minByOracle);

  const updateStmt = db.prepare(`
    UPDATE cards SET price_usd = @price, updated_at = CURRENT_TIMESTAMP WHERE id = @id
  `);
  let gained = 0;
  const runAll = db.transaction(() => {
    for (const u of updates) {
      if (!DRY_RUN) {
        updateStmt.run(u);
        gained += 1;
      }
    }
  });
  runAll();
  console.log(`Prices backfilled: ${gained} rows changed (new backfill or a refreshed lowest-printing price)`);
  return gained;
}

async function main(): Promise<void> {
  const dbPath = resolveDbPath();
  console.log(`DB: ${dbPath}${DRY_RUN ? ' (DRY RUN)' : ''}${PRICES_ONLY ? ' (PRICES ONLY)' : ''}`);
  if (!fs.existsSync(dbPath)) throw new Error('Database not found');

  // Safety backup (checkpoint WAL first so the copy is consistent)
  const db = new Database(dbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  if (!DRY_RUN) {
    const backupPath = path.join(os.tmpdir(), `mtg-cards-backup-${Date.now()}.db`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup: ${backupPath}`);
  }

  if (PRICES_ONLY) {
    await backfillPricesFromDefaultCards(db);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    return;
  }

  const cards = await downloadBulk();

  console.log('[3/4] Building oracle_id index of existing cards...');
  const existing = new Map<string, string>(); // oracle_id -> id (PK)
  for (const row of db.prepare('SELECT id, oracle_id FROM cards').iterate() as Iterable<{ id: string; oracle_id: string }>) {
    existing.set(row.oracle_id, row.id);
  }
  console.log(`      ${existing.size} existing oracle ids`);

  const updateStmt = db.prepare(`
    UPDATE cards SET
      name = @name, mana_cost = @mana_cost, cmc = @cmc, type_line = @type_line,
      oracle_text = @oracle_text, colors = @colors, color_identity = @color_identity,
      keywords = @keywords, rarity = @rarity,
      price_usd = COALESCE(@price_usd, price_usd), price_usd_foil = COALESCE(@price_usd_foil, price_usd_foil),
      legalities = @legalities, power = @power, toughness = @toughness,
      loyalty = @loyalty, produced_mana = @produced_mana, edhrec_rank = @edhrec_rank,
      game_changer = @game_changer,
      layout = @layout,
      image_uri_small = COALESCE(image_uri_small, @image_uri_small),
      image_uri_normal = COALESCE(image_uri_normal, @image_uri_normal),
      image_uri_large = COALESCE(image_uri_large, @image_uri_large),
      image_uri_art_crop = COALESCE(image_uri_art_crop, @image_uri_art_crop),
      updated_at = CURRENT_TIMESTAMP
    WHERE oracle_id = @oracle_id
  `);

  const insertStmt = db.prepare(`
    INSERT INTO cards (
      id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity,
      keywords, set_code, set_name, collector_number, rarity,
      image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
      price_usd, price_usd_foil, legalities, power, toughness, loyalty,
      produced_mana, edhrec_rank, game_changer, layout, updated_at
    ) VALUES (
      @id, @oracle_id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @colors, @color_identity,
      @keywords, @set_code, @set_name, @collector_number, @rarity,
      @image_uri_small, @image_uri_normal, @image_uri_large, @image_uri_art_crop,
      @price_usd, @price_usd_foil, @legalities, @power, @toughness, @loyalty,
      @produced_mana, @edhrec_rank, @game_changer, @layout, CURRENT_TIMESTAMP
    )
  `);

  console.log('[4/4] Upserting...');
  let updated = 0;
  let inserted = 0;
  const newNames: string[] = [];

  const runAll = db.transaction(() => {
    for (const card of cards) {
      // Skip non-playable layouts (art series, tokens)
      if (card.layout === 'art_series' || card.layout === 'token' || card.layout === 'double_faced_token' || card.layout === 'emblem') continue;
      const row = toRow(card);
      const pk = existing.get(card.oracle_id);
      if (pk) {
        if (!DRY_RUN) updateStmt.run(row); // every printing row of this oracle_id
        updated++;
      } else {
        if (!DRY_RUN) insertStmt.run(row);
        inserted++;
        if (newNames.length < 40) newNames.push(`${card.name} [${card.set}]`);
      }
    }
  });
  runAll();

  console.log(`Done. updated=${updated} inserted=${inserted}`);
  if (newNames.length) {
    console.log('Sample new cards:');
    newNames.forEach((n) => console.log('  + ' + n));
  }

  // The oracle-cards pass leaves price_usd null wherever the one printing
  // Scryfall picked for that oracle_id has no nonfoil USD (newest/digital/
  // special printings) — fill those from the cheapest printing that has one.
  await backfillPricesFromDefaultCards(db);

  const newest = db.prepare('SELECT set_code, set_name, COUNT(*) n FROM cards GROUP BY set_code ORDER BY MAX(updated_at) DESC, n DESC LIMIT 5').all();
  console.log('Top sets by recency:', JSON.stringify(newest));
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
}

// Guard so tests can import the pure/exported helpers above without
// triggering a live network fetch + DB write on import.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  });
}
