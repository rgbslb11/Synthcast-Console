# GameCast 5.0.5 — source published, backend partially deployed

Engine GC-W10-V5.0.5-RC1 implements exactly the approved 2x rating-edge multiplier, 18-second normal runoff base, and +1 yard on already-positive nonfumble rushing gains. All 56 W10 schedule rows and all 121 rating records are unchanged. Prior 5.0.4 files/functions/sessions/results remain unchanged.

## Verified

- Source published to release/gamecast-v5.0.5, first source commit 181ef860ce13c9896bea515797d7093ee8f742fc.
- 54/54 local and GitHub logic tests passed. Chromium and WebKit mobile-viewport UI/OT suites passed in GitHub run 40822995615. Real iPhone Safari is not tested.
- Final-version 56,000-game population: shutouts 3.43%, margins1–7 38.99%, offensive snaps 127.92, combined points 42.71.
- Schema gamecast_v505_w10 created; one authorized operator copied. All seven tables have RLS; anon/authenticated lack schema usage.
- Actual database state/ledger/commit/idempotent replay/conflict/recovery/RLS probe passed and all probe writes rolled back. Sessions/events remain zero; writes disabled.
- Public and Chairman functions deployed at version 1. Public health returns engine GC-W10-V5.0.5-RC1; unauthenticated Chairman returns 401.

## Scheduler installed and verified

The user explicitly approved gamecast-week10-v5-0-5-scheduler, gamecast_v505_w10_scheduler_cron_token and gamecast_v505_week10. All three are now created/deployed. The cron job runs every five seconds when enabled; it is currently inactive. An authenticated empty scheduler sweep returned HTTP 200 with zero sessions/processed; disabling the scheduler control caused the same valid-token probe to return HTTP 403. All flags were left disabled.

## Remaining activation block

Automatic approval review rejected the activation transaction, stating that enabling production writes/cron and creating an operational session require exact activation authorization beyond installing the components. No activation was applied. New release sessions/events remain zero; writes, scheduler control and cron are all disabled. Both prior 5.0.4 session state hashes remain unchanged across the work. No rejected action was bypassed.

The prepared activation script is scripts/prepare-v505-operating-session.mjs. Its generated SQL creates one 56-game, unlaunched operating session, enables only 5.0.5 writes/scheduling and starts no games. Preserve the generated SQL between retries; do not regenerate random input seeds after a successful create. After exact activation approval, execute the prepared transaction, verify all game flags, publish through deploy-request.json and the preservation workflow, then verify old/new routes. No game launch or result acceptance is implied.

Distinct release bindings: schema gamecast_v505_w10; w10v505- session prefix; /v5.0.5/w10/ UI; independent 505 browser storage keys. New 5.0.5 sessions start unlaunched. Completed/pending 5.0.4 results remain on the old route.

## Rollback

Retain all old routes and state. Disable new-release writes and, once created, its scheduler/cron. Preserve all 5.0.5 histories and never continue them with 5.0.4 mathematics. No operational rollback is needed while writes remain disabled and no sessions exist.
