# Tam, the Possibility — Fable review (2026-09-28)

Inputs: `tam-the-possibility-final.txt` (= confirmed deck 8b72591 + Well of Lost Dreams − Chandra, Fire Artisan + Domri, Anarch of Bolas − Rewrite Regrets), `-deck.md`, `-pool.md`, `-fra-assumed.md`, `final-swaps.json`, `REFUTE.md` §1/§7, `HISTORY.md` (Tam v1 only; the operator's swap decisions are in CLAUDE.md's 2026-09-28 log). Every oracle quote below is from those files.

## 1. Verdict

- The confirmed 100 is sound and plays as built: Way of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life") + Way of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control") is in, 20 walkers feed it, the mana holds (35 lands, 11 rocks/dorks, every colour has ≥ 13 land sources). No category is missing.
- The two audit swaps are upgrades, not fixes. **Well of Lost Dreams → Chandra, Fire Artisan: take it.** **Domri → Rewrite Regrets: right OUT, wrong IN — Ral Zarek is the better new-type walker.** Two changes, then stop; nothing else in the remaining 98 justifies another revision round.

## 2. Health — current vs final (final = Well + Ral)

| Category | Current | Final | Note |
|---|---|---|---|
| Lands | 35 | 35 | land colour sources W17 U16 B15 R13 G15 vs pips W24 U20 B20 R13 G21 — balanced; {1}{W}{W}{W} Archangel is the only hard cast |
| Ramp | 11 | 11 (+ Ral +1 untapping Timeless Lotus "{T}: Add {W}{U}{B}{R}{G}") | Sol Ring, Signet, 3 Talismans, Lotus, Bloom Tender, Faeburrow Elder, Esika, Great Divide Guide, Farseek |
| Draw | walker-borne: Jace MA +1, Kaya IS 0, Vraska 0, Dellian 0, Kaito 0, Chandra ToD/FA +1, Way of the Mind Sculptor, Chimil, Protege's Awakening | + Well (repeatable, one draw per lifegain event) − Chandra FA impulse | Well X = 3 off Kaya IS "+2: ... you gain 3 life", Dellian "+2: You gain 3 life", Ob Nixilis BO "+2: ... You gain life equal to the life lost" |
| Spot removal | 12 incl. loyalty abilities (Trophy, Atomize, Erode, Path, Vraska's Final Mercy, Oko +1, Ob Nix HT −2, Dellian −3, Wanderer −2, Chandra ToD −3, Kaya IS −3, Warlord −4) + Counterspell, Dovin's Veto | + Ral "−2: Ral Zarek deals 3 damage to any target" | |
| Wipes | 6: Toxic Deluge, Fumigate, Final Act, Settle the Wreckage, Elspeth −3, Ajani Unrelenting −3 | 6 | the auditor counted 5 (missed Ajani U "−3: 4 damage to each creature except for tokens you control") |
| Protection | Archangel static, Elspeth/Ajani U/Saheeli token bodies, Kaya's Ghostform, Liliana the Faultless hexproof, Vigorbloom Charm, The Wanderer static, Chimil, two counters | unchanged | |
| Win lines | Jace RS 0 + Jace MA (+1 mill / −7 draw twenty), Vraska −9 + proliferate, Sarkhan +1 alpha (Sorin lifelink on your turn), Kaya IS +2 drain, Ajani U Cadets + Elspeth emblem, Warlord −4 on every walker | unchanged (+ Ral −7 extra turns) | gate: 11 wincons |

## 3. Swap review

| IN | OUT | Verdict | Reason |
|---|---|---|---|
| Well of Lost Dreams | Chandra, Fire Artisan | **agree** | Well: "Whenever you gain life, you may pay {X}, where X is less than or equal to the amount of life you gained. If you do, draw X cards." Every Paradox trigger is a card for {1}; Kaya IS / Dellian / Ob Nixilis BO +2 are 3 cards for {3}. The auditor's OUT reason is wrong — Chandra FA is not narrow: "+1: Exile the top card of your library. You may play it this turn" is impulse draw plus a Paradox→Mentor trigger, and casting it fires Quintorius ("Whenever you cast a spell from exile"). She goes because she shares her type with Chandra, Torch of Defiance and is the lowest-value walker, not because she is dead. |
| Domri, Anarch of Bolas | Rewrite Regrets | **OUT agree, IN disagree** | Rewrite Regrets: "Return target creature or planeswalker card with mana value 6 or less from your graveyard to the battlefield" — no target, no cast, and a 4-mana sorcery one-shot in a deck whose loop scales with the number of walkers activating each turn. Domri's "+1: Add {R} or {G}" repays himself and feeds the loop, but Ral Zarek does more for the same cost after Tam/Geist: "+1: Tap target permanent, then untap another target permanent" untaps Timeless Lotus (+5 mana) or untaps Tam for a second "{W}{U}{B}{R}{G}, {T}: Proliferate X times" off Bloom Tender / Faeburrow Elder ("For each color among permanents you control, add one mana of that color"); "−2: ... 3 damage to any target" is removal; same new type (Ral). Domri's "−2: ... fights" is dead with 14 creatures. |

## 4. Overturned rejects

None. The refuter's rejects hold: Archangel's "creatures can't attack you or planeswalkers you control unless their controller pays {1}" is real protection; Jared, Saheeli, both Talismans and Final Act are locks; Vigorbloom's "hexproof and indestructible" mode protects a walker, which Ghostform ("return that card to the battlefield") does not. Refuter coverage-miss #2 (Ashiok, Dream Render) is not an upgrade: its only loyalty ability is "−1", so it stalls unless Mentor refills it.

## 5. Misses (never proposed)

1. **Ral Zarek** → OUT Domri, Anarch of Bolas (or Rewrite Regrets if Domri is skipped). §3. Registered and open (pool #6014, in no other paper deck). Gate on the resulting 100: PASS size/singleton/legality/identity/ownership.
2. **Sanctum Lurker** [IF-OWNED] → OUT Arcane Amphisbaena. "Planeswalkers you control aren't put into their owners' graveyards for having 0 loyalty" (ultimate without losing the walker) and "Planeswalkers you control have '[+2]: This planeswalker deals 1 damage to each opponent and you gain 1 life'" — every walker gets a plus that is a lifegain event: Mentor counters on all, a Well card. Only after the operator registers it.
3. **Jace, Multiverse Architect** [ASSUMED] → OUT The Wanderer. "+1: Draw two cards, then put a card from your hand on the bottom of your library" every turn, and "creatures they control can't attack Jaces you control this turn" unless they pay {2} — protects the Jace token that carries the 25-loyalty win. Duplicate type is not an objection (X counts types on the battlefield; see §7 note). Only after registration.
4. **Tezzeret, Master of the Bridge** — near-miss, no clean OUT. "+2: Tezzeret deals X damage to each opponent, where X is the number of artifacts you control. You gain X life" — 8 artifacts in the final list plus Food/Treasure/Servo/Drone tokens, one lifegain event of X → Well draws X. New type, but 6 MV; behind Ral.
5. **Countersculpt** — near-miss vs Counterspell, not clearly better: "behold a Jace or pay {1}" is free with the Jace token out, then it is Counterspell plus "Empower Jace 1"; without a Jace it costs 3.

Emeritus of Truce // Swords to Plowshares is in the pool; not clearly better than Erode/Path in a deck that wants the walker-hitting mode of Erode ("Destroy target creature or planeswalker").

## 6. Weakest 5 (final list)

1. **Arcane Amphisbaena** — "empower Jace 2" on a 1/1 deathtouch; the seven Ways alone put 34 counters on the token.
2. **Domri, Anarch of Bolas** — if taken over Ral: R/G mana only, fight mode dead; the weakest of the 21 walkers.
3. **The Wanderer** — no planeswalker type, no plus ability; the static ("Prevent all noncombat damage that would be dealt to you and other permanents you control") still blanks Talisman/Shivan Reef pings and burn aimed at walkers.
4. **Quintorius Kand** — 5 MV whose static needs an exile cast (Chandra ToD +1, Chimil discover, his own "−3: Discover 4"); unique type is most of his value.
5. **Way of the Healer** (locked) — the weakest Way: empower 5 plus "[−2]: Create a 2/2 ... Cadet. Surveil 1". Named, not cut.

## 7. Recommended changes vs the CURRENT deck (8b72591), ranked

1. **Well of Lost Dreams → Chandra, Fire Artisan.** Take.
2. **Ral Zarek → Rewrite Regrets.** Take; replaces the audit's Domri.
3. Optional: Domri, Anarch of Bolas → Arcane Amphisbaena, only if the operator wants a 21st walker. Otherwise stop at 2.
4. Conditional on registration: Sanctum Lurker → Arcane Amphisbaena; Jace, Multiverse Architect → The Wanderer.

Gate on the list with 1+2 applied (`/tmp/tam-fable.txt`, read-only): PASS size 100, singleton, legality, identity, ownership, curve 3.42, wincons 11; WARN lands 35 (locked, known); FAIL plan (known: the gate has no superfriends plan).

Note on Tam's X: "X is the number of planeswalker types among planeswalkers you control" — it counts types on the battlefield, not in the deck. A duplicate type only costs X when both copies are out at once, so "unique type" is a tiebreaker, not a lock criterion. The loop's currency is plus abilities activating per turn and lifegain events; a cheap walker with a plus (Ral, Domri) beats a unique type with only a minus (Ashiok, Nahiri, Samut, Dovin, Davriel, Jaya, Angrath, Jiang Yanggu).

## 8. Ashiok, Dream Render (operator question)

Oracle (pool #391): "{1}{U/B}{U/B}" (2 with Tam, 1 with Geist) — "Spells and abilities your opponents control can't cause their controller to search their library. | −1: Target player mills four cards. Then exile each opponent's graveyard." Registered, open, in no other paper deck. Printed loyalty is not in the files.

How it fell through: the auditor's reason ("no line to the plan") is wrong — every walker is Tam's plan; the refuter named OUT cards that were never in the deck, so no row existed; my §4 line "stalls unless Mentor refills it" understated it. Corrected:

- **The loop sustains a −1 walker.** Way of the Paradox: "Whenever you activate a loyalty ability, you gain 1 life." Way of the Mentor: "Whenever you gain life, put a loyalty counter on each planeswalker you control." Activating the −1 costs 1, Paradox gains 1, Mentor returns 1 to Ashiok and adds 1 to every other walker — net 0 on Ashiok per activation, and each of the other N walkers' activations adds +1 to it (+ Tam's proliferate). With both Ways out it never runs down.
- **It also has a plus ability under the engine.** Way of the Pyromancer (locked): "Planeswalkers you control have '[+1]: Add {R}.'" — so "no plus ability" only holds before the Ways are out. Before them, Ashiok shrinks by 1 per turn and its −1 gives no card, mana or board; that is the real cost.
- **Its payoff is meta-dependent.** The static stops opponents' tutors, fetches and ramp searches (it does NOT blank the search riders on your own Path / Erode / Trophy / Settle — those are spells you control). The −1 is the deck's only repeatable graveyard exile (Final Act's mode is one-shot). Strong in a pod with reanimator/tutor decks, blank otherwise.

Versus the other candidates, all as loop bodies giving one Paradox→Mentor trigger per turn:
| Walker | Cost after Tam | Before the engine | Under the engine | Standalone payoff |
|---|---|---|---|---|
| Ral Zarek | 3 | grows (+1) | +1 untaps Timeless Lotus (+WUBRG) or Tam (second Proliferate X) | −2: 3 damage any target; −7 extra turns |
| Domri, Anarch of Bolas | 2 | grows (+1), +R/G mana | +1's mana pays Well's {1} → the loop card is free | fight (dead with 14 creatures) |
| Ashiok, Dream Render | 2 | shrinks (−1) | loyalty-neutral; Pyromancer gives it +1: Add {R} | repeatable graveyard exile + anti-tutor static |

Ranking: Ral > Domri ≈ Ashiok. Slot, if it enters: **Arcane Amphisbaena** only ("empower Jace 2" on a 1/1). Not The Wanderer (repeatable −2 exile + damage prevention) and not Quintorius (his "−3: Discover 4" is a free spell, 2 drain and a lifegain event).

Revised change list vs the current deck: 1. Well of Lost Dreams → Chandra, Fire Artisan. 2. Ral Zarek → Rewrite Regrets. 3. Optional 21st walker → Arcane Amphisbaena: **Ashiok** if the pod runs graveyard or tutor decks, **Domri** otherwise. Not in the core two.

## 9. Jared replacement + fixed-point pass (2026-09-30)

State: Well of Lost Dreams is not owned, so Chandra, Fire Artisan stays; Ral Zarek → Rewrite Regrets is applied; Jared Carthalion ({W}{U}{B}{R}{G}, no generic for Tam to discount; "−6: Return target multicolored card from your graveyard" — no other all-colours card exists, so "draw a card and create two Treasure tokens" never happens) is unlocked and goes out. Engine terms: Paradox turns every activation into 1 life, Mentor turns every life event into a counter on every walker, Pyromancer gives every walker "[+1]: Add {R}", Ajani Unrelenting a Cadet per activation. So a walker body is worth one loop trigger per turn regardless of its own abilities; ranking = cost after Tam + what its own text adds + new type on the battlefield + protection/win. §7/§8 lists are superseded by this one. Cost = after Tam's {1}; "type" = new walker type.

| # | Candidate | Cost | Own plus | Type | What its text adds (quotes from the pool) | Protects / wins |
|---|---|---|---|---|---|---|
| 1 | Tezzeret, Master of the Bridge | 5 (UB) | +2 | new | "Creature and planeswalker spells you cast have affinity for artifacts" (7 artifacts + Servo/Food/Treasure/Drone tokens → later walkers near free); "+2: Tezzeret deals X damage to each opponent, where X is the number of artifacts you control. You gain X life" — a clock on all three opponents and a lifegain event; "−8: ... artifact cards ... onto the battlefield" | wins |
| 2 | Chandra, Awakened Inferno (registered 2026-09-30, not in the pool file) | 5 (RR) | +2 | dup (3rd Chandra) | "This spell can't be countered"; "+2: Each opponent gets an emblem with 'At the beginning of your upkeep, this emblem deals 1 damage to you'" — emblems stack and cannot be removed, so n activations = n damage per upkeep to each opponent (45 each after 9 turns) and her loyalty climbs 2 a turn for the granted −4/−8s; "−X: Chandra deals X damage to target creature or planeswalker ... exile it instead"; "−3: ... 3 damage to each non-Elemental creature" also hits Bloom Tender, Faeburrow, Geist, Liliana F, Evolution Sage, Flux Channeler, Thrummingbird, Pia, Avatar and every token — a mode to skip | wins (unanswerable) |
| 3 | Nissa, Steward of Elements | {G}{U} at X=1, 3 at X=3 | +2 | new | "+2: Scry 2"; "0: ... If it's a land card or a creature card with mana value less than or equal to the number of loyalty counters on Nissa, you may put that card onto the battlefield" — lands are MV 0, so a free land whenever the top is one, and Mentor lifts her past any creature; "−6: ... 5/5 Elemental creatures with flying and haste" | ramp + finisher |
| 4 | Kiora of Salt and Sand (pool, creature) | 3 (GU) | — | — | "Planeswalkers you control have '[−8]: Create an 8/8 blue Leviathan creature token with hexproof'" — under Mentor every walker reaches 8 and repeats it; "untap target attacking creature. It can't be blocked" for Sarkhan's dragons | wins |
| 5 | Domri, Anarch of Bolas | 2 | +1 | new | "+1: Add {R} or {G}" — duplicated by Pyromancer once the Ways are out; "−2: ... fights" dead with 14 creatures | — |
| 6 | Ashiok, Dream Render | 2 | none (Pyromancer's) | new | anti-tutor static; "−1: ... exile each opponent's graveyard" (§8) | pod call |
| 7 | Mu Yanling, Sky Dancer | 2 (UU) | +2 | new | "+2: ... up to one target creature gets -2/-0 and loses flying" (walker protection); "−3: Create a 4/4 blue Elemental Bird ... with flying" | protects |
| 8 | Sarkhan, the Dragonspeaker | 4 (RR) | +1 | dup | "+1: ... becomes a legendary 4/4 red Dragon creature with flying, indestructible, and haste" — attacks each turn, lifelink on your turn under Sorin; "−3: ... 4 damage to target creature" | removal |
| 9 | Chandra, Spark Hunter | 3 | +2 | dup | "+2: You may sacrifice an artifact or discard a card. If you do, draw a card"; "0: Create a 3/2 colorless Vehicle artifact token" (feeds Tezzeret's X and affinity) | draw |
| 10 | Oko, Lorwyn Liege // Shadowmoor Scion | 2 | +2 / +1 | dup | "+1: Target creature gets -2/-0 until your next turn"; back "−3: Create two 3/3 green Elk" | protects |
| 11 | Kasmina, Enigmatic Mentor (operator cut) | 3 | none | new | "Spells your opponents cast that target a creature or planeswalker you control cost {2} more"; "−2: ... 2/2 ... Draw a card, then discard a card" | protects |
| 12 | Dovin, Hand of Control | 2 | none | new | "−1: ... prevent all damage that would be dealt to and dealt by target permanent an opponent controls" — fogs the biggest attacker each turn | protects |
| 13 | Tamiyo, Inquisitive Student (creature) | 1 | +2 (back) | new | flips on "When you draw your third card in a turn" (Kaya IS 0 + draw step); back "+2: ... it gets -1/-0"; "−7: Draw cards equal to half ... your library" | conditional |
| 14 | Teyo, the Shieldmage (operator cut) | 2 | none | new | "You have hexproof"; "−2: Create a 0/3 white Wall ... with defender" | protects you |
| 15 | Liliana, Death Wielder | 6 (BB) | +2 | new | "+2: Put a -1/-1 counter on up to one target creature" (proliferate grows it); "−3: Destroy target creature with a -1/-1 counter"; "−10: Return all creature cards" | removal, too dear |
| 16 | Kaya, Bane of the Dead | 5 | none | dup | "−3: Exile target creature"; hexproof-ignoring static | removal |
| 17 | Vivien, Champion of the Wilds | 2 | +1 | new | "+1: ... reach and vigilance"; "−2: ... you may cast it if it's a creature spell" — 14 creatures | — |
| 18 | Davriel, Rogue Shadowmage | 2 | none | new | "−1: Target player discards a card"; "if that player has one or fewer cards in hand, Davriel deals 2 damage" | — |
| 19 | Nissa, Who Shakes the World | 4 (GG) | +1 | new | "Whenever you tap a Forest for mana, add an additional {G}" — two Forests in the deck; "+1: ... three +1/+1 counters on up to one target noncreature land ... Untap it" | — |
| 20 | Vraska, Swarm's Eminence | 3 | none | dup | "−2: Create a 1/1 black Assassin ... with deathtouch and 'Whenever this token deals damage to a planeswalker, destroy that planeswalker'" | — |
| 21 | Samut, Tyrant Smasher | 3 | none | new | "Creatures you control have haste"; "−1: ... +2/+1 and gains haste ... Scry 1" | — |
| 22 | Jaya, Venerated Firemage | 4 | none | new | "If another red source you control would deal damage ... plus 1"; "−2: Jaya deals 2 damage to any target" | — |
| 23 | Angrath, Captain of Chaos | 3 | none | new | "Creatures you control have menace"; "−2: Amass Zombies 2" | — |
| 24 | Nahiri, Storm of Stone | 3 | none | new | "−X: Nahiri deals X damage to target tapped creature" | removal only |
| 25 | Jiang Yanggu, Wildcrafter | 2 | none | new | "Each creature you control with a +1/+1 counter on it has '{T}: Add one mana of any color'"; "−1: Put a +1/+1 counter on target creature" | — |
| 26 | Arlinn, Voice of the Pack | 5 (GG) | none | new | "−2: Create a 2/2 green Wolf" | — |
| 27 | Grist, Voracious Larva (pool, creature) | 1 | +1 (back) | new | transforms only "if it entered from your graveyard or you cast it from your graveyard" — Ghostform/Sorin −X only | conditional |

**Pick: Tezzeret, Master of the Bridge → Jared Carthalion.** Same slot cost (5), a plus ability, a new type, and his own text wins; affinity makes every later walker cheaper than Tam alone does, and "You gain X life" is a second lifegain event on top of Paradox's, so every +2 is two Mentor triggers. Chandra, Awakened Inferno was weighed for the same slot: equal cost, the stronger standalone clock (uncounterable, emblems outlive her), but a third Chandra with no engine text — she enters in swap 4 instead, so the assignment does not change the 100.

Fixed-point pass (non-locked kept cards, weakest first: Arcane Amphisbaena, Protege's Awakening, Chandra, Fire Artisan, then The Wanderer / Farseek / Quintorius / Entrust the Spark):
- Swap 2: **Nissa, Steward of Elements → Arcane Amphisbaena.** "empower Jace 2" on a 1/1 is one turn of the loop; Nissa is a permanent loop body with scry and free lands.
- Swap 3: **Kiora of Salt and Sand → Protege's Awakening.** "Empower Jace 6. Draw a card." is a one-shot; the seven Ways alone put 34 counters on the Jace token (5+5+5+5+2+5+7 ≥ 25) and Mentor adds one per activation, so the Jace-25 line does not need it. Kiora puts a repeatable 8/8 hexproof on every walker.
- Swap 4: **Chandra, Awakened Inferno → Chandra, Fire Artisan.** Same type (X unchanged), same RR pips, two more mana (4 with Geist). FA's "+1: Exile the top card of your library. You may play it this turn" is impulse draw on a cheap body; AI's +2 is an unremovable clock on all three opponents and "−X ... exile it instead" answers a walker or creature. Every other win line here dies to removal or a wipe; the emblems do not.
- Stop: after swap 4 the best remaining candidate, Domri, loses to the weakest kept non-locked card, The Wanderer, because Domri's "+1: Add {R} or {G}" is already granted to every walker by Way of the Pyromancer, his "−2: fights" is dead, and his only edge is one more type on the battlefield; The Wanderer's "−2: Exile target creature with power 4 or greater" and "Prevent all noncombat damage that would be dealt to you and other permanents you control" do more, as do Farseek (turn-2 typed dual), Chandra FA (impulse draw + Quintorius trigger), Quintorius ("−3: Discover 4" + drain) and Entrust the Spark (walker to the battlefield). Ashiok and Mu Yanling fail the same test.

Resulting 100 vs the confirmed deck: Ral Zarek → Rewrite Regrets; Tezzeret → Jared; Nissa, Steward → Arcane Amphisbaena; Kiora → Protege's Awakening; Chandra, Awakened Inferno → Chandra, Fire Artisan (22 walkers). Gate (read-only, `/tmp/tam-fable-v3.txt`): PASS size 100, singleton, legality, identity, ownership (all five registered, in no other paper deck), curve 3.45, wincons 11; WARN lands 35 (locked; Karsten line now "39 ±2"); FAIL plan (known). Jace package left: Avatar, Entrust, Pia, Vraska's Final Mercy, seven Ways.

## 10. Chandra, Awakened Inferno

Verdict: **IN, for Chandra, Fire Artisan** (already entered as §9 swap 4; this section is the standalone judgement). {4}{R}{R}, loyalty 6 → 5 after Tam, less under Tezzeret's affinity; a third Chandra, so X is unchanged whichever Chandra is out.
- Engine: "+2" is a plus, so she is a full loop body (Paradox life → Mentor counter on every walker, a Cadet under Ajani Unrelenting) and climbs 2 a turn toward the granted Warlord/Wildspeaker −4 and Kiora −8. "This spell can't be countered" — the deck's other closers are not.
- Win: "+2: Each opponent gets an emblem with 'At the beginning of your upkeep, this emblem deals 1 damage to you'" — emblems stack and nothing removes them; after n activations each opponent takes n per upkeep (45 each by turn 9). Every other win line here (Jace RS, Vraska −9, Sarkhan alpha, Tezzeret +2) dies to removal or a wipe; this one outlives her.
- Removal: "−X: ... X damage to target creature or planeswalker. If a permanent dealt damage this way would die this turn, exile it instead" — the deck's only repeatable exile of a walker. "−3: 3 damage to each non-Elemental creature" also kills Bloom Tender, Faeburrow, Geist, Liliana F, Evolution Sage, Flux Channeler, Thrummingbird, Pia, Avatar and every token: a mode to skip, not a reason to exclude.
- Against the weakest kept non-locked cards: beats Chandra, Fire Artisan (same type and pips; FA's "+1: Exile the top card ... play it this turn" is impulse draw, no win line, and Well of Lost Dreams is not owned so FA's cut needs a new IN). Does not need to beat The Wanderer (repeatable exile + damage shield), Quintorius ("−3: Discover 4" + drain, unique type), Farseek (turn-2 typed dual toward WUBRG) or Entrust the Spark (walker to the battlefield): once FA leaves, those stay.
- Stop proof re-run after her entry: the best remaining candidate is still Domri, who loses to The Wanderer (Pyromancer already grants "[+1]: Add {R}"; "−2: fights" is dead; his only edge is one more type on the battlefield). Ashiok and Mu Yanling fail the same test. Fixed point reached.

Final change list vs the confirmed deck (8b72591): 1. Ral Zarek → Rewrite Regrets; 2. Tezzeret, Master of the Bridge → Jared Carthalion; 3. Nissa, Steward of Elements → Arcane Amphisbaena; 4. Kiora of Salt and Sand → Protege's Awakening; 5. Chandra, Awakened Inferno → Chandra, Fire Artisan. 22 walkers, 35 lands, all locks intact. Gate (`/tmp/tam-fable-v3.txt`): PASS size/singleton/legality/identity/ownership/curve 3.45/wincons 11; WARN lands 35 (locked); FAIL plan (known).
