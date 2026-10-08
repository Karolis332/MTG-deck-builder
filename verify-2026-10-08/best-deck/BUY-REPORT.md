# Beledros: what to buy, and is there a commander worth buying over him? (2026-10-08)

Operator question: "what cards can upgrade this Beledros deck if I bought them, and what could be a commander that I buy
that would trump Beledros?" Both answered with the model first (score decides), oracle judgment second.

## 1. Cards — buy lab (`buy-lab.ts` → `buy-lab.json`, `buy-lab.md`)

Candidate set: every card from both EDHREC Beledros pages (optimized 188 decks, lifegain theme 33 decks) and from the CF
corpus `commander_card_stats` for Beledros (300 rows) that the operator does not own → 138 cards, each tried in every slot
of the final 99 (nonlands in the 62 nonland slots, lands in the land slots), 100 goldfish games, ownership bypassed.
Base objective 101.20.

| Result | |
|---|---|
| Cards clearing the 0.25 bar | 1 — Golgari Signet +0.30, and only by replacing the locked Ashnod's Altar (the model gives a sac outlet no value) |
| Next best | Fell the Profane +0.21, Journey to Eternity +0.20, Growing Rites of Itlimoc +0.20, Wood Elves +0.20, Pitiless Plunderer +0.18 — ramp-for-ramp noise |
| Oracle buy tier as the model sees it | Skullclamp +0.01, Exquisite Blood +0.08, Ayara +0.03, Blight-Priest +0.05, Bastion +0.05, Innkeeper +0.16, Savra +0.09, Warren Soultrader +0.14 |

Reading: the model is saturated on this list and blind to lifegain / drain / sacrifice roles (known since the Dina and
Zulaport backups). Nothing purchasable moves the score; the buy ranking is therefore the oracle analysis
(`beledros-edhrec-analysis.md` §2), recorded in the guide §11 with the model Δ beside each row.

## 2. Commanders — screen + climb (`cmdr-screen/`, `cmdr-screen-2/`, `cmdr-climb/`, `cmdr-deep40/`)

`scripts/collection-best-deck.ts` now takes `--commanders @file` and resolves names outside the owned pool from the DB,
so unowned commanders can be screened against the owned cards. Pool = the Beledros pool (other decks' cards banned via
`cmdr-constraints.json`, Meren's deck and the 9 Beledros donor cards free), Ashnod's Altar locked for Beledros.

| Step | Scope | Result |
|---|---|---|
| Screen (CF seed, no climb) | 1,623 unowned commander-legal legendaries: every identity inside B/G plus one colour (698) and every two- or three-colour identity holding B or G but not both (924) | top seeds Sauron the Necromancer 73.8, Kolaghan 71.2, Ygra 70.8, Sauron Lidless Eye 70.2, Maha 69.1 …; Beledros's own CF seed 60.9, rank 45 |
| Climb, 3 passes, top-k 12, 100 games | top 15 seeds + Beledros from his CF seed | Judith, the Scourge Diva 96.2 · Beledros 91.0 · Ygra 90.8 · Sauron Lidless Eye 88.5 · Balthor 87.0 · Ardyn 86.9 · Avacyn 86.4 · Razaketh 86.2 · Kolaghan 81.2 · Raphael 81.0 · Sauron Necromancer 80.2 · Maha 80.1 · Sheoldred WO 80.0 · Elektra 79.6 · Vogar 79.4 · Bontu 79.2 |
| Deep climb, +8 passes, top-k 40 | Judith, Ygra, Beledros | Judith 96.45 (1 swap) · Ygra 90.80 (0) · Beledros 91.01 (0) — all three local optima |
| Judith, second basin | a seed made of the B/R half of the Beledros 99 (46 cards) + Judith's climbed cards | the seed scored 66.4 < the CF seed 68.3, so the climb took the CF seed again and landed at 96.52 in 4 passes — same ceiling |

Judith's climbed list (BR): the operator's black aristocrats core — Blood Artist, Zulaport Cutthroat, Viscera Seer, Grim
Haruspex, Midnight Reaper, Priest of Forgotten Gods, Plaguecrafter, Gray Merchant, Butcher of Malakir, Yahenni, Bloodghast,
Gutterbones, Mikaeus, Woe Strider, Ashnod's Altar — plus free red removal (Terminate, Bedevil, Kolaghan's Command) and 22
colourless utility lands out of 34 (Urza's Tron, Dark Depths, Thespian's Stage, Vesuva, Yavimaya in a deck with no
Forest): the model's known land blind spot, the same hand fix Krenko and Neriv needed.

### Verdict

- Under identical treatment (CF seed → climb) Judith beats Beledros by 5.4 and is the only candidate that does; every
  other purchasable commander lands below Beledros.
