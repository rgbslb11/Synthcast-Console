// Generate a single idempotent, unlaunched Week 9 import for the verified owner.
// Execution of the generated SQL is a separate, explicitly authorized release step.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../release-assets/v5.0.3-week9/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../release-assets/v5.0.3-week9/backend/runtime/week9.mjs';
const state=OPERATING_SLATE.map(s=>({...E.initialGame(s),qaOnly:false}));
const body=JSON.stringify(state);
const hash=createHash('sha256').update(body).digest('hex');
fs.mkdirSync('outputs/v503',{recursive:true});
fs.writeFileSync('outputs/v503/activate-session.sql',`BEGIN;
SET LOCAL statement_timeout='45s';
UPDATE gamecast_v503_w9.release_control SET writes_enabled=true,updated_at=now() WHERE singleton;
DO $release$
DECLARE owner_id uuid; receipt record; proposed_slug text;
BEGIN
 SELECT owner_user_id INTO STRICT owner_id FROM gamecast_v502_w8.sessions WHERE public_slug='w8v502-19b0b56f2fa95cdf';
 proposed_slug := 'w9v503-' || encode(extensions.gen_random_bytes(8),'hex');
 SELECT * INTO receipt FROM gamecast_v503_w9.create_session(owner_id,proposed_slug,'${E.DATA_VERSION}','${body.replaceAll("'","''")}'::jsonb,'v503-w09-approved-release-20261019','${hash}');
 IF (SELECT count(*) FROM gamecast_v503_w9.sessions)<>1 THEN RAISE EXCEPTION 'Expected exactly one Week 9 session'; END IF;
 IF EXISTS(SELECT 1 FROM gamecast_v503_w9.sessions s CROSS JOIN LATERAL jsonb_array_elements(s.state) g WHERE g->>'lifecycle'<>'UNLAUNCHED' OR g->>'auto'<>'false' OR g->>'onAir'<>'false' OR g#>>'{deadman,status}'<>'UNARMED') THEN RAISE EXCEPTION 'Unsafe initial game state'; END IF;
END $release$;
UPDATE gamecast_v503_w9.scheduler_cron_control SET enabled=true,updated_at=now() WHERE singleton;
SELECT cron.alter_job(jobid,active:=true) FROM cron.job WHERE jobname='gamecast_v503_week9';
COMMIT;
SELECT public_slug,week_key,engine_version,state_version,jsonb_array_length(state) AS games FROM gamecast_v503_w9.sessions;
`);
console.log(JSON.stringify({prepared:true,games:52,allUnlaunched:state.every(g=>g.lifecycle==='UNLAUNCHED'),path:'outputs/v503/activate-session.sql'}));
