# Esika, God of the Tree — Arena Historic Brawl superfriends (the deck Arena still calls "Tam Superfriends v2")

Pilot guide for `Esika Superfriends v6` (`decks/arena/esika-superfriends-v6.txt`), rebuilt 2026-10-08 from the operator's in-Arena v5 after 14 games at 4-9 (land drop T5 67 %, T6 58 %; commander never cast in 6 games; colour-screwed 33 %; walkers stuck in hand). Lab: `verify-2026-10-08/best-deck/esika/` (climb-1 = the model's pass, build-v6.py = the judgment list, variants-*.score.json = the slot tests).

## 1. Plan

**One plan: resolve Esika on turn 3, land one Way per turn from turn 3, and let every planeswalker activate twice with Oath of Teferi while All Will Be One, Way of the Warlord and the Cadet/Beast tokens convert loyalty into damage.** Esika is a mana engine, not a threat: "Vigilance / {T}: Add one mana of any color. / Other legendary creatures you control have vigilance and '{T}: Add one mana of any color.'" Cast the front face; The Prismatic Bridge (back face, {W}{U}{B}{R}{G}) is a turn-6+ luxury that puts "a creature or planeswalker card" onto the battlefield every upkeep.

Backup: a wide board of Cadets, Beasts, Servos, Otters and Boo — the Ways and Ajani Unrelenting make a token per activation, Doubling Season doubles them.

```
T1 dork / Talisman  =>  T2 Talisman / Farseek / Wood Elves  =>  T3 Esika (GG) or Tam  =>  T4 Way + 3-drop walker  =>  T5 Oath / Doubling Season / All Will Be One  =>  T6+ two activations per walker per turn
```

## 2. Engine map

