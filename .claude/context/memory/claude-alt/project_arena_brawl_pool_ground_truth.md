---
name: cabbage-merchant-paper-deck-format-trap
description: "The operator's Cabbage Merchant deck is PAPER Commander (registered in decks/paper 2026-09-18); ask the format before building; card-DB brawl legality flags were a red herring; typed pile resolver + paper pool/validator live in verify-2026-09-18/"
metadata: 
  node_type: memory
  type: project
  originSessionId: 65bbc28c-aa4e-4ff6-9e5f-6799e5dd0bc3
  modified: 2026-09-18T07:49:14.321Z
---

The Cabbage Merchant deck (registered 2026-09-18 as `decks/paper/decks/the-cabbage-merchant.txt`,
DB deck built_by='paper') is a PAPER Commander deck played in a 4-player pod. A whole Arena Brawl
build was produced first because `docs/CABBAGE_MERCHANT_BRAWL.md` (an old Historic Brawl draft) and
the commander's Arena ownership suggested Arena; the operator corrected it only after delivery.

**Why:** the `cards.legalities.brawl = not_legal` flags on 13 of the typed cards were not stale data
but the true signal that those are paper-only cards (CLB/LCC/Spider-Man/TLA) — I explained them away.
The operator types deck and spare-pile names from memory, with typos, in many small batches.

**How to apply:** when a deck list arrives by chat, ask "paper or Arena?" before any design work;
if a card is not on Arena, the deck is paper. Paper flow: resolve names with
`verify-2026-09-18/resolve-side.py`, register deck + pile via `decks/paper/` + `npx tsx
scripts/paper-sync.ts`, pool = deck + pile + `open-cards.txt` via `verify-2026-09-18/build-pool-paper.cjs`,
validate with `check-deck-paper.cjs --ci <CI>`. Never brief designers before the ownership sources
and the format are settled — two designer runs were wasted on the wrong premise. See
[[never-prefilter-agent-input]].
