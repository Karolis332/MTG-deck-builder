# UB (Dimir) — Uldaros Theorix — build report (2026-10-09)

Base: `lists/UB-uldaros-theorix.txt` (model climb, objective 75.51 re-scored at 300 games; Deck Score 63.6).
Final: `decks/UB/final.txt` — objective **75.62**, Deck Score **63.6**, roles land 38 / ramp 11 / draw 10 / removal 12 / wipes 3 / protection 4, penalty 0.
Swap lab: `swap-lab-final.txt` (each swap alone + ALL = 75.78, +0.26). Gate: `gate.txt`.

## Commander
Uldaros Theorix {3}{U}{B}{B}, Flying: "When Uldaros Theorix enters, if you cast him, exile up to one target nonland card
of each card type from your graveyard. Copy those cards. You may cast any number of spells with total mana value 6 or less
from among the copies without paying their mana costs."
→ he is a 7-mana graveyard value burst, not an engine; reanimating him does nothing ("if you cast him").

## Plan — graveyard reanimator, Uldaros as the second wave
- **T1–3:** ramp (Arcane Signet, Talisman, Thought Vessel, Soul Stone, Tron lands, Worn Powerstone) and fill the yard:
  Buried Alive, Ripples of Undeath, Liliana the Repentant, Theorix Charm (mill 3), Frantic Search, Windfall, Ashiok −1 on yourself.
- **T3–5:** cheap reanimation on a fatty: Reanimate, Grave Researcher // Reanimate, Animate Dead, Persist, Victimize, Body Double,
  Dread Return. Targets: Grave Titan, Archfiend of Despair, Butcher of Malakir, Pestilence Demon, Noxious Gearhulk, Armaggon.
- **T6–7 close:** cast Uldaros: copy Reanimate (sorcery 1) + Animate Dead (enchantment 2) + an instant (Counterspell/Theorix Charm)
  + an artifact → two more fatties back for free; Junji's death trigger and The Soul Stone are the backup recursion.
- **Backup:** hard-cast big threats off Tron (Devourer, Cityscape Leveler, Meteor Golem).
- **Closer:** Archfiend of Despair doubling life loss behind Grave Titan's zombies / Butcher's edicts; Pestilence Demon as reach.

## Swaps (12; Δ = objective, each swap alone vs base, 300 games)
| Out | In | Why | Source | Δ |
|---|---|---|---|---|
| Windswept Heath | Fabled Passage | Heath "Search … for a Forest or Plains card" — zero targets in UB; Passage fetches a basic | free | 0.00 |
| Wooded Foothills | Swamp | "Mountain or Forest card" — dead; deck runs BB/BBB pips (Uldaros, Pestilence, Titan) | free | +0.09 |
| Talon Gates of Madara | Exotic Orchard | Gate filler; Orchard taps for U or B off any opponent's dual | free | 0.00 |
| Reliquary Tower | Swamp | colourless filler land; black source count | free | +0.08 |
| Doomsday Excruciator | Grave Titan | Excruciator exiles all but 6 cards and we draw 2/turn → we deck first; BBBBBB; Titan "enters or attacks, create two 2/2 Zombies" | free | +0.05 |
| Foundry Inspector | Archfiend of Despair | artifact cost reducer is off-plan; Archfiend "each opponent loses life equal to the life that player lost this turn" = closer | free (Inspector back to Imotekh) | −0.02 |
| Titan Forge | Noxious Gearhulk | 6-mana-per-golem rock; Gearhulk "destroy another target creature" on reanimate | free | −5.59* |
| Fellwar Stone | Arcane Signet | same rock, Signet always makes U/B; one raid fewer | free (Fellwar back) | 0.00 |
| Tendrils of Agony | Emeritus of Woe // Demonic Tutor | storm 4-drop off-plan; "enters prepared" → Demonic Tutor copy for Buried Alive/Titan | free | +0.03 |
| Geralf, the Fleshwright | Body Double | spellslinger tokens off-plan; Body Double "enter as a copy of any creature card in a graveyard" = reanimation on a body | free | −5.58* |
| Sapphire Medallion | Junji, the Midnight Sky | Medallion discounts blue only (deck is mostly black); Junji dies → "Put target non-Dragon creature card from a graveyard onto the battlefield" | free | +0.02 |
| Wishclaw Talisman | Diabolic Tutor | same tutor role without handing opponents a tutor; free instead of an Imotekh raid | free | +0.01 |

\* −5.6 alone = the win component's goldfish close-turn step (win 55 → 48) from removing a body (Titan Forge golem, Geralf tokens);
with the full package the step is back (ALL win 55, DS 63.6 flat, objective +0.26). The model is blind to reanimation and tutors
(Deck Score flat on every add) → judgment decides, numbers recorded.

## Raids (27 — the model list's own picks; my swaps removed 5: Windswept Heath, Wooded Foothills, Foundry Inspector, Fellwar Stone, Wishclaw)
| Donor | Cards |
|---|---|
| Imotekh the Stormlord | Bitter Triumph, Culling the Weak, Dread Return, Feed the Swarm, Liliana the Repentant, Lively Dirge, Mortuary Mire, Ripples of Undeath, The Soul Stone, Thought Vessel |
| Inspirit, Flagship Vessel | Cyclonic Rift, Fact or Fiction, Inventors' Fair, Karn's Bastion, Ornithopter of Paradise, Panharmonicon, Phyrexian Metamorph, Rapid Hybridization, Spire of Industry, Swan Song |
| Tam, the Possibility | Mana Confluence, Ob Nixilis of the Black Oath, Shipwreck Marsh, Talisman of Dominance |
| Bumi, Unleashed | Rogue's Passage, Strip Mine |
| Tazri, Beacon of Unity | Glasspool Mimic // Glasspool Shore |
Free in the list (not raids): Reanimate, Buried Alive, Counterspell, Syr Konrad, Chromatic Lantern, Ash Barrens, Path of Ancestry, Seat of the Synod, Nesting Grounds, Wayfarer's Bauble, basics (spare copies owned).

## Gate (`gate.txt`)
PASS size 100, singleton, legality, identity BU, ownership, curve (avg MV 3.42), wincons 13, locks.
FAIL arenaNames (paper, known), FAIL plan (known false negative). WARN lands 34 + 4 MDFC = 35.5 vs Karsten 38 (model's count, unchanged).

## Risks
- 27 raids, 10 each from Imotekh and Inspirit: this deck cannot be sleeved without gutting both; it is a catalogue entry.
- Seed 1.9 / no corpus overlap: the base is climb filler; objective 75.6 sits ~10–25 under the sleeved decks.
- Uldaros is a 7-drop that only works when cast; graveyard hate (Bojuka Bog, Rest in Peace) blanks plan and commander at once.
- Land count 35.5 effective with a 7-mana commander: Tron and rocks carry it; Karsten wants 38.
- Remaining off-plan cards not swapped (budget 12): Cruel Calculations, Rise of the Dark Realms (9 MV, Uldaros cannot copy it), Ashiok (self-mill only), Devourer.
- Model blind to reanimation/tutors: no score evidence the swaps help; win step (±7) makes single-swap numbers bimodal.
