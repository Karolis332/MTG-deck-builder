# Imotekh the Stormlord — Fable review (2026-09-28)

## 1. Verdict

The audited final 100 is better than the current deck: Noxious Gearhulk, Winter and Night's Whisper are clean upgrades, and
Wraith / Plasmancer / Ominous Harvest / Lychguard / Flayed One were the right cuts. Two of the six kept swaps are wrong in
kind: Cryptek is a once-per-turn Imotekh engine, not a "narrow saver", and Puppeteer Clique fights The Darkness Crystal and
Phyrexian Scriptures. Necrotic Ooze is a weak IN. Nobody in the chain named the deck's real closer (the Metalwork Colossus
loop, §2); every fix below keeps it intact and adds a draw engine the deck lacks.

## 2. Plan and function

- **Trigger:** Imotekh "Whenever one or more artifact cards leave your graveyard, create two 2/2 black Necron Warrior artifact
  creature tokens." Biotransference makes "creature cards you own that aren't on the battlefield" artifacts, so every
  reanimation, rebuy, unearth or Mortuary Mire is a trigger; Syr Konrad adds "a creature card leaves your graveyard… 1 damage
  to each opponent" on the same event.
- **Closer (unnamed by the audit):** Metalwork Colossus "costs {X} less… total mana value of noncreature artifacts you control |
  Sacrifice two artifacts: Return this card from your graveyard to your hand". Sol Ring 1 + Signet 2 + Vessel 2 + Altar 3 +
  Lotus 5 = 13 ≥ 11, so it is free. Cast it, sacrifice it to Ashnod's Altar ("Sacrifice a creature: Add {C}{C}") or Umbral
  Collar Zealot, sacrifice the two Warriors to return it, Imotekh makes two more, cast again. Per loop: +{C}{C}, Konrad 4 damage
  per opponent, Marionette Apprentice 3, Mirkwood Bats 4, Marionette Master (power 4 after Fabricate 3) 4 to one opponent.
  With Biotransference each cast adds a third Warrior ("Whenever you cast an artifact spell… create a 2/2"), so tokens go
  infinite too. Altar, Zealot, Colossus, Konrad, Apprentice, Bats, Master are therefore fixed slots.
- **Other lines:** Master + any outlet; Their Number Is Legion / Skorpekh Lord swing; Necron Overlord X; Portal to Phyrexia
  (Anrakyr casts it from hand for 9 life).
- **Mana:** 35 lands, 34 black sources; 5 rocks + Soul Stone, Crypt Ghast, Dark Ritual, Culling the Weak, Szeras, Altar. Six
  cards need {B}{B}{B}+ (Charm, Lokhust, Szarekh, Their Name Is Death, War in Heaven, Legion): fine on 34 sources. Avg MV 3.47,
  8 cards at MV 6+ with Colossus usually free. The gate's "39 ±2" WARN is pre-existing and offset by 13 ramp pieces.
- **Draw is the thin category:** repeatable draw is Arena, Ripples ({1} + 3 life), Decorum's Paradigm copy, Chronomancer
  (1/turn) and, in the final, Dread Presence. Everything else is a one-shot. Nothing converts the deck's constant sacrifices into
  cards; Smothering Abomination (miss 1) does.
- **Gate (read-only run):** audited final and the fixed list both give FAIL ownership (Winter, ASSUMED), WARN lands 35, FAIL plan
  3/64 — identical to the current deck's non-PASS lines. Final wincons 16, fixed list 17.

## 3. Health

