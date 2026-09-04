# Orchestration spec — Black Grimoire desktop overhaul, September 2026

Living document. Amend artifact 4 when audits show a repeated worker failure; amend artifact 1 when scope changes. Append a retrospective at the end of the initiative.

## 1. Full analysis

### Objective
Turn the desktop app from "builds a deck" into "tracks, explains and improves your decks": accurate match history with a dashboard-grade UI, an engine that respects brackets and best-list composition, synergy stats on the modern (lift) formula, and a decision on Overwolf as the tracker host.

### Measurable success criteria
| # | Criterion | Measure |
|---|---|---|
| S1 | Match history accuracy | On the operator's real `Player.log` (282 parsed matches): 0 rows where opponent == player screen name; 0 rows with `turns = 0` for completed games; `result` agrees with the GRE final game state on a 30-match hand-checked sample ≥ 29/30; format normalised to a closed enum for ≥ 95 % of rows; opponent commander present for ≥ 90 % of Brawl rows. |
| S2 | Match history visuals | Screenshot-verified match list + detail in the command-center HUD style; operator says "looks right" on their own history. |
| S3 | Engine round | Harness stays `hardFails 0`, score within 963–968 or higher; benchmark: bracket match rate for fixtures ≥ 12/16 (today 6/16); Krenko removal delta vs top lists within ±2 (today −4); `qualityIndex` median up vs `docs/DECK_BENCHMARK_2026-09-03.md`. |
| S4 | Lift synergy | `commander_card_stats.lift` populated on the VPS for ≥ 3,000 commanders; agreement in sign with `synergy_score` ≥ 90 % on a sample; desktop sync carries it; engine use behind a flag, harness-gated. |
| S5 | Research | `docs/RESEARCH_ARENA_LOGS_2026-09-04.md` answers: where each field lives in the log, what Overwolf GEP adds, how Untapped.gg / 17Lands / MTGA Assistant / Arena Tutor access data, ToS position, and a recommendation with effort. |
| S6 | Editor backlog | Commander autocomplete deterministic (paper before `A-`), chat actions use SuggestionCard where a card resolves, polish fixes merged. |
| S7 | Web | Clerk JS not loaded when accounts are off; no dev-key console warning for friends. |

### Task decomposition
| ID | Task | Tier | Owner model | Files (exclusive) | Depends on |
|---|---|---|---|---|---|
| T1 | Arena data-access research (log fields, GEP, competitors, ToS, Overwolf recommendation) | DELEGATE | Fable (operator request) | `docs/RESEARCH_ARENA_LOGS_2026-09-04.md` | — |
| T2 | Match parsing accuracy | SUPERVISED | Fable | `src/lib/arena-log-reader.ts`, `src/lib/arena-game-events.ts`, `src/lib/match-analyzer.ts`, `electron/arena-log-watcher.ts`, `src/app/api/arena-*/**`, `src/app/api/match-logs/**`, migrations (append), tests | — (T1 findings folded in when available) |
| T3 | Match history visuals (list, detail, timeline, filters) | SUPERVISED | Fable | `src/components/match-log-panel.tsx`, `src/components/match-detail-modal.tsx`, new `src/components/match/**` | T2 field contract (agree it first, in this spec §1.5) |
| T4 | Engine round: bracket-aware selection, Karsten lands, removal/draw rebalance | RESERVED | Fable, harness-gated | `src/lib/deck-builder-ai.ts`, `src/lib/deck-builder-constraints.ts`, `src/lib/deck-templates.ts`, `src/lib/land-intelligence.ts`, `scripts/test-deck-builds.ts` (fixtures only) | — |
| T5 | Lift synergy on the VPS + desktop sync | RESERVED | Fable | `grimoire-cf-api` (VPS checkout): `refresh_ccs.sql`, populate script, `/commander_stats` response; desktop `src/lib/sync-commander-stats.ts`, migration (append) | — |
| T6 | Editor correctness backlog | DELEGATE | Fable | `src/lib/db.ts` (`searchCards` only), `src/components/command-center/consultant/**` (after the polish worker finishes), `src/app/api/cards/search/**` | polish worker done |
| T7 | Web friends-site cleanup | DELEGATE | Fable | `C:/Users/QuLeR/black-grimoire-web/src/app/layout.tsx`, providers, `.env.local.example` | — |
| T8 | Overwolf host decision + plan | RESERVED, operator approval | Fable | `docs/OVERWOLF_DECISION.md` | T1 |

