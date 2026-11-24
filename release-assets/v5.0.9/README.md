# GameCast 5.0.9 postseason timing candidate

Baseline: verified Week 14 scheduler engine, Git commit `eff71786e737a6977b46a01c8323989ed80c8168`. This branch contains a 5.0.9 engine candidate. CCG slate, hosted UI, and cloud release configuration are pending.

Conference championships, bowls, and playoffs select POST-SEASON GAME TIMING from the authoritative game classification at initialization. Regular season and older game states default to NORMAL GAME TIMING. The profile is persisted with the game and neither play selection nor the timing loop changes it. The 5.0.9 candidate currently uses Week 14 ratings as calibration fixtures.

The quarter inventories are 4/4/4/5, with the mandatory two-minute timeout included in Q2 and Q4. Each commercial is 180 seconds. A passed timing window opens a slot, but an ordinary dead ball or a running clock does not trigger a commercial. A change of possession, charged timeout, or formally adjudicated replay, official review, or injury makes the next open slot eligible. Allow one commercial per stoppage. Unused slots expire at the end of the quarter. The dedicated two-minute slot is available only at the official stoppage. The candidate exposes an engine hook for adjudicated replay, official review and injury. The baseline does not generate those events and the hook is not wired to a hosted operator command.

Halftime is 1,650 seconds. A charged timeout lasts 90 seconds, including overtime. If a team timeout qualifies for a TV break, the team timeout is served before the queued commercial. These intervals advance GL and hold the scoreboard clock. Timing records identify the slot, trigger and duration. No timing event consumes RNG.

Run `node --test tests/v509/*.test.mjs tests/week14/*.test.mjs tests/v5085/*.test.mjs` and `node tests/v509/calibrate.mjs`. The measured target is 9,000–9,900 seconds mean GL across the CCG slate. With approved 3:00 commercials the fixture mean was 8,749 seconds, and 208/1,180 runs fell inside the target interval. A sensitivity estimate at 3:30 is approximately 9,233 seconds, pending approval and an actual rerun with the approved CCG slate.

Keep prior release bindings for rollback. The candidate does not provision or alter a production session.
