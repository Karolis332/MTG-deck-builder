# New cards → Meren / Imotekh / Cabbage Merchant / Ramos (2026-10-02)

**Goal.** The operator opened new cards (Reality Fracture and others). Place each one where it improves a PAPER
Commander deck (4-player pod, 40 life). Converge: the stop condition is a pass where no new card beats the weakest
kept card of its role in any deck. Prove it per card. No top-N caps.

**Decks in scope:**
- Meren of Clan Nel Toth (BG reanimation/aristocrats). Baseline: `verify-2026-10-02/tam-precons/meren-of-clan-nel-toth-proposed.txt`.
  - That file is the registered list with Sylvan Library → Greed and Llanowar Wastes → Haunted Mire. Both are still under refutation; treat them as kept.
  - The registered list is 101 cards (Creakwood Liege extra), so one cut is owed.
  - The 09-28 Fable review applies: `verify-2026-09-28/deck-audit/meren-of-clan-nel-toth-fable-review.md`. Read §6 (weakest 5) and §7 (unapplied swaps: Vito, Grave Titan, Dina, Jungle Hollow, Creakwood cut). Keep those swaps as the baseline intent unless a new card beats them.
- Imotekh the Stormlord (mono-B, artifacts/Necrons): `decks/paper/decks/imotekh-the-stormlord.txt`.
- The Cabbage Merchant (mono-G): `decks/paper/decks/the-cabbage-merchant.txt`.
- Ramos, Dragon Engine (WUBRG): `decks/paper/decks/ramos-dragon-engine.txt`.
- Plans and weakest cards for each deck: `verify-2026-09-28/deck-audit/<deck>-report.md` and `-fable-review.md`. Oracle text: `<deck>-deck.md`.
- Tam and Tazri are judged by a parallel refuter. Do not cut from them.

**New cards** (one copy each unless stated). Quote their oracle text from the DB:
`PYTHONIOENCODING=utf-8 py verify-2026-10-02/sisay/q.py "select name, mana_cost, type_line, oracle_text from cards where name = '...'"`
- Liliana the Repentant
- Beifong's Bounty Hunters (open)
- Hexhaven Invigorator
- Loyal Tutor
- The Echoverse Fulcrum ×2
- Consign to Memory (open)
- Konstrari Annex
- Vernal Fen (one open copy; Meren already holds another)
- Woodland Cemetery (possibly a 3rd copy; Meren and Tam hold two)
- Uro, Titan of Nature's Wrath (open)
- Hungering Puppetbeast (already in Cabbage; judge whether it stays)

Tam has first claim on Uro, Loyal Tutor, one Fulcrum and Konstrari Annex. Still report each card's value to your decks, so the operator can choose.

**Method.**
- For each new card and each deck in its colour identity: name its role, then compare it with the 3 weakest kept cards of that role. Quote oracle text for both.
- Swap if it is better. Re-check.
- Contested cards (e.g. Liliana: Meren vs Imotekh): give the value to each deck and allocate to the larger gain.
- Gate each changed list:
  `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <list> --format commander`
  - Ownership FAILs are expected for unregistered new cards. List them.
  - The `plan` FAIL is known.
- Write changed lists to `verify-2026-10-02/tam-precons/<deck>-newcards.txt`, in `1 Name` lines with the commander first.

**Output.** `verify-2026-10-02/tam-precons/newcards-report.md`, ≤ 120 lines:
1. Per-card verdict table: card | best deck | IN for | why (quote) | value elsewhere.
2. Changed lists, with size checks.
3. Stop proof per card.
4. Gate lines.

Chat reply ≤ 12 lines. If the harness blocks the report write, put its full content in the chat reply.

**Do not.** Edit decks/paper/, run paper-sync, write the DB, use git, taskkill or vitest. Budget ≤ 50 tool calls.
