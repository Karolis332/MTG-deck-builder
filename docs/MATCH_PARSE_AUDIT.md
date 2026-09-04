# Match parse audit — 2026-09-04 (T2, desktop overhaul)

Live DB: `%APPDATA%\the-black-grimoire\data\mtg-deck-builder.db` (282 rows in `arena_parsed_matches`).
Backup taken first via the SQLite online-backup API: `mtg-deck-builder.db.bak-2026-09-04` (876,597,248 bytes, same dir).
Reparse ran on a copy first, then on the live DB: `POST /api/arena-matches/reparse` with
`logText = Player-prev.log + Player.log`, one transaction, 282 rows updated, 0 inserted, 0 deleted.
Second pass the same day (after folding in T1 research: userId identity, §5 queue table, players[].turnNumber
fallback) re-applied with backup `mtg-deck-builder.db.bak-2026-09-04b`; it changed only `format_normalized`.

## Root cause (grounded)

`raw_events` was **NULL on all 282 rows** — the column existed since migration 9 but nothing ever wrote it,
so "reparse from raw_events" had nothing to read. The old parser fell back to *"seat 1 is me"* whenever
`authenticateResponse.screenName` was not in its buffer (watcher started mid-session, or the buffer was
cleared by a collection event). That single fallback produced both defects at once:

- opponent_name == own screen name (player/opponent swapped) **and** `result` inverted;
- `turns = 0` because the match context was only created at `MatchCompleted`.

Proof: match `8476a579` — Player-prev.log:13734 `reservedPlayers` has `QuLeR systemSeatId 2, teamId 2`;
Player-prev.log:26735 `finalMatchResult … MatchScope_Match winningTeamId 2`. Stored row was
`PepeSilvia vs QuLeR, loss, turns 0`. Correct: `QuLeR vs PepeSilvia, win, 14 turns`.

## Before / after (live DB)

| Metric | Before | After |
|---|---|---|
| rows | 282 | 282 |
| result = win / loss / draw | 138 / 144 / 0 | 137 / 145 / 0 |
| opponent_name == player screen name | 9 | **0** |
| turns = 0 | 19 | 18 (see limits) |
| rows with `opponent_commander` | 0 | 5 (5 of 5 Brawl rows with raw data) |
| rows with `raw_events` | 0 | 7 |
| `format_normalized` populated | 0 | 282 (100 %) |

`format_normalized` after (research §5 table): brawl 216 · standard 36 · draft 16 · sealed 8 · competitivebrawl 5 · other 1
(`other` = `DirectGame`; `Constructed_Event_2026` → standard per rule 4).
`[UNCERTAIN 0.85: Brawl_Ladder → competitivebrawl follows research §5 rule 1 (name inferred from the 2026-06 Competitive
Brawl launch); confirm against an unranked Brawl-tab game's eventId. queue_raw keeps the raw string either way.]`
Deviation from the verbatim table: `DirectGameBrawl` added to rule 2 (13 live rows are Brawl direct challenges; rule 11
would file them as `other`), and `Historic Brawl` (display string, space) accepted by rule 2.

Row sources: `log_text` 7 (full re-extraction, raw_events backfilled) · `legacy_swap` 8 (names swapped, result
flipped) · `legacy_format_only` 267 (format mapping + screen name only) · unparseable 0.

Changed rows (9):

| match | source | before | after |
|---|---|---|---|
| 8476a579 | log_text | PepeSilvia vs QuLeR loss t0 | QuLeR vs PepeSilvia **win** t14 |
| 4517de6a | legacy_swap | Narnold vs QuLeR loss t0 | QuLeR vs Narnold win t0 |
| acfeaa1f | legacy_swap | tarot nr12 vs QuLeR win t0 | QuLeR vs tarot nr12 loss t0 |
| b989e1e1 | legacy_swap | Carth The Lion vs QuLeR loss t0 | QuLeR vs Carth The Lion win t0 |
| 724baa10 | legacy_swap | sethgo88 vs QuLeR win t0 | QuLeR vs sethgo88 loss t0 |
| 587f9caa | legacy_swap | Holdthelettuce vs QuLeR win t0 | QuLeR vs Holdthelettuce loss t0 |
| 7ed951ee | legacy_swap | WunggaSith vs QuLeR win t0 | QuLeR vs WunggaSith loss t0 |
| 49f56d50 | legacy_swap | bruno vs QuLeR loss t0 | QuLeR vs bruno win t0 |
| 7fd8a7e8 | legacy_swap | Sir_Loaf_a_Lot vs QuLeR win t0 | QuLeR vs Sir_Loaf_a_Lot loss t0 |

`[UNCERTAIN: the 8 legacy_swap flips follow the mechanism proven on 8476a579 (the only swapped row still in a
log). No log survives for them, so the flip is inferred, not grounded. Confidence 0.85.]`

## 30-match hand-check — newest 30 completed non-draft matches

Identity now comes from the account userId (`Match to <userId>:` header / `authenticateResponse.clientId` ==
`reservedPlayers[].userId`), then screen name, then the singleton `systemSeatIds` on `GREMessageType_ConnectResp`.
Evidence per grounded row = `reservedPlayers` line (operator's seat), `ConnectResp systemSeatIds` line (same seat,
independent source) and `finalMatchResult … MatchScope_Match winningTeamId` line. Only 5 of the 30 are still inside `Player.log` / `Player-prev.log`
(Arena rotates the log per session; the rest were parsed live months ago and have no raw data).

