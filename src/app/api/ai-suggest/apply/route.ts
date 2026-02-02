import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { DEFAULT_DECK_SIZE, COMMANDER_FORMATS } from '@/lib/constants';

interface ChangeRequest {
  action: 'cut' | 'add';
  cardId: string;
  cardName: string;
  quantity: number;
}

// POST /api/ai-suggest/apply — apply selected changes to a deck
// Also creates a new deck version snapshot before applying
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deck_id, changes } = body as { deck_id: number; changes: ChangeRequest[] };

    if (!deck_id || !changes?.length) {
      return NextResponse.json(
        { error: 'deck_id and changes[] are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // ── Check deck size constraints for fixed-size formats ───────────
    const deckRow = db.prepare('SELECT format FROM decks WHERE id = ?').get(deck_id) as { format: string | null } | undefined;
    const format = deckRow?.format || '';
    const isFixedSize = COMMANDER_FORMATS.includes(format as typeof COMMANDER_FORMATS[number]);

    if (isFixedSize) {
      const cuts = changes.filter((c) => c.action === 'cut');
      const adds = changes.filter((c) => c.action === 'add');
      const cutQty = cuts.reduce((s, c) => s + c.quantity, 0);
      const addQty = adds.reduce((s, c) => s + c.quantity, 0);

      // Check current deck size
      const sizeRow = db.prepare(
        "SELECT COALESCE(SUM(quantity), 0) as count FROM deck_cards WHERE deck_id = ? AND board = 'main'"
      ).get(deck_id) as { count: number };
      const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
      const cmdCount = (db.prepare(
        "SELECT COUNT(*) as count FROM deck_cards WHERE deck_id = ? AND board = 'commander'"
      ).get(deck_id) as { count: number }).count;
      const effectiveTarget = targetSize - (cmdCount > 0 ? 1 : 0);

      // If adds would push deck over limit, reject
      const afterSize = sizeRow.count - cutQty + addQty;
      if (afterSize > effectiveTarget) {
        return NextResponse.json(
          { error: `Cannot apply: deck would have ${afterSize + cmdCount} cards (limit is ${targetSize}). Select more cards to cut or fewer to add.` },
          { status: 400 }
        );
      }
    }

    // Snapshot current state as a version before applying changes
    const currentCards = db.prepare(`
      SELECT dc.card_id, c.name, dc.quantity, dc.board
      FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ?
      ORDER BY dc.board, c.name
    `).all(deck_id) as Array<{ card_id: string; name: string; quantity: number; board: string }>;

    const snapshot = currentCards.map((c) => ({
      cardId: c.card_id,
      name: c.name,
      quantity: c.quantity,
      board: c.board,
    }));

    // Get next version number
    const latest = db.prepare(
      'SELECT version_number FROM deck_versions WHERE deck_id = ? ORDER BY version_number DESC LIMIT 1'
    ).get(deck_id) as { version_number: number } | undefined;
    const nextVersion = (latest?.version_number || 0) + 1;

    // Build changes description
    const changesSummary = changes.map((c) => ({
      action: c.action === 'cut' ? 'removed' : 'added',
      card: c.cardName,
      quantity: c.quantity,
    }));

    const tx = db.transaction(() => {
      // Save version snapshot
      db.prepare(`
        INSERT INTO deck_versions (deck_id, version_number, name, cards_snapshot, changes_from_previous)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        deck_id,
        nextVersion,
        `v${nextVersion} (AI tuned)`,
        JSON.stringify(snapshot),
        JSON.stringify(changesSummary)
      );

      // Apply each change
      for (const change of changes) {
        if (change.action === 'cut') {
          // Reduce quantity or remove — try by card_id first, then by card name
          let existing = db.prepare(
            'SELECT dc.id, dc.quantity FROM deck_cards dc WHERE dc.deck_id = ? AND dc.card_id = ? AND dc.board = ?'
          ).get(deck_id, change.cardId, 'main') as { id: number; quantity: number } | undefined;

          // Fallback: look up by card name (handles different printings of the same card)
          if (!existing && change.cardName) {
            existing = db.prepare(
              `SELECT dc.id, dc.quantity FROM deck_cards dc
               JOIN cards c ON dc.card_id = c.id
               WHERE dc.deck_id = ? AND c.name = ? AND dc.board = ?
               LIMIT 1`
            ).get(deck_id, change.cardName, 'main') as { id: number; quantity: number } | undefined;
          }

          if (existing) {
            const newQty = existing.quantity - change.quantity;
            if (newQty <= 0) {
              db.prepare('DELETE FROM deck_cards WHERE id = ?').run(existing.id);
            } else {
              db.prepare('UPDATE deck_cards SET quantity = ? WHERE id = ?').run(newQty, existing.id);
            }
          }
        } else if (change.action === 'add') {
          // Increase quantity or insert
          const existing = db.prepare(
            'SELECT id, quantity FROM deck_cards WHERE deck_id = ? AND card_id = ? AND board = ?'
          ).get(deck_id, change.cardId, 'main') as { id: number; quantity: number } | undefined;

          if (existing) {
            db.prepare('UPDATE deck_cards SET quantity = ? WHERE id = ?')
              .run(existing.quantity + change.quantity, existing.id);
          } else {
            db.prepare(
              'INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, ?, ?)'
            ).run(deck_id, change.cardId, change.quantity, 'main');
          }
        }
      }

      // Update deck's updated_at
      db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?").run(deck_id);
    });

    tx();

    return NextResponse.json({
      ok: true,
      version: nextVersion,
      appliedChanges: changes.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to apply changes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
