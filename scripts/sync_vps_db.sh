#!/bin/bash
# Sync scraped data from VPS back to local machine.
# Pulls the VPS SQLite DB and merges community tables into local DB.
#
# Usage:
#   bash scripts/sync_vps_db.sh              # pull + merge
#   bash scripts/sync_vps_db.sh --pull-only  # just download, no merge

set -e

SSH_KEY="$HOME/.ssh/id_ed25519_geo_vps"
VPS="root@187.77.110.100"
VPS_DB="/opt/grimoire-scrapers/data/mtg-deck-builder.db"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)/data"
LOCAL_DB="$LOCAL_DIR/mtg-deck-builder.db"
VPS_COPY="$LOCAL_DIR/vps-scraped.db"

echo "=== Grimoire VPS DB Sync ==="
echo "VPS:   $VPS:$VPS_DB"
echo "Local: $LOCAL_DB"
echo ""

# Step 1: Pull VPS database
echo "[1/3] Downloading VPS database..."
scp -i "$SSH_KEY" "$VPS:$VPS_DB" "$VPS_COPY"
echo "  Downloaded to $VPS_COPY"

if [ "$1" = "--pull-only" ]; then
  echo "Done (pull-only mode)."
  exit 0
fi

# Step 2: Merge community tables from VPS into local
echo "[2/3] Merging community data into local DB..."

py - "$VPS_COPY" "$LOCAL_DB" << 'PYTHON'
import sqlite3
import sys

vps_db = sys.argv[1]
local_db = sys.argv[2]

vps = sqlite3.connect(vps_db)
local = sqlite3.connect(local_db)
local.execute("PRAGMA journal_mode=WAL")

# Tables to sync (VPS → local, replace all)
COMMUNITY_TABLES = [
    "community_decks",
    "community_deck_cards",
    "meta_card_stats",
    "archetype_win_stats",
    "edhrec_knowledge",
    "edhrec_avg_decks",
    "spellbook_combos",
    "spellbook_combo_cards",
    "spellbook_combo_results",
    "topdeck_tournaments",
    "topdeck_standings",
    "topdeck_deck_cards",
]

for table in COMMUNITY_TABLES:
    try:
        # Get VPS row count
        vps_count = vps.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        if vps_count == 0:
            continue

        # Get column names
        cols = [r[1] for r in vps.execute(f"PRAGMA table_info({table})").fetchall()]
        col_str = ", ".join(cols)
        placeholders = ", ".join(["?"] * len(cols))

        # Clear local and insert VPS data
        local.execute(f"DELETE FROM {table}")
        rows = vps.execute(f"SELECT {col_str} FROM {table}").fetchall()
        local.executemany(f"INSERT OR REPLACE INTO {table} ({col_str}) VALUES ({placeholders})", rows)
        local.commit()

        local_count = local.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {local_count} rows (from VPS: {vps_count})")
    except Exception as e:
        print(f"  {table}: SKIP ({e})")

vps.close()
local.close()
print("Merge complete.")
PYTHON

# Step 3: Show summary
echo "[3/3] Local DB stats after merge:"
py -c "
import sqlite3
conn = sqlite3.connect('$LOCAL_DB')
for t in ['community_decks','community_deck_cards','meta_card_stats','edhrec_knowledge','edhrec_avg_decks','spellbook_combos','topdeck_tournaments']:
    c = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
    print(f'  {t}: {c}')
conn.close()
"

echo ""
echo "=== Sync complete ==="
