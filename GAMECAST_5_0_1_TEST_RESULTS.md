# GameCast 5.0.1 — test results and acceptance gates

**DO NOT APPROVE 5.0.1 FOR PRODUCTION.**

Tested application source: d2b8b8c7e436dd7d50a1cb84e683dbe30041baa7.
Baseline: 762da633e38ddf8acb0a9e7798ee4502deb1e81f.
Author self-check; no independent audit certification.

## Executed evidence

- `node --test tests/v501/*.test.mjs`: **23 groups passed**. Baseline witnesses demonstrate the fourth-down and safety defects; candidate tests cover both possession orientations, boundaries and negative controls.
- Browser: **11 cases passed in Chromium and 11 in WebKit with a 390x844 viewport**, actual frontend and actual handlers, an in-memory database boundary and test authentication. Includes actual Launch/Start Auto/Stop button clicks, automatic state updates, Upcoming/search, edit preservation, true conflict rejection, temporary contention retry, Final/Lock, QA Accept denial, Deadman feedback, Public and Condensed views. WebKit emulation is not a physical iPhone test.
- Database: **100 actual candidate-schema commits**; 17,600 total stored receipt bytes, maximum 176; idempotent replay returns the original version, changed payload/stale version rejects, current state remains recoverable. Anonymous commit execution and authenticated direct schema usage are denied.
- Engine: all 41 games complete with intermediate possession/down/distance/field/clock/score/timeout invariants; final/locked/accepted projections remain frozen. Halftime tests cover all 16 timeout pairs. Kneel matrix covers both possessions, first through third down and all timeout combinations; fourth-down automatic kneel remains prohibited.
- Determinism: fixed input/seed histories match across chunked progression and 1x/50x projection. 4,100 baseline plus 4,100 candidate runs: 3,669 identical histories; 430 first diverge at a new safety; one first diverges at the fourth-down correction; **zero unexplained first divergences**. Eighty-seven low-total fixtures remain identical.
- Conference audit: seven observed conference margins >=35; 69 of 100 simulated baseline boards have at least that many. This supports plausibility conditional on this model, not independent statistical calibration against real football.
- Actual hosted scheduler: one active game reached version 8 with 34 history entries after ~37 seconds; 50 simultaneous QA runs across 41+9 games reached versions 20/19 with 2,727/582 history entries at ~95 seconds. All sampled scheduler receipts remained 176 bytes; zero full-board receipts. QA fixtures were stopped afterward and histories retained.
- Hosted public read returns engine GC-W7-V5.0.1-RC1 and 54 games. Unauthenticated Chairman read returns 401; unsigned scheduler returns 403. Three deployed function dependency sets match candidate source exactly.
- Publication: all **99 prior published files** and **13 new candidate files** byte-verified after deployment. Source 5.0.0 session remains v11213 with MD5(state::text) 43212ea3ddf3f1181bbcf9b5ab33f2ca.

## Acceptance gates

PASS means the stated test scope passed. BLOCKED means the full required acceptance condition is not established; partial passes do not convert it to release readiness.

| Gate | Result | Evidence / remaining limit |
|---|---|---|
| 1 — Baseline protection | PASS | Original branch/SHA, route bytes and session checksum preserved; no baseline migration |
| 2 — Isolated branch | PASS | All candidate work on release/gamecast-v5.0.1; no main merge |
| 3 — Live UI | BLOCKED | Three surfaces pass browser propagation; hosted sign-in/Launch/Auto passed; further inspection blocked by browser credential protection |
| 4 — Chairman controls | BLOCKED | Browser controls and engine acceptance pass; hosted Launch/Auto passed; remaining control chain blocked by browser credential protection |
| 5 — Deadman | BLOCKED | Engine launch-once and browser feedback pass; full hosted arm/lock/trigger/visible-feedback sequence still untested |
| 6 — Version concurrency | PASS | Unrelated churn retry, true target conflict, strict edit witness and exact replay tests; CAS retained |
| 7 — Storage architecture | PASS | Proven scheduler duplication removed; 100 SQL commits and hosted 50-game receipt checks |
| 8 — W7 cleanup | BLOCKED | Zero deletion; available archive mismatches; full receipt backup/restore and approval absent |
| 9 — Fourth-down logic | PASS | Baseline failure witness and boundary/negative regression tests |
| 10 — Safety | PASS | Two points, defensive possession, clock, boundary and log checks; existing abstract kickoff retained |
| 11 — Kneel logic | PASS | Existing behavior passes matrix, Miami case, fourth-down and own-goal-line protections |
| 12 — Simulation preservation | PASS | Protected module hashes; 8,200 paired runs; all first divergences explained |
| 13 — Performance | BLOCKED | Hosted 1/41/50-game samples pass; no full authenticated click-to-render breakdown or long soak |
| 14 — Recovery | BLOCKED | Database readback/replay and deterministic continuation pass; full export restoration not rehearsed |
| 15 — Release evidence | PASS | Required reports, tests, deployment and rollback supplied with explicit limitations |

