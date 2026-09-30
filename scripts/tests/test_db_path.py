"""Unit L: classify_lands.py / fetch_mtgjson.py resolve the DB like db.ts — --db > MTG_DB_DIR > APPDATA > repo."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import classify_lands  # noqa: E402
import fetch_mtgjson  # noqa: E402


def test_classify_lands_honours_mtg_db_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("MTG_DB_DIR", str(tmp_path))
    assert os.path.normpath(classify_lands._default_db()) == os.path.normpath(str(tmp_path / "mtg-deck-builder.db"))


def test_fetch_mtgjson_honours_mtg_db_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("MTG_DB_DIR", str(tmp_path))
    assert os.path.normpath(str(fetch_mtgjson._default_db())) == os.path.normpath(str(tmp_path / "mtg-deck-builder.db"))


def test_appdata_fallback_when_env_unset(monkeypatch, tmp_path):
    monkeypatch.delenv("MTG_DB_DIR", raising=False)
    app = tmp_path / "the-black-grimoire" / "data"
    app.mkdir(parents=True)
    (app / "mtg-deck-builder.db").write_bytes(b"")
    monkeypatch.setenv("APPDATA", str(tmp_path))
    assert os.path.normpath(classify_lands._default_db()) == os.path.normpath(str(app / "mtg-deck-builder.db"))
    assert os.path.normpath(str(fetch_mtgjson._default_db())) == os.path.normpath(str(app / "mtg-deck-builder.db"))
