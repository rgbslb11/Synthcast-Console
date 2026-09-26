-- Apply only after the isolated 4.3.2.2 function is deployed and verified.
select cron.schedule('gamecast-v4322-deadman','15 seconds',$job$
  select net.http_post(
    url:='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week5-saturday-v4-3-2-2?api=deadman_tick',
    headers:=jsonb_build_object('content-type','application/json','x-deadman-scheduler',
      (select decrypted_secret from vault.decrypted_secrets where name='gamecast_v4322_deadman')),
    body:='{}'::jsonb,timeout_milliseconds:=10000)
  where exists(select 1 from public.gamecast_v4322_scheduler_sessions());
$job$);
-- Rollback of automatic starting only (does not alter a game):
-- select cron.alter_job(jobid,active:=false) from cron.job where jobname='gamecast-v4322-deadman';
