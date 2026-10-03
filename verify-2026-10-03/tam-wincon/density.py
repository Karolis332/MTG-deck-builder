"""Synergy density of a Tam list: direct card-to-card links, each pair once. Run: py density.py LIST"""
import re, sys, statistics
names = [l.strip().split(' ', 1)[1] for l in open(sys.argv[1], encoding='utf-8') if l.strip()]
import sqlite3, os
_db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
def _tl(n):
    r = _db.execute("select type_line from cards where (name = ? or name like ? || ' //%') and type_line not like 'Card //%' limit 1", (n, n)).fetchone()
    return r[0] if r else ''
LEGEND = {n for n in names if 'Legendary' in _tl(n) and not any(t in _tl(n) for t in ('Sorcery', 'Instant'))}
WALK = {"Teferi, Temporal Archmage", "Vronos, Masked Inquisitor", "The Theorist, Jace Beleren", "Ajani Resolute", "Ajani Unrelenting", "Chandra, Torch of Defiance", "Elspeth, Sun's Champion", "Jace, Memory Adept",
        "Jace, Reality Sculptor", "Jace, Multiverse Architect", "Kaito, Dancing Shadow", "Oko, Thief of Crowns", "Professor Dellian Fel",
        "Quintorius Kand", "Saheeli, Sublime Artificer", "Vraska, Betrayal's Sting", "Kasmina, Enigmatic Mentor", "Mu Yanling, Sky Dancer",
        "Kaya, Intangible Slayer", "Ob Nixilis, the Hate-Twisted",
        "Chandra, Awakened Inferno", "Sarkhan the Masterless", "Ral Zarek", "Ob Nixilis of the Black Oath", "Tezzeret, Master of the Bridge",
        "Nissa, Steward of Elements", "Sorin, Vengeful Bloodlord", "Dovin, Hand of Control"}
JACE = {"The Theorist, Jace Beleren", "Jace, Memory Adept", "Jace, Reality Sculptor", "Jace, Multiverse Architect"}
WAYS = {n for n in names if n.startswith('Way of the')}
EMPOWER = WAYS | {"Avatar of Burgeoning Echoes", "Rewrite Regrets", "Fatehold Charm", "Jace, Reality Sculptor"}
PROLIF = {"Atomize", "Evolution Sage", "Flux Channeler", "Expansion Algorithm", "Vraska, Betrayal's Sting", "Ripples of Potential",
          "Tezzeret's Gambit", "Tam, the Possibility", "Thrummingbird"}
GAIN = {"Oath of Kaya", "Liliana the Faultless", "Uro, Titan of Nature's Wrath", "Ajani Resolute", "Professor Dellian Fel", "Oko, Thief of Crowns",
        "Fumigate", "Vigorbloom Charm", "Kaito, Dancing Shadow", "Quintorius Kand", "Way of the Paradox", "Kaya, Intangible Slayer"}
TOKENS = {"Elspeth, Sun's Champion", "Ajani Unrelenting", "Way of the Healer", "Way of the Wildspeaker", "Kasmina, Enigmatic Mentor",
          "Saheeli, Sublime Artificer", "Mu Yanling, Sky Dancer", "Kaito, Dancing Shadow"}
GUARD = {"Oath of Kaya", "Vronos, Masked Inquisitor", "Promise of Loyalty", "Dovin, Hand of Control", "Tomik, Orzhov Lawmage", "Archangel of Tithes", "Kasmina, Enigmatic Mentor", "Ripples of Potential", "Liliana the Faultless"}
WINP = {"Jace, Reality Sculptor", "Jace, Memory Adept", "Windfall", "Vraska, Betrayal's Sting", "Way of the Mentor", "Way of the Paradox"}
CREAT_OR_WALK = WALK | {"Tam, the Possibility", "Archangel of Tithes", "Avatar of Burgeoning Echoes", "Bloom Tender", "Esika, God of the Tree",
    "Evolution Sage", "Faeburrow Elder", "Flux Channeler", "Great Divide Guide", "Liliana the Faultless", "Pia, Aether Ascetic",
    "Tomik, Orzhov Lawmage", "Uro, Titan of Nature's Wrath", "Tekuthal, Inquiry Dominus", "Geist of Saint Thalia"}
