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
