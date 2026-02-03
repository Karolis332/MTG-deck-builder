#!/usr/bin/env bash
set -euo pipefail

# MTG Deck Builder - Setup & Run Script
# Usage: ./setup.sh [--dev | --build | --prod | --seed | --test]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[MTG]${NC} $1"; }
warn() { echo -e "${YELLOW}[MTG]${NC} $1"; }
err()  { echo -e "${RED}[MTG]${NC} $1"; }

# ── Check prerequisites ──────────────────────────────────────────────────────
check_node() {
  if ! command -v node &>/dev/null; then
    err "Node.js is not installed. Install Node.js 18+ from https://nodejs.org"
    exit 1
  fi

  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    err "Node.js 18+ required (found v$(node -v)). Please upgrade."
    exit 1
  fi
  log "Node.js $(node -v) detected"
}

check_npm() {
  if ! command -v npm &>/dev/null; then
    err "npm is not installed."
    exit 1
  fi
  log "npm $(npm -v) detected"
}

# ── Install dependencies ─────────────────────────────────────────────────────
install_deps() {
  if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install
  else
    log "Dependencies already installed. Run 'npm install' to update."
  fi
}

# ── Initialize data directory ─────────────────────────────────────────────────
init_data() {
  if [ ! -d "data" ]; then
    mkdir -p data
    log "Created data directory."
  fi
}

# ── Seed database ────────────────────────────────────────────────────────────
seed_db() {
  log "Seeding card database from Scryfall (this downloads ~100MB of card data)..."
  log "You can also seed later from the web UI homepage."
  npm run db:seed
  log "Database seeded successfully!"
}

# ── Build for production ─────────────────────────────────────────────────────
build_app() {
  log "Building for production..."
  npm run build
  log "Build complete!"
}

# ── Run tests ─────────────────────────────────────────────────────────────────
run_tests() {
  log "Running tests..."
  npm test
  log "All tests passed!"
}

# ── Start dev server ─────────────────────────────────────────────────────────
start_dev() {
  log "Starting development server on http://localhost:3000"
  log "Press Ctrl+C to stop."
  echo ""
  npm run dev
}

# ── Start production server ──────────────────────────────────────────────────
start_prod() {
  log "Starting production server on http://localhost:3000"
  npm run start
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo "  ╔══════════════════════════════════╗"
  echo "  ║   MTG Deck Builder Setup         ║"
  echo "  ╚══════════════════════════════════╝"
  echo ""

  check_node
  check_npm
  install_deps
  init_data

  case "${1:-}" in
    --seed)
      seed_db
      ;;
    --build)
      build_app
      ;;
    --prod)
      build_app
      start_prod
      ;;
    --dev)
      start_dev
      ;;
    --test)
      run_tests
      ;;
    *)
      log "Setup complete! Available commands:"
      echo ""
      echo "  ./setup.sh --dev     Start development server"
      echo "  ./setup.sh --build   Build for production"
      echo "  ./setup.sh --prod    Build and start production server"
      echo "  ./setup.sh --seed    Download card database from Scryfall"
      echo "  ./setup.sh --test    Run test suite"
      echo ""
      log "Quick start: ./setup.sh --dev"
      log "Then open http://localhost:3000 and click 'Download Card Database'"
      echo ""
      ;;
  esac
}

main "$@"
