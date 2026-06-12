/**
 * Headless deck-build test harness.
 *
 * Builds Commander (paper) + Brawl (Arena Historic Brawl) variants for a fixed
 * commander roster, saves decklists + category breakdowns to decks/test-builds/,
 * and a machine-readable results.json for EDHREC comparison.
 *
 * Usage: npx tsx scripts/test-deck-builds.ts [--only <slug>]
 */
import fs from 'fs';
import path from 'path';
import { autoBuildDeck } from '../src/lib/deck-builder-ai';
import { classifyCard, getPrimaryCategory } from '../src/lib/card-classifier';
import { getDb } from '../src/lib/db';
import type { DbCard } from '../src/lib/types';

const OUT_DIR = path.join(process.cwd(), 'decks', 'test-builds');

interface Scenario {
  slug: string;
  commander: string;
  /** secondary partner commander, if testing a duo */
  partner?: string;
  note?: string;
}

const SCENARIOS: Scenario[] = [
  { slug: 'vivi-ornitier', commander: 'Vivi Ornitier', note: 'X-spell / noncombat-damage spellslinger (UR). Arena: banned in Brawl per Scryfall.' },
  { slug: 'ramos-dragon-engine', commander: 'Ramos, Dragon Engine', note: '5-color, +1/+1 counters per color of mana spent.' },
  { slug: 'magus-lucea-kane', commander: 'Magus Lucea Kane', note: 'Temur X-spells tribal copy (40K, not on Arena).' },
  { slug: 'thrasios-tymna', commander: 'Thrasios, Triton Hero', partner: 'Tymna the Weaver', note: 'Partner duo GWUB. Engine currently single-commander only.' },
  { slug: 'mono-w-heliod', commander: 'Heliod, Sun-Crowned', note: 'Mono-white lifegain.' },
  { slug: 'mono-u-orvar', commander: 'Orvar, the All-Form', note: 'Mono-blue clones/bounce.' },
  { slug: 'mono-b-sheoldred', commander: 'Sheoldred, the Apocalypse', note: 'Mono-black draw-punisher.' },
  { slug: 'mono-r-krenko', commander: 'Krenko, Mob Boss', note: 'Mono-red goblins.' },
  { slug: 'mono-g-ghalta', commander: 'Ghalta, Primal Hunger', note: 'Mono-green stompy.' },
];

const FORMATS = ['commander', 'brawl'] as const;

interface DeckCardOut {
  name: string;
  quantity: number;
  board: string;
  type_line: string;
  cmc: number;
  mana_cost: string | null;
  color_identity: string;
  primaryCategory: string;
  edhrec_rank: number | null;
  brawlLegal: boolean;
  commanderLegal: boolean;
}

interface BuildOut {
  scenario: string;
  commander: string;
  partner?: string;
  format: string;
  ok: boolean;
  error?: string;
  elapsedMs: number;
  strategy?: string;
  themes?: string[];
  tribalType?: string | null;
  totalCards?: number;
  landCount?: number;
  avgCmcNonLand?: number;
  categoryCounts?: Record<string, number>;
  curve?: Record<string, number>;
  illegalCardsForFormat?: string[];
  commanderLegalInFormat?: boolean;
  cards?: DeckCardOut[];
  buildReport?: string;
}

function legalIn(card: { legalities?: string | null }, key: string): boolean {
  if (!card.legalities) return false;
  try {
    const leg = JSON.parse(card.legalities);
    return leg[key] === 'legal' || leg[key] === 'restricted';
  } catch {
    return false;
  }
}

async function buildOne(scenario: Scenario, format: string): Promise<BuildOut> {
  const started = Date.now();
  const base: BuildOut = {
    scenario: scenario.slug,
    commander: scenario.commander,
    partner: scenario.partner,
    format,
    ok: false,
    elapsedMs: 0,
  };
  try {
    const result = await autoBuildDeck({
      format,
      colors: [],
      commanderName: scenario.commander,
      partnerName: scenario.partner,
    });
    base.elapsedMs = Date.now() - started;
    if (!result.cards.length) {
      base.error = 'empty build';
      return base;
    }

    const cards: DeckCardOut[] = result.cards.map((e) => {
      const c = e.card as DbCard & { legalities?: string | null };
      const cats = classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc ?? 0);
      return {
        name: c.name,
        quantity: e.quantity,
        board: e.board,
        type_line: c.type_line || '',
        cmc: c.cmc ?? 0,
        mana_cost: c.mana_cost ?? null,
        color_identity: c.color_identity || '[]',
        primaryCategory: getPrimaryCategory(cats),
        edhrec_rank: c.edhrec_rank ?? null,
        brawlLegal: legalIn(c, 'brawl'),
        commanderLegal: legalIn(c, 'commander'),
      };
    });

    const main = cards.filter((c) => c.board === 'main');
    const lands = main.filter((c) => c.type_line.includes('Land'));
    const nonLands = main.filter((c) => !c.type_line.includes('Land'));
    const totalCards = main.reduce((s, c) => s + c.quantity, 0);
    const landCount = lands.reduce((s, c) => s + c.quantity, 0);
    const avgCmc =
      nonLands.reduce((s, c) => s + c.cmc * c.quantity, 0) /
      Math.max(1, nonLands.reduce((s, c) => s + c.quantity, 0));

    const categoryCounts: Record<string, number> = {};
    for (const c of main) {
      categoryCounts[c.primaryCategory] = (categoryCounts[c.primaryCategory] || 0) + c.quantity;
    }

    const curve: Record<string, number> = {};
    for (const c of nonLands) {
      const bucket = c.cmc >= 7 ? '7+' : String(Math.floor(c.cmc));
      curve[bucket] = (curve[bucket] || 0) + c.quantity;
    }

    const legalityKey = format === 'commander' ? 'commander' : format === 'standardbrawl' ? 'standardbrawl' : 'brawl';
    const illegal = main
      .filter((c) => (legalityKey === 'commander' ? !c.commanderLegal : !c.brawlLegal))
      .map((c) => c.name);

    // Is the commander itself legal in the chosen format?
    const cmdRow = getDb()
      .prepare('SELECT legalities FROM cards WHERE name = ? LIMIT 1')
      .get(scenario.commander) as { legalities?: string } | undefined;
    const commanderLegalInFormat = cmdRow ? legalIn(cmdRow, legalityKey) : false;

    return {
      ...base,
      ok: true,
      elapsedMs: Date.now() - started,
      strategy: result.strategy,
      themes: result.themes,
      tribalType: result.tribalType || null,
      totalCards,
      landCount,
      avgCmcNonLand: Math.round(avgCmc * 100) / 100,
      categoryCounts,
      curve,
      illegalCardsForFormat: illegal,
      commanderLegalInFormat,
      cards,
      buildReport: result.buildReport,
    };
  } catch (err) {
    base.elapsedMs = Date.now() - started;
    base.error = err instanceof Error ? err.message : String(err);
    return base;
  }
}

