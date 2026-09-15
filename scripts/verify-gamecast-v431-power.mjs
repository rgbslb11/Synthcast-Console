import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {TEAM_POWER,POWER_SOURCE_VERSION,CANONICAL_TEAM_COUNT,SCHEDULE_FCS_TEAM_COUNT} from '../supabase/functions/gamecast-week4-v4-3-1/power.ts';
import {WEEK4} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';

const expectedSource='SYNTHCAST-v4.3.1-W4-POST-W3-2026-09-14-GAMECAST-TEAM-OFF-DEF-v1.1-121+FCS_60';
const expectedData='W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_POST_W3_121_60_99+GAMECAST_V1_1_FCS60+V431_UI_RESET';
const fcs=new Set(['Charlotte','Duquesne','Idaho','Western Kentucky']);
const fields=['overall','offense','defense'];
const canonical=Object.entries(TEAM_POWER).filter(([team])=>!fcs.has(team));
const hashBlob=p=>{const b=fs.readFileSync(p);return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');};
assert.equal(hashBlob('supabase/functions/gamecast-week4-v4-3-1/power.ts'),'6eb58cdc1bce4f5a63b8c62e23f72a397c2f8f55');
assert.equal(hashBlob('supabase/functions/gamecast-week4-v4-3-1/week4.ts'),'9a4095335fd1b440017641c9cc514b2a01510739');
assert.equal(CANONICAL_TEAM_COUNT,121);assert.equal(SCHEDULE_FCS_TEAM_COUNT,4);
assert.equal(canonical.length,121);assert.equal(Object.keys(TEAM_POWER).length,125);
assert.equal(POWER_SOURCE_VERSION,expectedSource);
for(const [name,p] of Object.entries(TEAM_POWER)){
  assert.ok(fields.every(k=>Number.isInteger(p[k])&&p[k]>=60&&p[k]<=99),name);
  assert.equal(p.overall,(p.offense+p.defense)/2,name);
  assert.equal(p.sourceVersion,expectedSource,name);
  assert.equal(p.specialTeams,null);assert.equal(p.tempo,1);assert.equal(p.opponentBasis,null);
  assert.equal(p.flag,fcs.has(name)?'CHAIRMAN FCS 60':'POST-W3 GAMECAST v1.1');
  if(fcs.has(name))assert.deepEqual(fields.map(k=>p[k]),[60,60,60],name);
}
assert.deepEqual([canonical.filter(([,p])=>p.offense>p.defense).length,canonical.filter(([,p])=>p.offense<p.defense).length,canonical.filter(([,p])=>p.offense===p.defense).length],[42,41,38]);
assert.equal(WEEK4.length,55);assert.equal(new Set(WEEK4.map(g=>g.id)).size,55);
const participants=new Set(WEEK4.flatMap(g=>[g.away,g.home]));assert.equal(participants.size,110);
for(const g of WEEK4){assert.ok(TEAM_POWER[g.away]&&TEAM_POWER[g.home],g.id);assert.equal(g.matchup,`${g.away} at ${g.home}`);}
assert.equal(WEEK4.filter(g=>g.neutral).length,2);
assert.equal(WEEK4.find(g=>g.id==='G0165').matchup,'NC State at Vanderbilt');
assert.deepEqual(['away','home','kickoff','network'].map(k=>WEEK4.find(g=>g.id==='G0142')[k]),['Colorado','Northwestern','TBD','TV TBD']);
const csv=s=>'"'+String(s).replaceAll('"','""')+'"';
fs.mkdirSync('v431-power-verification',{recursive:true});
fs.writeFileSync('v431-power-verification/all-125-team-ratings.csv','Team,TEAM,OFF,DEF,Population,Week4Participant,Source\n'+Object.entries(TEAM_POWER).map(([n,p])=>[n,p.overall,p.offense,p.defense,fcs.has(n)?'FCS':'CANONICAL',participants.has(n),p.sourceVersion].map(csv).join(',')).join('\n')+'\n');
console.log('PASS source: 121 canonical / 363 fields; 4 FCS / 12 fixed-60 fields; 125 total rows; 55 games / 110 participants / 330 scheduled fields.');
if(!process.argv.includes('--source-only')){
  const probe=process.argv.includes('--probe');
  async function run(){
    const base='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week4-v4-3-1';
    async function call(api,{slug='',token='',body}={}){
      const r=await fetch(`${base}?api=${api}${slug?'&session='+encodeURIComponent(slug):''}`,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{'x-operator-token':token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
      assert.equal(r.status,api==='create'?201:200,`${api} HTTP status`);return r.json();
    }
    const created=await call('create',{body:{}});
    assert.match(created.public_slug,/^w4v431-[0-9a-f]{16}$/);assert.equal(created.engine_version,'GC-W4-V4.3.1-RC1');
    assert.equal(created.governance.games,55);assert.equal(created.governance.power_ready,55);
    const auth={slug:created.public_slug,token:created.operator_token};
    const x=await call('read',auth);assert.equal(x.operator,true);assert.equal(x.engine_version,'GC-W4-V4.3.1-RC1');assert.equal(x.data_version,expectedData);assert.equal(x.week_key,'2026-W04');
    assert.equal(x.state.length,55);assert.equal(x.governance.power_ready,55);assert.equal(x.governance.power_pending,0);
    const rows=[];
    for(let i=0;i<WEEK4.length;i++){
      const s=WEEK4[i],g=x.state[i];
      for(const k of ['id','date','dateLabel','kickoff','network','matchup','neutral','flexTime','kickoffOrder'])assert.deepEqual(g[k],s[k],`${s.id} ${k}`);
      assert.equal(g.away.name,s.away);assert.equal(g.home.name,s.home);assert.equal(g.canonicalWeek,'W4');assert.equal(g.carryover,false);
      assert.equal(g.lifecycle,'UNLAUNCHED');assert.equal(g.powerReady,true);assert.equal(g.glSeconds,0);assert.equal(g.quarter,1);assert.equal(g.activePeriod,'1');assert.equal(g.scoreboardSeconds,600);assert.equal(g.auto,false);assert.equal(g.onAir,false);
      assert.deepEqual(g.scores,{'1':[0,0],'2':[0,0],'3':[0,0],'4':[0,0]});
      for(const side of ['away','home']){
        const name=s[side],expected=TEAM_POWER[name],observed=g[side+'Power'];
        assert.deepEqual(observed,expected,`${s.id} ${name}: full power snapshot`);
        rows.push([s.id,side,name,observed.overall,observed.offense,observed.defense,'PASS',observed.sourceVersion]);
      }
    }
    const repeated=await call('read',auth);assert.deepEqual(repeated.state,x.state);assert.equal(repeated.state_version,x.state_version);
    const pub=await call('read',{slug:created.public_slug});assert.equal(pub.operator,false);assert.equal(pub.state.length,55);
    const hidden=['seedHex','rngState','runHistory','history','awayPower','homePower','editSnapshot','editResume','pendingPlay'];
    for(let i=0;i<x.state.length;i++){
      const expected=structuredClone(x.state[i]);for(const k of hidden)delete expected[k];expected.displayStatus='1st · 10:00';assert.deepEqual(pub.state[i],expected,`public ${expected.id}`);
    }
    fs.writeFileSync('v431-power-verification/cloud-110-participants.csv','Game,Side,Team,TEAM,OFF,DEF,Status,Source\n'+rows.map(r=>r.map(csv).join(',')).join('\n')+'\n');
    const report={status:'PASS',testedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA??null,qaOnly:true,session:created.public_slug,engine:x.engine_version,dataVersion:x.data_version,sourceVersion:expectedSource,canonicalTeams:121,canonicalRatingFields:363,fcsTeams:4,fcsRatingFields:12,totalSourceRows:125,week4Games:55,participants:110,cloudRatingFieldsMatched:rows.length*3,powerReady:55,powerPending:0,scheduleMatches:55,publicSnapshotsMatched:55,repeatReadStateUnchanged:true,existingSessionsModified:false,officialResultsCreated:0};
    fs.writeFileSync('v431-power-verification/cloud-verification.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));return report;
  }
  try{await run();if(probe&&process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'already_deployed=true\n');}
  catch(e){if(!probe)throw e;console.log('Existing backend does not match the requested release; deployment is required:',e.message);if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'already_deployed=false\n');}
}
