# Week 7 GameCast 5.0.0 cleanup plan

**DATABASE DELETION = BLOCKED. No deletion approval is requested while recovery remains unproven.**

## Preservation finding

Two copies of LEDGER_W07_CLOSE_PREP_R2.zip were retrieved from the TV and Ledger source collections. Both SHA-256:
5e141e791e2b819370fae3504e01e677070514b7344f7c3a0041f1fb6b1e87b6.

They contain scores, standings and schedule material, not full request receipts, raw engine state, seeds, pending plays and recovery history. Comparison found 40 of 41 current engine score pairs differ from the archive. Both sources are preserved; this audit does not decide which score set is canonical or rewrite either source. The archive cannot prove recoverability of what would be deleted.

A separate private protective export was created: GAMECAST_5_0_0_CURRENT_STATE_RECOVERY.zip, saved in the user's SYNTHCAST-GAMECAST files, reference libfile_6021df8c3e448191aa7b63715975e310. It contains the exact current session with 41 complete raw games, 13 immutable finals, all 17,328 unique event rows, inspected schema/function definitions and file SHA-256 checksums. ZIP SHA-256: 09ad1e75f63140eeafed62140d0df998f49874de8226a59ee452caa032ec8e6d (632,701 bytes). It excludes the requests table, Auth, Vault and credentials. Import restoration has not been rehearsed. **It is not a complete backup and does not unblock deletion.** Raw state was not published to GitHub.

## Classification

| Category | Data | Disposition |
|---|---|---|
| PRESERVE | Entire current session; 22 READY, 1 LOCKED and 18 FINAL_PENDING games | Keep all raw state, seeds, history and configuration |
| PRESERVE | 13 immutable imported finals and all 17,328 events | Keep |
| PRESERVE | Operators, release controls, scheduler configuration, creation receipts | Keep |
| DELETE CANDIDATE | 10,997 old scheduler request responses for the precise source session | Redundant current-board content, but still blocked by replay/recovery dependencies |
| BLOCKED | Entire proposed scheduler deletion set | No verified copy of these receipts or tested restoration |
| BLOCKED | 214 operator receipts | Existing idempotent command recovery; not included in deletion proposal |
| PRESERVE | 4.2.2, 4.4.2 and all other releases | Audit only; no mutation |

## SELECT-equivalent dry run

Executed against the operational 5.0.0 database; returned **10,997 rows**. Run again immediately before any later authorized transaction.

```sql
SELECT count(*) AS rows_that_would_be_deleted,
       sum(pg_column_size(r.response)) AS stored_response_bytes
FROM gamecast_v500.requests r
JOIN gamecast_v500.sessions s USING (session_id)
WHERE s.public_slug = 'w7v500-17e1dde75f5b1cba'
  AND s.week_key = '2026-W07'
  AND s.engine_version = 'GC-W7-V5.0.0-RC1'
  AND r.actor_id = 'SCHEDULER'
  AND r.created_at < '2026-10-12T00:00:00Z'::timestamptz;
```

Before: requests 11,211 rows, relation 2,350,628,864 bytes. Proposed scheduler subset: 10,997 rows, response datum bytes 2,227,124,833. If all gates later pass and exactly that subset is deleted, expected requests after = 214. Current actual after = 11,211.

## Proposed DELETE — NOT EXECUTED

Only after verified receipt export, restore rehearsal, application replay review, a frozen selection manifest and Gary's explicit approval immediately before deletion:

```sql
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

DELETE FROM gamecast_v500.requests r
USING gamecast_v500.sessions s
WHERE r.session_id = s.session_id
  AND s.public_slug = 'w7v500-17e1dde75f5b1cba'
  AND s.week_key = '2026-W07'
  AND s.engine_version = 'GC-W7-V5.0.0-RC1'
  AND r.actor_id = 'SCHEDULER'
  AND r.created_at < '2026-10-12T00:00:00Z'::timestamptz
RETURNING r.session_id, r.actor_id, r.idempotency_key;

-- Validate affected count against the freshly frozen manifest.
-- COMMIT only under the separately approved execution procedure.
ROLLBACK;
```

Requests provide exact retry protection. Deleting them can permit an old idempotency key to be treated as new. A complete receipt archive and a tested retirement/replay strategy are required; merely retaining final scores is insufficient. No incoming foreign keys point at requests, but this application dependency remains.

Expected logical removal: at most the stated 10,997 receipt rows. Expected physical disk reclaimed: **unknown**. DELETE leaves dead tuples until PostgreSQL maintenance; ordinary VACUUM may make space reusable without returning it to the filesystem. No storage-reclamation claim will be based only on payload totals.

## Actual cleanup report

| Item | Before | Removed | After |
|---|---:|---:|---:|
| Whole project database bytes | 2,389,997,235 | 0 claimed | 2,396,739,251 |
| 5.0.0 requests relation bytes | 2,350,628,864 | 0 | 2,350,628,864 |
| Relevant/W7 5.0.0 request rows | 11,211 | 0 | 11,211 |
| Source sessions | 1 | 0 | 1 |
| Source events | 17,328 | 0 | 17,328 |
| Immutable finals | 13 | 0 | 13 |

Project growth includes candidate QA work and background activity; production content remains unchanged. All deletion candidates remain intentionally blocked.
