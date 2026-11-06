import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';import os from 'node:os';import path from 'node:path';

test('single-statement WP reads preserve authorization, bounded history, stale-source blocks and cursor errors',async()=>{
 const f=await fixture();try{
  await f.set();await f.pipeline.sample(f.sid,f.clock());
  const g=f.games[0],args={sessionId:f.sid,gameId:g.id,userId:actor};
  let calls=0;const store=createWpStore({query:async(...a)=>{calls++;return f.query(...a);},transaction:()=>{throw Error('READ_MUST_BE_ONE_STATEMENT');}});
  const first=await store.read({...args,limit:1});assert.equal(calls,1);assert.equal(first.points.length,1);
  await assert.rejects(()=>store.read({...args,userId:'00000000-0000-4000-8000-000000000002'}),/CHAIRMAN_FORBIDDEN/);
  const missing=await store.read({...args,gameId:'G9999'});assert.equal(missing.summary.reason,'NO_COMMITTED_OBSERVATION');assert.deepEqual(missing.points,[]);
  await assert.rejects(()=>store.read({...args,highWatermark:first.highWatermark+1}),/INVALID_CURSOR/);
  await assert.rejects(()=>store.read({...args,runId:'different-run'}),/RUN_CHANGED/);
  f.advanceTime(5);await f.pipeline.sample(f.sid,f.clock());
  const pinned=await store.read({...args,runId:first.summary.runId,after:first.nextSequence,highWatermark:first.highWatermark});
  assert.deepEqual(pinned.points,[]);assert.equal(pinned.highWatermark,first.highWatermark);
  await f.call([{id:g.id,command:'launch'}]);
  const pending=await store.read(args);assert.equal(pending.summary.reason,'WP_SOURCE_PENDING');assert.equal(pending.summary.probability,null);assert.deepEqual(pending.points,[]);
  await f.db.query('update gamecast_v510.reporting_grants set active=false where session_id=$1',[f.sid]);
  await assert.rejects(()=>store.read(args),/CHAIRMAN_FORBIDDEN/);
 }finally{await f.db.close();}
});

