"""Player tracking endpoints.

Tracks users who connect from the Black Grimoire app:
- Heartbeat/login ping
- Match result reporting
- Winrate and stats queries
- Leaderboard
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/players", tags=["players"])


# ── Request models ────────────────────────────────────────────────────────────


class PlayerHeartbeat(BaseModel):
    username: str
    app_version: Optional[str] = None
    total_decks: Optional[int] = None


class MatchReport(BaseModel):
    username: str
    deck_name: Optional[str] = None
    commander: Optional[str] = None
    color_identity: Optional[str] = None
    opponent_commander: Optional[str] = None
    result: str  # win, loss, draw
    format: Optional[str] = None
    match_duration_s: Optional[int] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/heartbeat")
async def player_heartbeat(
    data: PlayerHeartbeat,
    session: AsyncSession = Depends(get_session),
):
    """Register or update a player. Called on app startup and periodically."""
    now = datetime.now(timezone.utc)

    existing = await session.execute(
        text("SELECT id, total_matches, total_wins, total_losses FROM players WHERE username = :u"),
        {"u": data.username},
    )
    row = existing.first()

    if row:
        await session.execute(
            text("""
                UPDATE players
                SET last_seen_at = :now, app_version = COALESCE(:ver, app_version),
                    total_decks = COALESCE(:decks, total_decks)
                WHERE username = :u
            """),
            {"now": now, "ver": data.app_version, "decks": data.total_decks, "u": data.username},
        )
        await session.commit()
        return {
            "status": "ok",
            "player_id": row[0],
            "total_matches": row[1],
            "total_wins": row[2],
            "total_losses": row[3],
            "winrate": round(row[2] / max(row[1], 1) * 100, 1),
        }
    else:
        result = await session.execute(
            text("""
                INSERT INTO players (username, app_version, total_decks, last_seen_at, first_seen_at)
                VALUES (:u, :ver, :decks, :now, :now)
                RETURNING id
            """),
            {"u": data.username, "ver": data.app_version, "decks": data.total_decks, "now": now},
        )
        player_id = result.scalar()
        await session.commit()
        return {"status": "ok", "player_id": player_id, "new_player": True}


@router.post("/match")
async def report_match(
    data: MatchReport,
    session: AsyncSession = Depends(get_session),
):
    """Report a match result."""
    player_result = await session.execute(
        text("SELECT id FROM players WHERE username = :u"),
        {"u": data.username},
    )
    player_row = player_result.first()

    if not player_row:
        ins = await session.execute(
            text("INSERT INTO players (username) VALUES (:u) RETURNING id"),
            {"u": data.username},
        )
        player_id = ins.scalar()
    else:
        player_id = player_row[0]

    # Insert match
    await session.execute(
        text("""
            INSERT INTO player_matches
                (player_id, deck_name, commander, color_identity, opponent_commander, result, format, match_duration_s)
            VALUES (:pid, :dn, :cmd, :ci, :opp, :res, :fmt, :dur)
        """),
        {
            "pid": player_id, "dn": data.deck_name, "cmd": data.commander,
            "ci": data.color_identity, "opp": data.opponent_commander,
            "res": data.result, "fmt": data.format, "dur": data.match_duration_s,
        },
    )

    # Update player aggregate stats
    is_win = 1 if data.result == "win" else 0
    is_loss = 1 if data.result == "loss" else 0
    await session.execute(
        text("""
            UPDATE players
            SET total_matches = total_matches + 1,
                total_wins = total_wins + :w,
                total_losses = total_losses + :l,
                last_seen_at = NOW()
            WHERE id = :pid
        """),
        {"w": is_win, "l": is_loss, "pid": player_id},
    )

    # Update favorite commander (most played)
    fav_result = await session.execute(
        text("""
            SELECT commander, COUNT(*) as cnt
            FROM player_matches
            WHERE player_id = :pid AND commander IS NOT NULL
            GROUP BY commander ORDER BY cnt DESC LIMIT 1
        """),
        {"pid": player_id},
    )
    fav = fav_result.first()
    if fav:
        await session.execute(
            text("UPDATE players SET favorite_commander = :cmd WHERE id = :pid"),
            {"cmd": fav[0], "pid": player_id},
        )

    await session.commit()
    return {"status": "ok", "player_id": player_id, "match_result": data.result}


@router.get("/stats/{username}")
async def player_stats(
    username: str,
    session: AsyncSession = Depends(get_session),
):
    """Get detailed stats for a player."""
    player_result = await session.execute(
        text("SELECT id, username, app_version, total_decks, total_matches, total_wins, total_losses, favorite_commander, favorite_colors, last_seen_at, first_seen_at FROM players WHERE username = :u"),
        {"u": username},
    )
    player = player_result.first()
    if not player:
        return {"error": "Player not found"}

    player_id = player[0]

    # Commander winrates
    cmd_stats = await session.execute(
        text("""
            SELECT commander,
                   COUNT(*) as matches,
                   SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
                   SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
            FROM player_matches
            WHERE player_id = :pid AND commander IS NOT NULL
            GROUP BY commander
            ORDER BY matches DESC
        """),
        {"pid": player_id},
    )

    commanders = []
    for row in cmd_stats:
        commanders.append({
            "commander": row[0],
            "matches": row[1],
            "wins": row[2],
            "losses": row[3],
            "winrate": round(row[2] / max(row[1], 1) * 100, 1),
        })

    # Recent matches
    recent = await session.execute(
        text("""
            SELECT deck_name, commander, opponent_commander, result, format, played_at
            FROM player_matches
            WHERE player_id = :pid
            ORDER BY played_at DESC LIMIT 20
        """),
        {"pid": player_id},
    )

    matches = [
        {
            "deck_name": r[0], "commander": r[1], "opponent_commander": r[2],
            "result": r[3], "format": r[4], "played_at": r[5].isoformat() if r[5] else None,
        }
        for r in recent
    ]

    total = player[4] or 0
    wins = player[5] or 0
    losses = player[6] or 0

    return {
        "username": player[1],
        "app_version": player[2],
        "total_decks": player[3],
        "total_matches": total,
        "total_wins": wins,
        "total_losses": losses,
        "winrate": round(wins / max(total, 1) * 100, 1),
        "favorite_commander": player[7],
        "first_seen": player[10].isoformat() if player[10] else None,
        "last_seen": player[9].isoformat() if player[9] else None,
        "commander_stats": commanders,
        "recent_matches": matches,
    }


@router.get("/leaderboard")
async def leaderboard(
    limit: int = 20,
    min_matches: int = 5,
    session: AsyncSession = Depends(get_session),
):
    """Top players by winrate (minimum match threshold)."""
    result = await session.execute(
        text("""
            SELECT username, total_matches, total_wins, total_losses, favorite_commander,
                   ROUND(total_wins::numeric / GREATEST(total_matches, 1) * 100, 1) as winrate
            FROM players
            WHERE total_matches >= :min
            ORDER BY winrate DESC, total_matches DESC
            LIMIT :lim
        """),
        {"min": min_matches, "lim": limit},
    )

    return {
        "leaderboard": [
            {
                "username": r[0], "total_matches": r[1], "total_wins": r[2],
                "total_losses": r[3], "favorite_commander": r[4], "winrate": float(r[5]),
            }
            for r in result
        ]
    }


@router.get("/list")
async def list_players(
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    """List all tracked players."""
    result = await session.execute(
        text("""
            SELECT username, total_decks, total_matches, total_wins, total_losses,
                   favorite_commander, app_version, last_seen_at, first_seen_at
            FROM players
            ORDER BY last_seen_at DESC
            LIMIT :lim
        """),
        {"lim": limit},
    )

    return {
        "players": [
            {
                "username": r[0], "total_decks": r[1], "total_matches": r[2],
                "total_wins": r[3], "total_losses": r[4], "favorite_commander": r[5],
                "app_version": r[6],
                "last_seen": r[7].isoformat() if r[7] else None,
                "first_seen": r[8].isoformat() if r[8] else None,
                "winrate": round((r[3] or 0) / max(r[2] or 1, 1) * 100, 1),
            }
            for r in result
        ]
    }
