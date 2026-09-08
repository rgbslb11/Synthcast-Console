// Isolated test dependency: npm install --prefix /tmp/gamecast-v423-qa jsdom@26.1.0
// GAMECAST_QA_MODULES=/tmp/gamecast-v423-qa node --test scripts/test-gamecast-v423-ui.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import path from 'node:path';
const require=createRequire(path.resolve(process.env.GAMECAST_QA_MODULES||'.','package.json'));
const {JSDOM}=require('jsdom');
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const engineSource=read('supabase/functions/gamecast-week3-v4-2-2/index.ts').replace(/^import .*;\s*$/gm,'').split('Deno.serve(')[0];
const fixture=read('scripts/test-gamecast-v422-engine.mjs').split('function mkGame(')[1].split('\nfunction assert(')[0];
function backend(){
  const ctx=vm.createContext({crypto:globalThis.crypto,structuredClone,TextEncoder,Date,console});
  vm.runInContext(stripTypeScriptTypes(engineSource)+'\nfunction mkGame('+fixture,ctx);
  return ctx;
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
async function harness({publicView=false}={}){
  const core=backend();
  let games=Array.from({length:52},(_,i)=>({...core.mkGame('QA-'+i),id:'T'+i,kickoffOrder:i,dateLabel:'QA ONLY',kickoff:'TEST',network:'TEST'}));
  let v=1,seconds=0,heldRead=null,nextError=0;
  const requests=[],timers=[];
  const dom=new JSDOM(read('public/v4.2.3/index.html'),{url:'https://qa.invalid/v4.2.3/?session=w3v422-qa'+(publicView?'&view=public':''),runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  const snapshot=()=>structuredClone({state:games,state_version:v,engine_version:'GC-W3-V4.2.2-RC1',master_zulu:new Date(Date.UTC(2026,8,8)+seconds*1000).toISOString(),governance:{games:52,power_ready:52}});
  const response=(x,status=200)=>({ok:status<400,status,json:async()=>x});
  w.confirm=()=>true;w.alert=m=>{throw new Error(m)};
  w.setInterval=(fn,ms)=>{timers.push({fn,ms});return timers.length};
  w.fetch=async(url,options)=>{
    const action=new URL(url).searchParams.get('api');
    const body=options.body?JSON.parse(options.body):null;
    requests.push({action,body});
    if(action==='read'){
      const b=snapshot();
      if(heldRead){const hold=heldRead;heldRead=null;await hold.promise}
      if(nextError){const n=nextError;nextError=0;return response({error:'test error'},n)}
      return response(b);
    }
    if(nextError){const n=nextError;nextError=0;return response({error:'test error'},n)}
    if(body.expected_version!==v)return response({error:'version conflict'},409);
    const g=games.find(g=>g.id===body.id),p=body.payload;
    switch(body.command){
      case 'edit_begin':core.beginEdit(g,p);break;
      case 'edit_commit':core.commitEdit(g,p,{});break;
      case 'edit_cancel':core.cancelEdit(g);break;
      case 'quarter_length':g.quarterLengthSeconds=p.seconds;g.scoreboardSeconds=p.seconds;break;
      case 'score':core.score(g,p.team,p.points,'QA');break;
      default:throw new Error('Unhandled QA command '+body.command);
    }
    v++;return response(snapshot());
  };
  vm.runInContext(read('public/v4.2.3/app.js'),dom.getInternalVMContext());
  vm.runInContext(read('public/v4.2/patch-rc2.js'),dom.getInternalVMContext());
  vm.runInContext(read('public/v4.2.2/patch-422.js'),dom.getInternalVMContext());
  await w.eval('readPromise');
  const q=s=>w.document.querySelector(s),input=(id,key)=>w.document.getElementById(`e-${id}-${key}`);
  return {w,dom,core,games,requests,timers,q,input,snapshot,get version(){return v},bump(){v++},error(n){nextError=n},hold(){heldRead=deferred();return heldRead},advance(n){seconds+=n;for(const g of games)core.advanceGame(g,n)},read:()=>w.load({background:true}),value:s=>w.eval(s),close:()=>w.close()};
}
function fill(h,id='T0'){
  const values={a1:'7',a2:'3',a3:'14',a4:'0',h1:'0',h2:'10',h3:'7',h4:'3',q:'3',c:'06:42',p:'1',s:'OPP',y:'11',d:'4',x:'6',at:'1',ht:'2'};
  for(const [k,v]of Object.entries(values))h.input(id,k).value=v;
  return values;
}
function sameDraft(h,id,values){for(const [k,v]of Object.entries(values))assert.equal(h.input(id,k).value,v,k)}

test('35 seconds / five polls: all draft fields, node identity and focus survive; cloud GL/Master advance and actual engine RNG freezes',async()=>{
  const h=await harness();try{
    await h.w.cmd('T0','edit_begin');const vals=fill(h),el=h.input('T0','c');el.focus();el.setSelectionRange(1,3);
    const rng=JSON.stringify(h.games[0].rngState),history=JSON.stringify(h.games[0].history),clock=h.games[0].scoreboardSeconds,version=h.value('version');
    const text=[];const observer=new h.w.MutationObserver(()=>text.push(h.q('#status').textContent));observer.observe(h.q('#status'),{childList:true,subtree:true});
    for(let i=0;i<5;i++){h.advance(7);await h.read();h.w.tick();sameDraft(h,'T0',vals);assert.equal(h.input('T0','c'),el);assert.equal(h.w.document.activeElement,el)}
    assert.equal(el.selectionStart,1);assert.equal(el.selectionEnd,3);assert.equal(h.games[0].glSeconds,35);assert.equal(h.q('[data-gl="T0"]').textContent,'GL 0:00:35');
    assert.match(h.q('#tz-z').textContent,/00:00:35Z/);assert.equal(JSON.stringify(h.games[0].rngState),rng);assert.equal(JSON.stringify(h.games[0].history),history);assert.equal(h.games[0].scoreboardSeconds,clock);assert.equal(h.value('version'),version);assert.ok(!text.some(x=>x.includes('SYNCING')));
    observer.disconnect();
  }finally{h.close()}
});

test('save persists every entered field through real commitEdit and forces authoritative readback',async()=>{
  const h=await harness();try{
    await h.w.cmd('T0','edit_begin');fill(h);h.input('T0','c').focus();const reads=h.requests.filter(x=>x.action==='read').length;
    h.w.saveEdit('T0',false);await new Promise(r=>setImmediate(r));
    const g=h.games[0];assert.deepEqual(JSON.parse(JSON.stringify(g.scores)),{'1':[7,0],'2':[3,10],'3':[14,7],'4':[0,3]});
    assert.deepEqual([g.quarter,g.scoreboardSeconds,g.possession,g.fieldPos,g.down,g.distance,g.awayTimeouts,g.homeTimeouts],[3,402,1,89,4,6,1,2]);
    assert.equal(g.operatorPaused,true);assert.equal(h.q('[data-game="T0"] .edit-panel'),null);assert.ok(h.requests.filter(x=>x.action==='read').length>reads);assert.equal(h.value('version'),h.version);
  }finally{h.close()}
});

test('cancel restores authoritative checkpoint and resumes polling',async()=>{
  const h=await harness();try{
    const scores=JSON.stringify(h.games[0].scores);await h.w.cmd('T0','edit_begin');fill(h);h.advance(35);await h.w.cmd('T0','edit_cancel');
    assert.equal(JSON.stringify(h.games[0].scores),scores);assert.equal(h.games[0].glSeconds,35);assert.equal(h.q('[data-game="T0"] .edit-panel'),null);
    h.bump();await h.read();assert.equal(h.value('version'),h.version);
  }finally{h.close()}
});

test('focused prelaunch select survives a read already in flight; its version remains pinned',async()=>{
  const h=await harness();try{
    h.games[0].lifecycle='UNLAUNCHED';await h.read();const hold=h.hold(),reading=h.read();
    const select=h.q('[data-game="T0"] .controls select');select.focus();select.value='900';h.bump();hold.resolve();await reading;
    assert.equal(h.q('[data-game="T0"] .controls select'),select);assert.equal(select.value,'900');assert.equal(h.w.document.activeElement,select);assert.equal(h.value('version'),1);
    await h.w.cmd('T0','quarter_length',{seconds:900});assert.equal(h.games[0].quarterLengthSeconds,600);assert.match(h.q('#status').textContent,/CONFLICT/);
  }finally{h.close()}
});

test('read started before a command cannot overwrite its checkpoint or new edit form',async()=>{
  const h=await harness();try{
    const hold=h.hold(),reading=h.read();await h.w.cmd('T0','edit_begin');const el=h.input('T0','c');el.value='04:21';el.focus();hold.resolve();await reading;
    assert.equal(h.value('version'),h.version);assert.equal(h.input('T0','c'),el);assert.equal(el.value,'04:21');assert.equal(h.value('state[0].lifecycle'),'EDIT');
  }finally{h.close()}
});

test('two simultaneous edits: opening/saving the second preserves the first draft and focus',async()=>{
  const h=await harness();try{
    await h.w.cmd('T0','edit_begin');const vals=fill(h),el=h.input('T0','c');el.focus();
    await h.w.cmd('T1','edit_begin');sameDraft(h,'T0',vals);assert.equal(h.w.document.activeElement,el);
    await h.w.cmd('T1','edit_commit',{scores:{'1':[3,0]},clockSeconds:520,hold:true});sameDraft(h,'T0',vals);assert.equal(h.input('T0','c'),el);assert.equal(h.w.document.activeElement,el);
    h.w.saveEdit('T0',false);await new Promise(r=>setImmediate(r));assert.equal(h.games[0].scoreboardSeconds,402);assert.equal(h.q('.edit-panel'),null);
  }finally{h.close()}
});

test('external version conflict preserves draft, blocks retries, and requires explicit discard before rebase',async()=>{
  const h=await harness();try{
    await h.w.cmd('T0','edit_begin');const vals=fill(h),el=h.input('T0','c');el.focus();const pinned=h.value('version');h.bump();await h.read();assert.equal(h.value('version'),pinned);
    h.w.saveEdit('T0',false);await new Promise(r=>setImmediate(r));sameDraft(h,'T0',vals);assert.equal(h.input('T0','c'),el);assert.equal(h.games[0].scoreboardSeconds,600);assert.equal(h.value('version'),pinned);
    const count=h.requests.length;await h.w.cmd('T0','edit_commit',{});assert.equal(h.requests.length,count);
    h.w.confirm=()=>false;await h.w.refresh();sameDraft(h,'T0',vals);
    h.w.confirm=()=>true;await h.w.refresh();assert.equal(h.value('version'),h.version);assert.equal(h.input('T0','c').value,'10:00');assert.equal(h.value('writeConflict'),false);
  }finally{h.close()}
});

test('manual refresh and filter renders leave the active form attached',async()=>{
  const h=await harness();try{
    await h.w.cmd('T0','edit_begin');const vals=fill(h),el=h.input('T0','c');el.focus();await h.w.refresh();
    h.q('[data-f="FINAL"]').click();sameDraft(h,'T0',vals);assert.equal(h.input('T0','c'),el);assert.equal(h.w.document.activeElement,el);
  }finally{h.close()}
});

test('poll intervals remain 7s operator / 4s public; public EDIT games continue refreshing',async()=>{
  for(const publicView of [false,true]){const h=await harness({publicView});try{
    assert.deepEqual(h.timers.map(x=>x.ms),[1000,publicView?4000:7000]);
    if(publicView){h.games[0].lifecycle='EDIT';h.games[0].scores['1'][0]=21;h.bump();await h.read();assert.equal(h.value('version'),h.version);assert.equal(h.q('[data-game="T0"] .score').textContent,'21');assert.equal(h.q('.edit-panel'),null)}
  }finally{h.close()}}
});

test('failed write/read retain draft; successful retry closes it and resumes sync',async()=>{
  const h=await harness();try{
    await h.w.cmd('T0','edit_begin');const vals=fill(h);h.error(500);h.w.saveEdit('T0',false);await new Promise(r=>setImmediate(r));sameDraft(h,'T0',vals);assert.match(h.q('#status').textContent,/WRITE ERROR/);
    h.error(503);await h.read();sameDraft(h,'T0',vals);assert.match(h.q('#status').textContent,/ERROR/);
    h.w.saveEdit('T0',false);await new Promise(r=>setImmediate(r));assert.equal(h.q('.edit-panel'),null);assert.equal(h.value('version'),h.version);
  }finally{h.close()}
});
