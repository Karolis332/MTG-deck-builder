/**
 * Deck Versioning — shared logic for creating snapshots, computing diffs,
 * and restoring deck states. Extracted from ai-suggest/apply and deck-versions
 * routes to provide a single source of truth.
 */

import { getDb } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────────

export type VersionSource = 'manual_edit' | 'ai_suggest' | 'import' | 'rollback' | 'snapshot';
export type ChangeType = 'add_card' | 'remove_card' | 'set_quantity' | 'move_card' | 'batch_import' | 'ai_tune' | 'rollback';

export interface SnapshotCard {
  cardId: string;
  name: string;
  quantity: number;
  board: string;
}

export interface DeckChange {
  action: 'added' | 'removed';
  card: string;
  quantity: number;
}

export interface VersionInfo {
  id: number;
  versionNumber: number;
  name: string;
  source: VersionSource;
  changeType: ChangeType | null;
  changes: DeckChange[];
  cardCount: number;
}

// ── Snapshot current deck cards ─────────────────────────────────────────────

function getCurrentSnapshot(db: ReturnType<typeof getDb>, deckId: number): SnapshotCard[] {
  const rows = db.prepare(`
    SELECT dc.card_id, c.name, dc.quantity, dc.board
    FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = ?
    ORDER BY dc.board, c.name
  `).all(deckId) as Array<{ card_id: string; name: string; quantity: number; board: string }>;

  return rows.map(c => ({
    cardId: c.card_id,
    name: c.name,
    quantity: c.quantity,
    board: c.board,
  }));
}

// ── Compute diff between two snapshots ──────────────────────────────────────

export function getDeckDiff(
  prev: SnapshotCard[],
  curr: SnapshotCard[]
): DeckChange[] {
  const changes: DeckChange[] = [];

  const prevMap = new Map<string, { quantity: number; board: string }>();
  for (const c of prev) prevMap.set(`${c.name}|${c.board}`, { quantity: c.quantity, board: c.board });

  const currMap = new Map<string, { quantity: number; board: string }>();
  for (const c of curr) currMap.set(`${c.name}|${c.board}`, { quantity: c.quantity, board: c.board });

  // Additions and quantity changes
  currMap.forEach((curr, key) => {
    const prev = prevMap.get(key);
    const cardName = key.split('|')[0];
    if (!prev) {
      changes.push({ action: 'added', card: cardName, quantity: curr.quantity });
    } else if (curr.quantity > prev.quantity) {
      changes.push({ action: 'added', card: cardName, quantity: curr.quantity - prev.quantity });
    } else if (curr.quantity < prev.quantity) {
      changes.push({ action: 'removed', card: cardName, quantity: prev.quantity - curr.quantity });
    }
  });

  // Full removals
  prevMap.forEach((prev, key) => {
    if (!currMap.has(key)) {
      const cardName = key.split('|')[0];
      changes.push({ action: 'removed', card: cardName, quantity: prev.quantity });
    }
  });

  return changes;
}

// ── Debounce check ──────────────────────────────────────────────────────────

const DEBOUNCE_MS = 30_000;

/**
 * Returns false if the last version for this deck was created <30s ago
 * with the same source. AI and import sources always force a new version.
 */
