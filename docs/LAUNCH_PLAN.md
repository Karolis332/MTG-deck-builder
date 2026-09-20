# The Black Grimoire — App Store Launch Plan

*Written 2026-08-23. App version at writing: 1.0.0-alpha.5.*
*Companion docs: [OVERWOLF_LISTING.md](OVERWOLF_LISTING.md) (store copy), [GO_TO_MARKET_RESEARCH.md](GO_TO_MARKET_RESEARCH.md), [CONTENT_STRATEGY.md](CONTENT_STRATEGY.md), `black-grimoire-web/DEPLOY.md` (landing page launch checklist).*

## Where we stand (verified)

| Item | Status |
|---|---|
| Windows build (NSIS + portable + zip, ~153MB installer) | ✅ working |
| Auto-update via GitHub Releases (`electron-updater`, install-on-quit) | ✅ wired in `electron/main.ts` |
| Overwolf packaging (`@overwolf/ow-electron` + `dist:overwolf` script + config) | ✅ integrated, ❓ end-to-end build unvalidated |
| macOS (dmg/zip) & Linux (AppImage/deb) targets | ⚠️ configured, never built/signed |
| Icons (ico/png/svg) | ✅ |
| Screenshots (12 via `scripts/generate_screenshots.js`) | ✅ regenerate before submission |
| Store listing copy | ✅ OVERWOLF_LISTING.md |
| Landing page (black-grimoire-web) | ✅ polished, deploy checklist in its DEPLOY.md |
| Code signing (Windows) | ❌ unsigned — SmartScreen warning on direct download |
| Privacy policy + EULA | ❌ **required by every store** (app reads Arena logs) |
| In-app payments / Pro gating | ❌ app is currently fully free/local |
| Crash telemetry (remote) | ❌ local crash log only |

## Strategy in one paragraph

Ship the **free tracker/builder direct** first (GitHub Releases + landing page) to get users and Arena-log telemetry hardening, then submit to **Overwolf** (gaming-native distribution, 70/30 subscription rails, MTGA Class ID 21308) and the **Microsoft Store** (free store-managed signing, kills the SmartScreen problem). Payments come *after* distribution exists — Free tier at launch, Pro $4.99 / Commander $14.99 wired via Overwolf subscriptions (in-Overwolf installs) and Stripe-on-web account sync (direct/MS Store installs, the v1.1 Electron↔cloud bridge). macOS/Linux wait for demand signals.

## Phases and gates

### P0 — Ship-readiness (1 week)
- [ ] Write PRIVACY.md + EULA.md, host on landing page (`/privacy`, `/eula`). Must disclose: local Arena log parsing, card data from Scryfall, optional cloud recommendations (deck contents sent to CF API), no sale of data.
- [ ] Clean-VM install test: fresh Windows 11, no dev tools → installer → first-boot wizard → card seed → build a deck → Arena overlay on a real match.
- [ ] Regenerate the 12 screenshots on current UI.
- [x] Version bump to `1.0.0-beta.1` (2026-09-19, d20ddcb).
- **Gate:** operator says the clean-VM run felt shippable.

### P1 — Direct launch (week 2)
- [x] `npm run dist:win` → GitHub Release `v1.0.0-beta.1` (prerelease, NSIS + portable + zip + latest.yml, 2026-09-19; smoke: window in 10 s on a fresh profile).
- [x] Landing + `/download` page read the latest GitHub release; header Download button, hero CTA (black-grimoire-web 239c283, deployed 2026-09-19).
- [ ] Auto-update sanity check: beta.2 published 2026-09-19 (updater feed URLs 200, first non-draft release; /download picks it up within its hourly revalidate); still to confirm: beta.1 → beta.2 update on a machine with beta.1 installed.
- **Gate (rung 3 — operator only):** publishing the GitHub Release and flipping the landing page live are outbound/publish actions. Draft everything; operator presses publish.

### P2 — Overwolf (weeks 2–6, parallel after P1)
- [ ] Create Overwolf developer account (free) at developer.overwolf.com.
- [ ] Validate `npm run dist:overwolf` end-to-end; fix ow-electron-builder config drift.
- [ ] Overwolf requires: overlay behavior compliance (no input hijack, performance budget), game events for MTGA (Class ID 21308), listing assets (tile 258×198, screenshots 1920×1080, description from OVERWOLF_LISTING.md).
- [ ] Submit → review cycle is typically 2–4 weeks with revision requests; budget two rounds.
- [ ] Post-approval: enable Overwolf subscriptions (Pro $4.99 / Commander $14.99, 70/30 split).
- **Positioning note:** Untapped.gg owns "tracker" on Overwolf. We submit as **deck BUILDER with AI + tracker**, not tracker-first — the listing copy already leads with building.

### P3 — Microsoft Store (weeks 3–6, parallel)
- [ ] Partner Center individual account — **$19 one-time (operator spend approval)**.
- [ ] Add `appx` target to `electron-builder.yml` win targets; MS signs the package — no cert purchase needed.
- [ ] IARC age rating questionnaire, privacy policy URL (from P0), store listing (reuse Overwolf copy, 3:2 screenshots).
- [ ] Certification is days, not weeks. MS Store install also removes SmartScreen friction entirely.

