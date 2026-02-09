#!/usr/bin/env python3
"""
Set up a daily Windows Scheduled Task to run the MTG pipeline.

Uses schtasks.exe to create a task that runs at a specified time daily.
Falls back to generating a .bat file if schtasks fails (e.g., missing permissions).

Usage:
    py scripts/setup_scheduled_task.py                  # Create task at 03:00
    py scripts/setup_scheduled_task.py --time 06:30     # Create task at 06:30
    py scripts/setup_scheduled_task.py --remove          # Remove the scheduled task
    py scripts/setup_scheduled_task.py --run-now          # Trigger the task immediately
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime

TASK_NAME = "MTGDeckBuilderPipeline"
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
LOG_DIR = os.path.join(PROJECT_DIR, "data", "logs")
PIPELINE_SCRIPT = os.path.join(SCRIPTS_DIR, "pipeline.py")
BAT_PATH = os.path.join(PROJECT_DIR, "run_pipeline.bat")


def find_python() -> str:
    """Find the Python executable. Prefer 'py' on Windows."""
    # Try 'py' launcher first (Windows)
    try:
        result = subprocess.run(
            ["py", "--version"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return "py"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Fall back to sys.executable
    return sys.executable


def create_task(time_str: str):
    """Create a Windows Scheduled Task using schtasks."""
    os.makedirs(LOG_DIR, exist_ok=True)

    python_cmd = find_python()
    log_path = os.path.join(LOG_DIR, "pipeline.log")

    # Build the command that the task will run
    # Use cmd /c to handle redirection for logging
    task_cmd = (
        f'cmd /c "{python_cmd} "{PIPELINE_SCRIPT}" '
        f'--db "{os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")}" '
        f'>> "{log_path}" 2>&1"'
    )

    print(f"Creating scheduled task: {TASK_NAME}")
    print(f"  Schedule: Daily at {time_str}")
    print(f"  Command: {python_cmd} {PIPELINE_SCRIPT}")
    print(f"  Log: {log_path}")

    try:
        result = subprocess.run(
            [
                "schtasks", "/create",
                "/tn", TASK_NAME,
                "/tr", task_cmd,
                "/sc", "daily",
                "/st", time_str,
                "/f",  # Force overwrite if exists
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode == 0:
            print(f"\nScheduled task created successfully!")
            print(f"View in Task Scheduler or run: schtasks /query /tn {TASK_NAME}")
            return True
        else:
            print(f"\nschtasks failed (exit code {result.returncode}):")
            if result.stderr:
                print(f"  {result.stderr.strip()}")
            if result.stdout:
                print(f"  {result.stdout.strip()}")
            print("\nFalling back to .bat file generation...")
            return False

    except FileNotFoundError:
        print("schtasks.exe not found. Falling back to .bat file generation...")
        return False
    except subprocess.TimeoutExpired:
        print("schtasks timed out. Falling back to .bat file generation...")
        return False


def generate_bat():
    """Generate a .bat file as a fallback for manual scheduling."""
    python_cmd = find_python()
    log_path = os.path.join(LOG_DIR, "pipeline.log")
    db_path = os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")

    bat_content = f"""@echo off
REM MTG Deck Builder Pipeline - Daily Run
REM Schedule this via Task Scheduler manually if schtasks failed.
REM
REM To schedule manually:
REM   1. Open Task Scheduler (taskschd.msc)
REM   2. Create Basic Task > Daily > Set time
REM   3. Action: Start a Program > Browse to this .bat file

echo [%date% %time%] Pipeline starting >> "{log_path}"

if not exist "{LOG_DIR}" mkdir "{LOG_DIR}"

{python_cmd} "{PIPELINE_SCRIPT}" --db "{db_path}" >> "{log_path}" 2>&1

echo [%date% %time%] Pipeline finished (exit code %ERRORLEVEL%) >> "{log_path}"
"""

    with open(BAT_PATH, "w", encoding="utf-8") as f:
        f.write(bat_content)

    print(f"\nGenerated: {BAT_PATH}")
    print("To schedule manually:")
    print("  1. Open Task Scheduler (Win+R > taskschd.msc)")
    print("  2. Create Basic Task > Daily > Set your preferred time")
    print(f"  3. Action: Start a Program > Browse to {BAT_PATH}")


def remove_task():
    """Remove the scheduled task."""
    print(f"Removing scheduled task: {TASK_NAME}")
    try:
        result = subprocess.run(
            ["schtasks", "/delete", "/tn", TASK_NAME, "/f"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            print("Task removed successfully.")
        else:
            print(f"Failed to remove task: {result.stderr.strip()}")
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"Error removing task: {e}")

    # Also clean up bat file if it exists
    if os.path.exists(BAT_PATH):
        os.remove(BAT_PATH)
        print(f"Removed: {BAT_PATH}")


def run_now():
    """Trigger the scheduled task immediately."""
    print(f"Running scheduled task: {TASK_NAME}")
    try:
        result = subprocess.run(
            ["schtasks", "/run", "/tn", TASK_NAME],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            print("Task triggered successfully. Check logs at:")
            print(f"  {os.path.join(LOG_DIR, 'pipeline.log')}")
        else:
            print(f"Failed to run task: {result.stderr.strip()}")
            print("Running pipeline directly instead...")
            python_cmd = find_python()
            subprocess.Popen(
                [python_cmd, PIPELINE_SCRIPT,
                 "--db", os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")],
                cwd=PROJECT_DIR,
            )
            print("Pipeline started in background.")
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"Error: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Set up daily Windows Scheduled Task for the MTG pipeline"
    )
    parser.add_argument("--time", default="03:00",
                        help="Time to run daily (HH:MM, default: 03:00)")
    parser.add_argument("--remove", action="store_true",
                        help="Remove the scheduled task")
    parser.add_argument("--run-now", action="store_true",
                        help="Trigger the task immediately")
    args = parser.parse_args()

    if sys.platform != "win32":
        print("This script is for Windows only.", file=sys.stderr)
        print("On Linux/macOS, use cron instead:")
        print(f"  crontab -e")
        print(f"  0 3 * * * cd {PROJECT_DIR} && python3 scripts/pipeline.py >> data/logs/pipeline.log 2>&1")
        sys.exit(1)

    if args.remove:
        remove_task()
        return

    if args.run_now:
        run_now()
        return

    # Validate time format
    try:
        datetime.strptime(args.time, "%H:%M")
    except ValueError:
        print(f"Invalid time format: {args.time}. Use HH:MM (e.g., 03:00)", file=sys.stderr)
        sys.exit(1)

    # Try schtasks first, fall back to .bat
    success = create_task(args.time)
    if not success:
        generate_bat()


if __name__ == "__main__":
    main()
