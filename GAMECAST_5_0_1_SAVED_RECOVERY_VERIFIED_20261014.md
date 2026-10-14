# Saved candidate runtime recovery — verified 2026-10-14

Verification receipt time: 2026-10-14 20:48:47.0942 UTC.

The saved GAMECAST_5_0_1_RUNTIME_RECOVERY_R2.json export was transferred in 48 bounded chunks into private schema gc501_restore_20261014_r2. Reassembled transport content matched the local saved file excluding its trailing newline: MD5 53202624e86e6739429e578efbe43b22, 11,338,645 bytes. The full saved file SHA-256 remains 04d714247bf8bc1a7fcef36c9df4654172cc9bcdcb5abab1013b6ca7d2bb7697.

| Table | Exported | Restored | Exact row equality |
|---|---:|---:|---|
| sessions | 6 | 6 | PASS |
| events | 13,636 | 13,636 | PASS |
| requests | 1,186 | 1,186 | PASS |
| creation_requests | 6 | 6 | PASS |
| final_snapshots | 13 | 13 | PASS |

All six restored sessions reopened through copies of the deployed read_session function. The most recent restored scheduler receipt replayed with exact response equality. A mismatched hash for that receipt raised idempotency conflict. Event/session linkage passed.

The first verification transaction rolled back because a PL/pgSQL record variable shadowed a SQL alias. The alias was corrected; the subsequent verification transaction succeeded. No candidate runtime data was changed.

This closes the HTTP 413 saved-export transfer and runtime-record restoration blocker. Scope is a private recovery schema within the existing project. It does not demonstrate reconstruction of Auth, whole-project configuration, or a separately deployed application's read/write path. Those broader checks are not represented as passed.

All access to the recovery schema, its tables and functions was revoked from PUBLIC, anon, authenticated and service_role. No UI, Edge Function, or cron job was bound to it. The private restored copy is retained for subsequent application recovery checks; the original candidate remains stopped.

Production acceptance remains incomplete: actual hosted confirmation-dependent Chairman controls, the complete hosted Deadman sequence, full staged performance acceptance, and any remaining separately deployed recovery requirement are unverified. No production promotion, main merge, Week 8 activation, or SEUD import occurred.
