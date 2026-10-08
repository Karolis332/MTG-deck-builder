"""EDHREC Beledros optimized list vs beledros-recommended.txt: which EDHREC cards are missing, who owns them (collection / other deck), oracle text from the DB."""
import os, pathlib, re, sqlite3, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
BD = ROOT / "verify-2026-10-08/best-deck"
DB = os.path.join(os.environ["APPDATA"], "the-black-grimoire", "data", "mtg-deck-builder.db")


def names(path: pathlib.Path) -> list[str]:
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^(\d+)\s+(.+?)\s*$", line)
        if m:
            out.append(m.group(2))
    return out


deck = set(names(BD / "beledros-recommended.txt"))
coll: dict[str, int] = {}
for n in names(ROOT / "decks/paper/collection.txt"):
    coll[n] = coll.get(n, 0) + 1
in_decks: dict[str, list[str]] = {}
for f in sorted((ROOT / "decks/paper/decks").glob("*.txt")):
    for n in names(f):
        in_decks.setdefault(n, []).append(f.stem)

edh = []
section = ""
for line in (BD / "beledros-edhrec-optimized.txt").read_text(encoding="utf-8").splitlines():
    if line.startswith("# "):
        section = line[2:].strip()
        continue
    parts = [p.strip() for p in line.split("|")]
    if len(parts) == 3:
        edh.append((parts[0], parts[1], parts[2], section))

c = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)


def oracle(n: str) -> tuple[str, str, str] | None:
    r = c.execute("select mana_cost, type_line, oracle_text from cards where name = ? limit 1", (n,)).fetchone()
    if r is None:
        r = c.execute("select mana_cost, type_line, oracle_text from cards where name like ? limit 1", (n + " //%",)).fetchone()
    return r


rows = []
for n, inc, lift, sec in edh:
    if n in deck:
        continue
    o = oracle(n)
    own = "collection" if coll.get(n) else ("deck:" + ",".join(in_decks[n]) if n in in_decks else "NOT OWNED")
    if coll.get(n) and n in in_decks:
        own = f"collection×{coll[n]} + deck:{','.join(in_decks[n])}"
    rows.append((sec, n, inc, lift, own, o))

out = [f"# EDHREC cards not in the Beledros 99 ({len(rows)} of {len(edh)}); DB oracle; ownership = collection.txt / deck files\n"]
for sec, n, inc, lift, own, o in rows:
    mc, tl, ot = o if o else ("?", "NOT IN DB", "")
    out.append(f"## {n} | {inc} | {lift} | {sec} | {own}\n{mc} — {tl}\n{(ot or '').replace(chr(10), ' / ')}\n")
(BD / "edhrec-diff.md").write_text("\n".join(out), encoding="utf-8")

owned = [r for r in rows if r[4] != "NOT OWNED"]
print(f"edhrec {len(edh)} | already in deck {len(edh) - len(rows)} | missing {len(rows)} | owned-and-missing {len(owned)}")
for sec, n, inc, lift, own, o in owned:
    print(f"  {n:38} {inc:>5} {lift:>5}  {own}")
missing_db = [r[1] for r in rows if r[5] is None]
if missing_db:
    print("NOT IN DB:", missing_db)
