# Deck-audit refutation — 2026-09-28 (refuter, read-only)

Checked per swap: IN text vs `<slug>-pool.md`, OUT text vs `<slug>-deck.md`, operator history in
`decks/paper/HISTORY.md`, and the Tam constraints from the brief. Lists diffed against
`decks/paper/decks/<slug>.txt`; the gate was rerun on every proposed list, every current list, and every
fixed list (commands in §6). Verdict: **KEEP 19 / REJECT 16** across 35 swap lines.

| Deck | KEEP | REJECT |
|---|---|---|
| Tam | 1 | 6 |
| Meren | 3 | 2 |
| Tazri | 6 | 1 |
| Imotekh | 5 | 3 |
| Cabbage | 4 | 4 |

## 1. Tam, the Possibility — KEEP 1 / REJECT 6

Tam's walker types today: Ajani x2, Chandra x2, Elspeth, Jace x2, **Jared**, Kaito, Kaya, Nixilis x2, Oko, Dellian,
Quintorius, **Saheeli**, Sarkhan, Sorin, Vraska (The Wanderer has no type). Jared and Saheeli are the only walkers of their type.

| # | swap (IN ← OUT) | verdict | evidence (oracle clause) | fix |
|---|---|---|---|---|
| 1 | Sanguine Bond ← Archangel of Tithes | REJECT | Archangel: "creatures can't attack you **or planeswalkers you control** unless their controller pays {1} for each". It is the deck's only static walker protection, so "zero line to the plan" is false. The IN reason is also wrong: Way of the Mentor puts loyalty counters on walkers and gains no life. Bond is actually fed by Paradox, Liliana the Faultless, Beacon and Ajani Resolute's 0 | Keep Archangel. Sanguine Bond OUT **Final Act** (6-MV fifth wipe; Fumigate [locked], Toxic Deluge, Settle and Elspeth −3 remain) |
| 2 | Well of Lost Dreams ← Chandra, Fire Artisan | KEEP | Well: "Whenever you gain life, you may pay {X}… draw X cards" is its own per-event trigger. Chandra's type is duplicated by Chandra, Torch of Defiance, so X is unchanged | — |
| 3 | Dina, Soul Steeper ← Jared Carthalion | REJECT | Jared is the only Jared-type walker. Cutting it lowers Tam's "X is the number of planeswalker types" by 1 and removes a Mentor/proliferate target. Dina's text is correct ("each opponent loses 1 life") | Dina OUT **Rewrite Regrets** ("Return target creature or planeswalker card… from your graveyard": it can't be cast with no target, so it is dead early) |
| 4 | Bedevil ← Talisman of Dominance | REJECT | This cuts ramp at 35 locked lands. The gate's land target rises from "Karsten wants 38 ±2" (current) to "39 ±2" (proposed). The deck already runs 7 spot removal, and {B}{B}{R} is the hardest pip cost in a 5c base | Keep the Talisman and drop Bedevil. Domri (miss 1) beats Bedevil if a slot opens |
| 5 | Sign in Blood ← Vigorbloom Charm | REJECT | The OUT reason is false: Kaya's Ghostform "return[s] that card to the battlefield" after death/exile and grants no hexproof. Charm mode "You draw a card and gain 3 life" gives a card plus a lifegain event at instant speed (Mentor: a loyalty counter on every walker; Well/Dina triggers). Its other mode, "hexproof and indestructible", protects a walker | Keep the Charm; drop Sign in Blood |
| 6 | Harmonize ← Talisman of Progress | REJECT | Same ramp objection as #4: two rocks cut at 35 lands leaves 9 ramp pieces | Keep the Talisman; drop Harmonize |
| 7 | Painful Truths ← Saheeli, Sublime Artificer | REJECT | Saheeli is the only Saheeli-type walker, so X drops by 1. She also makes a Servo blocker on "each noncreature spell". The IN math is wrong: Painful Truths costs {2}{B} and "X is the number of colors of mana spent", so the max is 3, not "likely 5" | Keep Saheeli; drop Painful Truths |

Net Tam fix: **+Well −Chandra FA, +Sanguine Bond −Final Act, +Dina −Rewrite Regrets**. Locks, 35 lands, all 7 Ways,
both Talismans, Jared and Saheeli stay. There's no Vito, NW, Grand Abolisher or Syphon Mind. Gate on the fixed list: §6.
Note: the "card draw ~1" figure in the Health table undercounts walker draw (Jace MA +1, Kaya 0, Vraska 0,
Dellian 0, Kaito 0, Mind Sculptor, Chimil, Protege's Awakening).

## 2. Meren of Clan Nel Toth — KEEP 3 / REJECT 2

| # | swap | verdict | evidence | fix |
|---|---|---|---|---|
| 1 | Night's Whisper ← Butcher of Malakir | REJECT | Butcher: "Whenever this creature or another creature you control dies, each opponent sacrifices a creature". That's a one-sided repeatable edict, run with free outlets (Viscera Seer, Carrion Feeder, Woe Strider, Yahenni, High Market), and a Reanimate/Victimize/Junji/Buried Alive target. Braids, Cabal Minion is symmetric ("each player's upkeep, that player sacrifices"), so it isn't redundant. HISTORY v6: the operator cut NW from Meren ("+Mikaeus, +Saw in Half, −Night's Whisper"), and the report doesn't mention it | Keep Butcher; don't add NW to Meren |
| 2 | Vito ← Grim Servant | KEEP | Vito: "Whenever you gain life, target opponent loses that much life" doubles each 1-life gain from Blood Artist, Zulaport, Cauldron and Moldervine. (The report leaves out that Grim Servant, MV 4, is a Meren-recurrable tutor, but Vito is still the stronger card) | — |
| 3 | Grave Titan ← Rune-Scarred Demon | KEEP | "Whenever this creature enters or attacks, create two 2/2 black Zombie" tokens = sac fodder. It's an MV 6 reanimation target, and Meren puts it into your hand below 6 experience | — |
| 4 | Jungle Hollow ← High Market | KEEP (reason fixed) | The report says Grim Backwoods is an "identical template". That's false: High Market's "{T}, Sacrifice a creature" is free, while Backwoods costs "{2}{B}{G}, {T}". The swap still holds: 4 other free outlets remain, and Hollow adds B/G for {B}{B}{B} / {B}{B}{G}{G} costs | — |
| 5 | −1 Swamp (101→100) | REJECT | Adds a new gate WARN. Current: "PASS lands 35 … Karsten wants 37 ±2". Proposed: "WARN lands 34". The brief only accepts WARNs already on the current deck | Cut **Creakwood Liege** instead. It's the 101st card: it's missing from the operator's own 100-card `proposals/meren-powerhouse.txt` (diff: Creakwood Liege, and Festering Thicket vs Terramorphic Expanse) |

Net Meren fix: **+Vito −Grim Servant, +Grave Titan −Rune-Scarred Demon, +Jungle Hollow −High Market, −Creakwood Liege**
(100 cards, 35 lands, lands PASS). The Meren NW copy is freed. The Tazri report says NW "would have been the pick
otherwise".

## 3. Tazri, Beacon of Unity — KEEP 6 / REJECT 1

| # | swap | verdict | evidence | fix |
|---|---|---|---|---|
| 1 | Generous Gift ← Concerted Defense | KEEP | "Destroy target permanent" vs a soft counter for noncreature spells only | — |
| 2 | Putrefy ← Bar the Gate | KEEP | "Destroy target artifact or creature" at instant speed vs "Counter target creature or planeswalker spell" | — |
| 3 | Infernal Grasp ← Multiclass Baldric | KEEP | The report misreads Baldric: it grants each keyword for the matching party role you control, so it doesn't need a full party. It's still the weakest slot | — |
| 4 | Grand Abolisher ← Stick Together | KEEP (note) | Abolisher is a Human Cleric, so it fills a party slot. Stick Together "sacrifices the rest", which hits the deck's own Najeela, Squad Commander and Merriment tokens. **HISTORY v4: the operator cut Grand Abolisher from Tazri.** The report claims no reversals, which is wrong; the orchestrator's assignment stands | — |
| 5 | Syphon Mind ← Thwart the Grave | KEEP (reason fixed) | Thwart doesn't "need a full party": it "costs {1} less… for each creature in your party". Syphon Mind draws about 3 for 4 mana in a 4-player pod | — |
| 6 | Selvala, Heart of the Wilds ← Feywild Caretaker | REJECT | Caretaker is an Orc **Wizard** (party, and a hit for Tazri's "reveal up to two Cleric, Rogue, Warrior, Wizard") and "When this creature enters, you take the initiative" (feeds Imoen, Safana and Hama Pashar). The report ignores both. Selvala is an Elf Scout: not party and not Tazri-findable. Her draw is symmetric ("its controller may draw a card"), which is why the operator cut her from Cabbage (HISTORY 2026-09-18) | Keep Caretaker; drop Selvala. Better IN if a slot opens: Springleaf Parade (miss 3) |
| 7 | Growth Spiral ← Explore the Underdark | KEEP (note) | 2-MV instant vs 5-MV sorcery. But Explore also says "You take the initiative" and fetches 2 lands from the library in a 34-land deck. The operator added it in v6, so they should confirm | — |

## 4. Imotekh the Stormlord — KEEP 5 / REJECT 3

Engine note: Imotekh triggers on "artifact cards leave your graveyard". Biotransference makes every creature card
you own an artifact.

| # | swap | verdict | evidence | fix |
|---|---|---|---|---|
| 1 | Necrotic Ooze ← Flayed One | KEEP (reason fixed) | The Ooze gets "all **activated** abilities". Marionette Master's drain is triggered ("Whenever an artifact… is put into a graveyard"), so the Ooze doesn't get it, and the same report cuts Cryptek. What it does get: Szeras ("{T}, Sacrifice another creature: Add"), Syr Konrad ("{1}{B}: Each player mills"), Necron Overlord, Umbral Collar Zealot, and Chronomancer if kept. Flayed One is still the weakest body | — |
| 2 | Noxious Gearhulk ← Canoptek Wraith | KEEP | "you may destroy another target creature" on an artifact body | — |
| 3 | Sheoldred's Edict ← Imp's Mischief | REJECT | Imp's Mischief, "Change the target of target spell with a single target", is Imotekh's protection, not removal. The report's own Health table says protection is "~0 … still a real gap" | Keep Imp's Mischief. If the edict is wanted, cut Plasmancer ("search your library for a basic Swamp card… into your hand" in a 32-Swamp deck) |
| 4 | Skorpekh Destroyer ← Razorlash Transmogrant | REJECT | The report misreads Razorlash. It has no unearth; its ability is "{4}{B}{B}: Return this card from your graveyard to the battlefield… costs {4} less if an opponent controls four or more nonbasic lands". That's {B}{B} in most pods, repeatable, and each return is an artifact card leaving your graveyard = Imotekh "create two 2/2". Skorpekh is "Deathtouch \| … gains first strike", with no engine text | Keep Razorlash; drop Skorpekh |
| 5 | Dread Presence ← Cryptek | KEEP (note) | "Whenever a Swamp you control enters", with 32 Swamps. The report misses that Cryptek's return from the graveyard is itself an Imotekh trigger, but Dread Presence is still stronger | — |
| 6 | Puppeteer Clique ← Lychguard | KEEP | Lychguard only does "Return all legendary creature cards… to your hand" for {3}{B} plus sacrificing itself | — |
| 7 | Sautekh Immortal ← Chronomancer | REJECT | Chronomancer: "{1}, {T}, Sacrifice another artifact: Draw a card" turns Imotekh tokens into cards every turn, and "Unearth {2}{B}" is itself an Imotekh trigger. Sautekh ("Flash \| enters with a +1/+1 counter for each creature that died this turn") has no unearth, so the "unearth cost… worse" comparison compares against nothing | Keep Chronomancer; drop Sautekh |
| 8 | Night's Whisper ← Ominous Harvest | KEEP (note) | Gravestorm usually copies 0–1 times. HISTORY 2026-09-09 "Insatiable Avarice back in over Night's Whisper": Avarice stays, so nothing is reversed | — |

## 5. The Cabbage Merchant — KEEP 4 / REJECT 4

| # | swap | verdict | evidence | fix |
|---|---|---|---|---|
| 1 | Elvish Spirit Guide ← Hungering Puppetbeast | KEEP (reason overstated) | Puppetbeast's sacrifice isn't "for nothing": Food sacs feed Trail of Crumbs, Unlucky Cabbage Merchant and Syr Ginger, and its Heartwood is an artifact token. It's still an EDHREC #27440 5-drop. The operator added it in v4 today, so they should confirm | — |
| 2 | Helix Pinnacle ← The Ooze | REJECT | The report quotes only The Ooze's first ability. Its second, "{T}: Exile target card from a graveyard. Create a Mutagen token.", makes a token every turn. Took adds "an additional Food", and Manufactor turns that Food into Clue + Food + Treasure. That's 4 artifact ETBs = 4 Teething Wurmlet lifegain events = 4 Trudge Garden triggers. It also enables Idol of Oblivion ("created a token this turn"). Pinnacle duplicates the existing Walking Ballista kill | Keep The Ooze; drop Pinnacle |
| 3 | Alhammarret's Archive ← Ginger, Queen of Sweets | KEEP (reason fixed) | Rules error: Archive doubles the **amount**, but Trudge Garden ("Whenever you gain life") still triggers once per event, so there are no extra 4/4s. Syr Ginger scries; it doesn't draw. The real value is doubled draws from Toski, Ohran, Idol, Took, Uprising and Kenrith's. The orchestrator assigned Archive here. Ginger was an operator add in v3 today | — |
| 4 | Tendershoot Dryad ← Emil, Vastlands Roamer | KEEP | "At the beginning of each upkeep, create a 1/1 green Saproling" = 4 tokens a round, each plus a Took Food | — |
| 5 | Loxodon Warhammer ← Greenhouse Propagator | REJECT | Same event-vs-amount mistake, in reverse. Propagator's "Whenever another creature you control enters, you gain 1 life" is one lifegain event per creature, so each Fungus Beast re-triggers Trudge Garden. That makes it a second loop piece independent of the Wurmlet, plus "{T}: Add {G}". Warhammer's lifelink is one event per damage step | Keep Propagator; drop Warhammer |
| 6 | Elvish Archdruid ← Nesting Grounds | REJECT (the OUT) | HISTORY 2026-09-18: "Ash Barrens, Escape Tunnel, Nesting Grounds kept for three Forests (27)". That's an explicit operator keep, and the swap takes lands from 33 to 32. The IN is good. The Elves that actually reach the battlefield are Mystic, Llanowar, Jaheira, Halsin, Tireless Provisioner, Disciple and the Archdruid itself. The report counts ESG, which never enters, and misses four | Make Archdruid the **100th card**; Nesting Grounds stays |
| 7 | Hunter's Insight ← Spry and Mighty | KEEP (note) | "X is the difference between the chosen creatures' powers", which is small in a token deck. It was an operator sleeved pick on 2026-09-18, so they should confirm | — |
| 8 | Fog (100th card) | REJECT | The report says it "was in the original role plan and never got sleeved". That's false: HISTORY v3 (2026-09-28) lists "−Fog", so the operator removed it today | The 100th slot goes to Elvish Archdruid |

Net Cabbage fix: **+ESG −Puppetbeast, +Archive −Ginger, +Tendershoot −Emil, +Hunter's Insight −Spry and Mighty,
+Elvish Archdruid** (100 cards, 33 lands).

## 6. List and gate checks

Gate: `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts /tmp/<slug>-{ref,cur,fix}.txt --format commander --owner 1 --source paper`.
Diff: `python /tmp/refute_diff.py <slugs>` (multiset diff, current vs proposed).

| Deck | proposed = current − OUT + IN | total | proposed gate (non-PASS) | vs current | fixed list gate |
|---|---|---|---|---|---|
| Tam | yes, 7/7 match the table | 100 | FAIL plan · WARN lands "39 ±2" · WARN arenaNames | lands target 38→39 (ramp cut). Report quotes "wincons 9"; the rerun shows "10" | 100, 35 lands, WARN lands "38 ±2", FAIL plan only |
| Meren | yes, 4 swaps + −Swamp | 100 | FAIL plan · **WARN lands 34** · WARN arenaNames | **new WARN** (current: PASS lands 35; size FAIL 101) | 100, 35 lands, lands PASS, FAIL plan only |
| Tazri | yes, 7/7 | 100 | FAIL plan · WARN lands · WARN arenaNames | same as current | 100, same WARNs |
| Imotekh | yes, 8/8 | 100 | FAIL plan · WARN lands | same as current | 100, same WARNs |
| Cabbage | yes, 7 + Fog | 100 | WARN plan · WARN lands 32 · WARN arenaNames | lands WARN was already present (33); size WARN 99 fixed | 100, 33 lands, WARN only |

Cross-deck checks (all PASS):
- Night's Whisper appears in Meren and Imotekh, 1 each (cap 2).
- Grave Titan, Vito and Jungle Hollow are only in Meren; Grand Abolisher and Syphon Mind only in Tazri; Archive only in Cabbage.
- Innkeeper's Talent, Konstrari Annex and Boros Charm are in no list.
- All 20 Tam locks and 7 Ways are present, with 35 lands.
- No IN card is claimed by two decks (NW excepted, x2).

Game changers: Tam 0→0, Meren 1→1, Tazri 0→0, Imotekh 0→0, Cabbage 1→1.

## 7. Coverage misses (REJECT reason contradicted by the card's own text)

1. **Domri, Anarch of Bolas** (Tam). Rejected with "no line to the loyalty/proliferate/lifegain plan", but it's a walker of a new type (Domri → Tam X+1). "+1: Add {R} or {G}" is ramp on a walker (answering the Talisman concern), and every activation triggers Paradox → Mentor. It costs 2 after Tam's discount. It beats Bedevil or Rewrite Regrets.
2. **Ashiok, Dream Render** (Tam). Same false reason. It's a new type (X+1) at 2 mana after the discount, with "−1: Target player mills four cards. Then exile each opponent's graveyard" and a static tutor hoser. It beats Painful Truths or Harmonize.
3. **Springleaf Parade** (Tazri). Rejected as "extra mana rock", but it's "create X 1/1… Shapeshifter creature tokens with changeling" (X=4 = a full party) plus "Creature tokens you control have '{T}: Add one mana of any color.'" That covers Najeela Warriors, Squad Commander Kor and Merriment tokens. It beats Selvala.
4. **Realmwalker** (Tazri). Rejected with "no party/changeling synergy", but it has "Changeling" and "You may cast creature spells of the chosen type from the top of your library". It beats Selvala or the weakest party piece.
5. **Chomping Changeling** (Tazri). Same false reason. "Changeling | When this creature enters, destroy up to one target artifact or enchantment": a Tazri hit plus removal.

The Tazri blanket reason is also false for Alesha (Human Warrior) and Rankle (Faerie Rogue). Mirri was an operator cut in v4.

## 8. Findings by severity

- **HIGH** Tam: 6 of 7 swaps break the operator's constraints or rest on false text. Two cut unique-type walkers (Jared, Saheeli), two cut ramp at 35 lands (the gate target rises 38→39), and two cut walker protection (Archangel, Vigorbloom).
- **HIGH** Imotekh: it cuts the deck's two repeatable Imotekh triggers (Razorlash, Chronomancer) on misread text.
- **HIGH** Cabbage: it cuts two engine pieces (The Ooze, Greenhouse Propagator) and re-adds Fog, which the operator removed today.
- **HIGH** Meren: it cuts Butcher (a one-sided edict engine), and the Swamp cut adds a lands WARN that isn't on the current deck.
- **MEDIUM** Imotekh drops its only protection (Imp's Mischief) while its own report calls protection a gap. Tazri trades a party Wizard that takes the initiative for a non-party, symmetric-draw Selvala.
- **MEDIUM** Coverage scope:
  - Tazri stamps "no party/changeling synergy" on changelings and party-type creatures.
  - Tam treats only proliferate text as "the mechanic", but every planeswalker is Tam's mechanic.
  - Unweighed Tam walkers: Tezzeret, Vivien, Ral, Dovin, Davriel, Angrath, Jiang Yanggu, Mu Yanling, Jaya, Samut, Nahiri, Arlinn, Liliana Death Wielder, Kaya Bane of the Dead, Vraska Swarm's Eminence, Nissa Steward, Oko Lorwyn Liege, and flip walkers Grist/Tamiyo. Kasmina and Teyo were operator cuts.
  - Way of the Cryomancer (empower Jace 5) is open and wasn't assessed, even though "every Way" is locked. It falls outside the rank/price criteria, so the operator should confirm.
- **LOW** Rules and text errors inside KEEP swaps: Imotekh #1, Cabbage #3 and #6, Meren #4, Tazri #3 and #5.
- **LOW** Operator history the reports don't acknowledge:
  - Grand Abolisher: cut from Tazri in v4.
  - Night's Whisper: cut from Meren in v6.
  - Explore the Underdark: added to Tazri in v6.
  - Ginger, Emil, Puppetbeast, Propagator and The Ooze: added to Cabbage today (v3/v4).
  - Spry and Mighty: operator sleeved pick on 09-18.
- **LOW** The Tam report's gate block doesn't match the rerun on the same file (it says wincons 9; the rerun shows 10).

Fixed lists (scratch, not decks): `C:/Users/QuLeR/AppData/Local/Temp/<slug>-fix.txt`.
