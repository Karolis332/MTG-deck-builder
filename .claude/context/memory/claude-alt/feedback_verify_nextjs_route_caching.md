---
name: feedback-verify-nextjs-route-caching
description: "Never accept 'the page is cached' from warm-request timing — check the Next build legend (● vs ƒ) and .next/prerender-manifest.json; on 2026-09-18 a scout's wrong claim hid that searchParams made every commander page dynamic"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a596401d-6761-4518-aa45-89812eab6193
  modified: 2026-09-18T19:34:04.690Z
---

On 2026-09-18 the commander-page TTFB scout reported "whole page HTML cached 24 h, 50–100 ms warm" for theblackgrimoire.com `/commanders/[slug]`. It was wrong: the page awaited `searchParams` (`?format=brawl`), which in Next 15/16 without cache components renders the whole route on every request. The first fix (`generateStaticParams` only) built zero pages; the build legend showed `ƒ` and the manifest had no commander routes. Moving the format into the path (`/commanders/[slug]/brawl`) made both routes `●`.

**Why:** warm timing only proves upstream in-memory caches are warm; those die on every pm2 restart and per TTL, so the long tail stays slow while the measurement looks fine.

**How to apply:** before claiming a Next.js route is cached, read `next build` output (`●`/`○` = prerendered, `ƒ` = per request) and count the route's entries in `.next/prerender-manifest.json` (`routes` + `dynamicRoutes`). Grep the page tree for `searchParams`, `cookies()`, `headers()`, `connection()`, `noStore` first. To build an exact commit while another agent has uncommitted work in the tree: `git worktree add <tmp> <sha>` + its own `npm ci` (Turbopack refuses a junctioned `node_modules`). Related: [[feedback-fable-orchestrator-only-routing]], [[project-theblackgrimoire-com-launch]].
