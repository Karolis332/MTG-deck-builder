# Build: the operator's paper Urza deck (mono-blue artifacts), 2026-10-02

**Goal.** Build the strongest consistent 100-card PAPER Commander deck (4-player pod) for the operator's Urza artifact deck, using only free owned cards:
1. Pick the commander.
2. Ship a playable quick list fast.
3. Converge it with a stop proof.

**Read first** (repo root C:/Users/QuLeR/MTG-deck-builder):
- `.claude/skills/deck-building/SKILL.md` §2.
- `.claude/skills/deck-building/LEARNINGS.md`. Many entries come from the Inspirit build an hour ago:
  - Craterhoof-type finishers.
  - Persistent effects after a sacrifice-tutor.
  - "Enchant creature you control" auras.
  - Proliferate refuelling charge counters.
  - Recompute every number.

## Known facts
- **Pool:** `verify-2026-10-02/urza/pool.md`. It holds all 208 free owned cards that are colourless or mono-blue and Commander-legal, with full DB oracle text. The operator's own Urza list comes first, tagged `[URZA LIST]`. It is the COMPLETE candidate set, so read all of it, in 3 large chunks.
- **Basics:** assume unlimited Islands.
- **Other cards:** a card not in pool.md is unavailable.
- **The operator's Urza list:** `urza-list.txt`. Thirteen of its cards are sleeved in the Inspirit deck and stay there by operator decision, so they are not in the pool:
  - Cyberdrive Awakener, Panharmonicon, Etherium Sculptor, Insight Engine, Repurposing Bay.
  - Cyclonic Rift, Fact or Fiction, Counterspell (both copies are used).
  - Ornithopter of Paradise, Inventors' Fair, Archway of Innovation, Uthros, Titanic Godcore.
- **Commander.** The operator is undecided. Their words: "im putting emry or eluge i dont know yet, mb something from my list fits, but i plan to hot swap emry and urza from the inspirit deck". Compare these candidates and pick one, with a table of DB quotes:
  - **Urza, Lord High Artificer.** Its only copy is sleeved in Inspirit and moves between the boxes; it is tagged HOT-SWAP in the pool. If Urza commands, Emry fills Urza's Inspirit slot while Urza is away, so **Emry is then NOT available here**.
  - **Emry, Lurker of the Loch.** Free. If Emry commands, Urza may sit in this deck's 99 as the hot-swap card.
  - **Sai, Master Thopterist.** Free. Both Urza and Emry are then possible in the 99.
  - **Eluge, the Shoreless Sea.** NOT owned. Mention it only as a buy, and only if the pool clearly fits it better.
  - Any other legendary creature in the pool that fits the artifact plan better.
- Text check: the DB text is in pool.md. For cards outside it, use `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, oracle_text from cards where name in (...)"`. Rulings come from the Scryfall API or the current CR (magic.wizards.com/en/rules), never from memory.
- **Gate:**
  ```
  { printf 'Commander\n'; head -1 L.txt; printf '\nDeck\n'; tail -n +2 L.txt; } > "$TEMP/g.txt"
  MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
  ```
  The `plan` check is a known false negative. If `ownership` fails only on Island counts, report it, but it is not a blocker.

## Steps
1. **Commander.** Compare the candidates on the plan, pool density and mana. Pick one.
2. **Quick list.** Write `verify-2026-10-02/urza/quick-v1.txt`: 100 cards, commander on the first line, `1 Name` lines and `N Island`. Gate it. Then IMMEDIATELY SendMessage team-lead with:
   - the commander pick and one line of why;
   - the path;
   - the gate result.
   Then continue.
3. **Converge.** Optimise to a fixed point: a full pass over all 208 pool cards finds no improving swap.
   - For each role, compare the best card left out with the weakest card kept: ramp, draw, removal, counterspells, wipes, protection, engines, payoffs, finishers, lands.
   - Ask "what does it do on the turn I win?" before cutting any expensive card.
   - Recompute every number you claim (damage, mana, counts).
   - Set the land count by Karsten, using the pool's utility lands and Islands.

## Output
- `final.txt`: the converged list.
- `verdicts.md`: one row per pool card in pool order, `Card | role | IN/OUT | reason (DB quote)`, with a final line `rows: 208`. Check the count by script.
- `build-report.md`, at most 200 lines:
  - §1 Commander comparison and the pick.
  - §2 Plan: primary and backup; T1–3 / T4–6 / close.
  - §3 The list by role.
  - §4 Stop proof per role: weakest kept vs best left out.
  - §5 Mana and land count.
  - §6 Gate output.
  - §7 Operator decisions and buys, including Eluge if relevant.
- Chat reply: at most 10 lines.

## Do not
- Edit anything outside `verify-2026-10-02/urza/`.
- Run git, paper-sync, DB writes, taskkill (or kill any node process) or vitest.
- Exceed about 70 tool calls. Batch your DB queries.
