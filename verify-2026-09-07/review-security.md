Findings resent below, complete and unchanged.

## 1. HIGH — LIKE-wildcard denial of service: one request pins the single-threaded build-api for ~30 s

**Where:** `C:/Users/QuLeR/MTG-deck-builder/services/build-api/resolve.ts:35` (`findDfc`), called per unresolved name at `C:/Users/QuLeR/MTG-deck-builder/services/build-api/resolve.ts:47` via `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:290`.

**Defect:** the double-faced-card fallback interpolates the raw card name into a LIKE pattern (`` `${name} //%` ``). A name containing `%` or `_` becomes a leading-wildcard match, which cannot use the NOCASE name index and runs a full table scan with per-row backtracking. Names are never deduped or wildcard-escaped, and zod checks only length.

**Measured** against `C:/Users/QuLeR/MTG-deck-builder/data/mtg-deck-builder.db`, 35,679 cards:

| pattern | per query |
|---|---|
| `zzzz1 //%` (normal miss) | 0.03 ms |
| `%a%a…` 200 chars, no match | 51 ms |

**Exploit:** POST to the public optimize route with 5 real card names plus 595 entries in `cards[]` each named `%a%a%a…` at 200 characters. Zod accepts 600 lines of 200 characters. Upstream resolves the 5 real names, clears the `resolved.length >= 5` gate, then runs 595 unindexed scans: roughly 30 seconds of blocked event loop. The service is single-threaded and also serves the build, analyze and card-lookup routes, so the whole site's engine stalls. Ten anonymous requests per hour is already five minutes of outage per source address, and finding 2 removes that ceiling.

**Fix:** in `makeCardResolver`, skip the LIKE fallback when the name contains `%` or `_`, or escape them and add `ESCAPE '\'`.

## 2. HIGH — rate limit bypassable if nginx appends rather than replaces X-Forwarded-For

**Where:** `C:/Users/QuLeR/black-grimoire-web/src/app/api/optimize/route.ts:78`.

**Defect:** the bucket key is the first comma-segment of `x-forwarded-for`. With the common `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`, the client's own header value is prepended, so the client chooses its own bucket. I could not verify the live nginx config, since it is in neither repo. Treat this as conditional on that server block.

**Exploit:** send every request with a random `X-Forwarded-For` value. Each lands in a fresh bucket, so the 10-per-hour anonymous cap never applies. Combined with finding 1, one host can hold the engine down indefinitely.

**Fix:** key on the last untrusted hop, or on an `x-real-ip` your own nginx sets, and confirm nginx overwrites the header.

## 3. MEDIUM — upstream exception text proxied verbatim to the browser

**Where:** `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:408-410` returns `{ error: message }` for any non-`OptimizeError`; `C:/Users/QuLeR/black-grimoire-web/src/app/api/optimize/route.ts:102-103` forwards the upstream body and status unchanged.

**Defect:** `message` is whatever the engine threw. better-sqlite3 errors embed SQL text and column names, module and filesystem errors embed absolute paths under the service directory on the VPS. Same class as the earlier incident that leaked a full node_modules path.

**Exploit:** trigger any engine-internal failure, for example a request hitting a code path where a stats table is missing after a deploy, or the native-module ABI break your own deploy notes record, then read the server path and schema straight out of the JSON error in the browser.

**Fix:** in the Next route, replace non-4xx upstream bodies with a fixed message and log the original server-side.

## 4. MEDIUM — the optimize route has no server-side limit of its own

**Where:** `C:/Users/QuLeR/MTG-deck-builder/services/build-api/server.ts:338-349`.

**Defect:** the build route is guarded by a concurrency counter and a collection-build flag. The optimize route has neither, and there is no per-key rate limit upstream. The only limit lives in the Next process, is per-instance and in-memory, resets on every deploy, and does not cover anything else holding the API key.

**Exploit:** any traffic that gets past finding 2 reaches the engine at full rate. Each request costs a resolver pass plus up to 620 further card lookups from `collectAdds` at `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:253-271`.

**Fix:** add a token bucket keyed on the caller before `handleOptimize`, or reuse the busy counter the build route already has.

## 5. LOW — quadratic regexes in the normaliser, sub-second

