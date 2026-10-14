# GameCast 5.0.1 application recovery follow-up — 2026-10-14

Production deployment remains incomplete. This report adds a real application write/read check to the saved-runtime restoration receipt.

## Defect found and repaired
The earlier exact-row restore retained 13,636 event rows but did not reseed the restored event identity sequence. The first application commit attempted event ID 1 and failed with a duplicate-key violation; the transaction rolled back. The restored maximum event ID was 13,637. Only the private recovery schema's sequence was reset to that maximum. The fresh-restore verification script now includes this step. No candidate engine or operating data was changed.

Two initial function-cloning migration attempts had missing SQL statement terminators and rolled back. The corrected private setup succeeded. These failed attempts are not counted as passing tests.

## Application verification
Exact modules retrieved from the deployed Chairman bundle were executed against the private restored Postgres schema through a connector RPC bridge. There was no in-memory database for this check. The transport was the connector, not an independently deployed Edge endpoint or a browser.

- Restored main session: version 551 -> 552.
- Actual engine projection advanced one synthetic second; persisted state matched the engine result exactly.
- Application DatabaseStore commit succeeded.
- Repeating the identical request returned the original receipt, without executing mutation again.
- Changing the input under the same idempotency key was rejected.
- Application read reopened all 54 display games.
- All 13 immutable reference payloads remained identical.
- The restored copy now includes the single rehearsal advance/event/receipt. Its earlier exact equality to the saved archive was established before that deliberate write.

The private saved archive is unchanged. SHA-256: 04d714247bf8bc1a7fcef36c9df4654172cc9bcdcb5abab1013b6ca7d2bb7697.

## Safe final state
Candidate session remains version 551. Candidate writes=false; scheduler=false; cron=false. Private recovery writes=false. No production activation, main merge, Week 8 loading, SEUD import, or browser confirmation override occurred.

## Remaining release acceptance
All 15 tracked gates retain their existing disposition: 11 PASS, 4 BLOCKED. This check strengthens gate 14 but does not claim a full schema/Auth/project restore or a separately deployed recovery application.

| Gate | Remaining requirement |
|---|---|
| 4 Chairman controls | Hosted Final, Unlock and QA Accept rejection through actual controls |
| 5 Deadman | Complete hosted confirmation/arm/trigger/feedback sequence |
| 13 Performance | Complete staged hosted performance measurements |
| 14 Recovery | Separately deployed application recovery path; complete schema constraints/triggers were not restored by LIKE INCLUDING ALL |

Native confirmation control remains unavailable in the current cloud browser after secure authentication. Its documented recovery path supplies no additional supported repair. Repeating that blocked operation is not a release plan. No technical testing is assigned to Gary.

Database receipts: v501_private_recovery_application_probe_20261014; v501_recovery_r2_restore_event_sequence_20261014; private verification_receipt records the passing application assertions.
