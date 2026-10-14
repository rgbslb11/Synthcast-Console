# GameCast 5.0.1 — release candidate

Status: isolated QA deployed; **DO NOT APPROVE 5.0.1 FOR PRODUCTION**.

Baseline: `release/gamecast-v5.0.0` at `762da633e38ddf8acb0a9e7798ee4502deb1e81f`.
Candidate branch: `release/gamecast-v5.0.1`.
Deployed application source: `d2b8b8c7e436dd7d50a1cb84e683dbe30041baa7`.
Documentation/evidence commits may follow that source commit without changing deployed application bytes.

## Proven repairs

- Tied Q4 teams facing more than two yards on fourth down at OWN 10 or deeper now punt. The baseline reproduced the reported 4th-and-8 at OWN 3; trailing/desperation behavior elsewhere remains unchanged.
- Ordinary offensive losses reaching the offense's own goal line now award the defense two points, change possession, stop the clock, and record the safety/free-kick evidence. Existing kickoff abstraction remains: the receiving side starts at OWN 25; no new free-kick simulation was introduced.
- Scheduler idempotency receipts now retain identity and committed version, rather than another entire board and all accumulated history. Current state and incremental audit events remain durable.
- Per-game control/edit witnesses distinguish unrelated board updates from actual changes to the game being edited. Database version comparison, authentication, idempotency and true concurrent-edit rejection remain. Bounded retries resolve unrelated scheduler collisions; unresolved contention reports busy without forcing refresh.
- Candidate API requests have a 15-second browser deadline. A network-uncertain write retains the idempotency key for retry; this is not permission to claim it failed.
- Candidate state adoption rejects older versions and foreign sessions. Existing periodic live updates, draft protection, search and filters remain.

## Deployment controls

Separate frontend route, browser storage, engine version, session prefix, database schema, three function names, scheduler token and cron job. All active candidate games are explicitly QA-only; candidate acceptance is blocked. The 13 imported finals are preserved as immutable reference display rows. Every deployed backend dependency was retrieved and compared byte-for-byte with the candidate source.

The project-level Supabase URL, Auth service, service-role infrastructure, allowed-origins setting and existing writes-enabled environment switch are reused. A distinct scheduler HMAC key is derived with the 5.0.1 release identity; no secret was printed. A separate gamecast_v501 release-control row can stop candidate writes without changing 5.0.0.

## Intentionally unchanged

Ratings, schedule IDs/order, weather coefficients, Deadman engine module, score suppression, calibration, home-field calculation, accepted/locked 5.0.0 state, all older release source and main. No framework rewrite, new database product, production merge or historical cleanup.

Kneel logic already accounts for downs, opponent timeouts, actual runoff and own-goal-line safety. The reported Miami example cannot exhaust 57 seconds with two opponent timeouts; no kneel change was justified. Conference blowouts were plausible conditional on the existing model; no retuning was made.

## Evidence and remaining work

23 automated regression groups; 11 browser cases each in Chromium and mobile-sized WebKit; 8,200 paired simulations; 100 database receipt writes; bounded hosted 1-game and 50-game tests. These are author checks, not independent certification. Hosted Launch/Start Auto acknowledged in approximately 1.4/2.0 seconds. Further hosted inspection was blocked by browser credential protection; remaining controls and full restoration remain BLOCKED.

[Baseline](GAMECAST_5_0_0_BASELINE_AUDIT.md) · [Defects](GAMECAST_5_0_1_DEFECT_REGISTER.md) · [Storage](SUPABASE_STORAGE_ROOT_CAUSE.md) · [Cleanup](W7_5_0_0_CLEANUP_PLAN.md) · [Tests and gates](GAMECAST_5_0_1_TEST_RESULTS.md) · [Deployment](GAMECAST_5_0_1_DEPLOYMENT_RECORD.md) · [Rollback](GAMECAST_5_0_1_ROLLBACK_PLAN.md) · [Deferred](DEFERRED_5_0_2.md).


## 2026-10-14 deployment verification and saved recovery receipt

See [deployment verification](GAMECAST_5_0_1_DEPLOYMENT_VERIFICATION_20261014.md) for deployed-source equality, stopped operating state, saved private runtime recovery export, and the exact four unresolved acceptance gates. Isolated deployment is present; production acceptance remains incomplete.
