-- Candidate-only scheduling; no GameCast 5.0.0 scheduler changes.
CREATE TABLE gamecast_v503_w9.scheduler_cron_control (singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), enabled boolean NOT NULL DEFAULT false, token_hash text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE gamecast_v503_w9.scheduler_cron_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gamecast_v503_w9.scheduler_cron_control FROM PUBLIC, anon, authenticated;
GRANT ALL ON gamecast_v503_w9.scheduler_cron_control TO service_role;
DO $$ DECLARE token text; BEGIN
 token := encode(extensions.gen_random_bytes(32),'hex');
 PERFORM vault.create_secret(token,'gamecast_v503_w9_scheduler_cron_token','GameCast 5.0.3 Week 9 scheduler');
 INSERT INTO gamecast_v503_w9.scheduler_cron_control(token_hash) VALUES(encode(extensions.digest(token,'sha256'),'hex'));
END $$;
CREATE OR REPLACE FUNCTION gamecast_v503_w9.authorize_scheduler_cron(p_token text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9', 'extensions'
AS $function$
  select case
    when p_token is null or p_token !~ '^[a-f0-9]{64}$' then false
    else coalesce((
      select enabled and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      from gamecast_v503_w9.scheduler_cron_control
      where singleton
    ),false)
  end;
$function$
;
CREATE OR REPLACE FUNCTION gamecast_v503_w9.dispatch_scheduler_cron()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9', 'vault', 'net'
AS $function$
declare
  cron_token text;
  request_id bigint;
begin
  if not coalesce((select writes_enabled from gamecast_v503_w9.release_control where singleton),false)
     or not coalesce((select enabled from gamecast_v503_w9.scheduler_cron_control where singleton),false) then
    return null;
  end if;

  select decrypted_secret into cron_token
  from vault.decrypted_secrets
  where name='gamecast_v503_w9_scheduler_cron_token'
  order by created_at desc
  limit 1;
  if cron_token is null then raise exception 'scheduler cron token unavailable'; end if;

  select net.http_post(
    url := 'https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-week9-v5-0-3-scheduler',
    headers := jsonb_build_object(
      'content-type','application/json',
      'x-gamecast-cron-token',cron_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
end;
$function$
;
REVOKE ALL ON FUNCTION gamecast_v503_w9.authorize_scheduler_cron(text),gamecast_v503_w9.dispatch_scheduler_cron() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION gamecast_v503_w9.authorize_scheduler_cron(text),gamecast_v503_w9.dispatch_scheduler_cron() TO service_role;
SELECT cron.schedule('gamecast_v503_week9','5 seconds','select gamecast_v503_w9.dispatch_scheduler_cron();');


select cron.alter_job(jobid, active:=false) from cron.job where jobname='gamecast_v503_week9';
