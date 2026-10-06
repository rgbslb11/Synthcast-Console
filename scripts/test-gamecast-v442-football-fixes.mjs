import fs from 'node:fs';
import assert from 'node:assert/strict';
import {baselineSource,runtime,game,leadingFourth,forcedKneel,footballKey} from './lib/gamecast-v442-harness.mjs';
const baseline=process.argv.includes('--baseline');
const assembled=process.argv.includes('--assembled');
const source=baselineSource();
let fixed=assembled?fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8'):baseline?source:(await import('../release-assets/gamecast-v4.4.2/football-fixes.mjs')).applyFootballFixes(source);
const mutation=process.argv.find(x=>x.startsWith('--mutation='))?.split('=')[1];
const mutations={
 'automatic-fourth-kneel':['  if (canSafelyKneel(g)) return "KNEEL";','  if (g.down === 4 && diff > 0 || canSafelyKneel(g)) return "KNEEL";'],
 'forced-kneel-clock':['if (fourthDownKneel) { p.turnover = true; g.gameClockStatus = "STOPPED"; }','if (fourthDownKneel) { g.gameClockStatus = "STOPPED"; }'],
 'forced-kneel-possession':['if (g.down > 4) { const spot = g.fieldPos; flip(g, 100 - spot);','if (g.down > 4) { const spot = g.fieldPos; if (!fourthDownKneel) flip(g, 100 - spot);'],
 'halftime-carryover':['if (!g.secondHalfTimeoutsReset) {','if (false) {'],
 'duplicate-half-reset':['if (!g.secondHalfTimeoutsReset) {','if (true) {'],
};
if(mutation){assert.ok(!baseline && mutations[mutation],'Unknown mutation');const [from,to]=mutations[mutation];assert.equal(fixed.split(from).length,2);fixed=fixed.replace(from,to);}
const gc=runtime(fixed,assembled?'ensureOpeningToss':''),old=runtime(source),cases=[];
function check(group,name,fn){try{fn();cases.push({group,name,status:'PASS'});}catch(e){cases.push({group,name,status:'FAIL',error:e.message});}}
for(let a=0;a<=3;a++)for(let b=0;b<=3;b++){
 const label=a+'/'+b;
 check('halftime',label,()=>{
  const g=game(gc);Object.assign(g,{quarter:2,period:'2nd',activePeriod:'2',scoreboardSeconds:0,awayTimeouts:a,homeTimeouts:b,auto:false});
  gc.finishPeriod(g);gc.advanceGame(g,1199);assert.equal(g.quarter,2);assert.equal(g.awayTimeouts,a);assert.equal(g.homeTimeouts,b);
  gc.advanceGame(g,1);assert.equal(g.quarter,3);assert.equal(g.awayTimeouts,3);assert.equal(g.homeTimeouts,3);assert.equal(g.pendingPlay,null);
 });
 check('halftime-reload-retry',label,()=>{
  const g=game(gc);Object.assign(g,{quarter:2,period:'2nd',activePeriod:'2',scoreboardSeconds:0,awayTimeouts:a,homeTimeouts:b,auto:false});
  gc.finishPeriod(g);gc.advanceGame(g,1200);g.awayTimeouts=1;g.homeTimeouts=2;
  const restored=JSON.parse(JSON.stringify(g));restored.pendingPeriod=3;restored.breakSeconds=1;
  gc.advanceGame(restored,1);assert.equal(restored.awayTimeouts,1);assert.equal(restored.homeTimeouts,2);
  restored.quarter=2;restored.pendingPeriod=3;gc.advancePeriod(restored);assert.equal(restored.awayTimeouts,1);assert.equal(restored.homeTimeouts,2);
 });
}
for(const quarter of [1,4])check('halftime-invalid-transition','Q'+quarter+' to Q3',()=>{
 const g=game(gc);Object.assign(g,{quarter,pendingPeriod:3,awayTimeouts:0,homeTimeouts:1});
 assert.throws(()=>gc.advancePeriod(g),/valid halftime transition/);assert.equal(g.awayTimeouts,0);assert.equal(g.homeTimeouts,1);
});
for(let down=1;down<=4;down++)for(let tos=0;tos<=3;tos++)for(const side of [0,1])for(const playClock of [1,40]){
 // No pre-snap clock is burned by this engine. Two seconds per kneel; each
 // remaining opponent timeout cancels one 30-second post-play runoff.
 const snaps=Math.max(0,4-down),capacity=2*snaps+30*Math.max(0,snaps-tos);
 const clocks=[...new Set([1,Math.max(1,capacity),capacity+1,160])];
 for(const clock of clocks)check('kneel-boundary',`down=${down} tos=${tos} side=${side} pc=${playClock} clock=${clock}`,()=>{
  const g=leadingFourth(gc,{down,tos,clock,side,playClock}),before=footballKey(g);
  assert.equal(gc.strategy(g)==='KNEEL',down<4&&clock<=capacity);assert.equal(footballKey(g),before,'Strategy query changed state/RNG');
  if(down<4&&clock<=capacity){
   const initial=side;let guard=0;
   while(g.lifecycle!=='FINAL_PENDING'&&guard++<2000){gc.advanceGame(g,1);assert.equal(g.possession,initial,'Safe kneel lost possession');}
   assert.equal(g.lifecycle,'FINAL_PENDING');assert.ok(g.teamPlayCount[initial]<=snaps);assert.equal(g.teamPlayCount[1-initial],0);
  }
 });
}
for(const side of [0,1])for(let tos=0;tos<=3;tos++)for(const clock of [1,2,3,60])check('forced-fourth-kneel',`side=${side} tos=${tos} clock=${clock}`,()=>{
 const g=leadingFourth(gc,{down:4,tos,clock,side});g.auto=false;g.fieldPos=50;g.pendingPlay=forcedKneel(g);
 gc.advanceGame(g,2);assert.equal(g.possession,1-side);assert.equal(g.fieldPos,51);assert.equal(g.down,1);assert.equal(g.distance,10);assert.equal(g.gameClockStatus,'STOPPED');
 if(clock<=2){assert.equal(g.lifecycle,'FINAL_PENDING');assert.equal(g.pendingPlay,null);}
 else {assert.equal(g.scoreboardSeconds,clock-2);const before=g.scoreboardSeconds;gc.advanceGame(g,20);assert.equal(g.scoreboardSeconds,before);assert.equal(g.possession,1-side);}
});
check('kneel-guard','own goal line',()=>{const g=leadingFourth(gc,{clock:1});g.fieldPos=1;assert.notEqual(gc.strategy(g),'KNEEL');});
for(const score of [[0,0],[0,7]])check('kneel-guard','not leading '+score,()=>{const g=leadingFourth(gc,{clock:1});g.scores['4']=score;assert.notEqual(gc.strategy(g),'KNEEL');});
for(const q of [1,2,3])check('kneel-guard','not Q4 '+q,()=>{const g=leadingFourth(gc,{clock:1});g.quarter=q;g.activePeriod=String(q);assert.notEqual(gc.strategy(g),'KNEEL');});
check('restart','reset new-half eligibility',()=>{
 const g=game(gc);g.secondHalfTimeoutsReset=true;gc.reset(g,false,'QA');assert.equal(g.secondHalfTimeoutsReset,false);
 if(gc.ensureOpeningToss)gc.ensureOpeningToss(g);
 g.quarter=2;g.awayTimeouts=0;g.homeTimeouts=0;g.pendingPeriod=3;gc.advancePeriod(g);assert.equal(g.awayTimeouts,3);assert.equal(g.homeTimeouts,3);
});
for(let i=0;i<100;i++)check('overtime-unchanged','OT-'+i,()=>{
 const a=game(old,'OT-'+i),b=game(gc,'OT-'+i);
 for(const g of [a,b])Object.assign(g,{neutral:true,possession:0,quarter:4,activePeriod:'OT',period:'OT',pendingPeriod:-1,scoreboardSeconds:0,scores:{'1':[0,0],'2':[0,0],'3':[0,0],'4':[0,0],OT:[0,0]}});
 old.advancePeriod(a);gc.advancePeriod(b);for(const g of [a,b]){delete g.secondHalfTimeoutsReset;delete g.coinToss;delete g.coinTossAudit;}assert.equal(footballKey(a),footballKey(b));
});
for(let i=0;i<100;i++)check('read-only-polling','POLL-'+i,()=>{
 const g=game(gc,'POLL-'+i),before=JSON.stringify(g),one=gc.project([g],120)[0];
 for(const elapsed of [1,10,37,60,90,119])gc.project([g],elapsed);
 const again=gc.project([g],120)[0];assert.equal(JSON.stringify(g),before);assert.equal(footballKey(one),footballKey(again));
});
const groups=Object.fromEntries([...new Set(cases.map(x=>x.group))].map(group=>{const xs=cases.filter(x=>x.group===group);return[group,{executed:xs.length,passed:xs.filter(x=>x.status==='PASS').length,failed:xs.filter(x=>x.status==='FAIL').length,skipped:0}]}));
const result={mode:mutation?'mutation-'+mutation:assembled?'assembled':baseline?'baseline':'candidate',executed:cases.length,passed:cases.filter(x=>x.status==='PASS').length,failed:cases.filter(x=>x.status==='FAIL').length,skipped:0,groups,cases};
fs.mkdirSync('outputs/v442',{recursive:true});fs.writeFileSync(`outputs/v442/${result.mode}-football-fixes.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,cases:result.cases.filter(x=>x.status==='FAIL').slice(0,4)},null,2));
if(result.failed)process.exitCode=1;
