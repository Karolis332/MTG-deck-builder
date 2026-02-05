/**
 * OpenAI-powered card suggestion engine.
 *
 * Uses the user's OpenAI API key (stored in app_state) to get GPT-powered
 * deck improvement suggestions. Falls back gracefully if no key is set.
 */

import { getDb } from '@/lib/db';
import { COMMANDER_FORMATS } from '@/lib/constants';
import type { DbCard } from '@/lib/types';
import type { AISuggestion } from '@/lib/types';

interface OpenAISuggestionResult {
  suggestions: Array<{
    cardName: string;
    reason: string;
    action: 'add' | 'cut';
  }>;
  deckColors: string[];
  isCommanderLike: boolean;
}

function getOpenAIKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_openai_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

/**
 * Get AI-powered suggestions using OpenAI GPT.
 * Returns null if no API key is configured.
 */
export async function getOpenAISuggestions(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string,
  collectionCardNames?: string[]
): Promise<OpenAISuggestionResult | null> {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;

  const mainCards = deckCards.filter((c) => c.board === 'main' || c.board === 'commander');
  const commanderCards = deckCards.filter((c) => c.board === 'commander');
  const isCommanderLike = COMMANDER_FORMATS.includes(
    format as (typeof COMMANDER_FORMATS)[number]
  );

  // Build deck summary for the prompt — include oracle text so GPT knows what cards actually do
  const deckSummary = mainCards
    .map((c) => {
      const oracle = c.oracle_text ? `\n   Text: ${c.oracle_text.replace(/\n/g, '; ')}` : '';
      return `${c.quantity}x ${c.name} (${c.type_line}, CMC ${c.cmc})${oracle}`;
    })
    .join('\n');

  const commanderInfo = commanderCards.length > 0
    ? `Commander: ${commanderCards.map((c) => {
        const oracle = c.oracle_text ? ` — ${c.oracle_text.replace(/\n/g, '; ')}` : '';
        return `${c.name} (${c.type_line}, CMC ${c.cmc})${oracle}`;
      }).join('\n')}\n`
    : '';

  // Detect color identity — commander defines it for commander formats
  const colorSet = new Set<string>();
  if (commanderCards.length > 0) {
    for (const card of commanderCards) {
      try {
        const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
        ci.forEach((c) => colorSet.add(c));
      } catch {}
    }
  } else {
    for (const card of mainCards) {
      try {
        const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
        ci.forEach((c) => colorSet.add(c));
      } catch {}
    }
  }
  const deckColors = Array.from(colorSet);
  const colors = deckColors.join('');

  // Analyze deck structure
  const landCount = mainCards
    .filter((c) => (c.type_line || '').includes('Land'))
    .reduce((s, c) => s + c.quantity, 0);

  // Count ramp sources (CRITICAL - never cut these!)
  const rampCards = mainCards.filter((c) => {
    const text = (c.oracle_text || '').toLowerCase();
    const type = (c.type_line || '').toLowerCase();
    const name = c.name.toLowerCase();
    return (
      // Mana rocks
      (type.includes('artifact') && (text.includes('add') && text.includes('mana'))) ||
      // Signets and Talismans
      name.includes('signet') || name.includes('talisman') ||
      // Land ramp
      text.includes('search your library for a') && text.includes('land') ||
      // Specific ramp cards
      name === 'sol ring' || name === 'arcane signet' || name === "commander's sphere" ||
      name === 'mind stone' || name === 'thought vessel' || name === 'fellwar stone'
    );
  });
  const rampCount = rampCards.reduce((s, c) => s + c.quantity, 0);

  // Count instants/sorceries (important for spellslinger)
  const instantSorceryCount = mainCards.filter((c) => {
    const type = (c.type_line || '').toLowerCase();
    return type.includes('instant') || type.includes('sorcery');
  }).reduce((s, c) => s + c.quantity, 0);

  // Calculate average CMC
  const totalCMC = mainCards.reduce((sum, c) => sum + (c.cmc * c.quantity), 0);
  const totalCards = mainCards.reduce((s, c) => s + c.quantity, 0);
  const avgCMC = totalCards > 0 ? (totalCMC / totalCards).toFixed(2) : '0';

  // Detect archetype
  let archetype = 'midrange';
  if (instantSorceryCount >= 20) archetype = 'spellslinger';
  else if (parseFloat(avgCMC) >= 4.0) archetype = 'ramp/control';
  else if (parseFloat(avgCMC) <= 2.8) archetype = 'aggro/tempo';

  // Check format legality issues
  const illegalCards: string[] = [];
  for (const card of mainCards) {
    if (!card.legalities) continue;
    try {
      const legalities = JSON.parse(card.legalities);
      const status = legalities[format];
      if (status && status !== 'legal' && status !== 'restricted') {
        illegalCards.push(`${card.name} (${status})`);
      }
    } catch {}
  }

  const collectionNote = collectionCardNames
    ? `\n**CRITICAL CONSTRAINT**: User only owns these ${collectionCardNames.length} cards. You MUST ONLY suggest cards from this list. Any card not in this list will be REJECTED:\n${collectionCardNames.join(', ')}`
    : '';

  const illegalNote = illegalCards.length > 0
    ? `\n**FORMAT ILLEGAL**: These cards MUST be replaced first: ${illegalCards.join(', ')}`
    : '';

  // List all mana rocks in deck (NEVER cut these!)
  const rampCardNames = rampCards.map(c => c.name).join(', ');

  const prompt = `You are an expert Magic: The Gathering Commander deck builder with deep strategic knowledge.

# DECK ANALYSIS
${commanderInfo}
**Format**: ${format}
**Archetype**: ${archetype}
**Color Identity**: {${colors}} ${isCommanderLike ? '(STRICT - no other colors allowed)' : ''}
**Total Cards**: ${totalCards}
**Lands**: ${landCount}
**Ramp Sources**: ${rampCount} ${rampCount < 8 ? '⚠️ CRITICALLY LOW' : rampCount < 10 ? '⚠️ LOW' : '✅'}
**Instants/Sorceries**: ${instantSorceryCount} ${archetype === 'spellslinger' && instantSorceryCount < 25 ? '⚠️ TOO LOW' : ''}
**Average CMC**: ${avgCMC}

**RAMP CARDS IN DECK** (NEVER CUT THESE): ${rampCardNames || 'None'}

## Current Decklist
${deckSummary}
${illegalNote}${collectionNote}

# ABSOLUTE RULES (NEVER VIOLATE)

## 1. MANA ROCK PROTECTION (HIGHEST PRIORITY)
**Current ramp count: ${rampCount}**
- If ramp count < 10: **NEVER suggest cutting ANY of these cards**: ${rampCardNames}
- Mana rocks (Sol Ring, Arcane Signet, Signets, Talismans, Mind Stone, etc.) are SACRED
- Only cut a mana rock if: (a) deck has 12+ ramp AND (b) you're replacing with cheaper/better ramp
- **VIOLATION PENALTY**: Any suggestion cutting a mana rock when ramp < 10 will be REJECTED

## 2. COLOR IDENTITY (STRICT)
${isCommanderLike ? `- ONLY suggest cards with colors in {${colors}}
- Any card with colors outside {${colors}} is ABSOLUTELY FORBIDDEN
- Check EVERY card's color identity before suggesting` : `- Prefer cards that match {${colors}}`}

## 3. COLLECTION CONSTRAINT (MANDATORY)
${collectionCardNames ? `- You have ${collectionCardNames.length} cards available
- **ONLY suggest cards from the collection list above**
- Any card not in that list will be REJECTED by the server
- This is not optional - the system will block uncollected cards` : '- No collection constraint'}

## 4. ARCHETYPE COHERENCE
${archetype === 'spellslinger' ? `- This is a SPELLSLINGER deck
- Current instant/sorcery count: ${instantSorceryCount}
- NEVER cut instants/sorceries unless replacing with instants/sorceries
- Need to maintain 25+ instants/sorceries for payoffs to work
- Don't suggest cutting spell payoffs (Young Pyromancer, Talrand, Storm-Kiln Artist, etc.)
- **PREMIUM SPELLS PROTECTION**: NEVER cut Lightning Bolt, Abrade, Counterspell, Brainstorm, Ponder, Preordain, Frantic Search, or other foundational spellslinger enablers
- These cards are the BACKBONE of spellslinger strategy and should only be cut if illegal in format` : ''}

## 5. DECK SIZE
${isCommanderLike ? `- Commander decks are EXACTLY 99 cards (+ 1 commander)
- Every ADD must have a matching CUT
- Suggest exactly 5 ADD/CUT pairs (10 total actions)` : '- Can suggest more ADDs than CUTs if under 60 cards'}

## 6. REPLACEMENT STRATEGY
- Replace same role with same role (ramp→ramp, draw→draw, removal→removal)
- Keep CMC within ±1 of card being cut
- Prioritize replacing illegal cards first
- Cut lowest-impact cards (not your best cards!)

# YOUR TASK
Provide **exactly 5 suggestions** as ADD/CUT pairs that improve the deck while following ALL rules above.

**Quality Checklist Before Responding:**
1. ✅ Did I check ramp count before suggesting to cut any artifact?
2. ✅ Are all suggested ADD cards in the collection list?
3. ✅ Are all ADD cards within color identity {${colors}}?
4. ✅ Am I maintaining spell count for spellslinger archetype?
5. ✅ Am I suggesting equal ADDs and CUTs (for Commander)?

Respond in JSON format only:
{"suggestions": [{"cardName": "Card Name", "reason": "Why this helps (mention role, CMC, synergy)", "action": "add|cut"}]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { suggestions: OpenAISuggestionResult['suggestions'] };
    return { suggestions: parsed.suggestions, deckColors, isCommanderLike };
  } catch (error) {
    console.error('OpenAI suggestion error:', error);
    return null;
  }
}

