# Imotekh the Stormlord — audit report (2026-09-28)

## 1. Plan
Imotekh: "Whenever one or more artifact cards leave your graveyard, create two 2/2 black Necron
Warrior artifact creature tokens" + a combat pump for another artifact creature. The deck fuels
that trigger with sacrifice/mill/reanimation (Illuminor Szeras, Ashnod's Altar, Buried Alive,
Dread Return, Archenemy's Charm) so artifact creatures keep cycling out of the graveyard for free
tokens, then closes with Portal to Phyrexia / Their Number Is Legion / Marionette Master drain or
a wide, Imotekh-pumped attack. HISTORY v2→v3 already cut the deck's dead weight once
(Traxos, Steel Overseer, Necron Monolith, etc.) — this audit does not re-propose any of those.

## 2. Health

| Category | Current | Proposed | Note |
|---|---|---|---|
| Lands | 35 | 35 | unchanged; gate WARNs `39 ±2` (see §5) |
| Ramp (rocks) | 5 | 5 | Arcane Signet/Sol Ring/Thought Vessel/Gilded Lotus/Solemn — unchanged |
| Card draw | 8 | 7 | −Chronomancer/Ominous Harvest (marginal), +Night's Whisper (cleaner) |
| Spot removal | 6 | 8 | +Sheoldred's Edict, +Noxious Gearhulk (ETB removal) |
| Board wipes | 2 | 2 | Phyrexian Scriptures, Their Name Is Death — unchanged |
| Protection | ~0 | ~0 | still a real gap; pool had nothing worth the slot (see Coverage) |
| Win conditions (gate count) | 15 | 17 | +Puppeteer Clique, +Noxious Gearhulk bodies |
| Avg MV (nonland) | 3.41 | 3.53 | small rise — traded filler for real bodies |
| Game changers | 0 | 0 | none in deck or open pool for this identity |

## 3. Swaps (ranked by impact)

| # | IN | OUT | Why IN | Why OUT is weaker |
|---|---|---|---|---|
| 1 | Necrotic Ooze | Flayed One | "it has all activated abilities of all creature cards in all graveyards" — turns Illuminor Szeras' sac-for-mana, Cryptek's ~~(cut too)~~ and Marionette Master's drain into a reusable toolbox body | Flayed One is a vanilla 2/1ish lifelinker whose only text is "mill three cards" on ETB — no other payoff |
| 2 | Noxious Gearhulk | Canoptek Wraith | Artifact creature (feeds the graveyard-leaves trigger when it dies/recurs); "you may destroy another target creature. If a creature is destroyed this way, you gain life equal to its toughness" is removal stapled to a body | Canoptek Wraith's unblockable clause and 3-mana sac-for-2-basics ability are situational and do nothing for the artifact plan |
| 3 | Sheoldred's Edict | Imp's Mischief | Unconditional "each opponent sacrifices a nontoken creature... or planeswalker" — the deck had zero edict-style answers to hexproof/protection threats | Imp's Mischief only redirects a single-target spell and costs life; narrowest card in the removal suite |
| 4 | Skorpekh Destroyer | Razorlash Transmogrant | Necron artifact creature, deathtouch, "gains first strike" whenever any artifact you control enters — triggers constantly off the deck's own token/rock stream | Razorlash can't block and its unearth costs {4}{B}{B}, the most expensive recursion line in the deck for a 2-power body |
| 5 | Dread Presence | Cryptek | "Whenever a Swamp you control enters, choose one — draw a card and lose 1 life, or deal 2 damage and gain 2 life" — a free repeatable value engine off the deck's own 32 Swamps, no setup cost | Cryptek only saves one artifact creature from dying once per turn — a narrow, situational ability with no other text |
| 6 | Puppeteer Clique | Lychguard | Flying, "put target creature card from an opponent's graveyard onto the battlefield under your control... Persist" — repeatable tempo/value that also recurs itself | Lychguard's sac ability only returns *legendary creatures*, needs {3}{B} extra, and does nothing if no legendary is in the yard |
| 7 | Sautekh Immortal | Chronomancer | Flash Necron artifact creature that "enters with a +1/+1 counter for each creature that died this turn" — this deck sacrifices constantly (Szeras/Altar/Deadly Dispute), so it usually lands as a 3/3+ surprise blocker | Chronomancer's sac-artifact-for-a-card is fine but its body and unearth cost are both worse than Sautekh Immortal for the same slot |
| 8 | Night's Whisper | Ominous Harvest | "You draw two cards and lose 2 life" for {1}{B} — the cleanest, cheapest card draw available; no condition to set up | Ominous Harvest's Gravestorm usually copies zero or once early, making it a below-rate "draw a card, lose 1" most games |

Net: 8 in / 8 out, 100 cards held. 0 game changers before and after (none available in this
colour identity's open pool).

## 4. Coverage (mandatory safety net)
Every open-pool card meeting EDHREC rank ≤ 3000, price ≥ $4, game changer, or a commander-referencing
planeswalker/legendary (98 cards). Cards the operator already rejected in HISTORY v3 are marked
as such rather than re-argued.

- Path of Ancestry — REJECT: mono-B needs no fixing; ETB-tapped is a downgrade vs a Swamp.
- Rogue's Passage — REJECT: no evasion plan to enable; a colorless land buys nothing here.
- Evolving Wilds — REJECT: mono-B needs no fixing; ETB-tapped downgrade.
- Terramorphic Expanse ×2 — REJECT: same as Evolving Wilds.
- Commander's Sphere ×2 — REJECT: operator cut this in v3 (HISTORY).
- Temple of the False God — REJECT: operator cut this in v3.
- Wayfarer's Bauble — already in the proposed deck (kept, not a new add — it fetches a land, doesn't touch the artifact-leaves-graveyard trigger, but ramp was already thin on redundancy so it stays as-is).
- Night's Whisper ×2 — ADD (1 copy, swap #8).
- Ornithopter of Paradise — REJECT: operator cut this in v3.
- Mirkwood Bats — REJECT: second copy; one is already sleeved in this deck.
- Sign in Blood — REJECT: strictly worse Night's Whisper (costs {B}{B} vs {1}{B}) once that's added.
- Sword of the Animist — REJECT: no attack-race plan; land-drop payoff is off-plan for a sac/token shell.
- Everflowing Chalice — REJECT: ramp glut (5 rocks already), scales poorly without heavy kicking.
- Infernal Grasp — REJECT: removal suite is already at 8 after swap #3; no upside over what's in.
- Diabolic Tutor — REJECT: operator cut this in v3.
- Vito, Thorn of the Dusk Rose — REJECT: "Whenever you gain life, target opponent loses that much life" needs a lifegain subtheme this deck doesn't run.
- Rise of the Dark Realms — REJECT: a 9-mana do-nothing-until-then finisher; Portal to Phyrexia and Their Number Is Legion already own the top end — a third 9-drop bloats the curve.
- Burnished Hart — REJECT: ramp glut, weaker fetch than what's already excluded.
- Sanguine Bond — REJECT: drain-on-lifegain combo piece with no partner (no Exquisite Blood owned); dead alone.
- Nesting Grounds — REJECT: deck runs almost no +1/+1 counters to move.
- Bender's Waterskin — REJECT: ramp glut, slow.
- Worn Powerstone — REJECT: ramp glut, ETB tapped.
- Corrupted Conviction ×3 — REJECT: needs a sac outlet payoff beyond itself; Deadly Dispute/Szeras already do this better.
- Boggart Trawler // Boggart Bog — REJECT: off-plan graveyard hate, weak body.
- Opal Palace — REJECT: marginal commander-tax mitigation, no better than a Swamp here.
- Charcoal Diamond — REJECT: ramp glut, ETB tapped.
- Riveteers Overlook ×2 — REJECT: one-shot fetch, weaker long-term than keeping a Swamp.
- Palladium Myr — REJECT: operator cut this in v3.
- Steel Overseer — REJECT: operator cut this in v3.
- Murder — REJECT: removal suite already at 8; no upside.
- Alhammarret's Archive — REJECT: doubling effect with no lifegain/draw subtheme to double.
- Loxodon Warhammer — REJECT: no evasive creature to carry it profitably.
- Noxious Gearhulk — ADD (swap #2).
- Syphon Mind — REJECT: symmetric discard/draw, weaker than the draw already in the 100.
- Witch's Clinic — REJECT: narrow lifelink-on-commander utility; price doesn't translate to power here.
- Mishra's Bauble — REJECT: cantrip only; goes to graveyard and stays there, no trigger.
- Well of Lost Dreams — REJECT: no lifegain subtheme to convert into draw.
- Twilight Prophet — REJECT: Ascend/lifegain payoff is off-plan and slow.
- Sheoldred's Edict — ADD (swap #3).
- Plumb the Forbidden — REJECT: weak looter; sac fodder is better spent on Szeras/Ashnod's Altar.
- Peer into the Abyss — REJECT: symmetric draw at huge life cost, too risky for a grindy shell.
- Maestros Theater — REJECT: one-shot fetch, weaker long-term than a Swamp.
- Archfiend of Ifnir — REJECT: "cycle or discard" payoff the deck doesn't generate.
- Undying Malice ×2 — REJECT: operator cut this in v3.
- Umbral Collar Zealot — REJECT: already own a copy in the deck (kept, not the one being cut — see swap table); second copy redundant.
- Persist — REJECT: nonlegendary-only recursion with a -1/-1 counter, weak without a reliable big target.
- Pristine Talisman — REJECT: ramp glut, marginal lifegain.
- Butcher of Malakir — REJECT: 7-mana edict-on-death is too slow next to the existing top end.
- Rankle, Master of Pranks — REJECT: strong but generic value with no artifact/Necron synergy; no room without cutting a better-aligned card.
- Grave Titan — REJECT: assigned to Meren (shared open pool, orchestrator resolved the conflict — Meren gets the single owned copy).
- Contagion Clasp — REJECT: proliferate has almost no counters to grow in this deck.
- Muraganda Raceway — REJECT: operator cut this in v3.
- Elixir of Immortality — REJECT: shuffles the graveyard back into the library — actively undoes the recursion plan.
- Dreadhorde Invasion — REJECT: slow amass engine, off-Necron-plan.
- Arid Archway — REJECT: bounces a land, ETB tapped — net mana loss.
- Lavaspur Boots — REJECT: no evasive payoff, low-value equipment.
- Radiant Fountain — REJECT: 2 life is marginal; ETB tapped land no better than a Swamp.
- Kozilek, the Great Distortion — REJECT: MV10 colorless needs heavier colorless support than a mono-Swamp base reliably gives alongside {B} costs.
- Murderous Rider // Swift End — REJECT: removal suite already at 8; no upside.
- Massacre Girl, Known Killer — REJECT: a wrath that also kills the deck's own token army; redundant with the two wipes already chosen to spare artifacts.
- Painful Truths — REJECT: Converge needs multiple colors; mono-B draws X=1, strictly worse than Night's Whisper.
- Vampire Nighthawk — REJECT: solid generic beater, no artifact/graveyard synergy, no room.
- Nyx Lotus — REJECT: devotion payoff is weak — few colored pips stick around in an artifact-heavy shell.
- Vengeful Bloodwitch — REJECT: minor death trigger, outclassed by Mirkwood Bats/Psychomancer already in.
- Adaptive Automaton — REJECT: Necrons are a plurality, not a majority, of the deck — no tribal critical mass.
- Supernatural Stamina — REJECT: one-shot protection, too narrow for the slot.
- Tree of Perdition — REJECT: defender wall, no offense, off-plan.
- Black Sun's Zenith — REJECT: symmetric wipe also kills the deck's own token army.
- Varragoth, Bloodsky Sire — REJECT: Boast tutor is redundant with Insatiable Avarice/Wishclaw Talisman already in.
- Bitterthorn, Nissa's Animus — REJECT: land-fetch equipment; attaches to its own Germ token, not a real artifact-recursion loop.
- Venser's Journal — REJECT: lifegain payoff needs a big held hand; this deck empties its hand fast onto cheap artifacts.
- Conduit Pylons ×2 — REJECT: operator cut this in v3.
- Sangromancer — REJECT: lifegain-on-opponent-death trigger, off-plan, weak body.
- Gonti, Lord of Luxury — REJECT: good value, but no artifact/Necron synergy and no room.
- Cityscape Leveler — REJECT: another 8-drop competing with an already-full top end (Portal/Their Number/War in Heaven/Technomancer).
- Greed — REJECT: Phyrexian Arena already fills the repeatable-draw slot.
- Hidden Grotto — REJECT: same fixing-not-needed pattern as Conduit Pylons.
- Qarsi Revenant — REJECT: fine evasive lifelinker, but off-Necron-plan, no room.
- Nether Traitor — REJECT: needs another creature to die first to return itself; weak stand-alone 2/2.
- Forsaken Miner ×2 — REJECT: needs "commit a crime" triggers the deck doesn't build around.
- Consuming Corruption ×2 — REJECT: removal suite already at 8; no upside.
- Witch of the Moors — REJECT: lifegain-conditional edict; the enabler (lifegain subtheme) isn't here.
- Dread Presence — ADD (swap #5, replaces the Grave Titan slot after Meren claimed that copy).
- Puppeteer Clique — ADD (swap #6).
- Blood Pet ×3 — REJECT: mana-dork sac fodder is fine, but the deck's sac outlets already have enough fodder from its own tokens.
- Archfiend of Despair — REJECT: needs sustained life-loss the deck doesn't consistently generate; 8 mana is too slow next to the existing top end.
- Metamorphosis Fanatic — REJECT: the deck already has 6+ reanimation angles (Dread Return/Reanimate/Archenemy's Charm/Their Number Is Legion/War in Heaven/Soul Stone); no room.
- Skirge Familiar — REJECT: weak flier, marginal mana sink.
- Mudflat Village — REJECT: narrow utility land, no payoff here.
- Necroskitter — REJECT: wither/-1/-1-counter payoff the deck doesn't run.
- Torpor Orb — REJECT: turns off the deck's own ETB engine (Solemn Simulacrum, Necron Deathmark, Noxious Gearhulk) — actively anti-synergistic.
- Planetarium of Wan Shi Tong — REJECT: operator cut this in v3.
- Lost Jitte — REJECT: needs creatures that survive combat repeatedly; this deck's creatures trade or get sacrificed, not stick around.
- Necrotic Ooze — ADD (swap #1).
- Stensian Sanguinist // Exsanguinate — REJECT: attack-trigger value wants an aggressive deck; this is a grindy sac/control shell.
- Shard of the Nightbringer — REJECT: operator cut this in v3.
- Pact Weapon — REJECT: equipment needs a creature that survives combat; this deck's threats are mostly sac fodder.
- The Echoverse Fulcrum — REJECT: a one-shot wrath-in-an-artifact that kills the deck's own token board, same problem as the other symmetric wipes.

## 5. Gate
```
totals    : 100 cards | 35 lands (35 eff.) | 64 nonland | avg MV 3.53
curve     : 1:7 2:16 3:9 4:17 5:7 6:5 7:3
VERDICT   : FAIL

  PASS  size        100 cards (commander wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in commander
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside B
  PASS  ownership   all cards owned; paper collection imported 0 days ago
  PASS  arenaNames  every line uses a name Arena accepts
  WARN  lands       35 lands (+0 MDFC land backs = 35 effective); Karsten wants 39 ±2
  FAIL  plan        3/64 nonland cards interact (5%) — commander wants: creates tokens
  PASS  curve       avg MV 3.53; commander sets no cost threshold
  PASS  wincons     17 win condition(s)/closer(s)
  PASS  locks       0 locked card(s) present and intact
```
**Land WARN justification:** pre-existing on the current (unmodified) list too — ran the baseline
list through the same gate and got the identical `35 lands ... wants 39 ±2` WARN. This deck also
carries 5 mana rocks (Arcane Signet/Sol Ring/Thought Vessel/Gilded Lotus/Solemn Simulacrum) on top
of the 35 lands, effectively ~40 mana sources, and the curve tops out politely (avg MV 3.56, only
9 cards at MV 6+). Not touched by this audit; flagging rather than "fixing" by cutting a land,
since the operator would need to decide which spell(s) to cut for +4 lands.

**Plan FAIL is pre-existing and unchanged in kind:** the current, unmodified 100-card list gates
at the identical `3/64 (5%)` — the checker only recognizes 3 cards deck-wide as "creates tokens"
(Biotransference, Deadly Dispute, Marionette Apprentice) despite the deck running several more
literal token-makers (Their Number Is Legion, Royal Warden, Ghost Ark, Imotekh itself) that its
oracle-text matcher doesn't catch. This audit's swaps hold that ratio exactly — Noxious Gearhulk and Dread Presence both add real
value but weren't picked up by the same heuristic either.
Per the brief, a `plan` FAIL that the gate has no accurate signal for is acceptable; every other
line is PASS except the pre-existing lands WARN above.

## 6. Reality Fracture pass
Baseline per REFUTE.md §4: current plan is the 5 KEEP swaps (Necrotic Ooze, Noxious Gearhulk,
Dread Presence, Puppeteer Clique, Night's Whisper in; Flayed One, Canoptek Wraith, Cryptek,
Lychguard, Ominous Harvest out). Razorlash Transmogrant, Chronomancer, and Imp's Mischief stay.

- **Eye of Jace** — REJECT: "sacrifice this artifact" puts the card *into* the graveyard, not out
  of it — no Imotekh trigger, and the payoff (2 damage/2 life) is gated behind 7+ cards in the
  graveyard. Umbral Collar Zealot's sac-for-surveil is still the better graveyard-feeding 1-drop
  in that slot (its sacrificed artifact sets up an actual future leave-the-graveyard trigger via
  Chronomancer/Razorlash/Technomancer).
- **Keeper of the Quiet Hour** — REJECT: "empower Jace 2" builds a Jace planeswalker token — pure
  superfriends value with zero artifact-recursion or Necron text; a vanilla 3-mana artifact-creature
  body with no attached payoff doesn't beat anything currently in the 100.
- **Murmuring Volume** — REJECT: "{T}: Add one mana of any color" is fixing this mono-B deck (32
  Swamp, no other colors) doesn't need; the deck already runs 6 mana rocks plus Wayfarer's Bauble.
  The loot mode is real but not enough alone to unseat a kept card.
- **Solve for Disappointment** — REJECT: "reveal their hand… discards that card" is proactive
  disruption, a category the deck doesn't run and doesn't need to start now — removal is already
  at 8 spells and 2 wipes. "Empower Jace 1" is dead text with no other superfriends piece in the
  100.
- **Teyo, Diamondblade Mage** — REJECT: "target permanent you control gains deathtouch" is a
  one-shot combat trick, not protection — it doesn't stop removal or targeting, and Teyo isn't an
  artifact, so it doesn't feed the graveyard-leaves trigger either. No slot it clearly outclasses.

No adds from this pass.
