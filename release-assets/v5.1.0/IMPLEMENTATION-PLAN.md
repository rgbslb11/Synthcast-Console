# GameCast 5.1.0 enhancement delivery

Authorized scope: all ten workstreams below. This branch is development only. Production 5.0.6, its session, schema, functions, cron and UI routes are protected. Base: 754d959def7a67f2ada99a13f4e3a4c3254be4b8. Router and procedures 04/05 loaded. No deployment workflow is added for this branch.

## Frozen data contract

GC-STATS-1 retains exactly 17 scoreboard entries, 27 team-stat rows, 22 play attributes, two possession/field features and one WP chart. See data-contract.v1.json. Changes require an explicit contract revision; never silently repurpose a field. Missing data is BLOCKED, never substituted with zero.

## Implementation sequence and acceptance

| # | Workstream | Acceptance |
|---|---|---|
| 1 | Freeze data contract | Exact field inventories, units, provenance, coverage, block reasons and versioned envelope |
| 2 | Implement access and correction blocking | Server denies public/unauthorized requests before reading details; complete session/game audit; edit/cancel/commit/accept/restart cases |
| 3 | Normalize resolved plays | Stable event identity, allowlisted output, original descriptions, adjudicated yards, unknown outcome rejection |
| 4 | Team stat calculations | Every requested row reconciles to hand-checked fixtures and full game histories; correct college sack/kneel accounting |
| 5 | Possession and field functionality | Possession boundaries, halftime/endgame handling, pre/post spots and line-to-gain; return-to-live behavior |
| 6 | WP calculation | Port inspected supplied model/history corrections; immutable five-second central observations; no live RNG or future outcomes; model limitations explicit |
| 7 | Live delivery and recovery | Bounded snapshot and append-only journal; cursor/version checks; idempotent retry; actual database recovery |
| 8 | Regression and load check | Baseline invariance, full-board 50+ active games, reporting load, latency budgets, restart/disconnect and browser gates |
| 9 | Scoreboard-Stats-Rollup UI | Lightweight overview; game-level availability; authorized detail toggle; stale/block transitions |
| 10 | Detailed stats UI | All requested fields accessible; team comparison, scoring, PBP, field and WP; mobile and keyboard checks |

Backend order 1→2→3→4→5. WP can proceed after 1/2 with explicit model limitations. Delivery integrates those modules. UI prototypes can begin against the frozen contract; final regression/load repeats after UI integration.

## Reuse and unresolved evidence

Prior enhancement source: fix/v506-wp-review-findings at cd26ed23bff38004e61210a1004051ae51906846. Preserve that branch. Selective port only: it exposed statistics publicly and stores a growing WP ledger inside game snapshots. Neither is suitable for this contract unchanged. Existing corrections/tests are evidence for reuse, not proof of 5.1.0 readiness.

WP supplied model GC-WP-ILLUSTRATIVE-0.1.0 is experimental. Actual pregame prior manifest is missing; full late-game/timeouts/down-distance and nonterminal OT model remain BLOCKED. Calibration is deferred by Chairman for testing/enjoyment; do not block experimental work on empirical calibration. Material replacement equations require an explicit model decision.

Authoritative standings and records are not yet connected. Approved final UI layout/palette artifact must be retrieved before visual acceptance. No invented player identities, penalties, returns or unrecorded OT snaps.

Future isolated cloud namespace proposed: gamecast_v510; function names gamecast-v5-1-0-*; UI /v5.1.0/. These are reserved design names, NOT deployed resources. No modification of gamecast_v506_w11 is permitted. QA results cannot be accepted/published. Production deployment follows completed candidate review.

## Release status

NOT RELEASE READY. New cloud durability/load, final UI, real Mobile Safari, and Chairman candidate acceptance are NOT TESTED. Prior release passes do not transfer automatically. Rollback at this stage is to leave the development branch unused; no production restoration is needed.