## Timing — do not confuse test layers

Browser command-to-render durations in the retained run were approximately 34–91 ms in Chromium and 35–77 ms in WebKit, **using test Auth and an in-memory database**. These are not production network timings. Two actual hosted Chairman actions acknowledged in 1.382 and 2.005 seconds, including browser automation overhead; later inspection was blocked. Initial external smoke calls took 2.9–5.1 seconds including network/proxy/cold-start effects. They do not isolate backend execution or persistence latency.

Chairman polling remains five seconds; Public/Condensed approximately 4.5 seconds. No WebSocket/Realtime subsystem existed to repair. Propagation is automatic but bounded by polling and actual request duration. Neither memory profiling nor per-stage hosted click -> request -> persistence -> acknowledgement -> render timing has been established.

The 41+9 load test is 50 simultaneous game runs across two supported 41-slot sessions, not an unsupported 50-slot single board. It was bounded, not an overnight endurance test. Engine pair execution averaged ~1.22 ms locally; that is CPU simulation time, not API latency.

## Failed attempts retained honestly

Initial browser assertions incorrectly counted a CSS-hidden element and used synthetic imported finals with incorrect dates; fixtures/assertions were corrected to the actual contract. Both browsers then passed. First publication aborted on HTTP 503 fetching a preserved 4.2.2 asset; bounded retries retained every byte hash check and the second publication passed. Initial candidate SQL setup errors rolled back atomically before successful installation. A QA stop transaction missing actor_id rolled back; the corrected transaction stopped only named QA sessions and recorded the test stop.

## Reproduction and remaining work

CI: https://github.com/rgbslb11/Synthcast-Console/actions/runs/38486420332
Deployment verification: https://github.com/rgbslb11/Synthcast-Console/actions/runs/38486420375

Commands: `node --test tests/v501/*.test.mjs`; `node tests/v501/distribution.mjs`. Browser setup and exact Playwright version are in qa-v501.yml. Database fixture instructions are in tests/v501/persistence.sql; it intentionally requires a fresh candidate session and must not be blindly rerun against an advanced one.

Remaining release blockers require resumed hosted Chairman testing after the browser credential-protection restriction, complete operational control timing, the full hosted Deadman sequence, a verified request archive and rehearsed restoration, then explicit deletion approval and Gary's final visual/behavior acceptance. These are not engineering tasks delegated to Gary.

## Live browser observation

On 2026-10-14 at approximately 00:01 UTC (October 13, 7:01 PM Central), the actual hosted Chairman route rendered the correct GameCast 5.0.1 ISOLATED QA heading and sign-in form. It displayed SIGN IN TO CONTROL GAMES; no authenticated Chairman session was available in the test browser. This is the concrete access blocker for hosted control acceptance, not a presumed deployment failure.

Live cloud-browser observation at approximately 2026-10-14T00:02Z: hosted Public showed CLOUD V101 / POWER 41/41 with 54 cards; hosted Condensed showed SAT V101 / WK V101 with 54 cards. Chairman displayed the correct 5.0.1 QA identity and required sign-in. No credentials were inspected or entered.

## Authenticated hosted follow-up — 2026-10-14, about 00:27 UTC

Secure sign-in succeeded. Actual Chairman Launch acknowledged V102 in 1,382 ms; Start Auto acknowledged V104 in 2,005 ms, including browser-automation overhead. After an explicit navigation permitted by the browser credential-protection recovery guidance, the signed-in page showed the persisted running clock at 1st 09:14. Subsequent inspection was again denied by browser credential protection. No further automated authentication recovery was attempted. This is a testing-tool restriction, not evidence of a GameCast defect. Remaining hosted control/Deadman tests remain BLOCKED; initial sign-in access itself is resolved. The named QA G0285 run was stopped through a guarded database teardown and its history retained; this does not count as a Chairman Stop test.
