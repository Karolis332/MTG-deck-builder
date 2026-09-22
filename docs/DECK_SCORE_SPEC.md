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

## 10. v1.4 — S at full coverage

Design review, 2026-09-21, branch `auto-improve`, HEAD `10fc8b2594011e1e9cd71adfe13abc756151d6eb`. This section supersedes §8's assignment of pile separation to S, §9's scored floors and R multiplier, and the unresolved-name policy identified below. Keep the core weights, meta weight 0, whole-table finish predicates, structural limits and quality cap `20+.8*min(M,W,S)`. This is a design decision, not an implementation or a successful calibration.

Read in order: §§1/4/5/8/9; harness `s-discriminant-study.md` and [discriminant summary](../verify-2026-09-19/deck-score/discriminant/summary.txt); harness `coverage-round1-report.md`, `v13-refute-report.md`, and `v13-stage4c-report.md` §1. The harness directory is `~/.claude/harness/runs/deck-score-2026-09-19/`. The later [gate audit](../verify-2026-09-19/deck-score/discriminant/followup.txt) distinguishes identity/legality failures from unresolved names.

**Evidence boundary.** The following baseline is a read-only aggregation of the stored `scoreDeckSafely` training-stride CSVs, with all their rule caps retained. No scorer, calibration, generation, build or test command was run for this review. Candidate results below come from the study's offline substitution of S into stored composition inputs; they are not executions of a new production scorer. Every new acceptance threshold is a requirement, not an observed result.

| Stored live baseline | Commander | Brawl |
|---|---:|---:|
| Real stride size | 1,824 | 1,146 |
| S=0 share | 83.2% | 92.1% |
| S p10 / p50 / p90 | 0 / 0 / 62 | 0 / 0 / 0 |
| Total p10 / p50 / p90 | 19 / 20 / 47 | 19 / 20 / 20 |
| W=0 share; W p50 | 16.2%; 59.8 | 0%; 85.0 |
| Hard cap <25, all real rows | 346/1,824 = 19.0% | 345/1,146 = 30.1% |
| `ctrl93` / `ctrlmatch` total <25, n=1,000 each | 99.6% / 100% | 99.0% / 100% |

Round 1's 85.5%/94.0% S-zero readings describe its own run; do not substitute them for this stride. Nor does “full coverage” mean all mechanics are now known: real median coverage is about .75, despite 14,830 typed cards.

### 10.1 Decision: coherence in S; no invented pile detector

Choose **(b)**. S measures mechanically supported plan coherence. Remove the demand that its zero point classify a list's origin. There is currently **no validated card-level signal for a replacement multiplicative pile guard**. Moving the existing margin into another component would reproduce its false negatives.

The numbers reject the alternatives as release designs:

- The old Commander floor moved .574 -> .683, leaving only .017 to .70; Brawl's .733 already violates §9's rejection rule. Changing saturation cannot change which lists lie below the floor.
- Candidate A preserves cEDH p50 88 and about 96% of both pile constructions, but retains **45.6% real Commander S zeros at every tested saturation**. At p75, S p50=13.8 bounds unrounded total p50 by 31.04 from the quality cap alone; even the anchor-favouring p60 gives an unrounded ceiling of 41.68 (rounded at most 42), before W/rule caps. The observed median is 20. Choosing p60 because it gives 14/16 anchors is prohibited.
- Candidate B at p75 gives cEDH p50 **53**, and only **92.6%** of matched piles <25. Coverage-normalised pre-closing Q has AUC .884, but it reverses the competitive cohort; use the final supported package when evaluating coherence.
- Option (c), a real-list percentile rank, changes the scale without adding discrimination within a coverage stratum. A gate using the same statistic restores the same rejection problem, and a coverage-conditioned rank retains the edit exploit. Do not adopt it.
- Commander linkage is available on only 46.3% of real commanders; even restricting to typed commanders gives AUC at most .555 in the follow-up. Producer linkage is about .5, shipped S .582, and W .588/.455 against `ctrl93` in Commander/Brawl. Brawl piles have W p50 87.7 versus real 85.0. These are not adequate replacement detectors.

The approximately .88 ceiling is an empirical result for the tested supply-statistic family, **not a theorem that every possible card-level model must fail**. A legal draw of mutually useful staples can also be a playable casual deck; identical card lists must score identically regardless of their origin. Better resource/schedule modelling may supply new evidence, but it has not yet demonstrated pile separation.

Outside the pure scorer, list provenance can establish an event result, an untouched precon, a synthetic control, or an unreviewed submission. Edit history can explain missing information. Neither ownership nor accumulated history establishes strength; their absence is not evidence of a pile. These facts may govern evidence labels and cohort admission, never add/subtract score points, exempt an anchor, or become a hidden strength multiplier.

**The requested pile acceptance number remains >=95% with numeric total <25 on EACH construction, separately for Commander and Brawl. It is an OPEN, RELEASE-BLOCKING requirement for this design.** No current measured candidate satisfies it together with the population and gaming requirements below. A provisional label, missing total, known generator label, or source-based rejection does not count as a pile below 25. This review does not silently replace numeric separation with a provenance test.

A future structural detector needs a new, mechanically justified statistic, registered before evaluation, then >=95% pile rejection on both constructions with <=5% false rejection of resolved, rule-valid real lists on grouped holdouts. Its final numeric totals must still pass the original pile gate. Until then, there is no extra multiplier: the existing quality and rule gates are the numeric composition. v1.4 cannot be called calibrated while that gate fails.

### 10.2 Replacement S and frozen percentile policy

Reject both `Q/F_typed` and a score floor that decreases when the submitted list becomes less readable. Use **useful copy mass per library slot**, with no per-query coverage correction:

```text
N0 = legal reference library size: 99 (98 with a verified partner pair),
     59 for Standard Brawl, 60 for Standard
N  = submitted library copies, including reserved unresolved slots
D  = max(N0, N)
U_r = maximum feasible sum of useful nonland-copy credits for recipe r
U   = max_r U_r
Q_slot = U / D
b_S = 0
Q_sat,p = percentile_80(Q_slot on the frozen eligible real training cohort for profile p)
S = 100 * clip((Q_slot - b_S) / (Q_sat,p - b_S))
T = round(clamp(min(weightedBase, 20 + .8*min(M,W,S), applicableRuleCaps), 0, 100))
```

Each physical nonland copy supplies at most one U unit, across compatible modes/resources; use the producer utilisation and closing-package proofs from §9. Commanders and lands may supply actual resources/requirements but do not create extra nonland units. Unsupported effects add no invented useful mass. Known opponent-trigger priors remain their typed fractional availability, distinct from unknown mechanics.

A recipe needs its actual essential resources and compatible uses. A closing package still needs an executable present line and the §9.5 access condition; generic interaction density cannot establish one. Maximise the **same U objective** over the fixed, bounded recipe/assignment domain for selection and reporting. Selection/pruning must preserve that maximum; deleting a zero-use copy must not expose an artificially better omitted recipe. Retain deterministic ties. R ratios may diagnose shortages but do not choose a different numerical objective.

Freeze S's useful-role caps and resource budgets at the profile's N0 reference, rather than expanding them when an unknown card increases actual N. This is an S-specific exception to §1's count-target scaling; other components retain their physically appropriate denominators. Added unknown slots cannot unlock extra U merely by enlarging a quota. The D denominator also prevents the nonland-to-land replacement exploit inherent in division by F. For undersized inputs, every access/feasibility predicate used in S, including closing-package admission, also uses D slots with uncredited blank padding; otherwise improved draw odds could admit extra U after deletion. Structure validation still uses actual submitted N. Fixed-slot probes preserve that slot count throughout, not just in the final division.

The floor is **mechanical zero**, not a fitted percentile: no verified useful mass means no demonstrated coherence. If the relevant family is unknown, say “unknown”, not “incoherent”. Retire the automatic W/S=50 substitution from scored composition: an entirely unevaluable essential component yields provisional component diagnostics and no numeric total, rather than invented credit. Such results count as unavailable/failures in release coverage, never as successful low-zero or pile observations.

**Percentiles are policy, frozen before anchors are opened.** Use p80 for saturation in every independently calibrated format profile; this preserves the named percentile adopted in stage 4c, where Commander p80=.698 explained the old .70. Neither .70 nor the legacy nonland-Q floors carry over to Q_slot's different units. Use all identity-resolved, snapshot-rule-valid real training lists, including mechanically incomplete lists; do not select them by score, S>0, winning recipe, or anchor membership. Mechanical coverage remains a reported stratum and an evidence limitation, not a reason to discard hard-to-score real lists.

Use the inverse weighted empirical CDF, `q_p=inf{x: cumulativeWeight(x)>=p*totalWeight}`, with equal total weight per deduplicated list/event family, full-precision inputs and deterministic identities. Require >=30 independent eligible families per profile. There is no within-commander ranking, anchor-specific saturation, automatic borrowing of Commander norms for Brawl, or p60/p75/p90 search. If p80 is zero, samples are insufficient, or targets fail, report failure; do not manufacture an epsilon window or choose another percentile.

Continue measuring a **diagnostic** coverage-conditioned null: in fixed .05-wide coverage bins, report pile p95 of max-recipe Q_slot separately for both constructions, and real p80 in the same bins. Require >=100 controls per construction and >=30 real families for a reported cell; unsupported cells remain unknown, without extrapolation. The conservative null summary is the larger of the two pile p95 values. These conditional values do not enter S. The old `.098+.560*c` (Commander, r²=.9991) and `.033+.690*c` (Brawl, r²=.9922) describe legacy Q_final, not constants for the new statistic.

A coverage-conditional floor is acceptable **as a versioned calibration diagnostic**; its dependence on the catalogue is not inherently anchor fitting. It is rejected as a scored term here because a user can lower c without losing useful mass. All scored norms already depend on what the catalogue can read; hiding that dependence would not remove it.

On any oracle/effect/recipe/assignment change: keep paired input lists and their IDs fixed; bump catalogue/score versions; rerun the actual feature evaluator; remeasure role bands, p80 saturation and diagnostic null cells from training only; then extend/run `bands verify` to require **zero mismatches for every active constant and cell**. Record hashes, cohort membership/exclusions, quantile method, seeds and evaluator version. Do not recover an unmeasurable floor from a holdout, as earlier closing-floor work did. Evaluate untouched grouped holdouts only after the freeze. Holdout failure rejects the version; it does not authorise another percentile. A catalogue refresh may legitimately change scores across versions; edits within one frozen version must pass §10.4.

