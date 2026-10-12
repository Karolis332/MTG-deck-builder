"""Focused tests for the 2026-09-27 VW fixes: pmf unpacking + data-sufficiency gate.

Every test must construct VWEngine against a throwaway model dir (tmp_path), never
the real VW_MODEL_DIR — that path is the shared prod volume (vwdata), and an
earlier version of this test file loaded and re-saved the live prod model as a
side effect of engine.close(). See app/services/vw_engine.py: VW_MODEL_DIR /
VW_MODEL_PATH are module-level constants read by _init_vw()/save_model() at call
time, so monkeypatching the module attributes before constructing VWEngine()
redirects both load and save.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from app.services import vw_engine as vw_engine_module
from app.services.vw_engine import VWEngine, VW_MIN_OUTCOMES


@pytest.fixture(autouse=True)
def isolated_vw_model_path(tmp_path, monkeypatch):
    """Redirect every VWEngine in this file to a tmp dir instead of the prod vwdata volume."""
    model_dir = str(tmp_path / "vw")
    monkeypatch.setattr(vw_engine_module, "VW_MODEL_DIR", model_dir)
    monkeypatch.setattr(vw_engine_module, "VW_MODEL_PATH", os.path.join(model_dir, "grimoire_cb.vw"))
    yield


def _candidates():
    return [
        {"card_name": "Sol Ring", "cmc": 1, "svd_score": 0.9},
        {"card_name": "Arcane Signet", "cmc": 1, "svd_score": 0.8},
        {"card_name": "Rhystic Study", "cmc": 3, "svd_score": 0.7},
    ]


def test_predict_gated_below_min_outcomes():
    """Below VW_MIN_OUTCOMES, predict() must not touch the pmf at all — uniform scores only."""
    engine = VWEngine()
    engine.outcome_count = 0
    assert not engine.sufficient_data
    ranked = engine.predict(
        commander="Atraxa", color_identity="WUBG", deck_cards=["Sol Ring"],
        candidates=_candidates(),
    )
    uniform = 1.0 / len(ranked)
    for c in ranked:
        assert c["vw_score"] == uniform
    engine.close()


def test_predict_unpacks_flat_pmf_list_of_floats():
    """workspace.predict() returns a flat list of floats (pmf in action order) for
    cb_explore_adf, not (action_idx, prob) pairs. Once the gate is open, predict()
    must not crash unpacking that shape, and must assign per-candidate scores."""
    engine = VWEngine()
    engine.outcome_count = VW_MIN_OUTCOMES  # gate open
    candidates = _candidates()

    class FakeWorkspace:
        def predict(self, example_str):
            return [0.6, 0.3, 0.1]

    engine.workspace = FakeWorkspace()
    ranked = engine.predict(
        commander="Atraxa", color_identity="WUBG", deck_cards=["Sol Ring"],
        candidates=candidates,
    )
    scores = {c["card_name"]: c["vw_score"] for c in ranked}
    assert scores == {"Sol Ring": 0.6, "Arcane Signet": 0.3, "Rhystic Study": 0.1}
    assert ranked[0]["card_name"] == "Sol Ring"  # sorted desc by vw_score
    engine.workspace = None  # FakeWorkspace has no save(); skip persisting on close
