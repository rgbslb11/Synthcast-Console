// Manual private-restore probe. RPC files contain private runtime data: never publish them.
// Requires the guarded connector bridge documented in the recovery report; this is not a CI test.
import fs from 'node:fs';import readline from 'node:readline';import assert from 'node:assert/strict';
import {DatabaseStore} from '../../release-assets/v5.0.1/backend/src/database-store.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.1/backend/src/engine-operations.mjs';
import * as engine from '../../release-assets/v5.0.1/backend/runtime/engine.mjs';
import {SecurityError} from '../../release-assets/v5.0.1/backend/security/security-core.mjs';
let seq=0;const waiting=new Map();
readline.createInterface({input:process.stdin}).on('line',line=>{const {id,file}=JSON.parse(line),r=JSON.parse(fs.readFileSync(file));const p=waiting.get(id);waiting.delete(id);if(r.error){const e=new SecurityError(r.error.includes('idempotency conflict')?'IDEMPOTENCY_CONFLICT':'RPC_ERROR',409);p.reject(e);}else p.resolve(r.data);});
const rpc=(name,args)=>new Promise((resolve,reject)=>{const id=++seq,file=process.cwd()+'/rpc-'+id+'.json';fs.writeFileSync(file,JSON.stringify({name,args}));waiting.set(id,{resolve,reject});console.log(JSON.stringify({rpc:true,id,file,name}));});
const slug='w7v501-0000000000000001';
try{
 const store=new DatabaseStore({rpc});const before=await store.snapshot(slug),stamp=new Date(Date.parse(before.lastAdvancedAt)+1000).toISOString();
 const ops=createEngineOperations({engine,clock:()=>stamp}),expected=structuredClone(before);await ops.advance(expected,{seconds:1});
 const input={slug,actorId:'SCHEDULER',idempotencyKey:'recovery-r2-app-probe-20261014',request:{probe:'saved-R2-recovery',seconds:1},expectedVersion:before.stateVersion,mutate:d=>ops.advance(d,{seconds:1})};
 const saved=await store.commit(input);assert.equal(saved.state_version,before.stateVersion+1);assert.equal(saved.replayed,false);
 const replay=await store.commit({...input,mutate:()=>{throw Error('Replay must not execute')}});assert.equal(replay.replayed,true);assert.equal(replay.state_version,saved.state_version);
 await assert.rejects(store.commit({...input,request:{probe:'changed-input'}}),e=>e.code==='IDEMPOTENCY_CONFLICT');
 const after=await store.snapshot(slug);assert.equal(after.stateVersion,before.stateVersion+1);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.finals,before.finals);
 const pub=await store.read(slug);assert.equal(pub.state.length,54);
 const result={scope:'Exact deployed application modules with connector transport to private restored Postgres; no separate Edge deployment or browser acceptance',beforeVersion:before.stateVersion,afterVersion:after.stateVersion,exactEngineContinuation:true,commitPersisted:true,replayExactlyOnce:true,conflictRejected:true,reopenedPublicGames:pub.state.length,finalsPreserved:after.finals.length};
 fs.writeFileSync('application-recovery-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({done:true,result}));process.exit(0);
}catch(e){console.log(JSON.stringify({done:true,error:String(e),stack:e.stack}));process.exit(1);}

