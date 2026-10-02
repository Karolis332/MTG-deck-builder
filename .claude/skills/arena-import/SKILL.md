---
name: arena-import
description: Produce MTG Arena import text that lands in Arena already named and versioned ("Tam Superfriends v3") and records every iteration with its card diff. Use WHENEVER a decklist is handed to the operator for Arena (Historic Brawl, Brawl, Standard, any "arena import", "export to arena", "give me the arena list", "new version of the deck"), and whenever an Arena deck changes after a review, swap, or game analysis.
---

# Arena import: named and versioned

Arena's clipboard import reads an `About` / `Name` header. Without one, every import lands as
"Imported Deck (N)", and nobody can tell which iteration was played. The Arena log records the deck
name, so `scripts/arena-game-report.ts` can split game stats per version only when imports are named.

## Steps

1. **Gate the list first** (`scripts/deck-gate.ts`, see the deck-gate memory). A failing list is not exported.
2. **Export through the script.** Never hand-write the header or the version number:
   ```bash
   npx tsx scripts/arena-import.ts <list.txt> --name "<Deck Base Name>" --note "<why this iteration>"
   ```
   - `--name` is the stable base name. The script appends ` v<N>` from `decks/arena/iterations.json`.
     Reuse the exact base name across iterations: a new name starts a new ledger at v1.
   - `--note`: one line on what changed and why ("Land Tax package; −3 Annexes").
   - `--commander-first`: the list has no section headers and its first line is the commander.
   - `--no-clip` skips the clipboard copy. By default the text is copied, ready for Arena → Decks → Import.
3. **Show the operator**: the Arena name, the `+`/`−` diff the script printed, the file path, and that the text is on the clipboard.

## Behaviour

- Output `decks/arena/<slug>-v<N>.txt`: `About` / `Name <base> v<N>`, then Commander / Companion / Deck / Sideboard.
- Card lines keep their `(SET) 123` suffix so Arena imports the same printing.
- An unchanged card list re-emits the last version instead of bumping it.
- The ledger `decks/arena/iterations.json` holds, per base name, `{v, date, file, note, added, removed}`. Commit it with the list files.
- Names over 40 characters print a warning. Keep base names short: "<Commander> <plan>".

## Existing decks

| Base name | Ledger start |
|---|---|
| Tam Superfriends | v1 = operator's Arena list 2026-10-02 (`verify-2026-10-02/tam-consistency/arena-current.txt`) |
