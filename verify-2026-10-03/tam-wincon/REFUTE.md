# REFUTE: Sisay list C = `final-sisay.txt` (fresh-context Opus refuter, 2026-10-03, rev 2)

**Verdict: NOT CONVERGED.**
- The loop works.
- The primary/backup call (Jace lock first, loop second) **holds**, but its .55–.59 margin is a goldfish number. When loyalty does not carry between turns, both lines sit near .2 by T9.
- One new cut is wrong: **Flux Channeler → Oath of Ajani**. The sim cannot see proliferate creatures at all.
- **Jared Carthalion** is still unverdicted.

Scope: `final-sisay.txt` (C) and `sisay-owned.txt` (A, unchanged). `sisay-buys.txt` is superseded. Re-run under build-report §8 (15:02).

## 1. Loop (backup in C): ✅ WORKS. It is a deterministic table kill when the pieces are on board
| Step | Check | Source |
|---|---|---|
| Timing | Every Teferi activation needs your main phase and an empty stack, so opponents get priority at each step | CR 606.3; Veil ruling 2014-07-18 "it must be your main phase and the stack must be empty" |
| Repeat | "Each additional time The Chain Veil's last ability resolves will allow you to activate a loyalty ability of each planeswalker … an additional time" | Veil ruling 2014-07-18 |
| Late walkers | The Veil also covers "planeswalkers that come under your control later in the turn" | Veil ruling 2014-07-18 |
| Untap | Teferi "−1: Untap up to four target permanents" = Veil + 3 mana permanents. Timeless Lotus "enters tapped" doesn't matter: Teferi untaps it | DB |
| Loyalty | Paradox "you gain 1 life" → Mentor "put a loyalty counter on each planeswalker" = net 0. Carth: "a cost of [-6] would become [-5]", so −1 becomes [0] | DB; Carth ruling 2021-06-18; CR 704.5i |
| Mana / loop | Lotus + 2 lands = 7 (+3) ✅. Sol Ring + Noble + Ignoble = 4 (0) ✅ (fixed in §8.1). **3 lands + Chandra "+1: Add {R}{R}" = 5 (+1)** or Pyromancer "[+1]: Add {R}" (0) is still missing from §8.1. No rock is needed | DB; CR 605.1a |
| Kill | Chandra "+1 … deals 2 damage to each opponent" ×20, or Warlord "[−4]: … 2 damage to target player", or Vraska −9 + Ichormoon "[0]: Proliferate", or unbounded Jace counters → JRS 0 → MA −7 ✅ | DB; CR 704.5b |

**Breaks:**
- Instant removal on Teferi in response to his first −1.
- Removal on the Veil before its second activation.
- Null Rod / Ouphe effects; Pithing Needle.
- Stifle on Sisay.
- Mentor or Paradox removed with no Carth (the loop becomes finite).
- A counter on a cast Teferi, unless Chimil is out.
- Walker attacks do **not** break it ✅.

## 2. `sisay-mc.py` audit
I ran a patched copy in `$TEMP` with 10k games and the same seed. The repo files are untouched.

| Config (final-sisay) | Loop T9 | Lock T9 | Either T9 |
|---|---|---|---|
| Builder, Veil-first | .19 | .42 | .44 |
| Builder, lock-first | .05 | **.59** | .59 |
| + loop fix (S2), lock-first | .18 | .57 | .59 |
| + loop fix, Veil-first | .22 | .41 | .45 |
| **No loyalty carried between turns** (attack proxy, S1), lock-first | .18 | **.22** | .29 |
| Same, Veil-first | .22 | .12 | .26 |

| # | Assumption | Effect | Sev |
|---|---|---|---|
| S1 | `acc` carries every turn's Mentor/Tam loyalty forward, and nothing attacks (goldfish). That is exactly the operator's failure mode | Lock T9 .59 → .22 when carry-over is removed (still optimistic: the Jace token keeps its empower counters). The loop doesn't change | ⚠️ HIGH for the *margin* |
| S2 | The loop is charged `+4` for the first Veil activation, but Teferi's first −1 already untapped 4 mana permanents. `LOOP_MANA` misses lands + Chandra/Pyromancer. There is no finisher check | Fixing all three moves Veil-first .19 → .22 and lock-first .05 → .18 (the errors roughly cancel) | ⚠️ MED |
| S3 | Tam's X = `acts` (walker count). The Jace token, JRS, MA, MuA and Theorist are **one** planeswalker type ("Jace"). Each Jace's own activation is also counted +1 for itself | Lock inflated | ⚠️ LOW-MED |
| S4 | Flux Channeler, Evolution Sage, Ichormoon, Gambit, Atomize and Vraska 0 are not modelled at all. Oath of Ajani's discount (`cost()`) and Aminatou's colours (`power()`) are | The sim **cannot price** −Sage −Channeler +Aminatou +Oath of Ajani | ❌ HIGH for the swaps |
| S5 | Colours are ignored (Sisay's WUBRG; Great Hall "Spend this mana only to cast legendary spells" can't pay her) | Both lines are inflated equally | ❓ stated |

