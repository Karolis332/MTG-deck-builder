"""Score every owned, free EDHREC Beledros candidate in the model lab: swap it into each of the 3 weakest nonland slots
(or the weakest land slot for lands) of beledros-recommended.txt and report the best objective delta. The score decides."""
import json, os, pathlib, re, sqlite3, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
BD = pathlib.Path(__file__).resolve().parent
DB = os.path.join(os.environ["APPDATA"], "the-black-grimoire", "data", "mtg-deck-builder.db")
LAB = "http://127.0.0.1:3210/api/score"
DISMANTLED = {"meren-of-clan-nel-toth"}  # Meren's deck is the Beledros donor: its leftovers are free
BANNED = {"Culling Ritual", "Bane of Progress"}  # refuter bans, kept


def names(path: pathlib.Path) -> list[str]:
    return [m.group(2) for line in path.read_text(encoding="utf-8").splitlines() if (m := re.match(r"^(\d+)\s+(.+?)\s*$", line))]


deck_text = (BD / "beledros-recommended.txt").read_text(encoding="utf-8")
deck = names(BD / "beledros-recommended.txt")
coll: dict[str, int] = {}
for n in names(ROOT / "decks/paper/collection.txt"):
    coll[n] = coll.get(n, 0) + 1
used: dict[str, int] = {}
for f in (ROOT / "decks/paper/decks").glob("*.txt"):
    if f.stem in DISMANTLED:
        continue
    for n in names(f):
        used[n] = used.get(n, 0) + 1
free = {n: max(c, used.get(n, 0)) - used.get(n, 0) for n, c in coll.items()}
in_deck = set(deck) | {n.split(" // ")[0] for n in deck}  # front faces of DFCs count as in the deck

edh: dict[str, tuple[str, str]] = {}
for fn, cols in (("beledros-edhrec-optimized.txt", (0, 1, 2)), ("beledros-edhrec-lifegain.txt", (1, 2, 5))):
    for line in (BD / fn).read_text(encoding="utf-8").splitlines():
        if line.startswith("#"):
            continue
        p = [x.strip() for x in line.split("|")]
        if len(p) > max(cols):
            n = p[cols[0]]
            edh.setdefault(n, (p[cols[1]], p[cols[2]]))

con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)


def type_line(n: str) -> str:
    r = con.execute("select type_line from cards where name = ? or name like ? limit 1", (n, n + " //%")).fetchone()
    return r[0] if r else ""


cands = sorted(n for n in edh if n not in in_deck and free.get(n, 0) > 0 and n not in BANNED)
extra = [n for n in sys.argv[1:] if n not in cands and not n.startswith("--")]  # operator extras (e.g. Vilis already tested)
cands += extra

done = json.loads((BD / "beledros-climb-2.ndjson").read_text(encoding="utf-8").strip().splitlines()[-1])
weak = [w["name"] for w in done["stopProof"]["weakest"]]
weak_nonland = [w for w in weak if "Land" not in type_line(w)][:3]
if "--all-slots" in sys.argv:  # fair test: every nonland slot except the lock and the commander
    weak_nonland = [n for n in deck if "Land" not in type_line(n) and n not in ("Ashnod's Altar", "Beledros Witherbloom")]
weak_land = [w for w in weak if "Land" in type_line(w)][:1] or ["Swamp"]


def score(text: str) -> float:
    body = json.dumps({"source": "paper", "format": "commander", "commander": "Beledros Witherbloom", "list": text, "weights": {"games": 300}}).encode()
    d = json.load(urllib.request.urlopen(urllib.request.Request(LAB, body, {"Content-Type": "application/json"}), timeout=600))
    if d.get("missing"):
        print("MISSING:", d["missing"], file=sys.stderr)
    return d["objective"]


def swap(out: str, inn: str) -> str:
    lines = deck_text.splitlines()
    for i, l in enumerate(lines):
        if re.match(rf"^(\d+) {re.escape(out)}$", l):
            q = int(l.split(" ", 1)[0])
            lines[i] = f"{q-1} {out}" if q > 1 else f"1 {inn}"
            if q > 1:
                lines.append(f"1 {inn}")
            return "\n".join(lines)
    raise SystemExit(f"{out} not in deck")


t0 = time.time()
base = score(deck_text)
print(f"base {base:.2f} ({time.time()-t0:.1f}s); weakest nonland {weak_nonland}; weakest land {weak_land}; {len(cands)} candidates", flush=True)
rows = []
for n in cands:
    slots = weak_land if "Land" in type_line(n) and "//" not in n else weak_nonland
    best = None
    for out in slots:
        obj = score(swap(out, n))
        if best is None or obj > best[0]:
            best = (obj, out)
    inc, lift = edh[n]
    rows.append((best[0] - base, n, best[1], inc, lift, free.get(n, 0)))
    print(f"{best[0]-base:+6.2f}  {n:36} for {best[1]:28} edhrec {inc:>5} {lift:>5}  free×{free.get(n,0)}", flush=True)

rows.sort(reverse=True)
out = ["| Δ objective | Card | best slot (out) | EDHREC incl. | lift | free copies |", "|---|---|---|---|---|---|"]
out += [f"| {d:+.2f} | {n} | {o} | {inc} | {lift} | {fr} |" for d, n, o, inc, lift, fr in rows]
(BD / ("edhrec-lab-all.md" if "--all-slots" in sys.argv else "edhrec-lab.md")).write_text(f"# Lab swap test, base objective {base:.2f}, epsilon 0.25; weakest nonland slots {weak_nonland}, land slot {weak_land}\n\n" + "\n".join(out) + "\n", encoding="utf-8")
print(f"done in {time.time()-t0:.0f}s -> edhrec-lab.md")
