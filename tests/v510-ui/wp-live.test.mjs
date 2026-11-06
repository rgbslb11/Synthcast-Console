import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readWp,WP_URL} from '../../public/v5.1.0/review/wp-transport.mjs';
import {signIn,signOut,authMessage} from '../../public/v5.1.0/review/auth.mjs';
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

import {readWpBoard,selectWpResponse,wpMatchesData} from '../../public/v5.1.0/review/wp-transport.mjs';
test('unchanged final requires caught-up server proof without changing observation revision',()=>{
 const summary={...response.summary,status:'FINAL',probability:0},data={...summary,stateVersion:summary.stateVersion+1};
 const final={...response,summary,verifiedSourceVersion:data.stateVersion};
 const before=JSON.stringify(final);
 assert.equal(wpMatchesData(final,data),true);
 assert.equal(wpMatchesData({...final,verifiedSourceVersion:undefined},data),false);
 for(const change of [{status:'ESTIMATED'},{status:'BLOCKED',probability:null},{runId:'other'},{gameId:'G9999'},{sessionId:'other'},{probability:0.5}])assert.equal(wpMatchesData({...final,summary:{...summary,...change}},data),false);
 const board={summary,fetchedAt:1000,sourceVersion:data.stateVersion,wpVersion:data.stateVersion};
 assert.equal(selectWpResponse({history:final,board,data,now:2000}),final);
 assert.equal(selectWpResponse({history:final,board:{...board,wpVersion:data.stateVersion-1},data,now:2000}),undefined);
 assert.equal(JSON.stringify(final),before);
});
test('board transport makes one bounded authenticated request and validates all 56 identities',async()=>{
 const games=Array.from({length:56},(_,i)=>`G${String(502+i).padStart(4,'0')}`),summary=response.summary;
 const body={contractVersion:'GC-WP-BOARD-1',sessionId:req.session,sourceVersion:summary.stateVersion,wpVersion:summary.stateVersion,games:games.map(gameId=>({gameId,summary:{...summary,gameId}}))};
 let calls=0;const fetchImpl=async(url,init)=>{calls++;assert.equal(url.searchParams.get('view'),'board');assert.equal(url.searchParams.get('games'),games.join(','));assert.equal(init.headers.Authorization,'Bearer test-only');assert.equal(init.method,'GET');assert.equal(init.redirect,'error');return Response.json(body);};
 assert.deepEqual(await readWpBoard({...req,games,fetchImpl}),body);assert.equal(calls,1);
 for(const bad of [[],[...games,'G9999'],[games[0],games[0]],['bad']])await assert.rejects(readWpBoard({...req,games:bad,fetchImpl}));assert.equal(calls,1);
 for(const bad of [{...body,contractVersion:'wrong'},{...body,games:body.games.slice(1)},{...body,games:[...body.games].reverse()},{...body,sourceVersion:summary.stateVersion+1},{...body,games:body.games.map(g=>({...g,summary:{...g.summary,sessionId:'qa-v510-wrong'}}))}])await assert.rejects(readWpBoard({...req,games,fetchImpl:async()=>Response.json(bad)}),/WP_INVALID_BOARD/);
 for(const status of [401,403,429,503])await assert.rejects(readWpBoard({...req,games,fetchImpl:async()=>new Response('',{status})}));
 const missing={...body,games:body.games.map(g=>({gameId:g.gameId,summary:{status:'BLOCKED',reason:'NO_COMMITTED_OBSERVATION',probability:null}}))};assert.deepEqual(await readWpBoard({...req,games,fetchImpl:async()=>Response.json(missing)}),missing);
});
test('summary priming never invents history or crosses session, game, run, revision or freshness boundaries',()=>{
 const summary=response.summary,data={...summary},board={summary,fetchedAt:1000},args={board,data,now:2000};
 const primed=selectWpResponse(args);assert.equal(primed.summaryOnly,true);assert.deepEqual(primed.points,[]);assert.equal(primed.highWatermark,undefined);
 assert.equal(selectWpResponse({...args,history:response}),response);
 for(const change of [{sessionId:'other'},{gameId:'G9999'},{runId:'other'},{stateVersion:summary.stateVersion+1}])assert.equal(selectWpResponse({...args,data:{...data,...change}}),undefined);
 assert.equal(selectWpResponse({...args,now:12000}),undefined);
 assert.equal(selectWpResponse({...args,history:response,board:{fetchedAt:1000,summary:{status:'BLOCKED',reason:'NO_COMMITTED_OBSERVATION',probability:null}}}),undefined);
 assert.equal(selectWpResponse({...args,history:response,board:{fetchedAt:1000,summary:{...summary,runId:'new-run'}}}),undefined);
 const blocked={summary:{...summary,status:'BLOCKED',reason:'WP_SOURCE_PENDING',probability:null},fetchedAt:1000};assert.equal(selectWpResponse({...args,board:blocked,history:response}).summary.probability,null);
});

test('sign-in bounds stalled requests and distinguishes network failure without leaking server text',async()=>{
 let aborted=false;
 await assert.rejects(signIn({timeoutMs:10,fetchImpl:async(url,init)=>{init.signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});}}),/SIGN_IN_TIMEOUT/);
 assert.equal(aborted,true);
 await assert.rejects(signIn({fetchImpl:async()=>{throw Error('private upstream detail');}}),/SIGN_IN_NETWORK_ERROR/);
 assert.match(authMessage('SIGN_IN_FAILED'),/GameCast email and password/);
 assert.match(authMessage('ACCESS_DENIED'),/signed in but does not have access/);
});