### 10.3 R: retire the multiplier, retain the diagnosis

Remove `*R` from S and from scored plan ranking; retain the actual legacy R field and its weakest-requirement explanation. Do not replace its diagnostic value with a fabricated 1. Known missing essentials still invalidate the corresponding recipe; resource, timing, compatibility and completion proofs remain mandatory. Partial useful supply earns its actual bounded U credit. Empirical role lower-band targets describe adequacy, not physical validity: do not reintroduce the retired penalty as an R<1 recipe-admission gate.

Reason: 100% of the 1,517 Commander S zeros are below the floor and **0% have R=0**. Multiplying coverage-normalised supply by R drops AUC **.884 -> .538**, while real R p50=.79 and typed piles' p50=1.00. This rejects R as an additional generic scalar penalty, not the need for real prerequisites. Retirement is unmeasured under the new formula and must pass the same cohort/anchor checks; it is not a claim that removing R repairs the zero mass.

### 10.4 Gaming invariance is a release requirement

Run each applicable probe at **k=1, 5 and 10 copies** on the real training strides and fresh grouped holdouts, with the catalogue/norms frozen. Include both direct size-changing edits and legal, fixed-slot counterparts so a size cap cannot conceal an S exploit. Match known nuisance features for the no-benefit counterparts and verify that they do not remove a tax/obstruction or otherwise change recipe feasibility. Report unmatched edits separately with the actual mechanical changes; a demonstrably useful removal must not be relabelled a gaming failure. Use resolved-but-untyped cards as well as unresolved-name cases.

For no-benefit edits below, the maximum positive movement is **0 S points** (unrounded tolerance 1e-6) and **+1 displayed total point**, over the entire k-copy edit, not per copy. The total allowance is an empirical gate for the whole scorer, not a mathematical consequence of the S formula. Report the maximum and every violating list, not just a mean or the original 3/3 quota fixtures. Fully equivalent substitutions require absolute movement within these bounds.

| Probe | Required construction and additional acceptance |
|---|---|
| Delete off-plan typed | Remove copies proved zero-use under every feasible recipe; also replace them with zero-credit unknown slots at fixed N. S must not rise. An under-sized singleton list retains D=N0 for diagnostics and total <=19; passing that cap alone is insufficient. No unknown replacement may lower a coverage floor or shrink a scored denominator. |
| Add untyped | Add k zero-credit slots, and separately replace k zero-credit typed copies at legal size. U cannot rise. When D grows, Q_slot_after <= Q_slot_before*D_before/D_after, with equality when U is unchanged; unsaturated S obeys the same bound. A saturated display may stay unchanged, but the Q_slot decrease must be visible. Unknown critical identity/mechanics cannot improve evidence status. |
| Add typed staples | Add/substitute legal, identity-compatible, zero-use staples, including already-saturated infrastructure roles, with no newly executable plan/support path. No positive S movement; total <=+1 on matched no-benefit cases. Staple membership itself supplies zero credit. A genuinely useful tutor, answer or enabler belongs in a separately traced improvement test; it cannot be used to claim all staple additions are invariant. |
| Swap lands | Equal count, colour availability, tapped timing, costs and relevant effects: S and total invariant within the stated tolerances. For mechanically dominated sources with no added route, S cannot rise and M/W/total cannot improve beyond display tolerance. Removing nonlands in favour of excess basics also must not improve S solely by shrinking F. A real mana upgrade may improve the measured casting/scheduling probabilities and is reported separately. |

An actual legal Standard trim of k off-plan excess cards is a different operation: drawing useful cards becomes more likely. If U is unchanged and both sizes are >=60, permit `0<=DeltaS<=100*k/N_before` and require the exact fixed-saturation formula, plus separately explained M/W changes. The fixed-slot counterpart still has the zero-gain bound. Do not apply a singleton deletion rule to a legal 70 -> 60 trim.

The new U/D definition supplies the local S monotonicity when useful assignments/budgets are unchanged. **The measured A/B candidates fail it; a coverage-conditioned rank has no such guarantee either**: on the reported F=63, c=.75, Q=.510 example, the reported local sensitivities before clipping are about 9.5/10.2 S points per typed-off-plan -> untyped swap under A/B; actual gains depend on clipping, and ten deletions saturate both. Information loss may lower confidence; an evidence label cannot excuse inflated numeric S/total. The new formula still needs whole-scorer execution of every probe before any invariance claim.

Keep §4's incompatibility probes: breaking a required producer/consumer, tutor target or mana/outlet path must remove that proof and reduce W/S or bind a quality/rule limit. Preserve order/printing/quantity invariance exactly, and require **DeltaS=DeltaT=0** under provenance, ownership, price, popularity and edit-history permutations.

### 10.5 Calibration cohorts and scraped-list handling

Exclude unresolved identities and confirmed structure/legality failures from **positive norm estimation and strength-band denominators**, using explicit input reasons decided before scoring. Repair a scrape only against its source; retain the original and the repair mapping. Evaluate unresolved, rule-invalid and mechanical-coverage cases as separate audit strata. Do not discard a legal list merely because W=0, S=0, coverage is low, or the recipe family is missing.

Preserve the original **1,824/1,146-row strides** as paired product regressions. Publish all-row results, eligible-subset results and every excluded/unavailable count. Exclusion must not manufacture a median gain: demonstrate changes on the same IDs, and report repaired inputs separately. Track no-score rows in the original denominator; for release S-zero coverage count S=0 **or unavailable**, and for total quantiles conservatively include unavailable totals as 0 in a separate acceptance column. This is a reporting rule, not a product score for an unknown deck.

The study's “30% hard-capped” is **30.1% of candidate A's below-25 Commander subset**, about 19% of the full stride. The gate audit found 346/1,824 Commander hard failures, including legality on 272 and identity on 96 (overlapping), with only **four unresolved-name occurrences**. Brawl has 345/1,146 hard failures, legality on 336, and five unresolved occurrences. These snapshot facts do not prove every flagged card is actually illegal: audit format/date/Arena variants. They do prove that changing the unresolved-name cap alone cannot recover 19% of Commander lists.

Product policy: unresolved identity alone becomes `kind='evidence', status='warn', cap=null`, with product state `provisional`, with explicit missing copies and reserved slots; supersede the unresolved-name cap of 39 in §2/§8. Do not silently drop those copies and then impose a fabricated size failure. Unknown commander identity similarly needs resolution rather than a fabricated legality verdict. A computable partial estimate is provisional; an entirely unevaluable essential component has no numeric total. Confirmed wrong size, identity, copy limits or illegality still applies its existing 19/0 rule cap. Keep dataset/version compatibility checks. Neither verified provenance nor ownership overrides a real rule failure.

### 10.6 W repairs precede the final S freeze

Input hygiene comes first; then repair W's mechanical model **before** freezing S, because Q_final/closing support depends on which executable package exists. Prototype S independently if useful, but do not measure its final norms against knowingly missing or fictitious lines.

1. **Tutor-assembled creature combos first.** The two cEDH Top-16 failures are **92.9% typed**, yet only 28/30 lists assemble a recognised closing line. Model the missing family with exact tutor predicates/destinations, distinct targets, sacrifice/untap/zone requirements, mana, delays and an actual outlet/finish predicate. A generic tutor or combo tag is insufficient. Require both lists to acquire audited executable lines, all 30 to have evaluated W>0, neither affected total <80 after the complete change, and cEDH median >=85 on both regression and independent event/commander holdouts.
2. **Audit and close the broader W-zero families.** Commander W=0 on **16.2%** of the real stride, and candidate A's low-score subset is 19.6% W-limited. With W=0, even S=100 cannot take total above 20. Classify every zero as known absent, unsupported recipe, missing prerequisite or bad input; extend mechanics from the real failures, without an arbitrary W floor. Target W=0 or unavailable <=5% of both the eligible and full Commander strides after the complete repair. Known absent plans remain zero and can block that target.
3. **Replace the fixed control T8 schedule before accepting the W stage.** Apply §9.4's actual first whole-table finish t*<=12, using the same resource/cost bins in output and joint access, printed loyalty, paid manland attacks, actual draw events and debited shared resources. Retain continuous `u_control=durable*J(t*)*2^(-max(0,t*-6)/h)`; no generic walker damage or assumed T8. A computed T8 is allowed; a default T8 is not. Require 100% of selected control routes to expose an executable trace or no line, with zero incomplete/missing-outlet paths admitted. Retain the reviewed Cabbage 35–50/55–70, Meren 65–80 and precon 40–55 bands.

Control corrections may lower W; do not undo them to save a median or an anchor. Report W-zero share and W/S/total p10/p50/p90 at each step. Brawl's current W-zero share is 0%, yet its pile W exceeds real W: W coverage repair is necessary for fair scores and is not evidence that W has become a pile detector.

### 10.7 Build order and acceptance contract

Set **X=10%** for real Commander S=0 or unavailable, and **Y=50** for total p50 on the fixed full stride as well as the eligible subset. These are registered product requirements, not forecasts. A median of 50 lies within the retained precon 40–55 tier; a median of 20 labels ordinary lists as piles. The cap requires S/W/M >=37.5 to permit an unrounded individual total of 50, and >=81.25 to permit 85. Saturation cannot repair an excessive zero mass.

Each implementation stage must publish `scoreDeckSafely` results on the actual training strides, both full and eligible, plus both pile constructions, cEDH and anchors. No `--raw`, lifted coverage gate, component-only formula substitution, fixture median or null filtering is acceptance evidence. Publish hashes, counts, evidence/rule gates, selected recipe, U/D, coverage, R, S and W zero shares, S/W/total p10/p50/p90, saturation share and every gaming maximum. Use source/event/commander-family bootstrap intervals, without replacing a failed point target by a favourable interval.

