import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import * as dm from './deadman.mjs';
import {OPERATING_SLATE} from '../../supabase/functions/gamecast-week5-saturday-v4-3-2-2/week5.ts';
import {TEAM_POWER} from '../../supabase/functions/gamecast-week5-saturday-v4-3-2-2/power.ts';
const path='supabase/functions/gamecast-week5-saturday-v4-3-2-2/index.ts';
const results=[];
async function test(id,name,fn){await fn();results.push({id,name,status:'PASS'});console.log('PASS',id,name);}
const sha=s=>createHash('sha256').update(s).digest('hex');
export function harness(file=path){
  const clock={ms:Date.parse('2026-09-26T10:00:00Z')};
  class Clock extends Date{constructor(...a){super(...(a.length?a:[clock.ms]));}static now(){return clock.ms;}}
  const db={sessions:new Map(),events:[],conflict:false};
  const rpc=async(name,p={})=>{
    if(name==='gamecast_v12_create_session'){
      const row={session_id:p.p_public_slug,public_slug:p.p_public_slug,operator_token_hash:p.p_operator_token_hash,week_key:p.p_week_key,engine_version:p.p_engine_version,state:structuredClone(p.p_state),state_version:1,last_advanced_at:new Clock().toISOString()};db.sessions.set(row.public_slug,row);
      return {data:[{public_slug:row.public_slug,state_version:1}],error:null};
    }
    if(name==='gamecast_v12_read_session')return {data:[structuredClone(db.sessions.get(p.p_slug))].filter(Boolean),error:null};
    if(name==='gamecast_v4322_scheduler_auth')return {data:p.p_hash===sha('test-worker-secret'),error:null};
    if(name==='gamecast_v4322_scheduler_sessions')return {data:[...db.sessions.values()].filter(s=>s.public_slug.startsWith('w5satv4322-')).map(s=>({public_slug:s.public_slug})),error:null};
    if(name==='gamecast_v4322_commit'){
      const row=db.sessions.get(p.p_session_id);
      if(db.conflict){db.conflict=false;row.state_version++;return {data:[],error:null};}
      if(row.state_version!==p.p_expected_version)return {data:[],error:null};
      assert.equal(p.p_state.length,49);assert.ok(row.public_slug.startsWith('w5satv4322-'));
      row.state=structuredClone(p.p_state);row.state_version++;row.last_advanced_at=p.p_stamp;
      db.events.push(...structuredClone(p.p_events));return {data:[structuredClone(row)],error:null};
    }
    throw Error('Unexpected RPC '+name);
  };
  let handler;
  const context=vm.createContext({Date:Clock,console,crypto:globalThis.crypto,structuredClone,TextEncoder,Request,Response,URL,OPERATING_SLATE,TEAM_POWER,
    freshDeadman:dm.freshDeadman,deadmanArm:dm.arm,deadmanDisarm:dm.disarm,deadmanTick:dm.tick,afterOperatorCommand:dm.afterOperatorCommand,
    createClient:()=>({rpc}),Deno:{env:{get:()=>''},serve:fn=>{handler=fn;}}});
  const code=fs.readFileSync(file,'utf8').replace(/^import .*;\s*$/gm,'');
  vm.runInContext(stripTypeScriptTypes(code)+'\nglobalThis.engine={initialGame,seedWords,advanceGame,project,total,publicGame,beginEdit,cancelEdit,finishGame,reset};',context);
  async function request(action,body,slug='',token='',scheduler=false){
    const u='https://qa.local/?api='+action+(slug?'&session='+slug:'')+(action==='create'?'&qa=true':'');
    const r=await handler(new Request(u,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{[scheduler?'x-deadman-scheduler':'x-operator-token']:token}:{})},body:body?JSON.stringify(body):undefined}));
    return {status:r.status,body:await r.json()};
  }
  return {clock,db,request,engine:context.engine};
}
const h=harness();
const game=()=>h.engine.initialGame(OPERATING_SLATE[0]);
const early='2026-09-26T10:00:00.000Z', due='2026-09-26T16:15:00.000Z';
const config={basis:'KICKOFF_PLUS',offsetMinutes:15};
const armed=()=>{const g=game();dm.arm(g,config,early);return g;};
await test('D01','Every game starts UNARMED',()=>{for(const row of OPERATING_SLATE)assert.equal(h.engine.initialGame(row).deadman.status,'UNARMED');});
await test('D02','Arming days ahead survives serialized reload',()=>{const g=game();dm.arm(g,config,'2026-09-21T12:00:00.000Z');const copy=JSON.parse(JSON.stringify(g));assert.equal(copy.deadman.dueZulu,due);assert.equal(dm.tick(copy,'2026-09-25T23:00:00.000Z'),null);});
await test('D03','No early launch',()=>{const g=armed();assert.equal(dm.tick(g,'2026-09-26T16:14:59.000Z'),null);assert.equal(g.lifecycle,'UNLAUNCHED');});
await test('D04','Due launch exactly once with GL zero and 1x',()=>{const g=armed(),seed=JSON.stringify(g.rngState);assert.equal(dm.tick(g,due).action,'AUTONOMOUS_LAUNCH');assert.equal(g.glSeconds,0);assert.equal(g.scoreboardSeconds,600);assert.equal(g.speed,1);assert.equal(JSON.stringify(g.rngState),seed);assert.equal(dm.tick(g,due),null);});
await test('D05','Manual AUTO satisfies and never rearms when stopped',()=>{const g=armed();g.lifecycle='ACTIVE';g.auto=true;dm.afterOperatorCommand(g,'auto',early);g.auto=false;dm.afterOperatorCommand(g,'auto',early);assert.equal(dm.tick(g,due),null);assert.equal(g.deadman.status,'SATISFIED');});
await test('D06','Manual ON AIR satisfies',()=>{const g=armed();g.lifecycle='ACTIVE';g.onAir=true;dm.afterOperatorCommand(g,'on_air',early);assert.equal(dm.tick(g,due),null);});
await test('D07','DISARM and REARM are explicit',()=>{const g=armed();dm.disarm(g,early);assert.equal(dm.tick(g,due),null);dm.arm(g,config,early);assert.equal(g.deadman.status,'ARMED');});
await test('D08','Missing TV/kickoff metadata blocked, never fabricated',()=>{const g=game();assert.throws(()=>dm.arm(g,{basis:'TV_START'},early),/BLOCKED/);g.kickoffZulu=null;assert.throws(()=>dm.arm(g,config,early),/BLOCKED/);assert.equal(g.deadman.status,'UNARMED');});
await test('D09','Unavailable or null power fails closed',()=>{for(const kind of ['flag','null']){const g=armed();if(kind==='flag')g.powerReady=false;else g.awayPower={...g.awayPower,offense:null};assert.equal(dm.tick(g,due).action,'BLOCKED');assert.equal(g.lifecycle,'UNLAUNCHED');}});
await test('D10','Changed authorized kickoff recomputes deadline',()=>{const g=armed();g.kickoffZulu='2026-09-26T17:00:00.000Z';assert.equal(dm.tick(g,due).action,'RESCHEDULED');assert.equal(g.deadman.dueZulu,'2026-09-26T17:15:00.000Z');assert.equal(g.lifecycle,'UNLAUNCHED');});
await test('D11','TV start and exact kickoff are distinct triggers',()=>{const g=game();dm.arm(g,{basis:'TV_START',tvStartZulu:'2026-09-26T15:50:00.000Z'},early);assert.equal(g.deadman.dueZulu,'2026-09-26T15:50:00.000Z');dm.arm(g,{basis:'KICKOFF'},early);assert.equal(g.deadman.dueZulu,g.kickoffZulu);});
await test('D12','Launched but untouched idle game can start AUTO without resetting GL',()=>{const g=armed();g.lifecycle='ACTIVE';g.glSeconds=300;g.launchedAt=early;dm.afterOperatorCommand(g,'launch',early);assert.equal(dm.tick(g,due).action,'AUTONOMOUS_AUTO');assert.equal(g.glSeconds,300);assert.equal(g.launchedAt,early);});
await test('D13','Pause/Edit/Delay individually protect football and preserve arm audit',()=>{for(const field of ['operatorPaused','editing','delayed']){const g=armed();g.lifecycle='ACTIVE';g[field]=true;assert.equal(dm.tick(g,due).action,'SATISFIED');assert.equal(g.auto,false);}});
await test('D14','Edit Cancel does not restore obsolete arm or ownership',()=>{const g=armed();g.lifecycle='ACTIVE';h.engine.beginEdit(g,{});dm.afterOperatorCommand(g,'edit_begin',early);h.engine.cancelEdit(g);assert.equal(g.deadman.status,'SATISFIED');assert.equal(dm.tick(g,due),null);});
await test('D15','Completed game never restarted or accepted by scheduler',()=>{for(const lifecycle of ['FINAL_PENDING','LOCKED','READY','FINAL']){const g=armed();g.lifecycle=lifecycle;dm.tick(g,due);assert.equal(g.lifecycle,lifecycle);assert.equal(g.auto,false);}});
await test('D16','Restart/new seed return to UNARMED with separate run',()=>{for(const command of ['restart_same_seed','purge_new_seed']){const g=armed();h.engine.reset(g,command==='purge_new_seed');dm.afterOperatorCommand(g,command,early);assert.equal(g.deadman.status,'UNARMED');assert.equal(dm.tick(g,due),null);}});
await test('D17','15-minute mode preserved; arming does not touch football fields',()=>{const g=armed();g.quarterLengthSeconds=900;g.scoreboardSeconds=900;const old=JSON.stringify([g.rngState,g.possession,g.awayPower,g.homePower]);dm.tick(g,due);assert.equal(g.scoreboardSeconds,900);assert.equal(old,JSON.stringify([g.rngState,g.possession,g.awayPower,g.homePower]).replace('null','null'));});
await test('D18','UTC, past trigger, fractional offset and invalid calendar validation',()=>{assert.equal(Number.isFinite(dm.utcMillis('2026-02-30T12:00:00Z')),false);for(const minutes of [-1,1.5,181,NaN])assert.throws(()=>dm.arm(game(),{basis:'KICKOFF_PLUS',offsetMinutes:minutes},early));assert.throws(()=>dm.arm(game(),config,due));});
await test('D19','Chairman takeover changes ownership without reseeding',()=>{const g=armed();dm.tick(g,due);const rng=JSON.stringify(g.rngState),id=g.runId;dm.afterOperatorCommand(g,'pause',due);assert.equal(g.deadman.controlOwner,'CHAIRMAN');assert.equal(g.deadman.status,'AUTONOMOUS');assert.equal(JSON.stringify(g.rngState),rng);assert.equal(g.runId,id);});
await test('D20','Saturday local date retained across UTC Sunday midnight',()=>{assert.equal(OPERATING_SLATE.length,49);assert.ok(OPERATING_SLATE.every(g=>g.date==='2026-09-26'));assert.ok(OPERATING_SLATE.some(g=>g.kickoffZulu.startsWith('2026-09-27')));assert.equal(OPERATING_SLATE.find(g=>g.id==='G0217').kickoffZulu,'2026-09-27T00:24:00.000Z');});
let session,token;
await test('D21','Full API session creation, public redaction and scheduler auth',async()=>{const r=await h.request('create',{});assert.equal(r.status,201);session=r.body.public_slug;token=r.body.operator_token;const pub=await h.request('read',null,session);assert.equal(pub.body.state.length,49);assert.ok(pub.body.state.every(g=>!g.deadman&&!g.rngState&&!g.seedHex));assert.equal((await h.request('deadman_tick',{},'',token,true)).status,403);});
await test('D22','Bulk ARM applies only selected IDs atomically',async()=>{const ids=OPERATING_SLATE.slice(0,2).map(g=>g.id);let r=await h.request('deadman_batch',{ids,operation:'arm',config,expected_version:1},session,token);assert.equal(r.status,200);assert.equal(r.body.state.filter(g=>g.deadman.status==='ARMED').length,2);const version=r.body.state_version;r=await h.request('deadman_batch',{ids:[ids[0],'NONEXISTENT'],operation:'arm',config,expected_version:version},session,token);assert.equal(r.status,400);assert.equal(h.db.sessions.get(session).state_version,version);});
await test('D23','No browser required: scheduler starts both games once',async()=>{h.clock.ms=Date.parse(due);const r=await h.request('deadman_tick',{},'','test-worker-secret',true);assert.equal(r.status,200);const row=h.db.sessions.get(session);assert.equal(row.state.filter(g=>g.deadman.status==='AUTONOMOUS').length,2);const n=h.db.events.length;await h.request('deadman_tick',{},'','test-worker-secret',true);assert.equal(h.db.events.length,n);});
await test('D24','Read cadence does not write state or generate an extra start',async()=>{const v=h.db.sessions.get(session).state_version;h.clock.ms+=13000;for(let i=0;i<5;i++)await h.request('read',null,session,token);assert.equal(h.db.sessions.get(session).state_version,v);});
await test('D25','Version race rejects stale scheduler and stale Chairman changes',async()=>{const row=h.db.sessions.get(session),g=row.state[2];dm.arm(g,{basis:'TV_START',tvStartZulu:new Date(h.clock.ms+1000).toISOString()},new Date(h.clock.ms).toISOString());h.clock.ms+=2000;h.db.conflict=true;const r=await h.request('deadman_tick',{},'','test-worker-secret',true);assert.equal(r.body.conflicts,1);assert.equal(row.state[2].lifecycle,'UNLAUNCHED');const stale=await h.request('deadman_batch',{ids:[g.id],operation:'disarm',expected_version:row.state_version-1},session,token);assert.equal(stale.status,409);});
await test('D26','Final checkpoint persists once and QA acceptance is denied',async()=>{const row=h.db.sessions.get(session),g=row.state[0];g.quarter=4;g.activePeriod='4';g.period='4th';g.scoreboardSeconds=1;g.scores['4']=[14,0];g.pendingPlay=null;row.last_advanced_at=new Date(h.clock.ms).toISOString();h.clock.ms+=60000;await h.request('deadman_tick',{},'','test-worker-secret',true);assert.equal(row.state[0].lifecycle,'FINAL_PENDING');const r=await h.request('command',{id:g.id,command:'accept',expected_version:row.state_version},session,token);assert.equal(r.status,403);});
function football(g){const clone=structuredClone(g);for(const k of ['deadman','createdRunAt','launchedAt','completedAt'])delete clone[k];clone.history=clone.history.map(({masterZulu,...r})=>r);return JSON.parse(JSON.stringify(clone));}
const baseline=harness('supabase/functions/gamecast-week5-v4-3-2-1/index.ts');
let pairs=0;
await test('F01','147 paired full games: inherited manual vs scheduled candidate',()=>{for(const row of OPERATING_SLATE)for(let i=1;i<=3;i++){
  const b=baseline.engine.initialGame(row);b.seedHex='PAIR-'+row.id+'-'+i;b.rngState=baseline.engine.seedWords(b.seedHex,row.id);
  const g=structuredClone(b);g.deadman=dm.freshDeadman();dm.arm(g,{basis:'KICKOFF'},early);dm.tick(g,row.kickoffZulu);
  b.lifecycle='ACTIVE';b.activity='LIVE';b.auto=true;b.seedLocked=true;b.launchedAt=row.kickoffZulu;b.lastPlay='Opening kickoff ready';
  baseline.engine.advanceGame(b,18000);h.engine.advanceGame(g,18000);
  assert.equal(g.lifecycle,'FINAL_PENDING');assert.deepEqual(football(g),football(b));pairs++;
}});
await test('F02','49 full-game poll/chunk comparisons: 1-second vs 37-second',()=>{for(const row of OPERATING_SLATE){const a=h.engine.initialGame(row);a.seedHex='CHUNK-'+row.id;a.rngState=h.engine.seedWords(a.seedHex,row.id);a.lifecycle='ACTIVE';a.auto=true;const b=structuredClone(a);for(let i=0;i<18000;i++)h.engine.advanceGame(a,1);for(let i=0;i<18000;){const n=Math.min(37,18000-i);h.engine.advanceGame(b,n);i+=n;}assert.deepEqual(football(a),football(b));}});
await test('F03','49 equal-synthetic-time 1x/50x comparisons',()=>{for(const row of OPERATING_SLATE){const a=h.engine.initialGame(row);a.seedHex='SPEED-'+row.id;a.rngState=h.engine.seedWords(a.seedHex,row.id);a.lifecycle='ACTIVE';a.auto=true;a.speed=1;const b=structuredClone(a);b.speed=50;const x=h.engine.project([a],18000)[0],y=h.engine.project([b],360)[0];y.speed=1;assert.deepEqual(football(x),football(y));}});
await test('F04','GL continues through Pause/Edit/Delay while football/RNG freeze',()=>{for(const mode of ['operatorPaused','editing','delayed']){const g=game();g.lifecycle='ACTIVE';g.auto=false;g[mode]=true;const rng=JSON.stringify(g.rngState);h.engine.advanceGame(g,90);assert.equal(g.glSeconds,90);assert.equal(g.scoreboardSeconds,600);assert.equal(JSON.stringify(g.rngState),rng);}});
fs.mkdirSync('v4322-evidence',{recursive:true});fs.writeFileSync('v4322-evidence/tests.json',JSON.stringify({results,expected:30,actual:results.length,pairedGames:pairs},null,2));
assert.equal(results.length,30);console.log(JSON.stringify({passed:results.length,pairedGames:pairs}));
