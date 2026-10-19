import fs from 'node:fs';
import * as E from '../../release-assets/v5.0.3-week9/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.3-week9/backend/runtime/week9.mjs';
const state=OPERATING_SLATE.map(s=>({...E.initialGame(s),qaOnly:false}));
const g=state[0];g.lifecycle='ACTIVE';g.activity='LIVE';g.auto=true;E.ensureOpeningToss(g);E.advanceGame(g,600);
const payload=JSON.stringify(state).replaceAll("'","''");
fs.writeFileSync('outputs/v503/persistence-probe.sql',`BEGIN;
SET LOCAL statement_timeout='45s';
UPDATE gamecast_v503_w9.release_control SET writes_enabled=true WHERE singleton;
DO $probe$
DECLARE owner_id uuid; r record; s gamecast_v503_w9.sessions%rowtype; expected jsonb := '${payload}'::jsonb; receipt jsonb;
BEGIN
 SELECT owner_user_id INTO STRICT owner_id FROM gamecast_v502_w8.sessions WHERE public_slug='w8v502-19b0b56f2fa95cdf';
 PERFORM gamecast_v503_w9.create_session(owner_id,'w9v503-0000000000000001','${E.DATA_VERSION}',expected,'v503-probe-create-0001',repeat('a',64));
 SELECT * INTO STRICT s FROM gamecast_v503_w9.sessions WHERE public_slug='w9v503-0000000000000001';
 IF s.state<>expected THEN RAISE EXCEPTION 'initial serialization mismatch'; END IF;
 SELECT * INTO r FROM gamecast_v503_w9.commit_state(s.session_id,1,expected,'[{"type":"V503_ADVANCE","payload":{"qaProbe":true}}]'::jsonb,'SCHEDULER','v503-probe-commit-0001',repeat('b',64),s.last_advanced_at);
 receipt:=r.response;
 IF r.replayed OR (receipt->>'state_version')::int<>2 THEN RAISE EXCEPTION 'commit mismatch'; END IF;
 SELECT * INTO r FROM gamecast_v503_w9.commit_state(s.session_id,1,expected,'[{"type":"V503_ADVANCE"}]'::jsonb,'SCHEDULER','v503-probe-commit-0001',repeat('b',64),s.last_advanced_at);
 IF NOT r.replayed OR r.response<>receipt THEN RAISE EXCEPTION 'replay mismatch'; END IF;
 BEGIN
  PERFORM gamecast_v503_w9.commit_state(s.session_id,1,expected,'[{"type":"V503_ADVANCE"}]'::jsonb,'SCHEDULER','v503-probe-stale-0001',repeat('c',64),s.last_advanced_at);
  RAISE EXCEPTION 'stale write accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'version conflict' THEN RAISE; END IF; END;
 BEGIN
  PERFORM gamecast_v503_w9.commit_state(s.session_id,1,expected,'[{"type":"V503_ADVANCE"}]'::jsonb,'SCHEDULER','v503-probe-commit-0001',repeat('c',64),s.last_advanced_at);
  RAISE EXCEPTION 'conflicting replay accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'idempotency conflict' THEN RAISE; END IF; END;
 SELECT * INTO r FROM gamecast_v503_w9.read_session(s.public_slug);
 IF r.state<>expected OR r.state_version<>2 THEN RAISE EXCEPTION 'recovery mismatch'; END IF;
 IF (SELECT count(*) FROM gamecast_v503_w9.events WHERE session_id=s.session_id)<>2 THEN RAISE EXCEPTION 'duplicate event'; END IF;
 IF has_schema_privilege('anon','gamecast_v503_w9','usage') OR has_schema_privilege('authenticated','gamecast_v503_w9','usage') THEN RAISE EXCEPTION 'schema access leak'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='gamecast_v503_w9'::regnamespace AND relkind='r' AND NOT relrowsecurity) THEN RAISE EXCEPTION 'RLS missing'; END IF;
END $probe$;
ROLLBACK;
SELECT 'PASS: engine state, play ledger, commit, replay, conflict, recovery, RLS; all probe writes rolled back' AS result;`);
