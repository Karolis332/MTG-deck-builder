# CF Engine Technical Details (2026-02-24)

## Bug Fixes Applied

### Bug #1: Matrix Not Persisted (root cause of empty results)
- `save_models()` now includes `"matrix": model.matrix` in pickled artifact
- `load_models_from_db()` restores matrix from artifact, falls back to empty if not present
- CSR matrices are pickle-safe, adds ~50-100KB per partition to artifact size

### Bug #2: Negative Mining Wired
- `mine_negatives_for_deck()` + `build_negative_matrix_entries()` now called in `train_partition()`
- Runs per-deck after binary matrix built, before SVD
- Queries `card_popularity` table (populated by Step 3 of nightly pipeline)
- ~30 negatives per deck, small weights: `-inclusion_rate * 2.0 * 0.1`
- 1860-3000 negative entries per partition (varies by partition size)

### Bug #3: Pre-SVD Staple Suppression
- Column scaling: `weighted_matrix = matrix @ diags(weight_vec)` before SVD
- `weight_vec` from suppression_weights (0.1 for Sol Ring at 95%, 1.0 for niche cards)
- SVD latent factors now inherently de-emphasize staples
- Post-hoc suppression in `recommend()` remains as secondary pass

### Startup Fix
- `app/main.py` lifespan now calls `load_models_from_db(session)` instead of no-op `load_models()`
- Uses `db_module.async_session_factory()` directly (not DI generator)

## Training Pipeline Flow
1. Fetch deck_ids for color identity
2. Build binary lil_matrix (n_decks × n_cards) → CSR
3. Compute suppression_weights from column inclusion rates
4. Mine negatives per deck → inject into matrix as lil → back to CSR
5. Build weighted_matrix = matrix @ diags(suppression_weights)
6. TruncatedSVD on weighted_matrix
7. Normalize embeddings to L2 unit vectors
8. Store PartitionModel with ORIGINAL matrix (binary + negatives, no suppression scaling)

## Test Data & Scripts
- `scripts/seed_test_data.py`: 478 synthetic Commander decks across 6 partitions (UBG/WUB/BRG/WUR/WRG/WUG)
- `scripts/quick_train.py`: Scrape → popularity → train → save → verify roundtrip
- `scripts/verify_e2e.py`: Train/save/load/recommend for all partitions
- `scripts/test_cf_integration.js`: Node.js HTTP tests mimicking deck builder calls

## Scraper Status (FIXED 2026-02-24)
- **Moxfield**: Fixed — switched from httpx to curl_cffi with Chrome TLS impersonation (bypasses Cloudflare WAF)
  - `base.py` now has `fetch_cffi()` method using `curl_cffi.requests.AsyncSession`
  - `moxfield.py` calls `self.fetch_cffi()` instead of `self.fetch()`
  - Removed custom User-Agent (curl_cffi uses Chrome's UA automatically)
  - API endpoints unchanged: search at `/v2/decks/search`, detail at `/v2/decks/all/{id}`
- **Archidekt**: Fixed — list endpoint changed from `/api/decks/cards/` to `/api/decks/v3/`
  - Detail endpoint unchanged: `/api/decks/{id}/` still works
  - v3 returns 60 results per page (ignores pageSize param), `count` capped at 1000
  - `colorIdentity` is None in detail responses — existing fallback derives from commander card
- Both verified working against live APIs (200 status, real deck data returned)
- `curl_cffi>=0.7.0` added to requirements.txt

## Scaling Updates (2026-02-26)

### Phase 1: Scraper Optimization
- Batch card inserts: `_flush_cards()` uses executemany with VALUES list instead of per-card INSERT
- Removed pre-existence SELECT check — insert deck with ON CONFLICT, delete if detail fetch fails
- `scrape_batch_commit_size` setting (default 50) — commit every N decks
- Progress tracking: `_start_tracking()` + `_log_progress()` with ETA in base.py
- `max_scrape_pages` default raised from 500 → 10000

### Phase 2: Training at Scale
- `mine_negatives_batch()`: Single SQL query fetches all popular cards per partition (was O(n_decks) queries)
- `get_negatives_for_deck_from_batch()`: Pure Python filtering against pre-loaded popular card list
- SVD components capped more aggressively: `min(100, n_decks//5, n_cards//10, sqrt(n_decks))`
- `save_models(save_matrix=False)` option: skip matrix in pickle (50-80% artifact size reduction)
- Matrix-less models: `recommend()` still works via matrix if present, returns empty if not
- Memory/size logging throughout training pipeline
- `--partition` flag on quick_train.py for single-partition testing

### Phase 3: Hold-One-Out Evaluation
- `scripts/evaluate.py`: 5 metrics at K=10,20,30 — Hit Rate, Precision, Recall, NDCG, MRR
- Uses existing trained models (not a proper train/test split — slight optimistic bias)
- Migration 002: `evaluation_results` table
- `--save` flag persists results to DB; `--partition` for single-partition eval

### Phase 4: Railway Deployment
- `APIKeyMiddleware` in main.py: checks `X-API-Key` header on all non-public routes
- Public paths: /health, /stats, /docs, /openapi.json, /redoc
- `POST /admin/trigger-pipeline`: Background asyncio task for nightly pipeline
- `GET /admin/scrape-status`: Running state, deck count, last run
- CORS from `ALLOWED_ORIGINS` env var (comma-separated, default "*")
- `worker_enabled` setting (not yet consumed — for future auto-scheduling)

### Phase 5: Main App Integration
- `cf-api-client.ts`: `getCFApiKey()` reads from app_state, `buildHeaders()` adds X-API-Key
- `settings-dialog.tsx`: New CF API key password input with masked display

## Commits (2026-02-26)
- Main app: `a2689f7` — CF API key auth in cf-api-client.ts + settings dialog
- Main app: `a47a214` — Fix afterPack.js ABI mismatch (was skipping rebuild)
- CF repo: `54c307f` — All 5 scaling phases (18 files, +1310/-223 lines)

## Key Architecture
- Color-identity partitioning: each CI gets its own SVD model
- Deck hashing: deterministic MD5 for cache keying (order-agnostic)
- Recommendation pipeline: input → SVD projection → cosine similarity → top-K decks → card aggregation → suppression → ranked results
- Similar deck threshold: 0.05; recommendation threshold: 0.1
- `min_decks_per_partition`: 20; `min_similar_decks`: 2; `svd_n_components`: 100 (capped by data)
