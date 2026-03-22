#!/usr/bin/env python3
"""
Autonomous continuous data pipeline: scrape → aggregate → train → evaluate → repeat.

Runs in cycles:
  Cycle 1: Full scrape (max settings) + train + evaluate
  Cycle 2-N: Incremental scrape + retrain + evaluate variants

Usage:
    py scripts/auto_pipeline.py                  # run continuously (forever)
    py scripts/auto_pipeline.py --hours 6        # run for 6 hours then stop
    py scripts/auto_pipeline.py --cycle-gap 45   # 45 min between cycles (default 30)

Logs everything to data/pipeline_monitor.log
"""

import argparse
import os
import sys
import time
import json
import sqlite3
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPTS_DIR.parent
DB_PATH = PROJECT_DIR / "data" / "mtg-deck-builder.db"
LOG_PATH = PROJECT_DIR / "data" / "pipeline_monitor.log"
REPORT_PATH = PROJECT_DIR / "data" / "pipeline_report.json"

PYTHON = sys.executable


def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except:
        pass


def run_script(script, args=None, timeout=900):
    """Run a Python script, return (success, stdout, elapsed)."""
    cmd = [PYTHON, str(SCRIPTS_DIR / script), "--db", str(DB_PATH)]
    if args:
        cmd.extend(args)
    log(f"  RUN: {script} {' '.join(args or [])}")
    start = time.time()
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                           cwd=str(PROJECT_DIR))
        elapsed = time.time() - start
        if r.returncode == 0:
            last_lines = r.stdout.strip().split("\n")[-3:]
            for l in last_lines:
                log(f"    {l}")
            log(f"  OK ({elapsed:.1f}s)")
            return True, r.stdout, elapsed
        else:
            log(f"  FAIL (exit {r.returncode}, {elapsed:.1f}s)")
            if r.stderr:
                for l in r.stderr.strip().split("\n")[-5:]:
                    log(f"    ERR: {l}")
            return False, r.stderr, elapsed
    except subprocess.TimeoutExpired:
        log(f"  TIMEOUT ({timeout}s)")
        return False, "timeout", timeout
    except Exception as e:
        log(f"  ERROR: {e}")
        return False, str(e), 0


