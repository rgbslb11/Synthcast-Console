BEGIN;
DO $copy$
DECLARE c record; def text;
BEGIN
 FOR c IN SELECT con.conname,rel.relname,pg_get_constraintdef(con.oid) definition
 FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid
 WHERE con.connamespace='gamecast_v501'::regnamespace AND con.contype='f'
 AND rel.relname IN ('sessions','events','requests','creation_requests','final_snapshots')
 LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace='gc501_restore_20261014_r2'::regnamespace AND conname=c.conname) THEN
   EXECUTE format('ALTER TABLE gc501_restore_20261014_r2.%I ADD CONSTRAINT %I %s',c.relname,c.conname,replace(c.definition,'REFERENCES gamecast_v501.sessions','REFERENCES gc501_restore_20261014_r2.sessions'));
  END IF;
 END LOOP;
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='gamecast_v501'::regnamespace AND proname='reject_final_snapshot_mutation';
 EXECUTE replace(def,'gamecast_v501','gc501_restore_20261014_r2');
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='gc501_restore_20261014_r2.final_snapshots'::regclass AND tgname='final_snapshots_immutable') THEN
  CREATE TRIGGER final_snapshots_immutable BEFORE DELETE OR UPDATE ON gc501_restore_20261014_r2.final_snapshots FOR EACH ROW EXECUTE FUNCTION gc501_restore_20261014_r2.reject_final_snapshot_mutation();
 END IF;
END $copy$;
CREATE TABLE gc501_restore_20261014_r2.probe_control(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),enabled boolean NOT NULL,expires_at timestamptz NOT NULL,token_hash text NOT NULL);
INSERT INTO gc501_restore_20261014_r2.probe_control SELECT true,true,now()+interval '5 minutes',token_hash FROM gamecast_v501.scheduler_cron_control WHERE singleton;
UPDATE gc501_restore_20261014_r2.release_control SET writes_enabled=true WHERE singleton;
CREATE FUNCTION gamecast_v501.recovery_probe_rpc(p_token text,p_name text,p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $fn$
DECLARE allowed boolean; result jsonb; expected_session uuid;
BEGIN
 SELECT enabled AND clock_timestamp()<expires_at AND p_token ~ '^[a-f0-9]{64}$' AND token_hash=encode(extensions.digest(p_token,'sha256'),'hex') INTO allowed FROM gc501_restore_20261014_r2.probe_control WHERE singleton;
 IF p_name='authorize' THEN RETURN to_jsonb(coalesce(allowed,false)); END IF;
 IF NOT coalesce(allowed,false) THEN RAISE EXCEPTION 'recovery probe forbidden'; END IF;
 SELECT session_id INTO expected_session FROM gc501_restore_20261014_r2.sessions WHERE public_slug='w7v501-0000000000000001';
 IF p_name='read_session' THEN
  IF p_args->>'p_slug'<>'w7v501-0000000000000001' THEN RAISE EXCEPTION 'recovery scope'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM gc501_restore_20261014_r2.read_session('w7v501-0000000000000001') t;
 ELSIF p_name='read_final_snapshots' THEN
  result:=gc501_restore_20261014_r2.read_final_snapshots();
 ELSIF p_name IN ('read_request','commit_state') THEN
  IF (p_args->>'p_session_id')::uuid IS DISTINCT FROM expected_session OR p_args->>'p_actor_id' IS DISTINCT FROM 'SCHEDULER' OR p_args->>'p_idempotency_key' IS DISTINCT FROM 'recovery-r2-edge-probe-20261014' THEN RAISE EXCEPTION 'recovery scope'; END IF;
  IF p_name='read_request' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM gc501_restore_20261014_r2.read_request(expected_session,'SCHEDULER',p_args->>'p_idempotency_key',p_args->>'p_request_hash') t;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO result FROM gc501_restore_20261014_r2.commit_state(expected_session,(p_args->>'p_expected_version')::bigint,p_args->'p_state',p_args->'p_events','SCHEDULER',p_args->>'p_idempotency_key',p_args->>'p_request_hash',(p_args->>'p_stamp')::timestamptz) t;
  END IF;
 ELSE RAISE EXCEPTION 'recovery RPC not allowed';
 END IF;
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION gamecast_v501.recovery_probe_rpc(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION gamecast_v501.recovery_probe_rpc(text,text,jsonb) TO service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA gc501_restore_20261014_r2 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gc501_restore_20261014_r2 FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE gc501_restore_20261014_r2.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc501_restore_20261014_r2.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc501_restore_20261014_r2.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc501_restore_20261014_r2.creation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc501_restore_20261014_r2.final_snapshots ENABLE ROW LEVEL SECURITY;
COMMIT;