/**
 * Check if a card fits within the deck's color identity.
 */
function fitsColorIdentity(card: DbCard, deckColors: Set<string>): boolean {
  if (deckColors.size === 0) return true;
  try {
    const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    if (ci.length === 0) return true;
    return ci.every((c) => deckColors.has(c));
  } catch {
    return true;
  }
}

/**
 * Resolve OpenAI suggestion card names to actual DbCard objects from the database.
 * Validates color identity (commander formats only) and format legality server-side.
 */
export function resolveOpenAISuggestions(
  result: OpenAISuggestionResult,
  existingCardIds: Set<string>,
  format?: string
): { adds: AISuggestion[]; cutNames: string[] } {
  const db = getDb();
  const adds: AISuggestion[] = [];
  const cutNames: string[] = [];
  const deckColorSet = new Set(result.deckColors);
  const enforceColorIdentity = result.isCommanderLike;

  for (const suggestion of result.suggestions) {
    if (suggestion.action === 'cut') {
      cutNames.push(suggestion.cardName);
      continue;
    }

    // Look up the card in our database
    const card = db
      .prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1')
      .get(suggestion.cardName) as DbCard | undefined;

    if (!card || existingCardIds.has(card.id)) continue;

    // Color identity validation — only for commander/brawl formats
    if (enforceColorIdentity && !fitsColorIdentity(card, deckColorSet)) continue;

    // Format legality check — always applies
    if (format && card.legalities) {
      try {
        const legalities = JSON.parse(card.legalities);
        const status = legalities[format];
        if (status && status !== 'legal' && status !== 'restricted') continue;
      } catch {}
    }

    adds.push({
      card,
      reason: suggestion.reason,
      score: 95,
    });
  }

  return { adds, cutNames };
}
