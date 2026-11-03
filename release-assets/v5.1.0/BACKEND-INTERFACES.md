# Backend delivery interface — GC-DELIVERY-1

Development backend branch: `development/gamecast-v5.1.0-backend`, based on
`f0eb2a56df7fe8d10e1f7739a261a1d5084b6699`. No endpoint or production activation.

The frozen GC-STATS-1 inventory remains **17 scoreboard entries / 27 team-stat
rows / 22 play attributes / 2 possession features / 1 WP chart**. The additive
`delivery-contract.v1.json` specifies the previously missing transport shapes.
It does not rename fields, change WP equations, or select a UI layout.

## Source → journal → read

1. A trusted server loader supplies a committed revision and **all** command
   manifests from genesis in one atomic read. `source-adapter.mjs` validates
   revision continuity, event counts/hashes, game identity and QA scope. A hash
   is an integrity check, not proof of origin: the loader must read authoritative
   storage, never request JSON. No current production loader is registered.
2. `createCommittedSourceConsumer` feeds `createProjectionWriter`, which derives
   statistics only from committed history. It never advances football or reads
   pending plays/RNG. Every game is consumed for each session revision, including
   games unchanged by that revision. Source revision 0 is explicit empty genesis;
   existing 5.0.6 sessions beginning at version 1 cannot be imported implicitly.
3. `commit_reporting` atomically writes the bounded summary, append-only source
   digests, immutable plays and retry receipt in `gamecast_v510`. Audit history
   cannot be truncated across runs. A gap stops ingestion; replay the missing
   committed revision, then retry. Identical old receipts remain retryable.
4. `createDetailsHandler` uses `authenticate`, `authorize`, `readDetails` from
   `createReportingTransport` plus an independently trusted `loadSourceVersion`.
   Auth is verified remotely, session grants come from the database and SQL
   rechecks the grant. The browser cannot supply identity or audit authority.
   Only `qa-v510-*` sessions are accepted. No write HTTP route is provided.
5. A projection behind/ahead of the authoritative revision returns an envelope
   marked BLOCKED. An open Edit also blocks; cancellation restores only a clean
   game. Saved corrections remain blocked after final/accept/restart. Reads are
   side-effect free and return `Cache-Control: no-store`.

`schema.sql` is a tested development DDL draft, **not** an applied cloud migration.
It creates no production bindings, cron, functions or user grants. It uses invoker
functions, private grants, RLS, no public execute, and immutable journal triggers.
The service role may ingest; anon/authenticated roles cannot read the schema.
A production migration must follow isolated-cloud review and its own rollout.

## UI thread

Use the wire fields in `delivery-contract.v1.json`. On continuation pages send
`run`, `version` and `after=nextSequence`. `throughEventSequence` is a raw history
index; it is **not** the pagination cursor. The summary and each page must refer
to the same run/version. On `STATE_VERSION_CHANGED`, discard the old summary and
rebuild from `after=0`; on `RUN_CHANGED`, clear the displayed run first. Never
merge pages across revisions. On BLOCKED, clear detailed content and show the
reason; retry does not authorize bypassing a block.

`generatedAt` is the persisted source commit timestamp, suitable for stale-state
presentation. Reads cannot manufacture a fresher timestamp. A complete response
may still mark individual missing fields BLOCKED: records are not connected and
must remain null. TOP is recorded engine football-clock accounting, including
partial-play clock consumption, not a reconstruction from resolved play times.

The scoreboard has exactly 17 keys. Stats arrays are `[away, home]`. Conversion
percentage fields retain the foundation shape `{made, attempted, percentage}`;
zero denominators are null. The field is offense-relative; use the supplied
possession when orienting a graphical field. Historical play coordinates are
separate from live coordinates. Overtime score is available, but live field,
down/distance and possession are BLOCKED because the engine has no OT snap ledger.
No UI component or public route was changed here.

## WP thread

WP implementation and tests in `illustrative-wp.mjs` / `wp.test.mjs` are untouched.
The backend exposes the same `sessionId`, `gameId`, `runId`, `stateVersion`,
`throughEventSequence`, source commit timestamp and correction availability for
coordination. Missing source evidence blocks; committed correction history is
session/game-wide and cannot be cleared by a new run. Do not sample on detail
reads, and do not use cursor/page delivery as the five-second sampling clock.

The consumer's committed-source boundary is the integration point for a WP
writer owned by that thread. Model version/prior freeze, kickoff/first-play/
final/override observations and immutable WP storage remain that thread's scope.
Chairman decision, November 3, 2026: **Launch freezes WP.** The prior and model
freeze at the authoritative Launch transition. This resolves the earlier
launch-versus-kickoff wording; the WP thread owns implementation.

## Unresolved integration boundaries

- No 5.1 authoritative cloud runtime/outbox or source-revision loader is deployed.
  The loader must supply atomic state/audit manifests from the actual commit path.
  A missed source revision is a recovery task, never permission to skip history.
- All local SQL checks use PGlite (PostgreSQL in WASM), including disk close/reopen.
  Hosted Postgres isolation, concurrent transactions, PostgREST, Auth service,
  network failure, backup recovery and production latency are NOT TESTED.
- Local 56-game reads test reporting interference and a serial PostgreSQL runtime;
  56 concurrent HTTP promises do not certify 56 concurrent database transactions.
- Missing records remain BLOCKED. Full OT snap statistics remain unavailable.
- `netPuntYards` retains the foundation's recorded engine net yards. A punt can be
  truncated by the engine's 99-yard spot clamp (e.g. OWN 64 + recorded 40 becomes
  OPP 1, a 35-yard field change). Whether to report recorded net yards or field
  change is a **P2 accounting decision**, not silently changed in this milestone.

## Isolated QA command caller

The authenticated command route and exact retry/expected-version interface are
documented in [HOSTED-COMMAND-QA.md](HOSTED-COMMAND-QA.md). The GC-STATS-1 field
counts and GC-DELIVERY-1 read contract are unchanged. WP/UI owners must retain the
Launch freeze boundary and server-side correction blocks. Successful signed-in
cloud command execution is not yet verified; no production endpoint is changed.
