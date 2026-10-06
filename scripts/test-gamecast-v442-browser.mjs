import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {runtime} from './lib/gamecast-v442-harness.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week7-v4-4-2/week7.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week7-v4-4-2/power.ts';
const require=createRequire((process.env.GAMECAST_QA_MODULES||process.cwd())+'/package.json');
const {chromium,webkit,devices}=require('playwright'),root=path.resolve('public');
const gc=runtime(fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8'),'',{TEAM_POWER});
let board=[],apiRequests=[],origin;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/functions/v1/gamecast-week7-v4-4-2'){
  apiRequests.push({method:req.method,operator:!!req.headers['x-operator-token']});res.setHeader('content-type','application/json');
  if(req.method!=='GET'){res.writeHead(403);res.end('{}');return;}
  res.end(JSON.stringify({public_slug:'w7v442-fixture',week_key:'2026-W07',engine_version:'GC-W7-V4.4.2-RC1',state:board,state_version:1,master_zulu:new Date().toISOString(),governance:{games:54,power_ready:54}}));return;
 }
 if(url.pathname==='/v4.4.2/release-config.js'){res.setHeader('content-type','text/javascript');res.end('globalThis.GAMECAST_V442_API='+JSON.stringify(origin+'/functions/v1/gamecast-week7-v4-4-2')+';');return;}
 const p=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
 if(!p.startsWith(root+'/v4.4.2/')||!fs.existsSync(p)){res.writeHead(404);res.end('Not found');return;}
 res.setHeader('content-type',p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(p));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
const cases=[];fs.mkdirSync('outputs/v442/browser',{recursive:true});
const browsers=[['Chromium desktop',chromium,{viewport:{width:1280,height:900}}],['WebKit iPhone 13 emulation',webkit,devices['iPhone 13']]].filter(([name])=>!process.argv.includes('--chromium-only')||name.startsWith('Chromium'));
async function check(browser,surface,name,fn){await fn();cases.push({browser,surface,name,status:'PASS'});}
try{
 for(const [name,type,options] of browsers){
  const browser=await type.launch({headless:true});
  try{for(const surface of ['public','chairman','ui1.3']){
   board=OPERATING_SLATE.map(x=>gc.initialGame(x));for(const [id,lifecycle] of [['G0315','LOCKED'],['G0299','FINAL_PENDING'],['G0301','READY']])board.find(g=>g.id===id).lifecycle=lifecycle;
   apiRequests=[];const context=await browser.newContext(options),page=await context.newPage(),errors=[],badAssets=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badAssets.push({url:r.url(),status:r.status()});});
   const route='/v4.4.2/'+(surface==='ui1.3'?'ui1.3/':'')+'?session=w7v442-fixture'+(surface==='public'?'&view=public':surface==='chairman'?'#operator=fixture-only-operator':'');
   const cards=surface==='ui1.3'?'.game-card':'article.card';
   try{
    await check(name,surface,'direct navigation and 54 cards',async()=>{assert.equal((await page.goto(origin+route)).status(),200);await page.waitForFunction(sel=>document.querySelectorAll(sel).length===54,cards);});
    await check(name,surface,'assets and JavaScript load',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);});
    await check(name,surface,'search variants and substring',async()=>{for(const q of ['Tex','tex','TEX',' tex ']){await page.locator('#teamSearch').fill(q);assert.equal(await page.locator(cards).count(),3);}await page.locator('#teamSearch').fill('North Tex');assert.equal(await page.locator(cards).count(),1);});
    await check(name,surface,'empty result and safe text',async()=>{await page.locator('#teamSearch').fill('<img src=x onerror="window.injected=1">');assert.equal(await page.locator(cards).count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);await page.locator('#teamSearch').fill('');assert.equal(await page.locator(cards).count(),54);});
    if(surface==='chairman')await check(name,surface,'final action filter and live lifecycle update',async()=>{
     await page.locator('[data-f="NEEDS_ACTION"]').click();assert.equal(await page.locator(cards).count(),2);await page.locator('#teamSearch').fill('North Tex');assert.equal(await page.locator(cards).count(),1);
     board.find(g=>g.id==='G0299').lifecycle='READY';await page.evaluate(()=>load({background:true}));assert.equal(await page.locator(cards).count(),0);await page.locator('[data-f="ALL"]').click();await page.locator('#teamSearch').fill('');
    });
    else await check(name,surface,'no operator controls or token sent',async()=>{assert.equal(await page.locator('.controls,.edit-panel,[data-f="NEEDS_ACTION"],#copyOperator').count(),0);assert.ok(apiRequests.every(x=>!x.operator));});
    await check(name,surface,'refresh and viewport usable',async()=>{assert.equal((await page.reload()).status(),200);await page.waitForFunction(sel=>document.querySelectorAll(sel).length===54,cards);assert.ok(await page.locator('#teamSearch').isVisible());const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width+1,JSON.stringify(size));});
    await check(name,surface,'read-only API requests',async()=>assert.ok(apiRequests.length>0&&apiRequests.every(x=>x.method==='GET')));
    await page.screenshot({path:`outputs/v442/browser/${name.startsWith('WebKit')?'mobile-webkit':'chromium'}-${surface.replace('.','-')}.png`});
   }finally{await context.close();}
  }}finally{await browser.close();}
 }
}finally{await new Promise(r=>server.close(r));}
const report={classification:'TEST RESULT',scope:'Actual browsers against local HTTP routes/assets and fixture read-only API; cloud and physical iOS Safari not tested',executed:cases.length,passed:cases.length,failed:0,skipped:0,surfaces:3,browsers:browsers.length,cases};
fs.writeFileSync('outputs/v442/browser-local.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,cases:undefined},null,2));
