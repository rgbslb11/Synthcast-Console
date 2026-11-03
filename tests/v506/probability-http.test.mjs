import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createReleaseRuntime} from '../../release-assets/v5.0.6-week11/backend/src/release-runtime.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {controlToken,editToken} from '../../release-assets/v5.0.6-week11/backend/src/command-preconditions.mjs';
import {contextHash,recoverHistory} from '../../release-assets/v5.0.6-week11/backend/probability/history.mjs';
import {SecurityError} from '../../release-assets/v5.0.6-week11/backend/security/security-core.mjs';

test('WP smoke: authenticated pregame update -> launch -> gameplay -> immutable save -> restart -> override -> grey public response',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gc-wp-smoke-')),file=path.join(dir,'db.json');
 const slug='w11v506-0000000000000001',actor='chairman-test-only',origin='http://localhost:9876';
 let milliseconds=Date.parse('2026-11-03T23:00:00Z'),counter=0,failNext=false;
 const clock=()=>new Date(milliseconds).toISOString(),load=()=>JSON.parse(fs.readFileSync(file)),save=d=>{fs.writeFileSync(file+'.tmp',JSON.stringify(d));fs.renameSync(file+'.tmp',file);};
 const rpc=async(name,p)=>{
  const d=load(),row=d.row,key=p?.p_actor_id+'|'+p?.p_idempotency_key;
  if(name==='read_session')return [row];if(name==='read_final_snapshots')return [];
  if(name==='read_request'){const old=d.receipts[key];if(old&&old.hash!==p.p_request_hash)throw new SecurityError('IDEMPOTENCY_CONFLICT',409);return old?[{response:old.response}]:[];}
  if(name==='commit_state'){
   if(failNext){failNext=false;throw new SecurityError('FIXTURE_STORAGE_FAILURE',503);}
   if(p.p_expected_version!==row.state_version)throw new SecurityError('VERSION_CONFLICT',409);
   row.state=p.p_state;row.state_version++;row.last_advanced_at=p.p_stamp;d.events.push(...p.p_events);
   const response={public_slug:slug,engine_version:row.engine_version,week_key:row.week_key,state_version:row.state_version,state:row.state};
   d.receipts[key]={hash:p.p_request_hash,response:structuredClone(response)};save(d);return [{response,replayed:false}];
  }throw Error(name);
 };
 const make=()=>createReleaseRuntime({clock,allowedOrigins:[origin],schedulerSecret:'qa-only',writesEnabled:()=>true,transport:{rpc,authenticate:async()=>({id:actor}),authorize:async()=>({userId:actor,role:'CHAIRMAN',active:true})}});
 let runtime=make();
 save({row:{session_id:'wp-fixture-session',public_slug:slug,owner_user_id:actor,week_key:'2026-W11',engine_version:runtime.engine.ENGINE_VERSION,data_version:runtime.engine.DATA_VERSION,state_version:1,last_advanced_at:clock(),state:slate.map(s=>({...runtime.engine.initialGame(s),qaOnly:true}))},receipts:{},events:[]});
 const send=async(command,payload={},retry=null)=>{
  const row=load().row,g=row.state[0],body=retry?.body??{id:g.id,command,payload,expected_version:row.state_version,game_tokens:{[g.id]:['score','clock_set','edit_commit','edit_cancel'].includes(command)?editToken(g):controlToken(g)}};
  const key=retry?.key??'wp-smoke-request-'+String(++counter).padStart(8,'0');
  const response=await runtime.chairmanHandler(new Request(origin+'/?api=command&session='+slug,{method:'POST',headers:{origin,authorization:'Bearer fixture','idempotency-key':key},body:JSON.stringify(body)}));
  return {status:response.status,result:await response.json(),body,key};
 };
 const read=async(game=slate[0].id,site=origin)=>{
  const response=await runtime.publicHandler(new Request(origin+'/?api=probability&session='+slug+'&game='+game,{headers:{origin:site}}));return {status:response.status,result:await response.json()};
 };
 try{
  const row=load().row,g=row.state[0];
  const prior={favoriteTeamId:g.homeCode,otherTeamId:g.awayCode,pregameMargin:7,source:{kind:'QA_FIXTURE',id:'SMOKE-NOT-A-WEEK11-FORECAST',generatedAt:clock(),sampleCount:1,contextHash:contextHash(g,{engineVersion:row.engine_version,dataVersion:row.data_version})}};
  assert.equal((await read()).result.status,'BLOCKED');
  assert.equal((await send('wp_pregame',prior)).status,201);
  assert.equal((await send('wp_pregame',{...prior,pregameMargin:3})).status,201);
  const expected=(await read()).result.probability;
  const launch=await send('launch');assert.equal(launch.status,201);
  assert.equal((await read()).result.probability,expected);
  const persisted=load();assert.equal((await send('launch',{},launch)).status,200);assert.deepEqual(load(),persisted);
  assert.equal((await send('wp_pregame',prior)).status,409);
  assert.equal((await send('auto')).status,201);
  milliseconds+=120000;assert.equal((await send('pause')).status,201);
  let live=(await read()).result;assert.ok(live.points.at(-1).resolvedPlays>0);assert.notEqual(live.probability,expected);
  const beforeEdit=live;
  assert.equal((await send('edit_begin')).status,201);
  assert.equal((await read()).result.reason,'CHAIRMAN_EDIT_IN_PROGRESS');
  runtime=make();
  assert.equal((await send('edit_cancel')).status,201);
  live=(await read()).result;assert.equal(live.status,'ESTIMATED');assert.equal(live.reason,null);
  assert.equal(live.probability,beforeEdit.probability);
  assert.deepEqual(live.points.slice(0,beforeEdit.points.length),beforeEdit.points);
  const before=load();for(let i=0;i<10;i++)await read();assert.deepEqual(load(),before);
  runtime=make();assert.deepEqual((await read()).result,live);
  // A separate Node process can recover from serialized history without any live engine instance.
  const script="import fs from 'node:fs';import {recoverHistory} from './release-assets/v5.0.6-week11/backend/probability/history.mjs';const d=JSON.parse(fs.readFileSync(process.argv[1]));const h=recoverHistory(null,d.row.state[0].winProbability.records);process.stdout.write(h.records.at(-1).hash);";
  assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script,file],{encoding:'utf8'}),before.row.state[0].winProbability.records.at(-1).hash);
  failNext=true;const failed=await send('score',{team:0,points:7});assert.equal(failed.status,503);assert.deepEqual(load(),before);
  assert.equal((await send('score',{},failed)).status,201);
  runtime=make();const blocked=(await read()).result;assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.reason,'CHAIRMAN_OVERRIDE');assert.equal(blocked.color,'#808080');assert.equal(blocked.probability,null);
  assert.deepEqual(blocked.points.slice(0,live.points.length),live.points);
  const d=load(),events=d.events.filter(e=>['V506_WP_PREGAME','V506_WP_OBSERVATION'].includes(e.type)&&e.gameId===g.id).map(e=>e.payload);
  assert.deepEqual(recoverHistory(null,events.reverse()),d.row.state[0].winProbability);
  assert.equal((await read('G9999')).status,404);assert.equal((await read(g.id,'https://unapproved.invalid')).status,403);
  for(const field of ['seedHex','rngState','pendingPlay','pendingRandom','awayPower','homePower'])assert.ok(!JSON.stringify(blocked).includes('"'+field+'"'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
