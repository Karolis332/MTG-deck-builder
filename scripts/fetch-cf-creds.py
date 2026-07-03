import sqlite3
import os

db = os.path.expandvars(r'%APPDATA%\the-black-grimoire\data\mtg-deck-builder.db')
print(f"DB: {db}")
print(f"Exists: {os.path.exists(db)}")

c = sqlite3.connect(db)
cur = c.cursor()
cur.execute("SELECT key, value FROM app_state WHERE key LIKE '%cf%' OR key LIKE '%api%'")
for row in cur.fetchall():
    k, v = row
    # Truncate long values
    vshow = v[:80] + '...' if v and len(v) > 80 else v
    print(f"{k}: {vshow}")
c.close()
