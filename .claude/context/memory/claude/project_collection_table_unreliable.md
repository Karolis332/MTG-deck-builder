---
name: project_collection_table_unreliable
description: "The app DB collection table is a bogus bulk import, NOT real card ownership — use ManaBox CSV exports instead"
metadata: 
  node_type: memory
  type: project
  originSessionId: bf746aee-4d72-4c7a-8588-0e9658a5123b
---

The app DB `collection` table (user_id=1) holds **3,645 cards all stamped `source='paper'` and `imported_at='2026-06-12'`** — a single mass import that does NOT reflect QuLeR's real paper collection (it contains cards he never owned, e.g. Enlightened Tutor, Mystical Tutor, Daze, Captain Sisay). Confirmed 2026-06-17: building a Bhaal deck from this table produced a list where he owned almost nothing.

**Why:** Some bulk/demo import populated `collection`; it is not a trustworthy ownership source.

**How to apply:** For real paper ownership, use the ManaBox CSV exports at `Desktop/MTG collection/` (e.g. `Red.csv`, `strixhaven (1).csv`, `lotr.csv`). Ask the user to export the colors/sets you need. Treat owned precon contents (e.g. Blight Curse / Lorwyn Eclipsed) as available only when he confirms he owns the precon. See [[reference_paper_decks_location]], [[project_active_paper_decks]].
