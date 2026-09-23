# PAT-kick probability — design and calibration candidate

2026-09-23. Branch `4.3.2.SB`. Inspected parent `6793ee1ebb24ed1bdb8cafa2ad88611bc9713f83`. DESIGN ONLY: no runtime probabilities, prior releases, active sessions, accepted results or production state changed. No deployment or SEUD publication. All simulations remain nonofficial. This memo updates the PAT recommendation in OT_PROBABILITY_TABLE.md; other probability domains remain separate and unapproved.

## 1. Source-to-parameter table

Rates use makes / attempts. Four inputs stay separate; 483 team-split rows are not 483 independent teams or games. Earlier supplied-file arithmetic checks passed; independent completeness verification remains BLOCKED.

| ID | Measured input | Team rows | Makes / attempts | Unsuccessful | Calculated success | Use / limitation |
|---|---|---:|---:|---:|---:|---|
| S1 | 2026 vs non-winning FBS, through September 19 | 92 | 511 / 520 | 9 | 98.269231% | Partial season, selected opponent split |
| S2 | 2025 vs non-winning FBS, through January 19, 2026 | 136 | 2367 / 2395 | 28 | 98.830898% | Completed-season split |
| S3 | 2025 vs winning FBS, through January 19, 2026 | 136 | 2342 / 2379 | 37 | 98.444725% | Completed-season split |
| S4 | 2026 vs winning FBS, through September 19 | 119 | 422 / 428 | 6 | 98.598131% | Partial season, selected opponent split |

Sources: supplied `Pasted markdown(1).md` (S1), `Pasted markdown (2).md` (S2), `Pasted markdown (3).md` (S3), `Pasted markdown (4).md` (S4). Supplied cfbstats snapshots are the evidence here, not a claim of independent live-source verification. These tables exclude FCS opponents and must never be called all games.

| Parameter or quantity | Value / status | Classification and provenance |
|---|---|---|
| Baseline candidate A | 4709 / 4774 = **98.638458%** | Calculated from S2+S3; displayed as 98.64%, retain exact fraction for configuration |
| Baseline candidate B | 5642 / 5722 = **98.601887%** | Calculated pooled alternative from S1–S4; 83.43% of attempt weight comes from 2025; not an equal-season average |
| 2026 comparison | 933 / 948 = **98.417722%** | Calculated S1+S4; keep separate to assess later-season transfer |
| Candidate opponent adjustment | **0** | Requested modeling choice; no fitted defensive effect |
| 2025 winning minus non-winning difference | **−0.386173 percentage points** | Descriptive, not causal |
| 2026 winning minus non-winning difference | **+0.328900 percentage points** | Descriptive, not causal |
| Shrinkage weight k | Compare 25, 50, 100, 200; propose 100 for an initial experiment | Engineering prior strength, not fitted or approved |
| Team input window | Completed, deduplicated current-season snapshots before the simulated game | Proposed policy; join both opponent splits by team; no same-game/future leakage |
| OT1-specific PAT rate | BLOCKED | No regulation/OT labels supplied |
| Standard-spot-only PAT rate | BLOCKED | No attempt distance or penalty stratification supplied |
| Block, defensive return, two-point and penalty rates | Each BLOCKED | No appropriate event counts/denominators; unsuccessful kick is not synonymous with block |
| FCS transfer validity | BLOCKED | Neither FCS-opponent coverage nor a fitted FCS kicking population is established |
| Source completeness, unique games, kicker identity | BLOCKED | Need game-level register and official supporting records |

Recommendation for Chairman review: A is the cleaner initial reference because it uses the larger completed season and leaves partial 2026 available as a comparison. B is a legitimate separate descriptive alternative, only **0.036571 percentage points** lower. Do not enable either automatically. The old 97% assumption-only PAT proposal is now historical; it was never an implemented or approved calibrated rate.

## 2. Probability design: team shrinkage, bounds and missing data

Let p0 be the approved baseline, s the team's successful kicks, n its eligible attempts, and k a positive prior strength measured in equivalent attempts.

**p_team = (s + k p0) / (n + k)**

Equivalently, p_team = w(s/n) + (1−w)p0, with **w = n/(n+k)** when n>0. This is the posterior mean of a Beta(k p0, k(1−p0)) prior with a binomial likelihood. Use the resulting fixed mean for each kick in the first proposed model; do not add an unapproved random game-level skill draw.

