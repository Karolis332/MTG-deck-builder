# Build: paper Tam, one tutorable win condition + consistency + walker protection (2026-10-03)

**Goal.** Rebuild the operator's sleeved paper Commander deck `decks/paper/decks/tam-the-possibility.txt` (Tam, the Possibility, WUBRG superfriends, 4-player pod, 40 life) so that it has:
1. **ONE primary win condition the operator can name, follow and tutor for**, plus at most one backup;
2. **more consistency** (card flow, tutors, mana);
3. **more planeswalker protection** (against attacks first, then removal).

**Operator's words.** "The tam deck performed poorly in yesterday's games, there is no clear wincon that I can follow or tutor for." Symptoms they chose: built a board but never closed; walkers got attacked down; ran out of cards. Then: "we need to add more consistency and perhaps more protection for the planeswalker" and "the tam deck is hella inconsistent with no clear wincon".

**Diagnosis to confirm or refute first.** The pilot guide (`.claude/skills/deck-building/reference/decks/tam-the-possibility.md` §1) lists **six** ranked win lines and no tutor package: that is the "no clear wincon" complaint in writing.

## Read first (repo root C:/Users/QuLeR/MTG-deck-builder)
- `.claude/skills/deck-building/SKILL.md` §2 (hard rules) and `LEARNINGS.md` (Tam entries especially).
- The pilot guide above (engine map, rulings already checked).
- `verify-2026-10-03/tam-wincon/deck.md`: the current list with DB oracle text.
- The COMPLETE candidate set, read all of it:
  - `chunk-1.md` … `chunk-8.md`: 1,135 free cards. `[ASSUMED FRA]` = unregistered Reality Fracture common/uncommon, treat as owned; `[IF-OWNED FRA]` = rare/mythic, only if the operator says yes (list them separately, never in the main list).
  - `other.md`: 421 cards sleeved in other decks, tagged `[IN <deck>]`. A move needs a named backfill for the donor from the free pool. Tazri is top priority: take from Tazri only in a trade that leaves it whole. Cabbage's Walking Ballista is its combo kill (lock). `urza-draft` cards are reserved for the unsleeved Urza deck: take one only if the gain is large, and name the Urza backfill.
- Five sonnet screens (`screen-1.md` … `screen-5.md`) are running in parallel with one verdict per pool card. Use them as a cross-check when they land; do not wait for them for the quick list.
- Oracle text: the files above or `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, oracle_text from cards where name in (...)"`. Rulings: the Scryfall API (`https://api.scryfall.com/cards/named?exact=<name>` then its `rulings_uri`) or the current CR (magic.wizards.com/en/rules). Never from memory.

## Known facts and locks
- Operator choices (do not re-propose without new information): Quintorius Kand and Entrust the Spark stay (Entrust sacrifices **Jace tokens**); **34 lands** is their choice (state the Karsten number once, then respect it); Turbulent Wilderness stays; Dragonskull Summit is sleeved.
- Jace, Multiverse Architect (FRA precon commander) is registered and hot-swaps into Tam for Chandra, Awakened Inferno.
- Ways are enchantments; the Jace token they create/empower counts as a Jace and as a planeswalker type for Tam.
- Loyal Tutor puts the walker on top (costs a card in a deck that already draws walkers).
- A loyalty cost is paid first; a walker paying its last counter dies before the Mentor refund (CR 704.5i). Sarkhan the Masterless +1 turns walkers into non-walkers (Tam X = 0).

## Steps
1. **Win-condition table.** For every kill line in the deck + pool (current six lines, plus anything the pool offers: infinite or two-card combos, mass drain, alt-wins, overruns, Jace RS 0 + Jace, Memory Adept −7, Ob Nixilis HT + draw-20, Vraska poison, Chain-Veil-type loops, Doubling-Season-type doublers if owned), give: pieces · how many cards in the final list find or replace each piece (tutors + redundancy) · P(assembled by T7 and T9), computed with `reference/calcs.py` or a stated hypergeometric · does it kill **all three** opponents or one · what stops it. Pick ONE primary and at most one backup. Every card must serve one of them (or be mana, draw, protection, interaction).
2. **Quick list.** Write `quick-v1.txt` (100 cards, `1 Tam, the Possibility` first, `1 Name` lines, `N Island` etc.), gate it, then IMMEDIATELY SendMessage team-lead with: the primary wincon in one line, the tutor package, the top swaps (Out → In), the gate result. Then continue.
3. **Converge** to a fixed point: per role, best card left out vs weakest kept, across all 1,135 + 421 cards, until a full pass finds no improving swap. Roles: wincon pieces, tutors, draw, walker protection (anti-attack / anti-removal / recursion), ramp, removal, wipes, Ways, walkers, lands. Ask "what does it do on the turn I win?" before cutting anything expensive. Score synergy density per §2 (each pair once).
4. **Gate** the final list:
   ```
   { printf 'Commander\n'; head -1 L.txt; printf '\nDeck\n'; tail -n +2 L.txt; } > "$TEMP/g.txt"
   MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
   ```
   `plan` FAIL is a known false negative. `ownership` FAILs on ASSUMED FRA cards are expected (unregistered); list them.

## Output (all in `verify-2026-10-03/tam-wincon/`)
- `final.txt`: the converged 100.
- `build-report.md`, ≤ 220 lines:
  - §1 Win-condition table and the pick, with a **win-turn checklist** the operator can follow (what to tutor first, what to hold up, the exact activation order on the kill turn).
  - §2 Consistency before → after: draw sources, tutors, mana (P(Tam on T3), P(engine by T4), lands).
  - §3 Protection before → after: anti-attack, anti-removal, recursion, with DB quotes.
  - §4 Swap table `Out → In → why (DB quote)`, with donor deck + backfill for every move.
  - §5 Stop proof per role (weakest kept vs best left out).
  - §6 Gate output. §7 IF-OWNED FRA cards that would make the list, and buys (≤ 5, only if a gap remains).
- Chat reply ≤ 10 lines.

## Do not
- Edit anything outside `verify-2026-10-03/tam-wincon/`.
- Run git, paper-sync, DB writes, taskkill (never kill any node process) or vitest.
- Exceed ~80 tool calls; batch DB queries. If you run short, write what you have to `build-report.md` and say where you stopped.
