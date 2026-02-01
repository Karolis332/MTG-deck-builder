import { NextResponse } from 'next/server';
import { getDb, getCardCount } from '@/lib/db';
import * as scryfall from '@/lib/scryfall';

export async function POST() {
  try {
    const existingCount = getCardCount();
    if (existingCount > 10000) {
      return NextResponse.json({
        message: `Database already has ${existingCount} cards. Use ?force=true to re-seed.`,
        count: existingCount,
      });
    }

    const bulkUrl = await scryfall.getBulkDataUrl();
    const response = await fetch(bulkUrl);
    if (!response.ok) {
      throw new Error(`Failed to download bulk data: ${response.status}`);
    }

    const cards = await response.json();
    const db = getDb();

    const insert = db.prepare(`
      INSERT OR REPLACE INTO cards (
        id, oracle_id, name, mana_cost, cmc, type_line, oracle_text,
        colors, color_identity, keywords, set_code, set_name, collector_number,
        rarity, image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
        price_usd, price_usd_foil, legalities, power, toughness, loyalty,
        produced_mana, edhrec_rank, layout
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    const batchSize = 1000;
    let batch: unknown[][] = [];

    const flush = db.transaction((rows: unknown[][]) => {
      for (const row of rows) {
        insert.run(...row);
      }
    });

    for (const card of cards) {
      if (!card.id || !card.name) continue;
      // Skip tokens, emblems, etc.
      if (card.layout === 'token' || card.layout === 'double_faced_token' || card.layout === 'emblem') continue;

      const imageUris = card.image_uris || card.card_faces?.[0]?.image_uris || {};

      batch.push([
        card.id,
        card.oracle_id || '',
        card.name,
        card.mana_cost || card.card_faces?.[0]?.mana_cost || null,
        card.cmc || 0,
        card.type_line || '',
        card.oracle_text || card.card_faces?.map((f: { oracle_text?: string }) => f.oracle_text).join('\n//\n') || null,
        card.colors ? JSON.stringify(card.colors) : null,
        card.color_identity ? JSON.stringify(card.color_identity) : '[]',
        card.keywords ? JSON.stringify(card.keywords) : '[]',
        card.set || '',
        card.set_name || '',
        card.collector_number || '',
        card.rarity || 'common',
        imageUris.small || null,
        imageUris.normal || null,
        imageUris.large || null,
        imageUris.art_crop || null,
        card.prices?.usd || null,
        card.prices?.usd_foil || null,
        card.legalities ? JSON.stringify(card.legalities) : null,
        card.power || null,
        card.toughness || null,
        card.loyalty || null,
        card.produced_mana ? JSON.stringify(card.produced_mana) : null,
        card.edhrec_rank || null,
        card.layout || 'normal',
      ]);

      if (batch.length >= batchSize) {
        flush(batch);
        count += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      flush(batch);
      count += batch.length;
    }

    // Store last seeded timestamp
    db.prepare(
      `INSERT INTO app_state (key, value) VALUES ('bulk_data_last_updated', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = datetime('now')`
    ).run();

    return NextResponse.json({
      message: `Successfully seeded ${count} cards`,
      count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
