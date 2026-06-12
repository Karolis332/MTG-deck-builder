/**
 * Populate commander_synergies from EDHREC JSON pages (json.edhrec.com).
 *
 * Replaces the pyedhrec-based scripts/enrich_commander_synergies.py, whose
 * upstream API shape drifted. Uses the same endpoint as the EDHREC comparison
 * harness. Idempotent per commander (delete + insert).
 *
 * Usage:
 *   npx tsx scripts/enrich-commander-synergies.ts --from-stats 120
 *   npx tsx scripts/enrich-commander-synergies.ts "Krenko, Mob Boss" "Vivi Ornitier"
 */
import { getDb } from '../src/lib/db';

interface CardView { name: string; synergy?: number; num_decks?: number; potential_decks?: number }
interface CardList { header: string; cardviews: CardView[] }

function slugify(name: string): string {
  return name
    .split(' // ')[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['",.!()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function fetchCommanderPage(slug: string): Promise<CardList[] | null> {
  const url = `https://json.edhrec.com/pages/commanders/${slug}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'BlackGrimoire/1.0' } });
  if (!res.ok) return null;
  const body = await res.json() as {
    container?: { json_dict?: { cardlists?: CardList[] } };
  };
  return body.container?.json_dict?.cardlists ?? null;
}

async function main(): Promise<void> {
  const db = getDb();
  const args = process.argv.slice(2);

  let commanders: string[];
  const statsIdx = args.indexOf('--from-stats');
  if (statsIdx > -1) {
    const limit = parseInt(args[statsIdx + 1], 10) || 120;
    commanders = (db.prepare(`
      SELECT commander_name, MAX(deck_count) AS decks
      FROM commander_card_stats
      GROUP BY commander_name
      ORDER BY decks DESC
      LIMIT ?
    `).all(limit) as Array<{ commander_name: string }>).map((r) => r.commander_name);
  } else {
    commanders = args.filter((a) => !a.startsWith('--'));
  }
  if (!commanders.length) {
    console.log('Usage: enrich-commander-synergies.ts --from-stats [N] | "Name" ...');
    return;
  }

  const del = db.prepare('DELETE FROM commander_synergies WHERE commander_name = ?');
  const ins = db.prepare(`
    INSERT INTO commander_synergies (commander_name, card_name, synergy_score, inclusion_rate, card_type, source)
    VALUES (?, ?, ?, ?, ?, 'edhrec')
  `);

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < commanders.length; i++) {
    const name = commanders[i];
    const slug = slugify(name);
    try {
      const cardlists = await fetchCommanderPage(slug);
      if (!cardlists) {
        console.log(`[${i + 1}/${commanders.length}] ${name} -> 404 (${slug})`);
        failed++;
        continue;
      }
      const seen = new Map<string, { synergy: number; inclusion: number; type: string }>();
      for (const list of cardlists) {
        const type = list.header.toLowerCase().replace(/\s+/g, '_');
        for (const cv of list.cardviews ?? []) {
          if (!cv.name || seen.has(cv.name)) continue;
          const inclusion = cv.num_decks && cv.potential_decks
            ? cv.num_decks / cv.potential_decks
            : 0;
          seen.set(cv.name, { synergy: cv.synergy ?? 0, inclusion, type });
        }
      }
      db.transaction(() => {
        del.run(name);
        for (const [card, v] of seen) {
          ins.run(name, card, v.synergy, Math.round(v.inclusion * 10000) / 10000, v.type);
        }
      })();
      ok++;
      console.log(`[${i + 1}/${commanders.length}] ${name} -> ${seen.size} cards`);
    } catch (err) {
      failed++;
      console.log(`[${i + 1}/${commanders.length}] ${name} -> ERROR ${err instanceof Error ? err.message : err}`);
    }
    await sleep(700);
  }

  const total = db.prepare('SELECT COUNT(*) c, COUNT(DISTINCT commander_name) n FROM commander_synergies').get() as { c: number; n: number };
  console.log(`\nDone: ${ok} ok, ${failed} failed. Table now: ${total.c} rows across ${total.n} commanders.`);
}

main().then(() => process.exit(0)).catch((err) => { console.error('FAILED:', err); process.exit(1); });
