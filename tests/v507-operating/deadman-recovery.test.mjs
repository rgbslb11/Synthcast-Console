import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createReleaseRuntime} from '../../release-assets/v5.0.7-week12-operating/backend/src/release-runtime.mjs';
import * as engine from '../../release-assets/v5.0.7-week12-operating/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.7-week12-operating/backend/runtime/week12.mjs';
import {controlToken} from '../../release-assets/v5.0.7-week12-operating/backend/src/command-preconditions.mjs';
const stamp='2026-11-11T00:35:00.000Z',origin='http://localhost:9876',slug='w12v507-0000000000000001',actor='fixture-only';
function fixture(last='2026-11-10T05:47:03.541Z'){
 const state=OPERATING_SLATE.map(engine.initialGame);const g=state[0];
 g.deadman={...g.deadman,status:'ARMED',revision:1,basis:'KICKOFF_PLUS',offsetMinutes:7,dueZulu:'2026-11-11T00:07:00.000Z',armRunId:g.runId};
 let row={session_id:'fixture',public_slug:slug,owner_user_id:actor,week_key:'2026-W12',engine_version:engine.ENGINE_VERSION,data_version:engine.DATA_VERSION,state_version:9,last_advanced_at:last,state};
 const receipts=new Map(),events=[];
 const rpc=async(name,p)=>{
  if(name==='read_session')return [structuredClone(row)];if(name==='read_final_snapshots')return [];
  if(name==='read_request')return receipts.has(p.p_idempotency_key)?[{response:structuredClone(receipts.get(p.p_idempotency_key))}]:[];
  if(name==='commit_state'){assert.equal(p.p_expected_version,row.state_version);row={...row,state:structuredClone(p.p_state),state_version:row.state_version+1,last_advanced_at:p.p_stamp};events.push(...p.p_events);const response={public_slug:slug,engine_version:engine.ENGINE_VERSION,week_key:'2026-W12',state_version:row.state_version,state:structuredClone(row.state)};receipts.set(p.p_idempotency_key,response);return [{response,replayed:false}];}
  throw Error(name);
 };
 const runtime=createReleaseRuntime({clock:()=>stamp,allowedOrigins:[origin],schedulerSecret:'fixture',transport:{rpc,authenticate:async()=>({id:actor}),authorize:async()=>({userId:actor,role:'CHAIRMAN',active:true})}});
 const body=(command,payload={})=>({id:state[0].id,command,payload,expected_version:9,game_tokens:Object.fromEntries(state.map(g=>[g.id,controlToken(g)]))});
 const request=b=>new Request(origin+'/?api=command&session='+slug,{method:'POST',headers:{origin,authorization:'Bearer fixture','content-type':'application/json','idempotency-key':'fixture-recovery-0001'},body:JSON.stringify(b)});
 return {runtime,state,body,request,get row(){return row;},events};
}
for(const last of ['2026-11-10T05:47:03.541Z','2026-11-11T00:30:00.000Z'])for(const command of ['launch','deadman_disarm'])test('overdue G0568 '+command+' with checkpoint '+last,async()=>{
 const f=fixture(last),body=f.body(command),before=structuredClone(f.row.state[0]);const result=await f.runtime.chairmanHandler(f.request(body));assert.equal(result.status,201,await result.clone().text());const g=f.row.state[0];
 assert.equal(g.lifecycle,command==='launch'?'ACTIVE':'UNLAUNCHED');assert.equal(g.glSeconds,0);assert.equal(g.auto,false);assert.deepEqual(g.history,[]);assert.deepEqual(g.scores,before.scores);assert.deepEqual(g.rngState,before.rngState);
 if(command==='deadman_disarm')assert.equal(g.deadman.status,'DISARMED');else assert.equal(g.launchedAt,stamp);
 const snapshot=JSON.stringify(f.row);assert.equal((await f.runtime.chairmanHandler(f.request(body))).status,200);assert.equal(JSON.stringify(f.row),snapshot);
});
test('batch Disarm suppresses fallback only for explicit prelaunch targets',async()=>{
 const f=fixture(),g=f.state[1];g.deadman={...f.state[0].deadman,armRunId:g.runId};
 const body=f.body('deadman_batch',{operation:'disarm',ids:f.state.slice(0,2).map(g=>g.id)});const r=await f.runtime.chairmanHandler(f.request(body));assert.equal(r.status,201,await r.clone().text());assert.ok(f.row.state.slice(0,2).every(g=>g.lifecycle==='UNLAUNCHED'&&g.deadman.status==='DISARMED'));
});
test('ordinary scheduler still fires overdue fallback with weather locked and GL zero',async()=>{
 const f=fixture();const draft={state:structuredClone(f.state),lastAdvancedAt:'2026-11-10T05:47:03.541Z'};await f.runtime.operations.advance(draft,{seconds:0});const g=draft.state[0];assert.equal(g.lifecycle,'ACTIVE');assert.equal(g.deadman.status,'AUTONOMOUS');assert.equal(g.auto,true);assert.equal(g.weather.locked,true);assert.equal(g.glSeconds,0);assert.equal(g.launchedAt,stamp);
});
test('Disarm on an unarmed game returns 409 without a commit or ambiguous 500',async()=>{
 const f=fixture();f.state[0].deadman.status='UNARMED';const r=await f.runtime.chairmanHandler(f.request(f.body('deadman_disarm')));assert.equal(r.status,409);assert.equal(f.row.state_version,9);
});
test('stale control witness is still rejected before mutation',async()=>{
 const f=fixture(),b=f.body('launch');b.game_tokens[b.id]='0'.repeat(64);const r=await f.runtime.chairmanHandler(f.request(b));assert.equal(r.status,409);assert.equal(f.row.state_version,9);assert.equal(f.row.state[0].lifecycle,'UNLAUNCHED');
});
function ui(){
 const calls=[],handlers={},elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',addEventListener(){},replaceChildren(){}});return elements.get(id);};
 const c={URLSearchParams,AbortSignal,structuredClone,crypto,Date,Event,location:{search:'',hash:'',origin,pathname:'/'},document:{getElementById:el},sessionStorage:{getItem:()=>JSON.stringify({access_token:'fixture',refresh_token:'fixture',expiresAt:Date.now()+3600000}),setItem(){},removeItem(){}},GAMECAST_V507_CONFIG:{chairmanApi:origin+'/chairman',publicApi:origin+'/public'},addEventListener:(n,f)=>{handlers[n]=f;},dispatchEvent(){},confirm:()=>true};c.window=c;
 let failRead=false;c.fetch=async(u,o)=>{calls.push({url:u,body:JSON.parse(o.body)});const mutating=u.includes('api=command');return new Response(JSON.stringify(mutating?{error:'INTERNAL_ERROR'}:failRead?{error:'BACKEND_UNAVAILABLE'}:{state:OPERATING_SLATE.map(g=>({id:g.id})),state_version:9,engine_version:engine.ENGINE_VERSION,public_slug:slug}),{status:mutating?500:failRead?504:200});};
 vm.createContext(c);vm.runInContext(fs.readFileSync('release-assets/v5.0.7-week12-operating/public/v5.0.7/w12/auth-api.js','utf8'),c);handlers.DOMContentLoaded();
 c.api=(a)=>c.gamecastApi(a,undefined,{slug,operator:true});c.adopt=()=>{};c.render=()=>{};c.status=()=>{};
 vm.runInContext('var writing=false,readPromise=null,readEpoch=0,writeConflict=false,version=9;',c);
 const app=fs.readFileSync('release-assets/v5.0.7-week12-operating/public/v5.0.7/w12/app.js','utf8');vm.runInContext(app.slice(app.indexOf('async function refresh(){'),app.indexOf('function editCheckpoint(')),c);
 return {c,calls,failRead:()=>{failRead=true;}};
}
test('explicit Refresh resolves the local retry latch only after read success; no command is replayed',async()=>{
 const {c,calls}=ui();await assert.rejects(c.gamecastApi('command',{id:'G0568',command:'deadman_disarm'},{slug,operator:true}),/INTERNAL_ERROR/);assert.equal(c.gamecastPendingRequest(),true);
 await assert.rejects(c.gamecastApi('command',{id:'G0568',command:'launch'},{slug,operator:true}),/Previous request/);assert.equal(calls.length,1);await c.refresh();assert.equal(c.gamecastPendingRequest(),false);assert.equal(calls.length,2);assert.ok(calls[1].url.includes('api=read'));
});
test('cancelled or failed Refresh retains the original pending request',async()=>{
 const {c,calls,failRead}=ui();await assert.rejects(c.gamecastApi('command',{id:'G0568',command:'deadman_disarm'},{slug,operator:true}));c.confirm=()=>false;await c.refresh();assert.equal(calls.length,1);assert.equal(c.gamecastPendingRequest(),true);c.confirm=()=>true;failRead();await c.refresh();assert.equal(c.gamecastPendingRequest(),true);assert.equal(calls.filter(x=>x.url.includes('api=command')).length,1);
});
