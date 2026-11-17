import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as e from '../../release-assets/v5.0.8-week13/backend/runtime/engine.mjs';
import * as baseline from '../../release-assets/v5.0.7-week12-operating/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.8-week13/backend/runtime/week13.mjs';
const clean=v=>JSON.stringify(v,(k,x)=>['masterZulu','createdRunAt','launchedAt','completedAt','atZulu','timestamp','speed'].includes(k)?undefined:x);
const start=(s,seed)=>{const g=e.initialGame(s);g.seedHex=seed.toString(16).padStart(32,'0');g.rngState=e.seedWords(g.seedHex,g.id);Object.assign(g,{lifecycle:'ACTIVE',activity:'LIVE',auto:true,qaOnly:true});e.ensureOpeningToss(g);return g;};
const result={status:'RUNNING',scope:'OFFLINE_QA_ONLY; approved attached post-Week 12 ratings; baseline 5.0.7 receives identical new rating inputs; no cloud writes or official outcomes',seedCountPerGame:20,games:0,exact507Parity:0,repeatability:0,pollChunkInvariance:0,speedInvariance:0,fullBoard:0,points:0,plays:0,gl:0};
const full=slate.map(s=>start(s,9000));const a=e.project(full,20000),b=baseline.project(structuredClone(full),20000);assert.equal(clean(a),clean(b));assert.equal(clean(a),clean(e.project(full.map(g=>({...structuredClone(g),speed:50})),400)));result.fullBoard=a.length;assert.ok(a.every(g=>g.lifecycle==='FINAL_PENDING'));
for(const s of slate)for(let seed=0;seed<20;seed++){
 const initial=start(s,seed),x=structuredClone(initial),y=structuredClone(initial);e.advanceGame(x,20000);baseline.advanceGame(y,20000);assert.equal(clean(x),clean(y));result.exact507Parity++;result.games++;
 assert.equal(x.lifecycle,'FINAL_PENDING');assert.notEqual(e.total(x,0),e.total(x,1));assert.ok(x.fieldPos>=1&&x.fieldPos<=99);assert.ok(Object.keys(x.scores).every(k=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(k)));assert.equal(x.teamTopSeconds.reduce((a,b)=>a+b),2400);assert.equal(x.qaOnly,true);
 result.points+=e.total(x,0)+e.total(x,1);result.plays+=x.teamPlayCount.reduce((a,b)=>a+b);result.gl+=x.glSeconds;
 if(seed===0){
 const repeat=structuredClone(initial);e.advanceGame(repeat,20000);assert.equal(clean(x),clean(repeat));result.repeatability++;
 const chunk=structuredClone(initial);for(let t=0;t<20000;t+=37)e.advanceGame(chunk,Math.min(37,20000-t));assert.equal(clean(x),clean(chunk));result.pollChunkInvariance++;
 for(const speed of [1,4,10,20,50]){assert.equal(clean(x),clean(e.project([{...structuredClone(initial),speed}],20000/speed)[0]));result.speedInvariance++;}
 }
}
Object.assign(result,{status:'PASS',meanPoints:result.points/result.games,meanPlays:result.plays/result.games,meanGLSeconds:result.gl/result.games});
fs.mkdirSync('release-assets/v5.0.8-week13/evidence',{recursive:true});fs.writeFileSync('release-assets/v5.0.8-week13/evidence/offline-gates.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