| Category | Current | Final (audited) | With fixes (§7, 1–5) |
|---|---|---|---|
| Lands | 35 | 35 | 35 (34 with optional #7) |
| Ramp | 12 (+Wraith, conditional) | 12 | 12 (11 with #7) |
| Draw | 11 | 12 | 12 (13 with #7), incl. one sacrifice→card engine |
| Spot removal / edicts | 8 | 10 | 10 |
| Wipes | 2 (both one-sided under Bio) | 2 | 2 |
| Protection | 1 (Imp's Mischief) | 1 | 1 |
| Repeatable Imotekh-trigger permanents | 13 | 12 (−Cryptek; Clique is not one) | 14 (+Cryptek back, +Whisper) |
| Win lines | Colossus loop, Master, Legion swing, Overlord, Portal | same | same + infinite draw off Abomination |

## 4. Swap review

| IN | OUT | Verdict | Reason (oracle) |
|---|---|---|---|
| Noxious Gearhulk | Canoptek Wraith | agree | "When this creature enters, you may destroy another target creature" on a 6-MV artifact body: a Technomancer target, a Ghost Ark unearth-for-{3}, a Cryptek loop piece. Wraith must connect, then "pay {3} and sacrifice it" for two tapped basics. |
| Winter, Tormented Loner | Plasmancer | agree (ASSUMED) | "you may sacrifice a creature… When you do, each opponent sacrifices a creature": three edicts for {2}{B} paid with a Warrior. Plasmancer's only text is "search your library for a basic Swamp card… into your hand" in a 32-Swamp deck. If Winter is not owned: Sheoldred's Edict. |
| Dread Presence | Cryptek | **disagree** | Cryptek: "{1}{B}, {T}: Choose another target artifact creature you control. When that creature dies this turn, return it to the battlefield tapped." With any outlet that is a loop every turn: sacrifice Solemn / Praetorian / Royal Warden / Technomancer / Gearhulk, collect the death triggers (Altar, Apprentice, Psychomancer, Konrad, Master), the card returns = artifact card leaves the graveyard → two Warriors, plus a fresh ETB (Praetorian "enters from a graveyard… draw two"; Warden two tokens; Technomancer "mill three… return… total mana value 6 or less"). Dread Presence ("Whenever a Swamp you control enters… draw a card… or 2 damage") is a land-drop cantrip, not an engine. Keep Cryptek. |
| Necrotic Ooze | Flayed One | agree on OUT, weak IN | Flayed One ("Lifelink | When this creature enters, mill three cards") is the weakest body. The Ooze's payoff here is thin: Szeras's "Add an amount of {B} equal to the sacrificed creature's mana value" makes 0 off MV-0 Warriors; Chronomancer's draw and Overlord's drain need those cards dead first; it is not an artifact card without Biotransference. Whisper, Blood Liturgist (miss 2) takes this slot. |
| Puppeteer Clique | Lychguard | agree on OUT, **disagree on IN** | Lychguard ("{3}{B}, Sacrifice this creature: Return all legendary creature cards… to your hand") is a one-shot. Clique needs "target creature card from an opponent's graveyard", and the deck empties those: The Darkness Crystal "If a nontoken creature an opponent controls would die, instead exile it", Scriptures III "Exile all opponents' graveyards". Smothering Abomination (miss 1) takes this slot. |
| Night's Whisper | Ominous Harvest | agree | "You draw two cards and lose 2 life" at {1}{B}. Harvest's Gravestorm copies once per permanent that hit a graveyard this turn — usually a sorcery-speed 1-for-1. HISTORY: Harvest was the operator's 09-09 pick over Eviscerator's Insight, and Avarice (picked over Night's Whisper) stays, so no operator choice is reversed. The second owned copy stays in the binder. |

## 5. Overturned rejects

None. All seven REJECTs stand: Imp's Mischief is the only protection; Razorlash's "{4}{B}{B}: Return this card from your
graveyard to the battlefield… costs {4} less if an opponent controls four or more nonbasic lands" is a repeatable trigger;
Chronomancer's "{1}, {T}, Sacrifice another artifact: Draw a card" plus unearth beats Sautekh; Apprentice drains "each
opponent"; Theoretical Necromancer's cost is "Exile this card from your graveyard" (one use); Break Under Pressure is a role swap.

## 6. Misses (never proposed)

1. **Smothering Abomination** (pool, EDHREC #3853) → OUT Puppeteer Clique. "At the beginning of your upkeep, sacrifice a
   creature. | Whenever you sacrifice a creature, draw a card." Every Altar / Szeras / Zealot / Colossus / Deadly Dispute /
   Culling / Carnage / Winter / Dread Return-flashback sacrifice draws; the upkeep cost is a Warrior that itself fires Bats,
   Apprentice and Konrad — and draws. Turns the Colossus loop into infinite draw. Flying, devoid, MV 4.
2. **Whisper, Blood Liturgist** (pool, #6206) → OUT Necrotic Ooze. "{T}, Sacrifice two creatures: Return target creature card
   from your graveyard to the battlefield." A Dread Return every turn: two Warriors in, the target's ETB plus two Warriors out
   (any creature card under Bio). With Technomancer / Praetorian / Warden / Gearhulk / Deathmark in the yard it is mass
   reanimation, draw-two, four tokens, or removal each turn.
3. **Grave Venerations** (pool, #4201) → OUT Razorlash Transmogrant (optional). "you become the monarch | At the beginning
   of your end step, if you're the monarch, return up to one target creature card from your graveyard to your hand |
   Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life." A card, an Imotekh trigger and a
   drain per turn on one 4-MV enchantment; the Warriors hold the crown. Razorlash is a 2/1 "can't block" whose {B}{B} rate
   needs an opponent with four nonbasics.
4. **Emergency Weld** (pool, #11429) — operator cut in v3, so a reconsideration, not a ranked change. "Return target artifact or
   creature card from your graveyard to your hand. Create a 1/1 colorless Soldier artifact creature token" at {1}{B} is the
   commander's trigger on a 2-mana spell: three bodies plus a rebuy. It left with a batch of rocks and off-plan bodies; if
   reversed it beats Wayfarer's Bauble (slot #7 below).
5. **Sivriss, Nightmare Speaker** (pool, #9696) — bench. "{T}, Sacrifice another creature or an artifact: For each opponent, you
   mill a card, then return that card from your graveyard to your hand unless that player pays 3 life": a free outlet worth
   three "card or 3 life" per turn, each artifact hit an Imotekh trigger. No clear OUT after 1–3.

## 7. Weakest 5 (audited final)

1. **Puppeteer Clique** — 5-MV non-artifact whose targets the deck's own Crystal and Scriptures exile.
2. **Necrotic Ooze** — non-artifact toolbox; its best copy (Szeras) makes 0 mana off MV-0 tokens; needs the right card dead first.
3. **Razorlash Transmogrant** — "can't block" 2/1; {B}{B} only against four opposing nonbasics, otherwise {4}{B}{B}.
4. **Wayfarer's Bauble** — {1} then "{2}, {T}, Sacrifice": three mana for a tapped Swamp beside 5 rocks and Crypt Ghast.
5. **Wishclaw Talisman** — "An opponent gains control of this artifact": a tutor for the table; Avarice and Buried Alive tutor
   without the gift. Kept only because it finds Colossus / Bio / Altar.

## 8. Recommended change list vs the CURRENT deck (ranked)

| # | IN | OUT | Note |
|---|---|---|---|
| 1 | Noxious Gearhulk | Canoptek Wraith | as audited |
| 2 | Night's Whisper | Ominous Harvest | as audited; 1 of 2 owned copies |
| 3 | Smothering Abomination | Lychguard | replaces the Clique swap |
| 4 | Whisper, Blood Liturgist | Flayed One | replaces the Ooze swap |
| 5 | Winter, Tormented Loner | Plasmancer | ASSUMED — confirm owned; else Sheoldred's Edict |
| 6 | Grave Venerations | Razorlash Transmogrant | optional |
| 7 | Dread Presence | Wayfarer's Bauble | optional; Cryptek stays either way (Emergency Weld here if the v3 cut is reversed) |

Not applied: Cryptek stays; Puppeteer Clique and Necrotic Ooze are not added. Gate on 1–7: 100 cards, 35 lands, same
non-PASS lines as the current deck (ownership = Winter only), wincons 17. Lists used: `%TEMP%/imotekh-{final,mine}.txt`.
