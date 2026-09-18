# Proposed OT probability table — approval draft

2026-09-18. Sandbox branch 4.3.2.SB. Design mode, experimental prototype. No engine changes, enabled probabilities, calibration run or new smoke passes in this step. This adds a numeric proposal to OT_PROBABILITY_DRAFT.md; it does not supersede approved rules.

## Evidence boundary

EXISTING means read directly from hash-pinned 4.3.1 source; not empirically validated for OT. PROPOSED means an engineering starting assumption for sandbox sensitivity tests, not an NCAA average. BLOCKED means no defensible rate/sample is available. Zero historical observations have been ingested or fitted for this proposal. The supporting empirical sample for every rate below is therefore BLOCKED, not an invented sample size or confidence interval.

The repository's GAMECAST_4_2_CALIBRATION_2500.md reports a historical 2,500-simulation play-volume calibration. That is not 2,500 real games or evidence for PAT, conversion, return or penalty rates. Current 55-game regression runs likewise prove software behavior, not real-world frequency.

## Six components

Baseline below means equal-strength teams with no home-field edge. e is the existing effective matchup edge, constrained to [-0.60,0.60], derived from offense, opposing defense, overall ratings and existing home-field treatment. Use e once; do not add a second strength/home bonus.

| Component | Starting rate / model | Supporting sample | Team-strength adjustment | Missing-data fallback |
|---|---|---|---|---|
| 1. Ordinary OT offense | EXISTING normal pass choice 50%; pass-call outcomes: sack 6.5%, interception 2.5%, completion 62%, incomplete 29%. Lost fumble 1.4% per run call. Preserve existing yardage branches, below. | Source verified; empirical OT sample BLOCKED | Keep existing e formulas and chain-sustain adjustment; do not retune regulation. OT action policy separate from clock-based regulation strategy. | Existing formulas may be used as a labeled comparator. Missing required team ratings blocks play; do not invent ratings or substitute equal strength. |
| 2. Field goals | EXISTING p=clamp(0.45, 0.90 - max(0,D-35)*0.018 + 0.25e, 0.96). At e=0: 35 yd 90%; 42 yd 77.4%; 50 yd 63%; 60 yd 45% floor. D is kick distance. | Source verified; actual attempts by distance BLOCKED | Existing +0.25e, bounded by formula. This is a legacy convention, not proven kicker skill. | Keep as comparator pending distance-band validation. No invented kicker/special-teams rating; existing specialTeams is null. Review 45% long-kick floor rather than calling it realistic. |
| 3. PAT | PROPOSED 97% successful kick, 3% total failure, at standard spot with no nullifying foul. These are deliberately round test assumptions. Block share within failure remains BLOCKED. | No verified historical PAT sample; BLOCKED | Initially no offense/defense-strength adjustment. A later measured kicking rating can replace the pooled baseline. | Use 97% only if Chairman approves an assumption-only sandbox profile. Otherwise scripted tests. Penalty-moved PAT distance and block/return decomposition remain BLOCKED. |
| 4. Two-point attempts | PROPOSED p=logistic(logit(0.45)-0.9*ln(d/3)+0.5e), capped 1%–95%. At e=0: OPP1.5 60.4%; OPP3 45.0%; OPP18 14.0%. d is current yards to goal. | No verified conversion sample by distance; BLOCKED | Modest proposed 0.5e on log-odds. At OPP3 e=-0.6/+0.6 gives about 37.7%/52.5%. Coefficients are assumptions, not fitted. | Approved prior profile only; no claim FBS and FCS are empirically identical. Missing team ratings blocks generation. Defensive-return share remains separate and BLOCKED. |
| 5. Defensive scoring returns | Ordinary interception/fumble return-TD rates BLOCKED; PAT block rate and conditional return rate BLOCKED; two-point defensive-return rate BLOCKED. No numeric estimate proposed without counts. | Need interceptions, lost fumbles, blocked PATs and eligible try turnovers as separate denominators; all BLOCKED | Begin with pooled rates after measurement; no unsupported rating boost. Add field position only when fit/validated. | Keep forced fixtures. Do not set unknown rate to zero and call full randomized OT complete. A restricted no-rare-events profile requires explicit approval. |
| 6. Penalties | Offensive dead-ball, offensive live-ball, defensive end-zone, offsetting and no-foul probabilities BLOCKED. Enforcement rules remain approved independently of frequency. | Need typed fouls including declined, offsetting and nullified attempts, plus eligible opportunities; BLOCKED | No generic offensive/defensive power adjustment. Discipline is not currently a verified team attribute. | Keep forced fixtures; do not fabricate penalties to balance stats. Randomized generation remains BLOCKED until measured rates or explicit assumption profile approval. |

