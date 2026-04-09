# Darek Grimoire — YouTube Video Content Plan

Channel: **Darek Grimoire** (kpaulikas21@gmail.com)
Platform: YouTube + TikTok cross-post
Goal: Organic growth to 2K subs in 6 months, establish as "the data MTG creator"

---

## Production Stack

| Tool | Role | Cost |
|------|------|------|
| Claude Code + Remotion | Script generation, motion graphics, branded intros/outros | Pro plan |
| Shorts Generator (`~/shorts-generator`) | Automated stat-based Shorts with Grimoire branding | Free (existing) |
| The Black Grimoire app | Gameplay footage source — overlay always visible | Free (our product) |
| OBS Studio | Screen recording Arena + overlay | Free |
| DaVinci Resolve | Final polish, color grading | Free |
| Opus Clip Pro | Auto-generate Shorts from long-form | $15/mo |
| VidIQ | Keyword research, title scoring, SEO | Free tier |
| Canva | Thumbnails (gold/purple Grimoire brand templates) | Free tier |

### Automation Pipeline

1. Claude Code `/video-research` — analyze top 3 competing videos, extract hooks
2. Claude Code `/video-script` — generate script with Grimoire brand voice
3. Record in Arena with Black Grimoire overlay visible
4. Shorts Generator auto-creates 3 stat Shorts daily (cron)
5. Opus Clip cuts 4-6 Shorts from each long-form
6. Auto-post to YouTube, TikTok via Opus Clip

---

## Shorts Series (3-5/week, <60s each)

### S1: "The Data Says..." (stat reveals)
- Pull real win rate data from ML model + community_decks table
- Format: Gold text overlay on card art, narration, stat reveal
- Examples:
  - "Mono-Red has a 58% win rate... but only if you DON'T play Shock. The data says Play With Fire wins 4% more."
  - "The #1 most-played card in Standard has a NEGATIVE win rate. Here's the data."
  - "Your sideboard is wrong. Data from 10,000 matches proves it."

### S2: "AI Built This Deck" (AI deck construction showcase)
- Show Claude/GPT building a deck in real-time via the app
- Format: Screen recording of AI chat + deck list appearing
- Examples:
  - "I told AI to build me a deck that beats Azorius Control. It built THIS."
  - "AI built a Commander deck from my 2,000-card collection. Here's the result."
  - "I gave AI $50 budget. It built a 65% win rate deck."

### S3: "Overlay Moment" (clutch plays with data)
- Clip from gameplay where overlay draw probability predicted the outcome
- Format: Arena gameplay + overlay visible, dramatic moment
- Examples:
  - "12% chance to draw the answer. The overlay knew."
  - "Mulligan advisor said KEEP. I didn't believe it. Then this happened."
  - "Draw probability: 3%. I drew it."

### S4: "Card of the Day" (quick card analysis)
- ML model scores a card, explain why it's underrated/overrated
- Format: Card art + prediction score + quick explanation
- Examples:
  - "ML model rates this common higher than a mythic. Here's why."
  - "This $0.25 card has the highest win-when-drawn rate in Standard."

### S5: "Meta Shift" (weekly meta snapshots)
- Automated from pipeline data (meta_aggregate + archetype_win_stats)
- Format: Animated bar chart of win rates shifting week to week
- Examples:
  - "Standard meta shifted this week. Here's what's winning now."
  - "Commander meta: the top 5 commanders by win rate this month"

---

## Long-Form Series (1-2/week, 8-15min)

### L1: "Grimoire Deck Tech" (flagship series)
**Target keywords**: "best [format] deck mtg arena 2026", "[deck name] deck guide"

Structure:
1. Hook (0:00-0:15): "This deck has a 67% win rate and nobody's talking about it."
2. Data overview (0:15-1:00): ML predictions, meta position, matchup spread
3. Card choices (1:00-4:00): Walk through the list, explain each slot with data
4. Gameplay (4:00-10:00): Full match with overlay visible, narrate decisions
5. Sideboard guide (10:00-12:00): AI-generated boarding plans for top 5 matchups
6. CTA (12:00-12:30): "Download The Black Grimoire — link in description"

