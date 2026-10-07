// Real cloud API, actual generated/hosted UI, and actual browser engines.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire((process.env.GAMECAST_QA_MODULES||process.cwd())+'/package.json');
const {chromium,webkit,devices}=require('playwright');
const {public_slug:slug,operator_token:token}=JSON.parse(fs.readFileSync(process.env.GAMECAST_QA_PRIVATE));
assert.match(slug,/^w7v442-[a-f0-9]{16}$/);
const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week7-v4-4-2';
const expectedOrder=['G0324','G0329','G0293','G0299','G0300','G0328','G0298','G0335','G0288','G0331','G0320','G0330','G0285','G0290','G0295','G0296','G0297','G0308','G0314','G0315','G0316','G0318','G0319','G0322','G0325','G0334','G0337','G0294','G0287','G0291','G0302','G0303','G0304','G0306','G0307','G0309','G0311','G0312','G0321','G0326','G0332','G0336','G0305','G0286','G0289','G0310','G0333','G0301','G0317','G0284','G0292','G0323','G0313','G0327'];
let origin=process.env.GAMECAST_UI_ORIGIN,server;
if(!origin){
 const root=path.resolve('public');server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),p=path.resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));
  if(!p.startsWith(root+'/v4.4.2/')||!fs.existsSync(p)){res.writeHead(404);res.end();return;}
  res.setHeader('content-type',p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(p));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
}
const phase=server?'staged':'deployed',cases=[],browsers=[['Chromium desktop',chromium,{viewport:{width:1280,height:900}}],['WebKit iPhone 13 emulation',webkit,devices['iPhone 13']]].filter(([n])=>!process.argv.includes('--chromium-only')||n.startsWith('Chromium'));
fs.mkdirSync('outputs/v442/browser-'+phase,{recursive:true});
async function check(browser,surface,name,fn){await fn();cases.push({browser,surface,name,status:'PASS'});}
try{for(const [name,type,options] of browsers){
 const browser=await type.launch({headless:true});
 try{for(const surface of ['Public UI','Chairman UI','Condensed UI (UI 1.3)']){
  const pub=surface==='Public UI',chair=surface==='Chairman UI',condensed=!pub&&!chair;
  const context=await browser.newContext(options),page=await context.newPage(),errors=[],badAssets=[],api=[],methods=[],failedRequests=[];
  page.on('requestfailed',r=>failedRequests.push({url:r.url().split('#')[0],error:r.failure()?.errorText}));
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('.supabase.co/functions/'))methods.push({url:r.url(),method:r.method(),operator:!!r.headers()['x-operator-token']});});
  page.on('response',r=>{if(r.status()>=400)badAssets.push({url:r.url().split('#')[0],status:r.status()});if(r.url().startsWith(API+'?api=read'))api.push(r);});
  const route='/v4.4.2/'+(condensed?'ui1.3/':'')+'?session='+slug+(pub?'&view=public':chair?'#operator='+token:'');
  const cards=condensed?'.game-card':'article.card';
  try{
   await check(name,surface,'direct navigation and 54 persisted games',async()=>{assert.equal((await page.goto(origin+route)).status(),200);await page.waitForFunction(sel=>document.querySelectorAll(sel).length===54,cards,{timeout:30000});});
   await check(name,surface,'corrected authoritative slate order',async()=>assert.deepEqual(await page.locator(cards).evaluateAll(nodes=>nodes.map(node=>node.dataset.game)),expectedOrder));
   await check(name,surface,'assets and scripts load',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);});
   await check(name,surface,'isolated endpoint and engine identity',async()=>{assert.ok(api.length);const r=await api[0].json();assert.equal(r.engine_version,'GC-W7-V4.4.2-RC1');assert.equal(r.week_key,'2026-W07');assert.equal(r.operator,chair);assert.ok(methods.every(r=>r.url.startsWith(API)));});
   await check(name,surface,'Tex variants return same three-game subset',async()=>{for(const q of ['Tex','tex','TEX',' tex ']){await page.locator('#teamSearch').fill(q);assert.equal(await page.locator(cards).count(),3);}await page.locator('#teamSearch').fill('North Tex');assert.equal(await page.locator(cards).count(),1);});
   await check(name,surface,'safe empty results and clearing restores board',async()=>{await page.locator('#teamSearch').fill('<img src=x onerror="window.injected=1">');assert.equal(await page.locator(cards).count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);await page.locator('#teamSearch').fill('');assert.equal(await page.locator(cards).count(),54);});
   if(chair)await check(name,surface,'locked QA final is included and search combines with AND',async()=>{await page.locator('[data-f="NEEDS_ACTION"]').click();assert.equal(await page.locator(cards).count(),1);await page.locator('#teamSearch').fill('no matching team');assert.equal(await page.locator(cards).count(),0);await page.locator('#teamSearch').fill('');assert.equal(await page.locator(cards).count(),1);await page.locator('[data-f="ALL"]').click();assert.equal(await page.locator(cards).count(),54);});
   else await check(name,surface,'public access has no operator control or credential',async()=>{assert.equal(await page.locator('.controls,.edit-panel,[data-f="NEEDS_ACTION"],#copyOperator').count(),0);assert.ok(methods.every(r=>!r.operator));assert.ok(!(await page.content()).includes(token));});
   await check(name,surface,'refresh and mobile viewport usable',async()=>{assert.equal((await page.reload()).status(),200);await page.waitForFunction(sel=>document.querySelectorAll(sel).length===54,cards);assert.ok(await page.locator('#teamSearch').isVisible());const v=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(v.scroll<=v.width+1,JSON.stringify(v));});
   if(name.startsWith('WebKit')&&!condensed)await check(name,surface,'compact single-row iPhone masthead',async()=>{const size=await page.locator('header').evaluate(header=>{const clocks=header.querySelector('.timebar'),cs=getComputedStyle(clocks);return{headerHeight:header.getBoundingClientRect().height,clockHeight:clocks.getBoundingClientRect().height,display:cs.display,overflowX:cs.overflowX,clockScrollWidth:clocks.scrollWidth,clockClientWidth:clocks.clientWidth}});assert.ok(size.headerHeight<=130,JSON.stringify(size));assert.ok(size.clockHeight<=42,JSON.stringify(size));assert.equal(size.display,'flex');assert.ok(['auto','scroll'].includes(size.overflowX),JSON.stringify(size));assert.ok(size.clockScrollWidth>size.clockClientWidth,JSON.stringify(size));});
   await check(name,surface,'browser navigation and filters only issue reads',async()=>assert.ok(methods.length&&methods.every(r=>r.method==='GET')));
   await page.screenshot({path:`outputs/v442/browser-${phase}/${name.startsWith('WebKit')?'mobile-webkit':'chromium'}-${pub?'public':chair?'chairman':'ui13'}.png`});
  }catch(error){console.error(JSON.stringify({surface,browser:name,errors,badAssets,failedRequests,gridText:await page.locator('#grid').innerText().catch(()=>null)}));throw error;}finally{await context.close();}
 }}finally{await browser.close();}
}}finally{if(server)await new Promise(r=>server.close(r));}
const report={classification:'TEST RESULT',scope:phase+' UI with actual cloud API; mobile Safari engine reviewed through iPhone WebKit emulation, no physical iOS device',phase,publicSlug:slug,executed:cases.length,passed:cases.length,failed:0,skipped:0,surfaces:3,cases};
fs.writeFileSync('outputs/v442/browser-'+phase+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,cases:undefined},null,2));
