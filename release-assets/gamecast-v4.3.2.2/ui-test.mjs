import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {harness} from './test.mjs';
const require=createRequire((process.env.GAMECAST_QA_MODULES||process.cwd())+'/package.json');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('public/v4.3.2.2/index.html','utf8');
const app=fs.readFileSync('public/v4.3.2.2/app.js','utf8');
const results=[];
for(const mode of ['chairman','public']){
  const h=harness(),created=await h.request('create',{}),slug=created.body.public_slug,token=created.body.operator_token;
  const dom=new JSDOM(html,{url:'https://rgbslb11.github.io/Synthcast-Console/v4.3.2.2/?session='+slug+(mode==='public'?'&view=public':'#operator='+token),runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;let confirmations=[];
  w.structuredClone=structuredClone;w.confirm=s=>{confirmations.push(s);return true;};
  w.fetch=async(url,opts={})=>{
    const parsed=new URL(url),body=opts.body?JSON.parse(opts.body):null;
    const r=await h.request(parsed.searchParams.get('api'),body,parsed.searchParams.get('session')||'',opts.headers?.['x-operator-token']||'');
    return {ok:r.status<300,status:r.status,json:async()=>r.body};
  };
  w.eval(app);await new Promise(r=>setTimeout(r,100));
  assert.equal(w.document.querySelectorAll('article.card').length,49);
  assert.ok(w.document.querySelector('.brand').textContent.includes('4.3.2.2'));
  if(mode==='public'){
    assert.equal(w.document.querySelectorAll('.dm-box').length,0);
    assert.equal(w.document.querySelectorAll('.controls,.edit-panel').length,0);
  }else{
    assert.equal(w.document.querySelectorAll('article .dm-box').length,49);
    w.dmSelect('G0211',true);w.dmSelect('G0180',true);w.dmArmSelected();await new Promise(r=>setTimeout(r,100));
    assert.ok(confirmations[0].startsWith('ARM 2 SELECTED GAMES?'));
    assert.equal(h.db.sessions.get(slug).state.filter(g=>g.deadman.status==='ARMED').length,2);
    const el=w.document.getElementById('dm-G0207-offset');el.focus();el.value='22';w.render();assert.equal(w.document.activeElement,el);assert.equal(el.value,'22');el.blur();
    const drawer=w.document.querySelector('article[data-game="G0207"] .dm-box details');drawer.open=true;const drawerNode=drawer;
    await w.load({background:true});assert.equal(drawerNode.isConnected,true);assert.equal(drawerNode.open,true);assert.equal(w.document.querySelector('article[data-game="G0207"] .dm-box details'),drawerNode);
    w.dmDisarm(['G0211','G0180']);await new Promise(r=>setTimeout(r,100));
    assert.equal(h.db.sessions.get(slug).state.filter(g=>g.deadman.status==='DISARMED').length,2);
  }
  results.push({mode,status:'PASS',cards:49});dom.window.close();
}
fs.writeFileSync('v4322-evidence/ui-tests.json',JSON.stringify(results,null,2));console.log('PASS Chairman and public DOM integration; 49 cards each; bulk arm/disarm; focus preserved.');