Frequency: Weekly, timed to meta shifts or new set releases

### L2: "I Let AI Build My Deck" (hero content, high virality)
**Target keywords**: "ai deck builder mtg", "ai builds mtg deck"

Structure:
1. Premise: Give AI a constraint (budget, collection-only, specific commander)
2. AI chat: Show the full Claude conversation in the app
3. First look: React to the decklist, discuss choices
4. Testing: Play 5+ games with overlay, record highlights
5. Results: Show final W-L record with analytics dashboard
6. Verdict: Rate the AI deck 1-10

Frequency: Bi-weekly

### L3: "Tracker Walkthrough" (evergreen SEO content)
**Target keywords**: "best mtg arena deck tracker 2026", "mtg arena overlay setup"

Structure:
1. What is The Black Grimoire (30s)
2. Installation and setup (2min)
3. Feature tour — overlay, analytics, AI chat, collection (5min)
4. Live gameplay demonstrating each feature (5min)
5. Free vs Pro vs Commander tiers (1min)
6. Download CTA

Frequency: Once, update per major release

### L4: "Matchup Masterclass" (competitive depth)
**Target keywords**: "[deck] vs [deck] mtg arena", "[deck] sideboard guide"

Structure:
1. Matchup data: Overall win rate from community data
2. Key cards: Which cards matter most (card_performance data)
3. Sideboard plan: AI-generated boarding guide
4. Gameplay: Demonstrate the matchup with overlay
5. Common mistakes: What the data shows people get wrong

Frequency: Monthly or when meta shifts

### L5: "The Grimoire Review" (set reviews, high search volume)
**Target keywords**: "[set name] review mtg arena", "[set name] best cards"

Structure:
1. Top 10 cards by predicted win rate (ML model predictions before data exists)
2. Cards that will overperform / underperform
3. Best new decks enabled
4. Re-evaluate 2 weeks later with actual data

Frequency: Per set release (roughly quarterly)

---

## First 10 Videos (Launch Sequence)

| # | Type | Title | Priority |
|---|------|-------|----------|
| 1 | Short | "This $0.25 Card Has the Highest Win Rate in Standard" | Day 1 |
| 2 | Short | "I Told AI to Build Me a Deck. It Did THIS." | Day 1 |
| 3 | Short | "The Data Says Your Sideboard Is Wrong" | Day 2 |
| 4 | Long | "I Built an AI Deck Tracker for MTG Arena — Here's What It Found" | Day 3 |
| 5 | Short | "12% Draw Probability. I Drew It." | Day 4 |
| 6 | Short | "Standard Meta This Week — Win Rates Revealed" | Day 5 |
| 7 | Long | "AI Built My Commander Deck From My Collection — Testing It Live" | Day 7 |
| 8 | Short | "ML Model Says This Mythic Is OVERRATED" | Day 8 |
| 9 | Short | "Mulligan Advisor Said Keep. Here's Why." | Day 9 |
| 10 | Long | "Best MTG Arena Deck Tracker 2026 — Full Setup Guide" | Day 10 |

---

## Thumbnail Template (Canva)

- Background: Dark (#0a0806) with gold (#c9a84c) accents
- Left side: Card art crop or gameplay screenshot
- Right side: Bold text (2-3 words max), white or gold
- Bottom: Grimoire logo watermark
- NO red/white/black (YouTube's own colors — contrast against platform)
- Font: Cinzel or similar serif for brand consistency

---

## Brand Voice

- "Darek Grimoire" persona: Data-obsessed MTG player who lets the numbers speak
- Tone: Confident, concise, slightly mysterious (grimoire theme)
- Always lead with a data point or claim, never with "hey guys"
- Sign-off: "The grimoire has spoken."
- Never oversell the app — let it be visible in gameplay, mention once at end

---

## Distribution Checklist (Per Video)

- [ ] YouTube upload with VidIQ-optimized title/description/tags
- [ ] Thumbnail from Canva template
- [ ] End screen linking to playlist + subscribe
- [ ] Pinned comment with app download link
- [ ] Cross-post Shorts to TikTok
- [ ] Reddit post (if genuinely valuable, not every video)
- [ ] Community tab poll related to the video topic
