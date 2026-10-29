import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {createReleaseRuntime} from '../../release-assets/v5.0.5-week10/backend/src/release-runtime.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.5-week10/backend/runtime/week10.mjs';
const browserType=process.env.GAMECAST_BROWSER||'chromium',engines=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const slug='w10v505-0000000000000001',owner='browser-fixture-only';let row,runtime,origin;
const rpc=async(name,p)=>{
 if(name==='read_session')return [structuredClone(row)];
 if(name==='read_final_snapshots'||name==='read_request')return [];
 if(name==='commit_state'){
  assert.equal(p.p_expected_version,row.state_version);
  row.state=structuredClone(p.p_state);row.state_version++;row.last_advanced_at=p.p_stamp;
  return [{response:{public_slug:slug,engine_version:row.engine_version,week_key:row.week_key,state_version:row.state_version,state:structuredClone(row.state)},replayed:false}];
 }
 throw Error('Unexpected local fixture RPC: '+name);
};
const server=http.createServer(async(req,res)=>{try{
 if(req.url.startsWith('/api/')){let raw='';for await(const chunk of req)raw+=chunk;const r=await(req.url.startsWith('/api/public')?runtime.publicHandler:runtime.chairmanHandler)(new Request(origin+req.url,{method:req.method,headers:{...req.headers,origin},...(req.method!=='GET'?{body:raw}:{})}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 const name=new URL(req.url,origin).pathname;
 if(name==='/v5.0.5/w10/release-config.js'){res.setHeader('content-type','text/javascript');res.end('globalThis.GAMECAST_V505_CONFIG='+JSON.stringify({projectUrl:origin,publishableKey:'test-only',publicApi:origin+'/api/public',chairmanApi:origin+'/api/chairman'})+';');return;}
 const file=path.resolve('public','.'+(name.endsWith('/')?name+'index.html':name));assert.ok(file.startsWith(path.resolve('public')+path.sep));res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
}catch(e){res.statusCode=500;res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
runtime=createReleaseRuntime({allowedOrigins:[origin],schedulerSecret:'test-only',transport:{rpc,authenticate:async()=>({id:owner}),authorize:async()=>({userId:owner,role:'CHAIRMAN',active:true})}});
row={session_id:'fixture-only',public_slug:slug,owner_user_id:owner,week_key:'2026-W10',engine_version:runtime.engine.ENGINE_VERSION,data_version:runtime.engine.DATA_VERSION,state_version:1,last_advanced_at:new Date().toISOString(),state:OPERATING_SLATE.map(s=>({...runtime.engine.initialGame(s),qaOnly:false}))};
const browser=await engines[browserType].launch({headless:true}),page=await browser.newPage({viewport:browserType==='webkit'?{width:390,height:844}:{width:1440,height:1000}}),errors=[],checks=[],timings=[];
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('synthcastGameCast505Auth',JSON.stringify({access_token:'test-not-real',refresh_token:'test',expiresAt:Date.now()+3600000,recovery:false})));
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name);};
try{
 for(const [label,suffix] of [['Chairman',''],['Public','&view=public'],['Condensed',null]]){
  // Each surface starts with the complete upcoming schedule; Chairman control
  // tests below intentionally transition its fixture into a live game.
  row.state=OPERATING_SLATE.map(s=>({...runtime.engine.initialGame(s),qaOnly:false}));row.state_version++;
  const start=performance.now();await page.goto(origin+'/v5.0.5/w10/'+(suffix===null?'ui1.3/':'')+'?session='+slug+(suffix||''));await page.locator('[data-game="G0491"]').waitFor();timings.push({surface:label,navigationToLastCardMs:performance.now()-start,fixture:true});
  await check(label+' shows exact 56 ordered Week 10 identities',async()=>{assert.deepEqual(await page.locator('article[data-game]').evaluateAll(es=>es.map(e=>e.dataset.game)),OPERATING_SLATE.map(g=>g.id));});
  await check(label+' preserves every team, network and kickoff',async()=>{for(const g of OPERATING_SLATE){const text=await page.locator('article[data-game="'+g.id+'"]').innerText();for(const value of [g.away,g.home,g.network,g.kickoff])assert.ok(text.toLowerCase().includes(value.toLowerCase()),g.id+' '+value);}});
  await check(label+' fits viewport',async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)));
  if(label==='Chairman'){
   await check('Chairman is signed in, all power ready, no live results',async()=>{assert.match(await page.locator('#links').innerText(),/ACTIVE POWER 56\/56/);assert.equal(await page.getByRole('button',{name:'LAUNCH',exact:true}).count(),56);assert.equal(await page.getByRole('button',{name:'ACCEPT',exact:true}).count(),0);});
   await page.locator('#teamSearch').fill('Wyoming');await check('Chairman search finds scheduled game',async()=>assert.equal(await page.locator('article[data-game]').count(),1));
   await page.locator('#teamSearch').fill('');
   const first=page.locator('[data-game="'+OPERATING_SLATE[0].id+'"]');
   await check('Launch, Start Auto and Stop update without page reload',async()=>{
    await first.getByRole('button',{name:'LAUNCH',exact:true}).click();
    await first.getByRole('button',{name:'START AUTO',exact:true}).waitFor();
    await first.getByRole('button',{name:'START AUTO',exact:true}).click();
    await first.getByRole('button',{name:'STOP AUTO',exact:true}).waitFor();
    assert.equal(row.state[0].auto,true);
    await first.getByRole('button',{name:'STOP AUTO',exact:true}).click();
    await first.getByRole('button',{name:'START AUTO',exact:true}).waitFor();
    assert.equal(row.state[0].auto,false);
   });
   await check('Upcoming excludes the launched game',async()=>{
    await page.locator('[data-f="UPCOMING"]').click();assert.equal(await page.locator('article[data-game]').count(),55);
    await page.locator('[data-f="ALL"]').click();assert.equal(await page.locator('article[data-game]').count(),56);
   });
   await check('Authoritative score changes render on the next poll without reload',async()=>{
    row.state[0].scores['1']=[7,0];row.state_version++;
    await page.waitForFunction(id=>document.querySelector('[data-game="'+id+'"] .score')?.textContent==='7',OPERATING_SLATE[0].id,{timeout:12000});
   });
  }else await check(label+' has no operator action controls',async()=>{assert.equal(await page.getByRole('button',{name:'LAUNCH',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'ACCEPT',exact:true}).count(),0);});
  if(label==='Condensed'){
   await page.getByRole('tab',{name:/SATURDAY/}).click();await check('Condensed Saturday has exact 48 games',async()=>assert.deepEqual(await page.locator('article[data-game]').evaluateAll(es=>es.map(e=>e.dataset.game)),OPERATING_SLATE.filter(g=>g.date==='2026-10-31').map(g=>g.id)));
   await page.getByRole('tab',{name:/FULL WEEK/}).click();await page.locator('#teamSearch').fill('Wyoming');await check('Condensed search and detail retain Week 10 game',async()=>{assert.equal(await page.locator('article[data-game]').count(),1);await page.locator('[data-toggle="G0491"]').click();assert.match(await page.locator('[data-game="G0491"]').innerText(),/WEATHER OFF/);});
  }
  await page.screenshot({path:'outputs/v505/week10-'+browserType+'-'+label.toLowerCase()+'.png',fullPage:false});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('outputs/v505/week10-'+browserType+'-browser.json',JSON.stringify({status:'PASS',testScope:'Local mutable API fixture using actual release handlers; database not exercised by this browser fixture; not real-user sign-in',browserType,checks,timings,errors},null,2));
}finally{await browser.close();server.close();}
