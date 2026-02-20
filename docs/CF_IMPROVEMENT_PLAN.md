# Collaborative Filtering Improvement Plan

## Source: recommender.cards Video Transcript Analysis

**Video creator** built a deck-specific recommendation engine that massively outperforms EDHREC's recommender by focusing on **per-deck similarity** rather than per-commander aggregation. Key insight: "You can't rely solely on per-commander data to figure out what's good for each individual deck."

---

## Current Implementation vs. Video Reference

### What We Have (grimoire-cf-api)
- FastAPI + PostgreSQL + Redis + scikit-learn TruncatedSVD
- Moxfield + Archidekt scrapers (rate-limited, incremental)
- Color identity partitioning (32 possible matrices)
- Staple suppression (linear decay from 0.6 inclusion rate, min weight 0.1)
- Negative mining module (BUILT but NOT INTEGRATED into training)
- Deck hashing + 7-day TTL cache
- Nightly pipeline: scrape -> popularity -> retrain -> cache invalidation

### Gap Analysis

| Aspect | Video Approach | Our Implementation | Gap Severity |
|--------|---------------|-------------------|--------------|
| **Negative Mining** | CRUCIAL — popular cards not in deck = negative examples | Built but NOT wired into training pipeline | **CRITICAL** |
| **Staple Suppression Timing** | Scale down popular cards DURING training | Computed during training, applied POST-HOC at recommendation time | **HIGH** |
| **Matrix Reconstruction** | Full matrix available at all times | Placeholder after DB load (all zeros) — breaks recommendation aggregation | **CRITICAL BUG** |
| **Online/Incremental Learning** | Vowpal Wabbit — incremental updates without full retrain | scikit-learn TruncatedSVD — full retrain every night | MEDIUM |
| **Hold-One-Out Training** | 100 copies per deck, each with 1 card held out | Raw SVD on binary matrix (no hold-out structure) | MEDIUM |
| **Data Scale** | 600K+ decks | ~57K max per scrape run (need to verify total accumulated) | HIGH |
| **Cascade Priority** | CF is THE recommendation engine | CF is first-try in a 5-layer cascade, falls back to commander-level data easily | MEDIUM |
| **Edit History** | Mentioned as future improvement — stronger negatives from deliberate removals | Not implemented | LOW (future) |
| **Insert Order** | Mentioned as future — recommend next card to add | Not implemented | LOW (future) |
| **Combo/Tag Data** | Mentioned as future — surface deep fits for rare cards | We have Commander Spellbook combo data but not integrated into CF | MEDIUM |

---

## Priority 1: Critical Fixes

### 1A. Fix Matrix Reconstruction Bug
**Problem**: After loading models from DB, `model.matrix` is a placeholder (all zeros). During recommendation, `deck_row = model.matrix[idx]` returns empty row, so NO cards are aggregated from similar decks. Recommendations are effectively broken after server restart.

**Fix**: Either:
- (A) Persist the sparse matrix alongside SVD artifacts (larger DB rows but correct)
- (B) Reconstruct matrix from `deck_cards` table on model load
- (C) Change aggregation to use SVD inverse transform instead of raw matrix lookup

**Recommended**: Option (A) — pickle the CSR matrix into model_artifacts. It's sparse so storage is manageable.

**File**: `grimoire-cf-api/cf_engine.py` lines 232-267 (load_models_from_db)

### 1B. Integrate Negative Mining into Training
**Problem**: Model only sees positive examples (card IS in deck). Without negatives, it learns "everything belongs everywhere" — the exact failure mode described in the video.

**How the video does it**: For each deck, take popular cards in the deck's color identity that are NOT in the deck. Label them as "does not belong." This teaches the model to distinguish between relevant and irrelevant cards.

**Implementation**:
1. In `cf_engine.py` `train_partition()`, after building the binary matrix:
2. Call `negative_miner.mine_negatives_for_deck()` for each deck
3. Insert negative entries into the matrix with negative values (e.g., -0.1 to -0.2)
4. The SVD will then learn to separate "actually similar" from "coincidentally co-occurring"

**File**: `grimoire-cf-api/negative_miner.py` (already built, just needs wiring into `cf_engine.py`)

**Key parameters from existing code**:
- `POPULARITY_THRESHOLD = 0.3` (cards in >30% of same-color decks)
- `NEGATIVES_PER_DECK = 30` (top 30 negatives per deck)
- `neg_weight = inclusion_rate * 2.0` scaled by `-0.1` in matrix

---

## Priority 2: High-Impact Improvements

