# Paper Tam — precon + cross-deck fixed point (2026-10-02)
(Saved by the orchestrator from the builder's chat output; the harness blocked the builder's own report write.)

Baseline: `verify-2026-09-28/deck-audit/tam-the-possibility-final.txt` (registered list + 5 unapplied 09-30 swaps).
Result: `tam-the-possibility-proposed.txt`; Meren backfill: `meren-of-clan-nel-toth-proposed.txt`.
Tazri treated as top priority (no donations; no straight trade found that leaves Tazri equal).

## Named cards
- Tomik, Wielder of Law — NOT taken: "loses to Vigorbloom Charm" (weakest kept protection). NOTE (orchestrator): the
  builder also said "Tomik was cut on 09-28 for Chimil" — that was Tomik, Orzhov Lawmage, a different card. Re-judge.
- Land Tax — no (4 basics in Tam). Tazri only.
- Turbulent Moor — IN for Isolated Chapel.
- Ghostly Prison — no (protects you only; pushes attacks onto walkers).

## Tam swaps
| # | IN | OUT | Source | Why |
|---|---|---|---|---|
| 1 | Nexus Mentality | Entrust the Spark | Quandrix | both modes with Tam out; remove Jace-token counters (~10+) → draw that many at instant speed, or move counters → instant ultimate |
| 2 | Caves of Koilos | Meticulous Commons | Silverquill copy | untapped W/B vs walker-gated tapped land |
| 3 | Path of Ancestry | Nomad Outpost | precon copy | both tapped; 5 colours vs 3 |
| 4 | Anguished Unmaking | Vraska's Final Mercy | Silverquill | instant exile any nonland permanent vs BB sorcery; Jace 6 surplus (Ways give 34) |
| 5 | Sylvan Library | The Wanderer | Meren | selection from T2; Paradox refunds life; Pia can find it; Wanderer has no plus/type |
| 6 | Yavimaya Coast | Transformative Commons | Quandrix | untapped G/U T1 |
| 7 | Llanowar Wastes | Formidable Commons | Meren | untapped B/G T1–3 |
| 8 | Turbulent Moor | Isolated Chapel | Silverquill | P(untapped T3) 0.08 → ~0.5, ~1.0 from T4 |

## Meren backfill
- Sylvan Library → Greed (open): "{B}, Pay 2 life: Draw a card."
- Llanowar Wastes → Haunted Mire (open): tapped Swamp Forest; Meren keeps B26/G20 sources, 17 basics.
- Meren registered list is already 101 cards (Creakwood Liege, 09-28) — pre-existing, untouched.
- Seedborn Muse (Cabbage) rejected: Cabbage loop multiplier, no replacement.

## Mana (35 lands) before → after: expected untapped by T3 W 7.6→9.1, U 10.2→11.1, B 5.5→7.8, R 5.8→5.9, G 5.6→7.5
(model, not simulation; tapped-on-T3 lands 18 → 13).

## Stop proof (builder's)
- Draw/engine: Phyrexian Arena < Evolution Sage; Mangara < Quintorius (Chimil exile casts → drain); Expansion Algorithm
  one-shot < Atomize / Tam's own activation.
- Removal: Vanishing Verse ≈ Erode at best; Beast Within gives a 3/3 at the walkers.
- Wipes: Promise of Loyalty kills own dorks at sorcery speed < Settle the Wreckage.
- Protection: Tomik < Vigorbloom Charm; Tyvar's Stand / Silkguard / Guardian Augmenter creature-only.
- Ramp: Fellwar Stone ≈ Talisman of Conviction (R); Nature's Lore 2 Forest targets < Farseek; elves die to own wipes;
  Astral Cornucopia too slow.
- Walkers: none new; Liliana Dreadhorde General is a Meren lock.
- Lands: Turbulent Wilderness / Hinterland Harbor vs Opulent Palace would drop B to 14 sources; two-basic lands tapped
  97% with 4 basics.

## Gate
Tam: PASS size/singleton/legality/rules/identity/curve 3.42/wincons 11; WARN lands 35 (locked); FAIL plan (known);
FAIL ownership only on Nexus Mentality, Turbulent Moor, Yavimaya Coast, Anguished Unmaking (precon, unregistered).
Meren: PASS ownership/legality/identity/lands; FAIL size 101 (pre-existing); FAIL plan (known).

## Contested
Anguished Unmaking (Tam high / Tazri high), Nexus Mentality (high/low), Yavimaya Coast (med/med), Turbulent Moor
(med/med), Sylvan Library (med/med), Llanowar Wastes (med-low/low). Left for Tazri: Mangara, Nils, Combat Calligrapher,
Guardian Augmenter, Keen Duelist, precon Wizards, Tomik, Land Tax, Ghostly Prison.
Leftovers for other decks: spare Sol Ring + Arcane Signet → Cabbage; Hangarback Walker / Stonecoil Serpent → Imotekh?;
Animate Dead → Meren.
