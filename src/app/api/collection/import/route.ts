import { NextRequest, NextResponse } from 'next/server';
import { parseArenaExport, detectFormat, parseTsvCollection } from '@/lib/arena-parser';
import { getDb, clearCollection, upsertCollectionCard } from '@/lib/db';
import * as scryfall from '@/lib/scryfall';
import type { CardIdentifier, ScryfallCard } from '@/lib/types';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const body = await request.json();
    const { text, mode = 'merge', deck_id } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Import text is required' },
        { status: 400 }
      );
    }

    const format = detectFormat(text);

    if (format === 'tsv') {
      return await handleTsvImport(text, mode, authUser.userId);
    }
    return await handleArenaImport(text, mode, authUser.userId, deck_id ? Number(deck_id) : undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── TSV collection import (MTGA Assistant / spreadsheet format) ─────────────
async function handleTsvImport(text: string, mode: string, userId: number) {
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
    clearCollection(userId);
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

  // Helper: look up card by name with A- prefix fallback for Alchemy cards
  const findTsvCard = (name: string) => {
    const lower = name.toLowerCase();
    return cardsByName.get(lower)
      || (lower.startsWith('a-') ? cardsByName.get(lower.slice(2)) : undefined);
  };

  for (const line of parsed) {
    const matchedCard = findTsvCard(line.name);
    if (matchedCard) {
      // Import regular copies
      if (line.quantity > 0) {
        upsertCollectionCard(matchedCard.id, line.quantity, false, userId);
      }
      // Import foil copies separately
      if (line.quantityFoil > 0) {
        upsertCollectionCard(matchedCard.id, line.quantityFoil, true, userId);
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
async function handleArenaImport(text: string, mode: string, userId: number, deckId?: number) {
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

  const { found, not_found } = await scryfall.getCollection(identifiers);

  // For cards not found by set+collector_number, retry by name only
  // This handles cases where the set code doesn't match Scryfall's codes
  const retryByName: CardIdentifier[] = [];
  const notFoundNames = new Set<string>();
  for (const nf of not_found) {
    // Find the original parsed line for this not-found identifier
    const originalLine = parsed.find((line) => {
      if ('set' in nf && 'collector_number' in nf) {
        return line.setCode?.toLowerCase() === nf.set && line.collectorNumber === nf.collector_number;
      }
      if ('name' in nf) {
        return line.name.toLowerCase() === nf.name?.toLowerCase();
      }
      return false;
    });
    if (originalLine && !notFoundNames.has(originalLine.name.toLowerCase())) {
      notFoundNames.add(originalLine.name.toLowerCase());
      // Strip A- prefix for Alchemy rebalanced cards (e.g. "A-Vivi Ornitier" → "Vivi Ornitier")
      const cleanName = originalLine.name.replace(/^A-/, '');
      retryByName.push({ name: cleanName });
    }
  }

  if (retryByName.length > 0) {
    try {
      const { found: retryFound } = await scryfall.getCollection(retryByName);
      found.push(...retryFound);
    } catch {}
  }

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

  if (mode === 'replace' && !deckId) {
    clearCollection(userId);
  }

  // Build name lookup maps — handle DFCs by mapping both full and front-face names
  const cardsByName = new Map<string, ScryfallCard>();
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
      // Map full name (e.g. "Ojer Axonil, Deepest Might // Temple of Power")
      cardsByName.set(card.name.toLowerCase(), card);
      // Also map front face name only for DFCs (e.g. "Ojer Axonil, Deepest Might")
      if (card.name.includes(' // ')) {
        const frontFace = card.name.split(' // ')[0].trim().toLowerCase();
        if (!cardsByName.has(frontFace)) {
          cardsByName.set(frontFace, card);
        }
      }
    }
  })();

  let imported = 0;
  const failed: string[] = [];

  // Prepare deck card insert if importing to a deck
  const insertDeckCard = deckId
    ? db.prepare(`
        INSERT INTO deck_cards (deck_id, card_id, quantity, board)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(deck_id, card_id, board) DO UPDATE SET
          quantity = quantity + excluded.quantity
      `)
    : null;

  // Helper: look up card by name with A- prefix fallback for Alchemy cards
  const findCard = (name: string) => {
    const lower = name.toLowerCase();
    return cardsByName.get(lower)
      || (lower.startsWith('a-') ? cardsByName.get(lower.slice(2)) : undefined);
  };

  const deckTransaction = deckId ? db.transaction((lines: typeof parsed) => {
    for (const line of lines) {
      const matchedCard = findCard(line.name);
      if (matchedCard) {
        insertDeckCard!.run(deckId, matchedCard.id, line.quantity, line.board || 'main');
        imported++;
      } else {
        failed.push(line.name);
      }
    }
  }) : null;

  if (deckId && deckTransaction) {
    deckTransaction(parsed);
  } else {
    for (const line of parsed) {
      const matchedCard = findCard(line.name);
      if (matchedCard) {
        upsertCollectionCard(matchedCard.id, line.quantity, false, userId);
        imported++;
      } else {
        failed.push(line.name);
      }
    }
  }

  return NextResponse.json({
    imported,
    failed,
    total: parsed.length,
  });
}
