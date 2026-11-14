import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import * as e from '../../release-assets/v5.0.7-week12-operating/backend/runtime/engine.mjs';import {publicGame} from '../../release-assets/v5.0.7-week12-operating/backend/security/security-core.mjs';
const slate=JSON.parse(fs.readFileSync('release-assets/v5.0.7.1/slate.json')),patch=JSON.parse(fs.readFileSync('release-assets/v5.0.7.1/schedule-patch.json')),slug='w12v507-506ff58ba0cfb7a5';
const live=process.env.GC5071_HOSTED==='1',root=live?'https://rgbslb11.github.io/Synthcast-Console/v5.0.7.1/w12/':'http://127.0.0.1:9876/v5.0.7.1/w12/';
let server;if(!live){server=http.createServer((req,res)=>{const name=new URL(req.url,root).pathname,file=path.resolve('public','.'+(name.endsWith('/')?name+'index.html':name));if(!file.startsWith(path.resolve('public')+path.sep)){res.statusCode=403;res.end();return;}res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(9876,'127.0.0.1',r));}
const engines=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);const checks=[];let writes=0;
try{for(const name of ['chromium','webkit']){const browser=await engines[name].launch({headless:true});try{const page=await browser.newPage({viewport:name==='webkit'?{width:390,height:844}:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('api=command')||r.url().includes('api=create'))writes++;});
 if(!live)await page.route('**/functions/v1/gamecast-week12-v5-0-7-public?*',r=>r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({public_slug:slug,engine_version:e.ENGINE_VERSION,week_key:'2026-W12',state_version:1,state:slate.map(g=>publicGame({...e.initialGame(g),...g})),governance:{power_ready:60,active_games:60}})}));
 for(const [surface,url] of [['full',root+'?session='+slug+'&view=public'],['condensed',root+'ui1.3/?session='+slug]]){await page.goto(url);await page.locator('[data-game="G0570"]').waitFor({timeout:30000});assert.equal(await page.locator('article[data-game]').count(),60);
 const ids=await page.locator('article[data-game]').evaluateAll(nodes=>nodes.map(n=>n.dataset.game));assert.deepEqual(ids.filter(id=>patch.some(p=>p.id===id)),patch.map(p=>p.id));
 for(const p of patch){const text=await page.locator('[data-game="'+p.id+'"]').innerText();assert.ok(text.includes(p.patch.kickoff),p.id+' '+surface+' kickoff');assert.ok(text.includes(p.patch.network),p.id+' '+surface+' network');}
 for(const id of ['G0591','G0601'])assert.match(await page.locator('[data-game="'+id+'"]').innerText(),/PLACEHOLDER/);
 assert.match(await page.locator('[data-game="G0591"]').innerText(),/game date unconfirmed/i);
 checks.push(name+' '+surface+': all 60 games; 49 individual time/network checks; approved order; both placeholders explicit');}
 assert.deepEqual(errors,[]);
 }finally{await browser.close();}}
 assert.equal(writes,0);fs.mkdirSync('outputs/v5071',{recursive:true});fs.writeFileSync('outputs/v5071/'+(live?'hosted':'fixture')+'-browser.json',JSON.stringify({status:'PASS',scope:live?'Actual cloud read-only':'Isolated local UI/API snapshot fixture',checks,writes,physicalMobileSafari:'NOT TESTED'},null,2));console.log(JSON.stringify({status:'PASS',checks,writes}));
}finally{server?.close();}
