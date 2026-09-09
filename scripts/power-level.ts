/**
 * Power level algorithm by EDHPowerLevel.com (edhpowerlevel.com), reimplemented
 * with permission pending; not affiliated.
 *
 * Scores one or more ManaBox-style decklists against our local card DB using
 * src/lib/power-level-edhpl.ts. Usage:
 *
 *   npx tsx scripts/power-level.ts <decklist.txt> [...more]
 *
 * List format: one card per line ("1 Card Name" or "Card Name"), optional
 * "(SET) 123" printing suffix, optional "Commander"/"Deck" section headers.
 * The first non-header card line is treated as the commander.
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { computePowerLevel, type PowerLevelCardInput, type PerCardResult } from '../src/lib/power-level-edhpl';

export interface ParsedLine {
  name: string;
  quantity: number;
}

export function parseDecklist(text: string): { commander: string | null; lines: ParsedLine[] } {
  const lines: ParsedLine[] = [];
  let commander: string | null = null;
  let seenFirstCard = false;

  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    if (/^(commander|deck|mainboard|sideboard|companion)s?:?$/i.test(line)) continue;

    // Strip "(SET) 123" style printing suffix.
    line = line.replace(/\s*\([A-Za-z0-9]+\)\s*[A-Za-z0-9]*\s*$/, '').trim();

    const match = line.match(/^(\d+)x?\s+(.+)$/);
    const quantity = match ? Number(match[1]) : 1;
    const name = (match ? match[2] : line).trim();
    if (!name) continue;

    lines.push({ name, quantity });
    if (!seenFirstCard) {
      commander = name;
      seenFirstCard = true;
    }
  }

  return { commander, lines };
}

export interface CardRow {
  price: string | null;
  edhrec_rank: number | null;
  cmc: number;
  type_line: string;
  layout: string;
  mana_cost: string | null;
  oracle_text: string | null;
  game_changer: number;
  produced_mana: string | null;
  colors: string | null;
}

export function resolveCard(db: ReturnType<typeof getDb>, name: string): CardRow | null {
  // Several printings may exist per name — take the one with the best (lowest
  // non-null) price, preferring real printings over art-series/token layouts.
  const byName = db
    .prepare(
      `SELECT price_usd as price, edhrec_rank, cmc, type_line, layout, mana_cost, oracle_text, game_changer, produced_mana, colors
       FROM cards
       WHERE name = ? AND layout NOT IN ('art_series', 'token')
       ORDER BY (price_usd IS NULL), CAST(price_usd AS REAL) ASC
       LIMIT 1`,
    )
    .get(name) as CardRow | undefined;
  if (byName) return byName;

  // Front-face match for double-faced cards ("Card Name // Back Face").
  const byFrontFace = db
    .prepare(
      `SELECT price_usd as price, edhrec_rank, cmc, type_line, layout, mana_cost, oracle_text, game_changer, produced_mana, colors
       FROM cards
       WHERE name LIKE ? || ' // %' AND layout NOT IN ('art_series', 'token')
       ORDER BY (price_usd IS NULL), CAST(price_usd AS REAL) ASC
       LIMIT 1`,
    )
    .get(name) as CardRow | undefined;
  return byFrontFace ?? null;
}

export function toCardInput(name: string, quantity: number, row: CardRow): PowerLevelCardInput {
  let colors: string[] = [];
  try {
    colors = row.colors ? (JSON.parse(row.colors) as string[]) : [];
  } catch { /* leave empty */ }
  let producedMana: string[] = [];
  try {
    producedMana = row.produced_mana ? (JSON.parse(row.produced_mana) as string[]) : [];
  } catch { /* leave empty */ }

  return {
    name,
    quantity,
    price: row.price !== null && row.price !== '' ? Number(row.price) : null,
    edhrecRank: row.edhrec_rank,
    cmc: row.cmc,
    typeLine: row.type_line,
    layout: row.layout,
    manaCost: row.mana_cost ?? undefined,
    oracleText: row.oracle_text,
    gameChanger: !!row.game_changer,
    producedMana,
    colors,
  };
}

function scoreDecklist(filePath: string) {
  const db = getDb();
  const text = fs.readFileSync(filePath, 'utf8');
  const { commander, lines } = parseDecklist(text);

  const cards: PowerLevelCardInput[] = [];
  const unresolved: string[] = [];
  let noPriceCount = 0;

  for (const { name, quantity } of lines) {
    const row = resolveCard(db, name);
    if (!row) {
      unresolved.push(name);
      continue;
    }
    const input = toCardInput(name, quantity, row);
    if (input.price === null) noPriceCount++;
    cards.push(input);
  }

  const commanders = commander ? [commander] : [];
  const result = computePowerLevel(cards, commanders);

  return { file: filePath, commander, cards, unresolved, noPriceCount, result };
}

function printReport(scored: ReturnType<typeof scoreDecklist>) {
  const { file, commander, cards, unresolved, noPriceCount, result } = scored;
  console.log(`\n=== ${path.basename(file)} ===`);
  console.log(`Commander: ${commander ?? '(none detected)'}`);
  console.log(`Cards resolved: ${cards.length} / ${cards.length + unresolved.length}`);
  if (unresolved.length > 0) {
    console.log(`  Unresolved: ${unresolved.join(', ')}`);
  }
  if (noPriceCount > 0) {
    console.log(`  No price data for ${noPriceCount} card(s) — treated as $0.`);
  }
  console.log(`Impact total:      ${result.impactTotal.toFixed(2)}`);
  console.log(`Avg nonland CMC:   ${result.avgCost.toFixed(2)}`);
  console.log(`Tipping point:     ${result.tippingPoint}`);
  console.log(`Efficiency:        ${(result.efficiency * 10).toFixed(2)} / 10`);
  console.log(`Score:             ${result.score.toFixed(2)}`);
  console.log(`Power Level:       ${result.powerLevel.toFixed(2)} / 10`);
  console.log(`Bracket (partial, no combo signal): ${result.bracket}`);

  const nonland = result.perCard
    .filter((c) => !c.isLand)
    .slice()
    .sort((a, b) => b.impact - a.impact);
  const top10 = nonland.slice(0, 10);
  const bottom10 = nonland.slice(-10).reverse();

  const printCards = (label: string, list: PerCardResult[]) => {
    console.log(`\n${label}:`);
    for (const c of list) {
      console.log(`  ${c.impact.toFixed(2).padStart(7)}  ${c.name}`);
    }
  };
  printCards('Highest-impact nonland cards', top10);
  printCards('Lowest-impact nonland cards', bottom10);
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: npx tsx scripts/power-level.ts <decklist.txt> [...more]');
    process.exit(1);
  }
  for (const file of files) {
    printReport(scoreDecklist(file));
  }
}

if (require.main === module) main();
