import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {createReleaseRuntime} from '../../release-assets/v5.0.8-week13/backend/src/release-runtime.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.8-week13/backend/runtime/week13.mjs';
const browserType=process.env.GAMECAST_BROWSER||'chromium';
const engines=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs').href);
const slug='w13v508-0000000000000001',owner='qa-browser-only';let row,runtime,origin,writes=0;
const rpc=async(name,p)=>{
 if(name==='read_session')return p.p_slug===slug?[structuredClone(row)]:[];
 if(name==='read_final_snapshots'||name==='read_request')return [];
 if(name==='commit_state'){writes++;assert.equal(p.p_expected_version,row.state_version);row.state=structuredClone(p.p_state);row.state_version++;row.last_advanced_at=p.p_stamp;return [{response:{public_slug:slug,engine_version:row.engine_version,week_key:row.week_key,state_version:row.state_version,state:structuredClone(row.state)},replayed:false}];}
 throw Error('Unexpected fixture RPC '+name);
};
const server=http.createServer(async(req,res)=>{try{
 if(req.url.startsWith('/qa/v508/')){let raw='';for await(const chunk of req)raw+=chunk;const response=await(req.url.startsWith('/qa/v508/public')?runtime.publicHandler:runtime.chairmanHandler)(new Request(origin+req.url,{method:req.method,headers:{...req.headers,origin},...(req.method!=='GET'?{body:raw}:{})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
 if(req.url.startsWith('/v5.0.8/w13/release-config.js')){res.setHeader('content-type','text/javascript');res.end(`globalThis.GAMECAST_V508_CONFIG=Object.freeze({projectUrl:'${origin}',publishableKey:'qa-only',publicApi:'${origin}/qa/v508/public',chairmanApi:'${origin}/qa/v508/chairman'});`);return;}
 const name=new URL(req.url,origin).pathname,file=path.resolve('public','.'+(name.endsWith('/')?name+'index.html':name));assert.ok(file.startsWith(path.resolve('public')+path.sep));res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
}catch(e){res.statusCode=500;res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
runtime=createReleaseRuntime({allowedOrigins:[origin],schedulerSecret:'qa-only',clock:()=>new Date().toISOString(),transport:{rpc,authenticate:async()=>({id:owner}),authorize:async()=>({userId:owner,role:'CHAIRMAN',active:true})}});
row={session_id:'qa-only',public_slug:slug,owner_user_id:owner,week_key:'2026-W13',engine_version:runtime.engine.ENGINE_VERSION,data_version:runtime.engine.DATA_VERSION,state_version:1,last_advanced_at:new Date().toISOString(),state:slate.map(s=>({...runtime.engine.initialGame(s),qaOnly:true}))};
const browser=await engines[browserType].launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})}),page=await browser.newPage({viewport:browserType==='webkit'?{width:390,height:844}:{width:1440,height:1000}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>sessionStorage.setItem('synthcastGameCast508Auth',JSON.stringify({access_token:'qa-only-token',refresh_token:'qa-only',expiresAt:Date.now()+3600000,recovery:false})));
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',browserType,name);};
try{
 const snapshot=JSON.stringify(row);
 for(const [label,route] of [['Chairman',''],['Public','&view=public'],['Condensed',null]]){
 await page.goto(origin+'/v5.0.8/w13/'+(route===null?'ui1.3/':'')+'?session='+slug+(route||''));await page.locator('[data-game="'+slate.at(-1).id+'"]').waitFor();
 await check(label+' exact 59 ordered canonical identities',async()=>assert.deepEqual(await page.locator('article[data-game]').evaluateAll(es=>es.map(e=>e.dataset.game)),slate.map(g=>g.id)));
 await check(label+' fits viewport',async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)));
 if(label==='Chairman'){
 await check('Chairman reports 59/59 power',async()=>assert.match(await page.locator('#links').innerText(),/ACTIVE POWER 59\/59/));
 await check('Chairman shows launch control per game',async()=>assert.equal(await page.getByRole('button',{name:'LAUNCH',exact:true}).count(),59));
 }
 await check(label+' team search retains the single Colgate game',async()=>{await page.locator('#teamSearch').fill('Colgate');await page.waitForFunction(()=>document.querySelectorAll('article[data-game]').length===1);assert.equal(await page.locator('article[data-game]').getAttribute('data-game'),'G0635');await page.locator('#teamSearch').fill('');await page.waitForFunction(()=>document.querySelectorAll('article[data-game]').length===59);});
 }
 await check('public and Chairman reads never write or progress football',async()=>{assert.equal(writes,0);assert.equal(JSON.stringify(row),snapshot);});
 await page.goto(origin+'/v5.0.8/w13/?view=public&session=w12v507-506ff58ba0cfb7a5');
 await check('foreign Week 12 session is rejected',async()=>{await page.waitForFunction(()=>document.querySelector('#statusPublic')?.textContent.includes('SESSION_NOT_FOUND'));assert.equal(writes,0);});
 assert.deepEqual(errors,[]);
 fs.mkdirSync('release-assets/v5.0.8-week13/evidence',{recursive:true});fs.writeFileSync('release-assets/v5.0.8-week13/evidence/browser-'+browserType+'.json',JSON.stringify({status:'PASS',scope:'Local actual HTTP handlers + generated UI; isolated in-memory QA storage; no cloud login or writes; WebKit is mobile emulation, not physical Mobile Safari',browserType,checks,errors},null,2)+'\n');
}finally{await browser.close();server.close();}
