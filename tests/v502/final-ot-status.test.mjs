import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('public/v5.0.2/w8/app.js','utf8');
const condensed=fs.readFileSync('public/v5.0.2/w8/ui1.3/scoreboard.js','utf8');
const block=(src,start,end)=>{const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return src.slice(a,b);};
const appFunctions=Function(block(app,'function otSequenceNumber(period)','function editScoreInput(')+block(app,'function finalOtStatus(g)','function line(g)')+';return {ds,finalOtStatus};')();
const compactFunctions=Function("const FINALISH=new Set(['LOCKED','READY','FINAL']);const LIVEISH=new Set(['ACTIVE','DELAY','EDIT']);const isFinal=g=>FINALISH.has(g.lifecycle);const isLive=g=>LIVEISH.has(g.lifecycle);const isDelay=g=>g.lifecycle==='DELAY'||g.delayed===true;const clock=s=>'00:00';"+block(condensed,'  const otFinalLabel=g=>','  const stateClass=')+';return {scoreState,otFinalLabel};')();
for(const [name,label] of [['Chairman and public',appFunctions.ds],['Condensed',compactFunctions.scoreState]]){
 test(name+' displays correct OT count after lock, without changing other lifecycle labels',()=>{
 const scores=[{}, {OT:[0,7]}, {OT:[0,7],'2OT':[3,6]}, {OT:[0,7],'2OT':[3,6],'3OT':[0,2],'4OT':[8,6]}, {OT:[0,7],'10OT':[3,6]}];
 const expected=['FINAL','FINAL/1OT','FINAL/2OT','FINAL/4OT','FINAL/10OT'];
 for(const lifecycle of ['LOCKED','READY','FINAL'])for(let i=0;i<scores.length;i++)assert.equal(label({lifecycle,scores:scores[i],displayStatus:'FINAL'}),expected[i]);
 if(name==='Condensed')assert.equal(label({lifecycle:'FINAL_PENDING',scores:scores[1]}),'FINAL PENDING');
 else assert.equal(label({lifecycle:'FINAL_PENDING',scores:scores[1],displayStatus:'FINAL'}),'FINAL');
 });
}
test('source scripts parse and use only recorded scores',()=>{
 assert.doesNotThrow(()=>new Function(app));
 assert.doesNotThrow(()=>new Function(condensed));
 assert.match(app,/return n\?'FINAL\/'\+n\+'OT':'FINAL'/);
 assert.match(condensed,/isFinal\(g\)\?otFinalLabel\(g\)/);
});
