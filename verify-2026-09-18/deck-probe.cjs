// Read-only probe of one web deck. Prints ids/names/counts only — never the URL, never emails.
const { neon } = require('@neondatabase/serverless');
const scrub = (s) => String(s).replace(/postgres(ql)?:\/\/\S+/g, '<db-url>');
(async () => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const id = Number(process.argv[2] || 2);
    const deck = await sql`select d.id, d.name, d.format, d.commander_name, d.user_id, u.username, u.clerk_id
      from decks d join users u on u.id = d.user_id where d.id = ${id}`;
    if (!deck.length) { console.log('no deck', id); return; }
    const d = deck[0];
    console.log('deck', d.id, '|', d.name, '|', d.format, '| commander', d.commander_name, '| user', d.user_id, d.username, '| clerk', String(d.clerk_id).slice(0, 8) + '…');
    const counts = await sql`select board, count(*)::int as lines, sum(quantity)::int as cards from deck_cards where deck_id = ${id} group by board order by board`;
    console.log('boards', JSON.stringify(counts));
    const dfc = await sql`select card_name, board from deck_cards where deck_id = ${id} and card_name like '% // %' order by card_name`;
    console.log('two-faced names', dfc.length, dfc.map((r) => r.card_name).join(' ; '));
  } catch (e) {
    console.log('ERR', scrub(e && e.message));
  }
})();
