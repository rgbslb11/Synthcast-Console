# GameCast 5.1 assembled candidate — November 5, 2026 Central

Development review candidate; not a production release.

## Exact inputs and scope

- UI input: `671183ee7bdd950908b5a5949c56338fe773fd15` (`fix/v510-wp-board-ui`).
- Backend/WP input: `c3d19c034f3c69bcdc66fce8eb53099454492571` (`fix/v510-wp-read-latency`).
- Combined branch: `integration/v510-readiness-20261105`.
- Router and procedures 02, 05 and 06 read in full. Procedure 03 also inspected.
- Merge was conflict-free. Backend and QA WP API bytes exactly match the backend input. UI, app, hosted Site configuration and frozen contracts exactly match the UI input.
- No football equations, ratings, schedule, clocks, lifecycle semantics, accepted results or deployed functions changed.
- New work: combined CI workflow, 56-game full-game SQL integration test, this readiness record and status pointer.

## Fresh local evidence

- Combined unit/regression/UI transport tests: **153/153 PASS**.
- Existing PostgreSQL/PGlite integration tests: **15/15 PASS**.
- Added full-board rehearsal: **1/1 PASS**. Exactly **56/56** games reached natural `FINAL_PENDING` after 14 synthetic 600-second advances, source revision 15. At each step source, reporting and WP were exercised; reads preserved football history. Every game had one launch capture and one final capture, and terminal WP was 0 or 1. No result was accepted.
- This rehearsal uses local PGlite and synthetic elapsed time. It is not a hosted concurrency, real-time sampler, or latency certification.
- Prior release source preservation: PASS against protected commit `754d959def7a67f2ada99a13f4e3a4c3254be4b8`.
- Local browser rerun blocked by unavailable browser executables/system dependencies. The dedicated GitHub CI workflow runs pinned Chromium and WebKit fixtures for this combined source.

## Live read-only observations

Supabase project `xsvdmcipviejxynkdbhq`:
- QA details function v5, commands v7 and WP API v14 are ACTIVE with JWT verification.
- QA worker v7 exists; no cron job matching 510, 5-1 or WP is registered.
- `qa-v510-wp-load-r3`: source revision 24; 56 reporting heads all revision 24; WP progress 24.
- These QA source heads identify retained football mechanics as `GC-W11-V5.0.6-RC1`; this is distinct from the 5.1 reporting/UI product work. No identity was silently renamed.
- Current 5.1 production deployment is not established by these QA observations.

## Publication

UI publication run `42064194144` passed preparation but attempts 1 and 2 timed out after GitHub accepted the deployment; returned deployment status remained empty. Attempt 3 was requested during this pass using the same previously verified artifact. Do not claim hosted success until its publication and hosted jobs pass.

Review route: https://rgbslb11.github.io/Synthcast-Console/v5.1.0/review/

The route is a read-only QA review. It does not supply operational Chairman commands. The existing artifact contains all 234 protected published files plus 13 QA files. The retry must preserve them.

## Original ten workstreams

| # | Workstream | Candidate evidence and remaining requirement |
|---|---|---|
| 1 | Frozen data contract | GC-STATS-1 and GC-DELIVERY-1 unchanged; GC-WP-BOARD-1 integrated. |
| 2 | Access/correction blocking | Combined local and SQL tests pass; complete operational browser command integration remains. |
| 3 | Resolved-play normalization | Combined regression passes; full-board source history preserved by reads. |
| 4 | Team statistics | Existing 27-row calculation/reconciliation tests pass; missing source fields remain unavailable. |
| 5 | Possession and field | Approved UI unchanged; historical line-to-gain and unsupported OT behavior still require resolved source coverage/scope. |
| 6 | WP | Backend and board UI integrated, immutable recovery tests pass; continuous hosted sampling and approved non-fixture priors remain. |
| 7 | Live delivery/recovery | SQL integration and full-board natural finals pass locally; hosted active-game soak remains. |
| 8 | Regression/load | 169 local tests pass in two suites plus the added rehearsal; hosted 56-active-game capacity remains NOT TESTED. |
| 9 | Scoreboard/Stats/Rollup UI | Approved board integrated; authoritative roster/lifecycle feed and operational route remain incomplete. |
| 10 | Detailed Stats UI | Approved UI and WP history integrated; latest hosted publication, actual devices and remaining detail-field handoffs remain. |

## Twelve release gates

| Gate | Status | Scope |
|---|---|---|
| Engine/state integrity | PASS | Local retained regression and 56 natural finals; not hosted release certification. |
| Fixed-seed regression | PASS | Retained local regression on combined source. |
| Multi-seed distributions | NOT TESTED | No fresh population calibration run. |
| Full-board checks | PASS | Local 56-game full-game SQL rehearsal; hosted active-game load NOT TESTED. |
| Poll/chunk invariance | PASS | Retained local invariant tests and reporting-read immutability. |
| 1x versus 50x invariance | PASS | Retained local invariant test, no new speed tuning. |
| Backend persistence/versioning | PASS | Local SQL recovery/reopen tests; deployed candidate recovery remains NOT TESTED. |
| Chairman Console integration | NOT TESTED | Read-only review is not operational command UI. |
| Public scoreboard integration | NOT TESTED | No assembled production public integration certified. |
| Mobile Safari | NOT TESTED | WebKit CI is not native-device Safari. |
| Existing-session compatibility | NOT TESTED | No production migration performed. |
| Chairman candidate approval | NOT TESTED | Candidate has not been accepted. |

## Remaining release blockers and rollback

1. Complete latest QA publication and hosted checks.
2. Finish board roster/lifecycle, Chairman command integration and unresolved source-field handoffs (Master Zulu, drive duration, scoring details, historical line-to-gain).
3. Establish browser-independent five-second sampling with supervised recovery and approved session/priors.
4. Run hosted 56-active-game full-game soak and actual Mobile Safari.
5. Verify deployment/session compatibility, prepare exact release/rollback manifest and obtain Chairman candidate approval.

Recommendation: **DO NOT APPROVE production deployment yet**. The combined branch is isolated and can be left unused or reverted; no database restoration is required for this integration. QA publication rollback uses the preserved Pages artifact and must retain all 234 baseline files. Never use an older release publisher as a substitute.
