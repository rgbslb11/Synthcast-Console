# GameCast 5.0.1 — Week 8 deployment verification

Verified 2026-10-14T22:25:15.647Z. Author-run engineering evidence, not independent production certification.

## Delivered state

The user-authorized Week 8 operating binding is published. Chairman, Public and Condensed are connected to the same persisted session, `w8v501-207abd3abbb84e68`, version 3. Each live view displayed 56 games; Condensed Saturday displayed 45. Public and Condensed received version 3 automatically without a manual refresh.

- [Chairman](https://rgbslb11.github.io/Synthcast-Console/v5.0.1/w8/?session=w8v501-207abd3abbb84e68)
- [Public](https://rgbslb11.github.io/Synthcast-Console/v5.0.1/w8/?session=w8v501-207abd3abbb84e68&view=public)
- [Condensed](https://rgbslb11.github.io/Synthcast-Console/v5.0.1/w8/ui1.3/?session=w8v501-207abd3abbb84e68)

Writes, scheduler control and the Week 8 cron job are enabled. All 56 games remain UNLAUNCHED, Auto OFF, On Air OFF, Deadman UNARMED, weather OFF, and 600-second quarters. No game was launched or accepted during Week 8 preflight. SEUD import remains on hold.

Two reversible prelaunch configuration writes changed G0365 to 900-second quarters and restored 600; the audit trail is retained. No scores changed. Scheduled kickoffs already in the past were preserved; no finals were invented.

## Exact inputs and isolation

Input: W08_GAMECAST_SCHEDULE_WITH_RATINGS_56_R1.csv.
SHA-256: `364135ac15a36b16b34f697f40254de0382c7a470aa16e505bb5f2020a9ad058`.

56 distinct games, 112 distinct scheduled teams, 336 supplied TEAM/OFF/DEF values. Date counts: October 13: 2; October 14: 2; October 15: 3; October 16: 4; October 17: 45. The persisted slate matched every supplied identity, code, record, rank, neutral flag, carriage, kickoff and rating: zero differences. No ratings were invented for idle teams. Weather notes were preserved as information and did not activate weather effects.

Separate schema `gamecast_v501_w8`, session prefix `w8v501-`, session-storage namespace, route and three Edge functions. Existing project Auth is reused normally. Chairman requires verified Auth and an active Chairman registry entry. Public is read-only; scheduler uses its own Vault-backed cron authorization and HMAC boundary. All tables use RLS; anon/authenticated lack schema access and cannot invoke creation RPCs directly.

The Week 7 QA schema remains disabled, with no Auto or armed games. Its QA acceptance prohibition remains unchanged. Week 8 operating sessions have a database constraint requiring qaOnly=false; QA fixtures are not promoted into them. Human confirmation and LOCKED state remain prerequisites for accepting an operating result.

## Deployment identity

Application/UI source: `f33c9d7dce5fadf94f4724bd2c02f4bab92e8c23`.
Initial Week 8 source commit: `76b4b4ea457561490fc680b3f0a9b80f259fa58c`.
Branch: `release/gamecast-v5.0.1`; no main merge.

All three deployed Week 8 backend bundles were fetched and compared: zero source differences; Chairman 14 dependency files, Public 14, scheduler 16. All are deployment version 1. Only Chairman uses platform JWT verification; the inherited public read boundary and custom scheduler authentication retain their reviewed roles.

[Deployment workflow 38646320928](https://github.com/rgbslb11/Synthcast-Console/actions/runs/38646320928): verify, deploy and postdeployment all SUCCESS. Postdeployment verified all 99 previously preserved files and all 30 candidate-route files (15 Week 7 plus 15 Week 8). Documentation-only commits after the application SHA do not change deployed bytes.

## Tests and observed measurements

- 34 automated test groups passed; zero failures.
- 12 retained browser scenarios per browser plus 15 Week 8 scenarios per browser: Chromium and mobile-sized WebKit. These use local test Auth/persistence and are not substituted for hosted evidence.
- Hosted Week 8 creation: 2,919 ms until the final card was visible, including browser automation overhead.
- Hosted prelaunch setting writes: 1,066 ms and 1,138 ms until persisted state was rendered.
- Actual Public and Condensed rendered 56 games with no Launch/Accept controls. Full/Saturday selection was verified live.
- Hosted security probes: valid-origin public health 200; foreign origin 403; unauthenticated Chairman 401; unauthenticated scheduler 403.
- Week 8 database probe: created 56 games; compact scheduler receipt 158 JSON-text bytes; identical replay exactly once; stale write rejected; QA/operating constraint rejected; exact session serialization. Test transaction rolled back, retaining zero test rows.
- 56 fixed-seed pairing comparisons preserved 1x/50x football invariance.
- An additional local workload completed 1,120 games across 20 full Week 8 slates. No unfinished games, tied finals or period-zero scores. Post-GC heap samples were 10.56–10.73 MB; RSS grew from about 64 to 176 MB. This short Node workload is not a hosted memory/overnight soak certification.

Hosted Edge execution observations during the Week 8 verification window:

| Route / operation | Samples | Median ms | P95 ms | Maximum ms |
|---|---:|---:|---:|---:|
| Chairman successful reads | 79 | 429 | 542 | 984 |
| Chairman successful creates/writes | 3 | 810 | 930 | 943 |
| Public reads | 263 | 260 | 352 | 6,603 |
| Idle scheduler requests | 57 | 274 | 341 | 2,001 |

These are function execution timings, not isolated database transaction timings. Public maximum latency is retained, not hidden. No measured server failure occurred in this sample.

## Hosted controls and Deadman closure

On the isolated Week 7 QA session, actual in-page UI checks completed Final cancel/confirm, Lock, Unlock cancel/confirm, and Accept cancel/confirm. QA Accept returned QA_ACCEPT_FORBIDDEN and retained LOCKED. Observed Final 3,019 ms; Lock 1,122 ms; Unlock 3,128 ms; QA-denial acknowledgement 2,843 ms.

Deadman: single arm cancel/confirm, disarm cancel/confirm, re-arm, selected arm cancel/confirm and selected disarm were exercised. G0295 was armed for 2026-10-14T21:59:00Z and launched at 21:59:02.288Z. The open panel updated; Upcoming removed it automatically; the game showed AUTONOMOUS with locked weather. Stop Auto returned control to CHAIRMAN. Database evidence confirmed exactly one launch event after multiple scheduler ticks. Observed arm 2,897 ms, disarm 3,219 ms, selected arm 3,638 ms, Stop Auto 1,980 ms. QA writes/scheduler/cron were disabled afterward.

## Saved runtime recovery

Private saved file: GAMECAST_5_0_1_WEEK8_RUNTIME_RECOVERY_20261014.json.
SHA-256: `742321833980b69ac83378dff4bb36cb24a3b76f2d017ceb345dc81c4ae74f52`.
755,766 bytes; exported at 2026-10-14T22:19:40.502387Z.

The saved file was downloaded again; its checksum matched. It was restored into the non-exposed private schema `gc501_w8_restore_20261014`. Exact all-column multiset equality passed for sessions, events, requests, creation requests, final snapshots and operator references: 1 session, 56 games, 5 events, 2 request receipts, 1 creation receipt, 0 imported finals. Identity sequence restoration and foreign keys were retained. The restored read reopened all 56 games.

The exact deployed Week 8 DatabaseStore/engine modules then ran through connector transport against that restored schema: version 3 -> 4, commit persisted, exact engine continuation, identical replay without another mutation, conflicting replay rejection, and 56-game public readback. This was a private restored-database application check, not a separately deployed Week 8 Edge/browser restoration. The earlier R2 separate-Edge recovery evidence remains applicable to the unchanged persistence architecture.

Private restore writes are now OFF, no restore schema is exposed through PostgREST, and no restore scheduler was created. The live Week 8 session remains version 3.

This is a runtime recovery archive within the existing project, NOT a whole-project database/Auth/Vault backup.

## Assurance disposition

The three Week 8 UIs are published, data-verified and operationally prepared. Hosted control/Deadman blockers are closed; runtime recovery is verified. The earlier broad performance gate is not represented as completely closed: isolated click/request/persistence/render breakdown and long-duration hosted full-load endurance remain unverified. The measurements above establish bounded operational behavior only. No independent production certification or whole-project disaster-recovery certification is claimed. Remaining engineering assurance is not delegated to Gary.

The first Week 8 publication stopped because the new test compared source “7:00pm” against CSS-rendered “7:00PM”. The test now compares case-insensitively while retaining exact times; no UI/data change was needed. The successful rerun is linked above.

## Shutdown / rollback

1. Disable only `gamecast_v501_w8.release_control.writes_enabled`, `gamecast_v501_w8.scheduler_cron_control.enabled`, and cron job `gamecast_v501_week8`.
2. Retain live sessions, events and receipts. Do not delete the operating slate or overwrite it with QA.
3. Restore the verified Week 8 runtime archive into a new private schema first; preserve exact event IDs, reset the identity sequence to the restored maximum, retain foreign keys/RLS, and compare every column before controlled reactivation.
4. Redeploy pinned Week 8 source as needed. Never reactivate retired 5.0.0 runtime as a rollback. Prior 5.0.0 source remains pinned at `762da633e38ddf8acb0a9e7798ee4502deb1e81f`.
5. SEUD remains held unless separately authorized.

