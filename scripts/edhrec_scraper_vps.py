"""EDHREC scraper - fetches top commanders and their average decklists via HTML scraping.

EDHREC locked down their JSON API, so we parse __NEXT_DATA__ from HTML pages.
"""

import asyncio
import json
import logging
import re
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseScraper

logger = logging.getLogger(__name__)

EDHREC_BASE = "https://edhrec.com"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Color identity groupings to scrape
COLOR_GROUPS = [
    "mono-white", "mono-blue", "mono-black", "mono-red", "mono-green",
    "azorius", "dimir", "rakdos", "gruul", "selesnya",
    "orzhov", "izzet", "simic", "boros", "golgari",
    "esper", "grixis", "jund", "naya", "bant",
    "abzan", "jeskai", "sultai", "mardu", "temur",
    "five-color", "colorless",
]


class EDHRECScraper(BaseScraper):
    source = "edhrec"
    rate_limit = 2.5  # seconds between requests

    def _extract_next_data(self, html: str) -> dict | None:
        match = re.search(r'__NEXT_DATA__[^>]*>(.*?)</script>', html)
        if not match:
            return None
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            return None

    async def _get_commanders_from_group(self, client: httpx.AsyncClient, group: str) -> list[dict]:
        """Fetch commander list from a color group page."""
        await asyncio.sleep(self.rate_limit)
        try:
            resp = await client.get(f"{EDHREC_BASE}/commanders/{group}")
            if resp.status_code != 200:
                logger.debug(f"  {group}: HTTP {resp.status_code}")
                return []
            data = self._extract_next_data(resp.text)
            if not data:
                return []

            page_data = data.get("props", {}).get("pageProps", {}).get("data", {})
            container = page_data.get("container", {}).get("json_dict", {})
            cardlists = container.get("cardlists", [])

            commanders = []
            for section in cardlists:
                if isinstance(section, dict):
                    for card in section.get("cardviews", []):
                        if card.get("name"):
                            commanders.append(card)
            return commanders
        except Exception as e:
            logger.debug(f"  {group}: error {e}")
            return []

    async def _get_average_deck(self, client: httpx.AsyncClient, slug: str) -> list[tuple[str, int]]:
        """Fetch average decklist for a commander."""
        await asyncio.sleep(self.rate_limit)
        try:
            resp = await client.get(f"{EDHREC_BASE}/average-decks/{slug}")
            if resp.status_code != 200:
                return []
            data = self._extract_next_data(resp.text)
            if not data:
                return []

            page_data = data.get("props", {}).get("pageProps", {}).get("data", {})
            container = page_data.get("container", {}).get("json_dict", {})
            cardlists = container.get("cardlists", [])

            deck_cards = []
            for section in cardlists:
                if isinstance(section, dict):
                    header = section.get("header", "").lower()
                    if header in ("maybeboard", "tokens"):
                        continue
                    for card in section.get("cardviews", []):
                        name = card.get("name", "")
                        qty = card.get("quantity", 1) or 1
                        if name:
                            deck_cards.append((name, qty))
            return deck_cards
        except Exception as e:
            logger.debug(f"  avg-deck {slug}: error {e}")
            return []

    async def scrape(self, session: AsyncSession, max_commanders: int = 300) -> int:
        total_new = 0
        seen_names = set()

        async with httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": BROWSER_UA, "Accept": "text/html"},
            follow_redirects=True,
        ) as client:
            # Step 1: Collect commanders from all color groups
            all_commanders = []
            for group in COLOR_GROUPS:
                logger.info(f"  Fetching {group} commanders...")
                cmds = await self._get_commanders_from_group(client, group)
                for c in cmds:
                    name = c.get("name", "")
                    if name and name not in seen_names:
                        seen_names.add(name)
                        all_commanders.append(c)
                logger.info(f"    -> {len(cmds)} found, {len(all_commanders)} unique total")

            logger.info(f"Found {len(all_commanders)} unique commanders, fetching top {max_commanders} avg decks")

            # Sort by num_decks descending
            all_commanders.sort(key=lambda x: x.get("num_decks", 0), reverse=True)

            # Step 2: Fetch average decklists
            for i, card in enumerate(all_commanders[:max_commanders]):
                name = card.get("name", "")
                slug = card.get("sanitized", "") or card.get("sanitized_wo", "")
                if not slug:
                    slug = name.lower().replace(" ", "-").replace(",", "").replace("'", "")
                num_decks = card.get("num_decks", 0)
                color_identity = card.get("color_identity", [])
                ci_str = "".join(sorted(color_identity)) if isinstance(color_identity, list) else str(color_identity)

                if not slug:
                    continue

                source_id = f"avg-{slug}"
                existing = await session.execute(
                    text("SELECT id FROM decks WHERE source = 'edhrec' AND source_id = :sid"),
                    {"sid": source_id},
                )
                if existing.scalar():
                    continue

                deck_cards = await self._get_average_deck(client, slug)
                if not deck_cards:
                    continue

                result = await session.execute(
                    text("""INSERT INTO decks (source, source_id, commander_name, color_identity, deck_name, author, views, likes, card_count)
                        VALUES ('edhrec', :sid, :commander, :ci, :dname, 'edhrec', :views, 0, :card_count)
                        ON CONFLICT (source, source_id) DO NOTHING RETURNING id"""),
                    {"sid": source_id, "commander": name, "ci": ci_str,
                     "dname": f"Average {name} Deck", "views": num_decks, "card_count": len(deck_cards)},
                )
                deck_id = result.scalar()
                if not deck_id:
                    continue

                for card_name, qty in deck_cards:
                    await session.execute(
                        text("INSERT INTO deck_cards (deck_id, card_name, quantity) VALUES (:did, :name, :qty) ON CONFLICT DO NOTHING"),
                        {"did": deck_id, "name": card_name, "qty": qty},
                    )
                await session.commit()
                total_new += 1

                if (i + 1) % 25 == 0:
                    logger.info(f"  EDHREC progress: {i+1}/{min(len(all_commanders), max_commanders)}, +{total_new} new decks")

        logger.info(f"EDHREC scrape complete: +{total_new} new average decklists")
        return total_new
