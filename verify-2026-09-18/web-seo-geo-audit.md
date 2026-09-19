# theblackgrimoire.com — SEO + GEO Audit (2026-09-18)

Read-only audit. Site crawled live via GEO scanner (`geo-scraper-file-generator`), a 22-page
manual HTML crawl (13 unique routes + 4 auth/dashboard/favorites + 5 random `/commanders/<slug>`
pages), and Lighthouse 12 (desktop + mobile). Source repo checked: `C:\Users\QuLeR\black-grimoire-web`
(read-only, no edits made).

## Ranked findings

| # | Sev | Area | URL(s) | Symptom | Source file | Fix |
|---|-----|------|--------|---------|--------------|-----|
| 1 | HIGH | SEO | `/builder`, `/decks`, `/collection`, `/favorites`, `/sign-up`, `/sign-in`, `/dashboard` (7 pages) | Identical `<title>` and meta description as the homepage ("The Black Grimoire — Free Commander & Brawl Deck Builder…") — scanner: "7 pages share 1 duplicate title/description" | `src/app/builder/layout.tsx`, `src/app/decks/layout.tsx`, `src/app/collection/layout.tsx` (only set `alternates.canonical`, no `title`/`description`); `src/app/layout.tsx` root metadata is the fallback | Add a `title`/`description` export to each of those layouts (builder/decks/collection are real product pages and deserve unique copy); sign-in/sign-up/dashboard should get `robots: {index:false}` instead (see #2) |
| 2 | HIGH | SEO/GEO | `/dashboard`, `/sign-in`, `/sign-up` | Indexable per-user/auth pages: `robots: index, follow`, no canonical, no noindex meta — only blocked via `robots.txt Disallow`. Disallow-without-noindex is the classic "indexed, no snippet" trap: if any external link points at them, Google can list the bare URL since it never crawls far enough to see a noindex tag | `src/app/robots.ts` (`disallow = ['/api/', '/dashboard', '/sign-in', '/sign-up']`); no `layout.tsx`/metadata for sign-in, sign-up, dashboard routes (compare `src/app/favorites/layout.tsx`, which correctly does `robots:{index:false,follow:false}` and has NO robots.txt disallow) | Mirror the `/favorites` pattern: remove the robots.txt disallow for these 3 paths and add `metadata.robots = {index:false, follow:false}` layouts instead |
| 3 | MED | SEO | `/commanders` | `<title>Commander search — The Black Grimoire — The Black Grimoire</title>` — brand suffix duplicated | `src/app/layout.tsx` line ~41 title `template: '%s — The Black Grimoire'` + `src/app/commanders/page.tsx` line 9 sets `title: 'Commander search — The Black Grimoire'` (already includes the brand, so the template appends it again) | Change `commanders/page.tsx` title to `'Commander search'` (bare), let the template add the brand once |
| 4 | MED | GEO | robots.txt / AI infra | GEO scanner: robots.txt only names 14/23 tracked AI crawlers (Apr 2026 baseline); "Training vs Retrieval Bot Strategy" 30/100 — 0/9 training-only bots (e.g. Bytespider, Diffbot, ImagesiftBot, Timpibot) are explicitly addressed, so they fall through to the wildcard `Allow: /` | `src/app/robots.ts` `AI_CRAWLERS` array (23 vendor tokens tracked as of the scanner's baseline vs. 22 listed here) | Decide the training-bot policy explicitly (allow or block each of the missing ones) rather than relying on the `*` catch-all default-allow |
| 5 | MED | GEO | `agents.json` (site root) vs `.well-known/agent-card.json` | Two separate, overlapping "AI agent" manifests with different schemas; `agent-card.json` scores 62/100 because it has no `supportedInterfaces`/transport endpoints (A2A spec expects an interfaces array — file has none) | `public/agent-card.json` (served at `/.well-known/agent-card.json`), `public/agents.json` | Add a minimal `supportedInterfaces` block (e.g. `[{"transport":"HTTP+JSON","url":"https://theblackgrimoire.com/optimizer"}]`) to `agent-card.json`; keep `agents.json` as the human/LLM-readable summary since it's already good |
| 6 | MED | GEO | `.well-known/tdmrep.json` | TDMRep validity 38/100 — missing `@context`, `profile`, `assigner`, and `policy` rule-shape fields the TDMRep spec expects per entry | `public/tdmrep.json` | Add `@context: "https://www.w3.org/ns/tdm"` and an `assigner` object per the TDMRep JSON schema |
| 7 | MED | perf/mobile | `/` (home, mobile) | Lighthouse mobile: performance **66/100**, LCP **8.6s** (should be <2.5s). Desktop is fine (94). Opportunities: enable text compression (~1.3s), reduce unused JS (~1.2s), preconnect to required origins | `src/app/layout.tsx` (fonts/scripts), nginx/CDN compression config on the VPS | Verify gzip/brotli is actually applied to the mobile UA path (desktop already compresses per the GEO scanner: "48/48 pages served with compression" — check if mobile hits a different origin/cache tier); add `rel=preconnect` for the API/font origins; audit unused JS bundle |
| 8 | MED | a11y/perf | commander pages (all `/commanders/<slug>`) | Lighthouse desktop: "Page prevented back/forward cache restoration" (bfcache fail) — every commander page navigation is a full reload from history, hurting perceived speed and Core Web Vitals sampling | `/commanders/[slug]/page.tsx` or a client component using an unload/beforeunload listener, or non-cacheable headers | Find the bfcache blocker (`chrome://terminate-me-if-in-bfcache` / `Cache-Control: no-store` on a subresource, or a `pagehide`/`unload` listener) and remove it |
| 9 | MED | content | site-wide | GEO scanner: "Content Structure & Depth 35/100" — 28/48 crawled pages are <300 words (mostly `/builder`, `/decks`, `/collection`, auth pages — the same 101–179-word SPA shells from finding #1); "Paragraph Length" and "Content Quotability" both score 0/100 | Client-only shell pages (`builder`, `decks`, `collection` `page.tsx` render almost nothing server-side) | These are app shells by design (client fetches after mount) — lowest-effort fix is a short static intro paragraph server-rendered above the client component so crawlers get >150 words of real text before the JS boundary |
| 10 | LOW | SEO | `/` | og:title/description reused verbatim from `<title>`/description (fine) but scanner flags 12/48 pages with `og:title` outside 25–60 chars and 7/48 with `og:description` outside 55–200 chars — likely the commander pages with long card names in the title | `src/app/commanders/[slug]/page.tsx` generateMetadata (title = `${commander.name} — top cards, synergies and decks`) | Truncate/shorten the OG title template for commanders with long names (e.g. "T'Challa, the Black Panther — top cards, synergies and decks" is 61 chars, 1 over) |
| 11 | LOW | GEO | site-wide | `mcp.json`, `ai-plugin.json`, `manifest.json` (web app manifest) all 404 | none exist yet | Low priority: a PWA `manifest.json` helps "Add to Home Screen" / some AI agent tooling; MCP/ai-plugin are optional and increasingly superseded by `agent-card.json` |
| 12 | LOW | GEO | `llms.txt` content quality 72/100 | "Core Facts 11/25", "Partners 0/10" sub-scores low | `public/llms.txt` | Add explicit facts (deck corpus size, data sources, last-updated date) and a partners/attribution section if any exist |
| 13 | LOW | perf | site-wide | GEO scanner: "Text-to-HTML Ratio 0/100" on all 48 pages — expected for a hydrated Next.js SPA (large inline RSC payload/script tags), not a true content-thinness signal, but worth knowing AI crawlers weighting on this ratio will read the pages as script-heavy | Next.js RSC streaming payload | No action needed unless a specific AI crawler is shown ignoring the page in `check` mode; monitor via GEO `check` command instead of `scan` |
| 14 | INFO | security | site-wide | Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all present; **no CSP** (Content-Security-Policy) header (verified via `curl -I`) | nginx / `next.config.js` headers | Not SEO-blocking; note for a future security pass |
| 15 | INFO | SEO | site-wide | Lighthouse SEO = 100/100 on every page tested (home desktop, home mobile, commander desktop); accessibility and best-practices both 100/100 everywhere tested | n/a | No action — the traditional Lighthouse-visible signals are already clean; the GEO scanner catches finer AEO/GEO-specific issues Lighthouse doesn't check |

## Per-URL crawl table (22 pages sampled: all 13 sitemap "core" URLs + 4 auth/private routes not in the sitemap + 5 random commander pages)

| URL | Status | Title (len) | Desc (len) | Canonical | Robots meta | H1 | Words | JSON-LD types |
|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 60 | 169 | self | index,follow | 1 | 639 | HowTo, Organization, SoftwareApplication, WebPage, WebSite |
| `/builder` | 200 | 60 (dup) | 169 (dup) | self | index,follow | 0 | 101 | none |
| `/optimizer` | 200 | 35 | 203 | self | index,follow | 1 | 373 | BreadcrumbList, HowTo, WebPage |
| `/commanders` | 200 | 61 (**dup brand suffix bug**) | 147 | self | index,follow | 1 | 172 | BreadcrumbList, WebPage |
| `/decks` | 200 | 60 (dup) | 169 (dup) | self | index,follow | 1 | 155 | none |
| `/collection` | 200 | 60 (dup) | 169 (dup) | self | index,follow | 1 | 179 | none |
| `/methodology` | 200 | 32 | 165 | self | index,follow | 1 | 1226 | BreadcrumbList, TechArticle, WebPage |
| `/faq` | 200 | 24 | 136 | self | index,follow | 1 | 791 | BreadcrumbList, FAQPage, WebPage |
| `/about` | 200 | 26 | 140 | self | index,follow | 1 | 540 | BreadcrumbList, Person, WebPage |
| `/contact` | 200 | 28 | 110 | self | index,follow | 1 | 153 | BreadcrumbList, WebPage |
| `/support` | 200 | 28 | 83 | self | index,follow | 1 | 357 | BreadcrumbList, WebPage |
| `/privacy` | 200 | 35 | 114 | self | index,follow | 1 | 561 | BreadcrumbList, WebPage |
| `/terms` | 200 | 37 | 53 (short) | self | index,follow | 1 | 454 | BreadcrumbList, WebPage |
| `/favorites` (not in sitemap) | 200 | 60 (dup) | 169 (dup) | self | **noindex,nofollow** (correct) | 0 | 145 | none |
| `/sign-up` (not in sitemap) | 200 | 60 (dup) | 169 (dup) | none | index,follow (**should be noindex**) | 0 | 101 | none |
| `/sign-in` (not in sitemap) | 200 | 60 (dup) | 169 (dup) | none | index,follow (**should be noindex**) | 0 | 101 | none |
| `/dashboard` (not in sitemap) | 200 (redirects to `/sign-in?redirect_url=…`, auth-gated) | 60 (dup) | 169 (dup) | none | index,follow (**should be noindex**) | 0 | 101 | none |
| `/commanders/be-lakor-the-dark-master` | 200 | 84 | 211 | self | index,follow | 1 | 1452 | BreadcrumbList, ItemList, WebPage |
| `/commanders/zurgo-stormrender` | 200 | 71 | 200 | self | index,follow | 1 | 1409 | BreadcrumbList, ItemList, WebPage |
| `/commanders/t-challa-the-black-panther` | 200 | 86 (>60, OG title long) | 221 | self | index,follow | 1 | 1418 | BreadcrumbList, ItemList, WebPage |
| `/commanders/child-of-alara` | 200 | 68 | 192 | self | index,follow | 1 | 1347 | BreadcrumbList, ItemList, WebPage |
| `/commanders/noctis-prince-of-lucis` | 200 | 77 | 223 | self | index,follow | 1 | 1363 | BreadcrumbList, ItemList, WebPage |

Notes on the 5 sampled commander pages (step 3 — "at scale" check): titles, descriptions and
canonicals are all unique per commander (data-driven from `generateMetadata` in
`commanders/[slug]/page.tsx`), no template-collision bug there. Answer-first check: on
`be-lakor-the-dark-master`, the deterministic summary sentence ("Be'lakor... appears in 4,618
public decks...") sits ~1.8KB of markup after the `<h1>` — behind the color-pip icons, deck-count
badge and type line, but still before any card list. Legitimate answer-first ordering; the GEO
scanner's "Answer-First Content Structure 0/100" and "Featured Snippet Readiness 20/100" scores
are stricter (they want the summary as the very first text node, with no intervening DOM), so
treat those two sub-scores as directional rather than a hard bug.

sitemap.xml: 513 URLs total (13 static + 500 commander pages, capped at
`TOP_COMMANDERS_IN_SITEMAP = 500` in `src/app/sitemap.ts`), all with `lastmod`. Not checked:
the other 495 commander pages — spot check above stands in for that population.

## GEO scanner summary (48 pages crawled, `--audit-only`)

**Overall GEO Score: 73/100 (Grade B).** 1 error, 7 warnings, 17 notices.

| Category | Notable scores |
|---|---|
| AI infrastructure | robots.txt 73/100 (14/23 crawlers named), sitemap 100, llms.txt 100, llms-full.txt 100, ai.txt/ai.json 100, AI bot blocking 100, agent-card.json 80 (62 on deep validity — missing interfaces), agents.json 100, mcp.json 0 (missing), TDMRep validity 38 |
| Content quality | Structured Data 76/100 (22/48 pages carry JSON-LD), FAQ 100, Content Structure & Depth 35 (28 thin pages), Featured Snippet Readiness 20, Paragraph Length 0, Answer-First 0, Duplicate Titles/Descriptions 85 (7 pages, see finding #1), Readability 15 (Flesch 8.9 — likely skewed by card-name-dense text, not prose) |
| AI discoverability | Search Engine Indexing 40 (no GSC/Bing verification tag, 1 noindex page = `/favorites`, correctly), Open Graph 94, Twitter Cards 80, Social Proof 25 (only GitHub link), Citation Quality 44 |
| Foundational SEO | Titles 81, Meta Descriptions 72, Alt text 99% (877/889 images), Internal linking 99, Canonical 100 (46/48 valid — 2 exceptions are the auth pages missing canonicals), Text-to-HTML Ratio 0 (RSC hydration payload, see finding #13), Missing H1 92 (4/48 pages have no H1 — matches builder/decks-shell/sign-in/sign-up/dashboard-type pages), Temporary Redirects 0 (1 redirect is 302/307, should be 301/308) |
| AI platform readiness (scanner's estimate) | Google AI Overviews 71 (B), ChatGPT 45 (D), Perplexity 46 (D), Gemini 44 (D), Bing Copilot 54 (D) |

## Lighthouse scores

| Run | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Home — desktop | 94 | 100 | 100 | 100 |
| Home — mobile | **66** | 100 | 100 | 100 |
| Commander page (Be'lakor) — desktop | 84 | 100 | 100 | 100 |

Top failing/weak audits:
- Home desktop: `network-dependency-tree-insight` (informational, score 0 but non-blocking).
- Home mobile: LCP **8.6s**, TBT 330ms; opportunities — enable text compression (~1.3s), reduce unused JS (~1.2s), preconnect to required origins (~0.3s), avoid legacy JS (~0.15s).
- Commander desktop: `bf-cache` fails — page prevents back/forward cache restoration (finding #8).

## Files reviewed (mapping reference)

- `src/app/robots.ts` — AI crawler allow-list (22 named agents) + disallow list (`/api/`, `/dashboard`, `/sign-in`, `/sign-up`).
- `src/app/sitemap.ts` — 13 static paths + top 500 commanders by deck count, `lastModified` from `siteFacts.asOf`.
- `src/app/layout.tsx` — root metadata: title template `'%s — The Black Grimoire'`, default OG/Twitter, global `robots: {index:true, follow:true, ...}` (deliberately permissive — comment cites the 2026-09-08 GEO scan), no site-wide canonical (comment: a layout-level canonical caused 160+ pages to claim to be the homepage in a past scan — now fixed per-route).
- `src/app/builder/layout.tsx`, `decks/layout.tsx`, `collection/layout.tsx` — canonical-only metadata, no title/description (root of finding #1).
- `src/app/favorites/layout.tsx` — correct noindex pattern; not mirrored to sign-in/sign-up/dashboard (finding #2).
- `src/app/commanders/page.tsx` — static metadata, brand-suffix bug (finding #3).
- `src/app/commanders/[slug]/page.tsx` — `generateMetadata`, per-commander title/description, correct.
- `public/agent-card.json` (served at `/.well-known/agent-card.json`) and `public/agents.json` — two AI-agent manifests, only the former is spec-checked by the scanner (finding #5).
- `public/tdmrep.json` (served at `/.well-known/tdmrep.json`) — minimal TDM reservation array (finding #6).
- `public/llms.txt`, `public/llms-full.txt`, `public/ai.txt`, `public/ai.json`, `public/humans.txt`, `public/.well-known/security.txt` — all present, all 100/100 or high on presence checks.
