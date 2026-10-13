import fs from 'node:fs';import {createHash} from 'node:crypto';import * as base from '../../release-assets/v5.0.0/backend/runtime/engine.mjs';import * as next from '../../release-assets/v5.0.1/backend/runtime/engine.mjs';import {OPERATING_SLATE} from '../../release-assets/v5.0.1/backend/runtime/week7.mjs';
const inputs=JSON.parse(fs.readFileSync('tests/v501/fixtures/blowout-inputs.json')),byid=new Map(inputs.map(x=>[x.game_id,x])),stats=[],boards=Array.from({length:100},()=>({conference35:0,conference28:0}));
const summary=a=>({mean:a.reduce((s,x)=>s+x,0)/a.length,p50:[...a].sort((a,b)=>a-b)[Math.floor(a.length*.5)],p90:[...a].sort((a,b)=>a-b)[Math.floor(a.length*.9)]});
let changed=0,unchanged=0,lowGolden=0,elapsed=[];
const strip=h=>h.map(({masterZulu,...r})=>r);
for(const s of OPERATING_SLATE){const item=byid.get(s.id),margins=[],totals=[],candidateMargins=[];
 for(let seed=0;seed<100;seed++){
  const g=base.initialGame(s),hex=createHash('sha256').update('v501-audit-'+seed+'-'+s.id).digest('hex').slice(0,32);Object.assign(g,{seedHex:hex,rngState:base.seedWords(hex,s.id),lifecycle:'ACTIVE',auto:true,weather:item.weather,qaOnly:true});base.ensureOpeningToss(g);
  const b=structuredClone(g),n=structuredClone(g),start=performance.now();base.advanceGame(b,20000);next.advanceGame(n,20000);elapsed.push(performance.now()-start);
  const bs=[base.total(b,0),base.total(b,1)],ns=[next.total(n,0),next.total(n,1)],margin=Math.abs(bs[0]-bs[1]);margins.push(margin);totals.push(bs[0]+bs[1]);candidateMargins.push(Math.abs(ns[0]-ns[1]));
  if(JSON.stringify(strip(b.history))===JSON.stringify(strip(n.history))){unchanged++;if(bs[0]+bs[1]<=21)lowGolden++;}else changed++;
  if(item.conference){boards[seed].conference35+=Number(margin>=35);boards[seed].conference28+=Number(margin>=28)}
 }
 stats.push({id:s.id,away:s.away,home:s.home,conference:item.conference,ratings:{away:base.initialGame(s).awayPower,home:base.initialGame(s).homePower},observedEngine:item.engineScore,archive:item.archiveScore,matchesArchive:item.matchesArchive,baselineMargin:summary(margins),baselineTotal:summary(totals),candidateMargin:summary(candidateMargins),baseline35:margins.filter(x=>x>=35).length});
}
const observed=inputs.filter(x=>x.conference&&Math.abs(x.engineScore[0]-x.engineScore[1])>=35).length;
const result={classification:'TEST RESULT',seedsPerGame:100,games:41,runsPerVersion:4100,changedHistories:changed,unchangedHistories:unchanged,unchangedLowScoreFixtures:lowGolden,pairedExecutionMs:summary(elapsed),observedConference35:observed,syntheticBaselineBoardsAtLeastObserved:boards.filter(x=>x.conference35>=observed).length,baselineBoardCounts:boards,gamesIndividually:stats,limits:'Conditional model plausibility only. No independent calibrated target distribution; current weather used; 13 imported games excluded; canonical archive and engine state are separate sources. Histories may differ because of the two authorized fixes.'};
fs.writeFileSync('release-assets/gamecast-v5.0.1/evidence/distribution.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,gamesIndividually:undefined,baselineBoardCounts:undefined}));
