import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../../release-assets/v5.0.2-week8/backend/runtime/engine.mjs';
import {OPERATING_SLATE as slate} from '../../release-assets/v5.0.2-week8/backend/runtime/week8.mjs';
import {createEngineOperations} from '../../release-assets/v5.0.2-week8/backend/src/engine-operations.mjs';

const app=fs.readFileSync('public/v5.0.2/w8/app.js','utf8');
const css=fs.readFileSync('public/v5.0.2/w8/legacy/app.css','utf8');
const first=app.indexOf('const FINISHED_OT_EDIT_ORIGINS=');
const after=app.indexOf('function periods(g)',first);
const saveStart=app.indexOf('function saveEdit(id,resumeAuto){');
const saveEnd=app.indexOf('function openGame(id){',saveStart);
assert.ok(first>=0&&after>first&&saveStart>after&&saveEnd>saveStart,'OT editor sources available');
const code=app.slice(first,after)+'\n'+app.slice(saveStart,saveEnd)+'\nthis.otTest={isFinishedOtEdit,otSequenceNumber,otSequenceKey,otDisplayLabel,finishedEditPeriods,editScoreGrid,addFinishedOvertime,undoFinishedOvertime,refreshOvertimeEditTotals,saveEdit};';
const baseGame=()=>({id:'GTEST',lifecycle:'EDIT',editResume:{lifecycle:'FINAL_PENDING'},immutableFinal:false,quarter:4,activePeriod:'2OT',
  scores:{'1':[7,7],'2':[10,10],'3':[3,3],'4':[7,7],OT:[7,7],'2OT':[8,6]},
  away:{name:'Visitor'},home:{name:'Host'}});
const fields=game=>{
  const values=new Map();
  for(const [p,s] of Object.entries(game.scores))for(const [side,i] of [['a',0],['h',1]])values.set('e-'+game.id+'-'+side+p,{value:String(s[i])});
  for(const [key,value] of Object.entries({q:'4',c:'00:00',p:'0',s:'OWN',y:'25',d:'1',x:'10',at:'3',ht:'3'}))values.set('e-'+game.id+'-'+key,{value});
  return values;
};
function fixture(game=baseGame(),publicView=false){
  const values=fields(game),alerts=[],calls=[];
  const box={querySelectorAll:()=>Object.keys(game.scores).map(period=>({dataset:{scorePeriod:period}}))};
  values.set('e-'+game.id+'-box',box);
  const context={publicView,state:[game],document:{getElementById:id=>values.get(id)??null},
    esc:s=>String(s),total:(g,t)=>Object.entries(g.scores).filter(([p])=>['1','2','3','4','OT'].includes(p)||/^(?:[2-9]|[1-9][0-9]+)OT$/.test(p)).reduce((sum,[,q])=>sum+Number(q[t]||0),0),
    parseClock:s=>s==='00:00'?0:NaN,alert:msg=>alerts.push(msg),cmd:(...args)=>{calls.push(args);return 'submitted';}};
  vm.createContext(context);vm.runInContext(code,context);
  return {functions:context.otTest,values,alerts,calls,game,context,box};
}

