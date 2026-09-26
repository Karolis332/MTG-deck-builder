/**
 * Build regression harness (U0, builder-plan-2026-09-26) — baseline-only, no
 * engine changes. Runs a fixed commander panel through autoBuildDeck +
 * gateDeck, records dead-card counts (narrow tutors, mono-colour fixing,
 * colourless-pip mismatch, tribe/changeling coverage), and either writes a
 * baseline JSON or diffs against one with --compare.
 *
 * Usage:
 *   npx tsx scripts/build-regress.ts --out <file.json>
 *   npx tsx scripts/build-regress.ts --out <file.json> --compare <baseline.json>
 *
 * Must run with MTG_DB_DIR set (forward slashes) — see mtg-deck-builder-map skill.
 */
import fs from 'fs';
import path from 'path';
import { autoBuildDeck } from '../src/lib/deck-builder-ai';
import { gateDeck, type GateVerdict } from '../src/lib/deck-gate';
import { deckText } from '../services/build-api/gate-wiring';
import { getDb } from '../src/lib/db';
import type { DbCard } from '../src/lib/types';
import { narrowTutorTarget, countTargets, colorlessPipCount, isColorlessSource, isMonoColourDeadFixer, type RelevanceCard } from '../src/lib/card-relevance';

interface PanelEntry {
  slug: string;
  commander: string;
  format: 'commander' | 'brawl';
  useCollection: boolean;
  userId: number | undefined;
  note?: string;
}

// Panel per the U0 brief. Vivi Ornitier is banned in Brawl (legalities.brawl =
// 'not_legal' in the repo card DB, verified 2026-09-26) — substituted to
// Commander format for that entry; noted in the report below.
const PANEL: PanelEntry[] = [
  { slug: 'aeve-collection', commander: 'Aeve, Progenitor Ooze', format: 'brawl', useCollection: true, userId: 1, note: 'WITH collection (userId 1)' },
  { slug: 'aeve-no-collection', commander: 'Aeve, Progenitor Ooze', format: 'brawl', useCollection: false, userId: undefined, note: 'WITHOUT collection' },
  { slug: 'krenko', commander: 'Krenko, Mob Boss', format: 'commander', useCollection: false, userId: undefined, note: 'mono-R tribal' },
  { slug: 'talrand', commander: 'Talrand, Sky Summoner', format: 'commander', useCollection: false, userId: undefined, note: 'mono-U spellslinger — must STAY spellslinger' },
  { slug: 'vivi', commander: 'Vivi Ornitier', format: 'commander', useCollection: false, userId: undefined, note: 'SUBSTITUTED brawl->commander: Vivi is banned in Brawl' },
  { slug: 'ezuri', commander: 'Ezuri, Claw of Progress', format: 'commander', useCollection: false, userId: undefined, note: 'UG +1/+1 counters' },
  { slug: 'edgar-markov', commander: 'Edgar Markov', format: 'commander', useCollection: false, userId: undefined, note: 'tribal vampires, 3 colours' },
];

interface DeadCardRecord {
  name: string;
  detail: string;
}

interface BuildRecord {
  slug: string;
  commander: string;
  format: string;
  useCollection: boolean;
  note?: string;
  ok: boolean;
  error?: string;
  strategy?: string;
  themes?: string[];
  tribalType?: string | null;
  totalCards?: number;
  tribeCreatureCount?: number;
  changelingCount?: number;
  nonbasicLands?: string[];
  narrowDeadTutors?: DeadCardRecord[];
  colorlessMismatch?: DeadCardRecord[];
  monoColourDeadFixers?: string[];
  gateVerdict?: GateVerdict['verdict'];
  gateChecks?: Array<{ id: string; status: string }>;
  /** Full main-board list (name + qty), for auditing what actually shipped. */
  deckList?: Array<{ name: string; quantity: number }>;
  /** Collection builds only: cards in the deck the userId does NOT own (basics exempt). */
  unownedCount?: number;
  unowned?: string[];
}

const BASIC_LAND_NAMES = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

/** Card names the userId owns, any source, matched both plain and Arena "A-" rebalanced. */
function getOwnedNameSet(userId: number): Set<string> {
  const rows = getDb().prepare(
    `SELECT DISTINCT c.name FROM collection col JOIN cards c ON col.card_id = c.id WHERE col.user_id = ?`
  ).all(userId) as Array<{ name: string }>;
  const owned = new Set<string>();
  for (const { name } of rows) {
    owned.add(name);
    owned.add(name.startsWith('A-') ? name.slice(2) : `A-${name}`);
  }
  return owned;
}

