# GameCast 5.0.5 — source published, backend partially deployed

Engine GC-W10-V5.0.5-RC1 implements exactly the approved 2x rating-edge multiplier, 18-second normal runoff base, and +1 yard on already-positive nonfumble rushing gains. All 56 W10 schedule rows and all 121 rating records are unchanged. Prior 5.0.4 files/functions/sessions/results remain unchanged.

## Verified

- Source published to release/gamecast-v5.0.5, first source commit 181ef860ce13c9896bea515797d7093ee8f742fc.
- 54/54 local and GitHub logic tests passed. Chromium and WebKit mobile-viewport UI/OT suites passed in GitHub run 40822995615. Real iPhone Safari is not tested.
- Final-version 56,000-game population: shutouts 3.43%, margins1–7 38.99%, offensive snaps 127.92, combined points 42.71.
- Schema gamecast_v505_w10 created; one authorized operator copied. All seven tables have RLS; anon/authenticated lack schema usage.
- Actual database state/ledger/commit/idempotent replay/conflict/recovery/RLS probe passed and all probe writes rolled back. Sessions/events remain zero; writes disabled.
- Public and Chairman functions deployed at version 1. Public health returns engine GC-W10-V5.0.5-RC1; unauthenticated Chairman returns 401.

## Remaining automatic approval block

Automatic approval review rejected the scheduler endpoint gamecast-week10-v5-0-5-scheduler and the separate scheduler migration. The latter creates Vault secret gamecast_v505_w10_scheduler_cron_token, scheduler control table/functions, and cron job gamecast_v505_week10 at five-second intervals. Review treated this recurring infrastructure and scheduler endpoint as requiring more explicit authorization despite approval of the three-function rollout. Neither rejected action was executed or retried through another path.

## Activation remains disabled

No operational session, game launch or Pages publication has occurred. Before activation, explicitly authorize the named scheduler endpoint, Vault secret and five-second cron job. Deploy/create them initially disabled, test authenticated scheduler and rollback, then enable only new-release writes/scheduling, create a fresh unlaunched session and publish through the gated preservation workflow. Old sessions remain on old endpoints; no accepted/pending result is migrated or re-simulated automatically.

Distinct release bindings: schema gamecast_v505_w10; w10v505- session prefix; /v5.0.5/w10/ UI; independent 505 browser storage keys. New 5.0.5 sessions start unlaunched. Completed/pending 5.0.4 results remain on the old route.

## Rollback

Retain all old routes and state. Disable new-release writes and, once created, its scheduler/cron. Preserve all 5.0.5 histories and never continue them with 5.0.4 mathematics. No operational rollback is needed while writes remain disabled and no sessions exist.
