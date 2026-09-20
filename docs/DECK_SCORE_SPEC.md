# Deck Score specification — proposed v1, 2026-09-19
Design only. Score means competitive optimisation within a format: 100 is the calibrated ceiling, not a win percentage, price estimate, bracket, or “perfect for any chosen theme.” Bands below are acceptance targets, not measured results.
Read first: `C:/Users/QuLeR/.claude/harness/runs/deck-score-2026-09-19/{research-public,research-analytics,research-internal}.md`. This specification resolves their conflicting recommendations; constants remain provisional until held-out calibration passes.

## 1. Model, inputs, and normalisation
Use one pure module, proposed `src/lib/deck-score.ts`, with seven scored components and one zero-weight legality/structure component. No HTTP, DB access, LLM, random sampling, wall clock, price, likes, views, collection ownership, or requested power-level label enters scoring.
All counts include quantities. Separate main, commander, and sideboard zones; collapse duplicate printings by canonical card identity. Commander access is guaranteed, casting it is not. Preserve Arena rebalanced identities; never silently substitute their paper versions.
Let `N` be actual library size, `F` its nonland count, `q_i` copies, and `clip(x)=max(0,min(1,x))`. Empty positive-purpose denominators yield 0 unless explicitly specified otherwise. Keep full precision until display; component scores round to one decimal, total to nearest integer.
Define `H(N,K,n,r)=Σ[x=r..min(K,n)] C(K,x)C(N-K,n-x)/C(N,n)`, with impossible binomial terms zero and `n=min(N,n)`. Counts and sample sizes are integers; never insert fractional “virtual copies.” Validate safe positive integer quantities first; empty/invalid inputs return diagnostic components without evaluating invalid probabilities.
Commander uses `n(t)=7+t`; 1v1 uses the mean of evaluations at `n(t)=6+t` and `7+t`, not a fractional draw count. No mulligan or Arena hand-smoother bonus in v1; calibrate anchors under the same conservative model.
Normalise each component directly to 0–100 using the formulas below. Do not percentile-rank a deck within its own commander population: a weak commander must not acquire a cEDH score merely by being its best list.

| Format profile | Commander | Brawl | Standard / 60-card |
|---|---|---|---|
| Default library / commanders | 99 / 1; legal partners 98 / 2 | 99 / 1; `standardbrawl` 59 / 1 | actual N ≥ 60 / 0 |
| Players; life per opponent | 4; 40 | 2; 25 | 2; 20 |
| Legal pool / copy rule | Commander / singleton exceptions | Arena format-specific / singleton exceptions | Standard snapshot / four across main + sideboard, exceptions |
| Sideboard | none, apart from separately validated companion rules | none, apart from separately validated companion rules | 0–15 including a declared companion; excluded from main-deck counts |
| Application slugs | `commander` | `brawl`, `competitivebrawl`, `standardbrawl` | `standard`; other 60-card formats require their own calibrated profile |

