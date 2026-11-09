begin;
update gamecast_v507_w12.release_control set writes_enabled=false,updated_at=now() where singleton;
update gamecast_v507_w12.scheduler_cron_control set enabled=false,updated_at=now() where singleton;
select cron.alter_job(jobid,active:=false) from cron.job where jobname='gamecast_v507_week12';
commit;
-- Retain every session, event and receipt. No historical data is deleted.
