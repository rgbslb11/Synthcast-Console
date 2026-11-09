import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as e from '../../release-assets/v5.0.7-week12/backend/runtime/engine.mjs';
import * as old from '../../release-assets/v5.0.6-week11/backend/runtime/engine.mjs';
import {OPERATING_SLATE} from '../../release-assets/v5.0.7-week12/backend/runtime/week12.mjs';
const clean=v=>JSON.parse(JSON.stringify(v,(k,x)=>['masterZulu','createdRunAt','launchedAt','completedAt','atZulu','timestamp','speed'].includes(k)?undefined:x));
export const fixture=(fieldPos=50,team=0,quarter=1)=>Object.assign(e.initialGame(OPERATING_SLATE[0]),{lifecycle:'ACTIVE',activity:'LIVE',qaOnly:true,auto:false,quarter,period:quarter+'th',activePeriod:String(quarter),possession:team,fieldPos,down:4,distance:10,scoreboardSeconds:300});
export const play=(team,yards,punt=false,desc)=>({team,strategy:'NORMAL',yards,points:0,turnover:false,punt,fg:false,first:false,inBounds:!punt,incomplete:false,desc:desc??(punt?`Punt · ${yards} net yards`:`Sack for ${-yards}-yard loss`),edgeAtSnap:0});
for(const [name,field,yards,spot] of [['G0541: SC 41, 41 yards',59,41,20],['G0555: UTSA 40, 45 yards',60,45,20],['midfield, 42 yards',50,42,8],['opponent 47, 40 yards',53,40,7]]){
 test(name,()=>{for(const team of [0,1]){
  const g=fixture(field,team),p=play(team,yards,true),rng=structuredClone(g.rngState);e.applyPlay(g,p);
  assert.equal(g.possession,1-team);assert.equal(g.fieldPos,spot);assert.equal(g.down,1);assert.equal(g.distance,10);
  assert.deepEqual(g.rngState,rng);assert.equal(e.total(g,0)+e.total(g,1),0);assert.equal(g.gameClockStatus,'STOPPED');
  assert.equal(p.runoffSec,0);assert.equal(g.history.at(-1).adjudicated.fieldPos,spot);
  if(field+yards>=100){assert.equal(p.ruling,'PUNT_TOUCHBACK');assert.equal(g.history.at(-1).ruling,'PUNT_TOUCHBACK');assert.match(g.lastPlay,/PUNT TOUCHBACK/);}
  else assert.equal(p.ruling,undefined);
 }});
}
for(const [name,field,yards,safety] of [['own 8, sack -8',8,-8,true],['own 9, sack -9',9,-9,true],['own 9, loss -8',9,-8,false]]){
 test(name,()=>{for(const team of [0,1]){const g=fixture(field,team);g.down=1;const p=play(team,yards);e.applyPlay(g,p);assert.equal(e.total(g,1-team),safety?2:0);assert.equal(e.total(g,team),0);assert.equal(g.fieldPos,safety?25:1);assert.equal(g.possession,safety?1-team:team);assert.equal(p.ruling,safety?'SAFETY':undefined);}});
}
test('safety continuation: correct scoring team, quarter, free kick and next possession',()=>{
 for(const team of [0,1])for(const quarter of [1,2,3,4]){
  const g=fixture(9,team,quarter);g.down=1;const p=play(team,-9);e.applyPlay(g,p);
  assert.equal(g.scores[String(quarter)][1-team],2);assert.equal(g.scores[String(quarter)][team],0);
  assert.equal(p.scoringTeam,1-team);assert.deepEqual(p.freeKick,{kickingTeam:team,receivingTeam:1-team,fromOwn:20});
  assert.equal(g.history.at(-1).scoringTeam,1-team);assert.deepEqual(g.history.at(-1).freeKick,p.freeKick);
  assert.equal(g.possession,1-team);assert.equal(g.fieldPos,25);assert.equal(g.down,1);assert.equal(g.distance,10);
  assert.equal(g.gameClockStatus,'STOPPED');assert.equal(p.runoffSec,0);
  const copy=structuredClone(g);g.pendingPlay=null;e.generatePlay(g);assert.equal(g.pendingPlay.team,1-team);assert.deepEqual(copy.scores,g.scores);
 }
});
test('goal-line boundary sweep preserves legitimate OWN 1 and all short endpoints',()=>{
 for(const team of [0,1])for(let start=1;start<=61;start++)for(let yards=34;yards<=48;yards++){
  const a=fixture(start,team),b=structuredClone(a),p=play(team,yards,true),q=structuredClone(p);e.applyPlay(a,p);old.applyPlay(b,q);
  assert.equal(a.fieldPos,start+yards>=100?20:100-start-yards);
  if(start+yards<100)assert.deepEqual(clean(a),clean(b));
  else {assert.equal(b.fieldPos,1);assert.equal(a.history.at(-1).ruling,'PUNT_TOUCHBACK');}
 }
});
test('non-punt resolution and generated RNG outcomes match 5.0.6',()=>{
 for(const team of [0,1])for(const field of [1,8,9,25,50,61,80,99])for(const yards of [-15,-9,-8,-1,0,1,8,20,50]){
  const a=fixture(field,team);a.down=1;const b=structuredClone(a);e.applyPlay(a,play(team,yards));old.applyPlay(b,play(team,yards));assert.deepEqual(clean(a),clean(b));
 }
 for(let i=0;i<256;i++){
  const a=fixture(25+i%37,i%2);a.down=1+i%4;a.seedHex=i.toString(16).padStart(32,'0');a.rngState=e.seedWords(a.seedHex,a.id);const b=structuredClone(a);
  e.generatePlay(a);old.generatePlay(b);assert.deepEqual(a.pendingPlay,b.pendingPlay);assert.deepEqual(a.rngState,b.rngState);
 }
});
const sequences=JSON.parse(fs.readFileSync('tests/v507/fixtures/week11-sequences.json'));
for(const sequence of sequences){
 test(`stored history replay ${sequence.gameId} Q${sequence.period}, punt at ${sequence.records[0].clock}`,()=>{
  const first=sequence.records[0],a=fixture(first.preSnap.fieldPos,first.team,Number(sequence.period)),b=structuredClone(a);
  a.away.name=b.away.name=sequence.away;a.home.name=b.home.name=sequence.home;
  const run=(engine,g)=>{for(const [i,r] of sequence.records.entries()){
   if(i===0){g.down=r.preSnap.down;g.distance=r.preSnap.distance;}
   g.scoreboardSeconds=r.clock;
   const p=play(r.team,r.yards,r.desc.startsWith('Punt'),r.originalDescription??r.desc);
   p.incomplete=r.desc==='Incomplete pass';p.inBounds=r.desc.includes('in bounds')||r.desc.includes('Sack');
   p.first=!p.incomplete&&!p.punt&&p.yards>=g.distance;engine.applyPlay(g,p);
  }};
  run(e,a);run(old,b);
  const affected=first.preSnap.fieldPos+first.yards>=100;
  if(affected){assert.equal(a.history[0].adjudicated.fieldPos,20);assert.equal(a.history[0].ruling,'PUNT_TOUCHBACK');assert.equal(a.history.at(-1).ruling,undefined);assert.equal(e.total(a,1-first.team),0);assert.equal(a.fieldPos,20+sequence.records[1].yards);}
  else {assert.deepEqual(clean(a),clean(b));assert.equal(a.history.at(-1).ruling,'SAFETY');}
  assert.equal(b.history.at(-1).ruling,'SAFETY');
 });
}
test('source preservation: only authorized punt resolution changes football mechanics',()=>{
 const baseline=fs.readFileSync('release-assets/v5.0.6-week11/backend/runtime/engine.mjs','utf8');
 const candidate=fs.readFileSync('release-assets/v5.0.7-week12/backend/runtime/engine.mjs','utf8');
 const functionBlock=(text,start,end)=>text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
 for(const [a,b] of [['function generatePlay(','function flip('],['const CAL =','const cors ='],['function postTiming(','function generatePlay(']])assert.equal(functionBlock(candidate,a,b),functionBlock(baseline,a,b));
 assert.equal(functionBlock(candidate,'    if (next <= 0','  p.adjudicated='),functionBlock(baseline,'    if (next <= 0','  p.adjudicated='));
});
