# OT probability model — proposal, not calibrated or approved

## Confirmed rulings

Chairman confirmed after commit 014b6d2: each team has one 30-second timeout shared across OT1–2. At OT3, replace the allowance with one timeout per team shared across OT3 onward. No carryover, stacking or per-period refill. Offsetting penalties nullify the attempt and its score; replay from the previous spot. These approvals supersede the provisional/awaiting-approval statements in prior documents. Code and smoke evidence must be updated separately before those gates are closed.

## Recommended structure

Keep regulation frozen. Add an OT-only outcome provider behind the existing state machine. Separate three responsibilities: the rules decide what is legal; the strategy chooses among legal actions; the probability model determines the result. Never assign a predetermined winner, final score or guaranteed answering touchdown. Statistics observe the resulting events and never change their probability.

### Six outcome components

1. Ordinary OT1/2 offense: reuse the verified engine's run/pass, sack, interception, fumble and yardage formulas where applicable. Apply them to the actual down, distance and field position. The current strategy function assumes a regulation clock; do not call it with zero seconds and accidentally select desperation/kneel behavior. OT strategy needs a separate legal-action policy. Test red-zone behavior separately; proposed changes to those formulas require explicit approval and remain OT-only.
2. Field goals: reuse the existing distance-based formula as the first comparator. It includes a 45% floor and matchup adjustment; those are source facts, not empirical certification. Check its performance by kick-distance bands before adopting it for OT. Current specialTeams ratings are null: do not invent individual kickers or treat missing ratings as zero ability.
3. PAT: estimate success, ordinary miss, block and defensive return using verified attempt data. Returned blocks are a conditional branch of a blocked kick, not an independent second scoring chance. Separate offensive power from kicking skill; use an explicitly labeled population baseline where no kicker evidence exists.
4. Two-point attempts: estimate success using yards to goal, offense-versus-defense strength and relevant play context. OPP1.5, OPP3 and OPP18 must differ. Separate successful conversion, ordinary failure, and defensive return into mutually exclusive outcomes. Use a bounded probability curve; do not assume constant conversion success after penalties.
5. Defensive returns: first model the interception/fumble/block, then its conditional return result. Rare returns need pooled samples and uncertainty bounds. Do not double count the same interception or blocked kick in multiple independent draws.
6. Penalties: distinguish no foul, offense, defense and offsetting, including timing relative to a live attempt. Nullified outcomes cannot award points or ordinary statistics. Begin with approved, supported types. Missing frequencies or unresolved enforcement remain BLOCKED, not silently zero. Do not enable unsupported rare cases merely to meet a frequency target.

### Probability calculation and evidence

For a new binary success model, a possible form is p = logistic(base-by-distance + fitted matchup effect). Coefficients and limits are proposed for fitting, not assigned here. Use the existing normalized matchup edge once as a candidate predictor; avoid applying both that edge and another independent team-strength boost to the same event. Multinomial or conditional event branches must reconcile to total probability one.

Where samples are sparse, blend observations toward a broader relevant baseline: p = (successes + k * baseline)/(attempts + k). Fit or justify k using validation; do not invent its value. Preserve sample size, source date, exclusions and uncertainty with every fitted parameter. FBS/FCS pools stay separate where data supports them; disclose pooled fallback and validate transfer rather than assuming identical populations.

Proposed data window: completed 2021–2025 seasons, with rules-era checks; reserve a later season for validation rather than training on every observation. Use goal-line/red-zone regulation plays as additional evidence where appropriate, accounting for their different decision context. Do not assume all five seasons or FCS coverage are available or clean. Audit duplicates, nullified attempts, penalty enforcement, defensive points and field position against official gamebooks/manuals before fitting.

Candidate retrieval source: CFBD's documented historical plays endpoint supports game/drive/play identifiers, period, down, distance, yards to goal, play type/text and FBS/FCS filtering: https://api.collegefootballdata.com/api/plays . It requires bearer authentication. Documentation availability is verified; usable dataset access, completeness and fitted rates are BLOCKED. No data has been downloaded or fitted in this design step.

### Determinism, clocks and performance

Use a separate persisted OT outcome RNG stream, seeded from game seed/ID and pinned model version; keep it separate from the existing regulation RNG and OT coin-toss stream. Store RNG state and the pending event at the same authoritative checkpoint. Draw once when scheduling the event; polling, reloads, stats reads and chunk/speed changes must not redraw it. Pin model parameters for each run; updates affect new runs, not active sessions or accepted results.

Generate play duration and between-play time separately from success. Reuse existing supported action timings where appropriate, without converting regulation runoff into OT scoreboard time. Approved TV breaks and 30-second timeouts remain fixed. GL advances; OT has no scoreboard countdown or regulation TOP; Master Zulu remains real operations time.

Fit/calibrate offline. Runtime evaluation uses small cached tables/formulas, with no web/data queries in the scoring loop. Stats remain asynchronous. Performance must be measured on the 55-game slate plus five synthetic QA games; no latency guarantee follows from this design alone.

### Acceptance before normal AUTO

Compare success rates by field position and matchup, possession scoring outcomes, number of plays, overtime length, first/second offense advantage, timeout/penalty behavior and rare-event frequencies. Use held-out observations and report sample uncertainty. Simulate equal-team and asymmetric matchups, reversed home/away and neutral sites. Stronger teams should gain an evidence-supported advantage without forced winners or automatic catch-up. Confirm all rules independently with forced fixtures, then replay identical seeds at 1x/50x and different polling intervals. Benchmark stats enabled/disabled once the sidecar exists.

Next review artifact: a parameter table showing existing formula versus new component, measured rate, sample count, uncertainty, proposed adjustment, fallback and approval status. Obtain approval of the new numeric model before enabling randomized OT. Approval of timeout/offsetting rules does not approve unmeasured percentages. No engine changes, deployment or new smoke passes are claimed by this document.
