import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root='https://rgbslb11.github.io/Synthcast-Console/v5.0.7/w12/',slug='w12v507-506ff58ba0cfb7a5',api='https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-week12-v5-0-7-public';
let ready=false;for(let i=0;i<40;i++){const r=await fetch(root+'auth-api.js',{cache:'no-store',signal:AbortSignal.timeout(20000)});const text=await r.text();if(r.ok&&text.includes('GC-W12-V5.0.7-RC1')&&text.includes('gamecastClearPending')){ready=true;break;}await new Promise(r=>setTimeout(r,15000));}assert.ok(ready,'Hosted recovery scripts must finish publication');
async function read(){const r=await fetch(api+'?api=read&session='+slug,{headers:{origin:'https://rgbslb11.github.io'}});assert.equal(r.status,200);return r.json();}
const before=await read();assert.equal(before.engine_version,'GC-W12-V5.0.7-RC1');assert.equal(before.state.length,60);
assert.ok(!/"(?:seedHex|rngState|schedulerSecret|pendingRandom)"/.test(JSON.stringify(before)));
const checks=[];let commandRequests=0;
for(const [name,engine,viewport] of [['chromium',chromium,{width:1440,height:1000}],['mobile-webkit',webkit,{width:390,height:844}]]){
 const browser=await engine.launch({headless:true});try{const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('api=command')||r.url().includes('api=create'))commandRequests++;});
 for(const [surface,url] of [['public',root+'?session='+slug+'&view=public'],['condensed',root+'ui1.3/?session='+slug]]){
  console.log('Checking hosted',name,surface);
  await page.goto(url);await page.locator('[data-game="G0570"]').waitFor({timeout:30000});assert.equal(await page.locator('article[data-game]').count(),60);assert.match(await page.locator('body').innerText(),/WEEK 12|Week 12/);checks.push(name+' '+surface+': all 60 actual cloud games rendered');
 }
 await page.goto(root+'?session='+slug);await page.locator('#authEmail').waitFor();assert.ok(await page.locator('#authPassword').isVisible());assert.equal(await page.evaluate(()=>typeof globalThis.gamecastClearPending),'function');checks.push(name+' Chairman: password sign-in and recovery script loaded; no credentials submitted');assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
const after=await read();assert.ok(after.state_version>=before.state_version);assert.deepEqual(after.state.map(g=>g.id),before.state.map(g=>g.id));assert.equal(commandRequests,0);
const result={status:'PASS',sourceSha:process.env.GITHUB_SHA,checks,engine:before.engine_version,slug,games:60,cloudStateVersion:after.state_version,readOnly:true,commandRequests,schedulerProgressionObserved:after.state_version>before.state_version,actualChairmanSignIn:'NOT TESTED',physicalMobileSafari:'NOT TESTED',scheduler:'ENABLED with explicit Chairman approval; live progression is independent of these browser reads'};
fs.mkdirSync('outputs/v507-operating',{recursive:true});fs.writeFileSync('outputs/v507-operating/hosted-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
