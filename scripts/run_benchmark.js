const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

const deckId = parseInt(process.argv[2] || '13');

// Deck info
const deck = db.prepare('SELECT id, name, format FROM decks WHERE id = ?').get(deckId);
if (!deck) { console.log('Deck not found'); process.exit(1); }
console.log('=== BENCHMARK: ' + deck.name + ' (' + deck.format + ') ===\n');

// Card count
const cards = db.prepare(
  "SELECT c.name FROM deck_cards dc JOIN cards c ON dc.card_id = c.id WHERE dc.deck_id = ? AND dc.board IN ('main','commander')"
).all(deckId);
console.log('Deck cards: ' + cards.length);

// Data pipeline status
const communityDecks = db.prepare('SELECT COUNT(*) as c FROM community_decks').get();
const communityCards = db.prepare('SELECT COUNT(*) as c FROM community_deck_cards').get();
const metaStats = db.prepare('SELECT COUNT(*) as c FROM meta_card_stats').get();
let edhrecCmds = 0;
try { edhrecCmds = db.prepare('SELECT COUNT(DISTINCT commander_name) as c FROM edhrec_avg_decks').get().c; } catch {}
let cfCached = 0;
try { cfCached = db.prepare('SELECT COUNT(*) as c FROM cf_cache').get().c; } catch {}

console.log('\n--- DATA PIPELINE ---');
console.log('Community decks:     ' + communityDecks.c.toLocaleString());
console.log('Community cards:     ' + communityCards.c.toLocaleString());
console.log('Meta card stats:     ' + metaStats.c.toLocaleString());
console.log('EDHREC commanders:   ' + edhrecCmds);
console.log('CF cache entries:    ' + cfCached);

// Community co-occurrence
const cardNames = cards.map(c => c.name);
const basics = new Set(['Plains','Island','Swamp','Mountain','Forest','Wastes']);
const sigCards = cardNames.filter(n => !basics.has(n)).slice(0, 20);
const placeholders = sigCards.map(() => '?').join(',');
const excludePlaceholders = cardNames.map(() => '?').join(',');

const t0 = Date.now();
const cooccur = db.prepare(`
  WITH similar_decks AS (
    SELECT cdc.community_deck_id, COUNT(*) as shared
    FROM community_deck_cards cdc
    JOIN community_decks cd ON cd.id = cdc.community_deck_id
    WHERE cdc.card_name IN (${placeholders})
    GROUP BY cdc.community_deck_id
    HAVING COUNT(*) >= 3
    LIMIT 500
  )
  SELECT cdc2.card_name, COUNT(DISTINCT cdc2.community_deck_id) as cnt,
    (SELECT COUNT(*) FROM similar_decks) as total
  FROM community_deck_cards cdc2
  JOIN similar_decks sd ON cdc2.community_deck_id = sd.community_deck_id
  WHERE cdc2.card_name NOT IN (${excludePlaceholders})
  AND cdc2.board = 'main'
  GROUP BY cdc2.card_name
  ORDER BY cnt DESC
  LIMIT 20
`).all(...sigCards, ...cardNames);
const communityMs = Date.now() - t0;

console.log('\n--- COMMUNITY CO-OCCURRENCE (' + communityMs + 'ms) ---');
const totalSimilar = cooccur.length > 0 ? cooccur[0].total : 0;
console.log('Similar decks found: ' + totalSimilar);
if (cooccur.length > 0) {
  for (const r of cooccur) {
    const pct = Math.round(r.cnt / r.total * 100);
    const bar = '#'.repeat(Math.min(pct, 50));
    console.log('  ' + String(pct).padStart(3) + '% ' + bar.padEnd(20) + ' ' + r.card_name);
  }
} else {
  console.log('  (no similar decks found - community data may be empty)');
}

// EDHREC avg deck data
const cmdCard = db.prepare(
  "SELECT c.name FROM deck_cards dc JOIN cards c ON dc.card_id = c.id WHERE dc.deck_id = ? AND dc.board = 'commander' LIMIT 1"
).get(deckId);
const commander = cmdCard ? cmdCard.name : '';

