/**
 * Fixture-driven check of the build-api /optimize engine against the local DB.
 * Not a unit test: prints the diagnosis for two real lists so a human can
 * eyeball cuts/adds/land targets.
 *
 *   npx tsx scripts/smoke-optimize.ts [--json]
 */
import fs from 'fs';
import path from 'path';
import { optimizeDeck } from '../services/build-api/optimize';

// The operator's Orzhov repartee Standard list as submitted on 2026-09-06
// (decks/standard/orzhov-repartee-optimized.md documents the hand analysis:
// 21 lands optimal, colour sources fine).
const ORZHOV_STANDARD = `About
Name Orzhov Repartee

Deck
4 Stirring Hopesinger
4 Scolding Administrator
3 Lecturing Scornmage
2 Informed Inkwright
2 Requisition Raid
3 Snooping Page
2 The Soul Stone
3 Erode
2 Dissection Practice
2 Killian's Confidence
4 Bitter Triumph
2 Elite Interceptor
2 Cost of Brilliance
2 Dig Site Inventory
2 Conciliator's Duelist
3 Plains
3 Swamp
1 Bleachbone Verge
2 Godless Shrine
2 Abandoned Air Temple
1 Concealed Courtyard
3 Shattered Sanctum
3 Fabled Passage
3 Multiversal Passage
`;

function krenkoList(): string {
  const file = path.join(__dirname, '..', 'decks', 'test-builds', 'mono-r-krenko--commander.txt');
  return fs.readFileSync(file, 'utf8');
}

interface Named { name: string; quantity?: number; reasons?: string[]; reason?: string; owned?: boolean }

function summarize(label: string, result: Record<string, unknown>): void {
  const stats = result.stats as { totalCards: number; landCount: number; avgCmc: number; colors: string[] };
  const land = result.landTarget as { current: number; recommended: number; effective: number; cheapSpells: number };
  const health = result.health as Array<{ label: string; current: number; status: string; target: { min: number; max: number } }>;
  const mana = result.mana as { warnings: string[]; sources: Record<string, number> };
  const cuts = result.cuts as Named[];
  const adds = result.adds as Named[];
  const swaps = result.swaps as Array<{ cut: string; add: string | null }>;
  const bracket = result.bracket as { bracket: number } | null;
  const analysis = result.analysis as { iss: number; winPlan: { route: string } } | null;

  console.log(`\n=== ${label} (${result.format}) — score ${result.score}, ${result.elapsedMs} ms`);
  console.log(`cards ${stats.totalCards}, lands ${stats.landCount} (effective ${land.effective}) → Karsten ${land.recommended}, avg MV ${stats.avgCmc}, cheap ${land.cheapSpells}, colours ${stats.colors.join('')}`);
  if (analysis) console.log(`ISS ${analysis.iss}, win route ${analysis.winPlan.route}, bracket ${bracket?.bracket}`);
  console.log('health:', health.filter((h) => h.status !== 'ok').map((h) => `${h.label} ${h.current} (${h.target.min}-${h.target.max}) ${h.status}`).join('; ') || 'all ok');
  console.log('mana sources:', JSON.stringify(mana.sources), mana.warnings.length ? `WARN ${mana.warnings.join(' | ')}` : 'ok');
  console.log(`legality issues: ${(result.legality as unknown[]).length}, unresolved: ${(result.unresolved as string[]).join(', ') || 'none'}`);
  console.log('cuts:');
  for (const c of cuts) console.log(`  - ${c.quantity} ${c.name}: ${(c.reasons || []).join('; ')}`);
  console.log('adds:');
  for (const a of adds) console.log(`  + ${a.quantity} ${a.name}${a.owned ? ' [owned]' : ''}: ${a.reason}`);
  console.log('swaps:', swaps.map((s) => `${s.cut} → ${s.add ?? '—'}`).join(' | '));
}

const asJson = process.argv.includes('--json');
const runs: Array<[string, Record<string, unknown>]> = [
  ['orzhov-standard', { format: 'standard', text: ORZHOV_STANDARD }],
  ['krenko-commander', { format: 'commander', text: krenkoList(), commanderName: 'Krenko, Mob Boss' }],
];
for (const [label, input] of runs) {
  const result = optimizeDeck(input);
  if (asJson) console.log(JSON.stringify({ label, result }, null, 1));
  else summarize(label, result);
}
