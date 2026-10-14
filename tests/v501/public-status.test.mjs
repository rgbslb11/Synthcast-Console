import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped polling function with a controlled network/DOM boundary.
const app=fs.readFileSync('public/v5.0.1/app.js','utf8');
const loadSource=app.slice(app.indexOf('async function load('),app.indexOf('async function refresh('));
function fixture(publicView){
 const c={slug:'qa-session',publicView,writing:false,readPromise:null,readEpoch:0,loading:false,version:190,state:[],writeConflict:false,
  api:async()=>({state_version:536,state:[],governance:{power_ready:41,active_games:41}}),updateReadClocks(){},editDraftLocked:()=>false,gamecastPendingRequest:()=>false,
  render(){c.renderedVersion=c.version;},adopt(b){c.version=b.state_version;c.state=b.state;},se:()=>({classList:{contains:()=>false}}),status(s){c.visibleStatus=s;},visibleStatus:'CHECKPOINTED V190'};
 vm.createContext(c);vm.runInContext(loadSource+';globalThis.runLoad=load;',c);return c;
}
test('Public background read advances the visible CLOUD version with the rendered board',async()=>{
 const c=fixture(true);await c.runLoad({background:true});assert.equal(c.renderedVersion,536);assert.equal(c.visibleStatus,'CLOUD V536 · POWER 41/41');
});
test('Chairman background read preserves the last control acknowledgement',async()=>{
 const c=fixture(false);await c.runLoad({background:true});assert.equal(c.renderedVersion,536);assert.equal(c.visibleStatus,'CHECKPOINTED V190');
});
