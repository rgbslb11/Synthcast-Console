import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createReleaseRuntime} from '../../release-assets/v5.0.7-week12/backend/src/release-runtime.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.7-week12/backend/runtime/week12.mjs';
import {controlToken} from '../../release-assets/v5.0.7-week12/backend/src/command-preconditions.mjs';
import {SecurityError} from '../../release-assets/v5.0.7-week12/backend/security/security-core.mjs';
const sequences=JSON.parse(fs.readFileSync('tests/v507/fixtures/week11-sequences.json')).filter(s=>s.records[0].preSnap.fieldPos+s.records[0].yards>=100);
for(const sequence of sequences)test(`HTTP -> engine -> disk RPC fixture -> restart -> Chairman/public: ${sequence.gameId}`,async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gc507-')),file=path.join(dir,'state.json');
 const slug='qa-w12v507-0000000000000001',origin='http://localhost:9876',actor='fixture-only';
 const stamp='2026-11-09T12:00:07.000Z';let runtime;
 const load=()=>JSON.parse(fs.readFileSync(file));const save=d=>fs.writeFileSync(file,JSON.stringify(d));
 const rpc=async(name,p)=>{
  const d=load(),row=d.row;if(name==='read_session')return [row];if(name==='read_final_snapshots')return [];
  const key=p.p_actor_id+'|'+p.p_idempotency_key;
  if(name==='read_request'){const x=d.receipts[key];if(x&&x.hash!==p.p_request_hash)throw new SecurityError('IDEMPOTENCY_CONFLICT',409);return x?[{response:x.response}]:[];}
  if(name==='commit_state'){
   if(p.p_expected_version!==row.state_version)throw new SecurityError('VERSION_CONFLICT',409);
   row.state=p.p_state;row.state_version++;row.last_advanced_at=p.p_stamp;d.events.push(...p.p_events);
   const response={public_slug:slug,engine_version:row.engine_version,week_key:row.week_key,state_version:row.state_version,state:row.state};
   d.receipts[key]={hash:p.p_request_hash,response:structuredClone(response)};save(d);return [{response,replayed:false}];
  }throw Error('Unexpected fixture RPC '+name);
 };
 const make=()=>createReleaseRuntime({clock:()=>stamp,allowedOrigins:[origin],schedulerSecret:'qa-fixture-only',transport:{rpc,authenticate:async()=>({id:actor}),authorize:async()=>({userId:actor,role:'CHAIRMAN',active:true})}});
 runtime=make();const state=slate.map(s=>runtime.engine.initialGame(s)),g=state[0],r=sequence.records[0];
 Object.assign(g,{lifecycle:'ACTIVE',activity:'LIVE',auto:true,possession:r.team,fieldPos:r.preSnap.fieldPos,down:r.preSnap.down,distance:r.preSnap.distance,quarter:Number(sequence.period),activePeriod:sequence.period,scoreboardSeconds:r.clock+7,qaOnly:true});
 g.pendingPlay={team:r.team,strategy:'NORMAL',yards:r.yards,points:0,turnover:false,punt:true,fg:false,first:false,inBounds:false,incomplete:false,desc:r.desc,edgeAtSnap:0,phase:'PLAY',remaining:7,playSec:7,clockBefore:g.scoreboardSeconds};
 save({row:{session_id:'qa-local-only',public_slug:slug,owner_user_id:actor,engine_version:runtime.engine.ENGINE_VERSION,week_key:'2026-W12',data_version:runtime.engine.DATA_VERSION,state_version:1,last_advanced_at:'2026-11-09T12:00:00.000Z',state},events:[],receipts:{}});
 const body=JSON.stringify({id:g.id,command:'speed',payload:{speed:1},expected_version:1,game_tokens:{[g.id]:controlToken(g)}});
 const url=origin+'/?api=command&session='+slug,headers={origin,authorization:'Bearer qa-fixture-only','content-type':'application/json','idempotency-key':'qa507-punt-resolution-0001'};
 const req=()=>new Request(url,{method:'POST',headers,body});
 try{
  const response=await runtime.chairmanHandler(req());assert.equal(response.status,201);const data=await response.json();assert.equal(data.state[0].fieldPos,20);assert.equal(data.state[0].possession,1-r.team);assert.match(data.state[0].lastPlay,/PUNT TOUCHBACK/);
  const disk=load();assert.equal(disk.row.state[0].history.at(-1).ruling,'PUNT_TOUCHBACK');assert.equal(disk.events.filter(e=>e.type==='V507_FOOTBALL_RECORD').length,1);
  assert.equal((await runtime.chairmanHandler(req())).status,200);assert.deepEqual(load(),disk);
  runtime=make();
  for(const operator of [true,false]){
   const read=operator?await runtime.chairmanHandler(new Request(origin+'/?api=read&session='+slug,{method:'POST',headers,body:'{}'})):await runtime.publicHandler(new Request(origin+'/?api=read&session='+slug,{headers:{origin}}));
   assert.equal(read.status,200);const state=(await read.json()).state;assert.equal(state.length,60);assert.equal(state[0].fieldPos,20);assert.equal(state[0].possession,1-r.team);assert.match(state[0].lastPlay,/PUNT TOUCHBACK/);assert.equal('history' in state[0],false);assert.equal('rngState' in state[0],false);
  }
  const before=load();await runtime.publicHandler(new Request(origin+'/?api=read&session='+slug,{headers:{origin}}));assert.deepEqual(load(),before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
