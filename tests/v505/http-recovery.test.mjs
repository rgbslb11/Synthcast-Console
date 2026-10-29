import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createReleaseRuntime} from '../../release-assets/v5.0.5-week10/backend/src/release-runtime.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.5-week10/backend/runtime/week10.mjs';
import {controlToken,editToken} from '../../release-assets/v5.0.5-week10/backend/src/command-preconditions.mjs';
import {SecurityError} from '../../release-assets/v5.0.5-week10/backend/security/security-core.mjs';
test('actual HTTP handlers -> engine -> disk-backed RPC fixture -> restart -> public read',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gc-cal-qa-')),file=path.join(dir,'state.json'),slug='w10v505-0000000000000001',actor='12345678-1234-1234-1234-123456789abc',origin='http://localhost:9876',stamp='2026-10-28T20:00:00Z';
 let runtime;const load=()=>JSON.parse(fs.readFileSync(file));const save=d=>fs.writeFileSync(file,JSON.stringify(d));
 const rpc=async(name,p)=>{
  const d=load(),row=d.row;
  if(name==='read_session')return [row];if(name==='read_final_snapshots')return [];
  const key=p.p_actor_id+'|'+p.p_idempotency_key;
  if(name==='read_request'){const receipt=d.receipts[key];if(receipt&&receipt.hash!==p.p_request_hash)throw new SecurityError('IDEMPOTENCY_CONFLICT',409);return receipt?[{response:receipt.response}]:[];}
  if(name==='commit_state'){
   if(p.p_expected_version!==row.state_version)throw new SecurityError('VERSION_CONFLICT',409);
   row.state=p.p_state;row.state_version++;row.last_advanced_at=p.p_stamp;
   const response={public_slug:slug,engine_version:row.engine_version,week_key:row.week_key,state_version:row.state_version,state:row.state};d.receipts[key]={hash:p.p_request_hash,response:structuredClone(response)};save(d);return [{response,replayed:false}];
  }throw Error('Unexpected fixture RPC '+name);
 };
 const make=()=>createReleaseRuntime({clock:()=>stamp,allowedOrigins:[origin],schedulerSecret:'test-only-not-deployed',transport:{rpc,authenticate:async()=>({id:actor}),authorize:async()=>({userId:actor,role:'CHAIRMAN',active:true})}});
 runtime=make();save({row:{session_id:'local-test-only',public_slug:slug,owner_user_id:actor,engine_version:runtime.engine.ENGINE_VERSION,week_key:'2026-W10',data_version:runtime.engine.DATA_VERSION,state_version:1,last_advanced_at:stamp,state:slate.map(s=>({...runtime.engine.initialGame(s),qaOnly:true}))},receipts:{}});
 let seq=0;
 async function command(name,payload={},key){const row=load().row,g=row.state[0],body={id:g.id,command:name,payload,expected_version:row.state_version,game_tokens:{[g.id]:(['edit_commit','edit_cancel','clock_set','score'].includes(name)?editToken(g):controlToken(g))}};const request=new Request(origin+'/?api=command&session='+slug,{method:'POST',headers:{origin,authorization:'Bearer fixture-only','content-type':'application/json','idempotency-key':key||'qa-command-'+String(++seq).padStart(10,'0')},body:JSON.stringify(body)});const response=await runtime.chairmanHandler(request);return {status:response.status,body:await response.json(),request,raw:JSON.stringify(body)};}
 try{
  const launch=await command('launch',{},'qa-launch-key-000001');assert.equal(launch.status,201);const replay=await runtime.chairmanHandler(new Request(launch.request.url,{method:'POST',headers:launch.request.headers,body:launch.raw}));assert.equal(replay.status,200);assert.equal(load().row.state_version,2);
  assert.equal((await command('auto')).status,201);assert.equal(load().row.state[0].auto,true);
  assert.equal((await command('delay')).status,201);assert.equal(load().row.state[0].lifecycle,'DELAY');
  runtime=make();assert.equal((await command('resume_delay')).status,201);assert.equal(load().row.state[0].auto,true);
  assert.equal((await command('edit_begin')).status,201);assert.equal((await command('edit_commit',{down:2,distance:7,ballSide:'OWN',yardline:35,resumeAuto:true})).status,201);assert.equal(load().row.state[0].fieldPos,35);
  runtime=make();const read=await runtime.publicHandler(new Request(origin+'/?api=read&session='+slug,{headers:{origin}}));assert.equal(read.status,200);const data=await read.json();assert.equal(data.state[0].fieldPos,35);assert.equal(data.state.length,56);assert.equal('rngState' in data.state[0],false);assert.equal('history' in data.state[0],false);
  assert.equal((await command('end',{confirmed:true})).status,201);assert.equal((await command('lock')).status,201);assert.equal((await command('accept',{confirmed:true})).status,403);assert.equal(load().row.state[0].lifecycle,'LOCKED');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
