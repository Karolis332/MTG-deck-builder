m_path = 'app/models.py'
with open(m_path) as f:
    m = f.read()
old_m = '''class RecommendRequest(BaseModel):
    cards: list[str] = Field(..., min_length=1, description="Card names in the deck")
    commander: str = Field(..., min_length=1, description="Commander card name")
    limit: int = Field(30, ge=1, le=100, description="Max recommendations to return")
'''
new_m = '''class RecommendRequest(BaseModel):
    cards: list[str] = Field(..., min_length=1, description="Card names in the deck")
    commander: str = Field(..., min_length=1, description="Commander card name")
    limit: int = Field(30, ge=1, le=100, description="Max recommendations to return")
    log_impressions: bool = Field(True, description="Log rec_impressions rows for this call (set False for internal calls no user ever sees, e.g. deck-builder-ai.ts)")
'''
assert old_m in m
m = m.replace(old_m, new_m, 1)
with open(m_path, 'w') as f:
    f.write(m)

r_path = 'app/routers/recommend.py'
with open(r_path) as f:
    r = f.read()
old_r = '''    # Log impressions (best-effort, non-fatal) for accept-rate + offline policy eval.
    # propensity = the VW exploration probability when VW is active (IPS-ready).
    vw_active = bool(vw and vw.model_exists)
    impr_source = "rrf+vw" if vw_active else "rrf"
    try:
        for rank, r in enumerate(results):
            await session.execute(
                text("""
                    INSERT INTO rec_impressions
                        (deck_hash, commander, color_identity, card_name, rank,
                         cf_score, vw_score, propensity, source, model_version)
                    VALUES (:h, :cmd, :ci, :card, :rank, :cf, :vw, :prop, :src, :mv)
                """),
                {
                    "h": deck_hash, "cmd": req.commander, "ci": color_identity,
                    "card": r["card_name"], "rank": rank, "cf": r.get("cf_score"),
                    "vw": r.get("vw_score"),
                    "prop": r.get("vw_score") if vw_active else None,
                    "src": impr_source, "mv": engine.model_version,
                },
            )
        await session.commit()
    except Exception as e:
        logger.warning(f"impression logging failed (non-fatal): {e}")
'''
new_r = '''    # Log impressions (best-effort, non-fatal) for accept-rate + offline policy eval.
    # propensity = the VW exploration probability when VW is active (IPS-ready).
    # Skipped when the caller passes log_impressions=False — internal builder calls
    # (e.g. deck-builder-ai.ts) that no user ever sees would otherwise pollute the
    # impression log used for accept-rate/offline eval.
    if req.log_impressions:
        vw_active = bool(vw and vw.model_exists)
        impr_source = "rrf+vw" if vw_active else "rrf"
        try:
            for rank, r in enumerate(results):
                await session.execute(
                    text("""
                        INSERT INTO rec_impressions
                            (deck_hash, commander, color_identity, card_name, rank,
                             cf_score, vw_score, propensity, source, model_version)
                        VALUES (:h, :cmd, :ci, :card, :rank, :cf, :vw, :prop, :src, :mv)
                    """),
                    {
                        "h": deck_hash, "cmd": req.commander, "ci": color_identity,
                        "card": r["card_name"], "rank": rank, "cf": r.get("cf_score"),
                        "vw": r.get("vw_score"),
                        "prop": r.get("vw_score") if vw_active else None,
                        "src": impr_source, "mv": engine.model_version,
                    },
                )
            await session.commit()
        except Exception as e:
            logger.warning(f"impression logging failed (non-fatal): {e}")
'''
assert old_r in r
r = r.replace(old_r, new_r, 1)
with open(r_path, 'w') as f:
    f.write(r)
print('patched OK')