These construction rules follow [Commander](https://magic.wizards.com/en/formats/commander), [Brawl](https://magic.wizards.com/en/formats/brawl), and [Standard](https://magic.wizards.com/en/formats/standard). Standard's 60 is a minimum: a 61-card main deck is legal and receives its actual consistency odds.
A dated legality snapshot includes commander eligibility, partner/background rules, banned/restricted cards, copy-limit exceptions, color identity, and Arena availability/rebalancing. Reuse `getLegalityKey` and the separate Competitive Brawl commander-ban rules; never infer the Arena pool from Commander legality.

### Deterministic feature contract
Reuse `classifyCard`, `ownAbilities`, `tagCard`, `deriveCondition`, and `ArchetypeTemplate` as primitives, not final scores. Add a versioned, local effect/plan catalogue: effective mana costs, production timing, net draw, answer targets, exact tutor predicates, typed producer/consumer requirements, and validated closing recipes.
These richer annotations are NEW design work, not fields the current classifier already supplies. Generate simple cases from oracle/types; curate exceptional costs, loops, and alternate wins by canonical identity. Catalogue entries describe mechanics, never desired scores or deck names.
For each effect, `s_i=min_j clip(compatibleSupply_j / requiredSupply_j)`; no requirements means 1. Requirements distinguish controller, zone, creature versus noncreature tokens, tribe, mana actually spent, activation cost, and timing. Impossible predicates give 0; unsupported predicates give 0.5 plus an uncertainty warning.
Opponent-dependent triggers use a fixed 0.5 availability prior, unless a stricter mechanical requirement applies; our own spells do not satisfy an opponent's trigger. Free/pitch modes require their own support; otherwise use printed casting + relevant activation cost `c_i`. X uses the smallest useful, supported mode.
Define usable effect units `e_i=q_i*s_i*min(1,2/max(1,c_i))`. Every integer K used in a probability counts only physical copies with fully verified support (s_i=1); partially supported effects retain their fractional e_i credit elsewhere. Modal alternatives share one unit budget within a component; independent effects may each contribute only where the component explicitly permits it. A card being both ramp and draw does not count twice in Karsten's cheap count.
Infer archetype from the actual typed plan: maximise satisfied essential-requirement fraction, then supported main-deck fraction, then fixed `Archetype` enum order. Generic midrange is the fallback. A builder's “Voltron” label, quotas, or cEDH request cannot choose easier norms.
Freeze inference rules and norms by score version. Existing templates supply initial bands/curve shapes; a cohort replaces a prior only with ≥30 distinct legal, reviewed positive lists. Equal weight per event/list family; Commander likes are not positive labels.
Track missing mechanical coverage separately from a known absent plan. If >20% of nonland copies have unsupported relevant mechanics, cap the result at 69 and flag “provisional: effect coverage”; use 50 for W/S only when their entire recipe family is unsupported. An understood but incoherent pile gets its computed low values.

### Weights and format norms
Weights below are fractions after division by 100; each format sums to 100. Counts are for reference libraries 99/99/60; scale count targets by actual N/reference N, including 59-card Standard Brawl. Probability and timing targets do not scale.

| Component key / UI name | Commander weight | Brawl weight | Standard weight |
|---|---:|---:|---:|
| mana / Mana consistency | 20 | 20 | 20 |
| curve / Curve efficiency | 10 | 15 | 16 |
| interaction / Interaction | 16 | 20 | 20 |
| advantage / Advantage & velocity | 14 | 12 | 10 |
| win / Win access & redundancy | 20 | 16 | 14 |
| synergy / Plan coverage | 17 | 14 | 12 |
| meta / Meta fit | 3 | 3 | 8 |
| structure / Legality & structure | 0 | 0 | 0 |

| Norm symbol / purpose | Commander | Brawl | Standard |
|---|---:|---:|---:|
| Land deadband δ; falloff width d | 2; 8 | 2; 8 | 1; 5 |
| Color-source reliability pColor | .90 | .90 | .90 |
| T2 usable-play probability pEarly | .85 | .90 | .90 |
| Interaction units E*; cheap-answer copies K* | 12; 7 | 12; 7 | 8; 5 |
| Answer-axis target B* | 2 | 2 | 1 |
| Creature / permanent / stack / graveyard-or-protection axis weights | .25/.25/.25/.25 | .40/.20/.25/.15 | .50/.20/.20/.10 |
| Draw horizon T; draw-unit target D*; velocity access pV | 6; 10; .90 | 5; 8; .90 | 4; 4; .90 |
| Fast closing turn Tfast; delay half-life h | 4; 4 | 4; 3 | 4; 2 |
| Complete-line access target pWin | .25 | .35 | .70 |
| Supported plan fraction Q* | .55 | .50 | .50 |
| Default repeatable-enabler supply per dependent payoff | 8 | 8 | 8 |
| Corpus minimum distinct lists; shrinkage prior lists | 30; 200 | 30; 200 | 30; 200 |
| Corpus age window; decay half-life, days | 180; 90 | 90; 30 | 30; 14 |
| W/L minimum matches; pseudo-matches | unavailable | unavailable until verified | 100; 50 |

Archetype adjustments: aggro multiplies E*/K*/D* by .5/.75/.5; control by 1.3/1/1.3; others by 1/1/1. No zero-target exemptions. Creatureless combo/control use their own validated curve/plan recipes, not creature quotas.
Tfast=6 only for a validated control/stax recipe that establishes a durable advantage AND retains a supported finisher; ordinary removal density cannot establish this exemption. Commander damage needs 21 per opponent; Brawl has no commander-damage shortcut ([rules 903.10/903.12](https://media.wizards.com/2025/downloads/magiccomprules%2020250919.pdf)). All-player drain and single-target damage use different output requirements.
Curve target is the normalised 0–1, 2, 3, 4, 5, 6, 7+ histogram for inferred format/archetype. Seed from `deck-templates.ts`, merging 0/1; use the existing high-cost-commander shift from `curve-score.ts`. Replace only with the frozen positive-cohort histogram above, not live percentiles.

### Component formulas, inputs, and reason templates
**Mana (M).** Inputs: physical lands, MDFC backs, nonland average MV, unique supported cheap draw/ramp copies, mana pips, production colors and timing. Let B=99 for 100-card commander formats, otherwise 60; `L*=N/B * karstenLands(B, avgMV, cheapCount*B/N)`.
Use the engine regression, not the alternative approximation in the analytics brief: 60-card `19.59+1.90*MV−.28*cheap`, clamped 16–30; 99-card `31.42+3.13*MV−.28*cheap`, clamped 28–45, rounded by `karstenLands`. `Leff=lands+.38*MDFCbacks`.
`landFit=1−clip(max(0,abs(Leff−L*)−δ)/d)`. For each spell/color pip demand r, deadline `t=max(1,min(4,ceil(c_i)))`, let `R=min{k:H(N,k,n(t),r)≥pColor}`; for 1v1 use the mean of the two success probabilities. If no k can satisfy the demand, its adequacy is 0.
`colorFit=Σ_i q_i*min_colors clip(K_color(t)/R) / Σ_i q_i`; include commanders once and treat explicit {C} as its own demand. Colorless generic-only spells contribute 1; demands exceeding the supported horizon use t=4 with their actual pip count.
Every probability's K counts library copies only. Mana K counts integer sources independently usable by t, with fetch targets and ramp prerequisites checked; unverified conditional sources earn no source credit. Fractional MDFC credit is only for Leff. A flexible source contributes once per color's marginal test; this is source adequacy, not a claimed joint casting probability.
`earlyMana=clip(H(N,K_untapped_T1,7,1)/.95)`; `M=100*(.45*landFit+.45*colorFit+.10*earlyMana)`. Reason: “{Leff} effective lands vs {L*}; {weakestColor} has {K}/{R} timely sources.”

**Curve (C).** Inputs: copy-weighted supported effective casting costs, histogram h, target h*, and Kplay = useful, supported nonland plays costing ≤2 (exclude dead modes and land-only tutors with no targets).
`TV=.5*Σ_b abs(h_b−h*_b)`; `early=clip(H(N,Kplay,n(2),1)/pEarly)`; `C=100*(.70*(1−TV)+.30*early)`. Empty nonland deck gives 0. No separate “cheaper always better” bonus.
Reason: “{largestGapBucket}-drops {actual}/{target}; {earlyProbability}% chance of a useful play by turn 2.”

**Interaction (I).** Inputs: removal, counters, wipes, protection and supported preventative effects; use e_i, not the classifier's primary category. `E=Σ_i max_answer_modes(e_i)`; Kcheap counts physical supported answer copies with c≤2 once.
Split each card's answer units equally among the axes it answers; `breadth=Σ_axis weight_axis*clip(E_axis/B*)`. Wipes count one resource, with their actual total mana cost; a mode that destroys its own required engine receives s=0 unless a surviving or rebuilding route is verified.
`I=100*(.55*clip(E/E*)+.25*clip(Kcheap/K*)+.20*breadth)`. Interaction above the targets cannot compensate for a missing plan. Protection contributes to its own axis, not automatically to removal or stack answers.
Reason: “{E}/{E*} effective answers, {Kcheap}/{K*} cheap; weakest coverage: {axis}.”

**Advantage / velocity (A).** Inputs: net immediate cards g_i after spending the spell and mandatory discards/sacrifices; repeatable net cards a_i per activation; earliest activation t_i; repeat interval τ_i≥1; cheap selection/cantrip/draw roles.
For each supported draw effect, `v_i=clipTo[0,4](g_i+a_i*min(2,max(0,1+floor((T−t_i)/τ_i))))`, or 0 when t_i>T; `D=Σ_i e_i*v_i`. This is a bounded draw-capacity proxy, not a simulated number of cards drawn. Cast and activation costs enter c_i.
Kvel counts supported ≤2-mana cantrips, selection or draw spells once; raw tutors earn no draw units, and target-specific tutor access belongs in W. `A=100*(.65*clip(D/D*)+.35*clip(H(N,Kvel,n(T),1)/pV))`.
A repeatable commander effect contributes its supported units once, with casting/activation timing; no free automatic draw credit. Reason: “{D}/{D*} draw units by turn {T}; {Kvel} cheap velocity cards.”

**Win access / redundancy (W).** Inputs: actual cards, supported tutors, commander(s), typed closing recipes and resource prerequisites. Do not score `WinPlan.missingPieces.length`: it lists optional near-misses, and a named combo pair need not win.
The local catalogue covers compact combo, aristocrats/drain, creature pressure, token conversion, Voltron, alternate win, and control inevitability. Each recipe specifies ≤4 role pools with integer requirements r_j, ≤8 ordered actions with costs/delays/resource changes, a finish predicate, and critical nonland resources.
Pools use bounded cost/output bins: action costs upper-bound every eligible member/path, and outputs lower-bound them. Split faster or stronger alternatives into catalogue variants; never attach the cheapest tutor's timing to a pool containing slower tutors.
A finish predicate must defeat every remaining opponent: 3×40 combat damage or 21 commander damage to EACH opponent in Commander, 25/20 life in Brawl/Standard, or a mechanically verified alternative. Infinite mana without an outlet is not a win; Food is not a creature without a conversion effect.
Retain at most 8 recipes by essential-requirement coverage, supported-card coverage, then stable recipe ID. This bound and the catalogue are versioned. Missing essential resources invalidate a recipe; unsupported mechanics create a diagnostic, never an invented combo.
First satisfy/decrement guaranteed commander requirements and drop pools with r_j=0. Assign overlapping library cards to one eligible pool using lowest physical coverage K_j/r_j, then pool ID; process the ≤15 membership masks in numeric order. Assign each eligible tutor once to the least-covered reachable r_j=1 pool, with extra mana/delay in the recipe; exclude tutors for r_j>1.
Only present legal main-deck targets qualify; tutor and target must be distinct, mutually compatible resources. This conservative fixed assignment is an access proxy, not optimal tutoring. It never lets one tutor satisfy two pieces, nor treats all its possible targets as fractional copies.
After removing guaranteed command-zone slots, disjoint-pool access is exactly
`J_l(n)=[z^n]{(1+z)^(N−ΣK_j) * Π_j(Σ[x=r_j..min(K_j,n)] C(K_j,x)z^x)} / C(N,n)`.
Compute coefficient products truncated to n; no independent-piece probability multiplication. Repeated physical copies stay in the same pool. For a commander-only requirement, access is 1 but mana readiness still applies.
Define `ready_l(t)` as 1 iff its fixed action order executes by t under a greedy earliest-affordable schedule, assuming pieces accessible and one on-color land drop/turn. Carry only permanent resources across turns; use only recipe-listed acceleration, respect summoning sickness/activation costs, and debit resources once. Otherwise 0.
The abstract land choice fills the next action's largest colored deficit (tie W/U/B/R/G/C), otherwise supplies generic mana; unused mana empties each turn. Catalogue variants supply alternative action orders. This is at most 12×8 steps per recipe, not an exhaustive schedule search.
This is a conditional goldfish scheduling proxy, not a game simulator or probability of winning. For t=1..12, `u_l=max_t ready_l(t)*clip(J_l(n(t))/pWin)*2^(−max(0,t−Tfast)/h)`; mana uncertainty is separately gated by M.
Let u1 be the best line; u2 the best line with disjoint critical nonland resources (commanders count as critical). Let `protect=clip(H(N,Kprotect,n(Tfast),1)/.70)`, counting only cheap protection/recovery that actually preserves or restores u1's required resources; exclude copies already consumed or required by that line.
`W=100*(.85*u1+.15*max(u2,u1*protect))`; no valid supported line gives 0. One fast, protected line can outperform several fragile overlapping lines; generic “win_condition” tags earn nothing alone.
Reason: “{bestRoute}: access {J}% by T{t}, {sharedBottleneckOrIndependentBackup}; {missingPrerequisite}.”

**Synergy / plan coverage (S).** Inputs: typed producer/consumer support s_i, actual inferred plan, and template requirement bands. Match fixed resource bitsets against aggregate supply; do not call the quadratic ISS graph.
Let onPlan_i=1 for a direct supplier/consumer of a real plan requirement, 0 off-plan. Generic infrastructure uses `onPlan_i=min(1,roleUpperBand/roleCopies)` for its primary role, only alongside a valid threat/closing route. Then `Q=Σ_i q_i*s_i*onPlan_i/F`; each copy receives at most one unit.
`R=min_j clip(supportedSupply_j/requiredSupply_j)` over essential plan requirements; targets use the selected template's lower bands and the typed enabler norm where no specific band exists. An unrecognised template key is uncertainty, never automatic satisfaction.
`B=Σ_dependentPayoffs q_i*s_i / Σ_dependentPayoffs q_i`; B=1 for a verified plan with no dependent payoffs, otherwise 0 when empty. `S=100*(.40*clip(Q/Q*)+.35*R+.25*B)`.
Generic combat/control plans have threat, deployment and protection/interaction requirements; they do not require commander resource edges. ISS=0 alone therefore cannot force S=0. Reuse ISS only as a separate diagnostic, never as an additive bonus.
Reason: “{Q}% supports {inferredPlan}; weakest dependency {requirement} {supply}/{target}; {deadPayoffs} unsupported payoffs.”

**Meta fit (Fmeta).** Inputs: frozen, legal, format/context-matched inclusion and baseline inclusion, dated Standard W/L, cohort sizes, optional pre-normalised CF percentiles. Never consume price, EDHREC rank, likes/views, EDHPowerLevel, bracket or the existing popularity-heavy benchmark total.
Build aggregates offline: deduplicate canonical list/event families; sum split card rows per deck/board before counting inclusion; apply age weight `2^(−ageDays/halfLife)` within the table's window. Commander observation date is not an event date; Standard W/L requires a real event date.
Let p0 be same-format/color/archetype baseline inclusion with Beta(1,1) smoothing; `p=(included+20*p0)/(cohortLists+20)`; `zLift=clamp(log2(p/p0)/3,−1,1)`; `rho=cohortLists/(cohortLists+200)`, set to 0 below 30 distinct lists. Included/cohort counts and W/L in the formulas are age-weighted; minimum-sample gates use unweighted distinct lists/matches.
CF must be an offline percentile in the same legal commander/archetype/role candidate population and model version: `zCF=2*percentile−1`; missing CF is 0. Never normalise within the submitted deck or call /recommend while scoring.
Commander/Brawl: `m_i=onPlan_i*(.5+s_i*rho*(.4*zLift+.1*zCF))`. No W/L is fabricated from the 3.9M Commander lists; Brawl uses only Brawl data, otherwise neutral.
Standard: baseline b is the same-archetype cohort W/(W+L); `r_i=(W_i+50*b)/(W_i+L_i+50)`; `zWL=clamp((r_i−b)/.10,−1,1)`, zero unless ≥100 matches and ≥30 distinct lists; `m_i=onPlan_i*(.5+.5*s_i*rho*(.7*zWL+.3*zLift))`.
`Fmeta=100*Σ_nonland q_i*m_i/F`. With no usable context or F=0, return 50 and an evidence warning; for a missing card statistic use m_i=.5*onPlan_i. Never redistribute weight. Outcome associations are not causal card win rates; known off-plan cards earn 0, so substituting a popular dead card cannot improve meta fit.
Reason: “{context}: {sample} dated lists, {coverage}% coverage; {outcomeEvidence|inclusion-only|insufficient data}; snapshot {id}.”

**Legality / structure (G).** Inputs: all zones, exact sizes/copy counts, commander rules, identity, format/Arena legality snapshot and unresolved entries. G=100 when all required rule checks pass, 50 when only unknown checks remain, 0 on any rule failure; its weight is always 0.
Reason: “{passed}/{required} rule checks verified; {firstFailureOrUnknown}; cap {cap|none}.” Ownership, export spelling, locks, desired bracket and generic plan-gate warnings remain separate workflow diagnostics.

## 2. Gated composition and optimiser explanations
Choose gated arithmetic composition: `base=Σ_components weight_i*score_i`; `qualityCap=20+.8*min(M,W,S)`; `score=round(clamp(min(base,qualityCap,...hardCaps),0,100))`.
The weighted mean gives transparent point contributions; the essential-component cap prevents excellent curve/quotas from hiding absent mana or a win plan. Unlike a geometric mean, the 3% inclusion signal can change the final score by at most 3 points (8 for Standard meta), even at extreme values.
Hard caps: invalid/nonpositive/non-safe-integer quantities, empty deck, or missing/invalid commander configuration → 0; wrong singleton-format size, Standard main <60, illegal card, excess copies, off-identity, invalid sideboard → 19; unresolved cards or unknown required legality/Arena data → 39. All applicable caps remain visible; most restrictive wins.
A 61-card Standard list passes size; a 101-card Commander/Brawl list does not. Companion exceptions require explicit validation. Never copy a blanket `GateVerdict.fail`: the existing gate also fails ownership, which is not intrinsic deck quality.
Quality cap, mechanical-coverage cap, and rule caps are returned separately in gates; component scores remain diagnostic even when capped. Under an active gate, a useful repair may improve a component without changing the total.
For a proposed swap, rescore both complete decks against identical snapshots; show Δcomponent and Δtotal plus a gate change if any. Do not promise that +5 Synergy equals +5 overall. If archetype inference changes, explicitly identify the changed profile.

## 3. Interface and engine seam
Type declarations below are proposed; existing types are imported by their actual names. New snapshot structures are plain data built before scoring; they contain no DB handles or callbacks.
```ts
import type { DbCard } from './types';
import type { ResolvedCard } from '../../services/build-api/analysis-core';
import type { MetaCardStat, ArchetypeStat } from './meta-queries';
type ScoreFormat = 'commander' | 'brawl' | 'competitivebrawl' | 'standardbrawl' | 'standard';
type ComponentKey = 'mana' | 'curve' | 'interaction' | 'advantage' | 'win' | 'synergy' | 'meta' | 'structure';
type CorpusCard = MetaCardStat & {
  baselineInclusion: number; distinctLists: number;
  effectiveIncluded: number; effectiveCohortLists: number;
  effectiveWins: number; effectiveLosses: number;
  archetypeBaselineWinRate: number | null; cfPercentile: number | null;
};
interface ScoreCorpusSnapshot {
  id: string; asOf: string; format: ScoreFormat;
  // Context = format + commander identities / inferred archetype; values already windowed.
  cardsByContext: Readonly<Record<string, Readonly<Record<string, CorpusCard>>>>;
  archetypes: readonly ArchetypeStat[];
}
interface DeckScoreInput {
  format: ScoreFormat;
  main: readonly ResolvedCard[];
  commander: readonly DbCard[]; // [] Standard; one Brawl; one or valid pair Commander
  sideboard: readonly ResolvedCard[];
  companion?: DbCard; // separate from sideboard input; counts toward its limit/copy checks
  unresolved: readonly { name: string; quantity: number; board: string }[];
  cardDataVersion: string; // one frozen oracle/legality/effect dataset, including Arena availability
  corpus: ScoreCorpusSnapshot | null;
}
interface DeckScoreResult {
  score: number;
  components: { key: ComponentKey; score: number; weight: number; reason: string }[];
  gates: { key: string; kind: 'rules' | 'quality' | 'evidence';
    status: 'pass' | 'warn' | 'fail'; cap: number | null; reason: string }[];
}
declare function scoreDeck(input: Readonly<DeckScoreInput>): DeckScoreResult;
```
The module's frozen effect catalogue/norms (including positive-cohort curves) carry the score version; corpus removal cannot change them. CorpusCard extends raw MetaCardStat without changing its count semantics; effective fields supply the weighted formula inputs. Dataset/version mismatches cap at 39 and yield an evidence gate. Standard inputs do not need a fake commander or `AnalysisCore`, whose current assembler assumes one.
Reuse `ResolvedCard` now; a later implementation may move that type to a shared type module. `AnalysisCore.winPlan` and `GateVerdict` can inform adapters, but their summaries cannot replace raw cards or the rule-only checks.
Replace the old `deck-optimizer.ts:scoreDeck(ratioScore,issues,landDelta)` at integration time; do not blend it with this result. The hardcoded 70 is only in `scripts/standard-from-collection.ts`, not the live optimiser.
O(cards) feature accumulation plus bounded tables: fixed archetypes, ≤8 recipes, ≤4 pools, ≤12 turns, degree ≤19 probability polynomials. Mana-source requirement tables are precomputed for supported N/deadlines or computed by bounded recurrence; no corpus scan, pair graph, or unbounded combo search.
Budget target: <20 ms per 100-card deck after classification on reference desktop hardware; measure during implementation. Cache compiled card facts and corpus lookups by version; arithmetic and tie-breaking use stable feature/recipe ordering, not input order.

## 4. Calibration and adversarial acceptance
First freeze oracle/legalities, the effect/recipe catalogue, reference lists and corpus cutoff at 2026-09-19; score historical decks with the appropriate legal snapshot when comparing historical results. Illegal-as-of-snapshot lists are not positive training anchors.
Standard positives: recent dated Challenge/top-level event winners plus 5–0 league lists as a separate cohort; use all available W/L for outcome checks, including losers. Split chronologically by event, grouping near-duplicate list families so no train/validation/test overlap survives.
Commander positives: verified cEDH event/primer lists, expert-reviewed powerhouse lists, untouched WotC precons, and constrained random legal piles. Commander popularity may provide sampling strata, never a performance label. Hold out commanders and whole precon products; Brawl requires separately reviewed legal Arena lists.
Initial weights/norms are the tables above. Search weights in 1-point steps within ±4 of each initial core weight, constrained to sum 100; fix meta at 3/3/8 and structure at 0. Search a finite norm grid using one shared count multiplier per format {.85,1,1.15}, pWin ±.05, h ±1, and quality-cap intercept {15,20,25} with slope (100−intercept)/100. Cache features, prune dominated settings on training folds, then run finalists across stratified corpus samples.
Optimise `loss=mean_groups(mean_decks(distance(score,[lo,hi])^2))+4*mean_pairs(max(0,5−(score_stronger−score_weaker))^2)+.1*Σ(weights−initial)^2`; normalise groups equally, not by the 3.9M Commander population. Break ties by smaller parameter change, then lexicographic parameter order.
Fix mechanical parser/recipe failures before tuning; never add commander/card-price-specific score offsets to force anchors. Freeze the winning parameters once, then evaluate untouched holdouts. Report interval coverage, median absolute band distance, pairwise ordering, and bootstrap uncertainty by event/commander.
Release targets: ≥90% of reviewed positive anchors in their intended bands; ≥95% of constrained random legal piles <25; no illegal structural vector >19; both required Meren/Cabbage anchors and the untouched precon must meet their bands. Also report tails by archetype, colors, budget quartile, commander age, and outcome-source coverage; a failed cohort blocks “calibrated” labelling.
Price/popularity checks: changing every price or EDHREC rank must change nothing; remove/permute corpus/CF popularity data with frozen norms and require |Δtotal|≤3/3/8. Replace a supported engine with an expensive, high-inclusion, incompatible same-MV/role card: S/W must not improve and overall must not increase.
Quota-gaming checks: preserve lands, MV histogram, primary-role counts and total price while breaking producer/consumer compatibility, tutor targets, Food→creature conversion, or combo mana/outlet requirements. Each broken essential path must lower W/S or activate the quality cap; quota-perfect random piles must remain <25.
Additional invariants: deck order/printing choice invariant; merge/split quantity rows invariant; no NaN/Infinity; exact size/copy/identity caps; single tutor cannot complete two missing pieces; optional near-miss combos never penalise a complete alternate plan; broad unsupported mechanics produce uncertainty rather than false confidence.
Do not fit and grade against the same per-card outcome aggregates: rebuild each fold's snapshots using training events only. Include adversarial role- and curve-matched negatives, budget-equivalent positives, mono-color/5-color, fast combo/fair combat/control, and unsupported-new-card holdouts.

## 5. Concrete repository test vectors
These are proposed bands, not executed scores. Resolve explicit commander zones; for flat paper lists remove the named commander from main. Brawl positive bands are review hypotheses, not claims of measured Arena strength. Gate bands override quality bands. All named files were inspected; database records below were read with SQLite mode=ro, immutable=1.
| Fixture / exact selector | Profile; expected band | Purpose |
|---|---|---|
| `decks/paper/proposals/meren-powerhouse.txt` | Commander; 65–80 | Required 100-card powerhouse anchor; resilient sacrifice/value plan |
| `verify-2026-09-19/cabbage-cedh-input.txt` | Commander; 35–50 | Required reviewed web build; cross-check `verify-2026-09-19/cabbage-cedh-review.md`; unsupported Food/go-wide/Voltron bridges |
| `verify-2026-09-09/precon-witherbloom-list.txt`; commander Willowdusk, Essence Seer | Commander; 40–55 | Existing 100-card Witherbloom Witchcraft precon fixture; verify unchanged against its JSON provenance before labelling golden |
| `decks/paper/decks/the-cabbage-merchant.txt` | Commander; 55–70 | 100-card Food deck with real conversion/payoff support |
| `decks/paper/decks/imotekh-the-stormlord.txt` | Commander; 45–65 | 100-card artifact/graveyard plan; catalogue coverage check |
| `decks/paper/decks/tazri-beacon-of-unity.txt` | Commander; 40–60 | 100-card five-color plan; mana and typed party coverage |
| `decks/paper/decks/meren-of-clan-nel-toth.txt` | Commander; 0–19 | As stored: 101 cards; do not silently remove Creakwood Liege to hit the powerhouse band |
| `decks/paper/decks/ramos-dragon-engine.txt` | Commander; 0–19 | As stored: 3 cards, an incomplete list |
| `decks/brawl/cabbage-merchant-current.txt` | Brawl; 0–19 | As stored: 101 cards; Arena legality may add further failures |
| `decks/brawl/tazri-upgraded-arena.txt` | Brawl; 45–65 if rule-valid | 100-card singleton; use Arena versions and five-color source demands |
| `decks/brawl/kuja-genome-sorcerer-arena.txt` | Brawl; 60–80 if rule-valid | 100-card spell-trigger pressure; 25-life rather than pod damage |
| `decks/brawl/vivi-battery-arena.txt` | Brawl; 70–85 if rule-valid | 100 cards; A-Vivi, activation timing and untap/mana prerequisites |
| `decks/brawl/fire-lord-azula-competitive.txt` | Competitive Brawl; 75–90 if rule-valid | 100 cards; commander ban check and real line support despite generic plan-gate failure |
| `decks/test-builds/refs/thrasios-tymna/cedhtop16.json`, `decks[2]`, ID `RW50cnk6MjI5MzU1` | Commander; 85–100 if rule-valid | Ballon Con 6, placement 1, 4–1; 98 listed cards plus Thrasios/Tymna; Oracle/Consultation/Pact |
| `data/export-standard.db`: `community_decks.id=1445893`; join cards by `community_deck_id`, SUM(quantity) per name/board | Standard; 85–100 if rule-valid | Univerce, Jund, Standard Challenge 32, 2026-09-07, placement 1, 8–1; 60+15 |
| Same DB, `id=1445867`, same aggregation | Standard; 85–100 if rule-valid | aljce, Jeskai, 2026-09-08, 5–0 league; distinct evidence from winning an event |

Do not treat `decks/test-builds/*--winning-reference.txt` as cEDH positives: their headers identify EDHREC averages. The actual event JSON above is a different provenance source.
Random controls: freeze the legal card universe hash; for seeds 0–999 order eligible canonical IDs by SHA-256(seed + ID), take the first nonbasic cards to fill the format with its recommended basic-land count and fixed legal commander, without replacement in singleton. Retain the generated full lists during later calibration; target 0–24, including a separate role/curve-constrained generator.
No scoring implementation or calibration run is part of this document. Fixture legality, catalogue completeness, other precons, and broad Brawl/cEDH holdouts still need verification before claiming the numerical targets are achieved.

## 6. Operator questions
1. Confirm that the product's one score measures competitive optimisation within a format; should “optimised for this theme/budget” become a separate later measure?
2. Which additional untouched precons, fair-combat cEDH-adjacent decks, and reviewed Brawl lists should be held out as operator-approved anchors?
3. Should Standard v1 explicitly mean main-deck/BO1 quality, as specified here, or include a separately calibrated BO3 sideboard-readiness component?
4. Who owns review/versioning of exceptional effect and closing recipes, particularly Arena rebalances and uncatalogued combos?
5. Should the UI suppress a provisional total when mechanical/legality coverage is incomplete, while retaining all component diagnostics and caps?

## 7. v1.1 norm revision (2026-09-19)

Every number here is MEASURED with `scripts/deck-score-calibrate.ts probe` on the frozen 2026-09-19 card data, not predicted. Dataset: the 16 §5 fixtures, all 30 cEDH Top-16 lists, 213 dated Standard positives and 93 negatives from `data/export-standard.db`, and 200 constrained random piles.

**Why v1.0 misses every band.** In all four cohorts the total equals the quality cap and the cap equals `20+.8·W`: Standard positives median W 16.2 → total 33; cEDH median W 42.5 → 54; piles median W 0 → 20. W is the only lever and it decays too early. `Tfast=4` charges a deck half its score for closing two turns "late", but the measured `t*` of a Standard Challenge winner is 6 and of a curated Commander deck is 11. The exponential shape is right; its centre was wrong.

### 7.1 Revised constants

| profile | Tfast | h | pWin | poolSizeCap | cap intercept |
|---|---|---|---|---|---|
| commander | 4 → **7** | 4 → **6** | .25 → **.20** | 6 → **4** | 20 (unchanged) |
| brawl | 4 → **6** | 3 → **4** | .35 → **.30** | 6 → **4** | 20 (unchanged) |
| standard | 4 → **6** | 2 (unchanged) | .70 → **.60** | 6 → **4** | 20 (unchanged) |

`poolSizeCap` moves into `FormatNorms`; 4 beats 6 on anchors (6/16 vs 4/16 measured) because a 6-copy pool prices access for more threats than the schedule actually needs.

Reachability, measured at these constants:

| class | t* | W | total | band | verdict |
|---|---:|---:|---:|---|---|
| Standard winner (univerce) | 6 | 85.0 | 70 | 85-100 | ceiling 70 |
| cEDH Top-16 (ballooncon6) | 7 | 67.8 | 69 | 85-100 | coverage cap 69 |
| Commander powerhouse (Meren) | 11 | 57.1 | 66 | 65-80 | IN |
| precon (Witherbloom) | 12 | 47.7 | 58 | 40-55 | 3 high |
| Brawl (Azula / Kuja) | 7 / 9 | 83.3 / 53.6 | 83 / 63 | 75-90 / 60-80 | IN / IN |
| random pile (median / max) | – / 12 | 0 / 46 | 20 / 63 | < 25 | 34 of 200 ≥ 25 |

Anchors in band go 4/16 → 7/16 from these five numbers alone.

**Two bands are unreachable for reasons W cannot fix.** Forcing W to 100 and re-scoring:
- Standard positives have median M 84.8 and S 65.0, so the cap is `20+.8·65 = 72` and the weighted base tops out at `55.9+.14·100 = 69.9`. The 85-100 band needs the synergy and interaction catalogues (median I 44.8), not `Tfast`.
- 26 of 30 cEDH lists trip the §2 coverage cap (>20% of nonland copies unsupported) and are pinned at 69.

Until the effect catalogue covers those cards, §5's three 85-100 rows cannot be met by any norm set. Either the catalogue is extended (v1.2) or the bands move; calibration cannot decide it.

### 7.2 Finish predicate: keep whole-table (3×40)

Measured on the same schedule at both targets: at 3×40, 19 of 200 random piles reach `t* ≤ 12`; at 1×40, **200 of 200** do, at median `t*` 8 — faster than the curated Cabbage list (9) and the precon (8). The whole-table predicate IS the pile guard, and "first opponent eliminated" would hand every pile a fast line and destroy the §4 "<25" target. Keep 3×40. The defensible v1.2 variant is a GATED single-opponent target: interaction density separates cleanly (pile E median 2.8, p99 6.7, max 8.2 against cEDH 9.8 and the reviewed Cabbage cEDH list 11.2), so allowing 1×40 only when `E ≥ 9` admits combo/control lists and excludes all 200 piles.

### 7.3 Pressure dominance

Pressure (plus its token/Food variant) wins `max u` on 9 of 16 fixtures; drain, control and Voltron win on none. They are not losing a comparison, they are disabled by thresholds: drain needs 40 damage at 1-2 triggers per turn (>20 turns), and control's `E ≥ E*` gate with `E* = 12` clears on 1 of 30 cEDH lists (measured E: piles 2.8, precon 2.2, Meren 7.8, cEDH 9.8). Acceptable for v1.1 — a deck that also has a pressure line loses nothing — but the minimal correction is to gate the control exemption at `0.75·E*` (= 9), the same threshold 7.2 derives, which no pile reaches. That is a recipe change, not a norm, so it is out of v1.1.

Structural limit worth recording: at `t* ≥ 11` the goldfish schedule cannot separate a random pile from a fair Commander deck, because it measures power density and a 99-card random legal pile has more of it (median creature power 90) than the curated Meren list (105) or the precon (80). Every setting of (Tfast, h, pWin, poolSizeCap) leaves the same 34 of 200 piles above 25; only the pile maximum moves (41 → 63). The ≥95% target therefore needs a recipe or coverage change, not a constant.

### 7.4 The §4 grid, re-centred

Search per profile independently (a Standard tuning cannot move a Commander deck): weights ±4 of the §1 table in 1-point steps summing to 100 with meta fixed at 3/3/8 and structure 0, by greedy 1-point transfer rather than enumeration; one shared count multiplier {.85, 1, 1.15}; `pWin` ±.05; `h` ±1; `Tfast` ±1; `poolSizeCap` {4, 6, 10, 19}; quality-cap intercept {15, 20, 25} with slope `(100−intercept)/100`. Loss is §4 verbatim. Standard splits chronologically by `event_date` (oldest 60% train); Commander holds out 10 of 30 cEDH lists and scores the full 200 piles only at validation.

Acceptance to declare "calibrated": anchors ≥ 12/16; ≥95% of piles < 25; Standard positive median ≥ 85 and negative median ≤ 60 on the validation split; cEDH median ≥ 85; precon in band. On the evidence above the three cohort medians cannot pass until the catalogue work in 7.1 lands, so a v1.1 run reports them as measured, not as achieved.

**Frozen outcome (v1.1.0).** The run is `verify-2026-09-19/deck-score/calibration.md`; 187,011 candidates in 119 s. Held-out losses, section-7 centre → searched winner: commander 212.4 → **163.7**, brawl 501.8 → **0.2**, standard 1775.8 → 1856.2. Two settings were rejected, both recorded in the run: the Standard winner (it loses to the centre on the chronological split, so Standard freezes at the centre) and a per-format quality-cap intercept (§2 defines it globally, and Brawl's preference for 15 rests on n=5). Intercept 25 is dropped from the §4 set entirely — the intercept is a floor, so 25 puts every random pile at exactly 25 and makes the "<25" release target unreachable by construction. Frozen: commander `pWin .15, h 5, Tfast 7, poolSizeCap 10`; brawl `count ×.85, pWin .25, h 4, Tfast 6, poolSizeCap 4`; standard `pWin .60, h 2, Tfast 6, poolSizeCap 4`; weights unchanged in all three; cap `20+.8·min(M,W,S)`. Measured effect: anchors 4/16 → **7/16**, piles ≥25 8/50 → **4/50**, and the control-inevitability family fires for the first time (Kuja, Vivi) because the Brawl count multiplier lowers `E*` to 10.2.

## 8. v1.2 design decisions (review)

Reviewed 2026-09-20 against §7, the harness calibration report, [calibration.md](../verify-2026-09-19/deck-score/calibration.md), [report.md](../verify-2026-09-19/deck-score/report.md), and the scoring sources. These decisions supersede the identified rules for a future v1.2.0; numerical expectations below are design targets, not new measurements.
Evidence boundary: acceptance remains FAIL 2/6. The 34/200 pile failures describe probes; frozen validation has 20/200, and the fixture report has 4/50. The Standard 69.9 ceiling is a median-component diagnostic, not a bound on every deck (validation maximum 79). Do not merge these populations or runs.

**60-card plans and S.** Infer plans from the whole deck, including commanders as available resources; `inferArchetype([])='midrange'` must cease choosing every Standard profile. Score explicit generic aggro, midrange and control recipes alongside mechanical engines; choose by §1's deterministic essential-support/coverage ordering.
Each recipe declares essential roles, useful cost/output bins, deployment deadlines, lower/upper supply bands and compatible resource predicates. Seed 60-card bands from reviewed same-format lists, then freeze them; do not scale Commander template quotas into Standard.

Aggro requires deployable pressure plus reach/protection/reload appropriate to its clock; midrange requires timely threats, relevant answers and sustained value; control requires early stabilisation, an advantage engine and an accessible supported finisher. Tokens, animated artifacts/lands and planeswalker output may fill threat roles; a `win_condition` tag or commander edge is unnecessary.
No generic plan requires ramp, sacrifice outlets, creature counts or dependent payoffs unless its actual route consumes them. Deployment is a useful-play/access requirement, not a ramp quota. This explicitly replaces the universal template requirements: present `computeSynergy` can have saturated Q/B but R=0, producing exactly S=65.

Define `R=min_j clip(verifiedUsefulSupply_j/requiredSupply_j)` over that recipe's essentials; include timing and actual targets, never raw category totals. For real dependent payoffs, B is copy-weighted fulfilment of ALL typed requirements, not presence of one Food/token/outlet. B=1 for a mechanically verified dependency-free recipe; known absence of any plan gives R=B=0; unknown mechanics use the evidence policy below.

Q counts each supported nonland copy at most once toward ONE compatible plan: direct producers/consumers, threats meeting its output/deployment bins, and bounded infrastructure serving those roles. A body, keyword, tutor or removal tag alone is insufficient; tutors need compatible present targets. Infrastructure retains recipe upper bands and earns no more Q mass than the directly supported plan cards it serves.

**Pile separation belongs to S.** Replace the additive S formula with `S=100*clip((Q-.30)/(.70-.30))*R*B`; .30 is the unstructured baseline and Q*=.70 the saturation target for all three profiles. These are frozen starting priors for v1.2 validation, not measured estimates. Q/R/B no longer supply independent additive credit that can conceal a missing essential role.
Expected checks after typed annotation: at least 95% of constrained piles have S<=5 (typically Q=.10-.30, hence S=0); Meren has Q>=.70, R>=.90, B>=.95, hence S>=85.5. The precon's life-gain/counter/drain plan should retain S>=70 despite low I; generic tournament Standard should reach S=80-100 without specialised engine tags.

The existing quality cap then gives piles `20+.8*5=24`, while high Meren S leaves W as its limiter. Merely reducing pile S to 30 would allow 44 and does NOT meet the pile target. Unknown coverage is not known incoherence and must not manufacture S=0.

These are falsifiable predictions: validate untouched quota/curve-matched piles and coherent fair aggro/control decks, not just this one commander. If separation and preservation targets cannot both be met, reject this S design before release; do not force separation with popularity or an I threshold.
S alone will not restore Meren's total: frozen W=42.7 caps it at 54.2; an unrounded total of 65 requires W>=56.25. Its typed sacrifice/recursion/closing routes must be represented before claiming that anchor passes.

**Missing meta.** Fmeta=50 carries zero weight throughout v1.2. Freeze core weights `w'_i=w_i/(1-w_meta)` once per profile: divide the original core fractions by .97 for Commander/Brawl and .92 for Standard; structure/meta weights are 0. Retain meta diagnostics and missing-evidence warnings.
This is an explicit version-level exception to §1 “Never redistribute weight”, not a per-deck missing-data switch: supplying/removing a snapshot cannot select different v1.2 weights. Restore scored meta only in a subsequent version with a real validated snapshot builder and fresh calibration.

Renormalisation alone changes the cited Standard base ceiling from 69.9 to `(69.9-4)/.92=71.6`; it cannot repair S/I or W=0. For illustration only, S=95 and I=80 instead of 65/44.8 lift that same W=100 arithmetic scenario to 83.2; neither change is a measured forecast.

**Minimum typed-effect catalogue.** Use all 303 `cedh_staples WHERE format='commander'` rows as a review queue, plus copy-weighted Standard inclusion from the frozen training corpus. Neither `power_tier`, staple membership nor inclusion is a mechanical annotation or a score bonus. Resolve canonical identities and snapshot legality first; never transfer Commander legality to Brawl.
The minimum is coverage-defined, not “303 flags”: cover >80% of nonland copies in EACH legal cEDH and tournament-Standard reference list, and 100% of every selected closing recipe's critical mechanics. Add entries in descending uncovered copy mass, stratified by archetype, until those conditions hold; require the same >80% coverage on >=95% of fresh holdouts. Do not claim the family list alone proves coverage.

Each entry has canonical oracle identity, face/Arena variant, oracle-text hash, source/review provenance, explicit known/partial/unknown mechanics and typed effects. Each effect records mode, controller/zone/target filters, prerequisites and required supply, coloured cast/activation/additional costs, timing/once-per-turn/sickness, resources consumed/produced, output bounds and shared mode budget.
A copy counts as mechanically covered only when all its score-relevant effects/conditions are typed; matching one regex/category is insufficient. Keep copy-weighted coverage separate from whether its known requirements are satisfied.

- Mana family: rocks/dorks, rituals, sacrifice/Treasure acceleration, fetch/MDFC/conditional sources and free/pitch costs; encode colour, net mana, availability turn, imprint/discard/sacrifice prerequisites and one-shot versus repeatable output. Dockside-style opponent-board production requires its typed condition and a legal historical snapshot.
- Advantage family: ordinary draw, reveal-to-hand/life payment (Ad Nauseam), delayed cards (Necropotence), opponent-trigger/tax engines (Rhystic Study, Mystic Remora), wheels/loot, impulse/cast permissions and top-library selection (Sensei's Divining Top). Record net cards, life/library budgets, payment/trigger priors, delay, activation frequency and shuffle/untap support where the claimed mode needs it; selection is not net draw.
- Answer family: damage, exile, edicts, bounce, counters/taxes, discard, graveyard hate, protection, wipes and preventative permanents; encode target axes/restrictions, full costs and modal exclusivity. This must repair missed Standard I effects (median 44.8), not merely mark cards “supported”.
- Engine family: sacrifice/fodder, recursion/reanimation/graveyard casting (Underworld Breach's mana/exile fuel), ETB/death triggers, lifegain/life-payment/counters, creature versus noncreature tokens, artifact/tribal/spell conditions and conversions. Include Meren/Witherbloom dependencies and the actual Standard token/craft/animation families; repeated effects need resource budgets.
- Closing/tutor family: exact search filters/destination/delay; typed body/token power including characteristic values, haste/evasion, crew/animation, pumps/equipment costs, single-target versus all-opponent drain, verified loops and library/alternate-win predicates. Simulacrum Synthesizer's artifact threshold and Construct sizing must produce a supported Jeskai route; its present W=0 is a coverage failure, not evidence of no win plan.

Version compiled catalogue, plan recipes and norms together with score 1.2.0; return their IDs/hashes and the oracle/legality snapshot IDs. Mechanical changes require a score-version bump and regression review. Corpus refreshes cannot silently edit effects; scoring remains pure, local and deterministic.

**Evidence, not popularity-based support.** Separate “we understand this mechanic” from “this deck meets its condition”. A known impossible predicate has s=0 but full mechanical coverage; a modelled opponent trigger with the fixed .5 availability prior also has full mechanical coverage. Do not calculate coverage from `s<1`, as v1 does.
An unknown predicate retains §1's s=.5 only for an otherwise identified effect's fractional units; it supplies no verified integer K, critical recipe proof or fabricated on-plan link. Corpus-frequent unknown cards get the SAME treatment as rare unknowns, plus review priority.

Replace the mechanical 69 cap with a separate evidence gate (`kind='evidence', cap=null`): show a provisional point estimate/components and uncovered copy share, but withhold “calibrated” status when coverage is <=80% or critical prerequisites are unknown. A wholly unmodelled W/S family retains the explicit 50/unknown diagnostic, distinct from a known absent plan.
This removes the 26/30 cEDH coverage ceiling without pretending missing effects are good. The named fixture still has quality cap 82.6 and weighted base about 78.9 under old weights; removing 69 alone does not establish 85+. Rule/identity/size/unresolved/version-mismatch caps remain in force.

**W and §7 decisions.** Retain whole-table finish predicates and cumulative damage as a timing proxy. Reject §7.2's claim that 3x40 IS the pile guard: both the probes and frozen run fail the pile target at T11-T12. Keep timing independent of the new S coherence test.
Reject the E>=9 single-opponent shortcut: 1x40 makes all 200 piles close, while answer density proves neither control nor victory over the remaining opponents. Meren E=7.8 and precon E=2.2 also show why I cannot be a universal fair-deck admission threshold.

Reject a blanket .75*E* control exemption and “pressure dominance loses nothing”: Jeskai and both Cabbage fixtures have W=0; frozen Meren is capped at 54.2. A control route requires typed stabilisation, sustainable advantage and an executable finisher; E may support that proof but cannot replace it.

Before retuning, bind scheduled output and access to the SAME resource/cost bins, debit shared mana/fodder once, and validate the actual finishing predicates. Replace flat token/pump assumptions, raw COMBO_PAIRS/ALT_WIN_NAMES wins and the fixed control T8 finish with typed recipes; an alternate-win card alone is not a completed line.
Preserve v1.1's frozen constants as the historical baseline, the rejection of the overfit Standard search, and the decision not to adopt intercept 25. Recalibrate only after catalogue/S repairs. When an essential component is zero, the intercept bounds the total from above; it is not a universal score floor.

**Revised §5 bands (design targets; rule gates take precedence).**

| Anchor/cohort | v1.2 band | Reason |
|---|---|---|
| Standard Challenge winner, including Univerce | 70-90 (was 85-100) | A winning event is noisy evidence of optimisation; a modest edge over a competitive field does not imply a near-perfect component vector. |
| Standard 5-0 league, including aljce | 65-90 (was 85-100) | Less event evidence and the same main-deck/BO1 scope; recognise the real engine before applying a band. |
| Verified competitive Standard field, including losing-event lists | 60-85; retire negative-median <=60 | Losing records are not proof of bad construction; require overlapping bands and outcome uncertainty, not a forced 25-point label gap. |
| cEDH Top-16, including Balloon Con | 80-95 (was 85-100) | Verified competitive strength warrants the upper tier; 95-100 is reserved for an established ceiling, not automatic placement credit. |
| Meren / untouched Witherbloom | 65-80 / 40-55 (retain) | Their supported value engines should separate them from piles; W/catalogue omissions do not justify lowering these anchors. |
| Reviewed Cabbage web / paper; Imotekh; paper Tazri | 35-50 / 55-70; 45-65; 40-60 (retain) | Current zero/weak closing lines expose missing mechanics; measurements do not establish replacement strength labels. |
| Brawl Tazri / Kuja / Vivi / Azula | 45-65 / 60-80 / 70-85 / 75-90 (retain, provisional) | Five fixtures, reused for training/validation, cannot establish new population bands. |
| Known structural failures / constrained legal piles | 0-19 / 0-24 (retain) | Rules and lack of coherence are distinct failures; neither limit depends on event placement. |

Replace §7's Standard >=85 and arbitrary positive/negative pair-gap objectives with these bands; require held-out positive median >=75 and reviewed stronger/weaker ordering, with cEDH median >=85. No mandatory gap between unrelated winning/losing lists. Keep >=95% piles <25 and >=90% reviewed legal positives in band; structural negatives do not pad that denominator.

The present calibration is exploratory, not independent validation: its first 60 piles also appear in validation and Brawl reuses every fixture. Repair synthetic pile basics that reuse the commander's card ID (all 200 cached inputs; feature-cache aliasing), then use fresh seeds, held-out commanders/precons and chronological event/list-family groups. Audit Standard labels/legality before splitting.

Publish coverage and Q/R/B distributions, component/cap changes, subgroup band coverage and bootstrap uncertainty on untouched holdouts; test broken resource links, corpus removal and price/rank permutation. This review ran no scoring/calibration/build commands and changes no implementation.

## 9. v1.3 design decisions (S gap)

Design review, 2026-09-20, HEAD `499f8ec`; supersedes the corresponding §8 rules. Sources: harness `v12-pile-s-report.md` rounds 1–4, [calibration](../verify-2026-09-19/deck-score/calibration.md), and the scoring code.
Baseline: anchors 12/16; piles total<25 176/200, S<=5 167/200; Standard holdout n=120 W median 85, S median 36 (36 zeros), total 41.5; cEDH validation median 76.5. The on-disk [fixture report](../verify-2026-09-19/deck-score/report.md) has unresolved-card zeros inconsistent with that run; do not treat them as measured regressions.
All following cohort numbers are forecasts/release requirements, not results of this review. No scoring, generation, calibration or test command was run. Preserve the quality cap `20+.8*min(M,W,S)`, core weights and meta weight 0.

**1. Standard S — replace binary deployment eligibility with useful supply weighted by casting probability.**
The generic shapes are present: 57/69 zero-R positives lack only one midrange essential; removing deadlines repairs 45/69 versus 19/69 without the coverage gate. Bands were measured before deployment filtering, while inference removes copies at the truncated land mean; the aggro reload p25 is also zero despite a mandatory minimum of one.
For Standard, essentials/deadlines become aggro pressure T3 plus ONE combined reach/protection/reload role T4; midrange threats T7, answers T5, value T5; control stabilisation T3, engine T5, finisher T10. Keep midrange/control's three essentials; allow verified midrange threat modes through MV7 with their output test. Other profiles retain their clocks.
For a known mode costing c by role deadline d, credit `q*a(c,d)`, where `a=clip(P(cast by d)/.5)`; lands-only P is the mean of `H(N,L,6+d,ceil(c))` and `H(N,L,7+d,ceil(c))`, zero if c>d. Additional mana/alternate costs need a typed executable path; never round expected lands into a cutoff.
Thus 24/60 lands gives a seven-drop at T7 P=.244 (a=.487), and at T10 P=.519 (a=1); a median-only T5 repair could not address this. Fractional supply enters Q/R, never an integer probability pool.
Keep `R=min_j clip(usefulSupply_j/requiredSupply_j)`; unknown effects add no invented supply and coverage never rescales R. Independent effects may fill distinct R roles, but shared modes/resources cannot; Q still counts each nonland copy at most once. Typed manland finishers may supply R without entering nonland Q. Remeasure p25/p90 bands on training lists using this SAME evaluator and freeze them.
Expected after coverage repair: Standard S median 75–85 (central forecast 80), <=6/120 S zeros, total median >=75, W median about 85 with zero W zeros; losing-event field should also rise toward its 60–85 band. S>=68.75 is necessary for an unrounded total 75, not sufficient for the weighted base.
Dispatch by format, not N: this Standard-only change must leave the 200 Commander piles at least 176/200 below 25; there is no accepted pile trade. Do not ship the reverted global median patch.

**2. Pile S — learn the generic Commander Q baseline from separate negative controls.**
For generic aggro/midrange/control in Commander only, use `S=100*clip((Q-b)/(.70-b))*R`; engine/closing plans keep b=.30 and require their actual resource links. Decision 3 removes the separate B multiplier throughout.
Freeze b at the 95th percentile of `max(Q_aggro,Q_midrange,Q_control)` on >=1,000 separate legal, land/curve/color-matched Commander training piles, using final catalogue/assignment rules; hold out seeds and commanders. Match typed coverage to positives so unknown cards are not the discriminator; b>=.70 rejects this statistic.
Expected b≈.46: the reported leaking Q=.40–.46 then earns S=0; any Q<=.472 earns S<=5 even with R=1. This is a density test against accidental role supply; balanced midrange is not penalised merely for having a uniform role distribution.
At b=.46 the paper Cabbage Q=.585/R=1 gives S≈52.1, still above W=48.8, so its total stays about 59 in 55–70. Mechanical-engine anchors keep their baseline. Require >=190/200 S<=5 AND >=190/200 total<25, with every previously in-band anchor retained; verify on fresh matched controls too.
Use the same final S objective for `planFit` and scoring, with deterministic ties. Never select with the old .30 fit and report a different floor afterward; freeze the negative prior only after catalogue changes, not against today's incomplete pile coverage.

**3. B under deletion — retire the payoff mean; charge unsupported production where it originates.**
A bounded payoff-only B cannot be non-increasing under deletion and equal 1 on the empty set unless B is identically 1: deleting all members would require 1<=B(before). Neither a denominator floor nor a new default resolves the missing mechanical distinction.
Remove the multiplier (legacy diagnostic B=1). For each producer p, use `u_p=clip(servedOutput_p/fixedUsefulOutput_p)` and multiply its Q/R credit by u_p: output must reach a verified plan use directly (pressure/mana/cards/answers) or through present supported consumers. Budgets are defined by typed producer modes and recipe caps, never by surviving payoff count.
Use mode-specific requirements and bounded resource/event capacities; deleting consumer edges can only shrink feasible uses. Maximise the same score over feasible assignments and fixed recipes, with F fixed in §4's deletion test; do not let first-match reassignment turn a blanked payoff into extra fodder.
Kuja's useful creature tokens and Treasure have direct combat/mana uses and retain full credit without a token payoff. Life-gain production needs its actual life-trigger/payment/counter route; deaths require expendable bodies AND a death source, not a count of death triggers. Unknown routes remain evidence gaps.
Precon-after: legacy B=1, with S<=44.0 at the frozen v1.2 Q/R (44.0 is the no-discount ceiling; before's equivalent ceiling is 39.7/.808≈49.1). Remaining converters such as Sanguine Bond prevent claiming all production becomes useless or S=0.
After retyping, that 44.0 ceiling is no longer a prediction: require S(after)<=S(before), W(after)<=W(before), and total(after)<=total(before) for all 3/3 quota cases. Untouched precon must reach S>=70 while retaining total 40–55; publish actual producer utilisation rather than inventing an exact post-catalogue point.

**4. Control inevitability — an executable finisher schedule, with continuous access.**
Replace both hard-coded T8 paths with `t*=first t<=12 satisfying the whole-table finish predicate`, conditional on obtaining the SAME cost/output-bin resources used in access. Require typed early stabilisation and sustainable advantage; removal/draw density alone supplies neither damage nor a finisher.
Planeswalkers start at printed loyalty; schedule one legal loyalty activation per own turn, debit loyalty, and count only typed damage, attacking tokens/animation, or a reachable verified ultimate. A draw-only walker supplies zero finishing output until a damage/conversion route exists; no generic walker damage constant.
Manlands come from ALL library entries, including lands: pay animation each attack, respect tapped state/sickness, and remove that land from mana production when it attacks. Burn uses printed repeatable output and affordable activations; draw-damage uses actual scheduled draw EVENTS, including ordinary draws, with per-turn trigger limits.
Carry bodies/counters/loyalty forward; debit shared mana, fodder and life once; distinguish each-opponent from single-target damage and apply the existing opponent-trigger prior. Unknown output cannot prove a finish; unfulfilled alternate-win conditions never enter the finisher pool.
Use `u_control=durable*J(t*)*2^(-max(0,t*-6)/h)`, with joint access to the scheduled engine/finisher requirements and deadlines. Access is applied once, not also inside conditional output; J reaches 1 only at certainty. Other closing families retain their current access normalisation.
At T8/h=5, J=.15/.50/1 now gives u=.114/.379/.758 (durable=1), replacing the identical .758 above 15%. Forecast for cabbage-cedh-input: actual close T10–12 or no control line, best W roughly 20–37.5, total 35–50 instead of 73; audit all competing routes and actual answer axes if that band still fails.
Keep Meren 65–80, paper Cabbage 55–70, Kuja 60–80, Vivi 70–85 and Azula 75–90. A later declared control clock is not an automatic score bonus or permission to change their bands.

**5. cEDH Q — credit the support of a complete closing package, not only one assembled line's names.**
Root a plan in at least one fully typed, present, executable closing line meeting its existing W access target; admit complete compatible backup lines from the bounded <=8-recipe catalogue. Missing pieces, raw combo-name matches and unsupported alternative wins cannot establish the root.
Give each copy at most one Q unit for a complete line's pieces or a proved support path: exact tutors to present pieces/support (at most two tutor hops, with target/destination/cost/delay checked), line-compatible protection/recovery, scheduled acceleration/selection, and timely stax that obstructs opponent actions while permitting our line or a paid exit.
Freeze upper support-role bands from reviewed training packages; shared tutors/resources count once, modal budgets remain exclusive, and a stax tag earns neither invented extra turns nor a faster W clock. Keep essential completion/access checks; this grants no generic tutor/protection bonus to piles.
Expected combo Q median .66–.70, S median >=90, final cEDH median >=85 (forecast 85–90); at R=1, moving S70→90 needs about six newly proved copies in a 70-nonland library. Require both the original 30-list regression and independent commander/event holdouts; preserve Ballooncon S>=84.6 and total 80–95.
The current 0/200 closing-plan pile reads should stay zero on those seeds; final pile acceptance remains >=190/200 under both limits after every catalogue/support addition.

**6. Build order, ownership and acceptance.**

1. Catalogue + producer formula (3), first: replace `catalogFacts`' union of alternative-mode requirements with mode-resolved evaluation. Extend `requirementsOf`/generator to life-gain events versus amounts/life paid, counter placement, self spell casts, creature ETB/deaths and sacrifice throughput, Food/Treasure/creature-token distinctions, and graveyard entry/exit/recursion with real zone/target budgets.
2. Formula + recipe bands (1)+(2), together: Standard probability-weighted deployment/essentials, assignment and matching bands; then the frozen negative Commander prior. Accept Standard S median 75–85, total>=75, <=6 zeros, and both pile counts>=190/200; reject any stage falling below the 176/200 total baseline.
3. Catalogue + closing-support formula (5): exact tutor predicates/destinations, protection scope, restrictions/taxes and exits, verified alternate wins/loops. Accept cEDH median>=85, unchanged pile gates and no newly credited incomplete closing packages.
4. Catalogue + scheduling formula (4): loyalty, manland activation/tapping, bounded token/pump output, repeatable burn and draw-trigger throughput; audit answer restrictions/self-destructive wipes. Accept cabbage-cedh-input 35–50 and the preserved fair-deck bands.

Coverage is cross-cutting: type >80% in EACH named legal fixture and >=95% of fresh positives, and 100% of selected critical mechanics. Prioritise the precon and Tazri x2/Imotekh (currently 52–68%); add party/type rewards and artifact graveyard-leave/recursion routes. Imotekh needs that engine recipe, not an artifact-count quota; keep typal payoff 2/7 and enabler 11/29 unless its predicates change.
Final gates: retain all 12 existing in-band anchors and bring Tazri paper/Brawl to 40–60/45–65, Imotekh to 45–65 and Cabbage cEDH to 35–50; Meren S>=85.5, precon S>=70, quota gaming 3/3, and no regression of Univerce/Kuja/Vivi/Azula's established S readings. Require >=90% of reviewed legal positives in their §8 bands. Existing inspected cohorts are regression sets; release also needs fresh grouped holdouts.
Publish resolved-input provenance, coverage, selected plan, Q/R/producer utilisation, output/access schedules and cap changes; freeze catalogue/recipes/norms as 1.3 only when the combined acceptance run passes. Implementation is a separate task; this appendix makes no claim of calibration.
