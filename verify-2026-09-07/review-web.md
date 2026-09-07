Resending the complete findings.

## Findings

**HIGH — `src/components/optimizer/types.ts:10,35` — `timeless` is not a format the backend accepts, so the Timeless button always fails.**
Backend `OPTIMIZE_FORMATS` is `FORMATS.filter(f => f !== '1v1' && f !== 'vintage')` in `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:41`, and `FORMATS` (`C:/Users/QuLeR/MTG-deck-builder/src/lib/constants.ts:41-55`) has no `timeless` entry. A user picks Timeless, submits, and `optimize.ts:283` throws a 400 whose message the proxy forwards verbatim: `format must be one of: standard, pioneer, modern, legacy, commander, standardbrawl, brawl, competitivebrawl, pauper, historic, alchemy, explorer`. That is both a dead button and an internal key list shown to visitors. The same false claim is published in `src/app/optimizer/page.tsx:17`, `src/app/faq/page.tsx:82`, `src/lib/site-facts.ts:22`, `public/llms.txt:31` and `public/llms-full.txt:47`.
Fix: drop `timeless` from `OPTIMIZE_FORMAT_KEYS`/`OPTIMIZE_FORMATS` and from the five copy locations, or add it to `FORMATS` upstream first.

**HIGH — `src/components/optimizer/optimizer-client.tsx:55` — the auto-filled commander name persists across decks and silently mis-analyses the next one.**
After a successful commander run, `setCommanderName(parsed.commander)` populates the picker. The user then pastes a different deck; `submit` at line 44 sends the stale name, and `splitBoards` in `optimize.ts:182-187` prefers an explicit `commanderName` over the pasted `Commander` line. Optimize a Krenko list, then paste an Atraxa list: the backend analyses Atraxa's 99 against mono-red Krenko, and `findLegalityIssues` marks essentially every card `off_color`, producing hard cuts for the whole deck with no indication anything is wrong.
Fix: clear `commanderName` whenever `text` changes, or only auto-fill when the picker is still empty at submit time rather than after the response.

**HIGH — `src/app/api/optimize/route.ts:103` — upstream 5xx bodies are forwarded to the browser unfiltered.**
`NextResponse.json(data, { status: upstream.status })` passes whatever the build service returned. `handleOptimize` in `optimize.ts:408` returns `{ error: error.message }` for any unhandled throw, so a `SqliteError: no such table: commander_card_stats` or a raw stack message reaches the user. The project rule is explicit that error messages must not leak upstream internals.
Fix: forward the body only for 4xx statuses you generate deliberately, and replace any 5xx with a fixed user-facing string.

**HIGH — `src/components/optimizer/optimizer-client.tsx:53,90` — the upstream response is cast, never validated, and a shape drift crashes the page.**
`data as OptimizeResult` and `result.analysis as unknown as DeckAnalysis` are unchecked casts at a trust boundary. `OptimizerResult` then calls `stats.colors.map`, `health.map`, `legality.length`, `unresolved.length` at lines 64-136 with no guards. Any 200 response missing a field, for example an intermediary returning JSON that is not the optimize payload, throws a TypeError during render; there is no error boundary on `/optimizer`, so the user gets a blank page instead of the error text.
Fix: define a zod schema for `OptimizeResult` and `safeParse` the response in `submit`, surfacing failures through the existing `error` state.

**MEDIUM — `src/app/api/optimize/route.ts:25` — a collection over 10,000 cards is rejected with a raw zod message instead of being truncated.**
`z.array(ownedCardSchema).max(10_000)` fails the whole request, and line 73 renders `parsed.error.issues[0].message`, so the user sees zod v4 wording such as `Too big: expected array to have <=10000 items`. The backend's own `MAX_OWNED` handling at `optimize.ts:135` slices rather than rejecting, so the strict web bound is stricter than the service it fronts. The same line makes every other validation failure user-hostile (`Invalid input`, `Too small: ...`).
Fix: `.slice(0, 10_000)` the array in a `transform` and map zod issues to friendly copy before returning.

**MEDIUM — `src/app/api/optimize/route.ts:78` — the rate-limit key trusts a client-supplied header.**
`request.headers.get('x-forwarded-for')?.split(',')[0]` takes the leftmost value. If the fronting nginx uses the usual `proxy_add_x_forwarded_for`, the client's own header is preserved in that position, so any caller sets an arbitrary value per request and gets unlimited free optimizer runs against the paid upstream. I could not verify the nginx config from this repo, so this is conditional on that server block.
Fix: read the last hop nginx appended, or have nginx set `X-Forwarded-For $remote_addr` and keep taking the first entry.

**MEDIUM — `src/app/api/optimize/route.ts:42` — the in-process rate-limit Map never evicts.**
Entries are only replaced when the same key returns after its window; a key seen once is retained for the process lifetime. Under scanner traffic with rotating source addresses the Map grows without bound in a long-lived PM2 process. `/api/analyze` has the identical defect, so this is a copied pattern rather than a new one.
Fix: sweep expired entries on write, for example delete keys with `resetAt <= now` every N insertions.

