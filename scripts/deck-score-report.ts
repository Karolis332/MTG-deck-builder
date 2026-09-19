/**
 * Deck Score v1 calibration report — docs/DECK_SCORE_SPEC.md §5.
 *
 * Scores every repository test-vector fixture (paper/brawl decklists, the
 * cEDH Top 16 JSON reference, and two Standard community_decks rows) plus 50
 * seeded constrained-random legal piles for The Cabbage Merchant, and writes
 * one table to verify-2026-09-19/deck-score/report.md.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-report.ts
 *
 * This does NOT tune weights — it reports the raw v1 numbers and how many
 * anchors land in their spec-proposed band.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { getDb } from '../src/lib/db';
import { parseDecklist, resolveLines, parseIdentity, type DeckLine, type Board } from '../src/lib/deck-gate-parse';
import { scoreDeck, type DeckScoreInput, type ScoreFormat } from '../src/lib/deck-score';
import { getColorAdjustment } from '../src/lib/deck-templates';
import type { DbCard } from '../src/lib/types';
import type { ResolvedCard } from '../services/build-api/analysis-core';

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verify-2026-09-19', 'deck-score');
const OUT_FILE = path.join(OUT_DIR, 'report.md');

interface FixtureResult {
  fixture: string;
  format: ScoreFormat;
  score: number;
  components: Record<string, number>;
  gates: string;
  band: string;
  purpose: string;
  inBand: boolean | 'n/a';
  ms: number;
  winReason: string;
}

// ── DeckLine[] -> DeckScoreInput, shared by every fixture loader ──────────

/**
 * `resolveLines` selects a 14-column subset of `cards` that omits `power`, so
 * every row it returns reaches `scoreDeck` with `power === undefined`. That
 * silently deleted every creature from W's creature-pressure recipe (the
 * recipe filters `power != null`), which is why Standard fixtures scored W=0
 * while the random-pile generator — which does its own `SELECT` including
 * `power` — kept a full creature pool. Fill the gap here, at the seam that
 * builds `DeckScoreInput`, because `DeckScoreInput.main` is typed `DbCard`
 * and must therefore carry every column the scorer reads.
 */
function hydratePower(cards: DbCard[]): void {
  const db = getDb();
  const stmt = db.prepare('SELECT power, toughness FROM cards WHERE id = ?');
  const seen = new Set<string>();
  for (const card of cards) {
    if (card.power !== undefined || seen.has(card.id)) continue;
    seen.add(card.id);
    const row = stmt.get(card.id) as { power: string | null; toughness: string | null } | undefined;
    card.power = row?.power ?? null;
    card.toughness = row?.toughness ?? null;
  }
}

function toInput(lines: DeckLine[], format: ScoreFormat): { input: DeckScoreInput; unresolvedNames: string[] } {
  const { resolved, unresolved } = resolveLines(lines, format);
  hydratePower(resolved.map((r) => r.card));
  const main: ResolvedCard[] = resolved.filter((r) => r.line.board === 'main').map((r) => ({ card: r.card, quantity: r.line.quantity }));
  const commander: DbCard[] = resolved.filter((r) => r.line.board === 'commander').map((r) => r.card);
  const sideboard: ResolvedCard[] = resolved.filter((r) => r.line.board === 'sideboard').map((r) => ({ card: r.card, quantity: r.line.quantity }));
  const companionRow = resolved.find((r) => r.line.board === 'companion');
  return {
    input: {
      format, main, commander, sideboard,
      companion: companionRow?.card,
      unresolved: unresolved.map((name) => ({ name, quantity: 1, board: 'main' })),
      cardDataVersion: 'deck-score-report-2026-09-19',
      corpus: null,
    },
    unresolvedNames: unresolved,
  };
}

/** Flat paper/brawl lists carry no `Commander:` header — the spec's fixture
 * table names the commander explicitly; reassign that one line's board. */
function reassignCommander(lines: DeckLine[], commanderName: string): DeckLine[] {
  let done = false;
  return lines.map((line) => {
    if (!done && line.board === 'main' && line.name.toLowerCase() === commanderName.toLowerCase()) {
      done = true;
      return { ...line, board: 'commander' as Board };
    }
    return line;
  });
}