function toRelevanceCard(c: DbCard, quantity: number): RelevanceCard {
  return { name: c.name, type_line: c.type_line, oracle_text: c.oracle_text, mana_cost: c.mana_cost, quantity };
}

function parseIdentity(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function buildOne(entry: PanelEntry): Promise<BuildRecord> {
  const rec: BuildRecord = { slug: entry.slug, commander: entry.commander, format: entry.format, useCollection: entry.useCollection, note: entry.note, ok: false };
  try {
    const result = await autoBuildDeck({
      format: entry.format,
      colors: [],
      commanderName: entry.commander,
      useCollection: entry.useCollection,
      userId: entry.userId,
    });
    if (!result.cards.length) {
      rec.error = 'empty build';
      return rec;
    }
    rec.ok = true;
    rec.strategy = result.strategy;
    rec.themes = result.themes;
    rec.tribalType = result.tribalType ?? null;

    const main = result.cards.filter((e) => e.board === 'main');
    const relevancePool = main.map((e) => toRelevanceCard(e.card as DbCard, e.quantity));
    rec.totalCards = main.reduce((s, e) => s + e.quantity, 0);
    rec.deckList = main.map((e) => ({ name: (e.card as DbCard).name, quantity: e.quantity })).sort((a, b) => a.name.localeCompare(b.name));

    if (entry.useCollection && entry.userId !== undefined) {
      const owned = getOwnedNameSet(entry.userId);
      const unowned = main
        .filter((e) => !BASIC_LAND_NAMES.has((e.card as DbCard).name) && !owned.has((e.card as DbCard).name))
        .map((e) => (e.card as DbCard).name);
      rec.unownedCount = unowned.length;
      rec.unowned = unowned;
    }

    // Commander colour identity — deckColours for the mono-fixer check.
    const commanderRow = getDb()
      .prepare('SELECT color_identity FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1')
      .get(entry.commander) as { color_identity: string | null } | undefined;
    const deckColours = parseIdentity(commanderRow?.color_identity ?? null);

    // Tribe creature count (incl. changelings) — only meaningful for tribal builds.
    const tribe = (result.tribalType || '').toLowerCase();
    let tribeCreatureCount = 0;
    let changelingCount = 0;
    if (tribe) {
      for (const e of main) {
        const c = e.card as DbCard;
        if (!c.type_line?.toLowerCase().includes('creature')) continue;
        const typeLine = c.type_line.toLowerCase();
        const keywords = (c.keywords || '').toLowerCase();
        const oracle = (c.oracle_text || '').toLowerCase();
        const isChangeling = keywords.includes('changeling') || oracle.includes('all creature types') || oracle.includes('every creature type');
        if (isChangeling) {
          changelingCount += e.quantity;
          tribeCreatureCount += e.quantity;
        } else if (typeLine.includes(tribe)) {
          tribeCreatureCount += e.quantity;
        }
      }
      rec.tribeCreatureCount = tribeCreatureCount;
      rec.changelingCount = changelingCount;
    }

    // Nonbasic lands.
    rec.nonbasicLands = main
      .filter((e) => {
        const c = e.card as DbCard;
        return c.type_line?.includes('Land') && !c.type_line.includes('Basic');
      })
      .map((e) => (e.card as DbCard).name);

    // Narrow tutors whose target has < 3 hits in the deck.
    const narrowDeadTutors: DeadCardRecord[] = [];
    for (const e of main) {
      const c = e.card as DbCard;
      const target = narrowTutorTarget({ oracle_text: c.oracle_text });
      if (!target) continue;
      const count = countTargets(target, relevancePool);
      if (count < 3) {
        narrowDeadTutors.push({ name: c.name, detail: `targets "${target.value}" (${target.kind}), ${count} in deck` });
      }
    }
    rec.narrowDeadTutors = narrowDeadTutors;

    // Colourless-pip cards vs colourless sources available.
    const colorlessSourceCount = main.reduce((s, e) => {
      const c = e.card as DbCard;
      return s + (isColorlessSource({ oracle_text: c.oracle_text, type_line: c.type_line }) ? e.quantity : 0);
    }, 0);
    const colorlessMismatch: DeadCardRecord[] = [];
    if (colorlessSourceCount < 6) {
      for (const e of main) {
        const c = e.card as DbCard;
        const pips = colorlessPipCount(c.mana_cost);
        if (pips > 0) colorlessMismatch.push({ name: c.name, detail: `${pips}x {C}, deck has ${colorlessSourceCount} colourless sources` });
      }
    }
    rec.colorlessMismatch = colorlessMismatch;

    // Mono-colour dead fixers.
    rec.monoColourDeadFixers = main
      .filter((e) => {
        const c = e.card as DbCard;
        return isMonoColourDeadFixer({ oracle_text: c.oracle_text, type_line: c.type_line }, deckColours);
      })
      .map((e) => (e.card as DbCard).name);

    // Gate verdict.
    const gate = gateDeck(
      deckText(result.cards.map((e) => ({ name: (e.card as DbCard).name, quantity: e.quantity, board: e.board }))),
      { format: entry.format, ownerId: entry.useCollection ? entry.userId ?? null : null }
    );
    rec.gateVerdict = gate.verdict;
    rec.gateChecks = gate.checks.map((c) => ({ id: c.id, status: c.status }));

    return rec;
  } catch (err) {
    rec.error = err instanceof Error ? err.message : String(err);
    return rec;
  }
}

function mdRow(r: BuildRecord): string {
  const dead = [
    ...(r.narrowDeadTutors || []).map((d) => `tutor:${d.name}`),
    ...(r.colorlessMismatch || []).map((d) => `pip:${d.name}`),
    ...(r.monoColourDeadFixers || []).map((d) => `fixer:${d}`),
  ];
  const unowned = r.useCollection
    ? (r.unownedCount ? `${r.unownedCount}: ${(r.unowned || []).join(', ')}` : '0')
    : 'n/a';
  return `| ${r.slug} | ${r.commander} | ${r.format} | ${r.useCollection} | ${r.ok ? 'ok' : `ERROR: ${r.error}`} | ${r.strategy ?? ''} | ${r.tribalType ?? ''} | ${r.tribeCreatureCount ?? ''}/${r.changelingCount ?? ''} | ${(r.nonbasicLands || []).length} | ${dead.length ? dead.join(', ') : '-'} | ${unowned} | ${r.gateVerdict ?? ''} |`;
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
  const compareIdx = args.indexOf('--compare');
  const compareFile = compareIdx >= 0 ? args[compareIdx + 1] : null;

  if (!outFile) {
    console.error('Usage: build-regress.ts --out <file.json> [--compare <baseline.json>]');
    process.exit(1);
  }

  const records: BuildRecord[] = [];
  for (const entry of PANEL) {
    console.log(`Building ${entry.slug} (${entry.commander}, ${entry.format}, collection=${entry.useCollection})...`);
    const rec = await buildOne(entry);
    records.push(rec);
    console.log(`  -> ${rec.ok ? 'ok' : 'ERROR: ' + rec.error}`);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(records, null, 2));
  const mdFile = outFile.replace(/\.json$/, '.md');
  const header = '| slug | commander | format | collection | build | strategy | tribalType | tribe/changeling | nonbasicLands | dead cards | unowned | gate |\n|---|---|---|---|---|---|---|---|---|---|---|---|';
  fs.writeFileSync(mdFile, [header, ...records.map(mdRow)].join('\n') + '\n');
  console.log(`Wrote ${outFile} and ${mdFile}`);

  if (compareFile) {
    const baseline: BuildRecord[] = JSON.parse(fs.readFileSync(compareFile, 'utf8'));
    console.log('\n=== Compare (baseline -> current) ===');
    for (const cur of records) {
      const base = baseline.find((b) => b.slug === cur.slug);
      if (!base) {
        console.log(`${cur.slug}: NEW (no baseline entry)`);
        continue;
      }
      const baseDead = (base.narrowDeadTutors?.length || 0) + (base.colorlessMismatch?.length || 0) + (base.monoColourDeadFixers?.length || 0);
      const curDead = (cur.narrowDeadTutors?.length || 0) + (cur.colorlessMismatch?.length || 0) + (cur.monoColourDeadFixers?.length || 0);
      const strategyChanged = base.strategy !== cur.strategy;
      const unownedPart = cur.useCollection ? `, unowned ${base.unownedCount ?? '?'} -> ${cur.unownedCount ?? '?'}` : '';
      console.log(
        `${cur.slug}: strategy ${base.strategy ?? '?'} -> ${cur.strategy ?? '?'}${strategyChanged ? ' [CHANGED]' : ''}, dead-cards ${baseDead} -> ${curDead}${unownedPart}, gate ${base.gateVerdict ?? '?'} -> ${cur.gateVerdict ?? '?'}`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
