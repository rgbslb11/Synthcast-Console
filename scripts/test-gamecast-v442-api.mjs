import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {requestHandler} from './lib/gamecast-v442-harness.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week7-v4-4-2/week7.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week7-v4-4-2/power.ts';
const source=fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8');
let clock=Date.parse('2026-10-06T22:00:00Z'),db=null,events=[],calls=[],cases=[];
class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
const clone=x=>structuredClone(x),hash=s=>createHash('sha256').update(s).digest('hex');
const client={rpc:async(name,p)=>{
 calls.push(name);assert.ok(name.startsWith('gamecast_v442_')||['gamecast_v12_create_session','gamecast_v12_read_session'].includes(name),'Cross-release write RPC');
 if(name==='gamecast_v12_create_session'){db={session_id:'fixture-session',public_slug:p.p_public_slug,operator_token_hash:p.p_operator_token_hash,week_key:p.p_week_key,engine_version:p.p_engine_version,data_version:p.p_data_version,state:clone(p.p_state),state_version:1,last_advanced_at:new Clock().toISOString()};return{data:[{public_slug:db.public_slug,state_version:1}],error:null};}
 if(name==='gamecast_v12_read_session')return{data:db&&db.public_slug===p.p_slug?[clone(db)]:[],error:null};
 if(name==='gamecast_v442_commit'){
  if(p.p_expected_version!==db.state_version)return{data:[],error:null};
  db.state=clone(p.p_state);db.state_version++;db.last_advanced_at=p.p_stamp;events.push(...clone(p.p_events));return{data:[{state:clone(db.state),state_version:db.state_version,last_advanced_at:db.last_advanced_at}],error:null};
 }
 if(name==='gamecast_v442_scheduler_auth')return{data:p.p_hash===hash('fixture-scheduler'),error:null};
 if(name==='gamecast_v442_scheduler_sessions')return{data:[{public_slug:db.public_slug}],error:null};
 throw Error('Unexpected RPC '+name);
}};
const handle=requestHandler(source,client,{Date:Clock,TEAM_POWER,OPERATING_SLATE});
async function request(action,{token='',body,slug=db?.public_slug||'',scheduler=''}={}){
 const r=await handle(new Request('https://fixture.invalid/functions/v1/gamecast-week7-v4-4-2?api='+action+(slug?'&session='+slug:''),{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{'x-operator-token':token}:{}),...(scheduler?{'x-deadman-scheduler':scheduler}:{})},body:body?JSON.stringify(body):undefined}));return{status:r.status,body:await r.json()};
}
async function check(name,fn){await fn();cases.push({name,status:'PASS'});}
let token;
await check('create isolated QA W7 state',async()=>{const r=await request('create',{body:{}});assert.equal(r.status,201);token=r.body.operator_token;assert.match(db.public_slug,/^w7v442-/);assert.equal(db.state.length,54);assert.ok(db.state.every(g=>g.qaOnly&&g.lifecycle==='UNLAUNCHED'&&g.coinToss===null));});
const id=db.state[0].id;
const command=(command,payload={},expected=db.state_version)=>request('command',{token,body:{id,command,payload,expected_version:expected}});
await check('Chairman token enforced',async()=>{const r=await request('command',{token:'fixture-wrong',body:{id,command:'launch',expected_version:db.state_version}});assert.equal(r.status,403);assert.equal(events.length,0);});
await check('earlier release namespace rejected',async()=>assert.equal((await request('read',{slug:'w6v441-fixture'})).status,404));
await check('launch persists one toss',async()=>{assert.equal((await command('launch')).status,200);assert.equal(db.state[0].coinTossAudit.length,1);assert.ok(events[0].payload.coinToss);});
await check('retry cannot commit a second toss',async()=>{const before=JSON.stringify(db),count=events.length;assert.equal((await command('launch',{},1)).status,409);assert.equal(JSON.stringify(db),before);assert.equal(events.length,count);});
await check('public response excludes private fields',async()=>{const r=await request('read');assert.equal(r.status,200);const g=r.body.state[0];for(const k of ['seedHex','rngState','history','deadman','coinTossAudit'])assert.ok(!(k in g));assert.ok(!('seedHex' in g.coinToss));assert.ok(!('operator_token' in r.body));});
await check('20x control accepted in AUTO',async()=>{assert.equal((await command('auto')).status,200);assert.equal((await command('speed',{speed:20})).status,200);});
await check('GET polling never calls commit or changes stored state/events',async()=>{
 const before=JSON.stringify(db),eventCount=events.length;calls=[];
 for(let i=0;i<100;i++){clock+=1000;assert.equal((await request('read')).status,200);}
 assert.equal(calls.length,100);assert.ok(calls.every(n=>n==='gamecast_v12_read_session'));assert.equal(JSON.stringify(db),before);assert.equal(events.length,eventCount);
});
await check('pause and resume preserve pending situation',async()=>{
 assert.equal((await command('pause')).status,200);const before=clone(db.state[0]);clock+=100000;
 const paused=(await request('read',{token})).body.state[0];
 for(const key of ['pendingPlay','rngState','scoreboardSeconds','scores','possession','down','distance','fieldPos','coinToss'])assert.equal(JSON.stringify(paused[key]),JSON.stringify(before[key]));
 assert.equal((await command('pause')).status,200);assert.equal(JSON.stringify(db.state[0].pendingPlay),JSON.stringify(before.pendingPlay));
});
await check('delay/resume and edit/cancel retain toss',async()=>{
 const toss=JSON.stringify(db.state[0].coinToss);for(const c of ['delay','resume_delay','edit_begin','edit_cancel']){assert.equal((await command(c)).status,200);assert.equal(JSON.stringify(db.state[0].coinToss),toss);}
});
await check('QA final cannot be accepted',async()=>{Object.assign(db.state[0],{lifecycle:'LOCKED',locked:true,auto:false});const v=db.state_version;assert.equal((await command('accept',{confirmed:true})).status,403);assert.equal(db.state_version,v);assert.equal(db.state[0].lifecycle,'LOCKED');});
await check('same-seed restart reproduces toss',async()=>{
 const toss={...db.state[0].coinToss};delete toss.runId;assert.equal((await command('restart_same_seed',{confirmed:true})).status,200);assert.equal(db.state[0].coinToss,null);assert.equal((await command('launch')).status,200);const next={...db.state[0].coinToss};delete next.runId;assert.deepEqual(next,toss);
});
await check('scheduler authorization enforced',async()=>assert.equal((await request('deadman_tick',{body:{},scheduler:'wrong-fixture'})).status,403));
await check('Dead-Man launch commits its toss once',async()=>{
 const id2=db.state[1].id;db.state[1].kickoffZulu=new Clock(clock+60000).toISOString();
 assert.equal((await request('deadman_batch',{token,body:{ids:[id2],operation:'arm',config:{basis:'KICKOFF'},expected_version:db.state_version}})).status,200);
 clock+=61000;assert.equal((await request('deadman_tick',{body:{},scheduler:'fixture-scheduler'})).status,200);
 assert.equal(db.state[1].coinTossAudit.length,1);assert.equal(db.state[1].lifecycle,'ACTIVE');assert.ok(events.some(e=>e.type==='V442_DEADMAN_AUTONOMOUS_LAUNCH'&&e.payload.coinToss));
 const count=events.length;assert.equal((await request('deadman_tick',{body:{},scheduler:'fixture-scheduler'})).status,200);assert.equal(db.state[1].coinTossAudit.length,1);assert.equal(events.length,count);
});
const report={classification:'TEST RESULT',scope:'Actual request handler with in-memory RPC double; not cloud persistence proof',executed:cases.length,passed:cases.length,failed:0,skipped:0,readOnlyPolls:100,cases};
fs.writeFileSync('outputs/v442/api-local.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
