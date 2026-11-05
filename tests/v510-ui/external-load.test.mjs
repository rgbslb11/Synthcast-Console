import test from 'node:test';import assert from 'node:assert/strict';
import {run} from '../../scripts/qa/wp-external-load.mjs';
function harness(failAt=Infinity){let reads=0,version=3,t=0,loggedOut=false;return {get reads(){return reads;},get loggedOut(){return loggedOut;},opts:{expectedVersion:3,email:'qa@example.invalid',password:'never-log',now:()=>t,sleep:async ms=>{t+=ms;},fetchImpl:async(url,init)=>{
 if(url.includes('/token?'))return Response.json({access_token:'private-token',user:{id:'test'}});
 if(url.includes('/logout?')){loggedOut=true;return new Response(null,{status:204});}
 if(url.includes('qa-commands?')){version++;return Response.json({stateVersion:version});}
 reads++;if(reads===failAt)return new Response(null,{status:429,headers:{'Retry-After':'60'}});
 const q=new URL(url).searchParams;assert.match(q.get('game'),/^G0[0-9]{3}$/);assert.ok(Number(q.get('game').slice(1))>=502&&Number(q.get('game').slice(1))<=557);return Response.json({summary:{sessionId:q.get('session'),gameId:q.get('game'),stateVersion:version},points:[]});
 }}};}
test('missing credentials block without any network request',async()=>{const r=await run({fetchImpl:()=>assert.fail()});assert.equal(r.status,'BLOCKED');});
test('six rounds preserve all 56 game reads and fixed cadence; secrets omitted',async()=>{const h=harness(),r=await run(h.opts);assert.equal(r.status,'PASS');assert.equal(r.rounds.length,6);assert.ok(r.rounds.every(x=>x.reads===56&&x.startLagMs===0));assert.equal(h.reads,337);assert.equal(r.commands.length,6);assert.ok(h.loggedOut);assert.doesNotMatch(JSON.stringify(r),/never-log|private-token/);});
test('throttling stops without retry and awaits command before logout',async()=>{const h=harness(4),r=await run(h.opts);assert.equal(r.status,'FAIL');assert.equal(r.reason,'HTTP_429');assert.equal(r.rounds.length,1);assert.equal(h.reads,57);assert.ok(h.loggedOut);});
