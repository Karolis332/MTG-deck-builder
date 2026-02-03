import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, COMMANDER_FORMATS } from '@/lib/constants';
import type { DbCard } from '@/lib/types';

interface ChatAction {
  action: 'add' | 'cut' | 'swap';
  cardName: string;
  replaceWith?: string;
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

function resolveCard(name: string): DbCard | null {
  const db = getDb();
  return (
    (db
      .prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1')
      .get(name) as DbCard | undefined) || null
  );
}

/**
 * Check if a card fits within the deck's color identity.
 */
function fitsColorIdentity(card: DbCard, deckColors: Set<string>): boolean {
  if (deckColors.size === 0) return true;
  try {
    const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    return ci.every((c) => deckColors.has(c));
  } catch {
    return true;
  }
}

/**
 * Check if a card is legal in the given format.
 */
function isLegalInFormat(card: DbCard, format: string): boolean {
  if (!format || !card.legalities) return true;
  try {
    const legalities = JSON.parse(card.legalities);
    const status = legalities[format];
    return !status || status === 'legal' || status === 'restricted';
  } catch {
    return true;
  }
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

    // Always fetch FRESH deck state — the deck may have changed since last turn
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

    // Detect color identity from commander + all cards
    const colorSet = new Set<string>();
    // Commander's color identity defines the deck's identity
    for (const card of commanderCards) {
      try {
        const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
        ci.forEach((c) => colorSet.add(c));
      } catch {}
    }
    // If no commander, derive from deck
    if (commanderCards.length === 0) {
      for (const card of mainCards) {
        try {
          const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
          ci.forEach((c) => colorSet.add(c));
        } catch {}
      }
    }
    const deckColors = Array.from(colorSet);

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

    // Detect singleton violations
    const nameCounts = new Map<string, number>();
    for (const card of mainCards) {
      const isBasic = (card.type_line || '').includes('Basic');
      if (!isBasic) {
        nameCounts.set(card.name, (nameCounts.get(card.name) || 0) + card.quantity);
      }
    }
    const singletonViolations = isCommanderLike
      ? Array.from(nameCounts.entries()).filter(([, count]) => count > 1).map(([name, count]) => `${name} (${count})`)
      : [];

    // Build concise deck list grouped by type
    const deckByType: Record<string, string[]> = {};
    for (const c of mainCards) {
      const mainType = c.type_line.split('—')[0].trim().split(' ').pop() || 'Other';
      if (!deckByType[mainType]) deckByType[mainType] = [];
      deckByType[mainType].push(`${c.quantity}x ${c.name} (CMC:${c.cmc})`);
    }
    const deckSummary = Object.entries(deckByType)
      .map(([type, cards]) => `${type} (${cards.length}):\n${cards.join(', ')}`)
      .join('\n\n');

    const commanderInfo =
      commanderCards.length > 0
        ? `Commander: ${commanderCards.map((c) => c.name).join(', ')}`
        : '';

    const effectiveTarget = isCommanderLike
      ? targetSize - (commanderCards.length > 0 ? 1 : 0)
      : targetSize;
    const sizeStatus = currentMainCount === effectiveTarget
      ? 'EXACTLY at target'
      : currentMainCount > effectiveTarget
        ? `OVER by ${currentMainCount - effectiveTarget}`
        : `UNDER by ${effectiveTarget - currentMainCount}`;

    // System prompt — kept focused and short to avoid context dilution
    const systemPrompt = `You are an expert MTG deck tuning assistant.

DECK: "${deck.name}" | Format: ${format} | ${commanderInfo}
Colors: ${deckColors.join(', ') || 'Colorless'}
Main deck: ${currentMainCount}/${effectiveTarget} (${sizeStatus})
Lands: ${landCount}/${targetLands}
${illegalCards.length > 0 ? `ILLEGAL CARDS: ${illegalCards.join(', ')}` : ''}
${singletonViolations.length > 0 ? `SINGLETON VIOLATIONS: ${singletonViolations.join(', ')}` : ''}

HARD RULES — NEVER violate these:
1. ONLY suggest cards in the deck's color identity: {${deckColors.join(', ')}}. Cards with colors outside this set are FORBIDDEN.
2. ${isCommanderLike ? `Fixed-size format: deck must stay at ${effectiveTarget} main cards. Every ADD MUST be paired with a CUT (use "swap" action).` : 'Standard deck size rules.'}
3. ${isCommanderLike ? 'Singleton: max 1 copy of each non-basic-land card.' : 'Max 4 copies of non-basic-land cards.'}
4. Only suggest cards legal in ${format}.
5. Never cut lands unless deck has ${targetLands + 3}+ lands.

CURRENT DECKLIST:
${deckSummary}

RESPONSE FORMAT (strict JSON):
{"message":"Your explanation","actions":[{"action":"swap","cardName":"Cut This","replaceWith":"Add This","quantity":1,"reason":"why"}]}
Use "swap" for replacements (preferred). Use "add"/"cut" only when deck size needs adjusting.`;

    // Build messages — short history + fresh state reminder each turn
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Only keep last 6 history messages to prevent context dilution
    if (history && history.length > 0) {
      const trimmed = history.slice(-6);
      for (const msg of trimmed) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Inject a state reminder before the user's message if there's history
    if (history && history.length > 0) {
      messages.push({
        role: 'system',
        content: `REMINDER: Deck currently has ${currentMainCount}/${effectiveTarget} main cards. Colors: {${deckColors.join(', ')}}. ${sizeStatus}. ${isCommanderLike ? 'Use "swap" for every replacement — do NOT add without cutting.' : ''}`,
      });
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

    // ── Server-side validation & resolution ────────────────────────────
    const resolvedActions: Array<{
      action: 'cut' | 'add';
      cardId: string;
      cardName: string;
      quantity: number;
      reason: string;
      imageUri?: string;
    }> = [];

    const existingCardNames = new Set(deck.cards.map((c) => c.name.toLowerCase()));
    const rejectedCards: string[] = [];

    for (const act of parsed.actions || []) {
      if (act.action === 'swap') {
        // Swap = cut + add — resolve both
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

        if (addCard) {
          // Validate: color identity, format legality, not already in deck
          if (!fitsColorIdentity(addCard, colorSet)) {
            rejectedCards.push(`${addCard.name} (wrong colors)`);
          } else if (!isLegalInFormat(addCard, format)) {
            rejectedCards.push(`${addCard.name} (not legal in ${format})`);
          } else if (existingCardNames.has(addCard.name.toLowerCase())) {
            rejectedCards.push(`${addCard.name} (already in deck)`);
          } else {
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
        if (addCard) {
          if (!fitsColorIdentity(addCard, colorSet)) {
            rejectedCards.push(`${addCard.name} (wrong colors)`);
          } else if (!isLegalInFormat(addCard, format)) {
            rejectedCards.push(`${addCard.name} (not legal in ${format})`);
          } else if (existingCardNames.has(addCard.name.toLowerCase())) {
            rejectedCards.push(`${addCard.name} (already in deck)`);
          } else {
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
    }

    // ── Enforce CUT/ADD balance for fixed-size formats ─────────────────
    if (isCommanderLike) {
      const addCount = resolvedActions.filter((a) => a.action === 'add').reduce((s, a) => s + a.quantity, 0);
      const cutCount = resolvedActions.filter((a) => a.action === 'cut').reduce((s, a) => s + a.quantity, 0);
      const sizeAfter = currentMainCount - cutCount + addCount;

      if (sizeAfter > effectiveTarget) {
        // Too many ADDs without CUTs — trim excess adds from the end
        let excess = sizeAfter - effectiveTarget;
        for (let i = resolvedActions.length - 1; i >= 0 && excess > 0; i--) {
          if (resolvedActions[i].action === 'add') {
            const remove = Math.min(resolvedActions[i].quantity, excess);
            resolvedActions[i].quantity -= remove;
            excess -= remove;
            if (resolvedActions[i].quantity <= 0) {
              resolvedActions.splice(i, 1);
            }
          }
        }
      }
    }

    // Append rejection note to message if any cards were filtered
    let message = parsed.message;
    if (rejectedCards.length > 0) {
      message += `\n\n(Filtered out: ${rejectedCards.join(', ')} — server-side validation)`;
    }

    return NextResponse.json({
      message,
      actions: resolvedActions,
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'AI chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
