import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {createRuntime} from './runtime.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
const copy=x=>JSON.parse(JSON.stringify(x)),checks=[];
const pass=id=>{checks.push({id,status:'PASS'});console.log('PASS '+id);};
let instant=Date.parse('2026-09-23T00:00:00Z');
class Clock extends Date{constructor(...a){super(...(a.length?a:[instant]));}static now(){return instant;}}
const event=(result,extra={})=>({kind:'try',result,duration:5,...extra});
function setup(events){
 const provider=g=>g.ot.number<3?(g.ot.phase==='SERIES'?{kind:'run',yards:25,duration:1}:event('success',{duration:1})):events[g.ot.eventIndex-8];
 const rt=createRuntime({receiver:true,otModel:true,otFixture:provider,clock:Clock}),e=rt.inspect,g=e.initialGame(OPERATING_SLATE[0]);
 Object.assign(g,{seedHex:'OT3-RETURN-QA',lifecycle:'ACTIVE',auto:true,quarter:4,activePeriod:'4',period:'4th',scoreboardSeconds:1,pendingPlay:{team:0,phase:'PLAY',remaining:1,playSec:1,clockBefore:1,desc:'Incomplete pass',yards:0,points:0,turnover:false,punt:false,fg:false,first:false,inBounds:false,incomplete:true,strategy:'NORMAL',edgeAtSnap:0,deadSec:0,runoffSec:0}});
 g.receiptSeed=g.seedHex;g.openingReceiver=0;g.secondHalfReceiver=1;g.possession=0;g.rngState=e.seedWords(g.seedHex,g.id);e.advanceGame(g,1209);assert.equal(g.ot.number,3);assert.equal(g.ot.phase,'TRY');return {rt,e,g,provider};
}
const app=fs.readFileSync(new URL('../public/v4.3.1/app.js',import.meta.url),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b));
const ui=vm.runInNewContext(section('const esc=','function anchorMaster')+section('function periods(','function visible(')+section('function ds(','function scoreBtns(')+section('function finalCtl(','function edit(')+';({ds,line,finalCtl})');
function display(g,final=false){assert.equal(ui.ds(g),final?'FINAL':g.period);assert.equal(ui.finalCtl(g).includes('LOCK RESULT'),final);const html=ui.line(g);assert.ok(html.includes('<td>'+Object.values(g.scores).reduce((n,s)=>n+s[0],0)+'</td>'));}
{
 const {e,g}=setup([event('defensive_return'),event('fail')]),first=g.possession,gl=g.glSeconds,rng=copy(g.rngState),top=copy(g.teamTopSeconds);
 e.advanceGame(g,4);assert.equal(g.ot.completed,0);assert.deepEqual(copy(g.scores['3OT']),[0,0]);
 e.advanceGame(g,1);assert.equal(g.scores['3OT'][1-first],2);assert.equal(g.lifecycle,'ACTIVE');assert.equal(g.ot.completed,1);assert.equal(g.possession,1-first);assert.equal(g.fieldPos,97);assert.equal(g.glSeconds,gl+5);assert.equal(g.scoreboardSeconds,0);assert.deepEqual(copy(g.rngState),rng);assert.deepEqual(copy(g.teamTopSeconds),top);display(g);
 e.advanceGame(g,5);assert.equal(g.lifecycle,'FINAL_PENDING');display(g,true);pass('FIRST_RETURN_ANSWER_REQUIRED');
}
{
 const {e,g}=setup([event('fail'),event('defensive_return')]),first=g.possession;e.advanceGame(g,10);assert.equal(g.lifecycle,'FINAL_PENDING');assert.equal(g.ot.completed,2);assert.equal(g.scores['3OT'][first],2);display(g,true);pass('SECOND_RETURN_WINS');
}
{
 const {e,g}=setup([event('defensive_return'),event('defensive_return')]);e.advanceGame(g,10);assert.deepEqual(copy(g.scores['3OT']),[2,2]);assert.equal(g.lifecycle,'ACTIVE');assert.equal(g.ot.number,4);assert.equal(g.ot.completed,0);assert.equal(g.breakSeconds,90);display(g);pass('SECOND_RETURN_TIES');
}
{
 for(const first of [true,false]){const events=first?[event('defensive_return',{foul:'RETURN_TEAM_LIVE_BALL'}),event('fail')]:[event('fail'),event('defensive_return',{foul:'RETURN_TEAM_LIVE_BALL'})];const {e,g}=setup(events);e.advanceGame(g,first?4:9);assert.equal(g.ot.completed,first?0:1);assert.deepEqual(copy(g.scores['3OT']),[0,0]);e.advanceGame(g,1);assert.equal(g.lifecycle,'ACTIVE');assert.deepEqual(copy(g.scores['3OT']),[0,0]);assert.equal(g.ot.number,first?3:4);assert.equal(g.ot.completed,first?1:0);}
 pass('RETURN_NULLIFIED_BY_FOUL');
 const {e,g}=setup([{kind:'penalty',code:'DEF_ENDZONE',duration:5},event('defensive_return')]);e.advanceGame(g,5);assert.equal(g.ot.completed,0);assert.equal(g.fieldPos,98.5);assert.deepEqual(copy(g.scores['3OT']),[0,0]);e.advanceGame(g,5);assert.equal(g.ot.completed,1);assert.equal(g.lifecycle,'ACTIVE');pass('RETRY_BEFORE_COMPLETION');
 const s=setup([event('defensive_return',{foul:'UNKNOWN'})]);s.e.advanceGame(s.g,5);assert.match(s.g.ot.blocked,/Unsupported try foul/);assert.equal(s.g.ot.completed,0);assert.deepEqual(copy(s.g.scores['3OT']),[0,0]);pass('UNRESOLVED_FOUL_BLOCKS');
}
{
 const events=[event('defensive_return'),event('defensive_return'),event('success'),event('fail')];
 const normalize=g=>{const x=copy(g);delete x.runId;delete x.createdRunAt;for(const h of x.history)delete h.eventId;return x;};
 const a=setup(events),b=setup(events);for(let n=0;n<110;n++)a.e.advanceGame(a.g,1);for(let n=0;n<8;n++)b.e.advanceGame(b.g,13);b.e.advanceGame(b.g,6);assert.deepEqual(normalize(a.g),normalize(b.g));assert.equal(a.g.lifecycle,'FINAL_PENDING');
 const c=setup(events),d=setup(events);let slow=c.g,fast=d.g;fast.speed=50;for(let n=0;n<3;n++){slow=c.e.project([slow],50)[0];fast=d.e.project([fast],1)[0];const f=copy(fast);f.speed=1;assert.deepEqual(normalize(slow),normalize(f));}
 const p=setup(events),gl=p.g.glSeconds;p.e.advanceGame(p.g,2);p.g.operatorPaused=true;p.e.advanceGame(p.g,30);assert.equal(p.g.glSeconds,gl+32);assert.equal(p.g.ot.pending.remaining,3);assert.equal(p.g.ot.completed,0);p.g.operatorPaused=false;p.e.advanceGame(p.g,3);assert.equal(p.g.ot.completed,1);pass('REPLAY_CHUNKS_SPEED_PAUSE_GL');
}
{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ot3-return-')),file=pathToFileURL(path.join(dir,'sessions.json'));
 try{
 const s=setup([event('defensive_return'),event('defensive_return')]);
 const runtime=()=>createRuntime({receiver:true,otModel:true,otFixture:s.provider,clock:Clock,file});let rt=runtime();
 async function api(action,slug='',token='',body){const r=await rt.handle(new Request('http://localhost/sandbox/api?api='+action+'&session='+slug,{method:body?'POST':'GET',headers:{'x-operator-token':token},...(body?{body:JSON.stringify(body)}:{})}));assert.equal(r.status,action==='create'?201:200);return r.json();}
 const c=await api('create','','',{}),db=rt.snapshot();db.sessions[c.public_slug].state[0]=copy(s.g);fs.writeFileSync(file,JSON.stringify(db));rt=runtime();
 instant+=5000;const first=(await api('read',c.public_slug,c.operator_token)).state[0];assert.equal(first.lifecycle,'ACTIVE');assert.equal(first.ot.completed,1);display(first);
 rt=runtime();assert.deepEqual((await api('read',c.public_slug,c.operator_token)).state[0],first);
 const pub=(await api('read',c.public_slug)).state[0];display(pub);assert.equal(pub.displayStatus,'3OT');assert.equal('pending' in pub.ot,false);
 instant+=2000;const partial=(await api('read',c.public_slug,c.operator_token)).state[0];assert.equal(partial.ot.pending.remaining,3);rt=runtime();assert.deepEqual((await api('read',c.public_slug,c.operator_token)).state[0],partial);
 instant+=3000;const tied=(await api('read',c.public_slug,c.operator_token)).state[0];assert.deepEqual(tied.scores['3OT'],[2,2]);assert.equal(tied.ot.number,4);assert.equal(tied.glSeconds,first.glSeconds+5);rt=runtime();assert.deepEqual((await api('read',c.public_slug,c.operator_token)).state[0],tied);display((await api('read',c.public_slug)).state[0]);pass('PERSISTENCE_EXACTLY_ONCE_CHAIRMAN_PUBLIC');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
fs.writeFileSync(new URL('./evidence/ot3-return-results.json',import.meta.url),JSON.stringify({qaOnly:true,official:false,testedAt:new Date().toISOString(),checks,limitations:['Local fixture-driven runtime only','UI source helpers tested; no browser or deployed OT runtime test','No stochastic OT model or general foul adjudicator']},null,2)+'\n');