| Stage | Work and numeric exit requirements |
|---|---|
| 0 — inputs and measurement contract | Freeze IDs, split/exclusion reasons and percentile/probe policy before editing formulas. Account for 100% of source rows; 0 train/holdout commander/event-family overlaps, including fixture commanders; 0 unexplained reproduction differences on unchanged inputs. Unknown-only identity cases are 100% provisional, with all slots retained; 100% confirmed rule failures obey their existing limits. Reproduce the baseline table before attributing any uplift. |
| 1a — creature-combo W | Repair 2/2 missing cEDH routes; W>0 for 30/30 regression lists; cEDH p50 >=85 and no affected list <80 after composition. Every admitted line has a resource/tutor/finish trace; 0 broken essential paths admitted. Publish full-stride distributions even while the old S still fails. |
| 1b — remaining W and control clock | Audit 100% of W-zero/unavailable rows; final Commander zero/unavailable share <=5% in full and eligible strides. 100% of selected control routes have actual schedules; 0 default-T8 finishes. Keep cEDH p50 >=85 and report unchanged-band anchor deltas. Freeze the resulting catalogue/recipe domain before S norms. |
| 2 — U/D S, R retirement and p80 | `bands verify`: 0 active-constant/cell mismatches. Full and eligible Commander S-zero/unavailable <=10%; S p10 >=10, p50 >=60, p90 >=90; total p50 >=50. Brawl meets the same population targets on its own stride/profile. S=100 share <=25% in each eligible profile. Report total p10/p90 without a universal floor for rule-invalid rows. No percentile or band changes if a target fails. |
| 3 — adversarial composition | All applicable k=1/5/10 cases meet §10.4's per-list maxima; 0 excess-gain cases. Original quota probes remain 3/3, but do not replace the expanded probes. Metadata changes move numeric outputs by exactly 0. Re-run both pile constructions; a failing pile gate stays explicitly OPEN. |
| 4 — independent release evaluation | All stage-2 population gates on fresh grouped holdouts as well as regressions; cEDH median >=85 in both sets, regression p10 >=80 and neither formerly missing-line list below 80; >=14/16 anchors in unchanged §8 bands, including required Meren, precon and both reviewed Cabbages. >=90% of independently reviewed legal positives in their existing bands. Every prior stage's gaming and mechanics gates passes. |
| **Release blocker — numeric pile separation** | **>=950/1,000 numeric totals <25 in EACH of ctrl93 and ctrlmatch, in EACH profile, on fresh disjoint seeds/commanders, with <=5% false rejection of eligible real lists by any added detector.** Also retain >=190/200 on each existing 200-list regression construction. Invalid controls, source labels and unavailable totals cannot pad a pass; publish generator failures and regenerate only against predeclared legality rules. No passing measurement exists for the proposed coherence formula; provenance cannot satisfy this numeric gate. |

For the final total distribution, require eligible-real p10 >=25, p50 >=50 and p90 >=70, reporting these separately from the full stride's rule-capped p10. These tail guards prevent a good median from concealing widespread pile-level readings; they are design thresholds, not asserted measurements. Standard retains §9's independent target: S-zero/unavailable <=5%, S median 75–85 and total median >=75 on its real holdout, with no format dispatch by deck size alone.

Keep both control definitions visible: `ctrl93` is the heavily typed draw construction (achieved coverage p50 .952/.949 in this study), and `ctrlmatch` samples the real coverage distribution (achieved .730/.733). Preserve paired frozen lists across catalogue changes and add fresh held-out controls; do not redraw only the difficult controls away. Existing study seeds are regression evidence, not a new holdout.

The unchanged-band 14/16 requirement is deliberately separate from parameter estimation. The two Tazri out-high readings do not authorise changing their bands or choosing p60 to bring the Cabbages in. Correct mechanical failures, evaluate, and record any remaining failure. A stage may produce a reviewable experimental implementation while later gates remain open; it may not label the combined v1.4 score calibrated or deploy it as accepted. **The current evidence supports the build order and the rejection of the old S rule; it does not establish a solution to the retained numeric pile requirement.**

### 10.8 W finish predicate — decision

Design review, 2026-09-21, branch `auto-improve`, reviewed HEAD `3edacf498498e046a1c415777e3670b1a6257480`. Evidence: §§1/7/9.4/10.6/10.7, then harness `~/.claude/harness/runs/deck-score-2026-09-19/v14-stage1b-report.md`, `v14-stage1c-report.md`, and the stored [Commander W audit](../verify-2026-09-19/deck-score/wzero-commander.txt). No scorer, build or test was run for this review. The requirements below are registered acceptance numbers, not measured results of the proposed change.

**Decision: (c), extend Commander's search to T20 after correcting resource accounting; retain a complete whole-table finish.** Supersede the T12 search bound in §§1/9.4/10.6 for Commander only and the full-stride W exit target in §§10.6/10.7. Keep Brawl/Standard at T12, the existing weights and quality cap, and all strength bands. No partial-damage credit, single-opponent shortcut, W floor, or casual/cEDH label selects a different predicate.

The eligible failures are **356/1,478 = 24.1%: 331 `predicate_short` (22.4%) plus 25 `unsupported_family` (1.7%)**; `known_absent` and `missing_prerequisite` are both zero. Thus “100% predicate_short” describes the 331 understood failures, not all 356 eligible failures. Full-stride failures are 454/1,824 = 24.9%, including 98 `bad_input`. The audit also finds 181 lists with stabilisation, an engine and a typed finisher whose control route fails only the predicate. Stage 1b's former `known_absent` count was a classification error, not proof that those lists cannot win.

**1. Finish and utility.** Commander is **three opponents at 40 life**, not four opponents at 30. For an ordinary damage route, maintain a feasible damage allocation `D_l,o(t)` to each opponent and require `D_l,o(t) >= 40` for all three; 120 aggregate damage is sufficient only with that allocation. Overkill on one opponent cannot pay another opponent's life, and an each-opponent trigger hits three opponents. Commander combat damage remains 21 from the same commander to EACH opponent; a verified alternative must defeat every remaining opponent. Brawl's target remains 25 life without a commander-damage shortcut.

```text
H_commander = 20; H_brawl = H_standard = 12
d_p(t) = 2^(-max(0, t - Tfast_p) / h_p)
Phi_l(t) = the full finish predicate is satisfied by a resource-valid trace by t
t*_l(H) = min { t in 1..H : Phi_l(t) }; undefined if no such t exists

ordinary u_l(H) = max_{t=1..H} [Phi_l(t)] * clip(J_l(n(t)) / pWin_p) * d_p(t)
control u_l(H)  = durable_l * J_l(t*_l(H)) * d_p(t*_l(H))
                 (0 when t* is undefined)
W = 100 * (.85*u1 + .15*max(u2, u1*protect))
```

Keep Commander's frozen `pWin=.15`, `h=5`, `Tfast=7`; other profile norms remain unchanged. Explicitly ratify stage 1b's use of profile `Tfast` for control, superseding the literal `6` in §§9.4/10.6 for Commander. This aligns the text with the measured implementation; it introduces no new timing change in the horizon comparison. Control retains **raw joint J**, durable stabilisation and its first actual finish; it does not acquire `clip(J/.15)`. Other families retain §1's maximum over eligible turns. Report the first finish and the utility-maximising turn separately when they differ. Preserve the existing independent-backup, protection, cost/output-bin and resource-deadline rules.

The same corrected trace must have identical T1–T12 output, access and resource ledgers under H12 and H20. Access at an early execution never uses `n(20)`; a card drawn later cannot fund an earlier deployment. Extending the horizon adds turns to the existing schedule, not free resources, additional protection or a new recipe-selection norm.

At saturated ordinary access, a T15 close has `u=2^(-8/5)=.3299`. If this is the deck's best line utility, W is at most 33.0 and the unrounded total cap at most 46.4; an unprotected single line gives W about 28.0. At T16 the utility ceiling is .2872; at T20 it is .1649, allowing W at most 16.5 and total cap at most 33.2 when it is the best line. T20 therefore covers slow demonstrated finishes while assigning them a small contribution with the existing decay. T12 cuts off while utility can still be .5. T20 remains a finite computational cutoff: an unproved later finish still earns zero for that route and remains `predicate_short`, not `known_absent`. Publish shortfalls at T12/T16/T20; do not choose among those horizons by which passes acceptance.

Reject `u*clip(D(T12)/120)`: 108 damage followed by no remaining output is not equivalent to a repeatable route that completes on T13–15. W continues to measure demonstrated closing access; partial output belongs in diagnostics. A damage schedule with provably zero output earns exactly zero, irrespective of stabilisation, draw or a named family. A list with no damaging finish and no verified alternative win has W=0. Missing essential pieces/outlets remain invalid; unknown output cannot satisfy `Phi`.

There is no measured game-turn distribution in these artefacts to justify separate casual/cEDH predicates. A future profile proposal needs independently grouped, context-labelled game records with actual decisive turns and unfinished/conceded games accounted for, plus validation on unseen commander/event families. Requested power labels and list provenance cannot select easier norms. The supplied goldfish schedules alone do not measure the probability that a pod survives to T20.

**2. Correct both mana conventions BEFORE extending the horizon.** Otherwise a longer search compounds the same invented resources.

- **Rituals:** pay the casting cost, credit the typed gross burst once at its actual resolution, consume that physical copy, and empty unspent mana at the normal boundary. Do not carry a one-shot ritual as +3 mana on every turn from T3 or count it again in another ramp/burst budget. A second use requires a separately paid, typed recursion/copy path; a persistent mana source requires its own deployment and activation trace. A ritual's cast trigger occurs once per actual cast.
- **Deployment:** pay every creature and commander deployment from the SAME per-turn mana ledger as spells, rituals, engines, animation and activations; include coloured requirements and relevant taxes. Command-zone access guarantees availability, not free casting. Only a paid or independently verified alternative deployment puts a body/trigger online. Respect activation timing and summoning sickness; no earlier pump, cast trigger, attack or mana production from that object. Shared spell costs are debited once, and mana already spent deploying the body cannot also pay those spells.

Measure each correction separately at H12 on the frozen lists. The ritual step must publish before/after ritual activations, mana ledgers, first/selected closing turns, line/access changes and W/S/total distributions in every affected profile, including cEDH, anchors and both pile constructions. The deployment step repeats that full measurement and exposes deployment turn/cost, remaining spell mana and output by source, especially Vivi. Resource correction can lower W and can invalidate S closing support; do not restore false output to retain an anchor or population median. Keep S norms fixed during these comparisons; final S measurement waits for the completed W domain.

**3. Vivi: keep 70–85 pending the corrected measurement.** Its recorded 90/W98.4/T6 is explained by the newly typed commander cast trigger reaching the Brawl Tfast=6, but that does not validate the schedule using free deployment. Neither the band nor the precise inflation from deployment/cantrip replacement can be settled from the scalar score. The loyalty-only change moved **0/16** anchors, so it is not evidence for explaining the overshoot.

