import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, COMMANDER_FORMATS } from '@/lib/constants';
import type { DbCard } from '@/lib/types';

interface ChatAction {
  action: 'add' | 'cut' | 'swap';
  cardName: string;
  replaceWith?: string; // for swap actions
  quantity: number;
  reason: string;
}

interface ChatResponse {
  message: string;
  actions: ChatAction[];
}

function getOpenAIKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_openai_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

/**
 * Resolve a card name to a DbCard from the database.
 */
function resolveCard(name: string): DbCard | null {
  const db = getDb();
  return (
    (db
      .prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1')
      .get(name) as DbCard | undefined) || null
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deck_id, prompt, history } = body as {
      deck_id: number;
      prompt: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!deck_id || !prompt) {
      return NextResponse.json(
        { error: 'deck_id and prompt are required' },
        { status: 400 }
      );
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Go to Settings to add your key.' },
        { status: 400 }
      );
    }

    const deckData = getDeckWithCards(deck_id);
    if (!deckData) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const deck = deckData as {
      name: string;
      format: string;
      cards: Array<{ quantity: number; board: string; card_id?: string } & DbCard>;
    };
    const format = deck.format || 'standard';

    const mainCards = deck.cards.filter((c) => c.board === 'main');
    const commanderCards = deck.cards.filter((c) => c.board === 'commander');
    const isCommanderLike = COMMANDER_FORMATS.includes(
      format as (typeof COMMANDER_FORMATS)[number]
    );
    const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
    const currentMainCount = mainCards.reduce((s, c) => s + c.quantity, 0);
    const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
    const landCount = mainCards
      .filter((c) => (c.type_line || '').includes('Land'))
      .reduce((s, c) => s + c.quantity, 0);

    // Build deck context
    const deckSummary = mainCards
      .map((c) => `${c.quantity}x ${c.name} [${c.type_line}] CMC:${c.cmc}`)
      .join('\n');

    const commanderInfo =
      commanderCards.length > 0
        ? `Commander: ${commanderCards.map((c) => c.name).join(', ')}\n`
        : '';

    // Detect colors
    const colorSet = new Set<string>();
    for (const card of [...mainCards, ...commanderCards]) {
      try {
        const ci: string[] = card.color_identity
          ? JSON.parse(card.color_identity)
          : [];
        ci.forEach((c) => colorSet.add(c));
      } catch {}
    }

    // Detect illegal cards
    const illegalCards: string[] = [];
    for (const card of [...mainCards, ...commanderCards]) {
      if (!card.legalities) continue;
      try {
        const legalities = JSON.parse(card.legalities);
        const status = legalities[format];
        if (status && status !== 'legal' && status !== 'restricted') {
          illegalCards.push(`${card.name} (${status})`);
        }
      } catch {}
    }

    const systemPrompt = `You are an expert Magic: The Gathering deck tuning assistant. You have deep knowledge of MTG formats, card synergies, mana curves, win rates, and competitive meta.

You are helping tune the deck "${deck.name}" in ${format} format.

${commanderInfo}Colors: ${Array.from(colorSet).join(', ') || 'Colorless'}
Current main deck: ${currentMainCount} cards (target: ${isCommanderLike ? targetSize - (commanderCards.length > 0 ? 1 : 0) : targetSize})
Lands: ${landCount}/${targetLands} recommended
${illegalCards.length > 0 ? `\nILLEGAL CARDS that must be replaced: ${illegalCards.join(', ')}` : ''}

Current decklist:
${deckSummary}

RULES:
1. For ${isCommanderLike ? 'commander/brawl' : format}: ${isCommanderLike ? 'deck must have exactly ' + targetSize + ' cards total (including commander). Every ADD must be paired with a CUT.' : 'standard deck size rules apply.'}
2. Never suggest cutting lands unless the deck has more than ${targetLands + 2} lands.
3. Respect format legality — only suggest cards legal in ${format}.
4. ${isCommanderLike ? 'Singleton rule: only 1 copy of each non-basic land card.' : ''}
5. Keep suggestions within the deck's color identity: ${Array.from(colorSet).join(', ') || 'any'}.

RESPONSE FORMAT:
You must respond in JSON with this exact structure:
{
  "message": "Your conversational response explaining what you're recommending and why",
  "actions": [
    {"action": "swap", "cardName": "Card To Cut", "replaceWith": "Card To Add", "quantity": 1, "reason": "Brief reason"},
    {"action": "add", "cardName": "Card Name", "quantity": 1, "reason": "Brief reason"},
    {"action": "cut", "cardName": "Card Name", "quantity": 1, "reason": "Brief reason"}
  ]
}

Use "swap" when replacing one card with another (preferred for fixed-size formats).
Use "add" only when the deck is under the target size.
Use "cut" only when the deck is over the target size or a card must be removed.
The "actions" array can be empty if the user asks a question that doesn't require changes.
The "message" should be conversational and informative — explain your reasoning, mention synergies, and educate the user.`;

    // Build conversation messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 turns max)
    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI chat API error:', response.status, errText);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Empty response from OpenAI' },
        { status: 502 }
      );
    }

    let parsed: ChatResponse;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', rawContent: content },
        { status: 502 }
      );
    }

    // Resolve card names to actual DB records and build proposed changes
    const resolvedActions: Array<{
      action: 'cut' | 'add';
      cardId: string;
      cardName: string;
      quantity: number;
      reason: string;
      imageUri?: string;
    }> = [];

    const existingCardNames = new Set(deck.cards.map((c) => c.name.toLowerCase()));

    for (const act of parsed.actions || []) {
      if (act.action === 'swap') {
        // Swap = cut + add
        const cutCard = deck.cards.find(
          (c) => c.name.toLowerCase() === act.cardName.toLowerCase()
        );
        const addCard = act.replaceWith ? resolveCard(act.replaceWith) : null;

        if (cutCard) {
          resolvedActions.push({
            action: 'cut',
            cardId: cutCard.id || (cutCard as unknown as { card_id: string }).card_id,
            cardName: cutCard.name,
            quantity: act.quantity || 1,
            reason: act.reason,
            imageUri: cutCard.image_uri_small || undefined,
          });
        }

        if (addCard && !existingCardNames.has(addCard.name.toLowerCase())) {
          resolvedActions.push({
            action: 'add',
            cardId: addCard.id,
            cardName: addCard.name,
            quantity: act.quantity || 1,
            reason: act.reason,
            imageUri: addCard.image_uri_small || undefined,
          });
        }
      } else if (act.action === 'cut') {
        const cutCard = deck.cards.find(
          (c) => c.name.toLowerCase() === act.cardName.toLowerCase()
        );
        if (cutCard) {
          resolvedActions.push({
            action: 'cut',
            cardId: cutCard.id || (cutCard as unknown as { card_id: string }).card_id,
            cardName: cutCard.name,
            quantity: act.quantity || 1,
            reason: act.reason,
            imageUri: cutCard.image_uri_small || undefined,
          });
        }
      } else if (act.action === 'add') {
        const addCard = resolveCard(act.cardName);
        if (addCard && !existingCardNames.has(addCard.name.toLowerCase())) {
          resolvedActions.push({
            action: 'add',
            cardId: addCard.id,
            cardName: addCard.name,
            quantity: act.quantity || 1,
            reason: act.reason,
            imageUri: addCard.image_uri_small || undefined,
          });
        }
      }
    }

    return NextResponse.json({
      message: parsed.message,
      actions: resolvedActions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
