import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRuntime,ENGINE,PREFIX,sourceHash} from './runtime.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
import {TEAM_POWER} from '../supabase/functions/gamecast-week4-v4-3-1/power.ts';
let instant=Date.parse('2026-09-18T00:00:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gamecast-qa-'));
const file=pathToFileURL(path.join(dir,'sessions.json'));
const rt=createRuntime({file,clock:Clock});
const checks=[];const passed=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name);};
async function call(action,{slug='',token='',body,status=200}={}){
 const r=await rt.handle(new Request('http://127.0.0.1/sandbox/api?api='+action+'&session='+slug,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-operator-token':token},...(body===undefined?{}:{body:JSON.stringify(body)})}));
 assert.equal(r.status,status,await r.clone().text());return r.json();
}
const created=await call('create',{body:{},status:201}),slug=created.public_slug,token=created.operator_token;
assert.ok(slug.startsWith(PREFIX));assert.equal(created.engine_version,ENGINE);
let read=await call('read',{slug,token});assert.equal(read.state.length,55);assert.equal(new Set(read.state.map(g=>g.id)).size,55);
assert.equal(new Set(read.state.flatMap(g=>[g.away.name,g.home.name])).size,110);
assert.equal(Object.keys(TEAM_POWER).length,125);
for(const g of read.state){assert.deepEqual(g.awayPower,TEAM_POWER[g.away.name]);assert.deepEqual(g.homePower,TEAM_POWER[g.home.name]);assert.equal(g.qaOnly,true);assert.equal(g.official,false);assert.match(g.runId,/^QA-/);}
passed('55-game slate, 110 participants, all 330 scheduled rating fields and QA identities');
const publicRead=await call('read',{slug});assert.equal(publicRead.operator,false);
for(const g of publicRead.state)for(const key of ['seedHex','rngState','history','awayPower','homePower','editSnapshot'])assert.equal(key in g,false);
assert.equal('operator_token_hash' in publicRead,false);passed('Public API redaction and QA-only envelope');
const before=JSON.stringify(rt.snapshot());
for(const action of ['accept','publish','seud','standings','ratings','power'])await call(action,{slug,token,body:{},status:403});
for(const command of ['accept','publish','seud','power'])await call('command',{slug,token,body:{command,id:read.state[0].id,expected_version:1,payload:{confirmed:true}},status:403});
await call('command',{slug:'w4v431-0000000000000000',token,body:{command:'launch',expected_version:1},status:403});
await call('command',{slug,token:'foreign-operator-token',body:{command:'launch',expected_version:1},status:403});
assert.equal(JSON.stringify(rt.snapshot()),before);assert.deepEqual(Array.from(rt.networkCapabilities),['undefined','undefined','undefined','undefined']);
passed('Promotion/feed/power/foreign-session/foreign-token rejection; no persistence change; no engine network APIs');
const id=read.state[0].id;
async function command(command,payload={}){const result=await call('command',{slug,token,body:{command,id,payload,expected_version:read.state_version}});read=result;return result.state[0];}
await command('launch');await command('auto');await command('speed',{speed:50});
await call('command',{slug,token,body:{command:'pause',id,expected_version:1},status:409});passed('Optimistic state-version conflict rejected');
for(const [enter,leave] of [['pause','pause'],['delay','resume_delay'],['edit_begin','edit_cancel']]){
 const frozen=await command(enter);instant+=11000;
 const b=await call('read',{slug,token}),g=b.state[0];
 assert.equal(g.glSeconds,frozen.glSeconds+11);assert.equal(g.scoreboardSeconds,frozen.scoreboardSeconds);assert.deepEqual(g.rngState,frozen.rngState);
 assert.equal(b.master_zulu,new Clock().toISOString());assert.equal(Date.parse(b.master_zulu)-Date.parse(read.master_zulu),11000);
 read=b;await command(leave);
}
passed('Pause, Delay and Edit: GL and Master Zulu advance; scoreboard and RNG freeze even at 50x');
const restored=createRuntime({file,clock:Clock});assert.deepEqual(restored.snapshot(),rt.snapshot());passed('Local persistence reload with QA tags and event history');
const baseline=createRuntime({clock:Clock,baseline:true}).inspect,sandbox=rt.inspect;
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(engine,index,seed){const g=engine.initialGame(OPERATING_SLATE[index]);g.seedHex=seed;g.rngState=engine.seedWords(seed,g.id);g.lifecycle='ACTIVE';g.auto=true;g.seedLocked=true;return g;}
function normalized(g){const x=copy(g);delete x.runId;delete x.createdRunAt;return x;}
function finish(engine,g,chunk){let n=0;while(g.lifecycle!=='FINAL_PENDING'&&n++<20000)engine.advanceGame(g,chunk);assert.equal(g.lifecycle,'FINAL_PENDING');return g;}
const samples=[];
for(let i=0;i<5;i++){
 const seed='QA_ONLY-baseline-'+i,a=fixture(baseline,i,seed),b=fixture(sandbox,i,seed);
 finish(baseline,a,13);finish(sandbox,b,13);assert.deepEqual(normalized(b),normalized(a));
 const chunked=fixture(sandbox,i,seed);finish(sandbox,chunked,1);assert.deepEqual(normalized(chunked),normalized(b));
 const slow=fixture(sandbox,i,seed),fast=copy(slow);fast.speed=50;
 // Compare equal synthetic elapsed using integer wall intervals (150 vs 3 seconds).
 const a150=sandbox.project([slow],150)[0],b150=sandbox.project([fast],3)[0];b150.speed=1;assert.deepEqual(normalized(a150),normalized(b150));
 samples.push({game:b.id,seed,qaOnly:true,gl:b.glSeconds,plays:b.teamPlayCount,score:[sandbox.total(b,0),sandbox.total(b,1)]});
}
passed('5 fixed-seed baseline-vs-sandbox full games; 1-second vs 13-second chunks; equal-time 1x vs 50x');
for(let i=0;i<55;i++){
 const g=finish(sandbox,fixture(sandbox,i,'QA_ONLY-board-'+i),50);
 assert.ok(g.quarter>=1&&g.quarter<=4);for(const k of Object.keys(g.scores))assert.ok(sandbox.validScorePeriod(k));
 assert.ok(!('0' in g.scores));assert.ok(g.glSeconds>0);assert.ok(g.teamPlayCount.reduce((a,b)=>a+b,0)>0);
}
passed('55/55 local QA full-game structural smoke checks (one seed per matchup; not distribution certification)');
const g=fixture(sandbox,0,'QA_ONLY-restart'),initial=copy(g);finish(sandbox,g,13);const final=normalized(g);
sandbox.reset(g,false);g.lifecycle='ACTIVE';g.auto=true;g.seedLocked=true;finish(sandbox,g,13);
for(const key of ['scores','rngState','teamPlayCount','teamTopSeconds','history','glSeconds'])assert.deepEqual(copy(g[key]),final[key]);
assert.equal(g.seedHex,initial.seedHex);passed('Same-seed restart football-history replay');
const report={qaOnly:true,official:false,baselineCommit:'8163e9d1a2b22789f0579a761d1e4ae926eaa430',engine:ENGINE,sourceHash,testedAt:new Date().toISOString(),checks,samples,limitations:['Local RPC mock; not cloud DDL or cloud persistence parity','Browser rendering and Mobile Safari not tested','No population-distribution calibration or candidate football change'],expectedCandidates:7};
fs.writeFileSync(new URL('./evidence/test-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
fs.rmSync(dir,{recursive:true});