## Ordinary-play details retained, not newly calibrated

All pass outcomes below are per pass-call draw, not completion percentage per NCAA pass attempt. Sack + interception + completion + residual incompletion must equal one.

| Event | Existing formula / conditional rate |
|---|---|
| Sack | clamp(0.02, 0.065-0.04e, 0.10) |
| Interception | clamp(0.006, 0.025-0.025e, 0.055) |
| Completion | clamp(0.44, 0.62+0.18e, 0.82) |
| Incompletion | 1 minus the preceding three mutually exclusive probabilities |
| Completed-pass long-gain branch | 0.12+0.08e, conditional on completion; 16–44 yards before field limits |
| Completed-pass ordinary branch | Remaining completion mass; 2–15 yards |
| Sack yardage | Uniform integer loss 3–10 yards |
| Lost run fumble | clamp(0.004, 0.014-0.01e, 0.03), per run call |
| Negative run branch | 15% conditional on no lost fumble; loss 1–4 yards |
| Long run branch | 0.08+0.05e conditional on no lost fumble and not the negative branch; 11–35 yards |
| Ordinary run branch | Remaining mass after the above; 0–8 yards |
| Chain sustain | If positive gain is short of first down and e>0, convert gain to needed distance with clamp(0,5e,0.75). This strongly affects short-field outcomes and must be evaluated explicitly. |

The same verified source has a clock-driven strategy function. It must not be reused blindly in untimed OT. Fourth-down decision policy must select a legal chance to tie/win, never guarantee it. TD probability emerges from the plays; it is not a separately assigned possession score or desired winning margin.

## Data and validation plan

CFBD documentation verifies a bearer-authenticated historical plays endpoint with period, down/distance, yards-to-goal, play type/text, identifiers and FBS/FCS filtering: https://api.collegefootballdata.com/api/plays (checked 2026-09-18). No configured CFBD_API_KEY was found in the runtime environment; do not treat that as a search of every possible credential source. No authenticated data retrieval attempted. A direct NCAA FBS record-book request was inaccessible via the web tool; no rates were inferred from it. Verified export or authorized API access is needed to clear empirical evidence blockers.

Proposed fitting window: completed 2021–2024 seasons for development; 2025 held out, subject to access, completeness and rules-era checks. Split by game/season, not random plays from the same game. Audit nullified plays, return points, enforcement spots and FBS/FCS coverage against official gamebooks. Report successes/attempts, independent game count and uncertainty by event/distance before replacing priors. Sparse FCS or rare-event pools require an explicit pooling decision, not silent transfer.

Evaluate probabilities by distance/strength, score outcomes per possession, plays per drive, number of OT periods, first/second-offense advantage and rare-event frequency. Test proposed PAT 97% against 95%/99%, and two-point base 45% against 35%/55%, as sensitivity scenarios—not claimed confidence intervals. Refit numeric coefficients only with reviewable data. Persist one independent OT RNG state and a pinned model profile per run. No redraw on refresh/reload; no model changes to active sessions. Test all three clocks, 1x/50x and chunk invariance.

## Approval boundary

Recommendation: retain source-derived ordinary offense/FG formulas as the comparator and approve data intake next. The PAT and two-point numeric values are optional engineering priors for isolated sensitivity experiments, not recommended as a calibrated release. Do not silently disable returns or penalties to make full AUTO runnable. Full randomized OT remains BLOCKED until its missing branches have measured or explicitly approved assumed probabilities. All six components remain separate. Stats must remain an observer and cannot modify football outcomes.
