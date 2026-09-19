// Replace the card list of one web deck atomically (same shape as PUT /api/decks/[id]:
// update decks.card_count/updated_at, delete deck_cards, insert the new rows in one Neon transaction).
// usage: NODE_PATH=<app>/node_modules node --env-file=.env.local deck-update.cjs <deckId> <list.txt> <expected-name-substring>
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');
const scrub = (s) => String(s).replace(/postgres(ql)?:\/\/\S+/g, '<db-url>');

function parseList(text) {
  let board = 'main';
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^about$/i.test(line) || /^name /i.test(line)) continue;
    if (/^commander$/i.test(line)) { board = 'commander'; continue; }
    if (/^deck$/i.test(line)) { board = 'main'; continue; }
    if (/^sideboard$/i.test(line)) { board = 'sideboard'; continue; }
    const m = line.match(/^(\d+)x?\s+(.+?)$/);
    if (!m) throw new Error('unparsed line: ' + line);
    rows.push({ name: m[2], quantity: Number(m[1]), board });
  }
  return rows;
}

(async () => {
  try {
    const [, , idArg, listPath, expect] = process.argv;
    const id = Number(idArg);
    const rows = parseList(fs.readFileSync(listPath, 'utf8'));
    const total = rows.reduce((s, r) => s + r.quantity, 0);
    const sql = neon(process.env.DATABASE_URL);
    const [deck] = await sql`select id, name, card_count from decks where id = ${id}`;
    if (!deck) throw new Error('no deck ' + id);
    if (expect && !deck.name.toLowerCase().includes(expect.toLowerCase())) throw new Error(`deck ${id} is "${deck.name}", expected *${expect}*`);
    console.log('before:', deck.id, deck.name, 'card_count', deck.card_count, '| new rows', rows.length, 'cards', total);
    const queries = [
      sql`update decks set card_count = ${total}, updated_at = now() where id = ${id}`,
      sql`delete from deck_cards where deck_id = ${id}`,
      ...rows.map((r) => sql`insert into deck_cards (deck_id, card_name, quantity, board) values (${id}, ${r.name}, ${r.quantity}, ${r.board})`),
    ];
    await sql.transaction(queries);
    const after = await sql`select board, count(*)::int as lines, sum(quantity)::int as cards from deck_cards where deck_id = ${id} group by board order by board`;
    console.log('after:', JSON.stringify(after));
  } catch (e) {
    console.log('ERR', scrub(e && e.message));
    process.exitCode = 1;
  }
})();
