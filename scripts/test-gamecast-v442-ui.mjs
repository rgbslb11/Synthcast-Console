import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {runtime} from './lib/gamecast-v442-harness.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week7-v4-4-2/week7.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week7-v4-4-2/power.ts';
const require=createRequire((process.env.GAMECAST_QA_MODULES||process.cwd())+'/package.json'),{JSDOM}=require('jsdom');
let filters=fs.readFileSync('public/v4.4.2/list-filters.js','utf8');
const mutation=process.argv.find(x=>x.startsWith('--mutation='))?.split('=')[1];
if(mutation==='locked-hidden')filters=filters.replace("||game.lifecycle==='LOCKED'",'');
if(mutation==='exact-search')filters=filters.replace('.includes(q)','===q');
const context={};vm.createContext(context);vm.runInContext(filters+'\nglobalThis.match=gc442TeamMatches;globalThis.needs=gc442NeedsAction;',context);
const cases=[];function check(surface,name,fn){fn();cases.push({surface,name,status:'PASS'});}
for(const lifecycle of ['FINAL_PENDING','LOCKED','READY','FINAL','SEUD PUBLISHED','ACTIVE','DELAY','DELAYED','UNLAUNCHED','EDIT'])check('filters',lifecycle,()=>assert.equal(context.needs({lifecycle}),['FINAL_PENDING','LOCKED'].includes(lifecycle)));
for(const side of ['away','home'])for(const query of ['Tex','tex','TEX',' tex '])check('search',side+' '+query,()=>assert.equal(context.match({[side]:{name:'North Texas'}},query),true));
check('search','approved abbreviation',()=>assert.equal(context.match({away:{name:'Example'},homeCode:'TEX'},'tex'),true));
const gc=runtime(fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8'),'',{TEAM_POWER});
const identity=JSON.parse(fs.readFileSync('outputs/v442/identity.json','utf8'));
check('routes','exactly three named surfaces',()=>{assert.equal(identity.uiSurfaceCount,3);assert.equal(identity.surfaces.length,3);assert.equal(new Set(identity.surfaces.map(x=>x.name)).size,3);});
const root=path.resolve('public/v4.4.2');
for(const surface of ['Chairman UI','Public UI','Condensed UI (UI 1.3)']){
 const condensed=surface.startsWith('Condensed'),pub=surface==='Public UI',file=path.join(root,condensed?'ui1.3/index.html':'index.html');
 const html=fs.readFileSync(file,'utf8'),slug='w7v442-fixture',url='https://fixture.invalid/v4.4.2/'+(condensed?'ui1.3/':'')+'?session='+slug+(pub?'&view=public':'');
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const state=OPERATING_SLATE.map(x=>gc.initialGame(x));for(const [id,lifecycle] of [['G0315','LOCKED'],['G0299','FINAL_PENDING'],['G0301','READY']])state.find(g=>g.id===id).lifecycle=lifecycle;
 const calls=[];w.structuredClone=structuredClone;w.CSS={escape:s=>{assert.match(s,/^G\d{4}$/);return s;}};w.confirm=()=>false;
 w.fetch=async(address,options={})=>{calls.push({address,method:options.method||'GET',operatorHeader:!!options.headers?.['x-operator-token']});assert.equal(new URL(address).pathname,'/functions/v1/gamecast-week7-v4-4-2');return{ok:true,status:200,json:async()=>({public_slug:slug,engine_version:'GC-W7-V4.4.2-RC1',week_key:'2026-W07',state:structuredClone(state),state_version:1,master_zulu:'2026-10-06T22:00:00Z',governance:{games:54,power_ready:54}})};};
 try{
  for(const el of d.querySelectorAll('link[rel="stylesheet"],script[src]')){
   const source=el.getAttribute('href')||el.getAttribute('src'),resolved=path.resolve(path.dirname(file),source);assert.ok(resolved.startsWith(root+'/'));assert.ok(fs.existsSync(resolved));
   if(el.tagName==='SCRIPT'){
    if(source.includes('release-config'))w.GAMECAST_V442_API='https://fixture.invalid/functions/v1/gamecast-week7-v4-4-2';
    else vm.runInContext(source.includes('list-filters')?filters:fs.readFileSync(resolved,'utf8'),dom.getInternalVMContext());
   }
  }
  await new Promise(r=>setTimeout(r,30));
  const ids=()=>[...d.querySelectorAll(condensed?'.game-card':'article.card')].map(x=>x.dataset.game);
  const search=q=>{d.getElementById('teamSearch').value=q;d.getElementById('teamSearch').dispatchEvent(new w.Event('input',{bubbles:true}));};
  check(surface,'loads full 54-game board and linked assets',()=>assert.equal(ids().length,54));
  if(!condensed)check(surface,'unlaunched game does not assign a receiver',()=>assert.ok(d.querySelector('article.card .field').textContent.includes('Kickoff pending')));
  const expected=ids().filter(id=>['G0315','G0299','G0301'].includes(id));
  for(const q of ['Tex','tex','TEX',' tex '])check(surface,'substring search '+q,()=>{search(q);assert.deepEqual(ids(),expected);});
  check(surface,'clearing search restores order',()=>{search('');assert.equal(ids().length,54);});
  check(surface,'empty result and safe text',()=>{search('<img src=x onerror="window.injected=1">');assert.equal(ids().length,0);assert.ok(d.querySelector('.empty,.empty-state'));assert.equal(w.injected,undefined);assert.equal(d.querySelectorAll('img').length,0);search('');});
  if(!condensed&&!pub){
   d.querySelector('[data-f="NEEDS_ACTION"]').click();
   check(surface,'pending and locked included; accepted excluded',()=>assert.deepEqual(new Set(ids()),new Set(['G0315','G0299'])));
   check(surface,'final filter AND team search',()=>{search('North Tex');assert.deepEqual(ids(),['G0299']);});
   d.getElementById('teamSearch').focus();state.find(g=>g.id==='G0299').lifecycle='READY';await w.load({background:true});
   check(surface,'lifecycle updates while search focused without reload',()=>assert.equal(ids().length,0));
   d.querySelector('[data-f="ALL"]').click();search('');check(surface,'clear filter restores normal board',()=>assert.equal(ids().length,54));
  }else check(surface,'no Chairman controls or token',()=>{assert.equal(d.querySelectorAll('.controls,.edit-panel,[data-f="NEEDS_ACTION"],#copyOperator').length,0);assert.ok(calls.every(c=>!c.operatorHeader));});
  check(surface,'filter/search never writes',()=>assert.ok(calls.every(c=>c.method==='GET')));
 }finally{w.close();}
}
const report={classification:'TEST RESULT',scope:'DOM integration with actual generated scripts and a read-only fixture API; not deployed browser or Safari proof',executed:cases.length,passed:cases.length,failed:0,skipped:0,uiSurfaceCount:3,cases};
fs.writeFileSync('outputs/v442/ui-local.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,cases:undefined},null,2));
