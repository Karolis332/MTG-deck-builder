#!/usr/bin/env python3
"""
Classify all lands in the cards table by category, tier, and properties.

Reads oracle_text + type_line from the cards table and pattern-matches to
populate the land_classifications table. Run after Scryfall seed or update.

Usage:
    py scripts/classify_lands.py [--db data/mtg-deck-builder.db]

DB resolution (same as src/lib/db.ts): --db > $MTG_DB_DIR/mtg-deck-builder.db >
%APPDATA%/the-black-grimoire/data > repo data/. The resolved path is printed first.
"""

import argparse
import json
import os
import re
import sqlite3
import sys

def _default_db() -> str:
    """Same precedence as src/lib/db.ts: MTG_DB_DIR > APPDATA (Electron DB) > repo data/."""
    db_dir = os.environ.get("MTG_DB_DIR")
    if db_dir:
        return os.path.join(db_dir, "mtg-deck-builder.db")
    appdata = os.environ.get("APPDATA")
    if appdata:
        electron_db = os.path.join(appdata, "the-black-grimoire", "data", "mtg-deck-builder.db")
        if os.path.exists(electron_db):
            return electron_db
    return os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")


DB_DEFAULT = _default_db()


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


# ── Classification rules ─────────────────────────────────────────────────────

COLOR_MAP = {"W": "Plains", "U": "Island", "B": "Swamp", "R": "Mountain", "G": "Forest"}
BASIC_TYPES = set(COLOR_MAP.values())
TYPE_TO_COLOR = {v: k for k, v in COLOR_MAP.items()}


def parse_produced_mana(produced_mana_json: str | None) -> list[str]:
    """Parse produced_mana JSON to list of color codes."""
    if not produced_mana_json:
        return []
    try:
        colors = json.loads(produced_mana_json)
        return [c for c in colors if c in "WUBRG"]
    except (json.JSONDecodeError, TypeError):
        return []


def detect_land_types(type_line: str) -> list[str]:
    """Extract basic land subtypes from type_line."""
    found = []
    for basic in BASIC_TYPES:
        if basic in type_line:
            found.append(TYPE_TO_COLOR[basic])
    return found