import * as E from '../../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {createQaController} from '../../../release-assets/v5.1.0/backend/delivery/controller.mjs';
import {createWpBackend} from '../../../release-assets/v5.1.0/backend/probability/integration.mjs';
import {createWpStore} from '../../../release-assets/v5.1.0/backend/probability/store.mjs';
import {createWpPipeline} from '../../../release-assets/v5.1.0/backend/probability/pipeline.mjs';
import {captureGame} from '../../../release-assets/v5.1.0/backend/probability/capture.mjs';
import {createWpHandler} from '../../../release-assets/v5.1.0/backend/probability/http.mjs';
const fixtures={};function output(name,view){fixtures[name]=view;if(process.env.WP_EXPORT_FIXTURES){fs.mkdirSync('release-assets/v5.1.0/wp-ui',{recursive:true});fs.writeFileSync('release-assets/v5.1.0/wp-ui/fixtures.json',JSON.stringify({qaOnly:true,illustrative:true,fixtures},null,2));}}
test('assembled candidate: all 56 games reach natural final through source, reporting and WP',async()=>{
 const f=await fixture(56);try{
  assert.equal(f.games.length,56);
  for(const g of f.games)await f.set(g);
  await f.pipeline.sample(f.sid,f.clock());
  await f.call(f.games.flatMap(g=>[{id:g.id,command:'launch'},{id:g.id,command:'auto'}]));
  await f.pipeline.recover(f.sid);
  let finals=0,rounds=0,source;
  for(;rounds<40&&finals<56;rounds++){
   await f.call([{command:'advance',seconds:600}]);
   f.advanceTime(5);await f.pipeline.sample(f.sid,f.clock);
   const version=await f.ctl.store.sourceVersion(f.sid,f.games[0].id);
   source=await f.ctl.store.loadCommittedRevision(f.sid,version);
   const before=source.games.map(g=>JSON.stringify(g.history));
   const board=await f.store.readBoard({sessionId:f.sid,gameIds:f.games.map(g=>g.id),userId:actor});
   assert.equal(board.games.length,56);assert.equal(board.sourceVersion,version);assert.equal(board.wpVersion,version);
   await f.read(f.games[0]);
   const after=await f.ctl.store.loadCommittedRevision(f.sid,version);
   assert.deepEqual(after.games.map(g=>JSON.stringify(g.history)),before,'reporting reads changed football');
   finals=source.games.filter(g=>g.lifecycle==='FINAL_PENDING').length;
   assert.equal(board.games.filter(g=>g.summary.status==='FINAL').length,finals);
  }
  assert.equal(finals,56,'every game must finish without acceptance');
  for(const g of f.games){
   const view=await f.read(g);assert.equal(view.summary.status,'FINAL');
   assert.ok([0,1].includes(view.summary.probability));
   assert.equal(view.points.filter(p=>p.kind==='kickoff').length,1);
   assert.equal(view.points.filter(p=>p.kind==='final').length,1);
  }
  const finalViews=await Promise.all(f.games.map(g=>f.read(g)));
  await f.call([{command:'advance',seconds:600}]);await f.pipeline.recover(f.sid);
  const verified=await f.ctl.store.sourceVersion(f.sid,f.games[0].id);
  for(const [i,g] of f.games.entries()){
   const view=await f.read(g);assert.equal(view.verifiedSourceVersion,verified);
   assert.deepEqual(view.summary,finalViews[i].summary);assert.deepEqual(view.points,finalViews[i].points);
  }
  const report={qaOnly:true,environment:'local PGlite, synthetic time; not hosted capacity',games:56,finals,rounds,sourceVersion:verified};
  console.log('FULL_BOARD_REHEARSAL '+JSON.stringify(report));
 }finally{await f.db.close();}
});
const dir='release-assets/v5.1.0/backend/',actor='00000000-0000-4000-8000-000000000001';
async function fixture(n=1,dataDir=undefined){
 const db=new PGlite(dataDir);await db.exec('create role service_role bypassrls;create role anon;create role authenticated');
 for(const f of ['delivery/schema.sql','delivery/source-schema.sql','delivery/gateway.sql','delivery/controller-schema.sql','probability/schema.sql'])await db.exec(fs.readFileSync(dir+f,'utf8'));
 let tx=null;const query=(...a)=>(tx??db).query(...a),transaction=fn=>db.transaction(async t=>{tx=t;try{return await fn();}finally{tx=null;}});
 const store=createWpStore({query,transaction}),sid='qa-v510-wp-integration',games=slate.slice(0,n).map(g=>({...E.initialGame(g),sessionId:sid,qaOnly:true}));
 let time=Date.parse('2026-11-04T15:00:00Z');const clock=()=>new Date(time).toISOString();
 const rpc=async(name,args)=>(await db.query('select public.gamecast_v510_gateway($1,$2) result',[name,JSON.stringify(args)])).rows[0].result;
 const ctl=createQaController({rpc,clock});await ctl.store.commit({sessionId:sid,expectedVersion:-1,engineVersion:E.ENGINE_VERSION,games,events:[],requestId:'wp-genesis-request-0001'});
 await db.query('insert into gamecast_v510.reporting_grants values($1,$2,true)',[sid,actor]);
 const pipeline=createWpPipeline({store,readSource:ctl.store.loadCommittedRevision,sourceVersion:s=>ctl.store.sourceVersion(s,games[0].id)});
 let version=0;const call=async actions=>{const r=await ctl.execute({sessionId:sid,actorId:actor,requestId:'wp-integration-action-'+version,expectedVersion:version,actions});version=r.stateVersion;return r;};
 const prior=g=>({favoriteTeamId:g.homeCode,otherTeamId:g.awayCode,pregameMargin:7,source:{kind:'QA_FIXTURE',id:'not-an-approved-forecast',sampleCount:1,generatedAt:clock(),contextHash:captureGame(g,{engineVersion:E.ENGINE_VERSION,stateVersion:0,actionOrdinal:0,command:'pregame',observedAt:clock()}).contextHash}});
 const set=async(g=games[0],margin=7,key='wp-prior-request-0001')=>store.setPrior({sessionId:sid,gameId:g.id,userId:actor,expectedVersion:version,requestId:key,prior:{...prior(g),pregameMargin:margin}});
 const read=(g=games[0],extra={})=>store.read({sessionId:sid,gameId:g.id,userId:actor,...extra});
 return {db,query,transaction,rpc,store,ctl,pipeline,sid,games,clock,call,prior,set,read,advanceTime:s=>time+=s*1000};
}
test('WP full SQL path: pregame updates, launch freeze, first gameplay, batch edit/cancel, gaps, sticky override and immutable recovery',async()=>{
 const f=await fixture();try{const g=f.games[0],action=(command,payload)=>({id:g.id,command,payload});
 await f.set();await f.pipeline.sample(f.sid,f.clock());assert.equal((await f.read()).summary.status,'PREGAME');output('pregame',await f.read());
 await f.set(g,3,'wp-prior-request-0002');f.advanceTime(5);await f.pipeline.sample(f.sid,f.clock());assert.ok(Math.abs((await f.read()).summary.probability-1/(1+Math.exp(-.42)))<1e-12);
 await f.call([action('launch'),action('auto')]);await f.pipeline.recover(f.sid);
 let view=await f.read();assert.equal(view.points.filter(x=>x.kind==='kickoff').length,1);assert.equal(view.summary.status,'ESTIMATED');output('launch',view);
 await assert.rejects(()=>f.set(g,9,'wp-prior-request-0003'),/PREGAME_FROZEN/);
 await f.call([{command:'advance',seconds:200}]);await f.pipeline.recover(f.sid);view=await f.read();assert.ok(view.points.some(x=>x.kind==='first_observed_gameplay'));output('live',view);
 await f.call([action('edit_begin'),action('edit_cancel')]);await f.pipeline.recover(f.sid);view=await f.read();const end=view.points.slice(-2);assert.deepEqual(end.map(x=>x.kind),['edit_begin','edit_cancel']);assert.equal(end[0].status,'BLOCKED');assert.equal(end[1].status,'ESTIMATED');output('editCancelled',view);
 await f.call([action('edit_begin')]);await f.pipeline.recover(f.sid);output('editOpen',await f.read());await f.call([action('edit_cancel')]);await f.pipeline.recover(f.sid);view=await f.read();
 const frozen=JSON.stringify(view.points);await f.pipeline.recover(f.sid);assert.equal(JSON.stringify((await f.read()).points),frozen);
 f.advanceTime(15);await f.pipeline.sample(f.sid,f.clock());view=await f.read();assert.equal(view.points.at(-1).gapBefore,true);assert.equal(view.points.at(-1).missingIntervals,2);output('gap',view);
 const before=await f.db.query('select count(*) n from gamecast_v510.wp_records');await f.read();await f.read();assert.deepEqual(await f.db.query('select count(*) n from gamecast_v510.wp_records'),before);
 await f.call([action('score',{team:0,points:7}),action('edit_begin'),action('edit_cancel')]);assert.equal((await f.read()).summary.reason,'WP_SOURCE_PENDING');await f.pipeline.recover(f.sid);assert.equal((await f.read()).summary.reason,'CHAIRMAN_CORRECTION');output('overrideBlocked',await f.read());
 await f.call([action('restart_same_seed',{confirmed:true})]);await f.pipeline.recover(f.sid);f.advanceTime(5);await f.pipeline.sample(f.sid,f.clock());assert.equal((await f.read()).summary.status,'BLOCKED');
 await assert.rejects(()=>f.db.exec('delete from gamecast_v510.wp_records'),/IMMUTABLE_JOURNAL/);
 await assert.rejects(()=>f.db.exec("update gamecast_v510.wp_priors set prior='{}'"),/IMMUTABLE_JOURNAL/);
 }finally{await f.db.close();}
});
test('56-game committed batch and periodic SQL history use bounded summaries; unauthorized HTTP does not read data',async()=>{
 const f=await fixture(56);try{
 for(const g of f.games)await f.set(g);
 await f.pipeline.sample(f.sid,f.clock());await f.call(f.games.flatMap(g=>[{id:g.id,command:'launch'},{id:g.id,command:'auto'}]));await f.pipeline.recover(f.sid);
 await f.call([{command:'advance',seconds:120}]);await f.pipeline.recover(f.sid);f.advanceTime(5);await f.pipeline.sample(f.sid,f.clock());
 for(const g of f.games){const v=await f.read(g);assert.equal(v.summary.status,'ESTIMATED');assert.ok(Buffer.byteLength(JSON.stringify(v.summary))<1024);assert.ok(v.points.some(p=>p.kind==='kickoff'));}
 const origin='https://qa.example';let allowed=false;
 const handler=createWpHandler({allowedOrigins:[origin],authenticate:async()=>({id:actor}),authorize:async()=>({userId:actor,authenticated:true,active:allowed,role:'CHAIRMAN',authorizedSessionIds:[f.sid]}),store:f.store});
 const req=()=>new Request(`https://qa.example/wp?session=${f.sid}&game=${f.games[0].id}`,{headers:{origin,authorization:'Bearer fixture'}});
 assert.equal((await handler(req())).status,403);allowed=true;const response=await handler(req());assert.equal(response.status,200);assert.equal((await response.json()).summary.status,'ESTIMATED');
 for(const role of ['anon','authenticated']){await f.db.exec('set role '+role);await assert.rejects(()=>f.db.query('select * from gamecast_v510.wp_records'),/permission denied/);await f.db.exec('reset role');}
 }finally{await f.db.close();}
});