if (commander) {
  const t1 = Date.now();
  const edhrecCards = db.prepare(
    'SELECT card_name, card_type FROM edhrec_avg_decks WHERE commander_name = ? COLLATE NOCASE'
  ).all(commander);
  const edhrecMs = Date.now() - t1;

  const edhrecNames = edhrecCards.map(r => r.card_name);
  const existingLower = new Set(cardNames.map(n => n.toLowerCase()));
  const missing = edhrecNames.filter(n => !existingLower.has(n.toLowerCase()));
  const overlap = edhrecNames.filter(n => existingLower.has(n.toLowerCase()));

  console.log('\n--- EDHREC AVG DECK: ' + commander + ' (' + edhrecMs + 'ms) ---');
  console.log('EDHREC cards:   ' + edhrecNames.length);
  console.log('Overlap:        ' + overlap.length + '/' + edhrecNames.length + ' (' + Math.round(overlap.length / Math.max(edhrecNames.length, 1) * 100) + '%)');
  console.log('Missing staples (' + missing.length + '):');

  // Cross-ref missing EDHREC cards with community co-occurrence
  const communitySet = new Map();
  for (const r of cooccur) {
    communitySet.set(r.card_name.toLowerCase(), Math.round(r.cnt / r.total * 100));
  }

  let communityBacked = 0;
  for (const name of missing.slice(0, 15)) {
    const communityPct = communitySet.get(name.toLowerCase());
    const marker = communityPct ? ' [community: ' + communityPct + '%]' : '';
    if (communityPct) communityBacked++;
    console.log('  - ' + name + marker);
  }
  console.log('\nCommunity-backed EDHREC suggestions: ' + communityBacked + '/' + Math.min(missing.length, 15));
}

// Meta card stats
const t2 = Date.now();
const metaCards = db.prepare(`
  SELECT card_name, meta_inclusion_rate, avg_copies
  FROM meta_card_stats
  WHERE format = ?
  AND meta_inclusion_rate > 0.05
  ORDER BY meta_inclusion_rate DESC
  LIMIT 20
`).all(deck.format);
const metaMs = Date.now() - t2;

if (metaCards.length > 0) {
  const existingLower = new Set(cardNames.map(n => n.toLowerCase()));
  const metaMissing = metaCards.filter(r => !existingLower.has(r.card_name.toLowerCase()));

  console.log('\n--- META CARD STATS: ' + deck.format + ' (' + metaMs + 'ms) ---');
  console.log('Top meta cards not in deck:');
  for (const r of metaMissing.slice(0, 10)) {
    const pct = Math.round(r.meta_inclusion_rate * 100);
    console.log('  ' + String(pct).padStart(3) + '% inclusion | ' + r.card_name);
  }
}

// AI suggestion log
try {
  const aiLogs = db.prepare(`
    SELECT source, model, COUNT(*) as calls,
      SUM(suggestion_count) as suggestions,
      SUM(accepted_count) as accepted,
      ROUND(AVG(latency_ms)) as avg_ms
    FROM ai_suggestion_log
    WHERE error IS NULL
    GROUP BY source, model
    ORDER BY calls DESC
  `).all();

  if (aiLogs.length > 0) {
    console.log('\n--- AI SUGGESTION TRACKING ---');
    console.log('Source'.padEnd(20) + 'Model'.padEnd(30) + 'Calls'.padStart(6) + 'Sugg'.padStart(6) + 'Accept'.padStart(7) + 'Avg ms'.padStart(8));
    console.log('-'.repeat(77));
    for (const l of aiLogs) {
      console.log(
        (l.source || '').padEnd(20) +
        (l.model || '-').padEnd(30) +
        String(l.calls).padStart(6) +
        String(l.suggestions || 0).padStart(6) +
        String(l.accepted || 0).padStart(7) +
        String(l.avg_ms || 0).padStart(8)
      );
    }
  }
} catch {}

console.log('\n--- VERDICT ---');
const dataActive = communityDecks.c > 0 && totalSimilar > 0;
if (dataActive) {
  console.log('DATA PIPELINE: ACTIVE');
  console.log('Community data is being used: ' + totalSimilar + ' similar decks found from ' + communityDecks.c.toLocaleString() + ' total');
  console.log('Co-occurrence suggestions generated: ' + cooccur.length);
} else if (communityDecks.c > 0) {
  console.log('DATA PIPELINE: PARTIAL');
  console.log('Community decks exist (' + communityDecks.c + ') but no similar decks matched this deck');
} else {
  console.log('DATA PIPELINE: EMPTY');
  console.log('No community decks loaded. Run the pipeline first.');
}

db.close();
