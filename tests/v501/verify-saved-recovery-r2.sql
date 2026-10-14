BEGIN; SET LOCAL statement_timeout='45s';
CREATE TABLE gc501_restore_20261014_r2.verification_receipt (checked_at timestamptz NOT NULL DEFAULT now(), details jsonb NOT NULL);
DO $verify$
DECLARE t text; a jsonb; b jsonb; n bigint; same boolean; def text; s record; r record; got jsonb; rejected boolean:=false; counts jsonb:='{}'; reopened int:=0;
BEGIN
SELECT string_agg(payload,'' ORDER BY part)::jsonb INTO a FROM gc501_restore_20261014_r2.archive_chunks;
IF (SELECT count(*) FROM gc501_restore_20261014_r2.archive_chunks)<>48 OR (SELECT md5(string_agg(payload,'' ORDER BY part)) FROM gc501_restore_20261014_r2.archive_chunks)<>'53202624e86e6739429e578efbe43b22' THEN RAISE EXCEPTION 'archive transport mismatch'; END IF;
FOREACH t IN ARRAY ARRAY['sessions','events','requests','creation_requests','final_snapshots'] LOOP
 b:=a->t;
 EXECUTE format('INSERT INTO gc501_restore_20261014_r2.%I OVERRIDING SYSTEM VALUE SELECT * FROM jsonb_populate_recordset(NULL::gc501_restore_20261014_r2.%I,$1)',t,t) USING b;
 EXECUTE format('SELECT count(*) FROM gc501_restore_20261014_r2.%I',t) INTO n;
 IF n<>jsonb_array_length(b) THEN RAISE EXCEPTION 'restore count mismatch %',t; END IF;
 EXECUTE format('SELECT NOT EXISTS ((SELECT to_jsonb(x) FROM gamecast_v501.%I x EXCEPT ALL SELECT to_jsonb(y) FROM gc501_restore_20261014_r2.%I y) UNION ALL (SELECT to_jsonb(y) FROM gc501_restore_20261014_r2.%I y EXCEPT ALL SELECT to_jsonb(x) FROM gamecast_v501.%I x))',t,t,t,t) INTO same;
 IF NOT same THEN RAISE EXCEPTION 'restore data mismatch %',t; END IF;
 counts:=counts||jsonb_build_object(t,n);
END LOOP;
SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='gamecast_v501'::regnamespace AND proname='read_session';
EXECUTE replace(replace(def,'FUNCTION gamecast_v501.read_session','FUNCTION gc501_restore_20261014_r2.read_session'),'gamecast_v501.sessions','gc501_restore_20261014_r2.sessions');
FOR s IN SELECT public_slug,state_version,state FROM gc501_restore_20261014_r2.sessions LOOP
 SELECT to_jsonb(x) INTO got FROM gc501_restore_20261014_r2.read_session(s.public_slug) x;
 IF got IS NULL OR (got->>'state_version')::bigint<>s.state_version OR got->'state'<>s.state THEN RAISE EXCEPTION 'reopen mismatch'; END IF;
 reopened:=reopened+1;
END LOOP;
SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE pronamespace='gamecast_v501'::regnamespace AND proname='read_request';
EXECUTE replace(replace(def,'FUNCTION gamecast_v501.read_request','FUNCTION gc501_restore_20261014_r2.read_request'),'gamecast_v501.requests','gc501_restore_20261014_r2.requests');
SELECT * INTO r FROM gc501_restore_20261014_r2.requests WHERE actor_id='SCHEDULER' ORDER BY created_at DESC LIMIT 1;
IF NOT FOUND THEN RAISE EXCEPTION 'no scheduler replay fixture'; END IF;
SELECT response INTO got FROM gc501_restore_20261014_r2.read_request(r.session_id,r.actor_id,r.idempotency_key,r.request_hash);
IF got IS DISTINCT FROM r.response THEN RAISE EXCEPTION 'replay mismatch'; END IF;
BEGIN
 PERFORM * FROM gc501_restore_20261014_r2.read_request(r.session_id,r.actor_id,r.idempotency_key,r.request_hash||'-conflict');
EXCEPTION WHEN OTHERS THEN
 IF SQLERRM='idempotency conflict' THEN rejected:=true; ELSE RAISE; END IF;
END;
IF NOT rejected THEN RAISE EXCEPTION 'conflict rejection missing'; END IF;
IF EXISTS(SELECT 1 FROM gc501_restore_20261014_r2.events e LEFT JOIN gc501_restore_20261014_r2.sessions parent_session USING(session_id) WHERE parent_session.session_id IS NULL) THEN RAISE EXCEPTION 'orphan event'; END IF;
INSERT INTO gc501_restore_20261014_r2.verification_receipt(details) VALUES(jsonb_build_object('counts',counts,'exact_rows',true,'sessions_reopened',reopened,'receipt_replay',true,'conflict_rejected',rejected,'archive_transport_md5','53202624e86e6739429e578efbe43b22','scope','Saved runtime records restored into private schema in existing project; no separate deployed application tested'));
-- Restored explicit identity values do not advance the identity sequence.
PERFORM setval('gc501_restore_20261014_r2.events_event_id_seq'::regclass,(SELECT max(event_id) FROM gc501_restore_20261014_r2.events),true);
END $verify$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gc501_restore_20261014_r2 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA gc501_restore_20261014_r2 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;