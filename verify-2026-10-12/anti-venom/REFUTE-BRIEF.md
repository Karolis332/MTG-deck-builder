# Refuter brief — Anti-Venom Competitive Brawl build

**Goal.** Try to break the builder's `final.txt` / `build-report.md` (in `verify-2026-10-12/anti-venom/`). Return CONVERGED or NOT CONVERGED, with the swaps that beat the list.

**Inputs.**
- `BUILD-BRIEF.md` — the operator's plan and the known facts. The format is now **Arena Competitive Brawl**, 1v1. Chrome Mox and Flawless Maneuver are legal there per the operator. The gate's legality FAIL on them is a known false positive: `getLegalityKey` maps competitivebrawl to brawl.
- `pool.txt` — 996 owned, legal cards with full oracle text. Read all of it; never pre-filter.
- `quick-v1.txt` — the previous list (the operator has it on the clipboard).
- `final.txt` and `build-report.md` — the builder's output.
- Rules: `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md`, `reference/principles.md`, `reference/win-conditions.md`.

**Verify (each point PASS/FAIL with evidence).**
1. **Oracle exactness.** Re-check every quoted card claim in `build-report.md` against `pool.txt`. Watch for timing words, "another"/"other", targets, "if … was cast", and "until end of turn".
2. **Combo lines.** Walk each claimed loop step by step under the comprehensive rules:
   - Gyatso trigger vs equip resolution order.
   - Commander-to-exile SBA (CR 903.9a): the owner may decline.
   - Casting from exile for {2} carries no commander tax.
   - Altar mana pays the generic cost.
   - Perilous Myr's damage and Gandalf's doubling.
   - Any summoning-sickness, sorcery-speed or "once each turn" limits.
   Give the exact mana per iteration.
3. **Dead cards.** For every card, how often is it live in this plan? Name anything that does nothing for the plan.
   - Mesmeric Orb is symmetric in 1v1 and fills the opponent's graveyard too.
   - Krang costs 9 to cast.
   - The One Ring, The Arkenstone and Tune Up need a case.
4. **Convergence.** For each role, test the strongest owned candidates the builder did not include against the weakest kept card of that role, including the 8 operator cards the builder cut (Mox Amber, Mox Opal, Day of Judgment, Urza's Ruinous Blast, Helping Hand, Lavaspur Boots, Cloudshift, Sheltered by Ghosts). Report the stop proof or the better swap.
5. **Mana.** WWWWW commander, land count, colourless sources; is the goldfish claim in the report plausible?
6. **Gate.** Run `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-10-12/anti-venom/final.txt --format competitivebrawl --owner 1 --source arena`. Only the known FAILs are acceptable.

**What may change.** Write only `verify-2026-10-12/anti-venom/REFUTE.md`. Never edit `final.txt` or any other file.

**What not to do.**
- Don't run the model lab.
- Don't taskkill node.
- Don't propose cards that aren't in `pool.txt`.

**Output.**
- `REFUTE.md` ≤ 200 lines: verdict, numbered errors (severity HIGH/MED/LOW, quote, fix), swap table Out → In → why, combo walk-through.
- Final message ≤ 12 lines: verdict, error counts by severity, proposed swaps.
- Budget: about 60 tool calls. Write `REFUTE.md` early and refine it in place.
