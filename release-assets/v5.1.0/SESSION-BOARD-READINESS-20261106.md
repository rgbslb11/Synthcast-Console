# Authenticated session board — November 6, 2026 UTC

## Delivered scope

Candidate `a3dd67ffe06104b8dcf5f4c91dcc30239544b228`, branch `feature/v510-session-board`, PR #30. The Chairman accepted the dedicated login before this work. Login now leads to all games in the authorized QA session without manually supplying game IDs. Lifecycle filters use stored source state; FINAL_PENDING remains explicitly not accepted. Full details and WP history load only for the selected game.

New additive contract: [GC-BOARD-1](contracts/session-board-v1.md). Existing stats, delivery and WP contracts remain unchanged. One SQL snapshot rechecks authorization, enumerates up to 56 games and withholds stale/pending or corrected statistics. UI clears board data on failed reads.

## Evidence

- Local unit/regression/transport: **157 PASS**.
- Local PostgreSQL/PGlite: **17 PASS**, including one-statement roster authorization, all 56 source IDs, pending/corrected blocking, read immutability and revocation.
- Full-game local rehearsal: **56/56 natural FINAL_PENDING**, no acceptance; terminal history unchanged after later source revision.
- GitHub CI **42155227408 PASS**: same suites plus Chromium and WebKit fixtures. WebKit is not native-device Safari.
- QA WP Edge Function **v16 ACTIVE**, JWT verification true; all 18 deployed source files read back and matched the intended bundle. Only store/http plus the new session-board module differ from v15.
- Read-only hosted source check after backend deployment: session `qa-v510-wp-load-r3`, revision **24**, exactly **56 games**, all **56 FINAL_PENDING**, original commit timestamp `2026-11-05T15:44:40.036745+00:00` unchanged.
- QA Pages run **42155227356** published successfully; hosted login, all 56 games, final filter, search, stats/WP and overflow checks passed. Disconnect/reconnect exposed an empty selected-game identity after clearing the roster; corrected by retaining IDs only while clearing all metadata/statistics, with a new browser regression. Follow-up publication/hosted verification is pending. No production certification implied.

## Preservation and rollback

Protected production 5.0.6, earlier Pages assets, football engine, clocks, ratings, schedules and accepted results are outside this change and unchanged. Publication checks retain all **234** prior-release assets and replace only the **13** QA review assets.

UI rollback baseline: commit `b63acc4f494c13fca9eed2eb5bef19739a8ade8a`, successful publisher `42151750848`; use its preserved Pages artifact/inventory. Never invoke an old release publisher to roll back this QA route.

Backend rollback: reconstruct the v15 bundle from the same baseline, using `qa-wp-api/index.ts`, `qa-wp-api/database-config.mjs` and its backend module dependencies. Keep JWT verification enabled. The entrypoint/config and modified modules were compared with the actual v15 bundle before deploying v16. No schema or state rollback is required; this addition performs reads only.

## Remaining release work

1. Operational Chairman command integration and remaining source-field handoffs.
2. Browser-independent five-second WP sampling, supervised recovery and approved non-fixture priors.
3. Hosted 56-active-game full-game soak and native Mobile Safari validation.
4. Production/session compatibility, final rollback rehearsal and Chairman candidate approval.

The roster/lifecycle part of workstream 9 is complete in code. This remains an isolated read-only QA candidate, not approval of production 5.1.
