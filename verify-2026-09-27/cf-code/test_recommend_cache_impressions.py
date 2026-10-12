"""Cache-hit path must log rec_impressions when log_impressions is true (default),
and must not when the caller passes log_impressions=false.

No VWEngine is constructed in this file, so no VW_MODEL_DIR isolation is needed —
see tests/test_vw_engine_fixes.py for that concern.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.db.database import get_session
from app.main import app
from app.services.cf_engine import CFEngine


class FakeResult:
    def __init__(self, rows=None, scalar_value=None):
        self._rows = rows or []
        self._scalar_value = scalar_value

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def scalar(self):
        return self._scalar_value


class FakeSession:
    """Answers by SQL shape: cached_recommendations SELECT -> canned cache hit rows;
    rec_impressions INSERT -> recorded, no-op; anything else (deck count) -> 0."""

    def __init__(self, cached_rows):
        self._cached_rows = cached_rows
        self.impression_inserts = []

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        if "FROM cached_recommendations" in sql:
            return FakeResult(rows=self._cached_rows)
        if "INSERT INTO rec_impressions" in sql:
            self.impression_inserts.append(params)
            return FakeResult()
        return FakeResult(scalar_value=0)

    async def commit(self):
        pass


CACHED_ROWS = [
    ("Sol Ring", 0.9, 12, "Found in 12 similar decks"),
    ("Arcane Signet", 0.8, 9, "Found in 9 similar decks"),
]


@pytest.fixture
def client():
    engine = MagicMock(spec=CFEngine)
    engine.model_version = "test-v1"
    app.state.cf_engine = engine
    app.state.vw_engine = None
    return TestClient(app, raise_server_exceptions=False)


def _post(client, session, log_impressions=None):
    body = {"cards": ["Sol Ring"], "commander": "Kadena, Slinking Sorcerer"}
    if log_impressions is not None:
        body["log_impressions"] = log_impressions

    async def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        return client.post("/recommend", json=body)
    finally:
        app.dependency_overrides.pop(get_session, None)


def test_cache_hit_default_logs_impressions(client):
    session = FakeSession(CACHED_ROWS)
    resp = _post(client, session)
    assert resp.status_code == 200
    assert len(session.impression_inserts) == len(CACHED_ROWS)
    assert session.impression_inserts[0]["card"] == "Sol Ring"
    assert session.impression_inserts[0]["src"] == "cache"


def test_cache_hit_flag_false_skips_impressions(client):
    session = FakeSession(CACHED_ROWS)
    resp = _post(client, session, log_impressions=False)
    assert resp.status_code == 200
    assert session.impression_inserts == []
