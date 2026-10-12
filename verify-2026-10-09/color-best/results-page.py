"""Results dashboard (vaporwave theme) for the 2026-10-09 deck work: sleeved-deck reviews, per-identity catalogue, Tazri journey.
py verify-2026-10-09/color-best/results-page.py  -> decks/paper/results-2026-10-09.html (+ Desktop copy)."""
import collections, glob, html, json, pathlib, re, sqlite3

R = pathlib.Path("verify-2026-10-09/color-best")
E = R / "eval"
DB = sqlite3.connect("C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data/mtg-deck-builder.db")
OUT = [pathlib.Path("decks/paper/results-2026-10-09.html"), pathlib.Path("C:/Users/QuLeR/Desktop/MTG collection/MTG decks/results-2026-10-09.html")]
_card = {}


def card(name):
    if name in _card:
        return _card[name]
    front = name.split(" // ")[0]
    r = DB.execute(
        "select image_uri_normal, type_line from cards where (name = ? or name = ? or name like ?) order by (image_uri_normal is not null) desc, length(name) limit 1",
        (name, front, front + " // %")).fetchone()
    _card[name] = {"img": r[0] if r else "", "type": (r[1] or "") if r else ""}
    return _card[name]


def esc(s):
    return html.escape(str(s if s is not None else ""))


def chip(name, size=58):
    c = card(name)
    img = f'<img src="{esc(c["img"])}" alt="" loading="lazy">' if c["img"] else ""
    return f'<span class="chip" style="--w:{size}px" title="{esc(name)}">{img}<b>{esc(name)}</b></span>'


def parse_list(p):
    out, cmdr = collections.Counter(), []
    sec = None
    for l in pathlib.Path(p).read_text(encoding="utf-8").splitlines():
        s = l.strip()
        if s in ("Commander", "Deck"):
            sec = s
            continue
        m = re.match(r"^(\d+)\s+(.+?)\s*$", s)
        if not m:
            continue
        if sec == "Commander":
            cmdr.append(m.group(2))
        else:
            out[m.group(2)] += int(m.group(1))
    return cmdr, out


def grouped(counter):
    groups = collections.OrderedDict((k, []) for k in ["Commander-ish", "Creature", "Planeswalker", "Instant", "Sorcery", "Artifact", "Enchantment", "Battle", "Land", "Other"])
    for n, c in sorted(counter.items()):
        t = card(n)["type"]
        k = next((g for g in ["Planeswalker", "Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Battle", "Land"] if g in t), "Other")
        groups[k].append((n, c))
    return [(k, v) for k, v in groups.items() if v]


def list_block(counter, open_=False):
    parts = []
    for k, v in grouped(counter):
        parts.append(f'<div class="grp"><h5>{k} <small>{sum(c for _, c in v)}</small></h5><div class="tiles">' + "".join(
            (f'<span class="tile" title="{esc(n)}">{"<img src=%s loading=lazy alt=>" % ("\"" + esc(card(n)["img"]) + "\"") if card(n)["img"] else ""}<i>{esc(n)}{" ×" + str(c) if c > 1 else ""}</i></span>') for n, c in v) + "</div></div>")
    return f'<details{" open" if open_ else ""}><summary>full list ({sum(counter.values())} cards)</summary><div class="lists">{"".join(parts)}</div></details>'


# ---------- data ----------
reviews = json.load(open(E / "REVIEWS.json", encoding="utf-8"))
picks = json.load(open(R / "picks.json", encoding="utf-8"))
ORDER = ["beledros-witherbloom", "tazri-beacon-of-unity", "tam-the-possibility", "inspirit-flagship-vessel", "imotekh-the-stormlord", "the-cabbage-merchant", "bumi-unleashed", "gilanra-alena-partners"]
PROPOSED = {"tazri-beacon-of-unity": "tazri-beacon-of-unity/tazri-proposed.txt", "tam-the-possibility": "tam-the-possibility/proposed.txt", "inspirit-flagship-vessel": "inspirit-flagship-vessel/proposed.txt",
            "imotekh-the-stormlord": "imotekh-the-stormlord/proposed.txt", "the-cabbage-merchant": "the-cabbage-merchant/final.txt", "bumi-unleashed": "bumi-unleashed/final.txt", "gilanra-alena-partners": "gilanra-alena-partners/proposed-refuted.txt"}
