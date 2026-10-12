\echo == impressions per day (last 8d) | day|impr|distinct deck_hash|vw_score nonnull
select created_at::date, count(*), count(distinct deck_hash), count(vw_score) from rec_impressions where created_at >= now()-interval '8 days' group by 1 order by 1;
\echo == outcomes per day by type (last 8d)
select created_at::date, event_type, count(*), round(avg(reward)::numeric,3) from rec_outcomes where created_at >= now()-interval '8 days' group by 1,2 order by 1,2;
\echo == all-time impressions|outcomes|first impr|last impr|last outcome
select (select count(*) from rec_impressions),(select count(*) from rec_outcomes),(select min(created_at) from rec_impressions),(select max(created_at) from rec_impressions),(select max(created_at) from rec_outcomes);
\echo == impressions 7d by source|model_version
select source, model_version, count(*) from rec_impressions where created_at >= now()-interval '7 days' group by 1,2 order by 3 desc limit 8;
\echo == outcomes 7d joined to an impression (same deck_hash+card)
select count(*) from rec_outcomes o where o.created_at >= now()-interval '7 days' and exists (select 1 from rec_impressions i where i.deck_hash=o.deck_hash and i.card_name=o.card_name);