### 2A. Apply Staple Suppression During Training (Not Just Post-Hoc)
**Problem**: Currently, suppression weights are computed during training but only applied at recommendation time. The SVD latent space still over-represents staples because they appear in every deck at full weight (1.0) during matrix construction.

**Video approach**: "Cards that are more popular are simply scaled down during training."

**Fix**: In `train_partition()`, scale matrix entries by suppression weight BEFORE running SVD:
```python
# After building binary matrix, before SVD
for card_name, col_idx in card_to_idx.items():
    weight = suppression_weights.get(card_name, 1.0)
    if weight < 1.0:
        matrix[:, col_idx] *= weight  # Scale down staple columns
```

This changes the latent space itself — Sol Ring won't dominate the first principal components.

**File**: `grimoire-cf-api/cf_engine.py` lines 113-165 (train_partition)

### 2B. Scale Data Collection to 600K+ Decks
**Problem**: Video has 600K+ decks. Our scrapers pull ~57K per run max (500 pages each).

**Fix**:
1. Increase `max_scrape_pages` from 500 to 2000+
2. Run scrapers more frequently (twice daily instead of nightly)
3. Track total accumulated deck count — we may already have substantial data if the pipeline has been running
4. Consider adding more sources (e.g., TappedOut, MTGGoldfish commander decks)

**Verification**: Run `SELECT COUNT(*) FROM decks` to check current total.

### 2C. Promote CF to Primary Recommendation Source
**Problem**: Current cascade: CF -> Ollama -> OpenAI -> Synergy -> Rules. CF is just one option, and the system falls back to commander-level data too easily.

**Fix**: Restructure the cascade:
1. **Always run CF** (if enough data exists for the color identity)
2. **Always run synergy/rules** (structural analysis)
3. **Merge results**: CF provides "what cards belong" + Rules provides "what's structurally missing"
4. **LLM layer**: Only for explanation/reasoning, not for card selection
5. **Commander-level data**: Only as cold-start fallback when CF has insufficient data

This mirrors the video's philosophy: CF handles deck-specific recommendations, structural analysis handles format requirements.

---

## Priority 3: Medium-Term Enhancements

### 3A. Integrate Combo Data into CF
**Problem**: We have Commander Spellbook data (5000+ combos) but it's not used in CF scoring.

**Enhancement**: After CF generates recommendations, boost scores for cards that complete or contribute to combos already partially present in the deck. This surfaces "deep fits" — cards that don't have high co-occurrence but unlock powerful synergies.

**Implementation**:
1. After CF recommendation, check each recommended card against `spellbook_combo_cards`
2. If the card completes a combo where 2+ other pieces are already in the deck: boost score by 1.5x
3. If the card is part of a combo with 1 piece in the deck: boost score by 1.2x

### 3B. Explore Vowpal Wabbit for Online Learning
**Problem**: Full SVD retraining is expensive as data grows. At 600K decks, nightly retrain could become slow.

**Video approach**: Vowpal Wabbit supports online learning — updates model incrementally without full retrain.

**Options**:
- (A) Replace scikit-learn SVD with VW's matrix factorization
- (B) Keep SVD but only retrain weekly, use VW for daily incremental updates
- (C) Use implicit library (Python) which has efficient ALS for incremental updates

**Recommended**: Option (C) — `implicit` library has `AlternatingLeastSquares` which supports partial_fit and is widely used for recommendation systems. Less exotic than VW, better Python ecosystem support.

### 3C. Hold-One-Out Evaluation Framework
**Problem**: No way to measure recommendation quality internally.

**Implementation**:
1. For each test deck, hold out 10 random cards
2. Run recommendation on the 90-card version
3. Measure: what % of held-out cards appear in top-30 recommendations?
4. This gives a concrete accuracy metric (Recall@30)
5. Use this to tune hyperparameters (n_components, suppression threshold, negative weight)