test('5.0.2 standalone Chairman app remains JavaScript syntax-valid',()=>{
  assert.doesNotThrow(()=>new Function(app));
});
test('OT numbering maps UI OT1 to backend OT, and allows 10OT and beyond',()=>{
  const {functions:f}=fixture();
  for(const [period,n] of [['OT',1],['2OT',2],['3OT',3],['4OT',4],['10OT',10],['100OT',100],['0',0],['1OT',0]])
    assert.equal(f.otSequenceNumber(period),n,period);
  assert.equal(f.otSequenceKey(1),'OT');assert.equal(f.otSequenceKey(4),'4OT');
  assert.equal(f.otDisplayLabel('OT'),'OT1');assert.equal(f.otDisplayLabel('4OT'),'OT4');
});
test('finished-only permission checks every final lifecycle; live/Delay/public blocked',()=>{
  const g=baseGame(),ui=fixture(g);
  for(const lifecycle of ['FINAL_PENDING','LOCKED','READY','FINAL']){
    g.editResume.lifecycle=lifecycle;assert.equal(ui.functions.isFinishedOtEdit(g),true,lifecycle);
  }
  for(const lifecycle of ['ACTIVE','DELAY','UNLAUNCHED']){
    g.editResume.lifecycle=lifecycle;assert.equal(ui.functions.isFinishedOtEdit(g),false,lifecycle);
  }
  g.editResume.lifecycle='FINAL_PENDING';g.lifecycle='ACTIVE';
  assert.equal(ui.functions.isFinishedOtEdit(g),false);
  assert.equal(fixture(baseGame(),true).functions.isFinishedOtEdit(baseGame()),false);
});
test('finished editor displays historic OT scores, controls and recalculated total preview',()=>{
  const g=baseGame(),ui=fixture(g),html=ui.functions.editScoreGrid(g);
  assert.deepEqual(Array.from(ui.functions.finishedEditPeriods(g)),['1','2','3','4','OT','2OT']);
  assert.match(html,/OT1/);assert.match(html,/OT2/);
  assert.match(html,/ADD OVERTIME/);assert.match(html,/UNDO ADDED OT/);
  assert.match(html,/e-GTEST-aOT/);assert.match(html,/e-GTEST-h2OT/);
  assert.match(html,/e-GTEST-atotal">42/);assert.match(html,/e-GTEST-htotal">40/);
  assert.match(css,/finished-ot-scroll/);assert.match(css,/--score-periods/);
});
test('live Chairman Edit remains four-quarter editor without overtime controls',()=>{
  const g=baseGame();g.editResume.lifecycle='ACTIVE';
  const html=fixture(g).functions.editScoreGrid(g);
  assert.doesNotMatch(html,/ADD OVERTIME|UNDO ADDED OT|finished-ot-grid/);
  assert.doesNotMatch(html,/e-GTEST-aOT/);
  assert.match(html,/e-GTEST-a4/);
});
test('finished save sends Q1-Q4 plus all OT periods and preserves overtime activePeriod',()=>{
  const ui=fixture(),f=ui.functions;
  assert.equal(f.saveEdit('GTEST',false),'submitted');
  const [id,command,payload]=ui.calls[0];
  assert.equal(id,'GTEST');assert.equal(command,'edit_commit');
  assert.deepEqual(Object.keys(payload.scores),['1','2','3','4','OT','2OT']);
  assert.equal(payload.quarter,undefined,'unchanged quarter must not overwrite 2OT activePeriod');
  assert.equal(payload.clockSeconds,0);assert.equal(payload.resumeAuto,false);assert.equal(payload.hold,true);
});
test('regulation completed save retains quarter field and does not claim to set OT state',()=>{
  const g=baseGame();g.activePeriod='4';g.scores={'1':[7,7],'2':[10,10],'3':[3,3],'4':[7,7]};
  const ui=fixture(g);ui.functions.saveEdit('GTEST',false);
  assert.equal(ui.calls[0][2].quarter,4);
  assert.deepEqual(Object.keys(ui.calls[0][2].scores),['1','2','3','4']);
});
test('invalid overtime score cannot submit a correction',()=>{
  const ui=fixture();ui.values.get('e-GTEST-a2OT').value='7.5';
  ui.functions.saveEdit('GTEST',false);assert.equal(ui.calls.length,0);
  assert.match(ui.alerts[0],/whole number/);
  ui.values.get('e-GTEST-a2OT').value='100';ui.functions.saveEdit('GTEST',false);
  assert.equal(ui.calls.length,0);
});
test('live save retains old four-quarter payload and does not validate unrelated values',()=>{
  const g=baseGame();g.editResume.lifecycle='ACTIVE';
  const ui=fixture(g);ui.functions.saveEdit('GTEST',true);
  assert.deepEqual(Object.keys(ui.calls[0][2].scores),['1','2','3','4']);
  assert.equal(ui.calls[0][2].quarter,4);
  assert.equal(ui.calls[0][2].resumeAuto,true);
});
test('actual 5.0.2 backend can commit finished-result overtime scores without a new API',async()=>{
  const g=engine.initialGame(slate[0]);
  Object.assign(g,{lifecycle:'FINAL_PENDING',quarter:4,period:'2OT',activePeriod:'2OT',scores:{'1':[7,7],'2':[10,10],'3':[3,3],'4':[7,7],OT:[7,7],'2OT':[6,6]},auto:false,onAir:false});
  const id=g.id,run=g.runId;
  engine.beginEdit(g,{});
  const ops=createEngineOperations({engine,clock:()=> '2026-10-15T20:00:00.000Z'});
  const result=await ops.executeCommand({state:[g]},{id,command:'edit_commit',payload:{scores:{OT:[7,7],'2OT':[8,6]},resumeAuto:false,hold:true}});
  assert.equal(g.activePeriod,'2OT');assert.equal(g.period,'2OT');
  assert.equal(g.lifecycle,'FINAL_PENDING');assert.equal(g.auto,false);assert.equal(g.runId,run);
  assert.deepEqual(g.scores.OT,[7,7]);assert.deepEqual(g.scores['2OT'],[8,6]);
  assert.equal(engine.total(g,0),42);assert.equal(engine.total(g,1),40);
  assert.equal(result.events[0].type,'V502_EDIT_COMMIT');
  assert.equal(g.editResume,null);
});
test('lock/accepted correction still returns to FINAL_PENDING and never automatically accepts',async()=>{
  const g=engine.initialGame(slate[0]);g.lifecycle='READY';g.scores['4']=[7,7];
  const ops=createEngineOperations({engine,clock:()=> '2026-10-15T20:00:00.000Z'});
  await ops.executeCommand({state:[g]},{id:g.id,command:'edit_begin',payload:{confirmed:true}});
  assert.equal(g.lifecycle,'EDIT');
  await ops.executeCommand({state:[g]},{id:g.id,command:'edit_commit',payload:{scores:{OT:[6,8]},resumeAuto:false}});
  assert.equal(g.lifecycle,'FINAL_PENDING');assert.equal(g.locked,false);
  assert.equal(engine.total(g,0),13);assert.equal(engine.total(g,1),15);
});
