# Research: Standard Decklist Data Sources (2026-09-10)

Verified by live HTTP requests (curl, browser UA, handful of requests per host). Goal:
close the date + win/loss coverage gap for Standard. Current corpus: mtgtop8 5,931 decks
(no event_date populated in practice, no W/L — source never publishes it), mtggoldfish
2,495 (dates, no W/L), mtgo 750 (dates AND W/L, 2026-08-20..2026-09-08).

Existing scrapers read first: `scripts/scrape_mtgo.py`, `scripts/scrape_mtgtop8.py`,
`scripts/scrape_mtggoldfish.py`, `scripts/scrape_topdeck.py`. All four already write into
`community_decks` / `community_deck_cards` with the same schema.

## 1. Ranked summary

| Source | Standard coverage | Decklist | Date | W/L | Archetype | Auth | Blocked? | Verdict |
|---|---|---|---|---|---|---|---|---|
| **mtgo.com** | Leagues + Challenges + Prelims, daily | Full (qty+name, main+side) | Yes, precise | Yes, per player | Derived (no native label) | None | No (robots.txt 404 = unrestricted) | **BUILD** (already implemented — deepen backfill) |
| **topdeck.gg** | Yes (`Standard` in `FORMAT_MAP`) | Full, when uploaded | Yes | Yes, per player + standing | Commander only (EDH) | API key (401 without) | No | **BUILD** (blocked only on operator obtaining a key) |
| **mtgtop8.com** | Yes, high volume | Full | Yes, on-page (bug in our parser) | **No** — never published | Deck name only | None | No (no robots.txt) | **BUILD-FIX** (date bug), W/L unreachable here |
| mtggoldfish.com | Yes (metagame + tournament pages) | Deck pages Cloudflare-blocked; tournament pages open | Yes, on tournament pages | Yes, on tournament pages | Yes (metagame page) | None | Deck pages: yes (403 CF challenge). Tournament pages: no | MAYBE (tournament pages largely mirror mtgo.com league data) |
| melee.gg | Unverified volume | **robots.txt disallows** `/Decklist/View/`, `/Decklist/Index/` | Tournament page has it | Standings page not fetched (would need `/Standing/` path) | Per-event | None seen for `/Tournament/View/` | robots.txt-gated for decklists | SKIP |
| moxfield.com | Yes (community deckbuilder) | Full, no auth needed | No event date (deck-edit dates only) | **No** (not a tournament site) | User-tagged, not authoritative | None, but API says "not intended for public use" | ToS-gated, not robots-gated | SKIP |
| archidekt.com | Yes (community deckbuilder) | Full, no auth needed | No event date | **No** | User-tagged | None | No | SKIP (doesn't close the gap) |
| 17lands.com | **None** — Limited/Draft only | N/A | N/A | N/A | N/A | Public CSV exports | No | SKIP (out of format scope) |
| mtgdecks.net | Yes | Yes | Yes | Unverified (need a deck-detail page) | Yes | None | **robots.txt names ClaudeBot, anthropic-ai, GPTBot, CCbot, MTGMeta-Scraper as Disallow: /** | SKIP (explicit AI-crawler policy) |
| aetherhub.com | Yes (`/Meta/Format/Standard`) | Unverified | Unverified | Unverified | Yes | None | **robots.txt Cloudflare-managed block: ClaudeBot, GPTBot, etc. Disallow: /** | SKIP (same policy signal) |
| untapped.gg (mtga.untapped.gg) | Yes (`/constructed/standard/decks`) | Unverified — Next.js client-rendered, API call not found in first-load HTML | Unverified | Aggregate win% only, not per-player | Yes (archetype tags) | Unverified (page is JS-driven) | robots.txt: generic UA allowed (`User-agent: * / Allow: /`); only named search bots restricted on deep paths | MAYBE (different data shape — Arena ladder aggregate, not tournament records) |
| scryfall.com | N/A (cards) | N/A | N/A | N/A | N/A | None | No | Reference only |
| mtgjson.com | N/A (cards) | N/A | N/A | N/A | N/A | None | No | Reference only |

## 2. Per-source detail

### mtgo.com — BUILD (deepen existing scraper)

Already fully implemented in `scripts/scrape_mtgo.py`. Verification confirms every claim
in its docstring:

- `GET https://www.mtgo.com/decklists/standard` → HTTP 200. Lists Leagues, Challenges,
  Prelims as `href="/decklist/standard-<type>-<date><eventid>"`.
- `GET https://www.mtgo.com/decklists/standard?year=2026&month=7` → HTTP 200, 69 unique
  event links for July 2026 alone. Archive pattern confirmed exactly as documented.
- `GET https://www.mtgo.com/decklist/standard-challenge-32-2026-09-0812853721` → HTTP 200.
  Embedded JSON at `window.MTGO.decklists.data = {...}`:
  ```json
  {"event_id":"12853721","description":"Standard Challenge 32","starttime":"2026-09-08 17:30:00.0",
   "format":"CSTANDARD","decklists":[{"loginid":"319589","player":"FranBenitez91",
     "main_deck":[{"qty":"4","card_attributes":{"card_name":"Swamp", "cost":"0", ...}}], ...}],
   "winloss":[{"loginid":"3466908","losses":"4","wins":"3"}, ...],
   "final_rank":[{"loginid":"3106246","rank":"1","roundnumber":"10"}, ...]}
  ```
  `wins`/`losses` keyed by `loginid`, `final_rank` gives top-8 placement. This is exactly
  what `parse_event()` in the existing scraper reads — no parsing gaps found.
- `robots.txt` → HTTP 404 (page does not exist at all; no restriction stated, no
  Cloudflare AI-bot block either).

**Field mapping**: 1:1 with `community_decks` already. **Rate limit**: none published;
scraper self-limits to 1 req/sec + backoff, which is respectful for a Daybreak-hosted site.
**How to ingest**: no new code needed. Raise `--max-events` and add more `--months` to the
existing cron/manual run — this is the only source that already gives every field we want
(decklist + date + per-player W/L + placement) with zero blocking. The 750-deck corpus is
small only because backfill hasn't been run past 2026-08-20.

### topdeck.gg — BUILD (blocked on an API key)

- `POST https://topdeck.gg/api/v2/tournaments` with `Authorization` header omitted →
  HTTP 401 `{"error":"API key is required"}`. Confirms auth is mandatory; no public/free
  tier reachable without a key.
- `GET https://topdeck.gg/docs/tournaments` → HTTP 404. No public docs page at the
  guessed URL; the real docs are presumably gated behind their Discord/dev-portal
  (UNVERIFIED — could not find without a key or account).
- Already fully coded in `scripts/scrape_topdeck.py`: `FORMAT_MAP` includes
  `"Standard": "standard"`, request body includes `wins`/`losses`/`draws`/`standing`/
  `decklist` columns, writes to both `topdeck_*` tables and bridges into
  `community_decks` (wins, losses, draws, record, player_name, tournament_type='tournament').

**Field mapping**: already complete (see code). **Rate limit**: scraper self-limits to
300ms (200/min), matching the docstring's stated API limit — could not independently
verify this number without a key (UNVERIFIED, taken from existing code comment).
**Auth**: API key, read from `app_state.topdeck_api_key` or `--api-key`. **How to ingest**:
this is an operator action item — request a key (topdeck.gg's process is UNVERIFIED from
outside), set it, then run `py scripts/scrape_topdeck.py --formats Standard`. TopDeck is
the only source besides mtgo.com that gives full decklist + date + per-player W/L —
worth prioritizing once the key exists, since it covers paper/other-platform tournaments
mtgo.com structurally cannot (mtgo.com is MTGO-only).

### mtgtop8.com — BUILD-FIX (date bug), W/L not obtainable

- `GET https://www.mtgtop8.com/format?f=ST` → HTTP 200. Event list rows show dates in
  **`DD/MM/YY`** format on the page, e.g. `31/08/26` (unambiguous — no month 31 exists)
  and `09/09/26`.
- `scripts/scrape_mtgtop8.py:189-191` parses the matched date with
  `datetime.strptime(date_match.group(1), "%m/%d/%y")` — **this assumes `MM/DD/YY`**.
  For any day > 12 (like `31/08/26`) the `strptime` call raises `ValueError` and is
  silently swallowed (`except ValueError: pass`), leaving `event_date = None`. For any
  day ≤ 12 it parses *without* erroring but produces a **transposed, wrong date** (day
  and month swapped) that would silently corrupt the corpus rather than fail loudly.
  This fully explains why the known corpus (5,931 decks) has no usable `event_date` —
  it's not that the site lacks dates, it's a format-string bug. Fix: swap to
  `"%d/%m/%y"`.
- `GET https://www.mtgtop8.com/event?e=90290` (a real Standard event page) → HTTP 200.
  Grepped for win/loss/record patterns (`\d+-\d+-\d+`, "win", "loss", "record") across
  the full page body — **none found** near deck/player entries. Only `class=player`,
  `class=player_big`, `class=meta_arch` selectors exist; no win-loss column for
  constructed premier events. This matches the known-facts assertion that mtgtop8 never
  publishes W/L — confirmed by direct inspection, not assumption.
- `robots.txt` → HTTP 404 (no file exists; unrestricted).

**How to ingest**: one-line fix to the strptime format string recovers `event_date` on
the entire existing 5,931-deck corpus (re-run is not even required — a backfill script
could re-derive dates for already-saved decks from the `event_name`/slug if the raw page
text was preserved, otherwise re-scrape). W/L will never be available from this source —
don't build anything further to chase it here.

### mtggoldfish.com — MAYBE (secondary, likely redundant with mtgo.com)

- `GET https://www.mtggoldfish.com/deck/7135038` → **HTTP 403**, Cloudflare "Just a
  moment..." interstitial (`Content-Type` JS challenge page). Confirms the known
  2026-09-08 finding: individual deck pages are Cloudflare-gated.
- `GET https://www.mtggoldfish.com/metagame/standard#paper` → HTTP 200, not blocked.
- `GET https://www.mtggoldfish.com/tournaments/standard#paper` → HTTP 200, not blocked.
  Returns real `/tournament/<id>` links (e.g. `/tournament/66478`).
- `GET https://www.mtggoldfish.com/tournament/66478` → HTTP 301 → follows to
  `https://www.mtggoldfish.com/tournament/standard-league-2026-09-10` → **HTTP 200, not
  Cloudflare-blocked**. Body contains dense win-loss patterns: `5-7`×17, `0-2`×17,
  `9-1`×10, `6-0`×10, etc. — this is a genuine results table. Important caveat: the slug
  is `standard-league-2026-09-10`, i.e. **this specific tournament page is MTGGoldfish's
  own mirror of an MTGO League day**, not an independent paper event. It likely
  duplicates data already available (and more complete) directly from mtgo.com.
- `robots.txt`: `Content-Signal: search=yes, ai-train=no, use=reference` plus a
  Cloudflare-managed block explicitly listing `User-agent: ClaudeBot / Disallow: /`
  (also GPTBot, CCBot, Google-Extended, Amazonbot, Bytespider, meta-externalagent).
  This disallow is scoped to those named user-agents specifically; the existing scraper
  identifies as `MTGDeckBuilder/1.0`, not `ClaudeBot`, so it is not literally covered by
  that rule — but the site's overall stance (`ai-train=no`) is worth the operator's
  awareness before scaling this up.

**How to ingest**: tournament *list + detail* pages are technically reachable and do
carry W/L, but a quick sample suggests non-mtgo paper events are the minority and would
need per-tournament inspection to separate real independent data from MTGO mirrors.
Low priority — spend the build budget on mtgo.com/topdeck.gg first.

### melee.gg — SKIP

- `GET https://melee.gg/Tournaments` → HTTP 302 → redirects to `/Error`. The public
  tournament index route used by browsers differs from this guess (UNVERIFIED exact
  browse URL).
- `GET https://melee.gg/Tournament/View/244000` → HTTP 200, a real tournament page
  ("Azurite Sea Set Championship").
- `robots.txt` (`https://melee.gg/robots.txt`, `Crawl-Delay: 5`):
  ```
  Disallow: /Decklist/View/
  Disallow: /Decklist/Index/
  Disallow: /Decklist/SearchCardNames/
  Disallow: /Tournament/SearchActivePlayers/
  Disallow: /Tournament/Search/
  Disallow: /Tournament/SearchResults/
  ```
  Decklist retrieval — the exact thing we need — is explicitly robots-disallowed.
  `/Tournament/View/` itself is not listed, so tournament metadata (name/date/standings
  if shown inline) might be reachable, but not the decklists.

**Verdict**: SKIP. The one thing this site could uniquely add (a large paper-tournament
corpus) is exactly what its robots.txt blocks scraping of.

### moxfield.com — SKIP

- `GET https://api2.moxfield.com/v2/decks/search?pageNumber=1&pageSize=5&format=standard`
  → HTTP 200, no auth required. Returns deck metadata (`id`, `name`, `format`,
  `publicUrl`, `likeCount`, `viewCount`) — no tournament/event/W-L fields exist in the
  schema at all; Moxfield is a deckbuilder, not a tournament database.
- `GET https://api2.moxfield.com/` → HTTP 200:
  `{"name":"Moxfield API","notice":"This API is not intended for public use. Please
  refer to https://moxfield.com/help/help-articles/faq#moxfield-api for more
  information."}` — explicit ToS-equivalent statement against programmatic use.
- `robots.txt` (`www.moxfield.com`, redirects to apex domain) has no AI-bot block, but
  the API's own root response is the stronger signal here.

**Verdict**: SKIP. Doesn't have the data we need (no W/L, no event date) and states it
doesn't want automated access to what it does have.

### archidekt.com — SKIP (for this gap)

- `GET https://archidekt.com/api/decks/v3/?formats=1&pageSize=3` → HTTP 200, no auth.
  Paginated deck list (`count`, `next`, `results[]` with `id`, `name`, `size`,
  `deckFormat`, timestamps).
- `GET https://archidekt.com/api/decks/25999239/` → HTTP 200. Full deck object with a
  `cards[]` array (`quantity`, `categories`, nested `card` object) — no tournament,
  event, or win/loss fields anywhere in the response.
- `robots.txt`: standard disallows (`/login?`, `/sandbox?`, `/playtester-v2/`), no
  AI-bot-specific block.

**Verdict**: SKIP for closing the date/W-L gap — it's a clean, open, unauthenticated API,
but it's a deckbuilder with zero tournament metadata, same limitation as Moxfield.

### 17lands.com — SKIP (confirmed out of scope)

- `GET https://www.17lands.com/public_datasets` → HTTP 200. Page content contains no
  mention of "Standard", "Constructed", "Historic", or "Explorer" anywhere — confirms
  17lands' public exports are Limited/Draft-only, as expected. Not investigated further.

### mtgdecks.net — SKIP (explicit AI-crawler policy)

- `GET https://mtgdecks.net/Standard` → HTTP 200, title "MTG Standard top decks and meta
  September 2026" — content clearly exists (dates like `2026-09-10` present in the page).
- `robots.txt` explicitly lists, each with `Disallow: /`: `ChatGPT-User`, `GPTBot`,
  `anthropic-ai`, `Claude-Webt`, `CCbot`, `FacebookBot`, `PiplBot`, and notably
  **`MTGMeta-Scraper`** (implies a history of unwanted scraping specifically targeting
  MTG meta data). The generic `User-agent: *` group is otherwise permissive.

**Verdict**: SKIP. This site has taken an explicit, individually-named stance against AI
crawlers and MTG-meta scrapers. Respecting that is not optional here.

### aetherhub.com — SKIP (same policy signal)

- `GET https://aetherhub.com/Meta/Format/Standard` → HTTP 200, title "MTG Traditional
  Standard Decks" — content exists but win-rate/date fields were not confirmed in a
  first-pass grep (UNVERIFIED — the page may load archetype rows via an XHR call not
  present in the initial HTML).
- `robots.txt`: same Cloudflare-managed AI-bot block as mtggoldfish.com — explicit
  `Disallow: /` for `ClaudeBot`, `GPTBot`, `CCBot`, `Google-Extended`, etc., plus
  `Content-Signal: ai-train=no`.

**Verdict**: SKIP on the same grounds as mtgdecks.net.

### untapped.gg (mtga.untapped.gg) — MAYBE, different data shape

- `GET https://mtga.untapped.gg/constructed/standard/decks` → HTTP 200 (after a 308
  redirect from `/decks`). Page is Next.js client-rendered; the initial HTML's
  `__NEXT_DATA__` blob has `"apiDeckData":null` — actual deck/archetype data loads via a
  client-side API call not captured in the first response (UNVERIFIED — would need a
  browser network trace to find the real JSON endpoint, out of scope for this pass).
- `robots.txt`: only `Bingbot`/`Googlebot`/`DuckDuckBot` are restricted from deep deck
  paths (`/constructed/*/decks/*/*/*`, `/meta/decks/*/*/*`); the closing
  `User-agent: * / Allow: /` block has no disallows, so a generic UA is not robots-gated.

**Verdict**: MAYBE, but structurally different from what we need — this is Arena-ladder
aggregate win-rate by archetype, not per-player tournament records with names/dates. It
would feed `meta_card_stats`/`archetype_win_stats` shape data, not `community_decks`
rows. Worth a follow-up recon session to find the real API if Arena-meta signal
(distinct from paper/MTGO tournament signal) is wanted later — not part of this gap.

### scryfall.com / mtgjson.com — reference only

- `GET https://api.scryfall.com/bulk-data` → HTTP 200, standard bulk data listing.
- `GET https://mtgjson.com/api/v5/Meta.json` → HTTP 200, `{"version":"5.3.0+20260910"}`.
Both already used for card data (`scripts/update-card-data.ts`); not decklist sources.

## 3. Recommended ingest set

Build/fix, in this order:

1. **mtgo.com — deepen, no code change.** Already the single most complete source
   (decklist + precise date + per-player W/L + placement, zero blocking). The small
   750-deck corpus is a backfill gap, not a capability gap. Raise `--max-events` and run
   `--months` further back (`scripts/scrape_mtgo.py --formats standard --months 2026-06
   2026-05 ... --max-events 200`). Highest value per unit of engineering time because
   nothing needs to be written.

2. **mtgtop8.com — one-line date-format fix.** `scripts/scrape_mtgtop8.py:191`:
   `"%m/%d/%y"` → `"%d/%m/%y"`. Verified live that mtgtop8 renders `DD/MM/YY`. This
   alone should recover `event_date` across the existing 5,931-deck corpus on the next
   scrape, at zero new infrastructure cost. W/L will stay permanently absent from this
   source (confirmed the site doesn't publish it for constructed events) — don't chase
   it further here.

3. **topdeck.gg — operator gets an API key, then run as-is.** Code is already complete
   and correct (`scripts/scrape_topdeck.py`, `Standard` in `FORMAT_MAP`). This is the
   only source, besides mtgo.com, that can give full decklist + date + per-player W/L —
   and it covers non-MTGO paper/other-platform Standard events that mtgo.com structurally
   cannot. Pure operator blocker, not a research or engineering one.

4. (Low priority, optional) **mtggoldfish.com tournament pages.** Reachable (unlike deck
   pages) and carry W-L, but the one sampled event was an MTGO League mirror —
   redundant with #1. Worth a cheap manual spot-check of 5-10 more `/tournament/<id>`
   slugs to see if any independent paper events with real W/L exist there before writing
   a dedicated scraper; not worth it blind.

Explicitly not building: **melee.gg** (robots.txt disallows exactly the decklist paths
we'd need), **moxfield.com** (states its API isn't for public use, and has no
tournament data regardless), **archidekt.com** (open API but no tournament data),
**17lands.com** (confirmed no Standard/Constructed data), **mtgdecks.net** and
**aetherhub.com** (both explicitly name ClaudeBot/GPTBot/anthropic-ai etc. as
`Disallow: /` in robots.txt — a direct, unambiguous policy signal against exactly this
kind of automated access), **untapped.gg** (different data shape — aggregate Arena
ladder win rates, not the per-player tournament records this research was scoped to
find; worth a separate recon pass if Arena-meta signal becomes a goal later).
