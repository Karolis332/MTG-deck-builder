"""Nightly pipeline: scrape -> recompute popularity -> retrain SVD -> invalidate cache.

Designed to run as a standalone process, cron job, or triggered via admin API.
Auto-retrains when 50k+ new decks accumulated since last training.
Runs on a 6-hour loop (not one-shot) for continuous scraping.
"""

import asyncio
import logging
import sys
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.config import get_settings
from app.db import database as db_module
from app.scrapers.moxfield import MoxfieldScraper
from app.scrapers.archidekt import ArchidektScraper
from app.scrapers.edhrec import EDHRECScraper
from app.services.cf_engine import CFEngine
from app.services.staple_suppressor import compute_and_store_popularity

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Module-level state for admin status endpoint
_pipeline_running = False
_pipeline_last_run: str | None = None
_pipeline_decks_total = 0

RETRAIN_THRESHOLD = 50_000  # Retrain after this many new decks
PIPELINE_INTERVAL_HOURS = 6  # Run scrape cycle every N hours


def get_pipeline_status() -> dict:
    return {
        "running": _pipeline_running,
        "decks_total": _pipeline_decks_total,
        "last_run": _pipeline_last_run,
    }


async def _get_last_training_deck_count(session) -> int:
    """Get deck_count_after from the most recent successful training."""
    result = await session.execute(
        text("""
            SELECT deck_count_after FROM training_log
            WHERE status = 'success'
            ORDER BY created_at DESC LIMIT 1
        """)
    )
    row = result.first()
    return row[0] if row else 0


async def _log_training(session, trigger, before, after, new_since, partitions, total_trained, duration, status, error=None):
    """Write a training log entry."""
    await session.execute(
        text("""
            INSERT INTO training_log
                (trigger, deck_count_before, deck_count_after, new_decks_since_last,
                 partitions_trained, total_decks_trained, duration_s, status, error_message)
            VALUES (:trigger, :before, :after, :new_since, :parts, :total, :dur, :status, :err)
        """),
        {
            "trigger": trigger, "before": before, "after": after,
            "new_since": new_since, "parts": partitions, "total": total_trained,
            "dur": duration, "status": status, "err": error,
        },
    )
    await session.commit()


