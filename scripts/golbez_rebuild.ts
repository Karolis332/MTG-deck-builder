/**
 * Rebuild the Golbez Brawl deck using the new constraint system and print
 * a detailed report. Does NOT write to the DB — read-only rebuild preview.
 */
import path from 'path';
import Database from 'better-sqlite3';
import { autoBuildDeck } from '../src/lib/deck-builder-ai';
import { analyzeCommanderForBuild } from '../src/lib/commander-analysis';

async function main() {
  // Resolve the Electron DB path
  const appData = process.env.APPDATA;
  if (!appData) {
    console.error('APPDATA not set');
    process.exit(1);
  }
  const dbPath = path.join(appData, 'the-black-grimoire', 'data', 'mtg-deck-builder.db');
  console.log(`DB: ${dbPath}\n`);

  // Force db.ts to use this path
  process.env.MTG_DB_DIR = path.dirname(dbPath);

  const raw = new Database(dbPath, { readonly: true });

  // Find the Golbez deck (user_id, format)
  const deckRow = raw
    .prepare(
      `SELECT d.id, d.name, d.format, d.user_id, u.username
       FROM decks d JOIN users u ON d.user_id = u.id
       WHERE d.name LIKE '%Golbez%' ORDER BY d.id DESC LIMIT 1`,
    )
    .get() as { id: number; name: string; format: string; user_id: number; username: string } | undefined;

  if (!deckRow) {
    console.error('No Golbez deck found');
    process.exit(1);
  }
  console.log(`Target deck: #${deckRow.id} "${deckRow.name}" | format=${deckRow.format} | user=${deckRow.username}`);

  // Find the commander card in the deck
  const cmdr = raw
    .prepare(
      `SELECT c.name, c.color_identity, c.oracle_text
       FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
       WHERE dc.deck_id = ? AND dc.board = 'commander' LIMIT 1`,
    )
    .get(deckRow.id) as { name: string; color_identity: string; oracle_text: string } | undefined;

  if (!cmdr) {
    console.error('Commander not found in deck');
    process.exit(1);
  }
  console.log(`Commander: ${cmdr.name} | CI=${cmdr.color_identity}\n`);
  raw.close();

  // ── Step 1: Show commander analysis arsenal ──────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COMMANDER ANALYSIS — ARSENAL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const analysis = analyzeCommanderForBuild(cmdr.name, deckRow.user_id, deckRow.format, 150);
  if (!analysis) {
    console.error('analyzeCommanderForBuild returned null');
    process.exit(1);
  }
  console.log(`Color identity: [${Array.from(analysis.colorIdentity).join(', ') || 'colorless'}]`);
  console.log(`Direct needs: ${Object.entries(analysis.directNeeds).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`);
  if (analysis.synergyProfile) {
    console.log(`Trigger categories: ${analysis.synergyProfile.triggerCategories.join(', ') || 'none'}`);
  }
  console.log(`\nArsenal (${analysis.arsenal.length} cards, top 40 by priority):\n`);
  const top = [...analysis.arsenal].slice(0, 40);
  for (const a of top) {
    const owned = a.owned > 0 ? `[OWN ${a.owned}]` : '[   -  ]';
    console.log(
      `  ${owned} pri=${String(a.priority).padStart(3)} ${a.card.name.padEnd(36)} — ${a.reason} :: ${a.detail}`,
    );
  }

  // ── Step 2: Run the auto-builder ─────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AUTO-BUILDER RUN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const t0 = Date.now();
  const result = await autoBuildDeck({
    format: deckRow.format,
    colors: Array.from(analysis.colorIdentity),
    strategy: undefined,
    useCollection: true,
    commanderName: cmdr.name,
    userId: deckRow.user_id,
    powerLevel: 'optimized',
  });
  const elapsed = Date.now() - t0;
  console.log(`Built in ${elapsed}ms\n`);

  console.log(`Strategy: ${result.strategy}`);
  console.log(`Themes: ${result.themes.join(', ') || '(none)'}`);
  console.log(`Tribal: ${result.tribalType || '(none)'}`);
  const totalCards = result.cards.reduce((s, c) => s + c.quantity, 0);
  const mainCount = result.cards.filter((c) => c.board === 'main').reduce((s, c) => s + c.quantity, 0);
  console.log(`Total cards: ${totalCards} (main=${mainCount})`);

  if (result.buildReport) {
    console.log('\n--- BUILD REPORT ---');
    console.log(result.buildReport);
  }

  // ── Step 3: Dump the main deck sorted by CMC ─────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  MAIN DECK (sorted by CMC)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const main = result.cards
    .filter((c) => c.board === 'main')
    .sort((a, b) => {
      const ca = a.card.cmc ?? 99;
      const cb = b.card.cmc ?? 99;
      if (ca !== cb) return ca - cb;
      return a.card.name.localeCompare(b.card.name);
    });

  for (const entry of main) {
    const cmc = (entry.card.cmc ?? '?').toString().padStart(2);
    const type = (entry.card.type_line || '').split('—')[0].trim().padEnd(22);
    console.log(`  [${entry.quantity}] (${cmc}) ${entry.card.name.padEnd(32)} ${type}`);
  }

  // ── Step 4: Stats ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  STATS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const byCmc: Record<number, number> = {};
  let lands = 0;
  let creatures = 0;
  let instants = 0;
  let sorceries = 0;
  let artifacts = 0;
  let enchantments = 0;
  let planeswalkers = 0;
  for (const e of main) {
    const tl = (e.card.type_line || '').toLowerCase();
    const cmc = Math.min(e.card.cmc ?? 0, 7);
    if (!tl.includes('land')) byCmc[cmc] = (byCmc[cmc] || 0) + e.quantity;
    if (tl.includes('land')) lands += e.quantity;
    else if (tl.includes('creature')) creatures += e.quantity;
    else if (tl.includes('instant')) instants += e.quantity;
    else if (tl.includes('sorcery')) sorceries += e.quantity;
    else if (tl.includes('planeswalker')) planeswalkers += e.quantity;
    else if (tl.includes('artifact')) artifacts += e.quantity;
    else if (tl.includes('enchantment')) enchantments += e.quantity;
  }
  console.log(`Lands:         ${lands}`);
  console.log(`Creatures:     ${creatures}`);
  console.log(`Instants:      ${instants}`);
  console.log(`Sorceries:     ${sorceries}`);
  console.log(`Artifacts:     ${artifacts}`);
  console.log(`Enchantments:  ${enchantments}`);
  console.log(`Planeswalkers: ${planeswalkers}`);
  console.log('\nNon-land CMC curve:');
  for (let i = 0; i <= 7; i++) {
    const n = byCmc[i] || 0;
    console.log(`  ${i === 7 ? '7+' : String(i).padStart(2)} : ${'█'.repeat(n)} (${n})`);
  }

  // ── Step 5: Reasoning trail (top 30) ─────────────────────────────────────
  if (result.reasoning && result.reasoning.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  REASONING TRAIL (first 30)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    for (const r of result.reasoning.slice(0, 30)) {
      console.log(`  [${r.role.padEnd(22)}] ${r.cardName.padEnd(32)} — ${r.reason}`);
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
