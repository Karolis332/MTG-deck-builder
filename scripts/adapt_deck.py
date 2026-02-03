#!/usr/bin/env python3
"""
Adapt a deck based on local match winrate data.

For each card in a deck, computes an adapted score:
  adapted_score = edhrec_synergy * (user_winrate / global_winrate)

Suggests swaps: cards with low adapted scores get cut,
cards with high adapted scores from the synergy pool get added.

Usage:
  python scripts/adapt_deck.py <deck_id>
  python scripts/adapt_deck.py <deck_id> --top 10   # Show top 10 swaps
"""

import json
import sqlite3
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Missing 'pandas'. Run: pip install -r scripts/requirements.txt")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "data" / "mtg-deck-builder.db"


def get_deck_cards(conn: sqlite3.Connection, deck_id: int) -> list[dict]:
    """Get the current cards in a deck."""
    rows = conn.execute("""
        SELECT c.name, dc.quantity, dc.board, c.cmc, c.type_line
        FROM deck_cards dc
        JOIN cards c ON dc.card_id = c.id
        WHERE dc.deck_id = ?
    """, (deck_id,)).fetchall()

    return [
        {"name": row[0], "quantity": row[1], "board": row[2],
         "cmc": row[3], "type_line": row[4]}
        for row in rows
    ]


def get_commander_name(conn: sqlite3.Connection, deck_id: int) -> str | None:
    """Get the commander name for a deck."""
    row = conn.execute("""
        SELECT c.name FROM decks d
        JOIN cards c ON d.commander_id = c.id
        WHERE d.id = ?
    """, (deck_id,)).fetchone()
    return row[0] if row else None


def get_card_winrates(conn: sqlite3.Connection, fmt: str = "commander") -> dict:
    """Get per-card winrates from card_performance table."""
    rows = conn.execute("""
        SELECT card_name,
               CAST(wins_when_played AS REAL) / MAX(games_played, 1) as play_wr,
               CAST(wins_when_in_deck AS REAL) / MAX(games_in_deck, 1) as deck_wr,
               games_played
        FROM card_performance
        WHERE format = ? AND games_played >= 3
    """, (fmt,)).fetchall()

    return {
        row[0]: {"play_wr": row[1], "deck_wr": row[2], "games": row[3]}
        for row in rows
    }


def get_synergy_pool(conn: sqlite3.Connection, commander_name: str) -> dict:
    """Get synergy scores from commander_synergies table."""
    try:
        rows = conn.execute("""
            SELECT card_name, synergy_score, inclusion_rate
            FROM commander_synergies
            WHERE commander_name = ? COLLATE NOCASE
        """, (commander_name,)).fetchall()
        return {
            row[0]: {"synergy": row[1], "inclusion": row[2]}
            for row in rows
        }
    except sqlite3.OperationalError:
        return {}


def compute_adapted_scores(
    deck_cards: list[dict],
    winrates: dict,
    synergy_pool: dict,
    global_avg_wr: float = 0.5
) -> tuple[list[dict], list[dict]]:
    """
    Compute adapted scores for deck cards and potential replacements.

    Returns (cuts, adds) as sorted lists of {name, score, reason}.
    """
    cuts = []
    adds = []

    # Score current deck cards
    deck_names = {c["name"] for c in deck_cards if c["board"] in ("main", "commander")}

    for card in deck_cards:
        if card["board"] not in ("main",):
            continue
        if "Land" in (card["type_line"] or ""):
            continue

        name = card["name"]
        wr = winrates.get(name, {})
        syn = synergy_pool.get(name, {})

        user_wr = wr.get("play_wr", global_avg_wr)
        synergy = syn.get("synergy", 0)
        games = wr.get("games", 0)

        # Adapted score: synergy weighted by personal performance
        if games >= 5:
            ratio = user_wr / max(global_avg_wr, 0.01)
            adapted = (synergy + 0.5) * ratio
        else:
            adapted = synergy + 0.5  # No data, use raw synergy

        if games >= 5 and user_wr < 0.4:
            cuts.append({
                "name": name,
                "score": adapted,
                "winrate": user_wr,
                "games": games,
                "reason": f"Underperforming: {user_wr:.0%} win rate over {games} games"
            })

    # Score potential additions from synergy pool
    for name, syn_data in synergy_pool.items():
        if name in deck_names:
            continue

        wr = winrates.get(name, {})
        user_wr = wr.get("play_wr", global_avg_wr)
        synergy = syn_data.get("synergy", 0)
        games = wr.get("games", 0)

        if games >= 5:
            ratio = user_wr / max(global_avg_wr, 0.01)
            adapted = (synergy + 0.5) * ratio
        else:
            adapted = synergy + 0.5

        if adapted > 0.8:
            adds.append({
                "name": name,
                "score": adapted,
                "synergy": synergy,
                "winrate": user_wr if games >= 5 else None,
                "games": games,
                "reason": f"High synergy ({synergy:.2f})" + (
                    f", {user_wr:.0%} win rate" if games >= 5 else ""
                )
            })

    cuts.sort(key=lambda x: x["score"])
    adds.sort(key=lambda x: x["score"], reverse=True)

    return cuts, adds


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/adapt_deck.py <deck_id> [--top N]")
        sys.exit(1)

    deck_id = int(sys.argv[1])
    top_n = 10
    if "--top" in sys.argv:
        idx = sys.argv.index("--top")
        if idx + 1 < len(sys.argv):
            top_n = int(sys.argv[idx + 1])

    print(f"=== Deck Adaptation (deck #{deck_id}) ===\n")

    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")

    # Get deck info
    deck_cards = get_deck_cards(conn, deck_id)
    if not deck_cards:
        print(f"No cards found for deck #{deck_id}")
        sys.exit(1)

    commander = get_commander_name(conn, deck_id)
    print(f"Commander: {commander or 'N/A'}")
    print(f"Deck size: {sum(c['quantity'] for c in deck_cards)} cards\n")

    # Get data
    winrates = get_card_winrates(conn)
    synergy_pool = get_synergy_pool(conn, commander) if commander else {}

    print(f"Cards with win rate data: {len(winrates)}")
    print(f"Synergy pool size: {len(synergy_pool)}\n")

    # Compute adaptations
    cuts, adds = compute_adapted_scores(deck_cards, winrates, synergy_pool)

    # Display results
    if cuts:
        print(f"=== Suggested CUTS (top {min(top_n, len(cuts))}) ===")
        for cut in cuts[:top_n]:
            print(f"  CUT  {cut['name']}: {cut['reason']}")
    else:
        print("No cuts suggested (need more match data).")

    print()

    if adds:
        print(f"=== Suggested ADDS (top {min(top_n, len(adds))}) ===")
        for add in adds[:top_n]:
            print(f"  ADD  {add['name']}: {add['reason']}")
    else:
        print("No additions suggested.")

    # Paired swaps
    if cuts and adds:
        n_swaps = min(len(cuts), len(adds), top_n)
        print(f"\n=== Recommended Swaps ({n_swaps}) ===")
        for i in range(n_swaps):
            print(f"  {cuts[i]['name']}  -->  {adds[i]['name']}")
            print(f"    Reason: {cuts[i]['reason']} / {adds[i]['reason']}")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
