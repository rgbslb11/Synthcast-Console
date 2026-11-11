import test from 'node:test';import assert from 'node:assert/strict';
import {runSchedulerSweep} from '../../release-assets/v5.0.7-week12-operating/backend/src/scheduler-runner.mjs';
const url='https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-week12-v5-0-7-scheduler';
test('operating cron sweep signs and dispatches to the actual operating endpoint',async()=>{
 let dispatched=0;const r=await runSchedulerSweep({url,secret:'fixture-only',rpc:async name=>{assert.equal(name,'scheduler_sessions');return [{public_slug:'w12v507-0000000000000001',state_version:9}];},fetchImpl:async(target,options)=>{assert.equal(String(target),url);assert.ok(options.headers['x-gamecast-signature']);assert.equal(JSON.parse(options.body).expected_version,9);dispatched++;return new Response(JSON.stringify({state_version:10,replayed:false}),{status:201});}});
 assert.equal(dispatched,1);assert.equal(r.processed,1);assert.equal(r.results[0].status,201);assert.equal(r.results[0].stateVersion,10);
});
test('operating sweep rejects a QA endpoint before discovery or dispatch',async()=>{
 await assert.rejects(runSchedulerSweep({url:url.replace('-scheduler','-qa-scheduler'),secret:'fixture-only',rpc:async()=>{throw Error('must not discover');}}),/Canonical HTTPS scheduler URL required/);
});
