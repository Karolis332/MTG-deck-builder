/**
 * Claude-powered card suggestion engine using Sonnet 4.5.
 *
 * Uses the user's Anthropic API key (stored in app_state) to get Claude-powered
 * deck improvement suggestions with deep MTG knowledge.
 */

import { getDb } from '@/lib/db';
import { COMMANDER_FORMATS } from '@/lib/constants';
import type { DbCard } from '@/lib/types';
import { getTemplate, getTemplateSummary, isImpulseDraw } from '@/lib/deck-templates';
import { analyzeCommander, getCommanderStrategyPrompt } from '@/lib/commander-synergy';
import fs from 'fs';
import path from 'path';

interface ClaudeSuggestionResult {
  suggestions: Array<{
    cardName: string;
    reason: string;
    action: 'add' | 'cut';
  }>;
  deckColors: string[];
  isCommanderLike: boolean;
}

function getClaudeKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_anthropic_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

// Load MTG deck building knowledge base
function getMTGKnowledge(): string {
  try {
    // In Electron production builds, docs are in extraResources (process.resourcesPath/docs/)
    // In dev, they're at process.cwd()/docs/
    const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    const candidates = [
      resourcesPath ? path.join(resourcesPath, 'docs', 'MTG_DECK_BUILDING_KNOWLEDGE.md') : '',
      path.join(process.cwd(), 'docs', 'MTG_DECK_BUILDING_KNOWLEDGE.md'),
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, 'utf-8');
      }
    }
    throw new Error('Knowledge base not found');
  } catch {
    // Fallback to basic rules if knowledge base not found
    return `
## Core Rules
1. Never cut ramp below 8 sources (ideally 10-12)
2. Never cut draw below 8 sources (ideally 10-12)
3. Spellslinger needs 25+ instants/sorceries
4. Replace same role with same role (ramp→ramp, draw→draw)
5. Keep replacements within ±1 CMC
`;
  }
}

/**
 * Get AI-powered suggestions using Claude Sonnet 4.5.
 * Returns null if no API key is configured.
 */
