/**
 * Refresh the local card database from Scryfall oracle-cards bulk data.
 *
 * - Updates volatile fields (oracle_text, legalities, prices, edhrec_rank, ...)
 *   on existing cards, keyed by oracle_id so primary keys referenced by
 *   deck_cards/collection never change.
 * - Inserts cards from sets released since the last seed.
 * - Preserves arena_id and subtypes (maintained by mtgjson-enrich).
 *
 * Usage: npx tsx scripts/update-card-data.ts [--dry-run]
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DRY_RUN = process.argv.includes('--dry-run');

function resolveDbPath(): string {
  if (process.env.MTG_DB_DIR) {
    return path.join(process.env.MTG_DB_DIR, 'mtg-deck-builder.db');
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
  layout: string;
}

async function downloadBulk(): Promise<ScryfallBulkCard[]> {
  console.log('[1/4] Fetching bulk-data manifest...');
  const manifestRes = await fetch('https://api.scryfall.com/bulk-data/oracle-cards', {
    headers: { 'User-Agent': 'BlackGrimoire/1.0' },
  });
  if (!manifestRes.ok) throw new Error(`Manifest fetch failed: ${manifestRes.status}`);
  const manifest = await manifestRes.json() as { download_uri: string; updated_at: string; size: number };
  console.log(`      Bulk updated_at=${manifest.updated_at} size=${(manifest.size / 1e6).toFixed(0)}MB`);

  console.log('[2/4] Downloading oracle-cards bulk...');
  const bulkRes = await fetch(manifest.download_uri, { headers: { 'User-Agent': 'BlackGrimoire/1.0' } });
  if (!bulkRes.ok) throw new Error(`Bulk download failed: ${bulkRes.status}`);
  const text = await bulkRes.text();
  const cards = JSON.parse(text) as ScryfallBulkCard[];
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
    layout: card.layout,
  };
}

async function main(): Promise<void> {
  const dbPath = resolveDbPath();
  console.log(`DB: ${dbPath}${DRY_RUN ? ' (DRY RUN)' : ''}`);
  if (!fs.existsSync(dbPath)) throw new Error('Database not found');

  // Safety backup (checkpoint WAL first so the copy is consistent)
  const db = new Database(dbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  if (!DRY_RUN) {
    const backupPath = path.join(os.tmpdir(), `mtg-cards-backup-${Date.now()}.db`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup: ${backupPath}`);
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
      price_usd = @price_usd, price_usd_foil = @price_usd_foil,
      legalities = @legalities, power = @power, toughness = @toughness,
      loyalty = @loyalty, produced_mana = @produced_mana, edhrec_rank = @edhrec_rank,
      layout = @layout,
      image_uri_small = COALESCE(image_uri_small, @image_uri_small),
      image_uri_normal = COALESCE(image_uri_normal, @image_uri_normal),
      image_uri_large = COALESCE(image_uri_large, @image_uri_large),
      image_uri_art_crop = COALESCE(image_uri_art_crop, @image_uri_art_crop),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @pk
  `);

  const insertStmt = db.prepare(`
    INSERT INTO cards (
      id, oracle_id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity,
      keywords, set_code, set_name, collector_number, rarity,
      image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
      price_usd, price_usd_foil, legalities, power, toughness, loyalty,
      produced_mana, edhrec_rank, layout, updated_at
    ) VALUES (
      @id, @oracle_id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @colors, @color_identity,
      @keywords, @set_code, @set_name, @collector_number, @rarity,
      @image_uri_small, @image_uri_normal, @image_uri_large, @image_uri_art_crop,
      @price_usd, @price_usd_foil, @legalities, @power, @toughness, @loyalty,
      @produced_mana, @edhrec_rank, @layout, CURRENT_TIMESTAMP
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
        if (!DRY_RUN) updateStmt.run({ ...row, pk });
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

  const newest = db.prepare('SELECT set_code, set_name, COUNT(*) n FROM cards GROUP BY set_code ORDER BY MAX(updated_at) DESC, n DESC LIMIT 5').all();
  console.log('Top sets by recency:', JSON.stringify(newest));
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
