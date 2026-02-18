import { NextRequest, NextResponse } from 'next/server';
import { parseArenaExport } from '@/lib/arena-parser';
import { getDb, getDeckWithCards, resolveCardAliases } from '@/lib/db';
import * as scryfall from '@/lib/scryfall';
import type { CardIdentifier, ScryfallCard } from '@/lib/types';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { createVersionSnapshot } from '@/lib/deck-versioning';

interface DiffEntry {
  cardName: string;
  cardId: string | null;
  action: 'added' | 'removed' | 'changed';
  oldQuantity: number;
  newQuantity: number;
  board: string;
}

/**
 * POST /api/decks/:id/import-update
 *
 * Preview mode (confirm !== true):
 *   Parse arena text → resolve via Scryfall → compute diff → return preview
 *
 * Confirm mode (confirm === true):
 *   Create version snapshot → replace main/sideboard → preserve commander/companion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = parseInt(params.id, 10);
    if (isNaN(deckId)) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    const deck = getDeckWithCards(deckId, authUser.userId);
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const body = await request.json();
    const { text, confirm } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Import text is required' }, { status: 400 });
    }

    // Parse Arena export
    const parsed = parseArenaExport(text);
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: 'No valid card entries found in the import text' },
        { status: 400 }
      );
    }

    // Resolve cards via Scryfall
    const identifiers: CardIdentifier[] = parsed.map(line => {
      if (line.setCode && line.collectorNumber) {
        return { set: line.setCode.toLowerCase(), collector_number: line.collectorNumber };
      }
      return { name: line.name };
    });

    const BATCH_SIZE = 75;
    const allFound: ScryfallCard[] = [];
    const allNotFound: CardIdentifier[] = [];

    for (let i = 0; i < identifiers.length; i += BATCH_SIZE) {
      const batch = identifiers.slice(i, i + BATCH_SIZE);
      try {
        const { found, not_found } = await scryfall.getCollection(batch);
        allFound.push(...found);
        allNotFound.push(...not_found);
      } catch { /* batch failed */ }
      if (i + BATCH_SIZE < identifiers.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Retry cards not found by set+collector_number using name only
    // Handles Arena set codes that don't match Scryfall's codes
    const retryByName: CardIdentifier[] = [];
    const retryNames = new Set<string>();
    for (const nf of allNotFound) {
      const originalLine = parsed.find((line) => {
        if ('set' in nf && 'collector_number' in nf) {
          return line.setCode?.toLowerCase() === (nf as { set: string }).set
            && line.collectorNumber === (nf as { collector_number: string }).collector_number;
        }
        if ('name' in nf) {
          return line.name.toLowerCase() === (nf as { name: string }).name?.toLowerCase();
        }
        return false;
      });
      if (originalLine && !retryNames.has(originalLine.name.toLowerCase())) {
        retryNames.add(originalLine.name.toLowerCase());
        const cleanName = originalLine.name.replace(/^A-/, '');
        retryByName.push({ name: cleanName });
      }
    }

    if (retryByName.length > 0) {
      for (let i = 0; i < retryByName.length; i += BATCH_SIZE) {
        const batch = retryByName.slice(i, i + BATCH_SIZE);
        try {
          const { found } = await scryfall.getCollection(batch);
          allFound.push(...found);
        } catch { /* retry batch failed */ }
        if (i + BATCH_SIZE < retryByName.length) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }

    // Build name→card map
    const cardsByName = new Map<string, ScryfallCard>();
    for (const card of allFound) {
      cardsByName.set(card.name.toLowerCase(), card);
      if (card.name.includes(' // ')) {
        const front = card.name.split(' // ')[0].trim().toLowerCase();
        if (!cardsByName.has(front)) cardsByName.set(front, card);
      }
    }

    // Resolve Universes Beyond/Within aliases for unmatched cards
    const unmatchedNames = parsed
      .filter(line => !cardsByName.has(line.name.toLowerCase()))
      .map(line => line.name);
    const aliasMap = resolveCardAliases(unmatchedNames);

    // For aliased cards, retry via Scryfall with the canonical name
    if (aliasMap.size > 0) {
      const aliasIdentifiers: CardIdentifier[] = Array.from(aliasMap.values()).map(name => ({ name }));
      for (let i = 0; i < aliasIdentifiers.length; i += BATCH_SIZE) {
        const batch = aliasIdentifiers.slice(i, i + BATCH_SIZE);
        try {
          const { found } = await scryfall.getCollection(batch);
          for (const card of found) {
            allFound.push(card);
            cardsByName.set(card.name.toLowerCase(), card);
            if (card.name.includes(' // ')) {
              const front = card.name.split(' // ')[0].trim().toLowerCase();
              if (!cardsByName.has(front)) cardsByName.set(front, card);
            }
          }
        } catch { /* alias retry failed */ }
      }
      // Map alias names to their resolved cards
      aliasMap.forEach((canonical, alias) => {
        const card = cardsByName.get(canonical.toLowerCase());
        if (card) {
          cardsByName.set(alias.toLowerCase(), card);
        }
      });
    }

    // Resolve parsed lines to concrete cards
    const resolvedNew: Array<{ cardId: string; cardName: string; quantity: number; board: string }> = [];
    const failed: string[] = [];

    for (const line of parsed) {
      const lower = line.name.toLowerCase();
      const card = cardsByName.get(lower)
        || (lower.startsWith('a-') ? cardsByName.get(lower.slice(2)) : undefined);

      if (card) {
        resolvedNew.push({
          cardId: card.id,
          cardName: card.name,
          quantity: line.quantity,
          board: line.board || 'main',
        });
      } else {
        failed.push(line.name);
      }
    }

    // Build current deck map (main + sideboard only)
    const currentCards = (deck as { cards: Array<{ card_id: string; name: string; quantity: number; board: string }> }).cards;
    const currentMap = new Map<string, { cardId: string; quantity: number; board: string }>();
    for (const c of currentCards) {
      if (c.board === 'commander' || c.board === 'companion') continue;
      const key = `${c.card_id}|${c.board}`;
      currentMap.set(key, {
        cardId: c.card_id,
        quantity: c.quantity,
        board: c.board,
      });
    }

    // Build new deck map
    const newMap = new Map<string, { cardId: string; cardName: string; quantity: number; board: string }>();
    for (const c of resolvedNew) {
      const key = `${c.cardId}|${c.board}`;
      const existing = newMap.get(key);
      if (existing) {
        existing.quantity += c.quantity;
      } else {
        newMap.set(key, { ...c });
      }
    }

    // Compute diff
    const diff: DiffEntry[] = [];

    // Cards in new but not in current (added)
    newMap.forEach((nc, key) => {
      const current = currentMap.get(key);
      if (!current) {
        diff.push({
          cardName: nc.cardName,
          cardId: nc.cardId,
          action: 'added',
          oldQuantity: 0,
          newQuantity: nc.quantity,
          board: nc.board,
        });
      } else if (nc.quantity !== current.quantity) {
        diff.push({
          cardName: nc.cardName,
          cardId: nc.cardId,
          action: 'changed',
          oldQuantity: current.quantity,
          newQuantity: nc.quantity,
          board: nc.board,
        });
      }
    });

    // Cards in current but not in new (removed)
    const db = getDb();
    currentMap.forEach((cc, key) => {
      if (!newMap.has(key)) {
        // Look up card name
        const card = db.prepare('SELECT name FROM cards WHERE id = ?').get(cc.cardId) as { name: string } | undefined;
        diff.push({
          cardName: card?.name || cc.cardId,
          cardId: cc.cardId,
          action: 'removed',
          oldQuantity: cc.quantity,
          newQuantity: 0,
          board: cc.board,
        });
      }
    });

    // Preview mode — return diff without applying
    if (!confirm) {
      return NextResponse.json({
        preview: true,
        diff,
        failed,
        totalCards: resolvedNew.reduce((s, c) => s + c.quantity, 0),
        resolvedCount: resolvedNew.length,
      });
    }

    // Confirm mode — apply the update

    // Cache resolved cards in local DB first
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
      }
    })();

    // Create version snapshot before replacing
    const version = createVersionSnapshot(deckId, 'import', 'batch_import');

    // Replace main + sideboard, keep commander/companion
    db.transaction(() => {
      db.prepare(`
        DELETE FROM deck_cards WHERE deck_id = ? AND board IN ('main', 'sideboard')
      `).run(deckId);

      const insert = db.prepare(`
        INSERT INTO deck_cards (deck_id, card_id, quantity, board)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(deck_id, card_id, board) DO UPDATE SET quantity = excluded.quantity
      `);

      for (const c of resolvedNew) {
        insert.run(deckId, c.cardId, c.quantity, c.board);
      }

      db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?").run(deckId);
    })();

    const updatedDeck = getDeckWithCards(deckId, authUser.userId);

    return NextResponse.json({
      ok: true,
      diff,
      failed,
      version: version ? {
        id: version.id,
        versionNumber: version.versionNumber,
        name: version.name,
      } : null,
      deck: updatedDeck,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update deck';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
