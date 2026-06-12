# Installing The Black Grimoire

Step-by-step guide for new users installing The Black Grimoire desktop app.

---

## 1. System requirements

| Platform | Minimum |
|----------|---------|
| Windows | 10 (64-bit) or 11 |
| macOS | 11 Big Sur (Intel or Apple Silicon) |
| Linux | Ubuntu 20.04+ / Debian 11+ / equivalent |
| Disk | ~500 MB for the app + ~1 GB for card database and analytics |
| RAM | 2 GB minimum, 4 GB recommended |

MTG Arena is **not required**, but if you have it installed the app can read your match log automatically.

---

## 2. Download

| Platform | File | Size |
|----------|------|------|
| Windows | `BlackGrimoire-Setup-x.y.z.exe` | ~150 MB installer |
| Windows portable | `BlackGrimoire-x.y.z-portable.exe` | ~155 MB |
| macOS | `BlackGrimoire-x.y.z.dmg` | ~150 MB |
| Linux | `BlackGrimoire-x.y.z.AppImage` / `.deb` / `.tar.gz` | ~150 MB |

Latest builds: see the project release page (or your distribution channel — Overwolf, direct download, etc.).

---

## 3. Install

**Windows.** Double-click the `.exe`, accept the SmartScreen prompt (the installer is unsigned during alpha — this is expected), pick a location, finish. A "Black Grimoire" shortcut appears in Start menu.

**macOS.** Open the `.dmg`, drag the app to `/Applications`. First launch: right-click → "Open" to bypass Gatekeeper for unsigned builds.

**Linux.**
- AppImage: `chmod +x BlackGrimoire-*.AppImage && ./BlackGrimoire-*.AppImage`
- `.deb`: `sudo dpkg -i BlackGrimoire-*.deb`

---

## 4. First-time setup wizard

When you launch the app for the first time, you'll see a 5-step setup wizard. Each step is skippable except the database init.

### Step 1 — Environment

Auto-creates the local SQLite database and runs all migrations. Takes ~3 seconds. No input required.

**Where data goes** (you'll need this for backups):
- Windows: `%APPDATA%\The Black Grimoire\data\`
- macOS: `~/Library/Application Support/The Black Grimoire/data/`
- Linux: `~/.config/The Black Grimoire/data/`

### Step 2 — Account

Create a local username + password. **This account is local-only** — credentials never leave your machine. You can change them later in Settings.

| Field | Rules |
|-------|-------|
| Username | 3+ characters |
| Email | Valid format (used as recovery hint, not verified) |
| Password | 6+ characters |

You can skip account creation and set it up later, but you won't be able to save decks until you have one.

### Step 3 — Card database

Downloads ~50,000 cards from Scryfall (oracle text, mana cost, prices, art, Arena IDs). About 50 MB over the network.

This step is **strongly recommended** — without it, deck building, search, and collection tracking won't work. You can re-download later from the dashboard if you skip it.

### Step 4 — Connect to recommendation engine *(new)*

This is what powers AI-driven card recommendations during deck building.

| Field | Default | What to put |
|-------|---------|-------------|
| API endpoint | `http://187.77.110.100/cf-api` | Leave as default unless you self-host |
| API key | empty | Paste your key, or skip for offline mode |

Click **Test Connection** to verify. A successful test shows: `Connected — model v33p, 1,178,015 decks`.

**No API key?** That's fine. Skip this step and the app will use the local AI deck builder (which uses your own Claude or OpenAI API key — set in Settings) for synergy analysis. You won't get the community-trained collaborative-filtering recommendations.

**Where to get a key:** at `blackgrimoire.gg/key` (or ask the maintainer if you're testing alpha builds).

### Step 5 — Arena log integration

Optional. If you play MTG Arena, this lets the app:
- Auto-import your collection
- Track match results
- Surface mulligan and sideboard advice during games via a transparent overlay (Alt+O to toggle)

The wizard auto-detects Arena's `Player.log` location. If detection fails:
- Windows: `%APPDATA%\..\LocalLow\Wizards Of The Coast\MTGA\Player.log`
- macOS: `~/Library/Logs/Wizards Of The Coast/MTGA/Player.log`
- Linux/Steam: `~/.steam/steam/steamapps/compatdata/2141910/pfx/drive_c/users/steamuser/AppData/LocalLow/Wizards Of The Coast/MTGA/Player.log`

Check **Auto-start log watcher** if you want match tracking on by default.

### Step 6 — Launch

Click **Launch App**. Wizard closes, main app opens. The setup wizard will not show again unless you reset config (see § Resetting).

---

## 5. First-time use checklist

After the wizard completes:

1. **Sign in** with the account you just created.
2. **Wait for the card database to finish seeding** if you triggered it in Step 3 — a progress indicator shows in the dashboard. Card search won't work until it's done (~2–5 minutes depending on connection).
3. **Build your first deck:** Dashboard → "New Deck" → choose format → pick a commander (for Commander) → add cards via search.
4. **(If you connected the engine)** Open the deck editor and click "AI suggestions" — you should see real-time recommendations based on the community model.
5. **(If you connected Arena)** Launch MTGA, play a game, return to the app — the match should appear under Match History.

---

## 6. Common troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Cannot connect to recommendation engine" | API key missing/wrong, or VPS is down | Settings → CF API → re-test. If down, fall back to offline mode |
| Card search returns no results | Card DB still seeding, or Step 3 was skipped | Dashboard → "Seed cards" button |
| Arena log not detected | MTGA never launched on this machine, or it's a portable install | Run MTGA at least once, or browse manually in Settings |
| App crashes on launch | Old DB schema | Delete the data folder (see § Step 1) and re-run setup |
| "JWT secret not set" warning | Dev default in use | Set `JWT_SECRET` env var; for local use the default is fine |
| Splash screen never closes | Standalone server failed to start | Check `electron-error.log` in the data folder |

---

## 7. Resetting

To start over from scratch:

1. **Quit the app.**
2. Delete the data folder (paths above in § Step 1).
3. Delete `app-config.json` in the same parent directory.
4. Relaunch — the setup wizard runs again.

This wipes all decks, collection, match history, and account data. Back up first if you have decks worth keeping.

---

## 8. Backing up your data

Your data folder contains everything. To back up:

```bash
# Windows (PowerShell)
Copy-Item -Path "$env:APPDATA\The Black Grimoire\data" -Destination "D:\Backups\bg-data" -Recurse

# macOS / Linux
cp -r ~/Library/Application\ Support/The\ Black\ Grimoire/data ~/Backups/bg-data
```

The single SQLite file `mtg-deck-builder.db` contains your decks, collection, match logs, and analytics. Everything else in the folder is regenerable.

---

## 9. Getting help

- **Bug reports:** open an issue on the project repo
- **Feature requests:** same place
- **Real-time:** Discord (link in app's About dialog when configured)
- **Self-help:** check `electron-error.log` in your data folder before reporting — paste the relevant lines

---

## 10. Privacy and data

- Account credentials, decks, collection, and match logs are **stored locally** in SQLite. They never leave your machine unless you explicitly export.
- The app makes outbound network requests to:
  - Scryfall (`api.scryfall.com`) for card data
  - Recommendation engine API (default `187.77.110.100`) for card suggestions, only when you have a deck open
  - EDHREC (`edhrec.com`) for commander analysis
  - Anthropic / OpenAI / Ollama if you configure an AI deck builder key (Settings → AI Provider)
- No telemetry, no tracking, no analytics. The app does not phone home.

---

*Last updated: 2026-05-05. App version: 1.0.0-alpha.5.*