The deciding measurement is a reproducible per-turn witness for the resolved Arena Vivi list at H12: actual commander/engine deployment, remaining mana, each spell identity and quantity, casts before/after the trigger is online, draws and cards left, counters/attacks, per-opponent damage, joint access, first close, W and composed total. Audit the cantrip bound separately after paid deployment: every cantrip spends a card before drawing its replacement; a replacement is not automatically another cantrip, a physical copy cannot be reused without a paid path, and draws/casts cannot be borrowed from a future turn. The `1/(1-cantripShare*density)` multiplier capped at 2 is not by itself a finite-card conservation proof. Compare its claimed throughput with a finite, causal card/mana ledger and publish a no-replacement diagnostic; correct any overestimate mechanically, without fitting the multiplier to 85. A single favourable hand does not validate the access/throughput estimate.

If the corrected, independently checked witness still supports T6 and total 90, record the anchor as OUT HIGH. That would remove these accounting defects as the explanation; it would not automatically prove a new band. Any later band revision needs the existing minimum of >=30 distinct legal, reviewed positive lists in an independent comparable Brawl cohort and validation on held-out families, without tuning to Vivi. H20 is Commander-only and cannot rescue or change this Brawl anchor.

**4. Numeric acceptance and invariants.** Use the fixed rule-valid, identity-resolved Commander stride, including mechanically incomplete/unsupported lists. Apply the same targets on fresh grouped holdouts. Count unavailable W in failures and as 0 in a separate acceptance-quantile column; never manufacture a numeric product score. Publish full-precision p10/p50/p90 with the frozen family-weighted inverse-CDF policy, row counts, family counts and grouped intervals. The row-share gate below uses the original eligible denominator.

| Requirement | Registered number and reason |
|---|---|
| Eligible Commander W=0 or unavailable | **<=5%**, currently **<=73/1,478**. With all 25 unsupported cases still failing, at most 48 other failures may remain. This requires >=283 of the current 331 shortfall rows to recover (85.5%) if no other row regresses. Recovering all 170 reported near misses alone leaves 186/1,478 = **12.6%**, still a failure. |
| Eligible Commander W p10 / p50 / p90 | **>=6.25 / >=37.5 / >=62.5**, respectively. From `20+.8*W`, these are the marginal W requirements to permit the retained unrounded total targets 25/50/70. They are not sufficient for the composed total, and are not forecasts of H20; keep the separate M/S/base/rule and §10.7 total gates. |
| cEDH under the horizon-only change | **0 per-list changes in W or composed total**, comparing the same corrected evaluator/S version at H12 versus H20 on all 30 existing lists. Check u1, u2, protection and selected traces, since a late backup can change W even when the best early line is unchanged. Preserve 30/30 executable lines; never enforce equality using a cEDH label. Resource-correction deltas are reported separately, and the combined result still needs §10.7 p50>=85 in regression/holdout, regression p10>=80 and both formerly missing-line lists >=80. The stored p50 readings are 89.5/91, not measurements of this proposal. |
| Pile W ordering | In EACH profile and EACH of `ctrl93`/`ctrlmatch`, **pile W p10/p50/p90 <= eligible-real W p10/p50/p90**, respectively: 0 positive quantile gaps. Measure the frozen paired controls and fresh disjoint controls with the same evaluator/quantile policy. An existing reversal remains OPEN; a longer horizon is no proof of separation. |
| Pile totals and mechanics | Retain **>=950/1,000 numeric totals <25** in each profile/construction and **>=190/200** in each existing regression construction. Retain <=5% false rejection of eligible real lists by any added detector. Require **0** fictitious finishes, incomplete/outlet-free lines, duplicate resource debits/credits, or positive W from an all-zero-output route without a verified alternative win; every selected route has a trace. All §10.4 probes and unchanged-band gates remain binding. |

The report's “typed route” does not prove all relevant modifiers are modelled: stage 1c explicitly names damage amplification as a remaining output gap, alongside the 25 unsupported-family rows. Audit any such effect against its actual scope and ordering as a separate catalogue change; it neither licenses partial credit nor proves H20 will pass. Corrected costs can increase the failure count. If any gate fails, publish the residuals and leave W/final calibration OPEN rather than changing h, pWin, the horizon or a band to force a pass.

**5. Eligible target; honest full-stride accounting.** The <=5% W exit requirement applies to the eligible stride, replacing its full-stride counterpart in §§10.6/10.7. Retain and report all **1,824** source rows, the **1,478** eligible rows, all **346** eligibility exclusions and their reasons, and the current **98** W-audit `bad_input` failures separately. Those 98 are not all eligibility exclusions. No list is excluded because its family is unsupported or its schedule is slow.

With those 98 excluded failures unchanged, the full-stride failure floor is **98/1,824 = 5.37%**, even with no eligible W failures. An eligible result at its maximum passing count of 73 would instead give **171/1,824 = 9.375%** full-stride failures. These are conditional arithmetic, not a new full-stride acceptance ceiling: excluded-row W failures can also change after resource corrections. Publish the actual count/share and paired deltas at every stage; input repair has its own provenance and does not erase the original denominator. All other §10.7 full-stride reporting and S/total requirements remain in force.

**6. Re-measurement order and final freeze.** The implementation owner must retain isolated, reproducible comparisons; this review performs none of them.

1. Pin the post-1c evaluator, input/cohort hashes and eligibility reasons; reproduce its H12 counts and W/S/total p10/p50/p90, cEDH, anchors and both pile constructions through `scoreDeckSafely`. Keep a fixed S version for attribution even while stage 2 is being developed.
2. Correct rituals only, retaining H12 and every norm; publish the measurements in item 2 and every gained/lost route. Then correct shared deployment, still at H12, and repeat. Audit/correct finite cantrip throughput as a separately attributed step and settle the Vivi trace. No favourable net change may conceal a failed intermediate mechanics check.
3. With those fixes frozen, extend every Commander closing family to H20 only. Report the identical T1–T12 prefixes, first finishes/utility maxima, D(T12/T16/T20), transitions among zero/unsupported/shortfall classes, new proofs and W/S/total distributions. Demonstrate cEDH horizon invariance and pile ordering/totals; report runtime against the existing budget. Brawl/Standard receive no horizon change.
4. Freeze the final W catalogue/recipe/scheduler version only when its mechanics and eligible gates pass. Re-evaluate S useful mass, closing-package admission, role bands, training-only p80 saturation and diagnostic null cells under that domain; require `bands verify` to have 0 mismatches. Stage 2 may prototype before then, but its final norms cannot be frozen against the superseded W domain.
5. Run the actual combined scorer on untouched grouped holdouts, the retained anchors, both control constructions and all gaming probes, preserving §10.7's composition/release gates. No offline component substitution, filtered nulls, band adjustment or source label establishes acceptance. This decision authorises a reviewable implementation; **neither H20's population acceptance nor pile separation has been demonstrated**.

### 10.9 Headline score — decision

Design review, 2026-09-21, branch `auto-improve`, reviewed HEAD `d70bc89f3dab9237b51b081bfd29d9b0b27db9de`. Evidence, in order: §§1/4–5/10.1–10.2/10.7–10.8; harness `~/.claude/harness/runs/deck-score-2026-09-19/v14-stage2-report.md`, `v14-stage1d-report.md`, then `s-discriminant-study.md`. The stage-1d report predates its commit; HEAD establishes that it is now committed. This review reads reports, not the concurrent S re-freeze, and runs no scorer, calibration, build or tests. All new rank thresholds below are **registered requirements, not measured passes**.

**1. Decision: B — rank the composed absolute total once.** The headline is a percentile within the format profile's frozen eligible real reference population. It answers “Where does this deck's modelled composition sit among these reference decks?” Absolute components and the absolute composition remain diagnostics. It does not estimate win probability, predict a pod's duration, establish a bracket, or certify that a list was deliberately built. A casual player gets a relative position plus concrete explanations of mana, useful support and demonstrated closing access; a low absolute W still means weak or slow demonstrated closing access even when the rank looks ordinary.

Choose B over A because an absolute whole-table goldfish predicate is useful as an explanation but gives the wrong headline semantics for this product. A would be internally honest only after calling a precon at 23 an ordinary slow deck and explicitly allowing piles in the same 20–40 region. Choose B over C because separately ranking M/W/S/etc. before composition would make the weights and the weakest-component cap compare population rarity rather than mechanical adequacy: a high percentile of poor closing access is still poor closing access. C adds several moving distributions without adding discrimination. Components retain their existing mechanically defined formulas and frozen norms, including S's p80 saturation; they are not separately percentile-ranked.

The measurements explain this change of meaning:

| Reported comparison | Evidence and implication |
|---|---|
| Stage 2, before the completed 1d accounting | Eligible Commander S-zero/unavailable 82.3% → 0%; S p50 82; absolute total p50 20 → 57. All k=1/5/10 probes have max ΔS=0. At equal coverage the reported real-p80/pile-p95 useful-mass margin is only .02–.07 per slot. ctrl93 below 25 falls 99.5% → 19.7%. Useful mass is not an origin classifier. |
| Corrected 1d, H12 versus H20, S fixed | Eligible Commander W-zero 882/1,460 (60.4%) → 74/1,460 (5.1%); absolute total p50 20 → 38. ctrl93 below 25: 890 → 233/1,000; ctrlmatch: 919 → 330/1,000. Longer schedules move real decks and piles together. |
| Corrected 1d, H20 | W p10/p50/p90 .4/23.1/60.2; cEDH horizon-only W/total changes 0/30, reported cEDH absolute p50 92. Anchors 9/16 in the old bands. Witherbloom closes T14 at J=.015 and totals 23; making it satisfy an absolute 40–55 band would misstate this predicate. |
| Existing discriminant evidence | No tested linkage/commander/W discriminator validates a pile guard; the roughly .88 supply-statistic AUC ceiling describes the tested family, not a universal impossibility theorem. The available model does not justify separating a useful-staple draw from a casual real deck of comparable composition. |

This subsection supersedes the absolute headline/band interpretation in §§1–10.8, §10.1's rejection of a **whole-total** population rank, the numeric pile gates, the absolute-total population thresholds, and the W distribution thresholds identified below. It does **not** revive a coverage-conditioned S rank, change S's U/D formula, permit anchor-specific corrections, or weaken mechanical/resource validity. Core weights and meta weight 0 remain frozen.

**2. Exact reference population and mapping.** Let `p` be the actual calibrated format profile, not an inferred power level, commander, archetype, coverage stratum or provenance label. Maintain separately admitted references for `commander`, `brawl`, `competitivebrawl`, `standardbrawl` and `standard`; no reference is borrowed merely because another format also has 100 cards. The reports establish three training cohorts, not independent calibration of every application slug. A profile without its own eligible reference/holdout evidence has no calibrated rank.

