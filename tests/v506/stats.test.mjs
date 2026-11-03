import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as e from '../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {TEAM_POWER} from '../../release-assets/v5.0.6-week11/backend/runtime/power.mjs';
import {liveStats} from '../../release-assets/v5.0.6-week11/backend/src/live-stats.mjs';
import {createPublicHandler} from '../../release-assets/v5.0.6-week11/backend/security/edge-boundaries.mjs';
import {requireSessionSlug} from '../../release-assets/v5.0.6-week11/backend/security/security-core.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.6-week11/backend/src/engine-operations.mjs';
const fresh=(s,i=0)=>{const g=e.initialGame(s);g.qaOnly=true;g.seedHex=createHash('sha256').update(s.id+'|v506-qa|'+i).digest('hex').slice(0,32);g.rngState=e.seedWords(g.seedHex,g.id);Object.assign(g,{lifecycle:'ACTIVE',auto:true});e.ensureOpeningToss(g);return g;};
const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['masterZulu','createdRunAt','completedAt','launchedAt','timestamp','atZulu'].includes(k)).map(([k,x])=>[k,clean(x)])):v;
test('W11 exact data counts, IDs, coverage, ranges and UTC midnight rollovers',()=>{
 assert.equal(slate.length,56);assert.equal(new Set(slate.map(g=>g.id)).size,56);assert.equal(Object.keys(TEAM_POWER).length,121);
 assert.deepEqual(slate.map(g=>g.id).sort(),Array.from({length:56},(_,i)=>'G'+String(i+502).padStart(4,'0')));
 for(const g of slate)for(const t of [g.away,g.home])for(const k of ['overall','offense','defense'])assert.ok(TEAM_POWER[t][k]>=60&&TEAM_POWER[t][k]<=99);
 assert.equal(slate[0].kickoffZulu,'2026-11-03T23:00:00Z');assert.equal(slate.find(g=>g.id==='G0507').kickoffZulu,'2026-11-08T04:00:00Z');
 assert.throws(()=>requireSessionSlug('w10v505-0000000000000001'));
});
test('football code is byte-identical after explicit release metadata normalization',()=>{
 const read=v=>fs.readFileSync(`release-assets/${v}/backend/runtime/engine.mjs`,'utf8');
 const normalize=s=>s.replaceAll('5.0.5','5.0.6').replaceAll('v5-0-5','v5-0-6').replaceAll('V505','V506').replaceAll('v505','v506').replaceAll('W10','W11').replaceAll('w10','w11').replaceAll('week10','week11').replace(/const DATA_VERSION = .*?;/,'const DATA_VERSION = "DATA";');
 assert.equal(normalize(read('v5.0.5-week10')),normalize(read('v5.0.6-week11')));
});
test('stats polling cannot mutate pending plays, RNG or history; started and resolved are distinct',()=>{
 const g=fresh(slate[0]);e.generatePlay(g);const before=structuredClone(g);
 for(let i=0;i<100;i++){const s=liveStats(g,1);assert.equal(s.teams.reduce((n,t)=>n+t.playsStarted,0),1);assert.equal(s.teams.reduce((n,t)=>n+t.completedPlays,0),0);}
 assert.deepEqual(g,before);
 e.applyPlay(g,g.pendingPlay);assert.equal(liveStats(g,2).teams.reduce((n,t)=>n+t.completedPlays,0),1);
});
test('stats endpoint exposes resolved evidence only; rejects old sessions and unknown games',async()=>{
 const g=fresh(slate[0]);e.advanceGame(g,600);const before=structuredClone(g);
 const handler=createPublicHandler({allowedOrigins:['http://localhost'],store:{read:async()=>({state:[g],state_version:7})}});
 const get=(game=g.id,session='w11v506-0000000000000001')=>handler(new Request(`http://localhost/?api=stats&session=${session}&game=${game}`,{headers:{origin:'http://localhost'}}));
 const r=await get();assert.equal(r.status,200);const data=await r.json();assert.equal(data.stateVersion,7);assert.equal(data.gameId,g.id);
 for(const key of ['seedHex','rngState','pendingPlay','awayPower','homePower','editSnapshot'])assert.ok(!JSON.stringify(data).includes('"'+key+'"'));
 assert.equal((await get('UNKNOWN')).status,404);assert.equal((await get(g.id,'w10v505-0000000000000001')).status,404);assert.deepEqual(g,before);
 data.teams[0].score=999;assert.notEqual(e.total(g,0),999);
});
test('invalid period cannot be silently reported as a valid score',()=>{const g=fresh(slate[0]);g.scores['0']=[7,0];assert.throws(()=>liveStats(g,1),/INVALID_LINE_SCORE/);});
test('56 active games progress together with stats reads between ticks',async()=>{
 const ops=createEngineOperations({engine:e}),initial=slate.map(s=>fresh(s,99));
 const draft={state:structuredClone(initial)};
 const expected=structuredClone(initial);for(const g of expected)e.advanceGame(g,20000);
 const start=performance.now();
 for(let n=0;n<20000;n+=40){await ops.advance(draft,{seconds:40});for(const g of draft.state)liveStats(g,n/40+1);}
 assert.deepEqual(clean(draft.state),clean(expected));
 console.log('W11_LOCAL_56_ACTIVE_MS '+Math.round(performance.now()-start));
});
test('56 games x 10 seeds: finals, stats, regulation TOP, polling/chunk and 1/4/20/50x invariance',()=>{
 const summary={games:56,seedsPerGame:10,runs:560,points:0,minTotal:Infinity,maxTotal:0};
 for(const s of slate)for(let i=0;i<10;i++){
  const start=fresh(s,i),g=structuredClone(start);e.advanceGame(g,20000);
  assert.equal(g.lifecycle,'FINAL_PENDING');assert.notEqual(e.total(g,0),e.total(g,1));assert.equal(g.teamTopSeconds[0]+g.teamTopSeconds[1],2400);
  const stats=liveStats(g,1);for(const t of [0,1]){assert.equal(stats.teams[t].score,e.total(g,t));assert.equal(stats.teams[t].playsStarted,stats.teams[t].completedPlays);}
  const total=e.total(g,0)+e.total(g,1);summary.points+=total;summary.minTotal=Math.min(summary.minTotal,total);summary.maxTotal=Math.max(summary.maxTotal,total);
  if(i===0){
   const b=structuredClone(start);for(let n=0;n<20000;n+=37){e.advanceGame(b,Math.min(37,20000-n));liveStats(b,1);}assert.deepEqual(clean(b),clean(g));
   for(const speed of [1,4,20,50]){const projected=e.project([{...structuredClone(start),speed}],20000/speed)[0];assert.deepEqual(clean({...projected,speed:1}),clean(g));}
  }
 }
 summary.meanTotal=summary.points/summary.runs;console.log('W11_POPULATION '+JSON.stringify(summary));
});