Team results must combine the supplied winning/non-winning splits before weighting. Hawaii's 3/5 and Ohio's 1/4 are diagnostic examples of sparse-split instability, not permitted direct settings. Do not use a split as the team's full kicking record. Use kicking results only: no OFF, DEF, overall strength, home-field, wind, or conference multiplier. The opponent-strength coefficient is exactly zero.

The recommended initial team-data policy uses eligible 2026 team counts with the completed-2025 baseline. Do not add the same team's 2025 observations again as independent new evidence to its 2025 pooled prior. If same-season hierarchical fitting is later selected, fit the prior out of fold or exclude that team when estimating the prior. Kicker changes and historical decay require separate evidence and approval.

### Weight sensitivity before selection

| Team attempts n | Team weight, k=25 | k=50 | k=100 | k=200 |
|---:|---:|---:|---:|---:|
| 5 | 16.67% | 9.09% | 4.76% | 2.44% |
| 20 | 44.44% | 28.57% | 16.67% | 9.09% |
| 50 | 66.67% | 50.00% | 33.33% | 20.00% |
| 100 | 80.00% | 66.67% | 50.00% | 33.33% |

Probabilities below use candidate A with no clipping. Synthetic examples and diagnostic splits are not fitted team settings.

| Example s/n | k=25 | k=50 | k=100 | k=200 |
|---|---:|---:|---:|---:|
| Missing: 0/0 | 98.6385% | 98.6385% | 98.6385% | 98.6385% |
| Diagnostic 1/4 | 88.4814% | 93.1838% | 95.8062% | 97.1946% |
| Diagnostic 3/5 | 92.1987% | 95.1259% | 96.7985% | 97.6961% |
| Perfect 5/5 | 98.8654% | 98.7622% | 98.7033% | 98.6717% |
| Perfect 20/20 | 99.2436% | 99.0275% | 98.8654% | 98.7622% |
| 49/50 | 98.2128% | 98.3192% | 98.4256% | 98.5108% |
| Perfect 100/100 | 99.7277% | 99.5462% | 99.3192% | 99.0923% |

Propose **k=100 for the first approved sensitivity experiment**, not as a fitted constant. It gives five attempts only 4.76% weight and 50 attempts 33.33%; k=25 reacts strongly to very sparse failures, while k=200 adapts more slowly. Final k selection is BLOCKED pending chronological validation with team/game data. Compare both baselines under all four k values before adoption.

Bounds: require finite 0<p0<1, finite k>0, integer 0<=s<=n, and a computed **0<p_team<1**. No arbitrary football floor or ceiling is recommended initially. For finite n the formula cannot assign true 0% or 100%, even for perfect records. Reject invalid inputs or numerical saturation; never silently round a computed probability to 1. Store full precision and display sufficient precision to avoid suggesting certainty. A numeric cap such as 99.9% would be a separate unapproved modeling decision.

Missing eligible FBS team data: p_team=p0, label POOLED_FALLBACK with n=0 and reason. Do not convert missing outcomes into misses. Incomplete/ambiguous team joins use fallback only under an approved restricted profile, while retaining the data warning. FCS-team or FCS-opponent transfer requires explicit approval; otherwise unsupported calibration is BLOCKED. A missing sample is different from a measured zero-attempt record even though both yield the same proposed fallback mean.

These tables estimate a marginal rate over recorded PAT-kick attempts. They do not estimate success conditional on no block or no foul. Using this rate at the standard spot is a disclosed transfer assumption. Penalty-moved distances must not reuse it blindly. A future event model must reconcile its marginal success with p_team; sampling independent block/penalty failures on top would double-count some failures.

## 3. Exact proposed integration point, state and audit behavior

### Actual inspected source

