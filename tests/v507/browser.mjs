import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {createReleaseRuntime} from '../../release-assets/v5.0.7-week12/backend/src/release-runtime.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.7-week12/backend/runtime/week12.mjs';
const browserType=process.env.GAMECAST_BROWSER||'chromium',engines=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const slug='qa-w12v507-0000000000000001',owner='qa-browser-only';let row,runtime,origin;
const rpc=async(name,p)=>{
 if(name==='read_session')return [structuredClone(row)];if(name==='read_final_snapshots'||name==='read_request')return [];
 if(name==='commit_state'){assert.equal(p.p_expected_version,row.state_version);row.state=structuredClone(p.p_state);row.state_version++;row.last_advanced_at=p.p_stamp;return [{response:{public_slug:slug,engine_version:row.engine_version,week_key:row.week_key,state_version:row.state_version,state:structuredClone(row.state)},replayed:false}];}
 throw Error('Unexpected browser fixture RPC '+name);
};
const server=http.createServer(async(req,res)=>{try{
 if(req.url.startsWith('/qa/v507/')){let raw='';for await(const chunk of req)raw+=chunk;const response=await(req.url.startsWith('/qa/v507/public')?runtime.publicHandler:runtime.chairmanHandler)(new Request(origin+req.url,{method:req.method,headers:{...req.headers,origin},...(req.method!=='GET'?{body:raw}:{})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
 const name=new URL(req.url,origin).pathname,file=path.resolve('public','.'+(name.endsWith('/')?name+'index.html':name));assert.ok(file.startsWith(path.resolve('public')+path.sep));res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
}catch(e){res.statusCode=500;res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
runtime=createReleaseRuntime({allowedOrigins:[origin],schedulerSecret:'qa-only',clock:()=>new Date().toISOString(),transport:{rpc,authenticate:async()=>({id:owner}),authorize:async()=>({userId:owner,role:'CHAIRMAN',active:true})}});
const reset=()=>{row={session_id:'qa-only',public_slug:slug,owner_user_id:owner,week_key:'2026-W12',engine_version:runtime.engine.ENGINE_VERSION,data_version:runtime.engine.DATA_VERSION,state_version:1,last_advanced_at:new Date().toISOString(),state:slate.map(s=>runtime.engine.initialGame(s))};};reset();
const browser=await engines[browserType].launch({headless:true}),page=await browser.newPage({viewport:browserType==='webkit'?{width:390,height:844}:{width:1440,height:1000}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('synthcastGameCast507Auth',JSON.stringify({access_token:'qa-only-token',refresh_token:'qa-only',expiresAt:Date.now()+3600000,recovery:false})));
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name);};
const sequences=JSON.parse(fs.readFileSync('tests/v507/fixtures/week11-sequences.json'));
try{
 for(const [label,route] of [['Chairman',''],['Public','&view=public'],['Condensed',null]]){
  reset();await page.goto(origin+'/v5.0.7/w12/'+(route===null?'ui1.3/':'')+'?session='+slug+(route||''));await page.locator('[data-game="'+slate.at(-1).id+'"]').waitFor();
  await check(label+' exact 60 ordered QA identities',async()=>assert.deepEqual(await page.locator('article[data-game]').evaluateAll(es=>es.map(e=>e.dataset.game)),slate.map(g=>g.id)));
  await check(label+' fits viewport',async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)));
  if(label==='Chairman')await check('Chairman shows 60/60 power ready',async()=>assert.match(await page.locator('#links').innerText(),/ACTIVE POWER 60\/60/));
  for(const sequence of sequences.filter(s=>s.period==='1'||s.gameId==='G0555')){
   const first=sequence.records[0],g=row.state[0];Object.assign(g,{lifecycle:'ACTIVE',activity:'LIVE',auto:false,possession:first.team,fieldPos:first.preSnap.fieldPos,down:first.preSnap.down,distance:first.preSnap.distance,quarter:Number(sequence.period),activePeriod:sequence.period,scoreboardSeconds:first.clock});
   g.away.name=sequence.away;g.home.name=sequence.home;g.qaReplaySourceGameId=sequence.gameId;
   g.history=[];g.scores={'1':[0,0],'2':[0,0],'3':[0,0],'4':[0,0]};
   const p={team:first.team,strategy:'NORMAL',yards:first.yards,points:0,turnover:false,punt:true,fg:false,first:false,inBounds:false,incomplete:false,desc:first.desc,edgeAtSnap:0};runtime.engine.applyPlay(g,p);row.state_version++;
   await page.reload();const card=page.locator('[data-game="'+g.id+'"]');await card.waitFor();
   if(label==='Condensed')await page.locator('[data-toggle="'+g.id+'"]').click();
   await check(`${label} ${sequence.gameId} Q${sequence.period} punt at ${first.clock}: OWN ${g.fieldPos}`,async()=>{const text=await card.innerText();assert.ok(text.includes(sequence.away));assert.ok(text.includes(sequence.home));assert.equal(g.possession,1-first.team);assert.match(text,new RegExp('OWN '+g.fieldPos));if(first.preSnap.fieldPos+first.yards>=100)assert.match(text,/PUNT TOUCHBACK/);});
  }
 }
 assert.deepEqual(errors,[]);fs.mkdirSync('release-assets/v5.0.7-week12/evidence',{recursive:true});fs.writeFileSync('release-assets/v5.0.7-week12/evidence/browser-'+browserType+'.json',JSON.stringify({status:'PASS',scope:'Local QA RPC fixture; actual candidate HTTP handlers and retained UIs. No cloud database or real login. WebKit is mobile emulation, not physical Mobile Safari.',browserType,checks,errors},null,2)+'\n');
}finally{await browser.close();server.close();}
