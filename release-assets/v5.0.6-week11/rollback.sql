-- Disable only the new Week 11 release. Retain all state and audit evidence.
-- Run only if rollback is required after publication.
BEGIN;
UPDATE gamecast_v506_w11.release_control SET writes_enabled=false, updated_at=now() WHERE singleton;
UPDATE gamecast_v506_w11.scheduler_cron_control SET enabled=false, updated_at=now() WHERE singleton;
SELECT cron.alter_job(jobid, active:=false) FROM cron.job WHERE jobname='gamecast_v506_week11';
COMMIT;
-- Existing 5.0.2 routes, functions, scheduler, schema, and session are untouched.
