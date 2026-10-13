-- Execute only against gamecast_v501. Deliberately leaves small QA receipts as evidence.
DO $test$
DECLARE s gamecast_v501.sessions%rowtype; r record; start_stamp timestamptz:=clock_timestamp(); first_response jsonb; n integer;
BEGIN
 SELECT * INTO STRICT s FROM gamecast_v501.sessions WHERE public_slug='w7v501-0000000000000001';
 IF s.state_version<>1 THEN RAISE EXCEPTION 'Test requires fresh QA session'; END IF;
 FOR n IN 1..100 LOOP
  SELECT * INTO r FROM gamecast_v501.commit_state(s.session_id,n,s.state,'[{"type":"V501_ADVANCE","gameId":null,"payload":{"seconds":5,"qaOnly":true}}]'::jsonb,'SCHEDULER','qa-scheduler-v501-'||lpad(n::text,5,'0'),md5(n::text)||md5(n::text),s.last_advanced_at+(n||' seconds')::interval);
  IF r.response ? 'state' OR r.response->>'receipt_format'<>'scheduler-v1' OR (r.response->>'state_version')::bigint<>n+1 OR r.replayed THEN RAISE EXCEPTION 'Invalid compact response'; END IF;
  IF n=1 THEN first_response:=r.response; END IF;
 END LOOP;
 SELECT * INTO r FROM gamecast_v501.commit_state(s.session_id,1,s.state,'[{"type":"V501_ADVANCE","payload":{}}]'::jsonb,'SCHEDULER','qa-scheduler-v501-00001',md5('1')||md5('1'),s.last_advanced_at);
 IF NOT r.replayed OR r.response<>first_response THEN RAISE EXCEPTION 'Replay changed or ran again'; END IF;
 BEGIN
  PERFORM gamecast_v501.commit_state(s.session_id,1,s.state,'[{"type":"V501_ADVANCE","payload":{}}]'::jsonb,'SCHEDULER','qa-scheduler-v501-00001',repeat('b',64),s.last_advanced_at);
  RAISE EXCEPTION 'Expected idempotency rejection';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'idempotency conflict' THEN RAISE; END IF; END;
 BEGIN
  PERFORM gamecast_v501.commit_state(s.session_id,1,s.state,'[{"type":"V501_ADVANCE","payload":{}}]'::jsonb,'SCHEDULER','qa-stale-v501-00001',repeat('c',64),s.last_advanced_at);
  RAISE EXCEPTION 'Expected version rejection';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'version conflict' THEN RAISE; END IF; END;
 IF (SELECT state FROM gamecast_v501.sessions WHERE session_id=s.session_id)<>s.state THEN RAISE EXCEPTION 'Recovery state mismatch'; END IF;
 IF (SELECT count(*) FROM gamecast_v501.events WHERE session_id=s.session_id)<>101 THEN RAISE EXCEPTION 'Audit count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM gamecast_v501.requests WHERE response ? 'state') THEN RAISE EXCEPTION 'Board duplicated'; END IF;
 IF has_function_privilege('anon','gamecast_v501.commit_state(uuid,bigint,jsonb,jsonb,text,text,text,timestamptz)','execute') OR has_schema_privilege('authenticated','gamecast_v501','usage') THEN RAISE EXCEPTION 'Unauthorized access'; END IF;
END $test$;
SELECT jsonb_build_object('qa_session','w7v501-0000000000000001','requests',(select count(*) from gamecast_v501.requests),'stored_receipt_bytes',(select sum(pg_column_size(response)) from gamecast_v501.requests),'largest_receipt_bytes',(select max(pg_column_size(response)) from gamecast_v501.requests),'current_state_version',(select state_version from gamecast_v501.sessions where public_slug='w7v501-0000000000000001'),'source_version',(select state_version from gamecast_v500.sessions where public_slug='w7v500-17e1dde75f5b1cba'),'source_md5',(select md5(state::text) from gamecast_v500.sessions where public_slug='w7v500-17e1dde75f5b1cba')) AS result;
