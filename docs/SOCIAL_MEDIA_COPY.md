# Social Media Copy — The Black Grimoire

## Reddit Post Templates (r/MagicArena)

### Post 1: Collection Problem

**Title:** I built a tool that builds Arena decks from cards you actually own

**Body:**
I got tired of netdecking a list, importing it into Arena, and seeing 30 wildcards needed. So I built a desktop app that imports your full Arena collection and has an AI build decks using only cards you have.

It uses Claude/GPT-4o to construct decks with real synergy scoring — not just "here are good cards in these colors." The AI parses oracle text, checks mana curve, validates format rules, and makes sure every card is in your collection before suggesting it.

Free tier has deck building + collection import + basic match tracking. The AI construction is in the paid tier.

Still in alpha. Looking for feedback from people who also hate the wildcard gap between netdecks and reality.

[Link]

---

### Post 2: Overlay

**Title:** Made a draw probability overlay that runs during Arena matches — shows odds for every card left in your deck

**Body:**
Quick demo of something I've been working on: a transparent overlay that sits on top of Arena and shows real-time draw probabilities for every card remaining in your library.

It also tracks zones (graveyard, exile), life totals, and gives you a full play-by-play log of the game. The mulligan advisor runs in sub-10ms and gives keep/mull recommendations before you even finish reading your hand.

Alt+O toggles it, Alt+L makes it click-through so it doesn't interfere with gameplay.

It's part of a larger deck builder project. The overlay is in the Pro tier ($4.99/mo). Curious if this is something people would actually use during ranked.

[Link]

---

### Post 3: Brawl/Commander Focus

**Title:** Built a commander synergy engine that parses oracle text and finds combos most builders miss

**Body:**
I play a lot of Historic Brawl and was frustrated that existing deck builders don't understand commander synergy beyond "these cards are popular with this commander."

So I built an engine that parses oracle text for 12 different trigger categories — ETB, death triggers, sacrifice payoffs, token generation, +1/+1 counter synergy, etc. — and cross-references them with your commander's abilities.

It pulls EDHREC data, tournament results from MTGGoldfish/MTGTop8, and collaborative filtering from thousands of community decks. Then the AI builds you a 100-card list from your collection with proper land count, ramp ratio, and removal suite.

Built my Cabbage Merchant deck with it. Went from losing every game to a 60%+ win rate after the AI identified synergies I was completely missing (food sacrifice loops + aristocrats payoffs).

[Link]

---

### Post 4: ML Predictions

**Title:** Trained an ML model on my match history to predict which cards actually win games vs which just feel good

**Body:**
Gradient Boosting model with 26 features. Trains on your personal match data, community tournament data, or a blend of both. For each card in your deck, it predicts how much that card contributes to your win rate.

Some interesting findings from my own data:
- Cards with high community win rates that underperformed in MY matches (wrong meta pocket, wrong deck shell)
- "Boring" utility cards that quietly carried (removal, card draw) while I was focused on flashy synergy pieces
- Ramp cards contributing more to wins than I expected in Brawl

The model retrains nightly. Over time it gets more accurate as your match history grows. Currently requires ~20 matches minimum for personal training to be meaningful.

Part of a deck builder I'm working on. The ML predictions are in the Pro tier. Would love to hear if anyone else is interested in data-driven deck tuning.

[Link]

---

### Post 5: General Announcement

**Title:** Open alpha: deck builder + overlay + AI + ML predictions — all in one app

**Body:**
Been building this for a few months. It's a desktop app (Electron) that combines:

- **Deck building** with format validation and Arena export
- **Collection import** directly from Arena
- **AI deck construction** (Claude/GPT-4o) using only cards you own
- **Live overlay** with draw probabilities and zone tracking
- **ML win predictions** trained on your matches + community data
- **Commander synergy engine** with 12 trigger categories
- **Match analytics** with per-card and per-matchup win rates

Free tier covers deck building, collection, and basic tracking. Pro ($4.99/mo) adds overlay and ML. Commander ($14.99/mo) adds AI construction and synergy engine.

Currently Windows only. Alpha stage — rough edges exist. Looking for testers who want to break things and give honest feedback.

[Link]

---

