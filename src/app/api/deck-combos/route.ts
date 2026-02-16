import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';

interface ComboCard {
  card_name: string;
  card_oracle_id: string | null;
  quantity: number;
  zone_locations: string | null;
  must_be_commander: boolean;
}

interface ComboResult {
  feature_name: string;
  quantity: number;
}

interface Combo {
  id: string;
  identity: string | null;
  description: string | null;
  prerequisites: string | null;
  mana_needed: string | null;
  popularity: number | null;
  cards: ComboCard[];
  results: ComboResult[];
}

/**
 * GET /api/deck-combos?deckId=N
 * Return cached combos from spellbook_deck_combos.
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const deckId = parseInt(searchParams.get('deckId') ?? '');
  if (isNaN(deckId)) {
    return NextResponse.json({ error: 'deckId is required' }, { status: 400 });
  }

  const db = getDb();

  // Verify deck belongs to user
  const deck = db.prepare('SELECT id FROM decks WHERE id = ? AND user_id = ?').get(deckId, authUser.userId) as { id: number } | undefined;
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  // Check if tables exist
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='spellbook_deck_combos'"
  ).get();
  if (!tableCheck) {
    return NextResponse.json({ included: [], almostIncluded: [] });
  }

  // Get deck combos grouped by category
  const deckCombos = db.prepare(`
    SELECT sdc.combo_id, sdc.category,
           sc.identity, sc.description, sc.prerequisites, sc.mana_needed, sc.popularity
    FROM spellbook_deck_combos sdc
    JOIN spellbook_combos sc ON sdc.combo_id = sc.id
    WHERE sdc.deck_id = ?
    ORDER BY sc.popularity DESC
  `).all(deckId) as Array<{
    combo_id: string;
    category: string;
    identity: string | null;
    description: string | null;
    prerequisites: string | null;
    mana_needed: string | null;
    popularity: number | null;
  }>;

  const combosById = new Map<string, Combo>();

  for (const row of deckCombos) {
    if (!combosById.has(row.combo_id)) {
      // Fetch cards for this combo
      const cards = db.prepare(`
        SELECT card_name, card_oracle_id, quantity, zone_locations, must_be_commander
        FROM spellbook_combo_cards
        WHERE combo_id = ?
      `).all(row.combo_id) as Array<{
        card_name: string;
        card_oracle_id: string | null;
        quantity: number;
        zone_locations: string | null;
        must_be_commander: number;
      }>;

      // Fetch results for this combo
      const results = db.prepare(`
        SELECT feature_name, quantity
        FROM spellbook_combo_results
        WHERE combo_id = ?
      `).all(row.combo_id) as Array<{
        feature_name: string;
        quantity: number;
      }>;

      combosById.set(row.combo_id, {
        id: row.combo_id,
        identity: row.identity,
        description: row.description,
        prerequisites: row.prerequisites,
        mana_needed: row.mana_needed,
        popularity: row.popularity,
        cards: cards.map(c => ({
          card_name: c.card_name,
          card_oracle_id: c.card_oracle_id,
          quantity: c.quantity,
          zone_locations: c.zone_locations,
          must_be_commander: !!c.must_be_commander,
        })),
        results: results.map(r => ({
          feature_name: r.feature_name,
          quantity: r.quantity,
        })),
      });
    }
  }

  const included: Combo[] = [];
  const almostIncluded: Combo[] = [];

  for (const row of deckCombos) {
    const combo = combosById.get(row.combo_id);
    if (!combo) continue;

    if (row.category === 'included') {
      if (!included.find(c => c.id === combo.id)) included.push(combo);
    } else {
      if (!almostIncluded.find(c => c.id === combo.id)) almostIncluded.push(combo);
    }
  }

  return NextResponse.json({ included, almostIncluded });
}

/**
 * POST /api/deck-combos
 * Live call to Commander Spellbook find-my-combos, cache results, return updated.
 * Body: { deckId: number }
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const body = await request.json();
  const deckId = body.deckId as number;
  if (!deckId) {
    return NextResponse.json({ error: 'deckId is required' }, { status: 400 });
  }

  const db = getDb();

  // Verify deck belongs to user
  const deck = db.prepare('SELECT id, format FROM decks WHERE id = ? AND user_id = ?').get(deckId, authUser.userId) as { id: number; format: string } | undefined;
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  // Get deck cards
  const cards = db.prepare(`
    SELECT dc.quantity, dc.board, c.name
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.deck_id = ?
  `).all(deckId) as Array<{
    quantity: number;
    board: string;
    name: string;
  }>;

  const mainCards = cards.filter(c => c.board === 'main' || c.board === 'companion');
  const commanders = cards.filter(c => c.board === 'commander');

  const apiBody = {
    main: mainCards.map(c => ({ card: c.name, quantity: c.quantity })),
    commanders: commanders.map(c => ({ card: c.name, quantity: 1 })),
  };

  // Call Commander Spellbook API
  let apiData: Record<string, unknown>;
  try {
    const resp = await fetch('https://backend.commanderspellbook.com/find-my-combos/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiBody),
    });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Commander Spellbook API returned ${resp.status}` },
        { status: 502 },
      );
    }
    apiData = await resp.json() as Record<string, unknown>;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS spellbook_combos (
      id TEXT PRIMARY KEY,
      identity TEXT,
      description TEXT,
      prerequisites TEXT,
      mana_needed TEXT,
      popularity INTEGER,
      bracket_tag TEXT,
      legal_commander INTEGER DEFAULT 1,
      legal_brawl INTEGER DEFAULT 0,
      price_tcgplayer REAL,
      fetched_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS spellbook_combo_cards (
      combo_id TEXT NOT NULL,
      card_name TEXT NOT NULL,
      card_oracle_id TEXT,
      quantity INTEGER DEFAULT 1,
      zone_locations TEXT,
      must_be_commander INTEGER DEFAULT 0,
      UNIQUE(combo_id, card_name)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS spellbook_combo_results (
      combo_id TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      UNIQUE(combo_id, feature_name)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS spellbook_deck_combos (
      deck_id INTEGER NOT NULL,
      combo_id TEXT NOT NULL,
      category TEXT NOT NULL,
      fetched_at TEXT DEFAULT (datetime('now')),
      UNIQUE(deck_id, combo_id)
    )
  `);

  // Clear old deck combos
  db.prepare('DELETE FROM spellbook_deck_combos WHERE deck_id = ?').run(deckId);

  const results = (apiData.results ?? apiData) as Record<string, unknown[]>;
  const included: Combo[] = [];
  const almostIncluded: Combo[] = [];

  for (const category of ['included', 'almostIncluded', 'almostIncludedByAddingColors',
    'almostIncludedByAddingCommanders', 'almostIncludedByChangingCommanders']) {
    const variants = (results[category] ?? []) as Array<Record<string, unknown>>;

    for (const variant of variants) {
      const comboId = String(variant.id ?? '');
      if (!comboId) continue;

      const identityObj = variant.identity;
      const identity = typeof identityObj === 'object' && identityObj !== null
        ? (identityObj as Record<string, string>).identity ?? ''
        : String(identityObj ?? '');

      const description = String(variant.description ?? '');
      const prerequisites = String(variant.prerequisites ?? '');
      const manaNeeded = String(variant.manaNeeded ?? variant.mana_needed ?? '');
      const popularity = typeof variant.popularity === 'number' ? variant.popularity : null;

      // Upsert combo
      db.prepare(`
        INSERT INTO spellbook_combos (id, identity, description, prerequisites, mana_needed, popularity, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          description = excluded.description,
          prerequisites = excluded.prerequisites,
          fetched_at = datetime('now')
      `).run(comboId, identity, description, prerequisites, manaNeeded, popularity);

      // Save cards
      const uses = (variant.uses ?? []) as Array<Record<string, unknown>>;
      const comboCards: ComboCard[] = [];
      for (const use of uses) {
        const card = use.card as Record<string, unknown> | undefined;
        const cardName = card ? String(card.name ?? '') : String(use.card ?? '');
        if (!cardName) continue;
        const cardOracleId = card ? String(card.oracleId ?? '') : '';
        const zoneLocations = Array.isArray(use.zoneLocations)
          ? (use.zoneLocations as string[]).join(',')
          : String(use.zoneLocations ?? '');

        db.prepare(`
          INSERT INTO spellbook_combo_cards (combo_id, card_name, card_oracle_id, quantity, zone_locations, must_be_commander)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(combo_id, card_name) DO UPDATE SET
            card_oracle_id = excluded.card_oracle_id,
            zone_locations = excluded.zone_locations
        `).run(comboId, cardName, cardOracleId, (use.quantity as number) ?? 1, zoneLocations, use.mustBeCommander ? 1 : 0);

        comboCards.push({
          card_name: cardName,
          card_oracle_id: cardOracleId,
          quantity: (use.quantity as number) ?? 1,
          zone_locations: zoneLocations,
          must_be_commander: !!use.mustBeCommander,
        });
      }

      // Save results
      const produces = (variant.produces ?? []) as Array<Record<string, unknown>>;
      const comboResults: ComboResult[] = [];
      for (const prod of produces) {
        const feature = prod.feature as Record<string, unknown> | undefined;
        const featureName = feature ? String(feature.name ?? '') : String(prod.name ?? prod);
        if (!featureName) continue;

        db.prepare(`
          INSERT INTO spellbook_combo_results (combo_id, feature_name, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(combo_id, feature_name) DO UPDATE SET quantity = excluded.quantity
        `).run(comboId, featureName, (prod.quantity as number) ?? 1);

        comboResults.push({
          feature_name: featureName,
          quantity: (prod.quantity as number) ?? 1,
        });
      }

      // Link to deck
      db.prepare(`
        INSERT INTO spellbook_deck_combos (deck_id, combo_id, category, fetched_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(deck_id, combo_id) DO UPDATE SET
          category = excluded.category,
          fetched_at = datetime('now')
      `).run(deckId, comboId, category);

      const combo: Combo = {
        id: comboId,
        identity,
        description,
        prerequisites,
        mana_needed: manaNeeded,
        popularity,
        cards: comboCards,
        results: comboResults,
      };

      if (category === 'included') {
        included.push(combo);
      } else {
        almostIncluded.push(combo);
      }
    }
  }

  return NextResponse.json({ included, almostIncluded });
}
