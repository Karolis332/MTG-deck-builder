import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMatchTimeline, getMatchTelemetrySummary } from '@/lib/db';

/**
 * POST /api/arena-telemetry/analyze
 * AI-powered post-game play analysis.
 *
 * Takes a match_id, reads the full action timeline + summary,
 * sends to Claude for play-by-play critique and suggestions.
 */
export async function POST(request: NextRequest) {
  try {
    const { match_id } = await request.json();
    if (!match_id) {
      return NextResponse.json({ error: 'match_id is required' }, { status: 400 });
    }

    // Get API key
    const db = getDb();
    const keyRow = db
      .prepare("SELECT value FROM app_state WHERE key = 'setting_anthropic_api_key'")
      .get() as { value: string } | undefined;
    const apiKey = keyRow?.value;
    if (!apiKey) {
      return NextResponse.json({ error: 'No Anthropic API key configured. Add one in Settings.' }, { status: 400 });
    }

    const modelRow = db
      .prepare("SELECT value FROM app_state WHERE key = 'setting_claude_model'")
      .get() as { value: string } | undefined;
    const model = modelRow?.value || 'claude-sonnet-4-5-20250929';

    // Load match data
    const actions = getMatchTimeline(match_id) as Array<{
      action_type: string;
      turn_number: number;
      phase: string;
      player: string;
      grp_id: number | null;
      card_name: string | null;
      details: string | null;
      game_number: number;
    }>;

    const summary = getMatchTelemetrySummary(match_id) as {
      match_id: string;
      player_name: string | null;
      opponent_name: string | null;
      result: string;
      format: string | null;
      turns: number;
      opening_hand: string | null;
      mulligan_count: number | null;
      on_play: number | null;
      life_progression: string | null;
      draw_order: string | null;
      sideboard_changes: string | null;
      opponent_cards_by_turn: string | null;
    } | null;

    if (!summary) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (actions.length === 0) {
      return NextResponse.json({ error: 'No telemetry data for this match. Was it played with the new version?' }, { status: 404 });
    }

    // Resolve grpIds to card names for better analysis
    const grpIds = new Set<number>();
    for (const a of actions) {
      if (a.grp_id) grpIds.add(a.grp_id);
    }

    const cardNameMap = new Map<number, string>();
    if (grpIds.size > 0) {
      // Try grp_id_cache first, then cards table
      const stmtCache = db.prepare('SELECT grp_id, card_name FROM grp_id_cache WHERE grp_id = ?');
      const stmtCards = db.prepare('SELECT arena_id, name FROM cards WHERE arena_id = ?');
      grpIds.forEach((grpId) => {
        const cached = stmtCache.get(grpId) as { grp_id: number; card_name: string } | undefined;
        if (cached) {
          cardNameMap.set(grpId, cached.card_name);
        } else {
          const card = stmtCards.get(grpId) as { arena_id: number; name: string } | undefined;
          if (card) {
            cardNameMap.set(grpId, card.name);
          }
        }
      });
    }

    // Build the timeline narrative for Claude
    const timeline = buildTimelineNarrative(actions, cardNameMap);

    // Parse summary fields
    let lifeData = '';
    if (summary.life_progression) {
      try {
        const lp = JSON.parse(summary.life_progression) as Array<{ turn: number; player: number; opponent: number }>;
        if (lp.length > 0) {
          const keyMoments = lp.filter((_, i) => i === 0 || i === lp.length - 1 || i % 3 === 0);
          lifeData = keyMoments.map(l => `T${l.turn}: You ${l.player} / Opp ${l.opponent}`).join(', ');
        }
      } catch { /* ignore parse errors */ }
    }

    let opponentCards = '';
    if (summary.opponent_cards_by_turn) {
      try {
        const oct = JSON.parse(summary.opponent_cards_by_turn) as Record<string, number[]>;
        const entries = Object.entries(oct);
        if (entries.length > 0) {
          opponentCards = entries.map(([turn, ids]) => {
            const names = ids.map(id => cardNameMap.get(id) || `#${id}`).join(', ');
            return `Turn ${turn}: ${names}`;
          }).join('\n');
        }
      } catch { /* ignore */ }
    }

    const prompt = `You are an expert MTG coach analyzing a completed Arena match. Provide specific, actionable feedback on the player's decisions.

## Match Info
- Format: ${summary.format || 'Unknown'}
- Result: **${summary.result?.toUpperCase()}**
- Turns: ${summary.turns || 'Unknown'}
- On the play: ${summary.on_play === 1 ? 'Yes' : summary.on_play === 0 ? 'No' : 'Unknown'}
- Mulligans: ${summary.mulligan_count ?? 0}
- Opponent: ${summary.opponent_name || 'Unknown'}

${lifeData ? `## Life Totals\n${lifeData}` : ''}

${opponentCards ? `## Opponent Cards Seen\n${opponentCards}` : ''}

## Turn-by-Turn Actions
${timeline}

## Analysis Instructions
Provide your analysis in this JSON format:
{
  "overall_grade": "A/B/C/D/F",
  "summary": "1-2 sentence match summary",
  "key_moments": [
    {
      "turn": 3,
      "description": "What happened",
      "assessment": "good/questionable/mistake",
      "suggestion": "What you should have done instead (if applicable)"
    }
  ],
  "patterns": [
    "Recurring strategic observation 1",
    "Recurring strategic observation 2"
  ],
  "mulligan_assessment": "Was the keep/mull correct?",
  "mana_efficiency": "How well did the player use their mana each turn?",
  "threat_assessment": "How well did the player identify and handle threats?",
  "top_improvement": "The single most impactful thing to improve"
}

Be specific — reference actual card names and turn numbers. Be honest but constructive.
Return ONLY valid JSON, no markdown fences.`;

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
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Claude API error: ${response.status} ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Parse JSON response
    try {
      const analysis = JSON.parse(text);
      return NextResponse.json({ analysis, match_id, action_count: actions.length });
    } catch {
      // If Claude didn't return clean JSON, return raw text
      return NextResponse.json({ analysis: { raw: text }, match_id, action_count: actions.length });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Build a readable turn-by-turn narrative from telemetry actions.
 */
function buildTimelineNarrative(
  actions: Array<{
    action_type: string;
    turn_number: number;
    phase: string;
    player: string;
    grp_id: number | null;
    card_name: string | null;
    details: string | null;
    game_number: number;
  }>,
  cardNames: Map<number, string>
): string {
  const lines: string[] = [];
  let currentTurn = -1;
  let currentGame = 1;

  for (const a of actions) {
    // Skip noisy events
    if (a.action_type === 'phase_change') continue;

    const cardName = a.card_name || (a.grp_id ? cardNames.get(a.grp_id) : null) || '';
    const player = a.player === 'self' ? 'You' : 'Opponent';

    if (a.game_number !== currentGame) {
      currentGame = a.game_number;
      lines.push(`\n--- Game ${currentGame} ---`);
      currentTurn = -1;
    }

    if (a.turn_number !== currentTurn && a.turn_number > 0) {
      currentTurn = a.turn_number;
      lines.push(`\nTurn ${currentTurn}:`);
    }

    switch (a.action_type) {
      case 'match_start':
        lines.push(`Match started`);
        break;
      case 'deck_submitted':
        lines.push(`Deck submitted`);
        break;
      case 'mulligan_keep':
        lines.push(`Kept hand (mulligan ${parseMulliganCount(a.details)})`);
        break;
      case 'mulligan_mull':
        lines.push(`Mulliganed (count: ${parseMulliganCount(a.details)})`);
        break;
      case 'card_drawn':
        lines.push(`  ${player} drew ${cardName || '(unknown card)'}`);
        break;
      case 'card_played':
      case 'opponent_card_played':
        lines.push(`  ${player} played ${cardName || '(unknown card)'}`);
        break;
      case 'life_change': {
        const details = parseDetails(a.details);
        lines.push(`  ${player} life → ${details?.lifeTotal ?? '?'}`);
        break;
      }
      case 'turn_start':
        // Already handled by turn header
        break;
      case 'sideboard_start':
        lines.push(`\n--- Sideboarding for Game ${a.game_number} ---`);
        break;
      case 'match_end': {
        const details = parseDetails(a.details);
        lines.push(`\nMatch ended: ${details?.result || 'unknown'}`);
        break;
      }
    }
  }

  // Limit to ~200 lines to stay within Claude context
  if (lines.length > 200) {
    return lines.slice(0, 200).join('\n') + '\n... (truncated)';
  }
  return lines.join('\n');
}

function parseDetails(details: string | null): Record<string, unknown> | null {
  if (!details) return null;
  try { return JSON.parse(details); } catch { return null; }
}

function parseMulliganCount(details: string | null): number {
  const d = parseDetails(details);
  return (d?.mulliganCount as number) ?? (d?.handSize as number) ?? 0;
}
