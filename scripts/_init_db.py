#!/usr/bin/env python3
"""Initialize the SQLite database with all migrations from schema.ts."""

import sqlite3
import os
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "data" / "mtg-deck-builder.db"
SCHEMA_PATH = PROJECT_ROOT / "src" / "db" / "schema.ts"


def extract_migrations(schema_ts: str) -> list[tuple[int, str, str]]:
    """Extract migrations from the TypeScript schema file."""
    migrations = []
    # Match each migration block
    pattern = re.compile(
        r"version:\s*(\d+),\s*\n\s*name:\s*'([^']+)',\s*\n\s*sql:\s*`(.*?)`",
        re.DOTALL,
    )
    for m in pattern.finditer(schema_ts):
        version = int(m.group(1))
        name = m.group(2)
        sql = m.group(3)
        migrations.append((version, name, sql))
    return migrations


def main():
    os.makedirs(DB_PATH.parent, exist_ok=True)

    schema_text = SCHEMA_PATH.read_text(encoding="utf-8")
    migrations = extract_migrations(schema_text)
    print(f"Found {len(migrations)} migrations in schema.ts")

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()

    for version, name, sql in migrations:
        existing = conn.execute(
            "SELECT version FROM _migrations WHERE version = ?", (version,)
        ).fetchone()
        if existing:
            print(f"  Skip migration {version}: {name} (already applied)")
            continue

        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if not stmt:
                continue
            # Skip trigger creation that references FTS content table
            # (triggers are in the SQL but need the base table first)
            try:
                conn.execute(stmt)
            except Exception as e:
                print(f"  Warning in migration {version} ({name}): {e}")

        conn.execute(
            "INSERT INTO _migrations (version, name) VALUES (?, ?)", (version, name)
        )
        conn.commit()
        print(f"  Applied migration {version}: {name}")

    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    print(f"\nDatabase ready at {DB_PATH}")
    print(f"Tables ({len(tables)}): {', '.join(t[0] for t in tables)}")
    conn.close()


if __name__ == "__main__":
    main()
