import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import * as E from '../../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {createQaController} from '../../../release-assets/v5.1.0/backend/delivery/controller.mjs';
const dir='release-assets/v5.1.0/backend/delivery/';
test('QA engine commands commit once, recover, preserve pause, and block corrected reporting',async()=>{
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
 interrupt=true;await assert.rejects(()=>call(7,[action('clock_set',{seconds:500})]),/NETWORK_INTERRUPTION/);
 assert.equal(await controller.store.sourceVersion(sid,g.id),8);interrupt=false;assert.equal((await call(7,[action('clock_set',{seconds:500})])).replayed,true);
 const head=(await db.query('select summary from gamecast_v510.reporting_heads where session_id=$1',[sid])).rows[0].summary;
 assert.equal(head.availability.reason,'CHAIRMAN_CORRECTION');
 await assert.rejects(()=>call(8,[action('accept',{confirmed:true})]),/QA_COMMAND_DENIED/);
 assert.equal(await controller.store.sourceVersion(sid,g.id),8);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>rpc('qa_grant',{p_session_id:sid,p_user_id:'00000000-0000-4000-8000-000000000001',p_active:true}),/permission denied/);await db.exec('reset role');}
 }finally{await db.close();}
});
