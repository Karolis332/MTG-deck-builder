#!/usr/bin/env bash
#
# PR9: Example cron setup for the MTG Deck Builder data pipeline.
#
# Usage:
#   bash scripts/cron_setup.sh          # install crontab entries
#   bash scripts/cron_setup.sh --remove # remove entries
#
# The pipeline runs daily at 3:00 AM local time.
# Arena watcher runs as a background process (optional).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON="${PROJECT_DIR}/venv/bin/python3"
LOG_DIR="${PROJECT_DIR}/data/logs"
CRON_TAG="# mtg-deck-builder-pipeline"

# Fallback to system python if no venv
if [ ! -f "$PYTHON" ]; then
    PYTHON="python3"
fi

mkdir -p "$LOG_DIR"

install_cron() {
    # Remove existing entries first
    remove_cron 2>/dev/null || true

    CRON_LINE="0 3 * * * cd ${PROJECT_DIR} && ${PYTHON} scripts/pipeline.py >> ${LOG_DIR}/pipeline.log 2>&1 ${CRON_TAG}"

    (crontab -l 2>/dev/null || true; echo "$CRON_LINE") | crontab -

    echo "Cron job installed:"
    echo "  Schedule: Daily at 3:00 AM"
    echo "  Command:  ${PYTHON} scripts/pipeline.py"
    echo "  Log:      ${LOG_DIR}/pipeline.log"
    echo ""
    echo "Current crontab:"
    crontab -l | grep "mtg-deck-builder" || echo "  (none found)"
}

remove_cron() {
    crontab -l 2>/dev/null | grep -v "$CRON_TAG" | crontab - 2>/dev/null || true
    echo "Removed MTG Deck Builder cron entries."
}

case "${1:-}" in
    --remove)
        remove_cron
        ;;
    *)
        install_cron
        ;;
esac
