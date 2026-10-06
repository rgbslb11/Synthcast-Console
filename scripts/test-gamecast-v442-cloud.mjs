import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week7-v4-4-2';
const privatePath=process.env.GAMECAST_QA_PRIVATE;
const cases=[],started=performance.now();let slug='',token='',version=0,state=[];
const check=async(name,f)=>{await f();cases.push({name,status:'PASS'});};
async function request(action,{body,operator=false,bearer=token,session=slug}={}){
 const response=await fetch(API+'?api='+action+(session?'&session='+session:''),{method:body?'POST':'GET',headers:{'content-type':'application/json',...(operator?{'x-operator-token':bearer}:{})},body:body?JSON.stringify(body):undefined});
 const data=await response.json();return {status:response.status,data};
}
async function command(id,command,payload={},expected=version){
 const r=await request('command',{operator:true,body:{id,command,payload,expected_version:expected}});
 if(r.status===200){state=r.data.state;version=r.data.state_version;}return r;
}
await check('deployed identity and W7 count',async()=>{const r=await request('health');assert.equal(r.status,200);assert.equal(r.data.engine_version,'GC-W7-V4.4.2-RC1');assert.equal(r.data.week_key,'2026-W07');assert.equal(r.data.games,54);});
if(process.argv.includes('--health-only')){console.log(JSON.stringify({classification:'TEST RESULT',executed:1,passed:1,failed:0,skipped:0,cases}));process.exit(0);}
assert.ok(privatePath,'Set GAMECAST_QA_PRIVATE outside the repository and artifacts directory');
if(process.argv.includes('--poll-only')){
 ({public_slug:slug,operator_token:token}=JSON.parse(fs.readFileSync(privatePath)));
 const before=await request('read',{operator:true});version=before.data.state_version;
 await check('100 concurrent-batched read polls retain state version',async()=>{
  for(let i=0;i<10;i++)await Promise.all(Array.from({length:10},async()=>{const r=await request('read');assert.equal(r.status,200);assert.equal(r.data.state_version,version);}));
 });
 const report={classification:'TEST RESULT',publicSlug:slug,executed:cases.length,passed:cases.length,failed:0,skipped:0,polls:100,stateVersion:version,runtimeMilliseconds:performance.now()-started,cases};
 fs.writeFileSync('outputs/v442/cloud-polls.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exit(0);
}
await check('create new isolated QA session',async()=>{
 assert.ok(!fs.existsSync(privatePath),'Do not replace an existing private QA credential file');
 const r=await request('create',{body:{}});assert.equal(r.status,201);slug=r.data.public_slug;token=r.data.operator_token;version=r.data.state_version;
 assert.match(slug,/^w7v442-[a-f0-9]{16}$/);assert.equal(r.data.governance.games,54);
 fs.writeFileSync(privatePath,JSON.stringify({public_slug:slug,operator_token:token})+'\n',{mode:0o600,flag:'wx'});
});
await check('cloud readback has 54 distinct rated QA games',async()=>{const r=await request('read',{operator:true});assert.equal(r.status,200);assert.equal(r.data.operator,true);state=r.data.state;assert.equal(state.length,54);assert.equal(new Set(state.map(g=>g.id)).size,54);assert.ok(state.every(g=>g.qaOnly&&g.powerReady&&g.coinToss===null&&g.lifecycle==='UNLAUNCHED'));});
const id=state[0].id;
await check('wrong Chairman token rejects a write',async()=>{const r=await request('command',{operator:true,bearer:'invalid-qa-token',body:{id,command:'launch',expected_version:version}});assert.equal(r.status,403);});
await check('earlier namespace rejected by candidate endpoint',async()=>assert.equal((await request('read',{session:'w6v441-0000000000000000'})).status,404));
await check('scheduler rejects missing credential',async()=>assert.equal((await request('deadman_tick',{body:{}})).status,403));
let toss;
await check('launch persists exactly one toss',async()=>{assert.equal((await command(id,'launch')).status,200);const g=state.find(g=>g.id===id);assert.equal(g.coinTossAudit.length,1);toss=structuredClone(g.coinToss);assert.notEqual(toss.openingReceivingTeamId,toss.q3ReceivingTeamId);});
await check('stale launch retry rejected without version advance',async()=>{const v=version;assert.equal((await command(id,'launch',{},1)).status,409);const r=await request('read',{operator:true});assert.equal(r.data.state_version,v);assert.equal(r.data.state.find(g=>g.id===id).coinTossAudit.length,1);});
await check('public response has no private operator or RNG fields',async()=>{const r=await request('read');assert.equal(r.data.operator,false);assert.ok(!('operator_token' in r.data));const g=r.data.state.find(g=>g.id===id);for(const k of ['seedHex','rngState','coinTossAudit','history','deadman'])assert.ok(!(k in g));assert.ok(!('seedHex' in g.coinToss));});
await check('AUTO and 20x use the deployed handler',async()=>{assert.equal((await command(id,'auto')).status,200);assert.equal((await command(id,'speed',{speed:20})).status,200);});
await check('pause and reload preserve football situation',async()=>{
 assert.equal((await command(id,'pause')).status,200);const saved=structuredClone(state.find(g=>g.id===id));
 for(let i=0;i<3;i++){const r=await request('read',{operator:true});const g=r.data.state.find(g=>g.id===id);for(const k of ['pendingPlay','rngState','scoreboardSeconds','scores','possession','fieldPos','down','distance','coinToss'])assert.deepEqual(g[k],saved[k]);}
});
await check('delay resume and edit cancel preserve toss',async()=>{for(const c of ['delay','resume_delay','edit_begin','edit_cancel']){assert.equal((await command(id,c)).status,200);assert.deepEqual(state.find(g=>g.id===id).coinToss,toss);}});
await check('same-seed restart reproduces the original toss',async()=>{assert.equal((await command(id,'restart_same_seed',{confirmed:true})).status,200);assert.equal((await command(id,'launch')).status,200);const a={...toss},b={...state.find(g=>g.id===id).coinToss};delete a.runId;delete b.runId;assert.deepEqual(b,a);});
await check('new-seed restart changes seed and commits one new-run toss',async()=>{const seed=state.find(g=>g.id===id).seedHex;assert.equal((await command(id,'purge_new_seed',{confirmed:true})).status,200);assert.notEqual(state.find(g=>g.id===id).seedHex,seed);assert.equal((await command(id,'launch')).status,200);assert.equal(state.find(g=>g.id===id).coinTossAudit.length,1);});
await check('QA final remains locked and cannot be accepted',async()=>{assert.equal((await command(id,'end',{confirmed:true})).status,200);assert.equal(state.find(g=>g.id===id).lifecycle,'FINAL_PENDING');assert.equal((await command(id,'lock')).status,200);const v=version;assert.equal((await command(id,'accept',{confirmed:true})).status,403);assert.equal((await request('read',{operator:true})).data.state_version,v);});
await check('final and unlaunched state survive independent readback',async()=>{const r=await request('read',{operator:true});assert.equal(r.data.state.find(g=>g.id===id).lifecycle,'LOCKED');assert.equal(r.data.state.filter(g=>g.lifecycle==='UNLAUNCHED').length,53);assert.ok(r.data.state.every(g=>g.qaOnly));});
const report={classification:'TEST RESULT',scope:'Actual isolated Supabase HTTP backend and persistent new-only QA session',publicSlug:slug,engine:'GC-W7-V4.4.2-RC1',executed:cases.length,passed:cases.length,failed:0,skipped:0,stateVersion:version,gameCount:54,acceptedGames:0,runtimeMilliseconds:performance.now()-started,cases};
fs.writeFileSync('outputs/v442/cloud-api.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
