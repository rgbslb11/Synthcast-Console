import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const modules=process.env.GAMECAST_QA_MODULES;
if(!modules)throw Error('Set GAMECAST_QA_MODULES to a directory containing node_modules/jsdom');
const require=createRequire(`${modules}/package.json`);
const {JSDOM}=require('jsdom');
const root='public/scoreboard/v1.2/';
const html=fs.readFileSync(root+'index.html','utf8');
const script=fs.readFileSync(root+'scoreboard.js','utf8');
const dom=new JSDOM(html,{url:'https://rgbslb11.github.io/Synthcast-Console/scoreboard/v1.2/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.CSS={escape:s=>s};

const game=(id,date,score,lifecycle='UNLAUNCHED')=>({
  id,date,dateLabel:date==='2026-09-24'?'Thu 9/24':date==='2026-09-25'?'Fri 9/25':'Sat 9/26',
  kickoff:'12:00 PM',kickoffOrder:Number(id.slice(1)),network:'ABC',
  away:{name:`Away ${id}`},home:{name:`Home ${id}`},
  lifecycle,activity:lifecycle==='ACTIVE'?'LIVE':'UPCOMING',period:'1st',scoreboardSeconds:499,
  scores:{1:[score,0],2:[0,0],3:[0,0],4:[0,0]},
  awayTimeouts:3,homeTimeouts:3,fieldPos:25,possession:0,down:1,distance:10,
  completedAt:lifecycle==='READY'?'2026-09-26T01:00:00Z':null,
});
const saturday=Array.from({length:49},(_,i)=>game(`G${String(i+1).padStart(4,'0')}`,'2026-09-26',i===0?10:0,i===0?'ACTIVE':'UNLAUNCHED'));
const fullSaturday=saturday.map((g,i)=>({...g,scores:i===0?{...g.scores,1:[20,0]}:g.scores}));
const thursday=Array.from({length:4},(_,i)=>game(`T${String(i+1).padStart(4,'0')}`,'2026-09-24',i===0?17:7,i===0?'FINAL_PENDING':'READY'));
const friday=Array.from({length:5},(_,i)=>game(`F${String(i+1).padStart(4,'0')}`,'2026-09-25',14,'READY'));
const sessions={
  'w5satv4322-88b8fcb4c5153ff9':{public_slug:'w5satv4322-88b8fcb4c5153ff9',week_key:'2026-W05',engine_version:'GC-W5-SAT-V4.3.2.2-RC1',state_version:15,state:saturday},
  'w5v4321-bf9789d3689b5c77':{public_slug:'w5v4321-bf9789d3689b5c77',week_key:'2026-W05',engine_version:'GC-W5-V4.3.2.1-RC1',state_version:64,state:[...thursday,...friday,...fullSaturday]},
};
const requests=[];
window.fetch=async (url,options={})=>{
  requests.push({url,options});
  const slug=new URL(url).searchParams.get('session');
  assert.ok(sessions[slug],'Unexpected public session');
  return {ok:true,json:async()=>structuredClone(sessions[slug])};
};
const cards=id=>[...window.document.querySelectorAll(`#${id} .game-card`)];
const waitFor=async fn=>{
  for(let i=0;i<40;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,10));}
  throw Error('Timed out waiting for scoreboard rendering');
};

try{
  window.eval(script);
  await waitFor(()=>cards('scoreboard').length===49&&cards('earlierBoard').length===9);
  assert.match(cards('scoreboard')[0].textContent,/10/,'Saturday tab must use 4.3.2.2');
  assert.match(cards('earlierBoard')[0].textContent,/FINAL PENDING/,'Do not present a pending Thursday result as final');
  assert.equal(window.document.getElementById('finalCount').textContent,'8');
  window.document.getElementById('weekEngineTab').click();
  assert.equal(cards('scoreboard').length,49);
  assert.equal(cards('earlierBoard').length,9);
  assert.match(cards('scoreboard')[0].textContent,/20/,'Full Week tab must use 4.3.2.1 Saturday score');
  assert.equal(window.document.getElementById('boardContent').getAttribute('aria-labelledby'),'weekEngineTab');
  window.document.querySelector('[data-filter="FINAL"]').click();
  assert.equal(cards('earlierBoard').length,8,'FINAL filter must exclude the pending Thursday game');
  assert.ok(requests.every(x=>x.options.cache==='no-store'&&!x.options.method&&!x.options.headers));
  assert.ok(requests.every(x=>!x.url.includes('operator=')));
  console.log('PASS: 49 Saturday games switch between engines; 9 weekday scores remain below; pending result and read-only requests are correct.');
}finally{window.close();}