**MEDIUM — `src/components/optimizer/swap-list.tsx:122-126` — the copy button fails silently with an unhandled rejection.**
`copy` awaits `navigator.clipboard.writeText` with no try/catch and no error state. On any non-secure context, in a denied-permission browser, or when the document is not focused, this rejects, `setCopied(true)` never runs, the button does nothing and nothing is logged for the user. `src/components/builder/deck-result.tsx:98,107` has the same gap, so the pattern was copied.
Fix: wrap in try/catch and surface a "Copy failed, select the text manually" message.

**MEDIUM — `src/components/optimizer/swap-list.tsx:151,244` — after one save the button is permanently disabled even though the list keeps changing.**
`saveState` is set to `'saved'` and never reset. The user saves, then unticks two swaps to produce a different 100-card list, and the Save button stays disabled reading "Saved to My Decks" with no way to save the revision.
Fix: reset `saveState` to `'idle'` in the `toggle` handler.

**MEDIUM — `src/components/optimizer/optimizer-client.tsx:85` — the remount key can collide, leaving new swaps unticked by default.**
The key is `${format}-${commander}-${elapsedMs}`. `elapsedMs` is whole milliseconds on an endpoint the backend header describes as sub-second with no build step, so two consecutive runs on the same commander and format frequently produce the same value. `SwapList` then keeps its previous `cuts`/`adds` Sets from the initializers at lines 102-105, and every newly suggested cut and add renders unchecked while the counters in the card titles disagree with the visible rows.
Fix: key on an incrementing run counter rather than a response field.

**MEDIUM — `src/components/optimizer/deck-input.tsx:86-100` — the format picker has no accessible selected state or grouping.**
Thirteen `<Button>` elements convey selection only through the `variant` prop, so no `aria-pressed`, `role="radio"` or `aria-checked` is emitted. A screen reader user hears thirteen identical buttons and cannot tell which format is active. The `<Label>` at line 86 has no `htmlFor` and no fieldset, so it is not associated with anything.
Fix: wrap in a `<fieldset>` with a `<legend>` and add `aria-pressed={format === f.key}` to each button.

**MEDIUM — `src/components/optimizer/optimizer-result.tsx:34` — the land advice contradicts the score.**
`landDelta` uses `landTarget.recommended - landTarget.current`, ignoring `landTarget.effective`, while the backend score at `optimize.ts:361` uses `effective - recommended`. A deck with five modal double-faced land backs is scored as on-target but the Lands tile tells the user to add two lands.
Fix: compute the delta from `landTarget.effective`, which is already in the payload and already printed on line 79.

**LOW — `src/components/optimizer/swap-list.tsx:50` — the `A-` strip can push a card over the Arena copy limit and rewrites a real card name.**
Arena treats a rebalanced card and its paper printing as the same name for the four-copy check. A list holding both `A-Lightning Helix` and `Lightning Helix` collapses to two lines with the same name after the strip, and Arena rejects the import. The strip also silently converts an Alchemy-only rebalanced card into its paper version, which is a different card in that format.
Fix: merge quantities by name after stripping, and skip the strip for Alchemy and Historic Brawl.

**LOW — `C:/Users/QuLeR/MTG-deck-builder/services/build-api/optimize.ts:233` — adds ignore the sideboard, so a suggestion can exceed four copies.**
`inDeck` is built only from `shape.main`, and `addQty` is 2 for 60-card formats. A card already at three copies in the sideboard gets two more added to the main deck, and the exported list has five, which Arena refuses.
Fix: seed `inDeck` from `shape.sideboard` as well, or subtract sideboard copies from `addQty`.

**LOW — `src/components/optimizer/optimizer-client.tsx:83` — the live region is mounted at the same moment its content appears.**
`aria-live="polite"` is on a div that only exists once `result` is set, so most screen readers do not announce it; a live region must be in the DOM before it changes.
Fix: render the wrapper unconditionally and put the conditional inside it.

**LOW — `src/app/optimizer/page.tsx:28` — the HowTo JSON-LD emits a non-schema property.**
`position` is a `ListItem` property, not a `HowToStep` one. Harmless for parsers but it is noise in a structured-data test, and Google retired HowTo rich results in 2023 so the block earns nothing.
Fix: drop `position`, or drop the HowTo block and keep the breadcrumb and WebPage entries.

Two things I checked and found correct: the FAQ `toPlainText` helper at `src/app/faq/page.tsx:100-107` recurses through the new `<Link>` child properly and yields clean answer text for the FAQPage JSON-LD, and `siteFacts.landFormula60` matches `FORMULA_60.text` in `C:/Users/QuLeR/MTG-deck-builder/src/lib/land-math.ts:23-26` exactly. Both `npx tsc --noEmit` and `npm run lint` pass with no output in `C:/Users/QuLeR/black-grimoire-web`.

## Verdict

Block. Two defects are user-visible on the happy path: the Timeless format button cannot succeed and leaks the backend's format key list, and a stale commander name silently analyses the wrong deck and cuts almost all of it.
The proxy also forwards upstream 5xx bodies verbatim and the client casts an unvalidated response into a render that has no error boundary, both against the stated project rules.
Type checking and linting pass, the file and function size limits hold, and there is no `any` or `console.log` in the new code.