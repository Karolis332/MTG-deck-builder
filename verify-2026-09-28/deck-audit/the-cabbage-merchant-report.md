# The Cabbage Merchant — paper deck audit (2026-09-28)

## 1. Plan

Food engine, four-player pod. Make Foods, multiply them (Academy Manufactor, Peregrin Took, Second
Harvest), turn them into mana (Jaheira, Night of the Sweets' Revenge, the commander) and bodies (Halsin,
Trudge Garden, Displaced Dinosaurs), then close with Bumi's Feast Lecture's land-creature or a wide
animated attack. **The infinite is already assembled in the current build**: Trudge Garden + Teething
Wurmlet + Peregrin Took + Academy Manufactor + Jaheira loop unbounded mana, 4/4 tramplers and life —
Walking Ballista or Pest Infestation then kills the table (`proposals/cabbage-merchant-upgrade.md` §1,
still true here, all five pieces are physically present).

## 2. Health

| Category | Current (99) | Proposed (100) |
|---|---|---|
| Lands | 33 (27 Forest + Ash Barrens, Ba Sing Se, Escape Tunnel, Gingerbread Cabin, Mosswort Bridge, Nesting Grounds) | 32 + Helix Pinnacle as an alt wincon (Nesting Grounds cut for Elvish Archdruid, a green source itself) |
| Ramp | 11 (Gilded Goose, Llanowar Elves, Elvish Mystic, Emerald Medallion, Cultivate, Kodama's Reach, Tireless Provisioner, Wild Growth, The Earth King, Emil, Many Partings) | 12 (+Elvish Spirit Guide, +Elvish Archdruid; −Emil) |
| Card draw | 8 (Sarinth Steelseeker, Ohran Frostfang, Syr Ginger, Toski, Return of the Wildspeaker, Idol of Oblivion, Garruk's Uprising, Spry and Mighty) | 8 (Spry and Mighty → Hunter's Insight; +Alhammarret's Archive doubles all of it) |
| Spot removal / interaction | 7 (Archdruid's Charm, Bridgeworks Battle, Force of Vigor, Kenrith's Transformation, Pest Infestation, Walking Ballista, Wicked Wolf) | 7 (unchanged) |
| Wipes | 0 | 0 — structural gap, not fixed (pool has none worth the plan) |
| Protection / fog | 3 (Arachnogenesis, Spore Frog, Endurance) | 4 (+Fog) |
| Win conditions | 6 lines + the infinite (§3 of the upgrade doc) | same 6 + Alhammarret's Archive turbo-charges the lifegain-to-cards loop |
| Avg MV | 3.13 (gate) | 3.13 (gate) |
| Game changers | 1 (Seedborn Muse) | 1 — bracket-3 cap (3) not touched |

No structural problems: card count is the only thing actually broken (99, fixed to 100 below).

## 3. Swaps (ranked by impact)

| IN | OUT | Why IN | Why OUT is weaker |
|---|---|---|---|
| Elvish Spirit Guide | Hungering Puppetbeast | "Exile this card from your hand: Add {G}" — free turn-one ritual into Manufactor/Jaheira on turn two; the operator's own upgrade doc already called for it and it never made the physical build | "{1}, Sacrifice another artifact: put a +1/+1 counter" — the only card in the deck that WANTS to sacrifice Foods/Clues/Treasures for nothing; actively fights the engine, EDHREC #27440 |
| Helix Pinnacle | The Ooze | "Shroud... at 100+ tower counters, you win" — with Jaheira's Food-taps-for-G *and* Seedborn Muse untapping the whole board on every opponent's turn (both already in the 99), this is a real alt wincon through wraths and removal, exactly as the operator's own doc flagged (§7: "the one defensible unused card") | Only triggers off +1/+1-counter creatures leaving the battlefield; this deck runs almost no counters theme, EDHREC #4284 |
| Alhammarret's Archive | Ginger, Queen of Sweets | "If you would gain life, gain twice that much... if you would draw a card except the first each draw step, draw two" — doubles every Food-sac (3 life), Trudge Garden trigger, and Toski/Ohran Frostfang/Syr Ginger draw in one static | 6 mana, EDHREC #23997, and its only repeatable value (a Gingerbrute per upkeep) requires holding the monarch, which three opponents are actively trying to take from a life-gaining deck they can't otherwise punish |
| Tendershoot Dryad | Emil, Vastlands Roamer | "At the beginning of each upkeep, create a 1/1 Saproling" — four tokens a round, each a Food once Peregrin Took is out, feeding every sac outlet in the deck | Grants trample only to creatures with counters (the deck has almost none) and its activated ability wants differently-named lands, which a 27-Forest base doesn't have |
| Loxodon Warhammer | Greenhouse Propagator | "+3/+0, trample, lifelink" for {3} — put it on any Halsin-animated Bear or the Bumi's Feast Lecture land and every point of damage feeds Trudge Garden/Titanbones' lifegain loop, one card instead of a body that needs other creatures to enter | "Whenever another creature you control enters, gain 1 life" — 1 life at a time from a deck that already has three real lifegain engines; a mana dork riding on it doesn't change that it's the weakest card advantage/ramp piece in the 99 |
| Elvish Archdruid | Nesting Grounds | "{T}: Add {G} for each Elf you control" — 4 Elves are already in the 100 after this swap (Elvish Mystic, Jaheira, Elvish Spirit Guide, itself), so this taps for 2-3 green on turn four+, well ahead of a colorless-only land | Colorless mana + a niche counter-moving ability the deck has almost no counters to move; weakest of the three utility lands the operator asked to keep in 2026-09-18 (Ash Barrens and Escape Tunnel are kept here — this swap is about the ramp upgrade, not re-litigating that land-count call) |
| Hunter's Insight | Spry and Mighty | "Whenever that creature deals combat damage to a player... draw that many cards" — one target, works off any single hit (Halsin Bear, animated Bumi land, Displaced Dinosaurs token), no second creature required | Needs two specific creatures with a power gap to be worth anything; in a token-swarm deck most bodies are the same size, so X is usually small or zero |
| Fog (pure add, 100th card) | — | Cheap fourth layer of "prevent all combat damage this turn" for a deck whose own doc says the win is three attack steps across three turns — the pod gets three turns to kill you back. Protection/fog sits at only 3 pieces in the 99; this was in the original role plan and never got sleeved | 100th slot was unassigned |

Game changers: 1 → 1 (Seedborn Muse only; none of the ins are game changers).

## 4. Coverage — every pool card at EDHREC ≤3000, price ≥$4, game changer, or a legendary/planeswalker referencing the commander's mechanic

Grouped by disposition; oracle clause quoted for every REJECT next to the reason.

**ADD (in the swaps above):** Elvish Spirit Guide (#746), Elvish Archdruid (#880, $7.17), Alhammarret's
Archive (#970, $10.16), Loxodon Warhammer (#972), Hunter's Insight (#1058), Tendershoot Dryad (#1304),
Helix Pinnacle (#4488, $8.07, off-plan-rank but price-qualified), Fog (#657).

**REJECT:**
- Path of Ancestry (#14) — taps for commander-identity mana only, no Food/ramp text; the deck already runs 32 green sources, a colorless-until-spent land adds nothing Ba Sing Se/Gingerbread Cabin don't already do better (they also make Food/earthbend).
- Rogue's Passage (#18) — "{4}, {T}: target creature can't be blocked" is evasion for a single attacker; this deck wins with wide/animated attacks the fog suite already protects, not a single unblockable body.
- Evolving Wilds (#19) — enters untapped fixing only basics; at 27 Forest the deck has nothing to fix.
- Rampant Growth (#27) — "search... put onto the battlefield tapped" is strictly worse than Cultivate/Kodama's Reach already in the 100 (2-for-1 vs 1-for-1).
- Terramorphic Expanse 2x (#28) — same as Evolving Wilds, no fixing need.
- Commander's Sphere 2x (#52) — mana rock that only taps for colors in identity (=G here, so a Sol Ring-shaped worse land); Emerald Medallion already covers cost reduction.
- Temple of the False God (#83) — needs 5 lands for {C}{C}; colorless doesn't cast anything green-pipped in this list.
- Wayfarer's Bauble ($5.44, #124) — basic-land tutor at sorcery speed for {2} total; Cultivate/Kodama's Reach/Tireless Provisioner already cover this more efficiently.
- Ornithopter of Paradise (#220) — 0/0-stat flying mana dork, adds nothing over Elvish Mystic/Llanowar Elves already in the deck.
- Explore (#234) — cut in the 2026-09-18 pass ("weak cantrip; Steelseeker and Took draw every turn"); still true, still off.
- Sword of the Animist ($6.22, #235) — land-per-attack equipment; the deck's ramp is already ahead of its land drops most games, this doesn't accelerate the engine.
- Everflowing Chalice (#254) — colorless ramp with no upside for a mono-G deck that wants green pips (Archdruid's Charm, Force of Vigor).
- Skyshroud Claim (#300) — legitimate ramp (2 Forests to the battlefield) but the deck is already at its intended ~33-land count per the operator's 2026-09-18 review; adding more land-fetching pushes past that without a stated need.
- Harmonize (#326) — "draw three cards" for 4 is fine but strictly worse than what Alhammarret's Archive turns Toski/Ohran Frostfang/Syr Ginger into for free.
- Shamanic Revelation (#368) — cut 2026-09-18 ("counts creatures; the board is noncreature tokens"), still the case.
- Forgotten Ancient (#390) — cut in the v2 arrival plan for Quina; the counters-payoff theme it wants isn't in this build.
- Selvala, Heart of the Wilds ($4.40, #410) — cut 2026-09-18 ("symmetric draw feeds three opponents"), still true.
- Ghalta, Primal Hunger (#460) — the deck already runs Ghalta the Unstoppable, a strictly better fit (reduces off the single biggest creature AND grants trample to the team); this one only trims off total power and grants no team trample.
- Burnished Hart (#497) — {3} sac-for-2-basics; Cultivate/Kodama's Reach already do this without giving up a body slot.
- Bender's Waterskin (#567) — colorless-fixing rock, no synergy.
- Worn Powerstone (#574) — same, enters tapped, no synergy.
- Realmwalker (#607, $1.92) — changeling tribal-type payoff engine; this deck has no tribal subtheme to key off.
- Opal Palace (#676) — commander-cast utility land, marginal at best with a 3-mana commander that isn't being recast often.
- Riveteers Overlook 2x (#715) — fetches a basic Forest/Swamp/Mountain, mono-G gets no fixing value from the off-color options; strictly a slow Evolving Wilds.
- Palladium Myr (#741) — colorless-only rock, no green pip help.
- Steel Overseer (#809) — artifact-creature counters payoff; this isn't an artifact-creature tribal build.
- Cankerbloom (#814) — cut 2026-09-18 ("Force of Vigor, Bridgeworks Battle, Pest Infestation, Charm cover artifacts/enchantments"), still true.
- Rishkar, Peema Renegade (#870) — counters-matter ramp; marginal fit, and Elvish Archdruid already fills the "extra Elf ramp" slot better.
- Loot, Exuberant Explorer ($2.77, #893) — cut 2026-09-18 as an off-plan legend; land-drop and creature-cheat text doesn't touch Food/tokens.
- Blighted Woodland (#925) — cut by the operator 2026-09-18 specifically for land-count reasons at 33 lands ("four mana for two tapped basics"); that call still applies at 32.
- Devoted Druid (#966) — repeatable {G} dork; the deck already has five ramp creatures/rocks, this is a fifth copy of the same effect with no new text.
- Well of Lost Dreams ($8.31, #1131) — cut at the operator's explicit request 2026-09-18 alongside Blossoming Bogbeast; the lifegain-to-cards role it filled is exactly what Alhammarret's Archive is being added for instead (doubles draw and life rather than converting one into the other), so the same slot isn't being re-opened.
- Roiling Regrowth (#1050) — sacrifices a land for 2 basics; net land-neutral, no upside over Cultivate.
- Shared Roots (#1063) — cut 2026-09-18 ("weak cantrip"), still true.
- Witch's Clinic ($15.29, #1069) — narrow: only grants the commander lifelink, a small combat-relevant upside for a deck that isn't attacking with the commander as a plan.
- Fertile Ground (#1078) — ramp aura, two-for-one risk against a removal-light pod; Emerald Medallion is safer, uncounterable-by-removal ramp already in the 100.
- Mishra's Bauble (#1106) — cut 2026-09-18 ("artifact count only, no mana"), still true.
- Lumra, Bellow of the Woods ($27.83, #1130) — big body/ramp payoff but zero Food/token text; off-plan vanilla stats for 6 mana.
- Bushwhack (#1258) — modal fetch-or-fight, fine but redundant with Bridgeworks Battle/Archdruid's Charm already covering the fight mode.
- Maestros Theater (#1281) — fetches Island/Swamp/Mountain, useless in mono-G.
- Carpet of Flowers ($5.23, #1287) — hoses blue opponents specifically; too narrow to slot over the deck's actual ramp.
- Pristine Talisman (#1354) — {T}: add {C}, gain 1 life; the deck's lifegain is already Food-driven and far larger per trigger.
- Regrowth (#1382) — cut 2026-09-18 for Brawn (already applied and Brawn is in the deck); not reopening that call.
- Contagion Clasp (#1423) — proliferate payoff; no counters subtheme here to grow.
- Muraganda Raceway (#1432) — Speed-mechanic land, no synergy, colorless.
- Goldvein Hydra (#1439) — X-cost Treasure-on-death hydra; fine body but no Food synergy, strictly worse fit than what's already in the ramp/token suite.
- Elixir of Immortality (#1443) — gain 5 life once, shuffle back; a one-shot with no repeatable engine value.
- Arid Archway (#1500) — bounces a land back to hand, tempo-negative for a deck that wants to hit land drops for Tireless Provisioner/Earth King.
- Lavaspur Boots (#1521) — haste equipment, off-color flavor (red-coded design) with no green payoff here.
- Radiant Fountain (#1559) — one-time 2 life, replaces a land drop with strictly less upside than any basic.
- Kozilek, the Great Distortion (#1567) — 10-mana colorless finisher; completely off the curve and off-plan for a Food deck.
- Nissa, Who Shakes the World (#1657) — cut by the operator twice (2026-09-18 swap to Transmutation Font, then again in the review pass); not reopening that call.
- Overrun (#1708) — cut 2026-09-18 ("one-shot pump; Uprising, Bogbeast, Spider-Ham are permanents"), still true.
- Nyx Lotus (#1761) — devotion ramp; this deck's mana symbols are spread thin (many 1-pip cards), devotion payoff is weak here.
- Adaptive Automaton (#1766) — tribal lord with no chosen-type payoff in an untribed token deck.
- Ilysian Caryatid (#1779) — mana dork gated behind a power-4 creature; redundant with unconditional dorks already in the 100.
- Springleaf Parade (#1869) — X changeling tokens, mana-positive utility lands; interesting but strictly a worse Trail of Crumbs/Manufactor-fed engine already in the deck.
- Cycle of Renewal (#1932) — cut 2026-09-18, functionally identical to the still-cut Roiling Regrowth.
- Bitterthorn, Nissa's Animus (#1953) — living-weapon equipment, no Food synergy, a slow land-fetch-on-attack that duplicates Loxodon Warhammer's slot worse.
- Venser's Journal (#1998) — no-max-hand-size + upkeep lifegain off hand size; passive value but does nothing the turn it lands and no interaction with Food sac.
- Conduit Pylons 2x (#2014) — colorless-fixing Desert, no need.
- Paradise Druid (#2090) — hexproof-while-untapped dork; fine but a sixth copy of "tap for any color," no new text over what's already in.
- Mycoloth (#2104) — rejected in the operator's 2026-09-18 land-count pass ("devour sacrifices creatures, not Foods; without creature fodder it is a 4/4 that makes nothing"), still correct.
- Cityscape Leveler (#2114) — 8-mana removal-on-a-stick; too slow, no Food synergy, and the deck already has Force of Vigor/Charm/Pest Infestation for artifact/enchantment hate.
- Monstrous Vortex (#2177) — cut 2026-09-18 ("cascade payoffs need big creatures"), still true — the deck's threats are mostly tokens, not 5-power creature spells.
- Verdant Sun's Avatar (#2179) — lifegain-on-ETB body; the deck's Food-sac lifegain already dwarfs this per-creature trickle.
- Primeval Bounty (#2180) — strong card in a vacuum, but at 6 mana it's slower than Alhammarret's Archive for less textual synergy with the Food engine (no lifegain doubling, no draw doubling); a reasonable "next upgrade," not this pass's swap.
- Flare of Cultivation (#2185) — cut 2026-09-18 (sacrifices an engine piece to save mana Kodama's Reach already provides for free).
- Earthbender Ascension (#2189) — earthbend payoff; the deck's one earthbend card (Bumi's Feast Lecture) doesn't need a second enabler.
- Hidden Grotto (#2257) — colorless-fixing land, no need.
- Earthshaker Dreadmaw (#2391) — draws per other Dinosaur; the deck runs one Dinosaur-typed threat (Displaced Dinosaurs' tokens are Dinosaur-typed after the fact, but this only counts "other Dinosaurs you control" at cast time, i.e. usually zero).
- Regal Behemoth (#2417) — monarch body; redundant with the Ginger/Alhammarret's monarch discussion above, and it's a worse rate (6 mana, no repeatable Food output) than what's being cut in.
- Abundant Growth (#2428) — ramp aura, same fragility issue as Fertile Ground, redundant with safer ramp already present.
- Primordial Hydra (#2433) — X-cost hydra that doubles counters; no Food synergy, off-plan body.
- Harvest Season (#2443) — land ramp scaling off tapped creatures; this deck's creatures are mostly untapped blockers/engine pieces, weak trigger condition.
- Chomping Changeling (#2554) — one-shot artifact/enchantment destruction on a 2/2; Force of Vigor/Archdruid's Charm/Pest Infestation already cover this better.
- Bloated Contaminator ($3.41, #2606) — poison/proliferate subtheme, off-plan.
- Nightshade Dryad (#2780) — mana dork, redundant with the ramp suite already at capacity.
- Hornet Nest (#2802) — the deck already runs Hornet Queen (better rate, immediate bodies) for the same defensive-flyers role; adding both is redundant.
- Outcaster Trailblazer (#2889) — draws off power-4 ETBs, a fifth or sixth copy of an effect Garruk's Uprising already provides continuously.
- The Legend of Kyoshi ($5.67, #3073) — cut 2026-09-18 ("earthbend package, 8-drop; Bumi's Feast Lecture already covers earthbend"), still true.
- Torpor Orb ($5.07, #3484) — "creatures entering don't cause abilities to trigger" would turn off the deck's OWN Food-making ETBs (Gilded Goose, Feasting Hobbit, Tough Cookie, Spider-Ham, Trail of Crumbs) — actively anti-synergistic.
- Planetarium of Wan Shi Tong ($5.86, #3624) — scry/cast-off-scry engine, no Food text, slow 6-mana rock.
- Avatar Kyoshi, Earthbender ($14.68, #4331) — cut 2026-09-18 with the rest of the earthbend package.
- Lost Jitte ($5.39, #4482) — combat-damage equipment; fine in a vacuum but the deck's real payoff for combat damage is already Toski/Ohran Frostfang (card draw) and Loxodon Warhammer (lifegain), no room for a third equipment.
- Tarmogoyf ($4.69, #9480) — graveyard-size beater, no Food/token text, off-plan.
- Simulacrum Shaper ($7.26, #25232) — land-tutor body, redundant with Cultivate/Kodama's Reach/Tireless Provisioner.
- Carnivorous Cultivator ($5.78, #26583) — land recursion on combat damage, marginal value, no Food text.
- Omnipresence ($25.16, #26979) — free-spell payoff scaling off creature count; this deck's board is mostly noncreature Food/Clue/Treasure tokens, so the count needed rarely gets high enough to matter.
- The Echoverse Fulcrum ($13.84, #27737) — loot + one-shot board wipe; the wipe is real value (the deck has zero) but it's a single-use effect on a narrow artifact, and using the only wipe in the 100 costs a card that does nothing else; flagged here rather than slotted in — the deck's lack of a wipe is a real gap this doesn't fully solve.

No planeswalker or legendary in the pool references the commander's Food/damage-sacrifice mechanic by name; Jiang Yanggu, Wildcrafter and Vivien, Champion of the Wilds (both legendary planeswalkers in the pool, ranks 6391/3926 — below the ≤3000 cutoff and under $4) were checked and don't meet a criterion, so they're outside the mandatory list; noted for completeness, not proposed.

## 5. Gate result

`MTG_DB_DIR=... npx tsx scripts/deck-gate.ts <proposed> --format commander --owner 1 --source paper`

```
VERDICT   : WARN
PASS  size        100 cards
PASS  singleton   singleton respected (basics exempt)
PASS  legality    every card legal in commander
PASS  rules       no other format rule broken
PASS  identity    all cards inside G
PASS  ownership   all cards owned; paper collection imported 0 days ago
WARN  arenaNames  3 card(s) must be exported front-face only (Bridgeworks Battle, Disciple of
                   Freyalise, Invasion of Ikoria) — already written front-face-only in the proposed
                   list; this is the gate's paper-vs-Arena export note, not a legality issue.
WARN  lands       32 lands (+2 MDFC backs = 32.8 eff.); Karsten wants 38±2 — the operator explicitly
                   set this deck's land count via three separate 2026-09-18 reviews (32→36→33→27+3
                   utility), landing on "I don't really have mana problems" with 33; this pass takes
                   it to 32 only by trading Nesting Grounds for Elvish Archdruid, itself a green
                   source. Not re-litigating the count; flagging per the gate's own threshold.
WARN  plan        42/67 nonland cards interact (63%) — commander wants: noncreature spell; only
                   30/67 (45%) satisfy it. The gate's `plan` metric checks for cards that interact
                   with the commander's own trigger ("opponent casts a noncreature spell") — that's
                   the wrong axis for this deck, which plays a Food-token combo, not a
                   spells-matter deck. Same WARN, same cause, on the unmodified 99-card list; not
                   introduced by this pass. Consistent with the brief's "plan FAIL... known and
                   acceptable" case (WARN here instead of FAIL only because the gate found a nonzero
                   overlap by coincidence).
PASS  curve       avg MV 3.13
PASS  wincons     11 win condition(s)/closer(s)
PASS  locks       0 locked card(s)
```

## 6. Reality Fracture pass

- **Keeper of the Quiet Hour** — "When this creature enters, empower Jace 2" (creates a Jace
  planeswalker token at 2 loyalty, or adds 2 to one you have). It's an artifact creature — a historic
  permanent — so it's a free 7/7 off Displaced Dinosaurs, plus the Jace token can `[-3]: Draw a card`
  immediately (net: 3 mana for a 7/7 + a card) or bank `[-1]: Surveil 1` for slow ongoing value.
  **ADD → OUT Greenhouse Propagator** (Greenhouse's "gain 1 life whenever another creature enters" is
  the weakest lifegain trickle left in the 100 next to three real Food-sac/Trudge Garden/Titanbones
  engines already doing that job at a much larger scale; Keeper does something none of them do).
- **Loot, the Nexus** — "{T}: choose a color, add one mana per different power among creatures you
  control." Another unconditional ramp dork on top of the 12 the deck already runs (Gilded Goose,
  Llanowar Elves, Elvish Mystic, Elvish Spirit Guide, Elvish Archdruid, Tireless Provisioner, Emerald
  Medallion, Wild Growth, Cultivate, Kodama's Reach, Many Partings, The Earth King); ceiling is high
  late (many distinct token sizes: 1/1s, 4/4 Trudge tokens, 7/7 Dinosaurs) but it's a fifth-plus copy
  of "more mana," no Food/token-conversion text. REJECT.
- **Edgar, Moonlit Sovereign** — self-counters "if you didn't cast a spell this turn"; this deck casts
  spells every turn it can (ramp into engine pieces), so the ability rarely fires. No Food synergy.
  REJECT.
- **Eye of Jace** — one-time "sacrifice... deal 2 to each opponent, gain 2 life" at 7+ cards in
  graveyard; the deck has near-zero self-mill, so the trigger condition is slow to reach, and the
  single 2-life payoff is trivial next to a Food sac (3 life, repeatable, feeds Titanbones and Trudge
  Garden). REJECT.
- **Fblthp, Knows the Way** — Domain power = basic land TYPES controlled; a 27-Forest, mono-G deck
  controls exactly one basic land type, so Fblthp is a 1/1 that searches at most one basic to hand.
  Dead text in this manabase. REJECT.
- **Inspired Tethermage** — counters "whenever you put one or more loyalty counters on a
  planeswalker"; the deck runs zero planeswalkers in the proposed 100, so this never triggers off
  anything already present. REJECT.
- **Murmuring Volume** — colorless-fixing mana rock + loot; mono-G needs no color fixing, and the
  loot ability competes with Idol of Oblivion/Sarinth Steelseeker/Toski/Ohran Frostfang already
  covering card flow. REJECT.
