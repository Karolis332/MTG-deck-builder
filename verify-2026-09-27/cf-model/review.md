# CF model review — grimoire-cf-api (VPS) — 2026-09-27

Every number below comes from queries and logs run on 2026-09-27 between 11:21 and 11:45 UTC. The SQL is in `q1.sql`–`q6.sql` in this directory. Per-card FRA output is in `fra_presence.txt`.

## Verdict

| Area | State | Evidence |
|---|---|---|
| SVD serving | ✅ live, fresh | `/health`: v33p-loaded, last_retrained 2026-09-24T16:07:42Z, deck_count 4,330,540 |
| SVD training data | ⚠️ capped | 27 of 33 partitions exceed `MAX_DECKS = 30_000` (`cf_engine.py:121`). A random 30K is sampled from each (`random.sample`, unseeded). About 81 % of the 4.25M decks in those partitions never enter training. |
| Retrain value | ⚠️ low signal | Each retrain adds 1–2K trained decks (training_log `total_decks_trained` 863,389 → 875,832 over 10 runs). The 52 % top-20 overlap on 09-24 is mostly resampling noise, not new data. |
| Offline evaluation | ❌ stale 101 days | `evaluation_results` holds ONE run (2026-06-18, 105 rows). The monthly full eval SKIPPED on 07-01, 08-01 and 09-01. The nightly light eval never runs. |
| VW bandit inference | ❌ broken | `VW predict failed: cannot unpack non-iterable float object` on every `/recommend`. 7-day `vw_score` = 1/N uniform fallback (min 0.00503 = 1/199, max 0.00855 = 1/117). |
| VW bandit learning | ❌ no reward signal | 14,003 impressions against 6 outcomes all-time. The last outcome was 2026-09-03. Last 7 days: 3,100 impressions, 0 outcomes. There were 0 `/events/track` requests in the nginx log window or since the API restarted. |
| Pipeline daemon | ❌ dead since 03:00 UTC | Sunday's `systemctl restart docker` (cron `0 3 * * 0`) killed it with exit 137. That was attempt 3/3 of the wrapper that started 09-20 03:02, so run-pipeline.sh logged CRITICAL. It respawns at the 22:00 cron. |
| FRA (Reality Fracture) | ✅ in the vocabulary | All 287 FRA/FRC names in the desktop DB appear in `card_popularity`. 240 have ≥ 50 inclusions and 47 have < 50. |

## 1. Eval history (`evaluation_results`, every row, aggregated per run × k × metric)

105 rows in total, all from one run on 2026-06-18 09:42–10:19 UTC. It covered 5 partitions, with n_test = 6,439 and n_train = 25,741 summed over the partitions.

| date | metric | k=10 | k=20 | k=30 |
|---|---|---|---|---|
| 2026-06-18 | hit_rate | 0.2832 | 0.4195 | 0.5348 |
| 2026-06-18 | precision | 0.0650 | 0.0679 | 0.0704 |
| 2026-06-18 | recall | 0.0362 | 0.0750 | 0.1160 |
| 2026-06-18 | ndcg | 0.0654 | 0.0718 | 0.0957 |
| 2026-06-18 | mrr | 0.1329 | 0.1329 | 0.1329 |

**Trend: none measurable.** There is no second run, so current-vs-previous cannot be computed. MRR is identical at every k, so the MRR metric looks k-independent in `evaluate.py` (verify when the next run lands).

Why nothing newer exists:
- `run-full-eval.sh` skips when any `grimoire-cf-api-api-run-*` container is running. The pipeline daemon is such a container and sleeps between cycles, so the check always fires. `grimoire-eval.log` shows `SKIP: pipeline daemon running` on 07-01, 08-01 and 09-01.
- The light eval in `run-pipeline.sh` (lines ~81–86) only runs after the daemon exits 0. The daemon loops forever and only exits when killed (137), so the light eval never runs.

## 2. SVD training history (`training_log`, last 12)

