# GameCast v1.2.0 - Open Questions and Calibration Register

Status: OPEN / DO NOT INFER

This file prevents provisional design values from becoming accidental canon.

## A. UI / asset open items

### A1. Master tab gray

Status: BLOCKED_PENDING_HEX

Decision: change the Master tab background to gray.

Missing input: final operator-supplied hex code.

Rule: do not guess or substitute a gray.

### A2. EBC / SEN artwork

Status: VERIFY_ASSETS

Decision: scoreboard branding should be driven from carriage/network registry.

Need to verify the authoritative EBC and SEN logo assets in the current source tree before implementation. Do not recreate substitute branding when canonical assets exist.

## B. Master-file schemas

Status: NEED_SCHEMA_LOCK

Need exact production schemas and source-of-truth rules for:

- week schedule;
- power ratings;
- carriage.

Need to lock:

- required columns/fields;
- stable team IDs;
- stable game IDs;
- version metadata;
- conflict rules;
- validation behavior;
- activation/rollback semantics.

## C. MATURITY source and construction

Status: UNCALIBRATED

MATURITY is a required latent property in the response model, but the production method for estimating it is not yet canonical.

Potential evidence categories to evaluate include:

- returning production;
- quarterback continuity;
- offensive-line continuity;
- coaching/system continuity;
- transfer-portal roster churn;
- veteran snap share;
- unit cohesion / experience;
- prior-year execution consistency.

Do not assign production MATURITY values by subjective reputation alone.

## D. Function coefficients

Status: UNCALIBRATED

All coefficients in Functions 01-12 require calibration.

Examples include:

```text
a, b, c, d
alpha
beta_T, beta_L, beta_X, beta_F
gamma
k
mu(M), w(M)
lambda, rho
aggression coefficients
volatility coefficients
theta_* turnover coefficients
phi_* explosive coefficients
```

The exploratory Notre Dame / Delaware calculations were shape tests only. They are not production values.

## E. Population calibration objective

Fit and validate across the full synthetic college-football population rather than only ranked or elite teams.

At minimum stratify diagnostics by:

- elite / strong / average / weak latent strength;
- high / medium / low maturity;
- favorite / underdog;
- high / low poise;
- fresh / fatigued units;
- NORMAL / TURBO / CHEW states;
- low / medium / high leverage;
- early / middle / late game;
- high / low tactical optionality.

## F. Required model behaviors

Calibration should be rejected if it cannot reproduce these qualitative behaviors:

1. Elite/mature teams can absorb more tempo/focus demand before overload.
2. Weak/immature teams are not automatically harmed by aggression; some states should increase competitiveness or upset tail probability.
3. The same intervention can change sign depending on capacity/maturity.
4. Excessive FOCUS can hurt even elite teams.
5. TURBO can increase both explosive probability and turnover probability.
6. A high-variance underdog strategy can worsen expected margin while increasing win probability.
7. POISE matters more in leverage than in routine situations.
8. Fatigue reduces accessible capacity but does not rewrite latent strength.
9. Pregame expectation effects decay as real game evidence accumulates.
10. A high-talent, low-continuity roster can be more brittle than a slightly weaker mature roster.

## G. Mean versus variance validation

Status: REQUIRED

The engine must maintain separate calibration targets for:

- expected play/drive/game performance;
- variance / tail behavior.

Do not accept a calibration that gets average scores right by suppressing realistic tails or vice versa.

## H. Outcome model expansion

Status: DESIGN_NEXT

Function 12 currently provides example probability structures for turnover and explosive play.

Production design needs separate calibrated models for at least:

- success rate;
- explosive play;
- turnover;
- sack;
- penalty;
- negative play;
- completion/incompletion;
- run/pass yardage distributions;
- fourth-down conversion;
- clock consumed;
- scoring-event probability.

## I. Tempo definitions and thresholds

Status: NEED_CALIBRATION

Need to define exact operational effects and thresholds for:

- NORMAL;
- TURBO;
- CHEW;
- KNEEL;
- AUTO transition rules.

Need safeguards against unrealistic oscillation between AUTO states.

## J. Timeout rules

Status: VERIFY_CURRENT_SEASON_RULESET

Before release, timeout and overtime logic must be verified against the exact NCAA rules governing the simulated season and against GameCast's synthetic quarter-length adaptation.

Do not rely on memory alone for final rule implementation.

## K. Pregame activation prior

Status: OPTIONAL / UNCALIBRATED

The asymmetric activation/trap-game curve is conceptually accepted as a possible pregame prior, but parameters are not canonical.

Need to determine:

- whether expected margin comes from internal fair line, market line, or another authority;
- whether favorite and underdog widths differ;
- how maturity changes curve width;
- decay by elapsed time versus possessions;
- whether postseason/rivalry contexts need separate parameters.

## L. Roster-turnover decomposition

Status: RESEARCH / CALIBRATION

The preferred architecture is to let roster change affect both talent and maturity separately rather than force a direct inverted-U performance penalty.

Need empirical/structural rules for:

- portal entrant quality;
- incoming starter share;
- returning snap share;
- QB/OL continuity weighting;
- coaching continuity;
- replacement-rate saturation.

## M. Version-lineage note

This folder preserves the historical v1.2.0 design discussion. The active repository later advanced beyond that version line.

Any implementation work must first compare these historical design requirements against the current GameCast release branch and reconcile overlaps, superseded behavior, and already-implemented features.
