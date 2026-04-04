#!/usr/bin/env python3
"""
Interactive Telegram bot for MTG Pipeline management.

Handles inline keyboard callbacks from pipeline.py's summary messages
and provides on-demand pipeline control.

Usage:
    py scripts/pipeline_telegram_bot.py              # run in foreground
    py scripts/pipeline_telegram_bot.py --daemon      # run in background (nohup-style)

Commands (in Telegram):
    /start     — Main menu
    /status    — Pipeline health + failure state
    /stats     — DB table row counts
    /decks     — List decks with card counts
    /run       — Trigger full pipeline
    /reset     — Clear all degraded steps
"""

import json
import os
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")
STATE_FILE = os.path.join(PROJECT_DIR, "data", "pipeline_failures.json")
PYTHON = sys.executable

# ── Telegram credentials ──

def get_creds() -> tuple[str, str]:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if token and chat_id:
        return token, chat_id
    try:
        conn = sqlite3.connect(DB_PATH)
        t = conn.execute("SELECT value FROM app_state WHERE key = 'telegram_bot_token'").fetchone()
        c = conn.execute("SELECT value FROM app_state WHERE key = 'telegram_chat_id'").fetchone()
        conn.close()
        return (t[0] if t else "", c[0] if c else "")
    except Exception:
        return "", ""


TOKEN, CHAT_ID = get_creds()
API = f"https://api.telegram.org/bot{TOKEN}"

# ── Telegram API helpers ──

def tg(method: str, payload: dict) -> dict:
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{API}/{method}", data=data,
            headers={"Content-Type": "application/json"}, method="POST"
        )
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except Exception as e:
        print(f"[tg] {method} error: {e}")
        return {}


def send(text: str, keyboard=None):
    payload = {"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"}
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    return tg("sendMessage", payload)


def edit(chat_id: str, msg_id: int, text: str, keyboard=None):
    payload = {"chat_id": chat_id, "message_id": msg_id, "text": text, "parse_mode": "HTML"}
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    tg("editMessageText", payload)


def answer_cb(cb_id: str, text: str = ""):
    tg("answerCallbackQuery", {"callback_query_id": cb_id, "text": text})


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

# ── Data queries ──

MAIN_MENU = [
    [{"text": "Pipeline Status", "callback_data": "pipe_failures"},
     {"text": "DB Stats", "callback_data": "pipe_stats"}],
    [{"text": "View Decks", "callback_data": "pipe_decks"},
     {"text": "Run Pipeline", "callback_data": "pipe_rerun"}],
    [{"text": "Reset Degraded", "callback_data": "pipe_reset"}],
]

BACK = [[{"text": "<< Back", "callback_data": "pipe_menu"}]]


def build_menu() -> str:
    return "<b>MTG Pipeline Bot</b>\n\nChoose an action:"


def build_stats() -> str:
    try:
        conn = sqlite3.connect(DB_PATH)
        tables = [
            "cards", "community_decks", "community_deck_cards", "meta_card_stats",
            "archetype_win_stats", "edhrec_knowledge", "edhrec_avg_decks",
            "spellbook_combos", "topdeck_tournaments", "topdeck_standings",
            "arena_parsed_matches", "card_performance", "grp_id_cache",
            "collection", "decks", "match_logs",
        ]
        lines = ["<b>DB Stats</b>\n"]
        for t in tables:
            try:
                r = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()
                count = f"{r[0]:,}"
            except Exception:
                count = "—"
            lines.append(f"  {t}: {count}")
        conn.close()

        # DB file size
        try:
            size_mb = os.path.getsize(DB_PATH) / (1024 * 1024)
            lines.append(f"\nDB size: {size_mb:.1f} MB")
        except Exception:
            pass

        return "\n".join(lines)
    except Exception as e:
        return f"DB error: {esc(str(e))}"


def build_failures() -> str:
    try:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
    except Exception:
        return "<b>Pipeline Status</b>\n\nNo failure data yet."

    if not state:
        return "<b>Pipeline Status</b>\n\nAll clear — no recorded failures."

    lines = ["<b>Pipeline Status</b>\n"]
    degraded = []
    at_risk = []
    healthy = []

    for step, info in state.items():
        cf = info.get("consecutive_failures", 0)
        skip_until = info.get("skip_until")
        last_ok = info.get("last_success", "never")
        total_f = info.get("total_failures", 0)
        total_r = info.get("total_runs", 0)

        active_skip = False
        if skip_until:
            try:
                active_skip = datetime.now() < datetime.fromisoformat(skip_until)
            except Exception:
                pass

        if active_skip:
            remaining = (datetime.fromisoformat(skip_until) - datetime.now()).total_seconds() / 3600
            lines.append(f"  X {step}: DEGRADED ({remaining:.1f}h left)")
            degraded.append(step)
        elif cf >= 2:
            lines.append(f"  ! {step}: {cf} consecutive failures")
            at_risk.append(step)
        else:
            status = f"OK ({total_r} runs, {total_f} total failures)"
            if isinstance(last_ok, str) and last_ok != "never":
                try:
                    dt = datetime.fromisoformat(last_ok)
                    status += f", last OK: {dt.strftime('%m-%d %H:%M')}"
                except Exception:
                    pass
            lines.append(f"  + {step}: {status}")
            healthy.append(step)

    summary_parts = []
    if degraded:
        summary_parts.append(f"{len(degraded)} degraded")
    if at_risk:
        summary_parts.append(f"{len(at_risk)} at risk")
    summary_parts.append(f"{len(healthy)} healthy")
    lines.insert(1, " | ".join(summary_parts) + "\n")

    return "\n".join(lines)


