import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {baselineSource,runtime,game,footballKey} from './lib/gamecast-v442-harness.mjs';
import {applyFootballFixes} from '../release-assets/gamecast-v4.4.2/football-fixes.mjs';
const base=runtime(baselineSource()),gc=runtime(applyFootballFixes(baselineSource()));
const start=performance.now();let passed=0;
for(let i=0;i<100;i++){
 const seed='GC442-PROTECTED-'+i,a=game(base,seed),b=game(gc,seed);
 base.advanceGame(a,1000);gc.advanceGame(b,1000);
 delete b.secondHalfTimeoutsReset;
 assert.equal(footballKey(a),footballKey(b),'Protected pre-halftime history '+seed);passed++;
}
const seeds=Array.from({length:50},(_,i)=>'GC442-LOAD-'+i);
const references=seeds.map(seed=>{const g=game(gc,seed);gc.advanceGame(g,21600);assert.equal(g.lifecycle,'FINAL_PENDING');return g;});
const concurrent=seeds.map(seed=>game(gc,seed)),loadStart=performance.now();
let rounds=0;
while(concurrent.some(g=>g.lifecycle!=='FINAL_PENDING')&&rounds++<10000)for(const g of concurrent)gc.advanceGame(g,50);
const concurrentMilliseconds=performance.now()-loadStart;
for(let i=0;i<50;i++){
 const g=concurrent[i];assert.equal(g.lifecycle,'FINAL_PENDING');assert.equal(footballKey(g),footballKey(references[i]),'Concurrent history '+seeds[i]);
 assert.ok(Object.keys(g.scores).every(p=>['1','2','3','4','OT'].includes(p)||/^[2-9][0-9]*OT$/.test(p)));
 assert.ok(g.down>=1&&g.down<=4);assert.ok(g.fieldPos>=1&&g.fieldPos<=99);passed++;
}
for(const speed of [1,4,10,50])for(let i=0;i<50;i++){
 const g=game(gc,seeds[i]);g.speed=speed;
 const projected=gc.project([g],21600)[0];assert.equal(footballKey(projected),footballKey(references[i]));passed++;
}
// Explicitly record the inherited unsupported 20x selector, rather than
// presenting a 20-second advanceGame chunk as actual 20x acceleration.
const report={classification:'TEST RESULT',scope:'Kneel and halftime transform only; full release integration pending',executed:passed,passed,failed:0,skipped:0,protectedFirst1000Seconds:{seeds:['GC442-PROTECTED-0','GC442-PROTECTED-99'],comparisons:100},simultaneousGames:50,seedRange:['GC442-LOAD-0','GC442-LOAD-49'],referenceFinals:50,concurrentFinals:50,rounds,concurrentMilliseconds,accelerationComparisons:200,speedsTested:[1,4,10,50],twentyX:'NOT TESTED: inherited SPEEDS excludes 20; release UI/backend integration required',runtimeMilliseconds:performance.now()-start};
fs.mkdirSync('outputs/v442',{recursive:true});fs.writeFileSync('outputs/v442/fix-integrity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
