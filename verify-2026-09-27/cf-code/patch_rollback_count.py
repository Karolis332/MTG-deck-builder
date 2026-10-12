path = 'app/routers/recommend.py'
with open(path) as f:
    s = f.read()
orig = s

old_except = '''        await session.commit()
    except Exception as e:
        logger.warning(f"impression logging failed (non-fatal): {e}")


async def _resolve_color_identity('''
new_except = '''        await session.commit()
    except Exception as e:
        logger.warning(f"impression logging failed (non-fatal): {e}")
        # A failed statement leaves the Postgres transaction aborted; the next
        # statement on this session (the cached_recommendations INSERT on the
        # fresh path, or the deck-count read on the cache path) would then
        # raise "current transaction is aborted" and turn this into a 500.
        await session.rollback()


async def _resolve_color_identity('''
assert old_except in s
s = s.replace(old_except, new_except, 1)

old_count = '''        total = await session.execute(text("SELECT COUNT(*) FROM decks"))
        return RecommendResponse(
            recommendations=recs,
            model_version=engine.model_version,
            deck_count=total.scalar() or 0,
            color_identity="cached",
        )
'''
new_count = '''        # engine.total_decks (in-memory, sum of loaded SVD partitions) rather than a
        # live SELECT COUNT(*) FROM decks — that query measured 1,389ms per cache hit,
        # which is the entire cost of an otherwise-cached request. The freshly-computed
        # path below already returns engine.total_decks (~L256); this makes the
        # cache-hit path consistent with it instead of the live count.
        return RecommendResponse(
            recommendations=recs,
            model_version=engine.model_version,
            deck_count=engine.total_decks,
            color_identity="cached",
        )
'''
assert old_count in s
s = s.replace(old_count, new_count, 1)

assert s != orig
with open(path, 'w') as f:
    f.write(s)
print('patched OK')
