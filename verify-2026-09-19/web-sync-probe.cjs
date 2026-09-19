// Live probe for the match-sync API. Runs ON THE VPS only:
//   cd /opt/black-grimoire-web && NODE_PATH=/opt/black-grimoire-web/node_modules node --env-file=.env.local /root/web-sync-probe.cjs
// Creates a throwaway token for a probe user, posts 2 matches twice (insert, then duplicate update),
// pings, then deletes everything it created. Prints counts only, never the token or DATABASE_URL.
const { neon } = require('@neondatabase/serverless');
const { randomBytes, createHash } = require('node:crypto');

const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:3000';
const USER = 'user_sync_probe_2026_09_19';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = neon(url);
  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  await sql`DELETE FROM arena_matches WHERE user_id = ${USER}`;
  await sql`DELETE FROM desktop_sync_tokens WHERE user_id = ${USER}`;
  await sql`INSERT INTO desktop_sync_tokens (user_id, token_hash, label) VALUES (${USER}, ${hash}, 'probe')`;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const body = JSON.stringify({
    client: { app: 'the-black-grimoire', version: 'probe' },
    matches: [
      { matchId: 'probe-1', playedAt: '2026-09-19T10:00:00Z', format: 'Standard', deckName: 'Probe Deck', playerName: 'probe', opponentName: 'opp', result: 'win', turns: 8, playerSeat: 1, winnerSeat: 1, durationSec: 600, onPlay: true, mulligans: 0 },
      { matchId: 'probe-2', playedAt: '2026-09-19T10:30:00Z', format: 'Brawl', deckName: null, playerName: null, opponentName: null, result: 'loss', turns: null, playerSeat: null, winnerSeat: null, durationSec: null, onPlay: null, mulligans: null },
    ],
  });
  const out = {};
  const r1 = await fetch(`${BASE}/api/matches`, { method: 'POST', headers, body });
  out.post1 = { status: r1.status, json: await r1.json().catch(() => null) };
  const r2 = await fetch(`${BASE}/api/matches`, { method: 'POST', headers, body });
  out.post2 = { status: r2.status, json: await r2.json().catch(() => null) };
  const p = await fetch(`${BASE}/api/matches/ping`, { headers });
  out.ping = { status: p.status, json: await p.json().catch(() => null) };
  const bad = await fetch(`${BASE}/api/matches`, { method: 'POST', headers: { ...headers, Authorization: 'Bearer nope' }, body });
  out.badToken = bad.status;
  const rows = await sql`SELECT match_id, result, deck_name FROM arena_matches WHERE user_id = ${USER} ORDER BY match_id`;
  out.rows = rows;
  const tok = await sql`SELECT last_used_at IS NOT NULL AS used, revoked_at FROM desktop_sync_tokens WHERE user_id = ${USER}`;
  out.token = tok;
  // cleanup
  await sql`DELETE FROM arena_matches WHERE user_id = ${USER}`;
  await sql`DELETE FROM desktop_sync_tokens WHERE user_id = ${USER}`;
  const left = await sql`SELECT count(*)::int AS n FROM arena_matches WHERE user_id = ${USER}`;
  out.cleanupLeft = left[0].n;
  console.log(JSON.stringify(out, null, 1));
}

main().catch((e) => { console.error('PROBE_ERROR', e.message); process.exit(1); });
