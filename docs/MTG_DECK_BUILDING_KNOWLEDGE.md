# Commander/EDH Deck Building Knowledge Base

This document provides comprehensive deck building principles for the AI suggestion system.

## Core Commandments (Critical Rules)

1. **Never cut ramp below 8 sources** (ideally 10-12)
2. **Never cut draw below 8 sources** (ideally 10-12)
3. **Maintain archetype-critical card types** (25+ instants/sorceries for spellslinger)
4. **Replace same role with same role** (ramp→ramp, draw→draw, removal→removal)
5. **Keep replacements within ±1 CMC** unless strong justification
6. **Warn when suggestions break critical thresholds**

## Quick Reference Thresholds

- **Lands**: 35-38
- **Ramp**: 10-12 (minimum 8)
- **Draw**: 10-12 (minimum 8)
- **Removal**: 10-12
- **Instants/Sorceries (spellslinger)**: 25-35
- **Payoffs (spellslinger)**: 8-12
- **Average CMC**: 3.0-3.5
- **Win conditions**: 5-7

## Mana Rock Protection Rules

**NEVER suggest cutting these unless deck has 12+ ramp:**
- Sol Ring
- Arcane Signet
- 2-CMC signets/talismans in deck's colors
- Commander's Sphere
- Mind Stone

**Only cut mana rocks if:**
- Replacing with better ramp (e.g., 3-CMC rock → 2-CMC rock)
- Deck's average CMC is below 2.5 AND already has 10+ ramp
- Deck is explicitly cEDH-optimized and user asks for cuts

## Izzet Spellslinger Archetype

**Core Strategy:**
- Cast many instants/sorceries to trigger payoff effects
- Generate value through spell triggers (card draw, tokens, damage)
- Win through token swarms, storm counts, or direct damage

**Critical Mass: 25-35 instants/sorceries minimum**

**Essential Components:**
1. **Spell Payoffs (8-12)**: Young Pyromancer, Third Path Iconoclast, Talrand, Storm-Kiln Artist, Niv-Mizzet
2. **Cheap Cantrips (8-12)**: Brainstorm, Ponder, Preordain, Opt, Consider
3. **Ramp (10-12)**: Sol Ring, Arcane Signet, Izzet Signet, Mind Stone, Talisman of Creativity
4. **Card Draw Engines (8-10)**: Rhystic Study, Jori En, Archmage Emeritus
5. **Interaction (10-12)**: Counterspell, Negate, Lightning Bolt, Chaos Warp

**Common Mistakes:**
- ❌ Not enough instants/sorceries (need 25+ to trigger payoffs)
- ❌ Cutting mana rocks (need 10-12 for expensive commanders and multi-spell turns)
- ❌ Too few creatures (need 8-15 for board presence)
- ❌ Building too slow (need 1-2 CMC cantrips and 2-3 CMC interaction)
- ❌ No protection for commander (need 3-5 counterspells/hexproof effects)

## Card Evaluation Checklist

**Before suggesting ANY cut, check:**

1. **Is this a mana rock or ramp spell?**
   - If YES and deck has <10 ramp: DO NOT CUT
   - If YES and deck has 10-12 ramp: Only suggest if upgrading to better ramp

2. **Is this a card draw engine?**
   - If YES and deck has <8 draw: DO NOT CUT
   - If YES in spellslinger and it's an instant/sorcery: EXTRA CAUTION

3. **Is this an instant/sorcery in spellslinger?**
   - Count total instants/sorceries
   - If cutting would drop below 25: DO NOT CUT or suggest instant/sorcery replacement ONLY

4. **What is this card's role?**
   - Suggest replacement with SAME ROLE
   - If different role, explain why deck needs balance adjustment

5. **What is the mana value?**
   - Keep replacement within ±1 CMC
   - If higher CMC, need strong justification

## Replacement Priority Order

1. **Same role** (ramp for ramp, draw for draw)
2. **Similar mana value** (±1 CMC)
3. **Similar or better effect**
4. **Maintains archetype coherence**

**Example Good Replacements:**
- Arcane Signet → Mind Stone (both 2-CMC ramp)
- Lightning Bolt → Shock (both instant burn, same role)
- Talrand → Young Pyromancer (both token generators from spells)

**Example Bad Replacements:**
- Sol Ring → Brainstorm (WRONG ROLE - ramp vs draw)
- Negate → Overwhelming Intellect (WRONG CMC - 2 vs 5)
- Young Pyromancer → Grizzly Bears (WRONG ARCHETYPE - payoff vs vanilla)

## Mana Curve Guidelines

**Target Average CMC:**
- Most Commander decks: 3.0-3.5
- Spellslinger/tempo: 2.5-3.0
- Ramp/control: 3.5-4.0

**Distribution:**
- 50% of spells should cost 3 or less
- Modal mana value is 2 CMC
- Most cards clustered in 2-4 CMC range

**When Curve is Too High:**
- Don't just add more ramp (band-aid fix)
- Cut expensive cards, replace with cheaper alternatives
- Look for 2-3 CMC versions instead of 5-6 CMC

## Red Flags (Warn User)

1. **Ramp < 8**: "⚠️ Low ramp count. This deck needs 2-3 more mana sources."
2. **Draw < 6**: "⚠️ Low card draw. You'll run out of gas quickly."
3. **Average CMC > 4.0**: "⚠️ Very high curve. Consider replacing 5-6+ CMC cards with 2-3 CMC alternatives."
4. **Spellslinger with <20 instants/sorceries**: "⚠️ Not enough spells to trigger payoffs reliably."
5. **No board wipes**: "⚠️ No board wipes. Consider adding 2-4 for creature-heavy boards."
6. **No clear win conditions**: "⚠️ Lots of setup but no finishers. Add 3-5 cards that can close games."

## Special Cases: When Rules Can Be Bent

**High ramp tolerance (can have fewer ramp sources):**
- Average CMC below 2.8
- Commander costs 2-3 mana
- Deck has 8+ land ramp spells already

**Low spell count tolerance (spellslinger with <25 spells):**
- Only if deck is NOT spellslinger archetype
- If it IS spellslinger, this is a critical error

**High CMC tolerance:**
- Deck explicitly wants to ramp into big spells
- Has 12+ ramp sources to support it
- Commander costs 6+ mana (needs ramp anyway)

## Sources

Based on comprehensive research from:
- EDHREC (official Commander statistics and guides)
- Command Zone, MTG Goldfish (competitive Commander content)
- Card Kingdom, Draftsim (deck building tutorials)
- Community consensus on Commander best practices (2026)

---

**Last Updated**: February 2026
