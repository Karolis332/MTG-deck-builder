import { NextRequest, NextResponse } from 'next/server';
import { createDeck, addCardToDeck, getCardByName, getDb } from '@/lib/db';
import { buildDeckWithAI } from '@/lib/ai-deck-builder';
import { COMMANDER_FORMATS } from '@/lib/constants';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const body = await request.json();
    const {
      commanderName,
      format = 'commander',
      strategy,
      useCollection = false,
      name,
    } = body;

    const isCmdFormat = COMMANDER_FORMATS.includes(format);

    if (isCmdFormat && !commanderName) {
      return NextResponse.json(
        { error: 'Please select a commander' },
        { status: 400 }
      );
    }

    const result = await buildDeckWithAI({
      commanderName,
      format,
      strategy,
      useCollection,
      userId: authUser.userId,
    });

    if (result.cards.length === 0) {
      return NextResponse.json(
        { error: 'AI could not build a deck. Try again.' },
        { status: 400 }
      );
    }

    // Create deck
    const deckName = name?.trim() || `${commanderName} Deck`;
    const description = `Commander: ${commanderName}. ${result.strategyExplanation}`;
    const deck = createDeck(deckName, format, description, authUser.userId);
    const deckId = Number(deck.id);

    // Add commander to commander zone
    if (isCmdFormat && commanderName) {
      const cmdCard = getCardByName(commanderName) as { id: string } | undefined;
      if (cmdCard) {
        addCardToDeck(deckId, cmdCard.id, 1, 'commander');
      }
    }

    // Add all cards
    for (const entry of result.cards) {
      addCardToDeck(deckId, entry.card.id, entry.quantity, entry.board);
    }

    // Store build explanation in ai_build_logs
    const db = getDb();
    const cardReasons: Record<string, string> = {};
    for (const entry of result.cards) {
      if (entry.reason && entry.role !== 'Land') {
        cardReasons[entry.card.name] = entry.reason;
      }
    }

    db.prepare(`
      INSERT INTO ai_build_logs (
        deck_id, commander_name, format, strategy, model_used,
        role_breakdown, strategy_explanation, card_reasons,
        input_tokens, output_tokens, build_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      deckId,
      commanderName,
      format,
      result.themes.join(', '),
      result.modelUsed,
      JSON.stringify(result.roleBreakdown),
      result.strategyExplanation,
      JSON.stringify(cardReasons),
      result.tokenUsage?.input || 0,
      result.tokenUsage?.output || 0,
      result.buildTimeMs,
    );

    return NextResponse.json({
      deckId,
      strategy: result.strategyExplanation,
      themes: result.themes,
      tribalType: result.tribalType || null,
      totalCards: result.cards.reduce((s, c) => s + c.quantity, 0),
      explanation: {
        strategy: result.strategyExplanation,
        roleBreakdown: result.roleBreakdown,
        modelUsed: result.modelUsed,
        buildTimeMs: result.buildTimeMs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI build failed';
    console.error('[AI Build Route]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
