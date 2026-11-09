import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {fork} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';
import {createReleaseRuntime} from '../../release-assets/v5.0.7-week12/backend/src/release-runtime.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.7-week12/backend/src/engine-operations.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.7-week12/backend/runtime/week12.mjs';
import {TEAM_POWER} from '../../release-assets/v5.0.7-week12/backend/runtime/power.mjs';
import {SecurityError} from '../../release-assets/v5.0.7-week12/backend/security/security-core.mjs';
import * as engine from '../../release-assets/v5.0.7-week12/backend/runtime/engine.mjs';
const target=new URL(process.env.GC507_PG_URL||'http://invalid');
// This executable must never be pointed at Supabase or another persistent DB.
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'55432');assert.equal(target.pathname,'/gc507qa');
const pg=await import(pathToFileURL(process.env.PG_MODULE).href);pg.default.types.setTypeParser(1184,s=>s);
const pool=new pg.default.Pool({connectionString:target.href,max:5});
const origin='http://127.0.0.1:9876',actor='05070507-0507-4507-8507-050705070507',token='qa507-database-fixture-bearer';
const seqs=JSON.parse(fs.readFileSync('tests/v507/fixtures/week11-sequences.json'));
const scalar=new Set(['authorize_operator','read_final_snapshots','qa_lookup_run','qa_register_run','qa_bind_session','qa_finish_run']);
async function rpc(name,args){
 assert.ok(/^[a-z_]+$/.test(name));const c=await pool.connect();
 try{
  await c.query('set role service_role');const entries=Object.entries(args),values=entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v);
  const result=await c.query('select * from gamecast_v507_qa_w12.'+name+'('+entries.map(([k,v],i)=>k+'=> $'+(i+1)+(typeof v==='object'&&v!==null?'::jsonb':'')).join(',')+')',values);
  return scalar.has(name)?result.rows[0]?.[name]:result.rows;
 }catch(e){for(const [text,code,status] of [['version conflict','VERSION_CONFLICT',409],['idempotency conflict','IDEMPOTENCY_CONFLICT',409],['Chairman forbidden','CHAIRMAN_FORBIDDEN',403],['release writes disabled','RELEASE_WRITES_DISABLED',504],['locked weather changed','LOCKED_WEATHER_CHANGED',409]])if(e.message.includes(text))throw new SecurityError(code,status);throw e;}
 finally{await c.query('reset role');c.release();}
}
const fresh=()=>createReleaseRuntime({allowedOrigins:[origin],schedulerSecret:'ephemeral-fixture-no-cron',transport:{rpc,authenticate:async t=>{if(t!==token)throw new SecurityError('AUTHENTICATION_REQUIRED',401);return {id:actor};},authorize:async()=>({userId:actor,role:'CHAIRMAN',active:await rpc('authorize_operator',{p_user_id:actor})})}});
async function fixture(body){
 const runtime=fresh(),slug=body.slug;let s=await runtime.store.snapshot(slug);
 if(!s.state.every(g=>g.qaOnly===true))throw Error('QA_ONLY_REQUIRED');
 async function commit(label,mutate){const r=await runtime.store.commit({slug,actorId:actor,idempotencyKey:'pg507-'+label+'-'+crypto.randomUUID(),expectedVersion:s.stateVersion,request:{body:{command:'qa_fixture',label}},mutate});s=await runtime.store.snapshot(slug);return r;}
 if(['checkpoint','full_board'].includes(body.action))await commit('reset',async d=>{const events=[];for(const g of body.action==='full_board'?d.state:[d.state[0]])events.push(...(await runtime.operations.executeCommand(d,{id:g.id,command:'purge_new_seed',payload:{confirmed:true}})).events);return {events};});
 if(body.action==='checkpoint'){
  assert.ok(Number.isInteger(body.scenario)&&body.scenario>=0&&body.scenario<seqs.length);
  await commit('checkpoint',async d=>{
   const g=d.state[0],seq=seqs[body.scenario],r=seq.records[0];
   Object.assign(g,{qaReplayScenario:body.scenario,qaReplaySourceGameId:seq.gameId,lifecycle:'ACTIVE',activity:'LIVE',auto:false,possession:r.team,fieldPos:r.preSnap.fieldPos,down:r.preSnap.down,distance:r.preSnap.distance,quarter:Number(seq.period),activePeriod:seq.period,period:['1st','2nd','3rd','4th'][Number(seq.period)-1],scoreboardSeconds:r.clock+1,glSeconds:r.gl-1});
   g.away.name=seq.away;g.home.name=seq.home;
   g.pendingPlay={team:r.team,strategy:'NORMAL',yards:r.yards,points:0,turnover:false,punt:true,fg:false,first:false,inBounds:false,incomplete:false,desc:r.desc,edgeAtSnap:0,phase:'PLAY',remaining:1,playSec:7,clockBefore:r.clock+7};
   g.lastPlay='QA replay checkpoint';d.lastAdvancedAt=new Date().toISOString();return {events:[{type:'V507_QA_CHECKPOINT',gameId:g.id,payload:{sourceGame:seq.gameId,scenario:body.scenario}}]};
  });
 }else if(body.action==='followup')await commit('followup',async d=>{
  const g=d.state[0],seq=seqs[g.qaReplayScenario],events=[];g.pendingPlay=null;
  for(const r of seq.records.slice(1)){g.scoreboardSeconds=r.clock;engine.applyPlay(g,{team:r.team,strategy:r.strategy,yards:r.yards,points:0,turnover:false,punt:false,fg:false,first:r.yards>=g.distance,inBounds:r.desc.includes('in bounds')||r.desc.includes('Sack'),incomplete:r.desc==='Incomplete pass',desc:r.originalDescription||r.desc,edgeAtSnap:0});events.push({type:'V507_FOOTBALL_RECORD',gameId:g.id,payload:structuredClone(g.history.at(-1))});}
  d.lastAdvancedAt=new Date().toISOString();return {events};
 });
 else if(body.action==='full_board')await commit('board',async d=>{
  const events=[];for(const [i,g] of d.state.entries()){const s=slate[i];g.away={name:s.away,record:''};g.home={name:s.home,record:''};g.awayPower=TEAM_POWER[s.away];g.homePower=TEAM_POWER[s.home];delete g.qaReplayScenario;delete g.qaReplaySourceGameId;g.seedHex=String(507+i).padStart(32,'0');g.rngState=engine.seedWords(g.seedHex,g.id);events.push(...(await runtime.operations.executeCommand(d,{id:g.id,command:'launch',payload:{}})).events);g.auto=true;g.speed=50;}
  events.push(...(await runtime.operations.advance(d,{seconds:400})).events);assert.ok(d.state.every(g=>g.lifecycle==='FINAL_PENDING'&&g.qaOnly));return {events};
 });
 return {version:s.stateVersion};
}
async function serve(){
 const server=http.createServer(async(req,res)=>{try{
  let raw='';for await(const c of req)raw+=c;
  if(req.url.startsWith('/_qa')){assert.equal(req.headers.authorization,'Bearer '+token);res.setHeader('content-type','application/json');res.end(JSON.stringify(await fixture(JSON.parse(raw))));return;}
  if(req.url.startsWith('/api/')){const runtime=fresh(),handler=req.url.startsWith('/api/public')?runtime.publicHandler:runtime.chairmanHandler;const response=await handler(new Request(origin+req.url,{method:req.method,headers:{...req.headers,origin},...(req.method!=='GET'?{body:raw}:{})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  const name=new URL(req.url,origin).pathname;
  if(name==='/v5.0.7/w12/release-config.js'){res.setHeader('content-type','text/javascript');res.end('globalThis.GAMECAST_V507_CONFIG='+JSON.stringify({projectUrl:origin,publishableKey:'ephemeral-only',publicApi:origin+'/api/public',chairmanApi:origin+'/api/chairman'})+';');return;}
  const file=path.resolve('public','.'+(name.endsWith('/')?name+'index.html':name));assert.ok(file.startsWith(path.resolve('public')+path.sep));res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
 }catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}));}});
 await new Promise(r=>server.listen(9876,'127.0.0.1',r));process.send?.({ready:true});
}
if(process.env.GC507_PG_SERVER==='1'){await serve();}
else{
 let child,browser;const checks=[];
 const record=(name)=>{checks.push(name);console.log('PASS',name);};
 const start=()=>new Promise((resolve,reject)=>{child=fork(fileURLToPath(import.meta.url),[],{env:{...process.env,GC507_PG_SERVER:'1'},stdio:['ignore','inherit','inherit','ipc']});child.once('error',reject);child.once('message',()=>resolve());});
 const stop=()=>new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});
 const row=async slug=>(await pool.query('select state,state_version,md5(state::text) as hash from gamecast_v507_qa_w12.sessions where public_slug=$1',[slug])).rows[0];
 const request=async(action,body={},slug='',key='qa507-http-'+crypto.randomUUID())=>{const response=await fetch(origin+'/api/chairman?api='+action+(slug?'&session='+slug:''),{method:'POST',headers:{origin,authorization:'Bearer '+token,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
 const checkpoint=async(slug,scenario)=>{const r=await fetch(origin+'/_qa',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({slug,action:'checkpoint',scenario})});assert.equal(r.status,200);await new Promise(r=>setTimeout(r,1200));};
 const advance=async slug=>{const r=await request('read',{},slug);const g=r.data.state[0];const b={id:g.id,command:'on_air',payload:{},expected_version:r.data.state_version,game_tokens:{[g.id]:g.control_token}};const key='qa507-exact-retry-'+crypto.randomUUID(),a=await request('command',b,slug,key);assert.equal(a.status,201);const before=await row(slug),again=await request('command',b,slug,key);assert.equal(again.status,200);assert.equal((await row(slug)).state_version,before.state_version);assert.equal((await row(slug)).hash,before.hash);return a.data.state[0];};
 try{
  await pool.query(`create role anon;create role authenticated;create role service_role bypassrls;create role authenticator;alter role authenticator set pgrst.db_schemas='public';create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${actor}');create schema gamecast_v506_w11;create table gamecast_v506_w11.operators(user_id uuid primary key,role text,active boolean,created_at timestamptz default now(),updated_at timestamptz default now());insert into gamecast_v506_w11.operators(user_id,role,active) values('${actor}','CHAIRMAN',true);`);
  await pool.query(fs.readFileSync('release-assets/v5.0.7-week12/cloud-qa-schema.sql','utf8'));record('QA SQL installs in disposable PostgreSQL; no shared project');
  for(const role of ['anon','authenticated']){await pool.query('set role '+role);try{await assert.rejects(pool.query('select * from gamecast_v507_qa_w12.read_session($1)',['qa-w12v507-'+'0'.repeat(16)]));}finally{await pool.query('reset role');}}record('anonymous and authenticated direct SQL access denied');
  await start();const created=await request('create');assert.equal(created.status,201);const slug=created.data.public_slug;assert.equal(created.data.state.length,60);assert.ok((await row(slug)).state.every(g=>g.qaOnly===true&&g.powerReady));record('actual HTTP create -> SQL session: 60 games, 120 participant coverage, QA only');
  const denied=await fetch(origin+'/api/public?api=read&session=w11v506-'+'0'.repeat(16),{headers:{origin}});assert.equal(denied.status,404);record('foreign release namespace rejected');
  const engines=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
  for(const browserType of ['chromium','webkit']){
   browser=await engines[browserType].launch({headless:true});const page=await browser.newPage({viewport:browserType==='webkit'?{width:390,height:844}:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(t=>sessionStorage.setItem('synthcastGameCast507Auth',JSON.stringify({access_token:t,refresh_token:'ephemeral-only',expiresAt:Date.now()+3600000,recovery:false})),token);
   for(const [surface,suffix] of [['Chairman',''],['Public','&view=public'],['Condensed',null]]){
    const base=origin+'/v5.0.7/w12/'+(suffix===null?'ui1.3/':'')+'?session='+slug+(suffix||'');await page.goto(base);await page.locator('[data-game="'+slate.at(-1).id+'"]').waitFor();assert.equal(await page.locator('article[data-game]').count(),60);record(browserType+' '+surface+' reads all 60 games from real PostgreSQL');
    for(const scenario of [0,1,2,3]){
     const seq=seqs[scenario],first=seq.records[0];await checkpoint(slug,scenario);const g=await advance(slug),expected=first.preSnap.fieldPos+first.yards>=100?20:100-first.preSnap.fieldPos-first.yards;
     assert.equal(g.fieldPos,expected);assert.equal(g.possession,1-first.team);const persisted=await row(slug);assert.equal(persisted.state[0].history.at(-1).ruling,expected===20?'PUNT_TOUCHBACK':undefined);
     await stop();await start();const before=await row(slug);await page.goto(base);const card=page.locator('[data-game="'+slate[0].id+'"]');await card.waitFor();if(surface==='Condensed')await page.locator('[data-toggle="'+slate[0].id+'"]').click();const text=await card.innerText();assert.ok(text.includes(seq.home)&&text.includes(seq.away));assert.match(text,new RegExp('OWN '+expected));if(expected===20)assert.match(text,/PUNT TOUCHBACK/);assert.equal((await row(slug)).hash,before.hash);
     record(browserType+' '+surface+' '+seq.gameId+' Q'+seq.period+': OWN '+expected+', exact retry, process restart and read-only poll');
     const f=await fetch(origin+'/_qa',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({slug,action:'followup'})});assert.equal(f.status,200);const completed=(await row(slug)).state[0],last=completed.history.at(-1);
     assert.equal(last.ruling,expected===20?undefined:'SAFETY');if(expected!==20){assert.equal(engine.total(completed,first.team),2);assert.deepEqual(last.freeKick,{kickingTeam:1-first.team,receivingTeam:first.team,fromOwn:20});}record(browserType+' '+surface+' '+seq.gameId+' Q'+seq.period+': '+(expected===20?'artificial safety avoided':'legitimate safety retained'));
    }
   }
   assert.deepEqual(errors,[]);await browser.close();browser=null;
  }
  const full=await fetch(origin+'/_qa',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({slug,action:'full_board'})});assert.equal(full.status,200,await full.text());const completed=await row(slug);assert.ok(completed.state.every(g=>g.lifecycle==='FINAL_PENDING'&&g.qaOnly));record('all 60 canonical Week 12 games complete and persist in one isolated board');
  const r=await request('read',{},slug),g=r.data.state[0];for(const command of ['lock','accept']){const d=await request('read',{},slug),x=d.data.state[0];const a=await request('command',{id:x.id,command,payload:{confirmed:true},expected_version:d.data.state_version,game_tokens:{[x.id]:x.control_token}},slug);assert.equal(a.status,command==='lock'?201:403);}record('SQL-backed QA result can lock but cannot be accepted');
  const result={status:'PASS',scope:'Disposable GitHub-hosted PostgreSQL 17 container and actual candidate engine/HTTP handlers/UIs. Authentication is a test identity fixture. Shared Supabase/PostgREST and real-user Auth were NOT exercised or modified.',postgres:(await pool.query('select version()')).rows[0].version,sourceCommit:process.env.GITHUB_SHA,checks,gameCount:60,browsers:['chromium','mobile-webkit-emulation'],physicalMobileSafari:'NOT TESTED',targetSupabase:'BLOCKED_AUTOMATIC_APPROVAL_REVIEW',officialResultsWritten:0};
  fs.mkdirSync('outputs/v507-cloud',{recursive:true});fs.writeFileSync('outputs/v507-cloud/postgres-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,gameCount:60}));
 }finally{if(browser)await browser.close();if(child&&!child.killed)await stop();await pool.end();}
}
