import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import * as engine from '../../release-assets/v5.0.7-week12/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.7-week12/backend/runtime/week12.mjs';
import {TEAM_POWER} from '../../release-assets/v5.0.7-week12/backend/runtime/power.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.7-week12/backend/src/engine-operations.mjs';
import {requireSessionSlug} from '../../release-assets/v5.0.7-week12/backend/security/security-core.mjs';
import {createSupabaseTransport} from '../../release-assets/v5.0.7-week12/backend/src/supabase-rest.mjs';
const ops=createEngineOperations({engine,clock:()=> '2026-11-09T12:00:00Z'});
test('approved input bytes, full rating coverage and QA-only defaults',()=>{
 const manifest=JSON.parse(fs.readFileSync('release-assets/v5.0.7-week12/input-manifest.json'));
 assert.equal(createHash('sha256').update(fs.readFileSync('release-assets/v5.0.7-week12/ratings.csv')).digest('hex'),manifest.ratingSha256);
 assert.equal(slate.length,60);assert.equal(new Set(slate.map(g=>g.id)).size,60);assert.equal(Object.keys(TEAM_POWER).length,122);
 const participants=new Set();for(const s of slate){participants.add(s.away);participants.add(s.home);const g=engine.initialGame(s);assert.equal(g.qaOnly,true);assert.equal(g.powerReady,true);assert.equal(g.auto,false);assert.equal(g.lifecycle,'UNLAUNCHED');assert.equal(g.deadman.status,'UNARMED');}
 assert.equal(participants.size,120);
});
test('5.0.6 and unmarked namespaces rejected, only candidate QA namespace accepted',()=>{
 for(const slug of ['w11v506-0000000000000001','w12v507-0000000000000001'])assert.throws(()=>requireSessionSlug(slug));
 assert.equal(requireSessionSlug('qa-w12v507-0000000000000001'),'qa-w12v507-0000000000000001');
});
test('QA acceptance blocked and completed results never project',async()=>{
 for(const s of slate){const g=engine.initialGame(s);g.lifecycle='LOCKED';await assert.rejects(ops.executeCommand({state:[g]},{id:g.id,command:'accept',payload:{confirmed:true}}),{code:'QA_ACCEPT_FORBIDDEN'});const snapshot=structuredClone(g);engine.advanceGame(g,20000);assert.deepEqual(g,snapshot);}
});
test('candidate transport uses exclusively separate QA database profile',async()=>{
 let request;const t=createSupabaseTransport({url:'https://qa-only.invalid',publishableKey:'qa-only',serviceKey:'qa-only',fetchImpl:async(url,options)=>{request=options;return new Response('[]',{status:200});}});await t.rpc('read_session',{p_slug:'qa-w12v507-0000000000000001'});
 assert.equal(request.headers['Content-Profile'],'gamecast_v507_qa_w12');assert.equal(request.headers['Accept-Profile'],'gamecast_v507_qa_w12');
});
test('Delay, pause and edit freeze pending football/RNG while GL advances',async()=>{
 for(const action of ['delay','pause','edit_begin']){
  const g=engine.initialGame(slate[0]);await ops.executeCommand({state:[g]},{id:g.id,command:'launch',payload:{}});g.auto=true;engine.generatePlay(g);
  const prior=structuredClone(g);await ops.executeCommand({state:[g]},{id:g.id,command:action,payload:{}});const checkpoint=structuredClone(g);engine.advanceGame(g,123);
  assert.equal(g.glSeconds,checkpoint.glSeconds+123);assert.deepEqual(g.pendingPlay,checkpoint.pendingPlay);assert.deepEqual(g.rngState,checkpoint.rngState);assert.deepEqual(g.history,checkpoint.history);assert.equal(g.fieldPos,checkpoint.fieldPos);assert.equal(g.scoreboardSeconds,checkpoint.scoreboardSeconds);
  await ops.executeCommand({state:[g]},{id:g.id,command:action==='delay'?'resume_delay':action==='pause'?'pause':'edit_cancel',payload:{}});assert.deepEqual(g.pendingPlay,prior.pendingPlay);assert.deepEqual(g.rngState,prior.rngState);
 }
});
