/**
 * Match Analyzer — learns from accumulated game data per deck.
 *
 * After each game upload, re-analyzes ALL matches for a deck and produces:
 * 1. Card performance scores (cards correlated with wins vs losses)
 * 2. Matchup analysis (which opponent colors/archetypes are problematic)
 * 3. Tempo analysis (are you dying too fast? running out of gas?)
 * 4. Specific swap suggestions (cut underperformers, add answers)
 *
 * Insights are stored in deck_insights table and accumulate over time.
 */

import { getDb } from '@/lib/db';
import { parseGameLog } from '@/lib/match-log-parser';

interface MatchRow {
  id: number;
  deck_id: number;
  result: string;
  play_draw: string | null;
  opponent_name: string | null;
  opponent_deck_colors: string | null;
  turns: number | null;
  my_life_end: number | null;
  opponent_life_end: number | null;
  my_cards_seen: string | null;
  opponent_cards_seen: string | null;
  game_format: string | null;
  raw_log: string | null;
}

interface DeckCard {
  card_id: string;
  name: string;
  quantity: number;
  board: string;
  cmc: number;
  type_line: string;
  oracle_text: string | null;
}

export interface Insight {
  type: string;
  cardName?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggestion?: string;
  data: Record<string, unknown>;
}

export interface PostGameAnalysis {
  insights: Insight[];
  cardPerformance: Array<{
    name: string;
    winRate: number;
    appearances: number;
    verdict: 'strong' | 'neutral' | 'weak';
  }>;
  matchupBreakdown: Array<{
    colors: string;
    wins: number;
    losses: number;
    winRate: number;
  }>;
  overallStats: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    avgTurns: number;
    playWinRate: number;
    drawWinRate: number;
  };
  swapSuggestions: Array<{
    cut: string;
    reason: string;
    addCandidates: string[];
  }>;
  /** Card win rates by turn played (turn 0 = opening hand / T1 play) */
  turnStats: Array<{
    name: string;
    /** win rate when this card was played on turn N */
    byTurn: Record<number, { wins: number; total: number; winRate: number }>;
    overallWinRate: number;
  }>;
}