| Location | Current behavior | Proposed authorized-future integration |
|---|---|---|
| Generated baseline `supabase/functions/gamecast-week4-v4-3-1/index.ts`, applyPlay, `next >= 100` | `score(g,t,7); p.points=7; flip(g,25)` bundles TD and PAT and immediately changes possession | Split into TD +6, then a typed pending try before kickoff. Do not patch score() globally or reinterpret every +7 Chairman adjustment. |
| Same file, advanceGame PLAY completion | applyPlay -> maybeBreak -> finishPeriod when clock reaches zero | A pending legal try must gate quarter/endgame/OT transitions; preserve its originating period even at 0:00. |
| Same file, postTiming / finishPeriod / finishGame | Existing post-play timing and lifecycle assume bundled score | Define try timing/order and unnecessary-try handling before regulation integration; no silent timing change. |
| `sandbox/overtime.mjs`, apply ordinary touchdown branch | Adds +6, sets phase TRY and tryValue 1 in ordinary OT1 or 2 as required | Use explicit tryType PAT_KICK only when selected legally; value alone is not sufficient long-term typing. |
| Same file, advanceOvertime, inside `if (!o.pending)` before provider result becomes pending | Calls host fixture provider, validates outcome, stores pending event | Future typed outcome provider draws a PAT only for OT1 PAT_KICK, pins result/probability in pending checkpoint once; fixtures stay independent. |
| Same file, apply TRY branch | h.score(g,t,o.tryValue) for success, defense +2 for fixture return; then endOpportunity | Apply settled legal result once; preserve existing corrected equal-series rule for return ON a try. |
| `sandbox/runtime.mjs`, OTMODEL1 wrapper | All generated OT score events labeled OT_SCRIPTED_QA; missing model blocks | A future sampled provider needs truthful source tags, not SCRIPTED_QA; no change in this memo. |

Recommended first work package AFTER approval: bounded OT1 PAT provider with scripted surrounding OT outcomes, separate from a later regulation pending-try implementation. It would not make the entire stochastic OT engine ready. Regulation and OT1 use the same approved PAT formula only when a kick is available; OT2 and OT3+ remain mandatory two-point domains and never consume a PAT draw. OT1 two-point choice is also outside the PAT sampler. Kicks omitted under the rules consume no PAT draw.

