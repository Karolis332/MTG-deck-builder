# Arena match-data access research (2026-09-04)

Scope: how trackers read MTG Arena match data; what our parser gets wrong; Overwolf hosting decision input for T8. Grounded in the operator's live `Player.log` / `Player-prev.log` (Sept 2026, Detailed Logs ENABLED), the 17Lands client source, the manasight-parser docs, and Overwolf's GEP docs. Confidence per claim in brackets.

## 1. Player.log anatomy (2026)

Location `%LOCALAPPDATA%Low\Wizards Of The Coast\MTGA\Player.log`; previous session preserved as `Player-prev.log` in the same dir [1.0, observed]. Requires Options > Account > "Detailed Logs (Plugin Support)" + restart; the log's first lines print `DETAILED LOGS: ENABLED` / `DISABLED` — 17Lands string-matches exactly that (`mtga_follower.py:376-386`) [1.0]. Entries are `[UnityCrossThreadLogger]<locale timestamp>[: <userId> to Match: X | Match to <userId>: X]` headers followed by one JSON object, often multi-line; `==> Method {json}` = client request, `<== Method(uuid)` + bare JSON = response [1.0].

| Data | Message / path (exact) | Notes |
|---|---|---|
| Own identity | `authenticateResponse.screenName` (top-level key, 4x per session); header text `Match to <userId>:` on every GRE line; `reservedPlayers[].userId` | 17Lands derives `cur_user` from `MATCH_ACCOUNT_INFO_REGEX = ".*: ((\w+) to Match|Match to (\w+)):"` (`:143`) then matches `player["userId"] == self.cur_user` (`:673`). Name-matching is the weak path. |
| Seat | `matchGameRoomStateChangedEvent.gameRoomInfo.gameRoomConfig.reservedPlayers[]{userId,playerName,systemSeatId,teamId,eventId,courseId,platformId}`; also `gameRoomInfo.players[]` | Observed real sample: seat 1 = QuLeR, seat 2 = opponent, `eventId: "Brawl_Ladder"`. GRE wrapper `systemSeatIds:[N]` singleton = local seat (17Lands `:749-751`; `ConnectResp` `systemSeatIds:[2]` observed twice in our log, so the operator was seat 2 in some matches) [0.95]. |
| Match result | `gameRoomInfo.stateType == "MatchGameRoomStateType_MatchCompleted"` → `gameRoomInfo.finalMatchResult.resultList[]{scope: MatchScope_Game|MatchScope_Match, result, winningTeamId, reason}` | One `MatchScope_Game` entry per game plus one `MatchScope_Match`. `reason` values seen: `ResultReason_Concede`, `ResultReason_Game`; also `ResultReason_Timeout`. |
| Per-game result | `greToClientEvent.greToClientMessages[].gameStateMessage.gameInfo{matchID, gameNumber, stage: GameStage_GameOver, matchState: MatchState_GameComplete, results[]}` | Second GameOver message carries `MatchState_MatchComplete`; filter on `GameComplete` to avoid duplicates (manasight). `GREMessageType_IntermissionReq` repeats the game result between Bo3 games; `GREMessageType_SubmitDeckReq` = sideboarding prompt. |
| Turns | `gameStateMessage.turnInfo{turnNumber, activePlayer, decisionPlayer, phase, step}` (sibling of `gameInfo`, not nested) | Absent in many Diff messages. 17Lands fallback (`:767-770`): `sum(players[].turnNumber)`. Our real game-end sample: `players[0].turnNumber 5`, `players[1].turnNumber 4`, no `turnInfo`. |
| Queue / format | `reservedPlayers[].eventId`; `==> EventJoin {"request":"{\"EventName\":...}"}`; `<== EventGetCoursesV2` → `Courses[].InternalEventName` + `CourseDeckSummary`; `gameInfo{superFormat, variant: GameVariant_Brawl, deckConstraintInfo}` | `Event_GetPlayerCourseV2` does not appear in 2026 logs; the live name is `EventGetCoursesV2` [1.0]. |
| Decklist | `==> EventSetDeckV3 {"request":"{\"EventName\",\"Summary\":{DeckId,Name,Attributes},\"Deck\":{...}}"}` (was `EventSetDeckV2`); per-game authoritative list: `GREMessageType_ConnectResp.connectResp.deckMessage.deckCards[] / sideboardCards[]` (17Lands `:838-842`) | Our log has V3 only; our reader handles `EventSetDeckV2` (`arena-log-reader.ts:460`). `<== StartHook` carries `DeckSummariesV2`. |
| Commander | `zones[]{type: "ZoneType_Command", ownerSeatId, objectInstanceIds}` → `gameObjects[]{instanceId, grpId, ownerSeatId}` | Observed per-seat command zones (zoneId 18 seat 1, 19 seat 2); commander casts appear as `actions[].action{actionType: ActionType_Cast, abilityGrpId: 115}` [0.7 on 115 being the universal commander-cast ability]. |
| Draft | Bot: `<== BotDraftDraftPick` payload `{EventName, PackNumber, PickNumber, DraftPack[], PickedCards[]}`; human: `Draft.Notify {draftId, SelfPack, SelfPick, PackCards}` + `==> EventPlayerDraftMakePick {DraftId, GrpIds[], Pack, Pick}`; `DraftCompleteDraft` → `{CourseId, InternalEventName, CardPool[]}` | Our log: 21 `EventPlayerDraftMakePick`, `PickTwoDraft_HOB_20260811` has multi-element `GrpIds`. |
| Mulligans | `GREMessageType_MulliganReq.mulliganReq.mulliganType: MulliganType_London`; `players[].mulliganCount`, `players[].pendingMessageType: ClientMessageType_MulliganResp`; client `ClientMessageType_MulliganResp` | 17Lands counts hands seen per seat while pending (`:803-812`). |
| Life | `players[]{lifeTotal, startingLifeTotal (25 in Brawl), systemSeatNumber, teamId, status}`; `annotations[].type ["AnnotationType_ModifiedLife"]` | |
| Cards seen | `gameObjects[]{grpId, overlayGrpId, ownerSeatId, controllerSeatId, zoneId, visibility}` + `annotations[] AnnotationType_ZoneTransfer details[{key: zone_src|zone_dest|category}]`; `diffDeletedInstanceIds[]` | `annotations[].type` is an array. Over half of GRE entries batch several `GameStateMessage`s — iterate all. |
| Opponent rank | `gameRoomConfig.clientMetadata["<oppUserId>_RankClass|_RankTier|_LeaderboardPercentile"]` (17Lands `:680-690`) | Not in our parser; free win for match history. |

