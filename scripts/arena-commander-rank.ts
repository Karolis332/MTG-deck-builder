/**
 * Rank Brawl commanders the user actually owns on Arena, for a given colour
 * identity and archetype, using the local model data + the EDHPowerLevel port.
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/arena-commander-rank.ts \
 *     --ci UBR --archetype spellslinger --top 10 --out verify-2026-09-12/grixis-rank.md
 *
 * For each candidate it reports three independent signals:
 *   corpusDecks  — how many real decks the 3.9M-deck corpus has for that
 *                  commander (model support / proven-ness)
 *   coverage     — % of that commander's top-50 corpus cards the user owns on
 *                  Arena inside the identity (can this actually be built here?)
 *   power        — EDHPowerLevel score of a deck auto-built from the owned pool
 *                  by walking the commander's corpus inclusion ordering. This is
 *                  price+popularity driven, so it discriminates weakly between
 *                  commanders sharing a pool — reported, not trusted alone.
 */
import fs from 'fs';
import { getDb } from '../src/lib/db';
import { computePowerLevel, type PowerLevelCardInput } from '../src/lib/power-level-edhpl';
import { resolveCard, toCardInput } from './power-level';

interface Args { ci: string; archetype: string; top: number; out: string; minColors: number }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (f: string, d: string) => { const i = a.indexOf(f); return i > -1 ? a[i + 1] : d; };
  return {
    ci: get('--ci', 'UBR').toUpperCase(),
    archetype: get('--archetype', 'spellslinger'),
    top: Number(get('--top', '10')),
    out: get('--out', ''),
    minColors: Number(get('--min-colors', '2')),
  };
}

const BASIC_FOR: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };

/** Weighted oracle-text signals for "this commander wants a deck full of spells". */
const SPELLSLINGER_SIGNALS: Array<[RegExp, number, string]> = [
  [/magecraft/i, 4, 'magecraft'],
  [/whenever you cast an instant or sorcery( spell)?/i, 4, 'cast-instant/sorcery trigger'],
  [/whenever you cast a noncreature spell/i, 4, 'cast-noncreature trigger'],
  [/whenever you cast your (first|second) spell/i, 3, 'first/second-spell trigger'],
  [/whenever you cast a spell\b/i, 4, 'cast-any-spell trigger'],
  [/copy (target|that) (instant or sorcery|instant|sorcery)/i, 3, 'spell copying'],
  [/(instant|sorcery|noncreature|instant and sorcery)[^.]{0,40}cost \{\d+\} less/i, 3, 'spell cost reduction'],
  [/instant (and\/or|and|or) sorcery cards? (in|from) your graveyard/i, 2, 'spells-in-yard payoff'],
  [/whenever you (draw|cast)[^.]{0,30}(second|additional)/i, 2, 'extra-draw/cast payoff'],
  [/storm|flashback|jump-?start|rebound/i, 2, 'spell recursion'],
  [/prowess/i, 1, 'prowess'],
  [/\bdraw(s)? (a|two|three) cards?\b/i, 1, 'card flow'],
  [/deals? \d+ damage to (each opponent|any target|target player)/i, 1, 'reach/ping'],
];

function fitScore(oracle: string): { score: number; hits: string[] } {
  const hits: string[] = [];
  let score = 0;
  for (const [re, w, label] of SPELLSLINGER_SIGNALS) {
    if (re.test(oracle)) { score += w; hits.push(label); }
  }
  return { score, hits };
}

function identityOf(json: string | null): string {
  try { return (JSON.parse(json || '[]') as string[]).sort().join(''); } catch { return ''; }
}

