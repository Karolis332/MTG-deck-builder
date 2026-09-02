# Deck-building research — methodologies and technical tricks (2026-09-02)

Exa research sweep (8 threads, 27 sources) mapped to the engine's open problems: curveScore anti-signal, partner-pair blind spot, fixed land floor, sparse bandit feedback, no bracket/consistency estimate, Arena Brawl data gap. Engine changes from this list are separate harness-gated rounds (fitness invariant: standard 965–968 / collection 366, hardFails 0).


### Top 12 findings (ranked by expected impact)

1. **EDHREC's synergy formula has been replaced with "lift"** (Dec 2025): `lift(A,B) = P(A,B) / (P(A)×P(B))`, restricted to decks eligible to hold both cards, log-scaled. Agrees with old subtraction-formula direction >95% of the time but fixes false-positive synergy on generically-good staples. Our `commander_card_stats.synergy_score` currently replicates the OLD formula (`inclusion% in commander decks − inclusion% in same-color-identity decks`). Maps to: synergy engine, ISS. Effort: M. https://edhrec.com/articles/from-synergy-to-lift-the-math-behind-edhrecs-new-era
2. **Karsten mana-base formula, 2022 Commander update**: `lands = 31.42 + 3.13×avgMV − 0.28×(cheap ramp+draw)` for a 99-card deck (bakes in Commander's free mulligan + turn-1 draw). MDFCs count as partial lands (0.38 non-mythic, 0.74 mythic). Directly replaces our fixed land-count floor with a curve-derived number. Maps to: land count / mana-base construction (open problem #3). Effort: S. https://tcgplayer.com/content/article/how-many-lands-do-you-need-in-your-deck-an-updated-analysis
3. **17lands "Manabase Evaluator"**: Monte Carlo-simulates shuffles, counts ALL mana sources (creatures/artifacts/fetches, not just lands), reports per-turn castability %. Better than a static land-count table when we already have the full decklist. Maps to: mana-base scoring, could replace the fixed floor entirely. Effort: M. https://blog.17lands.com/posts/manabase-evaluator
4. **WotC Commander Brackets (official, current Feb 2026)**: Bracket 1-5 driven mainly by count of cards on the "Game Changers" list (~59 cards) plus rules on 2-card infinite combos, mass land denial, chained extra turns. `cards.game_changer` column already exists in our schema (migration 37) — a lookup-table bracket estimator is nearly free. Maps to: power-level/bracket estimation (open problem #5). Effort: S. https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025
5. **modsimworld.org 2025 paper**: tested 5 power-rating methods including WotC's bracket system and LLM-driven scoring (including an agentic T·R·A·C·K score). WotC's human-authored bracket method was most accurate against a known-power test deck; every LLM method over/underestimated power. Evidence AGAINST using an LLM for power calibration — use the rule-based bracket lookup instead. Maps to: power-level scoring. https://modsimworld.org/papers/2025/MODSIM_2025_paper_57.pdf
6. **EDH-LLM study** (closest published analog to our system): Word2Vec embeddings + candidate pool + GPT-3.5 re-ranking, evaluated against an EDHREC-popularity baseline. Result: the pure EDHREC-popularity/co-occurrence baseline beat the LLM-hybrid on BOTH power and synergy metrics. Strong evidence for weighting CF/ISS over LLM card choice; LLM's best role is explanation/re-ranking, not selection. Maps to: architecture validation for our CF-primary design. https://evelynyee.github.io/edh-llm/
7. **Partner-pair synergy fix**: no tool (EDHREC/Moxfield/Archidekt) publishes a real 2-commander synergy formula — confirmed industry-wide gap, not something competitors solve either. Concrete fix: treat a partner pair as one "virtual commander" node in ISS — union both commanders' trigger categories and resource-graph edges instead of scoring each half alone (explains why Thrasios/Tymna currently scores ISS≈0 — each half is individually weak). Maps to: open problem #2 (partner blind spot). Effort: M.
8. **Open-source goldfish/hand simulators are directly forkable**, not just theory: `spullara/mtg-reanimator` (Rust, reports win-turn distribution histogram), `dylanlott/mindcrank` (found empirically that 2→4 redundant combo pieces cuts draws-to-win ~18%), `JohannesKuehnel/jGoldfish` (Java, reusable hypergeometric `probabilityToDrawCardPerTurn` helper). Maps to: missing goldfish-simulation / "turn X win probability" (open problem #5). Effort: M for a basic port — hypergeometric draw math is one formula, no need to build from scratch.
9. **Topdeck.gg + cedhtop16.com APIs**: free, GET-based, tournament-level EDH/cEDH data with per-commander/per-pair W/L and win rate. cedhtop16 has a dedicated commander-pair-count endpoint — better fit for partner-pair frequency than raw Topdeck. Maps to: cEDH power anchor, partner-pair calibration data. Effort: S-M. https://topdeck.gg/api/docs, https://github.com/JasonQiu21/cedhtop16
10. **17lands curve-vs-winrate finding**: 16-land decks beat 17-land decks by ~1.2-1.9% win rate (n=4M games) once curve/quality controlled — the effect is explained by a numeric "mana efficiency" (mana spent per turn) score, not raw land count. Blueprint for fixing curveScore: define expected-mana-spent-per-turn from curve shape, score real decks against it, rather than a fixed CMC-bucket template. Limited-specific methodology, but portable. Maps to: curveScore anti-signal (open problem #1). Effort: M. https://jackjosephwright.github.io
11. **Empirical per-archetype curves from our own corpus**: state-of-the-format.com pattern (per-archetype pip/curve/creature-count histograms from trophy decks) is directly reproducible against our 3.9M-deck community corpus — bucket by archetype/commander-CMC, build an average curve histogram, score deck curves against it instead of the fixed template. Directly fixes the random-pile-outscores-real-decks bug since real decks will match the learned distribution and random piles won't. Maps to: curveScore anti-signal. Effort: M.
12. **Contextual bandit sparse/delayed-feedback techniques**: Self-Normalized IPS (SNIPS) recommended specifically for sparse/binary rewards (matches our win/loss signal) over raw IPS which has heavy-tailed variance blowup with sparse events. CBDF (Counterfactual Bandit with Delayed Feedback) matches our exact problem shape (recommend card → outcome arrives end-of-game). Useful for offline-evaluating VW bandit changes without live A/B traffic. Maps to: sparse bandit feedback loop (open problem #4). Effort: L. https://arxiv.org/abs/2509.00648 (embedding-based MIPS, relevant since our action space is ~35K cards)

### Quick wins (≤1 day each)
- Swap the fixed Commander land-count floor for Karsten's `31.42 + 3.13×avgMV − 0.28×(ramp+draw)` formula (finding #2).
- Build a bracket estimator from the existing `cards.game_changer` column + WotC's public rules text (finding #4) — mostly a lookup table + a few qualitative rule checks (combo pieces, mass land denial, extra-turn chains).
- Pull cedhtop16.com's commander-pair endpoint to get real partner-pair popularity/frequency data for calibrating the partner fix (finding #9).
- Fork `JohannesKuehnel/jGoldfish`'s hypergeometric per-turn draw-probability helper as a starting point for a goldfish consistency score (finding #8).
- Re-derive `commander_card_stats.synergy_score` as lift instead of the subtraction formula — it's a 1-line formula change once co-occurrence counts exist (finding #1).

### Data sources worth integrating

| Source | Gives | Access | Relevance |
|---|---|---|---|
| Topdeck.gg API | Tournament EDH/cEDH standings, decklists, W/L | Free REST API | cEDH power anchor |
| cedhtop16.com API | Commander + pair-level W/L, dedicated pair-count endpoint | Free (GitHub-documented) | Partner-pair synergy calibration |
| WotC Game Changers list | Official power-level signal | Public list, already in our schema | Bracket estimator |
| Untapped.gg Historic Brawl tier list | Statistically-tiered commander win rates, live-updated | Public page | Arena Brawl meta (open problem #6) |
| AetherHub Historic Brawl metagame | Per-commander win rate + match count | Public page, small sample sizes | Arena Brawl meta — weight by match count, self-selection bias in the extension userbase |
| 17lands Manabase Evaluator / blog | Monte Carlo manabase simulation methodology | Public writeups, no raw data feed | Mana-base scoring upgrade path (Limited-specific methodology, portable) |

### Notes and caveats
- No Arena Brawl "commander weight tier" matchmaking system exists — Arena Brawl matchmaking is standard MMR, unlike paper Commander's bracket system. This is a genuine data gap, not something we're missing that exists elsewhere.
- "Quadrant theory" for curve scoring is qualitative strategy heuristic in every source found — no numeric weights exist publicly; treat as bucketing guidance only, not a scoring formula.
- No rigorous published "complete-the-deck" set-completion algorithm exists; the one hobbyist writeup found reports plain NMF/matrix-factorization underperforming a simple CF+curated-synergy hybrid — validates our current hybrid approach over a pure-ML set-completion model.
- UrzaGPT (LoRA-tuned LLM for draft picks) reaches 66.2% pick accuracy after tuning vs. 43% zero-shot GPT-4o — further evidence that a domain-tuned small model beats a general LLM for card-selection tasks, consistent with finding #6.

### Full source list
- https://tcgplayer.com/content/article/how-many-lands-do-you-need-in-your-deck-an-updated-analysis
- https://tcgplayer.com (Karsten "How Many Sources... A 2022 Update")
- https://github.com/frankkarsten/MTG-Math
- https://canadianhighlander.ca/2023/07/17/how-to-build-a-manabase-for-singleton-formats
- https://blog.17lands.com/posts/manabase-evaluator
- https://jackjosephwright.github.io
- https://state-of-the-format.com
- https://edhrec.com/faq
- https://edhrec.com/articles/from-synergy-to-lift-the-math-behind-edhrecs-new-era
- https://arxiv.org/abs/2407.05879 (Learning With Generalised Card Representations for Magic, 2024)
- Ramapo College MS thesis (EDH ALS recommender, ramapo.edu/dmc)
- https://proceedings.mlr.press/v70/wang17a (SWITCH off-policy estimator)
- https://arxiv.org/abs/2509.00648 (embedding-based MIPS for large action spaces)
- CBDF: Counterfactual Bandit with Delayed Feedback (ACM 2021)
- https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025
- https://magic.wizards.com/en/news/announcements/introducing-commander-brackets-beta
- https://topdeck.gg/api/docs
- https://github.com/JasonQiu21/cedhtop16/blob/main/server/api_docs.md
- github.com/spullara/mtg-reanimator, github.com/dylanlott/mindcrank, github.com/Cadiac/goldfisher, github.com/JohannesKuehnel/jGoldfish
- https://edhrecstatic.com/articles/top-10-partner-commanders
- https://www.youtube.com/watch?v=8kxWAsjJ_No (EDHRECast synergy formula explainer)
- https://mtga.untapped.gg/constructed/historic-brawl/tier-list
- https://aetherhub.com/Metagame/Historic-Brawl/
- https://arxiv.org/abs/2508.08382 (UrzaGPT)
- https://evelynyee.github.io/edh-llm/
- https://modsimworld.org/papers/2025/MODSIM_2025_paper_57.pdf
