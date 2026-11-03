import test from 'node:test';import assert from 'node:assert/strict';
import {createCommandHandler} from '../../release-assets/v5.1.0/backend/delivery/command-http.mjs';
import {createReportingTransport} from '../../release-assets/v5.1.0/backend/delivery/supabase-adapter.mjs';
const origin='https://rgbslb11.github.io',sid='qa-v510-command-http';
const request=(body={},headers={},method='POST')=>new Request('https://qa.invalid/commands?session='+sid,{method,headers:{origin,authorization:'Bearer test-token','content-type':'application/json','idempotency-key':'test-request-key-0001',...headers},body:method==='POST'?JSON.stringify(body):undefined});
test('command endpoint verifies session grant and trusted actor before execution',async()=>{
 let calls=0,active=false;
 const handler=createCommandHandler({allowedOrigins:[origin],authenticate:async()=>({id:'trusted-user'}),authorize:async()=>({authenticated:true,userId:'trusted-user',active,role:'CHAIRMAN',authorizedSessionIds:[sid]}),controller:{execute:async args=>{calls++;assert.equal(args.actorId,'trusted-user');assert.equal(args.sessionId,sid);return {stateVersion:1};}}});
 assert.equal((await handler(request())).status,403);assert.equal(calls,0);
 active=true;assert.equal((await handler(request({actorId:'forged-user',expectedVersion:0,actions:[{command:'advance',seconds:1}]}))).status,200);assert.equal(calls,1);
 assert.equal((await handler(request({}, {origin:'https://evil.invalid'}))).status,403);
 assert.equal((await handler(request({}, {authorization:''}))).status,401);
 assert.equal((await handler(request({}, {},'GET'))).status,405);assert.equal(calls,1);
});
test('transport exposes only known conflict codes, never database error contents',async()=>{
 for(const [message,expected,status] of [['VERSION_CONFLICT','VERSION_CONFLICT',409],['IDEMPOTENCY_CONFLICT','IDEMPOTENCY_CONFLICT',409],['private database detail','BACKEND_UNAVAILABLE',503]]){
  const t=createReportingTransport({url:'https://qa.invalid',publishableKey:'public',serviceKey:'server',gateway:true,fetchImpl:async()=>Response.json({code:'P0001',message},{status:400})});
  await assert.rejects(()=>t.rpc('lookup_source_request',{}),e=>e.code===expected&&e.status===status);
 }
});