test('disk restart replays pending source captures; natural final and post-final edit cancellation remain terminal',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gc-wp-durable-')),f=await fixture(1,folder),g=f.games[0];let reopened;
 try{
  await f.set();await f.call([{id:g.id,command:'launch'},{id:g.id,command:'auto'},{command:'advance',seconds:20000}]);
  assert.equal(await f.store.progress(f.sid),-1);await f.db.close();
  reopened=new PGlite(folder);let tx=null;const query=(...a)=>(tx??reopened).query(...a),transaction=fn=>reopened.transaction(async t=>{tx=t;try{return await fn();}finally{tx=null;}});
  const store=createWpStore({query,transaction});
  const rpc=async(name,args)=>(await reopened.query('select public.gamecast_v510_gateway($1,$2) result',[name,JSON.stringify(args)])).rows[0].result;
  const ctl=createQaController({rpc,clock:f.clock}),pipeline=createWpPipeline({store,readSource:ctl.store.loadCommittedRevision,sourceVersion:s=>ctl.store.sourceVersion(s,g.id)});
  assert.equal((await pipeline.recover(f.sid)).caughtUp,true);
  const read=()=>store.read({sessionId:f.sid,gameId:g.id,userId:actor});let v=await read();assert.equal(v.summary.status,'FINAL');assert.equal(v.points.filter(p=>p.kind==='kickoff').length,1);assert.equal(v.points.filter(p=>p.kind==='first_observed_gameplay').length,1);assert.equal(v.points.filter(p=>p.kind==='final').length,1);output('final',v);
  const count=v.highWatermark;await pipeline.sample(f.sid,'2026-11-04T15:01:00Z');assert.equal((await read()).highWatermark,count);
  await ctl.execute({sessionId:f.sid,actorId:actor,requestId:'wp-final-cancel-request',expectedVersion:1,actions:[{id:g.id,command:'edit_begin'},{id:g.id,command:'edit_cancel'}]});await pipeline.recover(f.sid);v=await read();assert.equal(v.summary.status,'FINAL');assert.equal(v.points.at(-2).status,'BLOCKED');assert.equal(v.points.at(-1).kind,'edit_cancel');
  const first=await store.read({sessionId:f.sid,gameId:g.id,userId:actor,limit:1});const page=await store.read({sessionId:f.sid,gameId:g.id,userId:actor,limit:1,after:first.nextSequence,runId:first.summary.runId});assert.ok(page.nextSequence>first.nextSequence);
 }finally{if(reopened)await reopened.close();else await f.db.close();fs.rmSync(folder,{recursive:true,force:true});}
});