### P4 — Payments + Pro gating (weeks 6–10)
- [ ] Decide gating seam: overlay + unlimited AI behind Pro; tracker + 3 decks free (matches landing pricing).
- [ ] In-Overwolf installs → Overwolf subscription API. Direct/MS Store installs → account sync with black-grimoire-web (Clerk session in Electron, entitlement check) + Stripe.
- [ ] Do NOT gate anything until both rails work — a paywall with broken payment is worse than free.
- **Gate (rung 3):** Stripe live-mode flip is operator-only.

### P5 — macOS / Linux (demand-driven, not scheduled)
- macOS: Apple Developer **$99/yr (operator spend)**, notarization + hardened runtime, Arena-on-Mac log path differs (`~/Library/Logs/Wizards Of The Coast/MTGA`). Only worth it if >10% of landing-page traffic is Mac.
- Linux: AppImage direct download only; Arena doesn't run natively — audience is paper/Commander users of the builder.

## Costs

| Item | Cost | When |
|---|---|---|
| Overwolf dev account | $0 | P2 |
| Microsoft Partner Center (individual) | $19 one-time | P3 |
| Apple Developer | $99/yr | P5 only |
| Windows OV code-signing cert (optional — only if direct-download SmartScreen hurts before MS Store ships) | ~$100–300/yr | defer; MS Store + reputation usually suffices |
| Sentry crash telemetry (optional) | free tier | P0/P1 |

All spends are rung-3: named here, operator approves each.

## Risks

- **Overwolf review friction** — overlay apps get extra scrutiny; ow-electron build never validated end-to-end. Mitigate: validate in P2 week 1, keep direct channel as the fallback.
- **SmartScreen on direct installs** — unsigned NSIS shows "unrecognized app". Mitigate: push MS Store install on the landing page as the primary Windows path once live.
- **Wizards of the Coast ToS** — log-file reading is the same mechanism Untapped/17Lands use (tolerated for years); do not inject into the game process, ever.
- **Support surface** — one operator. Keep Free tier generous but support-light; funnel bugs to a GitHub issues link in-app.

## Launch sequencing summary

```
Week 1    P0 ship-readiness (privacy/EULA, clean-VM, beta.1)
Week 2    P1 direct launch (GitHub Release + landing live)   ← first public users
Weeks 2-6 P2 Overwolf submission + review        (parallel)
Weeks 3-6 P3 Microsoft Store                     (parallel)
Weeks 6-10 P4 payments + Pro gating              ← first revenue
Later     P5 macOS/Linux on demand signal
```

## Backlog (operator, 2026-09-20)

Unscheduled product items. Each line: what exists today → the gap → the first slice.

- **Automatic Arena collection import after account sync.** Today: the desktop reads the collection block from `Player.log` only when the Arena client starts; the operator's collection was refreshed from an Untapped CSV (`verify-2026-09-19/import-arena-csv.ts`); the app's own `import-csv` route matches by `LIKE`, overwrites instead of summing printings and never clears stale rows (defect). Gap: nothing pushes the collection to the web account. First slice: desktop watcher imports the collection block whenever Arena writes one (dedupe by snapshot hash), fix `import-csv`, then extend the match-sync contract with `POST /api/collection` (same token) so the web builder's "Build from my collection" needs no paste.
- **Game tracking.** Today: desktop parses matches from `Player.log` (`arena_parsed_matches`), live overlay tracks zones/life/draw odds, results sync to `/dashboard/matches` (beta.2). Gap: results only — no per-game timeline, mulligan/keep, cards seen, opponent archetype, or win rate by deck and matchup on the web. First slice: sync the game-event summary the engine already computes (mulligan decision, turn count, opponent commander/archetype guess, first/draw) and show win rate by deck and by matchup on the web dashboard.
- **MTG Arena crafting suggestions.** Today: `craftList` on collection builds (web table, rarity, paper price, would-replace). Gap: no wildcard economics — owned wildcards are in `Player.log` inventory, not read; suggestions are per build, not across the user's decks; ranking is by builder score, not by marginal deck-score gain. First slice: read wildcard counts from `Player.log`, rank crafts by "decks improved per wildcard" across saved decks, mark Arena-only legality; switch the ranking to Δdeck-score once the score is calibrated (`docs/DECK_SCORE_SPEC.md`).
- **Phone application.** Today: the web is mobile-responsive (2026-09-18 pass); match recording is desktop-only. Recommendation: PWA first (manifest, service worker, offline deck view, install prompt, push for sync events) — days, one codebase; native (Expo) only if a store presence or Arena-companion features demand it. Arena runs on phones, but its logs are not readable there, so match recording stays desktop.
- **Builder fills tutor/reanimation slots with no payoff (engine defect, seen 2026-09-20).** A web-built "Fire Lord Azula — Spellslinger" (no collection limit) carried Razaketh, Beseech the Mirror, Diabolic Intent, Fabricate and Entomb with nothing to fetch or reanimate, plus Combat Celebrant / Bulk Up / Fists of Flame filler; the Deck Score read it at 26 (synergy 8: one spellslinger closer of four typed, 57 % coverage). Fix in `deck-builder-ai.ts`: a tutor/reanimation slot may only be filled when the deck already holds ≥ 2 typed targets for it; spellslinger template wants ≥ 25 instants/sorceries and ≥ 4 typed closers before creature filler. Second gap: fresh web-built lists sit at ~57 % typed coverage (TLA-set cards), so the score stays provisional — coverage queue for web-built lists is a stage-3/4 deck-score item.
