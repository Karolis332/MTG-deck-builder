# MTG Deck Ratios Research — Complete Index

**Comprehensive research update: March 22, 2026**

This index covers all resources created for optimal deck-building ratios across Brawl and Commander formats.

---

## Documents Created (This Research Session)

### 1. Main Reference: DECK_CONSTRUCTION_RATIOS.md
**Comprehensive guide (~60KB, 1,512 lines)**

Complete breakdown of deck ratios for:
- Standard Brawl (60-card)
- Historic Brawl (100-card)
- Commander/EDH (100-card)
- The Command Zone Template (modern standard)
- Archetype-specific ratios
- Frank Karsten mana base mathematics

**Read this for:** In-depth understanding of all format ratios and theory

---

### 2. Quick Reference: BRAWL_RATIOS_QUICK_REFERENCE.md
**Fast lookup guide (~6.4KB)**

Quick tables for:
- Standard Brawl mana curve targets
- Historic Brawl category breakdowns
- Commander ratios by archetype
- Color identity adjustments
- Comparison matrix (60-card vs 100-card)

**Read this for:** Quick lookups during deck building

---

### 3. Implementation: IMPLEMENTATION_DECK_RATIOS.md
**Technical guide (~15KB)**

Code-level implementation for:
- Ratio constants (TypeScript objects)
- Archetype modifiers (aggro/control/combo/etc.)
- Card classification logic
- Deck validation functions
- Mana base calculation
- Integration with AI suggestion system
- Testing & QA checklist
- LLM prompts for Claude API

**Read this for:** Actually implementing ratios in code

---

## Existing Documents

### QUICK_REFERENCE.md
Short reference guide for deck building basics.

### DECK_RATIOS_SUMMARY.md
Earlier summary of ratio categories.

### README_DECK_RATIOS.md
Overview and navigation guide.

### AI_DECK_SUGGESTION_IMPLEMENTATION.md
Implementation guide for AI deck suggestions (complements IMPLEMENTATION_DECK_RATIOS.md).

---

## Key Findings from March 2026 Research

### Standard Brawl (60-card)
- **Lands:** 24–26 (start at 25)
- **Mana Ramp:** 5–8 sources (green has easier access)
- **Card Draw:** 5–8 sources (filtering + tutors)
- **Removal:** 5–8 spells (prefer cheap, instant-speed)
- **Board Wipes:** 1–3 (limited slots in 60 cards)
- **Avg CMC:** 2.5–3.2
- **Game length:** 15–25 minutes

### Historic Brawl (100-card)
- **Lands:** 35–40 (38 is golden number)
- **Mana Ramp:** 8–12 sources (10 baseline)
- **Card Draw:** 8–12 sources (10 baseline)
- **Removal:** 8–12 spells (10 baseline)
- **Board Wipes:** 2–4 (3 typical)
- **Creatures:** 18–28 (archetype-dependent)
- **Avg CMC:** 2.8–3.5
- **Game length:** 20–40 minutes

### Commander/EDH (100-card)
**The Command Zone Template (Current Standard):**
- **Lands:** 35–38 (37 golden)
- **Ramp:** 10–12 sources
- **Draw:** 10–12 sources
- **Single-Target Removal:** 10–12 spells
- **Board Wipes:** 3–4 spells
- **Total Interaction:** 13–16 spells
- **Avg CMC:** 2.8–3.2

### Archetype Modifiers
- **Aggro:** −4 lands, +8 creatures, −3 removal, −0.7 CMC
- **Control:** +2 lands, +4 removal, −12 creatures, +0.8 CMC
- **Combo:** −2 lands, +3 ramp, +3 tutors, better protection
- **Ramp:** Standard lands, +4 ramp, −4 creatures
- **Tempo:** −2 lands, +4 creatures, +2 removal, −0.4 CMC

