# Sai, Master Thopterist — mono-U paper build (2026-10-09)

Base: model list `lists/U-sai-master-thopterist.txt` (objective 75.49, DS 63.6). Final: `final.txt`
(objective 75.44, DS 63.6, roles ramp 11 / draw 11 / removal 10 / wipes 3 / protection 5, keep-7 .98,
Sai on T3.3). 11 swaps, raids 36 → 28. Scores: `score-model.txt`, `lab1.txt`, `lab2.txt`, `lab3.txt`, `loo-*.out`.

## Plan
Sai: "Whenever you cast an artifact spell, create a 1/1 colorless Thopter artifact creature token with flying.
{1}{U}, Sacrifice two artifacts: Draw a card."
- **T1–3:** cheap artifacts and rocks (Mishra's Bauble, Ornithopter of Paradise, Signet, Chalice, Etherium Sculptor,
  Foundry Inspector), Sai on 3. Every 0–2 drop after Sai is a flyer.
- **T4–6:** thopter makers and draw engines: Efficient Construction (second Sai), Whirler Rogue, Coastal Piracy,
  Reconnaissance Mission, Bident of Thassa — each evasive thopter hit draws. Sai sacs spare rocks for cards.
  Hold Counterspell / Swan Song / Arcane Denial / Torrential Gearhulk (flash) up behind Propaganda.
- **Close:** Cyberdrive Awakener — "Other artifact creatures you control have flying ... each noncreature artifact
  you control becomes a 4/4 artifact creature until end of turn" → alpha with every rock and thopter in the air.
  Backup: Steel Overseer / Adaptive Automaton (name Thopter) pump the swarm; Breaker of Creation / Steel Hellkite
  as the single big threat.

**Closer:** Cyberdrive Awakener alpha strike of 4/4 flying rocks plus the thopter swarm.

## Swaps (Out → In)
| Out | In | Why | Source | Δ (alone) |
|---|---|---|---|---|
| Bloodstained Mire | Agna Qel'a | Mire fetches "a Swamp or Mountain card" = nothing in mono-U; Agna "{T}: Add {U}", untapped with a basic, loots | free | +0.07 |
| Windswept Heath | Desert of the Mindful | Heath fetches "a Forest or Plains card" = dead; Desert taps for U, "Cycling {1}{U}" | free | +0.08 |
| Wooded Foothills | Hidden Cataract | Foothills fetches "a Mountain or Forest card" = dead; Cataract taps for U, late "Discover 4" | free | +0.07 |
| Cabaretti Courtyard | Sunken Palace | Courtyard searches "basic Mountain, Forest, or Plains" = dead; Palace "{T}: Add {U}" | free (de-raid Tazri) | +0.04 |
| Riveteers Overlook | Fabled Passage | Overlook searches "basic Swamp, Mountain, or Forest" = dead; Passage fetches an Island | free | 0.00 |
| Reliquary Tower | Study Hall | Tower = colourless filler (Thought Vessel covers hand size); Hall "{1}, {T}: Add one mana of any color", scry on Sai | free | +0.10 |
| Giant's Boulder | Into the Flood Maw | operator-named filler; Flood Maw: {U} instant "Return target creature an opponent controls to its owner's hand" keeps removal at 10 | free | −0.26 |
| Sky Diamond | Arcane Signet | Diamond "enters tapped"; Signet untapped U for 2, same artifact trigger | free | 0.00 |
| Ginger, Queen of Sweets | Torrential Gearhulk | Ginger is off-plan (Food/monarch); Gearhulk: "Flash ... cast target instant card from your graveyard" (Rift, Counterspell, Thirst) | free (de-raid Cabbage) | −0.00 |
| Bygone Colossus | Mishra's Bauble | {0} artifact = free Thopter + delayed draw + Sai fodder | free (de-raid Inspirit) | −0.06 |
| Mana Confluence | Conduit Pylons | Confluence is a painful Island here; Pylons "{1}, {T}: Add one mana of any color", surveil 1 | free (de-raid Tam) | 0.00 |

Model blind spots: the five dead fetch/courtyard lands score as mana sources (Δ ≈ 0 though they make no mana);
Boulder → Flood Maw at −0.26 is one goldfish-mana tick from a 1-mana artifact, judgment keeps it (interaction).

Tested and dropped: Breaker of Creation → Thought Monitor. Alone +0.02, but with Bygone also cut the win component
falls 55 → 48 (obj −5.6): the goldfish needs one big body. Breaker (free, hexproof from colours, Annihilator 2) stays,
Bygone (Inspirit raid) goes. Giant's Boulder → Arcane Signet (−2.03) and Devourer → Experimental Aviator (−2.00) =
removal window 9 < 10; Contagion Clasp → Commander's Sphere (−3.86) = window.

## Raids (28, all kept from the model list; each needs a donor backfill before sleeving)
| Donor | Cards |
|---|---|
| Inspirit, Flagship Vessel (18) | Urza Lord High Artificer, Tezzeret Cruel Captain, Cyberdrive Awakener, Steel Overseer, Etherium Sculptor, Ornithopter of Paradise, Phyrexian Metamorph, Repurposing Bay, Everflowing Chalice, Thirst for Knowledge, Cyclonic Rift, Swan Song, Rapid Hybridization, Archway of Innovation, Inventors' Fair, Karn's Bastion, Spire of Industry, Uthros Titanic Godcore |
| Inspirit or Tazri (1) | Fellwar Stone (2 owned, both sleeved) |
| Imotekh the Stormlord (4) | Foundry Inspector, Gilded Lotus, Myr Retriever, Thought Vessel |
| Bumi Unleashed (3) | Lotus Field, Rogue's Passage, Strip Mine |
| The Cabbage Merchant (2) | Walking Ballista, Escape Tunnel |

Free copies used (not raids): Seat of the Synod, Ash Barrens, Counterspell, Path of Ancestry, Nesting Grounds, 4 Island.

## Gate (`gate.txt`)
PASS size 100, singleton, legality, identity U, ownership, plan, curve, wincons. FAIL arenaNames (Sink into Stupor
MDFC naming — paper-irrelevant). WARN lands 36 + MDFC vs Karsten 39±2 (model's count kept).

## Risks
- 18 Inspirit raids gut the operator's played Jeskai artifact deck; the closer itself (Cyberdrive Awakener) is a raid.
- 13 colourless lands + 8 tapped lands; UU costs (Counterspell, Whirler Rogue, Coastal Piracy, Gearhulk) can stall.
- No infinite combo in the owned mono-U pool; the deck wins by combat, so Propaganda/flyers must survive a wipe.
- 36 lands under Karsten's 39; leans on 11 rocks and Sai sac-draw to hit land drops.
- The model is blind to the dead fetches and to Sai's artifact-cast synergy; deltas near 0 are noise.
