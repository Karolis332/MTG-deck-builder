\echo == decks scraped since 09-20 by day|source|format
select scraped_at::date, source, format, count(*) from decks where scraped_at >= '2026-09-20' group by 1,2,3 order by 1,2,3;
\echo == since 09-24 16:07 (last SVD) by source|format
select source, format, count(*) from decks where scraped_at >= '2026-09-24 16:07:42+00' group by 1,2 order by 3 desc;
\echo == totals by format
select format, count(*) from decks group by 1 order by 2 desc;
\echo == commander partitions: n_partitions|over_30k|decks_in_over_30k|sampled_share
select count(*), count(*) filter (where n>30000), sum(n) filter (where n>30000), round(1 - (30000.0*count(*) filter (where n>30000))/nullif(sum(n) filter (where n>30000),0),3) from (select color_identity, count(*) n from decks where format='commander' group by 1) t;
