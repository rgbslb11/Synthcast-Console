import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {WEEK5 as oldWeek} from '../supabase/functions/gamecast-week5-v4-3-2/week5.ts';
import {WEEK5} from '../supabase/functions/gamecast-week5-v4-3-2-1/week5.ts';
import {TEAM_POWER as oldPower} from '../supabase/functions/gamecast-week5-v4-3-2/power.ts';
import {TEAM_POWER,POWER_SOURCE_VERSION} from '../supabase/functions/gamecast-week5-v4-3-2-1/power.ts';
const dir='v4321-evidence',fn='supabase/functions/gamecast-week5-v4-3-2-1',oldFn='supabase/functions/gamecast-week5-v4-3-2';
const engine='GC-W5-V4.3.2.1-RC1',data='W5-58+TV_CARRIAGE_4321_CHAIRMAN_PATCH+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V4321_UI_RESET';
const source='SYNTHCAST-v4.3.2-W5-POST-W4-2026-09-20-GAMECAST-TEAM-OFF-DEF-v1.2-121+FCS_60';
const read=p=>fs.readFileSync(p,'utf8'),save=(n,x)=>fs.writeFileSync(`${dir}/${n}.json`,JSON.stringify(x,null,2)+'\n');
fs.mkdirSync(dir,{recursive:true});
const board=read('release-assets/gamecast-v4.3.2.1/chairman-board.txt');
assert.equal(createHash('sha256').update(board).digest('hex'),'db217c7ff86d41fc3706aef50ee4a22df8013926e71e3b7a8ec28b44bcd7de50');
const aliases={'Louisiana Monroe':'Louisiana-Monroe',FIU:'Florida International'};
const expected=board.trim().split('\n').map(l=>l.split('|'));
assert.equal(expected.length,58);assert.equal(WEEK5.length,58);assert.equal(new Set(WEEK5.map(g=>g.id)).size,58);
assert.equal(new Set(WEEK5.flatMap(g=>[g.away,g.home])).size,116);
const changed=[];let timeChanges=0,networkChanges=0;
for(let i=0;i<58;i++){
  const g=WEEK5[i],p=oldWeek.find(x=>x.id===g.id),[date,kickoff,network,matchup]=expected[i];assert.ok(p,g.id);
  assert.equal(g.dateLabel,date);assert.equal(g.kickoff,kickoff);assert.equal(g.network,network);assert.equal(g.kickoffOrder,i+1);
  assert.deepEqual([g.away,g.home],matchup.split(' at ').map(n=>aliases[n]??n));
  for(const k of ['id','date','dateLabel','away','home','matchup','neutral','flexTime'])assert.deepEqual(g[k],p[k],`${g.id} ${k}`);
  if(g.kickoff!==p.kickoff)timeChanges++;if(g.network!==p.network)networkChanges++;
  if(g.kickoff!==p.kickoff||g.network!==p.network)changed.push(g.id);
}
assert.equal(changed.length,12);assert.equal(timeChanges,9);assert.equal(networkChanges,7);
assert.deepEqual(TEAM_POWER,oldPower);assert.equal(POWER_SOURCE_VERSION,source);assert.equal(Object.keys(TEAM_POWER).length,125);
assert.deepEqual(fs.readFileSync(`${fn}/power.ts`),fs.readFileSync(`${oldFn}/power.ts`));
for(const n of ['Arkansas State','Louisiana-Monroe','Toledo','Western Michigan'])assert.deepEqual(['overall','offense','defense'].map(k=>TEAM_POWER[n][k]),[60,60,60]);
// Inverse the explicitly allowed identity substitutions and require byte-identical football/API logic.
let restored=read(`${fn}/index.ts`);
for(const [a,b] of [[data,'W5-58+TV_CARRIAGE_V4_LOCKED+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V432_UI_RESET'],[engine,'GC-W5-V4.3.2-RC1'],['/v4.3.2.1/','/v4.3.2/'],['w5v4321-','w5v432-'],['V4321_','V432_'],['gamecast-week5-v4-3-2-1','gamecast-week5-v4-3-2'],['4.3.2.1 operating','4.3.2 operating'],['GameCast 4.3.2.1 Week','GameCast 4.3.2 Week']])restored=restored.replaceAll(a,b);
assert.equal(restored,read(`${oldFn}/index.ts`));
let oldApp=read('public/v4.3.2.1/app.js').replaceAll('gamecast-week5-v4-3-2-1','gamecast-week5-v4-3-2').replaceAll('synthcastGameCast4321Operator','synthcastGameCast432Operator').replaceAll(engine,'GC-W5-V4.3.2-RC1');
assert.equal(oldApp,read('public/v4.3.2/app.js'));
const report={status:'PASS',commit:process.env.GITHUB_SHA??null,engine,dataVersion:data,sourceVersion:source,games:58,participants:116,carriageChanges:12,kickoffChanges:9,networkChanges:7,unchangedCarriageGames:46,canonicalRatingsPreserved:363,allRuntimeRatingsPreserved:375,scheduledRatingsPreserved:348,footballLogicByteIdenticalAfterIdentityNormalization:true,uiLogicByteIdenticalAfterBindingNormalization:true};
save('source-verification',report);console.log(JSON.stringify(report));
if(process.argv.includes('--source-only'))process.exit(0);
const base='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week5-v4-3-2-1';
async function call(api,slug='',token='',body){
  const r=await fetch(`${base}?api=${api}${slug?'&session='+encodeURIComponent(slug):''}`,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{'x-operator-token':token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  assert.equal(r.status,api==='create'?201:200,`${api} HTTP status`);return r.json();
}
const c=await call('create','','',{});assert.match(c.public_slug,/^w5v4321-[0-9a-f]{16}$/);
const x=await call('read',c.public_slug,c.operator_token),pub=await call('read',c.public_slug);
assert.equal(x.operator,true);assert.equal(pub.operator,false);assert.equal(x.engine_version,engine);assert.equal(x.data_version,data);assert.equal(x.week_key,'2026-W05');
assert.equal(x.state.length,58);assert.equal(pub.state.length,58);assert.equal(x.governance.power_ready,58);assert.equal(x.governance.power_pending,0);
for(let i=0;i<58;i++){
  const s=WEEK5[i],g=x.state[i];for(const k of Object.keys(s)){
    if(k==='away'||k==='home')assert.equal(g[k].name,s[k]);else assert.deepEqual(g[k],s[k],`${s.id} ${k}`);
  }
  assert.equal(g.lifecycle,'UNLAUNCHED');assert.equal(g.canonicalWeek,'W5');assert.equal(g.carryover,false);assert.equal(g.auto,false);assert.equal(g.onAir,false);assert.equal(g.glSeconds,0);assert.equal(g.scoreboardSeconds,600);assert.equal(g.activePeriod,'1');
  assert.deepEqual(g.scores,{'1':[0,0],'2':[0,0],'3':[0,0],'4':[0,0]});
  assert.deepEqual(g.awayPower,TEAM_POWER[s.away]);assert.deepEqual(g.homePower,TEAM_POWER[s.home]);
  const sanitized=structuredClone(g);for(const k of ['seedHex','rngState','runHistory','history','awayPower','homePower','editSnapshot','editResume','pendingPlay'])delete sanitized[k];sanitized.displayStatus='1st \u00b7 10:00';assert.deepEqual(pub.state[i],sanitized);
}
const repeat=await call('read',c.public_slug,c.operator_token);assert.deepEqual(repeat.state,x.state);assert.equal(repeat.state_version,x.state_version);
// Exercise the actual new UI against the verified live API snapshots without issuing game commands.
const require=createRequire(process.env.GAMECAST_QA_MODULES+'/package.json');const {JSDOM}=require('jsdom');
const rendered=[];
for(const isPublic of [false,true]){
  const snapshot=isPublic?pub:x;
  const url='https://rgbslb11.github.io/Synthcast-Console/v4.3.2.1/?session='+c.public_slug+(isPublic?'&view=public':'#operator=qa-dom-token');
  const dom=new JSDOM(read('public/v4.3.2.1/index.html'),{url,runScripts:'outside-only'}),w=dom.window;
  w.setInterval=()=>0;w.fetch=async u=>{assert.ok(String(u).startsWith(base+'?api=read'));return {ok:true,status:200,json:async()=>structuredClone(snapshot)};};
  w.eval(read('public/v4.3.2.1/app.js'));await new Promise(r=>setTimeout(r,20));
  const cards=[...w.document.querySelectorAll('#grid [data-game]')];assert.equal(cards.length,58);
  for(let i=0;i<58;i++){
    const g=WEEK5[i],card=cards[i];assert.equal(card.dataset.game,g.id);
    assert.equal(card.querySelector('.head span').textContent,`${g.id} \u00b7 ${g.dateLabel} \u00b7 ${g.kickoff}`);
    assert.equal(card.querySelector('.head b').textContent,`${g.network} \u00b7 UPCOMING`);
  }
  assert.equal(w.document.querySelectorAll('#grid .controls').length,isPublic?0:58);
  rendered.push({view:isPublic?'public':'chairman',cards:58,status:'PASS'});w.close();
}
const cloud={...report,testedAt:new Date().toISOString(),qaSession:c.public_slug,qaOnly:true,scheduleMatches:58,cloudRatingFieldsMatched:348,powerReady:58,powerPending:0,publicSnapshotsMatched:58,repeatReadUnchanged:true,domRendering:rendered,gameCommandsIssued:0,existingSessionsModified:false};
save('cloud-verification',cloud);
save('cloud-board',x.state.map(g=>({id:g.id,date:g.date,dateLabel:g.dateLabel,kickoff:g.kickoff,network:g.network,away:g.away.name,home:g.home.name,kickoffOrder:g.kickoffOrder,awayPower:g.awayPower,homePower:g.homePower,powerReady:g.powerReady,lifecycle:g.lifecycle})));
console.log(JSON.stringify(cloud));