Freeze training membership before evaluating anchors or holdouts. Use every identity-resolved, snapshot-rule-valid real training list in the declared stride, with exact duplicates collapsed and list/event/commander families grouped under the published split policy. Include losers, low-coverage numeric estimates, S=0 and W=0 lists; exclude synthetic controls and all designated anchor/holdout families. Do not select lists by their eventual total, known recipe or desired band. The reference represents this sampling frame, not every deck ever built or every player.

For `F_p` independent families and `n_f` distinct eligible lists in family `f`, give each list weight `w_fi=1/(F_p*n_f)`. Thus each family has total weight `1/F_p`. Require `F_p>=30`, complete source/exclusion accounting, and a finite absolute total from `scoreDeckSafely` for **100% of eligible reference rows**. An entirely unevaluable essential component blocks this freeze; silently dropping its row or assigning it a fictional zero would change the population. Partial but numeric low-coverage rows remain included and provisional.

```text
B(x)     = the existing weighted arithmetic base from unrounded absolute components
T_abs(x) = clamp(min(B(x), 20 + .8*min(M(x), W(x), S(x)), applicableRuleCaps), 0, 100)
           // null if an essential component is entirely unevaluable

F_p(t-)   = sum_i w_i * [T_abs_i < t]
m_p(t)    = sum_i w_i * [T_abs_i = t]
Q_p(u)    = inf { t : sum_i w_i * [T_abs_i <= t] >= u }, 0 < u <= 1
rank_p(t) = 100 * (F_p(t-) + .5*m_p(t))
headline = round(rank_p(T_abs(x)))           // display only
absoluteTotalDisplay = round(T_abs(x))      // diagnostic only
```

Store the complete sorted full-precision absolute-total knots and their cumulative family weights: this is the frozen weighted empirical CDF and its inverse `Q_p`, not a fitted curve or a few interpolated deciles. At a tie, all decks receive the midpoint of the tied weight interval. Between knots, rank equals 100 times the cumulative weight below the query; below/above the support it is 0/100. Do not stretch endpoints to force the weakest/strongest reference deck to 0/100, split ties by identity, add jitter, or rank rounded totals/components. Canonical deterministic numeric output defines equality. Grade bands and probes on unrounded rank; rounding a 49.7 to 50 does not meet a p50 lower bound.

Weighted training **mean** rank is 50. Training p10/p50/p90 need not be exactly 10/50/90 because ties retain their mass. Report each tied interval and the largest atom; neither a near-uniform reference distribution nor its mean is independent strength validation. A deck in the top 2% by this absolute composition maps to approximately p98–p100, subject to ties. A cEDH label supplies no percentile bonus; whether the cEDH cohort actually occupies that tail is a separate acceptance test.

Keep confirmed structural/legality failures outside the rank domain: return no percentile headline, show the rule failure, and retain the absolute 0/19 limit and component diagnostics. Unknown-only identity cases reserve every slot and use §10.5's evidence policy. A computable estimate with unresolved identity, coverage <=80%, or unknown critical mechanics may show the same mapping labelled **provisional**; an entirely unevaluable essential component has neither numeric total nor rank. A missing/incompatible reference or dataset version yields no comparable rank. Evidence labels never select a different CDF, subtract/add points, or turn a high numeric pile rank into a successful low one.

On any oracle, legality, effect, recipe, assignment, scheduler, weight or norm change, invalidate the old reference. Keep paired IDs/splits fixed, bump score/catalogue/reference versions, re-evaluate the real training lists through `scoreDeckSafely`, re-freeze the affected S role bands/p80/null diagnostics, then rebuild the total CDF from training only. Changes to the sampling frame or family membership also require a declared reference version and fresh evaluation. Record input, family, domain, evaluator and reference hashes, exclusions and quantile/tie policy. No live submitted deck updates the reference. Require `bands verify` and reference reproduction to have **0 mismatches**, then evaluate untouched holdouts. A failed holdout rejects the version; it does not authorise choosing another percentile, changing a band or refitting on that holdout.

**3. Bands and population acceptance.** Rank bands describe location in a named profile's reference: below p15, lower p15–p40, middle around p40–p60, upper p60–p85, high p85–p95, and the nominal upper 5% at p95–p100 (midrank ties can put more than 5% of reference weight in that band). They are not portable absolute strength tiers, and equal Commander/Brawl/Standard ranks do not mean equal decks. “cEDH” and “precon” remain independently established context, never classifications inferred from these numeric bands.

All measurements below use the actual composed `scoreDeckSafely` result and frozen reference. Publish both all-source and eligible strata, row and family counts, evidence/legality exclusions, nulls, selected routes, U/D, coverage, S/W/T_abs/rank distributions and grouped bootstrap intervals. Preserve the legacy R requirement diagnostic; it is not the headline rank. Use family-weighted inverse-CDF quantiles and original row denominators for stated row-share gates. In a separate acceptance distribution, unavailable eligible outputs count as 0; this is never a displayed product score or a way to populate the reference. Full-stride illegal rows have no rank and cannot be folded into a fake low percentile.

| Population/check | Registered acceptance |
|---|---|
| Training reference, each admitted profile | >=30 eligible independent families; 100% source rows accounted for; 0 anchor/holdout family overlaps; 0 unavailable eligible reference totals; weights sum to 1 and weighted mean rank=50 within 1e-9; 0 knot/tie/between-knot/endpoint reproduction mismatches. Report distribution and ties; do not count the mean as quality evidence. |
| Frozen S on final 1d domain | `bands verify`: 0 active-cell/constant/domain mismatches. Retain Commander/Brawl S-zero or unavailable <=10%, S p10>=10, p50>=60, p90>=90, eligible S=100 share<=25%, on actual full/eligible strides and corresponding holdouts. Standard retains S-zero/unavailable<=5%, uses its own S norms, the same percentile lower guards and <=25% saturation; retire the obsolete 75–85 S-median window. |
| Representative real holdout, each admitted profile | >=30 unseen eligible families with the registered sampling design. At each rank threshold 10,20,...,90, absolute difference between holdout and frozen-training cumulative family-weighted shares <=.10. Compare with the tied training distribution, not a uniform ideal. Report eligible rank p10/p50/p90 and all provisional/unavailable shares; 0 missing eligible numeric totals for accepted calibration. |
| W evaluability | Audit/classify 100% of W-zero/unavailable rows; unsupported closing-family rows <=1% of eligible rows in each profile, on training and holdouts. Every selected closing route has a trace; 0 fabricated finishes, resource violations or missing-outlet wins. Known absence, missing prerequisites and demonstrated horizon shortfalls remain honest zeros. |
| cEDH regression and independent event/commander holdout | Absolute W>0 and verified executable routes for 30/30 existing lists; horizon-only W/T_abs changes 0/30. Rank p10>=95 and p50>=98 in each cohort; both formerly missing-line regression decks and Balloon Con rank>=95. Holdout: >=30 legal verified cEDH lists across >=10 independent event/commander families, with no training/regression-family overlap. A heavy tie that misses the threshold fails it. |
| Untouched precons | Witherbloom rank p15–p40, mandatory. Independent cohort: >=30 unchanged legal lists from >=10 held-out precon products; family-weighted median rank p15–p40. Hold out whole products, retain their published lists, and report dispersion; not every precon is assumed equally strong. |
| Standard W/L validation | Set **X=10 percentile points**: positive median rank minus negative median rank >=10 on chronological grouped holdouts. Test Challenge/top-event winners and 5–0 leagues separately against contemporaneous, snapshot-legal losing-record cohorts from the corresponding event/league frame; >=30 independent list/event families per side per reported comparison. Include all qualifying losing records, report overlap and grouped uncertainty, and publish W/L denominators. Missing league negatives leave that comparison unvalidated. Outcomes do not enter reference weights; there is no required gap for every individual winner/loser pair. |
| Independently reviewed legal positives | >=90% in their preregistered profile/class rank bands, with >=30 unseen reviewed families per admitted profile; adjudicate class/provenance before opening scores. Named fixtures are reused regressions and cannot supply this independent pass. Insufficient Brawl/profile evidence stays uncalibrated. |

Retire §§10.7–10.8's absolute total p10/p50/p90 floors, absolute cEDH/Standard headline thresholds, W p10/p50/p90 floors 6.25/37.5/62.5, aggregate W-zero <=5% gate, and mandatory pile-versus-real W quantile ordering. Those constraints were attempts to make the old absolute headline occupy desired display bands or detect piles. Do not replace them with a W floor or a relaxed scheduler. The current **74/1,460 still fails the old 5% rule**; this decision changes that rule explicitly, not its reported verdict. Its classes are 60 `predicate_short`, 6 `unsupported_family` (.41%), 3 `known_absent`, and 5 `missing_prerequisite`. Continue reporting all four, absolute quantiles and T12/T16/T20 shortfalls; only a real mechanical correction changes their classification.

**4. Honest pile requirement.** Explicitly retire **>=95% of piles below absolute 25**, >=190/200 below 25, pile S<=5 requirements and the claim that a whole-table predicate is a pile guard. No current mechanism achieves that separation while preserving casual decks; a monotone rank adds none. A legal draw of useful typed staples may rank like a casual deck, including above the median. Also reject `p95(pile rank)<=real p50`: indistinguishable populations would instead have broadly similar rank distributions, with a pile p95 near the real p95, not p50.

Replace origin detection with a prospective guard against **excessive top-tail ranks**, alongside the per-edit invariants below:

| Construction / scope | Release requirement |
|---|---|
| `ctrl93`: heavily typed, legal identity/land/curve-constrained draws | In each admitted profile, **at most 100/1,000 ranks >=95** on fresh controls with disjoint seeds and held-out commanders/families. Retained 200-list regression construction: **at most 20/200**. |
| `ctrlmatch`: the same controls with target coverage sampled from the real distribution | The **same <=100/1,000 and <=20/200** limits, separately; no averaging with ctrl93 or across profiles. Preserve achieved coverage distributions and .05-bin diagnostics. |
| All controls | 100% legal, identity-resolved inputs with numeric `scoreDeckSafely` totals/ranks; count provisional numeric ranks normally. Invalid generation and unavailable scores cannot pad a pass. Keep original paired seeds/lists, publish generator failures, and regenerate only for predeclared legality/construction failures. Report rank p10/p50/p90/p95, the >=95 count, absolute distributions and grouped uncertainty. |

