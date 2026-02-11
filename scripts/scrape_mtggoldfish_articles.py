#!/usr/bin/env python3
"""
Scrape MTGGoldfish strategy articles, chunk them, and store in SQLite with FTS5.

Usage:
    py scripts/scrape_mtggoldfish_articles.py [--max-articles 100] [--db data/mtg-deck-builder.db]

Rate limits: 2.5s between requests (matches existing goldfish scraper).
Only scrapes strategy articles — skips news, spoilers, podcasts, product reviews.
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
import time

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install requests beautifulsoup4")
    sys.exit(1)

BASE_URL = "https://www.mtggoldfish.com"
ARTICLES_URL = f"{BASE_URL}/articles"
RATE_LIMIT = 2.5  # seconds between requests (match existing goldfish scraper)
CHUNK_SIZE = 500   # words per chunk

# Series detection patterns (title prefix → article_type)
SERIES_PATTERNS = {
    "budget magic": "budget_magic",
    "against the odds": "against_the_odds",
    "commander clash": "commander_clash",
    "single scoop": "single_scoop",
    "vintage 101": "vintage_101",
    "goldfish gladiators": "goldfish_gladiators",
    "much abrew": "much_abrew",
    "instant deck tech": "instant_deck_tech",
    "fish five-0": "fish_five_0",
    "commander corner": "commander_corner",
    "brewer's minute": "brewers_minute",
    "deck evolutions": "deck_evolutions",
    "stream highlights": "stream_highlights",
    "budget commander": "budget_commander",
    "commander quickie": "commander_quickie",
}

# Keywords that indicate non-strategy content (skip these)
SKIP_KEYWORDS = [
    "weekly update",
    "podcast",
    "this week in legacy",
    "goldfish news",
    "spoiler",
    "preview season",
    "product review",
    "unboxing",
    "box opening",
    "prerelease",
    "release notes",
    "banned and restricted",
    "reprint",
    "daily deals",
]


def get_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create tables if they don't exist (in case migration hasn't run yet)."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS mtggoldfish_knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_url TEXT NOT NULL,
            title TEXT NOT NULL,
            author TEXT,
            category TEXT,
            article_type TEXT,
            chunk_text TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content_hash TEXT,
            tags TEXT,
            published_date TEXT,
            fetched_at TEXT DEFAULT (datetime('now')),
            UNIQUE(source_url, chunk_index)
        );
    """)
    # Check if FTS table exists
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='mtggoldfish_knowledge_fts'"
    ).fetchone()
    if not row:
        conn.executescript("""
            CREATE VIRTUAL TABLE IF NOT EXISTS mtggoldfish_knowledge_fts
                USING fts5(title, chunk_text, tags, content='mtggoldfish_knowledge', content_rowid='id');

            CREATE TRIGGER IF NOT EXISTS mtggoldfish_knowledge_ai AFTER INSERT ON mtggoldfish_knowledge BEGIN
                INSERT INTO mtggoldfish_knowledge_fts(rowid, title, chunk_text, tags)
                VALUES (new.id, new.title, new.chunk_text, new.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS mtggoldfish_knowledge_ad AFTER DELETE ON mtggoldfish_knowledge BEGIN
                INSERT INTO mtggoldfish_knowledge_fts(mtggoldfish_knowledge_fts, rowid, title, chunk_text, tags)
                VALUES ('delete', old.id, old.title, old.chunk_text, old.tags);
            END;
        """)
    conn.commit()


def fetch_page(url: str, session: requests.Session) -> str | None:
    """Fetch a URL with rate limiting."""
    time.sleep(RATE_LIMIT)
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as e:
        print(f"  [WARN] Failed to fetch {url}: {e}")
        return None


def should_scrape_article(title: str, tags: list[str] | None = None) -> bool:
    """Filter out non-strategy content. Returns True if article should be scraped."""
    lower_title = title.lower()

    # Skip known non-strategy content
    for kw in SKIP_KEYWORDS:
        if kw in lower_title:
            return False

    # Accept known strategy series
    for series_prefix in SERIES_PATTERNS:
        if lower_title.startswith(series_prefix):
            return True

    # Accept articles with strategy-indicating keywords
    strategy_keywords = [
        "deck", "guide", "primer", "tech", "brew", "build",
        "strategy", "matchup", "sideboard", "upgrade",
        "budget", "commander", "edh", "modern", "standard",
        "pioneer", "legacy", "vintage", "pauper", "historic",
        "top", "meta", "metagame", "tier",
    ]
    for kw in strategy_keywords:
        if kw in lower_title:
            return True

    # Check tags if available
    if tags:
        tag_text = " ".join(t.lower() for t in tags)
        for kw in strategy_keywords:
            if kw in tag_text:
                return True

    # Default: skip uncertain content
    return False


