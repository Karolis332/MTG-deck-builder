# Paper Tam — precon + cross-deck fixed point (2026-10-02)

**Goal.** Make the operator's PAPER Commander deck *Tam, the Possibility* (4-player pod, 40 life, 100 singleton,
WUBRG) more consistent and more powerful using (a) two precons now physically in hand — Secrets of Strixhaven
Commander *Quandrix Unlimited* (Zimone) and *Silverquill Influence* (Killian) — and (b) cards sleeved in the
operator's OTHER paper decks, moved into Tam, with the donor deck backfilled from the precons or the open pool
(operator's example: "cutting Sylvan Library from Meren and giving it to Tam"). Converge: stop only when a full pass
finds no improving swap for Tam, and prove it. No top-N caps.

**Operator signals.** Named interest: Tomik, Wielder of Law; Land Tax; Turbulent Moor; Ghostly Prison. Judge each
on its text for Tam (and, if it fails Tam, whether a donor deck wants it as a backfill).

**Inputs (repo root C:/Users/QuLeR/MTG-deck-builder).**
- Tam baseline: `verify-2026-09-28/deck-audit/tam-the-possibility-final.txt` = registered list
  `decks/paper/decks/tam-the-possibility.txt` + 5 converged-but-unapplied swaps from 09-30 (Ral Zarek, Tezzeret
  Master of the Bridge, Nissa Steward of Elements, Kiora of Salt and Sand, Chandra Awakened Inferno). Read
  `verify-2026-09-28/deck-audit/tam-the-possibility-fable-review.md` §1–§10 (plan, weakest cards, stop proof) and
  `tam-the-possibility-deck.md` (oracle of the 09-28 list) first.
- Precons: `verify-2026-10-02/tam-precons/precon-oracle.md` (oracle of all 171 non-basic precon cards, [Q]/[S]).
  Precon lists: `QuandrixUnlimited_SOC.txt`, `SilverquillInfluence_SOC.txt`. Every precon card counts as owned.
- Other decks: `decks/paper/decks/{meren-of-clan-nel-toth,tazri-beacon-of-unity,imotekh-the-stormlord,the-cabbage-merchant}.txt`.
  Ranked list with oracle: run `PYTHONIOENCODING=utf-8 py verify-2026-10-02/tam-precons/other-decks.py` (top 160 by
  EDHREC). Donor plans: `verify-2026-09-28/deck-audit/<deck>-report.md` / `-fable-review.md`. Only ONE copy of each
  card exists unless the precon brings another (e.g. Fellwar Stone, Path of Ancestry, Fabled Passage).
- Open pool (cards in no deck): `decks/paper/open-cards.txt`; Tam already converged against it on 09-30
  (`tam-the-possibility-pool.md` has oracle). Use it for donor backfills too.

**Tam engine.** Way of the Paradox (life per loyalty activation) × Way of the Mentor (loyalty on every walker per
life-gain event); Tam "{W}{U}{B}{R}{G}, {T}: Proliferate X times" (X = walker types). Locks — never cut: all seven
Ways, Kaya's Ghostform, Ob Nixilis of the Black Oath, Ob Nixilis the Hate-Twisted, Thrummingbird, Kaito Dancing
Shadow, Chimil, Esika, Jace Memory Adept, Great Divide Guide, Timeless Lotus, Great Hall of the Citadel, Seachrome
Coast, Cinder Glade, Fumigate, Shivan Reef, Mana Confluence. Land count 35 (operator-accepted).

**Known starting observations (verify, don't trust):** Tam's mana is its weakness — 10 Annex/Commons enter tapped
until a walker is out, 5 tri-lands always tapped, checklands (Isolated Chapel, Woodland Cemetery, Clifftop Retreat,
Rootbound Crag) and Bleachbone Verge see few typed lands. Tazri holds Hallowed Fountain, Steam Vents, Stomping
Ground, Overgrown Tomb, Sacred Foundry, 3 fetches, 3 triomes, Chromatic Lantern; Tazri pips W26 B19 G15 U14 R6 and
10 basics (so precon Eclipsed Steppe / Sodden Verdure enter untapped there, not in Tam). Turbulent Moor/Wilderness:
"enters tapped unless your opponents control eight or more lands" (≈ turn 3 in a 4-pod), typed.

**Method.**
1. Tam: rank every kept non-locked card and every candidate (precon, other-deck, open pool) per role on one scale.
   Swap best candidate for weakest kept card; repeat until the best remaining candidate loses to the weakest kept.
2. Every other-deck card moved into Tam needs a backfill IN for its donor deck (precon or open card, inside the
   donor's colour identity, fitting its plan). A move is allowed only if Tam's gain clearly exceeds the donor's loss
   after backfill — state both sides. Do not gut a donor's mana: recount its colour sources after land moves.
3. Lands: count Tam's colour sources (untapped by turn 3) before/after vs pips; keep 35.
4. Stop proof per Tam role, quoting oracle.

**Checks.** Gate each changed deck (ownership skipped — precon cards are not registered yet; you verify ownership
by hand against `decks/paper/collection.txt` + the precon lists):
`MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <list> --format commander`
`plan` FAIL on Tam is known (no superfriends plan). Write lists to `verify-2026-10-02/tam-precons/<deck>-proposed.txt`
(same format as decks/paper/decks: `1 Name` lines, commander first).

**Output.** `verify-2026-10-02/tam-precons/report.md` (≤ 220 lines): 1) verdicts on the four named cards;
2) Tam swaps ranked: IN | OUT | source (precon Q/S, deck move, open) | why (quote); 3) donor backfills: deck | card
leaving | IN | why the donor is ≥ roughly whole; 4) Tam mana table before/after; 5) stop proof; 6) gate lines;
7) precon cards left over that improve OTHER decks without touching Tam (short list, optional).
Chat reply ≤ 15 lines.

**Do not.** Edit decks/paper/, run paper-sync, write the DB, git, taskkill, vitest. Budget ≤ 60 tool calls; write
report.md early and overwrite as you converge.
