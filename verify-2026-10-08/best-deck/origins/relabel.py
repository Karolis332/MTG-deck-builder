"""Relabel 'loose collection' origins in beledros-backups.json with the physical box the card was registered from
(precon lists recovered from git; first match wins in this order). Scores are untouched, so no re-run is needed.
  py verify-2026-10-08/best-deck/origins/relabel.py
"""
import json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
JSON = HERE.parent / "beledros-backups.json"
ORIGINS = [  # label (first word = the tile badge), list file
    ("Omo precon (Tricky Terrain box, dismantled 2026-10-07)", "omo-precon.txt"),
    ("Witherbloom Witchcraft precon leftovers (registered 2026-09-09)", "witherbloom-precon-leftovers.txt"),
    ("Quandrix precon leftovers (Tam build, 2026-10-02)", "quandrix-precon.txt"),
    ("Silverquill precon leftovers (Tam build, 2026-10-02)", "silverquill-precon.txt"),
    ("OTJ box (Outlaws of Thunder Junction, 2026-09-08)", "otj-box.txt"),
]


def names(path: pathlib.Path) -> set[str]:
    out: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^(\d+)x?\s+(.+?)\s*(\([A-Z0-9]{3,4}\)\s*\d*)?$", line.strip())
        if m:
            out.add(m.group(2).strip())
            out.add(m.group(2).strip().split(" // ")[0])
    return out


SETS = [(label, names(HERE / f)) for label, f in ORIGINS]


import os, sqlite3

DB = os.path.join(os.environ["APPDATA"], "the-black-grimoire", "data", "mtg-deck-builder.db")
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)


def printing(name: str) -> tuple[str, str]:
    r = con.execute("select set_code, set_name from cards where name = ? or name like ? limit 1", (name, name + " //%")).fetchone()
    return (r[0].upper(), r[1]) if r else ("?", "unknown set")


def origin(name: str, current: str) -> str:
    if current != "loose collection":
        return current
    for label, s in SETS:
        if name in s or name.split(" // ")[0] in s:
            return label
    code, set_name = printing(name)
    # C21 black/green cards are Witherbloom Witchcraft cards registered before the 09-09 leftover pass (Beledros's own precon)
    if code == "C21":
        return "Witherbloom Witchcraft precon (C21 card registered before the leftover pass)"
    return f"loose collection (printed in {code} {set_name})"


d = json.loads(JSON.read_text(encoding="utf-8"))
changed = 0
for name, v in d["cards"].items():
    new = origin(name, v["from"])
    changed += new != v["from"]
    v["from"] = new
    for b in v["backups"]:
        b["from"] = origin(b["name"], b["from"])
d["origins"] = [label for label, _ in ORIGINS]
JSON.write_text(json.dumps(d, indent=1), encoding="utf-8")
from collections import Counter
print(f"relabelled {changed} deck cards;", dict(Counter(v["from"].split(" (")[0] for v in d["cards"].values())))
