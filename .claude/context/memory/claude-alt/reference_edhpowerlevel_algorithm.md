---
name: reference-edhpowerlevel-algorithm
description: "EDHPowerLevel.com power-level algorithm (price + EDHREC-rank impact, efficiency, power curve) extracted from its front-end bundle on 2026-09-09; the operator wants it in the app as an indicator with credit to the creator"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a6cf997f-c648-4ed8-9cce-6aa53cc1c250
  modified: 2026-09-09T06:41:27.271Z
---

EDHPowerLevel.com (https://edhpowerlevel.com/, © EDHPowerLevel, ads via Mediavine) computes its deck
power level entirely client-side. Bundle copies: `MTG-deck-builder/verify-2026-09-09/edhpowerlevel-bundle.js`
(main) and `edhpowerlevel-hxdec.js` (list decoder). Card data comes from a Firebase function
`GET https://getcards-4zjvieuafa-uc.a.run.app` with headers `card-list` (names joined by `~`, URL-encoded)
and `combo-list` (JSON `{main:[{card,quantity}],commanders:[...]}`), returning `{data:[{name, flavor_name,
edhrec_rank, price, cmc, colors, type_line, mana_cost, produced_mana, layout, legal, reserved, gamechanger, img}], combo}`.

Algorithm (defaults in `factors`): piecewise-linear curve `de(value, stops[11], weight)` → 0..10×weight.
priceRating = de(lowest USD price, [0,.5,1.5,3.5,6,10,15,25,40,65,100], 1.25); popRating = de(27000 − edhrec_rank,
[0,8500,13600,17100,19800,21900,23700,25300,26200,26700,27000], 0.75); impact = (priceRating+popRating)×qty;
lands and modal DFCs: impact×0.6 and cmc 0; basics impact 2×qty; reserved-list price×0.2; per-card overrides `Ba`
(fetches produce all colours, commanderImpact×3 for e.g. Vivi/Korvold/Chulane/Yuriko). avgCost = Σcmc/nonlands
(cmcFloor 1.75, cmcCeiling 6); Tipping Point = mana needed to reach 65 % of nonland impact; Efficiency from
avgCost + tipping (efficiencyLimits [.65,1.1]); Score = impact × efficiency; Power = de(score, powerCurve
[0,250,320,350,380,420,470,560,760,890,1000]); bracket via bracketCurve [0,4.7,6.7,7.7,9.25,10].
Lists: massLandDenial, MLDWhitelist, extraTurns. The exact efficiency/tipping code lives in the render component
(search `res-efficiency`, `cmcFloor` second occurrence).

**How to apply:** the operator wants this as an in-app indicator "always giving credits to the creator". The port exists and is validated (2026-09-09, commit 7c2690f):
`src/lib/power-level-edhpl.ts` (pure, 14 tests), `scripts/power-level.ts` (score any ManaBox list), `scripts/power-level-improve.ts`
(greedy owned-card iterations), `GET /api/decks/[id]/power-level` + `PowerLevelTile` in the Live Rail with a permanent credit link.
Against the live site: efficiency and tipping point exact, power level within 0.02 (price snapshot lag). Missing: Reserved List
flag, the 2-card combo bracket floor (site uses commanderspellbook). The metric rewards price+popularity, so greedy
"improvements" push off-theme expensive cards (Terror of the Peaks into Tazri) — show it as a table-talk indicator, never
as the edit source.
Our `cards` table has `price_usd` per printing (use MIN over printings) and `edhrec_rank` (32.9K of 38.4K rows),
refreshed 2026-09-08; the site's live prices will differ slightly. Related: [[project-theblackgrimoire-com-launch]].
