# Overwolf Store Listing — The Black Grimoire

## App Name

The Black Grimoire

## Short Description (150 characters)

AI-powered MTG Arena deck builder, live match overlay, ML win predictions, and commander synergy engine. Build smarter. Play sharper. Win more.

## Long Description (2000 characters)

The Black Grimoire is the first MTG Arena companion that combines AI deck construction, a real-time match overlay, and machine learning predictions into a single desktop application.

**AI DECK BUILDING**
Tell the AI your commander or strategy. Claude and GPT-4o build complete decks exclusively from cards you own. Every suggestion is validated against your Arena collection — paste the list into Arena and play immediately. The commander synergy engine parses oracle text across 12 trigger categories and merges results with EDHREC data and archetype templates.

**LIVE MATCH OVERLAY**
Transparent, always-on-top overlay during Arena matches. See draw probabilities for every remaining card, zone tracking (library, graveyard, exile), life total changes, and a full play-by-play game chronicle. Toggle with Alt+O, click-through mode with Alt+L. Sub-10ms mulligan advisor gives keep/mull recommendations before the match clock starts ticking.

**ML WIN PREDICTIONS**
A Gradient Boosting model trained on 26 features scores every card in your deck by predicted win contribution. Features combine personal match history, community tournament data from MTGGoldfish and MTGTop8, EDHREC recommendations, and collaborative filtering from thousands of decks. Personal, community, and blended training modes let you weight the model toward your own playstyle or the broader meta.

**MATCH ANALYTICS**
Track win rates by deck, matchup, format, and individual card. See which cards carry and which underperform. Game logs capture every spell cast, land played, creature destroyed, and life total change. Export data for deeper analysis.

**COLLECTION MANAGER**
Import your full Arena collection automatically. Browse and search 35,000+ cards with full-text search. Build decks knowing exactly what you have. Format validation enforces singleton rules for Commander/Brawl and deck size limits for Standard, Pioneer, and Historic.

**OFFLINE-FIRST**
SQLite local storage means the app works without internet. Your data never leaves your machine unless you choose to export it. Card database, match history, and AI-generated plans are all stored locally.

Free tier includes deck building, collection import, match tracking, and full card database. Pro and Commander tiers unlock the overlay, ML predictions, AI construction, and advanced analytics.

## Feature Bullet Points

- AI deck construction with Claude and GPT-4o from your Arena collection
- Live transparent overlay with draw probabilities and zone tracking
- ML win predictions: 26-feature Gradient Boosting model
- Commander synergy engine: 12 trigger categories + EDHREC data
- Collaborative filtering recommendations via SVD-based API
- Sub-10ms mulligan advisor (deterministic, no API calls)
- AI-powered sideboard guide cached per deck/matchup
- Match analytics: win rates by deck, card, matchup, and format
- Play-by-play game chronicle with damage and life tracking
- Collection manager with Arena import and 35K+ card search
- Format validation: Standard, Pioneer, Historic, Commander, Brawl
- Deck export to Arena, MTGO, and text formats
- Offline-first: SQLite local storage, no mandatory cloud
- Dark grimoire theme: Cinzel headings, gold accents, ornate borders

## Category

Gaming Tools > Card Games

## Supported Games

MTG Arena (Class ID: 21308)

## Target Audience

MTG Arena players who want to:
- Build competitive decks from their own collection without manual cross-referencing
- Track match performance and identify underperforming cards
- Use AI assistance for deck construction and sideboard planning
- See real-time draw probabilities during matches
- Manage their full Arena collection in one tool
- Play Commander/Brawl with synergy-optimized decks

Primary demographic: Male, 25-34, English-speaking (US 47%, EU 30%, other 23%).

## Platforms

Windows (Electron + ow-electron 37.10.3)

## Hotkeys

- Alt+O: Toggle overlay visibility
- Alt+L: Toggle overlay click-through mode

## Pricing

- Free: Deck building, collection, match tracking, card database
- Pro ($4.99/mo): Overlay, ML predictions, advanced analytics, mulligan advisor
- Commander ($14.99/mo): AI deck construction, synergy engine, collaborative filtering, EDHREC integration

## Contact

[Developer email/Discord to be added before submission]

## Screenshots Required

1. Main deck builder interface with grimoire theme
2. Live overlay during an Arena match
3. AI chat building a deck from collection
4. Match analytics dashboard with win rates
5. Commander synergy analysis view
6. Collection browser with search
