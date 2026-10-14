# GameCast 5.0.1 deployment verification — 2026-10-14

## Verified deployment
Candidate branch at inspection: release/gamecast-v5.0.1, 32d39395cc4e56d923c553bee71360866ef7e2fc.
Latest successful isolated UI publication: 6fcaac2ca0214ba4283d7f9d2c876eeb0f68271f, workflow run 38504187448.
The latest candidate regression workflow, run 38627635553, completed successfully.

All files in all three deployed backend bundles match candidate source: Chairman 14/14 files (deployed version 2), Public 14/14 (version 1), Scheduler 16/16 (version 1). All three functions are ACTIVE. Deployed status is distinct from operating write/scheduler authorization.

The isolated 5.0.1 application is deployed. Production acceptance remains incomplete. No main merge, production promotion, Week 8 loading, or SEUD import occurred.

## Safe operating state
Candidate writes disabled; scheduler control disabled; cron inactive; zero Auto games; zero armed/blocked Deadman timers. Retired v500 session count remains zero. G0331 reference remains Kansas 24 / Utah 56.

## Saved recovery export
Private GAMECAST_5_0_1_RUNTIME_RECOVERY_R2.json saved and locally parsed:
6 sessions, 13,636 events, 1,186 requests, 6 creation requests, 13 final snapshots.
File bytes: 11,338,646.
SHA-256: 04d714247bf8bc1a7fcef36c9df4654172cc9bcdcb5abab1013b6ca7d2bb7697.
This is candidate runtime data, excluding Auth, schema, credentials, cron secrets and project configuration. It is not a full database backup and is not published to GitHub.

The prior isolated JSON roundtrip/reopen/receipt replay assertions passed, as documented in GAMECAST_5_0_1_HOSTED_CHECKS_20261014.md. The new saved-export restore request was rejected before database execution: HTTP 413 request entity too large. No saved-export restore success is claimed. A bounded chunked restore into a private isolated schema is the next recovery task.

## Acceptance gates
| Gate | Status | Evidence scope |
|---|---|---|
| 1 Baseline protection | PASS | Retained sources; authorized v500 retirement documented |
| 2 Separate branch | PASS | Existing candidate branch retained |
| 3 Live UI | PASS | Retained earlier hosted evidence; complete remaining controls tracked separately |
| 4 Chairman controls | BLOCKED | Native confirmation access unavailable; Final, Unlock, QA Accept not verified |
| 5 Complete hosted Deadman | BLOCKED | Native confirmation access unavailable; complete sequence unverified |
| 6 Concurrency | PASS | Retained regression evidence |
| 7 Storage architecture | PASS | Retained compact receipts; largest measured scheduler JSON text 160 bytes |
| 8 Retirement | PASS | Prior authorized deletion verified; no v500 session remains |
| 9 Fourth down | PASS | Retained regression evidence |
| 10 Safety | PASS | Retained regression evidence |
| 11 Kneel | PASS | Retained regression evidence |
| 12 Simulation preservation | PASS | Retained paired-history evidence; football source unchanged |
| 13 Complete performance | BLOCKED | Four single-sample hosted timings; full staged acceptance incomplete |
| 14 Full recovery rehearsal | BLOCKED | Isolated in-memory path passed; persisted export saved; saved restore rejected by request-size limit |
| 15 Release evidence | PASS | This disposition report, source verification and recovery export receipt recorded |

Count: 15 gates; 11 PASS, 4 BLOCKED. Passes based on retained evidence are explicitly identified; no independent certification asserted.

## Concrete blocker and next engineering actions
The browser getJsDialog call returns retained_data_restricted after secure credential delivery. Screenshots and normal DOM observations work, but native confirmation inspection does not. The supported canonical navigation was used to cancel the attempted QA confirmation and leave the console safe. No confirmation override, auth bypass, or credential extraction occurred.

1. Restore authorized native confirmation access in the test environment, then execute actual hosted Final/Unlock/QA-rejection and the full Deadman sequence.
2. Complete remaining staged timing/load measurements against documented acceptance thresholds.
3. Import the saved runtime archive in bounded chunks into a private isolated recovery schema; verify exact row equality, restored session reopening, receipt replay/conflict rejection and deployed application read/write behavior; cleanly stop the rehearsal.
4. Only after those acceptance requirements pass, make production activation concrete for owner acceptance.

These are engineering tasks. Gary is not assigned technical testing.
