# Refute brief: deck primers (Opus refuter, fresh context), 2026-10-07

**Goal.** The primers are about to be shown to the operator and later shipped in the Black Grimoire app. Find every false statement in them:
- wrong oracle quotes;
- wrong rules;
- wrong maths;
- win lines that do not work with the list;
- swap reasons that misstate what a card does.

Fix each one in place.

**Scope.** The primers named in your prompt: `decks/paper/primers/<slug>.json`. The schema is in `src/lib/deck-primer.ts`. How they were written: `verify-2026-10-07/primers/PRIMER-BRIEF.md`.

**Check, with evidence.**
1. **Every `quoteOut` / `quoteIn`, word for word**, against the DB:
   `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, oracle_text from cards where name = '…'"`.
   - A quote may be a contiguous excerpt.
   - It must not paraphrase, merge clauses, or change reminder text.
2. **Every rules claim in reasons, flows, engine notes, pilot rules and keepers** (sacrifice timing, counters, "another", "until end of turn", summoning sickness CR 302.6, legend rule, layers, triggers): check it against the CR or Scryfall rulings, never memory. Cite the rule number in your log.
3. **Every win condition.**
   - Are all pieces in `deck.list`?
   - Does the flow work in that order, at that mana?
   - Is the `damage` arithmetic right?
   - Is the `turn` claim sourced?
4. **Every swap reason.** Does the cut card actually do what is claimed, and the added card? Check numbers against the cited evidence file.
5. **Every metric.** It must appear in the cited source file.
6. **Card names in `[[…]]` and card fields.** They must be cards in the list, except swap OUTs and near-tie alternatives.

**Fix rules.**
- Edit the primer JSON directly, with the minimal fix.
- After every edit, re-run until PASS:
  ```
  MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/primer-check.ts decks/paper/primers/<slug>.json --base <base>
  ```
  Bases:
  - Tam, Tazri, Meren, Imotekh, Urza: `verify-2026-10-07/primers/base/<slug>.txt`
  - Inspirit: `decks/paper/decks/inspirit-flagship-vessel.txt`
  - Gilanra: `decks/paper/decks/gilanra-alena-partners.txt`
  - Bumi: `decks/paper/decks/bumi-unleashed.txt`
- Never change which cards are in or out. Card choices are not yours to change; flag disagreements instead.

**Not allowed.**
- No edits to deck lists, the registry, the DB, code, or briefs.
- No git, no paper-sync, no taskkill.
- No file named `report.md`.

**Output.** Write `verify-2026-10-07/primers/REFUTE-<name in your prompt>.md`, ≤ 80 lines:
- the verdict per primer (PASS, or FIXED with n errors);
- an errors table: primer, field, claim, finding, source, severity, fixed y/n;
- card-choice disagreements, if any, flagged and not applied.

**Output limit.** Final reply ≤ 6 lines.

**Budget.** About 80 tool calls. Prioritise the HIGH-risk claims: win-line maths, rules and quotes on swaps.
