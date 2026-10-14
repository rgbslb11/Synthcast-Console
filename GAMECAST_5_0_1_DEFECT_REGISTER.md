# GameCast 5.0.1 defect register

Reproduced PASS means a fault or targeted condition was demonstrated. FAIL means the alleged defect was not established, not that all behavior is correct. FIXED is limited to the stated passing regression/acceptance scope. Hosted end-to-end gaps remain BLOCKED even when a candidate patch passes lower-layer tests. Audit performed by the implementing engineer, not an independent assessor.

## GC501-UI01

| Field | Value |
|---|---|
| Defect ID | GC501-UI01 |
| Description | Live UI stops updating |
| Reproduced | FAIL |
| Root cause | The source uses polling, not Realtime/WebSockets. Protected drafts retain their write basis; shared session versions advance for other games. Indefinite network waits and older responses were additional code-level risks. The entire reported hosted failure has not been reproduced with Gary’s authenticated session. |
| Files/functions affected | public/v5.0.1/app.js: load, adopt, cmd; auth-api.js |
| Fix | Candidate rejects stale reads, adds request deadline and per-game concurrency; no fabricated UI transition. |
| Regression test | 11-case browser suite proves automatic rendering in all three surfaces. Hosted sign-in, Launch and Auto acknowledged; further hosted inspection was blocked by browser credential protection. |
| Status | BLOCKED |
| Risk | High |

## GC501-UI02

| Field | Value |
|---|---|
| Defect ID | GC501-UI02 |
| Description | Chairman control latency |
| Reproduced | FAIL |
| Root cause | Redundant pre-write reads and whole-board persistence are proven work amplification. Their exact contribution to Gary’s observed latency is not measured; cloud/Auth/network costs remain unseparated. |
| Files/functions affected | app.js: cmd; database-store.mjs: commit; commit_state |
| Fix | Removed command pre-read, bounded safe retry and compact scheduler receipts. No claim that hosted latency is fixed. |
| Regression test | Mock-boundary timing, real scheduler load, and hosted Launch/Auto acknowledgements in 1.382/2.005 seconds. Full authenticated click-to-render measurement remains required. |
| Status | BLOCKED |
| Risk | High |

## GC501-UI03

| Field | Value |
|---|---|
| Defect ID | GC501-UI03 |
| Description | Deadman response and visible feedback |
| Reproduced | FAIL |
| Root cause | Source scheduler/public/Chairman shared bundles differed. That drift and board-version churn are risks; neither proves every reported Deadman recurrence. |
| Files/functions affected | src/deadman.mjs; scheduler-cron.mjs; scheduler-runner.mjs; app.js: dmWrite, dmCard |
| Fix | Candidate bundles aligned; batch requests forward every game witness; original Deadman module unchanged. |
| Regression test | Launch-once/RNG tests and live panel browser feedback pass. Hosted arm/lock/trigger/visible-feedback sequence untested. |
| Status | BLOCKED |
| Risk | High |

## GC501-UI04

| Field | Value |
|---|---|
| Defect ID | GC501-UI04 |
| Description | False stale-version rejection during unrelated game progress |
| Reproduced | PASS |
| Root cause | A single board version invalidates commands even when the selected game’s control/edit state is unchanged. |
| Files/functions affected | command-preconditions.mjs; DatabaseStore.commit; app.js: cmd/dmWrite |
| Fix | Opaque per-game witnesses, strict edit witness, fresh snapshot/CAS per retry, three-attempt bound. Real changes still reject; contention reports busy. |
| Regression test | Two-collision success, three-collision busy, target conflict, GL-only edit stability, idempotent replay and browser draft retention pass. |
| Status | FIXED |
| Risk | Medium |

## GC501-DB01

| Field | Value |
|---|---|
| Defect ID | GC501-DB01 |
| Description | Scheduler permanently retains repeated complete boards |
| Reproduced | PASS |
| Root cause | commit_state inserts full p_state into each request response; histories grow inside every board. 10,997 scheduler receipts dominate measured storage. |
| Files/functions affected | candidate-schema.sql; compact-scheduler-receipts.sql; DatabaseStore.response |
| Fix | Only scheduler receipts become compact. Current state, events and operator replay remain. |
| Regression test | 100 actual SQL writes and hosted 50-game sample: 176-byte receipts, zero full-board scheduler responses. |
| Status | FIXED |
| Risk | Medium |

## GC501-DB02

| Field | Value |
|---|---|
| Defect ID | GC501-DB02 |
| Description | Week 7 redundant-data cleanup |
| Reproduced | PASS |
| Root cause | Duplicate scheduler snapshots are proven, but available ledger archive mismatches 40/41 current score pairs and contains no exact receipts. Idempotency is an application dependency. |
| Files/functions affected | gamecast_v500.requests; W7_5_0_0_CLEANUP_PLAN.md |
| Fix | No deletion. SELECT scope/count, private current-state/event export and proposed SQL prepared. |
| Regression test | Dry run 10,997 rows; source remains 11,211 request rows. Full receipt archive/restore and deletion approval absent. |
| Status | BLOCKED |
| Risk | High |

## GC501-ENG01

| Field | Value |
|---|---|
| Defect ID | GC501-ENG01 |
| Description | Tied late-game fourth-and-long at OWN 3 |
| Reproduced | PASS |
| Root cause | TWO_MINUTE allowed distance <=8 (or clock <80) before field-position/tied-score sanity. |
| Files/functions affected | runtime/engine.mjs: fourthGo |
| Fix | Q4 tie, OWN 10 or deeper, distance >2 returns punt; other decisions untouched. |
| Regression test | Baseline witness; both possession orientations; distance/clock/field boundaries; trailing/short-yardage baseline comparisons pass. |
| Status | FIXED |
| Risk | Medium |