## TikTok / YouTube Shorts Script Outlines

### Short 1: "The Wildcard Problem" (15-30s)

**Hook (0-3s):** "You netdeck a list. Import it. 30 wildcards needed."

**Problem (3-8s):** Quick cuts showing: Arena import screen with missing cards, wildcard counter at zero, the frustration of building a budget version that loses.

**Solution (8-20s):** Screen recording of the AI building a deck from the user's actual collection. Show the chat prompt, the AI response, the final deck list with zero missing cards.

**CTA (20-25s):** "The Black Grimoire builds decks from cards you own. Link in bio."

---

### Short 2: "What Your Deck Looks Like to ML" (15-30s)

**Hook (0-3s):** "I trained an ML model on 200 matches. Here's what it thinks of my deck."

**Body (3-20s):** Screen recording showing the ML prediction output for a specific deck. Highlight surprising results — a "bad" card ranked high, a "staple" ranked low. Show the 26 features briefly. Cut to the model retraining with new match data.

**CTA (20-25s):** "Data doesn't lie. Free download, link in bio."

---

### Short 3: "Real-Time Draw Math" (15-30s)

**Hook (0-3s):** "Your deck tracker can't do this."

**Body (3-20s):** Screen recording of a live Arena match with the overlay active. Camera follows a critical turn — show draw probability for the needed card, the decision to hold vs play, the actual draw matching the probability. Quick zoom on the percentage.

**CTA (20-25s):** "The Black Grimoire overlay. See the math. Make the play."

---

### Short 4: "Commander Synergy Nobody Sees" (20-40s)

**Hook (0-3s):** "Your commander has synergies you're not running."

**Body (3-30s):** Start with a commander card (e.g., Cabbage Merchant). Show the synergy engine parsing oracle text. Reveal the 12 trigger categories. Show 3-4 cards the engine found that the player wasn't running. Cut to the win rate improvement after adding them.

**CTA (30-35s):** "The synergy engine found what I missed. Link in bio."

---

### Short 5: "Sub-10ms Mulligan Math" (10-20s)

**Hook (0-2s):** "Keep or mull? I built an algorithm that decides in 10 milliseconds."

**Body (2-15s):** Show a 7-card hand. The mulligan advisor runs instantly — shows the score breakdown (land count, curve, key spells, archetype fit). Decision: mull. New hand: keep. Game result: win.

**CTA (15-18s):** "Never guess on a mulligan again."

---

## Discord Announcement Templates

### Announcement 1: Initial Launch

```
**The Black Grimoire — Open Alpha**

AI-powered deck builder + live match overlay + ML predictions for MTG Arena.

What it does:
- Builds decks from your actual Arena collection using Claude/GPT-4o
- Live overlay with draw probabilities during matches
- ML model predicts which cards win and which don't
- Commander synergy engine with 12 trigger categories
- Match analytics with per-card win rates

What it costs:
- Free: Deck building, collection import, match tracking
- Pro ($4.99/mo): Overlay, ML predictions, mulligan advisor
- Commander ($14.99/mo): AI construction, synergy engine, EDHREC data

Windows only. Alpha stage. Looking for testers.

Download: [link]
Feedback: [#feedback channel or form link]
```

---

### Announcement 2: Feature Update

```
**Black Grimoire Update: [Version]**

New this release:
- [Feature 1]: [One-sentence description]
- [Feature 2]: [One-sentence description]
- [Feature 3]: [One-sentence description]

Fixes:
- [Fix 1]
- [Fix 2]

Known issues:
- [Issue 1]

Download the update: [link]
Report bugs: [#bugs channel or form link]
```

---

### Announcement 3: Community Call for Feedback

```
**Looking for Brawl/Commander players to test the synergy engine**

The commander synergy engine analyzes oracle text across 12 trigger categories and builds 100-card lists from your collection. It pulls EDHREC data, tournament results, and collaborative filtering from community decks.

I need players who:
- Play Historic Brawl or Standard Brawl regularly
- Have 500+ cards in their Arena collection
- Are willing to share which suggestions worked and which didn't

What you get:
- Free access to the Commander tier during testing
- Direct input on feature priorities

DM me or drop your Arena username in [#testing channel].
```