| created_at (UTC) | trigger | decks before → after | new since last | partitions | decks trained | duration s |
|---|---|---|---|---|---|---|
| 2026-09-24 17:47 | manual_force | 4,292,472 → 4,294,336 | 1,864 | 33 | 875,832 | 6,017 |
| 2026-09-22 01:10 | threshold | 4,249,686 → 4,253,202 | 51,249 | 33 | 874,555 | 7,171 |
| 2026-09-19 03:04 | threshold | 4,197,665 → 4,201,953 | 51,194 | 33 | 872,438 | 5,466 |
| 2026-09-15 21:17 | threshold | 4,147,162 → 4,150,759 | 50,438 | 33 | 870,111 | 5,617 |
| 2026-09-12 23:02 | threshold | 4,097,294 → 4,100,321 | 53,948 | 33 | 868,892 | 7,689 |
| 2026-09-12 22:52 | threshold | 4,096,298 → 4,100,315 | 53,942 | 33 | 868,892 | 8,393 |
| 2026-09-09 14:43 | threshold | 4,041,250 → 4,046,373 | 50,085 | 33 | 867,685 | 10,117 |
| 2026-09-06 20:26 | threshold | 3,996,087 → 3,996,288 | 50,640 | 33 | 866,605 | 5,347 |
| 2026-09-02 03:08 | threshold | 3,944,740 → 3,945,648 | 54,570 | 33 | 865,514 | 6,897 |
| 2026-09-02 02:55 | threshold | 3,941,318 → 3,945,637 | 54,559 | 33 | 865,514 | 7,473 |
| 2026-08-29 16:11 | threshold | 3,887,086 → 3,891,078 | 51,326 | 33 | 864,546 | 8,539 |
| 2026-08-26 19:02 | threshold | 3,834,831 → 3,839,752 | 50,330 | 33 | 863,389 | 6,849 |

Two pairs of rows (09-12 and 09-02) finished 10–13 minutes apart with identical inputs. These are duplicate trainings, most likely two processes (the daemon and an in-API `/admin/trigger-pipeline` run) crossing the 50K gate together.

`model_artifacts`: 33 `full_model` rows, created 2026-09-24 16:07:42, n_decks sum 875,832, max n_cards 35,575.

## 3. Data growth since the last SVD (2026-09-24 16:07 UTC)

| source | format | decks |
|---|---|---|
| moxfield | commander | 30,434 |
| archidekt | commander | 7,524 |
| moxfield | historicBrawl | 110 |
| **total** | | **38,068** |

Daily scrape (UTC date of `scraped_at`):

| day | moxfield cmd | archidekt cmd | moxfield hBrawl |
|---|---|---|---|
| 09-20 | 14,936 | 3,939 | 71 |
| 09-21 | 15,893 | 2,328 | 56 |
| 09-22 | 12,659 | 2,171 | 52 |
| 09-23 | 9,879 | 4,123 | 57 |
| 09-24 | 10,111 | 2,545 | 39 |
| 09-25 | 13,319 | 3,263 | 38 |
| 09-26 | 11,054 | 3,312 | 53 |
| 09-27 (to 11:30) | 2,405 | 247 | 4 |

Corpus: commander 4,318,945, historicBrawl 11,595 (Brawl is excluded from SVD training, `format = 'commander'`). EDHREC contributes +0 per cycle.

Today's low count comes from the dead daemon. The only scrape since 00:06 was an in-API `/admin/trigger-pipeline` run (00:23–01:50, +2,319 Moxfield / +129 Archidekt, VW retrained 01:50). The next daemon SVD gate is at 4,344,336 decks, 13,796 more than now.

**What a retrain on this data buys.** 37,958 new commander decks go mostly into partitions that are already capped at 30K. Their chance of being in the training sample is 30K/n per partition. The retrain mainly redraws the random sample, so expect another ~50 % top-20 churn that says little about the new decks.

## 4. Bandit health (last 7 days)

| day | impressions | distinct deck_hash | outcomes |
|---|---|---|---|
| 09-20 | 100 | 2 | 0 |
| 09-22 | 550 | 11 | 0 |
| 09-24 | 500 | 11 | 0 |
| 09-25 | 400 | 8 | 0 |
| 09-26 | 1,450 | 29 | 0 |
| 09-27 | 100 | 2 | 0 |

