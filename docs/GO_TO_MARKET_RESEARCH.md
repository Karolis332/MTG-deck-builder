# Go-to-Market Research: MTG Deck Builder Tools

**Date:** 2026-04-04
**Purpose:** Competitive landscape, distribution channels, monetization, and marketing for The Black Grimoire

---

## 1. Competing Products

### 1.1 Untapped.gg

- **Developer:** Untapped.gg (bootstrapped, same team as HSReplay.net / Hearthstone Deck Tracker)
- **Distribution:** Standalone desktop app (Windows + Mac), web dashboard
- **Monetization:** Freemium. Premium at **$7.99/month** (6-month plan = 5 months price). No ads for premium.
- **Free tier:** Basic deck tracker, draw chances, land counters, opponent revealed cards, limited stats (last 2 sets, Bronze-Platinum rank filter, current/previous meta only)
- **Premium tier:** Draftsmith (adaptive draft ratings, deck recommendations for draft + sealed), full personal stats (matchups, on-draw/play, deck versions), all rank filters (Bronze-Mythic), all time ranges, CSV export, early access to features, ad-free
- **Strengths:** Data from millions of games, Draftsmith is best-in-class for limited, clean UI, no Overwolf dependency, real-time game assistance (v3.3.0+), collection tracking, meta analysis
- **Weaknesses:** No AI-powered deck building, no commander/EDH support, no ML predictions, limited offline capability
- **Market position:** Dominant tracker for competitive constructed + limited players

### 1.2 MTGA Assistant

- **Developer:** AetherHub (Andre Liverod, Magnus Gustavsen)
- **Distribution:** Overwolf platform (Windows only)
- **Monetization:** Ad-supported (Overwolf 70/30 revenue share). No premium subscription found.
- **Overwolf rating:** 4.1/5 (18 reviews)
- **Features:** Deck tracker, draft helper (Pro + AI ratings), collection summary with set completion, deck statistics per deck, metagame analytics (Arena + paper tournaments), opponent deck identification via metagame DB, Twitch extension, competitive ladders
- **Strengths:** Deep metagame integration, opponent deck prediction, Twitch extension for streamers, no account required, backed by AetherHub ecosystem
- **Weaknesses:** Overwolf-locked (no Mac/Linux), ad-supported only (no premium tier for power users), closed source

### 1.3 Arena Tutor (Draftsim)

- **Developer:** Draftsim
- **Distribution:** Overwolf platform (Windows only)
- **Monetization:** Freemium. Premium at **$2.99/month** (ad-free + extra stats). Free tier has ads (Overwolf 70/30).
- **Overwolf rating:** 3.8/5 (16 reviews)
- **Features:** AI-powered draft assistant (only app with Draftsim AI), deck tracker, deck building recommendations for limited, win predictor algorithm, detailed game logs (play-by-play), achievements system, statistics with filters (format, event, play mode, deck, timeframe)
- **Strengths:** Only app with AI draft assistance, game logs unique among trackers, achievements gamify usage, lowest premium price point ($2.99)
- **Weaknesses:** Overwolf-locked, smaller user base than Untapped.gg, no constructed meta analysis

### 1.4 17Lands

