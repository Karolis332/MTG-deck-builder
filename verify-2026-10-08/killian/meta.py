"""Source badges for the check page: py verify-2026-10-08/killian/meta.py <list.txt> -> <list>.meta.json (SQ precon / loose)."""
import json, pathlib, re, sys
R = pathlib.Path(__file__).resolve().parents[2]
lst = pathlib.Path(sys.argv[1])
sq = {re.sub(r"^\d+\s+", "", l.strip()) for l in (R / "verify-2026-10-08/best-deck/origins/silverquill-precon.txt").read_text(encoding="utf-8").splitlines() if l.strip()}
names = [re.sub(r"^\d+\s+", "", l.strip()) for l in lst.read_text(encoding="utf-8").splitlines() if re.match(r"^\d+\s", l)]
cards = {n: {"from": "Silverquill Influence precon (SOC, in hand)" if n in sq and n not in ("Plains", "Swamp") else "loose", "roles": [], "candidates": 0, "backups": []} for n in names}
lst.with_suffix(".meta.json").write_text(json.dumps({"cards": cards}, indent=1), encoding="utf-8")
print(lst.name, "SQ", sum(v["from"] != "loose" for v in cards.values()), "loose", sum(v["from"] == "loose" for v in cards.values()))
