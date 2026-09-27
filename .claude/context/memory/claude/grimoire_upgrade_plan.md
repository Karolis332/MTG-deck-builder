# Black Grimoire — Upgrade Plan (updated 2026-04-04)

## Phase 1: Stability & Audit — COMPLETE
- [x] 381 tests passing (was 291), 0 TS errors (was 43)
- [x] 47 API routes verified, 31 migrations sequential
- [x] Repo audit: 43 unused vars fixed, 4 deps removed
- [x] CLAUDE.md updated to match current state
- [x] Pipeline: 13/15 steps pass, model training OK

## Phase 2: Match Tracking & Deck Linking — 80% DONE
- [x] Deck fingerprinting (Jaccard similarity, auto-link/suggest thresholds)
- [x] Post-match stats generator (cards drawn/played, mana curve, removal, MVP)
- [x] IPC wired: arena watcher → preload → bridge → overlay
- [x] Deck picker overlay: 3 modes (auto-linked, suggest, manual)
- [ ] SERP API integration for meta data, card prices
- [ ] Temporal workflows for durable match processing

## Phase 3: Visual Overhaul — 80% DONE
- [x] Card hover previews (fixed positioning, Scryfall images)
- [x] 8-type stacked color bar in deck stats
- [x] Collection: grid/list toggle, art crop thumbnails, set icons
- [x] Analytics: win rate color coding, sparkline bars
- [ ] Drag-and-drop deck editor
- [ ] Overlay animations

## Phase 4: Go-to-Market — 70% DONE
- [x] GTM research (docs/GO_TO_MARKET_RESEARCH.md)
- [x] Content strategy (docs/CONTENT_STRATEGY.md) — 4 pillars, 4-phase calendar
- [x] Landing page at /landing with pricing tiers
- [x] Overwolf listing ready (docs/OVERWOLF_LISTING.md)
- [x] Social media copy (docs/SOCIAL_MEDIA_COPY.md)
- [x] Screenshot generator (scripts/generate_screenshots.js) — 12 shots captured
- [x] Marketing screenshots generated in marketing/screenshots/
- [ ] Overwolf store submission (need developer.overwolf.com account)
- [ ] Stripe payment integration (free/pro/commander tier gating)
- [ ] Deploy landing page to domain (blackgrimoire.gg or similar)
- [ ] TikTok account setup + first 3 videos
- [ ] Reddit warm-up (4 weeks organic engagement before self-promo)
- [ ] YouTube creator outreach (5 mid-tier MTG creators)
- [ ] Marketing video generation via Shorts Generator

## Phase 5: Monetization Infrastructure — NOT STARTED
- [ ] Stripe checkout integration in app
- [ ] Free/Pro/Commander feature gating logic
- [ ] License key or subscription verification system
- [ ] Overwolf in-app purchases or subscription API
- [ ] Analytics: track conversion funnel (free → trial → paid)

## Phase 6: Branding & Design — NOT STARTED
- [ ] Logo variants (icon, wordmark, horizontal, social media sizes)
- [ ] Social media banners (TikTok, YouTube, Reddit, Discord)
- [ ] App store assets (Overwolf tiles, hero images)
- [ ] OG images for landing page sharing
- [ ] Consistent visual language doc (colors, fonts, spacing rules)
- [ ] Discord server setup with channels

## Infrastructure — COMPLETE
- [x] Pipeline fallback: 3x retry, degraded mode, Telegram notify
- [x] VPS Telegram bot: Docker, Grimoire, voice, /claude relay, anti-flood
- [x] Claude bridge: local → VPS queue → claude -p (strips CLAUDECODE env)
- [x] n8n installed: http://187.77.110.100/n8n/
- [x] VPS updated, geo-scraper healthy
- [x] Scraper fixes: MTGTop8 UTF-8, meta aggregation SQL batching
- [x] Windows build: NSIS 399MB, Portable 399MB
- [x] 9 commits pushed to main (77807f8..d263efa)
- [x] Gotenberg PDF report generated

## Session Context (2026-04-04)
- User wants full marketing execution: accounts, content, branding, Overwolf
- User prefers autonomous agent execution with Telegram updates
- User wants voice control via Telegram (working)
- n8n available for workflow automation but not yet configured
- SERP API and Temporal are installed locally but not integrated
- Password: QuLeR / grimoire123 (all 3 DB locations)
- Claude bridge must run detached to avoid nested session errors
