import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as e from '../../release-assets/v5.0.7-week12/backend/runtime/engine.mjs';
import * as old from '../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.7-week12/backend/runtime/week12.mjs';
const clean=v=>JSON.stringify(v,(k,x)=>['masterZulu','createdRunAt','launchedAt','completedAt','speed','atZulu','timestamp'].includes(k)?undefined:x);
const start=(s,seed)=>{const g=e.initialGame(s);g.seedHex=seed.toString(16).padStart(32,'0');g.rngState=e.seedWords(g.seedHex,g.id);Object.assign(g,{lifecycle:'ACTIVE',auto:true,qaOnly:true});e.ensureOpeningToss(g);return g;};
const stats=()=>({games:0,safeties:0,gamesWithSafety:0,touchbacks:0,goalLinePuntEndpoints:0,points:0,plays:0,gl:0,margin:0,underdogWins:0,unequalRatingGames:0});
function collect(s,g){
 assert.equal(g.lifecycle,'FINAL_PENDING');assert.equal(g.qaOnly,true);assert.notEqual(e.total(g,0),e.total(g,1));
 assert.ok(g.fieldPos>=1&&g.fieldPos<=99);assert.ok(g.down>=1&&g.down<=4);
 assert.ok(Object.keys(g.scores).every(k=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(k)));
 assert.equal(g.teamTopSeconds.reduce((a,b)=>a+b),2400);
 const safety=g.history.filter(h=>h.ruling==='SAFETY').length;
 s.games++;s.safeties+=safety;s.gamesWithSafety+=Number(safety>0);s.touchbacks+=g.history.filter(h=>h.ruling==='PUNT_TOUCHBACK').length;
 s.goalLinePuntEndpoints+=g.history.filter(h=>h.preSnap&&h.desc?.includes('Punt')&&h.preSnap.fieldPos+h.yards>=100).length;
 const a=e.total(g,0),b=e.total(g,1);s.points+=a+b;s.margin+=Math.abs(a-b);s.plays+=g.teamPlayCount[0]+g.teamPlayCount[1];s.gl+=g.glSeconds;
 const gap=g.awayPower.overall-g.homePower.overall;
 if(gap!==0){s.unequalRatingGames++;s.underdogWins+=Number((gap<0&&a>b)||(gap>0&&b>a));}
}
const result={scope:'OFFLINE_QA_ONLY: approved 60 Week 12 pairings and verified canonical IDs; identical starting checkpoints and ratings for paired baseline/candidate; no official output',seedCount:50,repeatability:0,pollChunkInvariance:0,speedInvariance:0,concurrentFullBoard:0,unaffectedCompleteGames:0,identicalPreCorrectionPrefixes:0,baseline:stats(),candidate:stats()};
const board=slate.map(s=>start(s,9000));const boardFast=board.map(g=>({...structuredClone(g),speed:50}));
const aa=e.project(board,20000),bb=e.project(boardFast,400);assert.equal(clean(aa),clean(bb));assert.ok(aa.every(g=>g.lifecycle==='FINAL_PENDING'));result.concurrentFullBoard=aa.length;
for(const s of slate){
 for(let seed=0;seed<50;seed++){
  const initial=start(s,seed),a=structuredClone(initial),b=structuredClone(initial);
  e.advanceGame(a,20000);old.advanceGame(b,20000);collect(result.candidate,a);collect(result.baseline,b);
  const index=b.history.findIndex(h=>h.preSnap&&h.desc?.startsWith('Punt')&&h.preSnap.fieldPos+h.yards>=100);
  if(index<0){assert.equal(clean(a),clean(b));result.unaffectedCompleteGames++;}
  else{assert.equal(clean(a.history.slice(0,index)),clean(b.history.slice(0,index)));result.identicalPreCorrectionPrefixes++;}
  if(seed===0){
   const repeat=structuredClone(initial);e.advanceGame(repeat,20000);assert.equal(clean(a),clean(repeat));result.repeatability++;
   const chunk=structuredClone(initial);for(let t=0;t<20000;t+=37)e.advanceGame(chunk,Math.min(37,20000-t));assert.equal(clean(a),clean(chunk));result.pollChunkInvariance++;
   for(const speed of [1,4,10,20,50]){const x={...structuredClone(initial),speed};assert.equal(clean(a),clean(e.project([x],20000/speed)[0]));result.speedInvariance++;}
  }
 }
}
const wilson=(n,total)=>{const z=1.96,p=n/total,d=1+z*z/total,c=(p+z*z/(2*total))/d,m=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;return [c-m,c+m];};
for(const s of [result.baseline,result.candidate]){
 s.meanPoints=s.points/s.games;s.meanPlays=s.plays/s.games;s.meanGLSeconds=s.gl/s.games;s.meanMargin=s.margin/s.games;
 s.safetyGamesRate=s.gamesWithSafety/s.games;s.safetyGamesWilson95=wilson(s.gamesWithSafety,s.games);
 s.underdogWinRate=s.underdogWins/s.unequalRatingGames;s.underdogWinsWilson95=wilson(s.underdogWins,s.unequalRatingGames);
}
result.status='PASS';result.distributionPolicy='Observed comparison only; no target safety rate, no forced statistical improvement.';
const out='release-assets/v5.0.7-week12/evidence';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/offline-gates.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
