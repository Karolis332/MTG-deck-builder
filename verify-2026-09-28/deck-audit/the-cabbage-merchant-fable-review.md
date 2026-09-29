# The Cabbage Merchant — Fable review (2026-09-28)

Reviewed: `the-cabbage-merchant-final.txt` (100) vs the current 99 (`the-cabbage-merchant-deck.md`). Gate run read-only on the
list recommended in §7 (`/tmp/cabbage-fable.txt`): VERDICT WARN — size/singleton/legality/identity/ownership PASS, 33 lands
+3 MDFC backs = 34.1 effective, `plan` WARN (known: the gate keys on "opponent casts a noncreature spell"), 11 wincons.

## 1. Verdict

The final 100 is a better deck than the current 99, but two of the five kept swaps are wrong in this deck: Elvish Spirit Guide
for Hungering Puppetbeast trades an on-plan artifact-sac body for a card-losing ritual, and Hunter's Insight for Spry and Mighty
is a wash that reverses an operator sleeved pick. Keep Archdruid, Tendershoot and (marginally) Archive; add Tangled Florahedron
for Brawn. The engine is real and has redundancy on every leg except Trudge Garden and Peregrin Took (see plan notes).

**Plan notes.** Loop = Trudge Garden ("Whenever you gain life, you may pay {2}. If you do, create a 4/4 green Fungus Beast
creature token with trample") + Peregrin Took ("those tokens plus an additional Food token are created instead") + Academy
Manufactor ("instead create one of each") + Teething Wurmlet ("Whenever an artifact you control enters, you gain 1 life") +
Jaheira ("Tokens you control have '{T}: Add {G}.'"). Each {2} paid makes Beast + Clue + Food + Treasure: three Wurmlet life
events (three more Trudge triggers) and {G}{G}{G} from the three noncreature tokens (the Beast is summoning-sick). Net +{G} per
iteration; Took's "Sacrifice three Foods: Draw a card" then draws the library into Walking Ballista ("{4}: Put a +1/+1 counter"
/ "Remove a +1/+1 counter: It deals 1 damage to any target") for the table. Kill this turn needs Ballista in hand or Archdruid's
Charm; Chord/Invasion/Font put it onto the battlefield with 0 counters, where it dies.

**Is the Greenhouse Propagator loop real?** Yes, as a substitute for Wurmlet's leg only. Propagator: "Whenever another creature
you control enters, you gain 1 life." Every Trudge Beast entering is a life event, so Trudge + Propagator + Took + Manufactor +
Jaheira is also unbounded (one trigger per iteration, net +{G}). Trudge + Propagator alone is a mana sink ({2} per 4/4
trample), not a loop. It shortens nothing; it is redundancy on the lifegain leg, plus a {T}: Add {G} body. Correctly kept.
Second Jaheira-leg: Night of the Sweets' Revenge ("Foods you control have '{T}: Add {G}.'") + Treasure = exactly {2} per
iteration, mana-neutral but still unbounded tokens/life (upgrade doc §1 says the same). Took and Trudge Garden have no
substitute; Chord, Invasion of Ikoria (Took is a Halfling, non-Human) and Trail of Crumbs find Took; only Trail/Witness find
Trudge.

## 2. Health

