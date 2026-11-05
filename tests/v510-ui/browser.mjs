// GitHub verification only: static repo UI, QA fixtures and mocked transport.
// No production credentials, database, engine writes, hosted Site or deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const kind=process.env.GAMECAST_BROWSER??'chromium',root=path.resolve('public');
const results=[],output=`outputs/v510-ui/${kind}`;await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep))throw Error('outside-root');
  const body=await fs.readFile(file),ext=path.extname(file);
  res.writeHead(200,{'content-type':({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[ext]??'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/v5.1.0/review/`,browser=await ({chromium,webkit}[kind]).launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const record=(name,extra={})=>results.push({name,status:'PASS',...extra});
try{
 await page.goto(base);await page.locator('.card').first().waitFor();
 assert.equal(await page.locator('.card').count(),6);
 assert.equal(await page.locator('.surface-nav [aria-current=page]').innerText(),'StatsCenter');
 assert.match(await page.locator('[data-lane=live] .lane-title').innerText(),/INPROGRESS/);
 assert.match(await page.locator('[data-lane=finished] .lane-title').innerText(),/Final Results/);
 assert.match(await page.locator('#updated-zulu').innerText(),/Updated Zulu Time.*2000-01-01T00:00:00.000Z/);
 assert.equal(await page.locator('.brand img').getAttribute('src'),'synthcast-s.png');
 for(const id of ['G9003','G9006']){
  const card=page.locator(`[data-game="${id}"]`);
  assert.equal(await card.locator('a').count(),0);
  assert.doesNotMatch(await card.innerText(),/BLOCKED|CHAIRMAN_CORRECTION|Chairman correction/i);
  assert.equal(await card.locator('.stats-unavailable').count(),1);
 }
 record('Markup rendering: blank blocked actions, names, timestamp and S logo');
 await page.locator('[data-filter=blocked]').click();assert.equal(await page.locator('.card').count(),2);
 await page.locator('[data-filter=all]').click();await page.locator('#search').fill('Example Away 1');assert.equal(await page.locator('.card').count(),1);
 await page.locator('[data-open=G9001]').click();await page.locator('#detail:not([hidden])').waitFor();
 await page.locator('[data-tab=plays]').click();await page.locator('[data-play="2"]').click();assert.equal(await page.locator('.play-attributes > div').count(),22);
 await page.locator('#refresh').click();assert.equal(await page.locator('[data-play="2"]').getAttribute('aria-pressed'),'true');
 await page.locator('#back').click();await page.locator('#board:not([hidden])').waitFor();assert.equal(await page.locator('#search').inputValue(),'Example Away 1');assert.equal(await page.locator('.card').count(),1);
 record('Navigation, filters, selection and refresh retention');
 await page.goto(base+'#game=G9003');await page.locator('#detail:not([hidden])').waitFor();assert.match(await page.locator('#detail-content').innerText(),/CHAIRMAN_CORRECTION/);assert.equal(await page.locator('#detail table').count(),0);
 record('Direct blocked detail clears all detailed data');
 await page.goto(base+'#game=G9001');await page.locator('[data-tab=overview]').click();await page.locator('#wp-case').selectOption('overrideBlocked');assert.equal(await page.locator('.wp-value').innerText(),'—');assert.ok(await page.locator('.wp-svg.audit circle').count()>0);
 record('WP blocked current value and grey immutable history');
 await page.locator('#wp-case').selectOption('editCancelled');assert.equal(await page.locator('.wp-value').evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 0)');
 await page.locator('#wp-case').selectOption('live');assert.equal(await page.locator('.wp-value').evaluate(el=>getComputedStyle(el).color),'rgb(215, 26, 32)');
 assert.equal(await page.locator('#detail-content img').count(),0);
 assert.equal(await page.locator('.game-bank [data-bank-game]').count(),6);
 assert.equal(await page.locator('.overview-grid > section').count(),4);
 assert.equal(await page.getByRole('tab',{name:'Play-by-Play / Drives',exact:true}).count(),1);
 assert.match(await page.locator('.scoring-summary h3').innerText(),/SCORING SUMMARY/);
 await page.locator('[data-tab=plays]').click();await page.locator('#drive-filter').selectOption('1');assert.equal(await page.locator('[data-play]').count(),2);
 await page.locator('[data-play="2"]').click();await page.locator('#refresh').click();assert.equal(await page.locator('#drive-filter').inputValue(),'1');assert.equal(await page.locator('[data-play="2"]').getAttribute('aria-pressed'),'true');
 record('Detailed reference: game bank, four overview panels, combined drives/plays, no team logos, black/red threshold');

 for(const width of [390,820,1194,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'#board');await page.locator('#search').fill('');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await page.goto(base+'#game=G9001');
  for(const tab of ['overview','stats','plays','scoring']){
   await page.locator(`[data-tab=${tab}]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${kind} ${width} ${tab} overflow`);
  }
 }
 record('Responsive board and all four detail tabs: 390/820/1194/1440');
 // Actual app transport calls are intercepted; these are fixtures, not live QA.
 const stats=JSON.parse(await fs.readFile('public/v5.1.0/review/fixtures/stats.json','utf8'));
 let denied=false,revision=3,methods=[];
 await page.route('https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-details**',async route=>{
  methods.push(route.request().method());
  const body=denied?{error:'CHAIRMAN_FORBIDDEN'}:{...stats.responses.G9001,stateVersion:revision};
  await route.fulfill({status:denied?403:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
 });
 await page.goto(base+'#board');await page.locator('#settings-toggle').click();await page.locator('#session-input').fill(stats.sessionId);await page.locator('#games-input').fill('G9001');await page.locator('#token-input').fill('qa-fixture-not-a-real-token');await page.getByRole('button',{name:'Connect to QA',exact:true}).click();
 await page.locator('#connection').filter({hasText:'Connected'}).waitFor();
 await page.locator('[data-open=G9001]').click();await page.locator('#detail table').first().waitFor();
 denied=true;await page.locator('#refresh').click();await page.getByRole('heading',{name:'ACCESS_DENIED',exact:true}).waitFor();assert.equal(await page.locator('#detail table').count(),0);
 denied=false;revision++;await page.locator('#refresh').click();await page.locator('#connection').filter({hasText:'Recovered'}).waitFor();assert.ok(await page.locator('#detail table').count()>0);
 await page.reload();await page.locator('#connection').filter({hasText:'Authentication required after reload'}).waitFor();assert.equal(await page.locator('#detail table').count(),0);assert.match(await page.locator('#review-banner').innerText(),/READ-ONLY QA/);assert.ok(methods.every(m=>m==='GET'));
 record('Mocked live access denial, recovery, no writes and safe reload');
 await page.locator('#settings-toggle').click();await page.locator('#fixtures').click();await page.locator('#board:not([hidden])').waitFor();await page.locator('[data-filter=all]').click();await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:`${output}/statscenter.png`,fullPage:true});
 await page.locator('[data-open=G9001]').click();await page.locator('[data-tab=overview]').click();await page.screenshot({path:`${output}/game-center.png`,fullPage:true});
 assert.deepEqual(errors,[]);record('No application JavaScript errors');
}catch(error){results.push({name:'Browser verification',status:'FAIL',error:error.stack});await page.screenshot({path:`${output}/failure.png`,fullPage:true});process.exitCode=1;}
finally{await fs.writeFile(`${output}/results.json`,JSON.stringify({browser:kind,evidence:'FIXTURE / MOCK HTTP ONLY; viewport emulation, not real devices',results},null,2));console.log(JSON.stringify({browser:kind,results}));await context.close();await browser.close();server.close();}
