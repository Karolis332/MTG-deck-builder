import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCommunityRecommendations } from '@/lib/db';
import { getCFRecommendations } from '@/lib/cf-api-client';
import type { DbCard } from '@/lib/types';

/**
 * POST /api/ai-suggest/benchmark
 *
 * Runs all suggestion sources against a deck and cross-references
 * each source's output with community data (504k+ decks).
 *
 * Body: { deck_id: number }
 *
 * Returns per-source metrics:
 *   - suggestions: cards suggested
 *   - communityHitRate: % of suggestions that appear in similar community decks
 *   - communityHits: which suggestions matched community data
 *   - latencyMs: time taken
 *   - source: engine name
 */
export async function POST(request: NextRequest) {
  try {
    const { deck_id } = await request.json();
    if (!deck_id) {
      return NextResponse.json({ error: 'deck_id required' }, { status: 400 });
    }

    const db = getDb();

    // Load deck cards
    const deckCards = db.prepare(`
      SELECT c.name, c.type_line, c.color_identity, dc.quantity, dc.board
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ?
    `).all(deck_id) as Array<{
      name: string; type_line: string; color_identity: string | null;
      quantity: number; board: string;
    }>;

    if (deckCards.length === 0) {
      return NextResponse.json({ error: 'Deck not found or empty' }, { status: 404 });
    }

    const deckRow = db.prepare('SELECT name, format FROM decks WHERE id = ?').get(deck_id) as {
      name: string; format: string;
    } | undefined;
    const format = deckRow?.format || 'commander';
    const deckName = deckRow?.name || 'Unknown';

    const mainCards = deckCards.filter(c => c.board === 'main' || c.board === 'commander');
    const cardNames = mainCards.map(c => c.name);
    const existingNames = new Set(cardNames.map(n => n.toLowerCase()));

    // Get commander name
    const cmdCard = deckCards.find(c => c.board === 'commander');
    const commander = cmdCard?.name || '';

    // Build community ground truth — what cards appear in similar decks
    const t0community = Date.now();
    const communityRecs = getCommunityRecommendations(cardNames, format, 200);
    const communityMs = Date.now() - t0community;

    // Map: card name (lowercase) → co-occurrence score
    const communityMap = new Map<string, { score: number; deckCount: number; total: number }>();
    for (const rec of communityRecs) {
      communityMap.set(rec.cardName.toLowerCase(), {
        score: rec.score,
        deckCount: rec.deckCount,
        total: rec.totalSimilarDecks,
      });
    }

    const results: Array<{
      source: string;
      suggestions: string[];
      communityHits: Array<{ card: string; score: number; inDecks: number }>;
      communityHitRate: number;
      latencyMs: number;
      error?: string;
    }> = [];

    // ── 1. Community co-occurrence (ground truth baseline) ──────────────
    results.push({
      source: 'community_cooccurrence',
      suggestions: communityRecs.slice(0, 30).map(r => r.cardName),
      communityHits: communityRecs.slice(0, 30).map(r => ({
        card: r.cardName,
        score: Math.round(r.score * 100),
        inDecks: r.deckCount,
      })),
      communityHitRate: 100, // It IS the community data
      latencyMs: communityMs,
    });

    // ── 2. CF API (collaborative filtering model) ──────────────────────
    const t0cf = Date.now();
    try {
      const cfRecs = await getCFRecommendations(cardNames, commander, 30);
      const cfMs = Date.now() - t0cf;
      const cfNames = cfRecs.map(r => r.card_name);
      const cfHits = cfNames
        .filter(n => communityMap.has(n.toLowerCase()))
        .map(n => {
          const cm = communityMap.get(n.toLowerCase())!;
          return { card: n, score: Math.round(cm.score * 100), inDecks: cm.deckCount };
        });

      results.push({
        source: 'cf_model',
        suggestions: cfNames,
        communityHits: cfHits,
        communityHitRate: cfNames.length > 0 ? Math.round((cfHits.length / cfNames.length) * 100) : 0,
        latencyMs: cfMs,
      });
    } catch (e) {
      results.push({
        source: 'cf_model',
        suggestions: [],
        communityHits: [],
        communityHitRate: 0,
        latencyMs: Date.now() - t0cf,
        error: e instanceof Error ? e.message : 'CF API unreachable',
      });
    }

    // ── 3. Rule-based suggestions ──────────────────────────────────────
    const t0rules = Date.now();
    try {
      const fullCards = db.prepare(`
        SELECT c.*, dc.quantity, dc.board FROM deck_cards dc
        JOIN cards c ON dc.card_id = c.id
        WHERE dc.deck_id = ?
      `).all(deck_id) as Array<{ quantity: number; board: string } & DbCard>;

      const { getRuleBasedSuggestions } = await import('@/lib/ai-suggest');
      const ruleSuggestions = getRuleBasedSuggestions(fullCards, format);
      const rulesMs = Date.now() - t0rules;
      const ruleNames = ruleSuggestions.map(s => s.card.name);
      const ruleHits = ruleNames
        .filter(n => communityMap.has(n.toLowerCase()))
        .map(n => {
          const cm = communityMap.get(n.toLowerCase())!;
          return { card: n, score: Math.round(cm.score * 100), inDecks: cm.deckCount };
        });

      results.push({
        source: 'rules_engine',
        suggestions: ruleNames,
        communityHits: ruleHits,
        communityHitRate: ruleNames.length > 0 ? Math.round((ruleHits.length / ruleNames.length) * 100) : 0,
        latencyMs: rulesMs,
      });
    } catch (e) {
      results.push({
        source: 'rules_engine',
        suggestions: [],
        communityHits: [],
        communityHitRate: 0,
        latencyMs: Date.now() - t0rules,
        error: e instanceof Error ? e.message : 'Rules engine error',
      });
    }

    // ── 4. EDHREC data coverage ────────────────────────────────────────
    const t0edhrec = Date.now();
    try {
      const edhrecCards = db.prepare(`
        SELECT card_name FROM edhrec_avg_decks
        WHERE commander_name = ? COLLATE NOCASE
      `).all(commander) as Array<{ card_name: string }>;
      const edhrecMs = Date.now() - t0edhrec;
      const edhrecNames = edhrecCards
        .map(r => r.card_name)
        .filter(n => !existingNames.has(n.toLowerCase()));
      const edhrecHits = edhrecNames
        .filter(n => communityMap.has(n.toLowerCase()))
        .map(n => {
          const cm = communityMap.get(n.toLowerCase())!;
          return { card: n, score: Math.round(cm.score * 100), inDecks: cm.deckCount };
        });

      results.push({
        source: 'edhrec_avg_deck',
        suggestions: edhrecNames.slice(0, 30),
        communityHits: edhrecHits.slice(0, 30),
        communityHitRate: edhrecNames.length > 0 ? Math.round((edhrecHits.length / edhrecNames.length) * 100) : 0,
        latencyMs: edhrecMs,
      });
    } catch {
      results.push({
        source: 'edhrec_avg_deck',
        suggestions: [],
        communityHits: [],
        communityHitRate: 0,
        latencyMs: Date.now() - t0edhrec,
        error: 'No EDHREC data for this commander',
      });
    }

    // ── 5. Meta card stats ─────────────────────────────────────────────
    const t0meta = Date.now();
    try {
      const metaCards = db.prepare(`
        SELECT card_name, meta_inclusion_rate, avg_copies
        FROM meta_card_stats
        WHERE format = ?
        AND meta_inclusion_rate > 0.05
        ORDER BY meta_inclusion_rate DESC
        LIMIT 50
      `).all(format) as Array<{ card_name: string; meta_inclusion_rate: number; avg_copies: number }>;
      const metaMs = Date.now() - t0meta;
      const metaNames = metaCards
        .map(r => r.card_name)
        .filter(n => !existingNames.has(n.toLowerCase()));
      const metaHits = metaNames
        .filter(n => communityMap.has(n.toLowerCase()))
        .map(n => {
          const cm = communityMap.get(n.toLowerCase())!;
          return { card: n, score: Math.round(cm.score * 100), inDecks: cm.deckCount };
        });

      results.push({
        source: 'meta_card_stats',
        suggestions: metaNames.slice(0, 30),
        communityHits: metaHits.slice(0, 30),
        communityHitRate: metaNames.length > 0 ? Math.round((metaHits.length / metaNames.length) * 100) : 0,
        latencyMs: metaMs,
      });
    } catch {
      results.push({
        source: 'meta_card_stats',
        suggestions: [],
        communityHits: [],
        communityHitRate: 0,
        latencyMs: Date.now() - t0meta,
      });
    }

    // ── Summary stats ──────────────────────────────────────────────────

    // Data pipeline health check
    const communityDeckCount = (db.prepare(
      'SELECT COUNT(*) as c FROM community_decks'
    ).get() as { c: number }).c;

    const communityCardCount = (db.prepare(
      'SELECT COUNT(*) as c FROM community_deck_cards'
    ).get() as { c: number }).c;

    const metaStatsCount = (db.prepare(
      'SELECT COUNT(*) as c FROM meta_card_stats'
    ).get() as { c: number }).c;

    let edhrecArticleCount = 0;
    try {
      edhrecArticleCount = (db.prepare(
        'SELECT COUNT(*) as c FROM edhrec_knowledge'
      ).get() as { c: number }).c;
    } catch {}

    let edhrecDeckCount = 0;
    try {
      edhrecDeckCount = (db.prepare(
        'SELECT COUNT(DISTINCT commander_name) as c FROM edhrec_avg_decks'
      ).get() as { c: number }).c;
    } catch {}

    // Unique suggestions across all sources (deduped)
    const allSuggestedNames = new Set<string>();
    for (const r of results) {
      for (const s of r.suggestions) allSuggestedNames.add(s.toLowerCase());
    }

    // How many unique suggestions are backed by community data
    let communityBacked = 0;
    allSuggestedNames.forEach(name => {
      if (communityMap.has(name)) communityBacked++;
    });

    return NextResponse.json({
      deck: { id: deck_id, name: deckName, format, cardCount: mainCards.length, commander },
      sources: results,
      summary: {
        totalUniqueSuggestions: allSuggestedNames.size,
        communityBackedSuggestions: communityBacked,
        communityBackedPct: allSuggestedNames.size > 0
          ? Math.round((communityBacked / allSuggestedNames.size) * 100) : 0,
        similarDecksFound: communityRecs.length > 0 ? communityRecs[0].totalSimilarDecks : 0,
      },
      dataPipeline: {
        communityDecks: communityDeckCount,
        communityCards: communityCardCount,
        metaCardStats: metaStatsCount,
        edhrecArticles: edhrecArticleCount,
        edhrecCommanders: edhrecDeckCount,
        status: communityDeckCount > 0 ? 'active' : 'empty',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Benchmark failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
