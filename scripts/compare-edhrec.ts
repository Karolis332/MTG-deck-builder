/**
 * Compare harness builds (decks/test-builds/results.json) against EDHREC
 * consensus (decks/test-builds/edhrec-reference.json).
 *
 * Emits decks/test-builds/COMPARISON.md + console summary table.
 *
 * Usage: npx tsx scripts/compare-edhrec.ts
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';

const DIR = path.join(process.cwd(), 'decks', 'test-builds');

const SLUG_MAP: Record<string, string> = {
  'vivi-ornitier': 'vivi-ornitier',
  'ramos-dragon-engine': 'ramos-dragon-engine',
  'magus-lucea-kane': 'magus-lucea-kane',
  'thrasios-tymna': 'thrasios-triton-hero-tymna-the-weaver',
  'mono-w-heliod': 'heliod-sun-crowned',
  'mono-u-orvar': 'orvar-the-all-form',
  'mono-b-sheoldred': 'sheoldred-the-apocalypse',
  'mono-r-krenko': 'krenko-mob-boss',
  'mono-g-ghalta': 'ghalta-primal-hunger',
};

interface BuildCard {
  name: string; quantity: number; board: string; type_line: string;
  cmc: number; primaryCategory: string; edhrec_rank: number | null;
  brawlLegal: boolean; commanderLegal: boolean;
}
interface Build {
  scenario: string; commander: string; partner?: string; format: string; ok: boolean;
  strategy?: string; themes?: string[]; tribalType?: string | null;
  totalCards?: number; landCount?: number; avgCmcNonLand?: number;
  categoryCounts?: Record<string, number>;
  illegalCardsForFormat?: string[]; commanderLegalInFormat?: boolean;
  cards?: BuildCard[];
}
interface EdhrecCommander {
  deckCount: number;
  categories: Record<string, Array<{ name: string; inclusionPct: number; synergy: number }>>;
  averageDeck: string[];
}

const front = (name: string): string => name.split(' // ')[0].trim();

/** A build entry counts as a REAL land only if its front face is a Land. */
function isRealLand(c: BuildCard): boolean {
  const frontType = c.type_line.split('//')[0];
  return frontType.includes('Land');
}
function isListedLand(c: BuildCard): boolean {
  return c.type_line.includes('Land');
}

function parseAvgEntry(entry: string): { name: string; qty: number } {
  const m = entry.match(/^(\d+)x\s+(.*)$/);
  if (m) return { name: m[2].trim(), qty: parseInt(m[1], 10) };
  return { name: entry.trim(), qty: 1 };
}

