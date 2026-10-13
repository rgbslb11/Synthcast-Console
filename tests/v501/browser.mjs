import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {createReleaseRuntime} from '../../release-assets/v5.0.1/backend/src/release-runtime.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.1/backend/runtime/week7.mjs';
import {CANONICAL_GAME_IDS,FINAL_GAME_IDS,SecurityError} from '../../release-assets/v5.0.1/backend/security/security-core.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const receipts=new Map(),slug='w7v501-0000000000000001',owner='test-owner';let row,finals,origin,requestReads=0,commands=0;
const rpc=async(name,p)=>{
 if(name==='read_session'){requestReads++;return [structuredClone(row)];}
 if(name==='read_final_snapshots')return structuredClone(finals);
 const key=p.p_actor_id+'|'+p.p_idempotency_key;
 if(name==='read_request'){const found=receipts.get(key);if(found&&found.hash!==p.p_request_hash)throw new SecurityError('IDEMPOTENCY_CONFLICT',409);return found?[{response:structuredClone(found.response)}]:[];}
 if(name==='commit_state'){
  if(p.p_expected_version!==row.state_version)throw new SecurityError('VERSION_CONFLICT',409);
  row={...row,state:structuredClone(p.p_state),state_version:row.state_version+1,last_advanced_at:p.p_stamp};commands++;
  const response={public_slug:slug,engine_version:row.engine_version,week_key:'2026-W07',state_version:row.state_version,state:structuredClone(row.state)};
  receipts.set(key,{hash:p.p_request_hash,response});return [{response,replayed:false}];
 }throw Error(name);
};
let runtime;
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url.startsWith('/api/')){
   let raw='';for await(const c of req)raw+=c;
   const request=new Request(origin+req.url,{method:req.method,headers:{...req.headers,origin},...(req.method!=='GET'?{body:raw}: {})});
   const reply=await (req.url.startsWith('/api/public')?runtime.publicHandler:runtime.chairmanHandler)(request);
   res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(await reply.text());return;
  }
  const name=new URL(req.url,origin).pathname.replace(/^\//,'')||'v5.0.1/index.html';
  if(name==='v5.0.1/release-config.js'){
   res.setHeader('content-type','text/javascript');res.end('globalThis.GAMECAST_V501_CONFIG='+JSON.stringify({projectUrl:origin,publishableKey:'qa-only',publicApi:origin+'/api/public',chairmanApi:origin+'/api/chairman'})+';');return;
  }
  const target=path.resolve('public',name.endsWith('/')?name+'index.html':name);
  if(!target.startsWith(path.resolve('public')+path.sep))throw Error('path');
  res.setHeader('content-type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[path.extname(target)]||'text/plain');res.end(fs.readFileSync(target));
 }catch(e){res.statusCode=500;res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
runtime=createReleaseRuntime({allowedOrigins:[origin],schedulerSecret:'browser-test-only',transport:{rpc,authenticate:async()=>({id:owner}),authorize:async()=>({userId:owner,role:'CHAIRMAN',active:true})}});
row={session_id:'qa',public_slug:slug,owner_user_id:owner,week_key:'2026-W07',engine_version:runtime.engine.ENGINE_VERSION,data_version:runtime.engine.DATA_VERSION,state_version:1,last_advanced_at:new Date().toISOString(),state:OPERATING_SLATE.map(s=>({...runtime.engine.initialGame(s),qaOnly:true}))};
finals=FINAL_GAME_IDS.map(id=>({...runtime.engine.initialGame({...OPERATING_SLATE[0],id,away:'Historical Away',home:'Historical Home',kickoffOrder:CANONICAL_GAME_IDS.indexOf(id)+1}),lifecycle:'READY',activity:'FINAL',immutableFinal:true,qaOnly:false}));
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],cases=[],latencies=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>sessionStorage.setItem('synthcastGameCast501Auth',JSON.stringify({access_token:'test-token-not-real',refresh_token:'test',expiresAt:Date.now()+3600000,recovery:false})));
const card=id=>page.locator('[data-game="'+id+'"]');
const check=async(name,fn)=>{await fn();cases.push(name);console.log('PASS',name)};
try{
 await page.goto(origin+'/v5.0.1/?session='+slug);await card('G0285').waitFor();
 await check('54 cards load',async()=>assert.equal(await page.locator('[data-game]').count(),54));
 await check('unrelated server updates render without refresh',async()=>{row.state[1].scores['1']=[3,0];row.state_version++;await page.waitForFunction(()=>document.querySelector('[data-game="G0290"] .score')?.textContent==='3')});
 await check('Upcoming/search intersection',async()=>{await page.locator('[data-f=UPCOMING]').click();assert.equal(await page.locator('[data-game]').count(),41);await page.locator('#teamSearch').fill('arkansas');assert.equal(await page.locator('[data-game]').count(),1);await page.locator('#teamSearch').fill('');await page.locator('[data-f=ALL]').click()});
 async function act(id,command,payload={}){const start=performance.now();await page.evaluate(async({id,command,payload})=>await cmd(id,command,payload),{id,command,payload});latencies.push({command,ms:performance.now()-start});assert.ok(!(await page.locator('#status').innerText()).includes('ERROR'),command)}
 await check('Launch/Start Auto/Stop update control state',async()=>{await act('G0285','launch');await act('G0285','auto');assert.equal(row.state[0].auto,true);await act('G0285','auto');assert.equal(row.state[0].auto,false)});
 await check('edit draft survives polling and other-game version advances; save succeeds',async()=>{await act('G0285','edit_begin');await page.locator('#e-G0285-y').fill('33');row.state[1].glSeconds+=10;row.state_version++;await page.evaluate(()=>load({background:true}));assert.equal(await page.locator('#e-G0285-y').inputValue(),'33');await act('G0285','edit_commit',{yardline:33,ballSide:'OWN',hold:true});assert.equal(row.state[0].fieldPos,33);assert.equal(row.state[0].lifecycle,'ACTIVE')});
 await check('Final/Lock persist and QA Accept is blocked',async()=>{await act('G0285','end',{confirmed:true});await act('G0285','lock');assert.equal(row.state[0].lifecycle,'LOCKED');await page.evaluate(()=>cmd('G0285','accept',{confirmed:true}));assert.match(await page.locator('#status').innerText(),/QA_ACCEPT_FORBIDDEN/);assert.equal(row.state[0].lifecycle,'LOCKED')});
 await check('Deadman remains visible and updates in open panel',async()=>{const id='G0290';await card(id).locator('.dm-box summary').click();const due=new Date(Date.now()+3600000).toISOString();await act(id,'deadman_arm',{basis:'TV_START',tvStartZulu:due});assert.match(await card(id).locator('.dm-title').innerText(),/ARMED/);await card(id).locator('.dm-box summary').click();row.state[1].deadman.status='DISARMED';row.state_version++;await page.evaluate(()=>load({background:true}));assert.match(await card(id).locator('.dm-title').innerText(),/DISARMED/)});
 await check('real concurrent target change rejects; draft remains',async()=>{await act('G0285','edit_begin',{confirmed:true});await page.locator('#e-G0285-y').fill('42');row.state[0].fieldPos=44;row.state_version++;await page.evaluate(()=>cmd('G0285','edit_commit',{yardline:42,ballSide:'OWN'}));assert.match(await page.locator('#status').innerText(),/This game changed/);assert.equal(await page.locator('#e-G0285-y').inputValue(),'42');assert.equal(row.state[0].fieldPos,44)});
 await check('public view renders automatically and has no operator controls',async()=>{const pub=await browser.newPage();await pub.goto(origin+'/v5.0.1/?session='+slug+'&view=public');await pub.locator('[data-game=G0290]').waitFor();assert.equal(await pub.locator('.operator-only').count(),0);row.state[1].scores['1']=[6,0];row.state_version++;await pub.waitForFunction(()=>document.querySelector('[data-game="G0290"] .score')?.textContent==='6');await pub.close()});
 assert.deepEqual(errors,[]);
 fs.writeFileSync('release-assets/gamecast-v5.0.1/evidence/browser-tests.json',JSON.stringify({passed:cases.length,cases,latencies,errors,scope:'Chromium; actual frontend and handlers; in-memory Postgres boundary; not hosted/mobile Safari'},null,2));
}finally{await browser.close();server.close()}
