path = 'app/workers/nightly_pipeline.py'
with open(path) as f:
    s = f.read()
orig = s

old_const = 'RETRAIN_THRESHOLD = 50_000  # Retrain after this many new decks\nPIPELINE_INTERVAL_HOURS = 6  # Run scrape cycle every N hours\n'
new_const = old_const + '''
# Cross-process/cross-container lock so the admin-triggered pipeline (in api-1)
# and the standalone daemon container (profile "manual", same nightly_pipeline
# module but a separate process) can't both run at once — each has its own
# _pipeline_running memory, invisible to the other (duplicate trainings on
# 2026-09-02 and 2026-09-12 were caused by exactly this). A Postgres advisory
# lock is visible to any connection on the shared grimoire_cf database
# regardless of which container holds it, with no schema change needed.
PIPELINE_LOCK_KEY = 853491027
'''
assert old_const in s
s = s.replace(old_const, new_const, 1)

old_status = '''def get_pipeline_status() -> dict:
    return {'''
new_status = '''async def pipeline_lock_held_elsewhere() -> bool:
    """True if another process currently holds the pipeline advisory lock.

    Non-blocking: acquires-then-immediately-releases a probe attempt, so this
    is a point-in-time check (a small TOCTOU race is possible, acceptable
    given pipeline runs last on the order of hours, not the probe's ms).
    """
    if db_module.engine is None:
        return False
    async with db_module.engine.connect() as conn:
        got = (await conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": PIPELINE_LOCK_KEY})).scalar()
        if got:
            await conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": PIPELINE_LOCK_KEY})
            return False
        return True


def get_pipeline_status() -> dict:
    return {'''
assert old_status in s
s = s.replace(old_status, new_status, 1)

old_run_start = '''async def run_pipeline():
    global _pipeline_running, _pipeline_last_run, _pipeline_decks_total

    settings = get_settings()
    _pipeline_running = True
    own_db = db_module.engine is None

    try:
        if own_db:
            await db_module.init_db()

        logger.info("=== Nightly Pipeline Starting ===")
'''
new_run_start = '''async def run_pipeline(force: bool = False):
    global _pipeline_running, _pipeline_last_run, _pipeline_decks_total

    settings = get_settings()
    own_db = db_module.engine is None

    if own_db:
        await db_module.init_db()

    # Hold a dedicated connection for the advisory lock so it lives for the
    # whole pipeline run, independent of the short-lived sessions the steps
    # below open/close for their own queries.
    lock_conn = await db_module.engine.connect()
    got_lock = (await lock_conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": PIPELINE_LOCK_KEY})).scalar()
    if not got_lock:
        await lock_conn.close()
        if own_db:
            await db_module.close_db()
        if not force:
            logger.warning("Pipeline already running in another process — skipping (pass force=True to override)")
            return {"status": "skipped", "reason": "pipeline_lock_held_elsewhere"}
        logger.warning("Pipeline lock held elsewhere but force=True — proceeding WITHOUT the lock")

    _pipeline_running = True
    try:
        logger.info("=== Nightly Pipeline Starting ===")
'''
assert old_run_start in s, 'run_pipeline start not found'
s = s.replace(old_run_start, new_run_start, 1)

old_finally = '''        if own_db:
            await db_module.close_db()

    finally:
        _pipeline_running = False
'''
new_finally = '''        if own_db:
            await db_module.close_db()

    finally:
        _pipeline_running = False
        if got_lock:
            try:
                await lock_conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": PIPELINE_LOCK_KEY})
            finally:
                await lock_conn.close()
'''
assert old_finally in s, 'finally block not found'
s = s.replace(old_finally, new_finally, 1)

assert s != orig
with open(path, 'w') as f:
    f.write(s)
print('patched OK')
