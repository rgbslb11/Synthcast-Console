import assert from 'node:assert/strict';
import {freshDeadman,armDeadman,disarmDeadman,tickDeadman,noteOperatorCommand,calculateDeadmanDue,resetDeadman,DEADMAN_STATUS} from './controller.mjs';

const base=()=>({
  id:'GTEST', lifecycle:'UNLAUNCHED', activity:'UPCOMING', auto:false,onAir:false,operatorPaused:false,editing:false,delayed:false,
  powerReady:true,glSeconds:0,seedLocked:false,launchedAt:null,runId:'GTEST-R01',lastPlay:'Ready',controlOrigin:null,
  kickoffZulu:'2026-10-03T20:00:00.000Z',tvStartZulu:'2026-10-03T19:55:00.000Z',deadman:freshDeadman()
});
const T='2026-10-03T19:00:00.000Z';
let count=0;const ok=(name,fn)=>{fn();count++;console.log('PASS',name)};

ok('A01 before due remains unlaunched',()=>{const g=base();armDeadman(g,{basis:'KICKOFF_PLUS',offsetMinutes:15},T);const r=tickDeadman(g,'2026-10-03T20:14:59.000Z');assert.equal(r.action,'WAIT');assert.equal(g.lifecycle,'UNLAUNCHED')});
ok('A02 due game autonomous launches once',()=>{const g=base();armDeadman(g,{basis:'KICKOFF_PLUS',offsetMinutes:15},T);let r=tickDeadman(g,'2026-10-03T20:15:00.000Z');assert.equal(r.action,'AUTONOMOUS_LAUNCH');assert.equal(g.auto,true);assert.equal(g.deadman.status,'AUTONOMOUS');r=tickDeadman(g,'2026-10-03T20:16:00.000Z');assert.equal(r.changed,false)});
ok('A03 manual AUTO satisfies',()=>{const g=base();armDeadman(g,{basis:'KICKOFF_PLUS',offsetMinutes:15},T);g.lifecycle='ACTIVE';g.auto=true;noteOperatorCommand(g,'auto','2026-10-03T20:05:00Z');assert.equal(g.deadman.status,'SATISFIED')});
ok('A04 manual ON AIR satisfies',()=>{const g=base();armDeadman(g,{basis:'KICKOFF_PLUS',offsetMinutes:15},T);g.lifecycle='ACTIVE';g.onAir=true;noteOperatorCommand(g,'on_air','2026-10-03T20:05:00Z');assert.equal(g.deadman.status,'SATISFIED')});
ok('A05 disarm prevents fallback',()=>{const g=base();armDeadman(g,{basis:'KICKOFF',offsetMinutes:0},T);disarmDeadman(g,'2026-10-03T19:30:00Z');tickDeadman(g,'2026-10-03T20:05:00Z');assert.equal(g.lifecycle,'UNLAUNCHED');assert.equal(g.deadman.status,'DISARMED')});
ok('A06 schedule change recalculates due',()=>{const g=base();armDeadman(g,{basis:'KICKOFF_PLUS',offsetMinutes:15},T);g.kickoffZulu='2026-10-03T20:30:00Z';tickDeadman(g,'2026-10-03T20:20:00Z');assert.equal(g.deadman.dueZulu,'2026-10-03T20:45:00.000Z');assert.equal(g.lifecycle,'UNLAUNCHED')});
ok('A07 missing kickoff blocks arm',()=>{const g=base();g.kickoffZulu=null;const r=armDeadman(g,{basis:'KICKOFF_PLUS',offsetMinutes:15},T);assert.equal(r.ok,false);assert.equal(g.deadman.status,'BLOCKED')});
ok('A08 missing power blocks at trigger',()=>{const g=base();g.powerReady=false;armDeadman(g,{basis:'KICKOFF',offsetMinutes:0},T);const r=tickDeadman(g,'2026-10-03T20:00:00Z');assert.equal(r.action,'BLOCKED');assert.equal(g.lifecycle,'UNLAUNCHED')});
ok('A09 launch alone does not satisfy; dead-man starts AUTO',()=>{const g=base();armDeadman(g,{basis:'KICKOFF_PLUS',offsetMinutes:15},T);g.lifecycle='ACTIVE';g.activity='LIVE';g.launchedAt='2026-10-03T20:05:00Z';const r=tickDeadman(g,'2026-10-03T20:15:01Z');assert.equal(r.action,'AUTONOMOUS_AUTO');assert.equal(g.auto,true)});
ok('A10 TV start basis',()=>{const g=base();const r=armDeadman(g,{basis:'TV_START'},T);assert.equal(r.dueZulu,'2026-10-03T19:55:00.000Z')});
ok('A11 repeated tick idempotent after autonomous',()=>{const g=base();armDeadman(g,{basis:'KICKOFF'},T);tickDeadman(g,'2026-10-03T20:00:00Z');const snap=JSON.stringify(g);tickDeadman(g,'2026-10-03T20:00:10Z');assert.equal(JSON.stringify(g),snap)});
ok('A12 dead-man does not touch RNG state',()=>{const g=base();g.rngState=[1,2,3,4];armDeadman(g,{basis:'KICKOFF'},T);tickDeadman(g,'2026-10-03T20:00:00Z');assert.deepEqual(g.rngState,[1,2,3,4])});
ok('A13 quarter length survives autonomous start',()=>{const g=base();g.quarterLengthSeconds=900;g.scoreboardSeconds=900;armDeadman(g,{basis:'KICKOFF'},T);tickDeadman(g,'2026-10-03T20:00:00Z');assert.equal(g.quarterLengthSeconds,900);assert.equal(g.scoreboardSeconds,900)});
ok('A14 deliberate pause satisfies instead of takeover',()=>{const g=base();armDeadman(g,{basis:'KICKOFF'},T);g.lifecycle='ACTIVE';g.operatorPaused=true;const r=tickDeadman(g,'2026-10-03T20:00:00Z');assert.equal(r.action,'SATISFIED');assert.equal(g.auto,false)});
ok('A15 final state never restarts',()=>{const g=base();armDeadman(g,{basis:'KICKOFF'},T);g.lifecycle='FINAL_PENDING';const r=tickDeadman(g,'2026-10-03T20:00:00Z');assert.equal(r.action,'SATISFIED');assert.equal(g.lifecycle,'FINAL_PENDING')});
ok('A16 reset returns to unarmed',()=>{const g=base();armDeadman(g,{basis:'KICKOFF'},T);resetDeadman(g);assert.equal(g.deadman.status,DEADMAN_STATUS.UNARMED);assert.equal(g.controlOrigin,null)});

ok('basis offset validation',()=>{const g=base();assert.equal(calculateDeadmanDue(g,'KICKOFF_PLUS',181).ok,false)});
console.log(JSON.stringify({passed:count}));