NOTE = {"bumi-unleashed": "sleeved list is ILLEGAL: Sheltering / Tranquil / Twisted Landscape cycle for off-identity colours — fix mandatory",
        "the-cabbage-merchant": "sleeved file has 99 cards — Lembas is the 100th", "tazri-beacon-of-unity": "base = tazri-final (88.9), the judgment list built from the model's raids climb (97.9); raids Tam 11 / Inspirit 5 / Gilanra 2",
        "gilanra-alena-partners": "lab blind to partners — oracle + goldfish sim only; two refuter alternatives applied (Bane → Cleanup Crew, Florahedron / Thicket for Havoc Eater / Woodwurm)",
        "beledros-witherbloom": "null result: every climb swap was a window artefact; Arnyn stays out"}
rows_all = []
for f in glob.glob(str(R / "climb/*/results-*.jsonl")) + glob.glob("verify-2026-10-08/best-deck/second-best/climb/results-*.jsonl"):
    rows_all += [json.loads(l) for l in open(f, encoding="utf-8") if l.strip()]
best = {}
for r in rows_all:
    if r["commander"] not in best or r["objective"] > best[r["commander"]]["objective"]:
        best[r["commander"]] = r
byid = collections.defaultdict(list)
for r in best.values():
    byid["".join(c for c in "WUBRG" if c in r["identity"])].append(r)
IDS = ["W", "U", "B", "R", "G", "WU", "WB", "WR", "WG", "UB", "UR", "UG", "BR", "BG", "RG", "WUB", "WUR", "WUG", "WBR", "WBG", "WRG", "UBR", "UBG", "URG", "BRG", "WUBR", "WUBG", "WURG", "WBRG", "UBRG", "WUBRG"]
SLEEVED = {"Beledros Witherbloom", "Tazri, Beacon of Unity", "The Cabbage Merchant", "Imotekh the Stormlord", "Inspirit, Flagship Vessel", "Tam, the Possibility", "Bumi, Unleashed", "Alena, Kessig Trapper"}
DONE_JUDGMENT = {"WUBRG": "Tazri review (tab 1)", "WB": "Minthara v2 (10-08)", "BG": "Beledros (sleeved, 101.0)", "G": "Cabbage review (tab 1)"}
phase2 = {}
for d in glob.glob(str(R / "decks/*/final.txt")):
    phase2[pathlib.Path(d).parent.name] = d.replace("\\", "/")

