import test from 'node:test';import assert from 'node:assert/strict';
import {createWpSampler} from '../../release-assets/v5.1.0/backend/probability/sampler.mjs';
test('central sweep needs no browser, prevents overlap, and reports isolated worker failures',async()=>{
 let release;const pause=new Promise(r=>release=r),calls=[];
 const sweep=createWpSampler({listSessions:async()=>['qa-v510-a','qa-v510-b'],pipeline:{sample:async(sid,clock)=>{calls.push([sid,clock()]);if(sid==='qa-v510-a'){await pause;throw Error('STORAGE_UNAVAILABLE');}return {records:56};}},clock:()=> '2026-11-04T15:00:00Z'});
 const running=sweep();assert.equal((await sweep()).skipped,'SWEEP_IN_PROGRESS');release();const r=await running;assert.equal(r.results[0].error,'STORAGE_UNAVAILABLE');assert.equal(r.results[1].result.records,56);assert.equal(calls.length,2);
});
