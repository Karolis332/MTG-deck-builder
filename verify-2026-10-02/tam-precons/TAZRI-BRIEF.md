# Paper Tazri — precon + cross-deck fixed point (2026-10-02)

**Goal.** Make the operator's PAPER Commander deck *Tazri, Beacon of Unity* (4-player pod, 40 life, 100 singleton,
WUBRG identity via hybrid) more consistent and more powerful, using (a) two precons now physically in hand —
Secrets of Strixhaven Commander *Quandrix Unlimited* (Zimone) and *Silverquill Influence* (Killian) — and (b) cards
moved from the LOWER-priority paper decks (Meren, Imotekh, The Cabbage Merchant) with the donor backfilled from the
precons or the open pool. Tazri and Tam are both TOP priority: Tam's cards are off-limits; precon cards are shared and
a parallel agent is building Tam from the same precons. Converge: stop only when a full pass finds no improving swap
for Tazri, and prove it. No top-N caps.

**Tazri.** "{4}{W}. This spell costs {1} less to cast for each creature in your party. {2/U}{2/B}{2/R}{2/G}: Look at the
top six cards of your library. You may reveal up to two Cleric, Rogue, Warrior, Wizard, and/or Ally cards from among
them and put them into your hand." Party = Cleric, Rogue, Warrior, Wizard (changelings count).

**Inputs (repo root C:/Users/QuLeR/MTG-deck-builder).**
- Tazri baseline: registered `decks/paper/decks/tazri-beacon-of-unity.txt`. The 09-28 audit proposed ~12 swaps that
  were never applied: `verify-2026-09-28/deck-audit/tazri-beacon-of-unity-final.txt` (+ `-report.md`,
  `-fable-review.md`, `-deck.md` oracle, `-pool.md` open-pool oracle). Some of those INs were ASSUMED / not
  registered (Samut, Rescue Girl, Grand Abolisher, Growth Spiral …): a card is owned only if it is in
  `decks/paper/collection.txt`, a precon list, or a donor deck. Re-judge those 12 inside this pass.
- Locks (never cut): Swords to Plowshares, Fellwar Stone, Inspiring Vantage, every fetch land and shock land in
  Tazri, and the remaining gate locks named in the 09-28 report (find the 8-lock list there).
- Precons: `verify-2026-10-02/tam-precons/precon-oracle.md` (all 171 non-basic precon cards, [Q]/[S]); lists
  `QuandrixUnlimited_SOC.txt`, `SilverquillInfluence_SOC.txt`. Every precon card is owned (one copy; Fellwar Stone,
  Path of Ancestry, Fabled Passage, Sol Ring, Arcane Signet, Command Tower, Terramorphic Expanse, Exotic Orchard,
  Study Hall come as extra copies). Precon Wizards/Clerics are many: Zimone ×3, Nev, Deekah, Owlin Spiralmancer,
  Ingenious Prodigy, Quandrix Apprentice, Guardian Augmenter, Keen Duelist, Kor Spiritdancer, Mangara, Nils,
  Starfield Mystic, Combat Calligrapher … — read them all, don't trust this list.
- Donor decks: `decks/paper/decks/{meren-of-clan-nel-toth,imotekh-the-stormlord,the-cabbage-merchant}.txt`; donor
  plans in `verify-2026-09-28/deck-audit/<deck>-report.md`. Open pool: `decks/paper/open-cards.txt`.
- Operator notes: Land Tax works in Tazri (10 basics) but not in Tam — judge it. Eclipsed Steppe / Sodden Verdure
  ("enters tapped unless you control two or more basic lands") are untapped in Tazri.

**Method.** Rank every kept non-locked card and every candidate per role on one scale (party density matters:
Tazri's cost and its activation both scale with Cleric/Rogue/Warrior/Wizard count). Swap best candidate for weakest
kept; repeat until the best remaining loses to the weakest kept. Every donor-deck card moved in needs a backfill for
the donor (inside its identity, fitting its plan) — state both sides. Recount Tazri's colour sources after land changes.

**Checks.** `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <list> --format commander`
(ownership skipped — verify by hand). Write `verify-2026-10-02/tam-precons/tazri-proposed.txt` (`1 Name` lines,
commander first) and donor lists as `<deck>-tazri-backfill.txt` if any.

**Output.** `verify-2026-10-02/tam-precons/tazri-report.md` (≤ 200 lines): 1) swaps ranked IN | OUT | source |
why (quote); 2) verdict on each of the 12 unapplied 09-28 swaps (keep/drop, owned?); 3) donor backfills;
4) **Contested**: every precon card you took that a superfriends/lifegain deck (Tam) could also want, with value to
Tazri (high/med/low) and Tazri's next-best alternative; 5) stop proof; 6) gate lines. Chat reply ≤ 15 lines.

**Do not.** Edit decks/paper/, paper-sync, DB writes, git, taskkill, vitest. Budget ≤ 60 tool calls; write the report
early and overwrite as you converge.