# ---------- html ----------
css = (R / "vaporwave.css").read_text(encoding="utf-8")
extra = """
.wrap{max-width:1500px;margin:0 auto;padding:14px 18px 80px}
.nav{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px}.nav button{background:var(--panel);border:1px solid var(--line);color:var(--ink);padding:8px 14px;border-radius:8px;cursor:pointer;font:inherit}.nav button.on{border-color:var(--cyan);box-shadow:0 0 12px var(--line);color:var(--cyan)}
section.view{display:none}section.view.on{display:block}
table.sum{border-collapse:collapse;width:100%;background:var(--panel);border:1px solid var(--line2);border-radius:10px;overflow:hidden}table.sum th,table.sum td{padding:8px 10px;border-bottom:1px solid rgba(138,92,255,.25);text-align:left;vertical-align:top}table.sum th{color:var(--cyan);font-weight:600;letter-spacing:.04em;font-size:13px;text-transform:uppercase}
.card{background:var(--panel);border:1px solid var(--line2);border-radius:12px;padding:14px 16px;margin:14px 0;box-shadow:0 0 18px rgba(138,92,255,.15)}.card h3{margin:0 0 6px;color:#fff;text-shadow:0 0 10px var(--vio);font-size:22px}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);color:var(--cyan);margin-right:6px;vertical-align:middle}.tag.ok{border-color:#2eff9a;color:#2eff9a}.tag.warn{border-color:var(--sun);color:var(--sun)}.tag.bad{border-color:var(--mag);color:var(--mag)}.tag.dim{border-color:var(--dim);color:var(--dim)}
.swaps{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}.swap{display:grid;grid-template-columns:160px 28px 160px 1fr 70px 110px;gap:10px;align-items:center;background:rgba(6,3,26,.55);border:1px solid rgba(25,240,255,.18);border-radius:10px;padding:8px 10px}.swap .arr{color:var(--mag);font-size:22px;text-align:center}.swap .why{font-size:14px;color:var(--ink)}.swap .why small{color:var(--dim);display:block;margin-top:2px}.swap .d{font-variant-numeric:tabular-nums;color:var(--sun);text-align:right}
.chip{display:inline-flex;flex-direction:column;align-items:center;width:160px;gap:4px;vertical-align:middle;text-align:center}.chip img{width:var(--w,58px);border-radius:5px;box-shadow:0 0 8px rgba(25,240,255,.35)}.chip b{font-size:11px;line-height:1.15;color:var(--ink);font-weight:500}
.hero{display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:start}.hero img{width:150px;border-radius:8px;box-shadow:0 0 14px var(--line)}.verdict{font-size:15px;line-height:1.5}
.risks{margin:8px 0 0;padding-left:18px;color:var(--dim);font-size:13.5px}.risks li{margin:2px 0}
details{margin-top:8px}summary{cursor:pointer;color:var(--cyan)}.lists{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px}.grp h5{margin:0 0 4px;color:var(--sun);font-size:12px;text-transform:uppercase;letter-spacing:.06em}.grp h5 small{color:var(--dim)}.tiles{display:flex;flex-wrap:wrap;gap:4px;max-width:720px}.tile{display:inline-flex;flex-direction:column;width:62px;text-align:center}.tile img{width:62px;border-radius:4px}.tile i{font-style:normal;font-size:10px;line-height:1.1;color:var(--dim)}
.idrow{display:grid;grid-template-columns:70px 120px 1fr;gap:14px;align-items:start}.idcode{font-size:26px;font-weight:700;color:#fff;text-shadow:0 0 12px var(--mag);letter-spacing:.08em}.idrow img{width:120px;border-radius:7px;box-shadow:0 0 12px var(--line)}.num{font-size:28px;color:var(--cyan);font-weight:700}.num small{font-size:13px;color:var(--dim);font-weight:400;margin-left:8px}
.journey{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.step{background:rgba(6,3,26,.6);border:1px solid var(--line2);border-radius:10px;padding:10px 14px;min-width:170px}.step b{display:block;color:var(--cyan);font-size:22px}.step span{color:var(--dim);font-size:13px}.jarr{color:var(--mag);font-size:26px}
p.lead{color:var(--dim);max-width:1100px}
.diff{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:8px 0}.diff .tiles{max-width:none;margin-top:6px}.diff .tile{width:84px}.diff .tile img{width:84px}pre.md{white-space:pre-wrap;font-size:12.5px;color:var(--ink);background:rgba(6,3,26,.6);border:1px solid var(--line2);border-radius:8px;padding:10px;max-height:480px;overflow:auto}
"""
H = [f'<!doctype html><html><head><meta charset="utf-8"><title>Deck results 2026-10-09</title><style>{css}{extra}</style></head><body><div class="vsun"></div><div class="vfloor"></div><div class="wrap">']
H.append('<h1 style="margin:6px 0 2px;color:#fff;text-shadow:0 0 14px var(--vio)">Deck results — 2026-10-09</h1>')
H.append('<p class="lead">Sleeved-deck reviews (8 Opus reviewers → 8 refuters), the strongest commander per colour identity (53 climbs, 22 identities), and the Tazri "all cards free game" journey. Objective = Deck Score + 10×tempo + 5×keep-7 − 2×role-window penalty. Deck Score was flat on nearly every swap: the model is blind to these engines, so the verdicts are judgment, refuted independently.</p>')
H.append('<div class="nav"><button class="on" data-v="rev">Sleeved decks — reviews</button><button data-v="cat">Strongest deck per colour identity</button><button data-v="taz">Tazri journey</button></div>')

