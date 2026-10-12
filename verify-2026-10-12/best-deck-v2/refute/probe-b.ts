/** Refuter probe B (read-only): Illuminor Szeras' screen objective vs the returned top 10. */
import { loadOwned } from '../../../scripts/best-deck-lib';
import { runBestDeck, preRankCommanders } from '../../../src/lib/best-deck-run';
import { isCommander, resolveCard } from '../../../src/lib/best-deck';
async function main(): Promise<void> {
  const owned = loadOwned('paper').cards.map((c) => ({ name: c.name }));
  const ill = resolveCard('Illuminor Szeras')!;
  console.log(`resolve: ${ill.name} | type ${ill.type_line} | isCommander ${isCommander(ill, 'commander')} | in owned list ${owned.some((o) => o.name === ill.name)}`);
  const ownedCards = [...new Map(owned.map((o) => resolveCard(o.name)).filter(Boolean).map((c) => [c!.name, c!])).values()];
  const ownedNames = new Set(ownedCards.map((c) => c.name));
  const ranked = preRankCommanders(ownedCards.filter((c) => isCommander(c, 'commander')), ownedNames);
  console.log(`pre-rank: ${ranked.length} candidates, Illuminor at index ${ranked.findIndex((r) => r.card.name === ill.name)}`);
  const r1 = await runBestDeck({ owned, budgetUsd: 50, commanderName: ill.name }, undefined, { games: 100, maxPasses: 0, deadlineMs: 900_000 });
  console.log(`Illuminor seed (= screen) objective ${r1.objective.toFixed(2)}`);
  const r2 = await runBestDeck({ owned, budgetUsd: 50 }, undefined, { games: 100, maxPasses: 0, deadlineMs: 900_000 });
  r2.commanders.forEach((c, i) => console.log(`  #${i + 1} ${c.name} ${c.screenObjective.toFixed(2)}`));
}
main().catch((e) => { console.error(e); process.exit(1); });
