import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from '../../scripts/qa/wp-sustained-load.mjs';
test('sustained QA never sends requests without credentials and source revision',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('unexpected');};
 assert.equal((await run({fetchImpl})).status,'BLOCKED');assert.equal((await run({email:'qa',password:'secret',fetchImpl})).reason,'SOURCE_REVISION_REQUIRED');assert.equal(calls,0);
});
test('initial access denial prevents football commands and still signs out',async()=>{
 const requests=[];
 const report=await run({email:'qa',password:'never-output-password',expectedVersion:10,fetchImpl:async(url,options)=>{
 requests.push(url);
 if(url.includes('/token?'))return Response.json({access_token:'never-output-token',user:{id:'qa',is_anonymous:false}});
 if(url.includes('/logout'))return new Response(null,{status:204});
 return Response.json({error:'forbidden'},{status:403});
 }});
 assert.equal(report.status,'FAIL');assert.equal(report.reason,'HTTP_403');assert.equal(report.logout,'PASS');assert(!requests.some(u=>u.includes('qa-commands')));assert(!JSON.stringify(report).includes('never-output'));
});