- All-time: 14,003 impressions against 6 outcomes (1 per 2,334). The last outcome was 2026-09-03 20:01. The ratio has worsened since the historical 1 per 4,178: it is now 0 per 3,100 over 7 days.
- The capture side is not the only problem. nginx shows 0 `/cf-api/events*` requests in `access.log` + `.1`, and the API has logged 0 since it restarted at 03:00, while `/recommend` got 47 requests. The desktop calls `/events/track` (`src/lib/cf-api-client.ts:395,420`, `src/app/api/ai-suggest/apply/route.ts:46`, `src/app/api/cf-events/route.ts:12`), but no client is sending. The web app / build-api path most likely does not call it at all (unverified).
- **Inference defect:** `vw_engine.py:205-209` expects `workspace.predict()` to return `(action_idx, prob)` pairs. vowpalwabbit 9.11.2 with `--cb_explore_adf` returns a flat list of probabilities in action order, so the unpack raises. The API then falls back to uniform `1/len(candidates)` scores. Failure counts from the API log: 8/8 `/recommend` on 09-25, 29/33 on 09-26, 2/2 on 09-27. Likely fix (model code, not applied): `for action_idx, prob in enumerate(prediction):`.
- Net effect: "rrf+vw" is CF-only ranking plus a constant. The VW model retrains every cycle on impressions with zero rewards and influences nothing.

## 5. Reality Fracture (fra/frc) presence

- Desktop card DB (`%APPDATA%/the-black-grimoire/data/mtg-deck-builder.db`, read-only): fra 270 rows / 269 names, frc 18 rows / 18 names, 287 distinct names. The brief's ~372 does not match this DB.
- CF `card_popularity`: **287 / 287 present**. 47 have < 50 inclusions (the lowest are Codie, Ravenous Codex 8; Sureshot Sower 9; Shatterwing Pegasus 15), and 240 have ≥ 50.
- `commander_card_stats`: 270 of 287 present.
- Caveat: the desktop `cards` table carries one `set_code` per name (the newest printing), so reprints cannot be separated from new cards there. The low-inclusion tail is the pre-release brew signal. Those cards reach the SVD vocabulary only if they clear the per-partition sample and min-count.

## 6. Risks

1. **Weekly daemon kill.** `0 3 * * 0 systemctl restart docker` kills the pipeline daemon every Sunday. The wrapper retries only within its own process, so after 3 Sundays it gives up and the daemon stays down until the next 22:00 cron. That means up to 19 h of no scraping and no VW or threshold SVD per week.
2. **Eval blind spot.** No offline metric since 06-18. Any SVD regression ships unmeasured, and the retrain smoke gate only checks that ≥ 10 cards come back.
3. **Sampling-dominated retrains.** Unseeded `random.sample` under the 30K cap means every retrain reshuffles about half of the top-20 lists. Users see churn without quality change. Seed it and/or use recency-weighted sampling.
4. **VW is dead weight.** The inference bug plus zero outcomes mean every bandit claim ("vw_model_active": true) is false in effect. `/health` reports it as healthy.
5. **Duplicate trainings** (09-02, 09-12) point to a race between the daemon and `/admin/trigger-pipeline`. The in-API pipeline also runs inside api-1, and the retrain's `docker restart` would kill it. The retrain gate cannot see it (it only counts `api-run-*` containers).
6. **run-full-eval.sh guard vs the 22:00 cron.** If an eval container (`api-run-*`) is still up at 22:00, run-pipeline.sh treats it as a live daemon and SKIPS the spawn, so the daemon would stay dead another day. Any chained eval must end before 22:00.
7. **Stale retrain gates.** `force-svd-retrain.sh` assumes a live sleeping daemon (exactly 1 `api-run-*` container) and reads cycle markers only from the un-rotated `/var/log/grimoire-pipeline.log`. That log was copytruncate-rotated at 00:25, so today it finds no markers.

## 7. Armed schedule (Option A, approved by the lead 2026-09-27)