test('conflicting append rolls back entire batch and preserves latest projection and receipt',async()=>{
 const f=await fixture();try{
 await f.set();await f.pipeline.sample(f.sid,f.clock());
 const row=(await f.db.query('select state from gamecast_v510.wp_heads')).rows[0].state;
 const original=(await f.db.query('select record from gamecast_v510.wp_records order by sequence desc limit 1')).rows[0].record;
 const before=await f.read(),progress=await f.store.progress(f.sid);
 const fresh={...original,eventId:'test:atomic-rollback'};
 await assert.rejects(()=>f.store.commit({sessionId:f.sid,requestId:'atomic-conflicting-batch',sourceVersion:progress,expectedProgress:progress,updates:[{record:fresh,state:row},{record:{...original,probability:.111},state:row}]}),/HISTORY_EVENT_CONFLICT/);
 assert.deepEqual(await f.read(),before);
 const receipt=await f.db.query("select count(*) n from gamecast_v510.wp_receipts where request_id='atomic-conflicting-batch'");assert.equal(Number(receipt.rows[0].n),0);
 }finally{await f.db.close();}
});

test('composed backend recovers after commit and WP failure never replays football',async()=>{
 const f=await fixture();try{
 await f.set();const errors=[];
 const b=createWpBackend({...f,authenticate:async()=>null,authorize:async()=>null,allowedOrigins:[],listSessions:async()=>[f.sid],onRecoveryError:e=>errors.push(e)});
 const req={sessionId:f.sid,actorId:actor,requestId:'composed-launch-request',expectedVersion:0,actions:[{id:f.games[0].id,command:'launch'}]};
 const receipt=await b.controller.execute(req);assert.equal(receipt.stateVersion,1);assert.equal((await f.read()).summary.status,'ESTIMATED');
 const recover=b.pipeline.recover;b.pipeline.recover=async()=>{throw Error('INJECTED_STORAGE_FAILURE');};
 const auto={...req,requestId:'composed-auto-request',expectedVersion:1,actions:[{id:f.games[0].id,command:'auto'}]};
 assert.equal((await b.controller.execute(auto)).stateVersion,2);assert.equal(errors[0].code,'INJECTED_STORAGE_FAILURE');assert.equal((await f.read()).summary.reason,'WP_SOURCE_PENDING');
 b.pipeline.recover=recover;await b.controller.execute(auto);assert.equal(await f.store.progress(f.sid),2);assert.equal((await f.read()).summary.status,'ESTIMATED');
 assert.equal(await f.ctl.store.sourceVersion(f.sid,f.games[0].id),2);
 }finally{await f.db.close();}
});


