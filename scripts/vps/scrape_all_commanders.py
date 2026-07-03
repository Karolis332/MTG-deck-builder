#!/usr/bin/env python3
"""Scrape decks for every legal Commander, slowly but surely.

Pulls the full commander list from Scryfall (~3000 legendary creatures legal
in Commander). For each commander, runs Moxfield + Archidekt targeted scrapes.

Resume-safe: tracks progress in /opt/grimoire-cf-api/data/scrape_all_state.json.
Idempotent: scrapers use ON CONFLICT DO NOTHING so re-running is safe.

Run inside the API container:
    docker compose run --rm api python -m scripts.scrape_all_commanders

Or as systemd service (recommended for long-running scrapes).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from app.db import database as db_module
from app.scrapers.moxfield import MoxfieldScraper
from app.scrapers.archidekt import ArchidektScraper
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)

STATE_FILE = Path(os.environ.get('SCRAPE_STATE_FILE', '/app/data/scrape_all_state.json'))
COMMANDER_LIST_URL = (
    'https://api.scryfall.com/cards/search'
    '?q=' + urllib.parse.quote('is:commander')
    + '&order=edhrec&unique=cards'
)
SLEEP_BETWEEN_COMMANDERS_SEC = 3
PAGES_PER_SOURCE = 5  # cap pages per commander per source


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {
        'started_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'completed': [],
        'last_commander': None,
        'total_new_decks': 0,
    }


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def fetch_all_commanders() -> list[str]:
    """Paginate Scryfall for all legal commanders."""
    names: list[str] = []
    url = COMMANDER_LIST_URL
    pages = 0
    headers = {
        'User-Agent': 'BlackGrimoire/1.0 (kpaulikas21@gmail.com)',
        'Accept': 'application/json',
    }
    while url:
        pages += 1
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        for card in data.get('data', []):
            name = card.get('name')
            if name:
                names.append(name)
        url = data.get('next_page')
        # Scryfall asks for 50-100ms between requests
        time.sleep(0.1)
        if pages % 5 == 0:
            logger.info(f"  Scryfall pagination: {pages} pages, {len(names)} commanders so far")
    logger.info(f"Fetched {len(names)} legal commanders from Scryfall ({pages} pages)")
    return names


async def scrape_one_commander(
    session,
    moxfield: MoxfieldScraper,
    archidekt: ArchidektScraper,
    commander: str,
) -> tuple[int, int]:
    """Scrape a single commander on both sources. Returns (mox_new, arch_new)."""
    mox_new = 0
    arch_new = 0
    try:
        if hasattr(moxfield, 'scrape_commander'):
            mox_new = await moxfield.scrape_commander(session, commander, max_pages=PAGES_PER_SOURCE)
    except Exception as e:
        logger.warning(f"  Moxfield error for '{commander}': {e}")
    try:
        if hasattr(archidekt, 'scrape_commander'):
            arch_new = await archidekt.scrape_commander(session, commander, max_pages=PAGES_PER_SOURCE)
    except Exception as e:
        logger.warning(f"  Archidekt error for '{commander}': {e}")
    return mox_new, arch_new


async def main() -> int:
    settings = get_settings()
    await db_module.init_db()
    state = load_state()

    try:
        commanders = fetch_all_commanders()
    except Exception as e:
        logger.error(f"Failed to fetch commander list: {e}")
        return 1

    # Resume-safe: skip already-completed commanders this run
    completed_set = set(state.get('completed', []))
    remaining = [c for c in commanders if c not in completed_set]
    logger.info(
        f"Total commanders: {len(commanders)}, already done: {len(completed_set)}, "
        f"remaining: {len(remaining)}"
    )

    moxfield = MoxfieldScraper(rate_limit_ms=settings.moxfield_rate_limit_ms)
    archidekt = ArchidektScraper(rate_limit_ms=settings.archidekt_rate_limit_ms)

    grand_start = time.monotonic()
    for i, commander in enumerate(remaining, start=1):
        try:
            async with db_module.async_session_factory() as session:
                t0 = time.monotonic()
                mox_new, arch_new = await scrape_one_commander(session, moxfield, archidekt, commander)
                await session.commit()
                total_new = mox_new + arch_new
                state['total_new_decks'] += total_new
                state['completed'].append(commander)
                state['last_commander'] = commander
                state['last_update'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
                save_state(state)

                elapsed = time.monotonic() - t0
                logger.info(
                    f"[{i}/{len(remaining)}] '{commander}': mox=+{mox_new} arch=+{arch_new} "
                    f"({total_new} new, {elapsed:.1f}s, total new this run: {state['total_new_decks']})"
                )
        except KeyboardInterrupt:
            logger.info("Interrupted — state saved, can resume later")
            return 0
        except Exception:
            logger.exception(f"Failed on '{commander}', moving on")

        # polite pause between commanders
        time.sleep(SLEEP_BETWEEN_COMMANDERS_SEC + random.uniform(0, 1.0))

    grand_elapsed = time.monotonic() - grand_start
    logger.info(
        f"=== ALL COMMANDERS DONE. "
        f"{len(state['completed'])} commanders, {state['total_new_decks']} new decks total, "
        f"{grand_elapsed/3600:.1f}h ==="
    )
    await db_module.close_db()
    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
