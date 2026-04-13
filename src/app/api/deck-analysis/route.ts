import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDb, getDeckWithCards, getMetaCardStatsMap } from '@/lib/db';
import {
  classifyCard,
  getPrimaryCategory,
  computeRatioHealth,
  computeManaCurve,
  computeOverallScore,
  generateSuggestions,
  type CardCategory,
  type ClassifiedCard,
  type DeckAnalysis,
} from '@/lib/card-classifier';

interface DeckCard {
  name: string;
  id: string;
  card_id?: string;
  cmc: number;
  type_line: string;
  oracle_text: string | null;
  board: string;
  quantity: number;
  color_identity: string | null;
  image_uri_art_crop: string | null;
  edhrec_rank: number | null;
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const deckId = request.nextUrl.searchParams.get('deckId');
  if (!deckId) {
    return NextResponse.json({ error: 'deckId required' }, { status: 400 });
  }

  const deckData = getDeckWithCards(Number(deckId), authUser.userId);
  if (!deckData) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const deck = deckData as { id: number; name: string; format: string | null; cards: DeckCard[] };
  const format = deck.format || '1v1';

  // Find commander
  const commanderCard = deck.cards.find((c) => c.board === 'commander');
  const commanderOracleText = commanderCard?.oracle_text ?? '';
  const commanderName = commanderCard?.name;

  // Classify all main deck + commander cards
  const allCards = deck.cards.filter((c) => c.board === 'main' || c.board === 'commander');
  const cardNames = allCards.map((c) => c.name);

  // Fetch meta stats for all cards
  const metaFormat = format === 'brawl' || format === 'standardbrawl' ? 'commander' : format;
  const metaStats = getMetaCardStatsMap(cardNames, metaFormat);

  // Fetch ML predictions if available
  const db = getDb();
  const mlScores = new Map<string, number>();
  try {
    const predictions = db
      .prepare(
        `SELECT card_name, predicted_score FROM personalized_suggestions
         WHERE deck_id = ? OR (commander_name = ? AND format = ?)
         ORDER BY predicted_score DESC`
      )
      .all(deck.id, commanderName ?? '', format) as Array<{
      card_name: string;
      predicted_score: number;
    }>;
    for (const p of predictions) {
      mlScores.set(p.card_name, p.predicted_score);
    }
  } catch {
    // table may not exist
  }

  // Fetch commander synergy data if available
  const synergyScores = new Map<string, number>();
  if (commanderName) {
    try {
      const synergies = db
        .prepare(
          `SELECT card_name, synergy_score FROM commander_synergies
           WHERE commander_name = ? COLLATE NOCASE`
        )
        .all(commanderName) as Array<{ card_name: string; synergy_score: number }>;
      for (const s of synergies) {
        synergyScores.set(s.card_name, s.synergy_score);
      }
    } catch {
      // table may not exist
    }
  }

  // Classify cards
  const categories: Record<CardCategory, ClassifiedCard[]> = {
    land: [],
    ramp: [],
    draw: [],
    removal: [],
    board_wipe: [],
    protection: [],
    synergy: [],
    win_condition: [],
    utility: [],
  };

  let totalCMC = 0;
  let nonLandCount = 0;

  for (const card of allCards) {
    const oracle = card.oracle_text ?? '';
    const typeLine = card.type_line ?? '';
    const qty = card.quantity || 1;
    const cats = classifyCard(card.name, oracle, typeLine, card.cmc, commanderOracleText);
    const primary = getPrimaryCategory(cats);
    const meta = metaStats.get(card.name);

    const classified: ClassifiedCard = {
      name: card.name,
      cardId: card.card_id ?? card.id,
      categories: cats,
      primaryCategory: primary,
      cmc: card.cmc,
      typeLine,
      oracleText: oracle,
      mlScore: mlScores.get(card.name),
      metaInclusionRate: meta?.inclusionRate,
      synergyScore: synergyScores.get(card.name),
    };

    // Push once per quantity so ratio health counts match actual card counts
    for (let i = 0; i < qty; i++) {
      categories[primary].push(classified);
    }

    if (!typeLine.includes('Land')) {
      totalCMC += card.cmc * qty;
      nonLandCount += qty;
    }
  }

  const avgCMC = nonLandCount > 0 ? totalCMC / nonLandCount : 0;
  const ratioHealth = computeRatioHealth(categories, format);
  const overallScore = computeOverallScore(ratioHealth);
  const manaCurve = computeManaCurve(
    allCards.map((c) => ({ cmc: c.cmc, typeLine: c.type_line ?? '' }))
  );
  const suggestions = generateSuggestions(ratioHealth, avgCMC, format);

  // Fetch top ML suggestions NOT in the deck (potential adds)
  let topSuggestions: Array<{ name: string; score: number; reason: string }> = [];
  if (commanderName) {
    try {
      const deckCardSet = new Set(cardNames.map((n) => n.toLowerCase()));
      const allPredictions = db
        .prepare(
          `SELECT card_name, predicted_score, reason FROM personalized_suggestions
           WHERE (commander_name = ? COLLATE NOCASE OR deck_id = ?)
           ORDER BY predicted_score DESC LIMIT 100`
        )
        .all(commanderName, deck.id) as Array<{
        card_name: string;
        predicted_score: number;
        reason: string;
      }>;
      topSuggestions = allPredictions
        .filter((p) => !deckCardSet.has(p.card_name.toLowerCase()))
        .slice(0, 15)
        .map((p) => ({
          name: p.card_name,
          score: p.predicted_score,
          reason: p.reason ?? '',
        }));
    } catch {
      // ok
    }
  }

  const analysis: DeckAnalysis & { topSuggestions: typeof topSuggestions } = {
    deckId: deck.id,
    deckName: deck.name,
    format,
    commander: commanderName,
    totalCards: allCards.length,
    avgCMC,
    categories,
    ratioHealth,
    overallScore,
    manaCurve,
    suggestions,
    topSuggestions,
  };

  return NextResponse.json(analysis);
}