function writeDecklist(out: BuildOut, scenario: Scenario): void {
  const lines: string[] = [];
  lines.push(`// ${scenario.commander}${scenario.partner ? ' + ' + scenario.partner : ''} — ${out.format.toUpperCase()}`);
  lines.push(`// strategy=${out.strategy} themes=${(out.themes || []).join(',')} tribal=${out.tribalType || '-'}`);
  lines.push(`// total=${out.totalCards} lands=${out.landCount} avgCMC=${out.avgCmcNonLand}`);
  lines.push(`// categories: ${Object.entries(out.categoryCounts || {}).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  if (out.illegalCardsForFormat?.length) {
    lines.push(`// !! ${out.illegalCardsForFormat.length} cards NOT LEGAL in ${out.format}: ${out.illegalCardsForFormat.slice(0, 10).join('; ')}${out.illegalCardsForFormat.length > 10 ? ' …' : ''}`);
  }
  lines.push('');
  lines.push(`1 ${scenario.commander} *CMDR*`);
  if (scenario.partner) lines.push(`1 ${scenario.partner} *CMDR* (requested partner — see note)`);
  lines.push('');

  const byCategory = new Map<string, DeckCardOut[]>();
  for (const c of (out.cards || []).filter((c) => c.board === 'main')) {
    const list = byCategory.get(c.primaryCategory) || [];
    list.push(c);
    byCategory.set(c.primaryCategory, list);
  }
  const order = ['ramp', 'draw', 'removal', 'board_wipe', 'protection', 'synergy', 'win_condition', 'utility', 'land'];
  for (const cat of order) {
    const list = byCategory.get(cat);
    if (!list?.length) continue;
    lines.push(`// ── ${cat} (${list.reduce((s, c) => s + c.quantity, 0)}) ──`);
    list
      .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name))
      .forEach((c) => lines.push(`${c.quantity} ${c.name}`));
    lines.push('');
  }

  const file = path.join(OUT_DIR, `${scenario.slug}--${out.format}.txt`);
  fs.writeFileSync(file, lines.join('\n'));
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;

  const results: BuildOut[] = [];
  for (const scenario of SCENARIOS) {
    if (only && scenario.slug !== only) continue;
    for (const format of FORMATS) {
      process.stdout.write(`Building ${scenario.slug} [${format}] ... `);
      const out = await buildOne(scenario, format);
      results.push(out);
      if (out.ok) {
        console.log(`OK ${out.totalCards} cards, ${out.landCount} lands, avgCMC ${out.avgCmcNonLand}, ${out.elapsedMs}ms${out.illegalCardsForFormat?.length ? ` [${out.illegalCardsForFormat.length} ILLEGAL]` : ''}`);
        writeDecklist(out, scenario);
      } else {
        console.log(`FAILED: ${out.error}`);
      }
    }
  }

  const jsonOut = results.map((r) => ({
    ...r,
    cards: r.cards?.map((c) => ({
      name: c.name, quantity: c.quantity, board: c.board, type_line: c.type_line,
      cmc: c.cmc, primaryCategory: c.primaryCategory, edhrec_rank: c.edhrec_rank,
      brawlLegal: c.brawlLegal, commanderLegal: c.commanderLegal,
    })),
  }));
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(jsonOut, null, 1));
  console.log(`\nWrote ${results.length} builds to ${OUT_DIR}`);
  const failures = results.filter((r) => !r.ok);
  if (failures.length) {
    console.log(`FAILURES: ${failures.map((f) => `${f.scenario}/${f.format}: ${f.error}`).join(' | ')}`);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('HARNESS FAILED:', err);
  process.exit(1);
});
