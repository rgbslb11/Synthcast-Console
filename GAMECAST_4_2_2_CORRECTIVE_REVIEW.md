# GameCast 4.2.2 — Corrective Review

Status: **REVIEW CANDIDATE**  
Scope: repair the Week 3 4.2.1 period/box-score/game-duration failures and verify backend/UI state handling without retuning team power, schedule, HFA, play probabilities, or the 4.2 RC3 timing constants.

## Operator-reported failures

- Games appeared to jump from the first quarter to the fourth quarter.
- Regulation scores appeared in an extra line-score column labeled `0` while Q2-Q4 remained zero.
- 10-minute-quarter games completed in roughly 53–56 minutes instead of the intended roughly 2:00–2:15 synthetic GL range.
- A fourth-down field-goal situation near the opponent 11 exposed uncertainty about score-period attribution.

## Root cause 1 — ordinary breaks advanced the period

4.2.1 called `advancePeriod()` whenever **any** `breakSeconds` timer reached zero. Scheduled TV timeouts have `pendingPeriod = 0`, so an ordinary TV timeout passed `0` into `advancePeriod()`.

The old period-label fallback treated a non-1/2/3 quarter as `4th`, while `activePeriod` became the string `"0"`. That single state corruption explains the visible symptoms:

- display appeared to jump to the fourth quarter;
- subsequent scores were written under `scores["0"]`;
- the UI rendered an extra `0` line-score column;
- regulation progression and GL were truncated/corrupted.

### 4.2.2 correction

A completed break advances the period **only when `pendingPeriod !== 0`**. Ordinary TV/two-minute breaks clear and resume the same quarter.

Additional state guards reject invalid regulation quarters, invalid pending-period transitions, and invalid score-period keys.

## Root cause 2 — a live play could stall at 0:00

The 4.2.1 PLAY advancement capped each step by `scoreboardSeconds`. If a play began before 0:00 but its play duration extended past the remaining period clock, the scoreboard could reach zero while `pendingPlay.remaining` was still positive. Later calls would process zero seconds forever and never complete the play or period.

### 4.2.2 correction

The complete live-play duration is allowed to resolve. Only the portion before 0:00 is charged to the scoreboard clock and TOP; the full play duration remains part of GL. Once the play resolves at 0:00, the normal end-period transition runs.

## Root cause 3 — backend result could depend on read/poll cadence

POST-play state combined stopped dead-ball time and clock-running runoff in one remaining-time value. A large projection chunk could cross that internal boundary while using only the state that existed at the beginning of the chunk. That allowed the same seed to diverge when advanced in different chunk sizes. A running interval could also overshoot a scheduled break threshold.

### 4.2.2 correction

POST timing is processed as deterministic segments:

1. stopped dead-ball time;
2. clock-running runoff;
3. exact stop at the next untaken scheduled break boundary.

This makes authoritative football state independent of polling/projection chunk size while preserving the existing 4.2 RC3 timing constants.

## Box-score and UI integrity

4.2.2 accepts/renders only valid score periods:

- `1`, `2`, `3`, `4`
- `OT`, `2OT`, `3OT`, etc.

Backend totals ignore invalid score keys and score writes reject invalid `activePeriod` values. The dedicated 4.2.2 UI is directly bound to:

- cloud function: `gamecast-week3-v4-2-2`
- operator storage namespace: `synthcastGameCast422Operator`
- engine identity: `GC-W3-V4.2.2-RC1`

The 4.2.2 page no longer depends on a fetch/storage rewrite shim to reach the 4.2.2 backend.

## Fourth-down FG validation

A direct regression models fourth down at `fieldPos = 89` (opponent 11), which corresponds to the engine's 28-yard field-goal attempt. A made FG is verified to:

- add 3 points to the **current valid quarter**;
- create no `scores["0"]` key;
- flip possession to the opponent at its own 25.

This validates the engine behavior; it does **not** assert that the earlier Rutgers attempt was made because the operator described that specific outcome as uncertain.

## Regression results

Targeted fixed-seed regression after correction:

- lifecycle: `FINAL_PENDING`
- GL: **7,541 sec = 2:05:41**
- quarters observed: **1, 2, 3, 4**
- line-score keys: **1, 2, 3, 4** only
- total plays: **126**

500-run structural calibration:

- mean GL: **7,550.77 sec = 2:05:50.77**
- P10 GL: **7,380 sec = 2:03:00**
- median GL: **7,538 sec = 2:05:38**
- P90 GL: **7,735 sec = 2:08:55**
- mean plays: **123.13**
- chunk-invariance tests: **100/100 passed**
- 1x-vs-50x equal-synthetic-time invariance tests: **100/100 passed**

The full Week 3 power-board audit is an explicit CI gate and uses the actual 51-game schedule and current 60–99 Week 3 power package. No ratings or schedule values are changed by that audit.

## Deliberately unchanged

4.2.2 does **not** change:

- Week 3 schedule or carriage;
- 60–99 TEAM/OFF/DEF ratings;
- HFA;
- pass/run, completion, turnover, explosive-play, fourth-down, or FG probability tuning;
- 4.2 RC3 timing-duration constants;
- uncertainty/upset mechanics;
- existing 4.2.1 sessions or runtime;
- production or SEUD.

## Separate finding — 15-minute mode

The broader audit found that 15-minute-quarter mode remains shorter than its previously stated 3:20–3:40 target. The diagnostic sample mean was about **2:32:33**.

**No 15-minute retuning is included in 4.2.2** because it was not part of the operator-reported corrective request. Any change to that mode requires separate Chairman authorization.