def build_decks() -> str:
    try:
        conn = sqlite3.connect(DB_PATH)
        decks = conn.execute("""
            SELECT d.id, d.name, d.format,
                   COUNT(dc.card_id) as card_count,
                   SUM(dc.quantity) as total_cards
            FROM decks d
            LEFT JOIN deck_cards dc ON dc.deck_id = d.id
            GROUP BY d.id
            ORDER BY d.updated_at DESC
        """).fetchall()
        conn.close()

        if not decks:
            return "<b>Decks</b>\n\nNo decks found."

        lines = ["<b>Decks</b>\n"]
        for did, name, fmt, unique, total in decks:
            lines.append(f"  #{did} <b>{esc(name or 'Untitled')}</b>")
            lines.append(f"     {fmt or '?'} | {total or 0} cards ({unique or 0} unique)")
        return "\n".join(lines)
    except Exception as e:
        return f"DB error: {esc(str(e))}"


# ── Actions ──

_pipeline_proc = None


def trigger_pipeline():
    global _pipeline_proc
    if _pipeline_proc and _pipeline_proc.poll() is None:
        return "Pipeline is already running (PID {})".format(_pipeline_proc.pid)
    try:
        _pipeline_proc = subprocess.Popen(
            [PYTHON, os.path.join(SCRIPTS_DIR, "pipeline.py"),
             "--db", DB_PATH, "--no-notify"],
            cwd=PROJECT_DIR,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        )
        return f"Pipeline started (PID {_pipeline_proc.pid})"
    except Exception as e:
        return f"Failed to start: {e}"


def reset_degraded():
    try:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
        count = 0
        for step, info in state.items():
            if info.get("skip_until") or info.get("consecutive_failures", 0) >= 3:
                info["consecutive_failures"] = 0
                info["skip_until"] = None
                count += 1
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2, default=str)
        return f"Reset {count} degraded step(s)."
    except Exception as e:
        return f"Reset failed: {e}"


# ── Callback handler ──

def handle_callback(cb_id: str, data: str, chat_id: str, msg_id: int):
    if data == "pipe_menu":
        answer_cb(cb_id)
        edit(chat_id, msg_id, build_menu(), MAIN_MENU)

    elif data == "pipe_stats":
        answer_cb(cb_id, "Loading stats...")
        edit(chat_id, msg_id, build_stats(), BACK)

    elif data == "pipe_failures":
        answer_cb(cb_id, "Loading status...")
        edit(chat_id, msg_id, build_failures(), BACK)

    elif data == "pipe_decks":
        answer_cb(cb_id, "Loading decks...")
        edit(chat_id, msg_id, build_decks(), BACK)

    elif data == "pipe_rerun":
        answer_cb(cb_id, "Starting pipeline...")
        result = trigger_pipeline()
        text = f"<b>Pipeline Trigger</b>\n\n{esc(result)}"
        edit(chat_id, msg_id, text, BACK)

    elif data == "pipe_reset":
        answer_cb(cb_id, "Resetting...")
        result = reset_degraded()
        text = f"<b>Reset Degraded</b>\n\n{esc(result)}"
        edit(chat_id, msg_id, text, BACK)

    else:
        answer_cb(cb_id, "Unknown action")


def handle_message(text: str):
    cmd = text.strip().lower().split()[0] if text.strip() else ""
    if cmd in ("/start", "/menu"):
        send(build_menu(), MAIN_MENU)
    elif cmd == "/status":
        send(build_failures(), BACK)
    elif cmd == "/stats":
        send(build_stats(), BACK)
    elif cmd == "/decks":
        send(build_decks(), BACK)
    elif cmd == "/run":
        result = trigger_pipeline()
        send(f"<b>Pipeline Trigger</b>\n\n{esc(result)}", BACK)
    elif cmd == "/reset":
        result = reset_degraded()
        send(f"<b>Reset Degraded</b>\n\n{esc(result)}", BACK)
    else:
        send("<b>MTG Pipeline Bot</b>\n\nCommands: /start /status /stats /decks /run /reset", MAIN_MENU)


# ── Main polling loop ──

def main():
    if not TOKEN or not CHAT_ID:
        print("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured.")
        print("Set via env vars or app_state DB.")
        sys.exit(1)

    print(f"MTG Pipeline Telegram Bot starting...")
    print(f"Chat ID: {CHAT_ID}")
    print(f"DB: {DB_PATH}")
    print(f"Listening for updates (Ctrl+C to stop)...\n")

    offset = 0
    while True:
        try:
            result = tg("getUpdates", {"offset": offset, "timeout": 30})
            updates = result.get("result", [])
            for u in updates:
                offset = u["update_id"] + 1
                # Callback query (button press)
                cb = u.get("callback_query")
                if cb:
                    cb_chat = str(cb.get("message", {}).get("chat", {}).get("id", ""))
                    if cb_chat != CHAT_ID:
                        continue
                    handle_callback(
                        cb["id"],
                        cb.get("data", ""),
                        cb_chat,
                        cb["message"]["message_id"],
                    )
                    continue
                # Text message
                msg = u.get("message", {})
                msg_chat = str(msg.get("chat", {}).get("id", ""))
                if msg_chat != CHAT_ID:
                    continue
                msg_text = msg.get("text", "")
                if msg_text:
                    handle_message(msg_text)
        except KeyboardInterrupt:
            print("\nBot stopped.")
            break
        except Exception as e:
            print(f"[poll] error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