Identity data removed over time: screen names from most entries (Jul 2021), collection/inventory endpoints (Aug 2021), MMR (Aug 2022), opponent `#tag` (Jul 2024). `playerName` still present untagged in Sept 2026 `reservedPlayers` [1.0, observed].

## 2. How popular trackers access data

| Tracker | Hosting | Data path | Detailed Logs | Player-prev.log | grpId → card |
|---|---|---|---|---|---|
| Untapped.gg Companion (HearthSim) | Standalone Electron app, Win + macOS. **Not Overwolf.** | Tails `Player.log` in real time AND reads game memory read-only via OS APIs (no hooking/injection). | Required (help article). | Yes (support asks for it). | Proprietary; server-side. |
| 17Lands | Standalone Python (pip/brew) + C# WPF; tails log, POSTs to `https://api.17lands.com` (`submit_game_result`, `submit_draft_pick`, `submit_human_draft_pack`, `submit_event_course`). | Log only. Uploads raw grpIds, drawn hands, turn count, results, rank. | Required; refuses on `DETAILED LOGS: DISABLED`. | Yes (`PREVIOUS_LOG`). | Server-side mapping. |
| MTGA Assistant (AetherHub) | Overwolf app. | Reads `Player.log`. | Required. | [UNCERTAIN: not documented]. | Own card DB. |
| Arena Tutor (Draftsim) | Overwolf app; needs admin rights to read the log. | Reads `Player.log`. | Required. | [UNCERTAIN]. | Own card DB. |
| Manasight | Standalone Tauri; open-source Rust parser (WASM too). | Log only. | Required. | Yes. | Local DB. |
| MTG Arena Tool (mtgatool) | Standalone Electron; last release Oct 2024. | Log. | Required. | Yes. | Bundled DB. |
| MTGA Pro Tracker | Archived Apr 2025 (parser rewritten repeatedly; explored Mono memory reading). | Log. | | | |

No maintained tracker reads Unity `output_log.txt`; that file was renamed to `Player.log` in May 2020 [1.0]. None of the Overwolf trackers use GEP for match data; they all parse the log. Our `scripts/download_arena_card_db.js` (CDN `Raw_CardDatabase`) matches how the game itself resolves grpIds and is at least as good as any tracker's approach [0.9].

