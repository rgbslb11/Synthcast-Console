import assert from 'node:assert/strict';
import * as e from '../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
const clean=g=>JSON.stringify(g,(k,v)=>['masterZulu','createdRunAt','launchedAt','completedAt','speed'].includes(k)?undefined:v);
let n=0;
for(const s of slate)for(let seed=0;seed<10;seed++){
const g=e.initialGame(s);g.qaOnly=true;g.seedHex=String(seed).padStart(32,'0');g.rngState=e.seedWords(g.seedHex,g.id);g.lifecycle='ACTIVE';g.auto=true;e.ensureOpeningToss(g);
const base=structuredClone(g);e.advanceGame(g,20000);assert.equal(g.lifecycle,'FINAL_PENDING');assert.notEqual(e.total(g,0),e.total(g,1));assert.equal(g.teamTopSeconds.reduce((a,b)=>a+b),2400);
if(seed===0){const chunk=structuredClone(base);for(let t=0;t<20000;t+=37)e.advanceGame(chunk,Math.min(37,20000-t));assert.equal(clean(g),clean(chunk));for(const speed of [1,4,20,50]){const x=structuredClone(base);x.speed=speed;assert.equal(clean(e.project([x],20000/speed)[0]),clean(g));}}
n++;
}
console.log(JSON.stringify({simulations:n,pollInvariance:56,speedInvariance:224,status:'PASS'}));