export function shouldCreateNewVersion(
  deckId: number,
  source: VersionSource
): boolean {
  // AI and import always create versions
  if (source === 'ai_suggest' || source === 'import' || source === 'rollback') {
    return true;
  }

  const db = getDb();
  const latest = db.prepare(`
    SELECT created_at, source FROM deck_versions
    WHERE deck_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(deckId) as { created_at: string; source: string } | undefined;

  if (!latest) return true;
  if (latest.source !== source) return true;

  const lastTime = new Date(latest.created_at + 'Z').getTime();
  const now = Date.now();
  return (now - lastTime) > DEBOUNCE_MS;
}

// ── Create version snapshot ─────────────────────────────────────────────────

/**
 * Snapshot the current deck state as a new version.
 * Computes diff from previous version, stores snapshot + metadata.
 * Returns the created version info, or null if debounced.
 */
export function createVersionSnapshot(
  deckId: number,
  source: VersionSource,
  changeType?: ChangeType,
  name?: string
): VersionInfo | null {
  if (!shouldCreateNewVersion(deckId, source)) {
    return null;
  }

  const db = getDb();
  const snapshot = getCurrentSnapshot(db, deckId);

  // Get latest version for diff computation
  const latest = db.prepare(
    'SELECT version_number, cards_snapshot FROM deck_versions WHERE deck_id = ? ORDER BY version_number DESC LIMIT 1'
  ).get(deckId) as { version_number: number; cards_snapshot: string } | undefined;

  const nextVersion = (latest?.version_number || 0) + 1;

  // Compute diff
  let changes: DeckChange[] = [];
  if (latest) {
    let prevSnapshot: SnapshotCard[] = [];
    try { prevSnapshot = JSON.parse(latest.cards_snapshot); } catch { /* empty */ }
    changes = getDeckDiff(prevSnapshot, snapshot);
  }

  const versionName = name || `v${nextVersion}${source === 'ai_suggest' ? ' (AI tuned)' : source === 'import' ? ' (import)' : source === 'rollback' ? ' (rollback)' : ''}`;

  const result = db.prepare(`
    INSERT INTO deck_versions (deck_id, version_number, name, cards_snapshot, changes_from_previous, source, change_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    deckId,
    nextVersion,
    versionName,
    JSON.stringify(snapshot),
    JSON.stringify(changes),
    source,
    changeType || null
  );

  const versionId = Number(result.lastInsertRowid);

  // Assign to unversioned match logs
  db.prepare(`
    UPDATE match_logs SET deck_version_id = ?
    WHERE deck_id = ? AND deck_version_id IS NULL
  `).run(versionId, deckId);

  const mainCount = snapshot
    .filter(c => c.board === 'main')
    .reduce((s, c) => s + c.quantity, 0);

  return {
    id: versionId,
    versionNumber: nextVersion,
    name: versionName,
    source,
    changeType: changeType || null,
    changes,
    cardCount: mainCount,
  };
}

// ── Restore deck to a previous version ──────────────────────────────────────

/**
 * Restore a deck to the state captured in a specific version.
 * Creates a rollback snapshot of the current state first, then replaces
 * all main/sideboard cards with the target version's snapshot.
 * Preserves commander/companion zones.
 */
export function restoreDeckToVersion(
  deckId: number,
  versionId: number
): VersionInfo | null {
  const db = getDb();

  // Get the target version's snapshot
  const target = db.prepare(
    'SELECT cards_snapshot, version_number FROM deck_versions WHERE id = ? AND deck_id = ?'
  ).get(versionId, deckId) as { cards_snapshot: string; version_number: number } | undefined;

  if (!target) return null;

  let targetCards: SnapshotCard[] = [];
  try { targetCards = JSON.parse(target.cards_snapshot); } catch { return null; }

  // Create a rollback snapshot of current state before restoring
  const rollbackVersion = createVersionSnapshot(deckId, 'rollback', 'rollback', undefined);

  // Replace deck_cards: delete main + sideboard, keep commander/companion
  const tx = db.transaction(() => {
    db.prepare(`
      DELETE FROM deck_cards
      WHERE deck_id = ? AND board IN ('main', 'sideboard')
    `).run(deckId);

    // Insert cards from target snapshot (skip commander/companion — those are preserved)
    const insert = db.prepare(`
      INSERT INTO deck_cards (deck_id, card_id, quantity, board)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(deck_id, card_id, board) DO UPDATE SET quantity = excluded.quantity
    `);

    for (const card of targetCards) {
      if (card.board === 'commander' || card.board === 'companion') continue;
      insert.run(deckId, card.cardId, card.quantity, card.board);
    }

    db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?").run(deckId);
  });

  tx();

  return rollbackVersion;
}
