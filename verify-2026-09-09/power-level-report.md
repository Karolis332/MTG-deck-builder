# Power level report — 2026-09-09

Power level algorithm by EDHPowerLevel.com (edhpowerlevel.com), reimplemented with
permission pending; not affiliated. Computed offline with `scripts/power-level.ts`
against the local card DB (`src/lib/power-level-edhpl.ts`).

## Results (current decks and the corpus-model proposals)

| Deck | Cards resolved | Impact | Avg nonland CMC | Tipping point | Efficiency | Score | Power Level | Bracket* |
|---|---|---|---|---|---|---|---|---|
| decks/paper/decks/meren-of-clan-nel-toth.txt | 87/87 | 624.81 | 3.12 | 3 | 6.92/10 | 600.62 | **7.20**/10 | 3 |
| decks/paper/proposals/meren-model.txt | 87/87 | 651.11 | 3.03 | 3 | 7.02/10 | 629.01 | **7.35**/10 | 3 |
| decks/paper/decks/imotekh-the-stormlord.txt | 74/74 | 554.84 | 3.59 | 4 | 5.19/10 | 490.18 | **6.22**/10 | 2 |
| decks/paper/proposals/imotekh-model.txt | 70/70 | 525.32 | 3.61 | 4 | 5.16/10 | 463.55 | **5.87**/10 | 2 |
| decks/paper/decks/tazri-beacon-of-unity.txt | 95/95 | 588.93 | 3.05 | 3 | 7.00/10 | 568.32 | **7.04**/10 | 3 |
| decks/paper/proposals/tazri-model.txt | 96/96 | 564.17 | 3.03 | 3 | 7.02/10 | 545.02 | **6.83**/10 | 3 |

\* Bracket is a partial estimate (extra-turn chains, mass land denial, Game Changers only; the site
adds a 2-card combo check from commanderspellbook.com that is not in its static bundle).

## Live-site validation (Playwright, `epl-meren.png`, `epl-tazri.png`, `epl-validation.json`)

| Deck | Metric | Our port | Live site | Delta |
|---|---|---|---|---|
| meren-of-clan-nel-toth | Impact | 624.81 | 620.44 | +0.7% |
| | Tipping point | 3 | 3 | exact |
| | Efficiency | 6.92 | 6.92 | exact |
| | Score | 600.62 | 596 | +0.8% |
| | Power Level | 7.20 | 7.18 | +0.02 |
| tazri-beacon-of-unity | Impact | 588.93 | 584.97 | +0.7% |
| | Tipping point | 3 | 3 | exact |
| | Efficiency | 7.00 | 7.00 | exact |
| | Score | 568.32 | 564 | +0.8% |
| | Power Level | 7.04 | 7.02 | +0.02 |

Tipping point and efficiency match exactly; impact and score run 0.7–0.8 % high because the local
`price_usd` snapshot (2026-09-08) is a few days behind the site's live prices. Not determinable from
the bundle: the 2-card combo floor for the bracket, and Reserved List flags (no column locally).

## Iterations with owned cards (greedy, EDHPowerLevel score)

_Power level algorithm by EDHPowerLevel.com_

### Tazri, Beacon of Unity (tazri)

Power level before: **7.04**  →  after: **7.15**  (3 swaps)

| OUT | impact | IN | impact | power level after |
|---|---|---|---|---|
| Syncopate | 4.99 | Terror of the Peaks | 15.69 | 7.08 |
| Reconnaissance Mission | 6.71 | Lumra, Bellow of the Woods | 14.74 | 7.12 |
| Boros Charm | 7.15 | Crypt Ghast | 14.17 | 7.15 |

Three biggest single swaps: Syncopate → Terror of the Peaks (+10.69 impact); Reconnaissance Mission → Lumra, Bellow of the Woods (+8.03 impact); Boros Charm → Crypt Ghast (+7.02 impact)

### Meren of Clan Nel Toth (meren)

Power level before: **7.20**  →  after: **7.31**  (2 swaps)

| OUT | impact | IN | impact | power level after |
|---|---|---|---|---|
| Chief Warg's Company | 1.65 | Mikaeus, the Unhallowed | 14.05 | 7.25 |
| Baba Lysaga, Night Witch | 3.08 | Reanimate | 14.00 | 7.31 |

Three biggest single swaps: Chief Warg's Company → Mikaeus, the Unhallowed (+12.40 impact); Baba Lysaga, Night Witch → Reanimate (+10.93 impact)

### Imotekh the Stormlord (imotekh)

Power level before: **6.22**  →  after: **6.97**  (12 swaps)

| OUT | impact | IN | impact | power level after |
|---|---|---|---|---|
| Emergency Weld | 2.41 | Reanimate | 14.00 | 6.34 |
| Raise Dead | 2.80 | Archfiend of Despair | 13.63 | 6.41 |
| Power Word Kill | 3.40 | Vito, Thorn of the Dusk Rose | 13.29 | 6.51 |
| Corpse Churn | 3.44 | Cityscape Leveler | 12.12 | 6.56 |
| Altar of Bhaal | 3.87 | Lightning Greaves | 11.93 | 6.64 |
| Barkform Harvester | 4.61 | Phyrexian Arena | 11.84 | 6.71 |
| Black Sun's Twilight | 4.67 | Imp's Mischief | 11.81 | 6.77 |
| Zombify | 5.15 | Sanguine Bond | 11.78 | 6.83 |
| Umbral Collar Zealot | 6.00 | Rise of the Dark Realms | 11.30 | 6.85 |
| Undying Malice | 6.28 | Sign in Blood | 10.89 | 6.88 |
| Archenemy's Charm | 6.42 | Carrion Feeder | 10.57 | 6.93 |
| Lembas | 7.28 | Insatiable Avarice | 10.41 | 6.97 |

Three biggest single swaps: Emergency Weld → Reanimate (+11.60 impact); Raise Dead → Archfiend of Despair (+10.84 impact); Power Word Kill → Vito, Thorn of the Dusk Rose (+9.89 impact)

### 25 highest-impact owned pool cards no deck used

| Card | Impact | Color identity |
|---|---|---|
| Lotho, Corrupt Shirriff | 13.45 | BW |
| Innkeeper's Talent | 12.15 | G |
| Springleaf Parade | 11.25 | G |
| Ohran Frostfang | 10.70 | G |
| Three Steps Ahead | 10.44 | U |
| Kozilek, the Great Distortion | 10.41 | C |
| Dismember | 10.30 | B |
| Path to Exile | 10.29 | W |
| The Darkness Crystal | 10.25 | B |
| Annie Joins Up | 10.15 | GRW |
| Spelunking | 9.99 | G |
| Final Showdown | 9.90 | W |
| Bitterthorn, Nissa's Animus | 9.87 | C |
| Oko, Thief of Crowns | 9.81 | GU |
| Nyx Lotus | 9.73 | C |
| Jarad, Golgari Lich Lord | 9.70 | BG |
| Peer into the Abyss | 9.55 | B |
| Flame of Anor | 9.51 | RU |
| Varragoth, Bloodsky Sire | 9.49 | B |
| Archangel of Tithes | 9.40 | W |
| Blade Historian | 9.36 | RW |
| Metamorphosis Fanatic | 9.34 | B |
| Lively Dirge | 9.28 | B |
| Magda, the Hoardmaster | 9.27 | R |
| Twilight Prophet | 9.27 | B |

