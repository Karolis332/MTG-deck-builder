/**
 * Deck-sample training data generator.
 *
 * Builds decks for the most-scraped commanders, checks every pick against
 * community consensus (commander_card_stats — inclusion rates aggregated from
 * the scraped deck corpus), and emits a supervised dataset for tuning the
 * scoring engine.
 *
 * Output (data/training/):
 *   deck-eval-<date>.jsonl  — one row per (commander, card) in the union of
 *                             [our 99] ∪ [top community cards]:
 *                             {commander, card, picked, inclusionRate,
 *                              synergyScore, cmc, isLand, category}
 *   summary-<date>.csv      — per-commander agreement metrics
 *
 * Metrics:
 *   consensusPrecision — share of our nonland picks the community also plays (>=10% inclusion)
 *   consensusRecall50  — share of the community's top-50 cards we picked
 *   fillerRate         — share of our picks with <2% inclusion AND edhrec_rank > 5000
 *
 * Usage: npx tsx scripts/generate-training-data.ts [--sample N] [--format commander]
 */
import fs from 'fs';
import path from 'path';
import { autoBuildDeck } from '../src/lib/deck-builder-ai';
import { classifyCard, getPrimaryCategory } from '../src/lib/card-classifier';
import { getDb } from '../src/lib/db';

const argIdx = process.argv.indexOf('--sample');
const SAMPLE = argIdx > -1 ? parseInt(process.argv[argIdx + 1], 10) : 25;
const offIdx = process.argv.indexOf('--offset');
const OFFSET = offIdx > -1 ? parseInt(process.argv[offIdx + 1], 10) : 0;
const fmtIdx = process.argv.indexOf('--format');
const FORMAT = fmtIdx > -1 ? process.argv[fmtIdx + 1] : 'commander';
const OUT_DIR = path.join(process.cwd(), 'data', 'training');
const DATE = new Date().toISOString().slice(0, 10);
const SHARD = OFFSET > 0 ? `-o${OFFSET}` : '';