def detect_article_series(title: str) -> str | None:
    """Detect article series from title prefix."""
    lower_title = title.lower()
    for prefix, series_name in SERIES_PATTERNS.items():
        if lower_title.startswith(prefix):
            return series_name
    return None


def categorize_article(title: str, body_preview: str) -> str:
    """Categorize article by content type."""
    lower = (title + " " + body_preview[:300]).lower()

    if "budget" in lower:
        return "budget"
    if "guide" in lower or "primer" in lower or "how to" in lower:
        return "guide"
    if "meta" in lower or "metagame" in lower or "tier" in lower:
        return "meta"
    if "stream" in lower or "video" in lower or "gameplay" in lower:
        return "video"
    return "strategy"


def get_article_links(session: requests.Session, max_pages: int = 5,
                      category: str | None = None) -> list[dict]:
    """Scrape article listing pages to collect article URLs."""
    articles = []
    seen_urls = set()

    for page in range(1, max_pages + 1):
        if category:
            url = f"{ARTICLES_URL}/search?tag={category}&page={page}"
        else:
            url = f"{ARTICLES_URL}" if page == 1 else f"{ARTICLES_URL}?page={page}"
        print(f"  Fetching article listing page {page}...")
        html = fetch_page(url, session)
        if not html:
            break

        soup = BeautifulSoup(html, "html.parser")

        # MTGGoldfish article listings — look for article links
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if "/articles/" not in href or href == "/articles/" or href == "/articles":
                continue
            # Skip pagination/category links
            if "?page=" in href or "search?" in href:
                continue
            if not href.startswith("http"):
                href = BASE_URL + href

            if href in seen_urls:
                continue
            seen_urls.add(href)

            title = a_tag.get_text(strip=True)
            if not title or len(title) < 5:
                parent = a_tag.find_parent(["div", "article", "li"])
                if parent:
                    h_tag = parent.find(["h1", "h2", "h3", "h4"])
                    if h_tag:
                        title = h_tag.get_text(strip=True)

            if title and len(title) > 5:
                articles.append({"url": href, "title": title})

        if len(articles) == 0 and page == 1:
            print("  [WARN] No article links found — MTGGoldfish HTML structure may have changed")
            break

    return articles


