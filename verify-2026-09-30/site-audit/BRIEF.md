# Full functional audit — theblackgrimoire.com (2026-09-30)

**Goal.** Find out whether every function of the live site works: each page renders, each form and button does what it
says, and each API it calls returns a correct result. Report PASS / FAIL / WARN per function, with evidence.

**Scope.**
- Live site `https://theblackgrimoire.com`.
- Source of truth for what should exist: the repo `C:\Users\QuLeR\black-grimoire-web`. Read-only. Build the function inventory
  from `src/app/**` (pages + `api/` route handlers), the nav/footer links, `sitemap.ts`, `robots.ts`, and the
  forms/buttons in each page's components. Every route and every user action in the inventory gets a verdict. No sampling:
  if an item cannot be tested, say why (e.g. needs login) instead of dropping it.
- Tools: the Playwright MCP browser (desktop 1440×900 and mobile 390×844), `curl`, and the repo's source.

**What to check, per function.**
1. Pages: HTTP status, page renders its main content, no console errors, no failed network requests, no broken images,
   title/meta present, mobile layout usable (no horizontal overflow, buttons reachable).
2. Builder (`/builder`): build at least these, from the UI, and read the result:
   - Commander, a 2-colour commander, no collection; Commander, a 5-colour commander; Brawl (Arena) commander;
     a build with a price cap / deck budget / bracket target set (check the result respects each).
   - Per build: 100 cards incl. commander, singleton, every card inside the commander's colour identity, legal in the format,
     land count 33–40, no obviously dead land (a land that makes no coloured mana for a multicolour deck).
     Cross-check 5 random cards per build against Scryfall (`https://api.scryfall.com/cards/named?exact=`) for identity and legality.
3. Optimizer (`/optimizer`) and Deck Doctor / analyze: paste a real list (use
   `C:\Users\QuLeR\MTG-deck-builder\verify-2026-09-30\arena-tam\final.txt`, Brawl), confirm the result renders and its numbers
   are plausible (land count matches the list: 35).
4. Card alternatives / "find cheaper", card lookup, commander pages (`/commanders/...`), collection import UI (use a tiny
   3-card CSV you write under the audit folder), favourites, decks, dashboard — whatever the inventory shows. Auth-gated
   pages: confirm the signed-out behaviour (redirect to sign-in, no crash, no data leak). If the browser already holds a
   signed-in session, test the signed-in flow read-only.
5. `/download`: every download link resolves (HEAD 200/302 to the GitHub asset), the SHA-256 shown matches the GitHub
   asset digest (`gh release view --repo <owner/repo from the page link> --json assets`).
6. Content correctness: FAQ/methodology/about claims that contradict the product (known: an FAQ bracket sentence is stale —
   confirm and quote it). Dead internal/external links across all pages.
7. Infra: TLS cert expiry, `robots.txt`, `sitemap.xml` (every URL 200), response time of the builder request, security
   headers (CSP, HSTS, X-Frame-Options) — report, don't fix.

**What must not happen.**
- No payments, donations, or checkout completion. No sign-up / account creation. No password resets.
- Do NOT submit the feedback/contact/support forms (they send to Telegram / email). Check them only up to validation
  (empty submit → error shown) and confirm the submit handler exists in source.
- No load testing: at most ~15 build/optimize requests in total, sequential.
- No edits to either repo's source, no git, no deploys, no ssh to the VPS, no taskkill.
- Screenshots go under `C:\Users\QuLeR\MTG-deck-builder\verify-2026-09-30\site-audit\shots\` (not %TEMP%).

**Output.**
- `C:\Users\QuLeR\MTG-deck-builder\verify-2026-09-30\site-audit\report.md` (≤ 300 lines):
  1. Verdict line: N functions, PASS / WARN / FAIL counts.
  2. Inventory table: function | route/action | verdict | evidence (status, what you saw, screenshot name).
  3. FAIL and WARN details, most severe first: repro steps, expected vs actual, the source file:line that likely causes it.
  4. Build-quality table for each build (cards, lands, identity OK, legality OK, dead lands named).
  5. Untestable items and why.
- Chat reply ≤ 15 lines: the verdict line and every FAIL in one line each.

**Known facts.**
- The site proxies the build engine (`build-api`, VPS pm2) for `/build`, `/analyze`, `/optimize`, `/alternatives`,
  `/cards/lookup`. Known engine defect being fixed now: collection/multicolour builds pick weak or fake-fixing lands
  (Multiversal Passage, Gemstone Caverns, Plaza of Harmony, Evolving Wilds with few basics). Record it if you see it, don't chase it.
- The operator's collection is not on the site; builds without a collection use the full card pool.
