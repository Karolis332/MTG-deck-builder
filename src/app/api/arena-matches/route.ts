import { NextRequest, NextResponse } from 'next/server';
import {
  storeArenaParsedMatch,
  getArenaParsedMatches,
  resolveArenaIds,
  matchArenaDeckToSavedDeck,
  linkArenaMatchToDeck,
  autoLinkArenaMatches,
  autoLinkByCardsPlayed,
  getUnlinkedArenaMatches,
  getCardsByNames,
  getArenaParsedMatchesPage,
  resolveGrpIdNames,
} from '@/lib/db';
import { reportGameOutcomeToCF } from '@/lib/cf-api-client';
import { isWebSyncConfigured, syncPendingMatches } from '@/lib/web-sync';
import { deriveFromMatch, hasContractFields } from './_derive';
import type { ArenaMatch } from '@/lib/arena-log-reader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle bulk auto-link request — two passes: deck_cards first, then cards_played for remaining
    if (body.action === 'auto-link') {
      const pass1 = autoLinkArenaMatches();
      const pass2 = autoLinkByCardsPlayed();
      return NextResponse.json({
        ok: true,
        linked: pass1.linked + pass2.linked,
        total: pass1.total + pass2.total,
        byDeckCards: pass1.linked,
        byCardsPlayed: pass2.linked,
      });
    }

    // Handle manual link request
    if (body.action === 'link') {
      const { matchId, deckId } = body;
      if (!matchId || !deckId) {
        return NextResponse.json({ error: 'matchId and deckId are required' }, { status: 400 });
      }
      const ok = linkArenaMatchToDeck(matchId, deckId, 1.0);
      return NextResponse.json({ ok, matchId, deckId });
    }

    // Handle unlink request
    if (body.action === 'unlink') {
      const { matchId } = body;
      if (!matchId) {
        return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
      }
      const ok = linkArenaMatchToDeck(matchId, null, null);
      return NextResponse.json({ ok, matchId });
    }

    const { matchId, playerName, opponentName, result, format, turns, deckCards, cardsPlayed, opponentCardsSeen, cardsPlayedByTurn, commanderCastTurns, landsPlayedByTurn } = body;

    if (!matchId || !result) {
      return NextResponse.json(
        { error: 'matchId and result are required' },
        { status: 400 }
      );
    }

    // Resolve arena grpIds to card names for cardsPlayed and opponentCardsSeen
    let resolvedCardsPlayed = cardsPlayed || [];
    let resolvedOpponentCards = opponentCardsSeen || [];

    if (cardsPlayed?.length || opponentCardsSeen?.length) {
      const allIds = [...(cardsPlayed || []), ...(opponentCardsSeen || [])];
      const cardMap = resolveArenaIds(allIds);

      if (cardMap.size > 0) {
        resolvedCardsPlayed = (cardsPlayed || []).map((id: string) => {
          const card = cardMap.get(id);
          return card ? (card.name as string) : id;
        });
        resolvedOpponentCards = (opponentCardsSeen || []).map((id: string) => {
          const card = cardMap.get(id);
          return card ? (card.name as string) : id;
        });
      }
    }

    // New-parser payloads carry the §1.5 contract fields; derive the migration-42 columns
    // (commander names via the grpId resolver). A re-POST of a known match updates them in place.
    const derived = hasContractFields(body) ? await deriveFromMatch(body) : undefined;

    const storeResult = storeArenaParsedMatch({
      matchId,
      playerName: playerName || null,
      opponentName: opponentName || null,
      result,
      format: format || null,
      turns: turns || 0,
      deckCards: deckCards ? JSON.stringify(deckCards) : null,
      cardsPlayed: JSON.stringify(resolvedCardsPlayed),
      opponentCardsSeen: JSON.stringify(resolvedOpponentCards),
      cardsPlayedByTurn: cardsPlayedByTurn ? JSON.stringify(cardsPlayedByTurn) : null,
      commanderCastTurns: commanderCastTurns ? JSON.stringify(commanderCastTurns) : null,
      landsPlayedByTurn: landsPlayedByTurn ? JSON.stringify(landsPlayedByTurn) : null,
      derived,
    });

    // Auto-link to saved deck if we have deck cards
    let deckMatch = null;
    if (storeResult.success && deckCards?.length > 0) {
      deckMatch = matchArenaDeckToSavedDeck(deckCards, format);
      if (deckMatch) {
        linkArenaMatchToDeck(matchId, deckMatch.deckId, deckMatch.confidence);
        // Feed the bandit: game outcome = delayed reward across the deck's cards.
        // Re-POSTs of an already-stored match can double-fire; the Arena watcher
        // posts each match once, so accepted (same quirk as ML features below).
        reportGameOutcomeToCF(deckMatch.deckId, result).catch(() => {});
      }
    }

    // Compute ML features if match was stored
    if (storeResult.success && storeResult.id) {
      try {
        const { computeMatchMLFeatures } = await import('@/lib/match-ml-features');
        computeMatchMLFeatures(
          storeResult.id,
          {
            ...(body as ArenaMatch),
            matchId, playerName, opponentName, result,
            format, turns: turns || 0,
            deckCards: deckCards || null,
            cardsPlayed: resolvedCardsPlayed,
            opponentCardsSeen: resolvedOpponentCards,
            cardsPlayedByTurn: cardsPlayedByTurn || {},
            commanderCastTurns: commanderCastTurns || [],
            landsPlayedByTurn: landsPlayedByTurn || {},
          },
          deckMatch?.deckId || null,
          null
        );
      } catch {
        // ML features are optional — don't fail the match store
      }
    }

    const responseData = {
      ok: storeResult.success,
      updated: storeResult.updated ?? false,
      matchId,
      deckMatch: deckMatch ? { deckId: deckMatch.deckId, deckName: deckMatch.deckName, confidence: deckMatch.confidence } : null,
    };

    // Fire-and-forget: never block match recording on the network.
    if (storeResult.success && isWebSyncConfigured()) {
      void syncPendingMatches().catch(() => {});
    }

    return NextResponse.json(responseData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store arena match';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('match_id');
    const unlinkedOnly = searchParams.get('unlinked') === 'true';

    // Single match detail with resolved card images
    if (matchId) {
      const allMatches = getArenaParsedMatches(200) as Array<Record<string, unknown>>;
      const match = allMatches.find(m => m.match_id === matchId);
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      }

      // Resolve cards_played names to images
      let cardsPlayedImages: Record<string, { image_uri_small: string | null; image_uri_normal: string | null }> = {};
      if (match.cards_played) {
        try {
          const played = JSON.parse(match.cards_played as string) as string[];
          const names = played.filter(n => typeof n === 'string' && isNaN(Number(n)));
          if (names.length > 0) {
            const imageMap = getCardsByNames(names);
            imageMap.forEach((val, key) => { cardsPlayedImages[key] = val; });
          }
        } catch { /* ignore */ }
      }

      return NextResponse.json({ match, cards: cardsPlayedImages });
    }

    if (unlinkedOnly) {
      const matches = getUnlinkedArenaMatches(100);
      return NextResponse.json({ matches });
    }

    // Paged list: ?limit (1..500, default 100) &offset &deck_id. card_names maps every numeric
    // grpId in deck_cards / cards_played / opponent_cards_seen on this page to a card name.
    const deckIdParam = searchParams.get('deck_id');
    const page = getArenaParsedMatchesPage({
      limit: Number(searchParams.get('limit') ?? 100) || 100,
      offset: Number(searchParams.get('offset') ?? 0) || 0,
      deckId: deckIdParam ? Number(deckIdParam) : null,
    });
    const card_names = resolveGrpIdNames(collectGrpIds(page.matches));
    return NextResponse.json({ matches: page.matches, total: page.total, limit: page.limit, offset: page.offset, card_names });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch arena matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function collectGrpIds(matches: Array<Record<string, unknown>>): Set<string> {
  const ids = new Set<string>();
  const add = (v: unknown) => { if (/^\d+$/.test(String(v))) ids.add(String(v)); };
  for (const m of matches) {
    for (const col of ['deck_cards', 'cards_played', 'opponent_cards_seen']) {
      const raw = m[col];
      if (typeof raw !== 'string' || !raw) continue;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const entry of parsed) add(typeof entry === 'object' && entry !== null ? (entry as { id?: unknown }).id : entry);
      } catch { /* legacy non-JSON value */ }
    }
  }
  return ids;
}