```
$ systemctl list-timers --all | grep cf-svd        (11:37:48 UTC)
Sun 2026-09-27 16:05:00 UTC 4h 27min -  -  cf-svd-force-retrain.timer  cf-svd-force-retrain.service
$ systemctl cat cf-svd-force-retrain.*
OnCalendar=2026-09-27 16:05:00 UTC   AccuracySec=1s
ExecStart="/bin/bash" "/opt/grimoire-cf-api/ops/retrain-then-eval.sh"
```

| UTC | Step | Guard |
|---|---|---|
| 16:05 | the timer starts `retrain-then-eval.sh`, which runs `force-svd-retrain.sh` | window: 0 daemon containers and 16:00–19:15, else loop every 5 min until the daemon-alive path opens or HARD_DEADLINE 2026-09-28 01:00 |
| ~16:05–17:50 | pre-flight, pg_dump backup, train (09-24 took 6,017 s), API restart, reload check, smoke gate, auto-rollback | unchanged script logic |
| ~17:50–18:45 | regression eval `evaluate.py --partition WBRG,UBRG,WUBR,WUBG --k 10,20,30 --seed 42 --save` (est. ~50 min) | only if THIS run logged `complete: SUCCESS` and it is ≤ 19:30 UTC; `timeout -k 60 7200` → hard stop ≤ 21:31 |
| 22:00 | cron `run-pipeline.sh` spawns the daemon | no `api-run-*` container left (see below) |

### What changed on the VPS

| File / unit | Change | Backup / revert |
|---|---|---|
| `ops/force-svd-retrain.sh` | HARD_DEADLINE plus two additive blocks (diff below). `bash -n` OK | `cp -p ops/force-svd-retrain.sh.bak-2026-09-27 ops/force-svd-retrain.sh` |
| `ops/retrain-then-eval.sh` | NEW, mode 750, `bash -n` OK. Local copy here | `rm` |
| `cf-svd-force-retrain.timer/.service` | transient `systemd-run` unit | `systemctl stop cf-svd-force-retrain.timer` |
| `/opt/grimoire-backups/manual/recs-before-20260927T113410Z.json`, `...113741Z.json` | two DRY_RUN baseline snapshots | — |

`diff force-svd-retrain.sh.bak-2026-09-27 force-svd-retrain.sh`. The daemon-alive lines are untouched; only additions plus HARD_DEADLINE:

```diff
19c19
- HARD_DEADLINE="2026-09-25 01:00:00"   # UTC, matches server clock (verified UTC)
+ HARD_DEADLINE="2026-09-28 01:00:00"   # UTC, matches server clock (verified UTC)
63a64,75
+   # 2026-09-27 additive: no pipeline daemon container at all (killed, retries exhausted) ->
+   # the next spawn is the 22:00 UTC cron. Start only while >= 2h45m of room remains before it.
+   local runs hhmm
+   runs=$(docker ps --filter 'name=grimoire-cf-api-api-run-' -q | wc -l)
+   if [ "$runs" -eq 0 ]; then
+     hhmm=$(date -u +%H%M)
+     if [ "$hhmm" -ge 1600 ] && [ "$hhmm" -le 1915 ]; then
+       echo "window OK: no pipeline daemon running, hour=$hour UTC, >= 2h45m before the 22:00 cron"; return 0
+     fi
+     echo "daemon down: NO (outside 16:00-19:15 UTC, next spawn is the 22:00 cron)"; return 1
+   fi
+
111a124,129
+   # 2026-09-27 additive: 0 = daemon down; window_ok's 0-container branch bounded the start to
+   # 16:00-19:15 UTC, so accept it and let the unchanged exactly-1 check below pass.
+   if [ "$run_count" -eq 0 ]; then
+     log "pre-flight: 0 api-run containers accepted (daemon down, start bounded before the 22:00 cron)"
+     run_count=1
+   fi
```

`DRY_RUN=1` of the installed script (11:37 UTC), rc 0:

```
window check: off-hours: NO (hour=11 UTC)          <- expected before 16:00
pre-flight: running api-run containers = 0
pre-flight: 0 api-run containers accepted (daemon down, start bounded before the 22:00 cron)
pre-flight: mem usage -- postgres 19.45%  api-1 51.10%
pre-flight: model_artifacts=1.587GB, need >= 4.761GB free on /opt, have 68.125GB
pre-flight: PASS
baseline snapshot: commanders with >=10 cards: 5/5
```

### Wrapper `retrain-then-eval.sh` — eval only after a SUCCESS

1. Retrain rc ≠ 0 (pre-flight/backup/train failure, or ROLLED BACK, which exits 1) → `[chain] retrain rc=N -> eval skipped`, exit rc.
2. rc 0 without a `=== force-svd-retrain.sh complete: SUCCESS ===` line appended during THIS run (no window, nothing trained, lock busy) → skip, exit 0. Only log lines after the wrapper's start count, so the 09-24 SUCCESS line cannot trigger it.
3. SUCCESS after 19:30 UTC on the start date → skip, Telegram `CF regression eval skipped: retrain finished after 19:30 UTC`.
4. Otherwise the eval runs as container `grimoire-cf-api-api-run-posteval` under `timeout -k 60 7200`. `docker rm -f` of that name follows, because killing the compose client does not always stop the container. Telegram then reports complete or FAILED.

Stubbed runs (done before the cutoff moved from 19:45 to 19:30; branch logic unchanged): rc=1 → skip rc 1; rc 0 without SUCCESS → skip rc 0; SUCCESS → eval branch. `docker compose run --name` is supported (compose 2.40.3).

### 22:00 cron vs. a leftover eval container

`run-pipeline.sh:26-33` counts **running** containers matching `name=grimoire-cf-api-api-run-`. If there are more than 0, it logs `SKIP: N pipeline daemon container(s) already running` and exits 0. It never runs concurrently, but it **skips the spawn**, and the daemon would then stay dead until the next day's 22:00 cron. The eval container is named `grimoire-cf-api-api-run-posteval` on purpose so this guard sees it and avoids a double pipeline. Three guards keep it from being there at 22:00: the 19:30 start cutoff, `timeout -k 60 7200` (hard stop by 21:31), and `docker rm -f` after exit.

One residual: the retrain train step itself has no timeout. A start at 19:15 plus the slowest recent training (10,117 s on 09-09) would end at 22:04. The 16:05 start makes this moot unless the window is held back for 3 h.

### Where results appear

- `/var/log/grimoire-pipeline-manual.log`: retrain steps and `[chain]` lines. `journalctl -u cf-svd-force-retrain.service`.
- `/var/log/grimoire-eval.log`: evaluate.py output. Postgres `evaluation_results`: new `evaluated_at` rows for 4 partitions × k 10/20/30 × metrics, including `_ns` variants that the 06-18 run lacks.
- Telegram: `forced SVD retrain SUCCESS … overlap: N%` / `FAILED …` / `ROLLED BACK …` / `skipped: no safe window`, then `CF regression eval after SVD retrain complete (Nm)` / `FAILED rc=N` / `skipped`.
- Baseline comparison:
  ```sql
  select evaluated_at::date, partition, k, metric_name, round(metric_value::numeric,4), n_test_decks
  from evaluation_results where k=20 and metric_name in ('hit_rate','recall','ndcg') order by partition, evaluated_at;
  ```

### Rollback

- Automatic: when the reload check or smoke gate fails, the script restores `model_artifacts` + `training_log` from `/opt/grimoire-backups/manual/cf-pretrain-<TS>.dump` (`pg_restore --clean --if-exists --single-transaction`), runs `docker restart grimoire-cf-api-api-1`, and sends Telegram `ROLLED BACK`. No eval follows.
- Manual (if the new model is live but bad): take the newest `cf-pretrain-*.dump` from `ls -t /opt/grimoire-backups/manual/`, then run `docker cp <dump> grimoire-cf-api-postgres-1:/tmp/r.dump && docker exec grimoire-cf-api-postgres-1 pg_restore -U grimoire -d grimoire_cf --clean --if-exists --single-transaction /tmp/r.dump && docker restart grimoire-cf-api-api-1`. `cached_recommendations` holds 7-day recs; clear it only if the stale ones must go.
- Cancel before 16:05: `systemctl stop cf-svd-force-retrain.timer`.

