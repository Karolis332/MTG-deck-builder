# Builder brief — Anti-Venom, Horrifying Healer (Arena Historic Brawl, 100 cards, mono-W, 1v1)

**Goal.** Converge the operator's Anti-Venom deck to the best 100 from the owned Arena pool, starting from `quick-v1.txt`.
Operator's plan, verbatim: "fill the grave very fast, have catch up ramp and ways to flicker him ... so that he remains on the field, i airbend or blink him after filling my grave".

**Known facts (verified against the DB oracle text):**
- Anti-Venom {W}{W}{W}{W}{W}: "When Anti-Venom enters, if he was cast, return target creature card from your graveyard to the battlefield." Flicker (Cloudshift, Ephemerate, Flickering Hound, Teleportation Circle) does NOT re-trigger him; airbend does (exile, recast for {2}, no commander tax from exile).
- Monk Gyatso turns any targeting of Anti-Venom (equip, flicker spell, ETB target) into an airbend ("you may").
- Combo: Anti-Venom + Gyatso + Lightning Greaves (equip {0}) + Ashnod's Altar (sacrifice the reanimated creature for {C}{C}, which pays the {2} recast) = an infinite loop of the reanimated creature's enter ability. Oltec Matterweaver (Gnome per creature cast) makes it work without a target and turns an equip-{1} equipment into a net-positive loop.
- Gandalf the White doubles Anti-Venom's enter trigger and gives legends flash.
- Chrome Mox and Flawless Maneuver are banned in Brawl, and the original list had 141 cards.

**Scope / inputs (all in `verify-2026-10-12/anti-venom/`).**
- `pool.txt` — every owned, Brawl-legal W/colourless Arena card with full oracle text (994; `IN` = in the operator's 141-card list). Never pre-filter it; read it all.
- `original.txt` — the operator's list.
- `quick-v1.txt` — the starting point (gate PASS except the `plan` false negative and The Echoverse Fulcrum ownership, which was crafted after the CSV and is owned).
- Rules: `.claude/skills/deck-building/SKILL.md` §2, `reference/principles.md` (mana maths), `reference/win-conditions.md`.

**What may change.** Only your new files in that folder: `final.txt` and `build-report.md`.

**Verify.**
- `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-10-12/anti-venom/final.txt --format brawl --owner 1 --source arena` must PASS, except `plan` and the Echoverse ownership.
- Every card claim quotes the oracle text in `pool.txt` verbatim.
- Converge: swap the best candidate for the weakest kept card of its role until a full pass finds nothing better. Give a stop proof per role (engine/airbend, Gyatso targeters, grave fillers, reanimation targets, ramp incl. catch-up, removal, wipes, protection, recursion, draw, lands). Test every owned candidate of a role against the weakest kept card of that role.
- Synergy density: report min/median links and the 5 lowest cards.
- Lands: state the count and why. The fatties are mostly reanimated, not cast, which inflates Karsten's number. Anti-Venom needs WWWWW, so be careful with colourless lands.

**What not to do.**
- No edits outside your two files.
- Do not run the model lab: it is blind to airbend loops.
- Do not taskkill node.
- Do not bring back the two banned cards.

**Output format (`build-report.md`).**
1. Verdict.
2. Out → In → why table vs `quick-v1.txt`, with quotes.
3. Plan shape: T1–3 / T4–6 / close.
4. Combo lines, with the exact sequence and the mana for each.
5. Stop proofs.
6. Synergy stats.
7. Open risks.

**Output limit.** `build-report.md` ≤ 250 lines; final message to me ≤ 15 lines (verdict, swap count, gate result).
