import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import * as E from '../../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {createQaController} from '../../../release-assets/v5.1.0/backend/delivery/controller.mjs';
const dir='release-assets/v5.1.0/backend/delivery/';
test('WP witness: committed batch has no intermediate edit snapshot',async()=>{
 const db=new PGlite();try{
 await db.exec('create role service_role bypassrls;create role anon;create role authenticated');
 for(const f of ['schema.sql','source-schema.sql','gateway.sql','controller-schema.sql'])await db.exec(fs.readFileSync(dir+f,'utf8'));
 await db.exec('set role service_role');
 let interrupt=false;const rpc=async(name,args)=>{if(name==='commit_reporting'&&interrupt)throw Error('NETWORK_INTERRUPTION');return (await db.query('select public.gamecast_v510_gateway($1,$2) result',[name,JSON.stringify(args)])).rows[0].result;};
 const controller=createQaController({rpc,clock:()=> '2026-11-03T12:00:00Z'}),sid='qa-v510-controller-test';
 const g={...E.initialGame(OPERATING_SLATE[0]),sessionId:sid,qaOnly:true};
 await controller.store.commit({sessionId:sid,expectedVersion:-1,engineVersion:E.ENGINE_VERSION,games:[g],events:[],requestId:'controller-genesis-01'});
 const call=(v,actions,key='controller-request-'+v)=>controller.execute({sessionId:sid,actorId:'chairman',requestId:key,expectedVersion:v,actions});
 const action=(command,payload)=>({id:g.id,command,payload});
 assert.equal((await call(0,[action('launch'),action('auto')])).stateVersion,1);
 assert.equal((await call(0,[action('launch'),action('auto')])).replayed,true);
 await assert.rejects(()=>call(0,[action('launch')]),/IDEMPOTENCY_CONFLICT/);
 await call(1,[{command:'advance',seconds:200}]);
 let s=await controller.store.loadCommittedRevision(sid,2);assert.ok(s.games[0].history.length>0);
 await call(2,[action('pause')]);s=await controller.store.loadCommittedRevision(sid,3);const history=s.games[0].history,gl=s.games[0].glSeconds;
 await call(3,[{command:'advance',seconds:30}]);s=await controller.store.loadCommittedRevision(sid,4);assert.deepEqual(s.games[0].history,history);assert.ok(s.games[0].glSeconds>gl);
 await call(4,[action('pause')]);await call(5,[action('edit_begin')]);await call(6,[action('edit_cancel')]);
 await call(7,[action('edit_begin'),action('edit_cancel')]);
 const committed=await controller.store.loadCommittedRevision(sid,8);
 const events=committed.commits.at(-1).events;
 assert.deepEqual(events.map(e=>e.command),['edit_begin','edit_cancel']);
 assert.equal(committed.games[0].editing,false);
 assert.equal(committed.games[0].lifecycle,'ACTIVE');
 assert.equal(events.some(e=>Object.hasOwn(e,'snapshot')||Object.hasOwn(e,'wpCapture')),false);
 console.log('BATCH_CAPTURE_EVIDENCE '+JSON.stringify({stateVersion:8,commands:events.map(e=>e.command),storedEditing:committed.games[0].editing,storedLifecycle:committed.games[0].lifecycle,eventKeys:events.map(e=>Object.keys(e))}));
 }finally{await db.close();}
});
