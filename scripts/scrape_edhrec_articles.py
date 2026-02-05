#!/usr/bin/env python3
"""
Scrape EDHREC articles, chunk them, and store in SQLite with FTS5.

Usage:
    py scripts/scrape_edhrec_articles.py [--max-articles 100] [--db data/mtg-deck-builder.db]

Rate limits: 2s between requests to be respectful.
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

BASE_URL = "https://edhrec.com"
ARTICLES_URL = f"{BASE_URL}/articles"
RATE_LIMIT = 2.0  # seconds between requests
CHUNK_SIZE = 500   # words per chunk


def get_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create tables if they don't exist (in case migration hasn't run yet)."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS edhrec_knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_url TEXT NOT NULL,
            title TEXT NOT NULL,
            author TEXT,
            category TEXT,
            chunk_text TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content_hash TEXT,
            tags TEXT,
            fetched_at TEXT DEFAULT (datetime('now')),
            UNIQUE(source_url, chunk_index)
        );
    """)
    # Check if FTS table exists
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='edhrec_knowledge_fts'"
    ).fetchone()
    if not row:
        conn.executescript("""
            CREATE VIRTUAL TABLE IF NOT EXISTS edhrec_knowledge_fts
                USING fts5(title, chunk_text, tags, content='edhrec_knowledge', content_rowid='id');

            CREATE TRIGGER IF NOT EXISTS edhrec_knowledge_ai AFTER INSERT ON edhrec_knowledge BEGIN
                INSERT INTO edhrec_knowledge_fts(rowid, title, chunk_text, tags)
                VALUES (new.id, new.title, new.chunk_text, new.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS edhrec_knowledge_ad AFTER DELETE ON edhrec_knowledge BEGIN
                INSERT INTO edhrec_knowledge_fts(edhrec_knowledge_fts, rowid, title, chunk_text, tags)
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


def get_article_links(session: requests.Session, max_pages: int = 5) -> list[dict]:
    """Scrape article listing pages to collect article URLs."""
    articles = []
    seen_urls = set()

    for page in range(1, max_pages + 1):
        url = f"{ARTICLES_URL}" if page == 1 else f"{ARTICLES_URL}?page={page}"
        print(f"  Fetching article listing page {page}...")
        html = fetch_page(url, session)
        if not html:
            break

        soup = BeautifulSoup(html, "html.parser")

        # EDHREC uses various article card layouts — look for links with /articles/ path
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if "/articles/" not in href or href == "/articles/":
                continue
            if not href.startswith("http"):
                href = BASE_URL + href

            if href in seen_urls:
                continue
            seen_urls.add(href)

            title = a_tag.get_text(strip=True)
            if not title or len(title) < 5:
                # Try parent element for title
                parent = a_tag.find_parent(["div", "article"])
                if parent:
                    h_tag = parent.find(["h1", "h2", "h3", "h4"])
                    if h_tag:
                        title = h_tag.get_text(strip=True)

            if title and len(title) > 5:
                articles.append({"url": href, "title": title})

        if len(articles) == 0:
            # If no articles found on first page, the HTML structure may have changed
            print("  [WARN] No article links found — EDHREC HTML structure may have changed")
            break

    return articles


def extract_article_content(html: str) -> dict:
    """Extract article body text, author, and category from article HTML."""
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

    # Extract main content — look for article body
    content_el = (
        soup.find("article")
        or soup.find(class_=re.compile(r"article.?body|post.?content|entry.?content", re.I))
        or soup.find("main")
    )

    if not content_el:
        # Fallback: grab all paragraph text
        paragraphs = soup.find_all("p")
        body = "\n\n".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20)
    else:
        # Remove script/style tags
        for tag in content_el.find_all(["script", "style", "nav", "footer"]):
            tag.decompose()
        body = content_el.get_text(separator="\n", strip=True)

    # Detect category from URL or content
    category = "guide"
    lower_body = body.lower()[:500]
    if "strategy" in lower_body or "how to" in lower_body:
        category = "strategy"
    elif "meta" in lower_body or "metagame" in lower_body:
        category = "meta"
    elif "archetype" in lower_body or "build" in lower_body:
        category = "archetype"

    # Extract tags from any tag elements
    tags = []
    tag_els = soup.find_all(class_=re.compile(r"tag", re.I))
    for el in tag_els:
        tag_text = el.get_text(strip=True)
        if tag_text and len(tag_text) < 50:
            tags.append(tag_text)

    return {
        "title": title,
        "author": author,
        "category": category,
        "body": body,
        "tags": tags,
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


def store_article(conn: sqlite3.Connection, url: str, data: dict):
    """Chunk and store an article. Skip if content hash matches existing."""
    body = data["body"]
    if not body or len(body) < 100:
        return 0

    full_hash = content_hash(body)

    # Check if we already have this exact content
    existing = conn.execute(
        "SELECT content_hash FROM edhrec_knowledge WHERE source_url = ? AND chunk_index = 0",
        (url,)
    ).fetchone()
    if existing and existing[0] == full_hash:
        return 0  # No change

    # Delete old chunks if re-scraping
    conn.execute("DELETE FROM edhrec_knowledge WHERE source_url = ?", (url,))

    chunks = chunk_text(body)
    tags_json = json.dumps(data["tags"]) if data["tags"] else None

    inserted = 0
    for i, chunk in enumerate(chunks):
        conn.execute(
            """INSERT OR REPLACE INTO edhrec_knowledge
               (source_url, title, author, category, chunk_text, chunk_index, content_hash, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (url, data["title"], data["author"], data["category"],
             chunk, i, full_hash if i == 0 else None, tags_json)
        )
        inserted += 1

    conn.commit()
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Scrape EDHREC articles into SQLite")
    parser.add_argument("--max-articles", type=int, default=100,
                        help="Maximum number of articles to scrape")
    parser.add_argument("--db", type=str, default="data/mtg-deck-builder.db",
                        help="Path to SQLite database")
    parser.add_argument("--max-pages", type=int, default=5,
                        help="Max listing pages to scan")
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

    print(f"Scraping EDHREC articles (max {args.max_articles})...")
    articles = get_article_links(session, max_pages=args.max_pages)
    print(f"  Found {len(articles)} article links")

    total_chunks = 0
    articles_stored = 0

    for i, article in enumerate(articles[:args.max_articles]):
        print(f"  [{i+1}/{min(len(articles), args.max_articles)}] {article['title'][:60]}...")
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
            print(f"    Stored {chunks} chunks")
        else:
            print(f"    Skipped (already up to date)")

    conn.close()
    print(f"\nDone! Stored {total_chunks} chunks from {articles_stored} articles.")


if __name__ == "__main__":
    main()