| match | queue | old result | new result | player seat → winner seat | evidence |
|---|---|---|---|---|---|
| 565c9a7f | Brawl_Ladder | loss | loss | 1 → 2 | Player.log:2491 reserved seat 1; :2488 ConnectResp systemSeatIds [1]; :6350 winningTeamId 2 |
| 05ef3db2 | Brawl_Ladder | loss | loss | 1 → 2 | Player.log:482 reserved seat 1; :485 ConnectResp [1]; :2368 winningTeamId 2 |
| 8476a579 | Brawl_Ladder | **loss** | **win** | 2 → 2 | Player-prev.log:13734 reserved seat 2; :13737 ConnectResp [2]; :26735 winningTeamId 2 |
| aef5a5ee | Brawl_Ladder | loss | loss | 1 → 2 | Player-prev.log:8187 reserved seat 1; :8184 ConnectResp [1]; :13489 winningTeamId 2 |
| d60b25a5 | Brawl_Ladder | win | win | 1 → 1 | Player-prev.log:374 reserved seat 1; :377 ConnectResp [1]; :7991 winningTeamId 1 |
| 09e9667f | DirectGameBrawl | loss | loss | — | [UNCERTAIN: no log] |
| e419444e | DirectGameBrawl | loss | loss | — | [UNCERTAIN: no log] |
| b995e689 | DirectGameBrawl | loss | loss | — | [UNCERTAIN: no log] |
| 2e21f11b | DirectGameBrawl | loss | loss | — | [UNCERTAIN: no log] |
| 6e94134c | DirectGameBrawl | win | win | — | [UNCERTAIN: no log] |
| 3cb93b89 | Play_Brawl_Historic | win | win (turns 0) | — | [UNCERTAIN: no log] |
| e84e4278 | Play_Brawl_Historic | win | win | — | [UNCERTAIN: no log] |
| 46105ec8 | Play_Brawl_Historic | win | win | — | [UNCERTAIN: no log] |
| 0a5f1f8b | Play_Brawl_Historic | win | win | — | [UNCERTAIN: no log] |
| a32a54e7 | Play_Brawl_Historic | loss | loss | — | [UNCERTAIN: no log] |
| f58c8242 | Play_Brawl_Historic | loss | loss | — | [UNCERTAIN: no log] |
| b075702f | Ladder | win | win | — | [UNCERTAIN: no log] |
| a1a36b6e | Ladder | win | win | — | [UNCERTAIN: no log] |
| ec6b24fd | Ladder | loss | loss | — | [UNCERTAIN: no log] |
| 4b4343f5 | Ladder | win | win | — | [UNCERTAIN: no log] |
| 44c1e0f5 | Ladder | win | win | — | [UNCERTAIN: no log] |
| 542854ef | Ladder | win | win | — | [UNCERTAIN: no log] |
| e60f7330 | Ladder | loss | loss | — | [UNCERTAIN: no log] |
| f5bfb584 | Ladder | loss | loss | — | [UNCERTAIN: no log] |
| a8e9a4a3 | Ladder | win | win | — | [UNCERTAIN: no log] |
| 6e88277d | Ladder | win | win | — | [UNCERTAIN: no log] |
| f88348f4 | Ladder | loss | loss | — | [UNCERTAIN: no log] |
| 970b524d | Ladder | loss | loss | — | [UNCERTAIN: no log] |
| fbece68b | Ladder | loss | loss | — | [UNCERTAIN: no log] |
| 7ee5b32f | Ladder | win | win | — | [UNCERTAIN: no log] |

Grounded agreement: 5/5 (the 25 ungrounded rows were left as stored — `player_name` was already the operator, so
the old seat logic had the right seat; no change was made to them beyond format mapping).
The two newest draft matches (excluded above by the "non-draft" rule) are also grounded: `ff7a9467`
Player.log:6806 reserved seat 1, :6803 ConnectResp [1], :13775 winningTeamId 2 → loss; `cd6ac28f` Player.log:14232
reserved seat 2, :14235 ConnectResp [2], :19178 winningTeamId 1 → loss.

## Limits (not fixable from stored data)

- **18 rows keep `turns = 0`** — legacy rows with no raw events and no surviving log. S1's "0 rows with
  turns = 0" is met for every row the new parser has seen (7/7) and cannot be met retroactively for these 18.
- **`opponent_commander` on 5 of 221 Brawl rows** — same reason; goes to ~100 % for new matches (5/5 Brawl rows
  with raw data resolved: Zoraline, Jodah, Flubs, Geralf, Bristly Bill).
- `player_seat` / `winner_seat` / `game_results` / `duration_seconds` are NULL on the 275 legacy rows.
- No Bo3 exists in the operator's logs; the Bo3 fixture is synthetic (real blocks re-cut into 3 games).
- T1 item (5) `EventGetCoursesV2 → Courses[].InternalEventName` was not wired: the response lists every joined course
  (15 in the live log) and `reservedPlayers[].courseId` is an avatar id, so no key links a course to a match.

## Going forward

Every new match stores a reduced `raw_events` (~4.5 KB: room events, connectResp deck, gameInfo results,
turn changes, command-zone objects, single-recipient seat) that replays to the identical contract fields
(tested). "Parse Full Log" re-POSTs each match → `storeArenaParsedMatch` updates the derived columns in place
(`updated: true`). `POST /api/arena-matches/reparse` body `{ logText?, screenName?, dryRun? }` returns
`{ rows, applied, perSource, unparseable, changes[], before, after }`.
