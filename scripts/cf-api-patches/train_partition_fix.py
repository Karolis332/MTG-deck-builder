"""
Patch for cf_engine.py train_partition method.
Apply to /opt/grimoire-cf-api/app/services/cf_engine.py

Changes:
1. Add MAX_DECKS_PER_PARTITION = 80_000 — large partitions get random-sampled
2. This prevents OOM on the "C" (colorless) partition which has 220K+ decks
"""

# Add this constant near the top of cf_engine.py, after the imports:
# MAX_DECKS_PER_PARTITION = 80_000

# In train_partition, after fetching deck_ids and before the min check,
# add the sampling logic. The patched section looks like this:

PATCH_AFTER_DECK_IDS_FETCH = '''
        deck_ids = [row[0] for row in decks_result]

        if len(deck_ids) < self.settings.min_decks_per_partition:
            logger.info(f"Skipping {color_identity}: only {len(deck_ids)} decks (min {self.settings.min_decks_per_partition})")
            return None

        # Cap large partitions to prevent OOM — sample randomly
        MAX_DECKS = 80_000
        if len(deck_ids) > MAX_DECKS:
            import random
            logger.info(f"  Sampling {MAX_DECKS} from {len(deck_ids)} decks for {color_identity} (OOM prevention)")
            deck_ids = sorted(random.sample(deck_ids, MAX_DECKS))
'''
