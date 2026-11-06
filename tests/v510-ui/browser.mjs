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
const manualRefresh=async()=>{await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);};
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
 await manualRefresh();assert.equal(await page.locator('[data-play="2"]').getAttribute('aria-pressed'),'true');
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
 await page.locator('[data-play="2"]').click();await manualRefresh();assert.equal(await page.locator('#drive-filter').inputValue(),'1');assert.equal(await page.locator('[data-play="2"]').getAttribute('aria-pressed'),'true');
 record('Detailed reference: game bank, four overview panels, combined drives/plays, no team logos, black/red threshold');

 for(const width of [390,820,1194,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'#board');await page.locator('#search').fill('');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await page.goto(base+'#game=G9001');
  for(const tab of ['overview','stats','plays','scoring']){
   await page.locator(`[data-tab=${tab}]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${kind} ${width} ${tab} overflow`);
  }
 }
 record('Responsive board and all four detail tabs: 390/820/1194/1440/1920');
 // Actual app transport calls are intercepted; these are fixtures, not live QA.
 const stats=JSON.parse(await fs.readFile('public/v5.1.0/review/fixtures/stats.json','utf8'));
 let denied=false,transportLost=false,blockedReason=null,revision=3,sourceTime=stats.responses.G9001.generatedAt,methods=[];
 const wp=JSON.parse(await fs.readFile('public/v5.1.0/review/fixtures/wp.json','utf8')).fixtures.live;
 await page.route('https://xsvdmcipviejxynkdbhq.supabase.co/auth/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-fixture-not-a-real-token',expires_in:3600,user:{id:'fixture',is_anonymous:false}})}));
 let boardReads=0,historyReads=0;
 await page.route('https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-wp**',async route=>{
  const q=new URL(route.request().url()).searchParams,summary={...wp.summary,sessionId:stats.sessionId,gameId:'G9001',runId:stats.responses.G9001.runId,stateVersion:revision};
  if(q.get('view')==='board'){boardReads++;assert.equal(q.get('games'),'G9001');await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({contractVersion:'GC-WP-BOARD-1',sessionId:stats.sessionId,sourceVersion:revision,wpVersion:revision,games:[{gameId:'G9001',summary}]})});}
  else{historyReads++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...wp,summary})});}
 });
 await page.route('https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-v5-1-0-qa-details**',async route=>{
  methods.push(route.request().method());await new Promise(resolve=>setTimeout(resolve,150));
  if(transportLost){await route.abort('failed');return;}
  let body=denied?{error:'CHAIRMAN_FORBIDDEN'}:{...stats.responses.G9001,stateVersion:revision,generatedAt:sourceTime};
  if(blockedReason){const {contractVersion,deliveryVersion,sessionId,gameId,runId,generatedAt}=body;body={contractVersion,deliveryVersion,sessionId,gameId,runId,generatedAt,stateVersion:revision,availability:{status:'BLOCKED',reason:blockedReason}};}
  await route.fulfill({status:denied?403:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
 });
 await page.goto(base+'#board');await page.locator('#settings-toggle').click();await page.locator('#session-input').fill(stats.sessionId);await page.locator('#games-input').fill('G9001');await page.locator('#email-input').fill('qa@example.invalid');await page.locator('#password-input').fill('test-only');await page.getByRole('button',{name:'Connect to QA',exact:true}).click();
 await page.locator('#connection').filter({hasText:'Connected'}).waitFor();
 assert.ok(boardReads>=1);assert.equal(historyReads,0);
 await page.locator('[data-open=G9001]').click();await page.locator('#detail table').first().waitFor();
 assert.ok(await page.locator('.notice').filter({hasText:'STALE'}).count()>0);
 await page.locator('[data-tab=overview]').click();await page.waitForFunction(()=>document.querySelector('.wp-value')?.textContent==='40.0%');
 assert.equal(await page.locator('.wp-value').innerText(),`${(wp.summary.probability*100).toFixed(1)}%`);assert.equal(await page.locator('#password-input').inputValue(),'');
 assert.ok(!(await page.evaluate(()=>JSON.stringify(sessionStorage))).includes('qa-fixture-not-a-real-token'));
 await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.ok(historyReads>=1);record('One board summary request; history fetched separately only after selection; credentials absent from storage');
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('.wp-options > summary').click();await page.locator('.all-fields > summary').click();
 const beforePoll=methods.length;
 await page.waitForFunction(()=>document.querySelector('#refresh').disabled,{timeout:10000});
 assert.ok(await page.locator('.wp-options').evaluate(el=>el.open),'WP history stays open at poll start');
 await page.waitForFunction(()=>!document.querySelector('#refresh').disabled,{timeout:15000});
 assert.ok(methods.length>beforePoll);
 for(const selector of ['.wp-options','.all-fields'])assert.ok(await page.locator(selector).evaluate(el=>el.open),selector+' stays open after poll');
 await page.locator('.wp-options > summary').click();await manualRefresh();assert.equal(await page.locator('.wp-options').evaluate(el=>el.open),false);
 await page.locator('[data-tab=plays]').click();await page.locator('[data-play="2"]').click();
 assert.match(await page.locator('.combined-history .field').getAttribute('aria-label'),/Historical play 2/);
 await page.locator('#return-live').click();assert.match(await page.locator('.combined-history .field').getAttribute('aria-label'),/Live committed field/);
 assert.equal(await page.locator('[data-play][aria-pressed=true]').count(),0);assert.ok(await page.locator('#return-live').isDisabled());
 await manualRefresh();assert.ok(await page.locator('#return-live').isDisabled());assert.match(await page.locator('.combined-history .field').getAttribute('aria-label'),/Live committed field/);
 await page.locator('[data-tab=overview]').click();
 record('Desktop disclosures survive automatic poll start/completion; explicit close persists; historical play returns to live field');

 const clockBefore=await page.locator('.band-state').innerText();await manualRefresh();assert.equal(await page.locator('.band-state').innerText(),clockBefore);
 sourceTime=new Date().toISOString();revision++;await manualRefresh();assert.equal(await page.locator('.notice').filter({hasText:'STALE'}).count(),0);
 await page.locator('[data-tab=plays]').click();await page.locator('#drive-filter').selectOption('1');await page.locator('[data-play="2"]').click();
 revision++;const polledRevision=revision;
 await page.waitForFunction(rev=>document.querySelector('.all-fields')?.textContent.includes(`Revision ${rev}`),polledRevision,{timeout:10000});
 assert.equal(await page.locator('[data-play="2"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#drive-filter').inputValue(),'1');
 await page.locator('[data-tab=overview]').click();
 blockedReason='CHAIRMAN_EDIT_OPEN';revision++;await manualRefresh();await page.getByRole('heading',{name:'BLOCKED',exact:true}).waitFor();assert.equal(await page.locator('#detail table, #detail svg').count(),0);assert.match(await page.locator('#detail-content').innerText(),/CHAIRMAN_EDIT_OPEN/);
 blockedReason=null;revision++;await manualRefresh();assert.ok(await page.locator('#detail table').count()>0);
 transportLost=true;await manualRefresh();await page.locator('#connection').filter({hasText:'reconnecting'}).waitFor();assert.equal(await page.locator('#detail table, #detail svg').count(),0);
 transportLost=false;revision++;await manualRefresh();await page.locator('#connection').filter({hasText:'Recovered'}).waitFor();assert.ok(await page.locator('#detail table').count()>0);
 record('Mock HTTP: stale/fresh source, pure GET polling, automatic five-second refresh, selection retention, edit/cancel and transport recovery');
 denied=true;await manualRefresh();await page.getByRole('heading',{name:'ACCESS_DENIED',exact:true}).waitFor();assert.equal(await page.locator('#detail table').count(),0);
 denied=false;revision++;await manualRefresh();await page.locator('#connection').filter({hasText:'Recovered'}).waitFor();assert.ok(await page.locator('#detail table').count()>0);
 blockedReason='CHAIRMAN_CORRECTION';revision++;await manualRefresh();await page.getByRole('heading',{name:'BLOCKED',exact:true}).waitFor();await manualRefresh();assert.match(await page.locator('#detail-content').innerText(),/CHAIRMAN_CORRECTION/);assert.equal(await page.locator('#detail table, #detail svg').count(),0);
 record('Mock HTTP: saved correction remains blocked through repeated reads');
 await page.reload();await page.locator('#connection').filter({hasText:'Authentication required after reload'}).waitFor();assert.equal(await page.locator('#detail table').count(),0);assert.match(await page.locator('#review-banner').innerText(),/READ-ONLY QA/);assert.ok(methods.every(m=>m==='GET'));
 record('Mocked live access denial, recovery, no writes and safe reload');
 await page.locator('#settings-toggle').click();await page.locator('#fixtures').click();await page.locator('#board:not([hidden])').waitFor();await page.locator('[data-filter=all]').click();if(await page.locator('#settings').isVisible())await page.locator('#settings-toggle').click();await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:`${output}/statscenter.png`,fullPage:true});
 await page.locator('[data-open=G9001]').click();await page.locator('[data-tab=overview]').click();await page.screenshot({path:`${output}/game-center.png`,fullPage:true});
 await page.locator('#wp-case').selectOption('editCancelled');await page.screenshot({path:`${output}/game-stats-favorite-above-50.png`,fullPage:true});await page.locator('#wp-case').selectOption('live');
 await page.locator('[data-tab=plays]').click();await page.screenshot({path:`${output}/game-stats-play-by-play-drives.png`,fullPage:true});
 await page.locator('[data-tab=overview]').click();await page.setViewportSize({width:390,height:1000});await page.screenshot({path:`${output}/game-stats-phone-width.png`,fullPage:true});


 await page.locator('#mobile-menu-toggle').click();assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'true');await manualRefresh();assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'true');await page.locator('#mobile-menu-toggle').click();
 await page.locator('.mobile-games > summary').click();assert.ok(await page.locator('#game-switch').isVisible());await manualRefresh();assert.ok(await page.locator('#game-switch').isVisible());await page.locator('.mobile-games > summary').click();
 assert.equal(await page.locator('.key-stats table').isVisible(),false);await page.locator('.key-stats summary').click();assert.ok(await page.locator('.key-stats table').isVisible());await manualRefresh();assert.ok(await page.locator('.key-stats table').isVisible());await page.locator('.key-stats summary').click();
 await page.screenshot({path:`${output}/game-stats-phone-compact.png`,fullPage:true});
 await page.setViewportSize({width:1920,height:1080});await page.locator('[data-tab=overview]').click();
 await page.evaluate(()=>window.scrollTo(0,0));
 const compactBottom=await page.locator('.key-stats').evaluate(el=>el.getBoundingClientRect().bottom);assert.ok(compactBottom<=1080,`Overview extends below 1080: ${compactBottom}`);

 const fieldWidth=await page.locator('.current-drive .field').evaluate(el=>el.getBoundingClientRect().width);const overviewWidth=await page.locator('.overview-grid').evaluate(el=>el.getBoundingClientRect().width);assert.ok(fieldWidth/overviewWidth>=0.68,`Field too narrow: ${fieldWidth}/${overviewWidth}`);
 assert.equal(await page.locator('.turf-field').count(),1);assert.equal(await page.locator('.turf-field svg').count(),1);assert.equal(await page.locator('.timeout-dots').count(),2);assert.equal(await page.locator('#game-stats-nav[aria-current=page]').count(),1);
 await page.screenshot({path:`${output}/game-stats-1920x1080.png`,fullPage:false});
 await page.locator('#back').click();await page.locator('#board:not([hidden])').waitFor();const pairGap=await page.locator('.card .teams').first().evaluate(el=>{const name=el.querySelector('.team'),score=el.querySelector('.score');return score.getBoundingClientRect().left-name.getBoundingClientRect().right;});assert.ok(pairGap<=18,`Team-score gap ${pairGap}`);await page.screenshot({path:`${output}/statscenter-1920x1080.png`,fullPage:false});
 record('Compact layout: four overview panels fit 1920x1080; mobile menu/game picker/stats collapse and retain state');
 // Hand-authored generic response copies only. This is DOM/interaction load,
 // not 56 live subscriptions, engine capacity or hosted endpoint load evidence.
 const boardContext=await browser.newContext({viewport:{width:1920,height:1080}}),boardPage=await boardContext.newPage();
 boardPage.on('pageerror',error=>errors.push(error.message));
 try{
  const large=structuredClone(stats);large.games=[];large.responses={};
  for(let i=0;i<56;i++){
   const id=`G${9100+i}`,d=structuredClone(stats.responses.G9001),away=`Example Away ${i+1}`,home=`Example Home ${i+1}`;
   large.games.push({id,away,home,lifecycle:'ACTIVE'});d.gameId=id;d.runId=`${id}-EXAMPLE`;d.scoreboard.awayTeamAndRecords.name=away;d.scoreboard.homeTeamAndRecords.name=home;large.responses[id]=d;
  }
  await boardPage.route('**/fixtures/stats.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(large)}));
  await boardPage.goto(base);await boardPage.locator('.card').last().waitFor();assert.equal(await boardPage.locator('.card').count(),56);
  const started=performance.now();for(let i=0;i<10;i++)await boardPage.locator('#refresh').click();const refreshTenMs=Math.round(performance.now()-started);
  assert.equal(await boardPage.locator('.card').count(),56);assert.equal(await boardPage.locator('[data-open]').count(),56);
  await boardPage.locator('#search').fill('G9155');assert.equal(await boardPage.locator('.card').count(),1);await boardPage.locator('[data-open=G9155]').click();await boardPage.locator('.game-bank [data-bank-game]').last().waitFor();assert.equal(await boardPage.locator('.game-bank [data-bank-game]').count(),56);
  await boardPage.locator('[data-tab=overview]').click();await boardPage.locator('[data-tab=overview]').press('ArrowRight');assert.equal(await boardPage.locator('[data-tab=stats]').getAttribute('aria-selected'),'true');
  await boardPage.locator('[data-tab=stats]').press('End');assert.equal(await boardPage.locator('[data-tab=scoring]').getAttribute('aria-selected'),'true');
  await boardPage.locator('#back').click();await boardPage.locator('#board:not([hidden])').waitFor();assert.equal(await boardPage.locator('#search').inputValue(),'G9155');assert.equal(await boardPage.locator('.card').count(),1);
  await boardPage.locator('#search').fill('');await boardPage.setViewportSize({width:390,height:1000});assert.ok(await boardPage.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await boardPage.locator('[data-open=G9155]').click();await boardPage.locator('.mobile-games > summary').click();assert.equal(await boardPage.locator('#game-switch option').count(),56);
  record('56-game generic fixture board: ten refreshes, search/return, keyboard tabs and phone picker',{games:56,refreshTenMs,evidence:'DOM/interaction only; not live load or a performance SLA'});
 }finally{await boardContext.close();}
 // Reproduce the phone screenshot: remembered QA session, no retained credentials.
 const loginContext=await browser.newContext({viewport:{width:390,height:844}}),loginPage=await loginContext.newPage();
 try{
  await loginPage.addInitScript(()=>sessionStorage.setItem('gc510-ui-review',JSON.stringify({mode:'live',session:'qa-v510-wp-load-r3',gameIds:['G0502']})));
  await loginPage.route('**/auth/v1/token?grant_type=password',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'invalid_grant'})}));
  await loginPage.goto(base+'#game=G0502');await loginPage.locator('#detail h2').filter({hasText:'Sign-in required'}).waitFor();
  assert.ok(await loginPage.locator('#settings').isVisible());assert.ok(await loginPage.locator('#sign-in-status').isVisible());
  assert.equal(await loginPage.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await loginPage.locator('#email-input').inputValue(),'');assert.equal(await loginPage.locator('#password-input').inputValue(),'');
  await loginPage.locator('#email-input').fill('qa@example.invalid');await loginPage.locator('#password-input').fill('test-only');await loginPage.locator('#connect-submit').click();
  await loginPage.locator('#sign-in-status').filter({hasText:'Sign-in failed.'}).waitFor();
  assert.ok(await loginPage.locator('#sign-in-status').isVisible());assert.equal(await loginPage.locator('#connect-submit').isDisabled(),false);
  assert.equal(await loginPage.locator('#password-input').inputValue(),'');
  assert.ok(await loginPage.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  await loginPage.locator('#back').click();assert.equal(await loginPage.locator('.card').count(),0);
  assert.match(await loginPage.locator('#lanes').innerText(),/Sign in above/);
  record('Mobile restored QA session shows sign-in and rejected-login message outside collapsed menu; no misleading loading card');
 }finally{await loginContext.close();}
 assert.deepEqual(errors,[]);record('No application JavaScript errors');
 await page.goto(base+'#game=G9001');await page.setViewportSize({width:390,height:1080});
 if(!await page.locator('.all-fields').evaluate(el=>el.open))await page.locator('.all-fields > summary').click();
 await page.locator('.all-fields p').first().evaluate(el=>el.textContent+=' '+ 'source-context-'.repeat(30));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 record('Expanded source metadata wraps long identifiers at 390px');
}catch(error){results.push({name:'Browser verification',status:'FAIL',error:error.stack});await page.screenshot({path:`${output}/failure.png`,fullPage:true});process.exitCode=1;}
finally{await fs.writeFile(`${output}/results.json`,JSON.stringify({browser:kind,evidence:'FIXTURE / MOCK HTTP ONLY; viewport emulation, not real devices',results},null,2));console.log(JSON.stringify({browser:kind,results}));await context.close();await browser.close();server.close();}

