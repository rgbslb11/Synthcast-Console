import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as engine from '../../release-assets/v5.0.5-week10/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.5-week10/backend/runtime/week10.mjs';
import {TEAM_POWER} from '../../release-assets/v5.0.5-week10/backend/runtime/power.mjs';
import {composeDisplayBoard,publicGame,requireSessionSlug} from '../../release-assets/v5.0.5-week10/backend/security/security-core.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.5-week10/backend/src/engine-operations.mjs';
import {createReleaseRuntime} from '../../release-assets/v5.0.5-week10/backend/src/release-runtime.mjs';
import {controlToken,checkCommandPreconditions} from '../../release-assets/v5.0.5-week10/backend/src/command-preconditions.mjs';
const dir='release-assets/v5.0.5-week10/',manifest=JSON.parse(fs.readFileSync(dir+'input-manifest.json'));
const initial=()=>slate.map(s=>({...engine.initialGame(s),qaOnly:false}));
const stamp='2026-10-14T22:00:00.000Z',ops=createEngineOperations({engine,clock:()=>stamp});
test('Week 10 exact frozen input, count, order, ratings and safe defaults',()=>{
  assert.equal(createHash('sha256').update(fs.readFileSync(dir+'ratings.csv')).digest('hex'),manifest.sourceSha256);
  assert.equal(slate.length,56);assert.deepEqual(slate.map(s=>s.id),manifest.gameIds);assert.equal(Object.keys(TEAM_POWER).length,121);assert.equal(engine.DATA_VERSION,manifest.dataVersion);
  const games=initial();assert.equal(composeDisplayBoard([],games).length,56);
  for(const [i,g] of games.entries()){assert.equal(g.kickoffOrder,i+1);assert.equal(g.powerReady,true);assert.equal(g.lifecycle,'UNLAUNCHED');assert.equal(g.auto,false);assert.equal(g.onAir,false);assert.equal(g.deadman.status,'UNARMED');assert.equal(g.weather.enabled,false);assert.equal(g.weather.locked,false);assert.equal(engine.total(g,0)+engine.total(g,1),0);assert.equal(g.quarterLengthSeconds,600);assert.equal(g.qaOnly,false);assert.deepEqual(g.awayPower,TEAM_POWER[slate[i].away]);assert.deepEqual(g.homePower,TEAM_POWER[slate[i].home]);}
});
test('Week 7 and malformed/duplicate slate rejected; public data excludes secrets',()=>{
  assert.throws(()=>requireSessionSlug('w7v505-0000000000000001'));
  assert.throws(()=>composeDisplayBoard([{}],initial()));
  const bad=initial();bad[51].id=bad[0].id;assert.throws(()=>composeDisplayBoard([],bad));
  const view=publicGame(initial()[0]);for(const key of ['rngState','seedHex','history','awayPower','homePower','deadman'])assert.equal(key in view,false,key);
});
test('56-game selected Deadman arm/disarm and no unarmed past-date launch',async()=>{
  const draft={state:initial(),lastAdvancedAt:stamp};
  await ops.advance(draft,{seconds:0});assert.ok(draft.state.every(g=>g.lifecycle==='UNLAUNCHED'));
  const payload={ids:slate.map(g=>g.id),operation:'arm',config:{basis:'TV_START',tvStartZulu:'2026-10-15T03:00:00Z'}};
  assert.equal((await ops.executeCommand(draft,{command:'deadman_batch',payload})).events.length,56);
  assert.ok(draft.state.every(g=>g.deadman.status==='ARMED'));
  await ops.executeCommand(draft,{command:'deadman_batch',payload:{...payload,operation:'disarm'}});
  assert.ok(draft.state.every(g=>g.deadman.status==='DISARMED'));
});
test('Official acceptance requires LOCKED and explicit confirmation; QA remains prohibited',async()=>{
  const draft={state:initial()},id=slate[0].id,g=draft.state[0];
  await assert.rejects(()=>ops.executeCommand(draft,{id,command:'accept',payload:{confirmed:true}}));
  g.lifecycle='LOCKED';await assert.rejects(()=>ops.executeCommand(draft,{id,command:'accept',payload:{}}));
  g.qaOnly=true;await assert.rejects(()=>ops.executeCommand(draft,{id,command:'accept',payload:{confirmed:true}}),{code:'QA_ACCEPT_FORBIDDEN'});
  g.qaOnly=false;await ops.executeCommand(draft,{id,command:'accept',payload:{confirmed:true}});assert.equal(g.lifecycle,'READY');
});
test('Per-game concurrency preserves unrelated changes and rejects stale game control',()=>{
  const session={state:initial()},g=session.state[0],body={id:g.id,command:'launch',game_tokens:{[g.id]:controlToken(g)}};
  session.state[1].operatorPaused=true;checkCommandPreconditions(session,body);
  g.quarterLengthSeconds=900;assert.throws(()=>checkCommandPreconditions(session,body),{code:'GAME_STATE_CHANGED'});
});
test('Week 10 create remains authenticated, operator-authorized and frozen',async()=>{
  let createCalls=0;const transport={rpc:async(name)=>{if(name==='read_final_snapshots')return [];createCalls++;return [];},authenticate:async()=>({id:'12345678-1234-1234-1234-123456789abc'}),authorize:async()=>({userId:'12345678-1234-1234-1234-123456789abc',active:false,role:null})};
  const runtime=createReleaseRuntime({transport,allowedOrigins:['https://rgbslb11.github.io'],schedulerSecret:'test-secret-never-deployed',clock:()=>stamp});
  const req=body=>new Request('https://example.invalid/?api=create',{method:'POST',headers:{origin:'https://rgbslb11.github.io','content-type':'application/json',authorization:'Bearer test-only-credential','idempotency-key':'w8-test-create-0001'},body:JSON.stringify(body)});
  assert.equal((await runtime.chairmanHandler(req({}))).status,403);assert.equal(createCalls,0);
  transport.authorize=async()=>({userId:'12345678-1234-1234-1234-123456789abc',active:true,role:'CHAIRMAN'});
  const allowed=createReleaseRuntime({transport,allowedOrigins:['https://rgbslb11.github.io'],schedulerSecret:'test-secret-never-deployed',clock:()=>stamp});
  const r=await allowed.chairmanHandler(req({ratings:{}}));assert.equal(r.status,400);assert.equal((await r.json()).error,'CREATE_INPUTS_FROZEN');assert.equal(createCalls,0);
});
test('56 scheduled pairings retain fixed-seed 1x/50x football invariance',async()=>{
  const stable=g=>JSON.parse(JSON.stringify(g,(k,v)=>['masterZulu','createdRunAt','launchedAt','completedAt','lockedAtZulu','snapshotId','speed'].includes(k)?undefined:v));
  for(const s of slate){const g={...engine.initialGame(s),qaOnly:true};g.seedHex='0123456789abcdef0123456789abcdef';g.rngState=engine.seedWords(g.seedHex,g.id);await ops.executeCommand({state:[g]},{id:g.id,command:'launch'});g.auto=true;const fast=structuredClone(g);fast.speed=50;const a=engine.project([g],1200)[0],b=engine.project([fast],24)[0];assert.deepEqual(stable(a),stable(b),s.id);}
});
test('Week 10 schema guards and bindings have no Week 7 runtime fallback',()=>{
  const sql=fs.readFileSync(dir+'week10-schema.sql','utf8');assert.match(sql,/array_fill\(false/);assert.match(sql,/values \(true,false\)/);assert.match(sql,/no_imported_week10_finals check \(false\)/);
  for(const f of ['src/supabase-rest.mjs','security/security-core.mjs','src/release-runtime.mjs']){const s=fs.readFileSync(dir+'backend/'+f,'utf8');assert.doesNotMatch(s,/w7v505-|GC-W7-|2026-W07/);}
  const config=fs.readFileSync('public/v5.0.5/w10/release-config.js','utf8');assert.match(config,/gamecast-week10-v5-0-5-chairman/);assert.match(config,/gamecast-week10-v5-0-5-public/);
});
