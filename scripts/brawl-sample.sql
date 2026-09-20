-- Stratified Historic Brawl (Arena 100-card, 1v1) sample from the CF Postgres (VPS, read-only): 300 commanders (top 100 / 100 of ranks 101-1000 / 100 of ranks 1001-5000), 10 most recent 99-101-card decks each. Corpus 2026-09-20: 11,281 historicBrawl decks, 1,635 commanders, 11,246 at card_count 100 (Arena Brawl is 100 cards, so Vivi's `brawl` bands come from here, not from Commander).
-- Run: docker cp this grimoire-cf-api-postgres-1:/tmp/sample.sql && docker exec … psql -U grimoire -d grimoire_cf -f /tmp/sample.sql → /tmp/brawl-sample.csv (local copy verify-2026-09-20/brawl-sample.csv, untracked).
\timing off
\pset footer off
create temp table cmd as
  select commander_name, count(*) as n from decks
  where format = 'historicBrawl' and commander_name is not null and card_count between 99 and 101
  group by 1;
create temp table picked as
  (select commander_name from cmd order by n desc limit 100)
  union all
  (select commander_name from (select commander_name from cmd order by n desc offset 100 limit 900) s order by random() limit 100)
  union all
  (select commander_name from (select commander_name from cmd order by n desc offset 1000 limit 4000) s order by random() limit 100);
create temp table sample_decks as
  select p.commander_name, d.id
  from picked p
  cross join lateral (
    select id from decks d
    where d.commander_name = p.commander_name and d.format = 'historicBrawl' and d.card_count between 99 and 101
    order by d.updated_at desc limit 10
  ) d;
\copy (select sd.id as deck_id, sd.commander_name as commander, dc.card_name, dc.board, dc.quantity from sample_decks sd join deck_cards dc on dc.deck_id = sd.id) to '/tmp/brawl-sample.csv' with (format csv, header true)
select count(*) as decks from sample_decks;
