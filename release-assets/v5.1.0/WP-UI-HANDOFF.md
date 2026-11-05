# GameCast 5.1.0 WP — UI development handoff

Status: READY FOR UI DEVELOPMENT AGAINST THE LOCAL CONTRACT AND FIXTURES. NOT a hosted integration or production certification. No UI was implemented. No cloud schema, function, cron, live session or 5.0.6 file was changed by this milestone.

## Approved behavior implemented

Chairman approved the existing margin-derived illustrative estimator, atomic state capture, Launch freeze and transaction-committed per-action captures. The unchanged GC-WP-ILLUSTRATIVE-0.1.0 equation is used. Launch with missing/mismatched prior continues football and produces BLOCKED WP. No betting inputs, live RNG or pending outcomes are supplied to the estimator.

Current baseline: development/gamecast-v5.1.0 at 8a1a647845d2ab6c05241973239937b6ca1e6ab3. Dedicated WP branch: development/gamecast-v5.1.0-wp. AGENTS, router and procedures 02/04/05 were read. Existing GC-STATS-1 inventory is unchanged.

The only shared backend code change is delivery/controller.mjs: each existing command event now includes wpCaptures, with an allowlisted post-action snapshot and actionOrdinal. These snapshots are saved by the existing source transaction. If any action fails, no source commit or WP observation appears. Retried committed commands retain original captures. Per-action snapshots are transaction-committed action records, not separate independently committed football revisions.

## UI entry points

Composition root: backend/probability/integration.mjs → createWpBackend; this binds the existing source controller, post-commit WP recovery, SQL store, authenticated handler and independent sweep. Backend handler factory: backend/probability/http.mjs → createWpHandler. This is a tested handler factory, not a deployed URL. It requires the existing trusted authenticate/authorize adapters and a server-only WP store. Never put database/service credentials or a fabricated identity in a browser.

Proposed mounted path: /wp. The integration owner chooses the actual isolated QA URL. Do not point UI code at 5.0.6 endpoints.

GET /wp?session=qa-v510-...&game=G0531&after=0&limit=100

Headers: Authorization: Bearer <verified user JWT>; Origin must be allowlisted. Server repeats the database session grant check. Responses are no-store. Public/unauthorized callers cannot read WP.

Response:
- summary: current session/game/run/model IDs, source stateVersion, source throughEventSequence, observationSequence, observedAt, status, reason, probability, favoriteTeamId, color, calibrationStatus.
- points: immutable observations, each with observationSequence, eventId/kind, source version/action ordinal, observedAt, score/clock/possession input, mathematical trace, probability/status/reason, gapBefore/missingIntervals.
- nextSequence: pagination cursor. Do not substitute throughEventSequence (football cursor).
- highWatermark: upper history cursor for this page traversal.

For subsequent pages use after=nextSequence&run=<summary.runId>&through=<initial.highWatermark>. History pages stay bounded at that high-watermark; summary remains current. RUN_CHANGED requires clearing the previous run and restarting at after=0. A stale WP source projection returns BLOCKED/WP_SOURCE_PENDING with no points. Zero historical points is not a 0% probability.

POST /wp?session=...&game=...

Same authentication plus Idempotency-Key (16–128 characters). JSON body: {expectedVersion,prior}. Prior: favoriteTeamId, otherTeamId, pregameMargin, source:{kind,id,sampleCount,generatedAt,contextHash}. Context hash is generated server-side from approved engine/team/venue/quarter configuration and weather/ratings digests. UI must use a supplied manifest, never compute or guess a prior. Source kind is APPROVED_SIMULATION_ENSEMBLE or QA_FIXTURE for QA-only games. Optional diagnostic ensemble percentages do not change the equation.

Pregame saves are append-only, revision-checked and serialized with the source commit. Reusing a request key with different content/version conflicts. After Launch, new prior writes return PREGAME_FROZEN. A successful save is reflected on the next backend sample, normally within five seconds; the UI must not manufacture a new probability. Natural final is an observed football result, not official acceptance.

No approved real-game ensemble manifest has been created in this milestone. All numeric fixtures use clearly marked QA priors. Live forecast values remain unavailable until an approved manifest is loaded.

## Rendering rules

| State | UI behavior |
|---|---|
| PREGAME | Display pregame percentage and illustrative label; permit authorized prior configuration while unlaunched. |
| ESTIMATED | Show probability ×100 and fixed favorite identity; do not change favorite when crossing 50%. |
| FINAL | Display observed outcome 0%/100%, without implying accepted/official status. |
| BLOCKED | Current probability null; grey #808080 and explicit reason. Clear the current number immediately. Preserve old points as grey audit history; no fabricated replacement values. |
| CHAIRMAN_EDIT_OPEN | Temporary block; cancel restores appropriate state only when no saved correction exists. |
| CHAIRMAN_CORRECTION | Persistent session/game block, including restarts and continuation. |
| OVERTIME_MODEL_UNAVAILABLE | No nonterminal OT estimate. A later natural untied final can report outcome if otherwise eligible. |
| WP_SOURCE_PENDING | Source committed ahead of WP recovery; block current display until caught up. |
| PREGAME_INPUTS_MISSING / PRIOR_CONTEXT_MISMATCH | Explain missing/incompatible prior; do not stop football or inject defaults. |