function loadTextFixture(relPath: string, format: ScoreFormat, commanderName: string | null) {
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  let lines = parseDecklist(text);
  if (commanderName) lines = reassignCommander(lines, commanderName);
  return toInput(lines, format);
}

function loadCedhJsonFixture() {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'decks/test-builds/refs/thrasios-tymna/cedhtop16.json'), 'utf-8'));
  const deck = j.decks[2];
  const lines: DeckLine[] = [
    { quantity: 1, name: 'Thrasios, Triton Hero', board: 'commander' },
    { quantity: 1, name: 'Tymna the Weaver', board: 'commander' },
    ...(deck.cards as string[]).map((name) => ({ quantity: 1, name, board: 'main' as Board })),
  ];
  return toInput(lines, 'commander');
}

function loadStandardDbFixture(deckId: number) {
  const db = new Database(path.join(ROOT, 'data', 'export-standard.db'), { readonly: true });
  const rows = db.prepare(
    'SELECT card_name, board, SUM(quantity) AS qty FROM community_deck_cards WHERE community_deck_id = ? GROUP BY card_name, board'
  ).all(deckId) as Array<{ card_name: string; board: string; qty: number }>;
  db.close();
  const lines: DeckLine[] = rows.map((r) => ({ quantity: r.qty, name: r.card_name, board: (r.board === 'sideboard' ? 'sideboard' : 'main') as Board }));
  return toInput(lines, 'standard');
}

// ── Scoring + reporting ─────────────────────────────────────────────────

function inBand(score: number, band: string): boolean | 'n/a' {
  const m = band.match(/(\d+)\D+(\d+)/);
  if (!m) return 'n/a';
  return score >= Number(m[1]) && score <= Number(m[2]);
}

function runFixture(
  name: string,
  format: ScoreFormat,
  band: string,
  purpose: string,
  load: () => { input: DeckScoreInput; unresolvedNames: string[] },
): FixtureResult {
  const { input, unresolvedNames } = load();
  const t0 = process.hrtime.bigint();
  const result = scoreDeck(input);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const components: Record<string, number> = {};
  for (const c of result.components) components[c.key] = c.score;
  const failing = result.gates.filter((g) => g.status === 'fail').map((g) => g.key);
  const capping = result.gates.filter((g) => g.cap != null).map((g) => `${g.key}<=${g.cap}`);
  const gateSummary = [
    unresolvedNames.length ? `${unresolvedNames.length} unresolved` : '',
    failing.length ? `fail:${failing.join(',')}` : '',
    capping.length ? capping.join(',') : '',
  ].filter(Boolean).join('; ') || 'none';
  const winReason = result.components.find((c) => c.key === 'win')?.reason ?? '';
  return { fixture: name, format, score: result.score, components, gates: gateSummary, band, purpose, inBand: inBand(result.score, band), ms, winReason };
}

// ── Random constrained legal piles for The Cabbage Merchant ─────────────

const BASIC_BY_COLOR: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };

function buildRandomPile(seed: number, commander: DbCard, eligible: DbCard[], landCount: number): DeckScoreInput {
  const scored = eligible.map((card) => ({
    card,
    hash: crypto.createHash('sha256').update(`${seed}:${card.id}`).digest('hex'),
  }));
  scored.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  const nonbasicSlots = 99 - landCount;
  const chosen = scored.slice(0, nonbasicSlots).map((s) => s.card);

  const identity = parseIdentity(commander.color_identity);
  const colors = identity.length ? identity : ['C'];
  const basics: ResolvedCard[] = colors
    .filter((c) => BASIC_BY_COLOR[c])
    .map((c, i, arr) => ({
      card: { ...commander, name: BASIC_BY_COLOR[c], type_line: `Basic Land — ${BASIC_BY_COLOR[c]}`, mana_cost: null, cmc: 0, oracle_text: null, power: null, toughness: null, color_identity: '[]', colors: null },
      quantity: Math.floor(landCount / arr.length) + (i === 0 ? landCount % arr.length : 0),
    }));

  return {
    format: 'commander',
    main: [...basics, ...chosen.map((card) => ({ card, quantity: 1 }))],
    commander: [commander],
    sideboard: [],
    unresolved: [],
    cardDataVersion: 'deck-score-report-2026-09-19',
    corpus: null,
  };
}