**Primary/backup call: ✅ KEEP.**
- Lock-first is at least as good as Veil-first in both regimes (either .59 vs .45 goldfish; .29 vs .26 attacked).
- §8.1 should say the .55–.59 assumes no attacks, and that against the operator's failure mode the loop is the equal line (.18 vs .22).
- The lock wins on the opponents' second draw (one turn cycle of exposure) unless MA −7 lands the same turn. The loop kills immediately.

## 3. Errors in §8
| # | Claim | Finding | Sev |
|---|---|---|---|
| E1 | §8.4 Oath of Ajani −**Flux Channeler** | Channeler: "Whenever you cast a noncreature spell, proliferate", ×2 with Tekuthal, on about 45 noncreature spells. That is +1/+2 on every Jace and walker per spell: the lock's counter engine **and** loyalty out of attack range. Oath of Ajani: "Planeswalker spells you cast cost {1} less", plus G W at MV 2, both already plentiful (G 10, W 11). Builder's density: Oath of Ajani 1 link, the joint lowest; median 18.5 → 17.5 | ❌ HIGH |
| E2 | §8 sweep of multicolour legendaries | **Jared Carthalion** (free, "{W}{U}{B}{R}{G}" walker, MV 5) still has no verdict. **Breya** (free, WUBR, MV 4) still has no verdict | ❌ MED |
| E3 | §8.1 "lock .55–.59 by T9" as the reason for primary | Goldfish only (S1). The call survives, the margin doesn't | ⚠️ |
| E4 | §8.1 loop mana | The 3 lands + Chandra RR route is missing (S2) | ⚠️ LOW |

**Re-run, all match ✅:**
- Builder's MC (.19 / .42; lock-first .59).
- Gate: size/singleton/legality/rules/identity PASS. Ownership FAIL is the 10 buys + Noble. Lands WARN 34 vs Karsten 39; plan FAIL (known); arenaNames WARN Esika; avg MV 3.32.
- Legendary permanents: 36, W11 U14 **B7** R6 G10.
- §8.2 chains: Liliana → Oath of Ajani → Aminatou = power 6; + Jace MuA = 7. Mentor + Paradox → Aminatou = 6.
- §8.1 quotes, and Sol Ring + Noble + Ignoble = 4.
- Wanderer's reason now correct: Tomik gives every walker "No more than one creature can attack this planeswalker".

## 4. New cuts / swaps in `final-sisay.txt` (vs final.txt)
| Out → In | Verdict | Quote / reason |
|---|---|---|
| Tam → **Sisay**; Fatehold Charm → Tam | ✅ | "Search your library for a legendary permanent card … onto the battlefield" (uncounterable, repeatable) |
| Talisman of Conviction / Progress → Noble / Ignoble | ✅ | "{G}, {W}, or {U}" + "{B}, {R}, or {G}" = WUBRG; 1-drop; Teferi untap targets |
| Archangel → Oath of Kaya | ✅ near-tie | W B at MV 3 (**B at power 4**); "you gain 2 life" feeds Mentor; Archangel's tax deters harder |
| Kasmina → Vronos | ✅ | "+1: Up to two other target planeswalkers … phase out" |
| Saheeli → The Theorist | ✅ | "At the beginning of each opponent's draw step, you draw a card" |
| Windfall → Chain Veil; Expansion Algorithm → Teferi | ✅ | Loop core |
| Rewrite Regrets → Ichormoon | ✅ | "[0]: Proliferate" on every walker. Not legendary; C has no walker recursion |
| Ajani Resolute → Carth | ✅ | B G at MV 4; Teferi −1 at [0]. Carth turns Healer's [−2] into [−1], which loses Mind Sculptor's "removed two or more" draw |
| **Evolution Sage → Aminatou** | ✅ near-tie | Aminatou "−1: Exile another target permanent you own, then return it" re-empowers a Way (5–7 on the token) each turn, refunded by Mentor, and adds W U B. Sage: "Landfall — … proliferate" (+1/+2 per land) |
| **Flux Channeler → Oath of Ajani** | ❌ REJECT | E1. Keep Channeler |

Inspirit moves (unchanged):
- Tekuthal → Clasp ✅. Tekuthal speeds Lux Artillery's "thirty or more counters"; Lux stays.
- Ripples → Augury ✅ ⚠️: Inspirit loses its instant phase-out.

