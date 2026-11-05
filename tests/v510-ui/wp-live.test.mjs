import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readWp,WP_URL} from '../../public/v5.1.0/review/wp-transport.mjs';
import {signIn,signOut} from '../../public/v5.1.0/review/auth.mjs';
const response=JSON.parse(fs.readFileSync('public/v5.1.0/review/fixtures/wp.json')).fixtures.live;
const req={session:response.summary.sessionId,game:response.summary.gameId,token:'test-only'};
test('live WP uses fixed QA URL, user bearer and bounded GET history',async()=>{
 const calls=[];const actual=await readWp({...req,fetchImpl:async(url,init)=>{calls.push({url,init});const points=calls.length===1?response.points.slice(0,1):response.points.slice(1);return Response.json({...response,points,nextSequence:points.at(-1).observationSequence});}});
 assert.deepEqual(actual.points,response.points);assert.equal(calls.length,2);
 assert.equal(calls[0].url.origin+calls[0].url.pathname,WP_URL);assert.equal(calls[1].url.searchParams.get('through'),String(response.highWatermark));
 for(const {init} of calls){assert.equal(init.method,'GET');assert.equal(init.headers.Authorization,'Bearer test-only');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');}
});
test('denied WP, invalid identity and incomplete history never return cached data',async()=>{
 for(const status of [401,403,429,503])await assert.rejects(readWp({...req,fetchImpl:async()=>new Response('',{status})}));
 for(const body of [{...response,summary:{...response.summary,gameId:'G9999'}},{...response,points:[],nextSequence:0},{...response,summary:{...response.summary,probability:1.5}}])await assert.rejects(readWp({...req,fetchImpl:async()=>Response.json(body)}));
});
test('WP scope and token checked without network or writes',async()=>{
 let calls=0;for(const invalid of [{session:'production'},{game:'invalid'},{token:''}])await assert.rejects(readWp({...req,...invalid,fetchImpl:async()=>{calls++;}}));assert.equal(calls,0);
});
test('WP pending source discards all points; correction cannot contain current probability',async()=>{
 const blocked={...response,summary:{...response.summary,status:'BLOCKED',probability:null,reason:'WP_SOURCE_PENDING'}};
 assert.deepEqual((await readWp({...req,fetchImpl:async()=>Response.json(blocked)})).points,[]);
 await assert.rejects(readWp({...req,fetchImpl:async()=>Response.json({...blocked,summary:{...blocked.summary,probability:0.7}})}));
});
test('password sign-in posts only to fixed Auth endpoint and retains no refresh token',async()=>{
 let request;const result=await signIn({email:'qa@example.invalid',password:'test-only',fetchImpl:async(url,init)=>{request={url,init};return Response.json({access_token:'test-only',refresh_token:'never-return',expires_in:3600,user:{id:'qa',is_anonymous:false}});}});
 assert.equal(request.url,'https://xsvdmcipviejxynkdbhq.supabase.co/auth/v1/token?grant_type=password');assert.equal(request.init.method,'POST');assert.deepEqual(JSON.parse(request.init.body),{email:'qa@example.invalid',password:'test-only'});assert.deepEqual(Object.keys(result),['token','expiresAt']);
});
test('sign-in rejects failure, throttling, anonymous and malformed sessions',async()=>{
 for(const status of [400,401,429,503])await assert.rejects(signIn({fetchImpl:async()=>new Response('',{status})}));
 for(const body of [{},{access_token:'x',expires_in:1,user:{id:'anon',is_anonymous:true}}])await assert.rejects(signIn({fetchImpl:async()=>Response.json(body)}));
});
test('sign-out revokes only this QA session and accepts already expired token',async()=>{
 let called=false;await signOut('test-only',{fetchImpl:async(url,init)=>{called=true;assert.match(url,/logout\?scope=local$/);assert.equal(init.headers.Authorization,'Bearer test-only');return new Response(null,{status:204});}});assert.ok(called);
 await signOut('expired',{fetchImpl:async()=>new Response(null,{status:401})});
});
