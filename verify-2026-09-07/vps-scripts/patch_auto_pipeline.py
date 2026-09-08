"""One-off patch for the VPS copy of auto_pipeline.py (2026-09-08):
  1. incremental (weekday) cycles scrape Standard too, not only Commander
  2. a new mtgo.com step after MTGTop8 (leagues + challenges, W/L + standings)
  3. after the meta aggregation, export the Standard slice and apply it to the build-api DB
Run: python patch_auto_pipeline.py <path-to-auto_pipeline.py>
"""
import sys

path = sys.argv[1]
s = open(path, encoding="utf-8").read()
orig = s

# 1) incremental branch: add standard with modest limits (recent-event skips keep repeats cheap)
old_inc = '''    else:
        gf_args = ["--formats", "commander",
                    "--max-archetypes", "50",
                    "--include-tournaments",
                    "--max-tournaments", "10",
                    "--max-decks-per-tournament", "32"]
        t8_args = ["--formats", "commander",
                    "--max-events", "20",
                    "--max-decks-per-event", "16"]
'''
new_inc = '''    else:
        gf_args = ["--formats", "commander", "standard",
                    "--max-archetypes", "50",
                    "--include-tournaments",
                    "--max-tournaments", "10",
                    "--max-decks-per-tournament", "32"]
        t8_args = ["--formats", "commander", "standard",
                    "--max-events", "30",
                    "--max-decks-per-event", "16"]
'''
assert s.count(old_inc) == 1, "incremental branch not found"
s = s.replace(old_inc, new_inc)

# 2) mtgo.com step right after the MTGTop8 step
old_t8 = '''    ok, _, _ = run_script("scrape_mtgtop8.py", t8_args, timeout=timeout_heavy)
    results["mtgtop8"] = ok
'''
new_t8 = old_t8 + '''
    # mtgo.com — official League 5-0 lists + Challenge standings with W/L (added 2026-09-08)
    mtgo_args = ["--formats", "standard",
                 "--max-events", "80" if max_mode else "40",
                 "--workers", "3"]
    ok, _, _ = run_script("scrape_mtgo.py", mtgo_args, timeout=1200)
    results["mtgo"] = ok
'''
assert s.count(old_t8) == 1, "mtgtop8 step not found"
s = s.replace(old_t8, new_t8)

# 3) export the 60-card slice after aggregation and push it into the build-api DB
old_agg = '''    ok, _, _ = run_script("aggregate_community_meta.py", [], timeout=300)
    results["meta_aggregate"] = ok
'''
new_agg = old_agg + '''
    # Standard slice -> data/export-standard.db + build-api DB (desktop pulls it with sync_vps_meta.py)
    ok, _, _ = run_script("export_standard_meta.py",
                          ["--out", str(PROJECT_DIR / "data" / "export-standard.db"),
                           "--formats", "standard",
                           "--apply-to", "/opt/grimoire-build-api/db/mtg-deck-builder.db"],
                          timeout=600)
    results["meta_export"] = ok
'''
assert s.count(old_agg) == 1, "meta aggregate step not found"
s = s.replace(old_agg, new_agg)

assert "aggregate_community_meta.py\", []" in s
open(path, "w", encoding="utf-8", newline="\n").write(s)
print(f"patched {path}: +{s.count(chr(10)) - orig.count(chr(10))} lines")