| Category | Current (99) | Final (100) |
|---|---|---|
| Lands | 33 (27 Forest + Ash Barrens, Ba Sing Se, Escape Tunnel, Gingerbread Cabin, Mosswort Bridge, Nesting Grounds) + 2 MDFC backs | 33 + 2 MDFC (34 + 3 with Florahedron, §7) |
| Ramp | 12: Goose, Llanowar, Mystic, Medallion, Wild Growth, Cultivate, Kodama's Reach, Many Partings, Provisioner, Earth King, Propagator, Jaheira (+ Night's Food mana, commander's two-Food tap) | 14 (+Archdruid, +ESG); §7 version 13 (+Archdruid, +Florahedron, no ESG) |
| Draw | 10: Toski, Ohran, Idol, Uprising, Return of the Wildspeaker, Spry and Mighty, Kenrith's, Disciple, Took, Ginger (monarch); Trail/Steelseeker/Syr Ginger select | 10 (Spry → Insight, Ginger → Archive doubler) |
| Removal | 7: Archdruid's Charm, Bridgeworks Battle, Force of Vigor, Kenrith's, Pest Infestation, Ballista, Wicked Wolf (+Endurance yard hate) | 7, unchanged |
| Wipes | 0 | 0 — nothing in the pool fits (Echoverse Fulcrum kills own board) |
| Protection | 4: Autumn's Veil (blue/black spells only), Snakeskin Veil, Spore Frog, Arachnogenesis | 4, unchanged |
| Win lines | Loop → Ballista; Bumi's Feast Lecture haste land (earthbend 2× Foods); Night of the Sweets' Revenge overrun; Displaced Dinosaurs (every Food/Clue/Treasure enters as a 7/7 — and draws off Uprising); Halsin Bears + Second Harvest; Hornet Queen/Ghalta beats | same 6; Tendershoot adds a 4-token-per-round stream |

Curve is top-heavy (Hornet Queen 7, Dinosaurs 7, Kraken 7, Troll King 6, Disciple 6, six 5-drops) but 12–14 ramp pieces
carry it; avg MV 3.13 → 3.21. Mono-G colour is a non-issue: 30 green lands + 2–3 MDFC, GGGG (Troll King) and GGG ×4 are fine.

## 3. Swap review

| IN | OUT | Verdict | Reason |
|---|---|---|---|
| Elvish Archdruid (100th) | — | Agree | "{T}: Add {G} for each Elf you control": Mystic, Llanowar, Jaheira, Halsin, Provisioner, Disciple, itself = 7 Elves; taps for 2–4 by turn 4. Right 100th card; Nesting Grounds stays (operator keep). |
| Tendershoot Dryad | Emil, Vastlands Roamer | Agree | "At the beginning of each upkeep, create a 1/1 green Saproling": 4 tokens a round, each a Took Food → Manufactor triple → Wurmlet/Trudge; "Saprolings get +2/+2" with the city's blessing, trivial here. Emil's Fractal is "{4}{G}, {T}" per token with X = differently named lands (~6 in a 27-Forest base). Emil was an operator add today — the gap is large enough to overturn. |
| Alhammarret's Archive | Ginger, Queen of Sweets | Agree (marginal) | Archive: "If you would draw a card except the first one... draw two": Idol becomes 2/turn, Toski/Ohran/Took/Return double. Life doubling adds no Trudge triggers (one per event). The OUT reason was overstated: Ginger's monarch draws at your end step immediately and each upkeep Gingerbrute is an artifact ETB (Wurmlet → Trudge, Took → Manufactor). Archive is one cheaper and monarch-independent; that is the whole margin. Operator added Ginger today — confirm. |
| Elvish Spirit Guide | Hungering Puppetbeast | **Disagree** | ESG: "Exile this card from your hand: Add {G}" — one mana once, a card down, a 3-mana 2/2 later; the deck already has three 1-drop dorks + Wild Growth. Puppetbeast: ETB Heartwood (artifact token → Took Food → Manufactor: 4 artifact ETBs = 4 Wurmlet life events) and "{1}, Sacrifice another artifact: +1/+1 counter... trample, hexproof, or haste" — the deck's only repeatable artifact sac outlet, firing Trail of Crumbs ("Whenever you sacrifice a Food"), Unlucky Cabbage Merchant and Syr Ginger; with counters it feeds The Ooze when it leaves. The operator skipped ESG when sleeving v3 despite the 09-18 proposal, and added Puppetbeast in v4. Keep Puppetbeast. |
| Hunter's Insight | Spry and Mighty | **Disagree (marginal)** | Spry: "X is the difference between the chosen creatures' powers" — this deck reliably fields 1/1 Saprolings/Insects/Pests beside 4/4 Beasts and 7/7 Dinosaur tokens, so X = 3–6 at sorcery speed with no combat, plus +X/+X trample on two bodies. Insight needs a connect, and Toski/Ohran already pay for connects; Return of the Wildspeaker covers instant-speed draw. A wash → keep the operator's 09-18 sleeved pick. |