- Against the actual Beledros list (101.0, built from 265 seeds and the lab's full climbs) Judith's converged ceiling is
  96.5 from two independent basins: **no purchasable commander trumps the Beledros list in the model.**
- Beledros's own CF-seed climb sticks at 91.0 while his real list is 101.0 — the climb is seed-dependent by ~10 points, so
  "Judith 96.5" is a floor for her, not a proof she cannot reach 101. A fair test would need a 265-seed search for
  Judith as well; not run (≈ hours).

### Judgment beside the model

Judith ({1}{B}{R}, $0.22): "Other creatures you control get +1/+0. Whenever a nontoken creature you control dies, Judith
deals 1 damage to any target." A 3-mana aristocrats commander that drops green: no Pests, no Beledros untap, no
Cultivate / Three Visits / Eternal Witness / Harrow; gains the free red removal and a pinger per death. It is a different
deck built from the same black core, not an upgrade to this one. Ygra ({3}{B}{G}, $11.82, Food-sacrifice) keeps the colours
and the engine shape but scores 90.8 — below Beledros.

The commanders the shell actually wants (Korvold, Prossh, Teysa Karlov, Savra, Chatterfang, Tayam, Ghave) all screened
far below the top 15 (Korvold rank 410, Prossh 347, Teysa 194, Chatterfang 181, Savra 51, Ghave 652, Tayam 1134) because
the CF seed for them has little inclusion data in the owned pool — a screen limitation, not a verdict on the cards.

## 2b. "Really no better commander?" — the same 99 under every commander (`cmdr-pick-b99/`, `cmdr-screen-b99/`, `cmdr-climb-b99/`, `cmdr-climb-b99-judgment/`)

The CF-seed climb in §2 compares seeds as much as commanders (Beledros's own CF-seed climb lands 10 points under his real
list). The fair test: score the actual Beledros 99 under each of the 1,623 commanders (`--pick` with the list as the seed,
100 games), then climb the top 11 and the seven engine-fit commanders for 3 passes. Summary: `cmdr-screen-b99-summary.csv`.

| Result | |
|---|---|
| Same 99, no climb | 31 commanders at 101.0–101.2 (Beledros 101.20, Izoni, Shelob, Horrigan, Hogaak, Ishkanah, Zask, Ygra, Gitrog …): every BG legend scores the list the same — the model gives the commander card almost no weight |
| Outliers | Pippin, Warden of Isengard 107.06 → 108.75 climbed; Ragnarok, Divine Deliverance 102.91 (0 swaps) |
| Top-11 climb | every tied commander stays at 101.2 with 0 swaps: the list is a local optimum under all of them |
| Engine-fit climb from the same 99 | Muldrotha 101.24 (1 swap) · Prossh 101.24 (1) · Ghave 100.96 (seed 94.4) · Korvold 100.94 (0) · Nethroi 100.94 (0) · Judith 96.77 (seed 75.9) · Savra 92.24 (0) |

Reading the outliers against the oracle:

- Pippin ({B}{G}): "{1}, {T}: Create a Food token. / {T}, Sacrifice four Foods: Other creatures you control get +3/+3 and
  gain haste until end of turn. Activate only as a sorcery." The win component sees a 2-mana commander with an overrun; in
  this deck Foods come only from Pippin (one a turn, 4 turns to one pump), Foods are not creature tokens, so Blood Artist,
  Zulaport, the Pests and the Beledros untap get nothing. The +7.5 is the heuristic, not an upgrade.
- Ragnarok: no mana cost, "Reach, vigilance, menace, trample, haste / When Ragnarok dies, destroy target permanent and
  return target nonlegendary permanent card …" — a melded back face the screen should have excluded; it cannot be cast
  from the command zone.
- Savra, Queen of the Golgari (the sac-drain commander by oracle: "Whenever you sacrifice a black creature, you may pay 2
  life. If you do, each other player sacrifices a creature") scores 9 under Beledros with the same 99: the model has no
  edict value and counts Beledros's untap as ramp.

### Verdict (final)

No purchasable commander trumps the Beledros list in the model under either test; the only numeric winner (Pippin) is a
win-heuristic artefact. The commander question is now an oracle judgment on the engine, where Beledros (Pest a turn, a
10-life untap into Vito / Bond / Merchant) is the one the list was built around.

## 3. Files

`buy-lab.ts/.json/.md`, `cmdr-candidates.txt`, `cmdr-candidates-2.txt`, `cmdr-candidates-all.txt`,
`cmdr-constraints.json`, `cmdr-screen-summary.csv` (the two screens, one row per commander; the full jsonl stays
untracked), `cmdr-climb/`, `cmdr-climb-ref/`, `cmdr-deep/`, `cmdr-deep-ref/`, `cmdr-deep40/`, `cmdr-deep40-ref/`,
`cmdr-judith-seed/`, `cmdr-judith-from-beledros/`, `cmdr-screen-b99-summary.csv` (the full `cmdr-pick-b99` + `cmdr-screen-b99` jsonl, 3 MB + 5 MB, stay untracked), `cmdr-climb-b99/`, `cmdr-climb-b99-judgment/`.
