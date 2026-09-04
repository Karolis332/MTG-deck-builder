# Arena fixtures

Reduced `rawEvents` block sequences produced by `extractMatches` (src/lib/arena-log-reader.ts).
Screen names replaced with PlayerA (local) / PlayerB (opponent); userId/sessionId never stored.

- `brawl-win-seat1.json` — Brawl_Ladder win, PlayerA seat 1, opponent conceded by game (ResultReason_Game) (source match d60b25a5, real Player.log 2026-09-03, names anonymised)
- `brawl-loss-seat1.json` — Brawl_Ladder loss, PlayerA seat 1, PlayerA conceded (source match 05ef3db2, real Player.log 2026-09-03, names anonymised)
- `draft-loss.json` — QuickDraft_SOS loss, PlayerA seat 1 (source match ff7a9467, real Player.log 2026-09-03, names anonymised)
- `brawl-win-seat2-opponent-eq-self.json` — Brawl_Ladder, PlayerA seat 2 — old parser stored player=opponent, opponent=PlayerA, result=loss, turns=0 (source match 8476a579, real Player.log 2026-09-03, names anonymised)
- `bo3-synthetic-win-1-2.json` — SYNTHETIC Bo3 built from brawl-loss-seat1 blocks: games 1 (loss, 8 turns), 2 (win, 11), 3 (win, 6) → match win, 1800 s. No Bo3 exists in the operator log yet.
