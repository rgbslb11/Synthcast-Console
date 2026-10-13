import assert from 'node:assert/strict';import test from 'node:test';
import {DatabaseStore} from '../../release-assets/v5.0.1/backend/src/database-store.mjs';
import {controlToken,editToken} from '../../release-assets/v5.0.1/backend/src/command-preconditions.mjs';
import {SecurityError,CANONICAL_GAME_IDS,FINAL_GAME_IDS} from '../../release-assets/v5.0.1/backend/security/security-core.mjs';
import * as engine from '../../release-assets/v5.0.1/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.1/backend/runtime/week7.mjs';
const slug='w7v501-0000000000000001';
function harness(){
 const finals=FINAL_GAME_IDS.map(id=>({id,kickoffOrder:CANONICAL_GAME_IDS.indexOf(id)+1,lifecycle:'READY',activity:'FINAL',immutableFinal:true,qaOnly:false}));
 let row={session_id:'session',public_slug:slug,owner_user_id:'owner',week_key:'2026-W07',engine_version:engine.ENGINE_VERSION,data_version:engine.DATA_VERSION,state_version:1,last_advanced_at:'2026-10-13T12:00:00Z',state:OPERATING_SLATE.map(s=>({...engine.initialGame(s),qaOnly:true}))};
 const receipts=new Map();let collisions=0,alterTarget=false,mutations=0;
 const rpc=async(name,p)=>{
  if(name==='read_session')return [structuredClone(row)];if(name==='read_final_snapshots')return structuredClone(finals);
  const key=p.p_actor_id+'|'+p.p_idempotency_key;
  if(name==='read_request'){const found=receipts.get(key);if(found&&found.hash!==p.p_request_hash)throw new SecurityError('IDEMPOTENCY_CONFLICT',409);return found?[{response:structuredClone(found.response)}]:[];}
  if(name==='commit_state'){
   if(collisions-->0){row.state_version++;row.state[1].glSeconds++;if(alterTarget)row.state[0].auto=true;throw new SecurityError('VERSION_CONFLICT',409);}
   assert.equal(p.p_expected_version,row.state_version);row.state=structuredClone(p.p_state);row.state_version++;mutations++;
   const response={public_slug:slug,engine_version:engine.ENGINE_VERSION,week_key:'2026-W07',state_version:row.state_version,...(p.p_actor_id==='SCHEDULER'?{receipt_format:'scheduler-v1'}:{state:structuredClone(row.state)})};
   receipts.set(key,{hash:p.p_request_hash,response});return [{response,replayed:false}];
  }throw Error(name);
 };
 const store=new DatabaseStore({rpc});return {store,get row(){return row},get mutations(){return mutations},receipts,conflict:(n,target=false)=>{collisions=n;alterTarget=target}};
}
function request(h,{command='auto',token=controlToken(h.row.state[0]),actorId='owner',key='request-key-0000001',expectedVersion=1}={}){const id=h.row.state[0].id;return {slug,actorId,idempotencyKey:key,expectedVersion,request:{body:{id,command,game_tokens:{[id]:token}}},mutate:async draft=>{draft.state[0].auto=!draft.state[0].auto;return {events:[{type:'V501_AUTO',gameId:id,payload:{}}]}}};}
test('unrelated scheduler version churn retries with current CAS; no blind board overwrite',async()=>{const h=harness();h.conflict(2);const result=await h.store.commit(request(h));assert.equal(result.state_version,4);assert.equal(h.row.state[1].glSeconds,2);assert.equal(h.mutations,1)});
test('three unrelated CAS collisions return busy without changing the game',async()=>{const h=harness();h.conflict(3);await assert.rejects(h.store.commit(request(h)),{code:'VERSION_CONFLICT'});assert.equal(h.mutations,0);assert.equal(h.row.state[0].auto,false)});
test('concurrent target control change rejects safely',async()=>{const h=harness();h.conflict(1,true);await assert.rejects(h.store.commit(request(h)),{code:'GAME_STATE_CHANGED'});assert.equal(h.mutations,0)});
test('same key returns original receipt once, even after newer versions; changed body conflicts',async()=>{const h=harness(),r=request(h);const first=await h.store.commit(r);h.row.state_version+=3;const replay=await h.store.commit(r);assert.equal(replay.state_version,first.state_version);assert.equal(replay.replayed,true);assert.equal(h.mutations,1);r.request.body.command='end';await assert.rejects(h.store.commit(r),{code:'IDEMPOTENCY_CONFLICT'})});
test('edit token ignores only elapsed GL, detects real field changes',async()=>{const h=harness(),g=h.row.state[0];g.lifecycle='EDIT';const token=editToken(g);g.glSeconds+=500;assert.equal(editToken(g),token);const r=request(h,{command:'edit_commit',token});g.fieldPos++;await assert.rejects(h.store.commit(r),{code:'GAME_STATE_CHANGED'})});
test('missing token never bypasses strict session-version protection',async()=>{const h=harness(),r=request(h);delete r.request.body.game_tokens;h.row.state_version=2;await assert.rejects(h.store.commit(r),{code:'VERSION_CONFLICT'})});
test('scheduler compact receipt replays exact committed version without full-board state',async()=>{const h=harness(),r=request(h,{actorId:'SCHEDULER'});const first=await h.store.commit(r);assert.equal(first.state,undefined);assert.equal(first.receipt_format,'scheduler-v1');assert.ok(JSON.stringify(first).length<350);h.row.state_version++;const again=await h.store.commit(r);assert.equal(again.state_version,first.state_version);assert.equal(again.replayed,true)});
test('500 namespace denied and public read exposes no private/control witnesses',async()=>{const h=harness();await assert.rejects(h.store.read('w7v500-0000000000000001'));const b=await h.store.read(slug);assert.equal(b.state.length,54);assert.equal(b.state.some(g=>'control_token'in g||'rngState'in g||'history'in g),false)});
test('operator render receives tokens without RNG/history disclosure',async()=>{const h=harness(),b=await h.store.read(slug,{operator:true});assert.equal(b.state.length,54);assert.match(b.state.find(g=>g.id===h.row.state[0].id).control_token,/^[a-f0-9]{64}$/);assert.equal(b.state.some(g=>'rngState'in g||'history'in g),false)});
