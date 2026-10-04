-- Apply only after the isolated 4.5.1 test function is deployed and verified.
select cron.schedule('gamecast-test451-deadman','15 seconds',$job$
  select net.http_post(
    url:='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week6-v4-5-1-test?api=deadman_tick',
    headers:=jsonb_build_object('content-type','application/json','x-deadman-scheduler',
      (select decrypted_secret from vault.decrypted_secrets where name='gamecast_test451_deadman')),
    body:='{}'::jsonb,timeout_milliseconds:=10000)
  where exists(select 1 from public.gamecast_test451_scheduler_sessions());
$job$);
-- Rollback of automatic starting only (does not alter a game):
-- select cron.alter_job(jobid,active:=false) from cron.job where jobname='gamecast-test451-deadman';
