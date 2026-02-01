import { NextRequest, NextResponse } from 'next/server';
import { parseArenaExport, detectFormat, parseTsvCollection } from '@/lib/arena-parser';
import { getDb, clearCollection, upsertCollectionCard } from '@/lib/db';
import * as scryfall from '@/lib/scryfall';
import type { CardIdentifier, ScryfallCard } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, mode = 'merge' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Import text is required' },
        { status: 400 }
      );
    }

    const format = detectFormat(text);

    if (format === 'tsv') {
      return await handleTsvImport(text, mode);
    }
    return await handleArenaImport(text, mode);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── TSV collection import (MTGA Assistant / spreadsheet format) ─────────────
async function handleTsvImport(text: string, mode: string) {
  const parsed = parseTsvCollection(text);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: 'No valid card entries found. Expected tab-separated format: id, name, set, color, rarity, qty, qty_foil' },
      { status: 400 }
    );
  }

  // Batch resolve via Scryfall in chunks of 75 (API limit)
  const BATCH_SIZE = 75;
  const allIdentifiers: CardIdentifier[] = parsed.map((line) => ({ name: line.name }));

  const allFound: ScryfallCard[] = [];
  const allNotFound: string[] = [];

  for (let i = 0; i < allIdentifiers.length; i += BATCH_SIZE) {
    const batch = allIdentifiers.slice(i, i + BATCH_SIZE);
    try {
      const { found } = await scryfall.getCollection(batch);
      allFound.push(...found);
    } catch {
      // If a batch fails, mark all as not found
      const batchParsed = parsed.slice(i, i + BATCH_SIZE);
      allNotFound.push(...batchParsed.map((l) => l.name));
    }
    // Rate limit: 100ms between requests
    if (i + BATCH_SIZE < allIdentifiers.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Cache found cards in local DB
  const db = getDb();
  const insertCard = db.prepare(`
    INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text,
      colors, color_identity, keywords, set_code, set_name, collector_number, rarity,
      image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
      price_usd, price_usd_foil, legalities, power, toughness, loyalty,
      produced_mana, edhrec_rank, layout)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      price_usd = excluded.price_usd,
      price_usd_foil = excluded.price_usd_foil,
      updated_at = datetime('now')
  `);

  if (mode === 'replace') {
    clearCollection();
  }

  const cardsByName = new Map<string, (typeof allFound)[0]>();
  db.transaction(() => {
    for (const card of allFound) {
      const dbCard = scryfall.scryfallToDbCard(card);
      insertCard.run(
        dbCard.id, dbCard.oracle_id, dbCard.name, dbCard.mana_cost, dbCard.cmc,
        dbCard.type_line, dbCard.oracle_text, dbCard.colors, dbCard.color_identity,
        dbCard.keywords, dbCard.set_code, dbCard.set_name, dbCard.collector_number,
        dbCard.rarity, dbCard.image_uri_small, dbCard.image_uri_normal,
        dbCard.image_uri_large, dbCard.image_uri_art_crop, dbCard.price_usd,
        dbCard.price_usd_foil, dbCard.legalities, dbCard.power, dbCard.toughness,
        dbCard.loyalty, dbCard.produced_mana, dbCard.edhrec_rank, dbCard.layout
      );
      cardsByName.set(card.name.toLowerCase(), card);
    }
  })();

  let imported = 0;
  const failed: string[] = [];

  for (const line of parsed) {
    const matchedCard = cardsByName.get(line.name.toLowerCase());
    if (matchedCard) {
      // Import regular copies
      if (line.quantity > 0) {
        upsertCollectionCard(matchedCard.id, line.quantity, false);
      }
      // Import foil copies separately
      if (line.quantityFoil > 0) {
        upsertCollectionCard(matchedCard.id, line.quantityFoil, true);
      }
      imported++;
    } else {
      failed.push(line.name);
    }
  }

  return NextResponse.json({
    imported,
    failed,
    total: parsed.length,
  });
}

// ── Arena export format import ──────────────────────────────────────────────
async function handleArenaImport(text: string, mode: string) {
  const parsed = parseArenaExport(text);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: 'No valid card entries found in the import text' },
      { status: 400 }
    );
  }

  const identifiers: CardIdentifier[] = parsed.map((line) => {
    if (line.setCode && line.collectorNumber) {
      return { set: line.setCode.toLowerCase(), collector_number: line.collectorNumber };
    }
    return { name: line.name };
  });

  const { found } = await scryfall.getCollection(identifiers);

  const db = getDb();
  const insertCard = db.prepare(`
    INSERT INTO cards (id, oracle_id, name, mana_cost, cmc, type_line, oracle_text,
      colors, color_identity, keywords, set_code, set_name, collector_number, rarity,
      image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
      price_usd, price_usd_foil, legalities, power, toughness, loyalty,
      produced_mana, edhrec_rank, layout)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      price_usd = excluded.price_usd,
      price_usd_foil = excluded.price_usd_foil,
      updated_at = datetime('now')
  `);

  if (mode === 'replace') {
    clearCollection();
  }

  const cardsByName = new Map<string, (typeof found)[0]>();
  db.transaction(() => {
    for (const card of found) {
      const dbCard = scryfall.scryfallToDbCard(card);
      insertCard.run(
        dbCard.id, dbCard.oracle_id, dbCard.name, dbCard.mana_cost, dbCard.cmc,
        dbCard.type_line, dbCard.oracle_text, dbCard.colors, dbCard.color_identity,
        dbCard.keywords, dbCard.set_code, dbCard.set_name, dbCard.collector_number,
        dbCard.rarity, dbCard.image_uri_small, dbCard.image_uri_normal,
        dbCard.image_uri_large, dbCard.image_uri_art_crop, dbCard.price_usd,
        dbCard.price_usd_foil, dbCard.legalities, dbCard.power, dbCard.toughness,
        dbCard.loyalty, dbCard.produced_mana, dbCard.edhrec_rank, dbCard.layout
      );
      cardsByName.set(card.name.toLowerCase(), card);
    }
  })();

  let imported = 0;
  const failed: string[] = [];

  for (const line of parsed) {
    const matchedCard = cardsByName.get(line.name.toLowerCase());
    if (matchedCard) {
      upsertCollectionCard(matchedCard.id, line.quantity, false);
      imported++;
    } else {
      failed.push(line.name);
    }
  }

  return NextResponse.json({
    imported,
    failed,
    total: parsed.length,
  });
}