Field contract for T2→T3 (§1.5): `arena_parsed_matches` gains `player_screen_name`, `opponent_commander`, `player_commander`, `format_normalized` (enum: `standard|alchemy|historic|explorer|timeless|brawl|competitivebrawl|standardbrawl|draft|sealed|other`), `queue_raw`, `winner_seat`, `player_seat`, `game_results` (JSON per game for Bo3), `duration_seconds`. Existing columns keep their meaning. Rows are never deleted; a `reparse` action rebuilds derived columns from `raw_events`.

### Top 5 failure modes and early warnings
1. **Parser "fixes" that regress silent cases** — warning: any change to result/seat logic without a before/after distribution table on the real log. Guard: T2 must produce `docs/MATCH_PARSE_AUDIT.md` with counts per result/format before and after.
2. **Engine change that games the harness** — warning: score up while benchmark bracket match or overlap drops. Guard: T4 reports both numbers; either regressing = reject.
3. **VPS write that touches the live table without a backup** — warning: any `UPDATE commander_card_stats` without a prior `pg_dump -t`. Guard: T5 adds a column, never rewrites `synergy_score`.
4. **Workers editing shared files concurrently** — warning: two reports touching the same path. Guard: exclusive ownership table above; anything outside it = escalate.
5. **UI that looks done in one screenshot but breaks the popout/DnD/undo paths** — warning: report without an interaction screenshot. Guard: every UI task screenshots one full interaction, not just a static view.

### Assumptions
- "Overwolf" means hosting the tracker/overlay in the existing Overwolf build; Electron stays the primary deck-builder shell until T1/T8 say otherwise.
- The operator accepts Fable workers for all tiers (their request), knowing cost is ~2× Opus.
- No results data exists for casual Commander; quality is measured against best-regarded lists (established 2026-09-03).

## 2. Hard guardrails

ALWAYS
- Gate every code task with `npm test`, `npx tsc --noEmit`, `npm run lint` (no new warnings) before reporting.
- Run the deck harness (`npx tsx scripts/test-deck-builds.ts && node scripts/deck-fitness.mjs`) for any change under `src/lib/deck-builder-*`, `deck-templates.ts`, `land-intelligence.ts`; report `hardFails` and `score`; and `npx tsx scripts/deck-benchmark.ts` bracket-match count.
- Back up before rewriting derived data: local DB copy before a reparse; `pg_dump -t commander_card_stats` on the VPS before any write.
- Screenshot every UI change through a real browser (playwright-core against `npm run dev`, system Chrome) including one interaction.
- Flag `[UNCERTAIN: reason]` on any step below 0.7 confidence.
- Stay inside the file ownership in §1; escalate anything else.

NEVER
- Change `scripts/deck-fitness.mjs` or the reference fixtures to fit the engine (protocol: references are ground truth).
- Delete or overwrite rows in `arena_parsed_matches`, `match_logs`, `decks`, `collection`, or the operator's profile.
- Commit secrets; quote the seeded CF API key (migration 28); print `.env` values.
- Restart the VPS pipeline daemon or `api-1` outside a documented deploy; touch `docker-compose.prod.yml` memory limits.
- Add npm dependencies without escalation.
- Use `alert()`/`confirm()`; use the toast store.
- Report "done" without the gate output pasted.

Output contract per task: files changed with one-line rationale each; gate output (test count, tsc, lint); evidence (screenshots or query tables); `[UNCERTAIN]` list; anything skipped and why. Under 60 lines.

