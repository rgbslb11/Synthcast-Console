-- Disable only the new Week 9 release. Retain all state and audit evidence.
-- Run only if rollback is required after publication.
BEGIN;
UPDATE gamecast_v503_w9.release_control SET writes_enabled=false, updated_at=now() WHERE singleton;
UPDATE gamecast_v503_w9.scheduler_cron_control SET enabled=false, updated_at=now() WHERE singleton;
SELECT cron.alter_job(jobid, active:=false) FROM cron.job WHERE jobname='gamecast_v503_week9';
COMMIT;
-- Existing 5.0.2 routes, functions, scheduler, schema, and session are untouched.
