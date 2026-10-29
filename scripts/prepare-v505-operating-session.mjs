// Generate a single idempotent, unlaunched Week 10 import for the verified owner.
// Execution of the generated SQL is a separate, explicitly authorized release step.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../release-assets/v5.0.5-week10/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../release-assets/v5.0.5-week10/backend/runtime/week10.mjs';
const state=OPERATING_SLATE.map(s=>({...E.initialGame(s),qaOnly:false}));
const body=JSON.stringify(state);
const hash=createHash('sha256').update(body).digest('hex');
fs.mkdirSync('outputs/v505',{recursive:true});
fs.writeFileSync('outputs/v505/activate-session.sql',`BEGIN;
SET LOCAL statement_timeout='45s';
UPDATE gamecast_v505_w10.release_control SET writes_enabled=true,updated_at=now() WHERE singleton;
DO $release$
DECLARE owner_id uuid; receipt record; proposed_slug text;
BEGIN
 SELECT user_id INTO STRICT owner_id FROM gamecast_v505_w10.operators WHERE active AND role='CHAIRMAN';
 proposed_slug := 'w10v505-' || encode(extensions.gen_random_bytes(8),'hex');
 SELECT * INTO receipt FROM gamecast_v505_w10.create_session(owner_id,proposed_slug,'${E.DATA_VERSION}','${body.replaceAll("'","''")}'::jsonb,'v505-w10-approved-release-20261029','${hash}');
 IF (SELECT count(*) FROM gamecast_v505_w10.sessions)<>1 THEN RAISE EXCEPTION 'Expected exactly one Week 10 session'; END IF;
 IF EXISTS(SELECT 1 FROM gamecast_v505_w10.sessions s CROSS JOIN LATERAL jsonb_array_elements(s.state) g WHERE g->>'lifecycle'<>'UNLAUNCHED' OR g->>'auto'<>'false' OR g->>'onAir'<>'false' OR g#>>'{deadman,status}'<>'UNARMED') THEN RAISE EXCEPTION 'Unsafe initial game state'; END IF;
END $release$;
UPDATE gamecast_v505_w10.scheduler_cron_control SET enabled=true,updated_at=now() WHERE singleton;
SELECT cron.alter_job(jobid,active:=true) FROM cron.job WHERE jobname='gamecast_v505_week10';
COMMIT;
SELECT public_slug,week_key,engine_version,state_version,jsonb_array_length(state) AS games FROM gamecast_v505_w10.sessions;
`);
console.log(JSON.stringify({prepared:true,games:56,allUnlaunched:state.every(g=>g.lifecycle==='UNLAUNCHED'),path:'outputs/v505/activate-session.sql'}));