The 10% upper-tail allowance is a registered product tolerance, twice the nominal 5% reference tail; it is not a measured result, a 90% pile-rejection claim, or a guarantee against an optimised adversary. It can accommodate a population overlapping ordinary real decks while rejecting a generator that routinely produces purportedly exceptional model ranks. There is no asserted pile-median ceiling. Use both constructions for Commander and each other profile proposed for rank release, with its actual legality/copy/size rules. Existing report numbers at absolute 25 cannot establish this new gate. Freeze-before-test and the same numeric threshold apply on retained and fresh controls; never choose seeds or a CDF to obtain the pass.

**5. Gaming transfers by order, not by numerical distance.** For a frozen mapping, `T_abs_after<=T_abs_before` implies `rank_after<=rank_before`, including ties. Thus genuinely non-increasing whole-total edits transfer automatically. However, §10.4's allowance of **+1 displayed absolute point does not imply +1 rank point**: a small absolute gain can cross a large CDF atom, even without changing the displayed absolute integer. Rank is monotone, not distance-preserving. Keep the absolute/component checks and explicitly test the headline.

| Probe, all applicable k=1/5/10 | Required maximum over the entire edit |
|---|---|
| Matched no-benefit deletion, unknown-slot addition/substitution, zero-use typed staple and dominated-source edits | ΔS<=1e-6 and, for the whole scorer, **ΔT_abs<=1e-6**; Δunrounded rank<=1 and Δdisplayed rank<=1. This strengthens the old absolute +1 display allowance for declared no-benefit cases; a tolerance-sized floating change is not excused if it jumps a rank atom by >1. Require 0 violating lists. |
| Zero-output additions/substitutions with no new resource/support/alternative-win path | Additionally ΔW<=1e-6; no free 0-power body may improve access K. Require 0 new claimed finishes or positive-W all-zero-output routes without a verified alternative win. |
| Fully equivalent lands, order/printing/quantity representations | Numerical equivalence: absolute S/W/T_abs movement <=1e-6 and unrounded/displayed rank movement <=1; order/printing/quantity representation changes remain exactly invariant. Report both directions, not just positive gain. |
| Provenance, price, popularity, ownership, requested power label, edit history | **Δcomponents=ΔT_abs=Δrank=0 exactly**; fixed profile/reference/version. A source label cannot identify a synthetic control inside scoring. |
| Broken producer/consumer, tutor-target, mana/outlet proofs | Remove the invalid proof, never invent replacement credit; W/S must fall or the appropriate existing gate bind. Preserve 3/3 original quota cases with non-increasing S/W/T_abs/rank, plus the expanded real-stride and holdout cases. |
| Genuine improvements and legal Standard excess-card trims | Keep §10.4's exact U/D Standard trim bound `0<=ΔS<=100*k/N_before` where applicable; disclose mechanically justified M/W/T_abs and rank changes. They are not no-benefit invariants. Fixed-slot counterparts still have the zero-gain requirement. |

Run direct size-changing and legal fixed-slot counterparts on the real strides and fresh grouped holdouts. Separate actual rule repairs, obstruction removal and newly feasible plans before grading; a <=19 invalid-size cap cannot hide a diagnostic gain. Rank deltas apply only when both endpoints have numeric ranks. If a direct edit creates a confirmed rule failure, verify its no-rank state and component bounds, then grade rank on the legal fixed-slot counterpart; an absent rank is neither zero nor a numeric probe pass, and the case remains in the report. Unknown slots never improve evidence status. The stage-2 report already records whole-total gains up to +14 Commander/+19 Brawl on deletion and other residual gains; stage 1d says residuals are equal or lower, not that they all vanish. **The expanded whole-total/headline gaming gate remains OPEN**, despite max ΔS=0 and quota 3/3. Fix a demonstrated mechanical/denominator defect, then re-freeze dependent norms/reference before independent validation; a rank layer cannot repair it.

**6. Commander W: H20 and the existing cap stay.** Keep the exact §10.8 whole-table predicate, per-opponent allocation, `.15` ordinary access target, `Tfast=7`, `h=5`, continuous raw-J control utility, paid deployment, one-shot rituals and finite card/mana accounting. Brawl and Standard stay H12. H20 recovers 808 of the H12 zero rows while leaving the measured 30-list cEDH horizon comparison unchanged. It models more honest slow finishes; it does not separate piles or prove real games last 20 turns.

Keep `20+.8*min(M,W,S)` for **all** profiles, including casual Commander; no casual label bypasses W. Removing W from the cap would be a second composition experiment with new orderings and gaming risks, not a scale decision. Witherbloom's absolute 23 remains visible; its rank must be measured against the same constrained absolute totals as other decks. If a mandatory rank band fails, that is an explicit validation failure, not permission to drop the cap, adjust decay or select a commander-specific reference.

**7. The 16 anchor expectations under this headline.** These replace the corresponding absolute strength bands in §§5/8/9/10.8. They are new, disclosed rank hypotheses informed by the review, not measured percentiles or fresh validation labels. Use the exact §5 selectors and resolved snapshot identities, with these inclusive unrounded bands:

| # | Anchor / exact §5 selector | Profile | Required rank / rule result |
|---|---|---|---|
| 1 | `decks/paper/proposals/meren-powerhouse.txt` | Commander | **p65–p90**; mandatory |
| 2 | `verify-2026-09-19/cabbage-cedh-input.txt` | Commander | **p50–p90**; mandatory; the filename is not cEDH evidence |
| 3 | `verify-2026-09-09/precon-witherbloom-list.txt`, Willowdusk | Commander | **p15–p40**; mandatory unchanged precon |
| 4 | `decks/paper/decks/the-cabbage-merchant.txt` | Commander | **p50–p90**; mandatory |
| 5 | `decks/paper/decks/imotekh-the-stormlord.txt` | Commander | **p40–p80** |
| 6 | `decks/paper/decks/tazri-beacon-of-unity.txt` | Commander | **p35–p75** |
| 7 | `decks/paper/decks/meren-of-clan-nel-toth.txt`, 101 cards | Commander | **No rank**; structural failure, absolute total 0–19 |
| 8 | `decks/paper/decks/ramos-dragon-engine.txt`, 3 cards | Commander | **No rank**; structural failure, absolute total 0–19 |
| 9 | `decks/brawl/cabbage-merchant-current.txt`, 101 cards | Brawl | **No rank**; structural failure, absolute total 0–19 |
| 10 | `decks/brawl/tazri-upgraded-arena.txt` | Brawl | **p35–p65** if rule-valid |
| 11 | `decks/brawl/kuja-genome-sorcerer-arena.txt` | Brawl | **p25–p60** if rule-valid |
| 12 | `decks/brawl/vivi-battery-arena.txt` | Brawl | **p80–p100** if rule-valid |
| 13 | `decks/brawl/fire-lord-azula-competitive.txt` | Competitive Brawl | **p80–p100** if rule-valid and independently calibrated in that profile |
| 14 | `decks/test-builds/refs/thrasios-tymna/cedhtop16.json`, `decks[2]`, `RW50cnk6MjI5MzU1` | Commander | **p95–p100** if rule-valid; mandatory |
| 15 | `data/export-standard.db`, `community_decks.id=1445893`, Univerce | Standard | **p65–p95** if rule-valid |
| 16 | Same DB, `id=1445867`, aljce | Standard | **p55–p90** if rule-valid |

The deliberate overlaps matter. The corrected web Cabbage has absolute 59 versus paper 54; monotone ranking cannot place web below paper. Both now occupy the broad developed-casual reference band, with their different mechanical weaknesses explained by diagnostics. This explicitly retires the old mandatory web-below-paper strength ordering; it is not a claimed mechanical repair. Likewise Kuja's absolute 56 is below Brawl's reported median 68, so its former absolute 60–80 hypothesis is not carried over as a high-percentile demand. Vivi's corrected T7/W82.7/absolute86 is no longer “out high at 85” merely because the old scale ended there. No computed ranks have yet been inspected to narrow or relocate these bands.

Require **>=14/16** table results, including all three structural outcomes and the mandatory Meren, precon, both Cabbages and Balloon Con entries; report the legal subset separately (at least 11/13). A provisional or uncalibrated profile does not count as a calibrated anchor pass. Do not silently omit an unavailable anchor or promote a regression count into the independent >=90% positive-cohort requirement. The fresh precon/cEDH/Standard and reviewed-positive checks above must substantiate these product expectations. A failure remains a failure; revising this table again requires a separate declared decision supported by independent reviewed cohorts, not fitting the CDF to the fixtures.

**8. Smallest remaining build order to an accepted v1.4.** Stages 1d and 2 are the measured starting point. Reuse their paired inputs and corrections; no new pile detector or component-rank layer is authorised by this decision.

| Stage | Work and exit evidence |
|---|---|
| 1 — finish the in-flight S re-freeze | Freeze on the completed 1d domain; reproduce every active band/p80/null cell and domain hash with 0 mismatches. Publish actual full/eligible training strides: Commander 1,798/1,460 (182 eligible families), Brawl 1,146/797 (179), Standard 373/360 (42), or an explicitly accounted new cohort version. Account for 100% of rows; meet the S/evaluability gates above. Keep the raw 1d comparison distinct from the new freeze. |
| 2 — absolute/rank result layer and reference freeze | Add unrounded T_abs and one per-profile frozen CDF to `scoreDeckSafely`; preserve components, W/cap and rule/evidence states. Pass 100% of mapping/reproduction checks, >=30 families per admitted profile, 0 dropped eligible null rows. Publish all 16 anchors and cEDH/precon rank results; grade this table, not new builder bands. Obtain any missing profile reference/review cohorts before claiming calibration. |
| 3 — adversarial composition | Run all k=1/5/10 direct/fixed-slot probes on actual full/eligible real strides: 0 excess-gain cases, original quota probes 3/3, metadata exactly 0. Pass both construction-specific top-tail limits on retained and fresh controls. Any repair changes the evaluator version and restarts the affected S/CDF freeze; never keep a stale CDF after a repair. |
| 4 — locked independent evaluation | After freezing everything, evaluate untouched grouped/chronological holdouts through the same `scoreDeckSafely` entry point. Preserve the corrected reported holdout pools (Commander 919, Brawl 570, Standard 227 source rows), account for all exclusions, and add genuinely untouched families if earlier reports already inspected a pool. Meet every population, cEDH, precon, Standard X=10, >=90% reviewed-positive, anchor and gaming requirement above; repeat control tests with fresh disjoint seeds. No parameter/band fitting to this evaluation. |
| 5 — independent refuter | Reproduce reference/domain hashes and published counts with 0 mismatches; audit ties, nulls, family leakage, rule/evidence states, selected finish traces and no-benefit edits. Require 0 unresolved critical/high correctness findings and 0 unexplained cohort/gate omissions. Correct findings, re-freeze and use replacement untouched validation when needed. Median scoring latency <20 ms on the reference desktop over real eligible strides/holdouts; report tails and cold calls. Existing project type/lint/test checks must pass for the implementation. |
| 6 — web/desktop release | Deploy only the accepted version/reference pair. Require 0 numeric, profile, evidence-state or version discrepancies between web, desktop and the scorer on the 16 anchors plus fixed holdout/probe cases, and 100% correct no-rank/provisional presentation. Publish reference population/date and release-gate results. A profile with insufficient or failed validation keeps a clearly uncalibrated diagnostic view; an outstanding mandatory gate cannot be reported as a completed full v1.4 release. |

