-- Authorized new-only scheduler. Separate stage after backend cloud checks pass.
-- Preserve all earlier jobs, functions, credentials, and data.
BEGIN;
DO $guard$ BEGIN
 IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='gamecast-v442-deadman') THEN
  RAISE EXCEPTION '4.4.2 scheduler collision; stop without overwriting';
 END IF;
END $guard$;
-- Apply only after the isolated 4.4.2 function is deployed and verified.
select cron.schedule('gamecast-v442-deadman','15 seconds',$job$
  select net.http_post(
    url:='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week7-v4-4-2?api=deadman_tick',
    headers:=jsonb_build_object('content-type','application/json','x-deadman-scheduler',
      (select decrypted_secret from vault.decrypted_secrets where name='gamecast_v442_deadman')),
    body:='{}'::jsonb,timeout_milliseconds:=10000)
  where exists(select 1 from public.gamecast_v442_scheduler_sessions());
$job$);
-- Rollback of automatic starting only (does not alter a game):
-- select cron.alter_job(jobid,active:=false) from cron.job where jobname='gamecast-v442-deadman';

COMMIT;