def linked(a, b):
    r = lambda s: a in s or b in s
    pair = lambda x, y: (a in x and b in y) or (b in x and a in y)
    return any([
        pair({"Tam, the Possibility"}, WALK | {"Timeless Lotus", "Tekuthal, Inquiry Dominus"}),
        pair({"Way of the Paradox", "Way of the Mentor"}, WALK), pair({"Way of the Mentor"}, GAIN),
        pair({"Way of the Paradox"}, {"Avatar of Burgeoning Echoes", "Evolution Sage", "Uro, Titan of Nature's Wrath"}),
        pair(PROLIF, WALK), pair({"Tekuthal, Inquiry Dominus"}, PROLIF),
        pair(EMPOWER, JACE | {"Nexus Mentality", "Entrust the Spark"}), pair({"Pia, Aether Ascetic"}, WAYS),
        pair({"Liliana the Faultless"}, CREAT_OR_WALK | TOKENS), pair(GUARD, WALK),
        pair({"Diabolic Tutor", "Mastermind's Acquisition"}, WINP), pair({"Loyal Tutor", "Entrust the Spark", "Nexus Mentality"}, WALK),
        pair({"Jace, Reality Sculptor"}, {"Jace, Memory Adept", "Windfall", "Jace, Multiverse Architect", "Chimil, the Inner Sun",
                                         "Counterspell", "Dovin's Veto", "Fatehold Charm"}),
        pair({"Esika, God of the Tree"}, CREAT_OR_WALK - {"Esika, God of the Tree"}),
        pair({"Sisay, Weatherlight Captain"}, LEGEND - {"Sisay, Weatherlight Captain"}),
        pair({"The Chain Veil", "Ichormoon Gauntlet", "Carth the Lion"}, WALK), pair({"Ichormoon Gauntlet"}, {"Tekuthal, Inquiry Dominus"}),
        pair({"Teferi, Temporal Archmage"}, {"The Chain Veil", "Timeless Lotus", "Bloom Tender", "Faeburrow Elder", "Noble Hierarch",
                                            "Ignoble Hierarch", "Sol Ring", "Tam, the Possibility"}),
        pair({"Vigorbloom Charm", "Fatehold Charm", "Kiora of Salt and Sand", "Kaya's Ghostform"}, WALK),
    ])
deg = {n: 0 for n in names if n not in LANDS} if (LANDS := {l for l in names if re.search(r"Island|Mountain|Glade|Verge|Pool|Koilos|Retreat|Tower|Commons|Beach|Summit|Orchard|Annex|Citadel|Beacon|Confluence|Outpost|Palace|Farmland|Crag|Lands|Coast|Marsh|Reef|Turbulent|Great Hall", l) and not l.startswith(("Seachrome",)) or l in {"Seachrome Coast"}}) else {}
cards = list(deg)
for i, a in enumerate(cards):
    for b in cards[i + 1:]:
        if linked(a, b): deg[a] += 1; deg[b] += 1
v = sorted(deg.items(), key=lambda kv: kv[1])
EXEMPT = {"Anguished Unmaking", "Assassin's Trophy", "Erode", "Path to Exile", "Settle the Wreckage", "Toxic Deluge", "Final Act",
          "Counterspell", "Dovin's Veto", "Sol Ring", "Arcane Signet", "Talisman of Conviction", "Talisman of Dominance", "Talisman of Progress",
          "Bloom Tender", "Faeburrow Elder", "Great Divide Guide", "Sylvan Library", "Noble Hierarch", "Ignoble Hierarch", "Windfall", "Tezzeret's Gambit", "Geist of Saint Thalia"}
ne = [kv for kv in v if kv[0] not in EXEMPT]
print('linked cards (non-exempt)', len(ne), 'min', ne[0][1], 'median', statistics.median(d for _, d in ne), 'lowest 5:', ne[:5])
print('nonland', len(v), 'min', v[0][1], 'median', statistics.median(d for _, d in v), 'lowest 8:', v[:8])
