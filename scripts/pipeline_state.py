#!/usr/bin/env python3
"""
Pipeline failure state tracker.

Persists per-step failure counts and skip-until timestamps across pipeline runs.
Used by pipeline.py to implement automatic fallback after 3 consecutive failures.

State file: data/pipeline_failures.json
"""

import json
import os
from datetime import datetime, timedelta

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
STATE_FILE = os.path.join(PROJECT_DIR, "data", "pipeline_failures.json")

# After this many consecutive cross-run failures, skip the step for SKIP_HOURS
FAILURE_THRESHOLD = 3
SKIP_HOURS = 24


class PipelineState:
    """Tracks per-step failure history across pipeline runs."""

    def __init__(self, state_file: str = STATE_FILE):
        self.state_file = state_file
        self._state = self._load()

    def _load(self) -> dict:
        if not os.path.exists(self.state_file):
            return {}
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(self._state, f, indent=2, default=str)
        except Exception as e:
            print(f"  [state] Warning: could not save state: {e}")

    def _entry(self, step: str) -> dict:
        if step not in self._state:
            self._state[step] = {
                "consecutive_failures": 0,
                "total_failures": 0,
                "total_runs": 0,
                "last_success": None,
                "last_failure": None,
                "skip_until": None,
            }
        return self._state[step]

    def record_success(self, step: str):
        e = self._entry(step)
        e["consecutive_failures"] = 0
        e["total_runs"] += 1
        e["last_success"] = datetime.now().isoformat()
        e["skip_until"] = None  # clear any skip
        self._save()

    def record_failure(self, step: str):
        e = self._entry(step)
        e["consecutive_failures"] += 1
        e["total_failures"] += 1
        e["total_runs"] += 1
        e["last_failure"] = datetime.now().isoformat()

        # Activate degraded mode if threshold reached
        if e["consecutive_failures"] >= FAILURE_THRESHOLD:
            skip_until = datetime.now() + timedelta(hours=SKIP_HOURS)
            e["skip_until"] = skip_until.isoformat()
            print(f"  [state] '{step}' failed {e['consecutive_failures']}x in a row — "
                  f"degraded mode until {skip_until.strftime('%Y-%m-%d %H:%M')}")
        self._save()

    def is_degraded(self, step: str) -> bool:
        """Return True if the step should be skipped due to repeated failures."""
        e = self._entry(step)
        skip_until_str = e.get("skip_until")
        if not skip_until_str:
            return False
        try:
            skip_until = datetime.fromisoformat(skip_until_str)
            if datetime.now() < skip_until:
                remaining_h = (skip_until - datetime.now()).total_seconds() / 3600
                print(f"  [state] '{step}' degraded — skipping ({remaining_h:.1f}h remaining)")
                return True
            # Expired: reset
            e["skip_until"] = None
            e["consecutive_failures"] = 0
            self._save()
            return False
        except Exception:
            return False

    def consecutive_failures(self, step: str) -> int:
        return self._entry(step).get("consecutive_failures", 0)

    def summary(self) -> dict:
        """Return dict with degraded / at_risk / healthy step lists."""
        degraded, at_risk, healthy = [], [], []
        for step, e in self._state.items():
            cf = e.get("consecutive_failures", 0)
            skip_until = e.get("skip_until")
            active_skip = False
            if skip_until:
                try:
                    active_skip = datetime.now() < datetime.fromisoformat(skip_until)
                except Exception:
                    pass
            if active_skip:
                degraded.append(step)
            elif cf >= 2:
                at_risk.append(step)
            else:
                healthy.append(step)
        return {"degraded": degraded, "at_risk": at_risk, "healthy": healthy}

    def reset_step(self, step: str):
        """Manually clear degraded state for a step (use from CLI)."""
        if step in self._state:
            self._state[step]["consecutive_failures"] = 0
            self._state[step]["skip_until"] = None
        self._save()
        print(f"  [state] Reset '{step}'")