# ---- reviews
H.append('<section class="view on" id="rev">')
H.append('<table class="sum"><tr><th>Deck</th><th>Sleeved obj / DS</th><th>Model climb (free pool)</th><th>Swaps → refuted</th><th>Δ all</th><th>Refuter</th><th>Note</th></tr>')
for s in ORDER:
    r, f = reviews[s]["review"], reviews[s]["refute"] or {}
    passed = sum(1 for v in f.get("verdicts", []) if v["pass"])
    cls = {"PASS": "ok", "PARTIAL": "warn", "FAIL": "bad"}.get(f.get("overall"), "dim")
    H.append(f'<tr><td><b>{esc(r.get("commander", s))}</b></td><td>{esc(r.get("sleevedObjective"))} / {esc(r.get("sleevedDeckScore"))}</td><td>{esc(r.get("modelObjective"))}</td><td>{len(r["swaps"])} → {passed}</td><td>{esc(r.get("allDelta"))}</td><td><span class="tag {cls}">{esc(f.get("overall") or "n/a")}</span></td><td style="color:var(--dim);font-size:13px">{esc(NOTE.get(s, ""))}</td></tr>')
H.append("</table>")
for s in ORDER:
    r, f = reviews[s]["review"], reviews[s]["refute"] or {}
    cm = r.get("commander", s).split(" + ")[0]
    cls = {"PASS": "ok", "PARTIAL": "warn", "FAIL": "bad"}.get(f.get("overall"), "dim")
    H.append(f'<div class="card"><div class="hero">{"<img src=%s alt=>" % ("\"" + esc(card(cm)["img"]) + "\"") if card(cm)["img"] else "<div></div>"}<div><h3>{esc(r.get("commander", s))} <span class="tag {cls}">refuter {esc(f.get("overall") or "n/a")}</span><span class="tag">sleeved {esc(r.get("sleevedObjective"))}</span><span class="tag">model {esc(r.get("modelObjective"))}</span></h3>')
    if s in NOTE:
        H.append(f'<div class="tag warn" style="white-space:normal;display:block;margin:4px 0 8px">{esc(NOTE[s])}</div>')
    H.append(f'<div class="verdict">{esc(r.get("verdict"))}</div>')
    if f.get("notes"):
        H.append(f'<div class="verdict" style="color:var(--dim);margin-top:6px"><b style="color:var(--sun)">Refuter:</b> {esc(f["notes"])}</div>')
    H.append("</div></div>")
    vd = {(v["out"], v["in"]): v for v in f.get("verdicts", [])}
    if r["swaps"]:
        H.append('<div class="swaps">')
        for sw in r["swaps"]:
            v = vd.get((sw["out"], sw["in"]))
            b = '<span class="tag ok">PASS</span>' if v and v["pass"] else (f'<span class="tag bad" title="{esc(v["reason"])}">FAIL</span>' if v else '<span class="tag dim">n/a</span>')
            fail = f'<small style="color:var(--mag)">{esc(v["reason"])}</small>' if v and not v["pass"] else ""
            out_chip = chip(sw["out"], 110) if not sw["out"].startswith("(") else f'<span class="tag dim">{esc(sw["out"][:40])}</span>'
            H.append(f'<div class="swap">{out_chip}<span class="arr">→</span>{chip(sw["in"], 110)}<div class="why">{esc(sw["why"])}<small>{esc(sw.get("source", ""))}</small>{fail}</div><div class="d">{esc(sw.get("delta", ""))}</div><div>{b}</div></div>')
        H.append("</div>")
    if r.get("risks"):
        H.append('<ul class="risks">' + "".join(f"<li>{esc(x)}</li>" for x in r["risks"]) + "</ul>")
    if r.get("guideErrors"):
        H.append(f'<details><summary>guide errors ({len(r["guideErrors"])}, fixer agent running)</summary><ul class="risks">' + "".join(f"<li>{esc(x)}</li>" for x in r["guideErrors"]) + "</ul></details>")
    if s in PROPOSED and (E / PROPOSED[s]).exists():
        _, cnt = parse_list(E / PROPOSED[s])
        H.append(f'<div style="margin-top:8px;color:var(--dim);font-size:13px">proposed list: <code>verify-2026-10-09/color-best/eval/{esc(PROPOSED[s])}</code> · check page tab shows sleeved → proposed</div>' + list_block(cnt))
    H.append(f'<div style="margin-top:6px;color:var(--dim);font-size:12.5px">files: eval/{esc(s)}/REVIEW.md · REFUTE.md · swaps.txt</div></div>')
