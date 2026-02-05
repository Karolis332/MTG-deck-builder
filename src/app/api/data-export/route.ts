import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * GET /api/data-export?user_id=N
 *
 * Exports all user data as JSON:
 * - match_logs (all arena matches)
 * - card_performance
 * - decks + deck_cards (deck compositions)
 * - collection (card inventory)
 * - app version + timestamp
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();

    // Get user_id from cookie or query param
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('user_id');

    // Try to get user from auth cookie
    let userId: number | null = null;
    if (userIdParam) {
      userId = parseInt(userIdParam, 10);
    }

    // Export match logs (arena parsed matches — the richest data source)
    const arenaMatches = db.prepare(`
      SELECT match_id, player_name, opponent_name, result, format,
             turns, deck_cards, cards_played, opponent_cards_seen,
             deck_id, parsed_at
      FROM arena_parsed_matches
      ORDER BY parsed_at DESC
    `).all();

    // Export manual match logs
    const matchLogs = db.prepare(`
      SELECT id, deck_id, result, play_draw, opponent_name,
             opponent_deck_colors, opponent_deck_archetype,
             turns, my_life_end, opponent_life_end,
             my_cards_seen, opponent_cards_seen,
             game_format, created_at
      FROM match_logs
      ${userId ? 'WHERE deck_id IN (SELECT id FROM decks WHERE user_id = ?)' : ''}
      ORDER BY created_at DESC
    `).all(...(userId ? [userId] : []));

    // Export card performance
    const cardPerformance = db.prepare(`
      SELECT card_name, format, opponent_colors,
             games_played, games_in_deck, wins_when_played,
             wins_when_in_deck, total_drawn, rating, updated_at
      FROM card_performance
      ORDER BY rating DESC
    `).all();

    // Export decks with their cards
    const decksQuery = userId
      ? 'SELECT * FROM decks WHERE user_id = ? ORDER BY updated_at DESC'
      : 'SELECT * FROM decks ORDER BY updated_at DESC';
    const decks = db.prepare(decksQuery).all(...(userId ? [userId] : [])) as Array<{
      id: number; name: string; format: string; commander_id: string;
    }>;

    const decksWithCards = decks.map((deck) => {
      const cards = db.prepare(`
        SELECT dc.card_id, c.name, dc.quantity, dc.board, c.type_line, c.cmc
        FROM deck_cards dc
        JOIN cards c ON dc.card_id = c.id
        WHERE dc.deck_id = ?
        ORDER BY dc.board, c.name
      `).all(deck.id);

      return { ...deck, cards };
    });

    // Export collection
    const collectionQuery = userId
      ? `SELECT col.card_id, c.name, col.quantity, col.foil, col.source, col.imported_at
         FROM collection col JOIN cards c ON col.card_id = c.id
         WHERE col.user_id = ?
         ORDER BY c.name`
      : `SELECT col.card_id, c.name, col.quantity, col.foil, col.source, col.imported_at
         FROM collection col JOIN cards c ON col.card_id = c.id
         ORDER BY c.name`;
    const collection = db.prepare(collectionQuery).all(...(userId ? [userId] : []));

    // Export deck insights
    const insights = db.prepare(`
      SELECT deck_id, insight_type, card_name, data, confidence,
             games_analyzed, updated_at
      FROM deck_insights
      ORDER BY deck_id, insight_type
    `).all();

    const exportData = {
      version: '0.1.0',
      exportedAt: new Date().toISOString(),
      userId: userId || null,
      stats: {
        arenaMatches: arenaMatches.length,
        matchLogs: matchLogs.length,
        cardPerformanceEntries: cardPerformance.length,
        decks: decks.length,
        collectionCards: collection.length,
      },
      arenaMatches,
      matchLogs,
      cardPerformance,
      decks: decksWithCards,
      collection,
      deckInsights: insights,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
