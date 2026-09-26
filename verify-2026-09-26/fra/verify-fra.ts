/**
 * Compare every Reality Fracture (fra) + Commander (frc) card on Scryfall's live
 * search API against the local cards table, by oracle_id.
 * Usage: npx tsx verify-2026-09-26/fra/verify-fra.ts
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB = process.env.MTG_DB_DIR
  ? path.join(process.env.MTG_DB_DIR, 'mtg-deck-builder.db')
  : path.join(process.env.APPDATA!, 'the-black-grimoire', 'data', 'mtg-deck-builder.db');
const UA = { 'User-Agent': 'BlackGrimoire/1.0', Accept: 'application/json' };

type Face = { mana_cost?: string; oracle_text?: string };
type Card = {
  oracle_id: string; name: string; set: string; mana_cost?: string; type_line: string;
  oracle_text?: string; card_faces?: Face[]; color_identity: string[];
  legalities: Record<string, string>; game_changer?: boolean; layout: string;
};

async function fetchAll(q: string): Promise<Card[]> {
  const out: Card[] = [];
  let url: string | null = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=cards`;
  while (url) {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const page = await res.json() as { data: Card[]; has_more: boolean; next_page?: string };
    out.push(...page.data);
    url = page.has_more ? page.next_page! : null;
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

const text = (c: Card) => c.oracle_text || c.card_faces?.map((f) => f.oracle_text).filter(Boolean).join('\n//\n') || null;
const cost = (c: Card) => c.mana_cost || c.card_faces?.[0]?.mana_cost || null;

async function main() {
  const db = new Database(DB, { readonly: true });
  const byOracle = db.prepare('SELECT name, mana_cost, type_line, oracle_text, color_identity, legalities, game_changer FROM cards WHERE oracle_id = ?');
  const cards = await fetchAll('e:fra or e:frc');
  let missing = 0, drift = 0;
  for (const c of cards) {
    const rows = byOracle.all(c.oracle_id) as Array<Record<string, string | number | null>>;
    if (!rows.length) { missing++; console.log(`MISSING ${c.name} [${c.set}]`); continue; }
    for (const r of rows) {
      const leg = JSON.parse(String(r.legalities));
      const diffs = [
        r.name !== c.name && 'name',
        r.mana_cost !== cost(c) && 'mana_cost',
        r.type_line !== c.type_line && 'type_line',
        r.oracle_text !== text(c) && 'oracle_text',
        r.color_identity !== JSON.stringify(c.color_identity) && 'color_identity',
        ['commander', 'brawl', 'standardbrawl', 'standard'].some((f) => leg[f] !== c.legalities[f]) && 'legalities',
        Number(r.game_changer) !== (c.game_changer ? 1 : 0) && 'game_changer',
      ].filter(Boolean);
      if (diffs.length) { drift++; console.log(`DRIFT ${c.name}: ${diffs.join(',')}`); }
    }
  }
  const sets = ['fra', 'frc'].map((s) => `${s}=${cards.filter((c) => c.set === s).length}`).join(' ');
  console.log(`live unique cards: ${cards.length} (${sets}) missing=${missing} drifted_rows=${drift}`);
  if (missing || drift) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(2); });