H.append("</section>")

# ---- catalogue
H.append('<section class="view" id="cat">')
H.append('<p class="lead">Pool: every owned card except the Beledros Witherbloom 100; raids from other sleeved decks allowed, so the lists are a catalogue, not simultaneously buildable. Climb: 2 passes × 100 games (the 12 reused 10-08 climbs: 3 passes). The judgment pass (filler → real cards, plan, closer) runs as a workflow; its final list appears here when done.</p>')
for k in IDS:
    lst = sorted(byid.get(k, []), key=lambda r: -r["objective"])
    H.append(f'<div class="card"><div class="idrow"><div class="idcode">{k}</div>')
    if not lst:
        H.append('<div></div><div><span class="tag dim">no owned commander</span> <span style="color:var(--dim)">a buy would be needed for this identity</span></div></div></div>')
        continue
    avail = [r for r in lst if r["commander"] != "Mikaeus, the Unhallowed"]
    top = avail[0] if avail else lst[0]
    cm = top["commander"]
    H.append(f'{"<img src=%s alt=>" % ("\"" + esc(card(cm)["img"]) + "\"") if card(cm)["img"] else "<div></div>"}<div>')
    H.append(f'<h3 style="margin:0">{esc(cm)}' + (' <span class="tag">sleeved deck</span>' if cm in SLEEVED else "") + (f' <span class="tag dim">{esc(DONE_JUDGMENT[k])}</span>' if k in DONE_JUDGMENT else (f' <span class="tag ok">judgment list ready</span>' if k in phase2 else ' <span class="tag warn">judgment pass running</span>')) + "</h3>")
    H.append(f'<div class="num">{top["objective"]:.1f}<small>objective · Deck Score {top.get("absoluteTotal", 0):.1f} · {"".join(f"{a} {b}" for a, b in []) }{esc(" ".join(f"{kk}{vv}" for kk, vv in (top.get("roles") or {}).items()))}</small></div>')
    if k == "BG":
        H.append('<div style="color:var(--sun)">Beledros Witherbloom (sleeved) is the BG deck at 101.0; Gyome is the best alternative.</div>')
    runners = [r for r in lst if r is not top]
    if runners:
        H.append('<div style="color:var(--dim);font-size:13.5px;margin-top:4px">runners-up: ' + " · ".join(f'{esc(r["commander"])} {r["objective"]:.1f}' + (" (in the Beledros 99)" if r["commander"] == "Mikaeus, the Unhallowed" else "") for r in runners) + "</div>")
    cnt = collections.Counter(top["deck"]) if isinstance(top["deck"], list) else collections.Counter()
    H.append('<div style="color:var(--dim);font-size:13px;margin-top:6px">model climb list</div>' + list_block(cnt))
    if k in phase2:
        _, c2 = parse_list(phase2[k])
        d = pathlib.Path(phase2[k]).parent
        build = (d / "BUILD.md").read_text(encoding="utf-8") if (d / "BUILD.md").exists() else ""
        ref = (d / "REFUTE.md").read_text(encoding="utf-8") if (d / "REFUTE.md").exists() else ""
        outs = sorted(set(cnt) - set(c2)); ins = sorted(set(c2) - set(cnt))
        rtag = ('<span class="tag ok">refuter PASS</span>' if "PASS" in ref[:400] and "FAIL" not in ref[:400] else '<span class="tag warn">refuter: see REFUTE.md</span>') if ref else '<span class="tag dim">refuter pending</span>'
        H.append(f'<div style="margin-top:10px;color:var(--cyan)"><b>judgment list</b> {rtag} <code style="color:var(--dim)">{esc(phase2[k])}</code></div>')
        H.append(f'<div style="color:var(--ink);font-size:14px;margin:4px 0">{esc(build.splitlines()[0].lstrip("# ") if build else "")}</div>')
        chg = [(n, cnt[n], c2[n]) for n in sorted(set(cnt) & set(c2)) if cnt[n] != c2[n]]
        if chg:
            H.append('<div style="color:var(--sun);font-size:13.5px;margin:4px 0">count changes: ' + ' · '.join(f'{esc(n)} {a} → {b}' for n, a, b in chg) + '</div>')
        if outs or ins:
            H.append('<div class="diff"><div><span class="tag bad">OUT ' + str(len(outs)) + '</span><div class="tiles">' + "".join(f'<span class="tile" title="{esc(n)}"><img src="{esc(card(n)["img"])}" loading="lazy" alt=""><i>{esc(n)}</i></span>' for n in outs) + '</div></div>')
            H.append('<div><span class="tag ok">IN ' + str(len(ins)) + '</span><div class="tiles">' + "".join(f'<span class="tile" title="{esc(n)}"><img src="{esc(card(n)["img"])}" loading="lazy" alt=""><i>{esc(n)}</i></span>' for n in ins) + '</div></div></div>')
        if build:
            H.append(f'<details><summary>BUILD.md</summary><pre class="md">{esc(build)}</pre></details>')
        if ref:
            H.append(f'<details><summary>REFUTE.md</summary><pre class="md">{esc(ref)}</pre></details>')
        H.append(list_block(c2))
    H.append("</div></div></div>")