def classify_land(name: str, type_line: str, oracle: str, produced_mana_json: str | None) -> dict:
    """Classify a single land card. Returns classification dict.

    Note on `produces_colors` and costed/X-scaled any-color activations
    (2026-09-22): Conduit Pylons ("{1}, {T}: Add one mana of any color") and
    Baldur's Gate ("{2}, {T}: Add X mana of any one color...") still write
    the full WUBRG `produces_colors` list here, same as a free {T}-only
    rainbow land (City of Brass). There is no `land_classifications` column
    to carry a "conditional" discount, and this table is not the scoring
    source of truth for that distinction: `land-intelligence.ts` re-derives
    it from live `oracle_text` via `isConditionalColoredProducer()`
    (`mana-sources.ts`), which discounts any-color activations that cost
    extra mana or scale with X to 0.4x their color-match bonus, same as the
    existing restricted/conditional discounts for Cavern of Souls / Mirrex.
    Do not add a migration for this — extend `isConditionalColoredProducer`
    instead if the discount needs to change.
    """
    tl = type_line.lower()
    ot = (oracle or "").lower()
    name_lower = name.lower()

    land_types = detect_land_types(type_line)
    produces = parse_produced_mana(produced_mana_json) or land_types
    enters_untapped = True  # default
    etb_condition = None
    category = "utility"
    tier = 3
    tribal_types: list[str] = []
    synergy_tags: list[str] = []

    # ── Basic lands ──────────────────────────────────────────────────
    if "basic" in tl and any(b in tl for b in ["plains", "island", "swamp", "mountain", "forest"]):
        category = "basic"
        tier = 4
        return dict(
            land_category=category, produces_colors=produces, enters_untapped=1,
            enters_untapped_condition=None, tribal_types=[], synergy_tags=[],
            tier=tier,
        )

    # ── Original duals (no oracle text ETB penalty, dual type line) ──
    if len(land_types) >= 2 and not re.search(r"enters.*tapped|pay.*life|unless|sacrifice", ot):
        if "basic" not in tl:
            category = "dual_original"
            tier = 1
            enters_untapped = True

    # ── Fetch lands ──────────────────────────────────────────────────
    elif re.search(r"search your library for (?:a|an) .*(plains|island|swamp|mountain|forest)", ot):
        category = "fetch"
        tier = 1
        # Fetches ETB untapped but sacrifice
        synergy_tags.append("sacrifice")
        if "land" in ot and "graveyard" not in ot:
            synergy_tags.append("shuffle")
        # A fetch that enters tapped itself (Bad River, Krosan Verge) or puts
        # its basic onto the battlefield tapped (Landscapes, Riveteers
        # Overlook) is a tapped land with extra steps: tier 3, below any
        # untapped dual.
        if re.search(r"enters(?: the battlefield)? tapped", ot):
            enters_untapped = False
        if not enters_untapped or "onto the battlefield tapped" in ot:
            tier = 3

    # ── Shock lands ──────────────────────────────────────────────────
    elif re.search(r"as .* enters.*you may pay 2 life", ot) and len(land_types) >= 2:
        category = "shock"
        tier = 1
        etb_condition = "pay 2 life"
        synergy_tags.append("lifepay")

    # ── Pay-life-to-untap MDFC lands (Shatterskull Smashing, Agadeem's
    # Awakening, Turntimber Symbiosis, Emeria's Call, Sea Gate Restoration,
    # Valakut Awakening) ── "As this land enters, you may pay 3 life. If you
    # don't, it enters tapped." is a shock-like choice, not a flat tapped
    # land — without this check the generic "enters.*tapped" fallback (or
    # the MDFC pathway branch) misfiled it as tier-4 always-tapped.
    elif re.search(r"you may pay \d+ life\.\s*if you don.t,\s*it enters tapped", ot):
        category = "shock"
        tier = 1
        etb_condition = "pay life"
        synergy_tags.append("lifepay")

    # ── Check lands ──────────────────────────────────────────────────
    elif re.search(r"unless you control (?:a|an) (plains|island|swamp|mountain|forest)", ot):
        category = "check"
        tier = 2
        etb_condition = "control basic type"

    # ── Fast lands ───────────────────────────────────────────────────
    elif re.search(r"unless you control two or fewer other lands", ot):
        category = "fast"
        tier = 2
        etb_condition = "two or fewer other lands"

    # ── Slow lands ───────────────────────────────────────────────────
    elif re.search(r"unless you control two or more other lands", ot):
        category = "slow"
        tier = 2
        etb_condition = "two or more other lands"

    # ── Starting Town (untapped on turns 1-3) ─────────────────────────
    elif re.search(r"unless it's your first, second, or third turn of the game", ot):
        category = "conditional_untapped"
        tier = 2
        etb_condition = "first three turns"

    # ── Chosen basic land type, untapped for life (Multiversal Passage) ─
    elif re.search(r"choose a basic land type", ot) and re.search(r"pay 2 life.*if you don.t.*enters tapped", ot):
        category = "shock"
        tier = 1
        etb_condition = "pay 2 life"
        synergy_tags.append("lifepay")

    # ── Bond lands (untapped with two or more opponents) ──────────────
    elif re.search(r"unless you have two or more opponents", ot):
        category = "bond"
        tier = 2
        etb_condition = "two or more opponents"

    # ── Verges: one sure colour, one gated on a basic land type ───────
    elif re.search(r"activate only if you control (?:a|an) (?:plains|island|swamp|mountain|forest)", ot):
        category = "verge"
        tier = 2

    # ── Reveal-a-card lands (Snarls, Temple of the Dragon Queen,
    # Murmuring Bosk, the Lorwyn tribal cycle) — before pain, so Bosk's
    # damage clause doesn't hide its Treefolk condition ─────────────────
    elif re.search(r"you may reveal .* from your hand", ot) and "tapped" in ot:
        category = "filter"
        tier = 2
        etb_condition = "reveal card of type"

    # ── Pain lands (incl. pay-1-life rainbow: Mana Confluence) ───────
    elif re.search(r"\{t\}.*pay 1 life.*add \{[wubrgc]\}", ot) or re.search(r"deals? 1 damage to you", ot)             or re.search(r"pay 1 life: add one mana of any color", ot):
        category = "pain"
        tier = 2
        synergy_tags.append("lifepay")

    # ── Pathway / MDFC lands ─────────────────────────────────────────
    elif "//" in name and "land" in tl:
        if re.search(r"enters.*tapped", ot):
            category = "tapped"
            tier = 4
            enters_untapped = False
        else:
            category = "pathway"
            tier = 2

    # ── Tribal lands ─────────────────────────────────────────────────
    elif re.search(r"choose a creature type|chosen type|as .* enters.*name a creature type", ot):
        category = "tribal"
        tier = 2
        synergy_tags.append("tribal")
        # Try to extract specific tribal references
        tribal_match = re.findall(r"(elf|goblin|merfolk|zombie|vampire|dragon|angel|human|wizard|warrior|knight|sliver|dinosaur|spirit|elemental)", ot)
        tribal_types = list(set(tribal_match))

    # ── Bounce lands ─────────────────────────────────────────────────
    elif re.search(r"return (?:a|an) land.*to.*hand", ot):
        category = "bounce"
        tier = 3
        enters_untapped = False
        synergy_tags.append("landfall")

    # ── Generic tapped lands ─────────────────────────────────────────
    elif re.search(r"enters.*tapped", ot):
        category = "tapped"
        enters_untapped = False
        # Gain-lands, temples, etc.
        if "scry" in ot:
            category = "temple"
            tier = 3
            synergy_tags.append("scry")
        elif re.search(r"gain.*life|you gain", ot):
            category = "gainland"
            tier = 4
            synergy_tags.append("lifegain")
        else:
            tier = 4

    # ── Utility lands (Castle, creature lands, etc.) ──────────────────
    elif re.search(r"\{t\}.*:.*(?!add)", ot) and "add" not in ot.split(":")[0] if ":" in ot else False:
        category = "utility"
        tier = 3
        if re.search(r"becomes? a .* creature", ot):
            category = "creature_land"
            tier = 2
            synergy_tags.append("creature")

    # ── Channel lands (Boseiju cycle) and artifact lands: an untapped
    # mono-colour land with a real second mode is tier 2, not generic utility.
    if "channel" in ot:
        synergy_tags.append("channel")
        if category == "utility":
            category = "channel"
            tier = 2
    if "artifact" in tl and category == "utility":
        category = "artifact"
        tier = 2
    if re.search(r"sacrifice.*:", ot):
        synergy_tags.append("sacrifice")
    if "landfall" in ot or "whenever a land enters" in ot:
        synergy_tags.append("landfall")
    if "create" in ot and "token" in ot:
        synergy_tags.append("token_generation")
    if "draw" in ot and "card" in ot:
        synergy_tags.append("card_draw")
    if re.search(r"(?:destroy|exile) target", ot):
        synergy_tags.append("removal")

    # Untapped only when true: a branch may leave the default while the text
    # says "This land enters tapped." outright (Grand Coliseum: pain; Path of
    # Ancestry: tribal). A sentence with "enters tapped", no "unless", and not
    # the "If you don't, …" tail of a choice is unconditional.
    if enters_untapped and any(
        re.search(r"enters(?: the battlefield)? tapped\b", sent)
        and "unless" not in sent and not sent.startswith("if you don")
        for sent in (x.strip() for x in re.split(r"[.\n]", ot))
    ):
        enters_untapped = False

    # If tier not yet set and enters tapped, bump down
    if not enters_untapped and tier < 3:
        tier = 3

    return dict(
        land_category=category,
        produces_colors=produces,
        enters_untapped=1 if enters_untapped else 0,
        enters_untapped_condition=etb_condition,
        tribal_types=tribal_types,
        synergy_tags=list(set(synergy_tags)),
        tier=tier,
    )