async def run_pipeline():
    global _pipeline_running, _pipeline_last_run, _pipeline_decks_total

    settings = get_settings()
    _pipeline_running = True
    own_db = db_module.engine is None

    try:
        if own_db:
            await db_module.init_db()

        logger.info("=== Nightly Pipeline Starting ===")
        start = datetime.now(timezone.utc)

        async with db_module.async_session_factory() as session:
            # Pre-scrape deck count
            pre_count = (await session.execute(text("SELECT COUNT(*) FROM decks"))).scalar() or 0
            logger.info(f"  Decks before scrape: {pre_count}")

            # Step 1: Scrape Moxfield
            logger.info("Step 1/6: Scraping Moxfield...")
            moxfield = MoxfieldScraper(rate_limit_ms=settings.moxfield_rate_limit_ms)
            try:
                mox_count = await moxfield.scrape(session, max_pages=settings.max_scrape_pages)
                logger.info(f"  -> {mox_count} new decks from Moxfield ({moxfield.stats['requests']} requests, {moxfield.stats['errors']} errors)")
            except Exception as e:
                logger.error(f"  Moxfield scrape failed: {e}")
                mox_count = 0
            finally:
                await moxfield.close()

            # Step 2: Scrape Archidekt
            logger.info("Step 2/6: Scraping Archidekt...")
            archidekt = ArchidektScraper(rate_limit_ms=settings.archidekt_rate_limit_ms)
            try:
                arch_count = await archidekt.scrape(session, max_pages=settings.max_scrape_pages)
                logger.info(f"  -> {arch_count} new decks from Archidekt ({archidekt.stats['requests']} requests, {archidekt.stats['errors']} errors)")
            except Exception as e:
                logger.error(f"  Archidekt scrape failed: {e}")
                arch_count = 0
            finally:
                await archidekt.close()

            # Step 2b: Scrape EDHREC average decklists
            logger.info("Step 2b: Scraping EDHREC avg decklists...")
            edhrec = EDHRECScraper()
            try:
                edhrec_count = await edhrec.scrape(session, max_commanders=300)
                logger.info(f"  -> {edhrec_count} new avg decks from EDHREC")
            except Exception as e:
                logger.error(f"  EDHREC scrape failed: {e}")
                edhrec_count = 0

            # Step 2c: Targeted commander expansion
            logger.info("Step 2c: Targeted commander expansion...")
            try:
                underrep_result = await session.execute(
                    text("""
                        SELECT commander_name, COUNT(*) as cnt
                        FROM decks
                        WHERE commander_name != '' AND commander_name IS NOT NULL
                        GROUP BY commander_name
                        HAVING COUNT(*) < 100
                        ORDER BY cnt DESC
                        LIMIT 200
                    """)
                )
                underrep_commanders = [row[0] for row in underrep_result]
                logger.info(f"  Found {len(underrep_commanders)} underrepresented commanders")

                expansion_total = 0
                mox_targeted = MoxfieldScraper(rate_limit_ms=settings.moxfield_rate_limit_ms)
                try:
                    for i, cmd in enumerate(underrep_commanders[:100]):
                        if i > 0 and i % 20 == 0:
                            logger.info(f"  Commander expansion progress: {i}/{min(len(underrep_commanders), 100)}, +{expansion_total} decks")
                        try:
                            count = await mox_targeted.scrape_commander(session, cmd, max_pages=20)
                            expansion_total += count
                        except Exception as e:
                            logger.debug(f"  Commander '{cmd}' scrape failed: {e}")
                finally:
                    await mox_targeted.close()

                arch_targeted = ArchidektScraper(rate_limit_ms=settings.archidekt_rate_limit_ms)
                try:
                    for cmd in underrep_commanders[:50]:
                        try:
                            count = await arch_targeted.scrape_commander(session, cmd, max_pages=10)
                            expansion_total += count
                        except Exception:
                            pass
                finally:
                    await arch_targeted.close()

                logger.info(f"  -> Commander expansion: +{expansion_total} decks from targeted scraping")
            except Exception as e:
                logger.error(f"  Commander expansion failed: {e}")

            # Post-scrape deck count
            post_count = (await session.execute(text("SELECT COUNT(*) FROM decks"))).scalar() or 0
            _pipeline_decks_total = post_count
            new_this_run = post_count - pre_count
            logger.info(f"  Decks after scrape: {post_count} (+{new_this_run})")

            # Step 3: Recompute card popularity
            logger.info("Step 3/6: Recomputing card popularity...")
            ci_result = await session.execute(
                text("""
                    SELECT color_identity, COUNT(*) as cnt
                    FROM decks GROUP BY color_identity
                    HAVING COUNT(*) >= :min
                    ORDER BY cnt DESC
                """),
                {"min": settings.min_decks_per_partition},
            )
            partitions = [(row[0], row[1]) for row in ci_result]
            for ci, count in partitions:
                await compute_and_store_popularity(session, ci)
            logger.info(f"  -> Updated popularity for {len(partitions)} partitions")

            # Step 4: Auto-retrain check — retrain if 50k+ new decks since last training
            last_trained_count = await _get_last_training_deck_count(session)
            new_since_last_train = post_count - last_trained_count
            logger.info(f"Step 4/6: Training check — {new_since_last_train} new decks since last training (threshold: {RETRAIN_THRESHOLD})")

            trained = {}
            if new_since_last_train >= RETRAIN_THRESHOLD or last_trained_count == 0:
                logger.info(f"  RETRAINING: {new_since_last_train} new decks >= {RETRAIN_THRESHOLD} threshold (or first training)")
                train_start = time.monotonic()
                try:
                    engine = CFEngine()
                    trained = await engine.train_all(session)
                    logger.info(f"  -> Trained {len(trained)} partitions, {sum(trained.values())} total decks")

                    if trained:
                        # Clean old model artifacts before saving new ones
                        await session.execute(text("DELETE FROM model_artifacts WHERE artifact_type = 'full_model'"))
                        await engine.save_models(session)
                        logger.info("  -> Models saved to database (old artifacts cleaned)")

                    train_duration = time.monotonic() - train_start
                    await _log_training(
                        session, "threshold" if last_trained_count > 0 else "initial",
                        pre_count, post_count, new_since_last_train,
                        len(trained), sum(trained.values()), train_duration, "success",
                    )
                except Exception as e:
                    train_duration = time.monotonic() - train_start
                    logger.error(f"  Training failed: {e}")
                    await _log_training(
                        session, "threshold", pre_count, post_count,
                        new_since_last_train, 0, 0, train_duration, "failed", str(e),
                    )
            else:
                logger.info(f"  Skipping training: {new_since_last_train} < {RETRAIN_THRESHOLD} threshold. Next retrain at ~{last_trained_count + RETRAIN_THRESHOLD} decks")

            # Step 5: Bootstrap VW from scraped decks
            logger.info("Step 5/6: Bootstrapping VW contextual bandit...")
            try:
                from app.services.vw_engine import VWEngine
                vw = VWEngine()

                all_cards_result = await session.execute(
                    text("SELECT DISTINCT card_name FROM deck_cards LIMIT 5000")
                )
                all_known_cards = [{"card_name": r[0], "cmc": 0, "card_type": ""} for r in all_cards_result]

                decks_result = await session.execute(
                    text("""
                        SELECT d.id, d.commander_name, d.color_identity
                        FROM decks d
                        ORDER BY d.views DESC NULLS LAST
                        LIMIT 500
                    """)
                )
                bootstrap_decks = decks_result.fetchall()
                bootstrapped = 0

                for deck_id, commander, ci in bootstrap_decks:
                    cards_result = await session.execute(
                        text("SELECT card_name FROM deck_cards WHERE deck_id = :did AND board = 'main'"),
                        {"did": deck_id},
                    )
                    deck_cards = [r[0] for r in cards_result]
                    if len(deck_cards) < 20:
                        continue

                    vw.learn_from_deck(
                        commander=commander,
                        color_identity=ci,
                        deck_cards=deck_cards,
                        all_known_cards=all_known_cards,
                        reward=1.0,
                    )
                    bootstrapped += 1

                vw.save_model()
                vw.close()
                logger.info(f"  -> VW bootstrapped from {bootstrapped} decks, model: {vw.model_size_kb}KB")
            except Exception as e:
                logger.error(f"  VW bootstrap failed: {e}")

            # Step 6: Invalidate stale cache
            logger.info("Step 6/6: Invalidating stale cache...")
            cutoff = datetime.now(timezone.utc) - timedelta(days=settings.stale_cache_days)
            del_result = await session.execute(
                text("DELETE FROM cached_recommendations WHERE computed_at < :cutoff"),
                {"cutoff": cutoff},
            )
            await session.commit()
            deleted = del_result.rowcount
            logger.info(f"  -> Deleted {deleted} stale cache entries")

        elapsed = (datetime.now(timezone.utc) - start).total_seconds()
        _pipeline_last_run = datetime.now(timezone.utc).isoformat()
        logger.info(f"=== Pipeline complete in {elapsed:.0f}s ===")
        logger.info(f"  Moxfield: +{mox_count}, Archidekt: +{arch_count}, EDHREC: +{edhrec_count}, Total: {post_count}")
        if trained:
            logger.info(f"  Retrained: {len(trained)} partitions, {sum(trained.values())} decks")
        else:
            logger.info(f"  Training skipped (next at {last_trained_count + RETRAIN_THRESHOLD} decks)")

        if own_db:
            await db_module.close_db()

    finally:
        _pipeline_running = False


async def run_loop():
    """Run pipeline on a loop every PIPELINE_INTERVAL_HOURS."""
    while True:
        try:
            await run_pipeline()
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)

        logger.info(f"Sleeping {PIPELINE_INTERVAL_HOURS}h until next pipeline run...")
        await asyncio.sleep(PIPELINE_INTERVAL_HOURS * 3600)


def main():
    asyncio.run(run_loop())


if __name__ == "__main__":
    main()