def get_cf_api_key():
    """Read CF API key from app_state table."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        r = conn.execute("SELECT value FROM app_state WHERE key = 'cf_api_key'").fetchone()
        conn.close()
        return r[0] if r else None
    except:
        return None


def get_db_stats():
    """Get current row counts for key tables."""
    conn = sqlite3.connect(str(DB_PATH))
    stats = {}
    for table in ["community_decks", "community_deck_cards", "meta_card_stats",
                   "archetype_win_stats", "edhrec_knowledge", "edhrec_avg_decks",
                   "spellbook_combos", "topdeck_tournaments", "topdeck_standings",
                   "arena_parsed_matches", "card_performance", "grp_id_cache"]:
        try:
            r = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
            stats[table] = r[0]
        except:
            stats[table] = 0
    conn.close()
    return stats


def scrape_cycle(cycle_num, max_mode=False):
    """Run all scrapers. Weekend = full capacity (geo-scraper idle). Weekday = conservative."""
    weekend = is_weekend()
    if weekend:
        max_mode = True  # always MAX on weekends

    label = "WEEKEND FULL" if weekend else ("MAX" if max_mode else "INCREMENTAL")
    log(f"\n{'='*60}")
    log(f"SCRAPE CYCLE {cycle_num} ({label})")
    log(f"{'='*60}")

    results = {}

    # --- Tier settings: weekend > max > incremental ---
    if weekend:
        gf_args = ["--formats", "commander", "standard",
                    "--max-archetypes", "200",
                    "--include-tournaments",
                    "--max-tournaments", "50",
                    "--max-decks-per-tournament", "64"]
        t8_args = ["--formats", "commander", "standard",
                    "--max-events", "80",
                    "--max-decks-per-event", "32"]
        art_max, art_pages = "500", "20"
        gf_art_max, gf_art_pages = "500", "20"
        sb_max = "10000"
        td_max = "50"
        timeout_heavy = 3600  # 1 hour for heavy scrapers on weekends
    elif max_mode:
        gf_args = ["--formats", "commander", "standard",
                    "--max-archetypes", "100",
                    "--include-tournaments",
                    "--max-tournaments", "30",
                    "--max-decks-per-tournament", "64"]
        t8_args = ["--formats", "commander", "standard",
                    "--max-events", "50",
                    "--max-decks-per-event", "32"]
        art_max, art_pages = "200", "10"
        gf_art_max, gf_art_pages = "200", "10"
        sb_max = "2000"
        td_max = "30"
        timeout_heavy = 1800
    else:
        gf_args = ["--formats", "commander",
                    "--max-archetypes", "50",
                    "--include-tournaments",
                    "--max-tournaments", "10",
                    "--max-decks-per-tournament", "32"]
        t8_args = ["--formats", "commander",
                    "--max-events", "20",
                    "--max-decks-per-event", "16"]
        art_max, art_pages = "50", "3"
        gf_art_max, gf_art_pages = "50", "3"
        sb_max = "500"
        td_max = "10"
        timeout_heavy = 1800

    # MTGGoldfish — metagame + tournaments
    ok, _, _ = run_script("scrape_mtggoldfish.py", gf_args, timeout=timeout_heavy)
    results["goldfish"] = ok

    # MTGTop8 — tournaments
    ok, _, _ = run_script("scrape_mtgtop8.py", t8_args, timeout=timeout_heavy)
    results["mtgtop8"] = ok

    # EDHREC articles
    ok, _, _ = run_script("scrape_edhrec_articles.py",
                          ["--max-articles", art_max, "--max-pages", art_pages], timeout=900)
    results["edhrec_articles"] = ok

    # EDHREC average decklists
    ok, _, _ = run_script("fetch_avg_decklists.py", [], timeout=600)
    results["edhrec_avg"] = ok

    # MTGGoldfish articles
    ok, _, _ = run_script("scrape_mtggoldfish_articles.py",
                          ["--max-pages", gf_art_pages, "--max-articles", gf_art_max], timeout=900)
    results["goldfish_articles"] = ok

    # Commander Spellbook combos
    ok, _, _ = run_script("scrape_commander_spellbook.py",
                          ["--max-combos", sb_max], timeout=900)
    results["spellbook"] = ok

    # TopDeck.gg tournaments (needs API key in app_state)
    ok, _, _ = run_script("scrape_topdeck.py",
                          ["--max-tournaments", td_max], timeout=600)
    results["topdeck"] = ok

    # EDHREC commander synergy enrichment (max/weekend cycles)
    if max_mode:
        ok, _, _ = run_script("enrich_commander_synergies.py", ["--from-decks"], timeout=300)
        results["edhrec_synergy"] = ok

    return results


def aggregate_and_train():
    """Run aggregation + analysis + model training."""
    log(f"\n{'='*60}")
    log("AGGREGATE + TRAIN")
    log(f"{'='*60}")

    results = {}

    # Arena log parse
    ok, _, _ = run_script("arena_log_parser.py", [], timeout=120)
    results["arena"] = ok

    # Match aggregation
    ok, _, _ = run_script("aggregate_matches.py", [], timeout=120)
    results["aggregate_matches"] = ok

    # Community meta aggregation (computes archetype_win_stats)
    ok, _, _ = run_script("aggregate_community_meta.py", [], timeout=300)
    results["meta_aggregate"] = ok

    # Meta analysis
    ok, _, _ = run_script("analyze_meta.py", [], timeout=120)
    results["analyze"] = ok

    # Model training — blended (personal + community)
    ok, _, _ = run_script("train_model.py",
                          ["--model", "gbm", "--target", "blended"],
                          timeout=300)
    results["train"] = ok

    # Generate predictions
    if ok:
        ok2, _, _ = run_script("predict_suggestions.py", ["--all-decks"], timeout=300)
        results["predict"] = ok2

    return results


def evaluate_deck_variants():
    """Use the model to evaluate current deck and suggest variants."""
    log(f"\n{'='*60}")
    log("DECK VARIANT EVALUATION")
    log(f"{'='*60}")

    conn = sqlite3.connect(str(DB_PATH))

    # Get user's decks
    decks = conn.execute("""
        SELECT d.id, d.name, d.format
        FROM decks d WHERE d.user_id = 1
    """).fetchall()

    if not decks:
        log("  No decks found for evaluation")
        conn.close()
        return {}

    evaluations = {}

    for deck_id, deck_name, deck_format in decks:
        log(f"\n  Evaluating: {deck_name} (id={deck_id}, format={deck_format})")

        # Get deck cards
        deck_cards = conn.execute("""
            SELECT c.name, c.cmc, c.type_line, dc.quantity, dc.board,
                   c.oracle_text, c.power, c.toughness
            FROM deck_cards dc
            JOIN cards c ON dc.card_id = c.id
            WHERE dc.deck_id = ?
        """, (deck_id,)).fetchall()

        total = sum(r[3] for r in deck_cards)
        log(f"    Cards: {total}")

        # Analyze deck composition
        lands = sum(r[3] for r in deck_cards if r[2] and 'Land' in r[2])
        creatures = sum(r[3] for r in deck_cards if r[2] and 'Creature' in r[2] and 'Land' not in r[2])
        noncreature = total - lands - creatures
        avg_cmc = 0
        cmc_cards = [(r[1] or 0, r[3]) for r in deck_cards if r[2] and 'Land' not in r[2]]
        if cmc_cards:
            avg_cmc = sum(c * q for c, q in cmc_cards) / sum(q for _, q in cmc_cards)

        # Count removal
        removal_keywords = ['destroy', 'exile', 'deals damage', 'fight', '-1/-1', 'sacrifice']
        removal = 0
        for r in deck_cards:
            if r[5]:
                ot = r[5].lower()
                if any(kw in ot for kw in removal_keywords) and r[2] and 'Land' not in r[2]:
                    removal += r[3]

        # Count draw
        draw = 0
        for r in deck_cards:
            if r[5] and 'draw' in r[5].lower() and r[2] and 'Land' not in r[2]:
                draw += r[3]

        # Count ramp
        ramp = 0
        for r in deck_cards:
            if r[5]:
                ot = r[5].lower()
                if ('add' in ot and ('{g}' in ot or 'mana' in ot or 'any color' in ot)) and r[2] and 'Land' not in r[2]:
                    ramp += r[3]

        eval_data = {
            "deck_id": deck_id,
            "name": deck_name,
            "format": deck_format,
            "total_cards": total,
            "lands": lands,
            "creatures": creatures,
            "noncreature_spells": noncreature,
            "avg_cmc": round(avg_cmc, 2),
            "removal_count": removal,
            "draw_count": draw,
            "ramp_count": ramp,
        }

        # Get model predictions for this deck's cards
        card_names = [r[0] for r in deck_cards if r[2] and 'Land' not in r[2]]

        # Check predictions table
        try:
            predictions = conn.execute("""
                SELECT c.name, ps.score, ps.reason
                FROM prediction_scores ps
                JOIN cards c ON ps.card_id = c.id
                WHERE ps.deck_id = ?
                ORDER BY ps.score DESC
            """, (deck_id,)).fetchall()

            if predictions:
                log(f"    Top 5 predicted upgrades:")
                for name, score, reason in predictions[:5]:
                    log(f"      +{score:.3f} {name}: {reason or ''}")
                eval_data["top_predictions"] = [
                    {"name": n, "score": s, "reason": r} for n, s, r in predictions[:10]
                ]
        except:
            pass

        # Compare with community meta stats
        try:
            meta_matches = conn.execute("""
                SELECT ms.card_name, ms.meta_inclusion_rate, ms.archetype_win_rate
                FROM meta_card_stats ms
                WHERE ms.card_name IN ({})
                AND ms.meta_inclusion_rate > 0
                ORDER BY ms.archetype_win_rate DESC
                LIMIT 10
            """.format(",".join("?" * len(card_names))), card_names).fetchall()

            if meta_matches:
                log(f"    Top meta-performing cards in deck:")
                for name, inc_rate, win_rate in meta_matches[:5]:
                    wr = win_rate or 0
                    log(f"      {name}: {wr:.1%} WR, {inc_rate:.1%} inclusion")
                eval_data["meta_performers"] = [
                    {"name": n, "inclusion_rate": i, "win_rate": w or 0} for n, i, w in meta_matches
                ]
        except Exception as e:
            log(f"    Meta stats lookup: {e}")

        # Recommended ratios check (Brawl: 38-40 lands, 25-30 creatures, etc.)
        if deck_format and 'brawl' in deck_format.lower():
            issues = []
            if lands < 37:
                issues.append(f"Low land count ({lands}, want 38-40)")
            if creatures < 20:
                issues.append(f"Low creature count ({creatures}, want 25-30)")
            if removal < 8:
                issues.append(f"Low removal ({removal}, want 10+)")
            if draw < 8:
                issues.append(f"Low card draw ({draw}, want 10+)")
            if ramp < 10:
                issues.append(f"Low ramp ({ramp}, want 10-12)")
            if avg_cmc > 3.5:
                issues.append(f"High avg CMC ({avg_cmc:.2f}, want <3.5)")

            eval_data["issues"] = issues
            for issue in issues:
                log(f"    WARNING: {issue}")

        log(f"    Stats: {lands}L / {creatures}C / {noncreature}S | CMC {avg_cmc:.2f} | "
            f"Removal:{removal} Draw:{draw} Ramp:{ramp}")

        evaluations[deck_id] = eval_data

    conn.close()
    return evaluations


def trigger_cf_api_pipeline():
    """Trigger the collaborative filtering pipeline on VPS."""
    log("\n  Triggering CF API pipeline on VPS...")
    api_key = get_cf_api_key()
    if not api_key:
        log("    No CF API key in app_state — skipping VPS trigger")
        return False
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://187.77.110.100/cf-api/admin/trigger-pipeline",
            method="POST",
            headers={"X-API-Key": api_key}
        )
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        log(f"    CF API pipeline: {data}")
        return True
    except Exception as e:
        log(f"    CF API pipeline failed: {e}")
        return False


def check_cf_api_status():
    """Check CF API scrape status."""
    api_key = get_cf_api_key()
    if not api_key:
        return None
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://187.77.110.100/cf-api/admin/scrape-status",
            headers={"X-API-Key": api_key}
        )
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        log(f"    CF API status: {json.dumps(data, indent=2)[:200]}")
        return data
    except Exception as e:
        log(f"    CF API status check failed: {e}")
        return None


def is_weekend():
    """Saturday=5, Sunday=6."""
    return datetime.now().weekday() >= 5


def should_continue(end_time):
    """Check if pipeline should keep running. None = continuous (forever)."""
    if end_time is None:
        return True
    return datetime.now() < end_time


def main():
    parser = argparse.ArgumentParser(description="Autonomous continuous data pipeline")
    parser.add_argument("--hours", type=float, default=0,
                        help="Hours to run (0 = continuous/forever, default: 0)")
    parser.add_argument("--cycle-gap", type=int, default=30,
                        help="Minutes between cycles (default: 30)")
    parser.add_argument("--max-cycles", type=int, default=0,
                        help="Max cycles to run (0 = unlimited, default: 0)")
    args = parser.parse_args()

    start_time = datetime.now()
    end_time = start_time + timedelta(hours=args.hours) if args.hours > 0 else None
    cycle_gap_sec = args.cycle_gap * 60

    mode = f"{args.hours}h" if args.hours > 0 else "CONTINUOUS"
    weekend = is_weekend()
    log(f"\n{'#'*60}")
    log(f"AUTONOMOUS PIPELINE MONITOR — {mode}")
    log(f"Start:     {start_time.isoformat()}")
    log(f"End:       {end_time.isoformat() if end_time else 'NEVER (Ctrl+C to stop)'}")
    log(f"Cycle gap: {args.cycle_gap} min (weekday) / 15 min (weekend)")
    log(f"Day:       {'WEEKEND — FULL CAPACITY' if weekend else 'weekday — conservative'}")
    log(f"DB:        {DB_PATH}")
    log(f"CF API:    {'configured' if get_cf_api_key() else 'NOT SET'}")
    log(f"{'#'*60}")

    stats_before = get_db_stats()
    log(f"\nInitial data: {json.dumps(stats_before)}")

    report = {
        "start": start_time.isoformat(),
        "mode": mode,
        "cycles": [],
        "initial_stats": stats_before,
    }

    cycle = 0
    try:
        while should_continue(end_time):
            if args.max_cycles > 0 and cycle >= args.max_cycles:
                log(f"\nReached max cycles ({args.max_cycles}). Stopping.")
                break

            cycle += 1
            cycle_start = datetime.now()
            if end_time:
                remaining = (end_time - cycle_start).total_seconds() / 3600
                log(f"\n{'#'*60}")
                log(f"CYCLE {cycle} — {remaining:.1f} hours remaining")
            else:
                elapsed_h = (cycle_start - start_time).total_seconds() / 3600
                log(f"\n{'#'*60}")
                log(f"CYCLE {cycle} — running {elapsed_h:.1f}h")
            log(f"{'#'*60}")

            weekend = is_weekend()
            cycle_report = {"cycle": cycle, "start": cycle_start.isoformat(), "weekend": weekend}

            # Phase 1: Scrape — weekend=always MAX, weekday=first+every 10th
            max_mode = weekend or (cycle == 1) or (cycle % 10 == 0)
            scrape_results = scrape_cycle(cycle, max_mode=max_mode)
            cycle_report["scrape"] = scrape_results

            # Phase 2: Trigger CF API pipeline (first cycle + every 5th)
            if cycle == 1 or cycle % 5 == 0:
                trigger_cf_api_pipeline()

            # Phase 3: Aggregate + Train
            train_results = aggregate_and_train()
            cycle_report["train"] = train_results

            # Phase 4: Evaluate deck variants
            evals = evaluate_deck_variants()
            cycle_report["evaluations"] = evals

            # Phase 5: Check CF API status
            cf_status = check_cf_api_status()
            cycle_report["cf_status"] = cf_status

            # Stats after this cycle
            stats_after = get_db_stats()
            cycle_report["stats"] = stats_after
            cycle_report["end"] = datetime.now().isoformat()

            log(f"\nCycle {cycle} stats: {json.dumps(stats_after)}")

            # Show growth since start
            for k in stats_before:
                diff = stats_after.get(k, 0) - stats_before.get(k, 0)
                if diff > 0:
                    log(f"  +{diff} {k}")

            report["cycles"].append(cycle_report)

            # Save report after each cycle
            with open(REPORT_PATH, "w") as f:
                json.dump(report, f, indent=2, default=str)

            # Wait between cycles — shorter on weekends (15 min vs configured gap)
            elapsed = (datetime.now() - cycle_start).total_seconds()
            gap = 900 if is_weekend() else cycle_gap_sec  # 15 min weekends
            wait = max(gap - elapsed, 300)  # At least 5 min cooldown

            if should_continue(end_time):
                if end_time and datetime.now() + timedelta(seconds=wait) >= end_time:
                    log("\nNo time for another cycle.")
                    break
                log(f"\nSleeping {wait/60:.0f} minutes until next cycle...")
                time.sleep(wait)

    except KeyboardInterrupt:
        log("\n\nInterrupted by user (Ctrl+C)")

    # Final summary
    stats_final = get_db_stats()
    report["final_stats"] = stats_final
    report["actual_end"] = datetime.now().isoformat()
    report["total_cycles"] = cycle

    total_elapsed = (datetime.now() - start_time).total_seconds() / 3600

    log(f"\n{'#'*60}")
    log(f"PIPELINE STOPPED — {cycle} cycles in {total_elapsed:.1f}h")
    log(f"Final data: {json.dumps(stats_final)}")
    log(f"\nGrowth from start:")
    for k in stats_before:
        diff = stats_final.get(k, 0) - stats_before.get(k, 0)
        log(f"  {k}: {stats_before.get(k,0)} → {stats_final.get(k,0)} (+{diff})")
    log(f"{'#'*60}")

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2, default=str)
    log(f"Report saved to {REPORT_PATH}")


if __name__ == "__main__":
    main()
