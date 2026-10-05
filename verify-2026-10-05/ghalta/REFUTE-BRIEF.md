# Refute: Arena Standard R/G Ways + walkers deck (fresh context, 2026-10-05)

**Goal.** Decide whether `final.txt` is the strongest consistent optimisation of the operator's `input.txt` from their owned Arena cards. You verify; you do not build.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder, folder `verify-2026-10-05/ghalta/`): `input.txt`, `final.txt`, `build-report.md` (claims), `model.json` / `model-final.json` (app optimizer + Deck Score before/after), `pool.md` (all 1,284 owned Standard-legal R/G/colourless Arena cards with DB text and owned copies; grep it, don't read whole). Rules: `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md`, `reference/principles.md` (Karsten 60-card). Oracle text from pool.md or `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "<sql>"`; meta from `community_decks`/`community_deck_cards` (format 'standard'); rulings from Scryfall API or the current CR, never memory.

**Check, in order:**
1. Every DB quote and rules claim in build-report.md (timing words, "another", targets, how the Ways' Jace token and granted abilities work, Konstrari Annex's untapped condition, Ghalta cost reductions).
2. Every number: Karsten land count, colour sources, curve/avg MV, the model scores (re-run if in doubt: `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx verify-2026-10-05/ghalta/run-model.ts verify-2026-10-05/ghalta/final.txt`).
3. Each cut from the operator's list: KEEP or REJECT with a DB quote (especially Tenured Tethermage ×3, Hungering Puppetbeast ×3, Konstrari Charm ×3, Bushwhack ×4, Multiversal Passage ×4, Ghalta Stampede Tyrant, Improvisation Capstone ×2).
4. Missed swaps and copy counts: per role, best owned card left out vs weakest kept; 1-of vs 4-of choices. Ask "what does it do on the turn I win?" before endorsing a cut of an expensive card.
5. One plan with a T1–3 / T4–6 / close shape; flag cards serving neither.
6. Gate: `MTG_DB_DIR=... npx tsx scripts/deck-gate.ts "$(cygpath -m "$PWD")/verify-2026-10-05/ghalta/final.txt" --format standard --owner 1 --source arena` (ownership FAIL on Aerid, Hexhaven, Ghalta the Unstoppable is expected).

**Output.** `REFUTE.md`, ≤ 110 lines: verdict (CONVERGED / NOT CONVERGED), errors table, cut KEEP/REJECT table, missed swaps ranked `In | Out | why`. Chat reply ≤ 6 lines.

**Do not.** Edit anything but REFUTE.md. No git, DB writes, taskkill or vitest. ≤ 45 tool calls.
