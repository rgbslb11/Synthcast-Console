import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRuntime} from './runtime.mjs';
import {receivingChoice} from './receiver.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
let instant=Date.parse('2026-09-18T00:00:00Z');
class Clock extends Date{constructor(...a){super(...(a.length?a:[instant]));}static now(){return instant;}}
const provider=g=>g.ot.phase==='SERIES'?{kind:'run',yards:25,duration:5}:{kind:'try',result:g.ot.number>=3&&g.ot.completed===1?'fail':'success',duration:3};
const old=createRuntime({receiver:true,clock:Clock}).inspect;
const e=createRuntime({receiver:true,otModel:true,otFixture:provider,clock:Clock}).inspect;
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(engine,i){const g=engine.initialGame(OPERATING_SLATE[i]);g.seedHex='OT-integration-'+i;g.receiptSeed=g.seedHex;g.rngState=engine.seedWords(g.seedHex,g.id);g.openingReceiver=receivingChoice(g.seedHex,g.id);g.secondHalfReceiver=1-g.openingReceiver;g.possession=g.openingReceiver;g.lifecycle='ACTIVE';g.auto=true;return g;}
let naturalOT=0;
for(let i=0;i<55;i++){
 const a=fixture(old,i),b=fixture(e,i);
 for(let n=0;n<3000;n++){
  old.advanceGame(a,13);e.advanceGame(b,13);
  assert.deepEqual(copy(a.history.filter(h=>!String(h.period).includes('OT'))),copy(b.history.filter(h=>!String(h.period).includes('OT'))));
  assert.deepEqual(copy(a.rngState),copy(b.rngState));assert.deepEqual(copy(a.teamTopSeconds),copy(b.teamTopSeconds));
  if(b.ot){naturalOT++;break;}
  assert.equal(b.glSeconds,a.glSeconds);assert.deepEqual(copy(a.scores),copy(b.scores));
  if(b.lifecycle==='FINAL_PENDING'){assert.equal(a.lifecycle,b.lifecycle);break;}
  if(n===2999)assert.fail('regulation did not finish');
 }
}
console.log('PASS 55 regulation trajectories unchanged through final/OT entry; natural OT count '+naturalOT);
// Persist a synthetic QA fixture through the real local RPC adapter/API.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ot-integration-')),file=pathToFileURL(path.join(dir,'sessions.json'));
let rt=createRuntime({receiver:true,otModel:true,otFixture:provider,clock:Clock,file});
async function api(action,slug='',token='',body){const r=await rt.handle(new Request('http://localhost/sandbox/api?api='+action+'&session='+slug,{method:body?'POST':'GET',headers:{'x-operator-token':token},...(body?{body:JSON.stringify(body)}:{})}));return {status:r.status,body:await r.json()};}
const session=(await api('create','','',{})).body,slug=session.public_slug,token=session.operator_token;
const db=rt.snapshot(),g=db.sessions[slug].state[0];
Object.assign(g,{lifecycle:'ACTIVE',auto:true,quarter:4,period:'4th',activePeriod:'4',scoreboardSeconds:1,pendingPlay:{team:0,phase:'PLAY',remaining:1,playSec:1,clockBefore:1,desc:'Incomplete pass',yards:0,points:0,turnover:false,punt:false,fg:false,first:false,inBounds:false,incomplete:true,strategy:'NORMAL',edgeAtSnap:0,deadSec:0,runoffSec:0}});
// Only a newly created temporary fixture is edited, never a running session file.
fs.writeFileSync(file,JSON.stringify(db));rt=createRuntime({receiver:true,otModel:true,otFixture:provider,clock:Clock,file});
instant+=602000;let state=(await api('read',slug,token)).body;assert.equal(state.state[0].ot.pending.remaining,4);
const before=copy(state.state[0]);rt=createRuntime({receiver:true,otModel:true,otFixture:provider,clock:Clock,file});assert.deepEqual(copy((await api('read',slug,token)).body.state[0]),before);
const pub=(await api('read',slug)).body.state[0];for(const k of ['toss','pending','eventIndex','sequence'])assert.equal(k in pub.ot,false);assert.equal('history' in pub,false);assert.equal('seedHex' in pub,false);
instant+=4000;state=(await api('read',slug,token)).body;assert.equal(state.state[0].ot.phase,'TRY');assert.equal(state.state[0].ot.eventIndex,1);assert.equal(state.state[0].history.filter(h=>h.kind==='run').length,1);
const beforeHold=state.state[0];let r=await api('command',slug,token,{command:'pause',id:g.id,expected_version:state.state_version});assert.equal(r.status,200);instant+=10000;state=(await api('read',slug,token)).body;assert.equal(state.state[0].glSeconds,beforeHold.glSeconds+10);assert.equal(state.state[0].ot.eventIndex,1);assert.equal(state.master_zulu,new Clock().toISOString());
const snap=JSON.stringify(rt.snapshot());const denied=await api('command',slug,token,{command:'accept',id:g.id,expected_version:state.state_version});assert.equal(denied.status,403);assert.equal(JSON.stringify(rt.snapshot()),snap);
for(const command of ['score','clock_set','edit_begin','reopen_live']){const blocked=await api('command',slug,token,{command,id:g.id,expected_version:state.state_version,payload:{team:0,points:7,seconds:60}});assert.equal(blocked.status,409);assert.match(blocked.body.error,/OT checkpoint/);assert.equal(JSON.stringify(rt.snapshot()),snap);}
fs.rmSync(dir,{recursive:true});
console.log('PASS active OT API persistence/reload mid-play, exactly-once completion, public redaction, three-clock pause and acceptance denial');
fs.writeFileSync(new URL('./evidence/overtime-integration-results.json',import.meta.url),JSON.stringify({qaOnly:true,official:false,candidate:'OTMODEL1',testedAt:new Date().toISOString(),games:55,naturalOT,checks:[{id:'REGULATION_55',status:'PASS',detail:'Identical regulation trajectory at 13-second checkpoints through Final/OT entry'},{id:'OT_API',status:'PASS',detail:'Mid-play persistence reload, exactly-once completion, private OT redaction, GL/Master/scoreboard pause, publication denial and unsupported correction rejection without persistence mutation'}]},null,2)+'\n');
