import test from 'node:test';import assert from 'node:assert/strict';
import {captureGame} from '../../release-assets/v5.1.0/backend/probability/capture.mjs';
import {observeCapture,compactView} from '../../release-assets/v5.1.0/backend/probability/observer.mjs';
import * as E from '../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
const stamp='2026-11-04T15:00:00Z';
function fixture(){const g={...E.initialGame(OPERATING_SLATE[0]),sessionId:'qa-v510-observer',qaOnly:true,lifecycle:'ACTIVE'};
 const c=captureGame(g,{engineVersion:E.ENGINE_VERSION,stateVersion:1,actionOrdinal:0,command:'launch',observedAt:stamp});
 const prior={favoriteTeamId:g.homeCode,otherTeamId:g.awayCode,pregameMargin:7,source:{id:'QA-only',kind:'QA_FIXTURE',sampleCount:1,generatedAt:stamp,contextHash:c.contextHash}};return {g,c,prior,state:observeCapture(null,c,{prior}).state};}
for(const lifecycle of ['ACTIVE','FINAL_PENDING','LOCKED','READY','FINAL'])for(const later of [false,true])test(`cancel restores ${lifecycle}, later=${later}`,()=>{
 const {c,prior,state}=fixture();let base=state;
 const snap={...c,command:'advance',lifecycle,scores:{...c.scores,'4':[0,7]},stateVersion:2};
 base=observeCapture(base,snap).state;
 const before=base.probability;
 const opened=observeCapture(base,{...snap,command:'edit_begin',lifecycle:'EDIT',editing:true,actionOrdinal:1});
 assert.equal(opened.record.status,'BLOCKED');assert.equal(opened.record.probability,null);assert.equal(compactView(opened.state).color,'#808080');
 const closed=observeCapture(opened.state,{...snap,command:'edit_cancel',editing:false,actionOrdinal:2,observedAt:later?'2026-11-04T15:00:10Z':stamp});
 assert.equal(closed.record.probability,before);assert.equal(closed.record.status,lifecycle==='ACTIVE'?'ESTIMATED':'FINAL');
});
test('pending outcomes and RNG getters are never accessed by capture; input state remains unchanged',()=>{
 const {g}=fixture(),before=JSON.stringify(g);for(const k of ['pendingPlay','pendingRandom','rngState','seedHex'])Object.defineProperty(g,k,{get(){throw Error('FORBIDDEN '+k)},configurable:true});
 assert.doesNotThrow(()=>captureGame(g,{engineVersion:E.ENGINE_VERSION,stateVersion:1,actionOrdinal:0,command:'launch',observedAt:stamp}));
});
test('OT is unsupported until untied final; correction wins over natural final',()=>{
 const {c,state}=fixture(),ot={...c,period:'OT',command:'advance',stateVersion:2};
 assert.equal(observeCapture(state,ot).record.reason,'OVERTIME_MODEL_UNAVAILABLE');
 const fin={...ot,lifecycle:'FINAL_PENDING',scores:{...c.scores,OT:[0,7]}};assert.equal(observeCapture(state,fin).record.probability,1);
 const corrected=observeCapture(state,{...c,command:'score'}).state;assert.equal(observeCapture(corrected,fin).record.reason,'CHAIRMAN_CORRECTION');
});
test('missing prior and changed context block; betting prior rejected; capture keeps all three clocks distinct',()=>{
 const {c,prior,state}=fixture();assert.equal(observeCapture(null,c).record.reason,'PREGAME_INPUTS_MISSING');
 assert.equal(observeCapture(null,c,{prior:{...prior,source:{...prior.source,kind:'BETTING'}}}).record.reason,'PRIOR_SOURCE_REQUIRED');
 assert.equal(observeCapture(state,{...c,command:'poll',contextHash:'changed'}).record.reason,'PRIOR_CONTEXT_MISMATCH');
 const r=observeCapture(state,{...c,command:'poll',observedAt:'2026-11-04T15:00:10Z',glSeconds:100,clockSeconds:500});assert.equal(r.record.missingIntervals,1);assert.equal(r.record.input.clockSeconds,500);assert.equal(r.state.capture.glSeconds,100);
});
