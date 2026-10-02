# Refute: the operator's paper Urza deck (fresh context, 2026-10-02)

**Goal.** Decide whether `verify-2026-10-02/urza/final.txt` is the strongest consistent build of the operator's paper Commander deck. The deck is mono-blue artifacts, commanded by Urza, Lord High Artificer, for a 4-player pod, built only from free owned cards. Find errors and missed swaps. You don't build; you verify.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder):
- `urza/urza-box.txt`: the operator's physical box. 86 cards, no commander.
- `urza/final.txt`: the proposal. Its reasoning is in `build-report.md` and the per-card verdicts are in `verdicts.md` (244 rows).
- `urza/pool.md`: the COMPLETE candidate set, 244 free cards with DB oracle text, box cards tagged `[IN BOX]`. Basics are unlimited.
- Rules and past mistakes: read `.claude/skills/deck-building/SKILL.md` §2 and `LEARNINGS.md` first.
- Oracle text comes from pool.md or the DB: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, oracle_text from cards where name in (...)"`. Rulings come from the Scryfall API or the current CR (magic.wizards.com/en/rules). Never from memory.

**Facts.**
- Urza's only copy hot-swaps from the Inspirit box, and Emry takes Urza's Inspirit slot while he's away. So Emry is NOT available here.
- The builder kept 27 of the box's 59 nonbasics and cut 32, mostly the spell package: Talrand, Archmage Emeritus, Baral, Commandeer, cantrips, Solve the Equation, Hydro-Man.
- The operator built that box on purpose, so every box cut needs a named, text-based loser-to-winner reason.

**Check, in this order:**
1. **Every quote** in build-report.md and the swap table matches the DB: timing words, "another", targets, "Enchant …" lines.
2. **Every number.** Recompute:
   - the Super State kill: "9 + N", "22/22 at 13 artifacts", "two swings kill 40-life players", and what happens to the Aura when the Construct dies or gets bounced;
   - Kuruk's "waterbend 20";
   - the Construct's size;
   - the artifact count (31);
   - Karsten 37.5–38.1 and the 37 + MDFC land count;
   - the rock count.
3. **Rules claims.** For example:
   - Vexing Bauble countering our own free casts;
   - Super State's damage copying and commander damage;
   - Urza's mana ability on summoning-sick artifacts. It is not a {T} ability of the creature, so check CR 302.6 / 605.
   - Karn −2 "outside the game" in paper.
4. **Box cuts.** Rule on every box card the build cuts: KEEP the cut or REJECT it, with the DB quote. Check especially whether the spell package (Talrand + instants/sorceries + Archmage + Baral) is a stronger or comparable plan than the artifact plan, given that Urza's mana works for spells too.
5. **Missed swaps.** For every role, compare the best card left out with the weakest card kept, across all 244 pool cards. Spot-check 10 OUT rows in verdicts.md.
6. **One plan.** State the primary and backup plans and the T1–3 / T4–6 / close shape. Flag any card that serves neither plan.
7. **Mana.** Count blue sources and rocks against the curve.

**Output.** Write `verify-2026-10-02/urza/REFUTE.md`, ≤ 160 lines:
- Verdict line: CONVERGED or NOT CONVERGED.
- Box-swap table: `Out (box) | In | KEEP/REJECT | DB-quoted reason`.
- A table of errors and fixes.
- Missed swaps, ranked: `In | Out | why`.
- The operator decisions still open.

Chat reply ≤ 10 lines.

**Do not.** Edit anything but REFUTE.md. No git, paper-sync, DB writes, taskkill or vitest. Budget ≤ 60 tool calls; batch the DB queries.