interface StatRow { card_name: string; inclusion_rate: number; synergy_score: number }

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const db = getDb();

  // Commanders with the deepest scraped-deck signal, legal in target format
  const commanders = db.prepare(`
    SELECT s.commander_name, MAX(s.deck_count) AS decks
    FROM commander_card_stats s
    JOIN cards c ON c.name = s.commander_name
    WHERE c.legalities LIKE '%"${FORMAT === 'commander' ? 'commander' : 'brawl'}":"legal"%'
    GROUP BY s.commander_name
    ORDER BY decks DESC
    LIMIT ? OFFSET ?
  `).all(SAMPLE, OFFSET) as Array<{ commander_name: string; decks: number }>;

  console.log(`Sampling ${commanders.length} commanders (format=${FORMAT}, offset=${OFFSET})`);

  const jsonlPath = path.join(OUT_DIR, `deck-eval-${DATE}${SHARD}.jsonl`);
  const csvPath = path.join(OUT_DIR, `summary-${DATE}${SHARD}.csv`);
  const jsonl = fs.createWriteStream(jsonlPath);
  const csv: string[] = ['commander,decks,picks,consensusPrecision,consensusRecall50,fillerRate,elapsedMs'];

  const statStmt = db.prepare(`
    SELECT card_name, inclusion_rate, synergy_score
    FROM commander_card_stats WHERE commander_name = ?
    ORDER BY inclusion_rate DESC LIMIT 300
  `);
  const cardStmt = db.prepare('SELECT cmc, type_line, oracle_text, edhrec_rank FROM cards WHERE name = ? LIMIT 1');

  for (const { commander_name, decks } of commanders) {
    const started = Date.now();
    let picks: Array<{ name: string; isLand: boolean; cmc: number; category: string; edhrecRank: number | null }> = [];
    let scoredPool: Array<{ name: string; score: number; components: Record<string, number> }> = [];
    try {
      const result = await autoBuildDeck({ format: FORMAT, colors: [], commanderName: commander_name, captureComponents: true });
      scoredPool = result.scoredPool ?? [];
      picks = result.cards
        .filter((e) => e.board === 'main')
        .map((e) => ({
          name: e.card.name,
          isLand: (e.card.type_line || '').split('//')[0].includes('Land'),
          cmc: e.card.cmc ?? 0,
          category: getPrimaryCategory(classifyCard(e.card.name, e.card.oracle_text || '', e.card.type_line || '', e.card.cmc ?? 0)),
          edhrecRank: e.card.edhrec_rank ?? null,
        }));
    } catch (err) {
      console.log(`SKIP ${commander_name}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const stats = statStmt.all(commander_name) as StatRow[];
    const statMap = new Map(stats.map((s) => [s.card_name.toLowerCase(), s]));
    const pickedSet = new Set(picks.map((p) => p.name.toLowerCase()));
    const poolMap = new Map(scoredPool.map((p) => [p.name.toLowerCase(), p]));

    // Dataset rows: union of our picks and community top cards
    const allNames = new Set<string>([...pickedSet, ...stats.map((s) => s.card_name.toLowerCase())]);
    for (const lower of allNames) {
      const pick = picks.find((p) => p.name.toLowerCase() === lower);
      const stat = statMap.get(lower);
      const name = pick?.name ?? stats.find((s) => s.card_name.toLowerCase() === lower)?.card_name ?? lower;
      let cmc = pick?.cmc;
      let category = pick?.category;
      if (!pick) {
        const row = cardStmt.get(name) as { cmc?: number; type_line?: string; oracle_text?: string } | undefined;
        cmc = row?.cmc ?? 0;
        category = row ? getPrimaryCategory(classifyCard(name, row.oracle_text || '', row.type_line || '', row.cmc ?? 0)) : 'utility';
      }
      const poolEntry = poolMap.get(lower);
      jsonl.write(JSON.stringify({
        commander: commander_name,
        commanderDecks: decks,
        card: name,
        picked: pick ? 1 : 0,
        inPool: poolEntry ? 1 : 0,
        poolScore: poolEntry ? Math.round(poolEntry.score * 10) / 10 : null,
        comp: poolEntry?.components ?? null,
        inclusionRate: stat ? Math.round(stat.inclusion_rate * 1000) / 1000 : 0,
        synergyScore: stat ? Math.round(stat.synergy_score * 1000) / 1000 : 0,
        cmc,
        isLand: pick?.isLand ?? false,
        category,
      }) + '\n');
    }

    // Metrics (nonland picks only — lands evaluated separately)
    const nonLandPicks = picks.filter((p) => !p.isLand);
    const inConsensus = nonLandPicks.filter((p) => (statMap.get(p.name.toLowerCase())?.inclusion_rate ?? 0) >= 0.10);
    const top50 = stats.filter((s) => {
      const row = cardStmt.get(s.card_name) as { type_line?: string } | undefined;
      return row && !(row.type_line || '').split('//')[0].includes('Land');
    }).slice(0, 50);
    const recalled = top50.filter((s) => pickedSet.has(s.card_name.toLowerCase()));
    const filler = nonLandPicks.filter((p) =>
      (statMap.get(p.name.toLowerCase())?.inclusion_rate ?? 0) < 0.02
      && (p.edhrecRank ?? 99999) > 5000
    );

    const precision = nonLandPicks.length ? inConsensus.length / nonLandPicks.length : 0;
    const recall = top50.length ? recalled.length / top50.length : 0;
    const fillerRate = nonLandPicks.length ? filler.length / nonLandPicks.length : 0;
    const elapsed = Date.now() - started;
    csv.push([commander_name.replace(/,/g, ';'), decks, picks.length,
      precision.toFixed(3), recall.toFixed(3), fillerRate.toFixed(3), elapsed].join(','));
    console.log(`${commander_name.padEnd(36)} prec=${precision.toFixed(2)} recall50=${recall.toFixed(2)} filler=${fillerRate.toFixed(2)} (${elapsed}ms)`);
  }

  // Await flush — process.exit() would otherwise drop buffered rows.
  await new Promise<void>((resolve, reject) => {
    jsonl.end((err: NodeJS.ErrnoException | null | undefined) => (err ? reject(err) : resolve()));
  });
  fs.writeFileSync(csvPath, csv.join('\n'));
  console.log(`\nWrote ${jsonlPath}\n      ${csvPath}`);
}

main().then(() => process.exit(0)).catch((err) => { console.error('FAILED:', err); process.exit(1); });
