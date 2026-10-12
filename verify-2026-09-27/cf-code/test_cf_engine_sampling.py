"""Focused test for the 2026-09-27 stable-sampling fix (replaces unseeded random.sample)."""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.cf_engine import stable_sample_deck_ids


def test_stable_sample_is_deterministic_across_process_order():
    deck_ids = list(range(1, 1001))
    a = stable_sample_deck_ids(deck_ids, 300)
    shuffled = deck_ids[:]
    random.shuffle(shuffled)
    b = stable_sample_deck_ids(shuffled, 300)
    assert a == b
    assert len(a) == 300


def test_stable_sample_is_stable_under_new_arrivals():
    """Adding new decks should only ever swap out decks that hash higher than a newcomer —
    not reshuffle the whole sampled set (the random.sample bug this replaces)."""
    base = list(range(1, 1001))
    before = set(stable_sample_deck_ids(base, 300))
    after = set(stable_sample_deck_ids(base + list(range(1001, 1051)), 300))
    overlap = len(before & after)
    assert overlap >= 250, f"expected high overlap after adding 50 decks, got {overlap}/300"


def test_stable_sample_noop_under_cap():
    deck_ids = [5, 3, 1, 4, 2]
    assert stable_sample_deck_ids(deck_ids, 10) == [1, 2, 3, 4, 5]


if __name__ == "__main__":
    test_stable_sample_is_deterministic_across_process_order()
    test_stable_sample_is_stable_under_new_arrivals()
    test_stable_sample_noop_under_cap()
    print("OK")
