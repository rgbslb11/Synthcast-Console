BEGIN;
SET LOCAL statement_timeout='45s';
CREATE TEMP TABLE gc501_recovery_archive(table_name text primary key, rows jsonb) ON COMMIT DROP;
CREATE TEMP TABLE gc501_recovery_results(table_name text, source_count bigint, restored_count bigint, exact_rows boolean) ON COMMIT DROP;
DO $recovery$
DECLARE t text; b jsonb; c bigint; d bigint; same boolean;
BEGIN
FOREACH t IN ARRAY ARRAY['sessions','events','requests','creation_requests','final_snapshots'] LOOP
 EXECUTE format('CREATE TEMP TABLE restored_%I (LIKE gamecast_v501.%I INCLUDING ALL) ON COMMIT DROP',t,t);
 EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) FROM gamecast_v501.%I x',t) INTO b;
 INSERT INTO gc501_recovery_archive VALUES(t,b);
 EXECUTE format('INSERT INTO restored_%I OVERRIDING SYSTEM VALUE SELECT * FROM jsonb_populate_recordset(NULL::restored_%I,$1)',t,t) USING b;
 EXECUTE format('SELECT count(*) FROM gamecast_v501.%I',t) INTO c;
 EXECUTE format('SELECT count(*) FROM restored_%I',t) INTO d;
 EXECUTE format('SELECT NOT EXISTS ((SELECT to_jsonb(x) FROM gamecast_v501.%I x EXCEPT ALL SELECT to_jsonb(y) FROM restored_%I y) UNION ALL (SELECT to_jsonb(y) FROM restored_%I y EXCEPT ALL SELECT to_jsonb(x) FROM gamecast_v501.%I x))',t,t,t,t) INTO same;
 IF NOT same OR c<>d THEN RAISE EXCEPTION 'Recovery mismatch %',t; END IF;
 INSERT INTO gc501_recovery_results VALUES(t,c,d,same);
END LOOP;
END $recovery$;
DO $verify$
DECLARE def text; s record; r record; got jsonb; seen int:=0; rejected boolean:=false;
BEGIN
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='gamecast_v501'::regnamespace AND proname='read_session';
 def:=replace(replace(def,'FUNCTION gamecast_v501.read_session','FUNCTION pg_temp.restored_read_session'),'gamecast_v501.sessions','pg_temp.restored_sessions');
 EXECUTE def;
 FOR s IN SELECT public_slug,state_version,state FROM gamecast_v501.sessions LOOP
  EXECUTE 'SELECT to_jsonb(x) FROM pg_temp.restored_read_session($1) x' INTO got USING s.public_slug;
  IF got IS NULL OR (got->>'state_version')::bigint<>s.state_version OR got->'state'<>s.state THEN RAISE EXCEPTION 'restored reopen mismatch'; END IF;
  seen:=seen+1;
 END LOOP;
 IF seen<>6 THEN RAISE EXCEPTION 'unexpected restored session count %',seen; END IF;
 SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='gamecast_v501'::regnamespace AND proname='read_request';
 def:=replace(replace(def,'FUNCTION gamecast_v501.read_request','FUNCTION pg_temp.restored_read_request'),'gamecast_v501.requests','pg_temp.restored_requests');
 EXECUTE def;
 SELECT * INTO r FROM gamecast_v501.requests WHERE actor_id='SCHEDULER' ORDER BY created_at DESC LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'no replay fixture'; END IF;
 EXECUTE 'SELECT response FROM pg_temp.restored_read_request($1,$2,$3,$4)' INTO got USING r.session_id,r.actor_id,r.idempotency_key,r.request_hash;
 IF got IS DISTINCT FROM r.response THEN RAISE EXCEPTION 'restored request replay mismatch'; END IF;
 BEGIN
  EXECUTE 'SELECT response FROM pg_temp.restored_read_request($1,$2,$3,$4)' INTO got USING r.session_id,r.actor_id,r.idempotency_key,r.request_hash||'-conflict';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='idempotency conflict' THEN rejected:=true; ELSE RAISE; END IF;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'restored idempotency conflict accepted'; END IF;
END $verify$;
ROLLBACK;