#!/usr/bin/env python3
"""Run JUST the model training step. Skips scraping + popularity recompute.

Usage (inside docker compose run api):
    python -m scripts.train_only
"""
import asyncio
import logging
import sys
import time

from sqlalchemy import text

from app.db import database as db_module
from app.services.cf_engine import CFEngine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)


async def main() -> int:
    await db_module.init_db()
    train_start = time.monotonic()
    try:
        async with db_module.async_session_factory() as session:
            pre_count = await _count_decks(session)
            logger.info(f"Step 4/6: Training check (skip-to-train mode) — {pre_count} decks total")
            logger.info("  RETRAINING: forced via train_only script")

            engine = CFEngine()
            trained = await engine.train_all(session)
            logger.info(
                f"  -> Trained {len(trained)} partitions, "
                f"{sum(trained.values())} total decks"
            )

            if trained:
                await session.execute(
                    text("DELETE FROM model_artifacts WHERE artifact_type = 'full_model'")
                )
                await engine.save_models(session)
                await session.commit()
                logger.info("  -> Models saved to database (old artifacts cleaned)")

            duration = time.monotonic() - train_start
            logger.info(
                f"=== Training complete. {len(trained)} partitions, "
                f"{sum(trained.values())} decks, {duration:.1f}s ==="
            )
        return 0
    except Exception:
        logger.exception("Training failed")
        return 1
    finally:
        await db_module.close_db()


async def _count_decks(session) -> int:
    result = await session.execute(text("SELECT count(*) FROM decks"))
    return result.scalar() or 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
