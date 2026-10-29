import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as e from '../../release-assets/v5.0.5-week10/backend/runtime/engine.mjs';
import * as baseline from '../../release-assets/v5.0.4-week10/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.5-week10/backend/runtime/week10.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.5-week10/backend/src/engine-operations.mjs';
const ops=createEngineOperations({engine:e});
const init=()=>{const g=e.initialGame(slate[0]);g.qaOnly=true;g.seedHex='0123456789abcdef0123456789abcdef';g.rngState=e.seedWords(g.seedHex,g.id);Object.assign(g,{lifecycle:'ACTIVE',auto:true});e.ensureOpeningToss(g);return g;};
const football=g=>JSON.stringify({score:g.scores,quarter:g.quarter,clock:g.scoreboardSeconds,field:g.fieldPos,down:g.down,distance:g.distance,possession:g.possession,rng:g.rngState,history:g.history.map(({masterZulu,...x})=>x)});
test('candidate differs from retained deployed source only by three approved edits',()=>{
 const original=fs.readFileSync('release-assets/v5.0.4-week10/backend/runtime/engine.mjs','utf8');
 const expected=original.replace('performanceEdgeMultiplier: 4.0,','performanceEdgeMultiplier: 2,').replace('normalRunoffBase: 22,','normalRunoffBase: 18,').replace('      inBounds = rnd(g) > (protectLateLead(g) ? .02 : .08);','      if(yards > 0) yards += 1;\n      inBounds = rnd(g) > (protectLateLead(g) ? .02 : .08);');
 const versioned=expected.replaceAll('5.0.4','5.0.5').replaceAll('v5-0-4','v5-0-5').replaceAll('V504','V505').replaceAll('v504','v505');
 assert.equal(fs.readFileSync('release-assets/v5.0.5-week10/backend/runtime/engine.mjs','utf8'),versioned);
});
test('Delay freezes football and RNG while GL advances; Resume restores the checkpoint',async()=>{
 const g=init();e.advanceGame(g,300);const draft={state:[g]};await ops.executeCommand(draft,{id:g.id,command:'delay'});const state=football(g),gl=g.glSeconds;e.advanceGame(g,180);assert.equal(football(g),state);assert.equal(g.glSeconds,gl+180);await ops.executeCommand(draft,{id:g.id,command:'resume_delay'});assert.equal(football(g),state);assert.equal(g.auto,true);
});
test('Chairman edit freezes RNG and preserves history; save creates a continuation',async()=>{
 const g=init();e.advanceGame(g,400);const prior=structuredClone(g.history),run=g.runId;const draft={state:[g]};await ops.executeCommand(draft,{id:g.id,command:'edit_begin'});const rng=[...g.rngState],gl=g.glSeconds;e.advanceGame(g,100);assert.deepEqual(g.rngState,rng);assert.equal(g.glSeconds,gl+100);await ops.executeCommand(draft,{id:g.id,command:'edit_commit',payload:{down:2,distance:7,ballSide:'OWN',yardline:30,resumeAuto:true}});assert.deepEqual(g.history,prior);assert.notEqual(g.runId,run);assert.equal(g.continuationOf,run);assert.equal(g.fieldPos,30);assert.equal(g.down,2);assert.equal(g.distance,7);assert.equal(g.auto,true);
});
test('same-seed restart reproduces candidate football history',()=>{
 const g=init();e.advanceGame(g,20000);const before=football(g);e.reset(g,false,'QA restart');g.lifecycle='ACTIVE';g.auto=true;e.ensureOpeningToss(g);e.advanceGame(g,20000);assert.equal(football(g),before);
});
test('old checkpoint can structurally load but must not be resumed with candidate mathematics',()=>{
 const g=init();baseline.advanceGame(g,400);const old=structuredClone(g),candidate=structuredClone(g);baseline.advanceGame(old,3000);e.advanceGame(candidate,3000);assert.notEqual(football(old),football(candidate));assert.equal(old.runId,candidate.runId);assert.equal(old.seedHex,candidate.seedHex);
 // This witness proves that retaining old version strings is insufficient isolation.
 // Release review must block candidate deployment using v505 bindings.
});
test('overtime resolves a tied regulation state to valid periods and a non-tied final',()=>{
 for(let i=0;i<100;i++){const g=init();g.seedHex=i.toString(16).padStart(32,'0');g.rngState=e.seedWords(g.seedHex,g.id);g.quarter=4;g.activePeriod='4';g.period='4th';g.scoreboardSeconds=0;e.finishPeriod(g);e.advanceGame(g,20000);assert.equal(g.lifecycle,'FINAL_PENDING');assert.notEqual(e.total(g,0),e.total(g,1));assert.ok(Object.keys(g.scores).every(k=>/^(1|2|3|4|OT|[2-9]OT|[1-9][0-9]+OT)$/.test(k)));}
});