A (`sisay-owned.txt`): unchanged from rev 1. All swaps ✅; Kasmina is the weakest addition (Jared beats it, §6).

## 5. Buy verdicts (§8.3: IN 10 / BENCH 6 / SKIP 22)
| Card | Builder | Verdict | DB quote / reason |
|---|---|---|---|
| Sisay, Chain Veil, Teferi TA, Carth, Ichormoon, Theorist, Oath of Kaya, Vronos | IN | ✅ | §1/§4 |
| Aminatou | IN | ✅ | §4 |
| **Oath of Ajani** | IN | ❌ → BENCH | Its slot is Flux Channeler (E1). **Saves a buy** |
| Oath of Teferi | BENCH | ✅ | "twice each turn": an accelerant, no loop |
| Jace's Machinations | BENCH | ✅ | "Empower Jace 8" |
| Commodore Guff | BENCH | ✅ | "−3: You draw X cards and … X damage to each opponent". Kaito keeps the B |
| Semester's End | BENCH | ✅ | Ripples / Settle cover it |
| Vraska, Soul of Stone | BENCH | ✅ | "Sculpture Treasure" = fixing + blockers. The pool tags it IF-OWNED FRA: check the box first |
| Tamiyo FR | BENCH | ✅ | "−2: Tap up to two target nonland permanents" |
| Eternal Wanderer | SKIP | ✅ | Its attack limit is self-only; Tomik covers every walker |
| Wrenn and Realmbreaker | SKIP | ✅ ⚠️ | "Lands you control have '{T}: Add one mana of any color'" = Guide, but it survives wipes. First fixing buy if WUBRG stalls |
| Oath of Nissa / Gideon / Chandra, Gideon's Memorial, Brokers | SKIP | ✅ | Memorial "Spend this mana only to cast a planeswalker spell"; Brokers isn't legendary |
| Rowan's Talent, Garruk VB, Garruk CB, Chandra CoC, Primevals' Rebirth | SKIP | ✅ | "Enchant planeswalker"; Rebirth is a Legendary Sorcery, MV 7 |
| Nicol Bolas, Narset | SKIP | ✅ | "doesn't control a legendary creature or planeswalker"; "can't draw more than one card" blanks MA −7 |
| Urza Assembles, Replicating Ring, Return to the Light Realms | SKIP | ✅ | Not legendary; {7}{W}{W} |
| Future Flight, Reckless Charge, Slip Out the Back, Wizard's Staff, Spider-Verse | SKIP | ✅ | Creature-only; Spider-Verse `commander: not_legal` |

## 6. Missed swaps (ranked, vs `final-sisay.txt`)
| # | In | Out | Why (DB) |
|---|---|---|---|
| 1 | **Flux Channeler** (owned) | Oath of Ajani [buy] | E1. On the turn I win it puts +1/+2 on every Jace per noncreature spell. Oath of Ajani saves {1} |
| 2 | **Jared Carthalion** (free) | Ajani Unrelenting (lean; near-tie) | {W}{U}{B}{R}{G}, MV 5: Sisay power 6 → 7 (Teferi) in one fetch, a step earlier than Ajani U (MV 6, power 7). "+1: Create a 3/3 Kavu … trample that's all colors" = a blocker each turn, and with it Bloom Tender/Faeburrow tap WUBRG. Lost: Ajani U's Cadet per activation |
| 3 | Breya (free) | none now | {W}{U}{B}{R}, MV 4: only matters for the backup's power 7. Near-tie vs Kaito ("+1: Up to one target creature can't attack or block"); Kaito holds |
| 4 | Sanctum Lurker [IF-OWNED] | Vraska BS or Ajani U | "Planeswalkers you control aren't put into their owners' graveyards for having 0 loyalty" directly fixes the failure mode |

**Per-role stop:**
- Tutors: Demonic Tutor is Meren's (lock).
- Ramp: Farseek / Nature's Lore / Three Visits are near-ties with the Talisman of Dominance.
- Removal, wipes and Ways hold.
- Colour batteries: Sefris (WUB, no text that helps) and Domri Anarch (RG) stay out.

## 7. Operator decisions open
- **Apply #1/#2:** both owned/free. It drops the Oath of Ajani buy (9 buys).
- **Buys:** confirm the 9.
- **IF-OWNED:** Vraska SoS, Sanctum Lurker, Jace's Machinations, Theorist (+ Sanctum, Proxy).
- **Inspirit:** Ripples → Augury costs Inspirit its phase-out; needs the operator's yes.
- **Pilot rule** for the guide: tutor lock-first. Switch to the loop once the Jaces are attacked below reach (§2: from that point the two lines are equal).
- Register Noble Hierarch on apply.