## 4. Overturned rejects

None. Checked: Helix Pinnacle (The Ooze's "{T}: Exile target card from a graveyard. Create a Mutagen token" is 4 artifact ETBs a
turn with Took + Manufactor — correctly kept), Loxodon Warhammer, Fog (operator removed v3), Keeper of the Quiet Hour, Traxos
(Jiang's "untap all tokens you control" at end step gives instant-speed Jaheira mana for Chord/Second Harvest/Return — keep),
Restore with Empathy (Meren conflict; Titanbones scales), Puppet Crafting (IF-OWNED, Ribtruss is an operator pick).

## 5. Misses

| IN | OUT | Why |
|---|---|---|
| Tangled Florahedron // Tangled Vale | Brawn | "{T}: Add {G}" 2-drop or a land ("This land enters tapped. {T}: Add {G}"): a dork early, the 34th land when flooded on spells. It was in the operator's own 09-18 proposal (+Tangled Florahedron) and never reached the physical build; still open. Brawn is a 4-mana 3/3 whose team trample only works "As long as this card is in your graveyard", with no discard outlet in the list, and trample already comes from Uprising, Ghalta and the Fungus Beasts themselves. Brawn was the operator's pick over Regrowth on 09-18 — this is a different comparison. |
| Ezzaroot Channeler (optional) | Ghalta the Unstoppable | "{T}: You gain 2 life" = a free Trudge trigger every turn ({2} → 4/4 trample) and +2 Titanbones counters; under Seedborn Muse ("Untap all permanents you control during each other player's untap step") that is one per player turn. "Creature spells you cast cost {X} less... X is the amount of life you gained this turn": a Food sac makes Hornet Queen/Kraken cost 4. Ghalta is the fourth trample grant and a finisher only; it was an operator add in v4 today, so treat this as optional. |

No other pool or FRA card clearly beats a slot: Skyshroud Claim (two untapped Forests) is a fair Cultivate upgrade but not a
clear one; Well of Lost Dreams, Bosco, Lembas, Guac & Marshmallow Pizza and Party Dude are operator cuts and stay out.

## 6. Weakest 5 (in the final as written)

1. Elvish Spirit Guide — a card for one mana once; dead as a 3-mana 2/2 later.
2. Brawn — 4-mana 3/3; the anthem needs it in the graveyard and nothing here puts it there on purpose.
3. Autumn's Veil — only "blue or black spells", spells only; useless against red/white removal and any activated ability.
4. Ghalta the Unstoppable — fourth trample source; needs a big body out to be castable, then wins games the deck already wins.
5. Hunter's Insight — conditional on an unblocked connect that Toski and Ohran already pay for.

## 7. Final change list vs the CURRENT deck (IN → OUT), ranked

1. +Elvish Archdruid → (100th card, no cut).
2. +Tendershoot Dryad → Emil, Vastlands Roamer.
3. +Tangled Florahedron → Brawn.
4. +Alhammarret's Archive → Ginger, Queen of Sweets (marginal; operator confirms, Ginger was added today).
5. Optional: +Ezzaroot Channeler → Ghalta the Unstoppable.

Not applied from the audit: Elvish Spirit Guide (Puppetbeast stays), Hunter's Insight (Spry and Mighty stays).
Gate on 1–4: PASS on every hard check, 100 cards, 33 lands + 3 MDFC, avg MV 3.21, 1 game changer (Seedborn Muse).