Web and desktop show **“Deck rank” / percentile as the headline**, the reference format/date and provisional status beside it, and the absolute M/C/I/A/W/S diagnostics plus an expandable absolute total and selected closing trace. Explain, for example, that a T14 finish with low joint access limits the absolute closing measure; do not translate percentile into a chance to win. Return explicit headline kind, absolute total, rank, score/reference versions and evidence state so callers cannot confuse an old absolute 80 with a new p80. Compare edits only within the same profile/version/reference. Never badge a high-ranked synthetic or unreviewed list as cEDH, and never call a low-ranked casual list a pile merely from the number.

The rank reference, new pile-tail counts, rank anchor results, complete gaming maxima and fresh holdout/Standard comparisons are **unmeasured at this review**. The reports justify changing the contract and keeping honest mechanics; they do not establish that the resulting release gates pass.

### 10.10 W schedule — the ledger as a choice

Design review, 2026-09-22, branch `auto-improve`. Review began at HEAD `53bc39f`; the concurrent log advanced to `1f8c7c9` during reading. Evidence, in order: §10.8, §10.9 (especially items 5–7), then harness `~/.claude/harness/runs/deck-score-2026-09-19/v14-stage3d-report.md` and `v14-stage3e-report.md`. Stages 3c/3d are committed at `eb9e575`; the reported rc5/stage-3e evaluator is an **uncommitted, unaccepted measurement**, not this decision's implementation. This review runs no scorer or tests and does not inspect or change the concurrent evaluator.

**Decision: optimise the choices of the entire closing ledger; retain actual-N dilution, retain the .25 affordability band at a budget independent of competing wants, and retain the anchor gates unchanged (option a).** Implement and measure this as stage 3g. A deployment-only optimum cannot repair mandatory spending elsewhere in the same ledger. The acceptance numbers below are requirements, not measured results.

**1. Optional actions; compulsory consequences.** Every discretionary debit inside a closing line is a choice: ritual casting, pump/burst spells, engine deployment and use, equip/animate/sacrifice activations, body deployment, and commander re-casting. Availability is an upper bound on use; `quantity * seenBy(N,t)` is never an instruction to spend that many copies. A zero-use option spends nothing, produces nothing, and imposes no upkeep. In particular, remove the policy `deployBudget = produced - expectedSpellSpend - expectedUpkeepSpend` when those expectations describe unchosen actions.

An action is chosen only as part of a feasible continuation with non-negative marginal value toward `Phi`, accounting for the damage displaced by its mana/card/tap/sacrifice costs and its later liabilities. Compare with omitting it; an extra optional spell must not force a later finish. Positive printed output alone is not positive marginal value. A zero-direct-output prerequisite may be useful as part of a complete paid package; an isolated zero-value expenditure loses the tie to doing nothing.

The only compulsory debits are consequences imposed by the rules on the line's own choices. A chosen commander re-cast pays its actual tax; a permanent the line deployed incurs its actual upkeep obligations. An optional upkeep payment remains a choice with the printed non-payment consequence. Include unavoidable future liabilities when valuing deployment; a line cannot retain the permanent/output while quietly skipping its cost. Do not levy upkeep on the expected number of copies merely seen. If a chosen state cannot meet a compulsory consequence, apply its actual rules outcome or reject that continuation.

**2. Exact turn problem, with fractional knapsack where it applies.** Freeze the profile planning horizon at Commander 20 and Brawl/Standard 12. A Commander H12 diagnostic truncates the same H20-planned trace; it does not change its priorities. Thus §10.8's identical T1–T12 prefixes remain required. Freeze the recipe/source choice set and typed cost/output bins before allocation. Keep the existing bounded line/source enumeration (at most `poolSizeCap <= 10` sources per candidate and at most 20 turns); do not change a source's coefficient or eject an existing alternative just because another option's want shrank.

At entry to turn t, snapshot completed deployments/uses, live permanents, consumed cards, legal targets, and the current resources. For a newly drawn physical copy:

```text
available_i(N,t) = quantity_i * seenBy(N,t)
want_i(N,t | state) = max(0, available_i(N,t) - paid_i(state))
B_entry = mana actually produced by this state's paid sources
          - compulsory costs due from this state's previous choices
```

Command-zone availability remains guaranteed when that card is actually there; a re-cast has its own event and taxed cost. Repeat activations use bounds from live paid sources, remaining legal uses, victims and targets, not the once-only draw formula. Copies consumed by spells/rituals cannot reappear without a separately paid typed path. No optional spell, engine or activation is subtracted in advance.

An item is one typed action or a complete compatible package, with a full casting/activation cost, its physical-copy/resource use, and a causal damage-output vector by turn and opponent. Use the same lower output bounds and upper cost bounds as access/recipe admission. Include lost attacks and sacrificed output, not only gains. For a fixed prerequisite/interaction branch, define:

```text
deltaD_i,o(s) = incremental damage on turn s from one selected unit
               relative to omitting it, with all required payments accounted for
v_i(t) = sum_{s=t..H} (d_p(s)/d_p(t)) * sum_o deltaD_i,o(s)
```

This is the common currency: damage contribution through the fixed horizon, discounted by the existing decay. A body contributes its legal future attacks; an engine contributes only typed future output after deployment, sickness and required upkeep/activation payments; a pump contributes damage on its actual eligible hosts/attacks. Projected draws cannot become free spells or an unlimited cantrip chain. Unknown output supplies no coefficient. Keep damage allocation explicit; the allocation must still satisfy every opponent's target, and overkill cannot be reassigned.

A ritual's resource value is its **net mana this turn**, `gross - castingCost`, converted to damage by what that mana can buy in the same turn problem. It is not assigned one damage per mana, and it is not automatically cast first to its maximum want. Its cast-trigger damage, if any, is counted once. Pay its casting cost before crediting its gross output; unspent mana expires. A ritual with no useful feasible spender can be omitted. The implementation may use the downstream knapsack's marginal damage-per-mana to price a ritual, but must compare the resulting complete allocation with the no-ritual allocation.

For fixed chosen ritual amounts r and their legal resolution order, freeze the competing actions' budget **before** their optional debits:

```text
B_prefix_j = B_entry + sum_{k<j} (gross_k - cost_k) * r_k
0 <= r_j <= min(want_j, affordable(B_prefix_j, cost_j))
// Pay each selected cast at this prefix before crediting its own gross output.
B_branch(r) = B_entry + sum_j (gross_j - cost_j) * r_j
V_ritual(r) = sum_j v_ritual,j * r_j  // discounted typed cast-trigger damage only
u_i = min(want_i, affordable(B_branch(r), cost_i))

V_branch(r) = V_ritual(r) + max_x sum_i v_i * x_i
           subject to 0 <= x_i <= u_i,
                      sum_i cost_i * x_i <= B_branch(r)
```

For independent additive items without binding finish constraints this is exactly fractional knapsack: omit items with `v_i<=0`, process the others by descending `v_i/cost_i`, with a stable canonical action-ID tie-break, and take `min(u_i, remainingMana/cost_i)`. Resolve positive-value zero-cost items under their finite resource bounds first. The affordability cap is never recomputed against that changing residual. Body deployment, engines, pumps and activations compete in this **one value order**, not mandatory category prepasses. Update their shared ledger exactly once.

Ritual amounts are optimisation variables, not `r=want`. Retain the empty ritual branch. When costs/outputs interact, use explicit resource/prerequisite constraints or mutually exclusive typed branches: pump use cannot exceed eligible host/attack capacity; equipment damage requires paid attachment; sacrifice consumes a paid victim; tap/colour/card resources cannot be spent twice; incompatible modes share their physical-copy bound. These constraints and output coefficients are fixed by mechanics and the entry state, not recomputed from how many unwanted spells happen to be present.

Future output also carries an explicit reserved-payment ledger. For every projected turn s, enforce `existingDue(s) + sum_a futureCost_a(s)*use_a <= existingProduction(s) + sum_a futureCredit_a(s)*use_a`, with causal colour/tap/card constraints and physical-copy availability at that deadline. Include upkeep and the future activations that produce the claimed output. These reservations belong only to selected actions; setting their use to zero removes their future costs and output together. Record and recheck them when s arrives. A damage coefficient alone cannot fund its future payments.

The implementation choice is a bounded **piecewise-linear turn allocation** with the exact knapsack above as its separable fast path. Jointly optimise r and x under those constraints and causal mana prefixes. Split `affordable(B_branch(r), cost)` at its two stated breakpoints when the ritual choice changes B; each fixed mode/segment is a linear subproblem. Maximise over the feasible branches, including omission. A fixed ritual prepass or a density sort with unresolved host/shared-copy constraints is not that optimum. This specifies the feasible problem without claiming that a cross-turn subset DP has only `20 * 2^10` states: quantities, paid history and resources also matter. Performance remains a measured gate.

**Finish has priority over terminal output.** A scalar damage-by-H objective alone can prefer a slow engine and delay a close. Within each turn's declared paid projection, test candidate completion turns tau=t..H in ascending order, across all feasible branches:

```text
D_state,o(tau) + D_ritual,o(tau; r)
               + sum_i projectedD_i,o(tau) * x_i >= lifeTarget_o
                                                     for EVERY opponent o
```

