# GameCast 5.0.1 rollback and recovery after authorized 5.0.0 retirement

Updated 2026-10-14 UTC. This document supersedes the former instruction to reopen the 5.0.0 operating session.

## Retirement boundary
The owner authorized removal of 5.0.0 runtime records. Its sessions, events, requests, creation receipts and imported final tables are empty. The source branch and baseline commit 762da633e38ddf8acb0a9e7798ee4502deb1e81f remain retained. Reopening the retired 5.0.0 session is not a supported rollback.

Older GameCast 4.4.2 and its approved 54-game Week 7 results are unaffected. SEUD import remains on hold.

## Candidate emergency shutdown
Use only the candidate's own release controls:
```sql
BEGIN;
UPDATE gamecast_v501.release_control SET writes_enabled=false WHERE singleton;
UPDATE gamecast_v501.scheduler_cron_control SET enabled=false WHERE singleton;
SELECT cron.alter_job(job_id := jobid, active := false)
FROM cron.job WHERE jobname='gamecast_v501_isolated_qa';
COMMIT;
```
Verify candidate write rejection and zero scheduler advances. Preserve candidate state, audit events, receipts, final references and source. Do not rotate shared keys or change project-wide Auth or write settings.

## Application rollback
If a later candidate code change fails, redeploy the exact previously verified 5.0.1 application commit using the preserved candidate deployment workflow. Keep candidate switches disabled until compatibility and source identity are checked. A deployment rollback does not revert database corrections or restore deleted 5.0.0 data.

The last application commit verified as the starting point for this follow-up is 6fcaac2ca0214ba4283d7f9d2c876eeb0f68271f. Follow-up report and SQL commits do not themselves redeploy frontend/backend application files.

## Candidate data recovery
Retain the existing private candidate recovery package and its rehearsal evidence. That evidence is an author check, not independent certification. Rehearse restoration into an isolated destination, never into an operating session.
If restoring a checkpoint predating the owner-approved G0331 correction, replay the retained correction migration against the isolated destination after restoring the checkpoint. Verify Kansas 24 / Utah 56, quarter sums, the correction audit event and restored immutable trigger. Do not silently replace other results.

Full replay of retired 5.0.0 requests is not a candidate-release prerequisite following the owner's retirement direction. Candidate recovery, idempotency, deterministic continuation and appropriate rollback remain required.

## Current operating posture
Both 5.0.0 and 5.0.1 remain stopped. No main merge, production promotion or SEUD import is authorized by this document. Hosted Final/Unlock/QA Accept rejection, full Deadman acceptance and outstanding performance evidence remain open.