## 3. Overwolf GEP for MTGA (game id 21308)

Source: `overwolf/overwolf.github.io` `magic-the-gathering-arena.mdx` (the dev.overwolf.com URL now 404s and redirects). Features: `gep_internal`, `game_info`, `match_info`.

- `game_info` info updates: `scene` (scene_home, scene_event_page, scene_deck_builder, scene_draft_table, scene_draft_table_queue:<event>), `sideboard_cards`, `main_deck_cards` (card names + counts), `inventory_cards`, `inventory_stats` (wildcards, gold, gems, vault).
- `match_info` info updates: `draft_pack`, `draft_cards`, `draft_picked_card`.
- Events: `draft_start`, `draft_end`. **That is the entire event list.**
- NOT available via GEP: match start/end, result, opponent, seat, turns, life, zones, queue/eventId, game-level Bo3 data, mulligans [1.0]. GEP changelog shows repeated "MTGA – Fix events" entries, i.e. breakage on Arena patches.
- ow-electron: `MagictheGatheringArena = 21308` is in `gep-supported-games.d.ts` (updated 2026-05-05), so our `electron/overwolf-overlay.ts` `game-detected` hook is valid, but it can only give us scene/deck/draft info. Latency undocumented; GEP is itself a log/memory reader on Overwolf's side.

## 4. WotC policy / ToS

- No formal WotC third-party-tracker policy exists. The cited stance is Community Manager Nicholas Wolfram: trackers are fine "as long as it doesn't interfere in-game and doesn't scrape any information you wouldn't be able to get yourself" (mtg.wiki Tracker Apps). WotC shipped a sample log before the July 2019 log-format change specifically for tool makers (0.17.00 patch notes) and added the "Detailed Logs (Plugin Support)" toggle in Sept 2019 when it stopped logging by default (Draftsim).
- MTG Arena EULA (Steam copy): §4 personal, non-commercial use licence; no explicit tracker clause. Arena event T&Cs (Arena Open / Direct / ALCQ, 2024–2026) disqualify "any attempt to hack or otherwise modify the MTG Arena client", collusion, cheating.
- De facto red lines: revealing hidden info (opponent hand/library), automation/botting, modifying or injecting into the client. Untapped's own line: the log "will never contain data that your game does not know about. This means there is no way to cheat."
- Trend: WotC removes fields, never adds (2019 vault, 2021 names/collection, 2022 MMR, 2024 opponent tag). Design for field loss; hash/strip identity before anything leaves the machine (manasight guidance, also GDPR-relevant for us).

## 5. Queue → format normalisation

Observed `EventName`/`InternalEventName`/`eventId` values in our two logs and DB: `Ladder`, `Traditional_Ladder`, `Play`, `Brawl_Ladder` (new; first seen after Competitive Brawl launch 2026-06-23), `Play_Brawl`, `Play_Brawl_Historic`, `Alchemy_Ladder`, `Spark_Alchemy_Ladder`, `Historic_Ladder`, `Explorer_Ladder`, `Timeless_Ladder`, `QuickDraft_SOS_20260831`, `PickTwoDraft_HOB_20260811`, `PremierDraft_ECL_20260120`, `ArenaDirect_ECL_Play_Sealed_20260213`, `Brawl_Challenge_20260331`, `Constructed_Event_2026`, `DirectGame`, `SparkyStarterDeckDuel`, `DualColorPrecons`, `ColorChallenge_Node5_*`. Older DB rows hold display strings (`Historic Brawl`, `Brawl`, `Standard`, `Draft`) from a previous parser — treat as already-normalised input.

Order matters; first match wins. Case-insensitive.

