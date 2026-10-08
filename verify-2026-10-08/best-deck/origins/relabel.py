"""Physical origin of every card in beledros-backups.json (deck cards and their backups), with a confirmation flag.

Confirmed  = scanned into ManaBox on 2026-09-08 (the register commit a564272), or sleeved in a registered deck
             (the Omo box is the sleeved deck dismantled on 2026-10-07).
UNCONFIRMED = registered from a decklist and never seen: the 54 Witherbloom Witchcraft "leftovers" of 2026-09-09
             came from an Archidekt scrape of the C21 precon (verify-2026-09-09/precon-witherbloom.json), and four
             of them have since proved missing (Witch's Clinic, Well of Lost Dreams, Tainted Wood, Ob Nixilis Reignited).
Idempotent; scores untouched. Run after every beledros-backups.ts run, from the repo root:
  py verify-2026-10-08/best-deck/origins/relabel.py
"""
import glob
import json
import os
import pathlib
import re
import sqlite3
from collections import Counter

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
JSON = HERE.parent / "beledros-backups.json"


def names(path: pathlib.Path) -> set[str]:
    out: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^(\d+)x?\s+(.+?)\s*(\([A-Z0-9]{3,4}\)\s*\d*)?$", line.strip())
        if m:
            out.add(m.group(2).strip())
            out.add(m.group(2).strip().split(" // ")[0])
    return out


WITHERBLOOM = names(ROOT / "verify-2026-09-09/precon-witherbloom-list.txt")  # the Archidekt C21 list, 80 names
LIST_ONLY = names(HERE / "witherbloom-precon-leftovers.txt")  # the 54 of them registered on 2026-09-09 without a scan
SLEEVED = set().union(*(names(pathlib.Path(f)) for f in glob.glob(str(ROOT / "decks/paper/decks/*.txt"))))
WB_SCAN = "Witherbloom Witchcraft precon (C21; ManaBox scan 2026-09-08, confirmed)"
WB_LIST = "Witherbloom Witchcraft precon — UNCONFIRMED (registered from the Archidekt C21 list 2026-09-09, never scanned; 4 of those 54 have proved missing — check the box)"
BOXES: list[tuple[str, set[str]]] = [  # first match wins; the badge is the first word
    ("Omo precon (Tricky Terrain box; sleeved deck dismantled 2026-10-07, confirmed)", names(HERE / "omo-precon.txt")),
    ("Witherbloom", WITHERBLOOM),
    ("Quandrix Unlimited precon (SOC; in hand since 2026-10-02, registered from its list)", names(HERE / "quandrix-precon.txt")),
    ("Silverquill Influence precon (SOC; in hand since 2026-10-02, registered from its list)", names(HERE / "silverquill-precon.txt")),
    ("OTJ box (Outlaws of Thunder Junction, typed in 2026-09-08)", names(HERE / "otj-box.txt")),
]
RECOMPUTE = re.compile(r"^(loose collection|Omo|Witherbloom|Quandrix|Silverquill|OTJ)")

DB = os.path.join(os.environ["APPDATA"], "the-black-grimoire", "data", "mtg-deck-builder.db")
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)


def printing(name: str) -> tuple[str, str]:
    r = con.execute("select set_code, set_name from cards where name = ? or name like ? limit 1", (name, name + " //%")).fetchone()
    return (r[0].upper(), r[1]) if r else ("?", "unknown set")


def origin(name: str, current: str) -> str:
    if not RECOMPUTE.match(current):  # Meren (dismantled) / donor decks: the sleeved deck is the physical source
        return current
    front = name.split(" // ")[0]
    for label, s in BOXES:
        if name in s or front in s:
            if label != "Witherbloom":
                return label
            return WB_LIST if (name in LIST_ONLY or front in LIST_ONLY) and name not in SLEEVED else WB_SCAN
    code, set_name = printing(name)
    return f"loose collection (ManaBox scan or typed batch; printed in {code} {set_name})"


d = json.loads(JSON.read_text(encoding="utf-8"))
changed = 0
for name, v in d["cards"].items():
    new = origin(name, v["from"])
    changed += new != v["from"]
    v["from"] = new
    for b in v["backups"]:
        b["from"] = origin(b["name"], b["from"])
d["origins"] = [label if label != "Witherbloom" else WB_SCAN for label, _ in BOXES] + [WB_LIST]
JSON.write_text(json.dumps(d, indent=1), encoding="utf-8")
summary = Counter(v["from"].split(" (")[0] for v in d["cards"].values())
unconfirmed = sorted(n for n, v in d["cards"].items() if "UNCONFIRMED" in v["from"])
print(f"relabelled {changed} deck cards; {dict(summary)}")
print(f"UNCONFIRMED in the 99: {unconfirmed}")
