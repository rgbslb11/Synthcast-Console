import test from 'node:test';import assert from 'node:assert/strict';
import {createCommandClient} from '../../release-assets/v5.1.0/ui/commands.mjs';
const request={session:'qa-v510-commands',game:'G0502',command:'pause',stateVersion:24,token:'fixture-only'};
test('ambiguous toggle retry preserves exact key/body and blocks a second action',async()=>{
 const calls=[];const c=createCommandClient({fetchImpl:async(u,i)=>{calls.push({u,...i});if(calls.length===1)throw Error('lost response');return Response.json({stateVersion:25,replayed:true});}});
 await assert.rejects(c.send(request),/lost response/);assert.equal(c.pending,true);await assert.rejects(c.send({...request,command:'auto'}),/PENDING/);assert.deepEqual(await c.retry(request.token),{stateVersion:25,replayed:true});assert.deepEqual(calls[0],calls[1]);assert.equal(c.pending,false);
});
test('duplicate clicks while request is in flight never submit twice',async()=>{
 let release,calls=0;const c=createCommandClient({fetchImpl:async()=>{calls++;await new Promise(r=>release=r);return Response.json({stateVersion:25,replayed:false});}});const first=c.send(request);await assert.rejects(c.send(request),/PENDING/);await assert.rejects(c.retry(request.token),/BUSY/);release();await first;assert.equal(calls,1);
});
test('denial/conflict clear request; server failure and malformed receipts retain exact retry',async()=>{
 for(const status of [401,403,409,503]){const c=createCommandClient({fetchImpl:async()=>new Response('',{status})});await assert.rejects(c.send(request));assert.equal(c.pending,status===503);}
 const c=createCommandClient({fetchImpl:async()=>Response.json({stateVersion:99,replayed:false})});await assert.rejects(c.send(request),/INVALID_COMMAND_RECEIPT/);assert.equal(c.pending,true);
});
test('production, acceptance, purge and invalid versions never reach network',async()=>{
 let calls=0;const c=createCommandClient({fetchImpl:async()=>{calls++;}});for(const change of [{session:'production'},{command:'accept'},{command:'purge_new_seed'},{stateVersion:-1},{token:''}])await assert.rejects(c.send({...request,...change}));assert.equal(calls,0);
});
