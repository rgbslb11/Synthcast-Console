begin;
update gamecast_v5085_w13.release_control set writes_enabled=false,updated_at=now() where singleton;
update gamecast_v5085_w13.scheduler_cron_control set enabled=false,updated_at=now() where singleton;
select cron.alter_job(jobid,active:=false) from cron.job where jobname='gamecast_v5085_week13';
commit;
-- Retain every session, event and receipt. No historical data is deleted.
