# Arena Jace — planeswalker (superfriends) version, fixed-point build (Fable)

**Goal.** The operator asked for a **planeswalker version** of their **Jace, Multiverse Architect** deck for **MTG Arena
Historic Brawl**: 100 cards, singleton, commander included, 1v1, 25 life, owned Arena cards only. A creature-reveal version
already exists (`start.txt` = `../arena-jace/final.txt`, with its report in `../arena-jace/build-report.md`). This one wins
through planeswalkers.

Start from `start.txt` and swap until no remaining candidate beats any card in the deck. Operator rule: no top-N caps. The
stop condition is a full pass that finds zero improving swaps, and you must prove it.

**Inputs.**
- In `verify-2026-09-30/arena-jace-pw/`:
  - `start.txt`;
  - `walker-cards.md` — EVERY owned W/U/B/R planeswalker (33, commander included), plus every owned card whose text names
    planeswalker, loyalty or proliferate (134). It was extracted by `extract-walker-cards.py` from the full pool, and it
    supplements the pool files rather than replacing them.
- In `verify-2026-09-30/arena-jace/`:
  - `pool-01.md` … `pool-08.md` — full oracle text of all 3,525 owned Brawl-legal W/U/B/R cards not in the seed;
  - `deck.md` — the seed's 100 cards with oracle text;
  - `screen-01.md` … `screen-08.md` — candidates that screeners passed for the creature version. Screeners judged those
    against a creature-reveal plan, so walker-support cards may have been dropped. For walkers and walker support, use
    `walker-cards.md`; for everything else, use the screens and the pool.
- Simulators copied from the creature build: `sim/landsim.py`, `sim/hits.py`, `sim/card.py`. Fix their paths and hit tables
  for this deck before running them.

**Commander.** Jace, Multiverse Architect ({1}{W}{U}{B}{R}, loyalty 4). Quote its full text from `../arena-jace/deck.md`.
- Static: at the beginning of combat on each opponent's turn, they may pay {2}; if they don't, their creatures can't attack
  Jaces you control. It protects Jaces only.
- +1: draw two, then put a card from your hand on the bottom.
- −3: exile another creature or planeswalker you control; reveal until a creature or planeswalker card, put it onto the
  battlefield.

**Superfriends plan.**
- The −3 turns a spent walker (1–2 loyalty) into a fresh walker, or into a creature bomb.
- A walker-heavy library makes every reveal a new walker, entering with full loyalty.
- Protection for a board of walkers in 1v1:
  - wipes that spare planeswalkers (Sunfall exiles creatures only);
  - token blockers made by walkers and spells;
  - attack taxes and fogs;
  - Teferi's Protection.
- Loyalty engines: proliferate, Oath of Teferi, the Ways, loyalty doubling, and anything else in `walker-cards.md`.
- Win lines: ultimates, walker damage, and any creature bomb that earns its slot as a hit.
- Decide the walker count, the creature count and the Way count by optimisation, and report your reasoning. Creatures and
  walkers are both −3 hits, so non-hits dilute the reveal. Report the hit distribution: P(walker), P(creature) and
  E[hit value].

**Method.** Follow `../arena-jace/BUILD-BRIEF.md` "Method" steps 1–5 and "Checks" exactly, with these changes:
- the deck dir is `arena-jace-pw/`;
- the starting list is `start.txt`;
- in step 3, rank every walker in `walker-cards.md` against the kept walkers. None may be skipped.

Mana:
- Run the Monte Carlo (`sim/landsim.py`) and report: P(3 mana by T3), P(Jace on T5), P(WUBR by T5) and flood by T6, on the
  play and on the draw.
- Compare two or three land counts side by side.
- Treat the creature build's Jace-on-T5 figure (61.2 % play / 71.2 % draw) as a baseline to beat.

Gate:
- Run: `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-jace-pw/final.txt --format brawl --owner 1 --source arena`
- A `plan` FAIL is a known gate limit for this commander.
- The gate has no superfriends plan; do not chase it.

**Output files** in `arena-jace-pw/`:
- `final.txt`;
- `build-report.md` (≤ 250 lines), with the same 7 sections as the creature build. In section 2, compare the health table
  against `start.txt`.

**Do not.**
- Edit anything outside `arena-jace-pw/`. In particular, do not touch `arena-jace/`: a reviewer is editing its `final.txt`
  right now.
- Write to the DB, run paper-sync or vitest, taskkill, or use git.
- Invent cards: every IN must appear in a pool file, `deck.md` or `walker-cards.md`.

**Chat reply** ≤ 15 lines:
- the swap count and the top 10 swaps;
- walker, creature and Way counts;
- the −3 hit distribution;
- the gate verdict;
- the chosen land count;
- P(Jace on T5).
