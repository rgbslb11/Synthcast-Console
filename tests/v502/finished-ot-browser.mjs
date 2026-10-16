import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createReleaseRuntime} from '../../release-assets/v5.0.2-week8/backend/src/release-runtime.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.2-week8/backend/runtime/week8.mjs';
const playwright=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const originRef={value:''}, slug='w8v502-0000000000000001';
const runtime=createReleaseRuntime({
 allowedOrigins:['http://127.0.0.1:1'],schedulerSecret:'fixture-only',
 transport:{rpc:async(name)=>{if(name==='read_session')return [structuredClone(row)];if(name==='read_final_snapshots')return [];throw Error(name);},
 authenticate:async()=>({id:'fixture'}),authorize:async()=>({userId:'fixture',active:true,role:'CHAIRMAN'})}
});
const row={session_id:'fixture',public_slug:slug,owner_user_id:'fixture',week_key:'2026-W08',
 engine_version:runtime.engine.ENGINE_VERSION,data_version:runtime.engine.DATA_VERSION,
 state_version:1,last_advanced_at:new Date().toISOString(),state:OPERATING_SLATE.map(s=>({...runtime.engine.initialGame(s),qaOnly:false}))};
const game=row.state[0];
game.lifecycle='EDIT';game.activity='EDIT';game.auto=false;game.editing=true;
game.editResume={lifecycle:'FINAL_PENDING',auto:false,onAir:false,operatorPaused:false,delayed:false};
game.scores={'1':[10,7],'2':[10,0],'3':[0,10],'4':[7,10]};game.scoreboardSeconds=0;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,originRef.value);let filepath=url.pathname;
  if(filepath==='/api/chairman'){
    const data={public_slug:slug,state_version:1,engine_version:row.engine_version,state:row.state,master_zulu:new Date().toISOString()};
    res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':originRef.value});res.end(JSON.stringify(data));return;
  }
  if(filepath==='/v5.0.2/w8/release-config.js'){
    res.setHeader('content-type','text/javascript');
    res.end('globalThis.GAMECAST_V502_CONFIG='+JSON.stringify({projectUrl:originRef.value,publishableKey:'fixture',publicApi:originRef.value+'/api/public',chairmanApi:originRef.value+'/api/chairman'})+';');return;
  }
  if(filepath.endsWith('/'))filepath+='index.html';
  const file=path.resolve('public','.'+filepath);
  assert.ok(file.startsWith(path.resolve('public')+path.sep));
  res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'text/plain');
  res.end(fs.readFileSync(file));
 }catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
originRef.value='http://127.0.0.1:'+server.address().port;
const browser=await playwright[process.env.GAMECAST_BROWSER||'chromium'].launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const failures=[];page.on('pageerror',e=>failures.push(e.message));
await page.addInitScript(()=>sessionStorage.setItem('synthcastGameCast502Auth',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expiresAt:Date.now()+3600000,recovery:false})));
try{
 await page.goto(originRef.value+'/v5.0.2/w8/?session='+slug);
 await page.locator('[data-game="'+game.id+'"] .edit-panel').waitFor({timeout:15000});
 const card=page.locator('[data-game="'+game.id+'"]');
 await card.getByRole('button',{name:'+ ADD OVERTIME'}).waitFor();
 await card.getByRole('button',{name:'+ ADD OVERTIME'}).click();
 assert.equal(await card.locator('#e-'+game.id+'-aOT').count(),1);
 assert.equal(await card.locator('#e-'+game.id+'-hOT').count(),1);
 await card.locator('#e-'+game.id+'-aOT').fill('6');
 await card.locator('#e-'+game.id+'-hOT').fill('3');
 assert.equal(await card.locator('#e-'+game.id+'-atotal').innerText(),'33');
 assert.equal(await card.locator('#e-'+game.id+'-htotal').innerText(),'30');
 await card.getByRole('button',{name:'+ ADD OVERTIME'}).click();
 assert.equal(await card.locator('#e-'+game.id+'-a2OT').count(),1);
 await card.getByRole('button',{name:'UNDO ADDED OT'}).click();
 assert.equal(await card.locator('#e-'+game.id+'-a2OT').count(),0);
 assert.deepEqual(failures,[]);
 console.log('PASS full script-order + ADD OVERTIME visibility, click, OT1/OT2, totals, undo (mobile viewport)');
}finally{await browser.close();server.close();}
