// Fresh QA_ONLY session. Never read, migrate or write an existing operator session.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {OPERATING_SLATE} from '../../supabase/functions/gamecast-week6-v4-5-1-test/week6.ts';
import {TEAM_POWER} from '../../supabase/functions/gamecast-week6-v4-5-1-test/power.ts';
const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week6-v4-5-1-test';
let slug='',token='',version=0;
async function request(action,body,publicView=false){
  const r=await fetch(API+'?api='+action+(slug?'&session='+slug:''),{method:body?'POST':'GET',headers:{'content-type':'application/json',...(!publicView&&token?{'x-operator-token':token}:{})},body:body?JSON.stringify(body):undefined});
  const b=await r.json();if(!r.ok)throw Error('API '+r.status+': '+b.error);if(b.state_version)version=b.state_version;return b;
}
const health=await request('health');assert.equal(health.engine_version,'GC-W6-V4.5.1-TEST1');assert.equal(health.games,56);
const created=await request('create',{});slug=created.public_slug;token=created.operator_token;
let read=await request('read');assert.equal(read.state.length,56);assert.ok(read.state.every(g=>g.qaOnly&&g.deadman.status==='UNARMED'&&g.lifecycle==='UNLAUNCHED'));
for(const g of read.state){const expected=OPERATING_SLATE.find(x=>x.id===g.id);assert.ok(expected);for(const k of ['date','dateLabel','kickoff','network','neutral','kickoffOrder','kickoffZulu'])assert.deepEqual(g[k],expected[k]);assert.deepEqual(g.awayPower,TEAM_POWER[g.away.name]);assert.deepEqual(g.homePower,TEAM_POWER[g.home.name]);}
fs.writeFileSync('v451-test-evidence/cloud-board.json',JSON.stringify(read.state.map(g=>({id:g.id,date:g.date,kickoff:g.kickoff,network:g.network,neutral:g.neutral,kickoffOrder:g.kickoffOrder,kickoffZulu:g.kickoffZulu,away:g.away.name,home:g.home.name,awayPower:g.awayPower,homePower:g.homePower,powerReady:g.powerReady,deadman:g.deadman,qaOnly:g.qaOnly})),null,2));
let pub=await request('read',null,true);assert.ok(pub.state.every(g=>!('deadman'in g)&&!('seedHex'in g)&&!('rngState'in g)&&!('awayPower'in g)));
const rejected=await fetch(API+'?api=deadman_tick',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(rejected.status,403);
if(process.argv.includes('--read-only')){fs.writeFileSync('v451-test-evidence/cloud-readback.json',JSON.stringify({status:'PASS',games:56,scheduledRatingFields:336,qaOnly:true,publicSlug:slug,engine:health.engine_version,publicRedaction:true},null,2));console.log('PASS cloud 56 games / 336 ratings / public sanitization');process.exit(0);}
const ids=read.state.slice(0,2).map(g=>g.id),due=new Date(Date.parse(read.master_zulu)+30000).toISOString();
try {
  await request('deadman_batch',{ids,operation:'arm',config:{basis:'TV_START',tvStartZulu:due,offsetMinutes:0},expected_version:version});
  console.log('QA armed: waiting 55 seconds with no browser/API reads for the isolated scheduler to fire.');
  // No Chairman/public calls while waiting. Only the backend scheduler can start them.
  await new Promise(r=>setTimeout(r,55000));
  read=await request('read');
  for(const id of ids){const g=read.state.find(g=>g.id===id);assert.equal(g.deadman.status,'AUTONOMOUS');assert.equal(g.auto,true);assert.ok(Date.parse(g.launchedAt)>=Date.parse(due));assert.equal(g.speed,1);}
  assert.equal(read.state.filter(g=>g.lifecycle==='UNLAUNCHED').length,54);
  pub=await request('read',null,true);assert.equal(pub.state.filter(g=>g.lifecycle==='ACTIVE').length,2);
  const starts=read.state.filter(g=>ids.includes(g.id)).map(g=>({id:g.id,dueZulu:due,triggeredAtZulu:g.deadman.triggeredAtZulu,glSeconds:g.glSeconds}));
  for(const id of ids)await request('command',{id,command:'end',payload:{confirmed:true},expected_version:version});
  read=await request('read');assert.ok(read.state.filter(g=>ids.includes(g.id)).every(g=>g.lifecycle==='FINAL_PENDING'));
  const blocked=await fetch(API+'?api=command&session='+slug,{method:'POST',headers:{'content-type':'application/json','x-operator-token':token},body:JSON.stringify({id:ids[0],command:'accept',payload:{confirmed:true},expected_version:version})});assert.equal(blocked.status,403);
  fs.writeFileSync('v451-test-evidence/cloud.json',JSON.stringify({status:'PASS',qaOnly:true,publicSlug:slug,engine:health.engine_version,games:56,participants:112,starts,publicRedaction:'PASS',qaAcceptanceDenied:'PASS'},null,2));
  console.log('PASS cloud: 56 exact Week 6 games; 112 exact rating records; 2 backend-only starts; 54 untouched; public redaction and QA acceptance denial.');
} finally {
  const latest=await request('read');
  for(const g of latest.state.filter(g=>ids.includes(g.id))){
    await request('read');
    if(['ARMED','BLOCKED'].includes(g.deadman?.status))await request('deadman_batch',{ids:[g.id],operation:'disarm',expected_version:version});
    if(['ACTIVE','DELAY'].includes(g.lifecycle))await request('command',{id:g.id,command:'end',payload:{confirmed:true},expected_version:version});
  }
}
