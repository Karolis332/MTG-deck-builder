#!/usr/bin/env python3
"""
Telegram → Claude Code bridge via VPS relay.

Architecture:
  1. VPS bot receives /claude commands → writes to /tmp/claude-queue.json
  2. This bridge polls the VPS queue via SSH every 3s
  3. Executes claude -p locally, writes result back via SSH
  4. VPS bot picks up response and sends to Telegram

Usage:
    py scripts/telegram_claude_bridge.py           # start bridge
    py scripts/telegram_claude_bridge.py --once     # process one command and exit

No Telegram token needed locally — all Telegram interaction goes through the VPS bot.
"""

import json
import os
import sqlite3
import subprocess
import sys
import time

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")

SSH_KEY = os.path.expanduser("~/.ssh/id_ed25519_geo_vps")
SSH_HOST = "root@187.77.110.100"
QUEUE_FILE = "/tmp/claude-queue.json"
RESPONSE_FILE = "/tmp/claude-response.json"
POLL_INTERVAL = 3  # seconds

# Resolve claude CLI - check common locations
CLAUDE_CMD = "claude"
for candidate in [
    os.path.expanduser("~/AppData/Roaming/npm/claude.cmd"),
    os.path.expanduser("~/AppData/Roaming/npm/claude"),
    "/usr/local/bin/claude",
]:
    if os.path.exists(candidate):
        CLAUDE_CMD = candidate
        break


def ssh(cmd: str, timeout: int = 15) -> str:
    """Run command on VPS via SSH."""
    try:
        r = subprocess.run(
            ["ssh", "-i", SSH_KEY, "-o", "StrictHostKeyChecking=no",
             "-o", "ConnectTimeout=5", SSH_HOST, cmd],
            capture_output=True, text=True, timeout=timeout
        )
        return r.stdout.strip()
    except Exception as e:
        return f"SSH error: {e}"


def read_queue() -> dict | None:
    """Read and clear the command queue on VPS."""
    raw = ssh(f"cat {QUEUE_FILE} 2>/dev/null && rm -f {QUEUE_FILE}")
    if not raw or raw.startswith("SSH error"):
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def write_response(msg_id: int, text: str):
    """Write response to VPS for the bot to pick up."""
    payload = json.dumps({"msg_id": msg_id, "text": text, "ts": time.time()})
    # Escape for shell
    escaped = payload.replace("'", "'\\''")
    ssh(f"echo '{escaped}' > {RESPONSE_FILE}")


def run_claude(prompt: str, continue_last: bool = False) -> str:
    """Run claude CLI locally."""
    cmd = [CLAUDE_CMD, "-p", prompt]
    if continue_last:
        cmd.insert(2, "-c")

    env = os.environ.copy()
    env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = "1"
    # Remove nested session detection so claude -p works from within a Claude session
    env.pop("CLAUDECODE", None)
    env.pop("CLAUDE_CODE_SESSION", None)

    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, cwd=PROJECT_DIR, env=env
        )
        stdout, _ = proc.communicate(timeout=300)
        return stdout.strip() if stdout else "(no output)"
    except FileNotFoundError:
        return "Error: claude CLI not found"
    except subprocess.TimeoutExpired:
        proc.kill()
        return "(timed out after 5 minutes)"


def run_shell(command: str) -> str:
    """Run shell command locally."""
    try:
        r = subprocess.run(
            command, shell=True, capture_output=True, text=True,
            timeout=60, cwd=PROJECT_DIR
        )
        out = r.stdout.strip()
        if r.stderr.strip():
            out += "\n" + r.stderr.strip()
        return out or "(no output)"
    except subprocess.TimeoutExpired:
        return "(timed out after 60s)"
    except Exception as e:
        return f"Error: {e}"


def get_status() -> str:
    """Local bridge status."""
    ver = run_shell(f'"{CLAUDE_CMD}" --version 2>&1 | head -1')
    git = run_shell("git log --oneline -3")
    return f"Bridge: online\nClaude: {ver}\nProject: {PROJECT_DIR}\n\nRecent commits:\n{git}"


def process_command(cmd_data: dict):
    """Process a single queued command."""
    cmd = cmd_data.get("cmd", "")
    arg = cmd_data.get("arg", "")
    msg_id = cmd_data.get("msg_id", 0)

    print(f"  [{cmd}] {arg[:80]}...")

    if cmd in ("claude", "cc"):
        result = run_claude(arg)
    elif cmd == "continue":
        result = run_claude(arg, continue_last=True)
    elif cmd == "sh":
        result = run_shell(arg)
    elif cmd == "status":
        result = get_status()
    elif cmd == "kill":
        result = "Kill not supported in queue mode"
    else:
        result = f"Unknown command: {cmd}"

    # Truncate if too long for Telegram
    if len(result) > 3800:
        result = result[:3800] + "\n\n... (truncated)"

    write_response(msg_id, result)
    print(f"  Response sent ({len(result)} chars)")


def main():
    once = "--once" in sys.argv

    # Test SSH connectivity
    print("Claude Bridge (VPS relay mode)")
    print(f"Project: {PROJECT_DIR}")
    print(f"VPS: {SSH_HOST}")
    print("Testing SSH...", end=" ")
    test = ssh("echo ok")
    if test != "ok":
        print(f"FAILED: {test}")
        sys.exit(1)
    print("OK")

    # Notify via VPS
    ssh(f"echo 'Bridge online' > /tmp/claude-bridge-status")
    print(f"Polling {QUEUE_FILE} every {POLL_INTERVAL}s (Ctrl+C to stop)\n")

    try:
        while True:
            cmd_data = read_queue()
            if cmd_data:
                process_command(cmd_data)
                if once:
                    break
            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        print("\nBridge stopped.")
        ssh("rm -f /tmp/claude-bridge-status")


if __name__ == "__main__":
    main()
