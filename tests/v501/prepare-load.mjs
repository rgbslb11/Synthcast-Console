// Generates candidate-only QA initialization SQL; never points at the 5.0.0 namespace.
import fs from 'node:fs';import {randomBytes,createHash} from 'node:crypto';import * as engine from '../../release-assets/v5.0.1/backend/runtime/engine.mjs';import {OPERATING_SLATE} from '../../release-assets/v5.0.1/backend/runtime/week7.mjs';import {createEngineOperations} from '../../release-assets/v5.0.1/backend/src/engine-operations.mjs';
const count=Number(process.argv[2]);if(![1,9,41].includes(count))throw Error('Use 1, 9 or 41 active games');
const slug='w7v501-'+randomBytes(8).toString('hex'),draft={state:OPERATING_SLATE.map(s=>({...engine.initialGame(s),qaOnly:true}))},ops=createEngineOperations({engine});
for(const g of draft.state.slice(0,count)){await ops.executeCommand(draft,{id:g.id,command:'launch'});await ops.executeCommand(draft,{id:g.id,command:'auto'});await ops.executeCommand(draft,{id:g.id,command:'speed',payload:{speed:50}});}
const quote=s=>"'"+s.replaceAll("'","''")+"'",state=JSON.stringify(draft.state),hash=createHash('sha256').update(state).digest('hex');
const sql=`SELECT response->>'public_slug' AS qa_session FROM gamecast_v501.create_session((SELECT user_id FROM gamecast_v501.operators WHERE active AND role='CHAIRMAN' ORDER BY user_id LIMIT 1),${quote(slug)},${quote(engine.DATA_VERSION)},${quote(state)}::jsonb,${quote('qa-load-'+slug)},${quote(hash)});`;
fs.writeFileSync(process.argv[3],sql);console.log(JSON.stringify({slug,active:count,qaOnly:true}));
