# Second-most-powerful paper commander with Beledros sleeved (2026-10-08)

Question: with the Beledros Witherbloom 99 sleeved (and every other sleeved deck untouched), which commander gives the next-best paper Commander deck?
Method: `scripts/collection-best-deck.ts` (objective = Deck Score + 10×tempo + 5×keep-7 − 2×role-window penalty, 100 games), two pools:

| Pool | Constraint file | Screen | Climb |
|---|---|---|---|
| **A — free pool only** (no card from any sleeved deck) | `constraints-free.json` (606 names = every `decks/paper/decks/*.txt` at build time) | `screen-free/` 268 commanders (`screen-free-pick/` = 180 after dropping the 88 commanders that are themselves sleeved) | `climb-free/` top 12, 3 passes |
| **B — raids allowed** (only the Beledros 99 banned) | `constraints.json` (90 names) | `screen/` 268 | `climb/` top 12, 3 passes |

Beledros's own list scores **101.0** on the same objective; the sleeved Tazri deck re-climbs to 97.9, Cabbage to 89.2.

## Verdict

- **Pool A (build without touching a sleeved deck): Dina, Essence Brewer (BG) 81.8 ≈ Minthara, Merciless Soul (BW) 80.1 ≈ Nadaar, Selfless Paladin (W) 79.7.** All three are within the model's step size of each other; none reaches a sleeved deck's level (Cabbage 89). Dina's list leaks 3 cards registered after the ban file was built (Eccentric Pestfinder, Revitalizing Repast from Beledros; Disciple of Freyalise from Cabbage) — swap them for free cards before sleeving; the delta is noise.
- **Pool B (raids allowed): Minthara, Merciless Soul 89.9** is the best commander that is not already a sleeved deck's commander and does not need a card out of Beledros. Her list raids Inspirit 11, Imotekh 11, Tam 10, Tazri 8, Cabbage 3, Bumi 2 — Tam and Tazri are top-priority decks, so in practice it is a ~80-point free build plus whatever the operator is willing to pull. Mikaeus 97.3 needs Mikaeus himself out of Beledros (ban rule: Beledros is sleeved) and 22 Imotekh cards; The Destined Warrior 91.5 is 29 Tazri cards, i.e. Tazri rebuilt; Gyome 89.3 is Cabbage rebuilt (28 cards).
- **Answer:** Minthara (BW aristocrats/sacrifice, free pool ~80, ~90 with raids) is the second-best new deck; Dina (BG lifegain) edges her in the pure free pool but mirrors Beledros's theme and shares the black lifegain core. Neither beats a deck already on the table.

## Pool A — free pool only (top 12 climbed)

| # | Commander | Id | Objective | Seed | Raids |
|---|---|---|---|---|---|
| 1 | Dina, Essence Brewer | BG | 81.8 | 52.2 | Beledros 2, Cabbage 1 (post-ban registrations) |
| 2 | Minthara, Merciless Soul | BW | 80.1 | 54.8 | none |
| 3 | Nadaar, Selfless Paladin | W | 79.7 | 62.6 | none |
| 4 | Akul the Unrepentant | BR | 78.6 | 57.9 | none |
| 5 | Koh, the Face Stealer | B | 77.7 | 50.1 | none |
| 6 | The Reaper, King No More | BGR | 77.3 | 49.5 | Tazri 1, Beledros 1 |
| 7 | Acererak the Archlich | B | 75.0 | 49.0 | none |
| 8 | The Scorpion God | BR | 73.3 | 61.2 | none |
| 9 | Moseo, Vein's New Dean | B | 71.3 | 51.1 | none |
| 10 | Baron Helmut Zemo | B | 71.0 | 49.4 | none |
| 11 | Vilis, Broker of Blood | B | 69.6 | 49.6 | none |
| 12 | Duke Ulder Ravengard | RW | 69.6 | 52.4 | none |

## Pool B — raids allowed, Beledros 99 banned (top 8 of 12)

| # | Commander | Id | Objective | Sources |
|---|---|---|---|---|
| 1 | Tazri, Beacon of Unity | WUBRG | 97.9 | Tazri 33 (own deck), Inspirit 6, Tam 6, Bumi 4, free 28 |
| 2 | Mikaeus, the Unhallowed | B | 97.3 | ❌ Mikaeus is in the Beledros 99; Imotekh 22, Inspirit 6, Tazri 6, free 50 |
| 3 | The Destined Warrior | WUB | 91.5 | Tazri 29, Inspirit 12, Tam 10, free 32 |
| 4 | **Minthara, Merciless Soul** | BW | **89.9** | Inspirit 11, Imotekh 11, Tam 10, Tazri 8, Cabbage 3, Bumi 2, free 46 |
| 5 | Gyome, Master Chef | BG | 89.3 | Cabbage 28, Imotekh 7, free 38 |
| 6 | The Cabbage Merchant | G | 89.2 | Cabbage 56 (own deck) |
| 7 | Breya, Etherium Shaper | WUBR | 83.1 | Inspirit 36, Tam 10, free 23 |
| 8 | Meren of Clan Nel Toth | BG | 82.6 | Imotekh 14, Cabbage 12, free 46 |

Per-list raid breakdown: `py verify-2026-10-08/best-deck/second-best/sources.py <run-dir> [top N]`.

## Caveats
- The screen seeds from the CF model; commanders with no corpus overlap are under-ranked (same limitation as the 2026-10-08 purchasable-commander screen).
- The model is blind to lifegain/drain/sacrifice synergy, so Dina's and Minthara's numbers understate an aristocrats build and the ranking among the top three is not resolved.
- The pool-A ban file predates Starscape Cleric, Vilis and the 10-08 registrations; rebuild it from the deck files before any apply.
