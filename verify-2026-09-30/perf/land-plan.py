# EXPLAIN QUERY PLAN + timing for the land query at base (c.name join) vs tip (normalized join).
import sqlite3, time, sys
db = sqlite3.connect('C:/Users/QuLeR/AppData/Local/Temp/perf-db/mtg-deck-builder.db')
N = lambda col: f"(CASE WHEN {col} LIKE 'A-%' THEN substr({col}, 3) ELSE {col} END)"
owned_tip = f"""SELECT DISTINCT {N('c.name')} AS cname FROM collection col JOIN cards c ON col.card_id = c.id
  WHERE col.user_id = 1 AND col.source = 'arena'
  UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp' UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'"""
owned_base = """SELECT DISTINCT c2.name AS cname FROM collection col2 JOIN cards c2 ON col2.card_id = c2.id
  UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp' UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'"""
def q(join):
    return f"""SELECT c.*, lc.land_category, lc.tier FROM cards c {join}
    LEFT JOIN land_classifications lc ON lc.card_id = c.id
    WHERE c.type_line LIKE '%Land%' AND c.type_line NOT LIKE '%Basic%'
    AND json_extract(c.legalities, '$.brawl') IN ('legal', 'restricted')
    ORDER BY lc.tier ASC NULLS LAST, c.edhrec_rank ASC NULLS LAST LIMIT 1000"""
variants = {
  'base': q(f"INNER JOIN ({owned_base}) owned ON c.name = owned.cname"),
  'tip': q(f"INNER JOIN ({owned_tip}) owned ON {N('c.name')} = owned.cname"),
  'tip-IN': q(f"INNER JOIN ({owned_tip}) owned ON c.name IN (owned.cname, 'A-' || owned.cname)"),
  'tip-semi': q(f"INNER JOIN (SELECT 1) owned ON {N('c.name')} IN (SELECT cname FROM ({owned_tip}))"),
  'tip+CROSS': q(f"CROSS JOIN ({owned_tip}) owned ON 1") .replace("WHERE c.type_line", f"WHERE {N('c.name')} = owned.cname AND c.type_line"),
}
for k in sys.argv[1:] or variants:
    sql = variants[k]
    print('==', k)
    for r in db.execute('EXPLAIN QUERY PLAN ' + sql): print('  ', r[3])
    t = time.time(); n = len(db.execute(sql).fetchall()); print(f'  rows {n} {time.time()-t:.2f}s')
