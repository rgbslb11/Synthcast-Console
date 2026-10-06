import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {baselineSource,runtime,footballKey} from './lib/gamecast-v442-harness.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week7-v4-4-2/week7.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week7-v4-4-2/power.ts';
const source=fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8');
const mutation=process.argv.find(x=>x.startsWith('--mutation='))?.split('=')[1];
let tested=source;
if(mutation==='neutral-hfa')tested=tested.replace('if (!g.neutral) e +=','if (true) e +=');
if(mutation==='double-hfa')tested=tested.replace('const HOME_FIELD_NORMALIZED_EDGE = 0.006;','const HOME_FIELD_NORMALIZED_EDGE = 0.012;');
const gc=runtime(tested,'ensureOpeningToss,publicGame',{TEAM_POWER,OPERATING_SLATE}),cases=[];
const start=performance.now();
function check(group,name,fn){fn();cases.push({group,name,status:'PASS'});}
function mk(g,seed){const x=gc.initialGame(g);Object.assign(x,{seedHex:seed,rngState:gc.seedWords(seed,g.id),seedLocked:true,lifecycle:'ACTIVE',auto:true,qaOnly:true,launchedAt:'2026-10-06T00:00:00Z'});gc.ensureOpeningToss(x);return x;}
check('data','54 games and 121 teams',()=>{assert.equal(OPERATING_SLATE.length,54);assert.equal(Object.keys(TEAM_POWER).length,121);assert.equal(new Set(OPERATING_SLATE.map(g=>g.id)).size,54);assert.equal(new Set(OPERATING_SLATE.flatMap(g=>[g.away,g.home])).size,108);});
for(const side of [0,1])for(const neutral of [false,true])check('HFA',`side ${side} neutral ${neutral}`,()=>{
 const g=mk(OPERATING_SLATE[0],'HFA-ISOLATE');g.neutral=neutral;g.awayPower=g.homePower={overall:80,offense:80,defense:80};assert.equal(gc.edge(g,side),neutral?0:side===1?.006:-.006);
});
check('protected','constants and probability functions unchanged',()=>{
 const baseline=baselineSource();
 for(const [from,to] of [['const CAL = {','const cors ='],['const passRate =','function applyPlay('],['function thresholds(','function advancePeriod(']]){
  const block=baseline.slice(baseline.indexOf(from),baseline.indexOf(to));assert.ok(tested.includes(block),from);
 }
 assert.ok(tested.includes('const HOME_FIELD_TARGET_POINTS = 2.66;'));assert.ok(tested.includes('const SPEEDS = [1, 4, 10, 20, 50];'));
});
const refs=[];
for(const slate of OPERATING_SLATE){
 const seed='GC442-W7-'+slate.id,g=mk(slate,seed),stored=JSON.stringify(g);
 check('full-board',slate.id,()=>{
  assert.ok(g.powerReady);assert.equal(g.awayPower.overall,TEAM_POWER[slate.away].overall);assert.equal(g.homePower.defense,TEAM_POWER[slate.home].defense);
  const final=gc.project([g],21600)[0];assert.equal(final.lifecycle,'FINAL_PENDING');assert.equal(final.coinTossAudit.length,1);assert.equal(final.secondHalfTimeoutsReset,true);
  assert.ok(final.down>=1&&final.down<=4);assert.ok(final.fieldPos>=1&&final.fieldPos<=99);
  assert.ok(Object.keys(final.scores).every(p=>['1','2','3','4','OT'].includes(p)||/^[2-9][0-9]*OT$/.test(p)));
  assert.equal(final.qaOnly,true);refs.push(final);
 });
 for(const elapsed of [1200,3600,7200])for(const speed of [1,4,20,50])check('acceleration',`${slate.id} ${elapsed}s ${speed}x`,()=>{
  const a=gc.project([g],elapsed)[0],scaled=JSON.parse(stored);scaled.speed=speed;
  const b=gc.project([scaled],elapsed/speed)[0];assert.equal(footballKey(a),footballKey(b));
 });
 check('poll/chunk',slate.id,()=>{
  const target=gc.project([g],7200)[0],chunks=JSON.parse(stored);
  for(let i=0;i<144;i++)gc.advanceGame(chunks,50);
  for(const elapsed of [1,7,99,211,999,1999,3999])gc.project([g],elapsed);
  assert.equal(JSON.stringify(g),stored);assert.equal(footballKey(chunks),footballKey(target));assert.equal(footballKey(gc.project([g],7200)[0]),footballKey(target));
 });
 check('pause/reload',slate.id,()=>{
  const a=gc.project([g],123)[0],before=structuredClone(a);a.operatorPaused=true;gc.advanceGame(a,500);
  for(const key of ['pendingPlay','rngState','possession','down','distance','fieldPos','scoreboardSeconds','scores','coinToss'])assert.equal(JSON.stringify(a[key]),JSON.stringify(before[key]));
  a.operatorPaused=false;a.glSeconds=before.glSeconds;const restored=JSON.parse(JSON.stringify(a));gc.advanceGame(restored,1234);gc.advanceGame(before,1234);assert.equal(footballKey(restored),footballKey(before));
 });
}
const batch=OPERATING_SLATE.map(s=>mk(s,'GC442-W7-'+s.id)),loadStart=performance.now();let rounds=0;
while(batch.some(g=>g.lifecycle!=='FINAL_PENDING')&&rounds++<10000)for(const g of batch)gc.advanceGame(g,50);
const loadMilliseconds=performance.now()-loadStart;
for(let i=0;i<batch.length;i++)check('simultaneous-load',batch[i].id,()=>assert.equal(footballKey(batch[i]),footballKey(refs[i])));
const groups=Object.fromEntries([...new Set(cases.map(c=>c.group))].map(group=>[group,cases.filter(c=>c.group===group).length]));
const report={classification:'TEST RESULT',scope:'Assembled 4.4.2 backend, local QA only',executed:cases.length,passed:cases.length,failed:0,skipped:0,groups,fullBoardGames:54,simultaneousGames:54,seedPattern:'GC442-W7-{canonical game ID}',loadMilliseconds,rounds,runtimeMilliseconds:performance.now()-start};
fs.writeFileSync('outputs/v442/release-local.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
