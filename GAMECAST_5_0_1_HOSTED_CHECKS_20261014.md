# GameCast 5.0.1 hosted check continuation — 2026-10-14
Author-run engineering checks. No production promotion or main merge.

## Hosted performance
Authenticated Chairman G0304 QA fixture; click-to-visible-control acknowledgement including browser automation overhead. One observation each; no statistical performance acceptance claimed.
| Action | Milliseconds |
|---|---:|
| Launch | 2332 |
| Start Auto | 1584 |
| Stop Auto | 1928 |
| Pause | 1510 |

Fixture left paused with Auto stopped. Candidate writes, scheduler control, and cron disabled after testing. Existing scheduler receipts: 1161; largest JSON text response 160 bytes at measurement.

## Recovery
The companion SQL ran successfully against the candidate database using temporary restored tables and a final ROLLBACK. Assertions verified exact multiset equality of all columns for sessions, events, requests, creation_requests, and final_snapshots after JSON serialization/deserialization; all six restored sessions reopened through a copy of the deployed read_session function; a restored scheduler receipt replayed through a copy of read_request; a conflicting hash raised the expected idempotency conflict. The initial attempt exposed GENERATED ALWAYS identity handling; the successful script uses OVERRIDING SYSTEM VALUE.

Scope: isolated same-database, in-memory export roundtrip. This is not an independently stored backup, full database backup, separate-server restore, or end-to-end restored deployment rehearsal. Those broader recovery requirements remain incomplete.

## Outstanding acceptance
Actual native JavaScript confirmation inspection failed with retained_data_restricted after secure credential delivery. One supported explicit navigation recovered normal DOM access, but did not establish native-dialog access. QA Accept rejection, Final, Unlock, and complete hosted Deadman arm/configure/trigger/cancel/concurrency/launch-once sequence remain unverified. No confirmation override or credential extraction attempted. Full staged performance and separate-deployment recovery remain incomplete.

Week 8 ratings and carriage may be supplied now for intake. Keep their loading, new slate activation, SEUD import, and ratings/model changes outside this maintenance check. No production readiness approval claimed.
