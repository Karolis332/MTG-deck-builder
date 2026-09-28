# Refute round 2: Reality Fracture swaps (2026-09-28)

**Goal.** Check every swap below the same way you checked round 1 in `REFUTE.md`. Then merge the KEEPs into ONE
final swap list per deck with no conflicts.

**Inputs (verify-2026-09-28/deck-audit/).**
- `<slug>-report.md` §6: swaps for registered FRA cards.
- `<slug>-fra-verdicts.md` `## Swaps`: swaps for unregistered FRA cards.
- `<slug>-fra-assumed.md`: oracle text for the unregistered cards.
- `<slug>-deck.md`, `<slug>-pool.md`, `REFUTE.md` (your round-1 verdicts are the baseline).

**Swaps to check.**

| Deck | IN | OUT | Source |
|---|---|---|---|
| Tam | Kiora of Salt and Sand | Pia, Aether Ascetic | §6 |
| Tam | Niv-Mizzet, Ghost Counsel [IF-OWNED] | Quintorius Kand | fra-verdicts |
| Tazri | Springleaf Parade | Solemn Doomguide | §6 |
| Tazri | Realmwalker | Archpriest of Iona | §6 |
| Tazri | Chomping Changeling | You Find a Cursed Idol | §6 |
| Tazri | Traxos, Scourge Eternal | Solemn Doomguide | fra-verdicts |
| Tazri | Samut, Hazoret's Champion | Feywild Caretaker | fra-verdicts |
| Tazri | Rescue Girl, First Responder | Archpriest of Iona | fra-verdicts |
| Tazri | Enlightened Confidant [IF-OWNED] | You Find a Cursed Idol | fra-verdicts |
| Cabbage | Keeper of the Quiet Hour | Greenhouse Propagator | §6 (claims the Jace token can [−3] right away; empower Jace 2 gives only 2 loyalty. Judge the card without that claim) |
| Cabbage | Traxos, Scourge Eternal | Jiang Yanggu, Never Alone | fra-verdicts |
| Cabbage | Restore with Empathy | Titanbones, Towering Heart | fra-verdicts |
| Cabbage | Puppet Crafting [IF-OWNED] | Ribtruss Roaster | fra-verdicts |
| Meren | Avacyn, Angel of Horror [IF-OWNED] | The Gitrog, Ravenous Ride | fra-verdicts |
| Meren | Massacre Girl, Most Wanted | Golgari Charm | fra-verdicts |
| Meren | Silence the Echo | Veil of Summer | fra-verdicts |
| Meren | Restore with Empathy | Accursed Marauder | fra-verdicts |
| Meren | Vraska, the Cutting Glare | Lightning Greaves | fra-verdicts |
| Imotekh | Liliana the Repentant | Marionette Apprentice | fra-verdicts |
| Imotekh | Massacre Girl, Most Wanted | Umbral Collar Zealot | fra-verdicts |
| Imotekh | Winter, Tormented Loner | Plasmancer | fra-verdicts |
| Imotekh | Theoretical Necromancer | Wayfarer's Bauble | fra-verdicts |
| Imotekh | Break Under Pressure | Wishclaw Talisman | fra-verdicts |

**What to verify, per swap.**
1. The IN card's oracle text says what the auditor claims. Quote it.
2. The OUT card is in the deck, is not a lock, and is not an OUT of a round-1 KEEP swap.
3. The IN card clearly beats the OUT card in this deck. Otherwise REJECT with the reason.

**Conflicts to resolve.**
- Same OUT used twice: Tazri Solemn Doomguide, Archpriest of Iona and You Find a Cursed Idol are each an OUT twice.
  Keep the better IN for each. For the other IN, either name the next-weakest slot with a reason, or REJECT it.
- One physical copy, two decks: Massacre Girl, Most Wanted (Meren vs Imotekh), Restore with Empathy (Meren vs
  Cabbage), Traxos, Scourge Eternal (Tazri vs Cabbage). Give each to the deck that gains the most, and say why.

**Output.**
- Write `verify-2026-09-28/deck-audit/REFUTE-FRA.md` (≤ 200 lines).
- Section 1: one row per swap above: KEEP/REJECT, the quoted evidence, and the conflict ruling.
- Section 2: the FINAL swap list per deck. Include the round-1 KEEPs from `REFUTE.md` and the round-2 KEEPs.
  Every OUT must be unique and every IN used once across all decks. Tag each IN as registered, ASSUMED or IF-OWNED.
- Do not edit any other file. Chat reply: ≤ 25 lines.

**Known facts.**
- Lost cards (never recommend): Innkeeper's Talent, Konstrari Annex, Boros Charm.
- Tam locks: 35 lands, Kaya's Ghostform, both Ob Nixilis, Thrummingbird, Kaito, Chimil, Esika, Jace, Memory Adept,
  Great Divide Guide, every Way, Jared, Saheeli, both Talismans, Final Act.
- Operator decisions on Tazri: Grand Abolisher was cut in v4 and Explore the Underdark was added in v6.
- Night's Whisper: the operator owns 2 copies, and both go to Imotekh (Meren declined).
