# Slice A2 measure results

Owned pool: `decks/paper/collection.txt` ∪ `decks/paper/decks/*.txt` (loadOwned('paper')), 1700 resolved cards.

## Runs

| run | time | stopReason | passes | evaluations | top 5 |
|---|---|---|---|---|---|
| a-no-commander-budget0 | 217953ms | converged | 3 | 1535 | Dina, Essence Brewer (70.8); Gyome, Master Chef (65.7); The Destined Warrior (65.0); Gorma, the Gullet (62.7); Meren of Clan Nel Toth (61.7) |
| b-no-commander-budget50 | 177800ms | converged | 3 | 1856 | Tazri, Beacon of Unity (72.5); Dina, Essence Brewer (68.9); Gyome, Master Chef (67.5); Meren of Clan Nel Toth (63.8); Blech, Loafing Pest (60.0) |
| c-beledros-budget0 | 164834ms | max-passes | 3 | 1485 | Beledros Witherbloom (given, objective 91.5) |

## Pre-rank check

Earlier full screen of this pool (budget 0, no commander given): `verify-2026-10-07/best-deck/paper-2/REPORT.md` top 5.
Does `preRankCommanders`'s top-24 window (screenTop default) contain each?

| commander | in pre-rank top 24 |
|---|---|
| Mikaeus, the Unhallowed | NO |
| Meren of Clan Nel Toth | yes |
| Dina, Essence Brewer | yes |
| Imotekh the Stormlord | yes |
| Illuminor Szeras | NO |