Rule reference: [2026 NCAA rules](https://ncaaorg.s3.amazonaws.com/championships/sports/football/rules/PRMFB_RulesBook.pdf), Rules 8-3 and 3-1-3. In particular, end-of-regulation try necessity cannot be replaced by an unconditional +1. A complete penalty/necessity applicability map must precede regulation implementation. Existing OT3+ correction remains authoritative: defense scoring on the first try does not waive the answering try; after the second resolved try compare totals, with fouls/retries resolved first.

### Proposed authoritative fields

Persist `patModel {version, sourceCommit, baselineNumerator, baselineDenominator, k, opponentAdjustment:0, teamSnapshotId, snapshotHash, effectiveAsOf, boundsPolicy, scopeProfile}`. Freeze actual parameter/data values per run, not only their hash. No mid-session update after a new weekly sample.

Persist `pendingTry {tryId, touchdownEventId, offenseTeam, originPeriod, tryType, snapSpot, kickDistance, attemptOrdinal, retryOrdinal, status, durationRemaining, drawKey, uniformDraw, pApplied, rawOutcome, adjudicatedOutcome, foulResolution, scoreEventId}`. Raw result is private while pending. Distinguish opportunity ID from each actual replayed attempt; keep historical nullified attempts but exclude them from official counted-attempt totals as the statistics rules require.

Use a domain-separated deterministic PAT sequence, proposed root derived from original game seed, game ID, stable decision-lineage ID and model version. Bind active runId in audit metadata, but retain the root on same-seed restart. Label each draw by tryId/attemptOrdinal/retryOrdinal. Do not consume regulation play RNG, opening-toss RNG or OT-toss RNG. Commit the draw/pending state once at scheduling an eligible attempt; score only on settled resolution. Polling and speed change elapsed processing, never the key or draw. If authoritative projection runs on a read, identical elapsed time and state must yield the same checkpoint.

Pregame dead-ball/no-snap foul: enforce first, no consumed kick draw. A live snapped try later nullified retains its raw draw in the audit; a legal replay gets a new deterministic retry key. Interrupted transport/reload is not a new attempt. Unsupported adjudication holds BLOCKED without guessed score; GL and Master continue while football is held. Data do not supply foul probabilities.

A binary draw yields MADE or UNSUCCESSFUL_UNCLASSIFIED. It cannot identify block, bad snap, ordinary miss or return. A restricted aggregate profile could treat unresolved failures as a zero-point failure for operational testing ONLY with explicit Chairman approval and clear limits; it cannot claim complete defensive-return simulation. Rich forced fixtures may test returns/penalties without pretending those branches have fitted frequencies.

Audit TRY_SCHEDULED, TRY_RAW_RESULT, TRY_ADJUDICATED, TRY_NULLIFIED, TRY_REPLAY_REQUIRED and TRY_SCORE_APPLIED with run/lineage, seed reference, pinned model, sample counts, unrounded probability, draw key, period, offense, settled scoring team, Master Zulu, GL and state version. State-resident event IDs are the replay authority; separately inserted RPC events need idempotent reconciliation because existing state and audit RPC writes are not proven one atomic cloud transaction. Public views get settled results only; never seeds, pending draw or internal parameters.

Chairman score-only edits do not create, erase or resample a PAT event. Corrections to an unresolved try require a coherent try checkpoint: discard only uncommitted future work, append successor history, and identify whether the try remains pending, is replaced or is completed. Initial recommendation is to BLOCK pending-try football edits until that path is implemented. Existing OT edits are already blocked. Past accepted results stay untouched. Same-seed replay needs the same model, data and correction inputs; new seed creates a new lineage; continuation preserves past events and gets an explicit future branch key, never redraws completed tries.

## 4. Calibration checks and calculations

### Evidence-set comparisons

| Evidence | Observed unsuccessful | Expected unsuccessful under constant candidate A | Interpretation |
|---|---:|---:|---|
| S1: 2026 non-winning | 9 | 7.08 | Descriptive only |
| S2: 2025 non-winning | 28 | 32.61 | In-sample reference, not validation |
| S3: 2025 winning | 37 | 32.39 | In-sample reference, not validation |
| S4: 2026 winning | 6 | 5.83 | Descriptive only |
| Combined 2025 | 65 | 65.00 | Equality is construction of A |
| Combined partial 2026 | 15 | 12.91 | Small difference; not evidence of a necessary retune |

As an illustrative independent-attempt approximation, 95% Wilson intervals are 98.27–98.93% for combined 2025 and 97.41–99.04% for partial 2026. Team/game clustering and selection are not captured, so these are not population-certification intervals. Candidate B uses 2026 in fitting and cannot then claim 2026 as an untouched holdout.

Sample-size audit from the supplied snapshots: S1 has 53/92 teams with <=5 attempts; S2 6/136; S3 7/136; S4 96/119. Perfect-record rows are respectively 84, 114, 109 and 113. These are split-row counts, not unique team-season totals. Aggregate both splits by stable team before fitting team probabilities, verify the join and exclusions, and report n=0, 1–5, 6–20, 21–50 and >50 bands.

Proposed checks before adoption:

1. Reconcile all four row sums, duplicates, counts and dates to a preserved game registry. Official source completeness stays BLOCKED until that succeeds.
2. Compare A/B across all four k values. Report attempt-weighted predicted versus observed rate, failure counts, Brier score, log loss and calibration by team sample band. Do not select k on the same outcomes used to estimate each team's s/n.
3. Use chronological game-level validation: 2025 baseline predicts 2026 attempts using only each team's earlier 2026 attempts. Current aggregate tables cannot perform this sequence; predictive k fitting is BLOCKED. A 2025 predictive holdout requires earlier training data, also BLOCKED here.
4. Separate regulation and OT1, standard spot and penalty-moved kicks, and FBS/FCS applicability. OT1-specific rates/sample sizes and distance calibration are BLOCKED. No assumed pressure penalty or bonus.
5. For constant p0, test a large deterministic seed set against expected binomial variation, not an exact success quota. For varying p_i, expected makes=sum(p_i), variance=sum(p_i(1−p_i)) under the independent-draw model. Team weighting need not preserve the pooled baseline exactly; report any shift, do not secretly recenter.
6. Compare score changes per TD and resultant ties/OT entry against the unchanged engine. A score-dependent strategy can change future plays even with untouched regulation RNG; do not claim full trajectories remain identical after a PAT outcome changes.
7. Benchmark 55-game board plus five extra QA fixtures with parameter lookup cached; no data fetch or statistics calculation in scoring loop. Latency impact remains NOT TESTED.

Arithmetic/sensitivity calculations in this memo were executed locally. No candidate runtime calibration simulation, performance test or regression pass is claimed.

## 5. Regression test matrix

All 18 rows are planned and NOT TESTED for this candidate. Existing test passes refer to earlier receiver/OT code only.

| ID | Test | Required result |
|---|---|---|
| P01 | Fixed seed/model/data/inputs | Same kick history, draws and scores; ordinary RNG and both toss streams unaffected |
| P02 | Poll/chunk invariance | 1s/13s/random chunks and repeated zero-time reads match for equal simulated time |
| P03 | Speed invariance | 1x/50x same simulated time -> same pending and settled outcomes |
| P04 | TD and successful PAT | Exactly +6 then +1 to correct team/period; no +7 plus duplicate +1 |
| P05 | Unsuccessful PAT | +6 only; no invented block or return label; correct kickoff/OT opportunity transition |
| P06 | Period boundaries | TD at Q1/Q2/Q3 0:00 keeps try in originating period; no premature next-quarter/halftime transition |
| P07 | End of regulation | Resolve required try before Final/OT; omit unnecessary try under approved rule map; no omitted-try draw |
| P08 | OT eligibility | OT1 kick only when selected; OT1 two-point, OT2 and OT3+ never use PAT probability |
| P09 | Penalties/no snap | No counted kick/draw before legal snap; unsupported moved distance or adjudication blocks |
| P10 | Live foul/retry | Nullified result scores zero, remains in audit, replay has new key; no duplicate counted try |
| P11 | PAT defensive return fixture | Correct defense +2; first OT1 try return does not automatically end game; opportunity rules preserved |
| P12 | OT3+ return regression | First return preserves answering try; second wins or ties correctly; foul-nullified return resolved first |
| P13 | Persistence/versioning | Reload before draw, pending and after score; exactly-once scoring, stale command rejection and event reconciliation |
| P14 | Chairman edits | Score-only changes never fabricate kicks; unsupported pending-try edits block before mutation; permitted correction replay has immutable lineage |
| P15 | Restart/continuation | Same-seed root/data retained, new seed separated, continuation never changes past tries; prior model versions recoverable |
| P16 | Clocks | GL runs through try/holds; scoreboard untimed during try; Master unaccelerated; Final stops GL only after settlement |
| P17 | Bounds/data/weight | Invalid counts rejected; missing-data status visible; perfect samples remain <100%; all A/B × k cases checked |
| P18 | UI, board and isolation | Chairman/public settled score agreement and private-draw redaction; no focus loss; 55+5 QA board; no official acceptance/feed/SEUD path |

## 6. Chairman decision record

Thirteen distinct choices remain open. Design authorization does not approve these values or football changes.

| ID | Approval needed | Recommendation / blocker |
|---|---|---|
| A01 | Baseline A or B, and precision | Prefer exact 4709/4774; retain B separately. No enabled selection. |
| A02 | Team shrinkage k | Trial k=100 against 25/50/200; final fit BLOCKED without chronological data. |
| A03 | Team input window, snapshots and kicker turnover | Current-season eligible team aggregate; pin before game; no unmeasured kicker adjustment. |
| A04 | Probability bounds | Strict 0<p<1 through shrinkage, no arbitrary football clamp; reject invalid/numerically saturated inputs. |
| A05 | Missing FBS and FCS applicability | FBS pooled fallback labeled; FCS/opponent transfer needs explicit assumption approval or stays BLOCKED. |
| A06 | Regulation versus OT1 and standard-spot transfer | Shared formula is a proposal, not measured equivalence; moved-distance calibration BLOCKED. |
| A07 | Opponent-strength coefficient | Candidate fixed at zero as requested; activation with model requires approval, no fitted causal claim. |
| A08 | Restricted binary failures versus full event model | Aggregate unsuccessful outcome only in explicitly restricted tests; block/return/foul rates remain individually BLOCKED. |
| A09 | Work-package scope and legal try selection | OT1 provider first, separate regulation TD/try state change; preserve mandatory two-point rules and approve unnecessary-try mapping. |
| A10 | PAT duration, breaks and period-boundary behavior | No new duration selected. Separate or allocated existing dead time needs approval and clock tests before regulation integration. |
| A11 | Seed/attempt/retry/continuation policy | Separate deterministic PAT lineage, scheduled draw persisted once; raw nullified draw retained, true retry new key. |
| A12 | Chairman pending-try correction behavior | Block until coherent checkpoint path exists; never resample from score-only edits. |
| A13 | Candidate acceptance and rollout scope | Approve exact pinned model and test plan before implementation; fresh nonofficial sessions only, no migration or production promotion. |

Source inspection covered receiver/OT adapters, runtime provider and persistence hooks, baseline scoring/timing/period/reset/edit functions, OT_PROBABILITY_TABLE.md, OT_PROBABILITY_DRAFT.md and the consolidated smoke specification. The separate opening-toss E4 cancellation remains in force. No other enhancement or probability domain is authorized by this memo.