Stop and escalate when: a needed change falls outside owned files; a harness number regresses; a VPS command would write without a backup; the real log contains a case the parser cannot classify (report it, do not guess); a dependency seems required.

## 3. Reasoning system (every task)
1. Decompose the task into steps with inputs/outputs.
2. Solve each step; state confidence 0.0–1.0.
3. Verify: logic (does the code do what the step says), factual grounding (cite the file/line or log excerpt), completeness (all cases in the contract), hidden assumptions (list them).
4. Synthesize: the final change set and evidence.
5. Self-check against §2; list each guardrail touched and how it was satisfied.
Any step < 0.7 → `[UNCERTAIN: reason]` in the report. Silent guessing is the failure this spec exists to prevent.

## 4. Worker system prompt (paste verbatim, then append the task brief)

You are a worker on the Black Grimoire desktop overhaul (repo `C:/Users/QuLeR/MTG-deck-builder`, spec `orchestration/desktop-overhaul-2026-09/spec.md`). Follow this exactly.

Rules. Edit only the files your task owns; if you need another file, stop and report. Do not commit. Do not add dependencies. Do not use alert/confirm. Never delete or overwrite user data rows; back up before any reparse or VPS write. Never change `scripts/deck-fitness.mjs` or reference fixtures. Ignore the zero-byte junk files in the repo root.

Process. Decompose → solve with confidence 0.0–1.0 per step → verify (logic, grounding with file:line or log excerpt, completeness, hidden assumptions) → synthesize → self-check against the rules. Any step under 0.7 confidence: write `[UNCERTAIN: reason]` in the report and do not guess.

Gate before reporting: `npm test` (paste the count), `npx tsc --noEmit` (paste "clean" or the errors), `npm run lint` (no new warnings). Engine tasks also paste harness `{hardFails, score}` and benchmark bracket-match count. UI tasks include screenshot paths with one interaction captured. Data tasks include before/after count tables.

Report format (under 60 lines): Files (path — rationale) / Gate output / Evidence / [UNCERTAIN] list / Skipped and why.

Compliant example: "Files: src/lib/arena-log-reader.ts — player seat from authenticateResponse.screenName (:237). Gate: 571 tests, tsc clean, lint clean. Evidence: before/after table: opponent==self 41→0; turns=0 12→0. [UNCERTAIN: 3 draft matches lack a final GRE state; left result=null rather than guessed]. Skipped: none."

Non-compliant example: "Fixed the parser, should work now. Tests probably pass." (no gate output, no evidence, a guess presented as fact — auto-reject).

## 5. Audit rubric (score 0–10 each; pass ≥ 7 average with no criterion < 5)
| Criterion | 3 | 7 | 10 |
|---|---|---|---|
| Correctness against the contract | Some contract fields wrong or missing | Contract met, one edge case flagged | Contract met, edge cases enumerated and tested |
| Evidence quality | Claims only | Gate output + one artifact | Gate + before/after tables or interaction screenshots reproducible from the report |
| Test coverage of changed logic | Untested paths | Main path tested | Main + failure paths tested, fixtures from real data |
| Scope discipline | Touched unowned files | Owned files only | Owned files only and flagged needed changes elsewhere |
| Guardrail compliance | A NEVER rule broken | All ALWAYS rules met | ALWAYS met and self-check listed per rule |
| Reasoning transparency | No confidence/uncertainty | `[UNCERTAIN]` where guessing occurred | Confidence per step, assumptions listed |
| Performance/regression | Harness or UI slower, unmeasured | Measured, unchanged | Measured, improved or justified |
| Docs and handoff | None | Report complete | Report + doc updated where the task changes behaviour |

Auto-reject regardless of score: RESERVED area touched without approval; untested code in a critical flow (parser result attribution, engine selection, VPS writes); missing `[UNCERTAIN]` where guessing occurred; a NEVER rule broken; no gate output.

## Retrospective
_appended at initiative end_
