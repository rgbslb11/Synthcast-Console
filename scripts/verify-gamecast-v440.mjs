import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week6-v4-4-0/week6.ts';
import {TEAM_POWER,POWER_SOURCE_VERSION} from '../supabase/functions/gamecast-week6-v4-4-0/power.ts';
import {TEAM_POWER as OLD_POWER} from '../supabase/functions/gamecast-week5-v4-3-2-1/power.ts';
const read=p=>fs.readFileSync(p,'utf8'),A='release-assets/gamecast-v4.4.0',E='v440-evidence';
const expected=JSON.parse(read(`${A}/expected-board.json`)),ratings=JSON.parse(read(`${A}/approved-team-ratings.json`)),identity=JSON.parse(read(`${E}/identity.json`));
const metadataKeys=['matchupDisplay','awayDisplayName','homeDisplayName','awayRecord','homeRecord','awayRank','homeRank','weather','weatherAsOf','basis','distribution','hostTimezone'];
const save=(n,x)=>fs.writeFileSync(`${E}/${n}.json`,JSON.stringify(x,null,2)+'\n');
assert.equal(OPERATING_SLATE.length,56);assert.equal(new Set(OPERATING_SLATE.map(x=>x.id)).size,56);assert.equal(new Set(OPERATING_SLATE.flatMap(x=>[x.away,x.home])).size,112);assert.equal(Object.keys(TEAM_POWER).length,121);
for(const r of ratings){const p=TEAM_POWER[r.Team];assert.ok(p,r.Team);assert.deepEqual([p.overall,p.offense,p.defense],[r.TEAM,r.OFF,r.DEF]);for(const k of ['tempo','specialTeams','opponentBasis'])assert.equal(p[k],OLD_POWER[r.Team][k]);}
for(let i=0;i<56;i++){const g=OPERATING_SLATE[i],s=expected[i];for(const k of ['id','date','dateLabel','kickoff','network','away','home','neutral','kickoffOrder','flexTime','matchup',...metadataKeys])assert.deepEqual(g[k],s[k],`${g.id} ${k}`);assert.equal(g.canonicalWeek,'W6');assert.equal(g.carryover,false);}
// Verify the inverse list explicitly; do not normalize football/control tokens.
const pairs=[['GC-W6-V4.4.0-RC1','GC-W5-V4.3.2.1-RC1'],[identity.data,'W5-58+TV_CARRIAGE_4321_CHAIRMAN_PATCH+POWER_W5_POST_W4_121_60_99+GAMECAST_V1_2_FCS60+V4321_UI_RESET'],['2026-W06','2026-W05'],['/v4.4.0/','/v4.3.2.1/'],['w6v440-','w5v4321-'],['gamecast-week6-v4-4-0','gamecast-week5-v4-3-2-1'],['./week6.ts','./week5.ts'],['OPERATING_SLATE.length !== 56','OPERATING_SLATE.length !== 58'],['4.4.0 operating','4.3.2.1 operating'],['GameCast 4.4.0 Week 6','GameCast 4.3.2.1 Week 5'],['week6_games','week5_games'],['g.canonicalWeek === "W6"','g.canonicalWeek === "W5"'],['V440_','V4321_']];
let source=read('supabase/functions/gamecast-week6-v4-4-0/index.ts');for(const[a,b]of pairs)source=source.replaceAll(a,b);assert.equal(source,read('supabase/functions/gamecast-week5-v4-3-2-1/index.ts'));
let app=read('public/v4.4.0/app.js');for(const[a,b]of [['gamecast-week6-v4-4-0','gamecast-week5-v4-3-2-1'],['synthcastGameCast440Operator','synthcastGameCast4321Operator'],['GC-W6-V4.4.0-RC1','GC-W5-V4.3.2.1-RC1'],['brand-new Week 6 session','brand-new Week 5 session']])app=app.replaceAll(a,b);assert.equal(app,read('public/v4.3.2.1/app.js'));
const sourceReport={status:'PASS',games:56,canonicalTeams:121,canonicalFields:363,appearances:112,scheduledFields:336,engineLogicEquality:true,frontendLogicEquality:true,nonRequestedPowerInputsUnchanged:true};save('source-verification',sourceReport);
if(process.argv.includes('--source-only')){console.log(JSON.stringify(sourceReport));process.exit(0);}
const base='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/'+identity.function;
async function call(api,slug='',token='',body,expectedStatus=body===undefined?200:api==='create'?201:200){const res=await fetch(base+'?api='+api+(slug?'&session='+encodeURIComponent(slug):''),{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{'x-operator-token':token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const x=await res.json();assert.equal(res.status,expectedStatus,api+' '+JSON.stringify(x.error??''));return x;}
// Fresh unlaunched QA slate; token is in memory only and never printed or saved.
const c=await call('create','','',{});assert.match(c.public_slug,/^w6v440-[0-9a-f]{16}$/);
const x=await call('read',c.public_slug,c.operator_token),pub=await call('read',c.public_slug);
assert.equal(x.operator,true);assert.equal(pub.operator,false);assert.equal(x.engine_version,identity.engine);assert.equal(x.data_version,identity.data);assert.equal(x.week_key,identity.week);assert.equal(x.state.length,56);assert.equal(pub.state.length,56);assert.equal(x.governance.power_ready,56);assert.equal(x.governance.power_pending,0);
const comparison=[];
for(let i=0;i<56;i++){
 const s=expected[i],g=x.state[i];for(const k of ['id','date','dateLabel','kickoff','network','neutral','kickoffOrder',...metadataKeys])assert.deepEqual(g[k],s[k],`${s.id} ${k}`);
 for(const side of ['away','home']){assert.equal(g[side].name,s[side]);for(const k of ['overall','offense','defense']){assert.equal(g[side+'Power'][k],s[side+'Power'][k]);comparison.push({id:g.id,team:s[side],side,field:k,expected:s[side+'Power'][k],actual:g[side+'Power'][k],status:'PASS'});}assert.equal(g[side+'Power'].sourceVersion,POWER_SOURCE_VERSION);assert.equal(g[side+'Power'].tempo,1);assert.equal(g[side+'Power'].specialTeams,null);}
 assert.equal(g.powerReady,true);assert.equal(g.lifecycle,'UNLAUNCHED');assert.equal(g.canonicalWeek,'W6');assert.equal(g.carryover,false);assert.equal(g.auto,false);assert.equal(g.onAir,false);assert.equal(g.glSeconds,0);assert.equal(g.scoreboardSeconds,600);assert.deepEqual(g.scores,{'1':[0,0],'2':[0,0],'3':[0,0],'4':[0,0]});
 const sanitized=structuredClone(g);for(const k of ['seedHex','rngState','runHistory','history','awayPower','homePower','editSnapshot','editResume','pendingPlay'])delete sanitized[k];sanitized.displayStatus='1st · 10:00';assert.deepEqual(pub.state[i],sanitized);
}
await call('command',c.public_slug,'',{id:expected[0].id,command:'launch',expected_version:x.state_version,payload:{}},403);
await call('command',c.public_slug,c.operator_token,{id:expected[0].id,command:'launch',expected_version:-1,payload:{}},409);
await call('read','w5v4321-bf9789d3689b5c77','',undefined,404);
const repeat=await call('read',c.public_slug,c.operator_token);assert.deepEqual(repeat.state,x.state);assert.equal(repeat.state_version,x.state_version);
const require=createRequire(path.resolve(process.env.GAMECAST_QA_MODULES||'.','package.json'));const{JSDOM}=require('jsdom');const rendered=[];
for(const isPublic of [false,true]){const snapshot=isPublic?pub:x;const dom=new JSDOM(read('public/v4.4.0/index.html'),{url:'https://rgbslb11.github.io/Synthcast-Console/v4.4.0/?session='+c.public_slug+(isPublic?'&view=public':'#operator=qa-placeholder'),runScripts:'outside-only'}),w=dom.window;w.setInterval=()=>0;w.fetch=async u=>{assert.ok(String(u).startsWith(base+'?api=read'));return{ok:true,status:200,json:async()=>structuredClone(snapshot)};};w.eval(['public/v4.4.0/app.js','public/v4.2/patch-rc2.js','public/v4.2.2/patch-422.js','public/v4.4.0/patch-440.js'].map(read).join('\n')+'\nwindow.__qaRead=readPromise;');await w.__qaRead;const cards=[...w.document.querySelectorAll('#grid [data-game]')];assert.equal(cards.length,56);for(let i=0;i<56;i++){const g=expected[i],card=cards[i];assert.equal(card.dataset.game,g.id);assert.equal(card.querySelector('.head span').textContent,`${g.id} · ${g.dateLabel} · ${g.kickoff}`);assert.equal(card.querySelector('.head b').textContent,`${g.network} · UPCOMING`);assert.ok(card.textContent.includes(g.away));assert.ok(card.textContent.includes(g.home));}assert.equal(w.document.querySelectorAll('#grid .controls').length,isPublic?0:56);rendered.push({view:isPublic?'public':'chairman',cards:56,status:'PASS'});w.close();}
save('cloud-board',x.state.map(g=>({...Object.fromEntries(metadataKeys.map(k=>[k,g[k]])),id:g.id,date:g.date,dateLabel:g.dateLabel,kickoff:g.kickoff,network:g.network,away:g.away.name,home:g.home.name,neutral:g.neutral,kickoffOrder:g.kickoffOrder,awayPower:g.awayPower,homePower:g.homePower,powerReady:g.powerReady,lifecycle:g.lifecycle})));
save('rating-comparisons-336',comparison);
save('public-snapshot',pub);
const report={...sourceReport,qaSession:c.public_slug,qaOnly:true,testedAt:new Date().toISOString(),rowMatches:56,fieldMatches:336,powerReady:56,publicSanitization:true,publicWriteRejected:true,staleVersionRejected:true,oldNamespaceRejected:true,unlaunchedRepeatReadStable:true,gameCommandsAccepted:0,domRendering:rendered};save('cloud-verification',report);console.log(JSON.stringify(report));
