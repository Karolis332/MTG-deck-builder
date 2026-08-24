# Monetization Notes — applying the "sellable output" lens

*2026-08-24. Source: the "17 Claude skills" article's core test — a paid feature is a repeatable
workflow producing an output that saves time/money or reduces uncertainty, explainable in one
sentence, that someone pays for twice. Applied to what we've actually built.*

## Our features, ranked by that test

| Feature | One-sentence output | Pain removed | Pays twice? |
|---|---|---|---|
| **Collection builds** (shipped) | "The best deck you can build TONIGHT from cards you already own" | Buying cards is expensive; shoebox guilt is universal | ✅ every new commander |
| **Upgrade Advisor** (not built — highest-value gap) | "The 5 cards under €20 that most improve THIS deck" | "What do I buy next" paralysis | ✅ every paycheck |
| **Deck Doctor** (machinery exists — we built it for the internal review) | "A graded teardown of your deck: cuts, gaps, curve, with reasons" | "Why does my deck lose" | ✅ per deck |
| Sideboard/matchup guides (shipped, desktop) | "How to board against X" | Prep time | ✅ per meta shift |
| Arena export + tracker (shipped) | Table stakes | — | retention, not revenue |
| AI chat | Generic | — | ❌ the article's "chatbot personality" failure case — demote from headline feature |

## Concrete changes worth making

1. **Anchor the tiers on outputs, not tech.** Current Pro copy leads with "AI chat 50/day" — the
   weakest sellable. Re-anchor: Pro = unlimited builds **including collection builds** + Arena
   export + N Deck Doctor reports; Commander = **Upgrade Advisor** + unlimited Doctor + matchup
   guides. "ML-powered recommendations" is how, not what — copy should say *"turn your shoebox
   into a deck tonight."*
2. **Deck Doctor as the first-dollar product.** One-off €2.99 report, no subscription required —
   paste list → graded checklist (the per-deck review pipeline we ran on 2026-08-23 IS this
   product; productize the reviewer prompt + ratios doc + reference comparison). Checklists sell;
   prose doesn't (article's teardown lesson).
3. **Build credits alongside subs.** Arena players binge-build. 10 builds/€3 credit pack captures
   people who won't subscribe. (Article: charge per unit of value, not per month, where usage is
   bursty.)
4. **Affiliate margin on every "buy this" output.** Upgrade Advisor and missing-staples lists name
   cards to purchase → TCGplayer (US) / Cardmarket (EU) affiliate links. Passive revenue on the
   exact moment of purchase intent. Cardmarket matters for the EU audience.
5. **The boring B2B angle (later):** LGS tooling ("scan a buylist → sellable inventory report") —
   real pain, but a different product; parked.

## What NOT to do (article's failure list, mapped)
- ❌ Prompt-pack equivalents: "deck ideas" listicles, generic brew chat.
- ❌ Headline "AI" anywhere pain isn't named. Nobody wakes up wanting AI; they wake up wanting a
  deck that wins with the cards they own.

## Operator decisions needed (no code committed on these)
- Tier copy re-anchor (landing + pricing pages) — approve and it's a small web-agent task.
- Deck Doctor pricing (€2.99 one-off?) and whether it launches before or with payments (P4).
- Affiliate program signups (TCGplayer/Cardmarket) — accounts + program approval are operator-only.