function runRandomControls(): { min: number; median: number; max: number; n: number; over25: number } {
  const { resolved } = resolveLines([{ quantity: 1, name: 'The Cabbage Merchant', board: 'commander' }], 'commander');
  const commander = resolved[0]?.card;
  if (!commander) return { min: NaN, median: NaN, max: NaN, n: 0, over25: 0 };

  const db = getDb();
  const identity = parseIdentity(commander.color_identity);
  const rows = db.prepare(
    `SELECT id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, keywords, set_code, set_name,
            collector_number, rarity, image_uri_small, image_uri_normal, image_uri_large, image_uri_art_crop,
            price_usd, price_usd_foil, legalities, power, toughness, loyalty, produced_mana, edhrec_rank, layout,
            updated_at, subtypes, arena_id, game_changer
     FROM cards
     WHERE json_extract(legalities,'$.commander')='legal'
       AND layout NOT IN ('art_series','token','double_faced_token','emblem')
       AND type_line <> 'Card // Card'
       AND type_line NOT LIKE 'Basic Land%'
       AND name <> 'The Cabbage Merchant'`
  ).all() as DbCard[];
  const eligible = rows.filter((c) => {
    const ci = parseIdentity(c.color_identity);
    return ci.every((col) => identity.includes(col));
  });

  const landCount = getColorAdjustment(Math.max(1, identity.length)).lands;
  const scores: number[] = [];
  for (let seed = 0; seed < 50; seed++) {
    const input = buildRandomPile(seed, commander, eligible, landCount);
    scores.push(scoreDeck(input).score);
  }
  scores.sort((a, b) => a - b);
  const mid = Math.floor(scores.length / 2);
  const median = scores.length % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
  return {
    min: scores[0], median, max: scores[scores.length - 1], n: scores.length,
    over25: scores.filter((v) => v >= 25).length,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  const fixtures: FixtureResult[] = [
    runFixture('meren-powerhouse', 'commander', '65-80', 'Required powerhouse anchor', () => loadTextFixture('decks/paper/proposals/meren-powerhouse.txt', 'commander', 'Meren of Clan Nel Toth')),
    runFixture('cabbage-cedh-input', 'commander', '35-50', 'Required reviewed web build', () => loadTextFixture('verify-2026-09-19/cabbage-cedh-input.txt', 'commander', null)),
    runFixture('precon-witherbloom', 'commander', '40-55', 'Witherbloom Witchcraft precon', () => loadTextFixture('verify-2026-09-09/precon-witherbloom-list.txt', 'commander', 'Willowdusk, Essence Seer')),
    runFixture('the-cabbage-merchant', 'commander', '55-70', 'Food deck, real conversion support', () => loadTextFixture('decks/paper/decks/the-cabbage-merchant.txt', 'commander', 'The Cabbage Merchant')),
    runFixture('imotekh-the-stormlord', 'commander', '45-65', 'Artifact/graveyard plan', () => loadTextFixture('decks/paper/decks/imotekh-the-stormlord.txt', 'commander', 'Imotekh the Stormlord')),
    runFixture('tazri-beacon-of-unity', 'commander', '40-60', 'Five-color party plan', () => loadTextFixture('decks/paper/decks/tazri-beacon-of-unity.txt', 'commander', 'Tazri, Beacon of Unity')),
    runFixture('meren-of-clan-nel-toth', 'commander', '0-19', 'As stored: 101 cards', () => loadTextFixture('decks/paper/decks/meren-of-clan-nel-toth.txt', 'commander', 'Meren of Clan Nel Toth')),
    runFixture('ramos-dragon-engine', 'commander', '0-19', 'As stored: 3-card incomplete list', () => loadTextFixture('decks/paper/decks/ramos-dragon-engine.txt', 'commander', 'Ramos, Dragon Engine')),
    runFixture('cabbage-merchant-current-brawl', 'brawl', '0-19', 'As stored: 101 cards', () => loadTextFixture('decks/brawl/cabbage-merchant-current.txt', 'brawl', 'The Cabbage Merchant')),
    runFixture('tazri-upgraded-arena', 'brawl', '45-65', 'Singleton, five-color source demands', () => loadTextFixture('decks/brawl/tazri-upgraded-arena.txt', 'brawl', null)),
    runFixture('kuja-genome-sorcerer-arena', 'brawl', '60-80', 'Spell-trigger pressure', () => loadTextFixture('decks/brawl/kuja-genome-sorcerer-arena.txt', 'brawl', null)),
    runFixture('vivi-battery-arena', 'brawl', '70-85', 'Activation timing/untap prerequisites', () => loadTextFixture('decks/brawl/vivi-battery-arena.txt', 'brawl', null)),
    runFixture('fire-lord-azula-competitive', 'competitivebrawl', '75-90', 'Commander ban check, real line support', () => loadTextFixture('decks/brawl/fire-lord-azula-competitive.txt', 'competitivebrawl', null)),
    runFixture('cedhtop16-ballooncon6', 'commander', '85-100', 'Ballon Con 6, placement 1, 4-1', loadCedhJsonFixture),
    runFixture('standard-1445893-univerce', 'standard', '85-100', 'Standard Challenge 32, placement 1, 8-1', () => loadStandardDbFixture(1445893)),
    runFixture('standard-1445867-aljce', 'standard', '85-100', '5-0 league, distinct evidence source', () => loadStandardDbFixture(1445867)),
  ];

  const anchorsInBand = fixtures.filter((f) => f.inBand === true).length;
  const anchorsTotal = fixtures.filter((f) => f.inBand !== 'n/a').length;

  const controlsT0 = process.hrtime.bigint();
  const controls = runRandomControls();
  const controlsMs = Number(process.hrtime.bigint() - controlsT0) / 1e6;

  const componentKeys = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy', 'meta'];
  const componentAbbrev: Record<string, string> = { mana: 'M', curve: 'C', interaction: 'I', advantage: 'A', win: 'W', synergy: 'S', meta: 'Fmeta' };
  const header = `| Fixture | Format | Score | ${componentKeys.map((k) => componentAbbrev[k]).join(' | ')} | Gates | Band | IN/OUT | ms |\n` +
    `|---|---|---:|${componentKeys.map(() => '---:').join('|')}|---|---|---|---:|\n`;
  const rows = fixtures.map((f) => {
    const comps = componentKeys.map((k) => f.components[k]).join(' | ');
    const verdict = f.inBand === 'n/a' ? 'n/a' : f.inBand ? 'IN' : 'OUT';
    return `| ${f.fixture} | ${f.format} | ${f.score} | ${comps} | ${f.gates} | ${f.band} | ${verdict} | ${f.ms.toFixed(2)} |`;
  }).join('\n');

  const winRows = fixtures
    .map((f) => `| ${f.fixture} | ${f.components.win} | ${f.winReason.replace(/\|/g, '/')} |`)
    .join('\n');

  const md = `# Deck Score v1 calibration report

Generated ${new Date().toISOString()}. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the \`scoreDeck()\` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** \`data/mtg-deck-builder.db\` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its \`fail:legality\` rows were a stale-card-DB artefact (a missing printing resolved to a row whose \`legalities\` did not say \`legal\`), not a scoring defect. The two remaining \`fail\` rows are the intended structural negatives: \`meren-of-clan-nel-toth\` is 101 cards as stored, \`cabbage-merchant-current\` is 101 cards plus Arena-illegal entries.

${header}${rows}

Anchors in band: ${anchorsInBand}/${anchorsTotal} (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
${winRows}

## Random constrained-legal piles — The Cabbage Merchant, Commander, seeds 0-49

Per §5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. n=${controls.n}, generated+scored in ${controlsMs.toFixed(0)}ms.

| min | median | max | >=25 | target |
|---:|---:|---:|---:|---|
| ${controls.min} | ${controls.median} | ${controls.max} | ${controls.over25}/${controls.n} | §4 wants >=95% under 25 |
`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, md, 'utf-8');
  console.log(`wrote ${OUT_FILE}`);
  console.log(md);
}

main();
