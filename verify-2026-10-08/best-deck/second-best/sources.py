"""Where each card of a climbed list would come from: a sleeved deck (raid, needs a backfill) or the free pool.
  py verify-2026-10-08/best-deck/second-best/sources.py <run-dir> [top N]
Reads <run-dir>/results-*.jsonl (collection-best-deck.ts output), prints one block per commander (best objective first)."""
import glob
import json
import pathlib
import re
import sys
from collections import Counter, defaultdict

ROOT = pathlib.Path(__file__).resolve().parents[3]
BASICS = {"Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"}
LINE = re.compile(r"^(\d+)\s+(.+?)\s*$")


def names(path: pathlib.Path) -> set[str]:
    out: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        m = LINE.match(line.strip())
        if m:
            out.add(m.group(2)); out.add(m.group(2).split(" // ")[0])
    return out


SLEEVED = {p.stem: names(p) for p in sorted((ROOT / "decks/paper/decks").glob("*.txt"))}
run = pathlib.Path(sys.argv[1]); top = int(sys.argv[2]) if len(sys.argv) > 2 else 5
rows = []
for f in glob.glob(str(run / "results-*.jsonl")):
    for line in open(f, encoding="utf-8"):
        if line.strip():
            rows.append(json.loads(line))
rows.sort(key=lambda r: -r["objective"])
for r in rows[:top]:
    deck = r["deck"] if isinstance(r["deck"], list) else r["deck"].get("cards", [])
    cards = [c if isinstance(c, str) else c.get("name", "") for c in deck]
    where: dict[str, list[str]] = defaultdict(list)
    for c in cards:
        if c in BASICS or c == r["commander"]:
            continue
        hit = next((d for d, s in SLEEVED.items() if c in s or c.split(" // ")[0] in s), None)
        where[hit or "free"].append(c)
    comp = r.get("components") or []
    comp_s = ""
    print(f"## {r['commander']} ({''.join(r['identity']) if isinstance(r['identity'], list) else r['identity']}) objective {r['objective']:.2f} (seed {r.get('seedObjective', 0):.2f}) {comp_s}")
    summary = ", ".join(f"{d} {len(v)}" for d, v in sorted(where.items(), key=lambda kv: (kv[0] == 'free', -len(kv[1]))))
    print(f"  sources: {summary}")
    for d, v in sorted(where.items(), key=lambda kv: -len(kv[1])):
        if d != "free":
            print(f"  raid {d}: {', '.join(sorted(v))}")
