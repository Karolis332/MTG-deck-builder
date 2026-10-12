path = 'scripts/evaluate.py'
with open(path) as f:
    s = f.read()
orig = s

old_loop = '''        results = []
        cmd_cache: dict = {}
        for ci in partitions:
            try:
                res = await evaluate_partition(session, engine, ci, k_values, baseline=baseline, staple_threshold=staple_threshold, commander_blend=commander_blend, cmd_cache=cmd_cache)
            except Exception as e:
                logger.error(f"  {ci}: evaluation failed: {e}")
                engine.models.pop(ci, None)
                continue
            if res:
                results.append(res)
'''
new_loop = '''        results = []
        cmd_cache: dict = {}
        do_incremental_save = save_to_db and not baseline
        for ci in partitions:
            try:
                res = await evaluate_partition(session, engine, ci, k_values, baseline=baseline, staple_threshold=staple_threshold, commander_blend=commander_blend, cmd_cache=cmd_cache)
            except Exception as e:
                logger.error(f"  {ci}: evaluation failed: {e}")
                engine.models.pop(ci, None)
                continue
            if res:
                results.append(res)
                if do_incremental_save:
                    # Save + commit per partition so a timeout partway through
                    # a long run still persists everything finished so far,
                    # instead of losing the whole run (previously only inserted
                    # after every partition completed).
                    await _save_partition_results(session, res, k_values)
                    await session.commit()
                    logger.info(f"  {ci}: saved to evaluation_results")
'''
assert old_loop in s, 'loop block not found'
s = s.replace(old_loop, new_loop, 1)

old_save_block = '''        if save_to_db and baseline:
            logger.warning("--save ignored for --baseline (evaluation_results has no method column; baseline is a one-off reference)")
        elif save_to_db:
            logger.info("\\nSaving results to evaluation_results table...")
            for res in results:
                for k in k_values:
                    rows = [(mn, mv, res["n_test_decks"]) for mn, mv in res["metrics"][k].items()]
                    rows += [(mn + "_ns", mv, res.get("n_test_ns", 0))
                             for mn, mv in res.get("metrics_ns", {}).get(k, {}).items()]
                    for metric_name, metric_value, n_test in rows:
                        await session.execute(
                            text("""
                                INSERT INTO evaluation_results
                                    (partition, k, metric_name, metric_value, n_test_decks, n_train_decks)
                                VALUES (:p, :k, :mn, :mv, :nt, :ntr)
                            """),
                            {
                                "p": res["partition"], "k": k,
                                "mn": metric_name, "mv": metric_value,
                                "nt": n_test, "ntr": res["n_train_decks"],
                            },
                        )
            await session.commit()
            logger.info("  -> Saved")
'''
new_save_block = '''        if save_to_db and baseline:
            logger.warning("--save ignored for --baseline (evaluation_results has no method column; baseline is a one-off reference)")
        elif save_to_db:
            logger.info(f"\\n  -> Saved {len(results)} partition(s) to evaluation_results incrementally")
'''
assert old_save_block in s, 'save block not found'
s = s.replace(old_save_block, new_save_block, 1)

old_run_def = 'async def run(k_values, save_to_db, partition_filter, max_partitions, seed, baseline=False, staple_threshold=STAPLE_THRESHOLD, commander_blend=False):'
helper = '''async def _save_partition_results(session, res, k_values):
    """Insert one partition's evaluation_results rows (same schema/values as the old bulk save)."""
    for k in k_values:
        rows = [(mn, mv, res["n_test_decks"]) for mn, mv in res["metrics"][k].items()]
        rows += [(mn + "_ns", mv, res.get("n_test_ns", 0))
                 for mn, mv in res.get("metrics_ns", {}).get(k, {}).items()]
        for metric_name, metric_value, n_test in rows:
            await session.execute(
                text("""
                    INSERT INTO evaluation_results
                        (partition, k, metric_name, metric_value, n_test_decks, n_train_decks)
                    VALUES (:p, :k, :mn, :mv, :nt, :ntr)
                """),
                {
                    "p": res["partition"], "k": k,
                    "mn": metric_name, "mv": metric_value,
                    "nt": n_test, "ntr": res["n_train_decks"],
                },
            )


''' + old_run_def
assert old_run_def in s
s = s.replace(old_run_def, helper, 1)

assert s != orig
with open(path, 'w') as f:
    f.write(s)
print('patched OK')
