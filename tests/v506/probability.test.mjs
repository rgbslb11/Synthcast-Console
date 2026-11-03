import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as engine from '../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.6-week11/backend/runtime/week11.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.6-week11/backend/src/engine-operations.mjs';
import {editToken} from '../../release-assets/v5.0.6-week11/backend/src/command-preconditions.mjs';
import {calculate,MODEL} from '../../release-assets/v5.0.6-week11/backend/probability/illustrative-model.mjs';
import {appendRecord,recoverHistory,assertHistoryPreserved,assertHistoryEvents,setPregame,observe,probabilityView,contextHash,modelInput} from '../../release-assets/v5.0.6-week11/backend/probability/history.mjs';
import {withProbability} from '../../release-assets/v5.0.6-week11/backend/probability/operations.mjs';
import {renderChart} from '../../release-assets/v5.0.6-week11/backend/probability/chart.mjs';
const epoch=Date.parse('2026-11-03T23:00:00Z'),stamp=s=>new Date(epoch+1000*s).toISOString();
function fixture(sessionId='qa-session-a',i=0){
 const g=engine.initialGame(slate[i]);g.qaOnly=true;g.seedHex=createHash('sha256').update('independent-WP-QA-'+i).digest('hex').slice(0,32);g.rngState=engine.seedWords(g.seedHex,g.id);
 const draft={sessionId,engineVersion:engine.ENGINE_VERSION,dataVersion:engine.DATA_VERSION,stateVersion:1,state:[g]};
 const prior={favoriteTeamId:g.homeCode,otherTeamId:g.awayCode,pregameMargin:7,source:{kind:'QA_FIXTURE',id:'explicit-seven-point-test-prior',generatedAt:stamp(0),sampleCount:1,contextHash:contextHash(g,draft)}};
 return {g,draft,prior};
}
function launch(f){setPregame(f.draft,f.g,f.prior,stamp(0));f.draft.stateVersion++;f.g.lifecycle='ACTIVE';engine.ensureOpeningToss(f.g);observe(f.draft,f.g,{stamp:stamp(0)});return f;}
const strip=r=>{const {hash,previousHash,index,key,...rest}=r;return rest;};
const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!['winProbability','masterZulu','timestamp','createdRunAt','launchedAt','completedAt','atZulu'].includes(k)).map(([k,v])=>[k,clean(v)])):value;
for(const lifecycle of ['ACTIVE','FINAL_PENDING','LOCKED','READY','FINAL'])for(const sameSlot of [true,false]){
 test(`review: cancelling ${lifecycle} edit restores status (${sameSlot?'same':'later'} slot)`,async()=>{
  const f=launch(fixture());let time=1;const clock=()=>stamp(time),ops=withProbability(createEngineOperations({engine,clock}),{clock});
  f.g.lifecycle=lifecycle;
  if(lifecycle!=='ACTIVE'){f.g.scores['4']=[0,7];observe(f.draft,f.g,{stamp:clock()});}
  const expected=probabilityView(f.g);f.draft.stateVersion++;time=5;
  await ops.advance(f.draft,{seconds:0});
  await ops.executeCommand(f.draft,{id:f.g.id,command:'edit_begin',payload:{confirmed:true}});
  let view=probabilityView(f.draft.state[0]);assert.equal(view.status,'BLOCKED');assert.equal(view.reason,'CHAIRMAN_EDIT_IN_PROGRESS');assert.equal(view.color,'#808080');assert.equal(view.probability,null);
  const saved=structuredClone(f.draft.state[0].winProbability.records);
  f.draft.stateVersion++;if(!sameSlot)time=10;
  await ops.advance(f.draft,{seconds:0});
  await ops.executeCommand(f.draft,{id:f.g.id,command:'edit_cancel',payload:{}});
  const g=f.draft.state[0];view=probabilityView(g);
  assert.equal(view.status,expected.status);assert.equal(view.probability,expected.probability);assert.equal(view.reason,null);
  assert.equal(view.points.at(-1).kind,'edit_cancel');assert.equal(g.lifecycle,lifecycle);
  assert.deepEqual(g.winProbability.records.slice(0,saved.length),saved);
  assert.deepEqual(recoverHistory(null,g.winProbability.records),g.winProbability);
  if(lifecycle!=='ACTIVE'){time=20;const count=g.winProbability.records.length;await ops.advance(f.draft,{seconds:0});assert.equal(f.draft.state[0].winProbability.records.length,count);}
 });
}
test('review: cancelling edit never clears a committed Chairman override',async()=>{
 const f=launch(fixture());let time=5;const clock=()=>stamp(time),ops=withProbability(createEngineOperations({engine,clock}),{clock});
 for(const command of ['score','edit_begin','edit_cancel']){
  f.draft.stateVersion++;await ops.executeCommand(f.draft,{id:f.g.id,command,payload:{team:0,points:7}});
  assert.equal(probabilityView(f.draft.state[0]).reason,'CHAIRMAN_OVERRIDE');
  assert.equal(probabilityView(f.draft.state[0]).probability,null);time+=5;
 }
});
test('review: every missing five-second slot breaks the chart, including boundary offsets',()=>{
 for(const [a,b,missing] of [[0,5,0],[0,10,1],[4,10,1],[4,9,0],[0,15,2]]){
  const f=launch(fixture());if(a)observe(f.draft,f.g,{stamp:stamp(a),trigger:'edit_cancel'});
  observe(f.draft,f.g,{stamp:stamp(b)});const points=probabilityView(f.g).points;
  assert.equal(points.at(-1).missingIntervals,missing);assert.equal(points.at(-1).gapBefore,missing>0);
  const svg=renderChart(points.slice(-2));assert.equal(svg.includes('stroke-width="3"'),missing===0);
 }
});
test('review: API reason matches observation availability and status',()=>{
 const f=fixture();assert.equal(probabilityView(f.g).reason,'NO_COMMITTED_OBSERVATION');
 setPregame(f.draft,f.g,f.prior,stamp(0));assert.equal(probabilityView(f.g).reason,null);
 f.g.lifecycle='ACTIVE';observe(f.draft,f.g,{stamp:stamp(0)});assert.equal(probabilityView(f.g).reason,null);
 observe(f.draft,f.g,{stamp:stamp(5),forceBlock:'CHAIRMAN_OVERRIDE'});assert.equal(probabilityView(f.g).reason,'CHAIRMAN_OVERRIDE');
});
test('review: tooltip reads scores from persisted model input',()=>{
 const f=launch(fixture());f.g.scores['1']=[3,7];observe(f.draft,f.g,{stamp:stamp(5)});
 const svg=renderChart(probabilityView(f.g).points);assert.match(svg,/\| 7-3 \|/);assert.doesNotMatch(svg,/undefined/);
});
test('supplied 14 worked examples retain exact math; final boundaries reject corrupt inputs',()=>{
 const examples=JSON.parse(fs.readFileSync('tests/v506/fixtures/wp-example-inputs.json'));
 assert.equal(examples.length,14);
 for(const s of examples)assert.ok(Math.abs(calculate(s).probability*100-s.expectedFavoritePercent)<.005,s.eventId);
 for(const patch of [{period:0},{clockSeconds:-1},{quarterSeconds:Number.MAX_VALUE},{gameId:' '},{favoriteScore:-1}])assert.throws(()=>calculate({...examples.at(-1),...patch}));
});
test('pregame is updateable before launch, frozen at kickoff, and no rating-to-margin inference',()=>{
 const f=fixture();setPregame(f.draft,f.g,f.prior,stamp(0));const old=structuredClone(f.g.winProbability);
 f.draft.stateVersion++;setPregame(f.draft,f.g,{...f.prior,pregameMargin:3},stamp(1));
 assert.ok(probabilityView(f.g).probability<old.records[0].probability);assert.deepEqual(f.g.winProbability.records[0],old.records[0]);
 f.g.lifecycle='ACTIVE';observe(f.draft,f.g,{stamp:stamp(2)});
 assert.equal(probabilityView(f.g).probability,1/(1+Math.exp(-.14*3)));
 assert.throws(()=>setPregame(f.draft,f.g,f.prior,stamp(3)),/PREGAME_FROZEN/);
});
test('missing or mismatched source inputs are BLOCKED; betting source not accepted',()=>{
 const f=fixture();f.g.lifecycle='ACTIVE';observe(f.draft,f.g,{stamp:stamp(0)});assert.equal(probabilityView(f.g).reason,'PREGAME_INPUTS_MISSING');
 for(const patch of [{source:{...f.prior.source,kind:'BETTING_LINE'}},{source:{...f.prior.source,contextHash:'wrong'}},{favoriteTeamId:'UNKNOWN'},{pregameMargin:undefined}]){
  const x=fixture();assert.throws(()=>setPregame(x.draft,x.g,{...x.prior,...patch},stamp(0)));
 }
});
test('P1-1 session namespacing isolates identical game and run IDs',()=>{
 const a=launch(fixture('qa-A')),b=launch(fixture('qa-B'));
 assert.notEqual(a.g.winProbability.records.at(-1).key,b.g.winProbability.records.at(-1).key);
 assert.throws(()=>appendRecord(a.g.winProbability,{...strip(b.g.winProbability.records.at(-1)),eventId:'different'}),/IDENTITY_CHANGED/);
});
test('P1-2 event identity excludes revision; exact retry no-op; changed revision and second kickoff rejected',()=>{
 const f=launch(fixture()),h=f.g.winProbability,r=strip(h.records.at(-1));
 assert.equal(appendRecord(h,r),h);
 assert.throws(()=>appendRecord(h,{...r,stateRevision:r.stateRevision+1}),/EVENT_CONFLICT/);
 assert.throws(()=>appendRecord(h,{...r,eventId:'second-kickoff'}),/DUPLICATE_KICKOFF/);
});
test('P1-3 recovery reconciles reordered original events, detects missing/tampered records and preserves prefix',()=>{
 const f=launch(fixture());f.draft.stateVersion++;observe(f.draft,f.g,{stamp:stamp(5)});const h=f.g.winProbability;
 assert.deepEqual(recoverHistory(null,[...h.records].reverse()),h);
 assert.deepEqual(recoverHistory({version:h.version,records:h.records.slice(0,1)},h.records.slice(1).reverse()),h);
 assert.throws(()=>recoverHistory(null,h.records.slice(1)),/RECOVERY_GAP/);
 assert.throws(()=>recoverHistory(null,h.records.map((r,i)=>i===1?{...r,probability:.99}:r)),/HASH_INVALID/);
 const changed=structuredClone(f.g);changed.winProbability.records[0].prior.pregameMargin=99;
 assert.throws(()=>assertHistoryPreserved(f.g,changed),/REWRITTEN/);
});
test('P1-4 model, prior and revision cannot silently change within frozen history',()=>{
 const f=launch(fixture()),r=strip(f.g.winProbability.records.at(-1));r.eventId='poll:later';r.kind='poll';r.stateRevision++;
 assert.throws(()=>appendRecord(f.g.winProbability,{...r,modelId:MODEL.id+'-different'}),/MODEL_MISMATCH/);
 assert.throws(()=>appendRecord(f.g.winProbability,{...r,prior:{...r.prior,pregameMargin:1}}),/FROZEN_PRIOR/);
 assert.throws(()=>appendRecord(f.g.winProbability,{...r,stateRevision:0}),/REVISION_REVERSED/);
});
test('probability state and recovery journal must commit together with matching session identity',()=>{
 const f=fixture(),before=structuredClone(f.draft);launch(f);
 const events=f.g.winProbability.records.map(payload=>({type:'V506_WP_OBSERVATION',gameId:f.g.id,payload}));
 assert.doesNotThrow(()=>assertHistoryEvents(before,f.draft,events));
 assert.throws(()=>assertHistoryEvents(before,f.draft,events.slice(1)),/AUDIT_COUNT/);
 assert.throws(()=>assertHistoryEvents(before,f.draft,events.map((e,i)=>i===0?{...e,gameId:'wrong'}:e)),/AUDIT_RECORD/);
});
test('five-second slots, unchanged paused state and outage gaps are explicit; reads append nothing',()=>{
 const f=launch(fixture()),p=probabilityView(f.g).probability;
 assert.equal(observe(f.draft,f.g,{stamp:stamp(4)}),null);
 f.draft.stateVersion++;assert.ok(observe(f.draft,f.g,{stamp:stamp(5)}));assert.equal(probabilityView(f.g).probability,p);
 f.draft.stateVersion++;observe(f.draft,f.g,{stamp:stamp(30)});
 const last=f.g.winProbability.records.at(-1);assert.equal(last.gapBefore,true);assert.equal(last.missingIntervals,4);
 const before=structuredClone(f.g);for(let i=0;i<20;i++)probabilityView(f.g);assert.deepEqual(f.g,before);
});
test('observed scores and possession change live probability; model cannot see queued plays or RNG',()=>{
 const f=launch(fixture());f.g.history=[{preSnap:{},adjudicated:{}}];f.g.scoreboardSeconds=300;
 const input=modelInput(f.g,f.prior,'poll',stamp(5),3),baseline=calculate(input).probability;
 assert.ok(calculate({...input,favoriteScore:7}).probability>baseline);
 assert.ok(calculate({...input,otherScore:7}).probability<baseline);
 assert.ok(calculate({...input,possessionTeamId:input.favoriteTeamId}).probability>calculate({...input,possessionTeamId:input.otherTeamId}).probability);
 f.g.pendingPlay={points:99};f.g.rngState=[0];assert.deepEqual(modelInput(f.g,f.prior,'poll',stamp(5),3),input);
});
test('first resolved gameplay gets an immediate record even inside the current five-second slot',async()=>{
 const f=launch(fixture());f.g.auto=true;const before=structuredClone(f.g.winProbability);
 const ops=withProbability(createEngineOperations({engine,clock:()=>stamp(1)}),{clock:()=>stamp(1)});
 await ops.advance(f.draft,{seconds:100});const last=f.draft.state[0].winProbability.records.at(-1);
 assert.equal(last.kind,'first_play');assert.ok(last.resolvedPlays>0);assert.deepEqual(f.draft.state[0].winProbability.records.slice(0,before.records.length),before.records);
});
test('every override blocks grey, preserves old points, and continues blocked; pause/delay do not',async()=>{
 for(const command of ['score','clock_set','edit_commit','end','reopen_live']){
  const f=launch(fixture()),old=structuredClone(f.g.winProbability.records),clock=()=>stamp(5);
  if(command==='edit_commit')engine.beginEdit(f.g,{});
  if(command==='reopen_live'){f.g.lifecycle='FINAL_PENDING';f.g.scores['4']=[7,0];}
  const ops=withProbability(createEngineOperations({engine,clock}),{clock});
  await ops.executeCommand(f.draft,{id:f.g.id,command,payload:{team:0,points:7,seconds:300,confirmed:true,resumeAuto:true}});
  const g=f.draft.state[0],view=probabilityView(g);assert.equal(view.status,'BLOCKED',command);assert.equal(view.color,'#808080');assert.equal(view.probability,null);
  assert.deepEqual(g.winProbability.records.slice(0,old.length),old);
  if(!['FINAL_PENDING','LOCKED'].includes(g.lifecycle)){f.draft.stateVersion++;observe(f.draft,g,{stamp:stamp(10)});assert.equal(probabilityView(g).reason,'CHAIRMAN_OVERRIDE');}
 }
 for(const command of ['pause','delay']){
  const f=launch(fixture()),clock=()=>stamp(5),ops=withProbability(createEngineOperations({engine,clock}),{clock});
  await ops.executeCommand(f.draft,{id:f.g.id,command,payload:{}});assert.equal(probabilityView(f.draft.state[0]).status,'ESTIMATED');
 }
});
test('edit cancel retains observations; analytics stamps do not invalidate correction tokens',async()=>{
 const f=launch(fixture());let time=5;const clock=()=>stamp(time),ops=withProbability(createEngineOperations({engine,clock}),{clock});
 await ops.executeCommand(f.draft,{id:f.g.id,command:'edit_begin',payload:{}});
 const g=f.draft.state[0],token=editToken(g),old=structuredClone(g.winProbability.records);f.draft.stateVersion++;time=10;
 await ops.advance(f.draft,{seconds:5});assert.equal(editToken(f.draft.state[0]),token);
 time=15;await ops.executeCommand(f.draft,{id:g.id,command:'edit_cancel',payload:{}});
 assert.deepEqual(f.draft.state[0].winProbability.records.slice(0,old.length),old);assert.equal(probabilityView(f.draft.state[0]).status,'ESTIMATED');
});
test('final is immediate and terminal; post-final polling rejected; OT estimates explicitly blocked',()=>{
 const f=launch(fixture());f.g.activePeriod='OT';f.draft.stateVersion++;observe(f.draft,f.g,{stamp:stamp(5)});assert.equal(probabilityView(f.g).reason,'OVERTIME_MODEL_UNAVAILABLE');
 f.g.lifecycle='FINAL_PENDING';f.g.scores.OT=[0,7];observe(f.draft,f.g,{stamp:stamp(6)});assert.equal(probabilityView(f.g).probability,1);
 const r=strip(f.g.winProbability.records.at(-1));assert.throws(()=>appendRecord(f.g.winProbability,{...r,kind:'poll',eventId:'after-final'}),/AFTER_FINAL/);
 assert.equal(observe(f.draft,f.g,{stamp:stamp(20)}),null);
});
test('chart renders BLOCKED grey with label, escapes text and never connects across known gaps',()=>{
 const f=launch(fixture());f.draft.stateVersion++;observe(f.draft,f.g,{stamp:stamp(5)});
 f.draft.stateVersion++;observe(f.draft,f.g,{stamp:stamp(10),forceBlock:'CHAIRMAN_OVERRIDE'});
 const svg=renderChart(probabilityView(f.g).points,{title:'<test>'});assert.match(svg,/>BLOCKED</);assert.match(svg,/#808080/);assert.match(svg,/&lt;test&gt;/);assert.doesNotMatch(svg,/<test>/);
 const p={probability:.5,trace:{T:2400,t:2400}};
 const gap=renderChart([p,{...p,trace:{T:2400,t:2300},gapBefore:true}]);assert.doesNotMatch(gap,/stroke-width="3"/);
});
test('56 matchups: observer enabled/disabled gives identical football state and outcomes at 1x and 50x',async()=>{
 for(let i=0;i<56;i++)for(const speed of [1,50]){
  const f=launch(fixture('qa-invariance',i));f.g.auto=true;f.g.speed=speed;
  const expected=structuredClone(f.g);delete expected.winProbability;engine.advanceGame(expected,20000);
  const ops=withProbability(createEngineOperations({engine,clock:()=>stamp(20000/speed)}),{clock:()=>stamp(20000/speed)});
  await ops.advance(f.draft,{seconds:20000/speed});assert.deepEqual(clean(f.draft.state[0]),clean(expected));
 }
});