**Where:** `C:/Users/QuLeR/MTG-deck-builder/src/lib/decklist-normalize.ts:24` and `C:/Users/QuLeR/MTG-deck-builder/src/lib/decklist-normalize.ts:26`, applied per trimmed line.

**Measured** on a single 20 KB whitespace line: the bracket-tag pattern 290 ms, the commander-marker pattern 390 ms. Both are unanchored and `\s*`-prefixed, so they retry at every start index. The 20 KB cap holds the total near 0.7 s per request, and splitting into many lines makes it cheaper rather than worse. The Arena line pattern at `C:/Users/QuLeR/MTG-deck-builder/src/lib/arena-parser.ts:67` and the oracle-text patterns at `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:48` and `:51` measured 0 ms and are not exploitable.

**Fix:** anchor the marker scan, or reject any single line longer than about 300 characters before normalising.

## 6. LOW — rate-limit Map never evicts

**Where:** `C:/Users/QuLeR/black-grimoire-web/src/app/api/optimize/route.ts:42-56`. Expired entries are overwritten only when the same key returns. Under finding 2, spoofed keys accumulate for the process lifetime at roughly 100 bytes each. A slow leak, not a fast kill.

**Fix:** drop entries whose window has passed during the write, or use a bounded LRU.

## 7. LOW — save path returns 500 instead of 401 when accounts are off

**Where:** `C:/Users/QuLeR/black-grimoire-web/src/lib/user.ts:6` calls `auth()` unguarded; `C:/Users/QuLeR/black-grimoire-web/src/app/api/decks/route.ts:44` calls it through `getOrCreateUser`. The optimize route handles this correctly at `C:/Users/QuLeR/black-grimoire-web/src/app/api/optimize/route.ts:77`; the decks route does not. With accounts disabled the middleware is a no-op, per `C:/Users/QuLeR/black-grimoire-web/src/middleware.ts:23`, so `auth()` throws and a framework error surfaces instead of a clean 401. No authorisation bypass: every query is scoped by user id.

**Fix:** return null from `getOrCreateUser` when accounts are disabled.

## 8. LOW — format enum mismatch between the two layers

`OPTIMIZE_FORMAT_KEYS` at `C:/Users/QuLeR/black-grimoire-web/src/components/optimizer/types.ts:3` includes `timeless`, which is absent from `FORMATS` at `C:/Users/QuLeR/MTG-deck-builder/src/lib/constants.ts:41`. The upstream check at `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:282` rejects it with a 400 that enumerates the server's format list. Functional bug plus minor enumeration.

## Checks that came back clean

- **SQL injection.** The only interpolated value on this path is the legality key at `C:/Users/QuLeR/MTG-deck-builder/src/lib/ai-suggest.ts:98`. `getLegalityKey` at `C:/Users/QuLeR/MTG-deck-builder/src/lib/constants.ts:130` returns the format verbatim, so it is injectable in principle, but the format is whitelisted twice first: the zod enum at `C:/Users/QuLeR/black-grimoire-web/src/app/api/optimize/route.ts:22` and the membership check at `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:282` against the frozen constant array. No bypass exists while that check stays ahead of every call. Every other query binds parameters, including the commander stats and meta-rank helpers in `C:/Users/QuLeR/MTG-deck-builder/src/lib/db.ts` at lines 1518 and 1402, where the format chain goes in as placeholders.
- **Prototype pollution.** No recursive merge on the path. The spreads at `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:246`, `:249` and `:406` operate on database rows and an internal extras object, never on parsed user objects.
- **Body limits.** The upstream 1.5 MB cap counts UTF-16 units on a concatenated string, so the real byte ceiling is lower rather than higher. The Next route caps everything smaller through zod first.
- **Cross-site scripting and JSON-LD.** The single `dangerouslySetInnerHTML` at `C:/Users/QuLeR/black-grimoire-web/src/components/json-ld.tsx:8` is fed only page-static objects on the optimizer page. Card names, reasons and unresolved names all render through normal React escaping.
- **Secrets.** The build API key appears only in server route handlers and never under a client-exposed prefix.

## Verdict

One request can take the shared engine offline for about thirty seconds through the unescaped LIKE fallback, and the only thing bounding it is a rate limit that probably trusts a client-controlled header. Fix findings 1 and 2 together, because either alone still leaves a cheap outage. The rest is hardening: error passthrough, a server-side limit on the optimize route, and the accounts-off 500 on the save path.