function main() {
  const args = parseArgs();
  const want = args.ci.split('').sort().join('');
  const db = getDb();

  const ownedRows = db.prepare(`
    SELECT c.name, c.mana_cost, c.cmc, c.type_line, c.oracle_text, c.color_identity, c.legalities, c.edhrec_rank
    FROM collection col JOIN cards c ON c.id = col.card_id
    WHERE col.user_id = 1 AND col.source = 'arena' GROUP BY c.name`).all() as Array<Record<string, any>>;

  const brawlLegal = ownedRows.filter((r) => {
    try { return JSON.parse(r.legalities).brawl === 'legal'; } catch { return false; }
  });
  const inIdentity = (r: Record<string, any>, ci: string) =>
    identityOf(r.color_identity).split('').every((x) => ci.includes(x));

  const candidates = brawlLegal.filter((r) => {
    if (!/Legendary/.test(r.type_line) || !/Creature/.test(r.type_line)) return false;
    const id = identityOf(r.color_identity);
    return id.length >= args.minColors && id.split('').every((x) => want.includes(x));
  });

  const corpus = db.prepare(`
    SELECT commander_name, MAX(total_commander_decks) d FROM commander_card_stats GROUP BY 1`).all() as Array<{ commander_name: string; d: number }>;
  const corpusDecks = new Map(corpus.map((c) => [c.commander_name.split(' // ')[0].toLowerCase(), c.d]));
  const topCardsStmt = db.prepare(`
    SELECT card_name, inclusion_rate FROM commander_card_stats
    WHERE commander_name = ? OR commander_name LIKE ? || ' // %'
    ORDER BY inclusion_rate DESC`);

  const ownedNames = new Set(brawlLegal.flatMap((r) => [r.name.toLowerCase(), r.name.split(' // ')[0].toLowerCase()]));

  const results = candidates.map((cmd) => {
    const front = cmd.name.split(' // ')[0];
    // Alchemy rebalances ("A-Vivi Ornitier") are the Arena-legal version of a paper card; the
    // paper corpus only knows the base name, so look model data up under that.
    const corpusKey = front.replace(/^A-/, '');
    const fit = fitScore(cmd.oracle_text || '');
    const id = identityOf(cmd.color_identity);
    const decks = corpusDecks.get(corpusKey.toLowerCase()) || 0;
    const stats = topCardsStmt.all(corpusKey, corpusKey) as Array<{ card_name: string; inclusion_rate: number }>;
    const top50 = stats.filter((s) => !/^(Swamp|Island|Mountain|Plains|Forest)$/.test(s.card_name)).slice(0, 50);
    const coverage = top50.length ? top50.filter((s) => ownedNames.has(s.card_name.toLowerCase())).length / top50.length : 0;

    // Model-build a 100 from the owned pool, corpus ordering first.
    const pool = brawlLegal.filter((r) => inIdentity(r, id) && r.name !== cmd.name);
    const poolByName = new Map(pool.map((r) => [r.name.toLowerCase(), r]));
    const picked: string[] = [];
    const used = new Set<string>();
    const isLand = (r: Record<string, any>) => /Land/.test(r.type_line);
    const isBasic = (r: Record<string, any>) => /Basic Land/.test(r.type_line);
    let nonland = 0, nonbasicLand = 0;
    const take = (r: Record<string, any>) => {
      if (used.has(r.name) || isBasic(r)) return;
      if (isLand(r)) { if (nonbasicLand >= 22) return; nonbasicLand++; } else { if (nonland >= 63) return; nonland++; }
      used.add(r.name); picked.push(r.name);
    };
    for (const s of stats) { const r = poolByName.get(s.card_name.toLowerCase()); if (r) take(r); }
    for (const r of [...pool].sort((a, b) => (a.edhrec_rank ?? 1e9) - (b.edhrec_rank ?? 1e9))) take(r);

    const basicsNeeded = 99 - picked.length;
    const colors = id.split('');
    const lines = [`1 ${front}`, ...picked.map((n) => `1 ${n.split(' // ')[0]}`)];
    colors.forEach((c, i) => {
      const n = Math.floor(basicsNeeded / colors.length) + (i < basicsNeeded % colors.length ? 1 : 0);
      if (n > 0) lines.push(`${n} ${BASIC_FOR[c]}`);
    });

    const inputs: PowerLevelCardInput[] = [];
    for (const line of lines) {
      const m = line.match(/^(\d+) (.+)$/)!;
      const row = resolveCard(db, m[2]);
      if (row) inputs.push(toCardInput(m[2], Number(m[1]), row));
    }
    const pl = computePowerLevel(inputs, [front]);

    return {
      name: front,
      manaCost: cmd.mana_cost,
      identity: id,
      exactMatch: id === want,
      fit: fit.score,
      fitHits: fit.hits,
      corpusDecks: decks,
      coverage: Math.round(coverage * 100),
      power: Number(pl.powerLevel.toFixed(2)),
      bracket: pl.bracket,
      efficiency: Number(pl.efficiency.toFixed(2)),
      deckLines: lines,
      oracle: (cmd.oracle_text || '').replace(/\n/g, ' / ').slice(0, 200),
    };
  }).filter((r) => r.fit >= 4);

  // Composite: model support (log-scaled), buildability from the collection,
  // archetype fit, and the EDHPL power identifier — all normalised 0-1.
  const maxDecks = Math.max(1, ...results.map((r) => r.corpusDecks));
  const maxFit = Math.max(1, ...results.map((r) => r.fit));
  const maxPower = Math.max(1, ...results.map((r) => r.power));
  for (const r of results as any[]) {
    const support = Math.log10(1 + r.corpusDecks) / Math.log10(1 + maxDecks);
    r.composite = Number((100 * (0.30 * support + 0.25 * (r.coverage / 100) + 0.25 * (r.fit / maxFit) + 0.20 * (r.power / maxPower))).toFixed(1));
  }
  results.sort((a: any, b: any) => b.composite - a.composite);

  const top = results.slice(0, args.top);
  const md = [
    `# Arena Brawl commanders in the collection — identity within ${want}, archetype ${args.archetype}`,
    '',
    `Candidates scanned: ${candidates.length} owned legendary creatures inside ${want} (>= ${args.minColors} colours).`,
    `Passing the archetype filter (fit >= 4): ${results.length}.`,
    `Exact ${want} identity owned: ${results.filter((r) => r.exactMatch).length}.`,
    '',
    '| # | Commander | Cost | ID | Power (EDHPL) | Bracket | Corpus decks | Collection coverage | Fit | Composite |',
    '|---|-----------|------|----|---------------|---------|--------------|---------------------|-----|-----------|',
    ...top.map((r: any, i) => `| ${i + 1} | ${r.name}${r.exactMatch ? ' **(true ' + want + ')**' : ''} | ${r.manaCost} | ${r.identity} | ${r.power} | ${r.bracket} | ${r.corpusDecks.toLocaleString()} | ${r.coverage}% | ${r.fit} | ${r.composite} |`),
    '',
    '## Detail',
    ...top.map((r: any, i) => `\n### ${i + 1}. ${r.name} ${r.manaCost} (${r.identity})\n- signals: ${r.fitHits.join(', ')}\n- oracle: ${r.oracle}\n- model-built deck: \`verify-2026-09-12/built/${r.name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.txt\``),
  ].join('\n');

  fs.mkdirSync('verify-2026-09-12/built', { recursive: true });
  for (const r of top as any[]) {
    fs.writeFileSync(`verify-2026-09-12/built/${r.name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.txt`, r.deckLines.join('\n') + '\n');
  }
  if (args.out) fs.writeFileSync(args.out, md + '\n');
  console.log(md);
}

main();
