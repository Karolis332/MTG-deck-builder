/**
 * Deck gate CLI — judge a decklist before it reaches a human.
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" \
 *     npx tsx scripts/deck-gate.ts <list.txt> --format brawl --owner 1
 *
 * Exits 1 when any check fails. See docs/DECK_GATE.md.
 */
import fs from 'fs';
import { gateDeck, type GateCheck, type GateVerdict } from '../src/lib/deck-gate';

interface Args {
  file: string;
  format: string;
  owner: number | null;
  source?: 'arena' | 'paper';
  locks: string[];
  before?: string;
  after?: string;
  json: boolean;
}

const VALUE_FLAGS = new Set(['format', 'owner', 'source', 'lock', 'before', 'after']);

function parseArgs(argv: string[]): Args {
  const values: Record<string, string[]> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const name = a.slice(2);
    if (VALUE_FLAGS.has(name)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`--${name} needs a value`);
      (values[name] ??= []).push(value);
    }
  }
  const first = (name: string): string | undefined => values[name]?.[0];
  const rawSource = first('source');
  if (rawSource && rawSource !== 'arena' && rawSource !== 'paper') {
    throw new Error(`--source must be arena or paper, got "${rawSource}"`);
  }
  const source = rawSource as 'arena' | 'paper' | undefined;
  const owner = first('owner');
  return {
    file: positional[0] ?? '',
    format: first('format') ?? 'commander',
    owner: owner === undefined ? null : Number(owner),
    source,
    locks: values.lock ?? [],
    before: first('before'),
    after: first('after'),
    json: argv.includes('--json'),
  };
}

/** Card names from a decklist file, for the --before/--after lock comparison. */
function namesOf(file: string): string[] {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^\d+x?\s+/, ''))
    .filter((l) => l && !/^(commander|deck|sideboard|companion|about)s?:?$/i.test(l) && !/^name\s/i.test(l));
}

const GLYPH: Record<GateCheck['status'], string> = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };

function printTable(v: GateVerdict, file: string): void {
  const t = v.totals;
  console.log(`file      : ${file}`);
  console.log(`format    : ${v.format}   commander: ${v.commander ?? '(none)'}`);
  console.log(
    `totals    : ${t.cards} cards | ${t.lands} lands (${t.effectiveLands} eff.) | ${t.nonland} nonland | avg MV ${t.avgMv}`
  );
  console.log(`curve     : ${Object.keys(v.curve).sort().map((k) => `${k}:${v.curve[Number(k)]}`).join(' ')}`);
  console.log(`VERDICT   : ${GLYPH[v.verdict]}`);
  console.log('');
  for (const c of v.checks) {
    console.log(`  ${GLYPH[c.status]}  ${c.id.padEnd(11)} ${c.detail}`);
    if (c.status !== 'pass' && c.cards?.length) {
      for (const name of c.cards) console.log(`        - ${name}`);
    }
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('usage: deck-gate.ts <list.txt> --format <fmt> [--owner <id>] [--source arena|paper] [--lock "Name"] [--before a.txt --after b.txt] [--json]');
    process.exit(2);
  }
  if (!fs.existsSync(args.file)) {
    console.error(`no such file: ${args.file}`);
    process.exit(2);
  }
  if (args.owner !== null && !Number.isInteger(args.owner)) {
    console.error('--owner must be an integer user id');
    process.exit(2);
  }

  const verdict = gateDeck(fs.readFileSync(args.file, 'utf8'), {
    format: args.format,
    ownerId: args.owner,
    source: args.source,
    locks: args.locks,
    before: args.before ? namesOf(args.before) : undefined,
    after: args.after ? namesOf(args.after) : undefined,
  });

  if (args.json) console.log(JSON.stringify(verdict, null, 2));
  else printTable(verdict, args.file);

  process.exit(verdict.verdict === 'fail' ? 1 : 0);
}

main();