export function analyzeMatchesForDeck(deckId: number): PostGameAnalysis {
  const db = getDb();

  // Get all matches for this deck
  const matches = db.prepare(
    'SELECT * FROM match_logs WHERE deck_id = ? ORDER BY created_at ASC'
  ).all(deckId) as MatchRow[];

  // Get the deck's current card list
  const deckCards = db.prepare(`
    SELECT dc.card_id, c.name, dc.quantity, dc.board, c.cmc, c.type_line, c.oracle_text
    FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = ? AND dc.board = 'main'
  `).all(deckId) as DeckCard[];

  const totalGames = matches.length;
  const wins = matches.filter((m) => m.result === 'win').length;
  const losses = matches.filter((m) => m.result === 'loss').length;

  // ── Overall Stats ──────────────────────────────────────────────────────
  const playGames = matches.filter((m) => m.play_draw === 'play');
  const drawGames = matches.filter((m) => m.play_draw === 'draw');
  const playWins = playGames.filter((m) => m.result === 'win').length;
  const drawWins = drawGames.filter((m) => m.result === 'win').length;

  const turnsArr = matches.filter((m) => m.turns).map((m) => m.turns!);
  const avgTurns = turnsArr.length > 0
    ? Math.round(turnsArr.reduce((a, b) => a + b, 0) / turnsArr.length * 10) / 10
    : 0;

  const overallStats = {
    totalGames,
    wins,
    losses,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    avgTurns,
    playWinRate: playGames.length > 0 ? Math.round((playWins / playGames.length) * 100) : 0,
    drawWinRate: drawGames.length > 0 ? Math.round((drawWins / drawGames.length) * 100) : 0,
  };

  // ── Card Performance ───────────────────────────────────────────────────
  // Track how often each card appears in wins vs losses
  const cardStats = new Map<string, { wins: number; losses: number; total: number }>();

  for (const match of matches) {
    let myCards: string[] = [];
    try {
      myCards = JSON.parse(match.my_cards_seen || '[]');
    } catch {}

    const uniqueCards = new Map<string, boolean>();
    for (const card of myCards) {
      if (!uniqueCards.has(card)) {
        uniqueCards.set(card, true);
      }
    }

    uniqueCards.forEach((_, cardName) => {
      const existing = cardStats.get(cardName) || { wins: 0, losses: 0, total: 0 };
      existing.total++;
      if (match.result === 'win') existing.wins++;
      if (match.result === 'loss') existing.losses++;
      cardStats.set(cardName, existing);
    });
  }

  const cardPerformance: PostGameAnalysis['cardPerformance'] = [];
  cardStats.forEach((stats, name) => {
    if (stats.total < 1) return;
    const winRate = Math.round((stats.wins / stats.total) * 100);
    let verdict: 'strong' | 'neutral' | 'weak' = 'neutral';
    // Need at least 2 appearances to judge
    if (stats.total >= 2) {
      if (winRate >= 65) verdict = 'strong';
      else if (winRate <= 35) verdict = 'weak';
    }
    cardPerformance.push({ name, winRate, appearances: stats.total, verdict });
  });

  cardPerformance.sort((a, b) => b.winRate - a.winRate);

  // ── Matchup Breakdown ──────────────────────────────────────────────────
  const matchupMap = new Map<string, { wins: number; losses: number }>();

  for (const match of matches) {
    let colors: string[] = [];
    try {
      colors = JSON.parse(match.opponent_deck_colors || '[]');
    } catch {}
    const colorKey = colors.length > 0 ? colors.sort().join('') : 'Unknown';

    const existing = matchupMap.get(colorKey) || { wins: 0, losses: 0 };
    if (match.result === 'win') existing.wins++;
    if (match.result === 'loss') existing.losses++;
    matchupMap.set(colorKey, existing);
  }

  const matchupBreakdown: PostGameAnalysis['matchupBreakdown'] = [];
  matchupMap.forEach((stats, colors) => {
    const total = stats.wins + stats.losses;
    matchupBreakdown.push({
      colors,
      wins: stats.wins,
      losses: stats.losses,
      winRate: total > 0 ? Math.round((stats.wins / total) * 100) : 0,
    });
  });

  matchupBreakdown.sort((a, b) => (a.wins + a.losses) - (b.wins + b.losses));

  // ── Generate Insights ──────────────────────────────────────────────────
  const insights: Insight[] = [];

  // Insight: Play vs Draw disparity
  if (playGames.length >= 2 && drawGames.length >= 2) {
    const playWR = overallStats.playWinRate;
    const drawWR = overallStats.drawWinRate;
    if (playWR - drawWR > 25) {
      insights.push({
        type: 'tempo_dependent',
        message: `Win rate on play (${playWR}%) is much higher than on draw (${drawWR}%). Your deck is very tempo-dependent.`,
        severity: 'warning',
        suggestion: 'Consider adding more cheap interaction or card draw to improve on the draw.',
        data: { playWR, drawWR },
      });
    }
    if (drawWR - playWR > 25) {
      insights.push({
        type: 'draw_favored',
        message: `Win rate on draw (${drawWR}%) exceeds play (${playWR}%). Unusual for most strategies.`,
        severity: 'info',
        data: { playWR, drawWR },
      });
    }
  }

  // Insight: Dying too fast (average game length in losses)
  const lossMatches = matches.filter((m) => m.result === 'loss' && m.turns);
  if (lossMatches.length >= 2) {
    const avgLossTurns = lossMatches.reduce((a, m) => a + m.turns!, 0) / lossMatches.length;
    if (avgLossTurns <= 5) {
      insights.push({
        type: 'dying_fast',
        message: `You lose on average by turn ${avgLossTurns.toFixed(1)}. Aggressive opponents are running you over.`,
        severity: 'critical',
        suggestion: 'Add early removal (1-2 mana), cheap blockers, or lifegain. Cut expensive cards that sit in hand.',
        data: { avgLossTurns },
      });
    } else if (avgLossTurns <= 7) {
      insights.push({
        type: 'midgame_pressure',
        message: `Losses happen around turn ${avgLossTurns.toFixed(1)}. You may need stronger midgame presence.`,
        severity: 'warning',
        suggestion: 'Ensure your 3-4 mana slot has impactful threats or removal.',
        data: { avgLossTurns },
      });
    }
  }

  // Insight: Life total patterns in losses
  const lossLifeTotals = matches
    .filter((m) => m.result === 'loss' && m.my_life_end !== null)
    .map((m) => m.my_life_end!);
  if (lossLifeTotals.length >= 2) {
    const avgLifeAtLoss = lossLifeTotals.reduce((a, b) => a + b, 0) / lossLifeTotals.length;
    if (avgLifeAtLoss <= 0) {
      insights.push({
        type: 'damage_kills',
        message: 'You are consistently dying to combat/burn damage.',
        severity: 'info',
        suggestion: 'Consider board wipes, lifegain, or more efficient blockers.',
        data: { avgLifeAtLoss },
      });
    }
  }

  // Insight: Opponent cards that keep beating you
  const oppCardFrequency = new Map<string, number>();
  for (const match of matches.filter((m) => m.result === 'loss')) {
    let oppCards: string[] = [];
    try {
      oppCards = JSON.parse(match.opponent_cards_seen || '[]');
    } catch {}
    for (const card of oppCards) {
      oppCardFrequency.set(card, (oppCardFrequency.get(card) || 0) + 1);
    }
  }

  const problematicOppCards: Array<{ name: string; freq: number }> = [];
  oppCardFrequency.forEach((freq, name) => {
    if (freq >= 2) {
      problematicOppCards.push({ name, freq });
    }
  });
  problematicOppCards.sort((a, b) => b.freq - a.freq);

  if (problematicOppCards.length > 0) {
    const topProblems = problematicOppCards.slice(0, 5).map((c) => c.name);
    insights.push({
      type: 'recurring_threats',
      message: `Cards that keep appearing in your losses: ${topProblems.join(', ')}`,
      severity: 'warning',
      suggestion: `Add answers for these threats to your main deck or sideboard.`,
      data: { cards: problematicOppCards.slice(0, 5) },
    });
  }

  // Insight: Weak cards in deck
  const weakCards = cardPerformance.filter(
    (c) => c.verdict === 'weak' && c.appearances >= 2
  );
  for (const weak of weakCards.slice(0, 3)) {
    insights.push({
      type: 'underperformer',
      cardName: weak.name,
      message: `${weak.name} has a ${weak.winRate}% win rate across ${weak.appearances} games.`,
      severity: 'warning',
      suggestion: `Consider cutting ${weak.name} for something with more impact.`,
      data: { winRate: weak.winRate, appearances: weak.appearances },
    });
  }

  // Insight: Strong cards
  const strongCards = cardPerformance.filter(
    (c) => c.verdict === 'strong' && c.appearances >= 2
  );
  for (const strong of strongCards.slice(0, 3)) {
    // Check if we're running max copies
    const inDeck = deckCards.find((dc) => dc.name === strong.name);
    if (inDeck && inDeck.quantity < 4) {
      insights.push({
        type: 'increase_copies',
        cardName: strong.name,
        message: `${strong.name} has a ${strong.winRate}% win rate but you're only running ${inDeck.quantity} copies.`,
        severity: 'info',
        suggestion: `Consider running the full 4 copies of ${strong.name}.`,
        data: { winRate: strong.winRate, currentQty: inDeck.quantity },
      });
    }
  }

  // ── Swap Suggestions ───────────────────────────────────────────────────
  const swapSuggestions: PostGameAnalysis['swapSuggestions'] = [];

  // Suggest cutting weak cards
  for (const weak of weakCards.slice(0, 3)) {
    const inDeck = deckCards.find((dc) => dc.name === weak.name);
    if (!inDeck) continue;

    // Find replacement candidates from the DB
    const candidates = findReplacementCandidates(
      db,
      inDeck,
      deckCards,
      matches,
      problematicOppCards
    );

    swapSuggestions.push({
      cut: weak.name,
      reason: `${weak.winRate}% win rate in ${weak.appearances} games`,
      addCandidates: candidates,
    });
  }

  // If dying too fast, suggest specific additions
  const avgLossTurns = lossMatches.length > 0
    ? lossMatches.reduce((a, m) => a + m.turns!, 0) / lossMatches.length
    : 99;

  if (avgLossTurns <= 5 && swapSuggestions.length < 3) {
    // Find expensive/slow cards that could be cut
    const expensiveCards = deckCards
      .filter((dc) => dc.cmc >= 5 && dc.type_line.includes('Creature'))
      .sort((a, b) => b.cmc - a.cmc);

    for (const expensive of expensiveCards.slice(0, 2)) {
      const already = swapSuggestions.find((s) => s.cut === expensive.name);
      if (already) continue;

      swapSuggestions.push({
        cut: expensive.name,
        reason: `High CMC (${expensive.cmc}) while dying by turn ${avgLossTurns.toFixed(1)} on average`,
        addCandidates: ['Cheap removal or early creatures in the same colors'],
      });
    }
  }

  // ── Turn-by-turn card win rates ──────────────────────────────────────
  // Re-parse raw logs to get per-turn card data, then correlate with win/loss
  // Key: cardName → turn → { wins, total }
  const turnCardMap = new Map<string, Map<number, { wins: number; total: number }>>();

  for (const match of matches) {
    if (!match.raw_log) continue;
    // We need the player name to re-parse — extract from opponent detection
    // The player name is stored implicitly: it's whoever isn't the opponent
    const oppName = match.opponent_name || '';
    // Try to find the player name from the raw log
    const rollLines = match.raw_log.split('\n').filter((l) => /rolled\s+/i.test(l));
    let playerName = '';
    for (const rl of rollLines) {
      const rm = rl.trim().match(/^(\S+)\s+rolled/i);
      if (rm && rm[1].toLowerCase() !== oppName.toLowerCase()) {
        playerName = rm[1];
        break;
      }
    }
    if (!playerName) continue;

    const parsed = parseGameLog(match.raw_log, playerName);
    const isWin = match.result === 'win';

    // For each turn, track which cards were played
    for (const turnStr of Object.keys(parsed.myCardsByTurn)) {
      const turn = parseInt(turnStr, 10);
      const cardsOnTurn = parsed.myCardsByTurn[turn];
      for (const cardName of cardsOnTurn) {
        if (!turnCardMap.has(cardName)) {
          turnCardMap.set(cardName, new Map());
        }
        const cardTurns = turnCardMap.get(cardName)!;
        if (!cardTurns.has(turn)) {
          cardTurns.set(turn, { wins: 0, total: 0 });
        }
        const entry = cardTurns.get(turn)!;
        entry.total++;
        if (isWin) entry.wins++;
      }
    }
  }

  const turnStats: PostGameAnalysis['turnStats'] = [];
  turnCardMap.forEach((turnMap, cardName) => {
    const byTurn: Record<number, { wins: number; total: number; winRate: number }> = {};
    let totalWins = 0;
    let totalGamesForCard = 0;

    turnMap.forEach((stats, turn) => {
      byTurn[turn] = {
        ...stats,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
      };
      totalWins += stats.wins;
      totalGamesForCard += stats.total;
    });

    turnStats.push({
      name: cardName,
      byTurn,
      overallWinRate: totalGamesForCard > 0 ? Math.round((totalWins / totalGamesForCard) * 100) : 0,
    });
  });

  // Sort by overall appearances descending
  turnStats.sort((a, b) => {
    const aTotal = Object.values(a.byTurn).reduce((s, v) => s + v.total, 0);
    const bTotal = Object.values(b.byTurn).reduce((s, v) => s + v.total, 0);
    return bTotal - aTotal;
  });

  // ── Persist insights to DB ─────────────────────────────────────────────
  persistInsights(db, deckId, insights, totalGames);

  return {
    insights,
    cardPerformance,
    matchupBreakdown,
    overallStats,
    swapSuggestions,
    turnStats,
  };
}