| # | Card | Oracle (verbatim) | Role in the loop |
|---|---|---|---|
| 1 | [[Way of the Mentor]] | "Whenever you gain life, put a loyalty counter on each planeswalker you control." | The engine's heart: every life-gain event is +1 on every walker. |
| 2 | [[Way of the Paradox]] | "Whenever you activate a loyalty ability, you gain 1 life. You may play an additional land this turn." | With Mentor out, every activation refunds 1 loyalty to every walker, so a −2 nets −1 and every other walker gains +1. Also a second land drop each turn. |
| 3 | [[Oath of Teferi]] | "You may activate the loyalty abilities of planeswalkers you control twice each turn rather than only once." | Doubles everything below. |
| 4 | [[Doubling Season]] | "If an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead." (and tokens) | +1 becomes +2, Mentor's counter becomes 2, a Way's empower 5 becomes 10, Cadets come in pairs. ⚠️ Does not double a −X cost. |
| 5 | [[Tam, the Possibility]] | "Planeswalker spells you cast cost {1} less to cast. / {W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is the number of planeswalker types among planeswalkers you control." | Discount on 17 walkers; late game a five-colour proliferate bomb (Tekuthal doubles each). Esika gives Tam "{T}: Add one mana of any color" too. |
| 6 | [[Tekuthal, Inquiry Dominus]] | "If you would proliferate, proliferate twice instead." | Doubles Tam, Flux Channeler, Evolution Sage. |
| 7 | [[Flux Channeler]] / [[Evolution Sage]] | "Whenever you cast a noncreature spell, proliferate." / "Landfall — Whenever a land you control enters, proliferate." | Every Way, walker, Talisman or fetch = +1 on every walker (and on Innkeeper's Talent's targets). Paradox's extra land is a second Sage trigger. |
| 8 | [[All Will Be One]] | "Whenever you put one or more counters on a permanent or player, this enchantment deals that much damage to target opponent, creature an opponent controls, or planeswalker an opponent controls." | Every +1, every proliferate, every Mentor trigger is damage. One activation under Oath + Doubling Season + Mentor hits for 6–10. |
| 9 | [[Way of the Warlord]] | 'Planeswalkers you control have "[−4]: This planeswalker deals 2 damage to up to one target creature or planeswalker and 2 damage to target player."' | The direct close: each walker with 4+ loyalty is 2 to the face, twice with Oath. |
| 10 | [[Way of the Healer]] / [[Way of the Wildspeaker]] | 'Planeswalkers you control have "[−2]: Create a 2/2 colorless Wizard Soldier creature token named Cadet. Surveil 1."' / '"[−4]: Create a 4/4 green Beast creature token with trample."' | Every walker is a token maker; Doubling Season makes two. Each token death is a loyalty counter for every walker ([[Way of the Necromancer]]). |
| 11 | [[Way of the Pyromancer]] / [[Way of the Mind Sculptor]] | 'Planeswalkers you control have "[+1]: Add {R}."' / "Whenever you activate a loyalty ability, if you removed two or more loyalty counters to activate it, draw a card." | Pyromancer: every walker is a mana rock that grows (Paradox life → Mentor loyalty). Mind Sculptor: every −2 or deeper draws. |
| 12 | [[Sanctum Lurker]] | "Planeswalkers you control aren't put into their owners' graveyards for having 0 loyalty. / Planeswalkers you control have '[+2]: This planeswalker deals 1 damage to each opponent and you gain 1 life.'" | Walkers can go to 0 and live; the +2 ping gains life = Mentor trigger + Ajani Resolute trigger. |
| 13 | [[Ajani Resolute]] / [[Ajani Unrelenting]] | "Whenever you gain life, put a loyalty counter on Ajani. / 0: You gain 1 life." / "Whenever you activate a loyalty ability, create a 2/2 colorless Wizard Soldier creature token named Cadet." | Resolute's 0 is a free Mentor trigger (every walker +1) and feeds itself. Unrelenting turns every activation into a Cadet (two with Doubling Season). |
| 14 | [[Innkeeper's Talent]] | level 2 "Permanents you control with counters on them have ward {1}", level 3 "If you would put one or more counters on a permanent or player, put twice that many of those counters on it instead." | A second Doubling Season for counters, and ward on every walker. Level up when nothing better to do with {3}{G}. |
| 15 | [[Captain Sisay]] / [[Pia, Aether Ascetic]] / [[Enlightened Tutor]] | Sisay "{T}: Search your library for a legendary card"; Pia "search your library for an enchantment card"; Tutor "an artifact or enchantment card … on top". | Sisay finds any Way, Oath, Tam, Tekuthal or a legendary walker; Pia and Tutor find Doubling Season, Oath, All Will Be One or a Way. |

## 3. Mana (37 lands + Shatterskull + 14 ramp)

| Group | Cards | Note |
|---|---|---|
| Any-colour accelerants | [[Bloom Tender]], [[Ilysian Caryatid]], [[Paradise Druid]], [[Arcane Signet]], [[Mox Amber]], [[Chromatic Lantern]], [[Timeless Lotus]], [[Jegantha, the Wellspring]], [[Enduring Vitality]] | Esika makes legendary creatures (Tam, Liliana, Vraska, Sisay, Pia, Tekuthal, Jegantha) tap for any colour too. Enduring Vitality makes every Cadet, Servo, Otter and Boo a mana dork. Jegantha's mana "can't be spent to pay generic mana costs" — it is for the Bridge and pips. |
| Land ramp | [[Farseek]] ("Plains, Island, Swamp, or Mountain card" — fetches any non-Forest shock), [[Wood Elves]] ("Forest card" — Breeding Pool, Overgrown Tomb, Stomping Ground or Temple Garden, untapped), [[Rampant Growth]] | Fetch the shock that completes WUBRG. |
| Walkers that ramp | [[Wrenn and Realmbreaker]] ('Lands you control have "{T}: Add one mana of any color."'), [[Kiora, Behemoth Beckoner]] ("−1: Untap target permanent" — Bloom Tender, Lotus, Lantern, a shock), [[Chandra, Torch of Defiance]] ("+1: Add {R}{R}"), Way of the Pyromancer on every walker | Kiora's −1 under Oath untaps Timeless Lotus twice = +10 mana. |
| Lands | 38 land cards (37 + the MDFC): 9 shocks, 3 fetches, 4 Verges, 6 slow lands, Hinterland Harbor, Woodland Cemetery, Yavimaya Coast, Command Tower, Multiversal Passage, Jetmir's Garden, Interplanar Beacon, Great Hall of the Citadel, Theorist's Sanctum, Urborg, Otawara, 4 basics (Island, Mountain, Plains, Forest), Shatterskull Smashing (MDFC) | Interplanar Beacon ("{1}, {T}: Add two mana of different colors. Spend this mana only to cast planeswalker spells") and Great Hall ("legendary spells") are walker-only ramp — never count them as a colour source for Counterspell. |

## 4. Turn plan

```
T1  Paradise Druid / Caryatid / Mox Amber (dead until a legend lands) / fetch for Breeding Pool
T2  Talisman, Farseek, Wood Elves, Sylvan Library, Way of the Necromancer / Pyromancer (a Jace token on T2)
T3  Esika (GG) — or Tam if GG is missing (GU). With a T1 dork: Esika + a 2-drop.
T4  Way of the Mentor + Way of the Paradox is the dream; otherwise Tekuthal / Flux Channeler / a 3-MV walker + Way
T5  Oath of Teferi or Doubling Season (Sisay / Pia / Tutor fetch the one you lack); start activating twice
T6+ All Will Be One, Way of the Warlord: every walker −4 ×2 for 8 face damage; proliferate with Tam when WUBRG is open
```

## 5. Keep / mulligan (London, 7 cards, bottom 1 per mulligan)

Keep needs: 3+ lands with G, and one of dork / Talisman / Farseek / Wood Elves, and a 3-drop (Esika is in the command zone — Tam, a Way or a walker).

| Hand | Verdict |
|---|---|
| 3 lands (one G) + Paradise Druid + Way of the Mentor + Narset + Oath | ✅ Keep — T1 dork, T3 Esika, T4 Way + walker, T5 Oath. |
| 4 lands + Farseek + Doubling Season + Ajani Unrelenting | ✅ Keep — Farseek fixes, Season on T4 with the dork chain. |
| 2 lands + Mox Amber + Talisman + Tam + Way of the Warlord + Kaito | ⚠️ Keep on the play only if a land is a G source (Tam T3 off Talisman). |
| 5 lands + Timeless Lotus + Ugin-type 6-drop | ❌ Mull — no action before T5. |
| 1 land + two dorks + three walkers | ❌ Mull — walkers stuck in hand is how v5 lost. |
| 3 lands, no G source, Wrenn + Esika plan | ❌ Mull — Esika needs {G}{G}; Farseek cannot find a Forest. Bottom the 6-drop. |

## 6. Misplays and traps

- ⚠️ **Esika first, Bridge later.** The Bridge needs all five colours; the front face needs {1}{G}{G}. Casting the Bridge on T5 with no board is the v5 "commander never cast" pattern.
- ⚠️ **Empower goes on a Jace token, not on Jace walkers.** "Put five loyalty counters on a Jace token you control. If you don't control one, first create a blue Jace planeswalker token" — the token has "[−1]: Surveil 1" and "[−3]: Draw a card" plus every Way's granted ability. It is your best Warlord gun: 20+ loyalty by T6.
- ⚠️ **Doubling Season does not reduce a −X cost**; it doubles counters put on, not removed. Innkeeper's Talent level 3 stacks with it (4× counters).
- ⚠️ **Oath's twice-per-turn is per planeswalker**, and the two activations can be different abilities (Resolute 0 then −4).
- ⚠️ **Sanctum Lurker keeps a 0-loyalty walker on the battlefield** — it still cannot activate with insufficient loyalty, but Mentor/Paradox and proliferate bring it back.
- ⚠️ **Mind Sculptor draws only on "two or more loyalty counters removed"** — a −1 does not draw, a −2 does.
- ⚠️ **Teyo gives *you* hexproof, Liliana the Faultless gives a walker hexproof** ("{1}, {T}, Discard a card: Another target creature or planeswalker you control gains hexproof until end of turn") — hold Liliana for the removal turn.
- ⚠️ **The Wanderer prevents noncombat damage to you and your permanents** — All Will Be One targets opponents' things only, so no conflict; but Lightning Helix on your own token is prevented.
- ⚠️ **Jegantha's mana cannot pay generic costs**; Interplanar Beacon's second ability only pays for planeswalker spells; Great Hall only for legendary spells. A hand of those three casts no Counterspell.
- ⚠️ **Mox Amber needs a legendary creature or planeswalker on the battlefield** — it is a T3+ card, not a T1 play.
- ⚠️ **Sunfall exiles your own Cadets, Servos and dorks** — cast it only behind a Heroic Intervention or when the board is theirs.

## 7. What changed from v5 (the operator's Arena list) and why

| Out (v5) | In (v6) | Why |
|---|---|---|
| Vraska, Betrayal's Sting (6), Kaya, Intangible Slayer (7, WWBB), Ugin, the Ineffable (6), The Eternal Wanderer (6, WW), Sarkhan the Masterless (5, RR), Garruk, Curse Breaker (5, GG), Garruk, Veiled Butcher (5, BB), Jace, Multiverse Architect (5, WUBR), Jace, Reality Sculptor (5, UU; "X is the number of Islands you control" with 1 Island) | Farseek, Wood Elves, Ilysian Caryatid, Paradise Druid, Talisman of Curiosity, Talisman of Unity, Enduring Vitality, Kiora, Behemoth Beckoner, Rampant Growth | The lab climb cut exactly these nine (the model's adds were Monuments and filler); nine double-pip 5–7-drops in a five-colour deck were the stuck hands. Replaced by nine any-colour or shock-fetching ramp pieces, one of them a walker. |
| Sheoldred, the Apocalypse (BB), Phyrexian Arena (BB) | Forest, Jetmir's Garden | Two BB cards with no engine role → two lands (36 → 38). |

Lab (300 games): v5 objective 61.6 / Deck Score 77 / commander on curve 35 % / 4 lands by T4 65 % / colour-screwed T3 17 % → v6 63.2 / 83.3 / 48 % / 73 % / 12 %. The model's own climb reaches 95.4 only by filling slots with Monuments, Talents and 2-drop creatures (`climb-1.ndjson`); the ramp window (12) and draw window (12, every walker counts as draw) cost v6 16 penalty points that are the deck's design, not a flaw. Slot tests (`variants-*.score.json`): Rampant Growth vs Nissa, Who Shakes the World vs Phyrexian Arena vs Explore and Jetmir's Garden vs Karn's Bastion vs Savai Triome are all within 0.3 — judgment picks: Rampant Growth (cheapest), Jetmir's Garden (G for Esika, cycles late). A second climb from v6 with the ramp and interaction locked (`climb-2.ndjson`) converged in one pass on six swaps — Bloom Tender, Arcane Signet, Chromatic Lantern, Timeless Lotus, Jegantha and Vraska, Soul of Stone for Push // Pull, Defibrillating Current, Kin-Tree Severance, Dragonclaw Strike, Meteor Golem and Glassworks — with the Deck Score flat at 83.3: the +16 is the ramp/removal window penalty only, so it was rejected (the operator asked for more mana, not less).

## 8. Maybeboard (owned on Arena)

| Card | Swap for | When |
|---|---|---|
| Nissa, Who Shakes the World | Rampant Growth | More Forests (Wood Elves fetches shocks that count) — a walker that ramps; lab −0.2. |
| Karn's Bastion | Jetmir's Garden | "{4}, {T}: Proliferate" ×2 with Tekuthal — once the manabase has 20+ G sources; lab −0.1. |
| Phyrexian Arena | Rampant Growth | Grindy opponents; needs BB. |
| The One Ring, Overlord of the Hauntwoods, Enduring Vitality's twin Nissa, Resurgent Animist | any ramp spell | Were in the 2026-10-02 converged list (v2/v3); the operator cut them in Arena. |
| Garruk, Curse Breaker / Garruk, Veiled Butcher / Vraska, Betrayal's Sting | Kiora / a Talisman | Only if the manabase proves stable (on-curve commander > 60 % in the game report). |
