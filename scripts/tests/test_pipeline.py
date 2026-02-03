"""Tests for pipeline.py — orchestration logic."""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pipeline import STEPS, run_step


class TestStepsConfig:
    def test_all_steps_have_required_keys(self):
        for step in STEPS:
            assert "name" in step
            assert "label" in step
            assert "script" in step
            assert "args" in step

    def test_step_names_unique(self):
        names = [s["name"] for s in STEPS]
        assert len(names) == len(set(names))

    def test_correct_step_order(self):
        names = [s["name"] for s in STEPS]
        # mtgjson must come before edhrec (needs subtypes)
        assert names.index("mtgjson") < names.index("edhrec")
        # aggregate must come before analyze
        assert names.index("aggregate") < names.index("analyze")
        # train must come before predict
        assert names.index("train") < names.index("predict")


class TestRunStep:
    def test_dry_run_returns_true(self):
        # Use an existing script so the file-exists check passes
        step = {"name": "test", "label": "Test", "script": "analyze_meta.py", "args": []}
        result = run_step(step, "/tmp/fake.db", dry_run=True)
        assert result is True

    def test_missing_script_returns_false(self):
        step = {"name": "test", "label": "Test", "script": "definitely_not_a_script.py", "args": []}
        result = run_step(step, "/tmp/fake.db", dry_run=False)
        assert result is False
