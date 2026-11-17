import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const slug=JSON.parse(fs.readFileSync('release-assets/v5.0.8-week13/operating-session.json')).publicSlug;
const slate=JSON.parse(fs.readFileSync('release-assets/v5.0.8-week13/slate.json'));
const root='https://rgbslb11.github.io/Synthcast-Console/v5.0.8/w13/';
assert.equal(process.env.GC508_HOSTED,'1');
const engines=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);const checks=[];let writes=0;
for(const name of ['chromium','webkit']){
 const browser=await engines[name].launch({headless:true});
 try{
  const page=await browser.newPage({viewport:name==='webkit'?{width:390,height:844}:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('api=command')||r.url().includes('api=create'))writes++;});
  for(const [surface,url] of [['full',root+'?session='+slug+'&view=public'],['condensed',root+'ui1.3/?session='+slug]]){
   await page.goto(url);await page.locator('[data-game="'+slate.at(-1).id+'"]').waitFor({timeout:30000});
   assert.deepEqual(await page.locator('article[data-game]').evaluateAll(es=>es.map(e=>e.dataset.game)),slate.map(g=>g.id));
   for(const g of slate){const t=await page.locator('[data-game="'+g.id+'"]').innerText();assert.ok(t.includes(g.away),g.id+' away');assert.ok(t.includes(g.home),g.id+' home');assert.ok(t.includes(g.kickoff),g.id+' kickoff');assert.ok(t.includes(g.network),g.id+' network');}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
   await page.locator('#teamSearch').fill('Colgate');await page.waitForFunction(()=>document.querySelectorAll('article[data-game]').length===1);assert.equal(await page.locator('article[data-game]').getAttribute('data-game'),'G0635');
   checks.push(name+' '+surface+': 59 exact IDs/order, all 59 names/time/network entries, search and viewport');
  }
  await page.goto(root);await page.locator('#authEmail').waitFor();assert.ok(await page.locator('#authPassword').isVisible());checks.push(name+' Chairman: existing sign-in form; no credentials submitted');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
assert.equal(writes,0);fs.mkdirSync('outputs/v508',{recursive:true});fs.writeFileSync('outputs/v508/hosted-browser.json',JSON.stringify({status:'PASS',scope:'Actual hosted Week 13 UI and actual cloud public reads; no game controls or real login',checks,writes,physicalMobileSafari:'NOT TESTED'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,writes}));