**Target**: Recall@30 > 20% would be strong (video doesn't share metrics but implies high relevance).

---

## Priority 4: Future Enhancements (From Video)

### 4A. Edit History as Stronger Negatives
If we could track which cards users deliberately remove from decks (not just "not present"), those become much stronger negative signals than "popular card that's absent."

**Source**: Moxfield/Archidekt APIs may expose edit history or changelog endpoints.

### 4B. Insert Order for Sequential Recommendations
Track the order in which cards are added to decks. This enables "what should I add next?" recommendations from partial decklists — useful during initial deck construction.

**Source**: Would require Moxfield/Archidekt to expose creation timestamps per card addition, or scrape the same deck multiple times to diff.

### 4C. Deck/Card Tags for Deep Fits
Use tag systems (tribe, mechanic, theme) to surface cards that don't have high co-occurrence but fit the deck's strategic tags.

**Source**: We already have deck theme detection (`detectDeckThemes()` in `deck-builder-ai.ts`). Could feed detected themes into CF as additional features alongside binary card presence.

---

## Implementation Order

```
Phase 1 (Critical) — Fix what's broken
  1. Fix matrix reconstruction bug (1A)
  2. Wire negative mining into training (1B)

Phase 2 (High Impact) — Match video quality
  3. Apply staple suppression during training (2A)
  4. Scale data collection (2B)
  5. Restructure cascade to CF-first (2C)

Phase 3 (Enhancement) — Go beyond video
  6. Combo data integration (3A)
  7. Hold-one-out evaluation framework (3C)
  8. Explore online learning (3B)

Phase 4 (Future) — Next-gen features
  9. Edit history negatives (4A)
  10. Insert order recommendations (4B)
  11. Tag-enhanced CF (4C)
```

---

## Additional Video Insights (2026-02-20)

### Lift Metric
The core scoring formula from recommender.cards:
```
lift = P(card | commander) / P(card | color_identity)
```
- Ratio of card popularity in a specific commander's decks vs. all decks in that color identity
- Higher lift = more commander-specific (e.g., Sanguine Bond in lifegain commanders)
- Negative/low lift = generic staple or anti-synergistic card
- This replaces raw inclusion rate as the primary relevance signal

### Hipster Meter / Deck Uniqueness Stats
Per-deck metrics that quantify how "spicy" a deck is:
- **Commander Synergy**: Average lift across all cards in the deck (range: -100 to +100%)
- **Synergy Range**: Spread between highest and lowest lift cards — wider = more polarized choices
- **Commander Staples %**: Fraction of deck above a lift threshold (highly synergistic cards)
- **Commander Anti-Staples %**: Fraction of deck below threshold (pet cards, off-meta picks)
- **Bucket Classification**: Planned feature to classify decks into archetypes based on these stats

**Integration for Black Grimoire**: Add lift calculation to `aggregate_community_meta.py`, expose uniqueness stats in deck editor sidebar (e.g., "Your deck is 72% synergistic, 15% off-meta").

### Candidate Generation (Pre-Filter)
Before running the CF model, narrow the candidate pool:
1. **Filter out rule-breakers**: Cards that violate companion rules, color identity, format legality
2. **User-driven filtering**: Let users pass a Scryfall search query to narrow candidates (e.g., "type:creature cmc<=3" for aggro slots)
3. **Rank filtered results by CF score**: This turns generic Scryfall search into personalized, deck-aware search

**Integration**: CF API accepts optional `scryfall_query` parameter. Black Grimoire's card search uses CF scores as a sort option when building a specific deck.

### Cutting Cards is NOT "Lowest Score"
Critical insight for the deck editor's "suggest cuts" feature:
- **Low-scored cards are NOT cut candidates** — they're pet cards, silver bullets, or "vegetables" the player deliberately included
- **Redundant cards are the real cuts** — HIGH-scored but duplicative (e.g., 5 similar ramp spells when 3 would suffice)
- **Detection approach**: Cluster cards by function (ramp, removal, draw, etc.), flag slots where a category is over-represented
- **Quote**: "You don't want to cut anti-synergistic cards. You put those in for a reason."

**Integration for Black Grimoire**: The AI suggest cuts feature in `claude-suggest.ts` should detect redundancy clusters rather than just recommending lowest-scored cards. Group cards by detected function (from oracle text parsing in `commander-synergy.ts`), then within over-represented groups, suggest cutting the lowest-lift card.

---

## Key Quotes from Video

> "Despite how objectively different these two decks are, the cards that EDHREC spits out are so similar..."
— The core problem: commander-level recommendations ignore deck-specific strategy.

> "You not only need to say what cards are in each deck, but you also have to say which cards are explicitly not in each deck."
— Negative mining is non-optional. Without it, model says everything belongs everywhere.

> "Cards that are more popular are simply scaled down during training."
— Staple suppression must happen in the training data, not just post-hoc filtering.

> "Once your game plan is fully formed, they need to back off and consider your specific list."
— CF should be primary for established decks; commander-level data is for cold start only.

> "With access to edit history, you can draw stronger negatives, which would allow you to recommend popular cards more confidently instead of them being globally suppressed."
— Future: edit history enables surgical suppression instead of blanket suppression.