| # | Regex | → enum | Bo3? | Basis |
|---|---|---|---|---|
| 1 | `^Brawl_Ladder$` | `competitivebrawl` | Bo1 | Ranked Brawl queue name; only ranked Brawl queue in Arena [0.85 — name inferred from launch timing + `_Ladder` = ranked convention; confirm against a Brawl-tab unranked game's eventId] |
| 2 | `^(Play_)?Brawl(_Historic)?$\|^Historic_?Brawl\|Brawl_Challenge\|^Brawl$` | `brawl` | Bo1 | Unranked Brawl (100-card, formerly "Historic Brawl") |
| 3 | `Standard_?Brawl\|^Play_Brawl_Standard` | `standardbrawl` | Bo1 | 60-card Brawl; no live sample [0.6] |
| 4 | `^(Traditional_)?Ladder$\|^Play$\|^Traditional_Play$\|^Constructed_(Event\|BestOf[13])\|Standard` | `standard` | `^Traditional_`, `BestOf3` | `Ladder` = ranked Bo1 Standard; `Traditional_Ladder` = ranked Bo3 |
| 5 | `Alchemy` (incl. `Spark_Alchemy_Ladder`) | `alchemy` | `Traditional_` | |
| 6 | `^(Traditional_)?Historic_Ladder$\|^Historic_Play\|^Historic(?!.*Brawl)` | `historic` | `Traditional_` | Must run after Brawl rules |
| 7 | `Explorer` | `explorer` | `Traditional_` | Queue retired 2025; historical rows only |
| 8 | `Timeless` | `timeless` | `Traditional_` | |
| 9 | `^(Quick\|Premier\|PickTwo\|Trad(itional)?\|Cube\|Arena)?Draft_\|_Draft(_\|$)\|Draft` | `draft` | `^Trad` | Set code + date suffix `_[A-Z0-9]{3,4}_\d{8}` |
| 10 | `Sealed\|ArenaDirect.*Sealed\|Jump_?In\|JumpIn` | `sealed` | | Jump In grouped as limited-sealed |
| 11 | `Midweek\|Sparky\|Precon\|ColorChallenge\|DirectGame\|NPE\|Bot` | `other` | | Direct challenge, tutorial, MWM |
| 12 | `.*` | `other` | | Log the raw string for triage |

Also read `gameInfo.variant == "GameVariant_Brawl"` and `deckConstraintInfo.minCommanderSize` as a cross-check: any Brawl variant with `eventId` not matched by rules 1–3 → `brawl` + warn. Keep the raw `eventId` in its own column; never overwrite it with the enum.

## 6. Recommendation for T8

**Electron log-tailing only. Do not adopt Overwolf GEP for match data; keep the ow-electron build optional for distribution experiments only.** Confidence 0.85.

- GEP gives zero match-history signal for MTGA (§3): no match start/end, result, opponent, turns, seat. Everything T2 needs is in the log we already tail; GEP would be a second parser to maintain that breaks on the same Arena patches ("MTGA – Fix events" changelog entries).
- Overwolf costs: app-proposal whitelisting before API access, DevRel QA cycle (1–2 weeks per review), mandatory code signing, Overwolf-only monetisation (no third-party payments; our Deck Doctor pricing plan conflicts), overlay/ad placement rules, Windows-only, and the app must comply with the game ToS anyway. Web-store-only listing for Electron apps; no customer reviews shown.
- Overwolf gains: overlay injection into the game window (we already ship a transparent always-on-top overlay), store discovery, ad revenue.
- Untapped's success implies the opposite of Overwolf: it is a standalone Electron companion that pairs log tailing with read-only memory reading for robustness, and wins on data depth + cross-platform (macOS). Memory reading is out of scope for us (ToS grey area, anti-cheat optics). 17Lands wins on being a thin log uploader with a strong backend.
- If distribution via Overwolf is still wanted later, ship the same Electron log parser inside ow-electron and use GEP only for `scene`/`draft_*` convenience. Effort ~1 week for packaging + review; risk = review rejection on monetisation.

## Sources

- Live logs: `C:\Users\QuLeR\AppData\LocalLow\Wizards Of The Coast\MTGA\Player.log`, `Player-prev.log` (2026-09-03/04)
- 17Lands client: https://github.com/rconroy293/mtga-log-client (`src/python/seventeenlands/mtga_follower.py`, lines cited above); https://www.17lands.com/getting_started
- Manasight log guide (2026-03-13): https://blog.manasight.gg/arena-log-format-guide/ ; parser: https://github.com/manasight/manasight-parser ; seat-attribution PR: https://github.com/manasight/manasight-parser/pull/258
- Untapped: https://help.hearthsim.net/en/articles/5020719-how-does-the-untapped-gg-companion-work ; https://help.hearthsim.net/en/articles/8377705-how-does-the-untapped-gg-companion-work ; https://mtga.untapped.gg/companion
- MTGA Assistant: https://mtgaassistant.net/Help ; https://www.overwolf.com/app/aetherhub-aetherhub_mtga_assistant
- Arena Tutor: https://draftsim.com/arenatutor/help/ ; https://draftsim.com/enable-detailed-logging-in-mtg-arena/ ; https://draftsim.com/mtg-arena-player-log-file/
- mtgatool: https://mtgatool.com/docs/introduction ; MTGA Pro Tracker issue #263: https://github.com/Razviar/mtgap/issues/263
- Overwolf GEP MTGA: https://github.com/overwolf/overwolf.github.io/blob/source/pages/api/live-game-data/supported-games/magic-the-gathering-arena.mdx ; GEP changelog: https://github.com/overwolf/overwolf.github.io/blob/source/pages/api/changelogs/gep-changelogs.mdx ; ow-electron game ids: https://github.com/overwolf/ow-electron-packages-types/blob/main/gep-supported-games.d.ts ; release/compliance: https://dev.overwolf.com/ow-electron/getting-started/release-your-app/ , https://dev.overwolf.com/ow-electron/getting-started/project-roadmap/ , https://dev.overwolf.com/ow-electron/guides/game-compliance/overview/
- Policy: https://mtg.wiki/page/Magic:_The_Gathering_Arena/Tracker_Apps ; https://store.steampowered.com/eula/2141910_eula_0 ; https://magic.wizards.com/en/news/mtg-arena/arena-open-terms-and-conditions ; https://mtgazone.com/0-17-00-00-patch-notes/ ; https://aetherhub.com/Article/Why-you-should-use-MTG-Arena-DeckTrackers
- Competitive Brawl launch (2026-06-23): https://magic.wizards.com/en/news/mtg-arena/introducing-ranked-brawl
- Queue filter precedent (`Traditional_*`, `Constructed_BestOf3`): https://github.com/kristeehan/mtga-log-parser

## What our parser must change

| Defect | Root cause in our code | Log field that fixes it |
|---|---|---|
| Opponent name == own name | `arena-log-reader.ts:276` matches `rpName === playerName` else assumes seat 1 is us (`:276`, `:287-295`); `playerName` is only set if `authenticateResponse` fell inside the parsed window | Identify self by `userId`: parse `Match to (\w+):` / `(\w+) to Match:` header prefix and `authenticateResponse.clientId`; match `reservedPlayers[].userId`; fall back to singleton GRE `systemSeatIds:[N]` on `ConnectResp`/`GameStateMessage`. Never default to seat 1. |
| `turns = 0` on completed matches | Only `turnInfo.turnNumber` is read (`:386`); Diff messages at game end omit `turnInfo` | Also take `max(turns, sum(players[].turnNumber))` per GameStateMessage (17Lands `:770`), and `players[].turnNumber` in the `GameStage_GameOver` message. |
| Raw queue string as format | `format = rp.eventId` (`:280`, `:294`) | Store `eventId` raw in a new column; derive `format` via §5 table; cross-check `gameInfo.variant` / `superFormat` / `deckConstraintInfo`. |
| No opponent commander | Command zone not tracked for opponent seat | `zones[] type ZoneType_Command ownerSeatId == opponentSeat` → `objectInstanceIds` → `gameObjects[].grpId`; resolve via `grp-id-resolver`. |
| No per-game results for Bo3 | Only `finalMatchResult` / `MatchState_MatchComplete` consumed (`:319-333`, `:439-445`) | Emit one game record per `gameInfo{matchState: MatchState_GameComplete, gameNumber, results[MatchScope_Game]}`; reconcile with `finalMatchResult.resultList` (n game entries + 1 match entry); use `IntermissionReq` as backup. |
| Deck submission missed | Handler keys on `EventSetDeckV2` (`:460`) | Accept `EventSetDeckV[0-9]` and prefer `connectResp.deckMessage.deckCards/sideboardCards` per game (captures Bo3 sideboarding). |
| Player-prev.log never read | No reference in `electron/arena-log-watcher.ts` or `src/lib` | Backfill `Player-prev.log` on startup before tailing `Player.log` (17Lands/Untapped/manasight all do). |
| Detailed Logs off = silent empty history | Not detected | Check first lines for `DETAILED LOGS: DISABLED`; surface a toast with the Options > Account instruction. |
| Missing free signals | — | `clientMetadata.<oppUserId>_RankClass/_RankTier` (opponent rank), `reservedPlayers[].platformId`, `players[].mulliganCount`, `startingLifeTotal`. |

[UNCERTAIN] Local dev DB (`data/mtg-deck-builder.db`, 187 rows) shows 0 rows with `player_name == opponent_name` and 12 with `turns = 0`; the 282-row figure and the self-as-opponent rows must be from the operator's `%APPDATA%` DB, which was not present at the expected path during this session. The code path that produces the defect is confirmed at `:276-295` regardless.
