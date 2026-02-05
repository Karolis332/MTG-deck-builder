# MTG Deck Builder

[![Alpha Release](https://img.shields.io/github/v/release/Karolis332/MTG-deck-builder?include_prereleases&label=release)](https://github.com/Karolis332/MTG-deck-builder/releases/latest)

A desktop application for building, analyzing, and improving Magic: The Gathering decks. Integrates with MTG Arena to track your matches and uses AI to suggest deck improvements based on your actual game data.

## Features

- **Claude AI Deck Builder** — Pick a commander, choose a strategy, and Claude builds a complete 100-card deck with per-card explanations and role assignments (Ramp, Draw, Removal, Synergy, etc.)
- **Quick Build** — Instantly generate a deck using EDHREC data + archetype templates + commander synergy scoring (no API key needed)
- **AI Chat** — Conversational deck tuning: ask for cuts, additions, strategy advice. Context-aware of your full deck, collection, and format rules
- **Commander Synergy Engine** — Analyzes commander oracle text across 12 trigger categories (ETB, dies, attack, spellcast, etc.) to score every candidate card
- **11 Archetype Templates** — Aggro, midrange, control, combo, aristocrats, spellslinger, voltron, tribal, group hug, stax, superfriends — with tuned mana curves and slot ratios
- **EDHREC Integration** — Community synergy data, average decklists, and strategy articles baked into AI prompts
- **Arena Integration** — Parse your Player.log to import match results, deck submissions, and collection automatically
- **Analytics Dashboard** — Win rates by deck/format/opponent, card performance tracking, mana curve analysis
- **Collection Management** — Import your Arena collection and filter AI suggestions to cards you own
- **ML Pipeline** — Scikit-learn model that learns from your match data to generate personalized card suggestions
- **Data Export/Import** — Export everything as JSON for backup or sharing
- **Multi-User** — Separate accounts with isolated decks, collections, and match history

## Download

Download the latest release from the [Releases page](https://github.com/Karolis332/MTG-deck-builder/releases/latest):

| File | Description |
|------|-------------|
| `MTG Deck Builder-*-win-x64.exe` | Windows installer (recommended) |
| `MTG Deck Builder-*-portable.exe` | Windows portable (no install needed) |
| `MTG Deck Builder-*-win-x64.zip` | Windows zip archive |

> **Note:** Windows may show a SmartScreen warning since the app is not code-signed. Click "More info" then "Run anyway".

## Quick Start

1. **Download and install** from the link above
2. **Create an account** (username + password, stored locally)
3. **Seed the card database** — the app prompts you on first launch to download ~35K cards from Scryfall (takes 2-3 minutes)
4. **Add your Claude API key** (optional but recommended): Settings → Anthropic API Key
5. **Import your Arena collection** (optional): Settings → Arena Integration → Parse Full Log
6. **Build your first deck!**

## How to Use

### Building a Deck

1. Go to **Deck Builder** → click **New Deck**
2. Pick a format (Commander, Brawl, Standard, Modern, etc.) and set a commander if applicable
3. Choose your build method:
   - **Quick Build** — Instant, free, uses EDHREC + synergy scoring
   - **AI-Reasoned Build** — Claude analyzes 120 candidates and selects cards with explanations (requires API key, takes 15-30s)
4. After building, the deck editor shows an **AI Build Strategy** panel with:
   - Strategy explanation
   - Role breakdown (which cards serve Ramp, Draw, Removal, etc.)
   - Per-card reasoning (why each card was chosen)
5. **AI Chat**: Use the chat panel to refine — "What removal should I add?", "Is my mana curve okay?", "Swap 3 cards for more card draw"
6. **Manual Edit**: Search and add cards directly, drag between main/sideboard/commander zones

### Setting Up AI

Go to **Settings** and add an API key:

- **Anthropic (Claude)** — Recommended. Best deck building intelligence. Get a key at [console.anthropic.com](https://console.anthropic.com)
- **OpenAI (GPT-4o)** — Alternative. Get a key at [platform.openai.com](https://platform.openai.com)

You can also choose between Claude Sonnet 4.5 (fast, cheaper) and Claude Opus 4.6 (best quality) in Settings.

Keys are stored locally in your database and never sent to third parties.

### Arena Integration

1. **Enable Detailed Logs in Arena**: Options → Account → Detailed Logs (Plugin Support) → restart Arena
2. Open **Settings** (gear icon) → **Arena Integration**
3. Set your Player.log path (or click "Detect default path")
4. Click **Parse Full Log** to import collection + match history
5. Enable **Live Watcher** to capture new matches as you play

**Default log paths:**
- Windows: `C:\Users\<YOU>\AppData\LocalLow\Wizards Of The Coast\MTGA\Player.log`
- Mac: `~/Library/Logs/Wizards Of The Coast/MTGA/Player.log`

### Match Data & ML

1. Play games in Arena with your built decks
2. The app captures match results automatically via the log watcher
3. Check **Analytics** to see win rates, card performance, and trends
4. After 20+ games, run the ML pipeline (see Python Scripts below) to generate personalized card suggestions
5. The more you play, the better the suggestions get

### Data Export

Settings → **Export Match Data** downloads a JSON file with all your matches, decks, collection, and card performance. Share exports to help improve the ML model. No personal info beyond Arena usernames is included.

## Troubleshooting

### App won't start
- **Port conflict**: Another process is using port 3000. Close it or set a different port
- **Database error**: Delete `data/mtg-deck-builder.db` to start fresh (you'll lose data)
- **Windows**: Make sure you're running the installed version, not the dev version

### Arena log not found
- Enable Detailed Logs: Arena → Options → Account → Detailed Logs → restart Arena
- Verify the log path in Settings matches your actual Player.log location

### AI suggestions not working
- Add an API key in Settings (Anthropic or OpenAI)
- Check that the key is valid and has credit
- The app tries: Claude → Ollama (local) → OpenAI → Rule-based fallback

### Collection not showing up
- Parse the Arena log at least once (Settings → Parse Full Log)
- Verify Detailed Logs is enabled in Arena

### Cards not found in search
- The card database seeds from Scryfall on first launch. If cards are missing, reseed via the dev console
- Some digital-only/Alchemy cards may not be in the database

## Building from Source

```bash
# Clone the repo
git clone https://github.com/Karolis332/MTG-deck-builder.git
cd MTG-deck-builder

# Install dependencies
npm install

# Seed the card database (first time only, downloads from Scryfall)
npm run db:seed

# Development mode (Next.js only, http://localhost:3000)
npm run dev

# Development mode (Full Electron + Next.js)
npm run dev:electron

# Run tests
npm test

# Build for production
npm run build

# Package Windows installer
npm run dist:win

# Package Mac app
npm run dist:mac

# Package Linux app
npm run dist:linux
```

### Python Scripts (Optional)

The ML pipeline and EDHREC scraping use Python 3.13+:

```bash
# Install Python dependencies
pip install pandas numpy scikit-learn joblib requests beautifulsoup4

# Run full ML pipeline (aggregate → train → predict)
py scripts/pipeline.py

# Or run steps individually:
py scripts/aggregate_matches.py    # Build card_performance from match data
py scripts/train_model.py          # Train Gradient Boosting model
py scripts/predict_suggestions.py  # Generate personalized suggestions

# Scrape EDHREC articles for AI knowledge base
py scripts/scrape_edhrec_articles.py

# Fetch average decklists for your commanders
py scripts/fetch_avg_decklists.py

# Import a friend's exported data
py scripts/import_user_data.py their-export.json
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Recharts
- **Desktop**: Electron 33
- **Database**: SQLite (better-sqlite3, WAL mode, FTS5 full-text search)
- **AI**: Claude Sonnet 4.5 / Opus 4.6 / GPT-4o / Ollama (local)
- **ML**: Scikit-learn (Gradient Boosting) for card performance prediction
- **Card Data**: Scryfall API + EDHREC
- **Auth**: JWT + scrypt password hashing
- **Language**: TypeScript (strict) + Python 3.13
- **Testing**: Vitest (161 tests)

## License

MIT
