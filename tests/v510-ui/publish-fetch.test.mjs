import test from 'node:test';import assert from 'node:assert/strict';
import {fetchPublishedFile} from '../../scripts/ui/fetch-preserved.mjs';
test('preservation downloads retry temporary 503s and return exact bytes',async()=>{
 let calls=0;const waits=[],bytes=Uint8Array.from([0,255,10,13]);
 const b=await fetchPublishedFile('https://example.invalid/file',{fetchImpl:async()=>++calls<3?new Response(null,{status:503}):new Response(bytes),sleep:async ms=>waits.push(ms)});
 assert.deepEqual(b,Buffer.from(bytes));assert.equal(calls,3);assert.deepEqual(waits,[500,1000]);
});
test('preservation retries are bounded; permanent failures never bypass verification',async()=>{
 for(const [status,expected] of [[503,4],[404,1],[403,1]]){let calls=0;await assert.rejects(fetchPublishedFile('https://example.invalid/file',{fetchImpl:async()=>{calls++;return new Response(null,{status});},sleep:async()=>{}}),new RegExp(`HTTP_${status}`));assert.equal(calls,expected);}
 let calls=0;assert.equal((await fetchPublishedFile('https://example.invalid/file',{fetchImpl:async()=>{if(++calls===1)throw Error('network');return new Response('exact');},sleep:async()=>{}})).toString(),'exact');
});