def main():
    parser = argparse.ArgumentParser(description="Classify lands in cards table")
    parser.add_argument("--db", default=DB_DEFAULT, help="SQLite database path")
    args = parser.parse_args()
    print(f"DB: {args.db}")

    if not os.path.exists(args.db):
        print(f"Database not found: {args.db}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(args.db)

    # Check that land_classifications table exists
    table_check = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='land_classifications'"
    ).fetchone()
    if not table_check:
        print("land_classifications table not found. Run migration v19 first.", file=sys.stderr)
        sys.exit(1)

    # Fetch all lands
    lands = conn.execute("""
        SELECT id, name, type_line, oracle_text, produced_mana
        FROM cards
        WHERE type_line LIKE '%Land%'
        ORDER BY name
    """).fetchall()

    print(f"Found {len(lands)} lands to classify...")

    classified = 0
    for land in lands:
        cls = classify_land(
            land["name"], land["type_line"],
            land["oracle_text"], land["produced_mana"]
        )

        conn.execute("""
            INSERT INTO land_classifications
                (card_name, card_id, land_category, produces_colors,
                 enters_untapped, enters_untapped_condition, tribal_types,
                 synergy_tags, tier, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(card_name) DO UPDATE SET
                card_id = excluded.card_id,
                land_category = excluded.land_category,
                produces_colors = excluded.produces_colors,
                enters_untapped = excluded.enters_untapped,
                enters_untapped_condition = excluded.enters_untapped_condition,
                tribal_types = excluded.tribal_types,
                synergy_tags = excluded.synergy_tags,
                tier = excluded.tier,
                updated_at = excluded.updated_at
        """, (
            land["name"], land["id"], cls["land_category"],
            json.dumps(cls["produces_colors"]),
            cls["enters_untapped"], cls["enters_untapped_condition"],
            json.dumps(cls["tribal_types"]) if cls["tribal_types"] else None,
            json.dumps(cls["synergy_tags"]) if cls["synergy_tags"] else None,
            cls["tier"],
        ))
        classified += 1

    conn.commit()

    # Summary stats
    stats = conn.execute("""
        SELECT land_category, tier, COUNT(*) as cnt
        FROM land_classifications
        GROUP BY land_category, tier
        ORDER BY tier, land_category
    """).fetchall()

    print(f"\nClassified {classified} lands:")
    for row in stats:
        print(f"  Tier {row['tier']} | {row['land_category']:20s} | {row['cnt']} cards")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
