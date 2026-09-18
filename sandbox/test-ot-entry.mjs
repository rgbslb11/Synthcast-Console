import assert from 'node:assert/strict';
import {createRuntime} from './runtime.mjs';
import {patchOtEntry} from './ot-entry.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
const clock = class extends Date { constructor(...args){super(...(args.length?args:['2026-09-18T00:00:00Z']));} static now(){return 1789689600000;} };
const old=createRuntime({receiver:true,clock}).inspect;
const candidate=createRuntime({receiver:true,otEntry:true,clock});
const e=candidate.inspect, copy=x=>JSON.parse(JSON.stringify(x));
function fixture(engine,i){const g=engine.initialGame(OPERATING_SLATE[i]);g.seedHex='QA_ONLY-OTENTRY-'+i;g.rngState=engine.seedWords(g.seedHex,g.id);g.openingReceiver=0;g.secondHalfReceiver=1;g.receiptSeed=g.seedHex;g.possession=0;g.lifecycle='ACTIVE';g.auto=true;return g;}
function finish(engine,g,chunk){let n=0;while(g.lifecycle!=='FINAL_PENDING'&&n++<30000)engine.advanceGame(g,chunk);assert.equal(g.lifecycle,'FINAL_PENDING');return g;}
function stable(g){const x=copy(g);for(const k of ['runId','createdRunAt','completedAt'])delete x[k];return x;}
let overtime=0;
for(let i=0;i<55;i++){
 const a=finish(old,fixture(old,i),13),b=finish(e,fixture(e,i),13),c=finish(e,fixture(e,i),1);
 assert.deepEqual(stable(b),stable(c));
 const hasOT=Object.hasOwn(a.scores,'OT');if(hasOT)overtime++;
 assert.deepEqual(copy(a.scores),copy(b.scores));assert.deepEqual(copy(a.rngState),copy(b.rngState));
 assert.deepEqual(copy(a.teamPlayCount),copy(b.teamPlayCount));assert.deepEqual(copy(a.teamTopSeconds),copy(b.teamTopSeconds));
 assert.equal(b.glSeconds-a.glSeconds,hasOT?420:0);
 assert.deepEqual(copy(a.history.filter(h=>!String(h.period).includes('OT'))),copy(b.history.filter(h=>!String(h.period).includes('OT'))));
 let slow=fixture(e,i),fast=copy(slow);fast.speed=50;
 for(let n=0;slow.lifecycle!=='FINAL_PENDING'&&n<500;n++){slow=e.project([slow],50)[0];fast=e.project([fast],1)[0];const normalized=copy(fast);normalized.speed=1;assert.deepEqual(stable(slow),stable(normalized));}
 assert.equal(slow.lifecycle,'FINAL_PENDING');
}
function tiedEnd(engine){const g=fixture(engine,0);Object.assign(g,{quarter:4,activePeriod:'4',period:'4th',scoreboardSeconds:1,pendingPlay:{team:0,phase:'PLAY',remaining:1,playSec:1,clockBefore:1,desc:'Incomplete pass',yards:0,points:0,turnover:false,punt:false,fg:false,first:false,inBounds:false,incomplete:true,strategy:'NORMAL',edgeAtSnap:0,deadSec:0,runoffSec:0}});return g;}
const oldOT=finish(old,tiedEnd(old),13),newOT=finish(e,tiedEnd(e),13);
assert.equal(newOT.glSeconds-oldOT.glSeconds,420);assert.deepEqual(copy(newOT.scores),copy(oldOT.scores));assert.deepEqual(copy(newOT.rngState),copy(oldOT.rngState));
assert.deepEqual(stable(newOT),stable(finish(e,tiedEnd(e),1)));
let slowOT=tiedEnd(e),fastOT=copy(slowOT);fastOT.speed=50;
for(let n=0;slowOT.lifecycle!=='FINAL_PENDING'&&n<500;n++){slowOT=e.project([slowOT],50)[0];fastOT=e.project([fastOT],1)[0];const normalized=copy(fastOT);normalized.speed=1;assert.deepEqual(stable(slowOT),stable(normalized));}
assert.equal(slowOT.lifecycle,'FINAL_PENDING');
const g=tiedEnd(e);e.advanceGame(g,1);assert.equal(g.breakSeconds,600);
const startGL=g.glSeconds,rng=copy(g.rngState);e.advanceGame(g,599);assert.equal(g.breakSeconds,1);assert.deepEqual(copy(g.rngState),rng);assert.equal(g.scoreboardSeconds,0);assert.equal(g.glSeconds-startGL,599);
e.advanceGame(g,1);assert.notDeepEqual(copy(g.rngState),rng);assert.equal(g.glSeconds-startGL,600);
assert.throws(()=>patchOtEntry('wrong source'),/anchor changed/);
assert.throws(()=>createRuntime({otEntry:true}),/requires RECEIVER1/);
const response=await candidate.handle(new Request('http://localhost/sandbox/api?api=create',{method:'POST',body:'{}'}));assert.equal(response.status,201);const session=await response.json();assert.match(session.public_slug,/^qa-otentry1-/);assert.match(session.engine_version,/-OTENTRY1$/);assert.equal(session.official,false);
const denied=await candidate.handle(new Request('http://localhost/sandbox/api?api=read&session=qa-receiver1-0000000000000000'));assert.equal(denied.status,403);
console.log(JSON.stringify({status:'PASS',qaOnly:true,games:55,overtimeGames:overtime,checks:['regulation histories/scores/RNG/TOP unchanged','GL differs only by 420 seconds on OT entry','1s/13s full-game invariance','1x/50x full-game invariance','599 seconds frozen and transition at 600','patch anchor fails closed','distinct identity and old namespace rejected']},null,2));
