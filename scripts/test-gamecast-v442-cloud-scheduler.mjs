import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {runtime,footballKey} from './lib/gamecast-v442-harness.mjs';
import {TEAM_POWER} from '../supabase/functions/gamecast-week7-v4-4-2/power.ts';
// The established comparison excludes wall-time audit stamps, not football fields.
// PostgreSQL jsonb key order is immaterial; compare parsed objects structurally.
const gc=runtime(fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8'),'ensureOpeningToss',{TEAM_POWER});
const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week7-v4-4-2',privatePath=process.env.GAMECAST_QA_PRIVATE;
assert.ok(privatePath&&!fs.existsSync(privatePath));let slug='',token='',version=0,state=[],initial=[];
const cases=[],requestTimes=[],started=performance.now();
async function request(action,body){const t=performance.now(),r=await fetch(API+'?api='+action+(slug?'&session='+slug:''),{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{'x-operator-token':token}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.ok(r.ok,action+' returned '+r.status);if(data.state){state=data.state;version=data.state_version;}requestTimes.push({action,milliseconds:performance.now()-t});return data;}
const pass=name=>cases.push({name,status:'PASS'});
let failure;
try{
 const created=await request('create',{});slug=created.public_slug;token=created.operator_token;version=created.state_version;
 fs.writeFileSync(privatePath,JSON.stringify({public_slug:slug,operator_token:token})+'\n',{flag:'wx',mode:0o600});
 await request('read');assert.equal(state.length,54);assert.ok(state.every(g=>g.qaOnly&&g.lifecycle==='UNLAUNCHED'));initial=structuredClone(state);pass('54 isolated QA games created and read back');
 const due=new Date(Date.now()+30000).toISOString();
 await request('deadman_batch',{ids:state.map(g=>g.id),operation:'arm',config:{basis:'TV_START',tvStartZulu:due},expected_version:version});pass('54 future QA starts armed through authorized API');
 const deadline=Date.now()+90000;let read;
 do{await new Promise(r=>setTimeout(r,5000));read=await request('read');}while(state.some(g=>g.lifecycle==='UNLAUNCHED')&&Date.now()<deadline);
 assert.ok(state.every(g=>g.lifecycle==='ACTIVE'&&g.auto&&g.deadman.status==='AUTONOMOUS'&&g.coinTossAudit.length===1));pass('real 15-second cron launches all 54 games with one toss each');
 for(let round=0;round<2;round++){
  if(round){await new Promise(r=>setTimeout(r,5000));read=await request('read');}
  for(const actual of state){
   const g=structuredClone(initial.find(g=>g.id===actual.id));Object.assign(g,{lifecycle:'ACTIVE',activity:'LIVE',glSeconds:0,seedLocked:true,launchedAt:actual.launchedAt,auto:true,onAir:false,operatorPaused:false,speed:1});gc.ensureOpeningToss(g);
   const wall=Math.floor((Date.parse(read.master_zulu)-Date.parse(actual.launchedAt))/1000),expected=gc.project([g],wall)[0];
   for(const key of ['history','rngState','coinToss','pendingPlay','quarter','period','scoreboardSeconds','playClockSeconds','glSeconds','possession','fieldPos','down','distance','scores','awayTimeouts','homeTimeouts','teamPlayCount','teamTopSeconds'])assert.deepEqual(JSON.parse(footballKey({value:actual[key]})),JSON.parse(footballKey({value:expected[key]})),actual.id+' '+key+' round '+round);
   pass(actual.id+' deployed seeded replay round '+round);
  }
 }
}catch(error){failure=error;}
finally{
 if(slug&&token){
  await request('read');
  const armed=state.filter(g=>g.deadman?.status==='ARMED').map(g=>g.id);
  if(armed.length)await request('deadman_batch',{ids:armed,operation:'disarm',expected_version:version});
  for(const id of state.filter(g=>['ACTIVE','DELAY'].includes(g.lifecycle)).map(g=>g.id))await request('command',{id,command:'end',payload:{confirmed:true},expected_version:version});
  await request('read');assert.ok(state.every(g=>g.qaOnly&&!g.auto&&!['READY','FINAL','SEUD PUBLISHED'].includes(g.lifecycle)));pass('QA cleanup stops all runs without accepting or publishing');
 }
}
if(failure)throw failure;
const report={classification:'TEST RESULT',scope:'Actual cloud cron and 54 simultaneous QA games, each replayed from its persisted seed with the verified runtime',publicSlug:slug,executed:cases.length,passed:cases.length,failed:0,skipped:0,simultaneousGames:54,replayComparisons:108,finalPending:state.filter(g=>g.lifecycle==='FINAL_PENDING').length,accepted:0,runtimeMilliseconds:performance.now()-started,requestTimes,cases};
fs.writeFileSync('outputs/v442/cloud-scheduler-load.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,requestTimes:undefined,cases:undefined},null,2));