## GC501-ENG02

| Field | Value |
|---|---|
| Defect ID | GC501-ENG02 |
| Description | Offensive loss in own end zone not scored as safety |
| Reproduced | PASS |
| Root cause | Ordinary losses clamped next field position to OWN 1 without testing next<=0. |
| Files/functions affected | runtime/engine.mjs: applyPlay, history append |
| Fix | Award defense two points; reciprocal possession, stopped clock and safety/free-kick evidence. Preserve existing abstract receiving spot. |
| Regression test | Exact goal line and beyond, both possessions/down states, no-safety negatives and scoreboard/log assertions pass. |
| Status | FIXED |
| Risk | Medium |

## GC501-ENG03

| Field | Value |
|---|---|
| Defect ID | GC501-ENG03 |
| Description | Endgame kneel eligibility |
| Reproduced | FAIL |
| Root cause | No failing scenario established. Existing canSafelyKneel simulates two-second snaps and actual timeout/runoff behavior, stops before fourth down and refuses own-end-zone kneels. Miami’s 57 seconds exceeds 36-second capacity with two defensive timeouts. |
| Files/functions affected | runtime/engine.mjs: canSafelyKneel, strategy, postTiming |
| Fix | No change. |
| Regression test | Timeout/down/possession matrix, Miami 57 vs 36, forced fourth-down turnover and full-game invariants pass. |
| Status | VERIFIED-NO-CHANGE |
| Risk | Low |

## GC501-ENG04

| Field | Value |
|---|---|
| Defect ID | GC501-ENG04 |
| Description | Conference blowout concentration |
| Reproduced | FAIL |
| Root cause | No simulation defect established. Given actual schedule/ratings/weather and this model, 69/100 sampled boards meet/exceed the observed seven conference 35-point margins. This is conditional plausibility only. |
| Files/functions affected | tests/v501/distribution.mjs; frozen input fixture; existing power/engine |
| Fix | No rating, home-field, probability or suppression retuning. |
| Regression test | 4,100 baseline games and paired candidate run; individual game summaries retained. |
| Status | VERIFIED-NO-CHANGE |
| Risk | Medium |

## GC501-ENG05

| Field | Value |
|---|---|
| Defect ID | GC501-ENG05 |
| Description | Score suppression preservation |
| Reproduced | FAIL |
| Root cause | No defect established. Calibration and suppression paths are unchanged; only the two proven adjudication/decision fixes affect history. |
| Files/functions affected | runtime/engine.mjs; distribution.mjs |
| Fix | No suppression change. |
| Regression test | 87 low-total baseline/candidate fixtures remain history-identical; all 431 differing histories have explained first divergence. |
| Status | VERIFIED-NO-CHANGE |
| Risk | Low |

## GC501-ENG06

| Field | Value |
|---|---|
| Defect ID | GC501-ENG06 |
| Description | Broader football/clock/lifecycle sweep |
| Reproduced | FAIL |
| Root cause | No additional invariant failure found across intermediate 41-game runs. Existing PAT/two-point/free-kick/onside and overtime abstractions are not newly implemented mechanics. |
| Files/functions affected | tests/v501/invariants.test.mjs; engine.test.mjs; engine-operations.mjs |
| Fix | No unrelated engine changes. |
| Regression test | Intermediate possession/down/distance/field/clock/score/timeouts; halftime reciprocal possession; final/locked/accepted freeze; engine Final/Lock/Accept and QA rejection pass. |
| Status | VERIFIED-NO-CHANGE |
| Risk | Medium |

## GC501-PERF01

| Field | Value |
|---|---|
| Defect ID | GC501-PERF01 |
| Description | Operational performance acceptance |
| Reproduced | FAIL |
| Root cause | CPU and compact-receipt behavior pass bounded tests. Hosted authenticated per-stage latency, memory and long-run endurance are not established. |
| Files/functions affected | tests/v501/prepare-load.mjs; browser.mjs; hosted scheduler |
| Fix | Bounded test sessions stopped and history retained. |
| Regression test | One active game; full board of 41 plus another nine =50 simultaneous QA runs. No full hosted Chairman timing. |
| Status | BLOCKED |
| Risk | High |

## GC501-REC01

| Field | Value |
|---|---|
| Defect ID | GC501-REC01 |
| Description | Complete recovery and rollback proof |
| Reproduced | FAIL |
| Root cause | Current persisted state and deterministic continuation survive tested boundaries; complete source receipt backup and full restoration were not performed. |
| Files/functions affected | persistence.sql; recovery export; ROLLBACK_PLAN |
| Fix | Original deployment preserved; candidate-only shutdown documented. |
| Regression test | Actual SQL readback/replay and fixed-seed chunk tests pass. Full restore gate remains untested. |
| Status | BLOCKED |
| Risk | High |

## GC501-HIST01

| Field | Value |
|---|---|
| Defect ID | GC501-HIST01 |
| Description | 4.2.2 and 4.4.2 storage architecture |
| Reproduced | FAIL |
| Root cause | Inspected older releases update current session plus small event rows; no corresponding retained full-board request table was found. |
| Files/functions affected | gamecast_v12.sessions/events; 4.4.2 persistence.sql; 4.2.2 RPC call sites |
| Fix | Read-only audit; no historical mutation. |
| Regression test | Measured per-release rows/payload sizes and shared relation sizes retained in evidence. |
| Status | VERIFIED-NO-CHANGE |
| Risk | Low |
