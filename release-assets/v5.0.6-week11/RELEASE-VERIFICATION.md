# GameCast 5.0.6 Week 11 rollover

Chairman authorized release November 3, 2026. Scope: Week10 engine/UI behavior with Week11 input and isolated bindings. Existing 5.0.5 retained; enhancements excluded.

Baseline: 9d13c58548072f4e8ba9cd8f8c9ebcb5cd0f4bd8. All 14 retrieved deployed public-function files match source. New schema: gamecast_v506_w11. Session: w11v506-43c2306679a19d1e.

56 games, 121 rating rows, 112 participating teams; original ratings hash 1bd1827b535f93c6caf664049deb4b78728c645d813a21bc50d0e6819f04485c. 41 Saturday games. Gameplay source equality after release metadata normalization passes. Opening toss is version-seeded, so identical seeds across different release identities need not yield identical tosses.

| Gate | Status | Evidence |
|---|---|---|
| Engine/state integrity | PASS | 54 local rollover tests |
| Fixed-seed regression | PASS | Same-seed restart and active-checkpoint comparison |
| Multi-seed distributions | PASS | 560 runs, no retuning |
| Full-board checks | PASS locally | 56 concurrent active games; 236ms local batch. Sustained cloud active-board load NOT TESTED |
| Poll/chunk invariance | PASS | 56 matchups |
| Speed invariance | PASS | 224 comparisons, 1x/4x/20x/50x |
| Backend persistence/versioning | PASS | Actual Postgres commit/replay/conflict/recovery/RLS probe rolled back |
| Chairman integration | PASS | Chromium and WebKit control and refresh checks |
| Public/condensed integration | PASS | Chromium and WebKit full-board, date-filter and OT checks |
| Mobile Safari | NOT TESTED | Real device not available; WebKit reported separately |
| Existing-session compatibility | PASS for preservation/isolation | W10 hash unchanged; existing source unchanged; foreign namespaces rejected |
| Chairman approval | PASS | Explicit rollout authorization in current conversation |

Cloud checks: public health/read 200, 56 games returned, no private history/seed/RNG/power fields; unauthenticated Chairman request 401; authenticated scheduler dispatch 200 with no eligible games. Fresh session remains version 1 with all games unlaunched, AUTO/Onair false, Deadman unarmed, 56 power ready. Prior Week10 state hash remains 76b61f8a9b2b7b898850c4d5a2688c97.

Rollback: run rollback.sql to disable only new writes and cron, retaining all state and audit evidence. Existing published routes remain available.

Publication workflow: https://github.com/rgbslb11/Synthcast-Console/actions/runs/41707776889

Hosted verification: 219 prior files preserved byte-for-byte, 15 new files, 234 total. All three live surface URLs returned HTTP 200 with the correct release marker.