function findReplacementCandidates(
  db: ReturnType<typeof getDb>,
  cardToReplace: DeckCard,
  deckCards: DeckCard[],
  matches: MatchRow[],
  problematicCards: Array<{ name: string; freq: number }>
): string[] {
  const candidates: string[] = [];

  // Look at what opponents played that was effective against us
  // and find our own cards that answer those threats
  const cmc = cardToReplace.cmc;
  const isCreature = cardToReplace.type_line.includes('Creature');

  // Get the deck's color identity
  const deckCardIds = deckCards.map((dc) => dc.card_id);
  const deckColorRow = db.prepare(`
    SELECT DISTINCT c.color_identity FROM cards c
    WHERE c.id IN (${deckCardIds.map(() => '?').join(',')})
    AND c.color_identity IS NOT NULL
    LIMIT 20
  `).all(...deckCardIds) as Array<{ color_identity: string }>;

  const deckColorSet = new Set<string>();
  for (const row of deckColorRow) {
    try {
      const ci: string[] = JSON.parse(row.color_identity);
      for (const c of ci) deckColorSet.add(c);
    } catch {}
  }
  const deckColorsArr: string[] = [];
  deckColorSet.forEach((c) => deckColorsArr.push(c));

  // Build exclusion for colors outside the deck
  const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter((c) => !deckColorsArr.includes(c));
  const colorExclude = excludeColors
    .map((c) => `c.color_identity NOT LIKE '%${c}%'`)
    .join(' AND ');

  // Find similar-cost cards with interaction/removal if we need answers
  const deckNameSet = new Set(deckCards.map((dc) => dc.name));
  const hasProblems = problematicCards.length > 0;

  let query: string;
  if (hasProblems && !isCreature) {
    // Look for removal/interaction at similar cost
    query = `
      SELECT c.name FROM cards c
      WHERE c.cmc <= ? AND c.cmc >= ?
      AND c.type_line NOT LIKE '%Land%'
      ${colorExclude ? `AND ${colorExclude}` : ''}
      AND (c.oracle_text LIKE '%destroy%' OR c.oracle_text LIKE '%exile%'
           OR c.oracle_text LIKE '%counter target%' OR c.oracle_text LIKE '%damage%')
      ORDER BY c.edhrec_rank ASC NULLS LAST
      LIMIT 10
    `;
  } else {
    // Look for similar type at similar cost
    const typeHint = isCreature ? "AND c.type_line LIKE '%Creature%'" : '';
    query = `
      SELECT c.name FROM cards c
      WHERE c.cmc <= ? AND c.cmc >= ?
      AND c.type_line NOT LIKE '%Land%'
      ${typeHint}
      ${colorExclude ? `AND ${colorExclude}` : ''}
      ORDER BY c.edhrec_rank ASC NULLS LAST
      LIMIT 10
    `;
  }

  const rows = db.prepare(query).all(
    Math.min(cmc + 1, 6),
    Math.max(cmc - 1, 0)
  ) as Array<{ name: string }>;

  for (const row of rows) {
    if (!deckNameSet.has(row.name) && row.name !== cardToReplace.name) {
      candidates.push(row.name);
      if (candidates.length >= 3) break;
    }
  }

  return candidates;
}

function persistInsights(
  db: ReturnType<typeof getDb>,
  deckId: number,
  insights: Insight[],
  gamesAnalyzed: number
) {
  const upsert = db.prepare(`
    INSERT INTO deck_insights (deck_id, insight_type, card_name, data, confidence, games_analyzed, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(deck_id, insight_type, card_name)
    DO UPDATE SET data = excluded.data, confidence = excluded.confidence,
      games_analyzed = excluded.games_analyzed, updated_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    // Clear stale insights for this deck
    db.prepare('DELETE FROM deck_insights WHERE deck_id = ?').run(deckId);

    for (const insight of insights) {
      const confidence = Math.min(gamesAnalyzed / 10, 1.0); // max confidence at 10+ games
      upsert.run(
        deckId,
        insight.type,
        insight.cardName || null,
        JSON.stringify(insight.data),
        confidence,
        gamesAnalyzed
      );
    }
  });

  tx();
}
