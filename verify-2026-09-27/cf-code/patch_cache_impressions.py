path = 'app/routers/recommend.py'
with open(path) as f:
    s = f.read()
orig = s

old_helper_anchor = '''async def _resolve_color_identity(
    session: AsyncSession, commander: str
) -> str | None:'''
helper = '''async def _log_impressions(
    session: AsyncSession,
    deck_hash: str,
    commander: str,
    color_identity: str,
    rows: list[dict],
    source: str,
    model_version: str,
) -> None:
    """Insert one rec_impressions row per served recommendation (best-effort, non-fatal).

    Shared by both the cache-hit and freshly-computed paths so a displayed
    recommendation is logged for accept-rate/offline policy eval regardless of
    which path served it — a cache hit used to return before this ran at all.
    Each row: {"card_name", "cf_score", "vw_score": optional, "propensity": optional}.
    """
    try:
        for rank, r in enumerate(rows):
            await session.execute(
                text("""
                    INSERT INTO rec_impressions
                        (deck_hash, commander, color_identity, card_name, rank,
                         cf_score, vw_score, propensity, source, model_version)
                    VALUES (:h, :cmd, :ci, :card, :rank, :cf, :vw, :prop, :src, :mv)
                """),
                {
                    "h": deck_hash, "cmd": commander, "ci": color_identity,
                    "card": r["card_name"], "rank": rank, "cf": r.get("cf_score"),
                    "vw": r.get("vw_score"), "prop": r.get("propensity"),
                    "src": source, "mv": model_version,
                },
            )
        await session.commit()
    except Exception as e:
        logger.warning(f"impression logging failed (non-fatal): {e}")


async def _resolve_color_identity(
    session: AsyncSession, commander: str
) -> str | None:'''
assert old_helper_anchor in s
s = s.replace(old_helper_anchor, helper, 1)

old_cache_hit = '''    cached_rows = cached.fetchall()
    if cached_rows:
        recs = [
            Recommendation(
                card_name=r[0],
                cf_score=r[1],
                similar_deck_count=r[2],
                reason=r[3] or "",
            )
            for r in cached_rows
        ]
        total = await session.execute(text("SELECT COUNT(*) FROM decks"))
        return RecommendResponse(
            recommendations=recs,
            model_version=engine.model_version,
            deck_count=total.scalar() or 0,
            color_identity="cached",
        )
'''
new_cache_hit = '''    cached_rows = cached.fetchall()
    if cached_rows:
        recs = [
            Recommendation(
                card_name=r[0],
                cf_score=r[1],
                similar_deck_count=r[2],
                reason=r[3] or "",
            )
            for r in cached_rows
        ]
        if req.log_impressions:
            await _log_impressions(
                session, deck_hash, req.commander, "cached",
                [{"card_name": r[0], "cf_score": r[1]} for r in cached_rows],
                source="cache", model_version=engine.model_version,
            )
        total = await session.execute(text("SELECT COUNT(*) FROM decks"))
        return RecommendResponse(
            recommendations=recs,
            model_version=engine.model_version,
            deck_count=total.scalar() or 0,
            color_identity="cached",
        )
'''
assert old_cache_hit in s
s = s.replace(old_cache_hit, new_cache_hit, 1)

old_fresh = '''    if req.log_impressions:
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
new_fresh = '''    if req.log_impressions:
        vw_active = bool(vw and vw.model_exists)
        impr_source = "rrf+vw" if vw_active else "rrf"
        await _log_impressions(
            session, deck_hash, req.commander, color_identity,
            [
                {
                    "card_name": r["card_name"], "cf_score": r.get("cf_score"),
                    "vw_score": r.get("vw_score"),
                    "propensity": r.get("vw_score") if vw_active else None,
                }
                for r in results
            ],
            source=impr_source, model_version=engine.model_version,
        )
'''
assert old_fresh in s
s = s.replace(old_fresh, new_fresh, 1)

assert s != orig
with open(path, 'w') as f:
    f.write(s)
print('patched OK')