def extract_article_content(html: str) -> dict:
    """Extract article body text, author, date, and category from article HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # Extract title
    title = ""
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)

    # Extract author
    author = None
    author_el = soup.find(class_=re.compile(r"author", re.I))
    if author_el:
        author = author_el.get_text(strip=True)
    if not author:
        # Try meta tag
        meta_author = soup.find("meta", attrs={"name": "author"})
        if meta_author:
            author = meta_author.get("content", "").strip() or None

    # Extract published date
    published_date = None
    # Try time element
    time_el = soup.find("time")
    if time_el:
        published_date = time_el.get("datetime") or time_el.get_text(strip=True)
    if not published_date:
        # Try meta tag
        meta_date = soup.find("meta", attrs={"property": "article:published_time"})
        if meta_date:
            published_date = meta_date.get("content", "").strip() or None
    if not published_date:
        # Try class-based date element
        date_el = soup.find(class_=re.compile(r"date|time|published", re.I))
        if date_el:
            published_date = date_el.get_text(strip=True)

    # Extract main content
    content_el = (
        soup.find("article")
        or soup.find(class_=re.compile(r"article.?body|post.?content|entry.?content", re.I))
        or soup.find("main")
    )

    if not content_el:
        paragraphs = soup.find_all("p")
        body = "\n\n".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20)
    else:
        for tag in content_el.find_all(["script", "style", "nav", "footer", "aside"]):
            tag.decompose()
        body = content_el.get_text(separator="\n", strip=True)

    # Detect category
    category = categorize_article(title, body)

    # Detect article series
    article_type = detect_article_series(title)

    # Extract tags
    tags = []
    tag_els = soup.find_all(class_=re.compile(r"tag|label|badge", re.I))
    for el in tag_els:
        tag_text = el.get_text(strip=True)
        if tag_text and len(tag_text) < 50:
            tags.append(tag_text)

    return {
        "title": title,
        "author": author,
        "category": category,
        "article_type": article_type,
        "body": body,
        "tags": tags,
        "published_date": published_date,
    }


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    """Split text into chunks of approximately chunk_size words."""
    words = text.split()
    chunks = []
    current = []
    count = 0

    for word in words:
        current.append(word)
        count += 1
        if count >= chunk_size:
            chunks.append(" ".join(current))
            current = []
            count = 0

    if current:
        chunks.append(" ".join(current))

    return chunks


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def store_article(conn: sqlite3.Connection, url: str, data: dict) -> int:
    """Chunk and store an article. Skip if content hash matches existing."""
    body = data["body"]
    if not body or len(body) < 100:
        return 0

    full_hash = content_hash(body)

    # Check if we already have this exact content
    existing = conn.execute(
        "SELECT content_hash FROM mtggoldfish_knowledge WHERE source_url = ? AND chunk_index = 0",
        (url,)
    ).fetchone()
    if existing and existing[0] == full_hash:
        return 0  # No change

    # Delete old chunks if re-scraping
    conn.execute("DELETE FROM mtggoldfish_knowledge WHERE source_url = ?", (url,))

    chunks = chunk_text(body)
    tags_json = json.dumps(data["tags"]) if data["tags"] else None

    inserted = 0
    for i, chunk in enumerate(chunks):
        conn.execute(
            """INSERT OR REPLACE INTO mtggoldfish_knowledge
               (source_url, title, author, category, article_type,
                chunk_text, chunk_index, content_hash, tags, published_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (url, data["title"], data["author"], data["category"], data["article_type"],
             chunk, i, full_hash if i == 0 else None, tags_json, data["published_date"])
        )
        inserted += 1

    conn.commit()
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Scrape MTGGoldfish articles into SQLite")
    parser.add_argument("--max-articles", type=int, default=100,
                        help="Maximum number of articles to scrape")
    parser.add_argument("--db", type=str, default="data/mtg-deck-builder.db",
                        help="Path to SQLite database")
    parser.add_argument("--max-pages", type=int, default=5,
                        help="Max listing pages to scan")
    parser.add_argument("--category", type=str, default=None,
                        help="Filter by article category/tag")
    parser.add_argument("--recent-only", action="store_true",
                        help="Only scrape articles not already in DB")
    args = parser.parse_args()

    db_path = args.db
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        sys.exit(1)

    conn = get_db(db_path)
    ensure_tables(conn)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "MTG-Deck-Builder/1.0 (educational project, rate-limited scraper)"
    })

    print(f"Scraping MTGGoldfish articles (max {args.max_articles}, {args.max_pages} pages)...")
    articles = get_article_links(session, max_pages=args.max_pages, category=args.category)
    print(f"  Found {len(articles)} article links")

    # Filter to strategy-relevant articles
    strategy_articles = [a for a in articles if should_scrape_article(a["title"])]
    print(f"  {len(strategy_articles)} are strategy-relevant (filtered from {len(articles)})")

    # If recent-only, skip articles already in DB
    if args.recent_only:
        existing_urls = set()
        for row in conn.execute("SELECT DISTINCT source_url FROM mtggoldfish_knowledge"):
            existing_urls.add(row[0])
        before = len(strategy_articles)
        strategy_articles = [a for a in strategy_articles if a["url"] not in existing_urls]
        print(f"  {before - len(strategy_articles)} already in DB, {len(strategy_articles)} new")

    total_chunks = 0
    articles_stored = 0

    for i, article in enumerate(strategy_articles[:args.max_articles]):
        print(f"  [{i+1}/{min(len(strategy_articles), args.max_articles)}] {article['title'][:60]}...")
        html = fetch_page(article["url"], session)
        if not html:
            continue

        data = extract_article_content(html)
        if not data["title"]:
            data["title"] = article["title"]

        chunks = store_article(conn, article["url"], data)
        if chunks > 0:
            total_chunks += chunks
            articles_stored += 1
            print(f"    Stored {chunks} chunks ({data['category']}/{data['article_type'] or 'general'})")
        else:
            print(f"    Skipped (already up to date or too short)")

    conn.close()
    print(f"\nDone! Stored {total_chunks} chunks from {articles_stored} articles.")


if __name__ == "__main__":
    main()
