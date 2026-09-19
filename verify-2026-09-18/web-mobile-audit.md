# Mobile audit — theblackgrimoire.com (390x844, 768x1024)

Read-only audit, Playwright MCP. Source repo: `C:\Users\QuLeR\black-grimoire-web`.

## Ranked findings

| # | Severity | Route(s) | Symptom | Measurement | File/component | Suggested fix |
|---|----------|----------|---------|-------------|-----------------|----------------|
| 1 | HIGH | All 11 routes, 390 and 768 | Header eats 110-120px (13-14% of a 390x844 viewport) as two stacked nav rows; below `xl` (1280px) every route shows a second, horizontally-scrolling nav row on top of the icon-less first row | Header height 120px @390 / 110px @768; nav links 36px tall, `Sign in`/`Build a Deck` pills 28px tall | `src/components/site-header.tsx:91-101` (mobile nav `<nav>` block) | Collapse into a single-row hamburger/sheet menu below `xl` instead of a second scrollable row; frees ~80px of vertical space and removes the tap-target and discoverability problems below |
| 2 | HIGH | All 11 routes, 390 and 768 | 21-36 tap targets per page under the 40x40px minimum: every top-nav link (36px h), `Sign in` and `Build a Deck` header pills (28px h), logo link (32x32) | `smallTapCount` 15-36 per route; e.g. home 390: 23, commander detail 390: 106 (includes in-page mana-pip chips) | `src/components/site-header.tsx:40-45,70-88,91-100` | Raise nav link/button min-height to 40-44px (`py-2` → `py-2.5`/`min-h-11`) |
| 3 | HIGH | /commanders/witherbloom-the-balancer | Real horizontal page overflow (not just an inner scroller) — page scrolls 66px right at 390px, gone by 768px | `overflowX: 66` at 390; offending elements are `span.text-[11px].font-mono.text-muted-foreground` (inclusion-% labels, e.g. "91.7%") 120px wide inside a `flex items-center gap-2` row that doesn't wrap, right edge at 726px in a 390px viewport | `src/components/commanders/top-cards-table.tsx` / `src/components/commanders/synergy-list.tsx` (grid `sm:grid-cols-2 xl:grid-cols-3` card row) | Let the stat row wrap (`flex-wrap`) or drop to a single column below `sm`, so the row can't exceed viewport width |
| 4 | MEDIUM | /optimizer (390 and 768) | Decklist textarea font is 14px, below the 16px iOS auto-zoom threshold — every 390-width text input on this page zooms in on focus | `zoomInputCount: 2`, computed font-size 13-14px | `src/components/optimizer/deck-input.tsx:77` — `className="font-mono text-sm"` on the shared `Textarea` unconditionally overrides its `text-base` default, with no `md:` guard | Change to `text-base md:text-sm` (or just drop the override) so mobile keeps 16px |
| 5 | MEDIUM | /sign-up (390 and 768) | Clerk's hosted `<SignUp/>` renders its email/password inputs at 13px, below the zoom threshold | `zoomInputs: [{type:"text",fs:13},{type:"password",fs:13}]` | `src/app/sign-up/[[...sign-up]]/page.tsx` — bare `<SignUp />`, no `appearance` prop | Pass `appearance={{ elements: { formFieldInput: 'text-base' } }}` (or equivalent Clerk theme var) to force ≥16px on its inputs |
| 6 | LOW | /, /commanders, /commanders/[slug] | 47-399 text nodes under 12px: mana-pip letter badges (single-letter W/U/B/R/G spans at 9px), a "THE BLACK GRIMOIRE" eyebrow at 11.2px, curve/step index numbers at 10.4px, image credit line at 11px | `smallFontCount` 47 (home), 79 (commanders list), 399 (commander detail) | mana-pip badge component (search: `text-\[9px\]` under `src/components/commanders/`) and landing eyebrow/step-index spans in `src/components/landing/` | These are deliberately tiny glyph badges inside colored circles, not body copy — legible in practice; only worth raising if a designer flags them, no action needed for the eyebrow/credit lines either |
| 7 | LOW | All routes | Zero images missing width/height except one on the commander detail page (`imgNoWH: 1`) — negligible CLS risk | commander-detail 390: `imgNoWH: 1` | `src/components/commanders/*` card/portrait image | Add explicit `width`/`height` or `fill` + sized container to the one flagged `<img>` |
| — | PASS | All routes | Viewport meta present and correct; no `<html>`-level horizontal scroll on 10 of 11 routes; `/collection` renders a graceful signed-out empty state instead of erroring or redirecting | `viewportMeta: "width=device-width, initial-scale=1"` everywhere | — | — |

## Per-route measurements

### 390x844

| Route | overflowX | small tap targets | small font count | zoom-trigger inputs |
|---|---|---|---|---|
| / | -10 (ok) | 23 | 47 | 0 |
| /commanders | -10 (ok) | 28 | 79 | 0 |
| /commanders/witherbloom-the-balancer | **66 (real overflow)** | 106 | 399 | 0 |
| /builder | -10 (ok) | 30 | 0 | 0 |
| /optimizer | -10 (ok) | 36 | 0 | **1** |
| /collection | -10 (ok) | 23 | — | 2 |
| /decks | -10 (ok) | 26 | — | 0 |
| /favorites | 0 (ok) | 21 | — | 0 |
| /methodology | -10 (ok) | 21 | 0 | — |
| /sign-up | -10 (ok) | 15 | — | **2 (13px)** |
| /faq | -10 (ok) | 23 | 0 | — |

Negative `overflowX` (-10) is the mobile nav's own inner `overflow-x-auto` scroller reporting slack, not a page-level bug.

### 768x1024

| Route | overflowX | notes |
|---|---|---|
| / | -10 (ok) | header 110px tall, smallTapCount 22, smallFontCount 47 (same mana-pip badges) |
| /commanders | -10 (ok) | clean |
| /commanders/witherbloom-the-balancer | -10 (ok) | overflow bug from 390 is gone — stat grid reflows to `sm:grid-cols-2` |
| /builder | -10 (ok) | clean |
| /optimizer | -10 (ok) | same 2 zoom-trigger inputs persist (deck-input.tsx override has no breakpoint guard) |
| /collection | -10 (ok) | clean |
| /decks | -10 (ok) | clean |
| /favorites | 0 (ok) | clean |
| /methodology | -10 (ok) | clean |
| /sign-up | -10 (ok) | same 2 Clerk inputs persist |
| /faq | -10 (ok) | clean |

## Screenshots

All under `C:\Users\QuLeR\MTG-deck-builder\.playwright-mcp\mobile\`:

`mobile-390-{home,commanders,commander-detail,builder,optimizer,collection,decks,favorites,methodology,signup,faq}.png`, and the same set with `-768-` for the tablet width.
