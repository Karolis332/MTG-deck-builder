# UR (Izzet) — Saheeli, Jewel of Avishkar — build report (2026-10-09)

Base: `verify-2026-10-09/color-best/lists/UR-saheeli-jewel-of-avishkar.txt` (model climb, objective 81.74 / DS 71.8 at 300 games, `score-model.txt`).
Final: `final.txt` — objective **81.79** / DS **71.8** (`score-final.txt`); swap lab ALL 81.85 (`lab-4.txt`). Gate: `gate.txt`.

## Plan
Commander (oracle): "Thopters you control have haste. Whenever you cast a noncreature spell, create a 1/1 colorless Thopter artifact creature token with flying."
Primary plan: noncreature-spell / artifact density → hasty flying Thopter swarm, every token also an artifact for the X-counters.
- **T1–3:** lands, Sol Ring / Arcane Signet / Chalice / Fellwar, cost reducers (Etherium Sculptor, Foundry Inspector, Enthusiastic Mechanaut, Geist of Saint Thalia), Tetsuko, Sai, Steel Overseer.
- **T4–6:** Saheeli on 4 (Sol Ring → T3). Each rock/removal/counter = a hasty 1/1 flyer; Sai / Efficient Construction / Pinnacle Emissary / Chrome Host Seedshark double the token output. Jhoira, Uthros Research Craft, Coastal Piracy, Harmonized Crescendo (name Thopter) refill.
- **Close (T7–9):** Craterclaw Colossus — "creatures you control gain trample and get +X/+0 … where X is the number of artifacts you control"; Thopters have haste from Saheeli, Tetsuko keeps every toughness-1 Thopter unblockable ("power or toughness 1 or less can't be blocked") because Craterclaw only adds power.
- **Backup:** Ajani Unrelenting +1 (+1/+0 and haste to all, a 2/2 Cadet per activation), Kappa Cannoneer / Urza construct, Steel Hellkite.

**Closer:** Craterclaw Colossus on a Thopter board (+X/+0 trample, X = artifacts), Tetsuko for unblockability.

## Swaps (each scored alone on the model list, 300 games, `lab-4.txt`)
| Out | In | Why | Source | Δ |
|---|---|---|---|---|
| Sky Diamond | Sol Ring | "{T}: Add {C}{C}" for 1 vs a tapped {U} rock for 2; Saheeli on T3 | RAID inspirit-flagship-vessel | +0.01 |
| Decanter of Endless Water | Arcane Signet | 2-mana any-colour rock vs 3-mana | FREE | −0.00 |
| Trumpeting Carnosaur | Steel Hellkite | artifact flyer; "{X}: Destroy each nonland permanent with mana value X whose controller was dealt combat damage" — removal + closer, counts for Craterclaw | FREE (Carnosaur back to Gilanra) | +0.02 |
| Hoard-Smelter Dragon | Explosive Derailment | {R} noncreature removal: "4 damage to target creature" / "Destroy target artifact" = a Thopter too | FREE (Dragon back to Gilanra) | −0.04 |
| Soul-Guide Lantern | Unauthorized Exit | 2-mana instant "Return target nonland permanent" + surveil vs graveyard hate | FREE | +0.02 |
| Sapphire Medallion | Chrome Host Seedshark | "Whenever you cast a noncreature spell, incubate X" — 2nd Saheeli-style trigger; Incubators are artifacts | FREE | +0.01 |
| Cloud Key | Tetsuko Umezawa, Fugitive | 1/1 Thopters unblockable even after Craterclaw/Ajani power pumps; 5th reducer was redundant | FREE | −0.01 |
| Windswept Heath | Fabled Passage | Heath fetches "Forest or Plains" — dead in Izzet (Steam Vents is Island Mountain) | FREE (Heath back to Tazri) | 0.00 |
| Reliquary Tower | Command Tower | operator rule: Tower filler out, coloured mana in | RAID inspirit-flagship-vessel | +0.04 |
| Temple of the False God | Exotic Orchard | Temple dead before 5 lands; colour fixing | FREE | +0.08 |

Rejected by the score (lab-1/-3, kept the model's card):
- Ajani Unrelenting → Ponder / Chrome Host Seedshark: −6.7 to −6.8 (win 65 → 56, close-turn step). Ajani's +1 is a real anthem for a 1/1 swarm → kept.
- Titan Forge → Opt / Tetsuko: −6.7 to −8.8 (same step; goldfish closes with the 9/9). Kept on the score rule, judgment calls it slow.
- Cityscape Leveler → Fire // Ice −1.91, Devourer of Destiny → Thought Monitor −2.00 (removal window). Kept.
- Cloud Key → Ponder, Emry → Opt: −2.0 each (draw window over 12).

## Raids (card → donor; Beledros untouched)
| Card | Donor |
|---|---|
| Abrade, Archway of Innovation, Cascade Bluffs, Chaos Warp, Craterclaw Colossus, Cyclonic Rift, Enthusiastic Mechanaut, Etherium Sculptor, Everflowing Chalice, Fellwar Stone, Great Furnace, Inventors' Fair, Jhoira, Karn's Bastion, Ornithopter of Paradise, Rapid Hybridization, Shivan Reef, Silverbluff Bridge, Spire of Industry, Steel Overseer, Sulfur Falls, Swan Song, Temple of Epiphany, Tezzeret Cruel Captain, Urza, Uthros Research Craft, Uthros Titanic Godcore, Sol Ring, Command Tower, Island ×2 | inspirit-flagship-vessel (32) |
| Ajani Unrelenting, Mana Confluence, Saheeli Sublime Artificer | tam-the-possibility (3) |
| Blasphemous Act, Bloodstained Mire, Spirebluff Canal, Steam Vents, Wooded Foothills | tazri-beacon-of-unity (5) |
| Foundry Inspector, Thought Vessel | imotekh-the-stormlord (2) |
| Rogue's Passage, Strip Mine, Mountain ×2 | bumi-unleashed (4) |

Raids 46 lines → building this deck means dismantling Inspirit (Jhoira runner-up 74.8 lives there too). Swaps removed 2 Gilanra raids and 1 Tazri raid.

## Gate (`gate.txt`)
PASS size 100, singleton, legality, identity RU, ownership, plan, curve, wincons (8), locks. FAIL arenaNames (paper false negative: "Sink into Stupor // Soporific Springs"). WARN lands 36 (+MDFC 36.4) vs Karsten 39±2.

## Risks
- Inspirit dismantled: 32 raided cards, no backfills planned.
- Lands WARN (36.4 vs Karsten 39±2); 9 colourless-only lands vs Craterclaw {R}{R}{R} and Urza {U}{U}.
- Model blind to Tetsuko unblockability and Seedshark Incubators (DS flat); kept on judgment within the 0.25 bar.
- Ajani / Titan Forge stay because of a goldfish close-turn step, not proven quality.
- Blasphemous Act / Perplexing Test / Cyclonic Rift overload kill or bounce our own Thopters — cast before rebuilding, not mid-swarm.