H.append("</section>")

# ---- tazri journey
H.append('<section class="view" id="taz"><div class="card"><h3>Tazri, Beacon of Unity — "strongest after Beledros with all cards as free game"</h3><div class="journey">')
for label, val, sub in [("sleeved", "62.6", "Deck Score 75 · ramp 17 / draw 13 / removal 6 → penalty 12"), ("model climb", "97.9", "DS 86.1 · raids allowed · filler adds (Gates, Boulder, Fulcrum)"), ("judgment list", "88.9", "DS 77.5 · staples back, windows fixed, Gearhulk (win 64 → 73)"), ("proposed", "88.9", "+8 party-density swaps · refuter PASS · model blind (Δ −0.01)")]:
    H.append(f'<div class="step"><span>{label}</span><b>{val}</b><span>{sub}</span></div><span class="jarr">→</span>')
H[-1] = H[-1].replace('<span class="jarr">→</span>', "")
H.append('</div><p class="lead" style="margin-top:12px">Plan: full-party alpha (Blade Historian double strike, Jazal Goldmane, Mirror Entity) behind Heroic Intervention / Boros Charm; backup: initiative + dungeon value doubled by Panharmonicon. Raids: Tam 11 (Path, Anguished Unmaking, Trophy, Bloom Tender, Faeburrow, Mana Confluence, shocks / tri-lands), Inspirit 5 (Rift, Boros Charm, Panharmonicon, 2 pain lands), Gilanra 2 (Gearhulk, Terror) — backfills owed before sleeving. Files: verify-2026-10-09/tazri/ (tazri-model, tazri-final, swap-lab.ts, roles.ts) and eval/tazri-beacon-of-unity/ (REVIEW, REFUTE, tazri-proposed.txt).</p>')
tz = E / "tazri-beacon-of-unity/tazri-proposed.txt"
if tz.exists():
    _, c = parse_list(tz)
    H.append(list_block(c, open_=True))
H.append("</div></section>")
H.append('<script>document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("on",x===b));document.querySelectorAll("section.view").forEach(s=>s.classList.toggle("on",s.id===b.dataset.v));window.scrollTo(0,0)});</script></div></body></html>')
doc = "\n".join(H)
for o in OUT:
    o.parent.mkdir(parents=True, exist_ok=True)
    o.write_text(doc, encoding="utf-8")
print("wrote", [str(o) for o in OUT], len(doc), "chars; cards without image:", [n for n, c in _card.items() if not c["img"]][:10])