function main(): void {
  const results = JSON.parse(fs.readFileSync(path.join(DIR, 'results.json'), 'utf8')) as Build[];
  const edhrec = JSON.parse(fs.readFileSync(path.join(DIR, 'edhrec-reference.json'), 'utf8')) as Record<string, EdhrecCommander>;
  const db = getDb();
  const typeStmt = db.prepare('SELECT type_line, legalities FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1');
  const typeCache = new Map<string, { type_line: string; brawlLegal: boolean }>();
  const lookup = (name: string): { type_line: string; brawlLegal: boolean } => {
    const key = name.toLowerCase();
    const hit = typeCache.get(key);
    if (hit) return hit;
    const row = typeStmt.get(name) as { type_line?: string; legalities?: string } | undefined
      ?? typeStmt.get(front(name)) as { type_line?: string; legalities?: string } | undefined;
    let brawlLegal = false;
    try { brawlLegal = row?.legalities ? JSON.parse(row.legalities).brawl === 'legal' : false; } catch { /* noop */ }
    const val = { type_line: row?.type_line || '', brawlLegal };
    typeCache.set(key, val);
    return val;
  };

  const md: string[] = ['# Auto-Build vs EDHREC Comparison — ' + new Date().toISOString().slice(0, 10), ''];
  const summary: string[] = [];

  for (const build of results) {
    if (!build.ok || !build.cards) continue;
    const slug = SLUG_MAP[build.scenario];
    const ref = edhrec[slug];
    if (!ref) continue;

    const mainCards = build.cards.filter((c) => c.board === 'main');
    const ourNonLand = mainCards.filter((c) => !isListedLand(c));
    const ourNonLandNames = new Set(ourNonLand.map((c) => front(c.name).toLowerCase()));
    const realLands = mainCards.filter(isRealLand).reduce((s, c) => s + c.quantity, 0);
    const fakeLands = mainCards.filter((c) => isListedLand(c) && !isRealLand(c));

    // EDHREC average deck split
    const avgEntries = ref.averageDeck.map(parseAvgEntry);
    const avgNonLand: string[] = [];
    let avgLandCount = 0;
    for (const e of avgEntries) {
      const t = lookup(e.name).type_line;
      const isLand = t.split('//')[0].includes('Land');
      if (isLand) avgLandCount += e.qty;
      else avgNonLand.push(e.name);
    }

    // For brawl builds, restrict EDHREC consensus to brawl-legal cards
    const isBrawl = build.format !== 'commander';
    const refNonLand = isBrawl ? avgNonLand.filter((n) => lookup(n).brawlLegal) : avgNonLand;
    const refNonLandSet = new Set(refNonLand.map((n) => front(n).toLowerCase()));

    const overlap = [...ourNonLandNames].filter((n) => refNonLandSet.has(n));
    const overlapPct = refNonLandSet.size ? Math.round((overlap.length / refNonLandSet.size) * 1000) / 10 : 0;

    // Top missing: from High Synergy Cards + Top Cards categories, legal in format
    const topRef = [
      ...(ref.categories['High Synergy Cards'] || []),
      ...(ref.categories['Top Cards'] || []),
    ].filter((c) => !isBrawl || lookup(c.name).brawlLegal);
    const missing = topRef
      .filter((c) => !ourNonLandNames.has(front(c.name).toLowerCase()))
      .filter((c) => !lookup(c.name).type_line.split('//')[0].includes('Land'))
      .slice(0, 15);

    // Filler: our nonland picks not present anywhere in EDHREC categories or average deck
    const allRefNames = new Set<string>([
      ...avgNonLand.map((n) => front(n).toLowerCase()),
      ...Object.values(ref.categories).flat().map((c) => front(c.name).toLowerCase()),
    ]);
    const filler = ourNonLand
      .filter((c) => !allRefNames.has(front(c.name).toLowerCase()))
      .sort((a, b) => (b.edhrec_rank ?? 99999) - (a.edhrec_rank ?? 99999))
      .slice(0, 15);

    // Staple guarantee check
    const colorless = ['sol ring', 'arcane signet', 'command tower'];
    const stapleStatus = colorless.map((s) => `${s}:${ourNonLandNames.has(s) || mainCards.some((c) => front(c.name).toLowerCase() === s) ? 'Y' : 'N'}`).join(' ');

    const fmt = build.format.toUpperCase();
    md.push(`## ${build.commander}${build.partner ? ' + ' + build.partner : ''} — ${fmt}`);
    md.push('');
    md.push(`- EDHREC decks: ${ref.deckCount.toLocaleString()} | our strategy: ${build.strategy} | tribal: ${build.tribalType || '-'}`);
    md.push(`- Lands: ours listed=${build.landCount} REAL=${realLands} (fake-land entries: ${fakeLands.length}) vs EDHREC avg=${avgLandCount}`);
    md.push(`- Nonland overlap with EDHREC avg${isBrawl ? ' (brawl-legal subset)' : ''}: ${overlap.length}/${refNonLandSet.size} = ${overlapPct}%`);
    md.push(`- Commander legal in ${fmt}: ${build.commanderLegalInFormat} | illegal cards in build: ${build.illegalCardsForFormat?.length || 0}${build.illegalCardsForFormat?.length ? ' (' + build.illegalCardsForFormat.join(', ') + ')' : ''}`);
    md.push(`- Staples: ${stapleStatus}`);
    md.push(`- Categories: ${Object.entries(build.categoryCounts || {}).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    md.push('');
    md.push(`**Top EDHREC cards we MISSED:** ${missing.map((c) => `${c.name} (${c.inclusionPct}%)`).join('; ') || 'none'}`);
    md.push('');
    md.push(`**Our picks EDHREC never plays (filler suspects):** ${filler.map((c) => `${c.name} [rank ${c.edhrec_rank ?? '?'}]`).join('; ') || 'none'}`);
    if (fakeLands.length) {
      md.push('');
      md.push(`**Fake lands (front face is not a Land):** ${fakeLands.map((c) => c.name).join('; ')}`);
    }
    md.push('');

    summary.push([
      `${build.scenario}/${build.format}`.padEnd(32),
      `ov=${String(overlapPct).padStart(5)}%`,
      `lands ${String(realLands).padStart(2)}/${avgLandCount}`,
      `fake=${String(fakeLands.length).padStart(2)}`,
      `miss-top=${missing.length}`,
      `filler=${filler.length}`,
    ].join(' '));
  }

  fs.writeFileSync(path.join(DIR, 'COMPARISON.md'), md.join('\n'));
  console.log(summary.join('\n'));
  console.log(`\nWrote ${path.join(DIR, 'COMPARISON.md')}`);
}

main();
