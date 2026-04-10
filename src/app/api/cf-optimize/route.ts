import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { optimizeDeck, type MatchRecord } from '@/lib/cf-api-client';

/**
 * POST /api/cf-optimize — optimize a deck based on match history.
 *
 * Body: { deckId: number } — pulls deck cards and match history from local DB,
 *       sends to CF API /optimize-deck endpoint.
 *
 * Or direct mode: { cards: string[], commander: string, matches: MatchRecord[], format?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const db = getDb();

    let cards: string[];
    let commander: string;
    let matches: MatchRecord[];
    let format: string;

    if (body.deckId) {
      // Pull from local DB
      const deckId = body.deckId;
      const userId = auth.userId;

      // Verify deck ownership
      const deck = db.prepare(
        'SELECT id, name, format FROM decks WHERE id = ? AND user_id = ?'
      ).get(deckId, userId) as { id: number; name: string; format: string } | undefined;

      if (!deck) {
        return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
      }

      format = body.format || deck.format || 'brawl';

      // Get deck cards
      const deckCards = db.prepare(`
        SELECT c.name, dc.quantity, dc.board
        FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
        WHERE dc.deck_id = ?
      `).all(deckId) as Array<{ name: string; quantity: number; board: string }>;

      cards = [];
      commander = '';
      for (const dc of deckCards) {
        if (dc.board === 'commander') {
          commander = dc.name;
        } else if (dc.board === 'main') {
          for (let i = 0; i < dc.quantity; i++) {
            cards.push(dc.name);
          }
        }
      }

      if (!commander) {
        return NextResponse.json({ error: 'No commander found in deck' }, { status: 400 });
      }

      // Pull match history for this deck
      const matchRows = db.prepare(`
        SELECT
          ml.result,
          ml.opponent_deck_colors,
          ml.opponent_deck_archetype,
          ml.turns,
          apm.draw_order
        FROM match_logs ml
        LEFT JOIN arena_parsed_matches apm ON apm.match_id = ml.arena_match_id
        WHERE ml.deck_id = ? AND ml.user_id = ?
        ORDER BY ml.played_at DESC
        LIMIT 50
      `).all(deckId, userId) as Array<{
        result: string;
        opponent_deck_colors: string | null;
        opponent_deck_archetype: string | null;
        turns: number | null;
        draw_order: string | null;
      }>;

      matches = matchRows.map(m => {
        const record: MatchRecord = {
          result: m.result === 'win' ? 'win' : 'loss',
        };
        if (m.opponent_deck_colors) record.opponent_colors = m.opponent_deck_colors;
        if (m.opponent_deck_archetype) record.opponent_archetype = m.opponent_deck_archetype;
        if (m.turns) record.turns = m.turns;
        if (m.draw_order) {
          try {
            record.cards_drawn = JSON.parse(m.draw_order);
          } catch {}
        }
        return record;
      });

      if (matches.length === 0) {
        return NextResponse.json(
          { error: 'No match history found for this deck' },
          { status: 400 },
        );
      }
    } else {
      // Direct mode
      cards = body.cards;
      commander = body.commander;
      matches = body.matches;
      format = body.format || 'brawl';

      if (!cards?.length || !commander || !matches?.length) {
        return NextResponse.json(
          { error: 'cards, commander, and matches are required' },
          { status: 400 },
        );
      }
    }

    const result = await optimizeDeck(cards, commander, matches, format);

    if (!result) {
      return NextResponse.json(
        { error: 'CF API unreachable or optimization failed' },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
