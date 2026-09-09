/**
 * What owned cards raise each deck's EDHPowerLevel score the most.
 *
 * Power level algorithm by EDHPowerLevel.com (edhpowerlevel.com), reimplemented
 * with permission pending; not affiliated. Reuses src/lib/power-level-edhpl.ts
 * and scripts/power-level.ts's resolver — see those files for algorithm detail.
 *
 * Usage: npx tsx scripts/power-level-improve.ts
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { computePowerLevel, type PowerLevelCardInput } from '../src/lib/power-level-edhpl';
import { parseDecklist, resolveCard, toCardInput, type CardRow } from './power-level';

const DECKS_DIR = path.join(__dirname, '..', 'decks', 'paper', 'decks');
const POOL_FILE = path.join(__dirname, '..', 'decks', 'paper', 'open-cards.txt');
const RESERVED_FILE = path.join(DECKS_DIR, 'ramos-dragon-engine.txt');
const CORPUS_FILE = path.join(__dirname, '..', 'data', 'corpus-stats.json');
const PROPOSALS_DIR = path.join(__dirname, '..', 'decks', 'paper', 'proposals');
const REPORT_FILE = path.join(__dirname, '..', 'verify-2026-09-09', 'power-level-report.md');

const MAX_SWAPS = 15;
const MIN_GAIN = 0.01;

const DECKS: { key: string; file: string; commanderName: string }[] = [
  { key: 'tazri', file: 'tazri-beacon-of-unity.txt', commanderName: 'Tazri, Beacon of Unity' },
  { key: 'meren', file: 'meren-of-clan-nel-toth.txt', commanderName: 'Meren of Clan Nel Toth' },
  { key: 'imotekh', file: 'imotekh-the-stormlord.txt', commanderName: 'Imotekh the Stormlord' },
];

const BASIC_LANDS = new Set(['Forest', 'Island', 'Swamp', 'Plains', 'Mountain', 'Wastes']);

const RAMP_REGEX = /add \{[wubrgc]|add (one|two|three) mana|search your library for a .*land|search your library for up to \w+ .*lands?/i;
const TAZRI_TRIBES = /\b(cleric|rogue|warrior|wizard|shapeshifter)\b/i;
const TAZRI_DUNGEON = /venture into the dungeon/i;

interface Candidate {
  input: PowerLevelCardInput;
  row: CardRow;
  impact: number;
}

interface DeckCard {
  input: PowerLevelCardInput;
  row: CardRow;
  impact: number;
  removable: boolean;
  protectReason?: string;
}

function loadPool(): Map<string, number> {
  const pool = new Map<string, number>();
  const text = fs.readFileSync(POOL_FILE, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    pool.set(match[2].trim(), Number(match[1]));
  }
  return pool;
}

function loadReservedNames(): Set<string> {
  const { lines } = parseDecklist(fs.readFileSync(RESERVED_FILE, 'utf8'));
  return new Set(lines.map((l) => l.name));
}

function isSubsetIdentity(cardIdentity: string[], commanderIdentity: string[]): boolean {
  const allowed = new Set(commanderIdentity);
  return cardIdentity.every((c) => allowed.has(c));
}

function isLandRow(row: CardRow): boolean {
  const frontFace = row.type_line.split(' // ')[0].split(' — ')[0];
  return frontFace.includes('Land') || row.layout === 'modal_dfc';
}

function singleCardImpact(input: PowerLevelCardInput, commanders: string[]): number {
  return computePowerLevel([input], commanders).perCard[0].impact;
}

function parseColorIdentity(db: ReturnType<typeof getDb>, name: string): string[] {
  const ci = db
    .prepare('SELECT color_identity FROM cards WHERE name = ? LIMIT 1')
    .get(name) as { color_identity: string | null } | undefined;
  if (!ci?.color_identity) return [];
  try {
    return JSON.parse(ci.color_identity) as string[];
  } catch {
    return [];
  }
}

function isProtected(
  name: string,
  row: CardRow,
  deckKey: string,
  corpusStats: Record<string, [number, number | null]> | undefined,
): string | undefined {
  const stat = corpusStats?.[name];
  if (stat) {
    const [inclusion, lift] = stat;
    if (inclusion >= 0.2) return `corpus inclusion ${(inclusion * 100).toFixed(0)}%`;
    if (lift !== null && lift >= 1.5) return `corpus lift ${lift.toFixed(2)}`;
  }
  if (deckKey === 'tazri') {
    const subtypeLine = row.type_line;
    if (TAZRI_TRIBES.test(subtypeLine)) return 'party subtype (Tazri theme)';
    if (TAZRI_DUNGEON.test(row.oracle_text ?? '')) return 'venture into the dungeon (Tazri theme)';
  }
  if (deckKey === 'imotekh') {
    if (/\bNecron\b/.test(row.type_line)) return 'Necron creature';
    if (name === 'Culling the Weak') return 'named protection (Culling the Weak)';
  }
  if (RAMP_REGEX.test(row.oracle_text ?? '')) return 'ramp role';
  return undefined;
}

function buildDeckCards(
  db: ReturnType<typeof getDb>,
  lines: { name: string; quantity: number }[],
  commanderName: string,
  deckKey: string,
  corpusStats: Record<string, [number, number | null]> | undefined,
): { commander: DeckCard; cards: DeckCard[]; unresolved: string[] } {
  const unresolved: string[] = [];
  const cards: DeckCard[] = [];
  let commander: DeckCard | null = null;

  for (const { name, quantity } of lines) {
    const row = resolveCard(db, name);
    if (!row) {
      unresolved.push(name);
      continue;
    }
    const input = toCardInput(name, quantity, row);
    const impact = singleCardImpact(input, [commanderName]);
    const isCommander = name === commanderName;
    const isBasic = BASIC_LANDS.has(name);
    const protectReason = isCommander
      ? 'commander'
      : isLandRow(row) || isBasic
        ? 'land'
        : isProtected(name, row, deckKey, corpusStats);
    const deckCard: DeckCard = { input, row, impact, removable: !protectReason, protectReason };
    if (isCommander) commander = deckCard;
    else cards.push(deckCard);
  }

  if (!commander) throw new Error(`Commander "${commanderName}" not found in its own decklist`);
  return { commander, cards, unresolved };
}

function buildCandidates(
  db: ReturnType<typeof getDb>,
  pool: Map<string, number>,
  usedByThisDeck: Set<string>,
  commanderName: string,
  commanderIdentity: string[],
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const [name, qty] of pool) {
    if (qty <= 0 || usedByThisDeck.has(name) || BASIC_LANDS.has(name)) continue;
    const row = resolveCard(db, name);
    if (!row || isLandRow(row)) continue;
    const identity = parseColorIdentity(db, name);
    if (!isSubsetIdentity(identity, commanderIdentity)) continue;
    const input = toCardInput(name, 1, row);
    const impact = singleCardImpact(input, [commanderName]);
    candidates.push({ input, row, impact });
  }
  return candidates.sort((a, b) => b.impact - a.impact);
}

interface SwapRecord {
  out: { name: string; impact: number };
  in: { name: string; impact: number };
  powerLevelAfter: number;
}

function greedyImprove(
  commander: DeckCard,
  cards: DeckCard[],
  candidates: Candidate[],
  commanderName: string,
): { finalCards: DeckCard[]; swaps: SwapRecord[]; before: number; after: number } {
  const deck = [...cards];
  const pool = [...candidates];
  const swaps: SwapRecord[] = [];

  const scoreOf = (list: DeckCard[]) =>
    computePowerLevel([commander.input, ...list.map((c) => c.input)], [commanderName]).powerLevel;

  const before = scoreOf(deck);
  let current = before;

  for (let i = 0; i < MAX_SWAPS; i++) {
    const removableIdx = deck.reduce(
      (best, c, idx) => (c.removable && (best === -1 || c.impact < deck[best].impact) ? idx : best),
      -1,
    );
    if (removableIdx === -1 || pool.length === 0) break;

    const removable = deck[removableIdx];
    const inCard = pool[0]; // highest-impact remaining candidate
    const trial = deck.slice();
    trial[removableIdx] = { input: inCard.input, row: inCard.row, impact: inCard.impact, removable: true };
    const trialScore = scoreOf(trial);

    if (trialScore - current < MIN_GAIN) break;

    swaps.push({
      out: { name: removable.input.name, impact: removable.impact },
      in: { name: inCard.input.name, impact: inCard.impact },
      powerLevelAfter: trialScore,
    });
    deck[removableIdx] = trial[removableIdx];
    pool.shift();
    current = trialScore;
  }

  return { finalCards: deck, swaps, before, after: current };
}

function writeDeckFile(key: string, commanderName: string, commanderQty: number, cards: DeckCard[]) {
  fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
  const sorted = cards.slice().sort((a, b) => a.input.name.localeCompare(b.input.name));
  const lines = [`${commanderQty} ${commanderName}`, ...sorted.map((c) => `${c.input.quantity} ${c.input.name}`)];
  const total = commanderQty + sorted.reduce((sum, c) => sum + c.input.quantity, 0);
  if (total !== 100) console.error(`WARNING: ${key} proposal has ${total} cards, expected 100`);
  fs.writeFileSync(path.join(PROPOSALS_DIR, `${key}-power.txt`), lines.join('\n') + '\n');
}

function main() {
  const db = getDb();
  const pool = loadPool();
  const reserved = loadReservedNames();
  for (const name of reserved) pool.delete(name);

  const corpus = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8')) as Record<
    string,
    Record<string, [number, number | null]>
  >;

  const reportLines: string[] = [];
  const globalUsedNames = new Set<string>();
  const idleCandidates: { name: string; impact: number; identity: string[] }[] = [];
  const unresolvedAll: Record<string, string[]> = {};

  for (const { key, file, commanderName } of DECKS) {
    const commanderIdentity = parseColorIdentity(db, commanderName);
    const { commander, cards, unresolved } = buildDeckCards(
      db,
      parseDecklist(fs.readFileSync(path.join(DECKS_DIR, file), 'utf8')).lines,
      commanderName,
      key,
      corpus[commanderName],
    );
    unresolvedAll[key] = unresolved;

    const deckCardNames = new Set(cards.map((c) => c.input.name));
    const candidates = buildCandidates(db, pool, deckCardNames, commanderName, commanderIdentity);

    const { finalCards, swaps, before, after } = greedyImprove(commander, cards, candidates, commanderName);

    for (const s of swaps) {
      pool.set(s.in.name, (pool.get(s.in.name) ?? 1) - 1);
      globalUsedNames.add(s.in.name);
    }

    writeDeckFile(key, commanderName, commander.input.quantity, finalCards);

    reportLines.push(`### ${commanderName} (${key})\n`);
    reportLines.push(`Power level before: **${before.toFixed(2)}**  →  after: **${after.toFixed(2)}**  (${swaps.length} swap${swaps.length === 1 ? '' : 's'})\n`);
    if (unresolved.length > 0) reportLines.push(`Unresolved deck cards: ${unresolved.join(', ')}\n`);
    if (swaps.length > 0) {
      reportLines.push('| OUT | impact | IN | impact | power level after |');
      reportLines.push('|---|---|---|---|---|');
      for (const s of swaps) {
        reportLines.push(
          `| ${s.out.name} | ${s.out.impact.toFixed(2)} | ${s.in.name} | ${s.in.impact.toFixed(2)} | ${s.powerLevelAfter.toFixed(2)} |`,
        );
      }
      reportLines.push('');
      const biggest = swaps
        .slice()
        .sort((a, b) => b.in.impact - b.out.impact - (a.in.impact - a.out.impact))
        .slice(0, 3);
      reportLines.push(`Three biggest single swaps: ${biggest.map((s) => `${s.out.name} → ${s.in.name} (+${(s.in.impact - s.out.impact).toFixed(2)} impact)`).join('; ')}\n`);
    } else {
      reportLines.push('No swap raised the power level by >= 0.01 — deck left unchanged.\n');
    }
  }

  // Global idle-pool table: highest-impact pool cards no deck used, across all commander identities checked.
  const allIdentities = DECKS.map((d) => ({
    key: d.key,
    identity: parseColorIdentity(db, d.commanderName),
  }));
  for (const [name, qty] of pool) {
    if (qty <= 0 || globalUsedNames.has(name) || BASIC_LANDS.has(name)) continue;
    const row = resolveCard(db, name);
    if (!row || isLandRow(row)) continue;
    const identity = parseColorIdentity(db, name);
    const legalForAny = allIdentities.some((d) => isSubsetIdentity(identity, d.identity));
    if (!legalForAny) continue;
    const input = toCardInput(name, 1, row);
    idleCandidates.push({ name, impact: singleCardImpact(input, []), identity });
  }
  idleCandidates.sort((a, b) => b.impact - a.impact);

  reportLines.push('### 25 highest-impact owned pool cards no deck used\n');
  reportLines.push('| Card | Impact | Color identity |');
  reportLines.push('|---|---|---|');
  for (const c of idleCandidates.slice(0, 25)) {
    reportLines.push(`| ${c.name} | ${c.impact.toFixed(2)} | ${c.identity.join('') || 'C'} |`);
  }
  reportLines.push('');

  const anyUnresolved = Object.entries(unresolvedAll).filter(([, v]) => v.length > 0);
  if (anyUnresolved.length > 0) {
    reportLines.push('### Unresolved cards\n');
    for (const [key, names] of anyUnresolved) reportLines.push(`- ${key}: ${names.join(', ')}`);
    reportLines.push('');
  }

  const section = [
    '## Iterations with owned cards (greedy, EDHPowerLevel score)',
    '',
    '_Power level algorithm by EDHPowerLevel.com_',
    '',
    ...reportLines,
  ].join('\n');

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.appendFileSync(REPORT_FILE, (fs.existsSync(REPORT_FILE) ? '\n' : '') + section + '\n');

  console.log(section);
}

main();
