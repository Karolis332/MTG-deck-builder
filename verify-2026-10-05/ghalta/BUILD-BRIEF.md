# Optimise: the operator's Arena Standard R/G deck (2026-10-05)

**Goal.** The operator asked: "use the model to evaluate this deck and optimize it". Optimise their 60-card **Arena Standard** deck (`input.txt`, R/G: walkers + "Way of the …" enchantments + three Ghaltas + ramp) into the strongest consistent 60 from cards they own on Arena. Keep their plan if it holds up; if a different plan built from the same cards is clearly stronger, say so in one section, but the main list stays an optimisation of theirs.

## What the app's model said (already run; output in `model.json`)
- Optimizer (`services/build-api/optimize.ts`): score 55. Notes: 20 lands vs Karsten 23; "ramp 18 vs max 8"; card draw 2 (min 4); protection 0; avg MV 3.90 vs target 2.7. Its swaps cut Puppetbeast, Aerid, Tethermage, Paradox, Pyromancer, Spider Manifestation and Llanowar Elves for generic Gruul meta cards (Surrak, Leatherhead, Meltstrider's Resolve, Burst Lightning, Self-Destruct, Ba Sing Se, Starting Town …).
- Deck Score 1.4.0-rc10: **61** (provisional), rank 28 vs the Standard reference. Components: mana 79, curve 79 (six 7+-drops), interaction 90, advantage 94.5, win 85.
- ⚠️ The optimizer's "ramp" quota is a commander heuristic and counts Ways/Tethermage/Puppetbeast as ramp; its adds are popularity picks with no check against this deck's plan. Treat it as one signal, verify each claim against card text, and report which of its swaps you accept or reject and why.

## Inputs (repo root C:/Users/QuLeR/MTG-deck-builder, folder `verify-2026-10-05/ghalta/`)
- `input.txt` (the deck), `model.json` (full model output).
- `pool.md`: the COMPLETE candidate set, 1,284 Arena-owned Standard-legal R/G/colourless cards with DB oracle text and owned copies (capped at 4); deck cards first. Basic lands unlimited. Read all of it.
- Meta: the DB holds Standard community decks with results: tables `community_decks` / `community_deck_cards` (format 'standard'), `meta_card_stats`. Query with `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "<sql>"` (it opens the live DB). Use it to see what R/G and walker decks are winning now and what the operator's list must beat.
- Rules: `.claude/skills/deck-building/SKILL.md` §2 (oracle exactness, synergy, one plan, converge with a stop proof) and `LEARNINGS.md`; mana maths in `.claude/skills/deck-building/reference/principles.md` (Karsten 60-card).
- Rulings: Scryfall API or the current CR, never from memory.

## Steps
1. Read the 21 deck cards' text and name the plan (T1–3 / T4–6 / close). Judge each model claim.
2. **Quick list**: write `quick-v1.txt` (Arena format: `Deck` header, `N Name` lines), gate it, then IMMEDIATELY SendMessage team-lead with the plan in one line, the top changes (Out → In with counts) and the gate result. Then continue.
3. **Converge** to a fixed point over all 1,284 cards: per role (ramp, threats, finishers, removal, card advantage, protection, lands), best left out vs weakest kept, including copy counts (1-ofs vs 4-ofs). Land count by Karsten for 60 cards with the deck's real curve.
4. Re-run the model on your final list and report the before → after score:
   `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx verify-2026-10-05/ghalta/run-model.ts verify-2026-10-05/ghalta/final.txt > verify-2026-10-05/ghalta/model-final.json` (needs a `Deck` header; run from the repo root).
5. Gate: `MTG_DB_DIR=... npx tsx scripts/deck-gate.ts "$(cygpath -m "$PWD")/verify-2026-10-05/ghalta/final.txt" --format standard --owner 1 --source arena`. Ownership FAILs on Hexhaven Invigorator, Ghalta the Unstoppable, Konstrari Charm, Aerid Konstrari are expected (owned, newer than the 4-day-old Arena CSV).

## Output (in `verify-2026-10-05/ghalta/`)
- `final.txt` (Arena import format) and `build-report.md`, ≤ 160 lines: §1 plan; §2 model claims accepted/rejected; §3 swap table `Out → In (counts) → why (DB quote)`; §4 stop proof per role; §5 mana (Karsten, colour sources); §6 model + Deck Score before → after and gate; §7 wildcard crafts worth making (≤ 5, unowned, only if a gap remains) and an optional sideboard of 15 if obvious.
- Chat reply ≤ 10 lines.

## Do not
Edit anything outside `verify-2026-10-05/ghalta/`. No git, DB writes, paper-sync, taskkill (never kill node) or vitest. ≤ 70 tool calls; batch DB queries.