`D_ritual` is the branch's typed cast-trigger damage through tau; its cost has already been paid in the ritual ledger and is not debited again. Use the corresponding exact predicate for same-commander damage or verified alternative wins. `projectedD` includes only causal output with feasible payments; an unchosen future spell cannot appear in it. Choose the first feasible projected finish, then maximise the discounted contribution subject to that finish, then minimise spending, then break ties by canonical action ID. If none finishes, maximise the non-negative feasible contribution, including the omit-all optional allocation. Finish constraints can require the coupled solve even when the unconstrained problem was a knapsack. Recheck `Phi` on the realised ledger; projection alone earns no W. Keep §10.8's ordinary utility maximum and control first-actual-finish rule when valuing the resulting trace.

Carry `paid` across turns exactly as completed-copy/consumed-copy expectation, and carry live permanents with their chosen liabilities. For each newly selected fraction x, debit `cost*x` entirely in that turn and record the complete cast/deployment represented by x. Never carry an unpaid cost balance or give output before payment. This is an optimum of the stated **turn projection**, not a proof of globally earliest play over every possible future hand.

**3. What is proved, and what must be measured.** At identical entry state, write the feasible choices as `F(w,B)`, with w including the current and projected physical-availability bounds. Constraints, coefficients, branches and resource accounting are independent of wants except for their upper bounds. An added option leaves every old solution feasible by setting its new use to zero; no mandatory debit is introduced. The optimum cannot get worse. Pointwise-smaller wants and no larger external mana budget give:

```text
w' <= w and B' <= B  =>  F(w',B') is a subset of F(w,B)
                       => max feasible contribution cannot increase
                       => a previously infeasible projected finish cannot become feasible
```

A selected ritual's credit or a selected permanent's upkeep is inside the choice constraints, not a hidden want-dependent external budget. The same ritual/deployment choice remains available in the larger feasible set. This is why shrinking a spell's availability can no longer manufacture deployment mana.

These statements concern optimal objective values and finish feasibility, not coordinatewise changes in the selected allocation; the finish-first objective is compared lexicographically. This proof is conditional on the same state and choice set. Cross-turn `paid` carry changes states and later marginal output; recipe/pool selection, finite draws, compulsory upkeep of previously chosen permanents, and access/composition add further conditions. **Full-schedule W, first finish and whole-score monotonicity remain measured properties**, not consequences of the one-turn knapsack proof. An observed violation fails acceptance; do not suppress it with rounding, a cached minimum, a score clamp, or a changed rank reference.

**4. Dilution and affordability decisions.** Keep actual library size N in both the expected schedule and `J(n(t))`; do not normalise wants at N0. At the same causal draw deadline, adding unknown slots preserves physical quantities and weakly decreases every library-copy `quantity * seenBy(N,t)`; command-zone availability is unchanged. Unknown slots provide no resource, action or evidence improvement. This tightens choice bounds and weakly lowers access. The goldfish clock models the output available by a turn, while J models access to the complete required pool combination; these remain separate proxies, not independent probabilities to multiply a second time. Fixing wants at N0 would let a larger library retain an undiluted expected deployment/trigger clock. That is not the intended model.

The local dilution argument assumes produced resources do not grow under the same dilution and entry state; audit that premise too. Direct deletion changes N in the other direction and may improve access to surviving cards. It is not automatically a no-benefit edit: retain §10.9's predeclared rule-repair/obstruction/legitimate Standard-trim distinctions and fixed-slot counterparts. Do not claim the local option-removal theorem proves that every arbitrary smaller deck must score lower.

Retain `AFFORD_BAND = .25`, frozen rather than swept to recover anchors:

```text
affordable(B,c), c > 0:
    0                         if B <= .75*c
    (B - .75*c) / (.25*c)      if .75*c < B < c
    B/c                       if B >= c
```

For the first copy this is the existing proxy for the turn's available mana covering one whole cast; above c it also bounds multiple-copy throughput. B means the turn/branch-entry mana left after actual compulsory obligations and chosen causal ritual resolution, **before competing optional items**, not a residual after earlier items. Zero-cost actions use finite availability/resource bounds instead of division.

The band is a declared modelling assumption, not a calibrated mana-distribution estimate. Keep it because removing it would allow unrestricted fractional purchases when the turn cannot plausibly fund a whole cast and would be a separate evaluator change. The steep ramp no longer buys extra bodies with mana freed by a previous optional want: all competing boxes are fixed together and the shared cost constraint still applies. A fraction denotes expected completed whole casts in that turn, never a fraction of a card paid over several turns. Preserve §10.8's atomic-payment, one-shot-ritual and summoning-sickness invariants. The scalar proxy alone is not a proof of a jointly realisable hand distribution; no trace may present fractional prepayment as an executable cast.

**5. Anchor decision (a): the bands stand; release remains blocked.** Keep every §10.9 item-7 band and selector, **>=14/16**, the legal **>=11/13** subset, and all eight mandatory results: Meren powerhouse, both Cabbages, untouched Witherbloom, Balloon Con, and all three structural fixtures. No anchor table changes.

The reported rc5 outcome is **11/16 FAIL, 8/13 legal FAIL**, with all eight mandatory results passing. #6 Tazri Beacon p79.88 is OUT HIGH of p35–75; #10 upgraded Tazri p27.57 is OUT LOW of p35–65; #15 Standard p61.08 misses p65–95; #16 p50.13 misses p55–90; #13 remains uncalibrated and cannot count as a pass. Kuja now passes. These are the report's measurements, not a new evaluation.

Optimising previously stranded mana is a declared evaluator change and therefore invalidates old S-domain/reference artefacts under §10.9 item 2. That requirement does **not** supply independent evidence for new expected ranks. There is no independent reviewed cohort here to justify centring bands on rc5, widening them, or dropping non-mandatory fixtures from the gate. Re-freeze the affected artefacts mechanically, keep the bands, and report stage 3g against them. If honest corrected mechanics still miss them, release stays blocked pending a separately supported decision; never restore a defect to recover a fixture.

The reported 9→6/200 piles below absolute 25 is a distribution change, not the current pile-release test: §10.9 item 4 already retired that threshold. Its construction-specific top-tail gates remain binding and unverified by this count.

**6. Stage-3g acceptance and re-freeze.** Pin the actual implementation revision and inputs before measuring; the concurrently edited rc5 file cannot serve as an immutable baseline. Preserve the rc4/rc5 reports and logs for attribution. Do not choose norms, affordability width, source order, horizon or bands after inspecting stage-3g outcomes.

| Check | Required stage-3g evidence |
|---|---|
| Shared-ledger mechanics | Audit every debit/credit category in item 1. Publish chosen and skipped actions, availability/paid bounds, branch-entry budgets, affordability boxes, actual costs/gross credits, compulsory liabilities, damage by opponent, first finish and selected utility turn. Zero double spends, ritual reuse, unpaid output, future borrowing or fabricated/missing-outlet finishes. Reproduce the named dilution/blank traces and unchanged H12/H20 prefixes. |
| Full gaming matrix | Commander, Brawl and Standard, all applicable direct and fixed-slot probes at **k=1/5/10**, including **add-unknown-slots**: **0 violating lists on every graded row**, on retained real strides and fresh grouped holdouts. Use §10.9 item 5: no-benefit ΔS/ΔT_abs <=1e-6; applicable ΔW<=1e-6; unrounded/displayed rank gains <=1. Metadata/representation exact invariants and original quota **3/3** remain binding. Publish complete counts/IDs and full-precision maxima; an empty or unavailable row is unverified, not a pass. |
| Delete-one / blank-one property | **200 predeclared lists per profile**, the original seeded delete-one-random-nonland and blank-one-random-nonland arms (**400 edits/profile**): **0 upward W/S/T_abs/rank violations** under the same no-benefit bounds. Freeze seed, IDs and edit classification before opening results; publish every result, including direct-size and legal fixed-slot counterparts, rule failures and predeclared legitimate trims graded separately under §10.9. The fixed-N blank arm tests option removal. Do not narrow the sample to inert deletions, substitute the earlier 25-list run, silently discard a gain, or let an invalid-size cap hide it. |
| cEDH | Existing **30**: rank **p10>=95 / p50>=98**, **W>0 on 30/30**, with paid executable traces; both formerly missing-line decks and Balloon Con remain >=p95. Report resource-correction deltas separately from **0/30 horizon-only W/T_abs changes**. Keep the independent >=30-list/>=10-family cEDH holdout gate. |
| Anchors | Unchanged table: **>=14/16**, legal **>=11/13**, **all eight mandatory**. Report every row including #13's uncalibrated state. The rc5 11/16 is FAIL, not an accepted baseline for re-pinning a pass. |
| Remaining release evidence | Retain §10.9's independent precon, Standard W/L **X=10**, >=90% reviewed-positive, representative holdout, W-evaluability and S gates. Retained/fresh ctrl93 and ctrlmatch each require **<=20/200 and <=100/1,000 ranks >=95**, separately per profile. Missing cohorts or unmeasured gates remain OPEN. |
| Runtime and implementation checks | Isolated scoring **p50<20 ms** on the reference desktop over real eligible strides/holdouts; report p90/p99 and cold calls with no concurrent debugger/scorer contention. One 13.9 ms cEDH fixture is not a population median. Existing type/lint/test and ledger-invariant checks must pass; distinguish stale numeric expectations from invariant/gate failures before any re-pin. |

Regrade using the written unrounded bounds, not the old probe printer's labels: rc5's Standard k=5/10 ΔT_abs .88/.96 violate the no-benefit 1e-6 bound even where the report printed zero total violators; its seven rank violators at each k also remain failures. Commander/Brawl had no rc4 probe baseline, so do not claim every rc5 residual was newly caused by stage 3e.

Freeze in this order after the ledger mechanics are implemented: (1) score/scheduler/recipe/catalogue versions and W domain, including candidate selection, horizon/valuation policy, .25 affordability and tie rules; (2) re-evaluate affected S useful mass, closing-package admission, role bands, training-only p80 and null diagnostics, even if constants do not move; (3) recompute every eligible training total through `scoreDeckSafely` and rebuild each affected profile's full-precision family-weighted CDF. Preserve paired IDs, family splits, exclusions and all row denominators; freeze input, evaluator, domain, S and reference hashes. Require `bands verify` and reference reproduction to have **0 mismatches**.

Then run the complete acceptance matrix against that same frozen evaluator/S/reference pair, followed by untouched grouped/chronological cohorts and independent refutation. Keep before/after W/S/T_abs/rank distributions and traces; do not mix versions in edit comparisons. Any further evaluator correction restarts the affected freeze and requires replacement untouched validation where results were already inspected. No stage-3g acceptance, calibration or release pass is asserted by this design.
