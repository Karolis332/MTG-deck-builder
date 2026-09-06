"""Deterministic data gathering for the Orzhov repartee optimisation: deck cards + owned W/B Standard-legal
candidates straight from Scryfall (stdlib only). Output: decks/standard/orzhov-repartee-data.json"""
import csv, json, time, urllib.request, urllib.parse, sys
DECK = """4 Stirring Hopesinger|3 Plains|4 Scolding Administrator|3 Swamp|3 Lecturing Scornmage|2 Informed Inkwright|2 Requisition Raid|3 Snooping Page|2 The Soul Stone|3 Erode|2 Dissection Practice|2 Killian's Confidence|1 Bleachbone Verge|2 Godless Shrine|2 Abandoned Air Temple|1 Concealed Courtyard|3 Shattered Sanctum|3 Fabled Passage|3 Multiversal Passage|4 Bitter Triumph|2 Elite Interceptor|2 Cost of Brilliance|2 Dig Site Inventory|2 Conciliator's Duelist"""
COLLECTION = r"C:/Users/QuLeR/Downloads/collection.csv"
FIELDS = ["name","mana_cost","cmc","type_line","oracle_text","colors","color_identity","set","collector_number","rarity"]
def get(url, data=None):
    headers = {"User-Agent":"BlackGrimoire-deck-analysis/1.0", "Accept":"application/json"}
    if data: headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r: return json.loads(r.read())
def slim(c):
    d = {k: c.get(k) for k in FIELDS}
    if "card_faces" in c and not c.get("oracle_text"):
        d["oracle_text"] = " // ".join(f.get("oracle_text","") for f in c["card_faces"]); d["mana_cost"] = c["card_faces"][0].get("mana_cost")
    d["standard"] = c.get("legalities",{}).get("standard"); return d
deck = []
for entry in DECK.split("|"):
    qty, name = entry.split(" ", 1)
    c = get("https://api.scryfall.com/cards/named?exact=" + urllib.parse.quote(name)); time.sleep(0.11)
    deck.append({"quantity": int(qty), **slim(c)})
rows = list(csv.DictReader(open(COLLECTION, encoding="utf-8-sig")))
# Arena-style export: Id,Name,Set,Color,Rarity,Count,PrintCount — match Scryfall by exact name.
owned = {}
for r in rows:
    n = (r.get("Name") or "").strip()
    if n: owned[n] = owned.get(n, 0) + int(float(r.get("Count") or 0))
names = list(owned)
cands = {}; unresolved = []
for i in range(0, len(names), 75):
    batch = names[i:i+75]
    res = get("https://api.scryfall.com/cards/collection", {"identifiers": [{"name": n} for n in batch]}); time.sleep(0.11)
    unresolved += [x.get("name") for x in res.get("not_found", [])]
    for c in res.get("data", []):
        ci = set(c.get("color_identity", []))
        if c.get("legalities",{}).get("standard") != "legal" or not ci <= {"W","B"}: continue
        if "Basic Land" in c.get("type_line",""): continue
        cands[c["name"]] = {**slim(c), "quantity": owned.get(c["name"], 0)}
deck_names = {d["name"] for d in deck}
out = {"generated": time.strftime("%Y-%m-%d %H:%M"), "collection_rows": len(rows), "collection_distinct_names": len(names), "unresolved_names": unresolved[:50],
       "deck": deck, "owned_wb_standard_legal": sorted(cands.values(), key=lambda x: (-(x["name"] in deck_names), x["cmc"] or 0, x["name"]))}
json.dump(out, open("decks/standard/orzhov-repartee-data.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("deck cards", len(deck), "| owned W/B standard-legal distinct", len(cands), "| in-deck owned:", sum(1 for d in deck if d["name"] in cands or "Basic Land" in (d["type_line"] or "")))
