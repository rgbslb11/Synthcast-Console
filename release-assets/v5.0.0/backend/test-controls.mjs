import assert from 'node:assert/strict';
import {createReleaseRuntime} from './src/release-runtime.mjs';
import {OPERATING_SLATE} from './runtime/week7.mjs';
const origin='https://rgbslb11.github.io',stamp='2026-10-12T14:00:00Z';
const runtime=createReleaseRuntime({allowedOrigins:[origin],schedulerSecret:'test-only-secret',clock:()=>stamp,transport:{rpc:async()=>{throw Error('Unexpected real persistence')},authenticate:async()=>({id:'test'}),authorize:async()=>({userId:'test',role:'CHAIRMAN',active:true})}});
let draft;
runtime.store.commit=async({mutate})=>{const result=await mutate(draft);return {state:draft.state,events:result.events};};
const reset=(life='FINAL_PENDING',hours=30)=>{draft={state:OPERATING_SLATE.map(s=>({...runtime.engine.initialGame(s),lifecycle:life,qaOnly:false})),lastAdvancedAt:new Date(Date.parse(stamp)-hours*3600000).toISOString()};};
async function command(command,payload={}){return runtime.chairmanHandler(new Request(origin+'/?api=command&session=w7v500-17e1dde75f5b1cba',{method:'POST',headers:{origin,authorization:'Bearer test','idempotency-key':'test-request-123456'},body:JSON.stringify({id:draft.state[0].id,command,payload,expected_version:1})}));}
let count=0;
async function check(name,life,cmd,payload={},hours=30,status=201){reset(life,hours);const r=await command(cmd,payload);assert.equal(r.status,status,name+': '+await r.text());count++;}
await check('Edit final after idle','FINAL_PENDING','edit_begin');
await check('Lock after idle','FINAL_PENDING','lock');
await check('Accept after idle','LOCKED','accept',{confirmed:true});
await check('Purge after idle','FINAL_PENDING','purge_new_seed',{confirmed:true});
await check('Launch after idle','UNLAUNCHED','launch');
await check('Dead-Man after idle','UNLAUNCHED','deadman_arm',{basis:'TV_START',offsetMinutes:0,tvStartZulu:'2026-10-12T15:00:00Z'});
await check('Start Auto','ACTIVE','auto',{},0);
reset('ACTIVE',0);draft.state[0].auto=true;assert.equal((await command('auto')).status,201);assert.equal(draft.state[0].auto,false);count++;
await check('Final','ACTIVE','end',{confirmed:true},0);
for(const life of ['ACTIVE','EDIT','DELAY'])await check('Retain outage guard '+life,life,'edit_begin',{},30,409);
reset();draft.lastAdvancedAt='invalid';assert.equal((await command('lock')).status,409);count++;
reset();draft.lastAdvancedAt='2026-10-13T00:00:00Z';assert.equal((await command('lock')).status,409);count++;
reset();const before=structuredClone(draft.state);await command('lock');for(let i=0;i<41;i++){assert.deepEqual(draft.state[i].history,before[i].history);assert.deepEqual(draft.state[i].rngState,before[i].rngState);assert.equal(draft.state[i].glSeconds,before[i].glSeconds);}count++;
const options=await runtime.chairmanHandler(new Request(origin+'/',{method:'OPTIONS',headers:{origin}}));assert.equal(options.headers.get('access-control-max-age'),'600');count++;
console.log(JSON.stringify({passed:count,note:'Real request handler and engine, in-memory commit boundary; no production mutations'}));
