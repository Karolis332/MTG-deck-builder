---
name: reference-gsc-and-reddit-via-playwright
description: The Playwright MCP browser is already logged into Search Console (LT UI) and can read reddit.com; curl/agents cannot reach reddit — how to drive both
metadata:
  node_type: memory
  type: reference
  originSessionId: 0d657e2b-211d-4f50-9cfe-5f7c03b760dc
  modified: 2026-09-23T22:18:50.098Z
---

The Playwright MCP browser profile is logged into Google Search Console for `sc-domain:theblackgrimoire.com` (Lithuanian UI).
- Indexing report: `https://search.google.com/search-console/index?resource_id=sc-domain:theblackgrimoire.com`; click a reason row → drilldown; read URLs from `table tr` innerText.
- Request indexing: the `/inspect?id=<url>` deep link 404s. Fill the combobox named "Patikrinkite visus …" with the URL, press Enter, wait for the button "PATEIKTI INDEKSAVIMO UŽKLAUSĄ", click, poll the body for "Indeksavimo užklausa pateikta" (~1–2 min each). ~10/day quota. Run batches of 3–6 in `browser_run_code_unsafe` (goes to background after 120 s).
- Reddit: `reddit.com` and Redlib mirrors are network-blocked for curl and research agents; `old.reddit.com/*.json` redirects to login. The browser can load `https://www.reddit.com/r/<sub>/`; rules are in `shreddit-subreddit-rules-widget details` (use `textContent`, not `innerText`, for collapsed descriptions).

Related: [[project-theblackgrimoire-com-launch]].
