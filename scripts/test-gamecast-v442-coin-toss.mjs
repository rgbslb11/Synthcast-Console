import fs from 'node:fs';
import assert from 'node:assert/strict';
import {baselineSource,runtime,game,footballKey} from './lib/gamecast-v442-harness.mjs';
import {applyFootballFixes} from '../release-assets/gamecast-v4.4.2/football-fixes.mjs';
import {applyCoinToss} from '../release-assets/gamecast-v4.4.2/coin-toss.mjs';
let src=process.argv.includes('--assembled')?fs.readFileSync('supabase/functions/gamecast-week7-v4-4-2/index.ts','utf8'):applyCoinToss(applyFootballFixes(baselineSource())).replaceAll('GC-W6-V4.4.1-RC1','GC-W7-V4.4.2-RC1');
const mutation=process.argv.find(x=>x.startsWith('--mutation='))?.split('=')[1];
const mutations={
 'away-always-receives':['g.possession = receiver;','g.possession = 0;'],
 'q3-not-reciprocal':['g.possession = g.coinToss.q3ReceivingTeamId === g.home.name ? 1 : 0;','g.possession = g.coinToss.openingReceivingTeamId === g.home.name ? 1 : 0;'],
 'retry-rerolls':['if (g.coinToss) return g.coinToss;','if (g.coinToss) { g.coinToss.choice = g.coinToss.choice === "KICK" ? "RECEIVE" : "KICK"; return g.coinToss; }'],
 'wrong-kick-probability':['rnd(rng) < .75','rnd(rng) < .5'],
};
if(mutation){assert.ok(mutations[mutation]);const [a,b]=mutations[mutation];assert.equal(src.split(a).length,2);src=src.replace(a,b);}
const gc=runtime(src,'ensureOpeningToss,publicGame,beginEdit,cancelEdit');
const counts={home:0,away:0,KICK:0,RECEIVE:0},cases=[];
function check(name,fn){fn();cases.push(name);}
const outcomes=new Set();
for(let i=0;i<10000;i++){
 const seed='GC442-TOSS-'+String(i).padStart(5,'0'),g=game(gc,seed),rng=JSON.stringify(g.rngState);
 check(seed,()=>{
  const toss=gc.ensureOpeningToss(g);counts[toss.winnerTeamId==='Home'?'home':'away']++;counts[toss.choice]++;
  assert.equal(JSON.stringify(g.rngState),rng);assert.equal(g.coinTossAudit.length,1);
  const before=JSON.stringify(toss),same=game(gc,seed);assert.equal(JSON.stringify(gc.ensureOpeningToss(same)),before);
  const restore=JSON.parse(JSON.stringify(g));gc.ensureOpeningToss(restore);assert.equal(JSON.stringify(restore.coinToss),before);assert.equal(restore.coinTossAudit.length,1);
  const opening=g.possession;g.quarter=2;g.pendingPeriod=3;gc.advancePeriod(g);assert.equal(g.possession,1-opening);assert.equal(g.awayTimeouts,3);assert.equal(g.homeTimeouts,3);
  assert.equal(toss.openingKickingTeamId,toss.q3ReceivingTeamId);assert.equal(toss.openingReceivingTeamId,toss.q3KickingTeamId);
  outcomes.add(toss.winnerTeamId+'/'+toss.choice);
 });
}
check('predeclared distribution bands',()=>{
 assert.ok(counts.home>=4800&&counts.home<=5200);assert.ok(counts.away>=4800&&counts.away<=5200);
 assert.ok(counts.KICK>=7300&&counts.KICK<=7700);assert.equal(outcomes.size,4);
});
for(let i=0;i<100;i++){
 const seed='GC442-INVARIANT-'+i;
 check(seed,()=>{
  const g=game(gc,seed);gc.ensureOpeningToss(g);const toss=JSON.stringify(g.coinToss),before=JSON.stringify(g);
  for(const elapsed of [1,2,4,20,50,100]){const projection=gc.project([g],elapsed);assert.equal(JSON.stringify(projection[0].coinToss),toss);}
  assert.equal(JSON.stringify(g),before);
  for(const flag of ['operatorPaused','delayed','editing']){const held=JSON.parse(before);held[flag]=true;gc.advanceGame(held,100);assert.equal(JSON.stringify(held.coinToss),toss);assert.equal(held.coinTossAudit.length,1);}
  const edited=JSON.parse(before);gc.beginEdit(edited,{});gc.cancelEdit(edited);assert.equal(JSON.stringify(edited.coinToss),toss);
  const restarted=JSON.parse(before);gc.reset(restarted,false);gc.ensureOpeningToss(restarted);const a={...g.coinToss},b={...restarted.coinToss};delete a.runId;delete b.runId;assert.deepEqual(a,b);assert.equal(restarted.coinTossAudit.length,1);
  const newSeed=JSON.parse(before);gc.reset(newSeed,true);assert.notEqual(newSeed.seedHex,g.seedHex);gc.ensureOpeningToss(newSeed);assert.equal(newSeed.coinToss.seedHex,newSeed.seedHex);assert.equal(newSeed.coinTossAudit.length,1);
  const pub=gc.publicGame(g);assert.ok(!('seedHex' in pub.coinToss));assert.ok(!('coinTossAudit' in pub));
 });
}
check('different fixed seeds produce different tosses',()=>{assert.equal(outcomes.size,4);});
const report={classification:'TEST RESULT',engineIdentity:'GC-W7-V4.4.2-RC1 in isolated transform harness; deployed integration still required',executed:cases.length,passed:cases.length,failed:0,skipped:0,seeds:['GC442-TOSS-00000','GC442-TOSS-09999'],distributionCases:10000,predeclaredBands:{homeAway:[.48,.52],kick:[.73,.77]},counts,rates:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v/10000])),invarianceSeeds:100};
fs.mkdirSync('outputs/v442',{recursive:true});fs.writeFileSync('outputs/v442/coin-toss.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
