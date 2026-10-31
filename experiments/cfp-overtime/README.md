# CFP overtime timing candidate

Status: timing component implemented and tested; NOT a complete OT engine.
No release runtime imports this component. No production, UI, database, schedule,
rating, or regular-season engine change is included. No new release version is assigned.

Baseline: release/gamecast-v5.0.5 at
`9d13c58548072f4e8ba9cd8f8c9ebcb5cd0f4bd8`.
Loaded repository procedures: GAMECAST_MASTER_ROUTER, 04_MATH_PROBABILITY_ENGINE,
05_INTEGRATED_UI_ENGINE_FEATURE. Live deployed source was not reverified.

## Chairman's timing requirements

| Event | Seconds | Duration |
|---|---:|---:|
| Regulation to OT1, including coin toss near end | 600 | 10:00 |
| OT1 to OT2 | 180 | 3:00 |
| OT2 to OT3 | 300 | 5:00 |
| OT3 to OT4 and every later transition | 120 | 2:00 |
| Each used team timeout | 90 | 1:30 |

Timeout allowance clarification: one per team in OT1; a fresh one per team in
OT2; a fresh one per team at OT3, shared through the rest of the game. Unused
allowances do not accumulate. There can be at most six used team timeouts
across an overtime session lasting three or more periods, totaling 9:00.

Transition breaks occur only when another period is needed. They are alternatives,
not cumulative additions at the same boundary. No transition follows a final.

Coin-toss placement: this candidate emits a cue 9:00 into the opening break,
leaving 1:00 before OT1. This exact placement is an implementation proposal,
not an exact time supplied by the Chairman. It does not draw a winner or score.

Break-only totals through OT1/OT2/OT3/OT4/OT5 are respectively
10:00 / 13:00 / 18:00 / 20:00 / 22:00. These are NOT full OT game durations.
Play time, dead-ball time, used team timeouts, and other real interruptions add to GL.

## Implemented contract

`createOvertimeTiming()` creates serializable timing state. The integrating
authoritative engine must persist it with its game state and consume the returned
elapsed time exactly once in GL. The component ledger is not a replacement GL clock.

`beginNextPeriodBreak()` requires the caller to have adjudicated the previous
period as tied. `beginFootballInterval()` accepts the actual interval duration
from the football engine. It generates no play outcomes, probabilities, or
fictional descriptions. `beginTeamTimeout()` validates the remaining allowance
and rejects overlaps with a play or another break. An event ID prevents duplicate
consumption. These are internal methods, not authenticated public commands.

`advanceOvertimeTiming()` advances active intervals, returns leftover seconds,
and requires the caller to resolve each completed football event before moving
on. It emits identical event timing for whole or fragmented time chunks.
Pause/delay/edit advances the elapsed ledger while freezing the active event.
Final stops it. JSON serialization preserves a resumable checkpoint.

## Remaining football-model decision before integration

The current 5.0.5 implementation directly calculates scores at the end of each
setup break. It does not simulate OT drives, PATs, two-point tries, or defensive
return paths. Increasing break constants alone cannot fulfill a realistic full
OT request.

Proposed next algorithm, requiring Chairman review of changed football behavior:

1. Retain regulation ratings, HFA, and run/pass/turnover/field-goal probability
   functions for normal OT1 and OT2 possessions beginning at the opponent's 25.
2. Resolve possession events one at a time. Add each actual play duration and
   between-play interval to GL while keeping the scoreboard clock untimed.
   Use existing normal timing constants; do not apply regulation clock-management
   strategies simply because the scoreboard clock reads zero.
3. Separate touchdowns from conversion attempts. OT1 permits a kick or two-point
   attempt; OT2 requires two points. OT3+ consists of alternating two-point tries
   from the opponent's 3. Proposal: resolve two-point tries using the existing
   run/pass play generator from that spot, without a new conversion multiplier.
4. Resolve equal possession opportunities and defensive-return exceptions
   explicitly. Do not end an OT3+ period on the first team's try result alone.
5. Persist toss result, alternating first offense, period, possession-series
   position, pending play, timing phase, and remaining timeouts. Keep football RNG
   and timing deterministic and prevent projection reads from drawing again.

Not selected or implemented: PAT success model and kick/two-point choice policy;
OT coin-toss choice policy; automatic team-timeout decision policy; defensive
return model absent from the current regulation generator; dedicated try and
possession-change duration inputs. These are football choices, not implied
approvals in the break-duration request.

Before deployment, a complete candidate requires integrated possession/scoring
tests, seeded distributions, same-seed/poll/speed invariance, persistence and
Chairman/public UI checks, and Chairman release acceptance. No population timing
or scoring claim can be made from the component tests alone.

## Verification performed

Command:
`node --test experiments/cfp-overtime/timing.test.mjs tests/v505/candidate.test.mjs tests/v505/invariants.test.mjs tests/v505/football-boundaries.test.mjs`

Result: 33 passed, 0 failed: 13 new timing tests and 20 existing engine tests.
The existing tests exercise the unchanged 5.0.5 engine; they do not certify the
new component's integration. Existing test titles mentioning 41 games are
inherited titles, not a new asserted slate count.

Covered: all requested break transitions; per-team OT1/OT2/OT3+ allowance;
coin-toss cue placement; supplied play elapsed time; chunk invariance;
pause/delay/edit timing; JSON recovery; invalid inputs; overlap/duplicate rejection;
and final timing freeze.

Rollback: discard this isolated branch; no deployed changes or data migration
require reversal.