- **Developer:** Community volunteers (non-profit mission)
- **Distribution:** Standalone client (Windows + Mac), web dashboard
- **Monetization:** Free core. **Patreon at $3/month** (644 paid patrons). Exclusive patron features (deck similarity search, advanced stats).
- **Focus:** Limited/Draft only. Does not cover constructed play.
- **Features:** Card ratings per set (GIHWR, OHWR, GPWR etc.), event history + game replays, draft metagame, leaderboards, tier lists, public datasets for analysis, trophy/match data from hundreds of thousands of drafts
- **Strengths:** Gold standard for limited data, massive community trust, open data philosophy, widely cited by content creators and podcasts, volunteer-run keeps costs low
- **Weaknesses:** Limited-only (no constructed), no overlay/tracker built in (third-party MTGA_Draft_17Lands fills gap), minimal monetization, relies on community goodwill
- **Third-party overlay:** [MTGA_Draft_17Lands](https://github.com/bstaple1/MTGA_Draft_17Lands) (open source) provides in-game overlay using 17Lands data

### 1.5 MTG Arena Tool (MTGA Tool)

- **Developer:** Open source community
- **Distribution:** Standalone (Electron). Windows + Mac + Linux.
- **Monetization:** Free and open source
- **GitHub:** [mtgatool/mtgatool-desktop](https://github.com/mtgatool/mtgatool-desktop)
- **Features:** Collection browser, deck tracker, match statistics with filters (colors, deck, formats, events), match history with opponent cards/colors, collection progress
- **Strengths:** Cross-platform (only tracker on Linux), fully open source, no ads, no account required
- **Weaknesses:** Smaller feature set vs commercial competitors, community-maintained (inconsistent update cadence), no AI features, no draft assistance

### 1.6 MTGA Pro Tracker

- **Developer:** MTGArena.pro
- **Distribution:** Overwolf + standalone
- **Monetization:** Ad-supported (Overwolf). Free.
- **Features:** Auto-upload collection/decks/battles/draft/inventory, deck tracking, meta tracking
- **Strengths:** Automatic sync, open source, no manual input
- **Weaknesses:** Less polished than commercial alternatives

### 1.7 Web-Only Deck Builders (Non-Tracker)

| Platform | Monthly Visits (Semrush, mid-2025) | Focus | Monetization |
|----------|-----------------------------------|-------|-------------|
| **Moxfield** | ~14M | All formats, default deckbuilder | Free (Patreon for support) |
| **Archidekt** | ~6.4M | Commander/EDH focus, visual builder | Free (premium features) |
| **MTG Arena Zone** | N/A | Arena-specific guides + deck builder | Ad-supported |
| **Deckstats** | N/A | Multi-format, EDHREC integration | Ad-supported |
| **MTGGoldfish** | N/A | Meta, pricing, budget decks | Ad-supported + premium |

**Key observation:** Moxfield dominates web deck building (~14M monthly visits). Audience is 71.6% male, largest age group 25-34. Top traffic: US 47%, Germany 5.7%, Canada 5.2%, UK 4.2%.

### 1.8 Competitive Landscape Gaps

| Gap | Who Misses It | Black Grimoire Advantage |
|-----|--------------|------------------------|
| AI-powered deck construction | All trackers (Draftsim has AI for draft only) | Claude/GPT-4o deck building with synergy scoring |
| ML win predictions per card | Nobody offers this | Gradient Boosting model, 26 features, personal/community/blended |
| Commander synergy engine | No tracker has deep commander analysis | 12 trigger categories, oracle text parsing, archetype templates |
| Collection-aware AI chat | No competitor | Cards validated against user collection, Arena-importable |
| Offline-first architecture | All web-dependent | SQLite local storage, works without internet |
| Collaborative filtering recs | No tracker | SVD-based recommendations via Black Grimoire API |
| Combined tracker + builder + AI | Fragmented across tools | Single integrated application |

---

## 2. Overwolf Store

### 2.1 Current MTG Arena Apps on Overwolf

Only **3 apps** listed for MTG Arena:

1. **Arena Tutor** (Draftsim) - 3.8/5, 16 reviews
2. **AetherHub MTGA Assistant** - 4.1/5, 18 reviews
3. **Shots Fired** (OBS integration, multi-game) - 4.3/5, 12 reviews

The MTG Arena Overwolf ecosystem is small. Low competition.

### 2.2 Submission Process

**Phased approach:**

1. **Phase 1 - Idea Approval:** Submit app concept to DevRel team for approval
2. **Phase 2 - Development:** Build using Overwolf SDK (native) or ow-electron. Must have at least one visible desktop window.
3. **Phase 3 - QA Review:** Upload OPK package via Developer Console. QA team tests functionality, design, compliance. No fixed timeline ("thorough testing"). Checklist:
   - Game compliance (no unfair advantage)
   - Intuitive UX with First Time User Experience
   - Advertising policy compliance
   - Multi-resolution compatibility
   - Monetization strategy
   - Hotkey reminders accessible
   - Second screen support
4. **Phase 4 - Release & Growth:** Access to Developer Console for analytics, revenue tracking, release management

**Technical requirements:**
- OPK package with manifest.json, icons (256x256 grayscale + colored, launcher .ico)
- Normal ZIP compression (not max)
- At least one visible window (no background-only apps)

### 2.3 Revenue Model

- **Ad revenue split:** 70% developer / 30% Overwolf
- **Subscriptions:** Developers can offer premium subscriptions alongside ads
- **Payouts:** Start at $200 minimum
- **Platform total payouts:** $300M to creators in 2025 (+25% YoY), $240M in 2024, $201M in 2023

### 2.4 Promotion Eligibility

To qualify for Overwolf promotion (CRN pop-ups, carousel, marketing):
- **500+ DAU** (Daily Active Users)
- **50% second-week retention** for 4 consecutive weeks
- **Store rating of 4+**
- Active monetization (ads or subscriptions)

Long-term marketing program requires:
- **40%+ 2nd-week retention** sustained over several weeks
- Monetizing with Overwolf services

### 2.5 Developer Funding

- Overwolf + Intel fund: up to **$500,000** for ambitious projects
- Top 25% of Overwolf app developers earn **$25,000+/month**
- Top creators earn **$1M+/year**

### 2.6 Black Grimoire on Overwolf: Assessment

The project already has `@overwolf/ow-electron` integrated (v37.10.3). Key considerations:

- **Pros:** Low competition (only 3 MTG apps), 70/30 revenue split is favorable, built-in distribution to Overwolf's user base, GEP integration for MTGA game events already scoped
- **Cons:** Review process has no fixed timeline, 500 DAU threshold for promotion is non-trivial for a new app, Overwolf dependency may limit Mac/Linux users, ad requirements may conflict with premium UX
- **Recommendation:** Dual distribution - standalone for power users, Overwolf for discovery/growth

---

## 3. MTGA Player Demographics

### 3.1 Player Count

| Metric | Figure | Source |
|--------|--------|--------|
| Registered accounts | 13M+ | Hasbro investor reports |
| Estimated monthly active | ~7M | activeplayer.io (take with caution) |
| Estimated daily active | ~1.75M | activeplayer.io (take with caution) |
| Steam concurrent (Apr 2026) | 8,361 | SteamCharts |
| Steam peak concurrent (Jun 2025) | 18,047 | SteamCharts |
| Steam average (May 2025) | 6,243 | SteamCharts |
| Android downloads (Google Play) | 5M+ | Google Play Store |

**Important caveats:** Wizards of the Coast does not publish official active player counts. Steam represents only a fraction of total players (many use the standalone client or mobile). Third-party estimates vary widely and are not fully sourced. The 7M monthly figure is an estimate, not confirmed by WotC.

### 3.2 Revenue Context

- **MTG total revenue 2025:** $1.7B (+59% YoY) -- MTG's best year ever
- **WotC segment revenue 2025:** ~$2.2B (+45% YoY), operating profit >$1B
- **MTG total revenue 2024:** $1.08B (-1% from 2023 record)
- **Hasbro total revenue 2025:** $4.7B (+14% YoY)
- **Digital share:** Arena + digital gaming <25% of WotC revenue (tabletop = 75%+)
- **Arena trajectory:** Hasbro investing in "long-term refresh" with emphasis on Commander and collectability. Multi-year plan for social-based play.

### 3.3 Platform Distribution

- **Desktop:** Windows (primary), Mac (supported)
- **Mobile:** Android (5M+ downloads), iOS (download count not disclosed)
- **Steam:** Growing but minority of total player base
- **Note:** Mobile does NOT support companion/tracker apps (iOS sandbox isolation, Android similarly restricted)

### 3.4 Community Sizes

**Reddit:**
| Subreddit | Subscribers | Focus |
|-----------|------------|-------|
| r/MagicArena | ~300K | Arena-specific |
| r/EDH | ~359K | Commander/EDH |
| r/spikes | ~74K | Competitive play |
| r/magicTCG | Largest | General MTG |

**Discord:**
| Server | Members |
|--------|---------|
| Magic: The Gathering Official | ~88.5K |
| MtG: Arena | ~48.7K |
| MTG Arena Zone | ~4K |
| Arena World Championship 2026 | ~2.7K |

### 3.5 Demographic Insights

- **Gender:** ~72% male (Moxfield audience data, likely representative)
- **Age:** Largest segment 25-34 years old
- **Geography:** US ~47%, Germany ~5.7%, Canada ~5.2%, UK ~4.2% (Moxfield traffic data)
- **Spending profile:** Players who spend typically invest $100+ to build competitive decks. F2P path viable but requires months of grinding. Starter bundle (~$5-15) is most common first purchase. Heavy spenders exist around set releases and Secret Lair drops.

---

## 4. Monetization Models

### 4.1 What Competitors Charge

| Product | Model | Price | Notes |
|---------|-------|-------|-------|
| Untapped.gg | Freemium | $7.99/mo | 6-month discount available |
| Arena Tutor | Freemium | $2.99/mo | Lowest price point |
| 17Lands | Patronage | $3/mo (Patreon) | 644 paid patrons |
| MTGA Assistant | Ad-supported | Free | Overwolf ads only |
| MTG Arena Tool | Open source | Free | No monetization |
| Moxfield | Free + Patreon | Voluntary | Dominant web builder |

### 4.2 Industry Benchmarks

- **Freemium conversion rate:** 2-5% of free users convert to paid (industry average)
- **Subscription revenue:** 82% of non-gaming app revenue comes from subscriptions
- **In-app purchases:** 48.2% of total app revenue (gaming)
- **Spotify benchmark:** 46% free-to-paid conversion (exceptional outlier)
- **Overwolf top developers:** 25% earn $25K+/month from ads alone

### 4.3 Recommended Monetization Strategy for Black Grimoire

**Tier structure:**

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Deck tracker, basic collection, deck building, local SQLite, limited AI chat (3 queries/day) |
| **Pro** | $4.99/mo | Full AI deck building (Claude/GPT-4o), ML predictions, unlimited AI chat, advanced analytics, sideboard guide, CSV export |
| **Pro Annual** | $39.99/yr (~$3.33/mo) | Same as Pro, 33% discount for commitment |

**Rationale:**
- $4.99 sits between Arena Tutor ($2.99) and Untapped.gg ($7.99), justified by AI/ML features neither offers
- Annual plan incentivizes retention and improves LTV
- Free tier must be genuinely useful (deck tracking + building) to build user base for conversion
- AI features as the paywall gate -- high perceived value, actual API cost justifies subscription
- Avoid ads in standalone app -- premium feel differentiates from Overwolf ad-supported competitors
- If on Overwolf: use ads for free tier, premium removes ads + unlocks AI

**Revenue projections (conservative):**
- At 1,000 DAU with 3% conversion = 30 paying users = ~$150/month
- At 5,000 DAU with 4% conversion = 200 paying users = ~$1,000/month
- At 10,000 DAU with 5% conversion = 500 paying users = ~$2,500/month
- Overwolf ad revenue (if applicable): ~$2-5 eCPM, at 5,000 DAU = ~$300-750/month additional

### 4.4 Feature Gating Best Practices

Based on what works in the space:
- **Never gate core functionality** (tracker, basic deck building). Users leave immediately.
- **Gate power-user features** (AI, ML, advanced analytics, export). These users are willing to pay.
- **Time-limited trials** of premium features convert better than hard gates.
- **A/B test pricing** early. $2.99 vs $4.99 vs $6.99 may have non-obvious conversion differences.

---

## 5. Marketing Channels

### 5.1 Reddit

**Primary channels:**

| Subreddit | Size | Relevance | Self-Promo Rules |
|-----------|------|-----------|-----------------|
| r/MagicArena | ~300K | High (Arena users) | Read sidebar rules. Genuine participation required. Mod approval recommended before posting tools. |
| r/EDH | ~359K | High (Commander users) | Similar rules. Focus on how tool helps community. |
| r/spikes | ~74K | Medium (competitive) | Strict quality standards. Competitive analysis angle works. |
| r/magicTCG | Largest | Medium (general) | Broad audience, diluted focus |

**Reddit strategy:**
- Build genuine karma and participation history (weeks/months) before any self-promotion
- Follow unwritten 90/10 rule: 90% genuine engagement, 10% promotional
- Frame posts as "I built this thing, here's what it does" -- not "download my app"
- Message moderators before posting to ask about self-promotion policy
- Never use sockpuppet accounts -- will be detected and permanently banned
- Target "Tool Tuesday" or similar weekly threads if available
- Cross-post carefully; excessive cross-posting triggers spam filters

### 5.2 YouTube

**MTG YouTube landscape:**
- 100+ active MTG YouTube channels tracked by Feedspot
- Major creators: NumotTheNummy (101K subs), Jim Davis, Ashlizzlle (65.3K subs), and many more
- Content types: gameplay VODs, draft replays, deck techs, set reviews, tutorials
- Saturated but active -- differentiation required

**Strategy:**
- Create demo/walkthrough videos showing AI deck building in action
- Approach mid-tier creators (10K-50K subs) for sponsored reviews -- more affordable, higher engagement rate
- "AI builds a deck and I play it" format has inherent virality
- Produce short-form content (YouTube Shorts) for algorithm discovery

### 5.3 TikTok

**MTG on TikTok:**
- @mtgarena official account: ~67K followers, ~456K likes
- Algorithm uniquely favors niche communities -- MTG content surfaces to MTG fans regardless of follower count
- @toriofthevast went viral (~2M views) with first video -- discoverability is real
- Camera quality matters less than trend alignment and humor

**Strategy:**
- Short clips of AI deck building ("AI built my Arena deck in 30 seconds")
- Before/after: "My deck before AI vs after AI optimization"
- Trend-jacking with MTG spin (popular sounds + MTG context)
- 3 posts/day cadence recommended for growth phase
- Zero production cost -- screen recordings with voiceover work

### 5.4 Twitch

**Current state:**
- MTG Twitch viewership has declined to pre-Arena levels (2018 baseline)
- Average ~5-10K concurrent viewers across all MTG streams
- Viewership does NOT correlate with player base health (game is bigger than ever)
- Platform shifting toward YouTube

**Strategy:**
- Lower priority than YouTube/TikTok/Reddit
- Potential for Twitch extension (like MTGA Assistant has) -- viewers see deck stats on stream
- Partner with streamers who use deck trackers already -- natural integration point

### 5.5 Tournament & Event Marketing

**Official events:**
- **MagicCon** events accept sponsors (contact via mcamsterdam.mtgfestivals.com). Custom packages available.
- Community tournaments: max $25 entry, max $5,000 prizes (WotC guidelines). Sponsors require WotC approval.
- **MTG Ambassador Program:** WotC selects creators for set releases. 70+ creators/month, 1,600+ content pieces across platforms.

**Strategy:**
- Sponsor small community tournaments (low cost, high visibility with target audience)
- Apply for MTG Ambassador Program when product is stable
- Provide free Pro subscriptions to tournament organizers for promotion

### 5.6 Discord

- Build a community Discord server for user support, feedback, feature requests
- Cross-promote in MTG Arena Discord (~48.7K members) where allowed
- Partner with deck-building-focused servers

### 5.7 Content Marketing / SEO

- Publish deck guides using Black Grimoire's AI analysis
- "Best [archetype] deck for Arena" type content ranks well
- MTG Arena Zone, MTGGoldfish, and Draftsim dominate search -- hard to compete directly
- Focus on long-tail: "AI deck builder for MTG Arena", "ML card predictions MTG", "commander synergy analyzer"

---

## 6. Summary: Competitive Positioning

### Black Grimoire's Unique Value Proposition

No existing product combines:
1. Deck tracking (live overlay)
2. AI-powered deck construction (Claude/GPT-4o)
3. ML win-rate predictions per card
4. Commander synergy analysis
5. Collection-aware recommendations
6. Collaborative filtering (Black Grimoire API)
7. Offline-first local storage

This is a **category-creating product** -- not competing head-to-head with Untapped.gg on tracker features, but offering an integrated AI deck building experience no competitor provides.

### Key Risks

1. **User acquisition:** The 500 DAU threshold for Overwolf promotion requires organic growth first
2. **API costs:** Claude/GPT-4o calls at scale require subscription revenue to sustain
3. **Retention:** Tracker users are sticky (daily use). Deck builders are episodic (use when building). Must solve for daily engagement.
4. **WotC policy:** All trackers operate in a gray area. WotC tolerates them but reserves the right to change stance. No companion app is officially sanctioned.
5. **Platform lock-in:** Electron + Overwolf = Windows-primary. Mac/Linux support is limited.
6. **Competition response:** If Untapped.gg adds AI features, they have the distribution advantage.

### Recommended Launch Sequence

1. **Private beta** via Reddit (r/MagicArena post, mod-approved) -- gather 50-100 testers
2. **Overwolf submission** in parallel with beta feedback incorporation
3. **Public launch** with free tier generous enough for organic word-of-mouth
4. **Content blitz:** TikTok (3x/day), YouTube walkthrough, Reddit AMA
5. **Creator outreach:** Free Pro accounts to 10 mid-tier MTG creators
6. **Tournament sponsorship:** 2-3 small community events/month
7. **Iterate on pricing** via A/B testing within first 3 months

---

## Sources

### Competing Products
- [Untapped.gg Companion](https://mtga.untapped.gg/companion)
- [Untapped.gg Premium](https://mtga.untapped.gg/premium)
- [MTGA Assistant](https://mtgaassistant.net/)
- [AetherHub MTGA Assistant on Overwolf](https://www.overwolf.com/app/aetherhub-aetherhub_mtga_assistant)
- [Arena Tutor by Draftsim](https://draftsim.com/arenatutor/)
- [Arena Tutor on Overwolf](https://www.overwolf.com/app/draftsim-arena-tutor)
- [17Lands](https://www.17lands.com/)
- [17Lands Patreon](https://www.patreon.com/17lands)
- [17Lands Patron Exclusives](https://blog.17lands.com/posts/patron-exclusives/)
- [MTGA_Draft_17Lands (GitHub)](https://github.com/bstaple1/MTGA_Draft_17Lands)
- [MTG Arena Tool (GitHub)](https://github.com/mtgatool/mtgatool-desktop)
- [MTGA Tracker Apps - MTG Wiki](https://mtg.fandom.com/wiki/Magic:_The_Gathering_Arena/Tracker_Apps)
- [MTGA Tracker Apps - Gray Viking Games](https://www.grayvikinggames.com/blogs/gvg-blog/mtga-tracker-apps)
- [Best MTG Arena Addons - Gamers Decide](https://www.gamersdecide.com/articles/best-mtg-arena-addons)
- [MTG Arena Tools Guide - Steam Community](https://steamcommunity.com/sharedfiles/filedetails/?id=2991689937)

### Deck Builders
- [Moxfield](https://moxfield.com/)
- [Archidekt](https://archidekt.com/)
- [moxfield.com Traffic - SimilarWeb](https://www.similarweb.com/website/moxfield.com/)
- [moxfield.com vs archidekt.com - SimilarWeb](https://www.similarweb.com/website/moxfield.com/vs/archidekt.com/)
- [Best MTG Deck Builder - Draftsim](https://draftsim.com/best-mtg-deck-builder/)
- [MTG Arena Deckbuilder 2026 - MTG Arena Pro](https://mtgarena.pro/deckbuilder/)

### Overwolf
- [Overwolf MTG Arena Apps](https://www.overwolf.com/browse-by-game/magic-the-gathering-arena)
- [Overwolf App Submission - Phase 3](https://dev.overwolf.com/ow-native/getting-started/submit-your-app)
- [Overwolf App Promotion](https://dev.overwolf.com/ow-native/getting-started/grow-your-app/)
- [Overwolf Monetization](https://dev.overwolf.com/ow-native/monetization/overview/)
- [Overwolf Long-Term Marketing](https://dev.overwolf.com/ow-native/guides/growth/long-term-marketing-promotion/)
- [Overwolf $240M Payouts 2024](https://blog.overwolf.com/in-game-creators-earn-big-overwolf-pays-out-240-million-in-2024/)
- [Overwolf $201M Payouts 2023](https://blog.overwolf.com/overwolf-pays-201-million-to-in-game-creators-in-2023/)
- [Overwolf Build an App](https://www.overwolf.com/creators/build-an-app/)

### Player Demographics & Revenue
- [MTG Arena Player Count - ActivePlayer.io](https://activeplayer.io/magic-the-gathering-arena/)
- [MTG Arena Steam Charts](https://steamcharts.com/app/2141910)
- [MTG Arena Player Count - Draftsim](https://draftsim.com/mtg-arena-player-count/)
- [MTG Arena Steam Charts - SteamDB](https://steamdb.info/app/2141910/charts/)
- [MTG $1.7B Revenue 2025 - AllKeyShop](https://www.allkeyshop.com/blog/mtg-historic-1-7-billion-revenue-hasbro-2025-news-d/)
- [MTG Best Year Ever 2025 - Wargamer](https://www.wargamer.com/magic-the-gathering/2025-financial-results-best-year)
- [Hasbro $4.7B Revenue 2025 - BoardGameWire](https://boardgamewire.com/index.php/2026/02/11/record-magic-the-gathering-success-powered-hasbro-to-4-7bn-revenue-for-2025-remains-its-primary-growth-engine/)
- [Hasbro Q1 2025 Results](https://investor.hasbro.com/news-releases/news-release-details/hasbro-reports-first-quarter-2025-financial-results)
- [MTG Revenue Drop 2024 - Draftsim](https://draftsim.com/mtg-revenue-drop/)
- [Hasbro Arena Refresh - Star City Games](https://articles.starcitygames.com/magic-the-gathering/hasbro-investing-in-long-term-refresh-for-mtg-arena-with-emphasis-on-commander-and-collectability/)

### Community
- [r/MagicArena Stats](https://subredditstats.com/r/MagicArena)
- [r/EDH Stats - GummySearch](https://gummysearch.com/r/EDH/)
- [Best MTG Arena Subreddits - Draftsim](https://draftsim.com/mtg-arena-subreddits/)
- [EDH Subreddits - Draftsim](https://draftsim.com/edh-reddit-mtg/)
- [Magic: The Gathering Official Discord](https://discord.com/invite/wizards-magic)
- [MtG: Arena Discord](https://discord.com/invite/magic)

### Twitch & YouTube
- [MTG Twitch Numbers Down - Draftsim](https://draftsim.com/mtg-twitch-numbers-down/)
- [MTG Twitch Streamers March 2026 - TwitchMetrics](https://www.twitchmetrics.net/channels/popularity?game=Magic:+The+Gathering)
- [100 MTG YouTubers - Feedspot](https://videos.feedspot.com/magic_the_gathering_youtube_channels/)
- [MTG Arena Gameplay Channels - Draftsim](https://draftsim.com/mtg-arena-gameplay/)
- [How to Become MTG Content Creator - Draftsim](https://draftsim.com/mtg-content-creator/)

### TikTok & Marketing
- [MTG TikTok Going Viral - ChannelFireball](https://strategy.channelfireball.com/all-strategy/home/mtg-tiktok-how-and-where-to-start-going-viral/)
- [MTG TikTok Going Viral - TCGPlayer](https://www.tcgplayer.com/content/article/MTG-TikTok-How-and-Where-to-Start-Going-Viral/4c45f603-d789-4293-a210-cf894c1b5678/)
- [MTG Arena TikTok](https://www.tiktok.com/@mtgarena)
- [WotC Creator Best Practices](https://magic.wizards.com/en/mtgarena/creators/best-practices)
- [MagicCon Event Sponsorship](https://mcamsterdam.mtgfestivals.com/en-us/industry/be-an-event-sponsor.html)
- [WotC Community Tournament Guidelines](https://company.wizards.com/en/community-tournament-guidelines)
- [MTG Ambassador Program](https://magic.wizards.com/en/news/announcements/what-is-a-magic-the-gathering-ambassador)

### Monetization Strategy
- [App Monetization 2025 - ASOMobile](https://asomobile.net/en/blog/mobile-market-money-app-monetization-in-2025/)
- [Freemium Strategies - Adapty](https://adapty.io/blog/freemium-app-monetization-strategies/)
- [Game Monetization 2025 - Infatica](https://infatica-sdk.io/blog/app-monetization/game-monetization-in-2025-top-strategies-for-developers/)
- [Subscription Monetization - Mistplay](https://business.mistplay.com/resources/mobile-game-subscription-monetization)
- [MTG Arena Economy Guide - Draftsim](https://draftsim.com/mtg-arena-economy/)
