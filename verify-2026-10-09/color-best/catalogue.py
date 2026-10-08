"""Per-identity catalogue from the climb results (+ the 2026-10-08 second-best climbs reused). Writes CATALOGUE.md and lists/<ID>-<slug>.txt."""
import json, glob, re, pathlib, collections, itertools
R = pathlib.Path("verify-2026-10-09/color-best"); (R/"lists").mkdir(exist_ok=True)
rows = []
for f in glob.glob(str(R/"climb/*/results-*.jsonl")) + glob.glob("verify-2026-10-08/best-deck/second-best/climb/results-*.jsonl"):
    for l in open(f, encoding="utf-8"):
        if l.strip(): rows.append(json.loads(l))
best = {}
for r in rows:  # keep the best objective per commander
    if r["commander"] not in best or r["objective"] > best[r["commander"]]["objective"]: best[r["commander"]] = r
SLEEVED = {"Beledros Witherbloom":"beledros (sleeved, 101.0)","Tazri, Beacon of Unity":"sleeved deck","The Cabbage Merchant":"sleeved deck","Imotekh the Stormlord":"sleeved deck","Inspirit, Flagship Vessel":"sleeved deck","Tam, the Possibility":"sleeved deck","Bumi, Unleashed":"sleeved deck"}
UNAVAILABLE = {"Mikaeus, the Unhallowed":"in the Beledros 99"}
def slug(n): return re.sub(r"[^a-z0-9]+","-",n.lower()).strip("-")
def ident(ci): return "".join(c for c in "WUBRG" if c in ci) or "C"
by = collections.defaultdict(list)
for r in best.values(): by[ident(r["identity"])].append(r)
order = ["".join(c) for n in (1,2,3,4,5) for c in itertools.combinations("WUBRG", n)]
out = ["# Strongest paper Commander deck per colour identity (2026-10-09)", "", "Pool: every owned card except the Beledros Witherbloom 100 (raids from other sleeved decks allowed — lists are a catalogue, not simultaneously buildable). Objective = Deck Score + 10×tempo + 5×keep-7 − 2×role-window penalty, 2 passes × 100 games (second-best climbs: 3 passes). Model blind spots: Auras, drain/sacrifice, superfriends, partners, tutors; filler adds expected — see the judgment pass per list.", "", "| Identity | Best available | Objective | Deck Score | Runners-up | Note |", "|---|---|---|---|---|---|"]
picks = {}
for k in order:
    lst = sorted(by.get(k, []), key=lambda r: -r["objective"])
    if not lst: out.append(f"| {k} | — | | | | no owned commander |"); continue
    avail = [r for r in lst if r["commander"] not in UNAVAILABLE]
    top = avail[0] if avail else lst[0]
    note = SLEEVED.get(top["commander"], "")
    if k == "BG": note = "Beledros (sleeved) is the BG deck at 101.0; Gyome is the best alternative"
    runners = "; ".join(f"{r['commander']} {r['objective']:.1f}" + (f" ({UNAVAILABLE[r['commander']]})" if r["commander"] in UNAVAILABLE else "") for r in lst if r is not top)[:160]
    out.append(f"| {k} | {top['commander']} | {top['objective']:.1f} | {top.get('absoluteTotal', 0):.1f} | {runners} | {note} |")
    deck = top["deck"]
    names = [d if isinstance(d, str) else d.get("name") for d in deck] if isinstance(deck, list) else []
    cnt = collections.Counter(names)
    body = "".join(f"{c} {n}\n" for n, c in sorted(cnt.items()))
    p = R/"lists"/f"{k}-{slug(top['commander'])}.txt"
    p.write_text(f"Commander\n1 {top['commander']}\n\nDeck\n{body}", encoding="utf-8")
    picks[k] = {"commander": top["commander"], "objective": round(top["objective"], 2), "deckScore": round(top.get("absoluteTotal", 0), 1), "list": str(p).replace("\\", "/"), "roles": top.get("roles"), "cards": sum(cnt.values())}
(R/"CATALOGUE.md").write_text("\n".join(out) + "\n", encoding="utf-8")
json.dump(picks, open(R/"picks.json", "w", encoding="utf-8"), indent=1)
print("\n".join(out[5:]))
print("deck field sample:", type(best["Tazri, Beacon of Unity"]["deck"]).__name__, str(best["Tazri, Beacon of Unity"]["deck"])[:120])
print({k: v["cards"] for k, v in picks.items()})
