# GameCast 5.0.0 baseline audit

Observed 2026-10-13 UTC, before candidate code changes. Author self-check, not independent verification.

- Repository: rgbslb11/Synthcast-Console, public; main is not the current 5.0.0 release branch.
- Source: release/gamecast-v5.0.0 at `762da633e38ddf8acb0a9e7798ee4502deb1e81f`.
- Candidate: release/gamecast-v5.0.1 created from that exact SHA. No production merge authorized.
- Attached September registry pins 4.3.1; it is historical for this assignment. The historical downloader pins 4.2.2. Neither is the 5.0.1 starting point.
- Live frontend: https://rgbslb11.github.io/Synthcast-Console/v5.0.0/. index.html, app.js, auth-api.js, release-config.js and ui1.3/scoreboard.js match the baseline byte-for-byte. Hashes: release-assets/gamecast-v5.0.1/evidence/baseline-ui-manifest.json.
- Supabase project: GameCast-5.0-QA (`xsvdmcipviejxynkdbhq`); operational despite QA name. Schema: gamecast_v500.
- Deployed functions: gamecast-week7-v5-public v3, gamecast-week7-v5-chairman v8, gamecast-week7-v5-scheduler v5. All 13 deployed Chairman files match release-assets/v5.0.0/backend exactly. Public and scheduler bundles have older shared code; candidate must not assume the three bundles are identical.
- Session: w7v500-17e1dde75f5b1cba, version 11213, engine GC-W7-V5.0.0-RC1, Week 7. 41 operating games: 22 READY, 1 LOCKED, 18 FINAL_PENDING, all activity FINAL. Plus 13 separately imported immutable finals = 54 displayed games. No active football game found in this session.
- Last session update: 2026-10-12T22:45:32.618Z. Requests: 11,211 (10,997 SCHEDULER, 214 operator); events: 17,328; final_snapshots: 13; sessions: 1.
- requests relation including TOAST and indexes: 2,350,628,864 bytes. events: 7,438,336; sessions: 917,504; final_snapshots: 106,496. Database measured 2,389,997,235 bytes; background system tables may change between queries.
- Stored request response values: scheduler 2,227,124,833 bytes (average 202,521); operator 28,593,995 (average 133,617). These are stored datum measurements, not guaranteed physical space recoverable by DELETE.

## State and deployment flow

Static vanilla JavaScript Chairman/public/condensed UI -> HTTP handlers -> engine operations -> runtime/engine.mjs -> DatabaseStore -> Supabase REST RPCs -> gamecast_v500.sessions, events and requests. Scheduler invokes the same engine through a separate deployed bundle. The current browser implements periodic HTTP polling; no Supabase Realtime/WebSocket subscription is present in the inspected UI. Framework component ownership is not the cause: these routes do not use React.

Session football state and version are authoritative in Postgres. Public reads must be side-effect free. Chairman controls and scheduler perform version-checked writes. Every successful commit currently stores the complete board in requests.response for idempotent replay, including growing history. The browser receives redacted render state. Board version advances for every committed command/tick, even when only another game changes.

UI configuration holds project URL, publishable key and separate public/Chairman endpoints. Backend configuration reads Supabase service credentials, allowed origins and scheduler secret from environment; secret values were not retrieved. Existing GitHub workflow deploy-v500.yml publishes Pages from release/gamecast-v5.0.0 and preserves prior routes. It must not be repurposed to overwrite 5.0.0.

## Protection and unknowns

No baseline source, session, accepted/locked history, schema, scheduler or deployed function was changed during this inventory. All Week 7 state remains preserved. External full-recovery archive, hosted control timing under load, exact runtime environment setting values, and physical disk metrics beyond SQL relation/database sizes are not yet verified. Deletion is BLOCKED until preservation, dependencies, SELECT dry run and owner approval are satisfied. Database export files containing private run material must not be committed to the public repository.