test('board snapshot returns exactly 56 ordered summaries with independent history and live authorization',async()=>{
 const f=await fixture(56);try{
  for(const g of f.games)await f.set(g);
  await f.pipeline.sample(f.sid,f.clock());
  const gameIds=f.games.map(g=>g.id).reverse(),args={sessionId:f.sid,gameIds,userId:actor};
  let calls=0;const store=createWpStore({query:async(...a)=>{calls++;return f.query(...a);},transaction:()=>{throw Error('READ_ONLY');}});
  const before=(await f.db.query('select count(*) n from gamecast_v510.wp_records')).rows;
  const board=await store.readBoard(args);assert.equal(calls,1);assert.equal(board.contractVersion,'GC-WP-BOARD-1');assert.equal(board.games.length,56);assert.deepEqual(board.games.map(g=>g.gameId),gameIds);
  for(const g of board.games){assert.deepEqual(g.summary,(await f.read({id:g.gameId})).summary);assert.equal(g.summary.status,'PREGAME');assert.equal(g.points,undefined);}
  assert.ok(Buffer.byteLength(JSON.stringify(board))<56000);
  const missing=await store.readBoard({...args,gameIds:['G9999']});assert.equal(missing.games[0].summary.reason,'NO_COMMITTED_OBSERVATION');
  for(const bad of [[],[...gameIds,'G9999'],[gameIds[0],gameIds[0]],['invalid']])await assert.rejects(()=>store.readBoard({...args,gameIds:bad}),/INVALID_BOARD_GAMES|QA_SCOPE_REQUIRED/);
  assert.deepEqual((await f.db.query('select count(*) n from gamecast_v510.wp_records')).rows,before);
  await f.call(f.games.flatMap(g=>[{id:g.id,command:'launch'},{id:g.id,command:'auto'}]));
  const pending=await store.readBoard(args);assert.ok(pending.games.every(g=>g.summary.status==='BLOCKED'&&g.summary.reason==='WP_SOURCE_PENDING'&&g.summary.probability===null));
  await f.pipeline.recover(f.sid);const active=await store.readBoard(args);assert.ok(active.games.every(g=>g.summary.status==='ESTIMATED'));
  const origin='https://qa.example',handler=createWpHandler({allowedOrigins:[origin],authenticate:async()=>({id:actor}),authorize:async()=>({userId:actor,authenticated:true,active:true,role:'CHAIRMAN',authorizedSessionIds:[f.sid]}),store});
  const req=(ids=gameIds,method='GET')=>new Request(`https://qa.example/wp?session=${f.sid}&view=board&games=${ids.join(',')}`,{method,headers:{origin,authorization:'Bearer fixture'}});
  assert.equal((await handler(req())).status,200);assert.equal((await handler(req([]))).status,400);assert.equal((await handler(req(gameIds,'POST'))).status,405);
  await f.db.query('update gamecast_v510.reporting_grants set active=false where session_id=$1',[f.sid]);
  assert.equal((await handler(req())).status,403);await assert.rejects(()=>store.readBoard(args),/CHAIRMAN_FORBIDDEN/);
 }finally{await f.db.close();}
});