export async function getClaudeSuggestions(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string,
  collectionCardNames?: string[]
): Promise<ClaudeSuggestionResult | null> {
  const apiKey = getClaudeKey();
  if (!apiKey) return null;

  const mainCards = deckCards.filter((c) => c.board === 'main' || c.board === 'commander');
  const commanderCards = deckCards.filter((c) => c.board === 'commander');
  const isCommanderLike = COMMANDER_FORMATS.includes(
    format as (typeof COMMANDER_FORMATS)[number]
  );

  // Build deck summary with oracle text
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

  // Detect color identity
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

  // Count ramp sources (CRITICAL - track these cards!)
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

  const instantSorceryCount = mainCards.filter((c) => {
    const type = (c.type_line || '').toLowerCase();
    return type.includes('instant') || type.includes('sorcery');
  }).reduce((s, c) => s + c.quantity, 0);

  const avgCMC = mainCards.reduce((sum, c) => sum + (c.cmc * c.quantity), 0) /
                mainCards.reduce((s, c) => s + c.quantity, 0);

  // Check format legality
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

  // List all mana rocks in deck (NEVER cut these!)
  const rampCardNames = rampCards.map(c => c.name).join(', ');

  const collectionNote = collectionCardNames
    ? `\n**CRITICAL CONSTRAINT**: User only owns these ${collectionCardNames.length} cards. You MUST ONLY suggest cards from this list:\n${collectionCardNames.join(', ')}`
    : '';

  const illegalNote = illegalCards.length > 0
    ? `\n**FORMAT ILLEGAL**: These cards MUST be replaced first: ${illegalCards.join(', ')}`
    : '';

  // Detect archetype — commander synergy analysis overrides generic CMC-based
  let archetype = 'midrange';
  if (instantSorceryCount >= 20) archetype = 'spellslinger';
  else if (avgCMC >= 4.0) archetype = 'control';
  else if (avgCMC <= 2.8) archetype = 'aggro';

  let commanderStrategy = '';
  if (commanderCards.length > 0) {
    for (const cmd of commanderCards) {
      let ci: string[] = [];
      try { ci = cmd.color_identity ? JSON.parse(cmd.color_identity) : []; } catch {}
      const profile = analyzeCommander(cmd.oracle_text || '', cmd.type_line, ci);
      if (profile) {
        if (profile.detectedArchetype) {
          archetype = profile.detectedArchetype;
        }
        commanderStrategy += getCommanderStrategyPrompt(profile) + '\n';
      }
    }
  }

  // Count impulse draw sources (red's card advantage)
  const impulseDrawCards = mainCards.filter((c) => isImpulseDraw(c.oracle_text || ''));
  const impulseDrawCount = impulseDrawCards.reduce((s, c) => s + c.quantity, 0);

  // Generate archetype template summary for the prompt
  const templateSummary = getTemplateSummary(archetype, deckColors.length);

  const mtgKnowledge = getMTGKnowledge();

  const colorRule = isCommanderLike
    ? `**ABSOLUTE RULE**: ONLY suggest ADD cards within color identity {${colors}}. Any card with colors outside {${colors}} is FORBIDDEN.`
    : `Suggest cards that work well in a ${colors || 'colorless'} deck.`;

  const sizeRule = isCommanderLike
    ? `**DECK SIZE RULE**: Commander decks are exactly 99 cards (+ 1 commander). Every ADD must have a matching CUT.`
    : `Suggest more ADDs than CUTs if deck is under 60 cards.`;

  const prompt = `You are an expert Magic: The Gathering Commander deck builder with deep knowledge of optimal deck construction, mana curves, and archetype strategies.

# DECK ANALYSIS

${commanderInfo}**Format**: ${format}
**Archetype**: ${archetype}
**Color Identity**: {${colors}} ${isCommanderLike ? '— STRICT COLOR RESTRICTION' : ''}
**Total Cards**: ${mainCards.reduce((s, c) => s + c.quantity, 0)}
**Lands**: ${landCount}
**Ramp Sources**: ${rampCount} ${rampCount < 8 ? '⚠️ CRITICALLY LOW' : rampCount < 10 ? '⚠️ LOW' : '✅'}
**Instants/Sorceries**: ${instantSorceryCount} ${archetype === 'spellslinger' && instantSorceryCount < 25 ? '⚠️ TOO LOW FOR SPELLSLINGER' : ''}
**Impulse Draw (Red)**: ${impulseDrawCount} sources${deckColors.includes('R') && impulseDrawCount < 3 ? ' ⚠️ LOW — red decks want 3-6 impulse draw sources' : ''}
**Average CMC**: ${avgCMC.toFixed(2)}

**RAMP CARDS IN DECK** (NEVER CUT THESE): ${rampCardNames || 'None'}

## Current Decklist
${deckSummary}
${illegalNote}${collectionNote}

# ARCHETYPE TEMPLATE (use these ratios as targets)

${templateSummary}
${commanderStrategy ? `\n${commanderStrategy}` : ''}
# MTG DECK BUILDING KNOWLEDGE BASE

${mtgKnowledge}

# YOUR TASK

Analyze this deck using the knowledge base above and provide **exactly 5 suggestions** as ADD/CUT pairs that improve the deck's power level, consistency, and synergy.

## CRITICAL VALIDATION RULES (NEVER VIOLATE)

**1. MANA ROCK PROTECTION (HIGHEST PRIORITY)**:
- **Current ramp count: ${rampCount}**
- **Ramp cards in deck**: ${rampCardNames}
- If ramp count < 10: **NEVER suggest cutting ANY of these cards**: ${rampCardNames}
- Mana rocks (Sol Ring, Arcane Signet, Signets, Talismans, Mind Stone, etc.) are SACRED
- Only cut a mana rock if: (a) deck has 12+ ramp sources AND (b) you're replacing with cheaper/better ramp
- **VIOLATION PENALTY**: Any suggestion cutting a mana rock when ramp < 10 will be REJECTED

${colorRule}

**SPELLSLINGER RULES** ${archetype === 'spellslinger' ? '(ACTIVE FOR THIS DECK)' : ''}:
- Current instant/sorcery count: ${instantSorceryCount}
- If cutting instant/sorcery: MUST replace with another instant/sorcery (maintain spell density)
- Never suggest cutting spell payoffs (Young Pyromancer, Talrand, Niv-Mizzet, Storm-Kiln Artist, etc.)
- **PREMIUM SPELLS PROTECTION**: NEVER cut Lightning Bolt, Abrade, Counterspell, Brainstorm, Ponder, Preordain, Frantic Search, or other foundational spellslinger enablers
- These cards are the BACKBONE of spellslinger strategy (1 CMC removal/cantrips are irreplaceable)

**REPLACEMENT RULES**:
- Replace same role with same role (ramp→ramp, draw→draw, removal→removal)
- Keep CMC within ±1 of card being cut
- Never cut lands unless deck has 40+ lands

${sizeRule}

**FORMAT LEGALITY**: Replace illegal cards first before optimizing.

## OUTPUT FORMAT

Respond with ONLY valid JSON (no markdown, no code blocks):

{"suggestions": [
  {"cardName": "Exact Card Name", "reason": "Why this card (role, CMC, synergy)", "action": "add"},
  {"cardName": "Exact Card Name", "reason": "Why cutting (lower priority, off-theme, etc)", "action": "cut"},
  ... (exactly 5 ADD/CUT pairs = 10 total)
]}

**Quality Requirements**:
- Each "reason" must mention: role (ramp/draw/removal/payoff), mana value, and how it fits archetype
- ADDs must be cards that likely exist (no typos, use correct printing names)
- CUTs should target lowest-impact cards first (never cut mana rocks if ${rampCount < 10})`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Claude Suggest] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Extract JSON from response (handle if Claude wraps it in markdown)
    let jsonText = content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[1] || jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    return {
      suggestions: parsed.suggestions || [],
      deckColors,
      isCommanderLike,
    };
  } catch (error) {
    console.error('[Claude Suggest] Error:', error);
    return null;
  }
}