## 8. Findings — recorded, not fixed (proposed fix each)

| # | Finding | Evidence | Proposed fix |
|---|---|---|---|
| F1 | **Pipeline daemon dead since 03:00 UTC.** Root crontab `0 3 * * 0 /usr/bin/systemctl restart docker` (log `/var/log/docker-weekly-restart.log`) kills the daemon container every Sunday. run-pipeline.sh's retry loop lives in the process that started 09-20 03:02 (attempt 3/3), so today's exit 137 was its last retry: `CRITICAL: Pipeline failed after 3 attempts`. No scraping and no VW/threshold SVD until the 22:00 cron. | `grimoire-pipeline.log` 03:00:23; 0 `api-run-*` containers | Move the docker restart to just before the 22:00 cron (e.g. Sun 21:50), or reset the attempt counter when exit 137 follows a docker restart, or add a `*/30` watchdog that runs run-pipeline.sh when 0 daemon containers exist. |
| F2 | **Monthly full eval never runs.** It SKIPPED on 07-01, 08-01 and 09-01 because its guard treats the always-present sleeping daemon container as a running pipeline. | `grimoire-eval.log` `[EVAL] SKIP` ×3 | Tell a sleeping daemon from an active cycle (last marker in `grimoire-pipeline.log*`), or run the eval inside the daemon's sleep window. |
| F3 | **Full eval is infeasible anyway.** evaluate.py saves only after the last partition. The 4+1-partition run took 37 min at ~32K decks; 33 partitions at ~876K extrapolate to ~17 h against `timeout 7200`, so nothing would ever be saved. | `evaluate.py:307-389`; `evaluation_results` 06-18 | Commit per partition inside the loop, cap test decks per partition, run it as a multi-night job or drop it for the fixed regression set. |
| F4 | **Nightly regression eval is dead twice over.** In `run-pipeline.sh:81-86` it only runs after the daemon exits 0, which never happens (it loops forever), and its `timeout 900` is below the ~50 min needed for WBRG,UBRG,WUBR,WUBG today (44,158 decks). | `evaluation_results` has one run; `run-pipeline.sh:82` | Move the regression eval into the daemon cycle after a (threshold) retrain, with `timeout 5400`. |
| F5 | **Retrain window gate reads a copytruncate-rotated log.** It greps only `/var/log/grimoire-pipeline.log`. logrotate (`weekly, copytruncate`) emptied it at 00:25, so the markers sit in `.log.1` and the gate would loop to the deadline. It also assumed a live daemon (pre-flight "exactly 1"). Today's additive branch covers only the no-daemon case. | logrotate stanza; 0 markers in `.log`, present in `.log.1` | Read `cat /var/log/grimoire-pipeline.log.1 /var/log/grimoire-pipeline.log` (or `zcat -f grimoire-pipeline.log*`) for the markers, and keep the 0-container branch permanently. |
| F6 | VW inference broken on every request (§4). | API log; `vw_score` = 1/N | `vw_engine.py:209` `for action_idx, prob in enumerate(prediction):` plus a test pinning the vowpalwabbit 9.x return shape. |
| F7 | No bandit outcomes (§4). | 0 `/events/track` at nginx/API | Fire `/events/track` from the web/build-api apply paths; alert when outcomes are 0 over 7 d with impressions > 0. |
| F8 | Retrains are sampling-dominated (§3). | `cf_engine.py:121-124` | Seed the 30K sample and/or recency-weight it; measure with the regression eval before/after. |
| F9 | Hidden in-API pipeline (`/admin/trigger-pipeline`, 00:23–01:50 today), invisible to both gates. Duplicate trainings on 09-02 and 09-12. | API log; `training_log` pairs | Postgres advisory lock taken by `nightly_pipeline` and by the retrain. |
