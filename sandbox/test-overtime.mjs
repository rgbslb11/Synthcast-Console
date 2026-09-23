import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRuntime} from './runtime.mjs';
import {overtimeChoice} from './overtime.mjs';
import {receivingChoice} from './receiver.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
const checks=[];const pass=(id,detail)=>{checks.push({id,status:'PASS',detail});console.log('PASS '+id+' '+detail);};
let instant=Date.parse('2026-09-18T00:00:00Z');
class Clock extends Date {constructor(...a){super(...(a.length?a:[instant]));}static now(){return instant;}}
const copy=x=>JSON.parse(JSON.stringify(x));
function lastSnap(g){Object.assign(g,{lifecycle:'ACTIVE',auto:true,quarter:4,activePeriod:'4',period:'4th',scoreboardSeconds:1,pendingPlay:{team:0,phase:'PLAY',remaining:1,playSec:1,clockBefore:1,desc:'Incomplete pass',yards:0,points:0,turnover:false,punt:false,fg:false,first:false,inBounds:false,incomplete:true,strategy:'NORMAL',edgeAtSnap:0,deadSec:0,runoffSec:0}});return g;}
function setup(provider){const queue=[];const rt=createRuntime({receiver:true,otModel:true,clock:Clock,otFixture:provider??(g=>queue[g.ot.eventIndex])});const e=rt.inspect,g=lastSnap(e.initialGame(OPERATING_SLATE[0]));g.seedHex='QA_ONLY-OTMODEL';g.receiptSeed=g.seedHex;g.openingReceiver=receivingChoice(g.seedHex,g.id);g.secondHalfReceiver=1-g.openingReceiver;g.possession=g.openingReceiver;g.rngState=e.seedWords(g.seedHex,g.id);e.advanceGame(g,1);return {rt,e,g,queue,ready(){e.advanceGame(g,g.breakSeconds);},play(p){queue.push({duration:1,...p});e.advanceGame(g,p.duration??1);}};}
let winners=[0,0],defense=0;for(let i=0;i<10000;i++){const a=overtimeChoice('QA-'+i,'G0120');assert.deepEqual(a,overtimeChoice('QA-'+i,'G0120'));winners[a.winner]++;if(a.defenseFirst)defense++;}assert.ok(winners.every(n=>n>4800&&n<5200));assert.ok(defense>9400&&defense<9600);pass('O01','10,000 seeded tosses; both winners and 95% defense choice within sample bounds');
{
 const s=setup(),rng=copy(s.g.rngState),top=copy(s.g.teamTopSeconds);assert.equal(s.g.breakSeconds,600);s.e.advanceGame(s.g,599);assert.equal(s.g.breakSeconds,1);assert.deepEqual(copy(s.g.rngState),rng);s.e.advanceGame(s.g,1);assert.equal(s.g.fieldPos,75);assert.equal(s.g.down,1);assert.equal(s.g.distance,10);assert.equal(s.g.ot.phase,'SERIES');assert.equal(s.g.scoreboardSeconds,0);assert.deepEqual(copy(s.g.teamTopSeconds),top);pass('O02','600-second boundary -> OPP25 first-and-10; untimed OT/TOP unchanged');
}
function touchdown(s){s.play({kind:'run',yards:25});}
function tryGood(s){s.play({kind:'try',result:'success'});}
function tiedPeriod(s){touchdown(s);tryGood(s);touchdown(s);tryGood(s);}
{
 const s=setup();s.ready();const first=s.g.possession;touchdown(s);assert.equal(s.g.ot.tryValue,1);tryGood(s);assert.equal(s.g.possession,1-first);touchdown(s);assert.equal(s.g.ot.tryValue,1);tryGood(s);assert.equal(s.g.breakSeconds,300);assert.equal(s.g.ot.number,2);assert.equal(s.g.ot.first,1-first);pass('O03','OT1 full series, separate PAT, both opportunities and tied 5-minute break');
 s.ready();touchdown(s);assert.equal(s.g.ot.tryValue,2);tryGood(s);touchdown(s);assert.equal(s.g.ot.tryValue,2);tryGood(s);assert.equal(s.g.breakSeconds,300);assert.equal(s.g.ot.number,3);pass('O04','OT2 reverses order, requires two-point tries, tied 5-minute break');
 s.ready();assert.equal(s.g.fieldPos,97);const plays=copy(s.g.teamPlayCount);tryGood(s);tryGood(s);assert.equal(s.g.breakSeconds,90);assert.equal(s.g.ot.number,4);s.ready();s.play({kind:'try',result:'fail'});s.play({kind:'try',result:'fail'});assert.equal(s.g.breakSeconds,90);s.ready();tryGood(s);s.play({kind:'try',result:'fail'});assert.equal(s.g.lifecycle,'FINAL_PENDING');assert.equal(s.g.breakSeconds,0);assert.deepEqual(copy(s.g.teamPlayCount),plays);pass('O05','OPP3, matched success/failure extends, unmatched ends, 90-second breaks, tries excluded from play counts');
}
{
 const s=setup();s.ready();s.play({kind:'defensive_td'});assert.equal(s.g.lifecycle,'FINAL_PENDING');
 const b=setup();b.ready();touchdown(b);b.play({kind:'try',result:'defensive_return'});assert.equal(b.g.lifecycle,'ACTIVE');assert.equal(b.g.ot.completed,1);
 const c=setup();c.ready();tiedPeriod(c);c.ready();touchdown(c);c.play({kind:'try',result:'defensive_return'});assert.equal(c.g.lifecycle,'ACTIVE');assert.equal(c.g.ot.completed,1);
 const d=setup();d.ready();tiedPeriod(d);d.ready();tiedPeriod(d);d.ready();d.play({kind:'try',result:'defensive_return'});assert.equal(d.g.lifecycle,'ACTIVE');assert.equal(d.g.ot.completed,1);pass('O06','Ordinary defensive TD ends; try returns in OT1/OT2/OT3 preserve the scheduled answering opportunity');
}
{
 const s=setup();s.ready();s.play({kind:'timeout',team:0,duration:30});assert.equal(s.g.ot.timeouts[0],0);tiedPeriod(s);s.ready();assert.equal(s.g.ot.timeouts[0],0);tiedPeriod(s);s.ready();assert.deepEqual(copy(s.g.ot.timeouts),[1,1]);s.play({kind:'timeout',team:0,duration:30});tryGood(s);tryGood(s);s.ready();assert.equal(s.g.ot.timeouts[0],0);s.play({kind:'timeout',team:0,duration:30});assert.match(s.g.ot.blocked,/exhausted/);pass('O07-PROVISIONAL','30 seconds; proposed shared pools/no stacking/exhaustion verified, policy confirmation still pending');
}
function third(){const s=setup();s.ready();tiedPeriod(s);s.ready();tiedPeriod(s);s.ready();return s;}
{
 const s=third();s.play({kind:'penalty',code:'DEF_ENDZONE'});assert.equal(s.g.fieldPos,98.5);s.play({kind:'penalty',code:'DEF_ENDZONE'});assert.equal(s.g.fieldPos,99.25);
 const d=third();d.play({kind:'penalty',code:'OFF_DEADBALL'});assert.equal(d.g.fieldPos,82);assert.equal(d.g.ot.completed,0);
 const a=third(),scores=copy(a.g.scores);a.play({kind:'penalty',code:'OFF_LIVE',success:true,yards:10});assert.deepEqual(copy(a.g.scores),scores);assert.equal(a.g.fieldPos,87);assert.equal(a.g.ot.completed,0);a.play({kind:'penalty',code:'OFF_LIVE',success:false,yards:10});assert.equal(a.g.ot.completed,1);
 const o=third(),before=copy(o.g.scores);o.play({kind:'penalty',code:'OFFSETTING'});assert.match(o.g.ot.blocked,/Unsupported penalty/);assert.deepEqual(copy(o.g.scores),before);pass('O08-SUBSET','Half-distance fractions, OPP18 dead-ball, successful foul replay/failed foul decline; unresolved offsetting blocks');
}
{
 const s=third();tryGood(s);const before=copy(s.g.scores);s.play({kind:'penalty',code:'OFF_LIVE',success:true,yards:15});assert.equal(s.g.lifecycle,'ACTIVE');assert.deepEqual(copy(s.g.scores),before);s.play({kind:'try',result:'fail'});assert.equal(s.g.lifecycle,'FINAL_PENDING');assert.equal(s.g.breakSeconds,0);
 const t=setup();t.ready();t.play({kind:'turnover'});touchdown(t);assert.equal(t.g.lifecycle,'FINAL_PENDING');assert.equal(t.g.ot.tryValue,null);pass('O09','Nullified answering success does not end game; losing retry ends; winning answering TD skips unnecessary try');
}
{
 const s=setup();s.ready();const before=JSON.stringify(s.g);assert.throws(()=>s.e.beginEdit(s.g,{}),/OT checkpoint/);assert.equal(JSON.stringify(s.g),before);s.e.reset(s.g,false);assert.equal('ot' in s.g,false);pass('O10-GUARD','OT edits fail before mutation until checkpoint support exists; restart clears OT state');
}
{
 const provider=g=>g.ot.phase==='SERIES'?{kind:'run',yards:25,duration:5}:{kind:'try',result:g.ot.number>=3&&g.ot.completed===1?'fail':'success',duration:3};
 const a=setup(provider),b=setup(provider);for(let n=0;a.g.lifecycle!=='FINAL_PENDING'&&n<5000;n++)a.e.advanceGame(a.g,1);for(let n=0;b.g.lifecycle!=='FINAL_PENDING'&&n<500;n++)b.e.advanceGame(b.g,13);
 const norm=g=>{const x=copy(g);delete x.runId;delete x.createdRunAt;for(const h of x.history)delete h.eventId;return x;};
 assert.deepEqual(norm(a.g),norm(b.g));const c=setup(provider),d=setup(provider);let slow=c.g,fast=d.g;fast.speed=50;for(let n=0;slow.lifecycle!=='FINAL_PENDING'&&n<500;n++){slow=c.e.project([slow],50)[0];fast=d.e.project([fast],1)[0];const f=copy(fast);f.speed=1;assert.deepEqual(norm(slow),norm(f));}assert.equal(slow.lifecycle,'FINAL_PENDING');
 const frozen=setup();frozen.g.operatorPaused=true;const rng=copy(frozen.g.rngState);frozen.e.advanceGame(frozen.g,17);assert.equal(frozen.g.breakSeconds,600);assert.equal(frozen.g.glSeconds,18);assert.deepEqual(copy(frozen.g.rngState),rng);pass('REPLAY_CLOCKS','Full scripted OT 1s/13s and 1x/50x invariance; Pause freezes break/RNG while GL runs');
}
{
 const rt=createRuntime({receiver:true,otModel:true,clock:Clock}),g=lastSnap(rt.inspect.initialGame(OPERATING_SLATE[0]));rt.inspect.advanceGame(g,602);assert.equal(g.ot.phase,'SERIES');assert.match(g.ot.blocked,/unavailable/);assert.equal(g.auto,false);assert.deepEqual(copy(g.scores.OT),[0,0]);pass('NO_MODEL','Without fixture/model, block at first opportunity; never invent scores or probabilities');
}
{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'otmodel-qa-')),file=pathToFileURL(path.join(dir,'sessions.json'));
 const rt=createRuntime({receiver:true,otModel:true,clock:Clock,file});
 const api=async(action,slug='',token='',body)=>{const r=await rt.handle(new Request('http://localhost/sandbox/api?api='+action+'&session='+slug,{method:body?'POST':'GET',headers:{'x-operator-token':token},...(body?{body:JSON.stringify(body)}:{})}));return {status:r.status,body:await r.json()};};
 const c=(await api('create','','',{})).body;assert.match(c.public_slug,/^qa-otmodel1-/);const state=(await api('read',c.public_slug,c.operator_token)).body;const g=lastSnap(state.state[0]);rt.inspect.advanceGame(g,601);
 // Persistence adapter tested independently by reload; active OT serialization by pure clone/replay above.
 assert.deepEqual(createRuntime({receiver:true,otModel:true,clock:Clock,file}).snapshot(),rt.snapshot());assert.throws(()=>createRuntime({receiver:true,file}),/Foreign session/);
 assert.equal((await api('publish',c.public_slug,c.operator_token,{})).status,403);assert.equal((await api('read','w4v431-0000000000000000')).status,403);
 assert.deepEqual(Array.from(rt.networkCapabilities),['undefined','undefined','undefined','undefined']);fs.rmSync(dir,{recursive:true});pass('ISOLATION','Distinct candidate namespace, persistence reload, foreign/live sessions and publication denied; no engine network capabilities');
}
{
 const s=setup();s.ready();s.play({kind:'run',yards:4});assert.equal(s.g.down,2);assert.equal(s.g.distance,6);s.play({kind:'pass',yards:7});assert.equal(s.g.down,1);assert.equal(s.g.fieldPos,86);s.play({kind:'sack',yards:-5});assert.equal(s.g.distance,15);s.play({kind:'incomplete'});s.play({kind:'incomplete'});s.play({kind:'incomplete'});assert.equal(s.g.ot.completed,1);assert.equal(s.g.fieldPos,75);
 s.play({kind:'fg',good:true});assert.equal(s.g.lifecycle,'FINAL_PENDING');
 const n=setup();n.ready();n.play({kind:'fg',good:false});n.play({kind:'turnover'});assert.deepEqual(copy(n.g.scores.OT),[0,0]);assert.equal(n.g.ot.number,2);
 const f=setup();f.ready();touchdown(f);tryGood(f);f.play({kind:'fg',good:true});assert.match(f.g.ot.blocked,/cannot meet/);assert.equal(f.g.ot.completed,1);
 const two=setup();two.ready();touchdown(two);tryGood(two);two.g.scores.OT[two.g.ot.first]=8;touchdown(two);assert.equal(two.g.ot.tryValue,2);tryGood(two);assert.equal(two.g.ot.number,2);
 pass('SERIES_EDGES','Multiple downs, first down, sack, turnover on downs, FG win/miss, scoreless extension, reject losing FG, OT1 two needed to tie');
}
{
 for(const event of [{kind:'run',yards:NaN,duration:1},{kind:'run',yards:-100,duration:1},{kind:'run',yards:1,duration:0},{kind:'unknown',duration:1}]){const s=setup();s.ready();const scores=copy(s.g.scores);s.play(event);if(event.duration===0)s.e.advanceGame(s.g,1);assert.ok(s.g.ot.blocked);assert.deepEqual(copy(s.g.scores),scores);assert.equal(s.g.ot.eventIndex,0);}
 const thrown=setup(()=>{throw Error('fixture failure');});thrown.ready();thrown.e.advanceGame(thrown.g,1);assert.match(thrown.g.ot.blocked,/provider failed/);
 pass('INVALID_INPUT','Malformed/out-of-range/unsupported events and provider failure block before scoring');
}
fs.writeFileSync(new URL('./evidence/overtime-results.json',import.meta.url),JSON.stringify({qaOnly:true,official:false,candidate:'OTMODEL1',testedAt:new Date().toISOString(),winners,defense,checks,limitations:['Fixture-driven OT only; no calibrated stochastic event model','Timeout pool policy provisional','Offsetting and rare penalties BLOCKED','OT Chairman edits BLOCKED before mutation','Stats worker, UI countdown and drill-down not implemented']},null,2)+'\n');
