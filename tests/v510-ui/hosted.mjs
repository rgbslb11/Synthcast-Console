import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const kind=process.env.GAMECAST_BROWSER??'chromium';
assert(process.env.GAMECAST_QA_EMAIL&&process.env.GAMECAST_QA_PASSWORD,'QA credentials required');
const browser=await ({chromium,webkit}[kind]).launch(),context=await browser.newContext(),page=await context.newPage(),results=[];
const errors=[];page.on('pageerror',()=>errors.push('PAGE_ERROR'));
try{
 await page.goto('https://rgbslb11.github.io/Synthcast-Console/v5.1.0/review/');await page.locator('.card').first().waitFor();
 await page.locator('#settings-toggle').click();await page.locator('#session-input').fill('qa-v510-wp-load-r3');await page.locator('#games-input').fill('G0502');await page.locator('#email-input').fill(process.env.GAMECAST_QA_EMAIL);await page.locator('#password-input').fill(process.env.GAMECAST_QA_PASSWORD);await page.getByRole('button',{name:'Connect to QA',exact:true}).click();
 await page.locator('#connection').filter({hasText:'Connected'}).waitFor({timeout:60000});assert.equal(await page.locator('#password-input').inputValue(),'');
 await page.locator('[data-open=G0502]').click();await page.locator('[data-tab=overview]').click();
 await page.waitForFunction(()=>/\d+\.\d%/.test(document.querySelector('.wp-value')?.textContent??''),null,{timeout:60000});
 results.push({name:'Hosted password sign-in and actual QA WP display',status:'PASS',wp:await page.locator('.wp-value').innerText()});
 await page.locator('.wp-options > summary').click();await page.locator('.all-fields > summary').click();
 await page.waitForTimeout(11000);
 for(const selector of ['.wp-options','.all-fields'])assert.ok(await page.locator(selector).evaluate(el=>el.open));
 await page.locator('.wp-options > summary').click();await page.waitForTimeout(6000);assert.equal(await page.locator('.wp-options').evaluate(el=>el.open),false);
 await page.setViewportSize({width:1920,height:1080});await page.locator('[data-tab=plays]').click();await page.locator('[data-play]').first().click();
 assert.match(await page.locator('.combined-history .field').getAttribute('aria-label'),/Historical play/);
 await page.locator('#return-live').click();assert.match(await page.locator('.combined-history .field').getAttribute('aria-label'),/Live committed field/);assert.ok(await page.locator('#return-live').isDisabled());
 await page.locator('[data-tab=overview]').click();
 results.push({name:'Real polling retains expanded/closed disclosures and selected play returns to live field',status:'PASS'});
 for(const width of [390,1920]){await page.setViewportSize({width,height:1080});const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));results.push({name:'Hosted expanded Source details overflow check',width,status:dimensions.scrollWidth<=dimensions.clientWidth?'PASS':'FAIL',...dimensions});}
 await page.setViewportSize({width:1920,height:1080});
 await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));assert.equal(await page.locator('#detail svg').count(),0);
 await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')));await page.waitForFunction(()=>/\d+\.\d%/.test(document.querySelector('.wp-value')?.textContent??''),null,{timeout:60000});
 results.push({name:'Actual QA disconnect and reconnect',status:'PASS'});
 assert.deepEqual(errors,[]);
 if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}finally{
 // Explicit normal-user logout, including when assertions fail. Never save auth traces.
 try{if(await page.locator('#sign-out').count())await page.locator('#sign-out').evaluate(e=>e.click());await page.waitForTimeout(1000);}catch{}
 await fs.mkdir('outputs/v510-hosted',{recursive:true});await fs.writeFile(`outputs/v510-hosted/${kind}.json`,JSON.stringify({browser:kind,results},null,2));console.log(JSON.stringify({browser:kind,results}));await context.close();await browser.close();
}
