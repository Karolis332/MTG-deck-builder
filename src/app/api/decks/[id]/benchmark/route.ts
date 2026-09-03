import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getCommanderTopDecks, type CFTopDeck } from '@/lib/cf-api-client';
import { assembleBenchmark, type BenchmarkDeckRow, type BenchmarkRefDeck } from '@/lib/deck-benchmark-live';
import type { DbCard } from '@/lib/types';

const FORMAT_MAP: Record<string, 'commander' | 'historicBrawl'> = {
  commander: 'commander',
  brawl: 'historicBrawl',
  competitivebrawl: 'historicBrawl',
};

const LOCAL_LOOKUP_BATCH = 500;

/** Local card metadata needed by the pure benchmark logic, keyed by lowercase name. */
function resolveLocalCards(names: string[]): Map<string, DbCard> {
  const db = getDb();
  const byName = new Map<string, DbCard>();
  const uniqueLower = [...new Set(names.map((n) => n.toLowerCase()))];

  for (let i = 0; i < uniqueLower.length; i += LOCAL_LOOKUP_BATCH) {
    const batch = uniqueLower.slice(i, i + LOCAL_LOOKUP_BATCH);
    const placeholders = batch.map(() => '?').join(',');
    const rows = db
      .prepare(`SELECT * FROM cards WHERE name COLLATE NOCASE IN (${placeholders})`)
      .all(...batch) as DbCard[];
    for (const row of rows) byName.set(row.name.toLowerCase(), row);
  }
  return byName;
}

function toRefDeck(deck: CFTopDeck, localByName: Map<string, DbCard>): BenchmarkRefDeck {
  const allNames = deck.cards.map((c) => c.card_name);
  const commanderNames = deck.cards.filter((c) => c.board === 'commander').map((c) => c.card_name);
  const cards = deck.cards
    .map((c) => localByName.get(c.card_name.toLowerCase()))
    .filter((c): c is DbCard => !!c)
    .map((c) => ({
      name: c.name,
      oracle_text: c.oracle_text,
      type_line: c.type_line,
      cmc: c.cmc,
      game_changer: c.game_changer,
    }));

  return {
    id: deck.id,
    source: deck.source,
    url: deck.url,
    deckName: deck.deck_name,
    author: deck.author,
    likes: deck.likes,
    cards,
    allNames,
    commanderNames,
  };
}

// deckId -> { deckHash, computedAt, response } — 10 min in-memory cache.
const responseCache = new Map<number, { deckHash: string; computedAt: number; response: unknown }>();
const CACHE_TTL_MS = 10 * 60_000;

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
      | ({ format: string | null; target_bracket: number | null; cards: Array<DbCard & { board: string; quantity: number; owned_qty: number }> })
      | null;
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const format = FORMAT_MAP[(deck.format || '').toLowerCase()];
    if (!format) {
      return NextResponse.json({ error: 'unsupported format' }, { status: 400 });
    }

    const commanderRows = deck.cards.filter((c) => c.board === 'commander');
    if (commanderRows.length === 0) {
      return NextResponse.json({ error: 'deck has no commander' }, { status: 400 });
    }
    const commander = commanderRows.map((c) => c.name).join(' // ');
    const targetBracket = deck.target_bracket ?? 3;

    const deckHash = `${deckId}:${deck.cards.map((c) => `${c.board}:${c.name}:${c.quantity}`).sort().join('|')}`;
    const cached = responseCache.get(deckId);
    if (cached && cached.deckHash === deckHash && Date.now() - cached.computedAt < CACHE_TTL_MS) {
      return NextResponse.json(cached.response);
    }

    const topDecks = await getCommanderTopDecks(commander, format, 30);
    const refDecksRaw = topDecks?.decks ?? [];

    const allRefNames = refDecksRaw.flatMap((d) => d.cards.map((c) => c.card_name));
    const localByName = resolveLocalCards(allRefNames);
    const refDecks: BenchmarkRefDeck[] = refDecksRaw.map((d) => toRefDeck(d, localByName));

    const deckRows: BenchmarkDeckRow[] = deck.cards.map((c) => ({
      name: c.name,
      oracle_text: c.oracle_text,
      type_line: c.type_line,
      cmc: c.cmc,
      game_changer: c.game_changer,
      board: c.board,
    }));

    const assembled = assembleBenchmark(deckRows, refDecks, targetBracket);

    const unknownRefNames = [...new Set(allRefNames)].filter(
      (n) => !localByName.has(n.toLowerCase())
    );
    const quantitiesAvailable = deck.cards.some((c) => (c.owned_qty ?? 0) > 0);

    const db = getDb();
    const staplesMissing = assembled.staplesMissing.map((s) => {
      const card = localByName.get(s.name.toLowerCase())
        ?? (db.prepare('SELECT * FROM cards WHERE name COLLATE NOCASE = ? LIMIT 1').get(s.name) as DbCard | undefined);
      return {
        name: s.name,
        freq: s.freq,
        card: card
          ? { id: card.id, name: card.name, image_uri_small: card.image_uri_small, price_usd: card.price_usd }
          : null,
      };
    });

    const response = {
      commander,
      format,
      targetBracket,
      refCount: assembled.refCount,
      refsPerBracket: assembled.refsPerBracket,
      bracketFilterApplied: assembled.bracketFilterApplied,
      quantitiesAvailable,
      overlapMeanPct: assembled.overlapMeanPct,
      overlapBestPct: assembled.overlapBestPct,
      staplesMissing,
      oddCards: assembled.oddCards,
      deltas: assembled.deltas,
      curveL1: assembled.curveL1,
      qualityIndex: assembled.qualityIndex,
      unknownRefNames,
      cachedAt: new Date().toISOString(),
    };

    responseCache.set(deckId, { deckHash, computedAt: Date.now(), response });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute benchmark';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