Page background #ECECEC. Other final branding/layout belongs to the UI thread. Show “Illustrative estimate — calibration deferred.” Down/distance/timeouts are captured for audit but not used by this formula; it is not a complete late-game feasibility model.

Use input.favoriteScore and input.otherScore for tooltips. Plot immutable points only. Break the line at gapBefore, null probabilities, correction/run boundaries and unsupported OT. No smoothing across these boundaries. Different action ordinals may have the same timestamp and source version; retain their sequence. Never interpolate missing observations. Client freshness may mark a nonterminal result stale after 15 seconds, but cannot recalculate probability or append history.

## Fixtures and tests

wp-ui/fixtures.json contains actual responses exported by passing SQL integration tests: pregame, launch, live, editCancelled, editOpen, gap, overrideBlocked and final (8 cases). These are QA synthetic examples, not Week 11 results. They are suitable for UI development before a hosted endpoint is connected.

Run from repository root:

    npm ci --ignore-scripts --prefix tests/v510/database
    node --test tests/v510/*.test.mjs tests/v510/database/*.test.mjs

Export fixtures intentionally:

    WP_EXPORT_FIXTURES=1 node --test tests/v510/database/wp-integration.test.mjs

The final full local suite passes 67 tests, including five SQL WP integration tests and the composed backend failure/retry path. Evidence is in evidence/wp-integration-local-20261104.txt. PGlite 0.3.14 supplies local PostgreSQL, including actual disk close/reopen. These are local author results; no hosted durability or concurrent transaction certification is claimed.

Coverage includes: 56 committed game slots, bounded <1 KiB live summaries, Launch freeze, same-batch Edit/Cancel, failed-batch rollback, first gameplay/final records, ten lifecycle/cancellation combinations, missing slots, pure reads, sticky overrides through restart, forbidden pending/RNG getters, SQL immutability/permissions, HTTP authentication boundary, original capture recovery after disk restart, pagination and atomic rollback on conflicting append.

The original corrected prototype remains preserved at cd26ed23bff38004e61210a1004051ae51906846; its 62-test evidence is in the earlier WP contract branch/PR #19. It has not been replaced or claimed as 67 tests for this new implementation.

## Backend integration owner: remaining hosted wiring

1. Review/merge this isolated WP branch into current development after checking concurrent changes. Keep all 5.0.6 source and routes untouched.
2. Test/apply probability/schema.sql only in the isolated QA namespace. It is an unapplied DDL script, not a completed cloud migration. Bind createWpStore to a connection-bound SQL transaction adapter. Each transaction must use one connection; never implement it as unrelated REST queries.
3. Wire createWpPipeline to the existing immutable source loader and source-head version. New sessions must originate with capture-enabled controller events. Historical QA commits without wpCaptures fail closed with SOURCE_CAPTURE_MISSING; never invent their missing action snapshots.
4. Use createWpBackend.controller, which invokes recover after successful source commit; the independent worker also recovers. A failure must not reroll football. Until recovery completes, the read adapter returns WP_SOURCE_PENDING.
5. Run createWpSampler independently of browsers at five-second intervals; startWpSampler provides a Node process timer and an overlap guard. This is not yet a deployed cron/worker. Use a supervised durable service and narrow QA-only discovery. Paused games can produce unchanged samples; Final stops periodic observations. Missed slots remain gaps. Do not create samples on GET requests.
6. Mount the authenticated WP handler and verify real JWT/grant denial/success, source concurrency, scheduler latency and 56-game sustained cloud load. The earlier runner rate-limit issue remains unresolved and is not a GameCast capacity finding.
7. Connect UI only to the explicit QA endpoint once supplied. UI development against fixtures can proceed now; a live end-to-end UI cannot be accepted yet.

## Release gates

Engine/state integrity: local capture purity and rollback checks PASS; integrated cloud NOT TESTED.
Fixed-seed regression: protected mechanics unmodified; new full cloud regression NOT TESTED.
Multi-seed distribution: NOT TESTED for this integration; no tuning performed.
Full-board: local 56-slot SQL/HTTP-adapter checks PASS; sustained hosted load NOT TESTED.
Poll/chunk invariance: local side-effect-free read checks PASS; cloud NOT TESTED.
1x/50x invariance: previous prototype/workload evidence retained; new integrated cloud NOT TESTED.
Persistence/versioning: local SQL append/retry/disk-reopen PASS; hosted NOT TESTED.
Chairman UI, Public scoreboard compatibility, Mobile Safari: NOT TESTED; no UI changed.
Existing sessions: no migration; legacy capture-less sessions intentionally BLOCKED.
Chairman: model/capture design APPROVED; final candidate/production NOT APPROVED.

Rollback: leave WP branch unmerged; no cloud restoration is needed. After development integration, revert the WP change set and stop its isolated worker. Never remove an append-only journal to roll back presentation. Do not deploy production from this milestone.
