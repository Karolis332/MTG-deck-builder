select string_agg(table_name, ',' order by table_name) from information_schema.tables where table_schema='public';
select table_name, string_agg(column_name||':'||data_type, ',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name in ('evaluation_results','training_log','decks','model_artifacts','card_popularity') group by 1;
