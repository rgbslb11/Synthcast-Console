// Explicit opt-in only. Creates a NEW staging QA session; never resumes a user session.
// GAMECAST_QA_MODULES=/tmp/gamecast-v423-qa node scripts/qa-gamecast-v423-cloud.mjs --create-qa-session
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
if(!process.argv.includes('--create-qa-session'))throw new Error('Requires explicit --create-qa-session');
const require=createRequire(path.resolve(process.env.GAMECAST_QA_MODULES||'.','package.json'));
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2-2';
async function request(action,{slug='',token='',body}={}){
  const r=await fetch(API+'?api='+action+(slug?'&session='+slug:''),{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{'x-operator-token':token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const b=await r.json();assert.equal(r.ok,true,JSON.stringify({status:r.status,error:b.error}));return b;
}
const created=await request('create',{body:{}}),slug=created.public_slug,token=created.operator_token;
assert.ok(slug.startsWith('w3v422-'));assert.ok(token);
const recovery=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'gamecast-v423-cloud-')),'qa-session.json');
fs.writeFileSync(recovery,JSON.stringify({slug,token}),{mode:0o600});
console.log(JSON.stringify({phase:'created',qaOnly:true,session:slug}));
const dom=new JSDOM(read('public/v4.2.3/index.html'),{url:'https://qa.invalid/v4.2.3/?session='+slug+'#operator='+token,runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(30000)});w.setInterval=()=>0;w.confirm=()=>true;w.alert=m=>{throw new Error(m)};
const evaluate=s=>vm.runInContext(s,ctx);
const id='G0066',field=k=>w.document.getElementById(`e-${id}-${k}`);
const game=()=>evaluate('state').find(g=>g.id===id);
try{
  for(const file of ['public/v4.2.3/app.js','public/v4.2/patch-rc2.js','public/v4.2.2/patch-422.js'])vm.runInContext(read(file),ctx);
  await evaluate('readPromise');assert.equal(evaluate('state.length'),52);
  const command=async(c,p={})=>{await w.cmd(id,c,p);assert.ok(!w.document.getElementById('status').classList.contains('error'),w.document.getElementById('status').textContent)};
  await command('launch');await command('auto');await command('edit_begin');
  assert.equal(game().lifecycle,'EDIT');
  const baseline=structuredClone(game()),version=evaluate('version'),master=evaluate('masterEpoch');
  const values={a1:'7',a2:'3',a3:'14',a4:'0',h1:'0',h2:'10',h3:'7',h4:'3',q:'3',c:'06:42',p:'1',s:'OPP',y:'11',d:'4',x:'6',at:'1',ht:'2'};
  for(const [k,v]of Object.entries(values))field(k).value=v;
  const focused=field('c');focused.focus();focused.setSelectionRange(1,3);
  const started=Date.now();
  for(let i=0;i<5;i++){
    await new Promise(r=>setTimeout(r,7000));await w.load({background:true});w.tick();
    for(const [k,v]of Object.entries(values))assert.equal(field(k).value,v,k);
    assert.equal(field('c'),focused);assert.equal(w.document.activeElement,focused);assert.equal(evaluate('version'),version);
  }
  const observed=await request('read',{slug,token}),frozen=observed.state.find(g=>g.id===id);
  assert.equal(frozen.lifecycle,'EDIT');assert.ok(frozen.glSeconds-baseline.glSeconds>=35);assert.ok(evaluate('masterEpoch')-master>=35000);
  for(const key of ['rngState','history','scores','quarter','scoreboardSeconds','possession','fieldPos','down','distance','awayTimeouts','homeTimeouts'])assert.equal(JSON.stringify(frozen[key]),JSON.stringify(baseline[key]),key);
  console.log(JSON.stringify({phase:'edit-window-pass',seconds:Math.floor((Date.now()-started)/1000),glIncrease:frozen.glSeconds-baseline.glSeconds,focusPreserved:true,rngFrozen:true}));
  w.saveEdit(id,false);while(evaluate('writing||loading'))await new Promise(r=>setTimeout(r,50));
  assert.ok(!w.document.getElementById('status').classList.contains('error'),w.document.getElementById('status').textContent);
  const saved=await request('read',{slug,token}),g=saved.state.find(g=>g.id===id);
  assert.deepEqual(g.scores,{'1':[7,0],'2':[3,10],'3':[14,7],'4':[0,3]});
  assert.deepEqual([g.quarter,g.scoreboardSeconds,g.possession,g.fieldPos,g.down,g.distance,g.awayTimeouts,g.homeTimeouts],[3,402,1,89,4,6,1,2]);
  assert.equal(g.operatorPaused,true);assert.equal(g.continuationOf,baseline.runId);assert.notEqual(g.runId,baseline.runId);
  const pub=await request('read',{slug}),pg=pub.state.find(g=>g.id===id);assert.equal(pub.operator,false);assert.deepEqual(pg.scores,g.scores);assert.equal(pg.scoreboardSeconds,402);
  await command('edit_begin');field('a1').value='99';await command('edit_cancel');assert.equal(game().scores['1'][0],7);assert.equal(game().operatorPaused,true);
  // Stop this test run at FINAL_PENDING. Never lock, accept, or publish QA results.
  await command('end',{confirmed:true});assert.equal(game().lifecycle,'FINAL_PENDING');
  console.log(JSON.stringify({status:'PASS',qaOnly:true,session:slug,id,engine:saved.engine_version,games:saved.state.length,fieldsVerified:17,publicReadback:true,cancelReadback:true,finalState:'FINAL_PENDING',accepted:false,browser:'jsdom DOM with live staging HTTP; not Safari/Chromium visual QA'}));
  fs.unlinkSync(recovery);
}finally{w.close()}
