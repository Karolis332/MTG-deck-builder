# Decision: where the Arena tracker lives (2026-09-04)

Status: **decided** — the match tracker and overlay data path stay in the Electron app, reading `Player.log` (and `Player-prev.log`). Overwolf remains an optional distribution/overlay shell, not a data source. Operator sign-off pending on distribution (see "What the operator decides").

Source of facts: `docs/RESEARCH_ARENA_LOGS_2026-09-04.md` (T1, verified against the operator's live log and the 17Lands client source).

## Why

| Question | Finding | Consequence |
|---|---|---|
| What does Overwolf's MTGA integration (game id 21308) expose? | Info: scene, sideboard/main-deck/inventory cards, draft pack/picks. Events: `draft_start`, `draft_end` only. No match start/end, no result, no opponent, no turns. | Overwolf adds **zero** match-history signal. Every accuracy defect we have is fixed in the log parser, not by switching host. |
| How do the popular trackers get match data? | Untapped.gg: standalone Electron app reading the log (plus read-only memory). MTGA Assistant, Arena Tutor: Overwolf apps that still parse `Player.log`. 17Lands: Python client tailing the log. | The industry answer is "parse the log well". Hosting is a distribution choice. |
| Is log parsing allowed? | No formal WotC tracker policy; community-manager guidance permits tools that do not interfere in-game and only read what the player could see; EULA personal-use clause; event T&Cs forbid client modification. WotC has removed fields over time (opponent tag 2024) but `playerName` and results remain. | Log tailing is the accepted path. Keep to read-only, no hidden information, no automation. |
| What does Overwolf cost us? | Store review + whitelisting, ads model, Overwolf-only monetisation constraints, a second runtime to QA, and our overlay code already forks on `isOverwolfRuntime()`. | Extra QA surface for no data gain. |

## What changes

1. **Parser correctness (T2)**: self-identification by userId instead of seat-1 default; `players[].turnNumber` fallback; `EventSetDeckV3`; `EventGetCoursesV2`; Bo3 per-game results; `Player-prev.log`; queue→format table. This closes the defects the operator saw (self-as-opponent, turns 0, raw queue names).
2. **Overlay in Electron**: bring the always-on-top overlay into the Electron build behind a setting (today it exists only in the Overwolf runtime, `electron/main.ts:320`), using the same `GameStateEngine`. Tracked as a follow-up; not part of this initiative.
3. **Overwolf build**: keep `npm run dist:overwolf` working as a channel; do not invest in GEP beyond draft events.

## What the operator decides

- Whether to publish on the Overwolf store at all (reach vs. review/ads constraints). Data does not depend on it.
- Whether the Electron overlay follow-up is wanted before the friends beta.

## Confidence

0.85 overall. Open uncertainties (from T1): `Brawl_Ladder` == Competitive Brawl mapping (0.85); `Standard_Brawl` eventId pattern unseen (0.6); commander-cast `abilityGrpId 115` universality (0.7). None affect the hosting decision.
