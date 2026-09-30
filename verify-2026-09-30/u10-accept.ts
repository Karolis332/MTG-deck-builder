import { autoBuildDeck } from '../src/lib/deck-builder-ai';
import { getTemplate } from '../src/lib/deck-templates';
import { classifyCard, getPrimaryCategory } from '../src/lib/card-classifier';
import { getDb } from '../src/lib/db';

type Case = { label: string; opts: Parameters<typeof autoBuildDeck>[0] };

const cases: Case[] = [
  { label: 'edgar', opts: { format: 'commander', colors: [], commanderName: 'Edgar Markov' } },
  { label: 'tatyova', opts: { format: 'brawl', colors: [], commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { label: 'tam', opts: { format: 'brawl', colors: [], commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { label: 'krenko', opts: { format: 'brawl', colors: [], commanderName: 'Krenko, Mob Boss' } },
];

async function main() {
  const out: Record<string, unknown> = {};
  for (const c of cases) {
    const t0 = Date.now();
    const r = await autoBuildDeck(c.opts);
    const ms = Date.now() - t0;
    const main = r.cards.filter((e) => e.board === 'main');
    const commanderCard = (getDb().prepare('SELECT oracle_text FROM cards WHERE name = ?').get(c.opts.commanderName as string) as { oracle_text?: string } | undefined);
    let ramp = 0, wipes = 0;
    for (const p of main) {
      const primary = getPrimaryCategory(classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, commanderCard?.oracle_text || undefined));
      if (primary === 'ramp') ramp += p.quantity;
      if (primary === 'board_wipe') wipes += p.quantity;
    }
    const rampFloor = getTemplate(r.strategy || 'midrange').ramp.totalMin;
    const list = main.map((e) => `${e.quantity}x ${e.card.name}`).sort();
    out[c.label] = { ms, ramp, rampFloor, wipes, listCount: list.length, list };
    console.error(`${c.label}: ${ms}ms ramp=${ramp}/${rampFloor} wipes=${wipes} cards=${list.length}`);
  }
  console.log(JSON.stringify(out));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