### Frank Karsten Mana Math
- **2-color:** 24–26 colored sources minimum
- **3-color:** 28–32 colored sources
- **4-color:** 32–36 colored sources
- **5-color:** 36+ colored sources
- **Tools:** Use [Scrollvault Mana Base Calculator](https://scrollvault.net/tools/manabase/)

---

## Source Materials

### Community Standards
- [The 8x8 Theory](https://the8x8theory.tumblr.com/)
- [Command Zone Template](https://edh.fandom.com/wiki/Command_Zone_Template)
- [Command Zone Podcast](https://www.mtggoldfish.com/articles/the-power-of-a-deckbuilding-checklist-commander-quickie)

### Brawl Format
- [MTGArena Zone - Historic Brawl](https://mtgazone.com/historic-brawl-deck-building-guide/)
- [Draftsim - Brawl Guides](https://draftsim.com/mtg-arena-brawl-guide/)
- [MTG Salvation - Brawl Articles](https://www.mtgsalvation.com/articles/49711-brawl-hands-on-deck)
- [CoolStuffInc - Building Brawl](https://www.coolstuffinc.com/a/brucerichard-03232020-fixing-your-brawl-deck-by-adding-40-cards)

### Mana Mathematics
- [Scrollvault Mana Base Calculator](https://scrollvault.net/tools/manabase/)
- [Frank Karsten's Math (Medium)](https://medium.com/@schulze.mtg/the-math-of-landbases-in-magic-the-gathering-commander-3f03aadac92c)
- [Manabase.gg](https://manabase.gg/)
- [Commander.Land](https://commander.land/)

### Data Analysis
- EDHREC statistics (15.7 2-CMC average ground truth)
- cEDH Decklist Database
- MTGGoldfish metagame data
- TCGPlayer guides

---

## How to Use These Documents

### For Deck Building
1. **Quick lookup:** Use BRAWL_RATIOS_QUICK_REFERENCE.md
2. **Deep dive:** Read DECK_CONSTRUCTION_RATIOS.md
3. **Specific format:** Jump to relevant section in main guide

### For AI Implementation
1. **Start with:** IMPLEMENTATION_DECK_RATIOS.md (code snippets)
2. **Reference:** AI_DECK_SUGGESTION_IMPLEMENTATION.md (overall flow)
3. **Constants:** Copy ratio objects from implementation guide
4. **Validation:** Use validation function examples

### For Meta Analysis
1. Read DECK_CONSTRUCTION_RATIOS.md
2. Check archetype-specific sections
3. Compare to community meta (EDHREC, MTGGoldfish)

---

## Integration Checklist

- [ ] Copy ratio constants to `src/lib/constants.ts`
- [ ] Implement `classifyCard()` function in deck-builder AI
- [ ] Create `validateDeckRatios()` function in deck validation
- [ ] Add archetype modifier logic to AI suggestions
- [ ] Implement `calculateColoredSources()` for mana base
- [ ] Update AI chat prompt with ratio constraints
- [ ] Test with sample decks (aggro, control, midrange)
- [ ] Validate against EDHREC meta data
- [ ] Update docs/QUICK_REFERENCE.md when live

---

## Key Principles (TL;DR)

1. **Lands first:** 24–26 (60-card), 35–40 (100-card)
2. **Ramp enables consistency:** 5–12 sources depending on format
3. **Draw prevents drought:** 5–12 sources
4. **Removal prevents overrun:** 5–16 total interaction (spot + wipes)
5. **Archetype matters:** Adjust +/− by type (control gets more removal, aggro gets more creatures)
6. **Mana curve peaks at 2–3 CMC:** Adjust lands if curve is heavy
7. **Color identity affects fixing:** More colors = more lands + fixing rocks

---

## Questions Answered

**Q: How many lands in Historic Brawl?**
A: 35–40 (target 38). Higher than Standard Brawl because singleton makes consistency harder.

**Q: How much ramp in Standard Brawl?**
A: 5–8 sources. Green has easier access; non-green decks may run fewer and +1 land instead.

**Q: What about The Command Zone template?**
A: Use it as baseline for Commander (10 ramp, 10 draw, 13 removal, 3 wipes). More modern than 8x8.

**Q: How do I know if my mana base is correct?**
A: Use [Scrollvault calculator](https://scrollvault.net/tools/manabase/) with your spell requirements.

**Q: Should I follow ratios strictly?**
A: No—they're guidelines. Adjust +/− by 1–2 cards per category based on commander and meta.

**Q: What about 2-color vs 3-color?**
A: Use +1 land for 3-color, −1 land for 2-color compared to baseline. More colors = more fixing.

---

## Version History

**v2.0 (March 22, 2026)** — Major research update
- Added detailed Standard Brawl (60-card) ratios
- Expanded Historic Brawl section with archetype breakdowns
- Added Command Zone Template (current standard)
- Added Frank Karsten mana math section
- Created implementation guide with code snippets
- Created quick reference tables
- Total sources: 40+ expert guides, EDHREC data, community consensus

**v1.0 (February 5, 2026)** — Initial creation
- Basic ratios for Commander
- Archetype guidelines
- Initial references

---

## Contact & Updates

- **Research Date:** March 22, 2026
- **Data Sources:** EDHREC, The Command Zone, MTGArena Zone, Draftsim, community forums
- **Maintained by:** MTG Deck Builder AI team
- **Next review:** June 2026 (post-new-set rotation)

---

**All documents are in `/docs/` directory. Start with BRAWL_RATIOS_QUICK_REFERENCE.md for fast lookup or DECK_CONSTRUCTION_RATIOS.md for complete reference.**
