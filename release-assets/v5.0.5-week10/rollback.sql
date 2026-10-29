-- Disable only the new Week 10 release. Retain all state and audit evidence.
-- Run only if rollback is required after publication.
BEGIN;
UPDATE gamecast_v505_w10.release_control SET writes_enabled=false, updated_at=now() WHERE singleton;
UPDATE gamecast_v505_w10.scheduler_cron_control SET enabled=false, updated_at=now() WHERE singleton;
SELECT cron.alter_job(jobid, active:=false) FROM cron.job WHERE jobname='gamecast_v505_week10';
COMMIT;
-- Existing 5.0.2 routes, functions, scheduler, schema, and session are untouched.
