# MTG Deck Builder

A desktop application for building, analyzing, and improving Magic: The Gathering decks. Integrates with MTG Arena to track your matches and uses AI to suggest deck improvements based on your actual game data.

## Features

- **Deck Building** — Build decks for any format (Standard, Commander, Brawl, Modern, etc.) with full Scryfall card search and auto-complete
- **AI Suggestions** — Get intelligent card recommendations powered by Claude or GPT, with archetype-aware templates
- **AI Chat** — Have a conversation with AI about your deck strategy, ask for specific advice, and apply suggestions
- **Auto-Build** — Generate a complete deck from a commander or color identity using EDHREC data + synergy detection
- **Arena Integration** — Parse your Arena Player.log to automatically import match results, deck submissions, and collection
- **Match Tracking** — Track wins/losses per deck, see card win rates, and identify underperformers
- **Collection Management** — Import your Arena collection and get suggestions based on cards you own
- **Data Export** — Export your match data and card performance as JSON to share and improve the ML model
- **ML Pipeline** — Scikit-learn model that learns from your match data to generate personalized card suggestions
- **Deck Validation** — Format-specific rules (singleton, deck size, color identity) enforced automatically
- **Multi-User** — Create accounts with separate decks, collections, and match history

## Quick Start (Windows)

1. Download the latest installer from the [Releases](../../releases) page (`.exe` file)
2. Run the installer — Windows may show a SmartScreen warning, click "More info" → "Run anyway"
3. Launch **MTG Deck Builder** from your Start menu
4. Create an account (username + password, stored locally)
5. **Import your collection**: Settings → Arena Integration → set your Arena log path → "Parse Full Log"
6. Start building decks!

**Default Arena log path:** `C:\Users\<YOU>\AppData\LocalLow\Wizards Of The Coast\MTGA\Player.log`

## Quick Start (Mac/Linux)

1. Download the `.dmg` (Mac) or `.AppImage` (Linux) from [Releases](../../releases)
2. Install and launch
3. Same setup flow as Windows — create account, import collection, build decks

## How to Use

### Building a Deck

1. Go to **Deck Builder** → click **New Deck**
2. Pick a format and optionally set a commander
3. **Auto-Build**: Click "Auto Build" to generate a full deck based on EDHREC data and archetype templates
4. **AI Suggestions**: Click "Get Suggestions" for cut/add recommendations based on deck analysis
5. **AI Chat**: Use the chat panel to ask questions like "What removal should I add?" or "Is my mana curve okay?"
6. **Manual Edit**: Search for cards and add them directly

### Importing Your Arena Collection

1. Open **Settings** (gear icon)
2. Under **Arena Integration**, set your Player.log path (or click "Detect default path")
3. Click **Parse Full Log** — this imports your collection and match history
4. Enable **Live Watcher** to automatically capture new matches as you play

**Important:** Enable Detailed Logs in Arena: Options → Account → Detailed Logs (Plugin Support). Restart the client.

### Playing and Collecting Match Data

1. Build your deck in the app
2. Play games in Arena (Brawl, Standard, any format)
3. The app parses your Player.log to capture match results automatically
4. Check your deck's **Analytics** page to see win rates, card performance, and trends
5. After 20+ games, the ML model starts generating personalized suggestions

### Using the AI Chat

The AI chat understands your full deck context — cards, colors, format rules, and your collection. Ask things like:

- "What cards should I cut?"
- "My deck is too slow against aggro, what should I change?"
- "Can you see my collection?" (verifies collection is loaded)
- "What does [card name] do?"

### Setting Up AI (Optional but Recommended)

Go to **Settings** and add an API key:

- **Anthropic (Claude)** — Recommended. Get a key at [console.anthropic.com](https://console.anthropic.com)
- **OpenAI (GPT-4o)** — Alternative. Get a key at [platform.openai.com](https://platform.openai.com)

Keys are stored locally in your database and never sent to third parties.

## Collecting Match Data

### How It Works

The app reads Arena's `Player.log` file to extract:
- **Match results** (win/loss/draw)
- **Deck submissions** (which deck you played)
- **Cards played** (which cards you cast each game)
- **Opponent info** (cards seen, colors, estimated archetype)
- **Collection** (all cards you own in Arena)

Match data feeds into the ML pipeline to generate personalized card suggestions — the more you play, the better the suggestions get.

### How to Export Your Data

1. Open **Settings**
2. Click **Export Match Data**
3. A `.json` file downloads with all your matches, decks, collection, and card performance
4. Send the file to the project maintainer to help improve the ML model

### Privacy

- All data stays on your machine unless you explicitly export it
- The export contains your match history and card data — no personal information beyond Arena usernames
- API keys are never included in exports

## Troubleshooting

### App won't start
- **Port conflict**: Another process is using port 3000. Close it or set a different port
- **Database error**: Delete `data/mtg-deck-builder.db` to start fresh (you'll lose data)
- **Windows**: Make sure you're running the installed version, not the dev version

### Arena log not found
- Enable Detailed Logs: Arena → Options → Account → Detailed Logs → restart Arena
- Default path: `C:\Users\<YOU>\AppData\LocalLow\Wizards Of The Coast\MTGA\Player.log`
- Mac path: `~/Library/Logs/Wizards Of The Coast/MTGA/Player.log`

### AI suggestions not working
- Add an API key in Settings (Anthropic or OpenAI)
- Check that the key is valid and has credit
- The app tries: Claude → Ollama (local) → OpenAI → Rule-based fallback

### Collection not showing up
- Make sure you've parsed the Arena log at least once (Settings → Parse Full Log)
- Check that Detailed Logs is enabled in Arena

### Cards not found in search
- The card database is seeded from Scryfall. Run `npm run db:seed` to refresh
- Some digital-only/Alchemy cards may not be in the database

## Building from Source

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/MTG-deck-builder.git
cd MTG-deck-builder

# Install dependencies
npm install

# Seed the card database (first time only, downloads from Scryfall)
npm run db:seed

# Development mode (Next.js only)
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
```

### Python Scripts (Optional)

The ML pipeline and EDHREC scraping use Python 3.13+:

```bash
# Install Python dependencies
pip install pandas numpy scikit-learn joblib requests beautifulsoup4

# Run ML pipeline (after collecting match data)
py scripts/aggregate_matches.py
py scripts/train_model.py
py scripts/predict_suggestions.py

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
- **AI**: Claude Sonnet 4.5 / GPT-4o / Ollama (local)
- **ML**: Scikit-learn (Gradient Boosting) for card performance prediction
- **Card Data**: Scryfall API + EDHREC
- **Auth**: JWT + scrypt password hashing
- **Language**: TypeScript (strict) + Python 3.13

## License

MIT
