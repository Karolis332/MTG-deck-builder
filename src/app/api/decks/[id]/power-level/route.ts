import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { isCommanderFormat } from '@/lib/deck-optimizer';
import { computePowerLevel } from '@/lib/power-level-edhpl';
import { buildPowerLevelInputs, type CardLookupEntry, type DeckCardRow } from '@/lib/power-level-deck';

const LOCAL_LOOKUP_BATCH = 500;
const CREDIT = { name: 'EDHPowerLevel.com', url: 'https://edhpowerlevel.com/' } as const;

function parseJsonArray(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** MIN price + representative metadata per card name, across all printings. */
function resolveCardLookup(names: string[]): Map<string, CardLookupEntry> {
  const db = getDb();
  const byName = new Map<string, CardLookupEntry>();
  const uniqueLower = [...new Set(names.map((n) => n.toLowerCase()))];

  for (let i = 0; i < uniqueLower.length; i += LOCAL_LOOKUP_BATCH) {
    const batch = uniqueLower.slice(i, i + LOCAL_LOOKUP_BATCH);
    const placeholders = batch.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT name, price_usd, edhrec_rank, cmc, type_line, layout, mana_cost,
                oracle_text, game_changer, produced_mana, colors
         FROM cards WHERE name COLLATE NOCASE IN (${placeholders})`
      )
      .all(...batch) as Array<{
        name: string; price_usd: string | null; edhrec_rank: number | null; cmc: number | null;
        type_line: string; layout: string; mana_cost: string | null; oracle_text: string | null;
        game_changer: number | null; produced_mana: string | null; colors: string | null;
      }>;

    for (const row of rows) {
      const key = row.name.toLowerCase();
      const price = row.price_usd != null ? Number(row.price_usd) : null;
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, {
          minPrice: price != null && !Number.isNaN(price) ? price : null,
          edhrecRank: row.edhrec_rank,
          cmc: row.cmc,
          typeLine: row.type_line,
          layout: row.layout,
          manaCost: row.mana_cost,
          oracleText: row.oracle_text,
          gameChanger: !!row.game_changer,
          producedMana: parseJsonArray(row.produced_mana),
          colors: parseJsonArray(row.colors),
        });
      } else if (price != null && !Number.isNaN(price) && (existing.minPrice == null || price < existing.minPrice)) {
        existing.minPrice = price;
      }
    }
  }
  return byName;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = parseInt(params.id, 10);
    if (isNaN(deckId)) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    const deck = getDeckWithCards(deckId, authUser.userId) as
      | ({ format: string | null; cards: Array<{ name: string; quantity: number; board: string }> })
      | null;
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    if (!isCommanderFormat(deck.format || '')) {
      return NextResponse.json({ error: 'Power level is only available for Commander formats' }, { status: 400 });
    }

    const deckCards: DeckCardRow[] = deck.cards.map((c) => ({ name: c.name, quantity: c.quantity, board: c.board }));
    const lookup = resolveCardLookup(deckCards.map((c) => c.name));
    const { inputs, commanders, cardsWithoutPrice } = buildPowerLevelInputs(deckCards, lookup);

    if (commanders.length === 0) {
      return NextResponse.json({ error: 'Deck has no commander' }, { status: 400 });
    }

    const result = computePowerLevel(inputs, commanders);

    const perCardTop = [...result.perCard]
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 8)
      .map((c) => ({ name: c.name, impact: c.impact }));

    return NextResponse.json({
      powerLevel: result.powerLevel,
      score: result.score,
      efficiency: result.efficiency,
      tippingPoint: result.tippingPoint,
      impactTotal: result.impactTotal,
      avgCost: result.avgCost,
      bracket: result.bracket,
      cardsWithoutPrice,
      credit: CREDIT,
      perCardTop,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute power level';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
