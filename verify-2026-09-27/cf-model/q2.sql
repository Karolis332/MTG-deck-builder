\echo == eval summary
select count(*), min(evaluated_at), max(evaluated_at), count(distinct evaluated_at::date) from evaluation_results;
\echo == eval runs (date|k|metric|avg|partitions|sum_n_test|sum_n_train)
select evaluated_at::date, k, metric_name, round(avg(metric_value)::numeric,4), count(distinct partition), sum(n_test_decks), sum(n_train_decks) from evaluation_results group by 1,2,3 order by 1,3,2;
\echo == training_log last 12
select created_at, trigger, deck_count_before, deck_count_after, new_decks_since_last, partitions_trained, total_decks_trained, round(duration_s::numeric), status, left(coalesce(error_message,''),60) from training_log order by created_at desc limit 12;
\echo == artifacts
select artifact_type, count(*), max(created_at), sum(n_decks), max(n_cards) from model_artifacts group by 1;
\echo == bandit cols
select table_name, string_agg(column_name||':'||data_type, ',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name in ('rec_impressions','rec_outcomes','cached_recommendations') group by 1;
