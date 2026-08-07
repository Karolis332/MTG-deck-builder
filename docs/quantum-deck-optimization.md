# Quantum-assisted deck optimization

Research notes (2026-08-07) on using publicly accessible quantum / quantum-inspired
hardware — primarily Japanese platforms — to strengthen the deck builder.

## Why this product is actually a good fit

Deck building is a **constrained combinatorial optimization problem**, which is the one
problem class today's accessible quantum(-inspired) hardware genuinely handles:

- Binary decision per card: `x_i ∈ {0,1}` (card i in deck or not) — with copies,
  `x_i ∈ {0..4}` encoded as binary slack bits.
- Objective: maximize pairwise synergy `Σ w_ij · x_i · x_j` (synergy matrix from the
  existing ML co-occurrence / win-rate data in `ml-training/`) plus individual card
  power `Σ p_i · x_i`.
- Constraints as penalties: deck size = 60, mana-curve buckets, color identity,
  format legality, budget.

That is a textbook **QUBO** (Quadratic Unconstrained Binary Optimization) — exactly
what annealers and Ising machines consume. This is a real feature, not marketing:
"synergy-optimal deck under constraints" is NP-hard and brute force fails at
Modern-size card pools.

Honest caveat: classical solvers (simulated annealing, Gurobi, OR-Tools) will handle
our problem sizes fine too. The quantum angle earns its keep as (a) a genuinely
strong optimization feature and (b) a distinctive story — "deck tuned on an Ising
machine" — as long as we never claim speedup we haven't measured. Benchmark both.

## Where to run it (verified access status, Aug 2026)

| Platform | Hardware | Access for us | Cost |
|---|---|---|---|
| **Fixstars Amplify** (Tokyo) | Amplify AE (GPU annealer), Toshiba SQBM+, QUDORA | Free sign-up (email), Python SDK | Free tier: ≤10 s/job, 8k–16k bits — enough for full-format card pools |
| **Hitachi Annealing Cloud** | Real CMOS Ising ASIC | Free Web API, no registration barrier found | Free (limits undocumented) |
| D-Wave Leap (direct) | Real quantum annealer (Canada/US) | Free sign-up | 1 min QPU/month free |
| IBM Quantum Open Plan | 156-qubit gate-based QPU | Free sign-up | 10 min/month — for QAOA experiments, not production |
| AIST ABCI-Q (QuEra, 260 qubits, Japan) | Neutral-atom QPU | Application + export-control review for foreigners | Min. purchase ¥220,000/yr (~€1,400) — only if this ever becomes serious |

Notes: D-Wave routed *via* Amplify is Japan-residents-only; direct Leap sign-up is
global. Fixstars Amplify live sign-up from a Lithuanian address is unverified
(page inspected, not an actual registration) — first task below settles it.

## Prototype plan

1. `pip install -U amplify` — register at <https://amplify.fixstars.com/en/register>,
   confirm the free token works from Lithuania.
2. Build the synergy matrix `W` from existing ml-training co-occurrence data
   (start with one format, e.g. Standard — pool of ~1,500–3,000 cards fits the
   free tier's 8k-bit fully-connected limit).
3. Formulate QUBO:

```python
from amplify import VariableGenerator, AmplifyAEClient, solve
import numpy as np

N = len(pool)                      # candidate cards
gen = VariableGenerator()
x = gen.array("Binary", N)

synergy = -(x @ W @ x)             # maximize => minimize negative
power   = -(p @ x)
deck_size = 80 * (x.sum() - 60) ** 2          # hard-ish penalty
curve = sum(50 * (b @ x - target_b) ** 2      # mana-curve buckets
            for b, target_b in curve_buckets)

client = AmplifyAEClient()
client.token = TOKEN
client.parameters.time_limit_ms = 5000
result = solve(synergy + power + deck_size + curve, client)
deck = [pool[i] for i, v in enumerate(x.evaluate(result.best.values)) if v > 0.5]
```

4. Benchmark against a classical baseline (simulated annealing via `amplify`'s local
   solver or OR-Tools) on the same QUBO — publish both numbers.
5. If it earns a UI feature: "Optimize deck" button → backend job → Amplify →
   suggested 60. Free-tier 10 s/job is fine for interactive use.

## Learning resources (Japanese stack, free)

- Quantum Native Dojo (QunaSys, EN/JP): <https://dojo.qulacs.org/>
- Qulacs simulator (`pip install qulacs`) for gate-based experiments locally
- Amplify docs & QUBO patterns: <https://amplify.fixstars.com/en/docs/amplify/v1/>

## Licensing boundaries (free vs paid) — verified 2026-08-07

- **Fixstars Amplify Basic (free)** is "Free Plan for Evaluation and Testing" only.
  Their FAQ defines commercial use as using the developed program "in your business
  operations and activities" or deploying it "into the production environment" —
  that requires the Standard/Premium plan (quote-based; SQBM+ via Amplify from
  ~¥300k/mo, reportedly ~3-month minimum, 1-month trial). Prototyping on free is
  fine; shipping a paid feature on free is a ToS violation.
- **D-Wave Leap**: 1 min/month of real QPU time free — development only; commercial
  use goes through Leap pay-as-you-go (per-job anneal time is milliseconds, so
  per-call cost is cents).
- **IBM Open Plan**: 10 min/month, development only.
- Practical sequence: prototype on free tiers → launch the commercial feature on a
  **classical backend** (OR-Tools / simulated annealing — no usage restrictions,
  same API contract) → switch the backend to paid quantum when revenue covers it.

## Launch plan: "the first quantum-powered MTG deck builder"

Prior-art check (2026-08-07): web + academic search found **no product or paper**
combining MTG deck building with quantum/QUBO optimization — the "first" claim is
currently available. Three truth gates before announcing anything:

1. **Real quantum hardware.** The flagship "Optimize" path must run on a real
   quantum annealer — **D-Wave Advantage via Leap**. Amplify AE and Toshiba SQBM+
   are quantum-*inspired* GPU machines; calling those "quantum powered" would be
   false and would be called out immediately.
2. **Demo + benchmarks before announcement.** The story that lands on HN /
   r/magicTCG is "here is the deck a quantum annealer assembled, here is the
   classical comparison" — numbers, not slogans.
3. **Wording discipline.** "Synergy-optimized on a quantum annealer" — yes.
   "Quantum builds the best deck" — no (deck strength isn't purely an optimization
   objective). Also review Wizards of the Coast's Fan Content Policy before any
   commercial launch — MTG is WotC IP.

Sequence: prototype on D-Wave's free minute → benchmarks → announcement with live
demo → commercial rollout on Leap PAYG.

## Full access research

The complete inventory of Japanese quantum machines and access programs (RIKEN,
Fujitsu, IBM Kawasaki/Kobe, Quantinuum Reimei, OptQC optical, AIST ABCI-Q, annealing
clouds) lives in the geo-engine repo: `docs/quantum-assessment.md` — shared research,
kept in one place.
