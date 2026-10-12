path = 'app/services/cf_engine.py'
with open(path) as f:
    s = f.read()
orig = s

old = '''        # Cap large partitions to prevent OOM - deterministic stable sample.
        # Keep the MAX_DECKS deck_ids with the smallest stable hash. Unlike an
        # unseeded random.sample (~52% top-20 churn per retrain on noise
        # alone), this only swaps a deck out when a newly-arrived deck hashes
        # lower than it — the sampled set is stable across retrains.
        MAX_DECKS = 30_000
        if len(deck_ids) > MAX_DECKS:
            logger.info(f"  Sampling {MAX_DECKS} from {len(deck_ids)} decks for {color_identity} (OOM prevention, stable hash)")
            deck_ids = sorted(
                deck_ids,
                key=lambda d: hashlib.sha1(str(d).encode()).hexdigest(),
            )[:MAX_DECKS]
            deck_ids = sorted(deck_ids)
'''
new = '''        # Cap large partitions to prevent OOM - deterministic stable sample.
        MAX_DECKS = 30_000
        if len(deck_ids) > MAX_DECKS:
            logger.info(f"  Sampling {MAX_DECKS} from {len(deck_ids)} decks for {color_identity} (OOM prevention, stable hash)")
            deck_ids = stable_sample_deck_ids(deck_ids, MAX_DECKS)
'''
assert old in s, 'sampling block not found for extraction'
s = s.replace(old, new, 1)

# Add the extracted pure function near the top, after imports (right before the class or a top-level helper spot).
marker = 'class CFEngine'
helper = '''def stable_sample_deck_ids(deck_ids: list[int], max_decks: int) -> list[int]:
    """Deterministically cap a deck-id list to max_decks.

    Keeps the ids with the smallest stable hash. Unlike an unseeded
    random.sample (~52% top-20 churn per retrain on noise alone), a retrain
    only swaps a deck out when a newly-arrived deck hashes lower than it, so
    the sampled set — and the recommendations trained on it — is stable
    across retrains.
    """
    if len(deck_ids) <= max_decks:
        return sorted(deck_ids)
    ranked = sorted(deck_ids, key=lambda d: hashlib.sha1(str(d).encode()).hexdigest())
    return sorted(ranked[:max_decks])


''' + marker
assert marker in s
s = s.replace(marker, helper, 1)

assert s != orig
with open(path, 'w') as f:
    f.write(s)
print('patched OK')
