/**
 * Sideboard Guide Generator — AI-powered boarding plans per matchup.
 *
 * Uses the Claude API to generate in/out recommendations for each
 * meta archetype, cached in the sideboard_guides DB table.
 */

import { getDb } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SideboardCardAction {
  name: string;
  quantity: number;
  reason: string;
}

export interface SideboardPlan {
  opponentArchetype: string;
  opponentColors: string | null;
  cardsIn: SideboardCardAction[];
  cardsOut: SideboardCardAction[];
  strategyNotes: string;
}

interface DeckCard {
  name: string;
  quantity: number;
  board: string; // 'main' | 'sideboard'
  typeLine?: string;
  manaCost?: string;
}

interface ArchetypeWinStat {
  archetype: string;
  format: string;
  total_wins: number;
  total_losses: number;
  total_entries: number;
}

// ── Guide Generation ─────────────────────────────────────────────────────────

function getClaudeKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_anthropic_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

function getClaudeModel(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_claude_model'")
    .get() as { value: string } | undefined;
  return row?.value || 'claude-sonnet-4-5-20250929';
}

/**
 * Get top meta archetypes from the archetype_win_stats table.
 */
function getMetaArchetypes(format: string, limit = 8): ArchetypeWinStat[] {
  const db = getDb();
  try {
    return db.prepare(
      `SELECT archetype, format, total_wins, total_losses, total_entries
       FROM archetype_win_stats
       WHERE format = ? AND total_entries >= 3
       ORDER BY total_entries DESC
       LIMIT ?`
    ).all(format, limit) as ArchetypeWinStat[];
  } catch {
    return [];
  }
}

/**
 * Generate sideboard guides for a deck against meta archetypes.
 * Calls Claude API for each matchup and caches results.
 */
export async function generateSideboardGuide(
  deckId: number,
  deckCards: DeckCard[],
  format: string,
): Promise<SideboardPlan[]> {
  const apiKey = getClaudeKey();
  if (!apiKey) {
    throw new Error('Claude API key not configured. Add it in Settings.');
  }

  const mainboard = deckCards.filter(c => c.board === 'main');
  const sideboard = deckCards.filter(c => c.board === 'sideboard');

  if (sideboard.length === 0) {
    throw new Error('No sideboard cards found. Add cards to the sideboard first.');
  }

  // Get meta archetypes
  const archetypes = getMetaArchetypes(format);
  if (archetypes.length === 0) {
    // Fallback to common archetypes
    const fallbackArchetypes = ['Aggro', 'Midrange', 'Control', 'Combo'];
    for (const arch of fallbackArchetypes) {
      archetypes.push({
        archetype: arch,
        format,
        total_wins: 0,
        total_losses: 0,
        total_entries: 0,
      });
    }
  }

  const mainboardStr = mainboard
    .map(c => `${c.quantity}x ${c.name}${c.typeLine ? ` (${c.typeLine})` : ''}`)
    .join('\n');

  const sideboardStr = sideboard
    .map(c => `${c.quantity}x ${c.name}${c.typeLine ? ` (${c.typeLine})` : ''}`)
    .join('\n');

  const archetypeList = archetypes
    .map(a => {
      const wr = a.total_wins + a.total_losses > 0
        ? ((a.total_wins / (a.total_wins + a.total_losses)) * 100).toFixed(1) + '%'
        : 'unknown';
      return `- ${a.archetype} (${a.total_entries} entries, ${wr} win rate)`;
    })
    .join('\n');

  const prompt = `You are a competitive Magic: The Gathering sideboard expert.

Given this ${format} deck and sideboard, generate boarding plans for each matchup archetype.

## Mainboard (${mainboard.reduce((s, c) => s + c.quantity, 0)} cards):
${mainboardStr}

## Sideboard (${sideboard.reduce((s, c) => s + c.quantity, 0)} cards):
${sideboardStr}

## Meta Archetypes to board against:
${archetypeList}

For EACH archetype, provide:
1. Cards to bring IN from the sideboard (with quantity and reason)
2. Cards to take OUT from the mainboard (with quantity and reason)
3. Brief strategy notes for the matchup

Rules:
- Total cards IN must equal total cards OUT
- Only bring in cards that are in the sideboard
- Only take out cards that are in the mainboard
- Consider the matchup dynamics (speed, interaction, win conditions)

Respond with ONLY valid JSON in this exact format:
[
  {
    "opponentArchetype": "Aggro",
    "opponentColors": "RW",
    "cardsIn": [{"name": "Card Name", "quantity": 2, "reason": "..."}],
    "cardsOut": [{"name": "Card Name", "quantity": 2, "reason": "..."}],
    "strategyNotes": "..."
  }
]`;

  const model = getClaudeModel();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errText}`);
  }

  const result = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const text = result.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('');

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse sideboard guide from AI response');
  }

  const plans = JSON.parse(jsonMatch[0]) as SideboardPlan[];

  // Cache in DB
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO sideboard_guides
     (deck_id, opponent_archetype, opponent_colors, cards_in, cards_out, reasoning, source)
     VALUES (?, ?, ?, ?, ?, ?, 'ai')`
  );

  for (const plan of plans) {
    stmt.run(
      deckId,
      plan.opponentArchetype,
      plan.opponentColors,
      JSON.stringify(plan.cardsIn),
      JSON.stringify(plan.cardsOut),
      plan.strategyNotes,
    );
  }

  return plans;
}

/**
 * Get cached sideboard guides for a deck.
 */
export function getCachedGuides(deckId: number): SideboardPlan[] {
  const db = getDb();
  try {
    const rows = db.prepare(
      `SELECT opponent_archetype, opponent_colors, cards_in, cards_out, reasoning
       FROM sideboard_guides WHERE deck_id = ? ORDER BY opponent_archetype`
    ).all(deckId) as Array<{
      opponent_archetype: string;
      opponent_colors: string | null;
      cards_in: string;
      cards_out: string;
      reasoning: string | null;
    }>;

    return rows.map(row => ({
      opponentArchetype: row.opponent_archetype,
      opponentColors: row.opponent_colors,
      cardsIn: JSON.parse(row.cards_in),
      cardsOut: JSON.parse(row.cards_out),
      strategyNotes: row.reasoning ?? '',
    }));
  } catch {
    return [];
  }
}

/**
 * Delete cached guides for a deck (call when deck is modified).
 */
export function invalidateGuides(deckId: number): void {
  const db = getDb();
  try {
    db.prepare('DELETE FROM sideboard_guides WHERE deck_id = ?').run(deckId);
  } catch {
    // Non-critical
  }
}
