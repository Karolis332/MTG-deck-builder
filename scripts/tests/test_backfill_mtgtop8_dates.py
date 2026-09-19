import os
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backfill_mtgtop8_dates import parse_event_date, undated_event_ids, update_event  # noqa: E402

# Trimmed real mtgtop8 event page fragment (from event?e=79819&f=ST, 2026-09-19).
EVENT_PAGE_HTML = """
<div class=S14 align=center style="background:white;margin-bottom:4px;">
  <div class=meta_arch style="padding:2px;">Standard</div>
  <div style="margin-bottom:5px;">252 players - 01/02/26</div>
</div>
"""

NO_DATE_HTML = "<div>Event not found</div>"


def test_parse_event_date():
    assert parse_event_date(EVENT_PAGE_HTML) == "2026-02-01"


def test_parse_event_date_missing():
    assert parse_event_date(NO_DATE_HTML) is None


def make_fixture_db():
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE community_decks (id INTEGER PRIMARY KEY, source TEXT, "
        "source_id TEXT, format TEXT, event_date TEXT)"
    )
    conn.executemany(
        "INSERT INTO community_decks (source, source_id, format, event_date) VALUES (?, ?, ?, ?)",
        [
            ("mtgtop8", "e1_d1", "standard", None),
            ("mtgtop8", "e1_d2", "standard", None),
            ("mtgtop8", "e2_d1", "standard", "2026-01-01"),  # already dated
        ],
    )
    conn.commit()
    return conn


def test_undated_event_ids_excludes_already_dated():
    conn = make_fixture_db()
    assert undated_event_ids(conn, "standard") == ["1"]


def test_update_event_only_touches_matching_undated_rows():
    conn = make_fixture_db()
    n = update_event(conn, "1", "2026-02-01")
    assert n == 2
    rows = conn.execute("SELECT source_id, event_date FROM community_decks ORDER BY id").fetchall()
    assert rows == [
        ("e1_d1", "2026-02-01"),
        ("e1_d2", "2026-02-01"),
        ("e2_d1", "2026-01-01"),  # untouched
    ]
    assert update_event(conn, "1", "2026-02-01") == 0  # re-run: nothing left undated
