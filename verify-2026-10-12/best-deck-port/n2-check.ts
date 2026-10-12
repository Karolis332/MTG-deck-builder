import { runBestDeck } from '../../src/lib/best-deck-run';
import { BASIC_RE } from '../../src/lib/best-deck';
const t = Date.now();
void (async () => {
const r = await runBestDeck({ commanderName: 'Krenko, Mob Boss', budgetUsd: 10 }, undefined, { games: 40, maxPasses: 1 });
const names = r.deck.map((c: { name: string }) => c.name);
const basics = names.filter((n: string) => BASIC_RE.test(n)).length;
console.log(JSON.stringify({ cards: names.length, basics, nonbasics: names.length - basics, buyUsd: r.buyUsd, s: Math.round((Date.now() - t) / 1000) }));
})();
