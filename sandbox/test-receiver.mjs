import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRuntime} from './runtime.mjs';
import {receivingChoice} from './receiver.mjs';
import {OPERATING_SLATE} from '../supabase/functions/gamecast-week4-v4-3-1/week4.ts';
let time=Date.parse('2026-09-18T12:00:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'receiver-qa-')),file=pathToFileURL(path.join(dir,'state.json'));
const runtime=createRuntime({receiver:true,clock:Clock,file}),e=runtime.inspect;
const old=createRuntime({clock:Clock}).inspect;
const clone=x=>JSON.parse(JSON.stringify(x));
const checks=[];function pass(name){checks.push({name,status:'PASS'});console.log('PASS '+name);}
function fixture(index,seed,engine=e){const g=engine.initialGame(OPERATING_SLATE[index]);g.seedHex=seed;g.rngState=engine.seedWords(seed,g.id);if(engine===e){g.receiptSeed=seed;g.openingReceiver=receivingChoice(seed,g.id);g.secondHalfReceiver=1-g.openingReceiver;g.possession=g.openingReceiver;}g.lifecycle='ACTIVE';g.auto=true;g.seedLocked=true;return g;}
function finish(g,chunk=13){let n=0;while(g.lifecycle!=='FINAL_PENDING'&&n++<20000)e.advanceGame(g,chunk);assert.equal(g.lifecycle,'FINAL_PENDING');return g;}
const football=g=>{const x=clone(g);for(const k of ['runId','runNumber','runHistory','lastPlay','createdRunAt','openingReceiver','secondHalfReceiver','receiptSeed','receiptVersion'])delete x[k];return x;};
let counts=[0,0];for(let i=0;i<10000;i++){const side=receivingChoice('seed-'+i,'G0120');counts[side]++;assert.equal(side,receivingChoice('seed-'+i,'G0120'));}assert.ok(counts.every(n=>n>=4800&&n<=5200));pass('10,000-seed deterministic receipt balance within 48–52%');
let openingSides=new Set();
for(let i=0;i<55;i++){
 const g=fixture(i,'receiver-board-'+i);openingSides.add(g.openingReceiver);
 const rng=clone(g.rngState);receivingChoice(g.seedHex,g.id);assert.deepEqual(clone(g.rngState),rng);
 for(const endingPossession of [0,1]){const half=clone(g);half.possession=endingPossession;half.pendingPeriod=3;e.advancePeriod(half);assert.equal(half.possession,1-g.openingReceiver);assert.equal(half.fieldPos,25);assert.equal(half.down,1);assert.deepEqual(half.rngState,rng);}
 const final=finish(clone(g)),chunk=finish(clone(g),1);assert.deepEqual(football(final),football(chunk));
 let one=clone(g),fifty=clone(g);fifty.speed=50;
 for(let n=0;one.lifecycle!=='FINAL_PENDING'&&n<300;n++){one=e.project([one],50)[0];fifty=e.project([fifty],1)[0];const fast=clone(fifty);fast.speed=1;assert.deepEqual(football(one),football(fast));}
 assert.equal(one.lifecycle,'FINAL_PENDING');
 const restarted=clone(final);e.reset(restarted,false);assert.equal(restarted.possession,g.openingReceiver);restarted.auto=true;restarted.lifecycle='ACTIVE';restarted.seedLocked=true;finish(restarted);assert.deepEqual(football(restarted),football(final));
 for(const k of Object.keys(final.scores))assert.ok(e.validScorePeriod(k));
 if(g.openingReceiver===0){const unchanged=fixture(i,'receiver-board-'+i,old);let n=0;while(unchanged.lifecycle!=='FINAL_PENDING'&&n++<20000)old.advanceGame(unchanged,13);assert.deepEqual(football(unchanged),football(final));}
}
assert.equal(openingSides.size,2);pass('55 games: both receivers, halftime reciprocity, 1s/13s chunk and full-game 1x/50x invariance, same-seed replay');
pass('Away-opening candidates reproduce baseline football history; receiver selection leaves play RNG untouched');
const g=fixture(0,'continuation-test'),receipt=[g.receiptSeed,g.openingReceiver,g.secondHalfReceiver];
const seed=g.seedHex;e.continuation(g);assert.notEqual(g.seedHex,seed);assert.deepEqual([g.receiptSeed,g.openingReceiver,g.secondHalfReceiver],receipt);
e.reset(g,false);assert.deepEqual([g.receiptSeed,g.openingReceiver,g.secondHalfReceiver],receipt);assert.equal(g.possession,g.openingReceiver);
assert.deepEqual([g.runHistory.at(-1).receiptSeed,g.runHistory.at(-1).openingReceiver,g.runHistory.at(-1).secondHalfReceiver],receipt);
const previous=g.seedHex;e.reset(g,true);assert.notEqual(g.seedHex,previous);assert.equal(g.receiptSeed,g.seedHex);assert.equal(g.openingReceiver,receivingChoice(g.seedHex,g.id));assert.equal(g.secondHalfReceiver,1-g.openingReceiver);pass('Continuation and same-seed reset retain receipts; new-seed reset recomputes');
async function api(action,{slug='',token='',body,status=200}={}){const r=await runtime.handle(new Request('http://localhost/sandbox/api?api='+action+'&session='+slug,{method:body?'POST':'GET',headers:{'x-operator-token':token},...(body?{body:JSON.stringify(body)}:{})}));assert.equal(r.status,status,await r.clone().text());return r.json();}
const c=await api('create',{body:{},status:201});assert.match(c.public_slug,/^qa-receiver1-/);assert.match(c.engine_version,/-RECEIVER1$/);
const auth={slug:c.public_slug,token:c.operator_token};let state=await api('read',auth);const id=state.state[0].id;
for(const game of state.state){assert.equal(game.possession,receivingChoice(game.seedHex,game.id));assert.equal(game.secondHalfReceiver,1-game.openingReceiver);assert.equal(game.receiptVersion,'RECEIVER1');}
async function cmd(command,payload={}){state=await api('command',{...auth,body:{command,id,payload,expected_version:state.state_version}});return state.state[0];}
await cmd('launch');await cmd('auto');await cmd('speed',{speed:50});
for(const [start,end] of [['pause','pause'],['delay','resume_delay'],['edit_begin','edit_cancel']]){const a=await cmd(start);time+=11000;const b=(await api('read',auth)).state[0];assert.equal(b.glSeconds,a.glSeconds+11);assert.equal(b.scoreboardSeconds,a.scoreboardSeconds);assert.deepEqual(b.rngState,a.rngState);assert.equal(b.openingReceiver,a.openingReceiver);await cmd(end);}
const beforeEdit=state.state[0];await cmd('edit_begin');const edited=await cmd('edit_commit',{possession:1-beforeEdit.possession,resumeAuto:true});assert.notEqual(edited.seedHex,beforeEdit.seedHex);assert.equal(edited.receiptSeed,beforeEdit.receiptSeed);assert.equal(edited.secondHalfReceiver,beforeEdit.secondHalfReceiver);
const publicState=await api('read',{slug:c.public_slug});assert.ok(publicState.state.every(g=>!('receiptSeed' in g)&&g.qaOnly));
const snapshot=JSON.stringify(runtime.snapshot());await api('command',{...auth,body:{command:'accept',id,expected_version:state.state_version},status:403});await api('read',{slug:'qa-w4v431-0000000000000000',status:403});await api('read',{slug:'w4v431-0000000000000000',status:403});assert.equal(JSON.stringify(runtime.snapshot()),snapshot);
assert.deepEqual(createRuntime({receiver:true,file,clock:Clock}).snapshot(),runtime.snapshot());assert.throws(()=>createRuntime({file}),/Foreign session/);
pass('Candidate API initialization, clocks, Chairman continuation, public redaction, reload and old/live session rejection');
fs.writeFileSync(new URL('./evidence/receiver-results.json',import.meta.url),JSON.stringify({qaOnly:true,candidate:'RECEIVER1',testedAt:new Date().toISOString(),seedBalance:{samples:10000,away:counts[0],home:counts[1]},games:55,checks},null,2)+'\n');fs.rmSync(dir,{recursive:true});
